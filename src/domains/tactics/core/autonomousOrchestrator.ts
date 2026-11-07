import { GridPosition, TacticalUnit, TerrainTile } from '../types';
import { TacticalBotAI, BotDifficulty, BotAction, BotGameState, BotTurnPlan } from './aiBot';
import { CombatEngine } from './combat';
import { CaptureEngine } from './captureSystem';
import { TurnEconomyEngine, CANONICAL_UNIT_PRODUCTION_CATALOG } from '@domains/economy';
import { COEngine, COPowerType, PlayerCOState } from './coSystem';
import { TacticalReinforcementEngine, ReinforcementState } from './reinforcementEngine';
import { MASTER_METAGAME_CONSTANTS } from '@shared';

export type GameMode = 'hotseat_2p' | 'vs_bot' | 'bot_vs_bot';
export type MatchFormat = 'blitz_skirmish' | 'grand_campaign' | 'mirror_duel';
export type MatchEndReason = 'hq_captured' | 'army_wiped' | 'turn_limit' | 'resignation';

export interface MatchFormatConfig {
  format: MatchFormat;
  displayName: string;
  turnTimeLimitSec: number;
  economyMultiplier: number; // 2.0 en Blitz ($2000/propiedad), 1.0 en Campaña ($1000/propiedad), 1.5 en Duelo Espejo
  maxTurnsLimit: number;     // 15 en Blitz, 40 en Campaña, 12 en Duelo Espejo
  initialFundsBonus: number; // Fondos extra iniciales
  actionBonusSec: number;    // Reloj Fischer Táctico: bono por acción confirmada
  maxTurnCapSec: number;     // Tope máximo por turno
  disconnectGraceBankSec: number; // Banco de gracia ante desconexiones
}

export const MATCH_FORMAT_CONFIGS: Record<MatchFormat, MatchFormatConfig> = {
  mirror_duel: {
    format: 'mirror_duel',
    displayName: 'Duelo Táctico Espejo (15s)',
    turnTimeLimitSec: 15,
    economyMultiplier: 1.5,
    maxTurnsLimit: 12,
    initialFundsBonus: 3000,
    actionBonusSec: 2.0,
    maxTurnCapSec: 25,
    disconnectGraceBankSec: 30,
  },
  blitz_skirmish: {
    format: 'blitz_skirmish',
    displayName: 'Escaramuza Rápida (Blitz)',
    turnTimeLimitSec: 30,
    economyMultiplier: 2.0,
    maxTurnsLimit: 15,
    initialFundsBonus: 2000,
    actionBonusSec: 3.0,
    maxTurnCapSec: 45,
    disconnectGraceBankSec: 60,
  },
  grand_campaign: {
    format: 'grand_campaign',
    displayName: 'Campaña Táctica (Grand Campaign)',
    turnTimeLimitSec: 60,
    economyMultiplier: 1.0,
    maxTurnsLimit: 40,
    initialFundsBonus: 0,
    actionBonusSec: 4.0,
    maxTurnCapSec: 90,
    disconnectGraceBankSec: 120,
  },
};

/**
 * Calcula el multiplicador decreciente para partidas offline según la curva Soft Cap:
 * mu(k) = [0.60 (k<=3), 0.30 (4<=k<=6), 0.10 (7<=k<=10), 0.02 (k>=11)]
 * Referencia: docs/orchestration/02_ECONOMY_AND_RETENTION_REBALANCE.md
 */
export function calculateOfflineRewardMultiplier(dailyMatchesCount: number): number {
  const matchIndex = dailyMatchesCount + 1;
  if (matchIndex <= 3) return 0.60;
  if (matchIndex <= 6) return 0.30;
  if (matchIndex <= 10) return 0.10;
  return 0.02; // Suelo mínimo simbólico anti-granja
}

export interface MatchTelemetry {
  p1DamageDealt: number;
  p2DamageDealt: number;
  p1UnitsLost: number;
  p2UnitsLost: number;
  p1FundsSpent: number;
  p2FundsSpent: number;
  p1Captures: number;
  p2Captures: number;
  turnStartTimestamps: number[];
  p1TurnDurationsSec: number[];
  p2TurnDurationsSec: number[];
  tiltIndex: number; // 0 a 100
}

export interface MatchEndSummary {
  winner: 'p1' | 'p2' | 'draw';
  reason: MatchEndReason;
  totalTurns: number;
  totalDurationSeconds: number;
  rankRating: 'S' | 'A' | 'B' | 'C';
  p1Stats: {
    unitsLost: number;
    unitsDestroyed: number;
    fundsEarned: number;
    fundsSpent: number;
    propertiesControlled: number;
  };
  p2Stats: {
    unitsLost: number;
    unitsDestroyed: number;
    fundsEarned: number;
    fundsSpent: number;
    propertiesControlled: number;
  };
  xpEarned: number;
  creditsEarned: number;
  trophiesDelta: number;
}

export type OrchestratorListener = (event: OrchestratorEvent) => void;

export type OrchestratorEvent =
  | { type: 'TURN_STARTED'; player: 'p1' | 'p2'; turnNumber: number; income: number; repairsProcessed: number }
  | { type: 'BOT_PLAN_COMPUTED'; plan: BotTurnPlan; totalActions: number }
  | { type: 'ACTION_EXECUTED'; action: BotAction; description: string }
  | { type: 'STATE_CHANGED' }
  | { type: 'MATCH_FINISHED'; summary: MatchEndSummary };

export class AutonomousTurnOrchestrator {
  private gameMode: GameMode = 'vs_bot';
  private matchFormat: MatchFormat = 'blitz_skirmish';
  private botDifficulty: BotDifficulty = 'normal';

  private tiles: TerrainTile[][] = [];
  private units: TacticalUnit[] = [];
  private playerFunds: Record<'p1' | 'p2', number> = { p1: 1000, p2: 1000 };
  private currentTurn: 'p1' | 'p2' = 'p1';
  private turnNumber: number = 1;
  private isMatchOver: boolean = false;
  private isProcessingBotTurn: boolean = false;
  private dailyOfflineMatchesCount: number = 0;
  private listeners: Set<OrchestratorListener> = new Set();

  private matchStartTime: number = Date.now();
  private turnStartTime: number = Date.now();
  private matchId: string = `match-${Date.now()}`;
  private p1ReinforcementState: ReinforcementState = TacticalReinforcementEngine.createInitialState();
  private p2ReinforcementState: ReinforcementState = TacticalReinforcementEngine.createInitialState();
  private telemetry: MatchTelemetry = {
    p1DamageDealt: 0,
    p2DamageDealt: 0,
    p1UnitsLost: 0,
    p2UnitsLost: 0,
    p1FundsSpent: 0,
    p2FundsSpent: 0,
    p1Captures: 0,
    p2Captures: 0,
    turnStartTimestamps: [],
    p1TurnDurationsSec: [],
    p2TurnDurationsSec: [],
    tiltIndex: 0,
  };

  constructor(
    initialTiles: TerrainTile[][],
    initialUnits: TacticalUnit[],
    options?: {
      gameMode?: GameMode;
      matchFormat?: MatchFormat;
      botDifficulty?: BotDifficulty;
      initialFunds?: { p1: number; p2: number };
      dailyOfflineMatchesCount?: number;
    }
  ) {
    this.gameMode = options?.gameMode ?? 'vs_bot';
    this.matchFormat = options?.matchFormat ?? 'blitz_skirmish';
    this.botDifficulty = options?.botDifficulty ?? 'normal';
    this.dailyOfflineMatchesCount = options?.dailyOfflineMatchesCount ?? 0;

    this.tiles = initialTiles.map(row => row.map(t => ({ ...t })));
    this.units = initialUnits.map(u => ({ ...u }));

    const config = MATCH_FORMAT_CONFIGS[this.matchFormat];
    this.playerFunds = {
      p1: (options?.initialFunds?.p1 ?? 1000) + config.initialFundsBonus,
      p2: (options?.initialFunds?.p2 ?? 1000) + config.initialFundsBonus,
    };
    this.matchStartTime = Date.now();
    this.turnStartTime = Date.now();
  }

  // ==========================================================================
  // CONFIGURACIÓN Y GETTERS
  // ==========================================================================
  public subscribe(listener: OrchestratorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: OrchestratorEvent): void {
    this.listeners.forEach(fn => {
      try {
        fn(event);
      } catch (err) {
        console.error('Error in orchestrator listener:', err);
      }
    });
  }

  public getGameMode(): GameMode { return this.gameMode; }
  public setGameMode(mode: GameMode): void { this.gameMode = mode; }

  public getMatchFormat(): MatchFormat { return this.matchFormat; }
  public setMatchFormat(format: MatchFormat): void { this.matchFormat = format; }

  public getBotDifficulty(): BotDifficulty { return this.botDifficulty; }
  public setBotDifficulty(diff: BotDifficulty): void { this.botDifficulty = diff; }

  public getTiles(): TerrainTile[][] { return this.tiles; }
  public getUnits(): TacticalUnit[] { return this.units; }
  public getPlayerFunds(): Record<'p1' | 'p2', number> { return { ...this.playerFunds }; }
  public getCurrentTurn(): 'p1' | 'p2' { return this.currentTurn; }
  public getTurnNumber(): number { return this.turnNumber; }
  public getIsMatchOver(): boolean { return this.isMatchOver; }
  public getIsProcessingBot(): boolean { return this.isProcessingBotTurn; }
  public getTelemetry(): MatchTelemetry { return { ...this.telemetry }; }

  public requestReinforcements(
    player: 'p1' | 'p2',
    units: Array<{ unitCode: string; tier: number; level: number; hp: number }>
  ): { success: boolean; arrivalTurn?: number; reason?: string } {
    const state = player === 'p1' ? this.p1ReinforcementState : this.p2ReinforcementState;
    const res = TacticalReinforcementEngine.queueReinforcement(state, {
      matchId: this.matchId,
      playerId: player,
      currentTurn: this.turnNumber,
      units,
    });
    if (res.success) {
      if (player === 'p1') this.p1ReinforcementState = res.updatedState;
      else this.p2ReinforcementState = res.updatedState;
      this.notify({ type: 'STATE_CHANGED' });
      return { success: true, arrivalTurn: res.updatedState.arrivalTurn };
    }
    return { success: false, reason: res.error };
  }

  public getReinforcementStatus(player: 'p1' | 'p2') {
    const state = player === 'p1' ? this.p1ReinforcementState : this.p2ReinforcementState;
    return {
      requested: state.hasRequested,
      arrivalTurn: state.arrivalTurn,
      isDelivered: state.isDelivered,
      currentTurn: this.turnNumber,
    };
  }

  private deployArrivingReinforcements(
    player: 'p1' | 'p2',
    units: Array<{ unitCode: string; tier: number; level: number; hp: number }>
  ): void {
    const hqTile = this.tiles.flat().find(t => t.type === 'hq' && t.ownerId === player);
    const factoryTiles = this.tiles.flat().filter(t => t.type === 'factory' && t.ownerId === player);
    const candidateTiles = [hqTile, ...factoryTiles].filter((t): t is TerrainTile => t !== undefined);

    let unitIndex = 0;
    for (const tile of candidateTiles) {
      if (unitIndex >= units.length) break;
      const isOccupied = this.units.some(u => u.x === tile.x && u.y === tile.y);
      if (!isOccupied) {
        const u = units[unitIndex];
        const newTacticalUnit: TacticalUnit = {
          id: `reinf-${Date.now()}-${unitIndex}`,
          name: u.unitCode,
          unitCode: u.unitCode,
          displayName: u.unitCode,
          ownerId: player,
          x: tile.x,
          y: tile.y,
          hp: u.hp > 10 ? u.hp : u.hp * 10,
          maxHp: MASTER_METAGAME_CONSTANTS.CANONICAL_MAX_HP,
          movePoints: 4,
          moveType: 'treads',
          rangeMin: 1,
          rangeMax: 1,
          minRange: 1,
          maxRange: 1,
          ammo: 6,
          maxAmmo: 6,
          fuel: 60,
          maxFuel: 60,
          vision: 3,
          productionCost: 3000,
          hasMoved: false,
          hasActed: false,
          canCapture: false,
          isDiving: false,
          baseAttack: 70,
          armorType: 'vehicle',
          weaponType: 'cannon',
        };
        this.units.push(newTacticalUnit);
        unitIndex++;
      }
    }
    this.notify({ type: 'STATE_CHANGED' });
  }

  // ==========================================================================
  // CICLO PRINCIPAL DE TURNOS
  // ==========================================================================

  /**
   * Concluye el turno activo, procesa economía del nuevo jugador y dispara la IA si corresponde.
   */
  public async endTurn(options?: { botStepDelayMs?: number }): Promise<void> {
    if (this.isMatchOver || this.isProcessingBotTurn) return;

    // Registrar duración del turno saliente
    const durationSec = Math.max(1, Math.round((Date.now() - this.turnStartTime) / 1000));
    if (this.currentTurn === 'p1') {
      this.telemetry.p1TurnDurationsSec.push(durationSec);
    } else {
      this.telemetry.p2TurnDurationsSec.push(durationSec);
    }

    // Calcular posible índice de Tilt (apresuramiento tras pérdidas)
    this.calculateTiltIndex();

    // Pasar al siguiente jugador
    const nextPlayer: 'p1' | 'p2' = this.currentTurn === 'p1' ? 'p2' : 'p1';
    const nextTurnNum = nextPlayer === 'p1' ? this.turnNumber + 1 : this.turnNumber;

    this.currentTurn = nextPlayer;
    this.turnNumber = nextTurnNum;
    this.turnStartTime = Date.now();

    // 1. Verificar límite de turnos según el formato (Blitz 15 turnos, Campaña 40 turnos)
    const config = MATCH_FORMAT_CONFIGS[this.matchFormat];
    if (this.turnNumber > config.maxTurnsLimit) {
      this.resolveTurnLimitVictory();
      return;
    }

    // 2. Ingresos económicos ajustados por el multiplicador del modo de juego
    const baseIncome = TurnEconomyEngine.calculateIncome(nextPlayer, this.tiles);
    const effectiveIncome = Math.round(baseIncome * (config.economyMultiplier / 1.0));

    // 2.1 Aplicar impuesto logístico si se superan las 14 tropas (Libertad Orgánica - Soft Cap)
    const supplyStatus = TurnEconomyEngine.calculateSupplyUpkeep(nextPlayer, this.units);
    const netIncome = Math.max(0, effectiveIncome - supplyStatus.upkeepCost);
    this.playerFunds[nextPlayer] += netIncome;

    // 3. Procesar Mantenimiento / Reparación de unidades en propiedades
    const repairResult = TurnEconomyEngine.processRepairsAndResupply(
      nextPlayer,
      this.units,
      this.tiles,
      this.playerFunds[nextPlayer]
    );
    this.units = repairResult.updatedUnits;
    this.playerFunds[nextPlayer] = repairResult.updatedFunds;

    // 3.5 Verificar llegada de refuerzos tácticos del metajuego (T + 4)
    const state = nextPlayer === 'p1' ? this.p1ReinforcementState : this.p2ReinforcementState;
    const arrivalCheck = TacticalReinforcementEngine.checkReinforcementArrival(state, this.turnNumber);
    if (arrivalCheck.shouldDeploy) {
      this.deployArrivingReinforcements(nextPlayer, arrivalCheck.unitsToDeploy);
      if (nextPlayer === 'p1') this.p1ReinforcementState.isDelivered = true;
      else this.p2ReinforcementState.isDelivered = true;
    }

    // 4. Resetear estado de acción de todas las tropas del jugador entrante
    this.units = this.units.map(u => {
      if (u.ownerId === nextPlayer) {
        return { ...u, hasMoved: false, hasActed: false };
      }
      return u;
    });

    this.notify({
      type: 'TURN_STARTED',
      player: nextPlayer,
      turnNumber: this.turnNumber,
      income: netIncome,
      repairsProcessed: repairResult.unitsRepaired,
    });
    this.notify({ type: 'STATE_CHANGED' });

    // 5. Verificar si hay victoria por aniquilación de tropas o sedes
    const gameOver = TurnEconomyEngine.checkGameOver(this.tiles, this.units);
    if (gameOver.isOver) {
      this.triggerGameOver(gameOver.winnerId as 'p1' | 'p2', 'army_wiped');
      return;
    }

    // 6. Si el jugador entrante es controlado por Bot, orquestar su turno
    const isBotTurn =
      (this.gameMode === 'vs_bot' && nextPlayer === 'p2') ||
      this.gameMode === 'bot_vs_bot';

    if (isBotTurn) {
      await this.runBotTurnWorkflow(nextPlayer, options?.botStepDelayMs ?? 350);
    }
  }

  /**
   * Ejecuta el turno completo de un Bot de forma asíncrona y estructurada.
   */
  public async runBotTurnWorkflow(botPlayerId: 'p1' | 'p2', stepDelayMs: number = 350): Promise<void> {
    if (this.isMatchOver) return;
    this.isProcessingBotTurn = true;
    this.notify({ type: 'STATE_CHANGED' });

    try {
      const opponentId: 'p1' | 'p2' = botPlayerId === 'p1' ? 'p2' : 'p1';
      const gridWidth = this.tiles[0]?.length || 16;
      const gridHeight = this.tiles.length;

      const botState: BotGameState = {
        botPlayerId,
        opponentPlayerId: opponentId,
        gridWidth,
        gridHeight,
        tiles: this.tiles,
        units: this.units,
        botFunds: this.playerFunds[botPlayerId],
      };

      // 1. Computar el plan heurístico con TacticalBotAI
      const plan = TacticalBotAI.computeBotTurn(botState, this.botDifficulty);
      this.notify({
        type: 'BOT_PLAN_COMPUTED',
        plan,
        totalActions: plan.actions.length,
      });

      // 2. Ejecutar cada acción del plan con retardo visual para legibilidad humana
      for (const action of plan.actions) {
        if (this.isMatchOver) break;

        if (stepDelayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, stepDelayMs));
        }

        this.applyBotAction(action, botPlayerId);

        this.notify({
          type: 'ACTION_EXECUTED',
          action,
          description: action.explanation,
        });
        this.notify({ type: 'STATE_CHANGED' });

        // Comprobar fin de partida tras cada acción (ej: HQ capturado o enemigo eliminado)
        const check = TurnEconomyEngine.checkGameOver(this.tiles, this.units);
        if (check.isOver) {
          this.triggerGameOver(check.winnerId as 'p1' | 'p2', 'hq_captured');
          return;
        }

        if (action.actionType === 'END_TURN') {
          break;
        }
      }

      // 3. Concluir turno del Bot y retornar el control a P1 (o al siguiente bot)
      this.isProcessingBotTurn = false;
      await this.endTurn({ botStepDelayMs: stepDelayMs });
    } catch (err) {
      console.error('Error during autonomous bot turn execution:', err);
      this.isProcessingBotTurn = false;
      this.notify({ type: 'STATE_CHANGED' });
    }
  }

  /**
   * Aplica una acción individual generada por TacticalBotAI sobre el estado mutable del juego.
   */
  private applyBotAction(action: BotAction, botPlayerId: 'p1' | 'p2'): void {
    switch (action.actionType) {
      case 'SPAWN_UNIT': {
        if (!action.spawnUnitCode || !action.factoryPosition) return;
        const catalogEntry = CANONICAL_UNIT_PRODUCTION_CATALOG[action.spawnUnitCode];
        if (!catalogEntry) return;

        const cost = catalogEntry.cost;
        if (this.playerFunds[botPlayerId] < cost) return;

        // Verificar que la fábrica no esté ya ocupada
        const isOccupied = this.units.some(
          u => u.x === action.factoryPosition!.x && u.y === action.factoryPosition!.y
        );
        if (isOccupied) return;

        this.playerFunds[botPlayerId] -= cost;
        this.telemetry[botPlayerId === 'p1' ? 'p1FundsSpent' : 'p2FundsSpent'] += cost;

        const newUnit: TacticalUnit = {
          id: `bot_spawn_${action.spawnUnitCode}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          unitCode: action.spawnUnitCode,
          displayName: catalogEntry.displayName,
          ownerId: botPlayerId,
          x: action.factoryPosition.x,
          y: action.factoryPosition.y,
          hp: 100,
          maxHp: 100,
          tier: 1,
          ammo: catalogEntry.ammo,
          fuel: catalogEntry.fuel,
          movementPoints: catalogEntry.movementPoints,
          movementType: catalogEntry.movementType,
          minRange: catalogEntry.minRange,
          maxRange: catalogEntry.maxRange,
          visionRange: catalogEntry.visionRange ?? 3,
          baseAttack: catalogEntry.baseAttack,
          productionCost: cost,
          hasMoved: true,
          hasActed: true,
          skinId: 'default',
        };
        this.units.push(newUnit);
        break;
      }

      case 'MOVE_AND_CAPTURE': {
        if (!action.unitId || !action.moveDestination) return;
        const unit = this.units.find(u => u.id === action.unitId);
        if (!unit) return;

        // Mover unidad al destino
        unit.x = action.moveDestination.x;
        unit.y = action.moveDestination.y;
        unit.hasMoved = true;
        unit.hasActed = true;

        // Ejecutar paso de captura
        const targetTile = this.tiles[unit.y]?.[unit.x];
        if (targetTile && CaptureEngine.canCapture(unit, targetTile)) {
          const captureResult = CaptureEngine.executeCaptureStep(unit, targetTile);
          if (captureResult.success) {
            targetTile.captureHp = captureResult.remainingCapturePoints;
            targetTile.ownerId = captureResult.newOwnerId;

            if (captureResult.captured) {
              this.telemetry[botPlayerId === 'p1' ? 'p1Captures' : 'p2Captures']++;
              if (captureResult.isHqCaptured) {
                this.triggerGameOver(botPlayerId, 'hq_captured');
              }
            }
          }
        }
        break;
      }

      case 'MOVE_AND_ATTACK': {
        if (!action.unitId || !action.moveDestination || !action.targetUnitId) return;
        const attacker = this.units.find(u => u.id === action.unitId);
        const defender = this.units.find(u => u.id === action.targetUnitId);
        if (!attacker || !defender) return;

        // Desplazar atacante
        attacker.x = action.moveDestination.x;
        attacker.y = action.moveDestination.y;
        attacker.hasMoved = true;
        attacker.hasActed = true;

        const attackerTile = this.tiles[attacker.y][attacker.x];
        const defenderTile = this.tiles[defender.y][defender.x];

        // Calcular daño canónico
        const combat = CombatEngine.calculateDamage(attacker, defender, attackerTile, defenderTile);

        // Aplicar daño al defensor
        defender.hp = combat.defenderHpAfter;
        const dmgDealtKey = botPlayerId === 'p1' ? 'p1DamageDealt' : 'p2DamageDealt';
        this.telemetry[dmgDealtKey] += combat.attackerDamageDealt;

        if (combat.defenderEliminated) {
          const lostKey = defender.ownerId === 'p1' ? 'p1UnitsLost' : 'p2UnitsLost';
          this.telemetry[lostKey]++;
          this.units = this.units.filter(u => u.id !== defender.id);
        } else if (combat.canCounterAttack && combat.counterDamageDealt > 0) {
          // Contraataque sobre el atacante
          attacker.hp = combat.attackerHpAfter;
          const counterKey = defender.ownerId === 'p1' ? 'p1DamageDealt' : 'p2DamageDealt';
          this.telemetry[counterKey] += combat.counterDamageDealt;

          if (combat.attackerEliminated) {
            const lostKey = attacker.ownerId === 'p1' ? 'p1UnitsLost' : 'p2UnitsLost';
            this.telemetry[lostKey]++;
            this.units = this.units.filter(u => u.id !== attacker.id);
          }
        }
        break;
      }

      case 'MOVE_TO_POSITION':
      case 'WAIT': {
        if (!action.unitId) return;
        const unit = this.units.find(u => u.id === action.unitId);
        if (!unit) return;

        if (action.moveDestination) {
          unit.x = action.moveDestination.x;
          unit.y = action.moveDestination.y;
        }
        unit.hasMoved = true;
        unit.hasActed = true;
        break;
      }

      case 'END_TURN':
      default:
        break;
    }
  }

  // ==========================================================================
  // RESOLUCIÓN Y RESUMEN DE PARTIDA
  // ==========================================================================

  private resolveTurnLimitVictory(): void {
    // En límite de turnos (Blitz 15t, Campaña 40t), desempate por Valor de Ejército + Valor de Propiedades
    const p1ArmyValue = this.units.filter(u => u.ownerId === 'p1').reduce((sum, u) => sum + (u.productionCost * (u.hp / 10)), 0);
    const p2ArmyValue = this.units.filter(u => u.ownerId === 'p2').reduce((sum, u) => sum + (u.productionCost * (u.hp / 10)), 0);

    let p1PropsValue = 0;
    let p2PropsValue = 0;
    for (const row of this.tiles) {
      for (const t of row) {
        if (t.ownerId === 'p1') p1PropsValue += 1000;
        if (t.ownerId === 'p2') p2PropsValue += 1000;
      }
    }

    const p1Total = p1ArmyValue + p1PropsValue;
    const p2Total = p2ArmyValue + p2PropsValue;

    let winner: 'p1' | 'p2' | 'draw' = 'draw';
    if (p1Total > p2Total) winner = 'p1';
    else if (p2Total > p1Total) winner = 'p2';

    this.triggerGameOver(winner, 'turn_limit');
  }

  public triggerGameOver(winner: 'p1' | 'p2' | 'draw', reason: MatchEndReason): void {
    this.isMatchOver = true;
    this.isProcessingBotTurn = false;

    const totalDurationSeconds = Math.max(1, Math.round((Date.now() - this.matchStartTime) / 1000));
    const summary = this.generateSummary(winner, reason, totalDurationSeconds);

    this.notify({
      type: 'MATCH_FINISHED',
      summary,
    });
    this.notify({ type: 'STATE_CHANGED' });
  }

  private generateSummary(winner: 'p1' | 'p2' | 'draw', reason: MatchEndReason, durationSec: number): MatchEndSummary {
    const p1Props = this.tiles.flat().filter(t => t.ownerId === 'p1').length;
    const p2Props = this.tiles.flat().filter(t => t.ownerId === 'p2').length;

    // Calificación de combate (S, A, B, C)
    let rankRating: 'S' | 'A' | 'B' | 'C' = 'B';
    if (winner === 'p1') {
      if (this.telemetry.p1UnitsLost <= 1 && this.turnNumber <= 10) rankRating = 'S';
      else if (this.telemetry.p1UnitsLost <= 3) rankRating = 'A';
      else rankRating = 'B';
    } else {
      rankRating = 'C';
    }

    // Cálculo de recompensas normalizado: Soft Cap escalonado en modo offline con suelo mínimo (+5 XP, +10 Créditos)
    const isOffline = this.gameMode === 'vs_bot' || this.gameMode === 'bot_vs_bot';
    let diffMult = 1.0;
    if (this.botDifficulty === 'easy') diffMult = 0.85;
    else if (this.botDifficulty === 'hard' || (this.botDifficulty as string) === 'chess') diffMult = 1.20;

    const baseOnlineXp = winner === 'p1' ? 120 + (this.turnNumber * 5) : 40;
    const baseOnlineCredits = winner === 'p1' ? 250 + (this.telemetry.p2UnitsLost * 30) : 75;

    const offlineMultiplier = calculateOfflineRewardMultiplier(this.dailyOfflineMatchesCount);
    const xpEarned = isOffline
      ? Math.max(5, Math.floor(baseOnlineXp * offlineMultiplier * diffMult))
      : baseOnlineXp;
    const creditsEarned = isOffline
      ? Math.max(10, Math.floor(baseOnlineCredits * offlineMultiplier * diffMult))
      : baseOnlineCredits;

    // Penalización Canónica de Victoria Pírrica (-15% si se solicitaron refuerzos tácticos)
    const hasCalledReinf = this.p1ReinforcementState.hasRequested;
    const finalXp = hasCalledReinf
      ? TacticalReinforcementEngine.applyPyrrhicVictoryPenalty(xpEarned)
      : xpEarned;
    const finalCredits = hasCalledReinf
      ? TacticalReinforcementEngine.applyPyrrhicVictoryPenalty(creditsEarned)
      : creditsEarned;

    const trophiesDelta = isOffline ? 0 : (winner === 'p1' ? 30 : winner === 'p2' ? -18 : 0);

    return {
      winner,
      reason,
      totalTurns: this.turnNumber,
      totalDurationSeconds: durationSec,
      rankRating,
      p1Stats: {
        unitsLost: this.telemetry.p1UnitsLost,
        unitsDestroyed: this.telemetry.p2UnitsLost,
        fundsEarned: TurnEconomyEngine.calculateIncome('p1', this.tiles) * this.turnNumber,
        fundsSpent: this.telemetry.p1FundsSpent,
        propertiesControlled: p1Props,
      },
      p2Stats: {
        unitsLost: this.telemetry.p2UnitsLost,
        unitsDestroyed: this.telemetry.p1UnitsLost,
        fundsEarned: TurnEconomyEngine.calculateIncome('p2', this.tiles) * this.turnNumber,
        fundsSpent: this.telemetry.p2FundsSpent,
        propertiesControlled: p2Props,
      },
      xpEarned: finalXp,
      creditsEarned: finalCredits,
      trophiesDelta,
    };
  }

  private calculateTiltIndex(): void {
    // Si los últimos turnos promedian menos de 10 segundos y se han perdido 2+ tropas, tilt index sube
    const durations = this.telemetry.p1TurnDurationsSec;
    if (durations.length === 0) return;

    const recent = durations.slice(-3);
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;

    let tilt = 0;
    if (avgRecent < 12 && this.telemetry.p1UnitsLost >= 2) {
      tilt = Math.min(100, Math.round((12 - avgRecent) * 10 + this.telemetry.p1UnitsLost * 8));
    }
    this.telemetry.tiltIndex = tilt;
  }
}
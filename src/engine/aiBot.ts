import { GridPosition, TacticalUnit, TerrainTile, MovementType } from '../types';
import { TacticalPathfindingEngine } from './pathfinding';
import { CombatEngine, COMBAT_EFFECTIVENESS_MATRIX } from './combat';

export type BotDifficulty = 'easy' | 'normal' | 'hard' | 'chess';

export type BotActionType =
  | 'SPAWN_UNIT'
  | 'MOVE_AND_CAPTURE'
  | 'MOVE_AND_ATTACK'
  | 'MOVE_TO_POSITION'
  | 'WAIT'
  | 'END_TURN';

export interface BotAction {
  id: string;
  unitId?: string;
  actionType: BotActionType;
  moveDestination?: GridPosition;
  targetUnitId?: string;
  propertyPosition?: GridPosition;
  spawnUnitCode?: string;
  factoryPosition?: GridPosition;
  explanation: string;
  score: number;
}

export interface BotGameState {
  botPlayerId: string;
  opponentPlayerId: string;
  gridWidth: number;
  gridHeight: number;
  tiles: TerrainTile[][];
  units: TacticalUnit[];
  botFunds: number;
}

export interface BotTurnPlan {
  actions: BotAction[];
  totalExpectedScore: number;
}

export class TacticalBotAI {
  /**
   * Calcula el plan completo de acciones para el turno del Bot según la dificultad seleccionada.
   */
  public static computeBotTurn(state: BotGameState, difficulty: BotDifficulty = 'normal'): BotTurnPlan {
    const actions: BotAction[] = [];
    const botUnits = state.units.filter(u => u.ownerId === state.botPlayerId && !u.hasActed);
    const opponentUnits = state.units.filter(u => u.ownerId === state.opponentPlayerId);

    // Copia mutable de unitsMap para simular desplazamientos dentro del turno del bot
    const unitsMap = new Map<string, TacticalUnit>();
    state.units.forEach(u => unitsMap.set(u.id, { ...u }));

    let remainingFunds = state.botFunds;

    // ========================================================================
    // FASE 1: PRODUCCIÓN ESTRATÉGICA EN FÁBRICAS VACÍAS
    // ========================================================================
    const botFactories: TerrainTile[] = [];
    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        const tile = state.tiles[y][x];
        if (tile.type === 'factory' && tile.ownerId === state.botPlayerId) {
          const isOccupied = Array.from(unitsMap.values()).some(u => u.x === x && u.y === y);
          if (!isOccupied) {
            botFactories.push(tile);
          }
        }
      }
    }

    for (const factory of botFactories) {
      const chosenUnitCode = this.decideFactoryProduction(remainingFunds, state.units, state.botPlayerId, difficulty);
      if (chosenUnitCode) {
        const unitCost = this.getUnitCost(chosenUnitCode);
        if (remainingFunds >= unitCost) {
          remainingFunds -= unitCost;
          actions.push({
            id: `spawn_${factory.x}_${factory.y}`,
            actionType: 'SPAWN_UNIT',
            spawnUnitCode: chosenUnitCode,
            factoryPosition: { x: factory.x, y: factory.y },
            explanation: `Producción de ${chosenUnitCode} en Fábrica (${factory.x}, ${factory.y})`,
            score: 500 + unitCost / 10,
          });
        }
      }
    }

    // ========================================================================
    // FASE 2: DECISIÓN TÁCTICA PARA CADA UNIDAD DEL BOT
    // ========================================================================
    for (const unit of botUnits) {
      const bestAction = this.evaluateUnitAction(unit, state, unitsMap, difficulty);
      actions.push(bestAction);

      // Actualizar posición de la unidad en la simulación temporal para no colisionar
      if (bestAction.moveDestination) {
        const simUnit = unitsMap.get(unit.id);
        if (simUnit) {
          simUnit.x = bestAction.moveDestination.x;
          simUnit.y = bestAction.moveDestination.y;
          simUnit.hasActed = true;
        }
      }
    }

    // Ordenar acciones: Capturas primero, luego Combates, luego Movimientos y Producciones
    actions.sort((a, b) => b.score - a.score);

    // Acción final del turno
    actions.push({
      id: 'end_turn_action',
      actionType: 'END_TURN',
      explanation: 'Fin de turno del Bot',
      score: 0,
    });

    const totalExpectedScore = actions.reduce((sum, a) => sum + a.score, 0);

    return {
      actions,
      totalExpectedScore,
    };
  }

  /**
   * Evalúa la acción con mayor utilidad para una unidad individual.
   */
  private static evaluateUnitAction(
    unit: TacticalUnit,
    state: BotGameState,
    unitsMap: Map<string, TacticalUnit>,
    difficulty: BotDifficulty
  ): BotAction {
    const reachableTiles = TacticalPathfindingEngine.getReachableTiles({
      unit,
      tiles: state.tiles,
      unitsMap,
      gridWidth: state.gridWidth,
      gridHeight: state.gridHeight,
    });

    // Incluir la propia celda actual como destino viable de movimiento
    const allDestinations: GridPosition[] = [{ x: unit.x, y: unit.y }, ...reachableTiles.map(r => ({ x: r.x, y: r.y }))];

    let bestAction: BotAction = {
      id: `wait_${unit.id}`,
      unitId: unit.id,
      actionType: 'WAIT',
      moveDestination: { x: unit.x, y: unit.y },
      explanation: `${unit.displayName} espera en posición`,
      score: 10,
    };

    const opponentUnits = Array.from(unitsMap.values()).filter(u => u.ownerId === state.opponentPlayerId);

    // ------------------------------------------------------------------------
    // HEURÍSTICA 1: CAPTURA DE PROPIEDADES (Infantería y Mecanizados)
    // ------------------------------------------------------------------------
    if (unit.movementType === 'foot' || unit.movementType === 'mech') {
      for (const dest of allDestinations) {
        const tile = state.tiles[dest.y][dest.x];
        const isCapturable = ['city', 'factory', 'airport', 'port', 'hq'].includes(tile.type);

        if (isCapturable && tile.ownerId !== unit.ownerId) {
          let captureValue = 1500;
          if (tile.type === 'hq') captureValue = 9000; // Prioridad absoluta: capturar el HQ enemigo
          if (tile.type === 'factory') captureValue = 3500;
          if (tile.type === 'city') captureValue = 2000;

          // Bono por completar capturas ya avanzadas
          const captureHp = tile.captureHp ?? 20;
          if (captureHp < 20) {
            captureValue += (20 - captureHp) * 100;
          }

          if (captureValue > bestAction.score) {
            bestAction = {
              id: `capture_${unit.id}_${dest.x}_${dest.y}`,
              unitId: unit.id,
              actionType: 'MOVE_AND_CAPTURE',
              moveDestination: dest,
              propertyPosition: dest,
              explanation: `${unit.displayName} avanza y captura ${tile.type} en (${dest.x}, ${dest.y})`,
              score: captureValue,
            };
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // HEURÍSTICA 2: COMBATE Y CONCENTRACIÓN DE DAÑO (Costo / Beneficio)
    // ------------------------------------------------------------------------
    for (const dest of allDestinations) {
      const attackerTile = state.tiles[dest.y][dest.x];

      for (const enemy of opponentUnits) {
        const dist = Math.abs(dest.x - enemy.x) + Math.abs(dest.y - enemy.y);
        const inRange = dist >= unit.minRange && dist <= unit.maxRange;

        if (inRange) {
          const defenderTile = state.tiles[enemy.y][enemy.x];
          // Simulación del resultado de combate
          const simAttacker = { ...unit, x: dest.x, y: dest.y };
          const combat = CombatEngine.calculateDamage(simAttacker, enemy, attackerTile, defenderTile);

          if (combat.attackerDamageDealt > 0) {
            let combatScore = combat.attackerDamageDealt * 100;

            // Ponderación según el valor militar de la unidad enemiga
            const targetValueBonus = this.getTargetValueWeight(enemy.unitCode);
            combatScore += targetValueBonus;

            // Bono masivo si el disparo aniquila la unidad
            if (combat.defenderEliminated) {
              combatScore += difficulty === 'chess' ? 3500 : 2000;
            }

            // Cobertura del terreno donde se estaciona el atacante
            combatScore += attackerTile.defenseStars * (difficulty === 'chess' ? 120 : 80);

            // En dificultad Normal/Difícil/Chess, penalizar si el contraataque nos hiere
            if (difficulty !== 'easy' && combat.canCounterAttack) {
              const counterPenalty = difficulty === 'chess' ? 140 : 70;
              combatScore -= combat.counterDamageDealt * counterPenalty;
            }

            // En dificultad Chess: Análisis de ratio financiero neto de intercambio
            if (difficulty === 'chess') {
              const enemyCost = this.getUnitCost(enemy.unitCode);
              const ownCost = this.getUnitCost(unit.unitCode);
              const tradeNet = ((combat.attackerDamageDealt / 10) * enemyCost) - ((combat.counterDamageDealt / 10) * ownCost);
              combatScore += tradeNet * 0.25;
            }

            if (combatScore > bestAction.score) {
              bestAction = {
                id: `attack_${unit.id}_vs_${enemy.id}`,
                unitId: unit.id,
                actionType: 'MOVE_AND_ATTACK',
                moveDestination: dest,
                targetUnitId: enemy.id,
                explanation: `${unit.displayName} ataca a ${enemy.displayName} desde (${dest.x}, ${dest.y}) causando -${combat.attackerDamageDealt} HP`,
                score: combatScore,
              };
            }
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // HEURÍSTICA 3: MOVIMIENTO ESTRATÉGICO HACIA OBJETIVOS DE ALTO VALOR
    // Si no puede capturar ni atacar en este turno, desplazarse hacia el HQ rival
    // ------------------------------------------------------------------------
    if (bestAction.actionType === 'WAIT') {
      const targetCoord = this.findHighestValueObjective(state);
      if (targetCoord) {
        let closestDist = Infinity;
        let chosenDest = { x: unit.x, y: unit.y };

        for (const dest of allDestinations) {
          const distToGoal = Math.abs(dest.x - targetCoord.x) + Math.abs(dest.y - targetCoord.y);
          if (distToGoal < closestDist) {
            closestDist = distToGoal;
            chosenDest = dest;
          }
        }

        if (chosenDest.x !== unit.x || chosenDest.y !== unit.y) {
          bestAction = {
            id: `move_${unit.id}_to_${chosenDest.x}_${chosenDest.y}`,
            unitId: unit.id,
            actionType: 'MOVE_TO_POSITION',
            moveDestination: chosenDest,
            explanation: `${unit.displayName} marcha hacia objetivo en (${targetCoord.x}, ${targetCoord.y})`,
            score: 150 - closestDist * 5,
          };
        }
      }
    }

    return bestAction;
  }

  /**
   * Ejecuta el turno del Bot de forma asíncrona simulando pausas humanas entre cada acción.
   */
  public static async executeBotTurnAsync(
    state: BotGameState,
    difficulty: BotDifficulty = 'normal',
    onActionCallback: (action: BotAction, index: number, total: number) => Promise<void> | void,
    delayMs: number = 550
  ): Promise<BotTurnPlan> {
    const plan = this.computeBotTurn(state, difficulty);

    for (let i = 0; i < plan.actions.length; i++) {
      const action = plan.actions[i];
      await onActionCallback(action, i, plan.actions.length);

      // Pausa natural entre acciones consecutivas
      if (action.actionType !== 'END_TURN' && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return plan;
  }

  // ========================================================================
  // MÉTODOS AUXILIARES DE EVALUACIÓN
  // ========================================================================

  private static getTargetValueWeight(unitCode: string): number {
    switch (unitCode) {
      case 'bomber':
      case 'battleship':
        return 900;
      case 'tank_medium':
      case 'rocket':
        return 750;
      case 'artillery':
      case 'anti_air':
      case 'b_copter':
        return 600;
      case 'tank_light':
        return 450;
      case 'mech':
      case 'recon':
        return 250;
      default:
        return 150;
    }
  }

  private static decideFactoryProduction(
    funds: number,
    units: TacticalUnit[],
    botOwnerId: string,
    difficulty: BotDifficulty
  ): string | null {
    if (funds < 1000) return null;

    const myUnits = units.filter(u => u.ownerId === botOwnerId);
    const enemyUnits = units.filter(u => u.ownerId !== botOwnerId);
    const myInfantry = myUnits.filter(u => u.unitCode === 'infantry' || u.unitCode === 'mech');

    // Si el bot no tiene tropas para capturar ciudades, prioriza infantería
    if (myInfantry.length < 2 && funds >= 1000) {
      return 'infantry';
    }

    if (difficulty === 'easy') {
      return Math.random() > 0.5 ? 'tank_light' : 'infantry';
    }

    // Dificultad 'chess': Producción contra-unidad determinista y óptima
    if (difficulty === 'chess') {
      const enemyAir = enemyUnits.filter(u => u.unitCode === 'b_copter' || u.unitCode === 'fighter' || u.unitCode === 'bomber');
      const myAntiAir = myUnits.filter(u => u.unitCode === 'anti_air' || u.unitCode === 'fighter');
      
      // Contramedida aérea prioritaria
      if (enemyAir.length > myAntiAir.length && funds >= 8000) {
        return 'anti_air';
      }

      const enemyTanks = enemyUnits.filter(u => u.unitCode === 'tank_medium' || u.unitCode === 'tank_light');
      const myHeavyAttack = myUnits.filter(u => u.unitCode === 'tank_medium' || u.unitCode === 'artillery' || u.unitCode === 'rocket');

      // Amenaza de blindados enemigos: contraatacar con MBT o artillería de asedio
      if (enemyTanks.length > myHeavyAttack.length) {
        if (funds >= 16000) return 'tank_medium';
        if (funds >= 15000) return 'rocket';
        if (funds >= 6000) return 'artillery';
        if (funds >= 3000) return 'mech';
      }

      // Máxima eficiencia de capital
      if (funds >= 16000) return 'tank_medium';
      if (funds >= 7000) return 'tank_light';
      if (funds >= 6000) return 'artillery';
      if (funds >= 3000) return 'mech';
      if (funds >= 1000) return 'infantry';
      return null;
    }

    // Dificultad Normal / Difícil
    if (funds >= 16000) return 'tank_medium';
    if (funds >= 8000 && Math.random() > 0.4) return 'anti_air';
    if (funds >= 7000) return 'tank_light';
    if (funds >= 6000) return 'artillery';
    if (funds >= 3000) return 'mech';
    if (funds >= 1000) return 'infantry';

    return null;
  }

  private static getUnitCost(unitCode: string): number {
    const costs: Record<string, number> = {
      infantry: 1000,
      mech: 3000,
      recon: 4000,
      tank_light: 7000,
      artillery: 6000,
      anti_air: 8000,
      b_copter: 9000,
      rocket: 15000,
      tank_medium: 16000,
      fighter: 20000,
      bomber: 22000,
      battleship: 28000,
    };
    return costs[unitCode] ?? 1000;
  }

  private static findHighestValueObjective(state: BotGameState): GridPosition | null {
    // 1. Buscar el Cuartel General del rival (Victoria total)
    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        const tile = state.tiles[y][x];
        if (tile.type === 'hq' && tile.ownerId === state.opponentPlayerId) {
          return { x, y };
        }
      }
    }

    // 2. Buscar ciudades neutrales o enemigas
    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        const tile = state.tiles[y][x];
        if ((tile.type === 'city' || tile.type === 'factory') && tile.ownerId !== state.botPlayerId) {
          return { x, y };
        }
      }
    }

    return null;
  }
}

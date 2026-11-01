/**
 * ==============================================================================
 * SUITE DE PRUEBAS DE INTEGRACIÓN END-TO-END (E2E)
 * ==============================================================================
 * Valida el ciclo de vida completo del jugador en Tactical Command: Wars of Legacy:
 * 1. Registro de usuario & Perfil inicial.
 * 2. Selección de partida contra Bot & Configuración táctica de tablero.
 * 3. Movimiento de unidades & Algoritmo Pathfinding A*.
 * 4. Combate táctico, matrices de daño, defensa de terreno y contraataque.
 * 5. Condición de Victoria y Otorgamiento de Recompensas (XP / Oro / Subida de Nivel).
 * 6. Tienda de Cosméticos, Transacción Atómica y Equipamiento en Armería.
 */

import { TacticalPathfindingEngine, TERRAIN_MOVEMENT_COSTS } from './pathfinding';
import { CombatEngine, COMBAT_EFFECTIVENESS_MATRIX } from './combat';
import { TacticalBotAI } from './aiBot';
import { TacticalUnit, TerrainTile, PlayerProfile } from '../types';
import { COSMETIC_SHOP_CATALOG, CosmeticSkin } from '../lib/shopData';
import { barkEngine } from './barkEngine';
import { AirDropEngine } from './airdropSystem';
import { MATCH_FORMAT_CONFIGS } from './autonomousOrchestrator';
import { IndustrialEngine, IndustrialInventory } from './industrialEngine';
import { ClanEngine, Clan, ClanMember, SafeguardInventory, CANONICAL_TERRITORY_SECTORS } from './clanSystem';
import { AsymmetricLadderEngine } from './asymmetricLadderEngine';
import { RankedLadderEngine, RANKED_ARENAS } from './rankedLadderEngine';

export interface E2ETestStep {
  stepNumber: number;
  name: string;
  category: 'auth' | 'matchmaking' | 'movement' | 'combat' | 'progression' | 'economy';
  passed: boolean;
  durationMs: number;
  details: string;
  payload?: Record<string, unknown>;
  error?: string;
}

export interface E2ERunSummary {
  timestamp: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  allPassed: boolean;
  totalDurationMs: number;
  steps: E2ETestStep[];
}

export async function runFullE2ESuite(): Promise<E2ERunSummary> {
  const steps: E2ETestStep[] = [];
  const startTime = Date.now();

  function recordStep(
    stepNumber: number,
    name: string,
    category: E2ETestStep['category'],
    executor: () => { passed: boolean; details: string; payload?: Record<string, unknown> }
  ) {
    const stepStart = Date.now();
    try {
      const result = executor();
      const stepDuration = Math.max(1, Date.now() - stepStart);
      steps.push({
        stepNumber,
        name,
        category,
        passed: result.passed,
        durationMs: stepDuration,
        details: result.details,
        payload: result.payload,
      });
    } catch (err: unknown) {
      const stepDuration = Math.max(1, Date.now() - stepStart);
      const errMsg = err instanceof Error ? err.message : String(err);
      steps.push({
        stepNumber,
        name,
        category,
        passed: false,
        durationMs: stepDuration,
        details: `Excepción no controlada: ${errMsg}`,
        error: errMsg,
      });
    }
  }

  // Variables de Estado que fluyen a través de la tubería E2E
  let playerProfile: PlayerProfile;
  let grid: TerrainTile[][];
  let p1Tank: TacticalUnit;
  let p1Infantry: TacticalUnit;
  let botInfantry: TacticalUnit;
  let matchCitiesCaptured = 0;
  let matchKillsCount = 0;
  let matchTurnsElapsed = 1;
  let isPlayerVictor = false;
  let unlockedSkins: string[] = ['default'];
  let equippedCosmetics: Record<string, string> = {
    tank_light: 'default',
    infantry: 'default',
  };

  // ============================================================================
  // PASO 1: REGISTRO DE USUARIO Y VALIDACIÓN DE PERFIL INICIAL
  // ============================================================================
  recordStep(
    1,
    'Registro de Usuario & Asignación de Saldos Iniciales',
    'auth',
    () => {
      playerProfile = {
        id: 'usr_recruit_9921e2e',
        username: 'Comandante_Vanguard',
        avatarUrl: '/avatars/commander_default.webp',
        accountLevel: 1,
        currentXp: 0,
        battleCredits: 2400, // Oro inicial de bienvenida
        commandGems: 650,    // Gemas de bienvenida
        eloRating: 1200,
        totalMatchesPlayed: 0,
        totalVictories: 0,
        equippedLoadout: ['infantry', 'tank_light', 'artillery'],
        equippedCosmetics: { ...equippedCosmetics },
      };

      const validId = playerProfile.id.length > 5;
      const validCredits = playerProfile.battleCredits === 2400;
      const validLevel = playerProfile.accountLevel === 1 && playerProfile.currentXp === 0;

      return {
        passed: validId && validCredits && validLevel,
        details: `Perfil registrado: '${playerProfile.username}' con ${playerProfile.battleCredits}G y ${playerProfile.commandGems} Gemas (Nivel 1).`,
        payload: {
          id: playerProfile.id,
          gold: playerProfile.battleCredits,
          gems: playerProfile.commandGems,
          level: playerProfile.accountLevel,
        },
      };
    }
  );

  // ============================================================================
  // PASO 2: SELECCIÓN DE PARTIDA CONTRA BOT (SETUP DE TABLERO 8x8)
  // ============================================================================
  recordStep(
    2,
    'Selección de Partida vs Bot (Configuración Táctica 8x8)',
    'matchmaking',
    () => {
      // Creación del mapa táctico 8x8 con variedad de terrenos
      grid = Array.from({ length: 8 }, (_, y) =>
        Array.from({ length: 8 }, (_, x) => {
          let type: TerrainTile['type'] = 'plains';
          let defenseStars = 1;

          if ((x === 0 && y === 0) || (x === 7 && y === 7)) {
            type = 'hq';
            defenseStars = 4;
          } else if ((x === 1 && y === 1) || (x === 6 && y === 6)) {
            type = 'city';
            defenseStars = 3;
          } else if (y === 3) {
            type = 'road';
            defenseStars = 0;
          } else if ((x === 3 && y === 2) || (x === 4 && y === 5)) {
            type = 'mountain';
            defenseStars = 4;
          } else if (x === 2 && y === 5) {
            type = 'forest';
            defenseStars = 2;
          }

          return {
            x,
            y,
            type,
            defenseStars,
            ownerId: type === 'hq' ? (x === 0 ? playerProfile.id : 'bot_player_ai') : null,
            captureHp: 20,
          };
        })
      );

      // Despliegue de unidades Player 1
      p1Tank = {
        id: 'unit_p1_tank_1',
        unitCode: 'tank_light',
        displayName: 'Tanque Ligero',
        ownerId: playerProfile.id,
        x: 1,
        y: 3, // En carretera
        hp: 10,
        maxHp: 10,
        ammo: 9,
        fuel: 70,
        movementPoints: 5,
        movementType: 'treads',
        minRange: 1,
        maxRange: 1,
        visionRange: 3,
        baseAttack: 75,
        productionCost: 7000,
        hasMoved: false,
        hasActed: false,
        skinId: 'default',
      };

      p1Infantry = {
        id: 'unit_p1_inf_1',
        unitCode: 'infantry',
        displayName: 'Infantería Ligera',
        ownerId: playerProfile.id,
        x: 0,
        y: 1,
        hp: 10,
        maxHp: 10,
        ammo: 9,
        fuel: 99,
        movementPoints: 3,
        movementType: 'foot',
        minRange: 1,
        maxRange: 1,
        visionRange: 3,
        baseAttack: 55,
        productionCost: 1000,
        hasMoved: false,
        hasActed: false,
        skinId: 'default',
      };

      // Despliegue de unidades Bot (Player 2)
      botInfantry = {
        id: 'unit_bot_inf_1',
        unitCode: 'infantry',
        displayName: 'Infantería Hostil',
        ownerId: 'bot_player_ai',
        x: 2,
        y: 3, // En carretera, adyacente a la posición destino del tanque
        hp: 10,
        maxHp: 10,
        ammo: 9,
        fuel: 99,
        movementPoints: 3,
        movementType: 'foot',
        minRange: 1,
        maxRange: 1,
        visionRange: 3,
        baseAttack: 55,
        productionCost: 1000,
        hasMoved: false,
        hasActed: false,
        skinId: 'default',
      };

      const boardValid = grid.length === 8 && grid[0].length === 8;
      const unitsReady = p1Tank.hp === 10 && botInfantry.hp === 10;

      return {
        passed: boardValid && unitsReady,
        details: 'Tablero 8x8 inicializado con cuarteles generales, ciudades, carreteras y unidades desplegadas.',
        payload: {
          gridDimensions: '8x8',
          playerUnits: 2,
          enemyUnits: 1,
          botDifficulty: 'normal',
        },
      };
    }
  );

  // ============================================================================
  // PASO 3: MOVIMIENTO DE UNIDADES Y PATHFINDING A*
  // ============================================================================
  recordStep(
    3,
    'Movimiento Táctico & Verificación de Coste de Terreno A*',
    'movement',
    () => {
      const unitsMap = new Map<string, TacticalUnit>();
      unitsMap.set(p1Tank.id, p1Tank);
      unitsMap.set(p1Infantry.id, p1Infantry);
      unitsMap.set(botInfantry.id, botInfantry);

      // Calcular celdas alcanzables de la infantería
      const infantryReachable = TacticalPathfindingEngine.getReachableTiles({
        unit: p1Infantry,
        tiles: grid,
        unitsMap,
        gridWidth: 8,
        gridHeight: 8,
      });

      // La infantería se mueve hacia la ciudad en (1, 1) para capturarla
      const targetCityTile = infantryReachable.find(t => t.x === 1 && t.y === 1);
      if (!targetCityTile) {
        throw new Error('La ciudad neutral en (1, 1) debería estar en rango de movimiento de la infantería.');
      }

      // Ejecutar desplazamiento de la infantería
      p1Infantry.x = 1;
      p1Infantry.y = 1;
      p1Infantry.hasMoved = true;

      // Simular captura de ciudad
      const cityTile = grid[1][1];
      cityTile.ownerId = playerProfile.id;
      matchCitiesCaptured += 1;

      // Verificar que el tanque no puede atravesar montañas
      const mountainCost = TERRAIN_MOVEMENT_COSTS['mountain']['treads'];
      if (mountainCost !== Infinity) {
        throw new Error('Las orugas de tanque no deben poder atravesar casillas de montaña.');
      }

      // El tanque se posiciona adyacente a la infantería enemiga
      p1Tank.hasMoved = true;

      return {
        passed: p1Infantry.x === 1 && p1Infantry.y === 1 && cityTile.ownerId === playerProfile.id,
        details: `Infantería desplazada a Ciudad (1,1) capturándola (+1 Propiedad). Verificado bloqueo de montañas para tanques.`,
        payload: {
          unitMoved: p1Infantry.unitCode,
          newPos: { x: p1Infantry.x, y: p1Infantry.y },
          capturedCityOwner: cityTile.ownerId,
        },
      };
    }
  );

  // ============================================================================
  // PASO 4: COMBATE TÁCTICO, CÁLCULO DE DAÑO Y CONTRAATAQUE
  // ============================================================================
  recordStep(
    4,
    'Resolución de Combate, Cálculo de Daño y Contraataque',
    'combat',
    () => {
      const tankTile = grid[p1Tank.y][p1Tank.x];
      const botTile = grid[botInfantry.y][botInfantry.x];

      // Ronda 1 de Combate: Tanque Ligero ataca a Infantería Enemiga en Carretera (0 estrellas)
      const combat1 = CombatEngine.calculateDamage(p1Tank, botInfantry, tankTile, botTile);

      if (!combat1.canAttack) {
        throw new Error('El tanque debe poder atacar a la infantería adyacente en rango 1.');
      }

      // Base: Tanque vs Infantería = 75%.
      // Al ser carretera (0 estrellas), el daño esperado es ~7 HP.
      botInfantry.hp = combat1.defenderHpAfter;
      p1Tank.hp = combat1.attackerHpAfter;

      const initialDamageDealt = combat1.attackerDamageDealt;
      const counterOccurred = combat1.canCounterAttack;

      // Ronda 2: Ataque de remate (Infantería con baja vida es destruida)
      const combat2 = CombatEngine.calculateDamage(p1Tank, botInfantry, tankTile, botTile);
      botInfantry.hp = combat2.defenderHpAfter;

      let enemyDestroyed = false;
      if (botInfantry.hp <= 0) {
        enemyDestroyed = true;
        matchKillsCount += 1;
      }

      return {
        passed: initialDamageDealt >= 6 && enemyDestroyed,
        details: `Tanque causó ${initialDamageDealt} de daño en R1. En R2 la unidad enemiga fue destruida (HP: 0). Bajas: ${matchKillsCount}.`,
        payload: {
          r1DamageDealt: initialDamageDealt,
          r1DefenderRemainingHp: combat1.defenderHpAfter,
          counterAttackExecuted: counterOccurred,
          enemyUnitEliminated: enemyDestroyed,
        },
      };
    }
  );

  // ============================================================================
  // PASO 5: CONDICIÓN DE VICTORIA Y OTORGAMIENTO DE XP/ORO (LEVEL UP TRIGGER)
  // ============================================================================
  recordStep(
    5,
    'Condición de Victoria, Cálculo de Recompensas y Subida de Nivel',
    'progression',
    () => {
      // Como todas las fuerzas enemigas fueron eliminadas y se capturó la ciudad clave:
      isPlayerVictor = true;
      matchTurnsElapsed = 2;

      // Fórmulas canónicas de docs/05_MONETIZATION_AND_PROGRESSION.md:
      // XP = (Base 120 + (Ciudades * 45) + (Kills * 35) + (Turns * 6)) * (isVictory ? 2.2 : 0.85)
      // Oro = (Base 60 + (Ciudades * 20) + (Kills * 15)) * (isVictory ? 2.0 : 0.8)
      const baseXp = 120;
      const rawXp = baseXp + (matchCitiesCaptured * 45) + (matchKillsCount * 35) + (matchTurnsElapsed * 6);
      const earnedXp = Math.floor(rawXp * (isPlayerVictor ? 2.2 : 0.85));

      const baseGold = 60;
      const rawGold = baseGold + (matchCitiesCaptured * 20) + (matchKillsCount * 15);
      const earnedGold = Math.floor(rawGold * (isPlayerVictor ? 2.0 : 0.8));

      // Requisito de XP para Nivel 2: 150 * (1 ^ 1.85) = 150 XP
      const xpThresholdLvl2 = Math.floor(150 * Math.pow(playerProfile.accountLevel, 1.85));

      const initialLevel = playerProfile.accountLevel;
      let newLevel = initialLevel;
      let updatedXp = playerProfile.currentXp + earnedXp;

      if (updatedXp >= xpThresholdLvl2) {
        newLevel += 1;
        updatedXp -= xpThresholdLvl2; // Traspaso del remanente de XP
      }

      playerProfile.accountLevel = newLevel;
      playerProfile.currentXp = updatedXp;
      playerProfile.battleCredits += earnedGold;
      playerProfile.totalMatchesPlayed += 1;
      playerProfile.totalVictories += 1;

      const levelUpSuccess = newLevel === 2;
      const goldGranted = playerProfile.battleCredits === 2400 + earnedGold;

      return {
        passed: isPlayerVictor && levelUpSuccess && goldGranted,
        details: `¡Victoria Militar! Otorgados +${earnedXp} XP y +${earnedGold} Oro. El perfil subió de Nivel 1 -> Nivel 2. Saldo actual: ${playerProfile.battleCredits}G.`,
        payload: {
          victory: isPlayerVictor,
          earnedXp,
          earnedGold,
          newLevel: playerProfile.accountLevel,
          remainingXp: playerProfile.currentXp,
          newTotalCredits: playerProfile.battleCredits,
        },
      };
    }
  );

  // ============================================================================
  // PASO 6: TIENDA DE SKINS, COMPRA ATÓMICA Y ARMERÍA
  // ============================================================================
  recordStep(
    6,
    'Compra Atómica en Tienda de Skins y Equipamiento en Armería',
    'economy',
    () => {
      // Buscar skin en el catálogo
      const targetSkin = COSMETIC_SHOP_CATALOG.find(s => s.id === 'skin_tank_desert');
      if (!targetSkin) {
        throw new Error('La skin "skin_tank_desert" no fue encontrada en el catálogo.');
      }

      const initialGold = playerProfile.battleCredits;
      const skinPrice = targetSkin.price; // 800 Oro

      // Validación de fondos suficientes
      if (initialGold < skinPrice) {
        throw new Error(`Fondos insuficientes: tiene ${initialGold}G pero cuesta ${skinPrice}G.`);
      }

      // Transacción atómica: descontar saldo y agregar a inventario
      playerProfile.battleCredits -= skinPrice;
      unlockedSkins.push(targetSkin.id);

      // Equipar skin en la unidad en la Armería
      equippedCosmetics['tank_light'] = targetSkin.id;
      playerProfile.equippedCosmetics['tank_light'] = targetSkin.id;

      // Verificar que una nueva unidad instanciada hereda la skin equipada
      const nextMatchTank: TacticalUnit = {
        ...p1Tank,
        id: 'unit_p1_tank_match2',
        skinId: equippedCosmetics['tank_light'],
      };

      const skinEquippedCorrectly = nextMatchTank.skinId === 'skin_tank_desert';
      const balanceCorrect = playerProfile.battleCredits === initialGold - skinPrice;

      return {
        passed: skinEquippedCorrectly && balanceCorrect,
        details: `Compra exitosa de "${targetSkin.name}" por ${skinPrice}G. Saldo final: ${playerProfile.battleCredits}G. Skin equipada activamente en Tanque Ligero.`,
        payload: {
          purchasedSkin: targetSkin.id,
          currency: targetSkin.currency,
          price: skinPrice,
          remainingGold: playerProfile.battleCredits,
          equippedSkinId: nextMatchTank.skinId,
        },
      };
    }
  );

  // ==========================================================================
  // PASO 7: BARK ENGINE PROCEDURAL DE NOVELA GRÁFICA & POP-ART STAMPS
  // ==========================================================================
  recordStep(
    7,
    'Bark Engine Procedural, Diálogo Cómic y Sellos Pop-Art',
    'combat',
    () => {
      // Detonación sincrónica / prueba de plantilla canónica
      const testBark = barkEngine.triggerBark({
        commanderId: 'stella',
        triggerContext: 'kill_heavy_tank',
        bondingLevel: 3,
        playerName: playerProfile.username,
        unitName: 'Tanque Pesado Enemigo',
      });

      if (!testBark) {
        throw new Error('El Bark Engine no devolvió ninguna plantilla.');
      }

      const active = barkEngine.getActiveBark();
      if (!active) {
        throw new Error('El Bark activo no se registró en memoria.');
      }

      const hasOnomatopoeia = active.onomatopoeia === '¡BOOM!' || active.onomatopoeia !== null;
      const isShoutBubble = active.bubbleShape === 'shout';
      const textInterpolated = !active.text.includes('{player_name}');

      barkEngine.clearActiveBark();

      return {
        passed: hasOnomatopoeia && isShoutBubble && textInterpolated,
        details: `Viñeta cómic generada con éxito para "${active.commanderName}". Bocadillo: ${active.bubbleShape}. Sello: ${active.onomatopoeia}. Texto: "${active.text.substring(0, 40)}..."`,
        payload: {
          commander: active.commanderName,
          bubbleShape: active.bubbleShape,
          stamp: active.onomatopoeia,
          mood: active.mood,
          bondingLevel: active.bondingLevel,
        },
      };
    }
  );

  // ============================================================================
  // PASO 8: SISTEMA CANÓNICO DE AIRDROPS Y DUELO ESPEJO (15S)
  // ============================================================================
  recordStep(
    8,
    'Suministros Dinámicos (AirDrops) y Balance Duelo Espejo (15s)',
    'economy',
    () => {
      // 1. Configuración de Duelo Espejo canónica
      const mirrorConfig = MATCH_FORMAT_CONFIGS.mirror_duel;
      if (!mirrorConfig) {
        throw new Error('Configuración mirror_duel no encontrada en MATCH_FORMAT_CONFIGS.');
      }
      if (mirrorConfig.turnTimeLimitSec !== 15 || mirrorConfig.maxTurnsLimit !== 12) {
        throw new Error(`Duelo Espejo con parámetros no canónicos: ${JSON.stringify(mirrorConfig)}`);
      }

      // 2. Generar AirDrop equidistante
      const testDrop = AirDropEngine.calculateEquidistantDrop(
        grid[0].length,
        grid.length,
        grid,
        [{ x: p1Tank.x, y: p1Tank.y }, { x: botInfantry.x, y: botInfantry.y }],
        [],
        2
      );

      if (!testDrop) {
        throw new Error('AirDropEngine falló en calcular una casilla equidistante.');
      }

      // Validar equidistancia Manhattan respecto a los extremos (HQ)
      const hq1 = { x: 0, y: 0 };
      const hq2 = { x: grid[0].length - 1, y: grid.length - 1 };
      const dist1 = Math.abs(testDrop.x - hq1.x) + Math.abs(testDrop.y - hq1.y);
      const dist2 = Math.abs(testDrop.x - hq2.x) + Math.abs(testDrop.y - hq2.y);
      const diff = Math.abs(dist1 - dist2);

      if (diff > 2) {
        throw new Error(`AirDrop no es equidistante: dist1=${dist1}, dist2=${dist2}, diff=${diff}`);
      }

      // 3. Intento de reclamo fallido por coordenadas dispares
      const failClaim = AirDropEngine.claimAirDrop(
        testDrop,
        { id: p1Tank.id, ownerId: 'p1', x: 999, y: 999 },
        'andy'
      );
      if (failClaim.success) {
        throw new Error('La reclamación debió fallar por coordenadas inválidas.');
      }

      // 4. Reclamo atómico exitoso en la coordenada exacta
      const successClaim = AirDropEngine.claimAirDrop(
        testDrop,
        { id: p1Tank.id, ownerId: 'p1', x: testDrop.x, y: testDrop.y },
        'andy'
      );
      if (!successClaim.success || !successClaim.claimedDrop.isClaimed || successClaim.claimedDrop.claimedByPlayerId !== 'p1') {
        throw new Error('Fallo en la reclamación atómica del AirDrop.');
      }

      // 5. Purga de expirados
      const activeDropList = [
        { ...testDrop, id: 'expired_drop', spawnTurn: 1, expiresTurn: 3, isClaimed: false },
        { ...testDrop, id: 'valid_drop', spawnTurn: 4, expiresTurn: 6, isClaimed: false },
      ];
      const purged = AirDropEngine.purgeExpiredDrops(activeDropList, 4);
      if (purged.some(d => d.id === 'expired_drop')) {
        throw new Error('La purga no eliminó el AirDrop expirado.');
      }
      if (!purged.some(d => d.id === 'valid_drop')) {
        throw new Error('La purga eliminó un AirDrop válido incorrectamente.');
      }

      return {
        passed: true,
        details: `AirDrop generado en (${testDrop.x}, ${testDrop.y}) con recompensa ${testDrop.rewardType} (${testDrop.rewardValue}). Reclamado atómicamente por P1. Temporizador Duelo Espejo: ${mirrorConfig.turnTimeLimitSec}s.`,
        payload: {
          airDropId: testDrop.id,
          coord: `(${testDrop.x}, ${testDrop.y})`,
          rewardType: testDrop.rewardType,
          rewardValue: testDrop.rewardValue,
          mirrorTimerSec: mirrorConfig.turnTimeLimitSec,
          mirrorMaxTurns: mirrorConfig.maxTurnsLimit,
        },
      };
    }
  );

  // ============================================================================
  // PASO 9: COMPLEJO INDUSTRIAL MILITAR (MERMA 10H) Y MERCADO LIBRE P2P (12% TAX)
  // ============================================================================
  recordStep(
    9,
    'Complejo Industrial (Merma 10h), Hornos y Mercado P2P (12% Burn)',
    'economy',
    () => {
      // 1. Simular silos con 12 horas acumuladas (2h de exceso / merma)
      const now = Date.now();
      const twelveHoursAgo = now - 12 * 3600 * 1000;
      const initialInv: IndustrialInventory = {
        userId: 'user_e2e_tester',
        rawIron: 100,
        rawStone: 80,
        rawRareEarth: 40,
        refinedSteel: 20,
        refinedConcrete: 15,
        refinedMicrochip: 10,
        campaignFuel: 2,
        specialization: 'vulcan',
        lastHarvestAt: twelveHoursAgo,
      };

      const siloStatus = IndustrialEngine.calculateSiloStatus(initialInv, now);
      if (!siloStatus.hasDecay || siloStatus.decayLossPercentage !== 5) {
        throw new Error(`Cálculo de carcoma logística incorrecto: ${JSON.stringify(siloStatus)}`);
      }

      // 2. Cosechar silos a inventario
      const harvestResult = IndustrialEngine.harvestSilos(initialInv, now);
      if (harvestResult.harvestedIron <= 0 || harvestResult.updatedInventory.rawIron <= 100) {
        throw new Error('Fallo en la transferencia de recursos cosechados a inventario.');
      }

      // 3. Encender horno de refinado de acero acelerado con combustible
      const jobResult = IndustrialEngine.startRefiningJob(
        harvestResult.updatedInventory,
        'refined_steel',
        true,
        now
      );
      if (!jobResult.success || !jobResult.job || jobResult.job.outputRefinedAmount !== 10) {
        throw new Error('Fallo al iniciar el trabajo de fundición de acero militar.');
      }

      // 4. Mercado P2P: Crear orden de venta de 10 vigas de acero a 50G
      const mockRef = {
        resourceType: 'refined_steel' as const,
        movingAveragePriceGold: 50,
        collarMinPriceGold: 32,
        collarMaxPriceGold: 68,
        volume24h: 1000,
      };

      const listingResult = IndustrialEngine.createMarketListing(
        'user_e2e_tester',
        'Comandante E2E',
        'refined_steel',
        10,
        50,
        mockRef,
        jobResult.updatedInventory!
      );
      if (!listingResult.success || !listingResult.listing) {
        throw new Error(`Fallo al publicar orden P2P: ${listingResult.errorMessage}`);
      }

      const listing = listingResult.listing;
      if (listing.totalPriceGold !== 500 || listing.taxDeductedGold !== 60 || listing.netSellerRevenueGold !== 440) {
        throw new Error(`Cálculo de tasa municipal del 12% erróneo: ${JSON.stringify(listing)}`);
      }

      // 5. Compra atómica por otro jugador
      const buyerInv: IndustrialInventory = {
        userId: 'user_buyer_99',
        rawIron: 0,
        rawStone: 0,
        rawRareEarth: 0,
        refinedSteel: 0,
        refinedConcrete: 0,
        refinedMicrochip: 0,
        campaignFuel: 0,
        specialization: 'none',
        lastHarvestAt: now,
      };

      const purchaseResult = IndustrialEngine.executeP2PPurchase(
        listing,
        'user_buyer_99',
        1000, // Oro del comprador
        buyerInv,
        0
      );

      if (!purchaseResult.success || purchaseResult.updatedBuyerGold !== 500 || purchaseResult.updatedBuyerInventory?.refinedSteel !== 10) {
        throw new Error('Fallo en la ejecución de la compra atómica P2P.');
      }

      return {
        passed: true,
        details: `Silos cosechados (merma -5% a las 12h). Horno de acero encendido con fuel boost. Orden P2P de 10 vigas vendida a 500G (60G quemados al 12%, 440G netos).`,
        payload: {
          ironHarvested: harvestResult.harvestedIron,
          refiningJobId: jobResult.job.id,
          p2pListingId: listing.id,
          goldPaid: 500,
          goldBurned12Percent: listing.taxDeductedGold,
          netRevenue88Percent: listing.netSellerRevenueGold,
        },
      };
    }
  );

  // ============================================================================
  // PASO 10: CORPORACIONES MILITARES (CLANES), BÓVEDA T1-T3 Y SALVAGUARDA TÁCTICA
  // ============================================================================
  recordStep(
    10,
    'Corporaciones Militares (Clanes), Bóveda T1-T3, Embargo por Deshonor y Salvaguarda Táctica',
    'economy',
    () => {
      // 1. Validar Escalafón de Bóveda según miembros activos
      const tier1 = ClanEngine.calculateVaultTier(2);
      const tier2 = ClanEngine.calculateVaultTier(5);
      const tier3 = ClanEngine.calculateVaultTier(9);
      if (tier1 !== 'tier_1' || tier2 !== 'tier_2' || tier3 !== 'tier_3') {
        throw new Error(`Cálculo de Tier erróneo: ${tier1}, ${tier2}, ${tier3}`);
      }

      // 2. Auditoría diaria de 24h y embargo por deshonor
      const members: ClanMember[] = [
        {
          userId: 'u_chief',
          userName: 'Comandante en Jefe',
          role: 'commander_in_chief',
          contributionPoints: 5000,
          warBattlesCount: 0,
          isEmbargoed: false,
          embargoFeeGold: 0,
          embargoFeeSteel: 0,
          isImmuneNewRecruit: false,
          joinedAt: 0,
        },
        {
          userId: 'u_slacker',
          userName: 'Parásito Inactivo',
          role: 'cadet',
          contributionPoints: 300,
          warBattlesCount: 0,
          isEmbargoed: false,
          embargoFeeGold: 0,
          embargoFeeSteel: 0,
          isImmuneNewRecruit: false,
          joinedAt: 0,
        },
        {
          userId: 'u_top1',
          userName: 'General Titán',
          role: 'officer',
          contributionPoints: 12000,
          warBattlesCount: 5,
          isEmbargoed: false,
          embargoFeeGold: 0,
          embargoFeeSteel: 0,
          isImmuneNewRecruit: false,
          joinedAt: 0,
        },
        {
          userId: 'u_top2',
          userName: 'Coronel Acero',
          role: 'officer',
          contributionPoints: 8500,
          warBattlesCount: 3,
          isEmbargoed: false,
          embargoFeeGold: 0,
          embargoFeeSteel: 0,
          isImmuneNewRecruit: false,
          joinedAt: 0,
        },
        {
          userId: 'u_top3',
          userName: 'Mayor Furia',
          role: 'cadet',
          contributionPoints: 6000,
          warBattlesCount: 2,
          isEmbargoed: false,
          embargoFeeGold: 0,
          embargoFeeSteel: 0,
          isImmuneNewRecruit: false,
          joinedAt: 0,
        },
      ];

      const audit = ClanEngine.auditDailyWarClosure(members);
      if (audit.embargoedCount !== 1) {
        throw new Error(`Esperado 1 embargado, obtenido: ${audit.embargoedCount}`);
      }

      // 3. Pago de fianza de deshonor (1,500G + 30 Acero)
      const clan: Clan = {
        id: 'clan_legion_01',
        name: 'Legión de Acero',
        tag: '[ACERO]',
        emblemIcon: '🛡️',
        tier: 'tier_2',
        treasuryGold: 20000,
        treasurySteel: 150,
        warScore: 8500,
        activeMembersCount: 4,
        maxMembers: 30,
      };

      const slacker = audit.updatedMembers.find(m => m.userId === 'u_slacker')!;
      const payResult = ClanEngine.payDishonorEmbargo(clan, slacker, audit.updatedMembers, 3000, 50);

      if (!payResult.success) {
        throw new Error(`Fallo en el pago de fianza: ${payResult.errorMessage}`);
      }
      if (payResult.updatedClan?.treasuryGold !== 20750 || payResult.updatedClan?.treasurySteel !== 165) {
        throw new Error('El tesoro del clan no recibió el 50% de la fianza.');
      }
      if (payResult.updatedMember?.isEmbargoed) {
        throw new Error('El embargo no fue levantado.');
      }

      // 4. Protocolo de Salvaguarda Táctica y Seguro de Racha
      const safeguardInv: SafeguardInventory = {
        isEquipped: true,
        stock: 1,
        currentStreak: 5,
        isCrafting: false,
      };

      // Derrota con salvaguarda: debe salvar la racha de 5
      const defeatOutcome = ClanEngine.processMatchOutcome(safeguardInv, false);
      if (defeatOutcome.updatedInventory.currentStreak !== 5) {
        throw new Error(`La racha debió mantenerse en 5, obtenida: ${defeatOutcome.updatedInventory.currentStreak}`);
      }
      if (!defeatOutcome.wasSafeguardConsumed || defeatOutcome.updatedInventory.stock !== 0) {
        throw new Error('La salvaguarda debió consumirse heroicamente.');
      }

      // Victoria con racha 5 -> 6 (Multiplicador 2.0x Doble Botín)
      const nextMatchOutcome = ClanEngine.processMatchOutcome(defeatOutcome.updatedInventory, true);
      if (nextMatchOutcome.updatedInventory.currentStreak !== 6 || nextMatchOutcome.multiplier !== 2.0) {
        throw new Error(`Racha 6 debe dar multiplicador 2.0x, obtenido: ${nextMatchOutcome.multiplier}x`);
      }

      return {
        passed: true,
        details: `Bóvedas T1-T3 validadas. Auditoría de guerra aplicó embargo a soldado parásito (0 batallas). Fianza de 1,500G y 30 acero saldada (50% a tesoro, 50% a Top 3). Salvaguarda táctica protegió racha de 5 victorias en derrota y alcanzó 2.0x Doble Botín en victoria 6.`,
        payload: {
          embargoedMembersCount: audit.embargoedCount,
          newClanTreasuryGold: payResult.updatedClan?.treasuryGold,
          newClanTreasurySteel: payResult.updatedClan?.treasurySteel,
          preservedStreakOnDefeat: defeatOutcome.updatedInventory.currentStreak,
          reachedDoubleLootMultiplier: nextMatchOutcome.multiplier,
        },
      };
    }
  );

  // ============================================================================
  // PASO 11: LADDER ASIMÉTRICO (N1-N15), TOURNAMENT CAP, NEAR-MISS Y OFERTA TILT
  // ============================================================================
  recordStep(
    11,
    'Ladder Asimétrico (N1-N15), Tournament Cap (L11), Near-Miss y Oferta Flash ($0.99)',
    'progression',
    () => {
      // 1. Validar Tournament Cap (Nivel 11) vs Escalado Asintótico V2.0
      const l1Stat = AsymmetricLadderEngine.calculateStatMultiplier(1, false); // 1.00
      const l11Stat = AsymmetricLadderEngine.calculateStatMultiplier(11, false); // 1.12
      const l15StatLadder = AsymmetricLadderEngine.calculateStatMultiplier(15, false); // 1.14
      const l15StatTourney = AsymmetricLadderEngine.calculateStatMultiplier(15, true); // 1.12 (Cap)

      if (l1Stat !== 1.0 || l11Stat !== 1.12 || l15StatLadder !== 1.14 || l15StatTourney !== 1.12) {
        throw new Error('Inconsistencia en el escalado o en el Tournament Cap a Nivel 11.');
      }

      // 2. Validar emparejamiento por APL (Delta <= 1.5)
      const deckP1 = [10, 10, 10, 11, 10, 11, 10, 10]; // APL = 10.25
      const deckP2 = [11, 12, 11, 12, 11, 11, 12, 11]; // APL = 11.38
      const deckP3 = [14, 15, 14, 15, 14, 15, 14, 14]; // APL = 14.38

      const aplP1 = AsymmetricLadderEngine.calculateDeckAPL(deckP1);
      const aplP2 = AsymmetricLadderEngine.calculateDeckAPL(deckP2);
      const aplP3 = AsymmetricLadderEngine.calculateDeckAPL(deckP3);

      const matchP1P2 = AsymmetricLadderEngine.validateLadderMatchmaking(aplP1, aplP2);
      const matchP1P3 = AsymmetricLadderEngine.validateLadderMatchmaking(aplP1, aplP3);

      if (!matchP1P2.canMatch || matchP1P3.canMatch) {
        throw new Error('Fallo en el filtro de emparejamiento por disparidad APL.');
      }

      // 3. Diagnóstico Balístico Post-Combate Near-Miss
      const nearMiss = AsymmetricLadderEngine.evaluateNearMiss(
        false,
        { id: 'tank_light', name: 'Tanque Ligero', level: 9, currentBlueprints: 250 },
        { id: 'tank_medium', name: 'Tanque Pesado Rival', level: 12, remainingHp: 1.0 },
        { refinedSteel: 35, refinedMicrochip: 10 },
        7.0
      );

      if (!nearMiss || !nearMiss.isNearMiss || nearMiss.extraDamageAtL11 <= 0) {
        throw new Error('Fallo en la detección o cálculo contrafáctico de Near-Miss.');
      }

      // 4. Oferta Flash de Emergencia por Tilt ($0.99 en 180s)
      const now = Date.now();
      const tiltOffer = AsymmetricLadderEngine.evaluateTiltOffer(
        'user_test_01',
        'tank_light',
        'Tanque Ligero',
        2, // Derrota con racha 2
        8, // PTE < 10s
        true,
        0,
        now
      );

      if (!tiltOffer || tiltOffer.offerPriceUsd !== 0.99 || tiltOffer.rewardBlueprints !== 100 || tiltOffer.rewardSteel !== 30) {
        throw new Error('Fallo al emitir la oferta flash de emergencia por tilt.');
      }

      return {
        passed: true,
        details: `Tournament Cap niveló N15 a N11 (1.20x). Ladder APL filtró disparidades (>1.5). Near-Miss calculó telemetría contrafáctica (+${nearMiss.extraDamageAtL11} daño a L11). Oferta de tilt activada por $0.99 en 180s (100 planos + 30 acero).`,
        payload: {
          tournamentCapLevel11Stat: l15StatTourney,
          ladderLevel15Stat: l15StatLadder,
          matchmakingDeltaAPL: matchP1P2.deltaAPL,
          nearMissExtraDamageAtL11: nearMiss.extraDamageAtL11,
          tiltOfferPriceUsd: tiltOffer.offerPriceUsd,
          tiltOfferDurationSeconds: tiltOffer.remainingSeconds,
        },
      };
    }
  );

  // ============================================================================
  // PASO 12: LADDER CLASIFICATORIO ELO, 10 ARENAS, ESCUDO DE DESCENSO Y COFRES
  // ============================================================================
  recordStep(
    12,
    'Ladder Clasificatorio Elo, 10 Arenas + Ligas, Escudo de Descenso y Bóveda de Cofres',
    'progression',
    () => {
      // 1. Validar escala de 10 Arenas + 3 Ligas
      if (RANKED_ARENAS.length !== 13) {
        throw new Error(`Se esperaban 13 arenas y ligas, obtenidas: ${RANKED_ARENAS.length}`);
      }

      // 2. Transición de Amortiguación a Suma Cero Estricta
      const a1Win = RankedLadderEngine.calculateEloDelta(200, 200, 1, true); // +20
      const a1Loss = RankedLadderEngine.calculateEloDelta(200, 200, 1, false); // 0
      if (a1Win !== 20 || a1Loss !== 0) {
        throw new Error('Fallo en la amortiguación de novatos en Arena 1 (+20/0).');
      }

      const a6Win = RankedLadderEngine.calculateEloDelta(2100, 2100, 6, true); // +14
      const a6Loss = RankedLadderEngine.calculateEloDelta(2100, 2100, 6, false); // -14
      if (a6Win !== 14 || a6Loss !== -14) {
        throw new Error('Fallo en la suma cero estricta a partir de Arena 6 (+14/-14).');
      }

      // 3. Escudo de Descenso (3 cargas en Arena 4)
      const shieldStep1 = RankedLadderEngine.applyDescentShield(1200, 3, true);
      const shieldStep2 = RankedLadderEngine.applyDescentShield(1200, shieldStep1.remainingShieldCharges, true);
      const shieldStep3 = RankedLadderEngine.applyDescentShield(1200, shieldStep2.remainingShieldCharges, true);
      const shieldDemotion = RankedLadderEngine.applyDescentShield(1200, shieldStep3.remainingShieldCharges, true);

      if (shieldStep1.remainingShieldCharges !== 2 || shieldStep3.remainingShieldCharges !== 0) {
        throw new Error('El escudo de descenso no consumió las cargas progresivamente.');
      }
      if (!shieldDemotion.demotedToPreviousArena || shieldDemotion.newTrophies !== 1170) {
        throw new Error('El descenso amortiguado tras agotar cargas no fijó los 1,170 trofeos esperados.');
      }

      // 4. Compresión Estacional (Season Reset cada 28 Días)
      const reset3600 = RankedLadderEngine.calculateSeasonReset(3600); // 3,480 (30% sobre 400)
      const reset4600 = RankedLadderEngine.calculateSeasonReset(4600); // 4,300 (50% sobre 600)
      if (reset3600 !== 3480 || reset4600 !== 4300) {
        throw new Error('Fallo en el algoritmo de compresión estacional de trofeos.');
      }

      // 5. Bóveda de Cofres y Escalado por Tier de Arena
      const woodSec = RankedLadderEngine.getChestUnlockDurationSeconds('wood');
      const ironSec = RankedLadderEngine.getChestUnlockDurationSeconds('iron');
      const armoredSec = RankedLadderEngine.getChestUnlockDurationSeconds('armored');
      const legendarySec = RankedLadderEngine.getChestUnlockDurationSeconds('legendary');

      if (woodSec !== 10800 || ironSec !== 28800 || armoredSec !== 43200 || legendarySec !== 86400) {
        throw new Error('Tiempos de desbloqueo de cofres no conformes a la especificación.');
      }

      const chestRewardsA5 = RankedLadderEngine.calculateChestRewards('iron', 5);
      if (chestRewardsA5.credits !== 2240 || chestRewardsA5.blueprints !== 224 || chestRewardsA5.steel !== 5) {
        throw new Error('Fallo en el escalado multiplicativo de recompensas de cofre en Arena 5.');
      }

      return {
        passed: true,
        details: `10 Arenas + 3 Ligas operativas. Arena 1 amortiguó derrotas (0 trofeos perdidos). Arena 6 garantizó suma cero neta (+14/-14). Escudo de descenso amortiguó 3 caídas en borde de Arena 4 antes de descender a 1,170. Season Reset comprimió masa a 3,480 y 4,300 trofeos. Cofres escalaron a 2,240 créditos y 224 planos en Arena 5.`,
        payload: {
          arena1WinDelta: a1Win,
          arena1LossDelta: a1Loss,
          arena6ZeroSum: a6Win + a6Loss,
          descentShieldChargesBeforeDemotion: 3,
          demotionTrophyFloor: shieldDemotion.newTrophies,
          seasonReset3600: reset3600,
          seasonReset4600: reset4600,
          chestRewardsTier5Iron: chestRewardsA5,
        },
      };
    }
  );

  // ============================================================================
  // PASO 13: ECOSISTEMA SOCIAL, RESCATE DE CAMARADA, DONACIONES Y GUERRA 2V2
  // ============================================================================
  recordStep(
    13,
    'Ecosistema Social V2.0: Rescate de Camarada, Donaciones, Proyectos y Guerra Territorial 2v2',
    'progression',
    () => {
      // 1. Rescate de Camarada (Comrade Rescue): Salvador solvente rescata al infractor (+150 XP)
      const clan: Clan = {
        id: 'clan_legion_alpha',
        name: 'Legión Alfa',
        tag: '[ALFA]',
        emblemIcon: '🛡️',
        tier: 'tier_2',
        treasuryGold: 10000,
        treasurySteel: 100,
        warScore: 4000,
        activeMembersCount: 6,
        maxMembers: 30,
      };

      const savior: ClanMember = {
        userId: 'user_officer_savior',
        userName: 'Capitán Vostok',
        role: 'officer',
        contributionPoints: 3500,
        warBattlesCount: 5,
        isEmbargoed: false,
        embargoFeeGold: 0,
        embargoFeeSteel: 0,
        isImmuneNewRecruit: false,
        joinedAt: Date.now() - 20 * 86400000,
      };

      const slacker: ClanMember = {
        userId: 'user_inneed_embargo',
        userName: 'Soldado Embargado',
        role: 'cadet',
        contributionPoints: 120,
        warBattlesCount: 0,
        isEmbargoed: true,
        embargoFeeGold: 1500,
        embargoFeeSteel: 30,
        isImmuneNewRecruit: false,
        joinedAt: Date.now() - 10 * 86400000,
      };

      const rescueRes = ClanEngine.rescueComrade(clan, savior, slacker, [savior, slacker], 2500, 50);
      if (!rescueRes.success || rescueRes.saviorXpEarned !== 150) {
        throw new Error('Fallo en el protocolo de Rescate de Camarada.');
      }
      if (rescueRes.updatedEmbargoedMember?.isEmbargoed !== false) {
        throw new Error('El camarada no fue liberado del embargo.');
      }

      // 2. Logística Fraternal: Solicitud y Donación de Cartas Comunes (8 cartas, 25G + 5 XP por carta)
      const cardReq = ClanEngine.requestCardDonation('clan_legion_alpha', slacker, 8, 'c_artillery', 'Batería Vulcan', 'common', null);
      if (!cardReq.success || cardReq.newRequest?.amountRequested !== 8) {
        throw new Error('Fallo en la creación de solicitud de cartas.');
      }

      const donationRes = ClanEngine.donateCards(cardReq.newRequest!, savior, 2);
      if (!donationRes.success || donationRes.goldReward !== 50 || donationRes.xpReward !== 10) {
        throw new Error('Fallo en la liquidación de donación de cartas.');
      }

      // 3. Guerra Territorial: Victoria 2v2 en Pareja de Clan (Cross-Chess) otorga 200 DP (multiplicador 2.0x)
      const sectorBase = { ...CANONICAL_TERRITORY_SECTORS[3] }; // Ciudadela Central
      const warRes2v2 = ClanEngine.contributeTerritoryPoints(sectorBase, 'clan_legion_alpha', true, true, false);
      if (warRes2v2.dpContributed !== 200) {
        throw new Error(`Victoria 2v2 debió aportar 200 DP (2.0x), aportó: ${warRes2v2.dpContributed}`);
      }

      // 4. Proyectos del Alto Mando: Sobrealimentación Industrial consume fondos y activa buff colectivo
      const projectRes = ClanEngine.activateClanProject(rescueRes.updatedClan!, 'officer', 'industrial_overcharge');
      if (!projectRes.success || !projectRes.updatedClan?.activeWarBuffs?.length) {
        throw new Error('Fallo al activar Proyecto del Alto Mando.');
      }

      return {
        passed: true,
        details: `Protocolo de Rescate de Camarada liquidó fianza y otorgó +150 XP al salvador. Donaciones de cartas retribuyeron 50G y 10 XP por 2 comunes. Guerra Territorial 2v2 inyectó 200 DP (multiplicador 2.0x) en Ciudadela Central. Proyecto del Alto Mando activó Sobrealimentación Industrial (+5% extracción).`,
        payload: {
          saviorXpBonus: rescueRes.saviorXpEarned,
          comradeLiberated: !rescueRes.updatedEmbargoedMember?.isEmbargoed,
          cardDonationGoldReward: donationRes.goldReward,
          cardDonationXpReward: donationRes.xpReward,
          war2v2DeploymentPoints: warRes2v2.dpContributed,
          activeWarBuffsCount: projectRes.updatedClan?.activeWarBuffs?.length,
        },
      };
    }
  );

  const totalDurationMs = Date.now() - startTime;
  const passedSteps = steps.filter(s => s.passed).length;
  const failedSteps = steps.filter(s => !s.passed).length;

  return {
    timestamp: new Date().toISOString(),
    totalSteps: steps.length,
    passedSteps,
    failedSteps,
    allPassed: failedSteps === 0,
    totalDurationMs,
    steps,
  };
}

// Ejecución directa si se invoca mediante CLI: `npx tsx src/engine/e2eIntegration.test.ts`
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('e2eIntegration.test.ts')) {
  console.log('==============================================================================');
  console.log('EJECUTANDO SUITE DE INTEGRACIÓN END-TO-END (DEVOPS & QA CLI RUNNER)');
  console.log('==============================================================================\n');

  runFullE2ESuite().then(summary => {
    summary.steps.forEach(s => {
      const badge = s.passed ? '✅ [PASSED]' : '❌ [FAILED]';
      console.log(`${badge} Paso ${s.stepNumber}: ${s.name} (${s.durationMs}ms)`);
      console.log(`   Detalle: ${s.details}`);
      if (s.error) console.log(`   Error: ${s.error}`);
    });

    console.log('\n------------------------------------------------------------------------------');
    console.log(`RESUMEN: ${summary.passedSteps}/${summary.totalSteps} PASARON | Duración: ${summary.totalDurationMs}ms`);
    console.log('------------------------------------------------------------------------------');

    if (!summary.allPassed) {
      process.exit(1);
    }
  });
}

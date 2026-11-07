/**
 * ==============================================================================
 * MOTOR DE GUARNICIONES DE IA, INVERSIÓN, UPKEEP Y ASEDIO VIAL (GARRISON ENGINE)
 * ==============================================================================
 * Especificación Canónica: docs/ANALISIS_PROJECT_ALICE_RUTAS_INGENIERIA_MAPA_METAPOLITICA.md
 * Doctrina: Guerra Moderna 2026 (Inanición Logística, Bloqueo de Rutas y Asistencia de Jugador)
 * Bohemia / Eugen Systems Lens: C4ISR, Guerra Electrónica (EW), Killzones y Relevo Operacional
 * ==============================================================================
 */

import {
  RoadGarrison,
  GarrisonTierLevel,
  GarrisonDoctrineType,
  GARRISON_TIER_SPECS,
  RoadBattleEvent,
  RoadClass,
  RoadSurfaceQuality,
  RoadAmbushRiskAssessment,
  RoadAmbushRiskLevel,
  AerialInterceptionResult,
} from '../types/tacticalRoadTypes';
import { roadNetworkEngine } from './roadNetworkEngine';

export interface ClanTreasury {
  clanId: string;
  energyCredits: number;
}

export class RoadGarrisonEngine {
  private garrisons: Map<string, RoadGarrison> = new Map();
  private battles: Map<string, RoadBattleEvent> = new Map();

  /**
   * Despliega una nueva guarnición de IA en un nodo o puesto de control vial
   * Soporta doctrinas tácticas 2026:
   * - standard_infantry
   * - anti_armor_ditch (+50% daño a orugas y frena throughput al 25%)
   * - ew_jammer_bubble (ceguera radar/C4ISR hasta 7.0km en Nivel 4)
   * - c_uas_air_defense (intercepción letal inmediata a drones y helicópteros)
   * - artillery_firebase (fuego de apoyo indirecto a 2 saltos si cuenta con suministros)
   */
  public deployGarrison(
    nodeId: string,
    roadSegmentId: string,
    clanId: string,
    tierLevel: GarrisonTierLevel,
    treasury: ClanTreasury,
    doctrine: GarrisonDoctrineType = 'standard_infantry'
  ): { success: boolean; garrison?: RoadGarrison; reason?: string } {
    const spec = GARRISON_TIER_SPECS[tierLevel];
    if (treasury.energyCredits < spec.initialCostEc) {
      return {
        success: false,
        reason: `Créditos de Energía insuficientes. Requerido: ${spec.initialCostEc} EC, Disponible: ${treasury.energyCredits} EC.`,
      };
    }

    // Comprobar si ya existe guarnición aliada o enemiga en el nodo
    const existing = Array.from(this.garrisons.values()).find(g => g.nodeId === nodeId);
    if (existing) {
      if (existing.clanId === clanId) {
        // Upgrade o cambio doctrinal si es del mismo clan
        const isTierUpgrade = tierLevel > existing.tierLevel;
        const isDoctrineChange = doctrine !== existing.doctrine;

        if (!isTierUpgrade && !isDoctrineChange) {
          return { success: false, reason: 'El puesto ya cuenta con un nivel igual o superior y la misma doctrina.' };
        }

        if (isTierUpgrade) {
          const upgradeCost = spec.initialCostEc - GARRISON_TIER_SPECS[existing.tierLevel].initialCostEc;
          if (treasury.energyCredits < upgradeCost) {
            return {
              success: false,
              reason: `Créditos insuficientes para la mejora. Requerido: ${upgradeCost} EC, Disponible: ${treasury.energyCredits} EC.`,
            };
          }
          treasury.energyCredits -= upgradeCost;
          existing.tierLevel = tierLevel;
          existing.maxHp = spec.hpMax;
          existing.currentHp = Math.max(existing.currentHp, spec.hpMax);
          existing.hourlyUpkeepEc = spec.hourlyUpkeepEc;
        }

        existing.doctrine = doctrine;

        // Efecto colateral: si cambia a anti_armor_ditch, estrangula throughput al 25%
        const seg = roadNetworkEngine.getSegment(existing.roadSegmentId);
        if (seg) {
          if (doctrine === 'anti_armor_ditch') {
            seg.currentThroughput = Math.round(seg.throughputCapacity * 0.25);
          } else {
            seg.currentThroughput = seg.throughputCapacity;
          }
        }

        return { success: true, garrison: existing };
      }
      return { success: false, reason: 'El nudo vial está ocupado por una guarnición hostil.' };
    }

    // Deducir coste inicial del tesoro
    treasury.energyCredits -= spec.initialCostEc;

    const garrisonId = `gar-${nodeId}-${clanId}-${Date.now()}`;
    const newGarrison: RoadGarrison = {
      id: garrisonId,
      nodeId,
      roadSegmentId,
      clanId,
      tierLevel,
      doctrine,
      currentHp: spec.hpMax,
      maxHp: spec.hpMax,
      hourlyUpkeepEc: spec.hourlyUpkeepEc,
      isUnderAttack: false,
      isIsolatedFromSupply: false,
      hoursWithoutSupply: 0,
      lastUpkeepPaidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.garrisons.set(garrisonId, newGarrison);

    // Actualizar controlador en el segmento vial y aplicar doctrinas físicas viales
    const seg = roadNetworkEngine.getSegment(roadSegmentId);
    if (seg) {
      seg.controllerClanId = clanId;
      if (doctrine === 'anti_armor_ditch') {
        // Zanja antitanque: reduce el throughput logístico al 25% de la capacidad
        seg.currentThroughput = Math.round(seg.throughputCapacity * 0.25);
      }
    }

    return { success: true, garrison: newGarrison };
  }

  public getGarrisonByNode(nodeId: string): RoadGarrison | undefined {
    return Array.from(this.garrisons.values()).find(g => g.nodeId === nodeId);
  }

  public getGarrisonById(garrisonId: string): RoadGarrison | undefined {
    return this.garrisons.get(garrisonId);
  }

  public getAllGarrisons(): RoadGarrison[] {
    return Array.from(this.garrisons.values());
  }

  /**
   * Ejecuta el ciclo de cobro de mantenimiento (upkeep) horario y evalúa inanición de suministros
   */
  public processHourlyUpkeepTick(
    clanTreasuries: Map<string, ClanTreasury>,
    activeSupplyHubNodeIds: Set<string>
  ): {
    totalUpkeepDeducted: number;
    garrisonsDemotedOrDestroyed: string[];
    isolatedGarrisons: string[];
  } {
    let totalUpkeepDeducted = 0;
    const demotedOrDestroyed: string[] = [];
    const isolatedGarrisons: string[] = [];

    for (const garrison of this.garrisons.values()) {
      const treasury = clanTreasuries.get(garrison.clanId);

      // 1. Evaluar si la guarnición tiene ruta de suministro abierta hacia algún hub (refinería o terminal)
      let hasSupplyRoute = false;
      for (const hubId of activeSupplyHubNodeIds) {
        const route = roadNetworkEngine.findOptimalRoadRoute(hubId, garrison.nodeId, garrison.clanId);
        if (route.found) {
          hasSupplyRoute = true;
          break;
        }
      }

      if (!hasSupplyRoute) {
        garrison.isIsolatedFromSupply = true;
        garrison.hoursWithoutSupply += 1;
        isolatedGarrisons.push(garrison.id);

        // Atrición por aislamiento (pierde 20% de HP por hora sin suministros)
        const attritionDamage = Math.round(garrison.maxHp * 0.20);
        garrison.currentHp -= attritionDamage;

        if (garrison.currentHp <= 0) {
          this.destroyGarrison(garrison.id);
          demotedOrDestroyed.push(garrison.id);
          continue;
        }
      } else {
        garrison.isIsolatedFromSupply = false;
        garrison.hoursWithoutSupply = 0;
      }

      // 2. Cobro de Upkeep en Créditos de Energía (EC)
      if (treasury && treasury.energyCredits >= garrison.hourlyUpkeepEc) {
        treasury.energyCredits -= garrison.hourlyUpkeepEc;
        totalUpkeepDeducted += garrison.hourlyUpkeepEc;
        garrison.lastUpkeepPaidAt = new Date().toISOString();
      } else {
        // No hay saldo para pagar el mantenimiento: decae un nivel de fortificación
        if (garrison.tierLevel > 1) {
          garrison.tierLevel = (garrison.tierLevel - 1) as GarrisonTierLevel;
          const newSpec = GARRISON_TIER_SPECS[garrison.tierLevel];
          garrison.maxHp = newSpec.hpMax;
          garrison.currentHp = Math.min(garrison.currentHp, newSpec.hpMax);
          garrison.hourlyUpkeepEc = newSpec.hourlyUpkeepEc;
          demotedOrDestroyed.push(garrison.id);
        } else {
          // Si era nivel 1 y no puede pagar, se desmantela
          this.destroyGarrison(garrison.id);
          demotedOrDestroyed.push(garrison.id);
        }
      }
    }

    return {
      totalUpkeepDeducted,
      garrisonsDemotedOrDestroyed: demotedOrDestroyed,
      isolatedGarrisons,
    };
  }

  // ============================================================================
  // DOCTRINAS MILITARES 2026: C4ISR, EW, C-UAS, ARTILLERÍA Y COMBATE ASIMÉTRICO
  // ============================================================================

  /**
   * Obtiene el radio de inhibición EW de una guarnición en km.
   * La doctrina 'ew_jammer_bubble' garantiza cobertura activa C4ISR de hasta 7.0km en Nivel 4.
   */
  public getGarrisonJammingRadiusKm(garrisonId: string): number {
    const garrison = this.garrisons.get(garrisonId);
    if (!garrison) return 0;
    const spec = GARRISON_TIER_SPECS[garrison.tierLevel];
    if (garrison.doctrine === 'ew_jammer_bubble') {
      return spec.ewJammingRadiusKm;
    }
    return spec.ewJammingRadiusKm || 0;
  }

  /**
   * Determina si unas coordenadas geodésicas están bajo la ceguera de guerra electrónica
   * provocada por una burbuja EW hostil ('ew_jammer_bubble').
   */
  public isAreaJammedByEW(
    coords: [number, number],
    observerClanId: string
  ): { jammed: boolean; jammingGarrisonId?: string; radiusKm?: number; distanceKm?: number } {
    for (const garrison of this.garrisons.values()) {
      if (garrison.clanId === observerClanId) continue;
      if (garrison.doctrine !== 'ew_jammer_bubble') continue;

      const node = roadNetworkEngine.getNode(garrison.nodeId);
      if (!node) continue;

      const radius = this.getGarrisonJammingRadiusKm(garrison.id);
      const dx = (coords[0] - node.coordinates[0]) * 111.32 * Math.cos((node.coordinates[1] * Math.PI) / 180);
      const dy = (coords[1] - node.coordinates[1]) * 110.57;
      const distanceKm = Math.sqrt(dx * dx + dy * dy);

      if (distanceKm <= radius) {
        return {
          jammed: true,
          jammingGarrisonId: garrison.id,
          radiusKm: radius,
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      }
    }

    return { jammed: false };
  }

  /**
   * Ejecuta la intercepción antiaérea C-UAS contra drones de reconocimiento o helicópteros.
   * La doctrina 'c_uas_air_defense' produce intercepción letal inmediata.
   */
  public interceptAerialThreat(
    garrisonId: string,
    target: { unitType: string; hp: number }
  ): AerialInterceptionResult {
    const garrison = this.garrisons.get(garrisonId);
    if (!garrison) {
      return {
        intercepted: false,
        lethal: false,
        damageDealt: 0,
        remainingHp: target.hp,
        reason: 'Guarnición no encontrada.',
      };
    }

    const isAirThreat = /helicopter|chopper|drone|recon|uav/i.test(target.unitType);
    if (!isAirThreat) {
      return {
        intercepted: false,
        lethal: false,
        damageDealt: 0,
        remainingHp: target.hp,
        reason: 'El objetivo no es un vector aéreo hostil ni dron de reconocimiento.',
      };
    }

    if (garrison.doctrine === 'c_uas_air_defense') {
      return {
        intercepted: true,
        lethal: true,
        damageDealt: target.hp,
        remainingHp: 0,
        reason: 'Intercepción letal inmediata C-UAS ejecutada: amenaza aérea neutralizada por fuego guiado.',
      };
    }

    // Cobertura estándar según Tier (sin doctrina especializada letal)
    const spec = GARRISON_TIER_SPECS[garrison.tierLevel];
    if (spec.antiDroneCoverage && /drone|recon|uav/i.test(target.unitType)) {
      const damage = Math.min(target.hp, 600);
      return {
        intercepted: true,
        lethal: damage >= target.hp,
        damageDealt: damage,
        remainingHp: target.hp - damage,
        reason: 'Intercepción convencional antiaérea (daño parcial a dron sin doctrina C-UAS).',
      };
    }

    return {
      intercepted: false,
      lethal: false,
      damageDealt: 0,
      remainingHp: target.hp,
      reason: 'La guarnición carece de sistema C-UAS especializado para derribar este objetivo.',
    };
  }

  /**
   * Evalúa si una batería de artillería ('artillery_firebase') puede prestar fuego de apoyo
   * a un segmento vial objetivo (alcance máximo: 2 saltos en el grafo vial y requiere suministros).
   */
  public canProvideArtillerySupport(
    garrisonId: string,
    targetRoadSegmentId: string
  ): { canSupport: boolean; hops: number; reason?: string } {
    const garrison = this.garrisons.get(garrisonId);
    if (!garrison) {
      return { canSupport: false, hops: Infinity, reason: 'Guarnición no encontrada.' };
    }

    if (garrison.doctrine !== 'artillery_firebase') {
      return {
        canSupport: false,
        hops: Infinity,
        reason: 'La guarnición no posee doctrina de batería de artillería (artillery_firebase).',
      };
    }

    if (garrison.isIsolatedFromSupply) {
      return {
        canSupport: false,
        hops: Infinity,
        reason: 'Batería sin suministros: carece de munición y proyectiles para fuego de apoyo.',
      };
    }

    const hops = roadNetworkEngine.getHopsToSegment(garrison.nodeId, targetRoadSegmentId);
    if (hops <= 2) {
      return { canSupport: true, hops };
    }

    return {
      canSupport: false,
      hops,
      reason: `Objetivo fuera de alcance (distancia: ${hops} saltos; alcance máximo: 2 saltos).`,
    };
  }

  /**
   * Calcula el daño acumulado de fuego de apoyo de artillería para un bando en un segmento vial
   */
  public calculateArtillerySupportDamage(clanId: string, targetRoadSegmentId: string): number {
    let totalSupportDamage = 0;
    for (const garrison of this.garrisons.values()) {
      if (
        garrison.clanId === clanId &&
        garrison.doctrine === 'artillery_firebase' &&
        !garrison.isIsolatedFromSupply
      ) {
        const support = this.canProvideArtillerySupport(garrison.id, targetRoadSegmentId);
        if (support.canSupport) {
          totalSupportDamage += 80; // Bono de bombardeo guiado por batería
        }
      }
    }
    return totalSupportDamage;
  }

  // ============================================================================
  // EVALUACIÓN DE ZONAS DE MUERTE (KILLZONES) Y EMBOSCADAS EN VÍAS
  // ============================================================================

  /**
   * Evalúa la vulnerabilidad de un segmento vial a emboscadas, IEDs y killzones tácticas.
   * Las vías 'dirt' y 'gravel' con bajo throughput constituyen trampas de atrición crítica.
   */
  public evaluateRoadAmbushRisk(
    roadSegmentId: string,
    roadClass?: RoadClass,
    surfaceQuality?: RoadSurfaceQuality
  ): RoadAmbushRiskAssessment {
    const seg = roadNetworkEngine.getSegment(roadSegmentId);
    const effectiveRoadClass = roadClass || seg?.roadClass || 'rural_track';
    const effectiveSurface = surfaceQuality || seg?.surfaceQuality || 'dirt';
    const currentThroughput = seg ? seg.currentThroughput : 100;

    // 1. Vulnerabilidad por superficie: dirt y gravel permiten enterramiento rápido de IEDs
    let surfaceRiskFactor = 0.15;
    if (effectiveSurface === 'dirt') surfaceRiskFactor = 0.45;
    else if (effectiveSurface === 'gravel') surfaceRiskFactor = 0.35;
    else if (effectiveSurface === 'paved_asphalt') surfaceRiskFactor = 0.15;
    else if (effectiveSurface === 'reinforced_concrete') surfaceRiskFactor = 0.05;

    // 2. Factor según jerarquía de vía (pistas rurales y puentes son cuellos de botella)
    let roadClassFactor = 0.15;
    if (effectiveRoadClass === 'rural_track') roadClassFactor = 0.30;
    else if (effectiveRoadClass === 'bridge') roadClassFactor = 0.25;
    else if (effectiveRoadClass === 'industrial_collector') roadClassFactor = 0.20;
    else if (effectiveRoadClass === 'urban_artery') roadClassFactor = 0.15;
    else if (effectiveRoadClass === 'avenue') roadClassFactor = 0.10;
    else if (effectiveRoadClass === 'highway') roadClassFactor = 0.05;

    // 3. Vulnerabilidad por baja fluidez/throughput (convoyes obligados a frenar)
    const throughputVulnerabilityFactor = Number(((100 - currentThroughput) / 100 * 0.30).toFixed(2));

    const rawScore = surfaceRiskFactor + roadClassFactor + throughputVulnerabilityFactor;
    const ambushRiskScore = Number(Math.min(1.0, Math.max(0.0, rawScore)).toFixed(2));

    const isDirtOrGravel = effectiveSurface === 'dirt' || effectiveSurface === 'gravel';
    const isLowThroughput = currentThroughput <= 50;
    const isKillzone = ambushRiskScore >= 0.65 || (isDirtOrGravel && isLowThroughput);

    let riskLevel: RoadAmbushRiskLevel = 'LOW';
    if (ambushRiskScore >= 0.70 || (isKillzone && ambushRiskScore >= 0.65)) {
      riskLevel = 'EXTREME_KILLZONE';
    } else if (ambushRiskScore >= 0.50) {
      riskLevel = 'HIGH';
    } else if (ambushRiskScore >= 0.25) {
      riskLevel = 'MEDIUM';
    }

    const iedVulnerabilityMultiplier = Number((1.0 + ambushRiskScore * 1.5).toFixed(2));
    const ambushDamageBonusPercent = Math.round(ambushRiskScore * 75);

    return {
      roadSegmentId,
      ambushRiskScore,
      riskLevel,
      iedVulnerabilityMultiplier,
      ambushDamageBonusPercent,
      isKillzone,
      factors: {
        surfaceRiskFactor,
        roadClassFactor,
        throughputVulnerabilityFactor,
      },
    };
  }

  // ============================================================================
  // COMBATE OPERACIONAL, COLA DE RELEVO Y ASISTENCIA DE JUGADORES
  // ============================================================================

  /**
   * Inicia o actualiza una refriega en tiempo real entre una guarnición y una fuerza atacante
   */
  public initiateRoadBattle(
    nodeId: string,
    roadSegmentId: string,
    attackerClanId: string,
    initialAttackerHp: number = 2000
  ): RoadBattleEvent {
    const garrison = this.getGarrisonByNode(nodeId);
    const battleId = `battle-${nodeId}-${Date.now()}`;

    const defenderClanId = garrison ? garrison.clanId : 'neutral';
    const defenderHp = garrison ? garrison.currentHp : 500;

    const battle: RoadBattleEvent = {
      battleId,
      roadSegmentId,
      nodeId,
      attackerClanId,
      defenderClanId,
      attackerHp: initialAttackerHp,
      defenderHp,
      attackerReinforcingPlayers: [],
      defenderReinforcingPlayers: [],
      attackerReservePlayers: [],
      defenderReservePlayers: [],
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    };

    if (garrison) {
      garrison.isUnderAttack = true;
    }

    this.battles.set(battleId, battle);
    return battle;
  }

  /**
   * Permite que un comandante humano refuerce la refriega.
   * Regla de Relevo Operacional:
   * - Los 2 primeros comandantes ingresan como activos titulares (+25% daño c/u).
   * - El 3er y 4to comandante ingresan a la reserva de apoyo operacional (+10% pasivo de apoyo a los titulares).
   * - Más de 4 comandantes son rechazados para evitar desequilibrio.
   */
  public joinBattleAsCommander(
    battleId: string,
    userId: string,
    side: 'attacker' | 'defender'
  ): { success: boolean; role?: 'active' | 'reserve'; reason?: string } {
    const battle = this.battles.get(battleId);
    if (!battle) return { success: false, reason: 'Refriega no encontrada.' };
    if (battle.status !== 'in_progress') return { success: false, reason: 'La refriega ya ha concluido.' };

    battle.attackerReinforcingPlayers ??= [];
    battle.defenderReinforcingPlayers ??= [];
    battle.attackerReservePlayers ??= [];
    battle.defenderReservePlayers ??= [];

    const activeList = side === 'attacker' ? battle.attackerReinforcingPlayers : battle.defenderReinforcingPlayers;
    const reserveList = side === 'attacker' ? battle.attackerReservePlayers : battle.defenderReservePlayers;

    if (activeList.includes(userId)) {
      return { success: true, role: 'active' };
    }

    if (reserveList.includes(userId)) {
      return { success: true, role: 'reserve' };
    }

    // Hasta 2 comandantes activos en combate directo
    if (activeList.length < 2) {
      activeList.push(userId);
      battle.updatedAt = new Date().toISOString();
      return { success: true, role: 'active' };
    }

    // El 3er y 4to comandante entran en la reserva de relevo operacional
    if (reserveList.length < 2) {
      reserveList.push(userId);
      battle.updatedAt = new Date().toISOString();
      return {
        success: true,
        role: 'reserve',
        reason: 'Límite titular alcanzado. Asignado a reserva de relevo operacional (+10% potencia de fuego de apoyo).',
      };
    }

    return {
      success: false,
      reason: 'Límite alcanzado: máximo 2 comandantes activos y 2 en reserva de apoyo por frente.',
    };
  }

  /**
   * Relevo operacional: permite que un comandante activo se retire y el primer comandante
   * de la reserva sea promovido automáticamente al frente activo.
   */
  public relieveCommander(
    battleId: string,
    userId: string,
    side: 'attacker' | 'defender'
  ): { success: boolean; promotedUserId?: string; reason?: string } {
    const battle = this.battles.get(battleId);
    if (!battle) return { success: false, reason: 'Refriega no encontrada.' };

    const activeList = side === 'attacker' ? battle.attackerReinforcingPlayers : battle.defenderReinforcingPlayers;
    const reserveList = side === 'attacker' ? (battle.attackerReservePlayers ??= []) : (battle.defenderReservePlayers ??= []);

    const activeIdx = activeList.indexOf(userId);
    if (activeIdx !== -1) {
      activeList.splice(activeIdx, 1);
      let promotedUserId: string | undefined;
      if (reserveList.length > 0) {
        promotedUserId = reserveList.shift()!;
        activeList.push(promotedUserId);
      }
      battle.updatedAt = new Date().toISOString();
      return { success: true, promotedUserId };
    }

    const resIdx = reserveList.indexOf(userId);
    if (resIdx !== -1) {
      reserveList.splice(resIdx, 1);
      battle.updatedAt = new Date().toISOString();
      return { success: true };
    }

    return { success: false, reason: 'El comandante no participa en este frente.' };
  }

  /**
   * Simula un tick determinista de combate operacional (inspirado en Alice military.cpp)
   * Integra:
   * - Bonificación activa (+25% por comandante titular)
   * - Bonificación de reserva (+10% por comandante en reserva de apoyo)
   * - Doctrina 'anti_armor_ditch': +50% daño si el atacante usa orugas (treads)
   * - Fuego de apoyo de 'artillery_firebase' aliada dentro de 2 saltos
   */
  public resolveBattleTick(
    battleId: string,
    attackerUnitType?: string
  ): RoadBattleEvent | undefined {
    const battle = this.battles.get(battleId);
    if (!battle || battle.status !== 'in_progress') return battle;

    const attackerReserveCount = battle.attackerReservePlayers?.length || 0;
    const defenderReserveCount = battle.defenderReservePlayers?.length || 0;

    let attackerMultiplier = 1.0 + (battle.attackerReinforcingPlayers.length * 0.25) + (attackerReserveCount * 0.10);
    let defenderMultiplier = 1.0 + (battle.defenderReinforcingPlayers.length * 0.25) + (defenderReserveCount * 0.10);

    // Efecto doctrinal defensivo: anti_armor_ditch contra orugas
    const garrison = this.getGarrisonByNode(battle.nodeId);
    if (garrison && garrison.doctrine === 'anti_armor_ditch') {
      if (attackerUnitType === 'treads' || (!attackerUnitType && false)) {
        defenderMultiplier += 0.50; // +50% de daño a unidades con orugas
      }
    }

    // Fuego de apoyo de artillería a <= 2 saltos de distancia si tiene suministros
    const defenderArtilleryBonus = this.calculateArtillerySupportDamage(battle.defenderClanId, battle.roadSegmentId);
    const attackerArtilleryBonus = this.calculateArtillerySupportDamage(battle.attackerClanId, battle.roadSegmentId);

    // Desgaste mutuo determinista
    const baseDamage = 150;
    const damageToDefender = Math.round(baseDamage * attackerMultiplier + attackerArtilleryBonus);
    const damageToAttacker = Math.round(baseDamage * 0.9 * defenderMultiplier + defenderArtilleryBonus);

    battle.defenderHp = Math.max(0, battle.defenderHp - damageToDefender);
    battle.attackerHp = Math.max(0, battle.attackerHp - damageToAttacker);

    // Actualizar HP en la guarnición real
    if (garrison) {
      garrison.currentHp = battle.defenderHp;
    }

    // Evaluación de desenlace
    if (battle.defenderHp <= 0) {
      battle.status = 'attacker_victory';
      if (garrison) {
        this.destroyGarrison(garrison.id);
      }
      // Reclamación de soberanía del segmento vial por el atacante
      const seg = roadNetworkEngine.getSegment(battle.roadSegmentId);
      if (seg) {
        seg.controllerClanId = battle.attackerClanId;
      }
    } else if (battle.attackerHp <= 0) {
      battle.status = 'defender_victory';
      if (garrison) {
        garrison.isUnderAttack = false;
      }
    }

    battle.updatedAt = new Date().toISOString();
    return battle;
  }

  public getBattle(battleId: string): RoadBattleEvent | undefined {
    return this.battles.get(battleId);
  }

  public getAllActiveBattles(): RoadBattleEvent[] {
    return Array.from(this.battles.values()).filter(b => b.status === 'in_progress');
  }

  public destroyGarrison(garrisonId: string): void {
    const garrison = this.garrisons.get(garrisonId);
    if (garrison) {
      const seg = roadNetworkEngine.getSegment(garrison.roadSegmentId);
      if (seg) {
        seg.controllerClanId = null;
        // Restaurar throughput si estaba reprimido por zanja antitanque
        if (garrison.doctrine === 'anti_armor_ditch') {
          seg.currentThroughput = seg.throughputCapacity;
        }
      }
      this.garrisons.delete(garrisonId);
    }
  }
}

export const roadGarrisonEngine = new RoadGarrisonEngine();

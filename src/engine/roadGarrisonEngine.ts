/**
 * ==============================================================================
 * MOTOR DE GUARNICIONES DE IA, INVERSIÓN, UPKEEP Y ASEDIO VIAL (GARRISON ENGINE)
 * ==============================================================================
 * Especificación Canónica: docs/ANALISIS_PROJECT_ALICE_RUTAS_INGENIERIA_MAPA_METAPOLITICA.md
 * Doctrina: Guerra Moderna 2026 (Inanición Logística, Bloqueo de Rutas y Asistencia de Jugador)
 * ==============================================================================
 */

import {
  RoadGarrison,
  GarrisonTierLevel,
  GARRISON_TIER_SPECS,
  RoadBattleEvent,
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
   */
  public deployGarrison(
    nodeId: string,
    roadSegmentId: string,
    clanId: string,
    tierLevel: GarrisonTierLevel,
    treasury: ClanTreasury
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
        // Upgrade si es del mismo clan
        if (existing.tierLevel >= tierLevel) {
          return { success: false, reason: 'El puesto ya cuenta con un nivel igual o superior.' };
        }
        const upgradeCost = spec.initialCostEc - GARRISON_TIER_SPECS[existing.tierLevel].initialCostEc;
        treasury.energyCredits -= upgradeCost;
        existing.tierLevel = tierLevel;
        existing.maxHp = spec.hpMax;
        existing.currentHp = spec.hpMax;
        existing.hourlyUpkeepEc = spec.hourlyUpkeepEc;
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

    // Actualizar controlador en el segmento vial
    const seg = roadNetworkEngine.getSegment(roadSegmentId);
    if (seg) {
      seg.controllerClanId = clanId;
    }

    return { success: true, garrison: newGarrison };
  }

  public getGarrisonByNode(nodeId: string): RoadGarrison | undefined {
    return Array.from(this.garrisons.values()).find(g => g.nodeId === nodeId);
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
   * Permite que un jugador humano (máximo 2 por bando) refuerce activamente la refriega
   */
  public joinBattleAsCommander(
    battleId: string,
    userId: string,
    side: 'attacker' | 'defender'
  ): { success: boolean; reason?: string } {
    const battle = this.battles.get(battleId);
    if (!battle) return { success: false, reason: 'Refriega no encontrada.' };
    if (battle.status !== 'in_progress') return { success: false, reason: 'La refriega ya ha concluido.' };

    const targetList = side === 'attacker' ? battle.attackerReinforcingPlayers : battle.defenderReinforcingPlayers;

    if (targetList.includes(userId)) {
      return { success: true }; // Ya está unido
    }

    if (targetList.length >= 2) {
      return { success: false, reason: 'Límite alcanzado: máximo 2 comandantes pueden reforzar este frente.' };
    }

    targetList.push(userId);
    battle.updatedAt = new Date().toISOString();
    return { success: true };
  }

  /**
   * Simula un tick determinista de combate operacional (inspirado en Alice military.cpp)
   */
  public resolveBattleTick(battleId: string): RoadBattleEvent | undefined {
    const battle = this.battles.get(battleId);
    if (!battle || battle.status !== 'in_progress') return battle;

    // Bonificación de comandante humano (+25% daño por jugador acoplado)
    const attackerMultiplier = 1.0 + battle.attackerReinforcingPlayers.length * 0.25;
    const defenderMultiplier = 1.0 + battle.defenderReinforcingPlayers.length * 0.25;

    // Desgaste mutuo determinista
    const baseDamage = 150;
    const damageToDefender = Math.round(baseDamage * attackerMultiplier);
    const damageToAttacker = Math.round(baseDamage * 0.9 * defenderMultiplier);

    battle.defenderHp = Math.max(0, battle.defenderHp - damageToDefender);
    battle.attackerHp = Math.max(0, battle.attackerHp - damageToAttacker);

    // Actualizar HP en la guarnición real
    const garrison = this.getGarrisonByNode(battle.nodeId);
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
      }
      this.garrisons.delete(garrisonId);
    }
  }
}

export const roadGarrisonEngine = new RoadGarrisonEngine();

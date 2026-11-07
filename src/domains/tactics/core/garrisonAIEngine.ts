/**
 * ==============================================================================
 * MOTOR DE GUARNICIONES IA ESCALABLES (GARRISON AI ENGINE)
 * ==============================================================================
 * Especificación Canónica: METAGAME_DESIGN/06_GUARDIAN_AI_AND_HEROES.md §2
 * Mapeo de inversión a niveles cognitivos del orquestador autónomo y balanceo.
 * ==============================================================================
 */

import { GarrisonAIEngineTier } from '@shared';

export interface GarrisonLevelSpec {
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  aiEngineTier: GarrisonAIEngineTier;
  searchEngine: string;
  maxSearchPlies: number;
  maxStateBudget: number;
  maxOperableTier: number;
  activationCostEc: number;
  baseHourlyUpkeepEc: number;
  baseSupplyPoolChassis: number;
  difficultyMultiplier: number;
  allowsHiredGeneral: boolean;
  canTriggerSCOP: boolean;
}

export interface GarrisonInvestmentRebalance {
  currentLevel: 1 | 2 | 3 | 4 | 5;
  targetLevel: 1 | 2 | 3 | 4 | 5;
  upgradeCostEc: number;
  hourlyUpkeepEcDelta: number;
  supplyPoolCapacityDelta: number;
  isValid: boolean;
  error?: string;
}

export class GarrisonAIEngine {
  /**
   * Catálogo canónico de especificaciones técnicas por nivel de guarnición (1 a 5).
   */
  public static readonly GARRISON_TIER_SPECS: Record<1 | 2 | 3 | 4 | 5, GarrisonLevelSpec> = {
    1: {
      level: 1,
      name: 'Milicia Local',
      aiEngineTier: 'easy',
      searchEngine: '1-ply Greedy Heuristic',
      maxSearchPlies: 1,
      maxStateBudget: 250,
      maxOperableTier: 2,
      activationCostEc: 0,
      baseHourlyUpkeepEc: 0,
      baseSupplyPoolChassis: 12,
      difficultyMultiplier: 1.0,
      allowsHiredGeneral: false,
      canTriggerSCOP: false,
    },
    2: {
      level: 2,
      name: 'División Regular',
      aiEngineTier: 'normal',
      searchEngine: '2-ply Positional Minimax',
      maxSearchPlies: 2,
      maxStateBudget: 2500,
      maxOperableTier: 3,
      activationCostEc: 4500,
      baseHourlyUpkeepEc: 180,
      baseSupplyPoolChassis: 24,
      difficultyMultiplier: 1.25,
      allowsHiredGeneral: true,
      canTriggerSCOP: false,
    },
    3: {
      level: 3,
      name: 'Guardia Acorazada Veterana',
      aiEngineTier: 'hard',
      searchEngine: '3-ply Task-Force Tree',
      maxSearchPlies: 3,
      maxStateBudget: 18000,
      maxOperableTier: 4,
      activationCostEc: 18000,
      baseHourlyUpkeepEc: 750,
      baseSupplyPoolChassis: 40,
      difficultyMultiplier: 1.6,
      allowsHiredGeneral: true,
      canTriggerSCOP: true, // Habilita COP
    },
    4: {
      level: 4,
      name: 'Cuerpo de Estado Mayor',
      aiEngineTier: 'chess',
      searchEngine: 'Alpha-Beta (4-5 ply) + Killer Heuristic',
      maxSearchPlies: 5,
      maxStateBudget: 120000,
      maxOperableTier: 4,
      activationCostEc: 65000,
      baseHourlyUpkeepEc: 2800,
      baseSupplyPoolChassis: 60,
      difficultyMultiplier: 2.1,
      allowsHiredGeneral: true,
      canTriggerSCOP: true, // Sincroniza COP y SCOP
    },
    5: {
      level: 5,
      name: 'Gran Mariscal ("Búnker Implacable")',
      aiEngineTier: 'mcts_legendary',
      searchEngine: 'Híbrido Alpha-Beta + MCTS-UCT + Heatmaps',
      maxSearchPlies: 6,
      maxStateBudget: 450000,
      maxOperableTier: 5,
      activationCostEc: 220000,
      baseHourlyUpkeepEc: 9500,
      baseSupplyPoolChassis: 85,
      difficultyMultiplier: 3.0,
      allowsHiredGeneral: true,
      canTriggerSCOP: true, // Sinergia letal con CO Zone
    },
  };

  /**
   * Obtiene la especificación completa para un nivel dado.
   */
  public static getSpec(level: 1 | 2 | 3 | 4 | 5): GarrisonLevelSpec {
    return this.GARRISON_TIER_SPECS[level];
  }

  /**
   * Calcula el coste y delta de balance al reajustar/mejorar una guarnición ("Modo Balanceador").
   */
  public static calculateRebalance(
    currentLevel: 1 | 2 | 3 | 4 | 5,
    targetLevel: 1 | 2 | 3 | 4 | 5,
    availableCreditsEc: number
  ): GarrisonInvestmentRebalance {
    if (targetLevel === currentLevel) {
      return {
        currentLevel,
        targetLevel,
        upgradeCostEc: 0,
        hourlyUpkeepEcDelta: 0,
        supplyPoolCapacityDelta: 0,
        isValid: true,
      };
    }

    if (targetLevel < currentLevel) {
      // Reclasificación a la baja (degradación)
      const currentSpec = this.GARRISON_TIER_SPECS[currentLevel];
      const targetSpec = this.GARRISON_TIER_SPECS[targetLevel];
      return {
        currentLevel,
        targetLevel,
        upgradeCostEc: 0,
        hourlyUpkeepEcDelta: targetSpec.baseHourlyUpkeepEc - currentSpec.baseHourlyUpkeepEc,
        supplyPoolCapacityDelta: targetSpec.baseSupplyPoolChassis - currentSpec.baseSupplyPoolChassis,
        isValid: true,
      };
    }

    // Mejora a un nivel superior
    const currentSpec = this.GARRISON_TIER_SPECS[currentLevel];
    const targetSpec = this.GARRISON_TIER_SPECS[targetLevel];
    const cost = targetSpec.activationCostEc - currentSpec.activationCostEc;

    if (availableCreditsEc < cost) {
      return {
        currentLevel,
        targetLevel,
        upgradeCostEc: cost,
        hourlyUpkeepEcDelta: targetSpec.baseHourlyUpkeepEc - currentSpec.baseHourlyUpkeepEc,
        supplyPoolCapacityDelta: targetSpec.baseSupplyPoolChassis - currentSpec.baseSupplyPoolChassis,
        isValid: false,
        error: `Créditos insuficientes: Se requieren ${cost.toLocaleString()} EC (Disponibles: ${availableCreditsEc.toLocaleString()} EC).`,
      };
    }

    return {
      currentLevel,
      targetLevel,
      upgradeCostEc: cost,
      hourlyUpkeepEcDelta: targetSpec.baseHourlyUpkeepEc - currentSpec.baseHourlyUpkeepEc,
      supplyPoolCapacityDelta: targetSpec.baseSupplyPoolChassis - currentSpec.baseSupplyPoolChassis,
      isValid: true,
    };
  }

  /**
   * Evalúa si una guarnición sufre degradación por agotamiento de chasis.
   */
  public static checkAttritionDowngrade(
    currentLevel: 1 | 2 | 3 | 4 | 5,
    remainingChassisCount: number
  ): {
    needsDowngrade: boolean;
    effectiveLevel: 1 | 2 | 3 | 4 | 5;
    reason?: string;
  } {
    if (remainingChassisCount <= 0 && currentLevel > 1) {
      return {
        needsDowngrade: true,
        effectiveLevel: 1,
        reason: 'Agotamiento total de la reserva de chasis (Supply Pool = 0). Degrada a Milicia Nivel 1.',
      };
    }

    const minChassisThreshold = Math.floor(this.GARRISON_TIER_SPECS[currentLevel].baseSupplyPoolChassis * 0.25);
    if (remainingChassisCount < minChassisThreshold && currentLevel > 2) {
      const downgraded = (currentLevel - 1) as 1 | 2 | 3 | 4 | 5;
      return {
        needsDowngrade: true,
        effectiveLevel: downgraded,
        reason: `Reserva crítica de chasis (<25%). Capacidad reducida a Nivel ${downgraded}.`,
      };
    }

    return {
      needsDowngrade: false,
      effectiveLevel: currentLevel,
    };
  }
}
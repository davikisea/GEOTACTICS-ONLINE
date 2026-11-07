/**
 * ==============================================================================
 * MOTOR DE MANTENIMIENTO, PRODUCCIÓN Y SOBRE-EXPANSIÓN (UPKEEP ENGINE)
 * ==============================================================================
 * Especificación Canónica: METAGAME_DESIGN/03_ECONOMY_PRODUCTION_PIPELINE.md §4
 * y METAGAME_DESIGN/08_RISK-STYLE_EXPANSION_RULES.md §4
 * ==============================================================================
 */

import { MASTER_METAGAME_CONSTANTS, TerritoryNodeType, WeatherType } from '@shared';

export interface TerritoryNodeUpkeepData {
  id: string;
  nodeType: TerritoryNodeType;
  defenseLevel: number;
  energyUpkeep: number;
  outputPerMin: number;
}

export interface UpkeepCalculationInput {
  clanId: string;
  adminCapacity: number; // C_Admin (Base organizativa + ministerios + perks)
  controlledProvincesCount: number;
  nodes: TerritoryNodeUpkeepData[];
  hasIndT4Perk?: boolean; // Inmunidad a tramo II de sobre-expansión
  isCapitalProvince?: boolean; // Capital histórica con multiplicador masivo
  activeWeather?: WeatherType;
}

export interface UpkeepCalculationOutput {
  clanId: string;
  baseNodesUpkeepEc: number;
  provincesBaseUpkeepEc: number;
  totalBaseUpkeepEc: number;
  weightedTerritorialLoad: number; // R_pond
  adminRatio: number; // r = R_pond / C_Admin
  overexpansionPenaltyPercent: number; // Psi_Over * 100
  finalUpkeepEc: number; // Upkeep efectivo con sobrecoste
  overexpansionTaxHourly: number; // T_Over en Créditos / Plata
  garrisonSalaryMultiplier: number; // Omega(S_fort)
  productionMultiplier: number; // Factor final aplicable a la producción
}

export class TerritorialUpkeepEngine {
  /**
   * Coste energético base de referencia por tipo de nodo (EC / h).
   */
  public static readonly NODE_BASE_UPKEEP_MAP: Record<TerritoryNodeType, number> = {
    capital_citadel: 120,
    fortress: 110,
    factory: 90,
    refinery: 85,
    radar: 80,
    comm_tower: 60,
    city: 50,
    warehouse: 40,
  };

  /**
   * Calcula la penalización de sobre-expansión Psi_Over(r) continua por tramos [0.00, 0.55].
   */
  public static calculateOverexpansionPenalty(r: number, hasIndT4Perk = false): number {
    if (r <= 1.0) {
      return 0.0;
    }

    if (hasIndT4Perk) {
      if (r <= 1.3) {
        return 0.0; // Inmunidad industrial en Tramo II con IND-T4
      }
      if (r <= 1.75) {
        return (8 / 9) * (r - 1.3);
      }
      // Tramo IV: Convergencia al techo de 0.55
      const asymptote = 0.55 - 0.15 * Math.exp(-2.5 * (r - 1.75));
      return Math.min(0.55, Number(asymptote.toFixed(4)));
    }

    // Curva estándar sin mitigación
    if (r <= 1.3) {
      return 0.5 * (r - 1.0);
    }
    if (r <= 1.75) {
      return 0.15 + (2 / 3) * (r - 1.3);
    }
    // Tramo IV
    const asymptote = 0.55 - 0.1 * Math.exp(-2.5 * (r - 1.75));
    return Math.min(0.55, Number(asymptote.toFixed(4)));
  }

  /**
   * Sobrecoste fiscal exponencial en divisas por hora T_Over(r).
   */
  public static calculateOverexpansionTax(r: number, weightedLoad: number, adminCapacity: number): number {
    if (r <= 1.0) {
      return 0;
    }
    const excess = Math.max(0, weightedLoad - adminCapacity);
    return Math.floor(450 * excess * Math.pow(r, 2.4));
  }

  /**
   * Multiplicador superlineal de salarios de guarnición Omega(S_fort).
   */
  public static calculateGarrisonSalaryMultiplier(sFort: number): number {
    if (sFort <= 1.0) {
      return 1.0;
    }
    const delta = sFort - 1.0;
    const mult = 1.0 + 0.45 * Math.pow(delta, 2.1);
    return Number(mult.toFixed(4));
  }

  /**
   * Multiplicador climático M_Clima(W) sobre la producción base.
   */
  public static getClimateProductionMultiplier(weather: WeatherType = 'clear'): number {
    switch (weather) {
      case 'clear':
        return 1.0;
      case 'rain':
        return 1.05;
      case 'snow':
        return 0.85;
      case 'sandstorm':
        return 0.8;
      default:
        return 1.0;
    }
  }

  /**
   * Procesa la auditoría completa de mantenimiento y producción territorial de un clan.
   */
  public static calculateClanTerritorialUpkeep(input: UpkeepCalculationInput): UpkeepCalculationOutput {
    const adminCapacity = Math.max(1, input.adminCapacity);

    // 1. Carga territorial ponderada (R_pond): cada provincia base pesa 1.0, capital pesa 1.5
    const capitalWeight = input.isCapitalProvince ? 1.5 : 1.0;
    const weightedTerritorialLoad = Number((input.controlledProvincesCount * capitalWeight).toFixed(2));
    const adminRatio = Number((weightedTerritorialLoad / adminCapacity).toFixed(2));

    // 2. Suma de costes energéticos de nodos y provincias
    const baseNodesUpkeepEc = input.nodes.reduce(
      (sum, node) => sum + (node.energyUpkeep || (this.NODE_BASE_UPKEEP_MAP[node.nodeType] ?? 50)),
      0
    );
    const provincesBaseUpkeepEc = input.controlledProvincesCount * MASTER_METAGAME_CONSTANTS.PROVINCE_BASE_UPKEEP_EC;
    const totalBaseUpkeepEc = baseNodesUpkeepEc + provincesBaseUpkeepEc;

    // 3. Penalización Psi_Over(r)
    const psiOver = this.calculateOverexpansionPenalty(adminRatio, input.hasIndT4Perk);
    const overexpansionPenaltyPercent = Number((psiOver * 100).toFixed(2));

    // 4. Upkeep final con sobrecoste si r > 1.0
    const finalUpkeepEc = Math.floor(totalBaseUpkeepEc * (1 + psiOver));

    // 5. Impuesto fiscal T_Over y multiplicador de guarniciones Omega
    const overexpansionTaxHourly = this.calculateOverexpansionTax(adminRatio, weightedTerritorialLoad, adminCapacity);
    const garrisonSalaryMultiplier = this.calculateGarrisonSalaryMultiplier(Math.max(1.0, adminRatio));

    // 6. Multiplicador de producción final:
    // Base * CapitalMult (2.0x si capital) * Clima * (1 - Psi_Over)
    const capitalResourceMult = input.isCapitalProvince ? MASTER_METAGAME_CONSTANTS.CAPITAL_RESOURCE_MULTIPLIER : 1.0;
    const climateMult = this.getClimateProductionMultiplier(input.activeWeather);
    const productionMultiplier = Number(
      (capitalResourceMult * climateMult * (1 - psiOver)).toFixed(4)
    );

    return {
      clanId: input.clanId,
      baseNodesUpkeepEc,
      provincesBaseUpkeepEc,
      totalBaseUpkeepEc,
      weightedTerritorialLoad,
      adminRatio,
      overexpansionPenaltyPercent,
      finalUpkeepEc,
      overexpansionTaxHourly,
      garrisonSalaryMultiplier,
      productionMultiplier,
    };
  }
}

// ==============================================================================
// FUNCIONES CANÓNICAS DE SOBRE-EXPANSIÓN IMPERIAL Y RGO (PROJECT ALICE V2)
// Especificación: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §5
// y docs/PLAN_MAESTRO_REESTRUCTURACION_HEGEMONIA.md §3
// ==============================================================================

export interface ImperialUpkeepRegionInput {
  regionId: string;
  baseEnergyUpkeepEc: number;
  bunkerLevel: number;
}

export interface ImperialUpkeepBreakdown {
  controlledCount: number;
  imperialCap: number;
  excessRegions: number;
  baseUpkeepEc: number;
  bunkerUpkeepEc: number;
  overexpansionPenaltyEc: number;
  overexpansionMultiplier: number;
  totalUpkeepEc: number;
  willTriggerEnergyStarvation: boolean;
}

/**
 * Calcula el mantenimiento energético horario total aplicando la curva anti-snowballing
 * con exponente 1.8 sobre el límite imperial K_Límite_Imperial (6 en Isla de Pruebas).
 */
export function calculateImperialUpkeep(
  regions: ImperialUpkeepRegionInput[],
  availableEc: number,
  imperialCap: number = 6
): ImperialUpkeepBreakdown {
  const controlledCount = regions.length;
  const excessRegions = Math.max(0, controlledCount - imperialCap);

  let baseUpkeepEc = 0;
  let bunkerUpkeepEc = 0;

  for (const r of regions) {
    baseUpkeepEc += r.baseEnergyUpkeepEc;
    bunkerUpkeepEc += Math.max(0, r.bunkerLevel - 1) * 45;
  }

  const rawSum = baseUpkeepEc + bunkerUpkeepEc;

  // Curva exponencial de sobre-expansión (exponente 1.8 canónico de Project Alice)
  const overexpansionMultiplier =
    excessRegions > 0
      ? Number((1 + 0.18 * Math.pow(excessRegions, 1.8)).toFixed(4))
      : 1.0;

  const totalUpkeepEc = Math.round(rawSum * overexpansionMultiplier);
  const overexpansionPenaltyEc = Math.max(0, totalUpkeepEc - rawSum);

  return {
    controlledCount,
    imperialCap,
    excessRegions,
    baseUpkeepEc,
    bunkerUpkeepEc,
    overexpansionPenaltyEc,
    overexpansionMultiplier,
    totalUpkeepEc,
    willTriggerEnergyStarvation: availableEc < totalUpkeepEc,
  };
}

/**
 * Calcula el rendimiento horario RGO de una región considerando:
 * - Inanición energética (isEnergyStarved -> 0%)
 * - Bono Hegemónico de Capital Nacional (+15% EC)
 * - Conectividad de Línea de Suministro a la Capital (-50% si está aislada)
 */
export function calculateRgoRegionalYield(params: {
  baseHourlyYield: number;
  resourceTier: number;
  isEnergyStarved: boolean;
  controlsNationalCapital: boolean;
  hasSupplyLineToCapital: boolean;
}): number {
  if (params.isEnergyStarved) {
    return 0;
  }

  const tierBonus = 1 + (params.resourceTier - 1) * 0.08;
  const capitalBonus = params.controlsNationalCapital ? 1.15 : 1.0;
  const supplyFactor = params.hasSupplyLineToCapital ? 1.0 : 0.5;

  return Math.round(params.baseHourlyYield * tierBonus * capitalBonus * supplyFactor);
}
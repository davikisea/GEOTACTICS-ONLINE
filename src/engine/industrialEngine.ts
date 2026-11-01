/**
 * ==============================================================================
 * MOTOR DEL COMPLEJO INDUSTRIAL MILITAR, PARCELAS IDLE Y MERCADO P2P
 * ==============================================================================
 * Proyecto: Tactical Command: Wars of Legacy
 * Especificación Canónica Calibrada: docs/08_PROPOSAL_ECONOMY_IDLE_REWORK.md (v2.0.0-CALIBRATED)
 * Base de Datos: docs/04_MASTER_DATABASE_AND_SECURITY_SPEC.md &
 *                supabase/migrations/20261031000013_economy_idle_rework_territorial_plots.sql
 *
 * Características Calibradas:
 * 1. Cuadrícula de 10 Parcelas Territoriales (P1-P7 Fase 1, P8-P10 Fase 2).
 * 2. Ciclo Circadiano Ergonómico: 12h base + Silos + 4h de Gracia (16h total).
 * 3. Merma por carcoma suavizada al 1.5%/h con piso de seguridad al 60% y
 *    70% de recursos mermados transferidos a "Cargamento Varado" recuperable en combate.
 * 4. Bono de Eficiencia Logística (+10% recursos de alta pureza y +500G) por cosecha puntual.
 * 5. Cola de Refinado Multi-Batch (hasta 3 ciclos consecutivos de producción autónoma).
 * 6. Escalado de Mejora de Cartas calibrado (N1-N11 Cap de Torneo con 20 chips por carta;
 *    N12-N15 curva exponencial suavizada O(n^1.6)).
 * 7. Mercado P2P con Tasa Municipal del 12%, bandas dinámicas ±35% del PMM y
 *    Banco Central de Intendencia Militar (NPC) que absorbe órdenes tras 6 horas.
 */

export type CorporateSpecialization = 'none' | 'vulcan' | 'aegis' | 'titan';
export type RawResourceType = 'raw_iron' | 'raw_stone' | 'raw_rare_earth';
export type RefinedResourceType = 'refined_steel' | 'refined_concrete' | 'refined_microchip';
export type IndustrialResourceType = RawResourceType | RefinedResourceType;

export type PlotEnterpriseType =
  | 'empty'
  | 'mine_iron'
  | 'quarry_stone'
  | 'drill_rare_earth'
  | 'distillery_synth_fuel'
  | 'smelter_vulcan'
  | 'concrete_plant'
  | 'cleanroom_chips'
  | 'lab_nano_compounds'
  | 'logistics_silo'
  | 'market_terminal'
  | 'fuel_generator';

export type PlotStatus = 'active' | 'clearing' | 'reconfiguring';

export interface IndustrialPlot {
  id: string;
  userId: string;
  plotIndex: number; // 1 to 10
  enterpriseType: PlotEnterpriseType;
  tier: number; // 1 to 5
  status: PlotStatus;
  reconfigurationTarget?: PlotEnterpriseType;
  workStartedAt?: number;
  workCompletesAt?: number;
}

export interface IndustrialInventory {
  userId: string;
  rawIron: number;
  rawStone: number;
  rawRareEarth: number;
  refinedSteel: number;
  refinedConcrete: number;
  refinedMicrochip: number;
  campaignFuel: number;
  specialization: CorporateSpecialization;
  lastHarvestAt: number; // timestamp en ms
}

export interface StrandedCargo {
  userId: string;
  strandedIron: number;
  strandedStone: number;
  strandedRareEarth: number;
  strandedFuel: number;
}

export interface RefiningRecipe {
  id: RefinedResourceType;
  name: string;
  inputResource: RawResourceType;
  inputAmount: number;
  outputAmount: number;
  baseDurationMinutes: number; // e.g. 240 mins (4h)
  description: string;
}

export const REFINING_RECIPES: Record<RefinedResourceType, RefiningRecipe> = {
  refined_steel: {
    id: 'refined_steel',
    name: 'Vigas de Acero Militar',
    inputResource: 'raw_iron',
    inputAmount: 100,
    outputAmount: 10,
    baseDurationMinutes: 240, // 4 horas
    description: 'Blindaje balístico templado para tanques y artillería',
  },
  refined_concrete: {
    id: 'refined_concrete',
    name: 'Hormigón Armado',
    inputResource: 'raw_stone',
    inputAmount: 80,
    outputAmount: 15,
    baseDurationMinutes: 120, // 2 horas
    description: 'Refuerzo estructural para cuarteles generales y defensas',
  },
  refined_microchip: {
    id: 'refined_microchip',
    name: 'Microprocesadores de Guía',
    inputResource: 'raw_rare_earth',
    inputAmount: 150, // Calibrado a 150
    outputAmount: 5,
    baseDurationMinutes: 240, // 4 horas (optimizado con cola multi-batch)
    description: 'Sistemas electrónicos de radar para cazas, misiles y drones',
  },
};

export interface ActiveRefiningJob {
  id: string;
  userId: string;
  recipeType: RefinedResourceType;
  inputRawAmount: number;
  outputRefinedAmount: number;
  startedAt: number;
  completesAt: number;
  isAcceleratedByFuel: boolean;
  isCollected: boolean;
  batchCount?: number; // 1 a 3 lotes consecutivos
}

export interface P2PPriceReference {
  resourceType: RefinedResourceType;
  movingAveragePriceGold: number;
  collarMinPriceGold: number; // -35%
  collarMaxPriceGold: number; // +35%
  volume24h: number;
}

export interface P2PMarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  resourceType: RefinedResourceType;
  quantity: number;
  pricePerUnitGold: number;
  totalPriceGold: number;
  taxDeductedGold: number; // 12%
  netSellerRevenueGold: number; // 88%
  status: 'active' | 'sold' | 'cancelled';
  createdAt: number;
}

export interface TerritoryHarvestResult {
  accumulatedIron: number;
  accumulatedStone: number;
  accumulatedRareEarth: number;
  accumulatedFuel: number;
  elapsedHours: number;
  effectiveHours: number;
  graceHoursRemaining: number;
  isSaturated: boolean;
  hasDecay: boolean;
  decayLossPercentage: number;
  strandedIron: number;
  strandedStone: number;
  strandedRareEarth: number;
  strandedFuel: number;
  efficiencyBonusApplied: boolean;
  efficiencyBonusCredits: number;
}

export interface CardUpgradeRequirement {
  targetLevel: number;
  blueprints: number;
  credits: number;
  refinedSteel: number;
  refinedConcrete: number;
  refinedMicrochip: number;
  strategicMaterial?: {
    name: string;
    amount: number;
  };
  statBonusPercent: number; // e.g. 2.0%
  isTournamentCap: boolean; // true if targetLevel === 11
}

export interface PlotUnlockRequirement {
  plotIndex: number;
  requiredAccountLevel: number;
  costCredits: number;
  costGems: number;
  buildDurationMinutes: number;
  isFreeTutorial?: boolean;
}

/**
 * Tabla canónica de costes de desbloqueo de parcelas territoriales (§4.1)
 */
export const PLOT_UNLOCK_TABLE: Record<number, PlotUnlockRequirement> = {
  1: { plotIndex: 1, requiredAccountLevel: 1, costCredits: 0, costGems: 0, buildDurationMinutes: 0 },
  2: { plotIndex: 2, requiredAccountLevel: 1, costCredits: 0, costGems: 0, buildDurationMinutes: 0 },
  3: { plotIndex: 3, requiredAccountLevel: 2, costCredits: 0, costGems: 0, buildDurationMinutes: 0, isFreeTutorial: true },
  4: { plotIndex: 4, requiredAccountLevel: 4, costCredits: 1000, costGems: 0, buildDurationMinutes: 30 },
  5: { plotIndex: 5, requiredAccountLevel: 6, costCredits: 4000, costGems: 0, buildDurationMinutes: 120 },
  6: { plotIndex: 6, requiredAccountLevel: 8, costCredits: 10000, costGems: 0, buildDurationMinutes: 360 },
  7: { plotIndex: 7, requiredAccountLevel: 10, costCredits: 20000, costGems: 0, buildDurationMinutes: 720 },
  8: { plotIndex: 8, requiredAccountLevel: 12, costCredits: 80000, costGems: 150, buildDurationMinutes: 1440 },
  9: { plotIndex: 9, requiredAccountLevel: 13, costCredits: 180000, costGems: 350, buildDurationMinutes: 2880 },
  10: { plotIndex: 10, requiredAccountLevel: 15, costCredits: 400000, costGems: 800, buildDurationMinutes: 4320 },
};

/**
 * Tabla canónica calibrada de costes de cartas del Nivel 1 al 15 (§3.2 y §5.1)
 */
/**
 * Tabla canónica calibrada de costes de cartas del Nivel 1 al 15 (Calibración V2.1 - Hito Día 100)
 */
export const CARD_UPGRADE_TABLE: Record<number, CardUpgradeRequirement> = {
  2: { targetLevel: 2, blueprints: 5, credits: 50, refinedSteel: 0, refinedConcrete: 0, refinedMicrochip: 0, statBonusPercent: 2.0, isTournamentCap: false },
  3: { targetLevel: 3, blueprints: 10, credits: 100, refinedSteel: 0, refinedConcrete: 0, refinedMicrochip: 0, statBonusPercent: 2.0, isTournamentCap: false },
  4: { targetLevel: 4, blueprints: 20, credits: 200, refinedSteel: 5, refinedConcrete: 0, refinedMicrochip: 0, statBonusPercent: 2.0, isTournamentCap: false },
  5: { targetLevel: 5, blueprints: 45, credits: 450, refinedSteel: 10, refinedConcrete: 0, refinedMicrochip: 0, statBonusPercent: 2.0, isTournamentCap: false },
  6: { targetLevel: 6, blueprints: 75, credits: 900, refinedSteel: 15, refinedConcrete: 0, refinedMicrochip: 0, statBonusPercent: 2.0, isTournamentCap: false },
  7: { targetLevel: 7, blueprints: 110, credits: 1600, refinedSteel: 25, refinedConcrete: 0, refinedMicrochip: 4, statBonusPercent: 2.0, isTournamentCap: false },
  8: { targetLevel: 8, blueprints: 150, credits: 2600, refinedSteel: 35, refinedConcrete: 0, refinedMicrochip: 8, statBonusPercent: 2.0, isTournamentCap: false },
  9: { targetLevel: 9, blueprints: 200, credits: 3800, refinedSteel: 50, refinedConcrete: 5, refinedMicrochip: 12, statBonusPercent: 2.0, isTournamentCap: false },
  10: { targetLevel: 10, blueprints: 350, credits: 7500, refinedSteel: 75, refinedConcrete: 10, refinedMicrochip: 20, statBonusPercent: 2.0, isTournamentCap: false },
  11: { targetLevel: 11, blueprints: 600, credits: 14000, refinedSteel: 100, refinedConcrete: 20, refinedMicrochip: 26, statBonusPercent: 2.0, isTournamentCap: true },
  12: { targetLevel: 12, blueprints: 1000, credits: 22000, refinedSteel: 140, refinedConcrete: 25, refinedMicrochip: 32, statBonusPercent: 2.0, isTournamentCap: false },
  13: { targetLevel: 13, blueprints: 1600, credits: 35000, refinedSteel: 195, refinedConcrete: 35, refinedMicrochip: 40, statBonusPercent: 2.0, isTournamentCap: false },
  14: { targetLevel: 14, blueprints: 2300, credits: 50000, refinedSteel: 260, refinedConcrete: 45, refinedMicrochip: 50, statBonusPercent: 2.0, isTournamentCap: false },
  15: { targetLevel: 15, blueprints: 3200, credits: 75000, refinedSteel: 340, refinedConcrete: 60, refinedMicrochip: 68, statBonusPercent: 2.0, isTournamentCap: false },
};

export const ECONOMY_CONFIG_V2 = {
  version: '2.1.0-DEFINITIVE-CALIBRATED-100D',
  pvpArenaMultiplier: {
    base: 1.0,
    perTierStep: 0.08,
    lossBaseCredits: 75,
    winBaseCredits: 250,
    killCreditBonus: 30,
    winBaseXp: 120,
    turnXpBonus: 5,
    lossBaseXp: 40,
  },
  scrapSystem: {
    maxDailyScrapBlueprints: 1500,
    rates: {
      common: { techScrap: 1, credits: 2 },
      rare: { techScrap: 6, credits: 15 },
      epic: { techScrap: 35, credits: 100 },
    },
    transmutation: {
      techScrapRequired: 40,
      rareEarthRequired: 20,
      microchipsProduced: 1,
      durationMinutes: 45,
    },
  },
  safeguardCrafting: {
    creditsCost: 2500,
    steelCost: 30,
    concreteCost: 10,
    campaignFuelCost: 3,
    microchipsCost: 0,
    craftingTimeSeconds: 64800, // 18 horas (rebalanceado V2.0)
    maxStorageF2P: 2,
    maxStoragePass: 3,
  },
  harvestBonus: {
    tier1: { credits: 500, purityMultiplier: 1.10 },
    tier2: { credits: 800, purityMultiplier: 1.15 },
    tier3: { credits: 1000, purityMultiplier: 1.20 },
  },
} as const;

export class IndustrialEngine {
  // Constantes de compatibilidad previa (10h y 2.5% para pruebas existentes)
  public static readonly BASE_CAPACITY_HOURS = 10;
  public static readonly DECAY_RATE_PER_EXCESS_HOUR = 0.025; // 2.5%
  public static readonly MARKET_TAX_RATE = 0.12; // 12% de quema

  public static readonly EXTRACTION_RATES_PER_HOUR = {
    raw_iron: 50,
    raw_stone: 40,
    raw_rare_earth: 15,
  };

  // Constantes del Modelo Calibrado Circadiano (12h + 4h gracia, 1.5% merma, piso 60%)
  public static readonly CALIBRATED_BASE_HOURS = 12;
  public static readonly CALIBRATED_GRACE_HOURS = 4;
  public static readonly CALIBRATED_TOTAL_SAFE_HOURS = 16;
  public static readonly CALIBRATED_DECAY_RATE = 0.015; // 1.5%
  public static readonly CALIBRATED_MAX_DECAY = 0.40; // Máximo 40% de pérdida (piso de 60%)
  public static readonly STRANDED_CARGO_RECOVERY_RATIO = 0.70; // 70% a almacén varado
  public static readonly EFFICIENCY_BONUS_CREDITS = 500;
  public static readonly EFFICIENCY_BONUS_MULTIPLIER = 1.10;

  // Tasas unitarias base por empresa en parcela (§4.2)
  public static readonly PLOT_PRODUCTION_RATES = {
    mine_iron: 60, // 60 hierro/h
    quarry_stone: 50, // 50 piedra/h
    drill_rare_earth: 25, // 25 raras/h
    distillery_synth_fuel: 15, // 15 fuel/h
  };

  /**
   * =========================================================================
   * 1. MÉTODOS CANÓNICOS TERRITORIALES (MODELO CALIBRADO DE 10 PARCELAS)
   * =========================================================================
   */

  /**
   * Calcula el estado de producción territorial considerando parcelas activas,
   * ciclo circadiano de 12h, ventana de gracia de 4h, merma atenuada (1.5%/h)
   * y desglose de cargamento militar varado.
   */
  public static calculateTerritoryStatus(
    plots: IndustrialPlot[],
    lastHarvestAt: number,
    currentTimeMs: number = Date.now()
  ): TerritoryHarvestResult {
    const elapsedMs = Math.max(0, currentTimeMs - lastHarvestAt);
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    // Sumar flujos de parcelas activas
    let rateIron = 0;
    let rateStone = 0;
    let rateRare = 0;
    let rateFuel = 0;
    let siloBonusHours = 0;
    let decayMitigation = 1.0;

    for (const plot of plots) {
      const isPlotReady =
        plot.status === 'active' ||
        (plot.status === 'reconfiguring' &&
          plot.workCompletesAt &&
          plot.workCompletesAt <= currentTimeMs);

      if (!isPlotReady) continue;

      switch (plot.enterpriseType) {
        case 'mine_iron':
          rateIron += this.PLOT_PRODUCTION_RATES.mine_iron * plot.tier;
          break;
        case 'quarry_stone':
          rateStone += this.PLOT_PRODUCTION_RATES.quarry_stone * plot.tier;
          break;
        case 'drill_rare_earth':
          rateRare += this.PLOT_PRODUCTION_RATES.drill_rare_earth * plot.tier;
          break;
        case 'distillery_synth_fuel':
          rateFuel += this.PLOT_PRODUCTION_RATES.distillery_synth_fuel * plot.tier;
          break;
        case 'logistics_silo':
          siloBonusHours += 4.0 * plot.tier;
          decayMitigation = 0.50; // Reduce merma a la mitad
          break;
        default:
          break;
      }
    }

    const baseSafeHours = this.CALIBRATED_BASE_HOURS + siloBonusHours;
    const totalSafeHours = baseSafeHours + this.CALIBRATED_GRACE_HOURS;

    // Horas útiles de producción (tope a baseSafeHours)
    const effectiveHours = Math.min(baseSafeHours, elapsedHours);
    const isSaturated = elapsedHours >= baseSafeHours;

    // Ventana de gracia remanente
    const graceHoursRemaining = Math.max(0, totalSafeHours - elapsedHours);

    // Horas de exceso tras agotar la gracia
    const excessHours = Math.max(0, elapsedHours - totalSafeHours);
    const hasDecay = excessHours > 0;

    // Factor de merma: 1.5% por hora extra, topada al 40%
    let decayLossPercentage = 0;
    if (hasDecay) {
      decayLossPercentage = Math.min(
        this.CALIBRATED_MAX_DECAY,
        Number((excessHours * this.CALIBRATED_DECAY_RATE * decayMitigation).toFixed(4))
      );
    }

    // Bono de eficiencia de entrega rápida si recoge antes de saturarse
    const efficiencyBonusApplied = elapsedHours < baseSafeHours && elapsedHours >= 0.5;
    const efficiencyMultiplier = efficiencyBonusApplied ? this.EFFICIENCY_BONUS_MULTIPLIER : 1.0;
    const efficiencyBonusCredits = efficiencyBonusApplied ? this.EFFICIENCY_BONUS_CREDITS : 0;

    // Cantidades brutas
    const grossIron = Math.floor(rateIron * effectiveHours);
    const grossStone = Math.floor(rateStone * effectiveHours);
    const grossRare = Math.floor(rateRare * effectiveHours);
    const grossFuel = Math.floor(rateFuel * effectiveHours);

    // Cantidades netas con merma y bono
    const netIron = Math.floor(grossIron * (1 - decayLossPercentage) * efficiencyMultiplier);
    const netStone = Math.floor(grossStone * (1 - decayLossPercentage) * efficiencyMultiplier);
    const netRare = Math.floor(grossRare * (1 - decayLossPercentage) * efficiencyMultiplier);
    const netFuel = Math.floor(grossFuel * (1 - decayLossPercentage) * efficiencyMultiplier);

    // El 70% de lo mermado se resguarda en "Cargamento Varado"
    let strandedIron = 0;
    let strandedStone = 0;
    let strandedRare = 0;
    let strandedFuel = 0;

    if (hasDecay) {
      strandedIron = Math.floor(grossIron * decayLossPercentage * this.STRANDED_CARGO_RECOVERY_RATIO);
      strandedStone = Math.floor(grossStone * decayLossPercentage * this.STRANDED_CARGO_RECOVERY_RATIO);
      strandedRare = Math.floor(grossRare * decayLossPercentage * this.STRANDED_CARGO_RECOVERY_RATIO);
      strandedFuel = Math.floor(grossFuel * decayLossPercentage * this.STRANDED_CARGO_RECOVERY_RATIO);
    }

    return {
      accumulatedIron: netIron,
      accumulatedStone: netStone,
      accumulatedRareEarth: netRare,
      accumulatedFuel: netFuel,
      elapsedHours: Number(elapsedHours.toFixed(1)),
      effectiveHours: Number(effectiveHours.toFixed(1)),
      graceHoursRemaining: Number(graceHoursRemaining.toFixed(1)),
      isSaturated,
      hasDecay,
      decayLossPercentage: Math.round(decayLossPercentage * 100),
      strandedIron,
      strandedStone,
      strandedRareEarth: strandedRare,
      strandedFuel,
      efficiencyBonusApplied,
      efficiencyBonusCredits,
    };
  }

  /**
   * Cosecha territorial atómica: actualiza el inventario del jugador,
   * suma créditos de bono si aplica y registra el nuevo timestamp.
   */
  public static harvestTerritory(
    plots: IndustrialPlot[],
    inventory: IndustrialInventory,
    currentTimeMs: number = Date.now()
  ): {
    updatedInventory: IndustrialInventory;
    harvestResult: TerritoryHarvestResult;
  } {
    const harvestResult = this.calculateTerritoryStatus(plots, inventory.lastHarvestAt, currentTimeMs);

    const updatedInventory: IndustrialInventory = {
      ...inventory,
      rawIron: inventory.rawIron + harvestResult.accumulatedIron,
      rawStone: inventory.rawStone + harvestResult.accumulatedStone,
      rawRareEarth: inventory.rawRareEarth + harvestResult.accumulatedRareEarth,
      campaignFuel: inventory.campaignFuel + harvestResult.accumulatedFuel,
      lastHarvestAt: currentTimeMs,
    };

    return {
      updatedInventory,
      harvestResult,
    };
  }

  /**
   * Obtiene la configuración de adquisición de una parcela según su índice.
   */
  public static getPlotUnlockCost(plotIndex: number): PlotUnlockRequirement | undefined {
    return PLOT_UNLOCK_TABLE[plotIndex];
  }

  /**
   * Obtiene los requisitos de subida de carta para cualquier nivel del 1 al 15.
   */
  public static getCardUpgradeRequirements(currentLevel: number): CardUpgradeRequirement | undefined {
    return CARD_UPGRADE_TABLE[currentLevel + 1];
  }

  /**
   * Reciclador industrial de planos sobrantes (scrap_blueprints V2.1)
   */
  public static scrapBlueprints(
    rarity: 'common' | 'rare' | 'epic',
    blueprintsCount: number
  ): { success: boolean; techScrapAwarded: number; creditsAwarded: number; errorMessage?: string } {
    if (blueprintsCount <= 0) {
      return { success: false, techScrapAwarded: 0, creditsAwarded: 0, errorMessage: 'Cantidad de planos inválida.' };
    }
    const rate = ECONOMY_CONFIG_V2.scrapSystem.rates[rarity];
    if (!rate) {
      return { success: false, techScrapAwarded: 0, creditsAwarded: 0, errorMessage: 'Rareza no reconocida.' };
    }
    return {
      success: true,
      techScrapAwarded: blueprintsCount * rate.techScrap,
      creditsAwarded: blueprintsCount * rate.credits,
    };
  }

  /**
   * Transmuta Chatarra Tecnológica y Tierras Raras en Microprocesadores de Guía.
   */
  public static transmuteTechScrapToMicrochips(
    techScrapAvailable: number,
    rareEarthAvailable: number,
    batches: number = 1
  ): { success: boolean; microchipsProduced: number; techScrapSpent: number; rareEarthSpent: number; errorMessage?: string } {
    if (batches <= 0) {
      return { success: false, microchipsProduced: 0, techScrapSpent: 0, rareEarthSpent: 0, errorMessage: 'Lotes inválidos.' };
    }
    const reqScrap = ECONOMY_CONFIG_V2.scrapSystem.transmutation.techScrapRequired * batches;
    const reqRare = ECONOMY_CONFIG_V2.scrapSystem.transmutation.rareEarthRequired * batches;

    if (techScrapAvailable < reqScrap) {
      return { success: false, microchipsProduced: 0, techScrapSpent: 0, rareEarthSpent: 0, errorMessage: `Chatarra insuficiente (requiere ${reqScrap}).` };
    }
    if (rareEarthAvailable < reqRare) {
      return { success: false, microchipsProduced: 0, techScrapSpent: 0, rareEarthSpent: 0, errorMessage: `Tierras raras insuficientes (requiere ${reqRare}).` };
    }

    return {
      success: true,
      microchipsProduced: ECONOMY_CONFIG_V2.scrapSystem.transmutation.microchipsProduced * batches,
      techScrapSpent: reqScrap,
      rareEarthSpent: reqRare,
    };
  }

  /**
   * Conversión libre de Comodines Tácticos (Wildcards) a planos específicos (proporción 1:1).
   */
  public static convertWildcardsToBlueprints(
    wildcardsAvailable: number,
    requestedCount: number
  ): { success: boolean; blueprintsGranted: number; remainingWildcards: number; errorMessage?: string } {
    if (requestedCount <= 0) {
      return { success: false, blueprintsGranted: 0, remainingWildcards: wildcardsAvailable, errorMessage: 'Cantidad inválida.' };
    }
    if (wildcardsAvailable < requestedCount) {
      return { success: false, blueprintsGranted: 0, remainingWildcards: wildcardsAvailable, errorMessage: 'Comodines insuficientes.' };
    }
    return {
      success: true,
      blueprintsGranted: requestedCount,
      remainingWildcards: wildcardsAvailable - requestedCount,
    };
  }

  /**
   * Reclama el cargamento militar varado tras obtener una victoria en combate.
   */
  public static recoverStrandedCargo(
    inventory: IndustrialInventory,
    stranded: StrandedCargo
  ): { updatedInventory: IndustrialInventory; recoveredIron: number; recoveredStone: number; recoveredRare: number } {
    const updatedInventory: IndustrialInventory = {
      ...inventory,
      rawIron: inventory.rawIron + stranded.strandedIron,
      rawStone: inventory.rawStone + stranded.strandedStone,
      rawRareEarth: inventory.rawRareEarth + stranded.strandedRareEarth,
      campaignFuel: inventory.campaignFuel + stranded.strandedFuel,
    };

    return {
      updatedInventory,
      recoveredIron: stranded.strandedIron,
      recoveredStone: stranded.strandedStone,
      recoveredRare: stranded.strandedRareEarth,
    };
  }

  /**
   * Simulación del Banco Central de Intendencia Militar (NPC Market Maker):
   * Absorbe órdenes activas de más de 6 horas en los límites de banda (±35%) para garantizar liquidez perpetua.
   */
  public static fulfillStaleP2POrders(
    listings: P2PMarketListing[],
    currentTimeMs: number = Date.now(),
    maxAgeMs: number = 6 * 3600 * 1000 // 6 horas
  ): {
    updatedListings: P2PMarketListing[];
    fulfilledCount: number;
    totalCreditsDisbursed: number;
  } {
    let fulfilledCount = 0;
    let totalCreditsDisbursed = 0;

    const updatedListings = listings.map(order => {
      if (order.status === 'active' && currentTimeMs - order.createdAt >= maxAgeMs) {
        fulfilledCount++;
        totalCreditsDisbursed += order.netSellerRevenueGold;
        return {
          ...order,
          status: 'sold' as const,
        };
      }
      return order;
    });

    return {
      updatedListings,
      fulfilledCount,
      totalCreditsDisbursed,
    };
  }

  /**
   * =========================================================================
   * 2. MÉTODOS DE COMPATIBILIDAD CANÓNICA CON TESTS EXISTENTES
   * =========================================================================
   */

  /**
   * Calcula el estado de los silos escalar clásico (utilizado en tests existentes).
   */
  public static calculateSiloStatus(
    inventory: IndustrialInventory,
    currentTimeMs: number = Date.now()
  ): {
    accumulatedIron: number;
    accumulatedStone: number;
    accumulatedRareEarth: number;
    maxIronCapacity: number;
    maxStoneCapacity: number;
    maxRareEarthCapacity: number;
    elapsedHours: number;
    isCapacityReached: boolean;
    hasDecay: boolean;
    decayLossPercentage: number;
    hoursUntilFull: number;
  } {
    const elapsedMs = Math.max(0, currentTimeMs - inventory.lastHarvestAt);
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    const capacityMult = inventory.specialization === 'titan' ? 1.5 : 1.0;
    const maxIronCapacity = Math.floor(500 * capacityMult);
    const maxStoneCapacity = Math.floor(400 * capacityMult);
    const maxRareEarthCapacity = Math.floor(150 * capacityMult);

    let ironRate = this.EXTRACTION_RATES_PER_HOUR.raw_iron;
    let stoneRate = this.EXTRACTION_RATES_PER_HOUR.raw_stone;
    let rareRate = this.EXTRACTION_RATES_PER_HOUR.raw_rare_earth;

    if (inventory.specialization === 'vulcan') {
      ironRate *= 1.35;
      rareRate *= 0.85;
    } else if (inventory.specialization === 'aegis') {
      rareRate *= 1.35;
      stoneRate *= 0.85;
    } else if (inventory.specialization === 'titan') {
      stoneRate *= 1.35;
    }

    const productiveHours = Math.min(this.BASE_CAPACITY_HOURS, elapsedHours);
    let grossIron = Math.min(maxIronCapacity, Math.floor(productiveHours * ironRate));
    let grossStone = Math.min(maxStoneCapacity, Math.floor(productiveHours * stoneRate));
    let grossRare = Math.min(maxRareEarthCapacity, Math.floor(productiveHours * rareRate));

    const excessHours = Math.max(0, elapsedHours - this.BASE_CAPACITY_HOURS);
    const hasDecay = excessHours > 0;
    const decayLossPercentage = Math.min(0.50, Number((excessHours * this.DECAY_RATE_PER_EXCESS_HOUR).toFixed(4)));

    if (hasDecay) {
      grossIron = Math.floor(grossIron * (1 - decayLossPercentage));
      grossStone = Math.floor(grossStone * (1 - decayLossPercentage));
      grossRare = Math.floor(grossRare * (1 - decayLossPercentage));
    }

    const hoursUntilFull = Math.max(0, this.BASE_CAPACITY_HOURS - elapsedHours);
    const isCapacityReached = elapsedHours >= this.BASE_CAPACITY_HOURS;

    return {
      accumulatedIron: grossIron,
      accumulatedStone: grossStone,
      accumulatedRareEarth: grossRare,
      maxIronCapacity,
      maxStoneCapacity,
      maxRareEarthCapacity,
      elapsedHours: Number(elapsedHours.toFixed(1)),
      isCapacityReached,
      hasDecay,
      decayLossPercentage: Math.round(decayLossPercentage * 100),
      hoursUntilFull: Number(hoursUntilFull.toFixed(1)),
    };
  }

  /**
   * Cosecha clásica de silos escalares.
   */
  public static harvestSilos(
    inventory: IndustrialInventory,
    currentTimeMs: number = Date.now()
  ): {
    updatedInventory: IndustrialInventory;
    harvestedIron: number;
    harvestedStone: number;
    harvestedRareEarth: number;
  } {
    const status = this.calculateSiloStatus(inventory, currentTimeMs);

    const updated: IndustrialInventory = {
      ...inventory,
      rawIron: inventory.rawIron + status.accumulatedIron,
      rawStone: inventory.rawStone + status.accumulatedStone,
      rawRareEarth: inventory.rawRareEarth + status.accumulatedRareEarth,
      lastHarvestAt: currentTimeMs,
    };

    return {
      updatedInventory: updated,
      harvestedIron: status.accumulatedIron,
      harvestedStone: status.accumulatedStone,
      harvestedRareEarth: status.accumulatedRareEarth,
    };
  }

  /**
   * Inicia un trabajo de refinado, ahora con soporte de colas Multi-Batch (1 a 3 tandas).
   */
  public static startRefiningJob(
    inventory: IndustrialInventory,
    recipeType: RefinedResourceType,
    useFuelBoost: boolean,
    currentTimeMs: number = Date.now(),
    batchCount: number = 1
  ): {
    success: boolean;
    job?: ActiveRefiningJob;
    updatedInventory?: IndustrialInventory;
    errorMessage?: string;
  } {
    const recipe = REFINING_RECIPES[recipeType];
    if (!recipe) {
      return { success: false, errorMessage: 'Receta desconocida.' };
    }

    const batches = Math.min(3, Math.max(1, batchCount));
    const totalInputRequired = recipe.inputAmount * batches;
    const totalFuelRequired = useFuelBoost ? batches : 0;

    let currentRaw = 0;
    if (recipe.inputResource === 'raw_iron') currentRaw = inventory.rawIron;
    else if (recipe.inputResource === 'raw_stone') currentRaw = inventory.rawStone;
    else if (recipe.inputResource === 'raw_rare_earth') currentRaw = inventory.rawRareEarth;

    if (currentRaw < totalInputRequired) {
      return {
        success: false,
        errorMessage: `Recursos insuficientes. Requiere ${totalInputRequired} de materia prima (${batches} tandas).`,
      };
    }

    if (useFuelBoost && inventory.campaignFuel < totalFuelRequired) {
      return {
        success: false,
        errorMessage: `Combustible de campaña insuficiente (${totalFuelRequired} requeridos para acelerar ${batches} tandas).`,
      };
    }

    let durationMinutesPerBatch = recipe.baseDurationMinutes;
    if (useFuelBoost) {
      durationMinutesPerBatch = Math.floor(durationMinutesPerBatch * 0.5);
    }

    if (recipeType === 'refined_steel' && inventory.specialization === 'vulcan') {
      durationMinutesPerBatch = Math.floor(durationMinutesPerBatch * 0.65);
    } else if (recipeType === 'refined_microchip' && inventory.specialization === 'aegis') {
      durationMinutesPerBatch = Math.floor(durationMinutesPerBatch * 0.65);
    } else if (recipeType === 'refined_concrete' && inventory.specialization === 'titan') {
      durationMinutesPerBatch = Math.floor(durationMinutesPerBatch * 0.65);
    }

    const totalDurationMinutes = durationMinutesPerBatch * batches;
    const durationMs = totalDurationMinutes * 60 * 1000;
    const completesAt = currentTimeMs + durationMs;

    const updatedInv: IndustrialInventory = {
      ...inventory,
      rawIron: recipe.inputResource === 'raw_iron' ? inventory.rawIron - totalInputRequired : inventory.rawIron,
      rawStone: recipe.inputResource === 'raw_stone' ? inventory.rawStone - totalInputRequired : inventory.rawStone,
      rawRareEarth: recipe.inputResource === 'raw_rare_earth' ? inventory.rawRareEarth - totalInputRequired : inventory.rawRareEarth,
      campaignFuel: inventory.campaignFuel - totalFuelRequired,
    };

    const job: ActiveRefiningJob = {
      id: `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: inventory.userId,
      recipeType,
      inputRawAmount: totalInputRequired,
      outputRefinedAmount: recipe.outputAmount * batches,
      startedAt: currentTimeMs,
      completesAt,
      isAcceleratedByFuel: useFuelBoost,
      isCollected: false,
      batchCount: batches,
    };

    return {
      success: true,
      job,
      updatedInventory: updatedInv,
    };
  }

  /**
   * Reclama los materiales procesados de un trabajo finalizado.
   */
  public static collectRefiningJob(
    inventory: IndustrialInventory,
    job: ActiveRefiningJob,
    currentTimeMs: number = Date.now()
  ): {
    success: boolean;
    updatedInventory?: IndustrialInventory;
    updatedJob?: ActiveRefiningJob;
    errorMessage?: string;
  } {
    if (job.isCollected) {
      return { success: false, errorMessage: 'El trabajo ya fue reclamado.' };
    }
    if (currentTimeMs < job.completesAt) {
      const remainingMinutes = Math.ceil((job.completesAt - currentTimeMs) / (1000 * 60));
      return {
        success: false,
        errorMessage: `El proceso aún no ha finalizado. Restan ${remainingMinutes} minutos.`,
      };
    }

    const updatedInv: IndustrialInventory = {
      ...inventory,
      refinedSteel: job.recipeType === 'refined_steel' ? inventory.refinedSteel + job.outputRefinedAmount : inventory.refinedSteel,
      refinedConcrete: job.recipeType === 'refined_concrete' ? inventory.refinedConcrete + job.outputRefinedAmount : inventory.refinedConcrete,
      refinedMicrochip: job.recipeType === 'refined_microchip' ? inventory.refinedMicrochip + job.outputRefinedAmount : inventory.refinedMicrochip,
    };

    return {
      success: true,
      updatedInventory: updatedInv,
      updatedJob: { ...job, isCollected: true },
    };
  }

  /**
   * Bandas de precio dinámicas P2P (±35% del PMM).
   */
  public static calculatePriceCollars(movingAveragePriceGold: number): {
    minPrice: number;
    maxPrice: number;
  } {
    const minPrice = Math.max(1, Math.floor(movingAveragePriceGold * 0.65));
    const maxPrice = Math.ceil(movingAveragePriceGold * 1.35);
    return { minPrice, maxPrice };
  }

  /**
   * Valida y crea una orden de venta en el mercado P2P aplicando la Tasa del 12%.
   */
  public static createMarketListing(
    sellerId: string,
    sellerName: string,
    resourceType: RefinedResourceType,
    quantity: number,
    pricePerUnitGold: number,
    referencePrice: P2PPriceReference,
    inventory: IndustrialInventory
  ): {
    success: boolean;
    listing?: P2PMarketListing;
    updatedInventory?: IndustrialInventory;
    errorMessage?: string;
  } {
    if (quantity <= 0) {
      return { success: false, errorMessage: 'La cantidad debe ser mayor a 0.' };
    }

    let available = 0;
    if (resourceType === 'refined_steel') available = inventory.refinedSteel;
    else if (resourceType === 'refined_concrete') available = inventory.refinedConcrete;
    else if (resourceType === 'refined_microchip') available = inventory.refinedMicrochip;

    if (available < quantity) {
      return { success: false, errorMessage: 'Inventario insuficiente para publicar la venta.' };
    }

    const collars = this.calculatePriceCollars(referencePrice.movingAveragePriceGold);
    if (pricePerUnitGold < collars.minPrice || pricePerUnitGold > collars.maxPrice) {
      return {
        success: false,
        errorMessage: `Precio fuera de banda. El rango permitido para ${resourceType} es de ${collars.minPrice}G a ${collars.maxPrice}G (±35% PMM).`,
      };
    }

    const totalPriceGold = quantity * pricePerUnitGold;
    const taxDeductedGold = Math.floor(totalPriceGold * this.MARKET_TAX_RATE);
    const netSellerRevenueGold = totalPriceGold - taxDeductedGold;

    const updatedInv: IndustrialInventory = {
      ...inventory,
      refinedSteel: resourceType === 'refined_steel' ? inventory.refinedSteel - quantity : inventory.refinedSteel,
      refinedConcrete: resourceType === 'refined_concrete' ? inventory.refinedConcrete - quantity : inventory.refinedConcrete,
      refinedMicrochip: resourceType === 'refined_microchip' ? inventory.refinedMicrochip - quantity : inventory.refinedMicrochip,
    };

    const listing: P2PMarketListing = {
      id: `listing_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sellerId,
      sellerName,
      resourceType,
      quantity,
      pricePerUnitGold,
      totalPriceGold,
      taxDeductedGold,
      netSellerRevenueGold,
      status: 'active',
      createdAt: Date.now(),
    };

    return {
      success: true,
      listing,
      updatedInventory: updatedInv,
    };
  }

  /**
   * Ejecuta la compra atómica de una orden P2P:
   */
  public static executeP2PPurchase(
    listing: P2PMarketListing,
    buyerId: string,
    buyerGold: number,
    buyerInventory: IndustrialInventory,
    sellerGold: number
  ): {
    success: boolean;
    updatedListing?: P2PMarketListing;
    updatedBuyerGold?: number;
    updatedSellerGold?: number;
    updatedBuyerInventory?: IndustrialInventory;
    errorMessage?: string;
  } {
    if (listing.status !== 'active') {
      return { success: false, errorMessage: 'La orden ya no está disponible.' };
    }
    if (listing.sellerId === buyerId) {
      return { success: false, errorMessage: 'No puedes comprar tu propia orden.' };
    }
    if (buyerGold < listing.totalPriceGold) {
      return {
        success: false,
        errorMessage: `Fondos insuficientes. Requiere ${listing.totalPriceGold}G (Posees ${buyerGold}G).`,
      };
    }

    const updatedBuyerGold = buyerGold - listing.totalPriceGold;
    const updatedSellerGold = sellerGold + listing.netSellerRevenueGold;

    const updatedBuyerInv: IndustrialInventory = {
      ...buyerInventory,
      refinedSteel: listing.resourceType === 'refined_steel' ? buyerInventory.refinedSteel + listing.quantity : buyerInventory.refinedSteel,
      refinedConcrete: listing.resourceType === 'refined_concrete' ? buyerInventory.refinedConcrete + listing.quantity : buyerInventory.refinedConcrete,
      refinedMicrochip: listing.resourceType === 'refined_microchip' ? buyerInventory.refinedMicrochip + listing.quantity : buyerInventory.refinedMicrochip,
    };

    return {
      success: true,
      updatedListing: { ...listing, status: 'sold' },
      updatedBuyerGold,
      updatedSellerGold,
      updatedBuyerInventory: updatedBuyerInv,
    };
  }
}

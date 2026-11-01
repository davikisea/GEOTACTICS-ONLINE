/**
 * ==============================================================================
 * MOTOR DE LADDER ASIMÉTRICO (N1-N15), NEAR-MISS Y MONETIZACIÓN REACTIVA (TILT)
 * ==============================================================================
 * Proyecto: Tactical Command: Wars of Legacy
 * Especificación Canónica: docs/01 §4, docs/02 §4 & §6, docs/03 §3, docs/04 §3.8 & §3.9
 * 
 * Reglas Oficiales:
 * 1. Bifurcación Competitiva:
 *    - Torneos Esports: Cap forzoso a Nivel 11 (Tournament Cap).
 *    - Ladder Clasificatorio Diario: Escalado real +2.0% por nivel hasta Nivel 15.
 *    - Filtro de Emparejamiento por APL (Average Power Level): Delta APL <= 1.5.
 * 2. Diagnóstico Balístico Post-Combate Near-Miss:
 *    - Se activa ante una derrota con oponente superviviente con <= 2 HP.
 *    - Cálculo contrafáctico: Daño extra si la unidad estuviese a Nivel 11.
 * 3. Ofertas Flash de Emergencia por Tilt ($0.99 en 180s):
 *    - Disparo: 2 derrotas consecutivas o derrota ajustada con PTE < 10s.
 *    - Caducidad: 180 segundos con cuenta regresiva.
 *    - Cooldown: Máximo 1 oferta cada 48 horas por cuenta.
 *    - Recompensa: 100 cartas de la tropa derrotada + 30 Vigas de Acero por $0.99.
 */

export interface UnitProgressionCost {
  level: number;
  requiredBlueprints: number;
  requiredGold: number;
  requiredSteel: number;
  requiredMicrochips: number;
  requiredConcrete: number;
}

export const UNIT_PROGRESSION_TABLE: Record<number, UnitProgressionCost> = {
  1: { level: 1, requiredBlueprints: 0, requiredGold: 0, requiredSteel: 0, requiredMicrochips: 0, requiredConcrete: 0 },
  2: { level: 2, requiredBlueprints: 5, requiredGold: 50, requiredSteel: 0, requiredMicrochips: 0, requiredConcrete: 0 },
  3: { level: 3, requiredBlueprints: 10, requiredGold: 100, requiredSteel: 0, requiredMicrochips: 0, requiredConcrete: 0 },
  4: { level: 4, requiredBlueprints: 20, requiredGold: 200, requiredSteel: 5, requiredMicrochips: 0, requiredConcrete: 0 },
  5: { level: 5, requiredBlueprints: 45, requiredGold: 450, requiredSteel: 10, requiredMicrochips: 0, requiredConcrete: 0 },
  6: { level: 6, requiredBlueprints: 75, requiredGold: 900, requiredSteel: 15, requiredMicrochips: 0, requiredConcrete: 0 },
  7: { level: 7, requiredBlueprints: 110, requiredGold: 1600, requiredSteel: 25, requiredMicrochips: 4, requiredConcrete: 0 },
  8: { level: 8, requiredBlueprints: 150, requiredGold: 2600, requiredSteel: 35, requiredMicrochips: 8, requiredConcrete: 0 },
  9: { level: 9, requiredBlueprints: 200, requiredGold: 3800, requiredSteel: 50, requiredMicrochips: 12, requiredConcrete: 5 },
  10: { level: 10, requiredBlueprints: 350, requiredGold: 7500, requiredSteel: 75, requiredMicrochips: 20, requiredConcrete: 10 },
  11: { level: 11, requiredBlueprints: 600, requiredGold: 14000, requiredSteel: 100, requiredMicrochips: 26, requiredConcrete: 20 },
  12: { level: 12, requiredBlueprints: 1000, requiredGold: 22000, requiredSteel: 140, requiredMicrochips: 32, requiredConcrete: 25 },
  13: { level: 13, requiredBlueprints: 1600, requiredGold: 35000, requiredSteel: 195, requiredMicrochips: 40, requiredConcrete: 35 },
  14: { level: 14, requiredBlueprints: 2300, requiredGold: 50000, requiredSteel: 260, requiredMicrochips: 50, requiredConcrete: 45 },
  15: { level: 15, requiredBlueprints: 3200, requiredGold: 75000, requiredSteel: 340, requiredMicrochips: 68, requiredConcrete: 60 },
};

export interface NearMissReport {
  isNearMiss: boolean;
  playerUnitId: string;
  playerUnitName: string;
  playerUnitLevel: number;
  rivalUnitId: string;
  rivalUnitName: string;
  rivalUnitLevel: number;
  rivalRemainingHp: number;
  damageInflicted: number;
  counterfactualDamageAtL11: number;
  extraDamageAtL11: number;
  wouldHaveDestroyedRival: boolean;
  tacticalEfficiencyPercentage: number;
  nextLevel: number;
  requiredBlueprints: number;
  currentBlueprints: number;
  requiredSteel: number;
  currentSteel: number;
  requiredChips: number;
  currentChips: number;
  commanderBark: {
    dialogue: string;
    bubbleStyle: 'shout' | 'speech' | 'thought';
    onomatopoeia: string;
  };
}

export interface TiltEmergencyOffer {
  id: string;
  userId: string;
  targetUnitId: string;
  targetUnitName: string;
  title?: string;
  offerPriceUsd: number; // 0.99
  rewardBlueprints: number; // 100
  rewardSteel: number; // 30
  expiresAt: number; // timestamp in ms (now + 12h)
  remainingSeconds: number; // 43,200s (12h)
  status: 'active' | 'purchased' | 'expired';
  discountPercentage: number; // 85
}

export interface MatchmakingValidationResult {
  canMatch: boolean;
  deltaAPL: number;
  deltaMaxLevel?: number;
  wAplP1?: number;
  wAplP2?: number;
  rejectionReason?: 'MAX_LEVEL_DISPARITY' | 'WEIGHTED_APL_DISPARITY' | null;
  reason?: string;
  isLegacyEvaluation?: boolean;
}

export class AsymmetricLadderEngine {
  public static readonly TOURNAMENT_CAP_LEVEL = 11;
  public static readonly MAX_LEVEL = 15;
  public static readonly STAT_GROWTH_STANDARD = 0.012; // +1.2% por nivel hasta N11
  public static readonly STAT_GROWTH_ELITE = 0.005; // +0.5% por nivel N12-N15 (Asintótico)
  public static readonly MAX_APL_DIFF = 1.5; // Límite de emparejamiento
  public static readonly MAX_CARD_LEVEL_DIFF = 2; // Hard Safety Cap de Nivel Máximo
  public static readonly TILT_OFFER_COOLDOWN_MS = 48 * 3600 * 1000; // 48 horas
  public static readonly TILT_OFFER_DURATION_MS = 12 * 3600 * 1000; // 12 horas (Ventana de reserva relajada)

  // Look-Up Table de pesos Boltzmann precalculada (gamma = 0.35) para L1-L15
  private static readonly BOLTZMANN_EXP_LUT: Float64Array = (() => {
    const lut = new Float64Array(16);
    for (let lvl = 1; lvl <= 15; lvl++) {
      lut[lvl] = Math.exp(0.35 * lvl);
    }
    return lut;
  })();

  /**
   * Calcula el multiplicador de estadísticas según la nueva fórmula asintótica bifásica:
   * Nivel 1 a 11: +1.2% por nivel (Cap Esports = +12.0%)
   * Nivel 12 a 15: +0.5% por nivel (Prestigio = +14.0% en N15)
   */
  public static getEffectiveLevel(level: number, isTournamentMode: boolean): number {
    const clampedLevel = Math.max(1, Math.min(this.MAX_LEVEL, level));
    if (isTournamentMode) {
      return Math.min(this.TOURNAMENT_CAP_LEVEL, clampedLevel);
    }
    return clampedLevel;
  }

  public static calculateStatMultiplier(level: number, isTournamentMode: boolean = false): number {
    const effectiveLevel = this.getEffectiveLevel(level, isTournamentMode);
    const standardGrowth = Math.min(effectiveLevel - 1, 10) * this.STAT_GROWTH_STANDARD;
    const eliteGrowth = Math.max(0, effectiveLevel - 11) * this.STAT_GROWTH_ELITE;
    return Number((1.0 + standardGrowth + eliteGrowth).toFixed(3));
  }

  /**
   * Mecánica "David vs. Goliat": Algoritmo de compensación dinámica por handicap de mazo.
   * Si un jugador supera a un rival con mazo de nivel superior, recibe una bonificación masiva.
   */
  public static calculateUnderdogHandicap(
    playerWAPL: number,
    opponentWAPL: number,
    isVictory: boolean,
    baseTrophies: number,
    baseCredits: number
  ): {
    trophiesDelta: number;
    creditsDelta: number;
    isUnderdog: boolean;
    handicapBonusTrophies: number;
    handicapBonusCredits: number;
  } {
    const deltaWAPL = Number((opponentWAPL - playerWAPL).toFixed(2));
    const isUnderdog = deltaWAPL >= 0.8;

    if (!isUnderdog) {
      return {
        trophiesDelta: baseTrophies,
        creditsDelta: baseCredits,
        isUnderdog: false,
        handicapBonusTrophies: 0,
        handicapBonusCredits: 0,
      };
    }

    if (isVictory) {
      const bonusTrophies = Math.round(baseTrophies * Math.min(0.30, deltaWAPL * 0.15));
      const bonusCredits = Math.round(baseCredits * Math.min(0.50, deltaWAPL * 0.25));
      return {
        trophiesDelta: baseTrophies + bonusTrophies,
        creditsDelta: baseCredits + bonusCredits,
        isUnderdog: true,
        handicapBonusTrophies: bonusTrophies,
        handicapBonusCredits: bonusCredits,
      };
    } else {
      // En derrota mitiga el golpe en un 15-30%
      const mitigatedLoss = Math.round(baseTrophies * Math.max(0.70, 1.0 - deltaWAPL * 0.10));
      return {
        trophiesDelta: mitigatedLoss,
        creditsDelta: baseCredits,
        isUnderdog: true,
        handicapBonusTrophies: 0,
        handicapBonusCredits: 0,
      };
    }
  }

  /**
   * Calcula el Nivel Medio de Poder (APL) lineal simple de un mazo de cartas.
   * Preservado para compatibilidad y telemetría histórica.
   */
  public static calculateDeckAPL(deckLevels: number[]): number {
    if (!deckLevels || deckLevels.length === 0) return 1.0;
    const sum = deckLevels.reduce((acc, lvl) => acc + lvl, 0);
    return Number((sum / deckLevels.length).toFixed(2));
  }

  /**
   * Calcula el APL Ponderado Convexo (W-APL) aplicando Softmax Boltzmann con LUT.
   * Garantiza analíticamente que el resultado reside en [1.0, 15.0].
   */
  public static calculateDeckWAPL(deckLevels: number[], isTournamentMode: boolean = false): number {
    if (!deckLevels || deckLevels.length === 0) return 1.0;

    let weightedSum = 0;
    let totalWeights = 0;

    for (let i = 0; i < deckLevels.length; i++) {
      const rawLevel = deckLevels[i];
      const effLevel = this.getEffectiveLevel(rawLevel, isTournamentMode);
      const weight = this.BOLTZMANN_EXP_LUT[effLevel] || Math.exp(0.35 * effLevel);

      weightedSum += effLevel * weight;
      totalWeights += weight;
    }

    if (totalWeights <= 0) return 1.0;
    const wApl = weightedSum / totalWeights;
    return Number(wApl.toFixed(2));
  }

  /**
   * Sobrecarga 1 (Recomendada): Evaluación con mazos completos y modo de juego (Dual-Shield).
   */
  public static validateLadderMatchmaking(
    deckP1: number[],
    deckP2: number[],
    isTournamentMode?: boolean
  ): MatchmakingValidationResult;

  /**
   * Sobrecarga 2 (Legacy): Evaluación con escalares para retrocompatibilidad.
   */
  public static validateLadderMatchmaking(
    aplP1: number,
    aplP2: number
  ): MatchmakingValidationResult;

  /**
   * Valida si dos jugadores pueden emparejarse en Ladder.
   * Protocolo Dual-Shield:
   * 1. Hard Safety Cap: |MaxLvl_P1 - MaxLvl_P2| <= 2 (evaluado sobre niveles efectivos).
   * 2. Soft W-APL Gate: |W-APL_P1 - W-APL_P2| <= 1.5.
   */
  public static validateLadderMatchmaking(
    p1: number[] | number,
    p2: number[] | number,
    isTournamentMode: boolean = false
  ): MatchmakingValidationResult {
    // 1. Camino Moderno: Ambos parámetros son arrays de cartas
    if (Array.isArray(p1) && Array.isArray(p2)) {
      if (p1.length === 0 || p2.length === 0) {
        return {
          canMatch: false,
          deltaAPL: 0,
          reason: 'Mazo vacío detectado.',
        };
      }

      // Normalizar cartas según el modo de juego (Cap L11 en Torneo Esports)
      const effP1 = p1.map((lvl) => this.getEffectiveLevel(lvl, isTournamentMode));
      const effP2 = p2.map((lvl) => this.getEffectiveLevel(lvl, isTournamentMode));

      const maxP1 = Math.max(...effP1);
      const maxP2 = Math.max(...effP2);
      const deltaMax = Math.abs(maxP1 - maxP2);

      // BARRERA 1: Early Exit por Hard Safety Cap
      if (deltaMax > this.MAX_CARD_LEVEL_DIFF) {
        return {
          canMatch: false,
          deltaAPL: 0,
          deltaMaxLevel: deltaMax,
          rejectionReason: 'MAX_LEVEL_DISPARITY',
          reason: `Violación de Safety Cap: Diferencia de nivel máximo (${deltaMax}) supera el límite seguro de ${this.MAX_CARD_LEVEL_DIFF}. (P1: L${maxP1} vs P2: L${maxP2})`,
        };
      }

      // BARRERA 2: Soft Gate por W-APL Convexo
      const wAplP1 = this.calculateDeckWAPL(p1, isTournamentMode);
      const wAplP2 = this.calculateDeckWAPL(p2, isTournamentMode);
      const deltaAPL = Number(Math.abs(wAplP1 - wAplP2).toFixed(2));

      if (deltaAPL > this.MAX_APL_DIFF) {
        return {
          canMatch: false,
          deltaAPL,
          deltaMaxLevel: deltaMax,
          wAplP1,
          wAplP2,
          rejectionReason: 'WEIGHTED_APL_DISPARITY',
          reason: `Diferencia de Poder Ponderado (W-APL ${deltaAPL}) excede la tolerancia competitiva (${this.MAX_APL_DIFF}). (P1: ${wAplP1} vs P2: ${wAplP2})`,
        };
      }

      return {
        canMatch: true,
        deltaAPL,
        deltaMaxLevel: deltaMax,
        wAplP1,
        wAplP2,
        rejectionReason: null,
      };
    }

    // 2. Camino Legacy: Parámetros escalares (Preservado para llamadas heredadas)
    const apl1 = typeof p1 === 'number' ? p1 : this.calculateDeckAPL(p1);
    const apl2 = typeof p2 === 'number' ? p2 : this.calculateDeckAPL(p2);
    const deltaAPL = Number(Math.abs(apl1 - apl2).toFixed(2));

    if (deltaAPL <= this.MAX_APL_DIFF) {
      return { canMatch: true, deltaAPL, rejectionReason: null, isLegacyEvaluation: true };
    }
    return {
      canMatch: false,
      deltaAPL,
      rejectionReason: 'WEIGHTED_APL_DISPARITY',
      reason: `Diferencia de Nivel de Mazo (APL ${deltaAPL}) excede el límite de tolerancia (${this.MAX_APL_DIFF}).`,
      isLegacyEvaluation: true,
    };
  }

  /**
   * Diagnóstico Balístico Post-Combate: Protocolo "Near-Miss".
   * Se dispara cuando una unidad enemiga sobrevive con <= 2 HP tras eliminar a una unidad del jugador.
   */
  public static evaluateNearMiss(
    isVictory: boolean,
    playerUnit: { id: string; name: string; level: number; currentBlueprints?: number },
    rivalUnit: { id: string; name: string; level: number; remainingHp: number },
    playerInventory: { refinedSteel: number; refinedMicrochip: number },
    baseCombatDamage: number = 7.0
  ): NearMissReport | null {
    // Solo aplica ante derrotas y cuando el rival sobrevive por <= 2.0 HP
    if (isVictory || rivalUnit.remainingHp <= 0 || rivalUnit.remainingHp > 2.0) {
      return null;
    }

    const currentMultiplier = this.calculateStatMultiplier(playerUnit.level, false);
    const inflictedDamage = Number((baseCombatDamage * currentMultiplier).toFixed(1));

    // Cálculo contrafáctico: si la unidad hubiese estado a Nivel 11 (Cap de Torneo)
    const l11Multiplier = this.calculateStatMultiplier(11, false);
    const counterfactualDamage = Number((baseCombatDamage * l11Multiplier).toFixed(1));
    const extraDamage = Number((counterfactualDamage - inflictedDamage).toFixed(1));

    const wouldHaveDestroyedRival = extraDamage >= rivalUnit.remainingHp;

    const nextLevel = Math.min(this.MAX_LEVEL, playerUnit.level + 1);
    const nextLevelCost = UNIT_PROGRESSION_TABLE[nextLevel] || UNIT_PROGRESSION_TABLE[15];

    const tacticalEfficiencyPercentage = Math.min(99, Math.round((inflictedDamage / (inflictedDamage + rivalUnit.remainingHp)) * 100));

    return {
      isNearMiss: true,
      playerUnitId: playerUnit.id,
      playerUnitName: playerUnit.name,
      playerUnitLevel: playerUnit.level,
      rivalUnitId: rivalUnit.id,
      rivalUnitName: rivalUnit.name,
      rivalUnitLevel: rivalUnit.level,
      rivalRemainingHp: rivalUnit.remainingHp,
      damageInflicted: inflictedDamage,
      counterfactualDamageAtL11: counterfactualDamage,
      extraDamageAtL11: extraDamage,
      wouldHaveDestroyedRival,
      tacticalEfficiencyPercentage,
      nextLevel,
      requiredBlueprints: nextLevelCost.requiredBlueprints,
      currentBlueprints: playerUnit.currentBlueprints || 0,
      requiredSteel: nextLevelCost.requiredSteel,
      currentSteel: playerInventory.refinedSteel,
      requiredChips: nextLevelCost.requiredMicrochips,
      currentChips: playerInventory.refinedMicrochip,
      commanderBark: {
        dialogue: `¡Brillante despliegue, Comandante! Tu maniobra superó al blindaje de Nivel ${rivalUnit.level} enemigo con una eficiencia del ${tacticalEfficiencyPercentage}%. Su blindaje resistió por pura fortuna con solo ${rivalUnit.remainingHp} HP.`,
        bubbleStyle: 'speech',
        onomatopoeia: '¡TACTICAL MASTER!',
      },
    };
  }

  /**
   * Genera o evalúa si corresponde emitir un Cargamento de Contraataque del Alto Mando.
   * Condiciones:
   * 1. Derrota con racha de derrotas >= 2 O Near-Miss con PTE < 10s (turnos precipitados).
   * 2. Cooldown de 48 horas entre asignaciones de cargamento militar.
   * 3. Ventana de reserva de 12 horas (sin estrés de pánico).
   */
  public static evaluateTiltOffer(
    userId: string,
    targetUnitId: string,
    targetUnitName: string,
    defeatStreak: number,
    averageTurnSeconds: number,
    isNearMiss: boolean,
    lastOfferTimestampMs: number = 0,
    currentTimestampMs: number = Date.now()
  ): TiltEmergencyOffer | null {
    // 1. Verificar cooldown de 48 horas
    const timeSinceLastOffer = currentTimestampMs - lastOfferTimestampMs;
    if (timeSinceLastOffer < this.TILT_OFFER_COOLDOWN_MS) {
      return null;
    }

    // 2. Condición de disparo por tensión de combate
    const isTilt = defeatStreak >= 2 || (isNearMiss && averageTurnSeconds < 10);
    if (!isTilt) {
      return null;
    }

    // 3. Generar Cargamento de Contraataque de 12 horas por $0.99
    return {
      id: `counter_offensive_${userId}_${currentTimestampMs}`,
      userId,
      targetUnitId,
      targetUnitName,
      title: 'Cargamento de Contraataque del Alto Mando',
      offerPriceUsd: 0.99,
      rewardBlueprints: 100,
      rewardSteel: 30,
      expiresAt: currentTimestampMs + this.TILT_OFFER_DURATION_MS,
      remainingSeconds: Math.floor(this.TILT_OFFER_DURATION_MS / 1000), // 43,200s (12h)
      status: 'active',
      discountPercentage: 85,
    };
  }
}

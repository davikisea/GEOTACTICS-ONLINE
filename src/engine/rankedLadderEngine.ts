/**
 * ==============================================================================
 * MOTOR DE LADDER CLASIFICATORIO, SISTEMA ELO, ARENAS Y COLAS MULTI-MODO
 * ==============================================================================
 * Proyecto: Tactical Command: Wars of Legacy
 * Especificación Canónica Calibrada: PROPOSAL_DB_ARCHITECTURE.md (v2.0.0-CALIBRATED)
 * Base de Datos: supabase/migrations/20261031000014_unified_matchmaking_and_ranked_ladder.sql
 *
 * Características Calibradas:
 * 1. Algoritmo de Elo Asimétrico con Factor K dinámico (K=40 en Arena 1 hasta K=20 en Ligas).
 * 2. Transición a Suma Cero Estricta (0 inflación) a partir de 2,000 Trofeos (Arena 6).
 * 3. Escudo Dinámico de Descenso (3 cargas) para erradicar el atasco psicológico.
 * 4. Compresión Estacional no lineal (Season Reset cada 28 días) para drenar masa de trofeos.
 * 5. Escala Maestra de 10 Arenas Progresivas + 3 Divisiones de Gran Liga Legendaria.
 * 6. Bóveda de Ranuras de Cofres (4 slots) con verificación anti-speed-hack y multiplicadores.
 */

export interface RankedArena {
  tier: number;
  id: string;
  name: string;
  minTrophies: number;
  maxTrophies: number;
  requiredAccountLevel: number;
  kFactor: number;
  lossMultiplier: number;
  resourceMultiplier: number;
  unlockMilestone: string;
}

export const RANKED_ARENAS: RankedArena[] = [
  {
    tier: 1,
    id: 'arena_1',
    name: 'Polígono "Fort Bragg"',
    minTrophies: 0,
    maxTrophies: 399,
    requiredAccountLevel: 1,
    kFactor: 40,
    lossMultiplier: 0.0, // Cero pérdida
    resourceMultiplier: 1.0,
    unlockMilestone: 'Armada Inicial (Infantería, Recon, Tanque Ligero)',
  },
  {
    tier: 2,
    id: 'arena_2',
    name: 'Sector "Río Bravo"',
    minTrophies: 400,
    maxTrophies: 799,
    requiredAccountLevel: 2,
    kFactor: 36,
    lossMultiplier: 0.6,
    resourceMultiplier: 1.15,
    unlockMilestone: 'Mecanizados (Bazuca Antitanque), B-Copter',
  },
  {
    tier: 3,
    id: 'arena_3',
    name: 'Paso "El Alamein"',
    minTrophies: 800,
    maxTrophies: 1199,
    requiredAccountLevel: 4,
    kFactor: 36,
    lossMultiplier: 0.6,
    resourceMultiplier: 1.3,
    unlockMilestone: 'Vehículo Antiaéreo, Taller Militar',
  },
  {
    tier: 4,
    id: 'arena_4',
    name: 'Zona "Valle del Silicio"',
    minTrophies: 1200,
    maxTrophies: 1599,
    requiredAccountLevel: 5,
    kFactor: 32,
    lossMultiplier: 0.85,
    resourceMultiplier: 1.45,
    unlockMilestone: 'Altos Hornos Vulcan, Tanque Medio',
  },
  {
    tier: 5,
    id: 'arena_5',
    name: 'Atolón "Midway"',
    minTrophies: 1600,
    maxTrophies: 1999,
    requiredAccountLevel: 6,
    kFactor: 32,
    lossMultiplier: 0.85,
    resourceMultiplier: 1.6,
    unlockMilestone: 'Cantera de Piedra N2, Fragata Naval',
  },
  {
    tier: 6,
    id: 'arena_6',
    name: 'Metrópolis "Stalingrado"',
    minTrophies: 2000,
    maxTrophies: 2399,
    requiredAccountLevel: 8,
    kFactor: 28,
    lossMultiplier: 1.0, // Suma cero estricta
    resourceMultiplier: 1.8,
    unlockMilestone: 'ACCESO AL MERCADO GLOBAL P2P',
  },
  {
    tier: 7,
    id: 'arena_7',
    name: 'Tundra "Operación Fracaso"',
    minTrophies: 2400,
    maxTrophies: 2799,
    requiredAccountLevel: 9,
    kFactor: 28,
    lossMultiplier: 1.0,
    resourceMultiplier: 2.0,
    unlockMilestone: 'Sala Limpia de Semiconductores, Caza Aéreo',
  },
  {
    tier: 8,
    id: 'arena_8',
    name: 'Reducto "Bastión de Hierro"',
    minTrophies: 2800,
    maxTrophies: 3199,
    requiredAccountLevel: 10,
    kFactor: 28,
    lossMultiplier: 1.0,
    resourceMultiplier: 2.25,
    unlockMilestone: 'Silo Logístico Subterráneo N1',
  },
  {
    tier: 9,
    id: 'arena_9',
    name: 'Ciudadela "Alto Mando"',
    minTrophies: 3200,
    maxTrophies: 3599,
    requiredAccountLevel: 11,
    kFactor: 24,
    lossMultiplier: 1.0,
    resourceMultiplier: 2.5,
    unlockMilestone: 'HITO: TOURNAMENT READY (Cap de Torneos N11)',
  },
  {
    tier: 10,
    id: 'arena_10',
    name: 'Complejo "Astra Zenith"',
    minTrophies: 3600,
    maxTrophies: 3999,
    requiredAccountLevel: 12,
    kFactor: 24,
    lossMultiplier: 1.0,
    resourceMultiplier: 2.75,
    unlockMilestone: 'Parcela 8 + Nano-Aleaciones (Endgame)',
  },
  {
    tier: 11,
    id: 'league_1',
    name: 'LIGA I: División Contendientes',
    minTrophies: 4000,
    maxTrophies: 4499,
    requiredAccountLevel: 13,
    kFactor: 20,
    lossMultiplier: 1.0,
    resourceMultiplier: 3.0,
    unlockMilestone: 'Parcela 9 + Circuitos Cuánticos',
  },
  {
    tier: 12,
    id: 'league_2',
    name: 'LIGA II: División Élite Estratégica',
    minTrophies: 4500,
    maxTrophies: 4999,
    requiredAccountLevel: 14,
    kFactor: 20,
    lossMultiplier: 1.0,
    resourceMultiplier: 3.25,
    unlockMilestone: 'Parcela 10 + Núcleos de Fusión',
  },
  {
    tier: 13,
    id: 'league_3',
    name: 'LIGA III: Gran Liga Legendaria',
    minTrophies: 5000,
    maxTrophies: 99999,
    requiredAccountLevel: 15,
    kFactor: 20,
    lossMultiplier: 1.0,
    resourceMultiplier: 3.5,
    unlockMilestone: 'Corona de Honor / Circuito Mundial Esports',
  },
];

export class RankedLadderEngine {
  /**
   * Obtiene la Arena correspondiente según los trofeos actuales.
   */
  public static getArenaForTrophies(trophies: number): RankedArena {
    const clampedTrophies = Math.max(0, trophies);
    for (const arena of RANKED_ARENAS) {
      if (clampedTrophies >= arena.minTrophies && clampedTrophies <= arena.maxTrophies) {
        return arena;
      }
    }
    return RANKED_ARENAS[RANKED_ARENAS.length - 1];
  }

  /**
   * Calcula la variación de trofeos Elo aplicando la función logística y el Factor K dinámico.
   */
  public static calculateEloDelta(
    playerTrophies: number,
    opponentTrophies: number,
    arenaTier: number,
    isVictory: boolean
  ): number {
    const arena = RANKED_ARENAS.find(a => a.tier === arenaTier) || this.getArenaForTrophies(playerTrophies);
    const expected = 1.0 / (1.0 + Math.pow(10.0, (opponentTrophies - playerTrophies) / 400.0));
    const score = isVictory ? 1.0 : 0.0;
    const rawDelta = Math.round(arena.kFactor * (score - expected));

    if (!isVictory) {
      return Math.round(rawDelta * arena.lossMultiplier);
    }
    return rawDelta;
  }

  /**
   * Aplica la mecánica del Escudo de Descenso (3 cargas) para evitar caídas bruscas.
   */
  public static applyDescentShield(
    currentTrophies: number,
    shieldCharges: number,
    isDefeat: boolean
  ): {
    newTrophies: number;
    remainingShieldCharges: number;
    demotedToPreviousArena: boolean;
  } {
    const currentArena = this.getArenaForTrophies(currentTrophies);

    // En Arenas 1 a 3 hay Trophy Gate absoluta (piso indestructible)
    if (currentArena.tier <= 3) {
      const clamped = Math.max(currentArena.minTrophies, currentTrophies);
      return {
        newTrophies: clamped,
        remainingShieldCharges: 3,
        demotedToPreviousArena: false,
      };
    }

    // En Arenas 4 a 8 opera el Escudo de Descenso
    if (currentArena.tier <= 8 && isDefeat && currentTrophies <= currentArena.minTrophies) {
      if (shieldCharges > 0) {
        return {
          newTrophies: currentArena.minTrophies,
          remainingShieldCharges: shieldCharges - 1,
          demotedToPreviousArena: false,
        };
      } else {
        // Al agotar cargas, desciende a la arena previa con penalización amortiguada
        return {
          newTrophies: Math.max(0, currentArena.minTrophies - 30),
          remainingShieldCharges: 0,
          demotedToPreviousArena: true,
        };
      }
    }

    return {
      newTrophies: currentTrophies,
      remainingShieldCharges: shieldCharges,
      demotedToPreviousArena: false,
    };
  }

  /**
   * Algoritmo de Compresión Estacional (Season Reset cada 28 Días).
   * Drena los trofeos inyectados por bots y novatos.
   */
  public static calculateSeasonReset(currentTrophies: number): number {
    if (currentTrophies < 3200) {
      return currentTrophies; // Arenas 1 a 8 no se tocan
    }
    if (currentTrophies < 4000) {
      // Compresión del 30% sobre el exceso de 3,200
      return Math.floor(3200 + (currentTrophies - 3200) * 0.7);
    }
    // Compresión del 50% sobre el exceso de 4,000
    return Math.floor(4000 + (currentTrophies - 4000) * 0.5);
  }

  /**
   * Expansión temporal de la ventana de búsqueda en cola y timeouts.
   */
  public static calculateQueueSearchWindow(
    elapsedSeconds: number,
    gameMode: 'mirror_duel' | 'blitz_skirmish' | 'grand_campaign'
  ): {
    trophyWindow: number;
    maxPowerDisparity: number;
    isTimeout: boolean;
  } {
    if (gameMode === 'mirror_duel') {
      if (elapsedSeconds < 10) return { trophyWindow: 150, maxPowerDisparity: 0, isTimeout: false };
      if (elapsedSeconds < 20) return { trophyWindow: 300, maxPowerDisparity: 0, isTimeout: false };
      return { trophyWindow: 500, maxPowerDisparity: 0, isTimeout: true };
    }

    if (gameMode === 'blitz_skirmish') {
      if (elapsedSeconds < 10) return { trophyWindow: 150, maxPowerDisparity: 1.0, isTimeout: false };
      if (elapsedSeconds < 20) return { trophyWindow: 300, maxPowerDisparity: 1.5, isTimeout: false };
      if (elapsedSeconds < 30) return { trophyWindow: 450, maxPowerDisparity: 2.0, isTimeout: false };
      return { trophyWindow: 600, maxPowerDisparity: 2.5, isTimeout: true };
    }

    // grand_campaign
    if (elapsedSeconds < 15) return { trophyWindow: 200, maxPowerDisparity: 1.5, isTimeout: false };
    if (elapsedSeconds < 30) return { trophyWindow: 400, maxPowerDisparity: 2.0, isTimeout: false };
    if (elapsedSeconds < 45) return { trophyWindow: 600, maxPowerDisparity: 2.5, isTimeout: false };
    if (elapsedSeconds < 60) return { trophyWindow: 800, maxPowerDisparity: 3.0, isTimeout: false };
    return { trophyWindow: 1000, maxPowerDisparity: 3.5, isTimeout: true };
  }

  /**
   * Duración estándar de desbloqueo de cofres en segundos.
   */
  public static getChestUnlockDurationSeconds(
    chestType: 'wood' | 'iron' | 'armored' | 'legendary'
  ): number {
    switch (chestType) {
      case 'wood': // Bronce
        return 3 * 3600; // 10,800s
      case 'iron': // Plata
        return 8 * 3600; // 28,800s
      case 'armored': // Oro
        return 12 * 3600; // 43,200s
      case 'legendary': // Élite
        return 24 * 3600; // 86,400s
    }
  }

  /**
   * Recompensas del cofre escaladas por Arena Tier.
   */
  public static calculateChestRewards(
    chestType: 'wood' | 'iron' | 'armored' | 'legendary',
    arenaTier: number
  ): { credits: number; blueprints: number; steel: number } {
    let baseCredits = 450;
    let baseBlueprints = 45;
    let baseSteel = 0;

    switch (chestType) {
      case 'iron':
        baseCredits = 1400;
        baseBlueprints = 140;
        baseSteel = 5;
        break;
      case 'armored':
        baseCredits = 3200;
        baseBlueprints = 340;
        baseSteel = 15;
        break;
      case 'legendary':
        baseCredits = 8000;
        baseBlueprints = 800;
        baseSteel = 40;
        break;
      default: // wood / bronze
        break;
    }

    const multiplier = 1.0 + (Math.max(1, arenaTier) - 1) * 0.15;
    return {
      credits: Math.floor(baseCredits * multiplier),
      blueprints: Math.floor(baseBlueprints * multiplier),
      steel: baseSteel,
    };
  }
}

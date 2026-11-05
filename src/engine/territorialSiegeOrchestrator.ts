/**
 * ==============================================================================
 * ORQUESTADOR DE ASEDIO TERRITORIAL Y HUMAN HANDSHAKE (120s)
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §4.2 & §5.4
 * Pilares:
 * - Handshake defensivo de 120 segundos (HANDSHAKE_TIMEOUT_SECONDS = 120).
 * - Emparejamiento PvP en vivo si un oficial defensor acepta el duelo.
 * - Relevo cognitivo automático a Guarnición IA (Niveles 1 a 5) si expira el tiempo.
 * - Drenaje determinista de Puntos de Control Territorial (TCP).
 * - Soberanía Dual: Ocupación De Facto con ventana de gracia de 24h-48h y cooldown de 4h.
 * ==============================================================================
 */

import {
  GeotacticsRegionSovereignty,
  TerritorialBattleSession,
  MASTER_METAGAME_CONSTANTS,
  GarrisonAIEngineTier,
} from '../types/metagame';
import { GarrisonAIEngine } from './garrisonAIEngine';

export interface InitiateSiegeParams {
  regionId: string;
  attackerClanId: string;
  attackerCommanderId: string;
  defenderClanId?: string | null;
  sovereignty: GeotacticsRegionSovereignty;
}

export interface SiegeResolutionResult {
  winner: 'attacker' | 'defender';
  regionId: string;
  tcpDelta: number;
  newControlPoints: number;
  previousStatus: 'stable' | 'under_siege' | 'occupied_grace';
  newStatus: 'stable' | 'under_siege' | 'occupied_grace';
  isSovereigntyFlipped: boolean;
  cooldownExpiresAt?: string | null;
  graceExpiresAt?: string | null;
  newOwnerClanId: string | null;
  newControllerClanId: string | null;
}

export class TerritorialSiegeOrchestrator {
  /**
   * Inicia una sesión formal de asedio territorial con temporizador de Handshake de 120 segundos.
   */
  public static createSiegeSession(params: InitiateSiegeParams): {
    session: TerritorialBattleSession;
    updatedSovereignty: GeotacticsRegionSovereignty;
  } {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + MASTER_METAGAME_CONSTANTS.HANDSHAKE_TIMEOUT_SECONDS * 1000);

    const session: TerritorialBattleSession = {
      id: `siege_${params.regionId}_${now.getTime()}`,
      regionId: params.regionId,
      attackerClanId: params.attackerClanId,
      defenderClanId: params.defenderClanId ?? params.sovereignty.controllerClanId,
      attackerCommanderId: params.attackerCommanderId,
      defenderCommanderId: null,
      mode: 'pve_garrison',
      handshakeExpiresAt: expiresAt.toISOString(),
      status: 'handshake_pending',
      createdAt: now.toISOString(),
      concludedAt: null,
    };

    const updatedSovereignty: GeotacticsRegionSovereignty = {
      ...params.sovereignty,
      status: 'under_siege',
      activeBattleId: session.id,
      updatedAt: now.toISOString(),
    };

    return { session, updatedSovereignty };
  }

  /**
   * Relevo humano defensivo: un oficial del clan defensor toma el mando en vivo antes de 120 segundos.
   */
  public static claimDefensiveHandshake(
    session: TerritorialBattleSession,
    defenderCommanderId: string,
    currentTime: Date = new Date()
  ): {
    session: TerritorialBattleSession;
    success: boolean;
    reason?: string;
  } {
    const expiresAt = new Date(session.handshakeExpiresAt);

    if (currentTime > expiresAt) {
      return {
        session,
        success: false,
        reason: 'El plazo de Handshake de 120 segundos ha expirado; la Guarnición IA asumió el mando.',
      };
    }

    if (session.status !== 'handshake_pending') {
      return {
        session,
        success: false,
        reason: `La sesión ya no está en espera de Handshake (Estado: ${session.status}).`,
      };
    }

    const updatedSession: TerritorialBattleSession = {
      ...session,
      defenderCommanderId,
      mode: 'pvp_realtime',
      status: 'in_combat',
    };

    return {
      session: updatedSession,
      success: true,
    };
  }

  /**
   * Expiración del temporizador de 120 segundos: la Guarnición IA asume el mando automáticamente.
   */
  public static resolveHandshakeTimeout(
    session: TerritorialBattleSession,
    bunkerLevel: 1 | 2 | 3 | 4 | 5,
    currentTime: Date = new Date()
  ): {
    session: TerritorialBattleSession;
    aiTier: GarrisonAIEngineTier;
  } {
    const aiSpec = GarrisonAIEngine.GARRISON_TIER_SPECS[bunkerLevel] || GarrisonAIEngine.GARRISON_TIER_SPECS[1];

    const updatedSession: TerritorialBattleSession = {
      ...session,
      mode: 'pve_garrison',
      status: 'in_combat',
    };

    return {
      session: updatedSession,
      aiTier: aiSpec.aiEngineTier,
    };
  }

  /**
   * Calcula el impacto en Puntos de Control Territorial (TCP) según el desenlace de la batalla.
   * Victoria Atacante: Drena entre 800 y 2,500 TCP (mitigado por el nivel de búnker defensivo).
   * Victoria Defensora: Restaura +500 TCP hacia el techo de la región.
   */
  public static calculateSiegeTcpDelta(
    winner: 'attacker' | 'defender',
    bunkerLevel: 1 | 2 | 3 | 4 | 5,
    isCapital: boolean = false
  ): number {
    if (winner === 'defender') {
      return 500; // Recuperación de fortificación por victoria defensora
    }

    // Base de drenaje atacante: 1,800 TCP para provincia regular, 1,200 TCP para capital blindada
    const baseDrain = isCapital ? 1200 : 1800;
    // Búnker de nivel superior atenúa el daño por victoria atacante hasta un -40% en Nv. 5
    const bunkerMitigationFactor = Math.max(0.60, 1.0 - (bunkerLevel - 1) * 0.10);

    const calculatedDrain = Math.floor(baseDrain * bunkerMitigationFactor);
    // Acotado estrictamente entre 800 y 2,500 TCP
    return -Math.min(2500, Math.max(800, calculatedDrain));
  }

  /**
   * Resuelve el asedio, ajusta los puntos de control y transiciona el estado de soberanía territorial.
   */
  public static resolveTerritorialSiege(
    sovereignty: GeotacticsRegionSovereignty,
    session: TerritorialBattleSession,
    winner: 'attacker' | 'defender',
    isCapital: boolean = false,
    resolutionTime: Date = new Date()
  ): SiegeResolutionResult {
    const tcpDelta = this.calculateSiegeTcpDelta(winner, sovereignty.bunkerLevel, isCapital);
    const maxTcp = sovereignty.maxControlPoints || (isCapital ? 15000 : 10000);
    const newTcp = Math.max(0, Math.min(maxTcp, sovereignty.controlPoints + tcpDelta));

    let newStatus: 'stable' | 'under_siege' | 'occupied_grace' = sovereignty.status;
    let isSovereigntyFlipped = false;
    let newOwnerClanId = sovereignty.ownerClanId;
    let newControllerClanId = sovereignty.controllerClanId;
    let cooldownExpiresAt: string | null = null;
    let graceExpiresAt: string | null = null;

    if (winner === 'attacker') {
      if (newTcp <= 0) {
        // Colapso total de la guarnición: Volteo de Soberanía a Ocupación De Facto
        isSovereigntyFlipped = true;
        newStatus = 'occupied_grace';
        newControllerClanId = session.attackerClanId; // Ocupante De Facto
        // El De Jure Owner se conserva durante la ventana de gracia (24h - 48h)
        newOwnerClanId = sovereignty.ownerClanId ?? sovereignty.controllerClanId;

        // Escudo de prioridad anti-steamroll de 4 horas
        const cooldownTime = new Date(resolutionTime.getTime() + MASTER_METAGAME_CONSTANTS.COOLDOWN_PRIORITY_HOURS * 3600 * 1000);
        cooldownExpiresAt = cooldownTime.toISOString();

        // Ventana de gracia de 24 horas para contraataque de liberación
        const graceTime = new Date(resolutionTime.getTime() + 24 * 3600 * 1000);
        graceExpiresAt = graceTime.toISOString();
      } else {
        newStatus = 'under_siege';
      }
    } else {
      // Victoria Defensora: Si el TCP se recupera plenamente, se estabiliza la región
      if (newTcp >= maxTcp) {
        newStatus = 'stable';
      } else {
        newStatus = 'under_siege';
      }
    }

    return {
      winner,
      regionId: sovereignty.regionId,
      tcpDelta,
      newControlPoints: newTcp,
      previousStatus: sovereignty.status,
      newStatus,
      isSovereigntyFlipped,
      cooldownExpiresAt,
      graceExpiresAt,
      newOwnerClanId,
      newControllerClanId,
    };
  }

  /**
   * Consolida la transferencia legal (De Jure) si la ventana de gracia de 24h-48h expira sin reconquista.
   */
  public static consolidateDeJureOwnership(
    sovereignty: GeotacticsRegionSovereignty,
    currentTime: Date = new Date()
  ): {
    consolidatedSovereignty: GeotacticsRegionSovereignty;
    wasConsolidated: boolean;
  } {
    if (sovereignty.status !== 'occupied_grace' || !sovereignty.graceExpiresAt) {
      return { consolidatedSovereignty: sovereignty, wasConsolidated: false };
    }

    const graceExpires = new Date(sovereignty.graceExpiresAt);
    if (currentTime < graceExpires) {
      return { consolidatedSovereignty: sovereignty, wasConsolidated: false };
    }

    // Expiración de gracia: Transferencia de título legal De Jure al clan ocupante
    const maxTcp = sovereignty.maxControlPoints || 10000;
    const consolidatedSovereignty: GeotacticsRegionSovereignty = {
      ...sovereignty,
      ownerClanId: sovereignty.controllerClanId, // El Controller pasa a ser el Owner legal
      controlPoints: maxTcp, // Reseteo de TCP a fortificación completa
      status: 'stable',
      customsEscrowLocked: false,
      graceExpiresAt: null,
      cooldownExpiresAt: null,
      updatedAt: currentTime.toISOString(),
    };

    return { consolidatedSovereignty, wasConsolidated: true };
  }
}

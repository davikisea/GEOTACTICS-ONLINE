/**
 * ==============================================================================
 * MOTOR DE REFUERZOS Y LOGÍSTICA DE COMBATE (REINFORCEMENT ENGINE)
 * ==============================================================================
 * Especificación Canónica: METAGAME_DESIGN/MASTER_METAGAME_SPEC_V1.md §5.1
 * Invariantes:
 * 1. Petición única de refuerzos por batalla (MaxRequests = 1).
 * 2. Latencia determinista: Llegada en Ronda T + 4.
 * 3. Consumo de unidades físicas del hangar real del jugador.
 * 4. Penalización de Victoria Pírrica (-15% en puntuación final de gloria/créditos).
 * ==============================================================================
 */

import { GridPosition, TacticalUnit } from '../types';
import { ReinforcementQueueEntry, MASTER_METAGAME_CONSTANTS } from '@shared';

export interface ReinforcementRequestPayload {
  matchId: string;
  playerId: string;
  currentTurn: number;
  units: Array<{
    unitCode: string;
    tier: number;
    level: number;
    hp: number;
  }>;
}

export interface ReinforcementState {
  hasRequested: boolean;
  requestedAtTurn?: number;
  arrivalTurn?: number;
  isDelivered: boolean;
  queuedUnits: Array<{
    unitCode: string;
    tier: number;
    level: number;
    hp: number;
  }>;
}

export class TacticalReinforcementEngine {
  /**
   * Crea el estado inicial limpio para el seguimiento de refuerzos en una partida.
   */
  public static createInitialState(): ReinforcementState {
    return {
      hasRequested: false,
      isDelivered: false,
      queuedUnits: [],
    };
  }

  /**
   * Aplica directamente la penalización del 15% sobre un valor numérico.
   */
  public static applyPyrrhicVictoryPenalty(value: number): number {
    return Math.floor(value * (1 - MASTER_METAGAME_CONSTANTS.PYRRHIC_VICTORY_PENALTY));
  }

  /**
   * Procesa la solicitud de refuerzos validando la invariante de petición única.
   */
  public static queueReinforcement(
    currentState: ReinforcementState,
    payload: ReinforcementRequestPayload
  ): {
    success: boolean;
    error?: string;
    updatedState: ReinforcementState;
    queueEntry?: ReinforcementQueueEntry;
  } {
    // Invariante 1: Exactamente 1 solicitud por batalla
    if (currentState.hasRequested) {
      return {
        success: false,
        error: 'Ya se ha solicitado el contingente de refuerzos en esta batalla (Límite: 1).',
        updatedState: currentState,
      };
    }

    if (!payload.units || payload.units.length === 0) {
      return {
        success: false,
        error: 'No se seleccionaron unidades del hangar para el despliegue.',
        updatedState: currentState,
      };
    }

    const arrivalTurn = payload.currentTurn + MASTER_METAGAME_CONSTANTS.REINFORCEMENT_ARRIVAL_TURNS;

    const queueEntry: ReinforcementQueueEntry = {
      matchId: payload.matchId,
      playerId: payload.playerId,
      requestedAtTurn: payload.currentTurn,
      arrivalTurn,
      unitsToDeploy: payload.units,
      isDelivered: false,
    };

    const updatedState: ReinforcementState = {
      hasRequested: true,
      requestedAtTurn: payload.currentTurn,
      arrivalTurn,
      isDelivered: false,
      queuedUnits: payload.units,
    };

    return {
      success: true,
      updatedState,
      queueEntry,
    };
  }

  /**
   * Comprueba si los refuerzos deben entrar al tablero en el turno en curso (Ronda T >= arrivalTurn).
   */
  public static checkReinforcementArrival(
    state: ReinforcementState,
    currentTurn: number
  ): {
    shouldDeploy: boolean;
    turnsRemaining: number;
    unitsToDeploy: Array<{ unitCode: string; tier: number; level: number; hp: number }>;
  } {
    if (!state.hasRequested || state.isDelivered || !state.arrivalTurn) {
      return {
        shouldDeploy: false,
        turnsRemaining: 0,
        unitsToDeploy: [],
      };
    }

    const turnsRemaining = Math.max(0, state.arrivalTurn - currentTurn);
    const shouldDeploy = turnsRemaining === 0;

    return {
      shouldDeploy,
      turnsRemaining,
      unitsToDeploy: shouldDeploy ? state.queuedUnits : [],
    };
  }

  /**
   * Aplica la penalización de Victoria Pírrica (-15%) si se convocaron refuerzos en el match.
   */
  public static applyPyrrhicVictoryAdjustment(
    rawScore: number,
    state: ReinforcementState
  ): {
    finalScore: number;
    wasPenalized: boolean;
    penaltyPercent: number;
  } {
    if (!state.hasRequested) {
      return {
        finalScore: rawScore,
        wasPenalized: false,
        penaltyPercent: 0,
      };
    }

    const penaltyPercent = MASTER_METAGAME_CONSTANTS.PYRRHIC_VICTORY_PENALTY * 100;
    const finalScore = Math.floor(rawScore * (1 - MASTER_METAGAME_CONSTANTS.PYRRHIC_VICTORY_PENALTY));

    return {
      finalScore,
      wasPenalized: true,
      penaltyPercent,
    };
  }
}
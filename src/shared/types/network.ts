/**
 * Tactical Command: Wars of Legacy - Protocolo de Red, Sincronización y Reconexión
 * Especificación: docs/orchestration/03_NETWORKING_AND_TECHNICAL_DEBT.md
 * Contrato formal para partidas PvP Realtime y Reconstrucción de Estado (Snapshot + Deltas)
 */

import { TacticalUnit, TerrainTile, GridPosition, PlayerCOState } from './index';

export interface TurnSnapshot {
  matchId: string;
  turnNumber: number;
  activePlayer: 'p1' | 'p2';
  timestamp: string;
  tiles: { x: number; y: number; ownerId: string | null; captureHp: number; type?: string }[];
  units: TacticalUnit[];
  funds: { p1: number; p2: number };
  coStates: Record<'p1' | 'p2', PlayerCOState>;
  airDrops?: { id: string; x: number; y: number; turnsRemaining: number }[];
}

export type DeltaActionType =
  | 'MOVE'
  | 'ATTACK'
  | 'CAPTURE'
  | 'JOIN'
  | 'LOAD'
  | 'UNLOAD'
  | 'SILO'
  | 'SUPPLY'
  | 'PRODUCE'
  | 'CO_POWER'
  | 'END_TURN';

export interface DeltaAction {
  actionId: number;
  timestamp: number;
  unitId?: string;
  type: DeltaActionType;
  from?: GridPosition;
  to?: GridPosition;
  targetId?: string;
  fundsDelta?: number;
  payload?: any;
}

export interface ReconnectionPayload {
  snapshot: TurnSnapshot;
  deltas: DeltaAction[];
  serverUtcTime: string;
  turnTimeLimitSec: number;
  turnTimeRemainingSec: number;
  disconnectGraceRemainingSec: number;
}

export interface MatchSyncEvent {
  type: 'MATCH_ACTION' | 'STATE_SYNC' | 'PLAYER_JOINED' | 'PLAYER_DISCONNECTED' | 'RECONNECTED';
  matchId: string;
  senderId: string;
  turnNumber: number;
  action?: DeltaAction;
  timestamp: number;
}

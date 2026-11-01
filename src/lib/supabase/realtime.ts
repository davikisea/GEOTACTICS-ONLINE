import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';
import { GridPosition, TacticalUnit, TerrainTile } from '../../types';

// ============================================================================
// TIPOS Y CONTRATOS DE EVENTOS WEBSOCKET (REALTIME PROTOCOL)
// ============================================================================

export type RealtimeActionType =
  | 'MOVE_UNIT'
  | 'ATTACK_UNIT'
  | 'CAPTURE_BUILDING'
  | 'SPAWN_UNIT'
  | 'END_TURN'
  | 'SYNC_STATE'
  | 'CURSOR_MOVE';

export interface BaseRealtimeMessage {
  matchId: string;
  senderId: string;
  sequenceId: number;
  timestamp: number;
}

export interface MoveUnitPayload extends BaseRealtimeMessage {
  type: 'MOVE_UNIT';
  unitId: string;
  path: GridPosition[];
  destination: GridPosition;
}

export interface AttackUnitPayload extends BaseRealtimeMessage {
  type: 'ATTACK_UNIT';
  attackerId: string;
  targetId: string;
  attackerDamageDealt: number;
  defenderHpRemaining: number;
  counterDamageDealt: number;
  attackerHpRemaining: number;
}

export interface CaptureBuildingPayload extends BaseRealtimeMessage {
  type: 'CAPTURE_BUILDING';
  unitId: string;
  propertyPosition: GridPosition;
  previousCaptureHp: number;
  remainingCaptureHp: number;
  isCaptured: boolean;
  newOwnerId: string | null;
}

export interface SpawnUnitPayload extends BaseRealtimeMessage {
  type: 'SPAWN_UNIT';
  unitCode: string;
  factoryPosition: GridPosition;
  cost: number;
  spawnedUnit: TacticalUnit;
}

export interface EndTurnPayload extends BaseRealtimeMessage {
  type: 'END_TURN';
  nextPlayerId: string;
  turnNumber: number;
}

export interface CursorMovePayload extends BaseRealtimeMessage {
  type: 'CURSOR_MOVE';
  hoveredCell: GridPosition | null;
}

export type RealtimeMatchEvent =
  | MoveUnitPayload
  | AttackUnitPayload
  | CaptureBuildingPayload
  | SpawnUnitPayload
  | EndTurnPayload
  | CursorMovePayload;

// ============================================================================
// GESTOR DETERMINISTA DE ESTADO MULTIJUGADOR (LOCAL STATE MANAGER)
// ============================================================================

export interface MultiplayerGameState {
  matchId: string;
  currentTurnPlayerId: string;
  turnNumber: number;
  lastSequenceId: number;
  units: Map<string, TacticalUnit>;
  tiles: TerrainTile[][];
  playerFunds: Record<string, number>;
  isSynchronized: boolean;
}

export class MultiplayerStateManager {
  /**
   * Aplica de forma determinista una acción remota recibida a través del socket
   * sobre el estado local del tablero.
   */
  public static applyRemoteAction(
    action: RealtimeMatchEvent,
    currentState: MultiplayerGameState
  ): MultiplayerGameState {
    const nextState: MultiplayerGameState = {
      ...currentState,
      lastSequenceId: Math.max(currentState.lastSequenceId, action.sequenceId),
      units: new Map(currentState.units),
      tiles: currentState.tiles.map(row => row.map(tile => ({ ...tile }))),
      playerFunds: { ...currentState.playerFunds },
    };

    switch (action.type) {
      case 'MOVE_UNIT': {
        const unit = nextState.units.get(action.unitId);
        if (unit) {
          const updatedUnit: TacticalUnit = {
            ...unit,
            x: action.destination.x,
            y: action.destination.y,
            hasMoved: true,
          };
          nextState.units.set(action.unitId, updatedUnit);
        }
        break;
      }

      case 'ATTACK_UNIT': {
        const attacker = nextState.units.get(action.attackerId);
        const target = nextState.units.get(action.targetId);

        if (target) {
          if (action.defenderHpRemaining <= 0) {
            // Unidad enemiga aniquilada
            nextState.units.delete(action.targetId);
          } else {
            nextState.units.set(action.targetId, {
              ...target,
              hp: action.defenderHpRemaining,
            });
          }
        }

        if (attacker) {
          if (action.attackerHpRemaining <= 0) {
            nextState.units.delete(action.attackerId);
          } else {
            nextState.units.set(action.attackerId, {
              ...attacker,
              hp: action.attackerHpRemaining,
              hasActed: true,
            });
          }
        }
        break;
      }

      case 'CAPTURE_BUILDING': {
        const { propertyPosition, isCaptured, newOwnerId, remainingCaptureHp } = action;
        const tile = nextState.tiles[propertyPosition.y]?.[propertyPosition.x];
        if (tile) {
          tile.captureHp = remainingCaptureHp;
          if (isCaptured && newOwnerId) {
            tile.ownerId = newOwnerId;
            tile.captureHp = 20; // Restablecer para defensa
          }
        }
        const unit = nextState.units.get(action.unitId);
        if (unit) {
          nextState.units.set(action.unitId, { ...unit, hasActed: true });
        }
        break;
      }

      case 'SPAWN_UNIT': {
        nextState.units.set(action.spawnedUnit.id, action.spawnedUnit);
        const currentFunds = nextState.playerFunds[action.senderId] ?? 0;
        nextState.playerFunds[action.senderId] = Math.max(0, currentFunds - action.cost);
        break;
      }

      case 'END_TURN': {
        nextState.currentTurnPlayerId = action.nextPlayerId;
        nextState.turnNumber = action.turnNumber;

        // Reabastecer y habilitar tropas del jugador que recibe el turno
        for (const [id, unit] of nextState.units.entries()) {
          if (unit.ownerId === action.nextPlayerId) {
            nextState.units.set(id, {
              ...unit,
              hasMoved: false,
              hasActed: false,
            });
          }
        }

        // Ingresos económicos de turno (+1000G por propiedad controlada)
        let propertyIncome = 0;
        for (let y = 0; y < nextState.tiles.length; y++) {
          for (let x = 0; x < nextState.tiles[0].length; x++) {
            const tile = nextState.tiles[y][x];
            if (['city', 'factory', 'airport', 'port', 'hq'].includes(tile.type) && tile.ownerId === action.nextPlayerId) {
              propertyIncome += 1000;
            }
          }
        }

        const prevFunds = nextState.playerFunds[action.nextPlayerId] ?? 0;
        nextState.playerFunds[action.nextPlayerId] = prevFunds + propertyIncome;
        break;
      }
    }

    return nextState;
  }
}

// ============================================================================
// CONEXIÓN Y SINCRONIZACIÓN REALTIME (CONNECTION MANAGER)
// ============================================================================

export interface RealtimeHandlers {
  onActionReceived: (action: RealtimeMatchEvent) => void;
  onOpponentPresenceChange: (isOnline: boolean) => void;
  onConnectionStatusChange: (status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING') => void;
  onStateResynced: (serverState: any) => void;
}

export class RealtimeConnectionManager {
  private client: SupabaseClient<Database>;
  private matchId: string;
  private userId: string;
  private channel: RealtimeChannel | null = null;
  private handlers: RealtimeHandlers;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    client: SupabaseClient<Database>,
    matchId: string,
    userId: string,
    handlers: RealtimeHandlers
  ) {
    this.client = client;
    this.matchId = matchId;
    this.userId = userId;
    this.handlers = handlers;
  }

  /**
   * Conecta y se suscribe a los canales de Broadcast, Postgres Changes y Presence
   */
  public connect() {
    this.handlers.onConnectionStatusChange('CONNECTING');

    const channelName = `match_room_${this.matchId}`;
    this.channel = this.client.channel(channelName, {
      config: {
        broadcast: { ack: true, self: false },
        presence: { key: this.userId },
      },
    });

    // 1. ESCUCHAR DIFUSIONES BROADCAST (Acciones instantáneas)
    this.channel.on('broadcast', { event: 'match_action' }, payload => {
      if (payload.payload) {
        this.handlers.onActionReceived(payload.payload as RealtimeMatchEvent);
      }
    });

    // 2. ESCUCHAR PERSISTENCIA EN BD (Postgres Changes)
    this.channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'match_state',
        filter: `match_id=eq.${this.matchId}`,
      },
      payload => {
        // Al detectar cambio autoritativo en base de datos, sincronizar estado
        if (payload.new) {
          this.handlers.onStateResynced(payload.new);
        }
      }
    );

    // 3. SEGUIMIENTO DE PRESENCIA (Presence API)
    this.channel.on('presence', { event: 'sync' }, () => {
      const presenceState = this.channel?.presenceState() || {};
      const activeUserIds = Object.keys(presenceState);
      const isOpponentOnline = activeUserIds.some(uid => uid !== this.userId);
      this.handlers.onOpponentPresenceChange(isOpponentOnline);
    });

    // Suscripción activa
    this.channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        this.reconnectAttempts = 0;
        this.handlers.onConnectionStatusChange('CONNECTED');

        // Registrar presencia
        await this.channel?.track({
          online_at: new Date().toISOString(),
          userId: this.userId,
        });

        // Iniciar Heartbeat cada 5 segundos
        this.startHeartbeat();
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        this.handlers.onConnectionStatusChange('DISCONNECTED');
        this.handleAutoReconnect();
      }
    });
  }

  /**
   * Transmite una acción de juego al oponente a través del canal de difusión
   */
  public async sendAction(action: RealtimeMatchEvent): Promise<boolean> {
    if (!this.channel) return false;

    const response = await this.channel.send({
      type: 'broadcast',
      event: 'match_action',
      payload: action,
    });

    return response === 'ok';
  }

  /**
   * Re-sincroniza el estado completo directamente desde la base de datos de Supabase
   */
  public async resyncFromDatabase(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('match_state')
        .select('*')
        .eq('match_id', this.matchId)
        .single();

      if (error || !data) {
        console.error('Error al sincronizar match_state desde BD:', error);
        return false;
      }

      this.handlers.onStateResynced(data);
      return true;
    } catch (err) {
      console.error('Fallo en resyncFromDatabase:', err);
      return false;
    }
  }

  /**
   * Reconexión automática con retroceso exponencial
   */
  private handleAutoReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Se alcanzó el límite de reintentos de reconexión Realtime');
      return;
    }

    this.reconnectAttempts++;
    this.handlers.onConnectionStatusChange('RECONNECTING');

    const backoffTimeMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    setTimeout(async () => {
      this.disconnect();
      this.connect();
      // Tras reconectar, forzar sincronización autoritativa desde la BD
      await this.resyncFromDatabase();
    }, backoffTimeMs);
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(async () => {
      if (this.channel) {
        await this.channel.track({
          online_at: new Date().toISOString(),
          userId: this.userId,
        });
      }
    }, 5000);
  }

  /**
   * Desconecta limpiamente el canal y limpia intervalos
   */
  public disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.handlers.onConnectionStatusChange('DISCONNECTED');
  }
}

/**
 * ==============================================================================
 * TOPOLOGÍA HÍBRIDA REALTIME (POSTGRES CHANGES + BROADCAST CHANNELS)
 * ==============================================================================
 * Especificación Canónica: docs/architecture/PROPUESTA_REINGENIERIA_MIGRACION_16.md
 * - Postgres Changes: Escucha cambios de estado persistentes en active_matches.
 * - Broadcast Channels: Tráfico efímero de baja latencia sin impacto en WAL/DB (CURSOR_MOVE, pings).
 */
export function subscribeToMatchSession(
  supabase: SupabaseClient<any>,
  matchId: string,
  onStateUpdate: (state: any) => void,
  onEphemeralEvent?: (event: string, payload: any) => void
): RealtimeChannel {
  const channel = supabase.channel(`match:${matchId}`, {
    config: {
      broadcast: { ack: false },
    },
  });

  // 1. Cambios de estado formales de partida (Postgres Changes sobre active_matches con REPLICA IDENTITY FULL)
  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'active_matches',
      filter: `id=eq.${matchId}`,
    },
    payload => {
      onStateUpdate(payload.new);
    }
  );

  // 2. Micro-acciones en vivo efímeras (Broadcast - Cero escrituras en WAL)
  if (onEphemeralEvent) {
    channel.on('broadcast', { event: 'TACTICAL_CURSOR' }, ({ payload }) => {
      onEphemeralEvent('TACTICAL_CURSOR', payload);
    });
    channel.on('broadcast', { event: 'RADIO_PING' }, ({ payload }) => {
      onEphemeralEvent('RADIO_PING', payload);
    });
  }

  return channel.subscribe();
}

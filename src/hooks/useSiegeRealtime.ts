/**
 * ==============================================================================
 * HOOK DE SINCRONIZACIÓN REALTIME DE ASEDIO TERRITORIAL Y HANDSHAKE (120s)
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §5.4
 * - Suscripción a alertas de asedio en tiempo real por provincia.
 * - Cuenta atrás síncrona en vivo de 120 segundos para el Human Handshake.
 * - Relevo a Guarnición IA al expirar el tiempo.
 * - Soporte offline / fallback para tests deterministas y modo de desarrollo.
 * ==============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase/client';
import {
  TerritorialBattleSession,
  GeotacticsRegionSovereignty,
  MASTER_METAGAME_CONSTANTS,
} from '../types/metagame';
import {
  TerritorialSiegeOrchestrator,
  SiegeResolutionResult,
} from '../engine/territorialSiegeOrchestrator';
import { audioManager } from '../engine/audioManager';

export interface UseSiegeRealtimeReturn {
  activeSession: TerritorialBattleSession | null;
  sovereignty: GeotacticsRegionSovereignty | null;
  handshakeSecondsRemaining: number;
  isHandshakeActive: boolean;
  isHandshakeExpired: boolean;
  isDefendingClan: boolean;
  isLoading: boolean;
  error: string | null;
  startSiege: (
    attackerClanId: string,
    attackerCommanderId: string,
    currentSovereignty: GeotacticsRegionSovereignty
  ) => Promise<TerritorialBattleSession>;
  claimHandshake: (defenderCommanderId: string) => Promise<{ success: boolean; message?: string }>;
  resolveExpiredHandshake: (bunkerLevel: 1 | 2 | 3 | 4 | 5) => void;
  resolveBattleConcluded: (
    winner: 'attacker' | 'defender',
    isCapital?: boolean
  ) => SiegeResolutionResult | null;
}

export function useSiegeRealtime(
  regionId?: string | null,
  userClanId?: string | null,
  currentUserId?: string | null
): UseSiegeRealtimeReturn {
  const [activeSession, setActiveSession] = useState<TerritorialBattleSession | null>(null);
  const [sovereignty, setSovereignty] = useState<GeotacticsRegionSovereignty | null>(null);
  const [handshakeSecondsRemaining, setHandshakeSecondsRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calcula si el clan del usuario actual es el defensor en esta sesión
  const isDefendingClan = Boolean(
    userClanId && activeSession?.defenderClanId && userClanId === activeSession.defenderClanId
  );

  const isHandshakeActive = Boolean(
    activeSession && activeSession.status === 'handshake_pending' && handshakeSecondsRemaining > 0
  );

  const isHandshakeExpired = Boolean(
    activeSession && activeSession.status === 'handshake_pending' && handshakeSecondsRemaining <= 0
  );

  // Actualizador del reloj Fischer de Handshake (120s -> 0s)
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'handshake_pending') {
      if (timerRef.current) clearInterval(timerRef.current);
      setHandshakeSecondsRemaining(0);
      return;
    }

    const updateRemaining = () => {
      const expiresAt = new Date(activeSession.handshakeExpiresAt).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.ceil((expiresAt - now) / 1000));
      setHandshakeSecondsRemaining(diffSec);

      if (diffSec <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    updateRemaining();
    timerRef.current = setInterval(updateRemaining, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession]);

  // Suscripción Realtime al canal de batalla territorial
  useEffect(() => {
    if (!regionId) return;

    const channelName = `territorial_siege:${regionId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'territorial_battle_sessions',
          filter: `region_id=eq.${regionId}`,
        },
        payload => {
          if (payload.new) {
            setActiveSession(payload.new as TerritorialBattleSession);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [regionId]);

  /**
   * Inicia formalmente el asedio sobre una provincia limítrofe.
   */
  const startSiege = useCallback(
    async (
      attackerClanId: string,
      attackerCommanderId: string,
      currentSovereignty: GeotacticsRegionSovereignty
    ): Promise<TerritorialBattleSession> => {
      setIsLoading(true);
      setError(null);

      const { session, updatedSovereignty } = TerritorialSiegeOrchestrator.createSiegeSession({
        regionId: currentSovereignty.regionId,
        attackerClanId,
        attackerCommanderId,
        defenderClanId: currentSovereignty.controllerClanId,
        sovereignty: currentSovereignty,
      });

      setActiveSession(session);
      setSovereignty(updatedSovereignty);
      audioManager.playSFX('co_power');

      try {
        const db = supabase as any;
        await db.from('territorial_battle_sessions').insert({
          id: session.id,
          region_id: session.regionId,
          attacker_clan_id: session.attackerClanId,
          defender_clan_id: session.defenderClanId,
          attacker_commander_id: session.attackerCommanderId,
          mode: session.mode,
          handshake_expires_at: session.handshakeExpiresAt,
          status: session.status,
        });

        await db
          .from('region_sovereignty')
          .update({
            status: 'under_siege',
            active_battle_id: session.id,
            updated_at: new Date().toISOString(),
          })
          .eq('region_id', session.regionId);
      } catch (err: any) {
        console.warn('[SiegeRealtime] Persistencia remota en fallback local:', err.message);
      } finally {
        setIsLoading(false);
      }

      return session;
    },
    []
  );

  /**
   * Un oficial humano del clan defensor pulsa "Tomar el Mando" antes de los 120s.
   */
  const claimHandshake = useCallback(
    async (defenderCommanderId: string): Promise<{ success: boolean; message?: string }> => {
      if (!activeSession) {
        return { success: false, message: 'No hay ninguna sesión de asedio activa para reclamar.' };
      }

      const res = TerritorialSiegeOrchestrator.claimDefensiveHandshake(
        activeSession,
        defenderCommanderId,
        new Date()
      );

      if (!res.success) {
        setError(res.reason || 'Handshake fallido');
        return { success: false, message: res.reason };
      }

      setActiveSession(res.session);
      audioManager.playSFX('unit_order');

      try {
        const db = supabase as any;
        await db
          .from('territorial_battle_sessions')
          .update({
            defender_commander_id: defenderCommanderId,
            mode: 'pvp_realtime',
            status: 'in_combat',
          })
          .eq('id', activeSession.id);
      } catch (err: any) {
        console.warn('[SiegeRealtime] Error al persistir claim:', err.message);
      }

      return { success: true };
    },
    [activeSession]
  );

  /**
   * Resuelve la expiración de los 120 segundos asignando la Guarnición IA correspondiente al nivel del búnker.
   */
  const resolveExpiredHandshake = useCallback(
    (bunkerLevel: 1 | 2 | 3 | 4 | 5) => {
      if (!activeSession || activeSession.status !== 'handshake_pending') return;

      const res = TerritorialSiegeOrchestrator.resolveHandshakeTimeout(
        activeSession,
        bunkerLevel,
        new Date()
      );

      setActiveSession(res.session);

      const db = supabase as any;
      Promise.resolve(
        db
          .from('territorial_battle_sessions')
          .update({
            mode: 'pve_garrison',
            status: 'in_combat',
          })
          .eq('id', activeSession.id)
      ).catch((err: any) => console.warn('[SiegeRealtime] Fallback timeout local:', err));
    },
    [activeSession]
  );

  /**
   * Resuelve el cierre de la batalla y ajusta los puntos de control TCP.
   */
  const resolveBattleConcluded = useCallback(
    (winner: 'attacker' | 'defender', isCapital: boolean = false): SiegeResolutionResult | null => {
      if (!activeSession || !sovereignty) return null;

      const result = TerritorialSiegeOrchestrator.resolveTerritorialSiege(
        sovereignty,
        activeSession,
        winner,
        isCapital,
        new Date()
      );

      const updatedSov: GeotacticsRegionSovereignty = {
        ...sovereignty,
        controlPoints: result.newControlPoints,
        status: result.newStatus,
        ownerClanId: result.newOwnerClanId,
        controllerClanId: result.newControllerClanId,
        cooldownExpiresAt: result.cooldownExpiresAt,
        graceExpiresAt: result.graceExpiresAt,
        updatedAt: new Date().toISOString(),
      };

      setSovereignty(updatedSov);
      setActiveSession(prev => (prev ? { ...prev, status: 'concluded', concludedAt: new Date().toISOString() } : null));

      return result;
    },
    [activeSession, sovereignty]
  );

  return {
    activeSession,
    sovereignty,
    handshakeSecondsRemaining,
    isHandshakeActive,
    isHandshakeExpired,
    isDefendingClan,
    isLoading,
    error,
    startSiege,
    claimHandshake,
    resolveExpiredHandshake,
    resolveBattleConcluded,
  };
}

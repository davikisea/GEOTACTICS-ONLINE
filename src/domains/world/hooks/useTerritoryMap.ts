/**
 * ==============================================================================
 * HOOK DE SINCRONIZACIÓN Y MANDO TERRITORIAL EN TIEMPO REAL (USE TERRITORY MAP)
 * ==============================================================================
 * Eje Gravitacional de Datos en Vivo (Supabase SSOT + Réplica Determinista Project Alice):
 * - Carga las 31 regiones del Teatro Venezuela (24 Estados Soberanos + 7 Buffer Zones)
 *   desde `public.regions`, `public.region_adjacencies` y `public.region_sovereignty`
 *   con sincronización en vivo con `politicalAliceEngine`.
 * - Ejecuta operaciones políticas/estratégicas en la Capa 1 sin abrir combate táctico.
 * ==============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@shared';
import {
  WorldCountry,
  WorldProvince,
  TerritoryNode,
  TerritoryAdjacency,
  TerritoryControlState,
} from '@shared';
import { politicalAliceEngine } from '@domains/world';
import { barkEngine } from '@domains/game-feel';

export interface ClanHeraldicInfo {
  id: string;
  name: string;
  tag: string;
  emblem: string;
  color: string;
}

export interface TerritoryMapState {
  countries: WorldCountry[];
  provinces: WorldProvince[];
  nodes: TerritoryNode[];
  adjacencies: TerritoryAdjacency[];
  controlMap: Record<string, TerritoryControlState>;
  clansMap: Record<string, ClanHeraldicInfo>;
  isLoading: boolean;
  error: string | null;
  lastSyncAt: Date | null;
}

export function useTerritoryMap(userClanId?: string | null) {
  const [state, setState] = useState<TerritoryMapState>(() => {
    const initialAlice = politicalAliceEngine.toTerritoryMapLegacyData();
    return {
      ...initialAlice,
      isLoading: false,
      error: null,
      lastSyncAt: new Date(),
    };
  });

  const isMountedRef = useRef(true);

  const syncFromAliceEngine = useCallback(() => {
    if (!isMountedRef.current) return;
    const aliceData = politicalAliceEngine.toTerritoryMapLegacyData();
    setState({
      ...aliceData,
      isLoading: false,
      error: null,
      lastSyncAt: new Date(),
    });
  }, []);

  /**
   * Carga inicial y sincronización híbrida con Supabase (si está activo) + Motor Local Project Alice.
   */
  const loadTerritoryData = useCallback(async () => {
    syncFromAliceEngine();

    const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string | undefined>);
    if (env.VITE_ENABLE_REMOTE_TERRITORY_SYNC !== 'true') {
      return;
    }

    try {
      const db = supabase as any;
      const [regionsRes, sovereigntyRes] = await Promise.all([
        db.from('regions').select('*'),
        db.from('region_sovereignty').select('*'),
      ]);

      if (!regionsRes.error && regionsRes.data && regionsRes.data.length > 0 && !sovereigntyRes.error && sovereigntyRes.data) {
        // Sincronizar puntos de control de Supabase si existen filas válidas del seed Venezuela
        const aliceState = politicalAliceEngine.getState();
        let hasUpdates = false;
        for (const row of sovereigntyRes.data as any[]) {
          if (row.region_id && aliceState.sovereigntyMap[row.region_id] && row.controller_clan_id) {
            aliceState.sovereigntyMap[row.region_id] = {
              ...aliceState.sovereigntyMap[row.region_id],
              ownerClanId: row.owner_clan_id,
              controllerClanId: row.controller_clan_id,
              controlPoints: Number(row.control_points) || 10000,
              maxControlPoints: Number(row.max_control_points) || 10000,
              bunkerLevel: (Number(row.bunker_level) || 1) as 1 | 2 | 3 | 4 | 5,
              status: row.status || 'stable',
            };
            hasUpdates = true;
          }
        }
        if (hasUpdates) {
          syncFromAliceEngine();
        }
      }
    } catch {
      // Mantiene la réplica determinista de las 31 regiones de Venezuela en Project Alice
    }
  }, [syncFromAliceEngine]);

  useEffect(() => {
    isMountedRef.current = true;
    loadTerritoryData();

    const unsubscribeAlice = politicalAliceEngine.subscribe(() => {
      syncFromAliceEngine();
    });

    return () => {
      isMountedRef.current = false;
      unsubscribeAlice();
    };
  }, [loadTerritoryData, syncFromAliceEngine]);

  /**
   * Ejecuta la operación política/asedio contra una región del Teatro Venezuela (Capa 1).
   */
  const declareAttack = useCallback(
    async (_originProvinceId: string, targetProvinceId: string, _attackerClanId: string) => {
      const targetRegion = politicalAliceEngine.getRegionById(targetProvinceId);
      const res = politicalAliceEngine.executePoliticalSiegeOperation(targetProvinceId);

      // Disparar Bark de Mayor Stella (Sujeto de prueba único Capa 3)
      if (!targetRegion?.isPlayable) {
        barkEngine.triggerBark({
          commanderId: 'stella',
          triggerContext: 'buffer_zone_blocked',
          unitName: targetRegion?.name || targetProvinceId,
          bondingLevel: 5,
        });
      } else if (res.conquered) {
        barkEngine.triggerBark({
          commanderId: 'stella',
          triggerContext: 'region_claimed',
          unitName: targetRegion?.name || targetProvinceId,
          bondingLevel: 5,
        });
      } else if (res.success) {
        barkEngine.triggerBark({
          commanderId: 'stella',
          triggerContext: 'siege_declared',
          unitName: targetRegion?.name || targetProvinceId,
          bondingLevel: 5,
        });
      } else {
        barkEngine.triggerBark({
          commanderId: 'stella',
          triggerContext: res.barkContext,
          unitName: targetRegion?.name || targetProvinceId,
          bondingLevel: 5,
        });
      }

      syncFromAliceEngine();

      return {
        success: res.success,
        error: res.success ? undefined : res.message,
        message: res.message,
        isCapital: targetProvinceId === 'REG_VE_01',
      };
    },
    [syncFromAliceEngine]
  );

  return {
    ...state,
    refreshMap: loadTerritoryData,
    syncTerritoryData: loadTerritoryData,
    declareAttack,
  };
}
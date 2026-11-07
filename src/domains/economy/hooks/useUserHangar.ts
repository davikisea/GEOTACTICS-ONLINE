/**
 * ==============================================================================
 * HOOK DE GESTIÓN PERSISTENTE DEL HANGAR FÍSICO Y PATENTES (USE USER HANGAR)
 * ==============================================================================
 * Eje Gravitacional de Datos en Vivo (Supabase SSOT - 0% Mock Data):
 * - Lectura y sincronización reactiva de `public.user_unit_hangar`.
 * - Desbloqueo y persistencia de patentes en `public.user_patents`.
 * - Regla Canónica de Desguace: 35% de chatarra recuperada (MASTER_METAGAME_CONSTANTS).
 * - Cero fallbacks locales o IDs sintéticos en modo autenticado.
 * ==============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@shared';
import {
  UnitHangarEntry,
  PatentRegistryEntry,
  MASTER_METAGAME_CONSTANTS,
} from '@shared';
import { audioManager } from '@domains/game-feel';

export interface UseUserHangarReturn {
  hangarUnits: UnitHangarEntry[];
  unlockedPatents: PatentRegistryEntry[];
  battlegroup: UnitHangarEntry[];
  isLoading: boolean;
  error: string | null;
  refreshHangar: () => Promise<void>;
  craftUnit: (params: {
    unitCode: string;
    tier: number;
    level: number;
    quantity: number;
    costs: { ec: number; steel: number; rareEarth?: number; composites?: number };
  }) => Promise<{ success: boolean; message: string }>;
  unlockPatent: (params: {
    patentCode: string;
    tier: number;
    costEc: number;
    costSteel: number;
  }) => Promise<{ success: boolean; message: string }>;
  scrapUnit: (hangarUnitId: string) => Promise<{
    success: boolean;
    recoveredSteel: number;
    recoveredEc: number;
    message: string;
  }>;
  toggleBattlegroupUnit: (unit: UnitHangarEntry) => void;
  setBattlegroupLoadout: (units: UnitHangarEntry[]) => void;
}

export function useUserHangar(userId?: string | null): UseUserHangarReturn {
  const [hangarUnits, setHangarUnits] = useState<UnitHangarEntry[]>([]);
  const [unlockedPatents, setUnlockedPatents] = useState<PatentRegistryEntry[]>([]);
  const [battlegroup, setBattlegroup] = useState<UnitHangarEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);

  /**
   * Carga reactiva de unidades y patentes desde Supabase.
   */
  const loadHangarData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let activeUserId = userId;
      if (!activeUserId) {
        const { data: authData } = await supabase.auth.getUser();
        activeUserId = authData?.user?.id ?? null;
      }

      if (!activeUserId) {
        if (isMountedRef.current) {
          setHangarUnits([]);
          setUnlockedPatents([]);
          setBattlegroup([]);
          setIsLoading(false);
        }
        return;
      }

      // Consulta paralela a tablas reales de Supabase
      const [hangarRes, patentsRes] = await Promise.all([
        supabase
          .from('user_unit_hangar')
          .select('*')
          .eq('user_id', activeUserId)
          .order('tier', { ascending: false }),
        supabase
          .from('user_patents')
          .select('*')
          .eq('user_id', activeUserId)
          .order('tier', { ascending: false }),
      ]);

      if (hangarRes.error) {
        throw hangarRes.error;
      }
      if (patentsRes.error) {
        throw patentsRes.error;
      }

      if (isMountedRef.current) {
        const loadedHangar: UnitHangarEntry[] = (hangarRes.data || []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          clanId: row.clan_id,
          unitCode: row.unit_code,
          tier: row.tier,
          level: row.level,
          hp: row.hp,
          quantity: row.quantity,
          locationProvinceId: row.location_province_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        const loadedPatents: PatentRegistryEntry[] = (patentsRes.data || []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          patentCode: row.patent_code,
          tier: row.tier,
          unlockedAt: row.unlocked_at,
        }));

        setHangarUnits(loadedHangar);
        setUnlockedPatents(loadedPatents);

        // Auto-seleccionar primer elemento en battlegroup si está vacío
        setBattlegroup((prev) => {
          if (prev.length > 0) return prev;
          return loadedHangar.slice(0, 2);
        });

        setIsLoading(false);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Error cargando datos del hangar');
        setIsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    isMountedRef.current = true;
    loadHangarData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadHangarData]);

  /**
   * Forja de nueva unidad T1-T5 y persistencia atómica en base de datos.
   */
  const craftUnit = useCallback(
    async (params: {
      unitCode: string;
      tier: number;
      level: number;
      quantity: number;
      costs: { ec: number; steel: number; rareEarth?: number; composites?: number };
    }) => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const activeUserId = authData?.user?.id ?? userId;

        if (!activeUserId) {
          return { success: false, message: 'Autenticación requerida para ensamblar unidades en el Hangar.' };
        }

        // Inserción real en Supabase
        const { data, error: insertError } = await supabase
          .from('user_unit_hangar')
          .insert({
            user_id: activeUserId,
            unit_code: params.unitCode,
            tier: params.tier,
            level: params.level,
            hp: 100,
            quantity: params.quantity,
            location_province_id: 'ES_MADRID',
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        if (data) {
          const newUnit: UnitHangarEntry = {
            id: data.id,
            userId: data.user_id,
            clanId: data.clan_id,
            unitCode: data.unit_code,
            tier: data.tier,
            level: data.level,
            hp: data.hp,
            quantity: data.quantity,
            locationProvinceId: data.location_province_id,
          };
          setHangarUnits((prev) => [newUnit, ...prev]);
        }

        audioManager.playSFX('co_power');
        return { success: true, message: `Unidad ${params.unitCode} T${params.tier} forjada con éxito.` };
      } catch (err: any) {
        console.error('[useUserHangar] Fallo en forja:', err);
        return { success: false, message: err.message || 'Error de base de datos durante la forja.' };
      }
    },
    [userId]
  );

  /**
   * Desbloqueo permanente de patente tecnológica.
   */
  const unlockPatent = useCallback(
    async (params: {
      patentCode: string;
      tier: number;
      costEc: number;
      costSteel: number;
    }) => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const activeUserId = authData?.user?.id ?? userId;

        if (!activeUserId) {
          return { success: false, message: 'Autenticación requerida para registrar patentes militares.' };
        }

        const { data, error: insertError } = await supabase
          .from('user_patents')
          .insert({
            user_id: activeUserId,
            patent_code: params.patentCode,
            tier: params.tier,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        if (data) {
          const newPatent: PatentRegistryEntry = {
            id: data.id,
            userId: data.user_id,
            patentCode: data.patent_code,
            tier: data.tier,
            unlockedAt: data.unlocked_at,
          };
          setUnlockedPatents((prev) => [...prev, newPatent]);
        }

        audioManager.playSFX('co_power');
        return { success: true, message: `Patente ${params.patentCode} T${params.tier} registrada.` };
      } catch (err: any) {
        console.error('[useUserHangar] Fallo en patente:', err);
        return { success: false, message: err.message || 'Error registrando patente en Supabase.' };
      }
    },
    [userId]
  );

  /**
   * Desguace de unidades: Regla Canónica SSOT del 35% de retorno.
   */
  const scrapUnit = useCallback(
    async (hangarUnitId: string) => {
      const unit = hangarUnits.find((u) => u.id === hangarUnitId);
      if (!unit) {
        return { success: false, recoveredSteel: 0, recoveredEc: 0, message: 'Unidad no encontrada en el arsenal.' };
      }

      const baseValSteel = 50 * unit.tier;
      const baseValEc = 100 * unit.tier;
      const salvageRate = MASTER_METAGAME_CONSTANTS.BASE_SALVAGE_RATE ?? 0.35;
      const recoveredSteel = Math.floor(baseValSteel * salvageRate);
      const recoveredEc = Math.floor(baseValEc * salvageRate);

      try {
        const { error: deleteError } = await supabase
          .from('user_unit_hangar')
          .delete()
          .eq('id', hangarUnitId);

        if (deleteError) {
          throw deleteError;
        }

        setHangarUnits((prev) => prev.filter((u) => u.id !== hangarUnitId));
        setBattlegroup((prev) => prev.filter((u) => u.id !== hangarUnitId));
        audioManager.playSFX('combat_hit');

        return {
          success: true,
          recoveredSteel,
          recoveredEc,
          message: `Desguazado: +${recoveredSteel} Acero, +${recoveredEc} EC recuperados.`,
        };
      } catch (err: any) {
        console.error('[useUserHangar] Fallo en desguace:', err);
        return {
          success: false,
          recoveredSteel: 0,
          recoveredEc: 0,
          message: err.message || 'Fallo de persistencia al desguazar.',
        };
      }
    },
    [hangarUnits]
  );

  const toggleBattlegroupUnit = useCallback((unit: UnitHangarEntry) => {
    audioManager.playHoverTick();
    setBattlegroup((prev) => {
      const exists = prev.some((u) => u.id === unit.id);
      if (exists) {
        return prev.filter((u) => u.id !== unit.id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, unit];
    });
  }, []);

  const setBattlegroupLoadout = useCallback((units: UnitHangarEntry[]) => {
    setBattlegroup(units.slice(0, 3));
  }, []);

  return {
    hangarUnits,
    unlockedPatents,
    battlegroup,
    isLoading,
    error,
    refreshHangar: loadHangarData,
    craftUnit,
    unlockPatent,
    scrapUnit,
    toggleBattlegroupUnit,
    setBattlegroupLoadout,
  };
}
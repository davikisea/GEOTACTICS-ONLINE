import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@shared';
import { Database } from '@shared';
import {
  IndustrialInventory,
  IndustrialPlot,
  CorporateSpecialization,
  PlotEnterpriseType,
  PlotStatus,
} from '@domains/economy';

type InventoryUpdate = Database['public']['Tables']['user_industrial_inventory']['Update'];

export function useUserIndustry(userId?: string) {
  const [inventory, setInventory] = useState<IndustrialInventory | null>(null);
  const [plots, setPlots] = useState<IndustrialPlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIndustryData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch Inventory
      const { data: invData, error: invError } = await supabase
        .from('user_industrial_inventory')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (invError) throw invError;

      if (invData) {
        setInventory({
          userId: invData.user_id,
          rawIron: invData.raw_iron,
          rawStone: invData.raw_stone,
          rawRareEarth: invData.raw_rare_earth,
          refinedSteel: invData.refined_steel,
          refinedConcrete: invData.refined_concrete,
          refinedMicrochip: invData.refined_microchip,
          campaignFuel: invData.campaign_fuel,
          specialization: (invData.corporate_specialization as CorporateSpecialization) || 'vulcan',
          lastHarvestAt: invData.last_harvest_at
            ? new Date(invData.last_harvest_at).getTime()
            : Date.now() - 4 * 3600 * 1000,
        });
      }

      // 2. Fetch Plots
      const { data: plotsData, error: plotsError } = await supabase
        .from('user_industrial_plots')
        .select('*')
        .eq('user_id', userId)
        .order('plot_index', { ascending: true });

      if (plotsError) throw plotsError;

      if (plotsData && plotsData.length > 0) {
        setPlots(
          plotsData.map((p) => ({
            id: p.id,
            userId: p.user_id,
            plotIndex: p.plot_index,
            enterpriseType: p.enterprise_type as PlotEnterpriseType,
            tier: p.tier,
            status: p.status as PlotStatus,
            reconfigurationTarget: p.reconfiguration_target as PlotEnterpriseType | undefined,
            workStartedAt: p.work_started_at ? new Date(p.work_started_at).getTime() : undefined,
            workCompletesAt: p.work_completes_at
              ? new Date(p.work_completes_at).getTime()
              : undefined,
          }))
        );
      }
    } catch (err: any) {
      console.error('[useUserIndustry] Error fetching industry data:', err);
      setError(err?.message || 'Error al conectar con la intendencia industrial');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchIndustryData();

    if (!userId) return;

    // Realtime subscriptions
    const channel = supabase
      .channel(`industry_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_industrial_inventory',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchIndustryData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_industrial_plots',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchIndustryData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchIndustryData]);

  const updateInventoryInDb = async (updated: Partial<IndustrialInventory>) => {
    if (!userId) return;
    try {
      const dbPayload: InventoryUpdate = {};
      if (updated.rawIron !== undefined) dbPayload.raw_iron = updated.rawIron;
      if (updated.rawStone !== undefined) dbPayload.raw_stone = updated.rawStone;
      if (updated.rawRareEarth !== undefined) dbPayload.raw_rare_earth = updated.rawRareEarth;
      if (updated.refinedSteel !== undefined) dbPayload.refined_steel = updated.refinedSteel;
      if (updated.refinedConcrete !== undefined) dbPayload.refined_concrete = updated.refinedConcrete;
      if (updated.refinedMicrochip !== undefined) dbPayload.refined_microchip = updated.refinedMicrochip;
      if (updated.campaignFuel !== undefined) dbPayload.campaign_fuel = updated.campaignFuel;
      if (updated.lastHarvestAt !== undefined) {
        dbPayload.last_harvest_at = new Date(updated.lastHarvestAt).toISOString();
      }

      const { error: updErr } = await supabase
        .from('user_industrial_inventory')
        .update(dbPayload)
        .eq('user_id', userId);

      if (updErr) {
        console.error('[useUserIndustry] Error updating inventory:', updErr);
      } else {
        setInventory((prev) => (prev ? { ...prev, ...updated } : null));
      }
    } catch (err) {
      console.error('[useUserIndustry] Unexpected update error:', err);
    }
  };

  return {
    inventory,
    plots,
    isLoading,
    error,
    refresh: fetchIndustryData,
    updateInventory: updateInventoryInDb,
    setInventory,
    setPlots,
  };
}
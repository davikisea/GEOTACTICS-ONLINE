import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Shield,
  Zap,
  Award,
  Clock,
  AlertTriangle,
  UserCheck,
  Cpu,
  ChevronRight,
  Sparkles,
  Users,
  Flame,
} from 'lucide-react';
import { audioManager } from '../../engine/audioManager';
import {
  GarrisonAIEngineTier,
} from '../../types/metagame';
import { supabase } from '../../lib/supabase/client';

export interface GarrisonManagementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userEc: number;
  clanTag?: string;
  controlledProvinces: Array<{ id: string; name: string }>;
  onSpendEc?: (amount: number) => void;
}

interface HiredCommander {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  level: 1 | 2 | 3 | 4 | 5;
  aiEngineTier: GarrisonAIEngineTier;
  assignedProvinceId: string | null;
  hourlyUpkeepEc: number;
  isLegendary: boolean;
  daysRemaining: number;
  perks: string[];
}

const RARITY_COLORS = {
  common: { border: 'border-zinc-500', text: 'text-zinc-400', badge: 'bg-zinc-800 text-zinc-300' },
  uncommon: { border: 'border-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-950 text-emerald-300' },
  rare: { border: 'border-sky-500', text: 'text-sky-400', badge: 'bg-sky-950 text-sky-300' },
  epic: { border: 'border-purple-500', text: 'text-purple-400', badge: 'bg-purple-950 text-purple-300' },
  legendary: { border: 'border-amber-400', text: 'text-amber-300', badge: 'bg-amber-950 text-amber-300 border border-amber-400 animate-pulse' },
};

const UPKEEP_BY_LEVEL = {
  1: 50,
  2: 95,
  3: 160,
  4: 260,
  5: 420,
};

export const GarrisonManagementDrawer: React.FC<GarrisonManagementDrawerProps> = ({
  isOpen,
  onClose,
  userEc,
  clanTag = '[TACTICAL]',
  controlledProvinces,
  onSpendEc,
}) => {
  const [commanders, setCommanders] = useState<HiredCommander[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRecruiting, setIsRecruiting] = useState<boolean>(false);
  const [recruitResult, setRecruitResult] = useState<HiredCommander | null>(null);

  const loadDeployments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('garrison_deployments')
        .select('*');

      if (error) {
        throw error;
      }

      if (data) {
        const loaded: HiredCommander[] = data.map((row) => {
          let rarity: HiredCommander['rarity'] = 'common';
          if (row.is_legendary || row.garrison_level === 5) rarity = 'legendary';
          else if (row.garrison_level === 4) rarity = 'epic';
          else if (row.garrison_level === 3) rarity = 'rare';
          else if (row.garrison_level === 2) rarity = 'uncommon';

          const daysRemaining = row.retirement_due_at
            ? Math.max(0, Math.ceil((new Date(row.retirement_due_at).getTime() - Date.now()) / (1000 * 3600 * 24)))
            : 0;

          return {
            id: row.id,
            name: row.commander_name,
            rarity,
            level: row.garrison_level as 1 | 2 | 3 | 4 | 5,
            aiEngineTier: row.ai_engine_tier as GarrisonAIEngineTier,
            assignedProvinceId: row.province_id,
            hourlyUpkeepEc: row.hourly_upkeep_ec,
            isLegendary: row.is_legendary,
            daysRemaining,
            perks: row.is_legendary
              ? ['+25% Contraataque Automático', 'Alerta Drop-In 60s', 'Frenado de Asedio -30% TCP']
              : ['Defensa Perimetral de Guarnición'],
          };
        });
        setCommanders(loaded);
      }
    } catch (err: any) {
      console.error('[GarrisonManagementDrawer] Error loading deployments:', err);
      setErrorMessage(err.message || 'Error al conectar con la base de datos de guarniciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDeployments();
    }
  }, [isOpen, loadDeployments]);

  if (!isOpen) return null;

  const totalHourlyUpkeep = commanders.reduce((sum, c) => sum + c.hourlyUpkeepEc, 0);

  const handleRollRecruit = async () => {
    const recruitCost = 500;
    if (userEc < recruitCost) {
      audioManager.playCancelRollback();
      setErrorMessage('Créditos Energéticos insuficientes para reclutar oficial (Se requieren 500 EC)');
      return;
    }

    if (controlledProvinces.length === 0) {
      setErrorMessage('Se requiere al menos una provincia bajo control para asignar guarnición');
      return;
    }

    setIsRecruiting(true);
    setRecruitResult(null);
    setErrorMessage(null);
    audioManager.playTrapAlert();

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        throw new Error('Debe iniciar sesión para reclutar oficiales de guarnición.');
      }

      // Obtener el clan del usuario
      const { data: memberData } = await supabase
        .from('clan_members')
        .select('clan_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const userClanId = memberData?.clan_id ?? 'c0000000-0000-0000-0000-000000000001';
      const targetProvince = controlledProvinces[0]?.id ?? 'ES_MADRID';

      // Insertar nueva guarnición en base de datos
      const { data: newRow, error: insertError } = await supabase
        .from('garrison_deployments')
        .insert({
          province_id: targetProvince,
          owning_clan_id: userClanId,
          commander_name: 'Comandante Táctico Operativo',
          garrison_level: 2,
          ai_engine_tier: 'normal',
          hourly_upkeep_ec: UPKEEP_BY_LEVEL[2],
          is_legendary: false,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      onSpendEc?.(recruitCost);

      const createdCmd: HiredCommander = {
        id: newRow.id,
        name: newRow.commander_name,
        rarity: 'uncommon',
        level: 2,
        aiEngineTier: 'normal',
        assignedProvinceId: newRow.province_id,
        hourlyUpkeepEc: newRow.hourly_upkeep_ec,
        isLegendary: false,
        daysRemaining: 0,
        perks: ['Defensa Perimetral de Guarnición'],
      };

      setCommanders((prev) => [createdCmd, ...prev]);
      setRecruitResult(createdCmd);
      audioManager.playCOPower();
    } catch (err: any) {
      console.error('[GarrisonManagementDrawer] Fallo en reclutamiento:', err);
      setErrorMessage(err.message || 'Error en la orden de reclutamiento');
    } finally {
      setIsRecruiting(false);
    }
  };

  const handleAssignProvince = async (commanderId: string, provinceId: string | null) => {
    audioManager.playCursorMove();
    if (!provinceId) return;

    try {
      const { error } = await supabase
        .from('garrison_deployments')
        .update({ province_id: provinceId })
        .eq('id', commanderId);

      if (error) throw error;

      setCommanders((prev) =>
        prev.map((c) => (c.id === commanderId ? { ...c, assignedProvinceId: provinceId } : c))
      );
    } catch (err: any) {
      console.error('[GarrisonManagementDrawer] Error actualizando asignación:', err);
      setErrorMessage(err.message || 'Error al reasignar provincia');
    }
  };

  const handleDismiss = async (commanderId: string) => {
    audioManager.playCancelRollback();
    try {
      const { error } = await supabase
        .from('garrison_deployments')
        .delete()
        .eq('id', commanderId);

      if (error) throw error;

      setCommanders((prev) => prev.filter((c) => c.id !== commanderId));
    } catch (err: any) {
      console.error('[GarrisonManagementDrawer] Error en baja de guarnición:', err);
      setErrorMessage(err.message || 'Error al dar de baja oficial');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-xl h-full bg-[#161712] border-l-2 border-[#2B2C24] text-[#F2E8D5] flex flex-col justify-between"
      >
        {/* HEADER */}
        <div className="p-4 bg-[#2B2C24] border-b-2 border-black flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#161712] border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500 text-black font-bold text-[10px] uppercase">
                  GUARNICIÓN IA AUTÓNOMA
                </span>
                <span className="text-xs text-amber-300 font-bold">{clanTag}</span>
              </div>
              <h2 className="text-base font-bold uppercase text-[#F2E8D5]">
                Centro de Mando de Guarniciones
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded bg-[#161712] border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="m-4 p-3 bg-rose-950/70 border border-rose-500 text-rose-300 text-xs flex items-center gap-2 rounded">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* METRICS BAR */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-[#1C1D17] border-b border-zinc-800 shrink-0">
          <div className="p-2.5 bg-black/40 border border-zinc-800 rounded">
            <span className="text-[10px] text-zinc-400 block uppercase">Comandantes</span>
            <span className="text-base font-bold text-white">{commanders.length}</span>
          </div>
          <div className="p-2.5 bg-black/40 border border-zinc-800 rounded">
            <span className="text-[10px] text-zinc-400 block uppercase">Mantenimiento</span>
            <span className="text-base font-bold text-amber-400">{totalHourlyUpkeep} EC/h</span>
          </div>
          <div className="p-2.5 bg-black/40 border border-zinc-800 rounded">
            <span className="text-[10px] text-zinc-400 block uppercase">Fondos EC</span>
            <span className="text-base font-bold text-emerald-400">{userEc.toLocaleString()} EC</span>
          </div>
        </div>

        {/* LIST / EMPTY STATE */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-zinc-400 text-xs animate-pulse">
              SINCRONIZANDO GUARNICIONES DESPLEGADAS CON POSTGRES...
            </div>
          ) : commanders.length === 0 ? (
            <div className="p-8 text-center bg-black/30 border border-dashed border-zinc-700 rounded space-y-2">
              <Users className="w-8 h-8 mx-auto text-zinc-500" />
              <p className="text-xs text-zinc-400 uppercase font-bold">
                Sin guarniciones registradas en el sector
              </p>
              <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                Reclute un comandante táctico para automatizar la defensa de sus provincias controladas.
              </p>
            </div>
          ) : (
            commanders.map((cmd) => (
              <div
                key={cmd.id}
                className={`p-3 bg-black/50 border rounded space-y-2 transition-all ${
                  RARITY_COLORS[cmd.rarity].border
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        RARITY_COLORS[cmd.rarity].badge
                      }`}
                    >
                      Nv. {cmd.level} {cmd.rarity}
                    </span>
                    <span className="text-sm font-bold text-white">{cmd.name}</span>
                  </div>
                  <span className="text-xs text-amber-400 font-bold">
                    {cmd.hourlyUpkeepEc} EC/h
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800">
                  <div className="flex items-center gap-1">
                    <span>Motor IA:</span>
                    <span className="text-emerald-400 uppercase font-bold">{cmd.aiEngineTier}</span>
                  </div>
                  {cmd.isLegendary && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{cmd.daysRemaining}d restantes</span>
                    </div>
                  )}
                </div>

                {/* Assignment & Dismiss Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-zinc-400">
                    Sector: <span className="text-white font-bold">{cmd.assignedProvinceId || 'Sin asignar'}</span>
                  </span>
                  <button
                    onClick={() => handleDismiss(cmd.id)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                  >
                    Dar de baja
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER ACTION */}
        <div className="p-4 bg-[#1C1D17] border-t border-zinc-800 shrink-0">
          <button
            onClick={handleRollRecruit}
            disabled={isRecruiting || userEc < 500}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold uppercase text-xs rounded tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isRecruiting ? (
              <span>RECLUTANDO OFICIAL EN SERVIDOR...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Reclutar Comandante de Guarnición (500 EC)</span>
              </>
            )}
          </button>
        </div>
      </motion.aside>
    </div>
  );
};

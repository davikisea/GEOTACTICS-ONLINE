import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Shield,
  Zap,
  Hammer,
  Layers,
  Award,
  ChevronRight,
  Flame,
  Cpu,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { audioManager } from '@domains/game-feel';
import { UnitHangarEntry, PatentRegistryEntry, MASTER_METAGAME_CONSTANTS } from '@shared';
import { useUserHangar } from '../hooks/useUserHangar';

export interface UnitHangarModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEc: number;
  userSteel: number;
  userRareEarth?: number;
  userComposites?: number;
  onUpdateResources?: (delta: { ec?: number; steel?: number; rareEarth?: number; composites?: number }) => void;
  onDeployToReinforcements?: (units: UnitHangarEntry[]) => void;
}

interface UnitBlueprint {
  code: string;
  name: string;
  category: 'infantry' | 'armor' | 'artillery' | 'aviation';
  baseSteelCost: number;
  baseRareEarthCost: number;
  baseCompositesCost: number;
  baseEcCost: number;
  baseAtk: number;
  baseDef: number;
  rangeMin: number;
  rangeMax: number;
  description: string;
}

const UNIT_CATALOG: UnitBlueprint[] = [
  {
    code: 'INF_MECH',
    name: 'Infantería Mecanizada',
    category: 'infantry',
    baseSteelCost: 20,
    baseRareEarthCost: 5,
    baseCompositesCost: 10,
    baseEcCost: 50,
    baseAtk: 65,
    baseDef: 50,
    rangeMin: 1,
    rangeMax: 1,
    description: 'Fuerzas de despliegue rápido con lanzacohetes portátiles. Eficaces en captura de nodos.',
  },
  {
    code: 'TANK_T80',
    name: 'Blindado Medio Vanguard',
    category: 'armor',
    baseSteelCost: 80,
    baseRareEarthCost: 25,
    baseCompositesCost: 40,
    baseEcCost: 180,
    baseAtk: 85,
    baseDef: 75,
    rangeMin: 1,
    rangeMax: 1,
    description: 'Columna vertebral acorazada. Balística de alto calibre con blindaje compuesto reactivo.',
  },
  {
    code: 'ARTY_M109',
    name: 'Artillería Autopropulsada',
    category: 'artillery',
    baseSteelCost: 65,
    baseRareEarthCost: 35,
    baseCompositesCost: 30,
    baseEcCost: 160,
    baseAtk: 95,
    baseDef: 40,
    rangeMin: 2,
    rangeMax: 4,
    description: 'Soporte de fuego indirecto a larga distancia. Devastador contra concentraciones acorazadas.',
  },
  {
    code: 'MLRS_M270',
    name: 'Lanzacohetes Múltiple MLRS',
    category: 'artillery',
    baseSteelCost: 95,
    baseRareEarthCost: 50,
    baseCompositesCost: 60,
    baseEcCost: 260,
    baseAtk: 110,
    baseDef: 30,
    rangeMin: 3,
    rangeMax: 5,
    description: 'Bombardeo de saturación en racimo. Implacable contra guarniciones y fortines.',
  },
  {
    code: 'HELI_APACHE',
    name: 'Helicóptero de Ataque Cóndor',
    category: 'aviation',
    baseSteelCost: 75,
    baseRareEarthCost: 60,
    baseCompositesCost: 80,
    baseEcCost: 280,
    baseAtk: 100,
    baseDef: 45,
    rangeMin: 1,
    rangeMax: 1,
    description: 'Aeronave de ala rotatoria antitanque. Ignora restricciones de terreno terrestre.',
  },
];

export const UnitHangarModal: React.FC<UnitHangarModalProps> = ({
  isOpen,
  onClose,
  userEc,
  userSteel,
  userRareEarth = 120,
  userComposites = 90,
  onUpdateResources,
  onDeployToReinforcements,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'forge' | 'patents' | 'battlegroup'>('inventory');

  // Hangar y Patentes conectadas al 100% con Supabase (useUserHangar)
  const {
    hangarUnits,
    unlockedPatents,
    battlegroup,
    isLoading: isHangarLoading,
    craftUnit,
    unlockPatent,
    scrapUnit,
    toggleBattlegroupUnit,
  } = useUserHangar();

  // Crafting state
  const [selectedBlueprintCode, setSelectedBlueprintCode] = useState<string>('TANK_T80');
  const [selectedCraftTier, setSelectedCraftTier] = useState<number>(2);
  const [selectedCraftLevel, setSelectedCraftLevel] = useState<number>(1);
  const [craftQuantity, setCraftQuantity] = useState<number>(1);
  const [craftSuccessMessage, setCraftSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedBp = UNIT_CATALOG.find((b) => b.code === selectedBlueprintCode) ?? UNIT_CATALOG[0];

  // Cost calculations with level scaling
  const tierCostMultiplier = 1 + (selectedCraftTier - 1) * 0.45;
  const levelCostMultiplier = 1 + (selectedCraftLevel - 1) * 0.25;
  const totalSteelCost = Math.round(selectedBp.baseSteelCost * tierCostMultiplier * levelCostMultiplier * craftQuantity);
  const totalRareEarthCost = Math.round(selectedBp.baseRareEarthCost * tierCostMultiplier * levelCostMultiplier * craftQuantity);
  const totalCompositesCost = Math.round(selectedBp.baseCompositesCost * tierCostMultiplier * levelCostMultiplier * craftQuantity);
  const totalEcCost = Math.round(selectedBp.baseEcCost * tierCostMultiplier * levelCostMultiplier * craftQuantity);

  const canAfford =
    userSteel >= totalSteelCost &&
    userRareEarth >= totalRareEarthCost &&
    userComposites >= totalCompositesCost &&
    userEc >= totalEcCost;

  const currentMaxPatentTier =
    unlockedPatents.find((p) => p.patentCode === selectedBlueprintCode)?.tier ?? 0;

  const isPatentUnlocked = currentMaxPatentTier >= selectedCraftTier;

  const handleCraft = async () => {
    if (!canAfford || !isPatentUnlocked) {
      audioManager.playCancelRollback();
      return;
    }

    onUpdateResources?.({
      steel: -totalSteelCost,
      rareEarth: -totalRareEarthCost,
      composites: -totalCompositesCost,
      ec: -totalEcCost,
    });

    audioManager.playAirdropImpact();

    const res = await craftUnit({
      unitCode: selectedBlueprintCode,
      tier: selectedCraftTier,
      level: selectedCraftLevel,
      quantity: craftQuantity,
      costs: {
        ec: totalEcCost,
        steel: totalSteelCost,
        rareEarth: totalRareEarthCost,
        composites: totalCompositesCost,
      },
    });

    if (res.success) {
      setCraftSuccessMessage(res.message);
      setTimeout(() => setCraftSuccessMessage(null), 3500);
    }
  };

  const handleSalvageScrap = async (unitId: string) => {
    const res = await scrapUnit(unitId);
    if (res.success) {
      onUpdateResources?.({
        steel: res.recoveredSteel,
        ec: res.recoveredEc,
      });
      audioManager.playComboAction(3);
    }
  };

  const handleAddToBattlegroup = (unit: UnitHangarEntry) => {
    toggleBattlegroupUnit(unit);
    onDeployToReinforcements?.([...battlegroup, unit]);
  };

  const handleRemoveFromBattlegroup = (id: string) => {
    const unit = battlegroup.find((u) => u.id === id);
    if (unit) {
      toggleBattlegroupUnit(unit);
    }
  };

  const handleUnlockPatent = async (blueprintCode: string, nextTier: number, ecCost: number) => {
    if (userEc < ecCost) {
      audioManager.playCancelRollback();
      return;
    }
    onUpdateResources?.({ ec: -ecCost });
    await unlockPatent({
      patentCode: blueprintCode,
      tier: nextTier,
      costEc: ecCost,
      costSteel: 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-fade-in">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-[12px_2px_12px_2px] bg-[#161712] border-3 border-[#0A0B08] shadow-[10px_10px_0px_#0A0B08] text-[#F2E8D5] overflow-hidden"
      >
        {/* ENCABEZADO C4ISR */}
        <header className="px-5 py-3.5 bg-[#2B2C24] border-b-2 border-[#0A0B08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px_2px_8px_2px] bg-[#161712] border-2 border-[#E65100] flex items-center justify-center text-[#E65100]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-[#E65100] text-black font-mono font-black text-[10px] uppercase">
                  C4ISR // HANGAR V2.0
                </span>
                <span className="text-xs font-mono text-amber-300 font-bold">
                  SISTEMA DE TROPAS FÍSICAS Y DESCARTABLES
                </span>
              </div>
              <h2 className="text-lg font-display font-black uppercase text-[#F2E8D5] tracking-wide">
                Hangar de Producción Militar & Grupo de Tareas
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* TICKER DE RECURSOS */}
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-[6px_2px_6px_2px] bg-[#161712] border border-[#7B8A4A]/50 font-mono text-xs">
              <span className="text-amber-400 font-extrabold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                {userEc.toLocaleString()} EC
              </span>
              <span className="text-sky-300 font-extrabold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                {userSteel}t Acero
              </span>
              <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                {userRareEarth}t Tierras Raras
              </span>
            </div>

            <button
              onClick={() => {
                audioManager.playSFX('button_click');
                onClose();
              }}
              className="p-1.5 rounded-[6px_2px_6px_2px] bg-[#161712] hover:bg-[#E65100] border-2 border-[#0A0B08] text-[#F2E8D5] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* NAVEGACIÓN DE PESTAÑAS */}
        <nav className="px-5 py-2 bg-[#1C1D17] border-b-2 border-[#0A0B08] flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              audioManager.playCursorMove();
              setActiveTab('inventory');
            }}
            className={`px-4 py-2 rounded-[6px_2px_6px_2px] text-xs font-display font-extrabold uppercase tracking-wider transition-all border-2 ${
              activeTab === 'inventory'
                ? 'bg-[#E65100] text-black border-[#0A0B08]'
                : 'bg-[#2B2C24] text-[#F2E8D5]/80 border-[#0A0B08] hover:text-[#F2E8D5]'
            }`}
          >
            📦 Inventario de Tropas ({hangarUnits.length})
          </button>
          <button
            onClick={() => {
              audioManager.playCursorMove();
              setActiveTab('forge');
            }}
            className={`px-4 py-2 rounded-[6px_2px_6px_2px] text-xs font-display font-extrabold uppercase tracking-wider transition-all border-2 ${
              activeTab === 'forge'
                ? 'bg-[#E65100] text-black border-[#0A0B08]'
                : 'bg-[#2B2C24] text-[#F2E8D5]/80 border-[#0A0B08] hover:text-[#F2E8D5]'
            }`}
          >
            ⚒️ Fundición & Ensamblaje
          </button>
          <button
            onClick={() => {
              audioManager.playCursorMove();
              setActiveTab('battlegroup');
            }}
            className={`px-4 py-2 rounded-[6px_2px_6px_2px] text-xs font-display font-extrabold uppercase tracking-wider transition-all border-2 ${
              activeTab === 'battlegroup'
                ? 'bg-[#E65100] text-black border-[#0A0B08]'
                : 'bg-[#2B2C24] text-[#F2E8D5]/80 border-[#0A0B08] hover:text-[#F2E8D5]'
            }`}
          >
            🎖️ Grupo de Combate ({battlegroup.length}/6)
          </button>
          <button
            onClick={() => {
              audioManager.playCursorMove();
              setActiveTab('patents');
            }}
            className={`px-4 py-2 rounded-[6px_2px_6px_2px] text-xs font-display font-extrabold uppercase tracking-wider transition-all border-2 ${
              activeTab === 'patents'
                ? 'bg-[#E65100] text-black border-[#0A0B08]'
                : 'bg-[#2B2C24] text-[#F2E8D5]/80 border-[#0A0B08] hover:text-[#F2E8D5]'
            }`}
          >
            📜 Bóveda de Patentes
          </button>
        </nav>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {craftSuccessMessage && (
            <div className="p-3 bg-emerald-950/80 border-2 border-emerald-500 rounded text-emerald-200 text-xs font-mono font-bold flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {craftSuccessMessage}
            </div>
          )}

          {/* TAB 1: INVENTARIO DE TROPAS EN HANGAR */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#F2E8D5]/80 font-mono">
                  Unidades físicas actualmente almacenadas en el complejo. Al destruirse en combate, se consumen
                  permanentemente conforme a la economía 100% impulsada por jugadores.
                </p>
                <span className="text-[11px] font-mono text-amber-400">
                  Desguace recupera el 35% del valor base en chatarra.
                </span>
              </div>

              {hangarUnits.length === 0 ? (
                <div className="p-8 text-center bg-[#2B2C24] border-2 border-[#0A0B08] rounded">
                  <p className="text-sm font-mono text-[#F2E8D5]/60 uppercase">
                    Hangar vacío. Ensambla nuevas unidades en la pestaña "Fundición".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {hangarUnits.map((unit) => {
                    const bp = UNIT_CATALOG.find((b) => b.code === unit.unitCode) ?? UNIT_CATALOG[0];
                    const effBonus = (unit.level - 1) * 2; // +2% per level

                    return (
                      <div
                        key={unit.id}
                        className="p-3.5 bg-[#2B2C24] border-2 border-[#0A0B08] rounded-[8px_2px_8px_2px] flex flex-col justify-between gap-3 shadow-[4px_4px_0px_#0A0B08]"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded bg-[#161712] text-amber-400 font-mono font-black text-[10px] border border-[#0A0B08]">
                              NIVEL {unit.level} • TIER {unit.tier}
                            </span>
                            <span className="text-xs font-mono font-extrabold text-[#00FF66]">
                              +{effBonus}% EFICIENCIA
                            </span>
                          </div>
                          <h3 className="text-base font-display font-black uppercase text-[#F2E8D5] mt-1">
                            {bp.name}
                          </h3>
                          <p className="text-[11px] text-[#F2E8D5]/70 line-clamp-2 mt-0.5">
                            {bp.description}
                          </p>

                          <div className="grid grid-cols-3 gap-2 mt-3 p-2 bg-[#161712] rounded font-mono text-[11px]">
                            <div>
                              <span className="text-[#F2E8D5]/60 block text-[9px]">INTEGRIDAD</span>
                              <span className="font-extrabold text-amber-300">
                                {unit.hp} / {MASTER_METAGAME_CONSTANTS.CANONICAL_MAX_HP} HP
                              </span>
                            </div>
                            <div>
                              <span className="text-[#F2E8D5]/60 block text-[9px]">CANTIDAD</span>
                              <span className="font-extrabold text-sky-400">{unit.quantity}x</span>
                            </div>
                            <div>
                              <span className="text-[#F2E8D5]/60 block text-[9px]">RANGO</span>
                              <span className="font-extrabold text-emerald-400">
                                {bp.rangeMin}-{bp.rangeMax}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-[#161712]">
                          <button
                            onClick={() => handleAddToBattlegroup(unit)}
                            className="flex-1 py-1.5 px-2 bg-[#46521F] hover:bg-[#586827] text-[#F2E8D5] text-[10px] font-display font-extrabold uppercase rounded border border-[#0A0B08] flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Al Frente
                          </button>
                          <button
                            onClick={() => handleSalvageScrap(unit.id)}
                            className="py-1.5 px-2 bg-[#161712] hover:bg-rose-950 text-rose-400 hover:text-rose-200 text-[10px] font-mono font-bold rounded border border-[#0A0B08] flex items-center gap-1"
                            title="Desguazar por chatarra (+35% recursos)"
                          >
                            <Trash2 className="w-3 h-3" />
                            Desguazar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FUNDICIÓN & ENSAMBLAJE DE NUEVAS UNIDADES */}
          {activeTab === 'forge' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Selector de Planos de Chasis */}
              <div className="lg:col-span-5 space-y-2">
                <h4 className="text-xs font-mono font-extrabold text-amber-400 uppercase tracking-widest">
                  SELECCIONA TIPO DE CHASIS MILITAR
                </h4>
                <div className="space-y-2">
                  {UNIT_CATALOG.map((bp) => {
                    const isSelected = bp.code === selectedBlueprintCode;
                    const patentTier = unlockedPatents.find((p) => p.patentCode === bp.code)?.tier ?? 0;

                    return (
                      <button
                        key={bp.code}
                        onClick={() => {
                          audioManager.playCursorMove();
                          setSelectedBlueprintCode(bp.code);
                        }}
                        className={`w-full text-left p-3 rounded-[6px_2px_6px_2px] border-2 transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#46521F] border-[#E65100] shadow-[3px_3px_0px_#0A0B08]'
                            : 'bg-[#2B2C24] border-[#0A0B08] hover:border-[#7B8A4A]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display font-extrabold text-sm text-[#F2E8D5] uppercase">
                              {bp.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161712] text-amber-300">
                              PATENTE TIER {patentTier}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-[#F2E8D5]/70 mt-0.5">
                            ATK: {bp.baseAtk} • DEF: {bp.baseDef} • RANGO: {bp.rangeMin}-{bp.rangeMax}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-amber-300 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parámetros de Fabricación y Costes */}
              <div className="lg:col-span-7 bg-[#2B2C24] border-2 border-[#0A0B08] p-4 rounded-[8px_2px_8px_2px] flex flex-col justify-between gap-4">
                <div className="space-y-4">
                  <div className="border-b border-[#161712] pb-3">
                    <span className="text-[10px] font-mono uppercase text-amber-400">CONFIGURACIÓN DE LÍNEA</span>
                    <h3 className="text-xl font-display font-black text-[#F2E8D5] uppercase">{selectedBp.name}</h3>
                    <p className="text-xs text-[#F2E8D5]/80 mt-1">{selectedBp.description}</p>
                  </div>

                  {/* Selector de Nivel de Tropa (1 a 5) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span>NIVEL DE CALIBRACIÓN BALÍSTICA (1 - 5)</span>
                      <span className="text-[#00FF66] font-bold">
                        +{((selectedCraftLevel - 1) * 2)}% EFICIENCIA DE COMBATE
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => {
                            audioManager.playCursorMove();
                            setSelectedCraftLevel(lvl);
                          }}
                          className={`py-2 rounded font-display font-black text-xs border-2 uppercase ${
                            selectedCraftLevel === lvl
                              ? 'bg-[#E65100] text-black border-[#0A0B08]'
                              : 'bg-[#161712] text-[#F2E8D5] border-[#0A0B08] hover:bg-[#1F201A]'
                          }`}
                        >
                          Nv. {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selector de Tier Tecnológico */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span>TIER DE BLINDAJE Y PATENTE (1 - 5)</span>
                      <span className={isPatentUnlocked ? 'text-emerald-400' : 'text-rose-400'}>
                        {isPatentUnlocked
                          ? '✓ PATENTE HOMOLOGADA'
                          : `⚠ REQUIERE PATENTE TIER ${selectedCraftTier}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((tier) => (
                        <button
                          key={tier}
                          onClick={() => {
                            audioManager.playCursorMove();
                            setSelectedCraftTier(tier);
                          }}
                          className={`py-2 rounded font-display font-black text-xs border-2 uppercase ${
                            selectedCraftTier === tier
                              ? 'bg-amber-400 text-black border-[#0A0B08]'
                              : 'bg-[#161712] text-[#F2E8D5] border-[#0A0B08] hover:bg-[#1F201A]'
                          }`}
                        >
                          T-{tier}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selector de Cantidad */}
                  <div className="flex items-center justify-between p-2.5 bg-[#161712] rounded border border-[#0A0B08]">
                    <span className="text-xs font-mono font-bold">VOLUMEN DE PRODUCCIÓN EN SERIE:</span>
                    <div className="flex items-center gap-2">
                      {[1, 3, 5, 10].map((qty) => (
                        <button
                          key={qty}
                          onClick={() => {
                            audioManager.playCursorMove();
                            setCraftQuantity(qty);
                          }}
                          className={`px-3 py-1 rounded font-mono font-extrabold text-xs border ${
                            craftQuantity === qty
                              ? 'bg-[#46521F] text-amber-300 border-amber-300'
                              : 'bg-[#2B2C24] text-[#F2E8D5] border-[#0A0B08]'
                          }`}
                        >
                          {qty}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hoja de Costes Requeridos */}
                  <div className="p-3 bg-[#161712] rounded border border-[#0A0B08] space-y-2">
                    <span className="text-[10px] font-mono text-[#F2E8D5]/60 uppercase">
                      RECURSOS INDUSTRIALES REQUERIDOS
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                      <div className={userSteel >= totalSteelCost ? 'text-sky-300' : 'text-rose-400 font-bold'}>
                        Acero: {totalSteelCost}t ({userSteel}t)
                      </div>
                      <div className={userRareEarth >= totalRareEarthCost ? 'text-emerald-300' : 'text-rose-400 font-bold'}>
                        T. Raras: {totalRareEarthCost}t ({userRareEarth}t)
                      </div>
                      <div className={userComposites >= totalCompositesCost ? 'text-purple-300' : 'text-rose-400 font-bold'}>
                        Compuestos: {totalCompositesCost}t ({userComposites}t)
                      </div>
                      <div className={userEc >= totalEcCost ? 'text-amber-300' : 'text-rose-400 font-bold'}>
                        Energía: {totalEcCost} EC ({userEc})
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  disabled={!canAfford || !isPatentUnlocked}
                  onClick={handleCraft}
                  className={`w-full py-3 rounded-[6px_2px_6px_2px] font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 border-2 border-[#0A0B08] ${
                    canAfford && isPatentUnlocked
                      ? 'bg-[#E65100] hover:bg-[#FF6D00] text-black shadow-[4px_4px_0px_#0A0B08] cursor-pointer'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Hammer className="w-4 h-4" />
                  ENSAMBLAR {craftQuantity}X EN LÍNEA DE FUNDICIÓN
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: GRUPO DE COMBATE (BATTLEGROUP & REFUERZOS) */}
          {activeTab === 'battlegroup' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#2B2C24] border-2 border-[#0A0B08] rounded flex items-center justify-between">
                <div>
                  <h4 className="font-display font-extrabold text-sm uppercase text-[#F2E8D5]">
                    GRUPO TÁCTICO ACTIVO PARA DESPLIEGUE & REFUERZOS (T+4)
                  </h4>
                  <p className="text-xs font-mono text-[#F2E8D5]/70">
                    Estas unidades son transportadas al teatro de operaciones. Si solicitas el refuerzo único
                    en combate, llegarán en la ronda 4 desde hangares de retaguardia.
                  </p>
                </div>
                <span className="text-xs font-mono px-3 py-1 bg-[#161712] border border-[#00FF66] text-[#00FF66] rounded font-bold">
                  {battlegroup.length} / 6 SLOTS ASIGNADOS
                </span>
              </div>

              {battlegroup.length === 0 ? (
                <div className="p-8 text-center bg-[#2B2C24] border-2 border-[#0A0B08] rounded">
                  <p className="text-sm font-mono text-[#F2E8D5]/60 uppercase">
                    Sin unidades asignadas al grupo de combate. Ve al "Inventario de Tropas" y asigna blindados.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {battlegroup.map((unit) => {
                    const bp = UNIT_CATALOG.find((b) => b.code === unit.unitCode) ?? UNIT_CATALOG[0];
                    return (
                      <div
                        key={unit.id}
                        className="p-3 bg-[#2B2C24] border-2 border-[#0A0B08] rounded flex items-center justify-between gap-3 shadow-[3px_3px_0px_#0A0B08]"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-1.5 bg-[#161712] text-amber-400 font-bold rounded">
                              Nv. {unit.level}
                            </span>
                            <span className="text-xs font-display font-bold uppercase text-[#F2E8D5]">
                              {bp.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400 block mt-1">
                            {unit.hp}/100 HP • Tier {unit.tier}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromBattlegroup(unit.id)}
                          className="p-1.5 bg-[#161712] hover:bg-rose-900 border border-[#0A0B08] text-rose-300 rounded"
                          title="Retirar del grupo activo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BÓVEDA DE PATENTES */}
          {activeTab === 'patents' && (
            <div className="space-y-4">
              <p className="text-xs font-mono text-[#F2E8D5]/80">
                Las patentes permiten homologar chasis de mayores Tiers tecnológicos. Las patentes pueden ser
                intercambiadas en el Mercado P2P entre corporaciones aliadas.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {UNIT_CATALOG.map((bp) => {
                  const currentTier = unlockedPatents.find((p) => p.patentCode === bp.code)?.tier ?? 0;
                  const nextTier = currentTier + 1;
                  const upgradeCost = nextTier * 250;

                  return (
                    <div
                      key={bp.code}
                      className="p-4 bg-[#2B2C24] border-2 border-[#0A0B08] rounded-[8px_2px_8px_2px] flex items-center justify-between shadow-[4px_4px_0px_#0A0B08]"
                    >
                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-[#161712] text-amber-300 rounded border border-[#0A0B08]">
                          CATEGORÍA {bp.category.toUpperCase()}
                        </span>
                        <h4 className="text-base font-display font-black text-[#F2E8D5] uppercase mt-1">
                          {bp.name}
                        </h4>
                        <span className="text-xs font-mono text-[#00FF66] block mt-0.5">
                          Nivel de Patente Actual: Tier {currentTier} / 5
                        </span>
                      </div>

                      {nextTier <= 5 ? (
                        <button
                          disabled={userEc < upgradeCost}
                          onClick={() => handleUnlockPatent(bp.code, nextTier, upgradeCost)}
                          className={`px-3 py-2 rounded text-xs font-display font-extrabold uppercase border-2 border-[#0A0B08] ${
                            userEc >= upgradeCost
                              ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-[2px_2px_0px_#0A0B08]'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          Desbloquear T-{nextTier} ({upgradeCost} EC)
                        </button>
                      ) : (
                        <span className="text-xs font-mono text-emerald-400 font-bold px-2 py-1 bg-[#161712] rounded border border-emerald-500">
                          MAX TIER 5
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

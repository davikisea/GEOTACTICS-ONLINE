import React, { useState, useEffect } from 'react';
import {
  Shield,
  Palette,
  Check,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Crosshair,
  Zap,
  RotateCcw,
  Save,
  Layers,
  ArrowRight
} from 'lucide-react';
import { COSMETIC_SHOP_CATALOG, CosmeticSkin, UnitSkinTarget } from '@shared';
import { audioManager } from '@domains/game-feel';

export interface CatalogUnitDef {
  id: string;
  name: string;
  category: 'infantry' | 'vehicle' | 'indirect' | 'aircraft' | 'naval';
  hpMax: number;
  baseAttack: number;
  movementPoints: number;
  movementType: 'foot' | 'mech' | 'wheels' | 'treads' | 'air' | 'sea';
  minRange: number;
  maxRange: number;
  productionCost: number;
  description: string;
  defaultColor: string;
  defaultSecondary: string;
}

export const CATALOG_UNITS: CatalogUnitDef[] = [
  {
    id: 'infantry',
    name: 'Infantería Ligera',
    category: 'infantry',
    hpMax: 100,
    baseAttack: 55,
    movementPoints: 3,
    movementType: 'foot',
    minRange: 1,
    maxRange: 1,
    productionCost: 1000,
    description: 'Unidad básica versátil. Capaz de capturar ciudades y cuarteles generales en 2 turnos.',
    defaultColor: '#3b82f6',
    defaultSecondary: '#1d4ed8',
  },
  {
    id: 'mech',
    name: 'Infantería Pesada (Bazuca)',
    category: 'infantry',
    hpMax: 100,
    baseAttack: 65,
    movementPoints: 2,
    movementType: 'mech',
    minRange: 1,
    maxRange: 1,
    productionCost: 3000,
    description: 'Especializada en combate antiblindaje y desplazamiento en terreno montañoso.',
    defaultColor: '#60a5fa',
    defaultSecondary: '#2563eb',
  },
  {
    id: 'recon',
    name: 'Recon Blindado',
    category: 'vehicle',
    hpMax: 100,
    baseAttack: 60,
    movementPoints: 5,
    movementType: 'wheels',
    minRange: 1,
    maxRange: 1,
    productionCost: 4000,
    description: 'Alta movilidad y rango de visión de 8 casillas para despejar Niebla de Guerra.',
    defaultColor: '#0ea5e9',
    defaultSecondary: '#0369a1',
  },
  {
    id: 'tank_light',
    name: 'Tanque Ligero',
    category: 'vehicle',
    hpMax: 100,
    baseAttack: 75,
    movementPoints: 6,
    movementType: 'treads',
    minRange: 1,
    maxRange: 1,
    productionCost: 7000,
    description: 'Espinazo acorazado de cualquier ejército táctico. Equilibrio perfecto de velocidad y fuego.',
    defaultColor: '#2563eb',
    defaultSecondary: '#1e40af',
  },
  {
    id: 'tank_medium',
    name: 'Tanque Mediano',
    category: 'vehicle',
    hpMax: 100,
    baseAttack: 105,
    movementPoints: 5,
    movementType: 'treads',
    minRange: 1,
    maxRange: 1,
    productionCost: 16000,
    description: 'Fortaleza móvil devastadora con cañón pesado de alto calibre para romper líneas enemigas.',
    defaultColor: '#1d4ed8',
    defaultSecondary: '#172554',
  },
  {
    id: 'artillery',
    name: 'Artillería de Obús Móvil',
    category: 'indirect',
    hpMax: 100,
    baseAttack: 80,
    movementPoints: 5,
    movementType: 'treads',
    minRange: 2,
    maxRange: 3,
    productionCost: 6000,
    description: 'Fuego indirecto a distancia. Incapaz de atacar tras moverse en el mismo turno.',
    defaultColor: '#8b5cf6',
    defaultSecondary: '#6d28d9',
  },
  {
    id: 'rocket',
    name: 'Lanzacohetes de Asedio',
    category: 'indirect',
    hpMax: 100,
    baseAttack: 95,
    movementPoints: 5,
    movementType: 'wheels',
    minRange: 3,
    maxRange: 5,
    productionCost: 15000,
    description: 'Rango balístico masivo (3-5 casillas) para demoler concentraciones de blindados.',
    defaultColor: '#a855f7',
    defaultSecondary: '#7e22ce',
  },
  {
    id: 'anti_air',
    name: 'Blindado Antiaéreo',
    category: 'vehicle',
    hpMax: 100,
    baseAttack: 100,
    movementPoints: 6,
    movementType: 'treads',
    minRange: 1,
    maxRange: 1,
    productionCost: 8000,
    description: 'Cañón de ráfaga rotativa letal contra aviación e infantería desprotegida.',
    defaultColor: '#f59e0b',
    defaultSecondary: '#b45309',
  },
  {
    id: 'b_copter',
    name: 'Helicóptero de Ataque',
    category: 'aircraft',
    hpMax: 100,
    baseAttack: 75,
    movementPoints: 6,
    movementType: 'air',
    minRange: 1,
    maxRange: 1,
    productionCost: 9000,
    description: 'Unidad de asalto aéreo capaz de sobrevolar montañas y ríos con total impunidad.',
    defaultColor: '#10b981',
    defaultSecondary: '#047857',
  },
  {
    id: 'fighter',
    name: 'Caza de Supremacía',
    category: 'aircraft',
    hpMax: 100,
    baseAttack: 100,
    movementPoints: 9,
    movementType: 'air',
    minRange: 1,
    maxRange: 1,
    productionCost: 20000,
    description: 'Domina los cielos con 9 casillas de vuelo. Destruye helicópteros y bombarderos.',
    defaultColor: '#06b6d4',
    defaultSecondary: '#0e7490',
  },
  {
    id: 'bomber',
    name: 'Bombardero Táctico',
    category: 'aircraft',
    hpMax: 100,
    baseAttack: 110,
    movementPoints: 7,
    movementType: 'air',
    minRange: 1,
    maxRange: 1,
    productionCost: 22000,
    description: 'Carga útil de bombas de demolición capaz de pulverizar cuarteles generales e instalaciones.',
    defaultColor: '#e11d48',
    defaultSecondary: '#9f1239',
  },
  {
    id: 'battleship',
    name: 'Acorazado Naval',
    category: 'naval',
    hpMax: 100,
    baseAttack: 90,
    movementPoints: 5,
    movementType: 'sea',
    minRange: 2,
    maxRange: 6,
    productionCost: 28000,
    description: 'Baterías navales pesadas con alcance de 2-6 hexágonos sobre costas e islas.',
    defaultColor: '#334155',
    defaultSecondary: '#0f172a',
  },
];

interface LoadoutCustomizerProps {
  equippedCosmetics: Record<string, string>;
  unlockedSkinIds: string[];
  activeLoadoutUnits: string[];
  onEquipSkin: (unitTarget: string, skinId: string) => void;
  onUpdateLoadout?: (units: string[]) => void;
  onNavigateToShop?: () => void;
}

export const LoadoutCustomizer: React.FC<LoadoutCustomizerProps> = ({
  equippedCosmetics,
  unlockedSkinIds,
  activeLoadoutUnits,
  onEquipSkin,
  onUpdateLoadout,
  onNavigateToShop,
}) => {
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>('tank_light');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Atajos de hombro [Q] y [E] para ciclar unidades instantáneamente (Ley de Fitts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'q' || e.key === 'Q') {
        const currentIdx = CATALOG_UNITS.findIndex(u => u.id === selectedUnitCode);
        const prevIdx = (currentIdx - 1 + CATALOG_UNITS.length) % CATALOG_UNITS.length;
        audioManager.playHoverTick();
        setSelectedUnitCode(CATALOG_UNITS[prevIdx].id);
      } else if (e.key === 'e' || e.key === 'E') {
        const currentIdx = CATALOG_UNITS.findIndex(u => u.id === selectedUnitCode);
        const nextIdx = (currentIdx + 1) % CATALOG_UNITS.length;
        audioManager.playHoverTick();
        setSelectedUnitCode(CATALOG_UNITS[nextIdx].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedUnitCode]);

  const selectedUnit = CATALOG_UNITS.find(u => u.id === selectedUnitCode) || CATALOG_UNITS[0];

  // Obtener skins disponibles para la unidad seleccionada
  const availableSkinsForUnit: { id: string; name: string; color: string; secondary: string; badge: string; isDefault: boolean }[] = [
    {
      id: 'skin_default',
      name: 'Estándar de Fábrica (Reglamentario)',
      color: selectedUnit.defaultColor,
      secondary: selectedUnit.defaultSecondary,
      badge: 'Básico',
      isDefault: true,
    },
    ...COSMETIC_SHOP_CATALOG.filter(
      skin => skin.unitTarget === selectedUnitCode && unlockedSkinIds.includes(skin.id)
    ).map(skin => ({
      id: skin.id,
      name: skin.name,
      color: skin.previewColor,
      secondary: skin.secondaryColor,
      badge: skin.badge,
      isDefault: false,
    })),
  ];

  // Skin equipada actual
  const currentEquippedSkinId = equippedCosmetics[selectedUnitCode] || 'skin_default';
  const currentEquippedSkinObj = availableSkinsForUnit.find(s => s.id === currentEquippedSkinId) || availableSkinsForUnit[0];

  const handleSelectSkin = (skinId: string) => {
    audioManager.playSFX('unit_order');
    onEquipSkin(selectedUnitCode, skinId);
    setSaveSuccessMsg(`¡Camuflaje "${availableSkinsForUnit.find(s => s.id === skinId)?.name}" incorporado al blindaje!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleResetToDefault = () => {
    audioManager.playSFX('button_click');
    onEquipSkin(selectedUnitCode, 'skin_default');
    setSaveSuccessMsg('Restablecido a pintura militar estándar.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6 font-mono text-[#F2E8D5] select-none">
      {/* Banner Superior de la Armería */}
      <div className="bg-[#2B2C24] border-2 border-[#0A0B08] rounded-[14px_4px_14px_4px] p-4 flex flex-wrap items-center justify-between gap-4 shadow-[4px_4px_0px_#0A0B08] ben-day-dark">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px_2px_8px_2px] bg-[#46521F] border-2 border-[#0A0B08] flex items-center justify-center text-amber-300 shadow-[2px_2px_0px_#0A0B08]">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#F2E8D5] flex items-center gap-2 uppercase tracking-wide">
              ARMERÍA & PERSONALIZACIÓN DE CAMUFLAJES
              <span className="text-[10px] bg-[#46521F] border border-[#7B8A4A] text-[#F2E8D5] px-2 py-0.5 rounded-[4px_1px_4px_1px] uppercase font-bold">
                Chasis & Blindaje
              </span>
            </h2>
            <p className="text-xs text-[#7B8A4A] font-bold">
              Configura la librea táctica y skins visuales. Pulsa <span className="text-amber-400 font-mono">[Q]</span> y <span className="text-amber-400 font-mono">[E]</span> para alternar unidades.
            </p>
          </div>
        </div>

        {onNavigateToShop && (
          <button
            onClick={() => {
              audioManager.playSFX('button_click');
              onNavigateToShop();
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-[8px_2px_8px_2px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Tienda de Camuflajes</span>
          </button>
        )}
      </div>

      {/* Alerta de guardado */}
      {saveSuccessMsg && (
        <div className="p-3 rounded-[10px_2px_10px_2px] border-2 border-[#7B8A4A] bg-[#46521F] text-[#F2E8D5] text-xs font-black flex items-center gap-2 shadow-[4px_4px_0px_#0A0B08] transition-all">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Layout Principal: Lista de Unidades a la Izquierda y Detalle/Personalizador a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Selector de Unidades del Catálogo (4 cols) */}
        <div className="lg:col-span-4 bg-[#2B2C24] border-2 border-[#0A0B08] rounded-[14px_4px_14px_4px] p-4 space-y-3 shadow-[4px_4px_0px_#0A0B08]">
          <div className="flex items-center justify-between pb-2 border-b border-[#7B8A4A]/30">
            <span className="text-xs font-black text-[#F2E8D5] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              Catálogo de Tropas ({CATALOG_UNITS.length})
            </span>
            <span className="text-[10px] text-[#7B8A4A] font-bold font-mono">[Q] / [E]</span>
          </div>

          <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
            {CATALOG_UNITS.map(unit => {
              const isSelected = unit.id === selectedUnitCode;
              const equippedSkinId = equippedCosmetics[unit.id] || 'skin_default';
              const hasCustomSkin = equippedSkinId !== 'skin_default';

              return (
                <button
                  key={unit.id}
                  onClick={() => {
                    audioManager.playHoverTick();
                    setSelectedUnitCode(unit.id);
                  }}
                  onMouseEnter={() => audioManager.playHoverTick()}
                  className={`w-full text-left p-2.5 rounded-[8px_2px_8px_2px] border-2 transition-all text-xs flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#46521F] border-amber-400 text-[#F2E8D5] shadow-[3px_3px_0px_#0A0B08]'
                      : 'bg-[#181914] border-[#0A0B08] hover:border-[#7B8A4A] text-[#7B8A4A] hover:text-[#F2E8D5]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-[4px_1px_4px_1px] flex items-center justify-center border text-[10px] font-black"
                      style={{
                        backgroundColor: unit.defaultColor,
                        borderColor: '#0A0B08',
                      }}
                    >
                      <Shield className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                    </div>
                    <div>
                      <div className="font-black text-[#F2E8D5] uppercase">{unit.name}</div>
                      <div className="text-[10px] text-[#7B8A4A] uppercase flex items-center gap-1 font-bold">
                        <span>{unit.category}</span>
                        {hasCustomSkin && (
                          <span className="text-amber-400 font-black">• Camuflaje Activo</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-[#7B8A4A]'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel Central/Derecha: Editor de Skin y Vista Previa (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#2B2C24] border-2 border-[#0A0B08] rounded-[18px_4px_18px_4px] p-5 shadow-[6px_6px_0px_#0A0B08] space-y-5">
            {/* Header de la Unidad Seleccionada */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#7B8A4A]/30 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span className="px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-[#46521F] border border-[#7B8A4A] text-[#F2E8D5] uppercase font-black text-[10px]">
                    {selectedUnit.category}
                  </span>
                  <span className="text-[#7B8A4A] font-mono font-bold">Código: {selectedUnit.id}</span>
                </div>
                <h3 className="text-xl font-black text-[#F2E8D5] uppercase">{selectedUnit.name}</h3>
                <p className="text-xs text-[#7B8A4A] mt-1 max-w-xl font-bold">{selectedUnit.description}</p>
              </div>

              {/* Estadísticas de Combate Resumidas con tabular-nums */}
              <div className="grid grid-cols-3 gap-2 text-center bg-[#181914] border-2 border-[#0A0B08] rounded-[10px_2px_10px_2px] p-2.5 text-xs font-mono tabular-nums shadow-[2px_2px_0px_#0A0B08]">
                <div>
                  <span className="text-[10px] text-[#7B8A4A] uppercase font-bold block">ATAQUE</span>
                  <span className="font-black text-rose-400">{selectedUnit.baseAttack}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7B8A4A] uppercase font-bold block">MOVIMIENTO</span>
                  <span className="font-black text-blue-400">{selectedUnit.movementPoints} ({selectedUnit.movementType})</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7B8A4A] uppercase font-bold block">COSTE</span>
                  <span className="font-black text-amber-400">{selectedUnit.productionCost.toLocaleString()}G</span>
                </div>
              </div>
            </div>

            {/* Visualizador Holográfico de la Skin */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Caja de Render Isométrico estilizado */}
              <div
                className="h-48 rounded-[14px_4px_14px_4px] border-2 border-[#0A0B08] flex flex-col items-center justify-center relative overflow-hidden shadow-inner p-4"
                style={{
                  background: `radial-gradient(circle, ${currentEquippedSkinObj.secondary}40 0%, #161712 90%)`,
                }}
              >
                {/* Cuadrícula táctica de fondo */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#F2E8D5_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Sello de Rarity / Badge */}
                <div className="absolute top-3 left-3 bg-[#181914] border border-[#7B8A4A] text-[10px] px-2 py-0.5 rounded-[4px_1px_4px_1px] text-[#F2E8D5] font-black flex items-center gap-1 shadow-[2px_2px_0px_#0A0B08]">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{currentEquippedSkinObj.badge}</span>
                </div>

                {/* Chasis Estilizado */}
                <div
                  className="w-24 h-24 rounded-[16px_4px_16px_4px] flex items-center justify-center border-4 border-[#0A0B08] shadow-[6px_6px_0px_#0A0B08] relative transform hover:scale-105 transition-all duration-300"
                  style={{
                    backgroundColor: currentEquippedSkinObj.color,
                  }}
                >
                  <Shield className="w-12 h-12 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />

                  {/* Detalle visual de cañón */}
                  <div
                    className="absolute -top-2 w-3 h-5 rounded-[2px] border border-[#0A0B08]"
                    style={{ backgroundColor: currentEquippedSkinObj.secondary }}
                  />
                </div>

                <div className="mt-3 text-center z-10">
                  <div className="text-xs font-black text-[#F2E8D5] uppercase tracking-wide">
                    {currentEquippedSkinObj.name}
                  </div>
                  <div className="text-[10px] text-[#7B8A4A] font-bold">
                    Textura: <span className="font-mono text-emerald-400">{currentEquippedSkinObj.id}</span>
                  </div>
                </div>
              </div>

              {/* Selector de Skins para esta Unidad */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#F2E8D5] uppercase tracking-wider flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                    Skins en Arsenal ({availableSkinsForUnit.length})
                  </h4>

                  {currentEquippedSkinId !== 'skin_default' && (
                    <button
                      onClick={handleResetToDefault}
                      onMouseEnter={() => audioManager.playHoverTick()}
                      className="px-2.5 py-1 min-h-[28px] rounded-[6px_2px_6px_2px] bg-[#181914] hover:bg-[#34352C] border border-[#7B8A4A]/50 text-xs text-amber-400 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_#0A0B08]"
                      title="Volver a la pintura reglamentaria estándar"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restablecer</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {availableSkinsForUnit.map(skin => {
                    const isEquipped = skin.id === currentEquippedSkinId;

                    return (
                      <div
                        key={skin.id}
                        onClick={() => handleSelectSkin(skin.id)}
                        onMouseEnter={() => audioManager.playHoverTick()}
                        className={`p-3 rounded-[10px_2px_10px_2px] border-2 flex items-center justify-between cursor-pointer transition-all ${
                          isEquipped
                            ? 'bg-[#46521F] border-amber-400 shadow-[3px_3px_0px_#0A0B08]'
                            : 'bg-[#181914] border-[#0A0B08] hover:border-[#7B8A4A] shadow-[2px_2px_0px_#0A0B08]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded-[4px_1px_4px_1px] border-2 border-[#0A0B08] flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: skin.color,
                            }}
                          >
                            {isEquipped ? <Check className="w-4 h-4 text-white" /> : <Shield className="w-4 h-4 text-white/80" />}
                          </div>

                          <div>
                            <div className="text-xs font-black text-[#F2E8D5] flex items-center gap-1.5 uppercase">
                              {skin.name}
                              {isEquipped && (
                                <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-[3px_1px_3px_1px] font-black border border-[#0A0B08]">
                                  ACTIVA
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#7B8A4A] font-bold">{skin.badge}</div>
                          </div>
                        </div>

                        <button
                          disabled={isEquipped}
                          className={`text-xs px-2.5 py-1 rounded-[6px_2px_6px_2px] font-black uppercase tracking-wider transition-all border ${
                            isEquipped
                              ? 'text-amber-300 border-transparent cursor-default'
                              : 'bg-[#2B2C24] hover:bg-[#383a2e] text-[#F2E8D5] border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] cursor-pointer'
                          }`}
                        >
                          {isEquipped ? 'Equipada' : 'Equipar'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Alerta de skins bloqueadas en la tienda */}
                {availableSkinsForUnit.length === 1 && (
                  <div className="p-3 rounded-[8px_2px_8px_2px] bg-[#181914] border border-[#7B8A4A]/40 text-[11px] text-[#7B8A4A] space-y-2 font-bold">
                    <p>No tienes camuflajes adicionales desbloqueados para esta división militar.</p>
                    {onNavigateToShop && (
                      <button
                        onClick={() => {
                          audioManager.playSFX('button_click');
                          onNavigateToShop();
                        }}
                        onMouseEnter={() => audioManager.playHoverTick()}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-black uppercase cursor-pointer"
                      >
                        Desbloquear en Tienda Táctica <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Aviso de Fair-Play y No Pay-to-Win */}
            <div className="pt-3 border-t border-[#7B8A4A]/30 flex items-center justify-between text-[11px] text-[#7B8A4A] font-bold">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                Doctrina Canónica: Las skins son 100% cosméticas. No alteran daño, alcance ni combustible.
              </span>
              <span className="font-mono text-emerald-400">● SINCRONIZADO</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

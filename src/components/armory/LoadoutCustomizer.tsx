import React, { useState } from 'react';
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
import { COSMETIC_SHOP_CATALOG, CosmeticSkin, UnitSkinTarget } from '../../lib/shopData';

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
    hpMax: 10,
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
    hpMax: 10,
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
    hpMax: 10,
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
    hpMax: 10,
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
    hpMax: 10,
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
    hpMax: 10,
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
    hpMax: 10,
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
    hpMax: 10,
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
    hpMax: 10,
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
    hpMax: 10,
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
    hpMax: 10,
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
    hpMax: 10,
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
    onEquipSkin(selectedUnitCode, skinId);
    setSaveSuccessMsg(`¡Skin "${availableSkinsForUnit.find(s => s.id === skinId)?.name}" equipada con éxito!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleResetToDefault = () => {
    onEquipSkin(selectedUnitCode, 'skin_default');
    setSaveSuccessMsg('Restablecido a pintura militar estándar.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6 font-mono text-slate-100">
      {/* Banner Superior de la Armería */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              ARMERÍA & PERSONALIZACIÓN DE CAMUFLAJES
              <span className="text-[10px] bg-blue-950 border border-blue-500/40 text-blue-300 px-2 py-0.5 rounded uppercase">
                Chasis & Pinturas
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Configura la librea táctica y skins visuales para tus divisiones en combate.
            </p>
          </div>
        </div>

        {onNavigateToShop && (
          <button
            onClick={onNavigateToShop}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-[0_0_12px_rgba(16,185,129,0.25)] transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Ir a la Tienda de Skins</span>
          </button>
        )}
      </div>

      {/* Alerta de guardado */}
      {saveSuccessMsg && (
        <div className="p-3 rounded-lg border border-emerald-500/50 bg-emerald-950/80 text-emerald-300 text-xs flex items-center gap-2 shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all">
          <Check className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Layout Principal: Lista de Unidades a la Izquierda y Detalle/Personalizador a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Selector de Unidades del Catálogo (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" />
              Catálogo de Unidades ({CATALOG_UNITS.length})
            </span>
            <span className="text-[10px] text-slate-400">Selecciona para editar</span>
          </div>

          <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
            {CATALOG_UNITS.map(unit => {
              const isSelected = unit.id === selectedUnitCode;
              const equippedSkinId = equippedCosmetics[unit.id] || 'skin_default';
              const hasCustomSkin = equippedSkinId !== 'skin_default';

              return (
                <button
                  key={unit.id}
                  onClick={() => setSelectedUnitCode(unit.id)}
                  className={`w-full text-left p-2.5 rounded border transition-all text-xs flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/60 border-blue-500/60 text-white shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center border text-[10px] font-bold"
                      style={{
                        backgroundColor: unit.defaultColor,
                        borderColor: unit.defaultSecondary,
                      }}
                    >
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-200">{unit.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize flex items-center gap-1">
                        <span>{unit.category}</span>
                        {hasCustomSkin && (
                          <span className="text-emerald-400 font-semibold">• Skin Especial</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel Central/Derecha: Editor de Skin y Vista Previa (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg space-y-5">
            {/* Header de la Unidad Seleccionada */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-blue-400 mb-1">
                  <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800/50 uppercase font-bold text-[10px]">
                    {selectedUnit.category}
                  </span>
                  <span className="text-slate-400 font-mono">Código: {selectedUnit.id}</span>
                </div>
                <h3 className="text-xl font-bold text-white">{selectedUnit.name}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">{selectedUnit.description}</p>
              </div>

              {/* Estadísticas de Combate Resumidas */}
              <div className="grid grid-cols-3 gap-2 text-center bg-slate-950 border border-slate-800 rounded p-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">ATAQUE</span>
                  <span className="font-bold text-red-400">{selectedUnit.baseAttack}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">MOVIMIENTO</span>
                  <span className="font-bold text-blue-400">{selectedUnit.movementPoints} ({selectedUnit.movementType})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">COSTE</span>
                  <span className="font-bold text-amber-400">{selectedUnit.productionCost}G</span>
                </div>
              </div>
            </div>

            {/* Visualizador Holográfico de la Skin */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Caja de Render 3D/Canvas Isométrico estilizado */}
              <div
                className="h-48 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden shadow-inner p-4"
                style={{
                  background: `radial-gradient(circle, ${currentEquippedSkinObj.secondary}30 0%, #030712 90%)`,
                }}
              >
                {/* Cuadrícula táctica de fondo */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Sello de Rarity / Badge */}
                <div className="absolute top-3 left-3 bg-slate-950/80 border border-slate-700 text-[10px] px-2 py-0.5 rounded text-slate-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{currentEquippedSkinObj.badge}</span>
                </div>

                {/* Chasis Estilizado */}
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center border-2 shadow-2xl relative transform hover:scale-105 transition-all duration-300"
                  style={{
                    backgroundColor: currentEquippedSkinObj.color,
                    borderColor: currentEquippedSkinObj.secondary,
                    boxShadow: `0 0 25px ${currentEquippedSkinObj.color}60`,
                  }}
                >
                  <Shield className="w-12 h-12 text-white drop-shadow-md" />

                  {/* Detalle visual de cañón o torreta */}
                  <div
                    className="absolute -top-2 w-3 h-5 rounded-sm"
                    style={{ backgroundColor: currentEquippedSkinObj.secondary }}
                  />
                </div>

                <div className="mt-3 text-center z-10">
                  <div className="text-xs font-bold text-white tracking-wide">
                    {currentEquippedSkinObj.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    ID de Textura: <span className="font-mono text-emerald-400">{currentEquippedSkinObj.id}</span>
                  </div>
                </div>
              </div>

              {/* Selector de Skins para esta Unidad */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                    Skins en tu Inventario ({availableSkinsForUnit.length})
                  </h4>

                  {currentEquippedSkinId !== 'skin_default' && (
                    <button
                      onClick={handleResetToDefault}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restablecer Estándar
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
                        className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          isEquipped
                            ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded border flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: skin.color,
                              borderColor: skin.secondary,
                            }}
                          >
                            {isEquipped ? <Check className="w-4 h-4 text-white" /> : <Shield className="w-4 h-4 text-white/80" />}
                          </div>

                          <div>
                            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              {skin.name}
                              {isEquipped && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono">
                                  ACTIVA
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">{skin.badge}</div>
                          </div>
                        </div>

                        <button
                          disabled={isEquipped}
                          className={`text-xs px-2.5 py-1 rounded font-bold transition-all ${
                            isEquipped
                              ? 'text-emerald-400 cursor-default'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
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
                  <div className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-2">
                    <p>No tienes skins adicionales desbloqueadas para este tipo de unidad.</p>
                    {onNavigateToShop && (
                      <button
                        onClick={onNavigateToShop}
                        className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                      >
                        Visitar Tienda Táctica para desbloquear skins <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Aviso de Fair-Play y No Pay-to-Win */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-slate-400">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                Regla Canónica: Los aspectos no modifican rango, daño, combustible ni defensa.
              </span>
              <span className="font-mono text-emerald-400">Estado: Sincronizado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

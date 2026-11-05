import React from 'react';
import { CANONICAL_UNIT_PRODUCTION_CATALOG, TurnEconomyEngine } from '../../engine/turnEconomy';
import { COEngine, COId } from '../../engine/coSystem';
import { GridPosition, TerrainTile } from '../../types';
import { Factory, X, Coins, Shield, AlertCircle, Box } from 'lucide-react';
import { audioManager } from '../../engine/audioManager';

interface ProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFunds: number;
  player: 'p1' | 'p2';
  facilityCoord: GridPosition | null;
  facilityTile: TerrainTile | null;
  onProduce: (unitCode: string) => void;
  coId?: COId;
  hangarStock?: Record<string, number>;
  currentUnitCount?: number;
}

export const ProductionModal: React.FC<ProductionModalProps> = ({
  isOpen,
  onClose,
  currentFunds,
  player,
  facilityCoord,
  facilityTile,
  onProduce,
  coId,
  hangarStock,
  currentUnitCount = 0,
}) => {
  const facilityType = facilityTile?.type === 'airport' ? 'airport' : facilityTile?.type === 'port' ? 'port' : 'factory';

  // Catálogo completo según tipo de instalación militar (Sin restricciones de mazo)
  const availableUnits = Object.entries(CANONICAL_UNIT_PRODUCTION_CATALOG).filter(
    ([code, unit]) => unit.facility === facilityType && code !== 'missile'
  );

  const supplyStatus = TurnEconomyEngine.calculateSupplyUpkeep(
    player,
    Array(currentUnitCount).fill({ ownerId: player }) as any
  );

  // Atajos de teclado numéricos [1]-[9] y ESC para despliegue de alta velocidad
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        audioManager.playSFX('button_click');
        onClose();
        return;
      }

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= availableUnits.length) {
        const [code, unit] = availableUnits[num - 1];
        const effectiveCost = coId ? COEngine.getProductionCostModifier(coId, unit.cost) : unit.cost;
        const isF2PInfinite = code === 'infantry' || code === 'recon';
        const stockCount = hangarStock ? (hangarStock[code] ?? 0) : Infinity;
        const hasChassis = isF2PInfinite || stockCount > 0;

        if (currentFunds >= effectiveCost && hasChassis) {
          e.preventDefault();
          audioManager.playSFX('unit_order');
          audioManager.playGoldTick(8);
          onProduce(code);
        } else {
          audioManager.playSFX('button_click');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, availableUnits, currentFunds, coId, hangarStock, onClose, onProduce]);

  if (!isOpen || !facilityCoord) return null;

  const getFacilityName = () => {
    switch (facilityType) {
      case 'airport':
        return 'Aeródromo / Hangar de Aviación';
      case 'port':
        return 'Puerto Naval & Astillero';
      default:
        return 'Complejo Industrial / Fábrica Terrestre';
    }
  };

  const handleUnitClick = (code: string, effectiveCost: number, hasChassis: boolean) => {
    if (currentFunds >= effectiveCost && hasChassis) {
      audioManager.playSFX('unit_order');
      audioManager.playGoldTick(8);
      onProduce(code);
    } else {
      audioManager.playSFX('button_click');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          audioManager.playSFX('button_click');
          onClose();
        }
      }}
    >
      <div className="bg-[#2B2C24] border-4 border-[#0A0B08] w-full max-w-4xl rounded-[24px_6px_24px_6px] shadow-[12px_12px_0px_#0A0B08] flex flex-col max-h-[92vh] overflow-hidden text-[#F2E8D5] ben-day-dark">
        {/* Encabezado C4ISR */}
        <div className="p-4 border-b-2 border-[#0A0B08] flex items-center justify-between bg-[#181914]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-[8px_2px_8px_2px] border-2 border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] ${
              player === 'p1' ? 'bg-[#46521F] text-amber-300' : 'bg-[#7F1D1D] text-amber-300'
            }`}>
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-[#F2E8D5] text-sm uppercase tracking-wide">
                  ENSAMBLAJE MILITAR INDUSTRIAL
                </h3>
                <span className={`px-2 py-0.5 rounded-[4px_1px_4px_1px] text-[10px] font-black uppercase border border-[#0A0B08] ${
                  player === 'p1' ? 'bg-[#46521F] text-[#F2E8D5]' : 'bg-[#7F1D1D] text-[#F2E8D5]'
                }`}>
                  {player === 'p1' ? 'Orange Star' : 'Blue Moon'}
                </span>
              </div>
              <p className="text-[11px] text-[#7B8A4A] mt-0.5 font-bold">
                {getFacilityName()} • Sector [{facilityCoord.x}, {facilityCoord.y}]
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px_2px_8px_2px] bg-[#2B2C24] border-2 border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] tabular-nums">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] text-[#7B8A4A] font-bold">Fondos:</span>
              <span className="text-xs font-black text-amber-400">{currentFunds.toLocaleString()}G</span>
            </div>
            <button
              onClick={() => {
                audioManager.playSFX('button_click');
                onClose();
              }}
              onMouseEnter={() => audioManager.playHoverTick()}
              className="text-[#F2E8D5]/70 hover:text-white p-1.5 rounded-[6px_2px_6px_2px] bg-[#2B2C24] border border-[#7B8A4A]/50 hover:bg-[#34352C] transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
              title="Cerrar (ESC)"
            >
              <span className="text-[9px] text-amber-400/80 hidden sm:inline">[ESC]</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Barra de Suministros y Doble Llave Material */}
        <div className="bg-[#181914]/80 border-b-2 border-[#0A0B08] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-[#46521F] border border-[#7B8A4A] text-[#F2E8D5] font-black flex items-center gap-1">
              <Box className="w-3 h-3 text-amber-300" />
              Línea de Ensamblaje ({availableUnits.length} tipos disponibles)
            </span>
            <span className="text-[#7B8A4A] hidden sm:inline font-bold">
              Pulsa [1]–[{Math.min(9, availableUnits.length)}] para ensamblar
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-[4px_1px_4px_1px] border font-black flex items-center gap-1 ${
              supplyStatus.isOverCapacity
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                : 'bg-[#2B2C24] border-[#7B8A4A]/40 text-[#F2E8D5]'
            }`}>
              {supplyStatus.isOverCapacity ? <AlertCircle className="w-3 h-3 text-amber-400" /> : <Shield className="w-3 h-3 text-emerald-400" />}
              Tropas Activas: {supplyStatus.totalUnits} / 14 {supplyStatus.isOverCapacity ? `(Penalización: -${supplyStatus.totalUpkeepG}G/t)` : '(Suministro Óptimo)'}
            </span>
          </div>
        </div>

        {/* Cuadrícula Táctica de Fichas de Producción con Doble Llave */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {availableUnits.map(([code, unit], idx) => {
              const effectiveCost = coId ? COEngine.getProductionCostModifier(coId, unit.cost) : unit.cost;
              const hasDiscount = effectiveCost < unit.cost;
              const canAfford = currentFunds >= effectiveCost;
              const isF2PInfinite = code === 'infantry' || code === 'recon';
              const stock = hangarStock ? (hangarStock[code] ?? 0) : Infinity;
              const hasChassis = isF2PInfinite || stock > 0;
              const canDeploy = canAfford && hasChassis;
              const hotkey = idx < 9 ? `${idx + 1}` : null;

              return (
                <div
                  key={code}
                  onClick={() => canDeploy && handleUnitClick(code, effectiveCost, hasChassis)}
                  onMouseEnter={() => canDeploy && audioManager.playHoverTick()}
                  className={`relative p-3 rounded-[12px_3px_12px_3px] border-2 flex flex-col justify-between transition-all select-none ${
                    canDeploy
                      ? 'bg-[#181914] border-[#0A0B08] shadow-[4px_4px_0px_#0A0B08] hover:border-amber-400 hover:bg-[#20211A] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 group'
                      : 'bg-[#181914]/50 border-[#0A0B08]/60 opacity-45 cursor-not-allowed shadow-none'
                  }`}
                >
                  {/* Badge de Atajo Numérico */}
                  {hotkey && (
                    <div className="absolute top-2 left-2 z-10 px-1.5 py-0.2 rounded-[3px_1px_3px_1px] bg-[#0A0B08] text-amber-300 font-mono text-[9px] font-black border border-[#7B8A4A]/40">
                      [{hotkey}]
                    </div>
                  )}

                  {/* Insignia de Stock / Chasis */}
                  <div className="absolute top-2 right-2 z-10 px-1.5 py-0.2 rounded-[3px_1px_3px_1px] text-[8px] font-black uppercase border border-black/40">
                    {isF2PInfinite ? (
                      <span className="bg-emerald-950/90 text-emerald-300 px-1 py-0.5 rounded">F2P ∞</span>
                    ) : stock > 0 ? (
                      <span className="bg-[#46521F] text-amber-300 px-1 py-0.5 rounded">Stock: {stock}</span>
                    ) : (
                      <span className="bg-red-950 text-red-400 px-1 py-0.5 rounded">Sin Chasis</span>
                    )}
                  </div>

                  {/* Silueta / Icono de Unidad */}
                  <div className="h-16 flex items-center justify-center relative mt-3 mb-1">
                    <div className={`w-12 h-12 rounded-[10px_2px_10px_2px] border-2 border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] flex items-center justify-center text-xl ${
                      canDeploy ? 'bg-[#46521F] text-amber-300 group-hover:scale-105' : 'bg-[#2B2C24] text-slate-500'
                    } transition-transform`}>
                      {unit.facility === 'airport' ? '✈️' : unit.facility === 'port' ? '🚢' : '🛡️'}
                    </div>
                  </div>

                  {/* Nombre y Tipo */}
                  <div className="text-center">
                    <h4 className="font-black text-xs text-[#F2E8D5] uppercase truncate">
                      {unit.displayName}
                    </h4>
                    <span className="text-[9px] text-[#7B8A4A] font-black uppercase tracking-wider block">
                      {unit.movementType}
                    </span>
                  </div>

                  {/* Estadísticas Compactas */}
                  <div className="grid grid-cols-2 gap-1 my-2 text-[9px] text-[#7B8A4A] bg-[#2B2C24]/60 p-1.5 rounded border border-[#7B8A4A]/20 font-bold tabular-nums">
                    <span>MOV: <b className="text-[#F2E8D5]">{unit.movementPoints}</b></span>
                    <span>RNG: <b className="text-[#F2E8D5]">{unit.minRange}-{unit.maxRange}</b></span>
                    <span>ATK: <b className="text-[#F2E8D5]">{unit.baseAttack}</b></span>
                    <span>MUN: <b className="text-[#F2E8D5]">{unit.ammo}</b></span>
                  </div>

                  {/* Placa de Costo y Botón de Ensamble */}
                  <div className="pt-1.5 border-t border-[#7B8A4A]/30 flex items-center justify-between">
                    <div className="font-black text-xs tabular-nums">
                      <span className={canAfford ? 'text-amber-400' : 'text-red-400'}>
                        {effectiveCost.toLocaleString()}G
                      </span>
                    </div>

                    <button
                      disabled={!canDeploy}
                      className={`px-2 py-0.5 rounded-[4px_1px_4px_1px] text-[10px] font-black uppercase tracking-wider border transition-all ${
                        canDeploy
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] cursor-pointer'
                          : 'bg-[#2B2C24] text-[#7B8A4A] border-transparent cursor-not-allowed'
                      }`}
                    >
                      {canDeploy ? 'Crear' : !hasChassis ? 'Hangar' : 'Fondos'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie de Modal */}
        <div className="p-3 bg-[#181914] border-t-2 border-[#0A0B08] flex items-center justify-between text-[11px] text-[#7B8A4A]">
          <span>* Doble Llave Activa: Fondos in-match ($G) + Stock físico en Hangar (Infantería y Recon F2P ilimitados).</span>
          <button
            onClick={() => {
              audioManager.playSFX('button_click');
              onClose();
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className="px-3 py-1 rounded-[6px_2px_6px_2px] bg-[#2B2C24] hover:bg-[#34352C] text-[#F2E8D5] border border-[#7B8A4A]/50 transition-colors cursor-pointer text-xs font-bold"
          >
            Cerrar [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { CANONICAL_UNIT_PRODUCTION_CATALOG } from '../../engine/turnEconomy';
import { COEngine, COId } from '../../engine/coSystem';
import { GridPosition, TerrainTile } from '../../types';
import { Factory, X, Coins, Shield, Crosshair, Gauge, Percent, Layers, AlertCircle, Sparkles } from 'lucide-react';
import { audioManager } from '../../engine/audioManager';
import { DeckManager, PREDEFINED_DECKS } from '../../engine/deckManager';

interface ProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFunds: number;
  player: 'p1' | 'p2';
  facilityCoord: GridPosition | null;
  facilityTile: TerrainTile | null;
  onProduce: (unitCode: string) => void;
  coId?: COId;
  activeDeck?: string[];
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
  activeDeck,
  currentUnitCount = 0,
}) => {
  if (!isOpen || !facilityCoord) return null;

  const facilityType = facilityTile?.type === 'airport' ? 'airport' : facilityTile?.type === 'port' ? 'port' : 'factory';

  // Filtrar según el Mazo de 10 Cartas Activo (Libertad Orgánica - Sin Cooldowns)
  const deckCodes = activeDeck && activeDeck.length === 10 ? activeDeck : PREDEFINED_DECKS.balanced.cards;
  const availableUnits = Object.entries(CANONICAL_UNIT_PRODUCTION_CATALOG).filter(
    ([code, unit]) =>
      unit.facility === facilityType &&
      code !== 'missile' &&
      (deckCodes.includes(code) || (code === 'missiles' && deckCodes.includes('missile')))
  );

  const supplyStatus = DeckManager.calculateSupplyStatus(currentUnitCount);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Encabezado */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${player === 'p1' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'bg-red-600/20 text-red-400 border border-red-500/40'}`}>
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm font-mono tracking-wide">
                  ENSAMBLAJE MILITAR CANÓNICO
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${player === 'p1' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                  {player === 'p1' ? 'Orange Star (Azul)' : 'Blue Moon (Rojo)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {getFacilityName()} • Coordenadas [{facilityCoord.x}, {facilityCoord.y}]
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">Fondos:</span>
              <span className="text-xs font-bold text-emerald-400">{currentFunds.toLocaleString()}G</span>
            </div>
            <button
              onClick={() => {
                audioManager.playSFX('button_click');
                onClose();
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Barra de Mazo Táctico y Capacidad de Suministros (Libertad Orgánica) */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Mazo Táctico: 10 Cartas
            </span>
            <span className="text-slate-400">
              Despliegue directo sin cooldowns artificiales
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded border font-bold flex items-center gap-1 ${
              supplyStatus.isOverCapacity
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              {supplyStatus.isOverCapacity ? <AlertCircle className="w-3 h-3 text-amber-400" /> : <Shield className="w-3 h-3 text-emerald-400" />}
              Tropas: {supplyStatus.unitCount} / {supplyStatus.freeThreshold} {supplyStatus.isOverCapacity ? `(Mantenimiento: -${supplyStatus.totalUpkeepG}G/t)` : '(Suministro Pleno)'}
            </span>
          </div>
        </div>

        {/* Lista de Unidades Desplegables */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 font-mono text-xs">
          {availableUnits.map(([code, unit]) => {
            const effectiveCost = coId ? COEngine.getProductionCostModifier(coId, unit.cost) : unit.cost;
            const hasDiscount = effectiveCost < unit.cost;
            const canAfford = currentFunds >= effectiveCost;

            return (
              <div
                key={code}
                className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  canAfford
                    ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-950'
                    : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-sm">{unit.displayName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                      {unit.movementType.toUpperCase()}
                    </span>
                    {hasDiscount && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                        -20% COLIN
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {unit.description}
                  </p>
                  
                  {/* Atributos Clave */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-emerald-400" />
                      Mov: <b className="text-slate-200">{unit.movementPoints}</b>
                    </span>
                    <span className="flex items-center gap-1">
                      <Crosshair className="w-3 h-3 text-amber-400" />
                      Rango: <b className="text-slate-200">[{unit.minRange}-{unit.maxRange}]</b>
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-blue-400" />
                      Poder: <b className="text-slate-200">{unit.baseAttack}</b>
                    </span>
                    <span>
                      Mun: <b className="text-slate-200">{unit.ammo}</b> | Fuel: <b className="text-slate-200">{unit.fuel}</b>
                    </span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  <div className="font-bold text-sm text-right">
                    {hasDiscount && (
                      <span className="text-[10px] text-slate-500 line-through mr-1.5">
                        {unit.cost.toLocaleString()}G
                      </span>
                    )}
                    <span className={canAfford ? 'text-amber-400' : 'text-red-400'}>
                      {effectiveCost.toLocaleString()}G
                    </span>
                  </div>
                  <button
                    disabled={!canAfford}
                    onClick={() => onProduce(code)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      canAfford
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Desplegar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pie de Modal */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>* La unidad desplegada comenzará en estado de espera en este turno.</span>
          <button
            onClick={() => {
              audioManager.playSFX('button_click');
              onClose();
            }}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

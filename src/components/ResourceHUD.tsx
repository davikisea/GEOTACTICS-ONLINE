import React from 'react';
import { Coins, Clock, Shield, Flag } from 'lucide-react';

interface ResourceHUDProps {
  playerFunds: number;
  turnNumber: number;
  timeRemainingSec: number;
  capturedCities: number;
  currentArmy: 'p1' | 'p2';
}

export const ResourceHUD: React.FC<ResourceHUDProps> = ({
  playerFunds,
  turnNumber,
  timeRemainingSec,
  capturedCities,
  currentArmy,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 font-mono text-xs shadow-md">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-amber-400">
          <Coins className="w-4 h-4" />
          <span className="font-bold">{playerFunds.toLocaleString()}G</span>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-400">
          <Flag className="w-4 h-4" />
          <span>Ciudades: {capturedCities} (+{capturedCities * 1000}G/turno)</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Shield className="w-4 h-4 text-blue-400" />
          <span>Turno {turnNumber} ({currentArmy === 'p1' ? 'Azul' : 'Rojo'})</span>
        </div>

        <div className="flex items-center gap-1.5 text-red-400 bg-red-950/40 border border-red-800/40 px-2 py-0.5 rounded">
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          <span>{timeRemainingSec}s</span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Terminal, X, CloudFog, Sparkles, UploadCloud, Eye, Sun, CloudRain } from 'lucide-react';

export interface DebugDevConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFogOfWarEnabled: boolean;
  setIsFogOfWarEnabled: (val: boolean) => void;
  fowWeather: 'clear' | 'rain';
  setFowWeather: (val: 'clear' | 'rain') => void;
  sonjaSensorActive: boolean;
  setSonjaSensorActive: (val: boolean) => void;
  onBarkTrigger: () => void;
  setIsImportModalOpen: (val: boolean) => void;
}

export const DebugDevConsoleModal: React.FC<DebugDevConsoleModalProps> = ({
  isOpen,
  onClose,
  isFogOfWarEnabled,
  setIsFogOfWarEnabled,
  fowWeather,
  setFowWeather,
  sonjaSensorActive,
  setSonjaSensorActive,
  onBarkTrigger,
  setIsImportModalOpen,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#181914] border-2 border-[#C46A3A] rounded-[8px_2px_8px_2px] p-5 shadow-[15px_15px_0px_rgba(0,0,0,0.7)] text-[#F2E8D5] font-mono">
        <div className="flex items-center justify-between border-b border-[#7B8A4A]/40 pb-3 mb-4">
          <div className="flex items-center gap-2 text-[#C46A3A] font-bold uppercase tracking-wider text-sm">
            <Terminal className="w-4 h-4 text-[#C46A3A]" />
            <span>Terminal de Estado Mayor (DEBUG / CHEATS)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#F2E8D5]/70 hover:text-red-400 transition-colors cursor-pointer"
            title="Cerrar consola de depuración"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Sensores y Niebla */}
          <div>
            <label className="block text-[#7B8A4A] mb-1.5 font-bold uppercase tracking-wide">
              Sensores & Niebla de Guerra
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsFogOfWarEnabled(!isFogOfWarEnabled)}
                className={`px-3 py-1.5 rounded border transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                  isFogOfWarEnabled
                    ? 'bg-purple-900 border-purple-500 text-purple-200'
                    : 'bg-[#2B2C24] border-slate-700 text-slate-400 hover:text-[#F2E8D5]'
                }`}
              >
                <CloudFog className="w-3.5 h-3.5" />
                <span>Niebla: {isFogOfWarEnabled ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={() => setSonjaSensorActive(!sonjaSensorActive)}
                className={`px-3 py-1.5 rounded border transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                  sonjaSensorActive
                    ? 'bg-amber-900 border-amber-500 text-amber-200'
                    : 'bg-[#2B2C24] border-slate-700 text-slate-400 hover:text-[#F2E8D5]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Sensor Sonja: {sonjaSensorActive ? 'ACTIVO' : 'INACTIVO'}</span>
              </button>
            </div>
          </div>

          {/* Meteorología */}
          <div>
            <label className="block text-[#7B8A4A] mb-1.5 font-bold uppercase tracking-wide">
              Meteorología de Campo
            </label>
            <button
              onClick={() => setFowWeather(fowWeather === 'clear' ? 'rain' : 'clear')}
              className="px-3 py-1.5 rounded bg-[#2B2C24] border border-[#7B8A4A] text-[#F2E8D5] hover:border-amber-400 transition-all cursor-pointer font-bold flex items-center gap-1.5"
            >
              {fowWeather === 'rain' ? (
                <>
                  <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                  <span>Clima Forzado: 🌧️ Lluvia (-1 Vis)</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clima Forzado: ☀️ Despejado</span>
                </>
              )}
            </button>
          </div>

          {/* Telemetría Narrativa & Cartografía */}
          <div>
            <label className="block text-[#7B8A4A] mb-1.5 font-bold uppercase tracking-wide">
              Telemetría Narrativa & Cartografía
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onBarkTrigger}
                className="px-3 py-1.5 rounded bg-[#C46A3A] hover:bg-[#d67b4b] text-[#F2E8D5] font-bold border border-[#F2E8D5]/30 shadow-[2px_2px_0px_#181914] flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Forzar Bark Cómic</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  setIsImportModalOpen(true);
                }}
                className="px-3 py-1.5 rounded bg-[#46521F] hover:bg-[#5b6a2b] border border-[#7B8A4A] text-[#F2E8D5] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Importar Matriz AWBW</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-[#7B8A4A]/30 flex items-center justify-between text-[10px] text-[#7B8A4A]">
          <span>Atajo de teclado global: [Ctrl + Shift + D]</span>
          <span className="uppercase text-amber-500/80 font-bold">Modo Auditor</span>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Shield, Cpu, Activity, Play, CheckCircle2, Volume2, Sparkles } from 'lucide-react';
import { assetLoader, PreloadProgress } from '../../engine/assetLoader';
import { audioManager } from '../../engine/audioManager';

interface MapLoadingScreenProps {
  mapName?: string;
  onLoadingComplete: () => void;
}

export const MapLoadingScreen: React.FC<MapLoadingScreenProps> = ({
  mapName = 'Valle de los Cuarteles [Sector Alfa]',
  onLoadingComplete,
}) => {
  const [progress, setProgress] = useState<PreloadProgress>({
    total: 9,
    loaded: 0,
    percentage: 0,
    currentAsset: 'Iniciando diagnóstico de hardware...',
  });
  const [isReady, setIsReady] = useState<boolean>(false);
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const startPreload = async () => {
      // Registrar log inicial
      setDiagnosticsLogs(prev => [...prev, '>> Asignando memoria de textura (OffscreenCanvas 48x48)']);

      await assetLoader.preloadCriticalAssets(p => {
        if (!isMounted) return;
        setProgress(p);
        setDiagnosticsLogs(prev => {
          const next = [...prev, `>> ${p.currentAsset} [${p.percentage}%]`];
          return next.slice(-6); // Mantener últimos 6 registros
        });
      });

      if (isMounted) {
        setIsReady(true);
        setDiagnosticsLogs(prev => [
          ...prev,
          '>> Matriz de sprites tácticos compilada.',
          '>> Sintetizador Web Audio API inicializado.',
          '>> SISTEMA LISTO PARA EL DESPLIEGUE.',
        ]);
      }
    };

    startPreload();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartBattle = () => {
    // Inicializar AudioContext en respuesta al click del usuario
    audioManager.initContext();
    audioManager.playSFX('unit_order');
    audioManager.startBgm('march');
    onLoadingComplete();
  };

  return (
    <div className="relative w-full h-[560px] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-6 text-slate-200 select-none shadow-2xl">
      {/* Fondo de rejilla táctica con radar giratorio */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      {/* Círculos concéntricos de radar militar */}
      <div className="absolute w-80 h-80 rounded-full border border-emerald-500/15 pointer-events-none" />
      <div className="absolute w-56 h-56 rounded-full border border-emerald-500/20 pointer-events-none" />
      <div className="absolute w-32 h-32 rounded-full border border-emerald-500/30 pointer-events-none" />

      {/* Escáner de barrido de radar */}
      <div className="absolute w-80 h-80 rounded-full overflow-hidden pointer-events-none">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent transform origin-center animate-spin" style={{ animationDuration: '4s' }} />
      </div>

      <div className="relative z-10 max-w-lg w-full flex flex-col items-center text-center space-y-6">
        {/* Cabecera del Centro de Comando */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Precarga de Assets & Rendimiento Táctico
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">{mapName}</h2>
          <p className="text-xs font-mono text-slate-400">
            Optimizando búferes de memoria, canal de audio analógico y atlas de 16-bit
          </p>
        </div>

        {/* Barra de Progreso con Porcentaje */}
        <div className="w-full space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              {progress.currentAsset}
            </span>
            <span className="text-emerald-400 font-bold">{progress.percentage}%</span>
          </div>

          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 rounded-full transition-all duration-200 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Terminal de Diagnósticos de Carga */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded p-3 text-left font-mono text-[11px] h-28 overflow-hidden space-y-1 shadow-inner">
          <div className="text-slate-500 flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" /> REGISTRO DE E/S DE MOTOR
            </span>
            <span className="text-[10px] text-emerald-400/80">60 FPS CACHED</span>
          </div>
          <div className="space-y-0.5 pt-1">
            {diagnosticsLogs.map((log, idx) => (
              <div key={idx} className="text-slate-300 truncate">
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Botón de Acción / Confirmación al Estar Listo */}
        <div className="pt-2 w-full">
          {isReady ? (
            <button
              onClick={handleStartBattle}
              className="w-full py-3 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              COMANDANTE: ENTRAR AL CAMPO DE BATALLA
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400 py-3">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Sincronizando banco de sprites tácticos...
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" /> Web Audio API 16-bit
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-slate-400" /> Cero 404s (Procedural Atlas)
          </span>
        </div>
      </div>
    </div>
  );
};

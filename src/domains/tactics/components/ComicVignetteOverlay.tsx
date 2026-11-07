import React, { useState, useEffect } from 'react';
import {
  barkEngine,
  ActiveBarkDisplay,
  BubbleShape,
  OnomatopoeiaStamp,
  VignetteMood,
} from '@domains/game-feel';
import { audioManager } from '@domains/game-feel';
import { X, Sparkles, Radio, Shield, Zap, Flame, Star } from 'lucide-react';

interface ComicVignetteOverlayProps {
  onDismiss?: () => void;
  overrideBark?: ActiveBarkDisplay | null;
}

export const ComicVignetteOverlay: React.FC<ComicVignetteOverlayProps> = ({
  onDismiss,
  overrideBark,
}) => {
  const [currentBark, setCurrentBark] = useState<ActiveBarkDisplay | null>(overrideBark || null);
  const [progress, setProgress] = useState<number>(100);

  useEffect(() => {
    if (overrideBark !== undefined) {
      setCurrentBark(overrideBark);
      return;
    }

    const unsubscribe = barkEngine.subscribe(bark => {
      setCurrentBark(bark);
      if (bark) {
        setProgress(100);
        // Efecto de sonido táctico según el estilo del diálogo
        if (bark.bubbleShape === 'shout') {
          audioManager.playSFX('co_power');
        } else if (bark.bubbleShape === 'radio') {
          audioManager.playSFX('unit_order');
        } else if (bark.bubbleShape === 'panic') {
          audioManager.playSFX('explosion');
          if (typeof window !== 'undefined' && (window as any).__TRIGGER_TACTICAL_SHAKE__) {
            try { (window as any).__TRIGGER_TACTICAL_SHAKE__(); } catch {}
          }
        } else {
          audioManager.playSFX('unit_select');
        }
      }
    });

    return () => unsubscribe();
  }, [overrideBark]);

  // Barra de progreso del tiempo de vida en pantalla
  useEffect(() => {
    if (!currentBark) return;

    const interval = 50;
    const totalSteps = currentBark.durationMs / interval;
    const decrement = 100 / totalSteps;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return Math.max(0, prev - decrement);
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentBark]);

  if (!currentBark) return null;

  const handleClose = () => {
    barkEngine.clearActiveBark();
    if (onDismiss) onDismiss();
  };

  // Renderizador de formas de bocadillo de diálogo (Taxonomía Canónica)
  const renderBubbleWrapper = (children: React.ReactNode, shape: BubbleShape) => {
    switch (shape) {
      case 'panic':
        return (
          <div className="relative p-5 bg-[#991B1B] text-[#F2E8D5] font-black border-4 border-[#EF4444] shadow-[8px_8px_0px_#0A0B08] animate-pulse">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[14px] border-r-[#EF4444]" />
            <div className="text-[10px] uppercase font-mono tracking-widest text-amber-300 mb-1 flex items-center gap-1 font-black">
              <span>⚠️ ALERTA MÁXIMA DEFCON 1</span>
            </div>
            {children}
          </div>
        );

      case 'shout':
        return (
          <div className="relative p-5 bg-[#C46A3A] text-white font-bold border-4 border-yellow-300 shadow-[8px_8px_0px_#0A0B08] animate-pulse">
            {/* Puntas de explosión cómics */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[14px] border-r-yellow-300" />
            {children}
          </div>
        );

      case 'thought':
        return (
          <div className="relative p-5 bg-[#F2E8D5] text-[#2B2C24] font-semibold border-4 border-[#7B8A4A] rounded-[30px] shadow-[8px_8px_0px_#0A0B08]">
            {/* Burbujas flotantes de pensamiento */}
            <div className="absolute -left-4 bottom-2 w-3.5 h-3.5 rounded-full bg-[#F2E8D5] border-2 border-[#7B8A4A]" />
            <div className="absolute -left-7 bottom-0 w-2 h-2 rounded-full bg-[#F2E8D5] border-2 border-[#7B8A4A]" />
            {children}
          </div>
        );

      case 'whisper':
        return (
          <div className="relative p-4 bg-[#2B2C24]/90 text-[#F2E8D5] border-4 border-dashed border-[#7B8A4A] rounded-2xl shadow-[6px_6px_0px_#0A0B08] backdrop-blur-sm">
            <div className="text-[10px] uppercase font-mono tracking-widest text-[#7B8A4A] mb-1 flex items-center gap-1">
              <span>● SUSURRO DE EMBOSCADA</span>
            </div>
            {children}
          </div>
        );

      case 'radio':
        return (
          <div className="relative p-5 bg-[#2B2C24] text-[#F2E8D5] border-4 border-[#7B8A4A] shadow-[8px_8px_0px_#0A0B08]">
            {/* Efecto de estática y líneas de barrido militar */}
            <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/40">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>FREC. MILITAR COM</span>
            </div>
            {children}
          </div>
        );

      case 'speech':
      default:
        return (
          <div className="relative p-5 bg-[#F2E8D5] text-[#2B2C24] font-medium border-4 border-[#7B8A4A] rounded-[40px_10px_40px_10px] shadow-[8px_8px_0px_#0A0B08]">
            {/* Cola curva tradicional de bocadillo */}
            <div className="absolute -left-3 top-6 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[12px] border-r-[#7B8A4A]" />
            {children}
          </div>
        );
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-xl w-full pointer-events-auto transition-all duration-300 tactical-spring-bounce">
      {/* Contenedor Principal: Skill retro-futurism (Aerodinámico Atompunk con sombra dura) */}
      <div
        className="relative bg-[#46521F] border-4 border-[#7B8A4A] shadow-[12px_12px_0px_#0A0B08] rounded-[40px_10px_40px_10px] p-5 overflow-hidden"
        style={{
          fontFamily: "'Futura', 'Trebuchet MS', sans-serif",
        }}
      >
        {/* Trama Ben-Day Dot Pattern en el fondo (Halftone de Historieta) */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#F2E8D5 1.5px, transparent 1.5px)',
            backgroundSize: '10px 10px',
          }}
        />

        {/* Barra Superior Decorativa estilo Googie Chrome */}
        <div className="flex items-center justify-between border-b-2 border-[#7B8A4A]/60 pb-2 mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#C46A3A] border border-[#F2E8D5]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#F2E8D5] drop-shadow-[1px_1px_0px_#2B2C24]">
              {currentBark.commanderTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Medidor de Vínculo de Camaradería (Estrellas 1 a 10) */}
            <div className="flex items-center gap-0.5 bg-[#2B2C24] px-2 py-0.5 rounded border border-[#7B8A4A]/50">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-mono font-bold text-amber-300">
                VÍNCULO N{currentBark.bondingLevel}
              </span>
            </div>

            <button
              onClick={handleClose}
              className="tactical-btn-press text-[#F2E8D5] hover:text-[#C46A3A] p-1 transition-colors cursor-pointer"
              title="Cerrar Viñeta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo de la Viñeta: Retrato + Bocadillo Dinámico */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Retrato del Comandante en Marco Metálico */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[20px_5px_20px_5px] border-4 border-[#7B8A4A] bg-[#2B2C24] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.5)] relative">
              <img
                src={currentBark.portraitUrl}
                alt={currentBark.commanderName}
                className="w-full h-full object-cover object-top filter contrast-125"
                onError={e => {
                  // Fallback si la imagen no carga
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2346521F"/><text x="50" y="55" font-size="32" text-anchor="middle" fill="%23F2E8D5" font-family="monospace">★</text></svg>';
                }}
              />
              {/* Badge de Facción en la base */}
              <div className="absolute bottom-0 inset-x-0 bg-[#2B2C24]/90 text-[9px] font-bold text-center uppercase tracking-wider text-[#F2E8D5] py-0.5 border-t border-[#7B8A4A]">
                {currentBark.commanderId}
              </div>
            </div>

            <span className="text-xs font-bold text-[#F2E8D5] mt-1.5 drop-shadow-[1px_1px_0px_#2B2C24]">
              {currentBark.commanderName}
            </span>
          </div>

          {/* Área del Diálogo: Bocadillo */}
          <div className="flex-1 w-full relative">
            {renderBubbleWrapper(
              <div>
                <p className="text-sm sm:text-base leading-snug tracking-wide">
                  "{currentBark.text}"
                </p>
              </div>,
              currentBark.bubbleShape
            )}

            {/* Sello Pop-Art de Onomatopeya (Rotado, Sombra Dura y Reborde Negro) */}
            {currentBark.onomatopoeia && (
              <div
                className="tactical-spring-bounce absolute -top-3 -right-3 sm:-right-4 px-3 py-1 bg-[#C46A3A] text-yellow-300 font-extrabold text-sm sm:text-base tracking-wider border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] uppercase select-none pointer-events-none"
                style={{
                  transform: `rotate(${currentBark.stampRotationDeg}deg)`,
                  textShadow: '2px 2px 0px #000, -1px -1px 0px #000',
                }}
              >
                {currentBark.onomatopoeia}
              </div>
            )}
          </div>
        </div>

        {/* Barra de Progreso de Tiempo (Cuenta regresiva antes de auto-cerrarse) */}
        <div className="mt-4 pt-2 border-t border-[#7B8A4A]/40 flex items-center justify-between text-[10px] text-[#F2E8D5]/80 font-mono">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Transmisión Táctica Activa</span>
          </span>
          <span>Click para descartar</span>
        </div>
        <div className="w-full bg-[#2B2C24] h-1.5 rounded-full overflow-hidden mt-1 border border-[#7B8A4A]/50">
          <div
            className="h-full bg-[#C46A3A] transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

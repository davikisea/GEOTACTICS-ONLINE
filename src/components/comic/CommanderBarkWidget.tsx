/**
 * ==============================================================================
 * COMMANDER BARK WIDGET (ESQUINA INFERIOR IZQUIERDA - NOVELA GRÁFICA REACTIVA)
 * ==============================================================================
 * Conforme a @tactical-command-intel y especificación canónica:
 * - Retrato reactivo del Comandante Táctico en viñeta cómic con tramas Ben-Day.
 * - CERO actores de voz: 100% narrativo gráfico/texto de alta velocidad.
 * - Reacción clic a clic: responde a toques directos y a eventos del teatro geopolítico.
 * - 5 Morfologías de Bocadillo: 'radio', 'panic', 'thought', 'shout', 'whisper'.
 * - Sellos Pop-Art tipográficos angulados (¡¡ORDEN RECIBIDA!!, ¡TRAP!, ¡DEFCON 1!).
 * ==============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, AlertTriangle, Shield, Zap, Sparkles, MessageSquare } from 'lucide-react';
import {
  CANONICAL_CO_REGISTRY,
  COId,
  CO_FACTION_META,
  resolveCanonicalCOId,
  getCOFullBodyUrl,
} from '../../engine/coSystem';
import { audioManager } from '../../engine/audioManager';

export type BarkBalloonType = 'radio' | 'panic' | 'thought' | 'shout' | 'whisper';

export interface BarkMessage {
  id: string;
  text: string;
  balloonType: BarkBalloonType;
  stamp?: string; // Sello pop-art opcional (ej. "¡¡BAJO FUEGO!!", "¡AFIRMATIVO!")
  durationMs?: number;
}

export interface CommanderBarkWidgetProps {
  commanderId?: COId | string;
  externalMessage?: BarkMessage | null;
  onClearExternalMessage?: () => void;
  className?: string;
  selectedSectorName?: string | null;
}

const DEFAULT_DOCTRINE_BARKS: Record<string, BarkMessage[]> = {
  stella: [
    { id: 'st1', text: 'Consola C4ISR operativa. Monitoreando teatro de Venezuela.', balloonType: 'radio', stamp: 'ESTADO MAYOR' },
    { id: 'st2', text: 'El control de la Capital Caracas proyecta +15% de energía y +10% en forja de tanques.', balloonType: 'thought' },
    { id: 'st3', text: 'Mantén las líneas de suministro abiertas; no sobrecargues el límite imperial.', balloonType: 'radio' },
    { id: 'st4', text: '¡Coordenadas confirmadas! Despliegue listo para el frente.', balloonType: 'shout', stamp: '¡¡AUTORIZADO!!' },
  ],
  rachel: [
    { id: 'rc1', text: '¡Reportándose al servicio! ¿Cuál es la siguiente provincia a asegurar?', balloonType: 'shout', stamp: '¡LISTA!' },
    { id: 'rc2', text: 'La infantería ligera y los jeeps de reconocimiento son infinitos. ¡Nunca te quedes sin tropas!', balloonType: 'radio' },
    { id: 'rc3', text: '¡Alerta de asedio en frontera! Si no acudimos en 120s la IA tomará el mando.', balloonType: 'panic', stamp: '¡¡DEFCON 1!!' },
  ],
  andy: [
    { id: 'an1', text: '¡Las herramientas de reparación están a tope! Misiles y blindados listos.', balloonType: 'shout', stamp: '¡VAMOS!' },
    { id: 'an2', text: 'Si un tanque cae, refundimos el 35% de chatarra en los Altos Hornos.', balloonType: 'thought' },
  ],
};

export const CommanderBarkWidget: React.FC<CommanderBarkWidgetProps> = ({
  commanderId = 'stella',
  externalMessage = null,
  onClearExternalMessage,
  className = '',
  selectedSectorName,
}) => {
  const canonicalId = resolveCanonicalCOId(commanderId as COId);
  const activeCO = CANONICAL_CO_REGISTRY[canonicalId] ?? CANONICAL_CO_REGISTRY.stella;
  const factionMeta = CO_FACTION_META[activeCO.faction];
  const fullBodyUrl = getCOFullBodyUrl(activeCO.id);

  const [activeBark, setActiveBark] = useState<BarkMessage>({
    id: 'init',
    text: `Consola de Mando activa. Oficial al mando: ${activeCO.name}.`,
    balloonType: 'radio',
    stamp: 'C4ISR ONLINE',
  });

  const [clickCounter, setClickCounter] = useState(0);
  const [isSquashing, setIsSquashing] = useState(false);
  const barkTimerRef = useRef<number | null>(null);

  // Reaccionar a mensajes externos (eventos del mapa o clics en el juego)
  useEffect(() => {
    if (externalMessage) {
      setActiveBark(externalMessage);
      if (barkTimerRef.current) clearTimeout(barkTimerRef.current);
      barkTimerRef.current = window.setTimeout(() => {
        onClearExternalMessage?.();
      }, externalMessage.durationMs ?? 6000);
    }
  }, [externalMessage, onClearExternalMessage]);

  // Reaccionar a cambio de sector seleccionado en el mapa
  useEffect(() => {
    if (selectedSectorName) {
      setActiveBark({
        id: `sel_${Date.now()}`,
        text: `Fijando telemetría sobre ${selectedSectorName}. Estado de búnker y recursos en pantalla.`,
        balloonType: 'radio',
        stamp: 'SECTOR FIJADO',
      });
    }
  }, [selectedSectorName]);

  // Manejador de clic directo sobre el comandante (reacción inmediata)
  const handleCommanderClick = () => {
    audioManager.play('menu_select');
    setIsSquashing(true);
    setTimeout(() => setIsSquashing(false), 160);

    const barksList = DEFAULT_DOCTRINE_BARKS[canonicalId] ?? DEFAULT_DOCTRINE_BARKS.stella;
    const nextIndex = (clickCounter + 1) % barksList.length;
    setClickCounter(nextIndex);
    setActiveBark(barksList[nextIndex]);
  };

  // Renderizador del bocadillo según su morfología
  const renderBalloon = () => {
    const { balloonType, text, stamp } = activeBark;

    let containerStyle = 'bg-[#2B2C24] border-2 border-[#7B8A4A] text-[#F2E8D5]';
    let stampBg = 'bg-yellow-400 text-black';

    switch (balloonType) {
      case 'panic':
        containerStyle = 'bg-[#451212] border-2 border-[#EF4444] text-[#FEE2E2] animate-pulse';
        stampBg = 'bg-red-600 text-white animate-bounce';
        break;
      case 'shout':
        containerStyle = 'bg-[#C46A3A] border-2 border-[#F2E8D5] text-[#F2E8D5] shadow-[4px_4px_0px_#0A0B08]';
        stampBg = 'bg-amber-300 text-black';
        break;
      case 'thought':
        containerStyle = 'bg-[#F2E8D5] border-2 border-[#46521F] text-[#161712] shadow-[3px_3px_0px_#0A0B08]';
        stampBg = 'bg-[#46521F] text-white';
        break;
      case 'whisper':
        containerStyle = 'bg-[#1F201A] border-2 border-dashed border-[#7B8A4A] text-[#CBD5E1]';
        stampBg = 'bg-slate-700 text-gray-200';
        break;
      case 'radio':
      default:
        containerStyle = 'bg-[#1E2019] border-2 border-[#00FF66] text-[#F2E8D5] shadow-[3px_3px_0px_#0A0B08]';
        stampBg = 'bg-[#00FF66] text-black';
        break;
    }

    return (
      <motion.div
        key={activeBark.id + activeBark.text}
        initial={{ opacity: 0, y: 10, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 380, damping: 25 }}
        className={`relative p-2.5 rounded-[12px_4px_12px_4px] max-w-[280px] sm:max-w-[320px] mb-2 pointer-events-auto ${containerStyle}`}
      >
        {/* Sello Pop-Art Angulado */}
        {stamp && (
          <div
            className={`inline-block px-2 py-0.5 mb-1.5 font-black text-[9px] uppercase tracking-widest border border-black shadow-[2px_2px_0px_#000] rotate-[-4deg] ${stampBg}`}
          >
            {stamp}
          </div>
        )}

        {/* Texto del Bocadillo */}
        <p className="font-mono text-xs leading-snug font-bold select-none">
          {text}
        </p>

        {/* Indicador de Transmisión */}
        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-white/10 text-[9px] opacity-75 font-mono">
          <span className="flex items-center gap-1 uppercase tracking-wider">
            <Radio className="w-2.5 h-2.5 text-[#00FF66] animate-pulse" />
            {activeCO.name}
          </span>
          <span className="text-[8px] uppercase">{balloonType}</span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`fixed bottom-3 left-3 z-30 flex flex-col items-start pointer-events-none ${className}`}>
      {/* 1. Bocadillo Reactivo */}
      <AnimatePresence mode="wait">
        {renderBalloon()}
      </AnimatePresence>

      {/* 2. Viñeta Cómic del Comandante (Clickable) */}
      <button
        type="button"
        onClick={handleCommanderClick}
        className="pointer-events-auto group relative flex items-center gap-2 p-1 bg-[#2B2C24] hover:bg-[#383A2E] border-2 border-[#7B8A4A] rounded-[14px_4px_14px_4px] shadow-[4px_4px_0px_#0A0B08] cursor-pointer transition-transform select-none active:scale-95"
        title="Haz clic para consultar doctrina militar"
        style={{
          transform: isSquashing ? 'scale(1.08, 0.92)' : 'scale(1)',
        }}
      >
        {/* Marco Ben-Day del Retrato */}
        <div className="relative w-12 h-12 rounded-[10px_2px_10px_2px] overflow-hidden bg-[#161712] border border-[#46521F] ben-day-dark shrink-0">
          <img
            src={fullBodyUrl}
            alt={activeCO.name}
            className="w-full h-full object-cover object-top filter brightness-105 group-hover:scale-110 transition-transform duration-200"
            onError={(e) => {
              // Fallback si no carga la imagen
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 border border-black/40 pointer-events-none" />
        </div>

        {/* Metadatos Rápidos */}
        <div className="flex flex-col pr-2 text-left">
          <span className="text-[9px] font-black uppercase tracking-wider text-[#7B8A4A] leading-tight">
            OFICIAL AL MANDO
          </span>
          <span className="font-black text-xs text-[#F2E8D5] uppercase tracking-wide leading-tight group-hover:text-yellow-400">
            {activeCO.name}
          </span>
          <span className="text-[8px] font-mono text-[#00FF66] font-bold">
            DOCTRINA C4ISR // ONLINE
          </span>
        </div>
      </button>
    </div>
  );
};

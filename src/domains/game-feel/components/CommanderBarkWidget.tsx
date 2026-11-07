/**
 * ==============================================================================
 * COMMANDER BARK WIDGET (ESQUINA INFERIOR IZQUIERDA - NOVELA GRÁFICA REACTIVA)
 * ==============================================================================
 * Conforme a @tactical-command-intel y especificación canónica:
 * - Personaje integrado en la esquina inferior izquierda del mapa (Mayor Stella por defecto).
 * - CERO cajas blancas invasivas: recorte transparente diegético con sombra dura cómic.
 * - CERO actores de voz: 100% narrativo gráfico/texto de alta velocidad (Bark Engine).
 * - Reacción clic a clic: responde con Squash & Stretch, SFX de radio y nuevas directivas.
 * - 5 Morfologías de Bocadillo: 'radio', 'panic', 'thought', 'shout', 'whisper'.
 * - Sellos Pop-Art tipográficos angulados (ESTADO MAYOR, ¡¡AUTORIZADO!!, SECTOR FIJADO).
 * - Placa base militar con badge de facción y acceso al Dossier de Oficiales [C].
 * ==============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Users, Sparkles, MessageSquare } from 'lucide-react';
import {
  CANONICAL_CO_REGISTRY,
  COId,
  CO_FACTION_META,
  resolveCanonicalCOId,
  getCOFullBodyUrl,
} from '@domains/tactics';
import { audioManager } from '../core/audioManager';

export type BarkBalloonType = 'radio' | 'panic' | 'thought' | 'shout' | 'whisper';

export interface BarkMessage {
  id: string;
  text: string;
  balloonType: BarkBalloonType;
  stamp?: string; // Sello pop-art opcional (ej. "¡¡AUTORIZADO!!", "ESTADO MAYOR")
  durationMs?: number;
}

export interface CommanderBarkWidgetProps {
  commanderId?: COId | string;
  externalMessage?: BarkMessage | null;
  onClearExternalMessage?: () => void;
  className?: string;
  selectedSectorName?: string | null;
  onOpenDossier?: () => void;
}

const DEFAULT_DOCTRINE_BARKS: Record<string, BarkMessage[]> = {
  stella: [
    { id: 'st1', text: 'Consola C4ISR operativa. Monitoreando teatro de operaciones.', balloonType: 'radio', stamp: 'ESTADO MAYOR' },
    { id: 'st2', text: 'El control de la Capital proyecta +15% de energía y +10% en forja de blindados.', balloonType: 'thought', stamp: 'ESTRATEGIA' },
    { id: 'st3', text: 'Mantén las líneas de suministro abiertas; no sobrecargues el límite del ejército.', balloonType: 'radio', stamp: 'LOGÍSTICA' },
    { id: 'st4', text: '¡Coordenadas confirmadas! Tropas de vanguardia listas para el despliegue.', balloonType: 'shout', stamp: '¡¡AUTORIZADO!!' },
    { id: 'st5', text: 'La infantería captura bases clave; los jeeps aseguran la niebla de guerra.', balloonType: 'radio', stamp: 'DOCTRINA' },
  ],
  rachel: [
    { id: 'rc1', text: '¡Reportándose al servicio! ¿Cuál es la siguiente provincia a asegurar?', balloonType: 'shout', stamp: '¡LISTA!' },
    { id: 'rc2', text: 'La infantería ligera y los jeeps de reconocimiento son infinitos. ¡Nunca te quedes sin tropas!', balloonType: 'radio', stamp: 'SUMINISTRO' },
    { id: 'rc3', text: '¡Alerta de asedio en frontera! Si no acudimos en 120s la IA tomará el mando.', balloonType: 'panic', stamp: '¡¡DEFCON 1!!' },
  ],
  andy: [
    { id: 'an1', text: '¡Las herramientas de reparación están a tope! Misiles y blindados listos.', balloonType: 'shout', stamp: '¡VAMOS!' },
    { id: 'an2', text: 'Si un tanque cae, refundimos el 35% de chatarra en los Altos Hornos.', balloonType: 'thought', stamp: 'FORJA' },
  ],
};

export const CommanderBarkWidget: React.FC<CommanderBarkWidgetProps> = ({
  commanderId = 'stella',
  externalMessage = null,
  onClearExternalMessage,
  className = '',
  selectedSectorName,
  onOpenDossier,
}) => {
  const canonicalId = resolveCanonicalCOId(commanderId as COId);
  const activeCO = CANONICAL_CO_REGISTRY[canonicalId] ?? CANONICAL_CO_REGISTRY.stella;
  const factionMeta = CO_FACTION_META[activeCO.faction];
  const fullBodyUrl = getCOFullBodyUrl(activeCO.id);

  const [activeBark, setActiveBark] = useState<BarkMessage>({
    id: 'init',
    text: `Consola de Mando activa. Oficial de Vanguardia: ${activeCO.name}.`,
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

  // Atajo de teclado [C] para abrir el Dossier de Oficiales si está disponible
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === 'c' || e.key === 'C') && onOpenDossier) {
        audioManager.playHoverTick();
        onOpenDossier();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenDossier]);

  // Manejador de clic directo sobre el comandante (Squash & Stretch + Bark + SFX)
  const handleCommanderClick = () => {
    audioManager.playHoverTick();
    setIsSquashing(true);
    setTimeout(() => setIsSquashing(false), 160);

    const barksList = DEFAULT_DOCTRINE_BARKS[canonicalId] ?? DEFAULT_DOCTRINE_BARKS.stella;
    const nextIndex = (clickCounter + 1) % barksList.length;
    setClickCounter(nextIndex);
    setActiveBark(barksList[nextIndex]);
  };

  // Renderizador de Bocadillo Dinámico según su Morfología Táctica Cómic
  const renderBalloon = () => {
    const { balloonType, text, stamp } = activeBark;

    let containerStyle = 'bg-[#1E2019]/95 border-2 border-[#00FF66] text-[#F2E8D5] shadow-[4px_4px_0px_#0A0B08]';
    let stampBg = 'bg-[#00FF66] text-black';

    switch (balloonType) {
      case 'panic':
        containerStyle = 'bg-[#3A1414]/95 border-2 border-[#EF4444] text-[#FEE2E2] shadow-[4px_4px_0px_#0A0B08] animate-pulse';
        stampBg = 'bg-red-600 text-white';
        break;
      case 'shout':
        containerStyle = 'bg-[#C46A3A]/95 border-2 border-[#F2E8D5] text-[#F2E8D5] shadow-[4px_4px_0px_#0A0B08]';
        stampBg = 'bg-amber-300 text-black';
        break;
      case 'thought':
        containerStyle = 'bg-[#2B2C24]/95 border-2 border-[#F59E0B] text-[#F2E8D5] shadow-[4px_4px_0px_#0A0B08]';
        stampBg = 'bg-amber-400 text-black';
        break;
      case 'whisper':
        containerStyle = 'bg-[#161712]/95 border-2 border-dashed border-[#7B8A4A] text-[#CBD5E1] shadow-[3px_3px_0px_#0A0B08]';
        stampBg = 'bg-slate-700 text-gray-200';
        break;
      case 'radio':
      default:
        containerStyle = 'bg-[#1E2019]/95 border-2 border-[#00FF66] text-[#F2E8D5] shadow-[4px_4px_0px_#0A0B08]';
        stampBg = 'bg-[#00FF66] text-black';
        break;
    }

    return (
      <motion.div
        key={activeBark.id + activeBark.text}
        initial={{ opacity: 0, y: 12, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        className={`relative p-2.5 sm:p-3 rounded-[12px_4px_12px_4px] max-w-[280px] sm:max-w-[340px] mb-2 pointer-events-auto backdrop-blur-sm ${containerStyle}`}
        onClick={handleCommanderClick}
        title="Haz clic para solicitar una nueva directiva táctica"
      >
        {/* Sello Pop-Art Angulado */}
        {stamp && (
          <div
            className={`inline-block px-2 py-0.5 mb-1 font-display font-black text-[9px] sm:text-[10px] uppercase tracking-widest border border-black shadow-[2px_2px_0px_#000] rotate-[-4deg] select-none ${stampBg}`}
          >
            ★ {stamp}
          </div>
        )}

        {/* Texto del Bocadillo */}
        <p className="font-mono text-xs sm:text-[13px] leading-snug font-bold select-none cursor-pointer">
          “{text}”
        </p>

        {/* Indicador de Transmisión Diegética */}
        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-white/10 text-[9px] font-mono text-[#A9B87A]">
          <span className="flex items-center gap-1 uppercase font-bold text-amber-300">
            <Radio className="w-2.5 h-2.5 text-[#00FF66] animate-pulse" />
            {activeCO.name}
          </span>
          <span className="text-[8px] uppercase tracking-widest text-[#7B8A4A]">
            CANAL C4ISR
          </span>
        </div>

        {/* Cola Cómic apuntando hacia el comandante */}
        <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#00FF66]" />
      </motion.div>
    );
  };

  return (
    <div
      className={`fixed bottom-2.5 left-3 z-30 flex flex-col items-start pointer-events-none ${className}`}
      aria-label="Oficial al Mando de Vanguardia (Bark Engine)"
    >
      {/* 1. Bocadillo Reactivo del Bark Engine */}
      <AnimatePresence mode="wait">
        {renderBalloon()}
      </AnimatePresence>

      {/* 2. Personaje Recortado e Integrado (Mayor Stella / CO Activo) */}
      <div className="pointer-events-auto relative flex flex-col items-start group">
        {/* Halo Diegético de Facción (Sin caja blanca: silueta transparente con profundidad) */}
        <div
          className="absolute -bottom-1 -left-1 w-32 h-32 rounded-full blur-xl opacity-35 pointer-events-none transition-colors duration-300"
          style={{ backgroundColor: factionMeta.primaryHex }}
        />

        {/* Figura del Comandante Recortada con Respiración Idle y Squash & Stretch */}
        <button
          type="button"
          onClick={handleCommanderClick}
          className="relative z-10 flex items-end justify-center cursor-pointer select-none focus:outline-none transition-transform"
          title={`Interrogar a ${activeCO.name} para obtener directivas de vanguardia`}
          style={{
            transform: isSquashing ? 'scale(1.08, 0.92)' : 'scale(1, 1)',
            transition: isSquashing
              ? 'transform 0.08s cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <img
            src={fullBodyUrl}
            alt={`${activeCO.name} - Oficial de Vanguardia`}
            className="h-[170px] sm:h-[210px] w-auto object-contain object-bottom drop-shadow-[5px_5px_0px_#0A0B08] filter brightness-105 group-hover:scale-105 transition-transform duration-200 co-idle-breathe"
            draggable={false}
            onError={(e) => {
              // Fallback seguro si la imagen tardara en cargar
              (e.target as HTMLElement).style.display = 'none';
            }}
          />

          {/* Prompt flotante sutil al pasar el cursor */}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-[#0A0B08]/90 text-amber-300 border border-amber-400 font-mono font-black text-[9px] uppercase tracking-wider shadow-[2px_2px_0px_#000] pointer-events-none whitespace-nowrap z-20">
            [CLIC // DIRECTIVA]
          </span>
        </button>

        {/* 3. Placa Base Militar Diegética a los pies del Personaje */}
        <div className="relative z-20 -mt-2.5 flex items-center gap-1.5 p-1 px-2 rounded-[8px_2px_8px_2px] bg-[#1E2019]/95 border-2 border-[#0A0B08] shadow-[4px_4px_0px_#0A0B08] backdrop-blur text-left">
          {/* Badge de Facción Heráldico */}
          <span
            className={`px-1.5 py-0.5 rounded-[4px_1px_4px_1px] font-display font-black text-[10px] uppercase border border-[#0A0B08] text-white ${
              activeCO.faction === 'orange-star'
                ? 'bg-[#E65100]'
                : activeCO.faction === 'blue-moon'
                ? 'bg-blue-600'
                : activeCO.faction === 'green-earth'
                ? 'bg-emerald-700'
                : activeCO.faction === 'yellow-comet'
                ? 'bg-amber-600'
                : 'bg-purple-800'
            }`}
          >
            ★ {factionMeta.shortCode.split(' ')[0]}
          </span>

          {/* Nombre del Comandante */}
          <div className="flex flex-col">
            <span className="font-display font-black text-xs text-[#F2E8D5] uppercase tracking-wide leading-none">
              {activeCO.name}
            </span>
            <span className="text-[8px] font-mono font-bold text-[#00FF66] tracking-wider leading-none mt-0.5">
              VANGUARDIA // ONLINE
            </span>
          </div>

          {/* Botón Acceso Rápido al Dossier [C] */}
          {onOpenDossier && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                audioManager.playHoverTick();
                onOpenDossier();
              }}
              title="Abrir Cuartel de Oficiales y cambiar comandante [Tecla C]"
              className="ml-1 px-1.5 py-0.5 rounded-[4px_1px_4px_1px] bg-[#2B2C24] hover:bg-amber-400 hover:text-black text-amber-300 border border-[#7B8A4A]/50 font-mono text-[9px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-1"
            >
              <Users className="w-2.5 h-2.5" />
              <span>[C]</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

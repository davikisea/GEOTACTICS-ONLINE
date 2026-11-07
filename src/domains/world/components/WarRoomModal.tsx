import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Sparkles, Shield, Zap } from 'lucide-react';
import { MatchFormat } from '@domains/tactics';
import { audioManager } from '@domains/game-feel';
import {
  ALL_CANONICAL_CO_IDS,
  CANONICAL_CO_REGISTRY,
  COId,
  CO_FACTION_META,
  STAR_CHARGE_VALUE,
  getCOFullBodyUrl,
  resolveCanonicalCOId,
} from '@domains/tactics';
import { TacticalGhostBar } from './TacticalGhostBar';

export interface PrizeItem {
  text: string;
  color: string;
  type: 'gold' | 'steel' | 'energy' | 'gems';
  amount: number;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
}

export interface WarRoomModalProps {
  activeModal: string | null;
  onClose: () => void;
  onDeploy: (format: MatchFormat) => void;
  onOpenBattleHQ: () => void;
  // Ruleta de Reabastecimiento
  wheelCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  isWheelSpinning: boolean;
  wheelAngle: number;
  wheelResultText: string | null;
  wonPrize: PrizeItem | null;
  onSpinWheel: () => void;
  // Modal Genérico
  genericModalData: { title: string; content: React.ReactNode } | null;
  // Cuartel de Oficiales / Dossier CO
  activeCommanderId?: COId;
  onSelectCommander?: (coId: COId) => void;
  commanderBondLevel?: number;
}

const RARITY_STYLES: Record<
  PrizeItem['rarity'],
  { label: string; badgeBg: string; border: string; stamp: string }
> = {
  COMMON: {
    label: 'SUMINISTRO ESTÁNDAR',
    badgeBg: 'bg-[#46521F] text-[#F2E8D5]',
    border: 'border-[#7B8A4A]',
    stamp: '¡SUMINISTRO!',
  },
  RARE: {
    label: 'CARGAMENTO TÁCTICO RARO',
    badgeBg: 'bg-sky-600 text-white',
    border: 'border-sky-400',
    stamp: '¡TACTICAL!',
  },
  EPIC: {
    label: 'RESERVA ÉPICA DEL ALTO MANDO',
    badgeBg: 'bg-purple-600 text-white',
    border: 'border-purple-400',
    stamp: '¡CLUTCH!',
  },
  LEGENDARY: {
    label: 'SUMINISTRO LEGENDARIO DE GUERRA',
    badgeBg: 'bg-amber-400 text-[#0A0B08]',
    border: 'border-amber-400',
    stamp: '¡¡JACKPOT!!',
  },
};

export const WarRoomModal: React.FC<WarRoomModalProps> = ({
  activeModal,
  onClose,
  onDeploy,
  onOpenBattleHQ,
  wheelCanvasRef,
  isWheelSpinning,
  wheelAngle,
  wheelResultText,
  wonPrize,
  onSpinWheel,
  genericModalData,
  activeCommanderId = 'andy',
  onSelectCommander,
  commanderBondLevel = 8,
}) => {
  const canonicalId = resolveCanonicalCOId(activeCommanderId);
  const activeCO = CANONICAL_CO_REGISTRY[canonicalId];
  const factionMeta = CO_FACTION_META[activeCO.faction];

  const handleCloseWithSound = () => {
    audioManager.playCue('ui_cancel_rollback');
    onClose();
  };

  return (
    <AnimatePresence>
      {activeModal && (
        <motion.div
          key={activeModal}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={handleCloseWithSound}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0B08]/80 backdrop-blur-sm p-4"
        >
          {/* ================================================================
              MODAL 1: SALA DE OPERACIONES DE GUERRA (3 TEATROS DE COMBATE)
             ================================================================ */}
          {activeModal === 'modal-battle-hq' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="tactical-comic-card p-6 max-w-3xl w-full bg-[#1F201A] border-2 border-[#0A0B08] shadow-[8px_8px_0px_#0A0B08] ben-day-dark relative"
            >
              <button
                type="button"
                onMouseEnter={() => audioManager.playHoverTick()}
                onClick={handleCloseWithSound}
                className="tactical-juice-btn absolute top-3 right-4 px-2.5 py-1 bg-[#2B2C24] border border-[#7B8A4A] hover:border-[#C46A3A] text-xs font-mono font-extrabold text-[#F2E8D5]"
              >
                [ESC // CERRAR ✕]
              </button>

              <div className="flex items-center gap-2.5 mb-1">
                <span className="px-2 py-0.5 bg-[#E65100] text-[#F2E8D5] font-display font-extrabold text-xs uppercase border border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08]">
                  C4ISR // DESPLIEGUE
                </span>
                <h2 className="text-xl font-display font-extrabold text-[#F2E8D5] uppercase tracking-wider">
                  SALA DE OPERACIONES DE GUERRA // TEATROS DE COMBATE
                </h2>
              </div>
              <p className="text-xs text-[#A9B87A] font-sans mb-5">
                Selecciona el frente operacional. Reloj Fischer determinista y Mazo Táctico de 10 Cartas activos.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* TEATRO 1: DUELO ESPEJO (15s - Orange Star Accent) */}
                <div className="tactical-comic-card bg-[#2B2C24] border-2 border-[#E65100] p-4 flex flex-col justify-between relative">
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-amber-400 text-[#0A0B08] font-display font-extrabold text-[10px] uppercase border-2 border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] rotate-[-3deg]">
                    ¡RECOMENDADO!
                  </span>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-[#E65100] text-[#F2E8D5] text-[10px] font-mono font-extrabold uppercase">
                        SIMÉTRICO
                      </span>
                      <span className="text-xs text-amber-400 font-mono font-extrabold tabular-nums">
                        15s / TURNO
                      </span>
                    </div>
                    <h3 className="text-base font-display font-extrabold text-[#F2E8D5] uppercase">
                      ⚔️ Duelo Espejo
                    </h3>
                    <p className="text-xs text-[#A9B87A] font-sans mt-1.5 leading-relaxed">
                      Micro-sesión competitiva de 3 minutos. Mapa 10×10, mazo idéntico Nivel 1 y AirDrops tácticos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onMouseEnter={() => audioManager.playHoverTick()}
                    onClick={() => onDeploy('mirror_duel')}
                    className="tactical-btn-heavy mt-4 w-full py-2.5 text-xs"
                  >
                    Desplegar Duelo (15s)
                  </button>
                </div>

                {/* TEATRO 2: ESCARAMUZA BLITZ (30s - Green Earth Accent) */}
                <div className="tactical-comic-card bg-[#2B2C24] border-2 border-[#15803D] p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-[#15803D] text-[#F2E8D5] text-[10px] font-mono font-extrabold uppercase">
                        ACELERADO 2.0X
                      </span>
                      <span className="text-xs text-amber-400 font-mono font-extrabold tabular-nums">
                        30s / TURNO
                      </span>
                    </div>
                    <h3 className="text-base font-display font-extrabold text-[#F2E8D5] uppercase">
                      ⚡ Escaramuza Blitz
                    </h3>
                    <p className="text-xs text-[#A9B87A] font-sans mt-1.5 leading-relaxed">
                      Mapa 16×16, economía acelerada 2.0x y despliegue libre con tu Mazo de 10 Cartas sin cooldowns.
                    </p>
                  </div>
                  <button
                    type="button"
                    onMouseEnter={() => audioManager.playHoverTick()}
                    onClick={() => onDeploy('blitz_skirmish')}
                    className="tactical-juice-btn mt-4 w-full py-2.5 bg-[#46521F] hover:bg-[#586827] text-[#F2E8D5] font-display font-extrabold text-xs uppercase tracking-wider border-2 border-[#F2E8D5]"
                  >
                    Desplegar Blitz (30s)
                  </button>
                </div>

                {/* TEATRO 3: GRAN CAMPAÑA TÁCTICA (60s - Blue Moon Accent) */}
                <div className="tactical-comic-card bg-[#2B2C24] border-2 border-[#1D4ED8] p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-[#1D4ED8] text-[#F2E8D5] text-[10px] font-mono font-extrabold uppercase">
                        GUERRA TOTAL
                      </span>
                      <span className="text-xs text-amber-400 font-mono font-extrabold tabular-nums">
                        60s / TURNO
                      </span>
                    </div>
                    <h3 className="text-base font-display font-extrabold text-[#F2E8D5] uppercase">
                      🎖️ Gran Campaña
                    </h3>
                    <p className="text-xs text-[#A9B87A] font-sans mt-1.5 leading-relaxed">
                      Maniobras combinadas en mapas masivos con Niebla de Guerra estricta y emboscadas TRAP.
                    </p>
                  </div>
                  <button
                    type="button"
                    onMouseEnter={() => audioManager.playHoverTick()}
                    onClick={() => onDeploy('grand_campaign')}
                    className="tactical-juice-btn mt-4 w-full py-2.5 bg-[#1D4ED8] hover:bg-blue-600 text-[#F2E8D5] font-display font-extrabold text-xs uppercase tracking-wider border-2 border-[#F2E8D5]"
                  >
                    Planificar Campaña (60s)
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================================================================
              MODAL 2: ROTOR MECÁNICO DE REABASTECIMIENTO (CEREMONIA 3 TIEMPOS)
             ================================================================ */}
          {activeModal === 'modal-ruleta' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="tactical-comic-card p-6 max-w-md w-full bg-[#1F201A] border-2 border-[#0A0B08] shadow-[8px_8px_0px_#0A0B08] ben-day-dark flex flex-col items-center relative"
            >
              <button
                type="button"
                onMouseEnter={() => audioManager.playHoverTick()}
                onClick={handleCloseWithSound}
                className="tactical-juice-btn absolute top-3 right-4 px-2 py-0.5 bg-[#2B2C24] border border-[#7B8A4A] text-xs font-mono font-bold text-[#F2E8D5]"
              >
                [ESC ✕]
              </button>

              <h3 className="text-lg font-display font-extrabold text-[#F2E8D5] uppercase tracking-wider mb-0.5">
                🎡 ROTOR DE REABASTECIMIENTO // C4ISR
              </h3>
              <p className="text-xs text-[#A9B87A] font-sans mb-3 text-center">
                Inducción mecánica de suministros tácticos con revelación por rareza.
              </p>

              {/* Ruleta en Canvas con Curva Elástica Arbitraria de Tailwind */}
              <div
                className={`relative w-64 h-64 flex items-center justify-center my-2 ${
                  isWheelSpinning ? 'animate-[pulse_0.6s_ease-in-out_infinite]' : ''
                }`}
              >
                <div className="absolute -top-3 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-[#C46A3A] filter drop-shadow-[0_2px_0px_#0A0B08]" />
                <canvas
                  ref={wheelCanvasRef}
                  width={240}
                  height={240}
                  className="rounded-full border-4 border-[#0A0B08] outline-2 outline-[#7B8A4A] shadow-[6px_6px_0px_#0A0B08] transition-transform duration-[4000ms] ease-[cubic-bezier(0.12,0.9,0.2,1)]"
                  style={{ transform: `rotate(${wheelAngle}deg)` }}
                />
                <div className="absolute w-10 h-10 rounded-full bg-[#161712] border-2 border-[#F2E8D5] shadow-[2px_2px_0px_#0A0B08] flex items-center justify-center text-sm font-black text-amber-400">
                  ★
                </div>
              </div>

              {/* Tiempo 3 de la Ceremonia: Tarjeta de Presentación por Rareza */}
              <AnimatePresence mode="wait">
                {wonPrize && !isWheelSpinning ? (
                  <motion.div
                    key={wonPrize.text}
                    initial={{ scale: 0.7, opacity: 0, rotate: -3 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 18 }}
                    className={`w-full my-2 p-3 rounded-[12px_3px_12px_3px] bg-[#2B2C24] border-2 ${
                      RARITY_STYLES[wonPrize.rarity].border
                    } shadow-[4px_4px_0px_#0A0B08] flex items-center justify-between relative`}
                  >
                    <div className="flex flex-col">
                      <span
                        className={`inline-block w-fit px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase ${
                          RARITY_STYLES[wonPrize.rarity].badgeBg
                        }`}
                      >
                        {RARITY_STYLES[wonPrize.rarity].label}
                      </span>
                      <span className="text-sm font-display font-extrabold text-[#F2E8D5] mt-1">
                        {wonPrize.text}
                      </span>
                    </div>
                    <span className="px-2 py-1 bg-yellow-400 text-[#0A0B08] font-display font-extrabold text-[10px] border-2 border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] rotate-[-6deg]">
                      {RARITY_STYLES[wonPrize.rarity].stamp}
                    </span>
                  </motion.div>
                ) : (
                  <div className="text-xs font-mono font-bold text-amber-300 my-2 h-8 flex items-center justify-center text-center">
                    {wheelResultText || 'ROTOR LISTO PARA INDUCCIÓN DIARIA'}
                  </div>
                )}
              </AnimatePresence>

              <button
                type="button"
                onMouseEnter={() => audioManager.playHoverTick()}
                onClick={onSpinWheel}
                disabled={isWheelSpinning}
                className={`tactical-btn-heavy px-6 py-2.5 text-xs mt-1 ${
                  isWheelSpinning ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {isWheelSpinning ? 'GIRANDO ROTOR...' : '¡ACTIVAR ROTOR DE SUMINISTROS!'}
              </button>
            </motion.div>
          )}

          {/* ================================================================
              MODAL 3: MAPA MUNDIAL DE RADARES POLARES (FRENTES ACTIVOS)
             ================================================================ */}
          {activeModal === 'modal-radar-map' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="tactical-comic-card p-6 max-w-xl w-full bg-[#1F201A] border-2 border-[#0A0B08] shadow-[8px_8px_0px_#0A0B08] relative"
            >
              <button
                type="button"
                onMouseEnter={() => audioManager.playHoverTick()}
                onClick={handleCloseWithSound}
                className="tactical-juice-btn absolute top-3 right-4 px-2 py-0.5 bg-[#2B2C24] border border-[#7B8A4A] text-xs font-mono font-bold text-[#F2E8D5]"
              >
                [ESC ✕]
              </button>

              <h3 className="text-lg font-display font-extrabold text-[#F2E8D5] uppercase tracking-wider mb-1">
                📡 RADAR TERRESTRE POLAR // FRENTES ACTIVOS
              </h3>
              <p className="text-xs text-[#A9B87A] font-sans mb-3">
                Telemetría satelital en tiempo real. Uso legítimo de fósforo CRT (#00FF66) para detección de escuadrones.
              </p>

              <div className="w-full h-52 rounded-[12px_3px_12px_3px] bg-[#0A0F0A] border-2 border-[#0A0B08] outline-1 outline-[#46521F] relative overflow-hidden flex items-center justify-center my-3 shadow-inner">
                <div className="absolute inset-4 border border-[#00993E]/30 rounded-full" />
                <div className="absolute inset-10 border border-[#00993E]/40 rounded-full" />
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#00993E]/50" />
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-[#00993E]/50" />

                <div className="absolute top-8 left-12 px-2 py-0.5 rounded bg-[#161712]/90 border border-[#00FF66] text-[10px] font-mono text-[#00FF66] font-extrabold">
                  ● SECTOR ALPHA (CONTROL ALIADO)
                </div>
                <div className="absolute bottom-9 right-10 px-2 py-0.5 rounded bg-[#161712]/90 border border-[#C46A3A] text-[10px] font-mono text-[#C46A3A] font-extrabold animate-pulse">
                  ▲ ARRECIFE OMEGA (INCURSIÓN BLUE MOON)
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onMouseEnter={() => audioManager.playHoverTick()}
                  onClick={() => {
                    audioManager.playSFX('button_click');
                    onOpenBattleHQ();
                  }}
                  className="tactical-btn-heavy px-5 py-2 text-xs"
                >
                  Abrir Sala de Operaciones
                </button>
              </div>
            </motion.div>
          )}

          {/* ================================================================
              MODAL 4: MODAL TÁCTICO GENÉRICO (SUMINISTROS, MISIONES, LOGROS)
             ================================================================ */}
          {activeModal === 'modal-generic' && genericModalData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="tactical-comic-card p-6 max-w-md w-full bg-[#1F201A] border-2 border-[#0A0B08] shadow-[8px_8px_0px_#0A0B08] ben-day-dark relative"
            >
              <button
                type="button"
                onMouseEnter={() => audioManager.playHoverTick()}
                onClick={handleCloseWithSound}
                className="tactical-juice-btn absolute top-3 right-4 px-2 py-0.5 bg-[#2B2C24] border border-[#7B8A4A] text-xs font-mono font-bold text-[#F2E8D5]"
              >
                [ESC ✕]
              </button>

              <h3 className="text-base font-display font-extrabold text-[#F2E8D5] uppercase tracking-wider mb-3 border-b border-[#7B8A4A]/40 pb-2">
                {genericModalData.title}
              </h3>

              <div className="mb-4 text-xs font-sans">{genericModalData.content}</div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onMouseEnter={() => audioManager.playHoverTick()}
                  onClick={handleCloseWithSound}
                  className="tactical-juice-btn px-4 py-1.5 bg-[#2B2C24] border-2 border-[#0A0B08] text-xs font-mono font-extrabold text-[#F2E8D5] hover:border-amber-400"
                >
                  Entendido [ESC]
                </button>
              </div>
            </motion.div>
          )}

          {/* ================================================================
              MODAL 5: CUARTEL DE OFICIALES // DOSSIER DE LOS 28 COMANDANTES
             ================================================================ */}
          {activeModal === 'modal-commander-dossier' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="tactical-comic-card p-5 sm:p-6 max-w-4xl w-full max-h-[88vh] overflow-y-auto bg-[#1F201A] border-4 border-[#0A0B08] shadow-[10px_10px_0px_#0A0B08] ben-day-dark relative"
            >
              <button
                type="button"
                onMouseEnter={() => audioManager.playHoverTick()}
                onClick={handleCloseWithSound}
                className="tactical-juice-btn absolute top-3 right-4 px-2.5 py-1 bg-[#2B2C24] border border-[#7B8A4A] hover:border-[#C46A3A] text-xs font-mono font-extrabold text-[#F2E8D5]"
              >
                [ESC // CERRAR ✕]
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <span className="px-2 py-0.5 bg-[#E65100] text-[#F2E8D5] font-display font-extrabold text-xs uppercase border border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08]">
                  WAR ROOM // 28 OFICIALES CANÓNICOS
                </span>
                <h2 className="text-lg sm:text-xl font-display font-extrabold text-[#F2E8D5] uppercase tracking-wider">
                  CUARTEL DE OFICIALES • DOSSIER DE COMANDO
                </h2>
              </div>

              {/* Ficha Técnica del Oficial Seleccionado */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-[18px_4px_18px_4px] bg-[#2B2C24] border-3 border-[#0A0B08] shadow-[6px_6px_0px_#0A0B08] mb-5">
                {/* Retrato Full Body en Marco Crema */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-[14px_4px_14px_4px] ben-day-cream border-2 border-[#0A0B08] shadow-[4px_4px_0px_#0A0B08] relative overflow-hidden">
                  <span
                    className={`self-start px-2 py-0.5 rounded-[4px_1px_4px_1px] font-display font-extrabold text-[10px] uppercase border border-[#0A0B08] mb-2 ${factionMeta.badgeBgClass}`}
                  >
                    {factionMeta.label}
                  </span>
                  <img
                    src={getCOFullBodyUrl(activeCO.id)}
                    alt={activeCO.name}
                    className="h-44 w-auto object-contain drop-shadow-[4px_4px_0px_#0A0B08]"
                  />
                  <div className="mt-2 text-center">
                    <div className="font-display font-black text-base uppercase text-[#0A0B08]">
                      {activeCO.name}
                    </div>
                    <div className="font-mono font-bold text-[10px] text-[#46521F] uppercase">
                      {activeCO.title}
                    </div>
                  </div>
                </div>

                {/* Pasivas D2D, COP, SCOP y Afinidad (Bonding 1-10) */}
                <div className="md:col-span-8 flex flex-col justify-between gap-3">
                  {/* Afinidad Bonding 1-10 */}
                  <div className="p-3 rounded-[10px_3px_10px_3px] bg-[#161712] border-2 border-[#0A0B08]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-display font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>AFINIDAD DE MANDO (BONDING NIVEL {commanderBondLevel}/10)</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-[#A9B87A]">
                        1★ = {STAR_CHARGE_VALUE.toLocaleString()}G VALOR COMBATE
                      </span>
                    </div>
                    <TacticalGhostBar
                      value={commanderBondLevel}
                      max={10}
                      heightClassName="h-3"
                      fillClassName="bg-gradient-to-r from-[#E65100] to-amber-400"
                      ghostClassName="bg-[#F2E8D5]"
                      label={`VÍNCULO ${commanderBondLevel * 10}%`}
                    />
                  </div>

                  {/* Doctrina Día a Día (D2D) */}
                  <div className="p-3 rounded-[10px_3px_10px_3px] bg-[#161712] border-2 border-[#7B8A4A]">
                    <div className="flex items-center gap-1.5 text-xs font-display font-extrabold text-[#F2E8D5] uppercase mb-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span>DOCTRINA DÍA A DÍA (PASIVA PERMANENTE D2D)</span>
                    </div>
                    <p className="text-xs text-[#A9B87A] font-sans leading-relaxed">
                      {activeCO.dayToDay.description}
                    </p>
                  </div>

                  {/* COP y SCOP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-[10px_3px_10px_3px] bg-[#161712] border-2 border-amber-400/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display font-extrabold text-xs text-amber-300 uppercase flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" />
                          <span>
                            COP: {activeCO.powers.cop ? activeCO.powers.cop.name : 'N/A'}
                          </span>
                        </span>
                        {activeCO.powers.cop && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-[#0A0B08] font-mono font-extrabold text-[10px]">
                            {activeCO.powers.cop.stars} ★ (
                            {(activeCO.powers.cop.stars * STAR_CHARGE_VALUE).toLocaleString()}G)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#F2E8D5] font-sans leading-snug">
                        {activeCO.powers.cop
                          ? activeCO.powers.cop.description
                          : 'Este comandante canaliza toda su barra estelar en su Superpoder SCOP.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-[10px_3px_10px_3px] bg-[#161712] border-2 border-[#C46A3A]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display font-extrabold text-xs text-[#F2E8D5] uppercase flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>SCOP: {activeCO.powers.scop.name}</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#C46A3A] text-[#F2E8D5] font-mono font-extrabold text-[10px]">
                          {activeCO.powers.scop.stars} ★ (
                          {(activeCO.powers.scop.stars * STAR_CHARGE_VALUE).toLocaleString()}G)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#F2E8D5] font-sans leading-snug">
                        {activeCO.powers.scop.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cuadrícula de Selección de los 28 Comandantes */}
              <div>
                <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-amber-300 mb-2">
                  SELECCIONAR OFICIAL EN JEFE ({ALL_CANONICAL_CO_IDS.length} DISPONIBLES):
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {ALL_CANONICAL_CO_IDS.map((coId) => {
                    const co = CANONICAL_CO_REGISTRY[coId];
                    const isSelected = coId === activeCO.id;
                    const fac = CO_FACTION_META[co.faction];
                    return (
                      <button
                        key={coId}
                        type="button"
                        onMouseEnter={() => audioManager.playHoverTick()}
                        onClick={() => {
                          audioManager.playSFX('button_click');
                          onSelectCommander?.(coId);
                        }}
                        className={`tactical-juice-btn p-2 flex flex-col items-center text-center border-2 ${
                          isSelected
                            ? 'bg-[#46521F] border-amber-400 text-[#F2E8D5]'
                            : 'bg-[#2B2C24] border-[#0A0B08] text-[#F2E8D5] hover:border-[#7B8A4A]'
                        }`}
                      >
                        <div
                          className="w-12 h-12 rounded-[8px_2px_8px_2px] border border-[#0A0B08] overflow-hidden mb-1"
                          style={{ backgroundColor: fac.primaryHex }}
                        >
                          <img
                            src={getCOFullBodyUrl(coId)}
                            alt={co.name}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                          />
                        </div>
                        <span className="font-display font-extrabold text-[11px] uppercase leading-tight truncate w-full">
                          {co.name}
                        </span>
                        <span className="font-mono text-[9px] text-amber-300">
                          {co.powers.cop ? `${co.powers.cop.stars}★/` : ''}
                          {co.powers.scop.stars}★
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

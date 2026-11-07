import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Radio,
  Users,
  MessageSquare,
  Flame,
  Shield,
  Sparkles,
} from 'lucide-react';
import {
  ALL_CANONICAL_CO_IDS,
  CANONICAL_CO_REGISTRY,
  CODefinition,
  COId,
  CO_FACTION_META,
  getCOFullBodyUrl,
} from '@domains/tactics';
import {
  BubbleShape,
  LobbyBarkIntent,
  barkEngine,
} from '@domains/game-feel';
import { audioManager } from '@domains/game-feel';

export interface CommanderLivingVignetteProps {
  activeCommanderId: COId;
  onSelectCommander: (coId: COId) => void;
  commanderBondLevel: number;
  hoverIntent: LobbyBarkIntent | null;
  lastMatchResult?: 'victory' | 'defeat' | null;
  streak: number;
  streakMultiplier: number;
  resolvedClanTag: string;
  isReducedMotion: boolean;
  isCrtActive: boolean;
  onOpenCommanderDossier: () => void;
  onClaimSupplyGift: () => void;
  onOpenEncryptedMail: () => void;
}

const FACTION_FILTER_ORDER: Array<CODefinition['faction'] | 'all'> = [
  'all',
  'orange-star',
  'blue-moon',
  'green-earth',
  'yellow-comet',
  'black-hole',
];

export const CommanderLivingVignette: React.FC<CommanderLivingVignetteProps> = ({
  activeCommanderId,
  onSelectCommander,
  commanderBondLevel,
  hoverIntent,
  lastMatchResult = null,
  streak,
  streakMultiplier,
  resolvedClanTag,
  isReducedMotion,
  isCrtActive,
  onOpenCommanderDossier,
  onClaimSupplyGift,
  onOpenEncryptedMail,
}) => {
  const [pokeCounter, setPokeCounter] = useState(0);
  const [hasPokedRecently, setHasPokedRecently] = useState(false);
  const [selectedFactionFilter, setSelectedFactionFilter] = useState<
    CODefinition['faction'] | 'all'
  >('all');
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const [isSquashing, setIsSquashing] = useState(false);
  const pokeTimeoutRef = useRef<number | null>(null);

  const activeCO = CANONICAL_CO_REGISTRY[activeCommanderId] ?? CANONICAL_CO_REGISTRY.andy;
  const factionMeta = CO_FACTION_META[activeCO.faction];
  const fullBodyUrl = getCOFullBodyUrl(activeCO.id);

  // Determinar la intención prioritaria del Bark Persistente:
  // 1) Hover sobre terminal -> 2) Clic directo reciente -> 3) Último resultado de combate -> 4) Hora del día
  const resolvedIntent: LobbyBarkIntent = hoverIntent
    ? hoverIntent
    : hasPokedRecently
    ? 'commander_poke'
    : lastMatchResult === 'victory'
    ? 'last_match_victory'
    : lastMatchResult === 'defeat'
    ? 'last_match_defeat'
    : 'time_of_day';

  const currentBark = barkEngine.getLobbyContextualBark({
    commanderId: activeCO.id,
    intent: resolvedIntent,
    pokeCounter,
    playerName: 'Comandante',
    bondingLevel: commanderBondLevel,
  });

  const filteredCOIds =
    selectedFactionFilter === 'all'
      ? ALL_CANONICAL_CO_IDS
      : ALL_CANONICAL_CO_IDS.filter(
          (id) => CANONICAL_CO_REGISTRY[id].faction === selectedFactionFilter
        );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    setParallaxOffset({
      x: Math.round(relX * 14),
      y: Math.round(relY * 10),
    });
  };

  const handleMouseLeave = () => {
    setParallaxOffset({ x: 0, y: 0 });
  };

  const handlePokeCommander = () => {
    const nextPoke = pokeCounter + 1;
    setPokeCounter(nextPoke);
    setHasPokedRecently(true);
    setIsSquashing(true);

    barkEngine.recordUserPokeOptimization();
    audioManager.playComboAction((nextPoke % 6) + 2);
    setTimeout(() => setIsSquashing(false), 180);

    if (pokeTimeoutRef.current) {
      window.clearTimeout(pokeTimeoutRef.current);
    }
    pokeTimeoutRef.current = window.setTimeout(() => {
      setHasPokedRecently(false);
    }, 9000);
  };

  const handleStepCommander = (direction: -1 | 1) => {
    audioManager.playSFX('button_click');
    const list = filteredCOIds.length > 0 ? filteredCOIds : ALL_CANONICAL_CO_IDS;
    const currentIndex = list.indexOf(activeCO.id);
    const safeIdx = currentIndex === -1 ? 0 : currentIndex;
    const nextIdx = (safeIdx + direction + list.length) % list.length;
    setHasPokedRecently(false);
    onSelectCommander(list[nextIdx]);
  };

  const renderBubbleStyle = (shape: BubbleShape) => {
    switch (shape) {
      case 'shout':
        return 'bg-[#C46A3A] text-[#F2E8D5] border-4 border-[#0A0B08] rounded-[18px_4px_18px_4px] shadow-[6px_6px_0px_#0A0B08]';
      case 'radio':
        return 'bg-[#1F201A] text-[#F2E8D5] border-4 border-[#0A0B08] outline outline-2 outline-[#00FF66]/60 -outline-offset-4 rounded-[12px_3px_12px_3px] shadow-[6px_6px_0px_#0A0B08]';
      case 'thought':
        return 'bg-[#F4F1EA] text-[#0A0B08] border-4 border-[#46521F] rounded-[24px_8px_24px_8px] shadow-[6px_6px_0px_#0A0B08]';
      default:
        return 'bg-[#2B2C24] text-[#F2E8D5] border-4 border-[#0A0B08] rounded-[20px_5px_20px_5px] shadow-[6px_6px_0px_#0A0B08]';
    }
  };

  const stampStyleByWord: Record<string, string> = {
    '¡TACTICAL!': 'bg-amber-400 text-[#0A0B08]',
    '¡BOOM!': 'bg-[#E65100] text-[#F2E8D5]',
    '¡RATATAT!': 'bg-[#C46A3A] text-amber-200',
    '¡HOLD!': 'bg-[#46521F] text-[#F2E8D5]',
    '¡AIRDROP!': 'bg-sky-500 text-[#0A0B08]',
    '¡CLUTCH!': 'bg-emerald-400 text-[#0A0B08]',
    '¡CALCULATED!': 'bg-purple-500 text-[#F2E8D5]',
    '¡ALERT!': 'bg-red-600 text-white',
  };

  return (
    <section
      aria-label="Viñeta Viva del Comandante Táctico Activo"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex flex-col justify-between h-full w-full living-comic-vignette ben-day-cream overflow-hidden select-none p-3 sm:p-4"
    >
      {/* 1. CAPAS GRÁFICAS DE FONDO (FRANJA HERÁLDICA DE FACCIÓN + LÍNEAS DE ACCIÓN CÓMIC) */}
      <div
        className="absolute -right-16 -top-16 w-80 h-[140%] rotate-[14deg] opacity-20 pointer-events-none transition-colors duration-300"
        style={{ backgroundColor: factionMeta.primaryHex }}
      />
      <div
        className="absolute left-0 bottom-0 w-full h-1/2 pointer-events-none opacity-25"
        style={{
          background: `linear-gradient(0deg, ${factionMeta.primaryHex} 0%, transparent 100%)`,
        }}
      />

      {/* Marcas de Agua Tipográficas Pop-Art de Facción en el Papel Crema */}
      <div className="absolute top-12 left-4 pointer-events-none opacity-[0.08] font-display font-black text-5xl sm:text-7xl uppercase tracking-tighter text-[#0A0B08] leading-none">
        {activeCO.name}
      </div>

      {/* Scanlines sutiles opcionales si CRT está activo */}
      {isCrtActive && (
        <div
          className="absolute inset-0 pointer-events-none opacity-10 z-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(10,11,8,0.35) 0px, rgba(10,11,8,0.35) 1px, transparent 1px, transparent 3px)',
          }}
        />
      )}

      {/* Remaches Industriales en las 4 esquinas de la Viñeta */}
      <span className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-[#2B2C24] border border-[#0A0B08] z-20 pointer-events-none" />
      <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#2B2C24] border border-[#0A0B08] z-20 pointer-events-none" />
      <span className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full bg-[#2B2C24] border border-[#0A0B08] z-20 pointer-events-none" />
      <span className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-[#2B2C24] border border-[#0A0B08] z-20 pointer-events-none" />

      {/* ====================================================================
          2. CABECERA DE LA VIÑETA: BADGE DE FACCIÓN, VÍNCULO Y ESTADO DE RACHA
         ==================================================================== */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-[8px_2px_8px_2px] font-display font-extrabold text-xs uppercase tracking-wider border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] ${factionMeta.badgeBgClass}`}
          >
            ★ {factionMeta.shortCode}
          </span>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-[8px_2px_8px_2px] bg-[#2B2C24] text-[#F2E8D5] border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] font-mono text-xs font-extrabold">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
            <span>VÍNCULO NV.{commanderBondLevel}/10</span>
          </div>
        </div>

        {/* Estado de Racha Activa + Suministro de Alianza + Correo Encriptado */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-1 rounded-[8px_2px_8px_2px] bg-[#161712] text-amber-400 border-2 border-[#0A0B08] shadow-[2px_2px_0px_#0A0B08] font-mono text-[11px] font-extrabold tabular-nums">
            <Flame className="w-3.5 h-3.5 text-[#C46A3A]" />
            <span>RACHA {streak}</span>
            <span className="px-1 bg-[#2B2C24] text-[#F2E8D5] rounded text-[10px]">
              {streakMultiplier}x
            </span>
          </div>

          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={onClaimSupplyGift}
            title={`Reclamar Suministros de Alianza ${resolvedClanTag}`}
            className="tactical-juice-btn px-2 py-1 bg-[#46521F] hover:bg-[#586827] text-[#F2E8D5] border-2 border-[#0A0B08] text-[10px] font-mono font-extrabold flex items-center gap-1"
          >
            <Shield className="w-3 h-3 text-amber-300" />
            <span>+50t</span>
          </button>

          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={onOpenEncryptedMail}
            title="Abrir Transmisiones Encriptadas C4ISR"
            className="tactical-juice-btn px-2 py-1 bg-[#2B2C24] hover:border-amber-400 text-[#F2E8D5] border-2 border-[#0A0B08] text-[10px] font-mono font-extrabold flex items-center gap-1"
          >
            <Radio className="w-3 h-3 text-[#00FF66]" />
            <span className="hidden sm:inline">COMMS</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          3. ESCENARIO CENTRAL DE LA VIÑETA: COMANDANTE FULL BODY + BOCADILLO VIVO
         ==================================================================== */}
      <div className="relative z-20 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 items-center gap-3 my-1">
        {/* COLUMNA A (7/12): ARTE FULL BODY INTERACTIVO CON RESPIRACIÓN PROCEDURAL */}
        <div className="lg:col-span-7 relative h-full min-h-[210px] flex items-end justify-center overflow-visible">
          {/* Halo geométrico de facción tras el oficial */}
          <div
            className="absolute bottom-4 w-48 h-48 sm:w-60 sm:h-60 rounded-[36px_8px_36px_8px] border-4 border-[#0A0B08] shadow-[6px_6px_0px_#0A0B08] rotate-[-4deg] pointer-events-none transition-colors duration-300"
            style={{
              backgroundColor: factionMeta.primaryHex,
              backgroundImage: 'radial-gradient(rgba(242,232,213,0.24) 20%, transparent 21%)',
              backgroundSize: '8px 8px',
            }}
          />

          {/* Botón de Interacción Directa sobre el Comandante (Dispara Bark + Squash & Stretch) */}
          <button
            type="button"
            onClick={handlePokeCommander}
            onMouseEnter={() => audioManager.playHoverTick()}
            title={`Hacer clic sobre ${activeCO.name} para solicitar directiva táctica`}
            className="relative z-10 h-full max-h-[340px] sm:max-h-[410px] flex items-end justify-center cursor-pointer group focus:outline-none"
            style={{
              transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0) ${
                isSquashing ? 'scale(1.07, 0.92)' : 'scale(1, 1)'
              }`,
              transition: isSquashing
                ? 'transform 0.08s cubic-bezier(0.34, 1.56, 0.64, 1)'
                : 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={activeCO.id}
                src={fullBodyUrl}
                alt={`${activeCO.name} - ${activeCO.title}`}
                initial={{ opacity: 0, scale: 0.9, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 10 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                className={`max-h-[250px] sm:max-h-[330px] xl:max-h-[375px] w-auto object-contain select-none drop-shadow-[6px_6px_0px_#0A0B08] group-hover:drop-shadow-[8px_8px_0px_#0A0B08] ${
                  !isReducedMotion ? 'co-idle-breathe' : ''
                }`}
                draggable={false}
              />
            </AnimatePresence>

            {/* Indicador táctil al pasar el cursor */}
            <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 px-2 py-0.5 rounded-[6px_2px_6px_2px] bg-[#0A0B08] text-amber-300 font-mono font-extrabold text-[10px] uppercase tracking-wider border border-amber-400 shadow-[2px_2px_0px_#0A0B08] pointer-events-none">
              [CLIC // INTERROGAR OFICIAL]
            </span>
          </button>
        </div>

        {/* COLUMNA B (5/12): BOCADILLO DE DIÁLOGO PERSISTENTE + TARJETA DE PODERES */}
        <div className="lg:col-span-5 flex flex-col justify-center gap-2.5 z-20">
          {/* BOCADILLO REACTIVO DEL BARK ENGINE */}
          <motion.div
            key={currentBark.id}
            initial={{ opacity: 0, scale: 0.93, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 460, damping: 24 }}
            onClick={handlePokeCommander}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePokeCommander();
              }
            }}
            className={`relative p-3 sm:p-3.5 cursor-pointer ${renderBubbleStyle(
              currentBark.bubbleShape
            )}`}
            title="Haz clic para cambiar el parte táctico del Comandante"
          >
            {/* Sello Pop-Art de Onomatopeya Rotado */}
            <span
              className={`absolute -top-3.5 -right-2 z-20 px-2.5 py-0.5 font-display font-black text-xs uppercase tracking-widest border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] select-none ${
                stampStyleByWord[currentBark.onomatopoeia] || 'bg-amber-400 text-[#0A0B08]'
              }`}
              style={{
                transform: `rotate(${currentBark.stampRotationDeg}deg)`,
              }}
            >
              {currentBark.onomatopoeia}
            </span>

            {/* Cola del bocadillo apuntando al Comandante en Desktop */}
            <div className="hidden lg:block absolute -left-3.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[14px] border-r-[#0A0B08]" />

            <div className="flex items-center justify-between gap-1.5 mb-1.5 pb-1 border-b border-current/20">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <MessageSquare className="w-3 h-3 shrink-0" />
                <span>{currentBark.contextLabel}</span>
              </span>
            </div>

            <p className="text-xs sm:text-[13px] font-sans font-bold leading-snug">
              “{currentBark.text}”
            </p>
          </motion.div>

          {/* RESUMEN TÁCTICO D2D + COP + SCOP DEL COMANDANTE EN VIÑETA */}
          <div className="p-2.5 sm:p-3 rounded-[14px_4px_14px_4px] bg-[#161712] text-[#F2E8D5] border-3 border-[#0A0B08] shadow-[4px_4px_0px_#0A0B08] space-y-1.5">
            <div className="flex items-center justify-between gap-2 border-b border-[#7B8A4A]/30 pb-1">
              <div>
                <h2 className="font-display font-black text-base sm:text-lg uppercase tracking-wider text-[#F2E8D5] leading-none">
                  {activeCO.name}
                </h2>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                  {activeCO.title}
                </span>
              </div>

              <button
                type="button"
                onMouseEnter={() => audioManager.playHoverTick()}
                onClick={onOpenCommanderDossier}
                className="tactical-juice-btn px-2.5 py-1 bg-[#46521F] hover:bg-[#586827] text-[#F2E8D5] border-2 border-[#0A0B08] text-[10px] font-display font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0"
                title="Abrir Cuartel de Oficiales y Dossier Completo [Tecla C]"
              >
                <Users className="w-3.5 h-3.5 text-amber-300" />
                <span>Dossier [C]</span>
              </button>
            </div>

            {/* Pasiva Día a Día */}
            <p className="text-[11px] text-[#A9B87A] font-sans leading-tight line-clamp-2">
              <strong className="text-[#F2E8D5] font-mono uppercase">D2D:</strong>{' '}
              {activeCO.dayToDay.description}
            </p>

            {/* Poderes COP y SCOP con Estrellas Canónicas */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <div className="p-1.5 rounded-[8px_2px_8px_2px] bg-[#2B2C24] border border-[#7B8A4A]/50">
                <div className="flex items-center justify-between text-[10px] font-mono font-extrabold">
                  <span className="text-amber-300 truncate">
                    {activeCO.powers.cop ? activeCO.powers.cop.name : 'SIN COP'}
                  </span>
                  {activeCO.powers.cop && (
                    <span className="text-amber-400 shrink-0">{activeCO.powers.cop.stars}★</span>
                  )}
                </div>
                <span className="block text-[9px] text-[#A9B87A] truncate mt-0.5">
                  {activeCO.powers.cop
                    ? activeCO.powers.cop.description
                    : 'Concentra todo en SCOP'}
                </span>
              </div>

              <div className="p-1.5 rounded-[8px_2px_8px_2px] bg-[#2B2C24] border border-[#C46A3A]">
                <div className="flex items-center justify-between text-[10px] font-mono font-extrabold">
                  <span className="text-[#F2E8D5] truncate flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    {activeCO.powers.scop.name}
                  </span>
                  <span className="text-[#C46A3A] shrink-0">{activeCO.powers.scop.stars}★</span>
                </div>
                <span className="block text-[9px] text-[#A9B87A] truncate mt-0.5">
                  {activeCO.powers.scop.description}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          4. PIE DE VIÑETA: SELECTOR RÁPIDO DE LOS 28 COMANDANTES (SMOOTH FULL)
         ==================================================================== */}
      <div className="relative z-20 pt-2 border-t-2 border-[#0A0B08]/30 flex flex-col gap-1.5">
        {/* Filtros Rápidos por Facción + Controles Prev/Next */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {FACTION_FILTER_ORDER.map((fac) => {
              const isSelected = selectedFactionFilter === fac;
              const label =
                fac === 'all' ? `TODOS (${ALL_CANONICAL_CO_IDS.length})` : CO_FACTION_META[fac].label;
              return (
                <button
                  key={fac}
                  type="button"
                  onMouseEnter={() => audioManager.playHoverTick()}
                  onClick={() => {
                    audioManager.playSFX('button_click');
                    setSelectedFactionFilter(fac);
                  }}
                  className={`px-2 py-0.5 rounded-[6px_2px_6px_2px] text-[10px] font-mono font-extrabold uppercase border transition-colors cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#0A0B08] text-amber-300 border-[#0A0B08]'
                      : 'bg-[#2B2C24]/90 text-[#F2E8D5] border-[#0A0B08] hover:border-amber-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onMouseEnter={() => audioManager.playHoverTick()}
              onClick={() => handleStepCommander(-1)}
              className="tactical-juice-btn px-2 py-0.5 bg-[#2B2C24] text-[#F2E8D5] border-2 border-[#0A0B08] text-xs font-mono font-extrabold flex items-center"
              title="Comandante Anterior"
              aria-label="Comandante Anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseEnter={() => audioManager.playHoverTick()}
              onClick={() => handleStepCommander(1)}
              className="tactical-juice-btn px-2 py-0.5 bg-[#2B2C24] text-[#F2E8D5] border-2 border-[#0A0B08] text-xs font-mono font-extrabold flex items-center"
              title="Siguiente Comandante"
              aria-label="Siguiente Comandante"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cinta Horizontal de Selección Instantánea de Oficiales (28 COs) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
          {filteredCOIds.map((coId) => {
            const co = CANONICAL_CO_REGISTRY[coId];
            const isActive = coId === activeCO.id;
            const facMeta = CO_FACTION_META[co.faction];
            return (
              <button
                key={coId}
                type="button"
                onMouseEnter={() => audioManager.playHoverTick()}
                onClick={() => {
                  audioManager.playSFX('button_click');
                  setHasPokedRecently(false);
                  onSelectCommander(coId);
                }}
                className={`relative group flex items-center gap-1.5 px-2 py-1 rounded-[8px_2px_8px_2px] border-2 shrink-0 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#0A0B08] text-amber-300 border-[#E65100] shadow-[3px_3px_0px_#E65100] -translate-y-0.5'
                    : 'bg-[#2B2C24] text-[#F2E8D5] border-[#0A0B08] hover:bg-[#1F201A] shadow-[2px_2px_0px_#0A0B08]'
                }`}
                title={`Asignar a ${co.name} (${co.title}) como Comandante Activo`}
              >
                <div
                  className="w-6 h-6 rounded-[4px_1px_4px_1px] overflow-hidden border border-[#0A0B08] shrink-0"
                  style={{ backgroundColor: facMeta.primaryHex }}
                >
                  <img
                    src={getCOFullBodyUrl(coId)}
                    alt={co.name}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
                <span className="font-display font-extrabold text-[10px] uppercase tracking-wider">
                  {co.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

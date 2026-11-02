/**
 * ==============================================================================
 * DIORAMA ISOMÉTRICO MILITAR C4ISR & KINETIC COMIC WAR-ROOM (v4.0.0)
 * ==============================================================================
 * Conforme a @tactical-command-intel (v4.0.0) e @indie-game-ui-architect:
 * - Entintado cómic pesado (#0A0B08 stroke 3px), sombreado cel-shaded y tramas Ben-Day.
 * - 4 Complejos Interactivos con Etiquetas Espaciales Cómic (Astillero Naval, Silos,
 *   Hangar de 10 Cartas y Estación Única de Radar Polar 360°).
 * - Alarma DEFCON-1 conectada en el Helipuerto con Capa Meta de viñeta roja pulsante.
 * - Cámara reactiva con enfoque (Zoom & Pan con resorte) según la estación activa.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { audioManager } from '../../engine/audioManager';
import { LobbyStationView } from './TacticalDock';

export interface TacticalC4ISRBaseDioramaProps {
  elapsedSiloHours?: number;
  onHarvestSilos?: (gainedSteel: number, gainedGold: number) => void;
  onOpenArmory?: () => void;
  onOpenIndustry?: () => void;
  onOpenRadarMap?: () => void;
  isCrtEnabled?: boolean;
  isReducedMotion?: boolean;
  focusStation?: LobbyStationView | null;
}

interface FloatingGain {
  id: number;
  x: number;
  y: number;
  text: string;
}

const CAMERA_TRANSFORM_BY_STATION: Record<string, string> = {
  armory: 'scale(1.26) translate(12%, -10%)',
  industry: 'scale(1.26) translate(4%, 10%)',
  marketplace: 'scale(1.28) translate(16%, 12%)',
  clans: 'scale(1.24) translate(-10%, 10%)',
  shop: 'scale(1.16) translate(5%, 4%)',
  docs: 'scale(1.24) translate(-14%, -6%)',
  qa: 'scale(1.24) translate(-14%, -6%)',
};

export const TacticalC4ISRBaseDiorama: React.FC<TacticalC4ISRBaseDioramaProps> = ({
  elapsedSiloHours = 4.5,
  onHarvestSilos,
  onOpenArmory,
  onOpenIndustry,
  onOpenRadarMap,
  isCrtEnabled = false,
  isReducedMotion = false,
  focusStation = null,
}) => {
  const [floatingGains, setFloatingGains] = useState<FloatingGain[]>([]);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [harvestCombo, setHarvestCombo] = useState(0);

  const spawnFloatingGain = (x: number, y: number, text: string) => {
    const id = Date.now() + Math.random();
    setFloatingGains((prev) => [...prev, { id, x, y, text }]);
    setTimeout(() => {
      setFloatingGains((prev) => prev.filter((g) => g.id !== id));
    }, 1150);
  };

  const handleSiloClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextCombo = harvestCombo + 1;
    setHarvestCombo(nextCombo);
    audioManager.playComboAction(nextCombo);

    const gainedSteel = Math.max(10, Math.floor(elapsedSiloHours * 15));
    const gainedGold = Math.max(100, Math.floor(elapsedSiloHours * 200));

    const rect = e.currentTarget.getBoundingClientRect();
    spawnFloatingGain(
      rect.left + rect.width / 2,
      rect.top - 10,
      `+${gainedSteel}t ACERO • +${gainedGold}G`
    );

    if (onHarvestSilos) {
      onHarvestSilos(gainedSteel, gainedGold);
    }
  };

  const handleRadarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioManager.playSFX('unit_select');
    const rect = e.currentTarget.getBoundingClientRect();
    spawnFloatingGain(rect.left + rect.width / 2, rect.top - 10, '📡 BARRIDO C4ISR COMPLETO');
    if (onOpenRadarMap) onOpenRadarMap();
  };

  const handleHangarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioManager.playSFX('unit_order');
    if (onOpenArmory) onOpenArmory();
  };

  const handleNavalDockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioManager.playSFX('unit_order');
    const rect = e.currentTarget.getBoundingClientRect();
    spawnFloatingGain(rect.left + rect.width / 2, rect.top - 10, '⚓ ASTILLERO // INDUSTRIA');
    if (onOpenIndustry) onOpenIndustry();
  };

  const handleBunkerAlarm = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioManager.playCue('trap_alert');
    const nextState = !isAlarmActive;
    setIsAlarmActive(nextState);
    const rect = e.currentTarget.getBoundingClientRect();
    spawnFloatingGain(
      rect.left + rect.width / 2,
      rect.top - 10,
      nextState ? '🚨 ¡ALERTA DEFCON-1 ACTIVA!' : '✓ DEFCON NORMALIZADO'
    );
  };

  const activeCameraTransform =
    focusStation && CAMERA_TRANSFORM_BY_STATION[focusStation]
      ? CAMERA_TRANSFORM_BY_STATION[focusStation]
      : 'scale(1) translate(0%, 0%)';

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#161712]">
      {/* CAPA 3 (META): Viñeta Roja Perimetral cuando la Alarma DEFCON-1 está Activa */}
      {isAlarmActive && (
        <div
          className={`pointer-events-none absolute inset-0 z-30 shadow-[inset_0_0_95px_rgba(239,68,68,0.55)] border-2 border-red-500/60 ${
            isReducedMotion ? '' : 'animate-pulse'
          }`}
        />
      )}

      {/* CAPA 3 (META): Malla CRT Sutil (Sin oscurecer el arte del diorama) */}
      {isCrtEnabled && (
        <div className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.22)_50%)] bg-[length:100%_4px] opacity-60" />
      )}

      {/* CAPA 2 (ESPACIAL): Textos Flotantes con Trayectoria Balística */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {floatingGains.map((g) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 8, scale: 0.75 }}
              animate={{ opacity: 1, y: -38, scale: 1.05 }}
              exit={{ opacity: 0, y: -64, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
              className="fixed font-display font-extrabold text-xs text-[#0A0B08] bg-amber-300 px-3 py-1 rounded-[10px_2px_10px_2px] border-2 border-[#0A0B08] shadow-[4px_4px_0px_#0A0B08]"
              style={{ left: `${g.x - 85}px`, top: `${g.y}px` }}
            >
              {g.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* CAPA 1 (DIEGÉTICA): DIORAMA VECTORIAL ISOMÉTRICO ENTINTADO (C4ISR WAR-ROOM) */}
      <svg
        viewBox="0 0 1400 900"
        className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: activeCameraTransform }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="c4isrWater" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#13222E" />
            <stop offset="60%" stopColor="#192D3C" />
            <stop offset="100%" stopColor="#0E1922" />
          </linearGradient>

          <linearGradient id="c4isrGround" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#323528" />
            <stop offset="55%" stopColor="#26281E" />
            <stop offset="100%" stopColor="#1B1C15" />
          </linearGradient>

          <linearGradient id="c4isrOlivePavement" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F5C24" />
            <stop offset="100%" stopColor="#394318" />
          </linearGradient>

          {/* Trama de Puntos Ben-Day Canónica para Sombras de Novela Gráfica */}
          <pattern id="benDayDots" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.6" fill="#7B8A4A" opacity="0.28" />
            <circle cx="9" cy="9" r="1.6" fill="#0A0B08" opacity="0.35" />
          </pattern>

          <pattern
            id="hazardStripe"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="10" height="20" fill="#C46A3A" />
            <rect x="10" width="10" height="20" fill="#0A0B08" />
          </pattern>
        </defs>

        {/* 1. BAHÍA COSTERA TÁCTICA Y RETÍCULA CARTOGRÁFICA */}
        <polygon points="0,0 780,0 380,415 0,280" fill="url(#c4isrWater)" />
        <polygon points="0,0 780,0 380,415 0,280" fill="url(#benDayDots)" opacity="0.5" />

        {/* Espuma costera estilizada cómic */}
        <polyline
          points="750,0 355,395 0,268"
          fill="none"
          stroke="#93C5FD"
          strokeWidth="4"
          strokeDasharray="18,10"
          opacity="0.55"
        />

        {/* Líneas de patrullaje marítimo */}
        <g stroke="#60A5FA" strokeWidth="1.5" opacity="0.35" strokeLinecap="square">
          <path d="M120 75 L220 75" />
          <path d="M270 115 L370 115" />
          <path d="M100 175 L195 175" />
        </g>

        {/* 2. MALECÓN DE HORMIGÓN BLINDADO ENTINTADO */}
        <polygon
          points="760,0 815,0 415,425 360,402"
          fill="#2B2C24"
          stroke="#0A0B08"
          strokeWidth="3.5"
        />

        {/* 3. TERRENO FORTIFICADO DE LA BASE CON TRAMA BEN-DAY */}
        <polygon
          points="815,0 1400,0 1400,900 0,900 0,280 360,402 415,425"
          fill="url(#c4isrGround)"
        />
        <polygon
          points="815,0 1400,0 1400,900 0,900 0,280 360,402 415,425"
          fill="url(#benDayDots)"
        />

        {/* 4. CALZADAS MILITARES Y PISTA PRINCIPAL */}
        <g>
          {/* Vía Principal Achaflanada con Contorno de Tinta */}
          <polygon
            points="410,400 535,328 1230,770 1095,855"
            fill="url(#c4isrOlivePavement)"
            stroke="#0A0B08"
            strokeWidth="3.5"
          />
          <line
            x1="472"
            y1="364"
            x2="1162"
            y2="812"
            stroke="#F59E0B"
            strokeDasharray="18,12"
            strokeWidth="3.5"
          />

          {/* Vía a Silos Industriales */}
          <polygon
            points="660,480 960,310 1045,358 750,542"
            fill="url(#c4isrOlivePavement)"
            stroke="#0A0B08"
            strokeWidth="3"
          />
        </g>

        {/* ====================================================================
            ESTACIÓN INTERACTIVA 1: HELIPUERTO DE MANDO & ALARMA DEFCON-1
           ==================================================================== */}
        <g
          id="helipad-command-alarm"
          role="button"
          tabIndex={0}
          aria-label="Helipuerto de Reacción Rápida y Alarma DEFCON"
          className="cursor-pointer group"
          onMouseEnter={() => audioManager.playHoverTick()}
          onClick={handleBunkerAlarm}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleBunkerAlarm(e as unknown as React.MouseEvent);
            }
          }}
        >
          {/* Sombra dura proyectada */}
          <polygon
            points="818,268 858,238 938,238 978,268 978,298 938,328 858,328 818,298"
            fill="#0A0B08"
          />
          <polygon
            points="810,260 850,230 930,230 970,260 970,290 930,320 850,320 810,290"
            fill={isAlarmActive ? '#5a1e05' : '#1F201A'}
            stroke="#0A0B08"
            strokeWidth="3.5"
          />
          <circle
            cx="890"
            cy="275"
            r="32"
            fill="none"
            stroke={isAlarmActive ? '#EF4444' : '#F59E0B'}
            strokeWidth="3"
            strokeDasharray="9,6"
          />
          <text
            x="890"
            y="285"
            fontSize="26"
            fill="#F2E8D5"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontWeight="800"
          >
            H
          </text>

          {/* Helicóptero de Ataque Estilo Advance Wars B-Copter */}
          <g transform="translate(840, 212)">
            {/* Sombra del helicóptero */}
            <ellipse cx="42" cy="66" rx="44" ry="10" fill="#0A0B08" opacity="0.75" />
            {/* Patines de aterrizaje */}
            <line x1="18" y1="62" x2="78" y2="62" stroke="#0A0B08" strokeWidth="4" />
            <line x1="20" y1="62" x2="76" y2="62" stroke="#F2E8D5" strokeWidth="2" />
            {/* Cola y rotor trasero */}
            <polygon
              points="20,40 -38,26 -38,16 20,30"
              fill="#46521F"
              stroke="#0A0B08"
              strokeWidth="3"
            />
            <polygon
              points="-38,22 -52,10 -38,30"
              fill="#E65100"
              stroke="#0A0B08"
              strokeWidth="2.5"
            />
            {/* Chasis Blindado y Cabina Tándem */}
            <polygon
              points="16,24 78,24 70,52 22,52"
              fill="#2B2C24"
              stroke="#0A0B08"
              strokeWidth="3"
            />
            {/* Pod de Cohetes Lateral */}
            <rect
              x="30"
              y="40"
              width="24"
              height="9"
              fill="#C46A3A"
              stroke="#0A0B08"
              strokeWidth="2"
            />
            {/* Cristal de Cabina */}
            <polygon
              points="48,27 72,27 66,42 46,42"
              fill="#38BDF8"
              stroke="#0A0B08"
              strokeWidth="2"
            />
            {/* Mástil y Rotor Principal */}
            <line x1="50" y1="24" x2="50" y2="10" stroke="#0A0B08" strokeWidth="4" />
            <ellipse
              cx="50"
              cy="10"
              rx="66"
              ry="6"
              fill="none"
              stroke="#F2E8D5"
              strokeWidth="2.5"
              strokeDasharray="14,8"
            >
              {!isReducedMotion && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 50 10"
                  to="360 50 10"
                  dur="0.35s"
                  repeatCount="indefinite"
                />
              )}
            </ellipse>
          </g>

          {/* Etiqueta Espacial Cómic del Helipuerto / Alarma */}
          <g
            className="transition-transform duration-200 group-hover:scale-105"
            transform="translate(890, 185)"
          >
            <rect
              x="-66"
              y="4"
              width="136"
              height="24"
              rx="4"
              fill="#0A0B08"
            />
            <rect
              x="-70"
              y="0"
              width="136"
              height="24"
              rx="4"
              fill={isAlarmActive ? '#EF4444' : '#2B2C24'}
              stroke="#0A0B08"
              strokeWidth="2.5"
            />
            <text
              x="-2"
              y="16"
              fontSize="10"
              fill="#F2E8D5"
              textAnchor="middle"
              fontFamily="var(--font-display)"
              fontWeight="800"
            >
              {isAlarmActive ? '🚨 ALARMA DEFCON ON' : '🚁 HELIPUERTO // DEFCON'}
            </text>
          </g>
        </g>

        {/* ====================================================================
            ESTACIÓN INTERACTIVA 2: ASTILLERO Y MUELLE NAVAL (INDUSTRIA)
           ==================================================================== */}
        <g
          id="naval-dock"
          role="button"
          tabIndex={0}
          aria-label="Astillero Naval e Industria Militar"
          className="cursor-pointer group"
          onMouseEnter={() => audioManager.playHoverTick()}
          onClick={handleNavalDockClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleNavalDockClick(e as unknown as React.MouseEvent);
            }
          }}
        >
          {/* Muelle de Acero con Sombra Dura */}
          <polygon points="276,246 376,191 416,211 316,271" fill="#0A0B08" />
          <polygon
            points="270,240 370,185 410,205 310,265"
            fill="#2B2C24"
            stroke="#0A0B08"
            strokeWidth="3"
          />

          {/* Destructor Torpedero 1 (Con Entintado Cómic) */}
          <g transform="translate(215, 130)">
            <polygon points="6,36 71,6 121,31 56,64" fill="#0A0B08" />
            <polygon
              points="0,30 65,0 115,25 50,58"
              fill="#46521F"
              stroke="#0A0B08"
              strokeWidth="3"
            />
            <polygon
              points="42,15 85,2 98,12 58,26"
              fill="#2B2C24"
              stroke="#0A0B08"
              strokeWidth="2.5"
            />
            <line x1="85" y1="8" x2="118" y2="15" stroke="#0A0B08" strokeWidth="5" />
            <line x1="85" y1="8" x2="116" y2="15" stroke="#F2E8D5" strokeWidth="2.5" />
            <rect
              x="24"
              y="20"
              width="20"
              height="8"
              fill="#E65100"
              stroke="#0A0B08"
              strokeWidth="2"
            />
          </g>

          {/* Etiqueta Espacial Cómic del Astillero Naval (Antes Ausente) */}
          <g
            className="transition-transform duration-200 group-hover:scale-105"
            transform="translate(335, 145)"
          >
            <rect x="-76" y="4" width="156" height="26" rx="5" fill="#0A0B08" />
            <rect
              x="-80"
              y="0"
              width="156"
              height="26"
              rx="5"
              fill="#2B2C24"
              stroke="#0A0B08"
              strokeWidth="2.5"
            />
            <text
              x="-2"
              y="17"
              fontSize="11"
              fill="#F2E8D5"
              textAnchor="middle"
              fontFamily="var(--font-display)"
              fontWeight="800"
            >
              ⚓ ASTILLERO // INDUSTRIA
            </text>
          </g>
        </g>

        {/* ====================================================================
            ESTACIÓN INTERACTIVA 3: BÚNKER GENERADOR Y SILOS (COSECHA +ACERO)
           ==================================================================== */}
        <g
          id="bunker-power-complex"
          role="button"
          tabIndex={0}
          aria-label="Silos de Extracción de Acero y Fondos"
          className="cursor-pointer group"
          transform="translate(555, 215)"
          onMouseEnter={() => audioManager.playHoverTick()}
          onClick={handleSiloClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSiloClick(e as unknown as React.MouseEvent);
            }
          }}
        >
          {/* Sombra Sólida de Tinta Offset */}
          <polygon points="34,186 138,238 242,172 242,132 140,86" fill="#0A0B08" />

          {/* Muros Balísticos Achaflanados Entintados */}
          <polygon
            points="40,140 140,80 230,125 130,190"
            fill="#46521F"
            stroke="#0A0B08"
            strokeWidth="3.5"
          />
          <polygon
            points="40,140 130,190 130,230 40,180"
            fill="#2B2C24"
            stroke="#0A0B08"
            strokeWidth="3.5"
          />
          <polygon
            points="130,190 230,125 230,165 130,230"
            fill="#1F201A"
            stroke="#0A0B08"
            strokeWidth="3.5"
          />

          {/* Bóveda del Reactor con Pernos */}
          <polygon
            points="80,90 180,90 160,52 100,52"
            fill="#2B2C24"
            stroke="#0A0B08"
            strokeWidth="3"
          />
          <line x1="108" y1="64" x2="152" y2="64" stroke="#0A0B08" strokeWidth="3" />
          <line x1="108" y1="73" x2="152" y2="73" stroke="#0A0B08" strokeWidth="3" />

          {/* Núcleo de Reactor Ámbar/Verde */}
          <rect
            x="118"
            y="114"
            width="24"
            height="24"
            fill="#161712"
            stroke="#0A0B08"
            strokeWidth="2.5"
          />
          <circle cx="130" cy="126" r="7" fill="#F59E0B">
            {!isReducedMotion && (
              <animate
                attributeName="opacity"
                values="0.5;1;0.5"
                dur="1.6s"
                repeatCount="indefinite"
              />
            )}
          </circle>

          {/* Etiqueta Espacial Cómic de Cosecha con Sello */}
          <g
            className="transition-transform duration-200 group-hover:scale-108"
            transform="translate(130, -8)"
          >
            <rect x="-81" y="5" width="166" height="30" rx="6" fill="#0A0B08" />
            <rect
              x="-85"
              y="0"
              width="166"
              height="30"
              rx="6"
              fill="#F2E8D5"
              stroke="#0A0B08"
              strokeWidth="3"
            />
            <text
              x="-2"
              y="19"
              fontSize="11"
              fill="#0A0B08"
              textAnchor="middle"
              fontFamily="var(--font-display)"
              fontWeight="800"
            >
              ⚡ COSECHAR SILOS (+ACERO)
            </text>
          </g>
        </g>

        {/* ====================================================================
            ESTACIÓN INTERACTIVA 4: RADAR POLAR TERRESTRE C4ISR (BARRIDO 360°)
            Único Radar Polar Diegético (Uso Canónico de #00FF66)
           ==================================================================== */}
        <g
          id="radar-c4isr-station"
          role="button"
          tabIndex={0}
          aria-label="Estación de Radar Polar Terrestre C4ISR"
          className="cursor-pointer group"
          transform="translate(930, 415)"
          onMouseEnter={() => audioManager.playHoverTick()}
          onClick={handleRadarClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleRadarClick(e as unknown as React.MouseEvent);
            }
          }}
        >
          {/* Sombra Dura de la Torreta */}
          <polygon points="106,188 186,143 258,183 176,233" fill="#0A0B08" />
          {/* Base Blindada */}
          <polygon
            points="100,180 180,135 250,175 170,225"
            fill="#2B2C24"
            stroke="#0A0B08"
            strokeWidth="3.5"
          />
          <polygon
            points="120,170 170,140 220,165 170,195"
            fill="#46521F"
            stroke="#0A0B08"
            strokeWidth="2.5"
          />

          {/* Mástil de Transmisión */}
          <line x1="170" y1="170" x2="170" y2="70" stroke="#0A0B08" strokeWidth="7" />
          <line x1="170" y1="170" x2="170" y2="70" stroke="#7B8A4A" strokeWidth="3.5" />

          {/* Pantalla Polar de Fósforo CRT (#00FF66) */}
          <g transform="translate(170, 70)">
            <circle cx="4" cy="4" r="46" fill="#0A0B08" />
            <circle
              cx="0"
              cy="0"
              r="46"
              fill="#0A0F0A"
              stroke="#0A0B08"
              strokeWidth="3.5"
            />
            <circle cx="0" cy="0" r="15" fill="none" stroke="#00993E" strokeWidth="1.2" opacity="0.45" />
            <circle cx="0" cy="0" r="30" fill="none" stroke="#00993E" strokeWidth="1.2" opacity="0.55" />
            <circle cx="0" cy="0" r="43" fill="none" stroke="#00FF66" strokeWidth="1.8" opacity="0.85" />
            <line x1="-43" y1="0" x2="43" y2="0" stroke="#00993E" strokeWidth="1" opacity="0.5" />
            <line x1="0" y1="-43" x2="0" y2="43" stroke="#00993E" strokeWidth="1" opacity="0.5" />

            {/* Haz Cónico Giratorio en Verde Fósforo */}
            <g>
              {!isReducedMotion && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0"
                  to="360"
                  dur="3.6s"
                  repeatCount="indefinite"
                />
              )}
              <path d="M0,0 L38,-18 A43,43 0 0,1 43,0 Z" fill="rgba(0, 255, 102, 0.48)" />
            </g>

            {/* Blips Tácticos */}
            <circle cx="16" cy="-14" r="3" fill="#00FF66" />
            <circle cx="-22" cy="18" r="3" fill="#C46A3A" />
          </g>

          {/* Etiqueta Espacial Cómic del Radar */}
          <g
            className="transition-transform duration-200 group-hover:scale-105"
            transform="translate(170, -4)"
          >
            <rect x="-78" y="4" width="160" height="28" rx="5" fill="#0A0B08" />
            <rect
              x="-82"
              y="0"
              width="160"
              height="28"
              rx="5"
              fill="#161712"
              stroke="#00FF66"
              strokeWidth="2"
            />
            <text
              x="-2"
              y="18"
              fontSize="11"
              fill="#00FF66"
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontWeight="800"
            >
              📡 RADAR // FRENTES
            </text>
          </g>
        </g>

        {/* ====================================================================
            ESTACIÓN INTERACTIVA 5: HANGAR BLINDADO & TANQUE PESADO (ARMERÍA)
           ==================================================================== */}
        <g
          id="hangar-armor-bay"
          role="button"
          tabIndex={0}
          aria-label="Hangar Blindado y Mazo de 10 Cartas"
          className="cursor-pointer group"
          transform="translate(275, 470)"
          onMouseEnter={() => audioManager.playHoverTick()}
          onClick={handleHangarClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleHangarClick(e as unknown as React.MouseEvent);
            }
          }}
        >
          {/* Sombra Sólida del Hangar */}
          <polygon points="36,156 116,198 240,136 240,94 162,54" fill="#0A0B08" />

          {/* Estructura Achaflanada del Hangar con Tinta Gruesa */}
          <polygon
            points="40,110 160,50 230,90 110,150"
            fill="#46521F"
            stroke="#0A0B08"
            strokeWidth="3.5"
          />
          <polygon
            points="40,110 110,150 110,190 40,150"
            fill="#2B2C24"
            stroke="#0A0B08"
            strokeWidth="3.5"
          />
          <polygon
            points="110,150 230,90 230,130 110,190"
            fill="#1F201A"
            stroke="#0A0B08"
            strokeWidth="3.5"
          />

          {/* Portón Blindado con Franjas de Alerta */}
          <polygon
            points="55,115 105,88 105,148 55,175"
            fill="url(#hazardStripe)"
            stroke="#0A0B08"
            strokeWidth="2.5"
          />

          {/* TANQUE PESADO ADVANCE WARS (MD. TANK CON ESTRELLA HERÁLDICA) */}
          <g transform="translate(142, 128)">
            {/* Sombra dura bajo orugas */}
            <ellipse cx="44" cy="48" rx="48" ry="10" fill="#0A0B08" />
            {/* Orugas Blindadas y Ruedas */}
            <polygon
              points="0,30 82,30 88,48 6,48"
              fill="#1F201A"
              stroke="#0A0B08"
              strokeWidth="3"
            />
            <circle cx="18" cy="40" r="5.5" fill="#7B8A4A" stroke="#0A0B08" strokeWidth="2" />
            <circle cx="36" cy="40" r="5.5" fill="#7B8A4A" stroke="#0A0B08" strokeWidth="2" />
            <circle cx="54" cy="40" r="5.5" fill="#7B8A4A" stroke="#0A0B08" strokeWidth="2" />
            <circle cx="72" cy="40" r="5.5" fill="#7B8A4A" stroke="#0A0B08" strokeWidth="2" />

            {/* Faldón y Glacis Inclinado Orange Star / Oliva */}
            <polygon
              points="6,30 78,30 68,14 14,14"
              fill="#46521F"
              stroke="#0A0B08"
              strokeWidth="3"
            />
            <rect
              x="16"
              y="20"
              width="14"
              height="6"
              fill="#E65100"
              stroke="#0A0B08"
              strokeWidth="1.5"
            />

            {/* Torreta Pesada con Escotilla y Cañón con Freno de Boca */}
            <polygon
              points="24,14 60,14 54,-2 28,-2"
              fill="#7B8A4A"
              stroke="#0A0B08"
              strokeWidth="3"
            />
            <line x1="54" y1="6" x2="100" y2="6" stroke="#0A0B08" strokeWidth="7" />
            <line x1="54" y1="6" x2="98" y2="6" stroke="#F2E8D5" strokeWidth="3.5" />
            <rect
              x="90"
              y="2"
              width="10"
              height="8"
              fill="#E65100"
              stroke="#0A0B08"
              strokeWidth="2"
            />
          </g>

          {/* Etiqueta Espacial Cómic del Hangar */}
          <g
            className="transition-transform duration-200 group-hover:scale-108"
            transform="translate(135, 12)"
          >
            <rect x="-78" y="4" width="160" height="28" rx="5" fill="#0A0B08" />
            <rect
              x="-82"
              y="0"
              width="160"
              height="28"
              rx="5"
              fill="#E65100"
              stroke="#0A0B08"
              strokeWidth="2.5"
            />
            <text
              x="-2"
              y="18"
              fontSize="11"
              fill="#F2E8D5"
              textAnchor="middle"
              fontFamily="var(--font-display)"
              fontWeight="800"
            >
              🪖 HANGAR // MAZO (10)
            </text>
          </g>
        </g>

        {/* CONVOY BLINDADO EN PATRULLA SOBRE LA VÍA PRINCIPAL */}
        <g transform="translate(690, 415)">
          <polygon points="50,12 220,-28 245,52" fill="#F59E0B" opacity="0.12" />
          <ellipse cx="28" cy="33" rx="30" ry="7" fill="#0A0B08" />
          <polygon
            points="0,20 54,20 50,33 4,33"
            fill="#2B2C24"
            stroke="#0A0B08"
            strokeWidth="2.5"
          />
          <polygon
            points="6,20 48,20 42,8 12,8"
            fill="#46521F"
            stroke="#0A0B08"
            strokeWidth="2.5"
          />
          <line x1="36" y1="12" x2="66" y2="12" stroke="#0A0B08" strokeWidth="4.5" />
          <line x1="36" y1="12" x2="65" y2="12" stroke="#C46A3A" strokeWidth="2.5" />
        </g>
      </svg>
    </div>
  );
};

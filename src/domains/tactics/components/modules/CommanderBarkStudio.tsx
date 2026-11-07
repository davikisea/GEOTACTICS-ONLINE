/**
 * ==============================================================================
 * TACTICAL STUDIO EDITOR — MÓDULO 3: CO & BARK STUDIO (ESTUDIO DE COMANDANTES)
 * ==============================================================================
 * Herramienta de desarrollo interna para calibración de retratos de comandantes,
 * simulación de bocadillos Pop-Art, sellos de onomatopeyas y memoria de barks.
 * Estilo visual: Skill retro-futurism (atompunk, esquinas asimétricas, sombra dura).
 */

import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Zap,
  Sliders,
  Send,
  User,
  Heart,
  VolumeX,
  Volume2,
  Smile
} from 'lucide-react';
import { BarkBubbleShape, OnomatopoeiaStamp } from '@domains/game-feel';

const COMMANDERS = [
  { id: 'stella', name: 'Mayor Stella', archetype: 'Blindados / Blitzkrieg', baseColor: '#C46A3A' },
  { id: 'volkov', name: 'Coronel Volkov', archetype: 'Artillería / Lluvia de Acero', baseColor: '#7B8A4A' },
  { id: 'garrison', name: 'General Garrison', archetype: 'Defensivo / Fortaleza Inexpugnable', baseColor: '#46521F' },
  { id: 'hawke', name: 'Brigadier Hawke', archetype: 'Supremacía Aérea / Tormenta Negra', baseColor: '#385566' },
];

const BUBBLE_SHAPES: { shape: BarkBubbleShape; label: string; desc: string }[] = [
  { shape: 'speech', label: 'Estándar (Speech)', desc: 'Directivas tácticas estándar y doctrinas' },
  { shape: 'shout', label: 'Grito (Shout)', desc: 'Bordes dentados para Superpoderes CO o impactos' },
  { shape: 'thought', label: 'Pensamiento (Thought)', desc: 'Nube flotante para estrategas calculadores' },
  { shape: 'whisper', label: 'Sigilo (Whisper)', desc: 'Contorno discontinuo para emboscadas TRAP' },
  { shape: 'radio', label: 'Radio Militar (Radio)', desc: 'Caja técnica militar de telecomunicaciones' },
];

const ONOMATOPOEIA_STAMPS: { stamp: OnomatopoeiaStamp; label: string; color: string; rotation: string }[] = [
  { stamp: '¡BOOM!', label: '¡BOOM!', color: '#ef4444', rotation: '-rotate-6' },
  { stamp: '¡TRAP!', label: '¡TRAP!', color: '#f59e0b', rotation: 'rotate-3' },
  { stamp: '¡CRITICAL!', label: '¡CRITICAL!', color: '#dc2626', rotation: '-rotate-12' },
  { stamp: '¡AIRDROP!', label: '¡AIRDROP!', color: '#38bdf8', rotation: 'rotate-6' },
  { stamp: '¡CLUTCH!', label: '¡CLUTCH!', color: '#10b981', rotation: '-rotate-3' },
  { stamp: '¡RATATAT!', label: '¡RATATAT!', color: '#eab308', rotation: 'rotate-8' },
];

export const CommanderBarkStudio: React.FC = () => {
  const [selectedCo, setSelectedCo] = useState(COMMANDERS[0]);
  const [selectedBubble, setSelectedBubble] = useState<BarkBubbleShape>('shout');
  const [selectedStamp, setSelectedStamp] = useState<OnomatopoeiaStamp>('¡BOOM!');
  const [bondingLevel, setBondingLevel] = useState<number>(3);
  const [playerName, setPlayerName] = useState<string>('Comandante Alpha');
  const [dialogueText, setDialogueText] = useState<string>(
    '¡¿Otra vez bombarderos frente a tres antiaéreos, {player_name}?! ¡¿Es que acaso quieres regalarles chatarra?!'
  );

  // Texto interpolado en vivo según el vínculo de camaradería
  const previewText = dialogueText
    .replace('{player_name}', bondingLevel >= 3 ? playerName : 'Cadete')
    .replace('{co_name}', selectedCo.name);

  return (
    <div className="flex-1 flex flex-col bg-[#2B2C24] text-[#F2E8D5] font-mono p-4 sm:p-6 overflow-y-auto select-none">
      {/* Cabecera Atompunk del CO Studio */}
      <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[24px_6px_24px_6px] p-4 shadow-[6px_6px_0px_#2B2C24] mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-[8px_2px_8px_2px] bg-[#C46A3A] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border border-[#2B2C24]">
              DEV TOOL
            </span>
            <h1 className="text-lg font-black tracking-wide text-[#F2E8D5] flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#C46A3A]" />
              TACTICAL STUDIO: CO & BARK STUDIO
            </h1>
          </div>
          <p className="text-xs text-[#F2E8D5]/80 mt-1">
            Simulador visual de viñetas de novela gráfica, bocadillos Pop-Art y memoria contextual de camaradería.
          </p>
        </div>

        {/* Nivel de Vínculo (Bonding) y Nombre de Usuario */}
        <div className="flex flex-wrap items-center gap-3 bg-[#2B2C24] px-3 py-1.5 rounded-[12px_3px_12px_3px] border border-[#7B8A4A]">
          <div className="flex items-center gap-1.5 text-xs">
            <User className="w-3.5 h-3.5 text-[#C46A3A]" />
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              className="bg-transparent border-b border-[#7B8A4A] text-[#F2E8D5] text-xs focus:outline-none w-32"
              placeholder="Nombre Jugador"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Heart className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[#F2E8D5]/70">Vínculo:</span>
            <select
              value={bondingLevel}
              onChange={e => setBondingLevel(Number(e.target.value))}
              className="bg-[#2B2C24] text-amber-300 font-bold focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lvl => (
                <option key={lvl} value={lvl}>
                  Nivel {lvl} {lvl >= 3 ? '(Nombre Real)' : '(Cadete)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contenido Principal: Configuración a la Izquierda y Viñeta en Vivo a la Derecha */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 items-start overflow-hidden">
        {/* Controles de Configuración de Viñeta */}
        <div className="w-full lg:w-80 bg-[#46521F] border-2 border-[#2B2C24] rounded-[18px_4px_18px_4px] p-3 shadow-[4px_4px_0px_#2B2C24] flex flex-col gap-3 shrink-0">
          {/* Selector de Comandante */}
          <div>
            <span className="text-xs font-bold text-[#F2E8D5] block mb-1">Comandante Activo:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {COMMANDERS.map(co => (
                <button
                  key={co.id}
                  onClick={() => setSelectedCo(co)}
                  className={`p-2 rounded-[8px_2px_8px_2px] border text-left text-xs font-bold transition-all cursor-pointer ${
                    selectedCo.id === co.id
                      ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                      : 'bg-[#2B2C24] border-[#7B8A4A]/60 text-[#F2E8D5]/80 hover:bg-[#34362c]'
                  }`}
                >
                  <div className="truncate">{co.name}</div>
                  <div className="text-[9px] opacity-75 font-normal truncate">{co.archetype}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Selector de Forma de Bocadillo */}
          <div>
            <span className="text-xs font-bold text-[#F2E8D5] block mb-1">Silueta de Bocadillo:</span>
            <div className="flex flex-col gap-1">
              {BUBBLE_SHAPES.map(b => (
                <button
                  key={b.shape}
                  onClick={() => setSelectedBubble(b.shape)}
                  className={`px-2.5 py-1.5 rounded-[6px] border text-left text-xs font-bold flex justify-between items-center transition-all cursor-pointer ${
                    selectedBubble === b.shape
                      ? 'bg-[#7B8A4A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                      : 'bg-[#2B2C24] border-[#7B8A4A]/50 text-[#F2E8D5]/70 hover:bg-[#34362c]'
                  }`}
                >
                  <span>{b.label}</span>
                  <span className="text-[9px] opacity-70 font-normal">{b.shape}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sellos Pop-Art de Onomatopeyas */}
          <div>
            <span className="text-xs font-bold text-[#F2E8D5] block mb-1">Sello Pop-Art Rotado:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {ONOMATOPOEIA_STAMPS.map(s => (
                <button
                  key={s.stamp}
                  onClick={() => setSelectedStamp(s.stamp)}
                  className={`p-1.5 rounded-[6px] border text-center text-xs font-black transition-all cursor-pointer ${
                    selectedStamp === s.stamp
                      ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                      : 'bg-[#2B2C24] border-[#7B8A4A]/50 text-[#F2E8D5]/80 hover:bg-[#34362c]'
                  }`}
                  style={{ color: selectedStamp === s.stamp ? '#F2E8D5' : s.color }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Editor de Texto del Guión */}
          <div>
            <span className="text-xs font-bold text-[#F2E8D5] block mb-1">Línea de Diálogo:</span>
            <textarea
              value={dialogueText}
              onChange={e => setDialogueText(e.target.value)}
              rows={3}
              className="w-full bg-[#2B2C24] border border-[#7B8A4A] text-[#F2E8D5] p-2 rounded text-xs focus:outline-none resize-none font-mono"
            />
            <span className="text-[10px] text-[#F2E8D5]/60 mt-0.5 block">
              Tokens: <code>{'{player_name}'}</code> (vínculo &ge;3) | <code>{'{co_name}'}</code>
            </span>
          </div>
        </div>

        {/* Simulador de Viñeta en Pantalla Completa */}
        <div className="flex-1 bg-[#2B2C24] border-2 border-[#7B8A4A] rounded-[24px_6px_24px_6px] p-6 shadow-[8px_8px_0px_#2B2C24] flex flex-col items-center justify-center min-h-[460px] w-full relative overflow-hidden">
          {/* Trama de Fondo Estilo Imprenta Pop-Art Ben-Day */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#C46A3A 1.5px, transparent 1.5px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Viñeta Retro-Futurista Renderizada */}
          <div className="relative w-full max-w-lg bg-[#46521F] border-4 border-[#2B2C24] rounded-[36px_10px_36px_10px] p-5 shadow-[14px_14px_0px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row items-center gap-4 z-10">
            {/* Retrato del Comandante */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-20 h-20 rounded-[14px_4px_14px_4px] bg-[#2B2C24] border-2 border-[#7B8A4A] shadow-[4px_4px_0px_#2B2C24] flex items-center justify-center relative overflow-hidden">
                <Smile className="w-10 h-10 text-[#C46A3A]" />
                <span className="absolute bottom-0 inset-x-0 bg-[#2B2C24]/90 text-[8px] font-bold text-center text-[#F2E8D5] py-0.5 border-t border-[#7B8A4A]">
                  LVL {bondingLevel}
                </span>
              </div>
              <span className="text-xs font-black uppercase text-[#F2E8D5] tracking-wide">
                {selectedCo.name}
              </span>
            </div>

            {/* Bocadillo Dinámico */}
            <div
              className={`flex-1 p-4 text-xs font-mono font-bold leading-relaxed relative ${
                selectedBubble === 'shout'
                  ? 'bg-[#F2E8D5] text-[#2B2C24] border-3 border-[#2B2C24] rounded-[16px_4px_16px_4px] shadow-[4px_4px_0px_#2B2C24]'
                  : selectedBubble === 'thought'
                  ? 'bg-[#F2E8D5] text-[#2B2C24] border-2 border-[#2B2C24] rounded-[24px] shadow-[3px_3px_0px_#2B2C24]'
                  : selectedBubble === 'whisper'
                  ? 'bg-[#2B2C24] text-[#F2E8D5] border-2 border-dashed border-[#7B8A4A] rounded-[12px]'
                  : selectedBubble === 'radio'
                  ? 'bg-[#1f201a] text-[#38bdf8] border-2 border-[#38bdf8] rounded-[6px] shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'bg-[#F2E8D5] text-[#2B2C24] border-2 border-[#2B2C24] rounded-[14px_4px_14px_4px] shadow-[4px_4px_0px_#2B2C24]'
              }`}
            >
              <p>{previewText}</p>

              {/* Cola del bocadillo */}
              <div
                className={`hidden sm:block absolute -left-2 top-6 w-3 h-3 rotate-45 ${
                  selectedBubble === 'whisper'
                    ? 'bg-[#2B2C24] border-l-2 border-b-2 border-dashed border-[#7B8A4A]'
                    : selectedBubble === 'radio'
                    ? 'bg-[#1f201a] border-l-2 border-b-2 border-[#38bdf8]'
                    : 'bg-[#F2E8D5] border-l-2 border-b-2 border-[#2B2C24]'
                }`}
              />
            </div>

            {/* Sello Pop-Art Estampado */}
            {selectedStamp && (
              <div
                className={`absolute -bottom-3 -right-3 px-3 py-1 bg-[#C46A3A] text-[#F2E8D5] font-black text-xs uppercase tracking-wider rounded-[8px_2px_8px_2px] border-2 border-[#2B2C24] shadow-[4px_4px_0px_#2B2C24] z-20 ${
                  ONOMATOPOEIA_STAMPS.find(s => s.stamp === selectedStamp)?.rotation || ''
                }`}
              >
                {selectedStamp}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

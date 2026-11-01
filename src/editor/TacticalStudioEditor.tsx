/**
 * ==============================================================================
 * TACTICAL STUDIO EDITOR — SUITE PRINCIPAL (HERRAMIENTA INTERNA DE DESARROLLO)
 * ==============================================================================
 * Entorno de desarrollo desacoplado de la interfaz de usuario final, enfocado
 * en la creación y calibración de activos 100% originales para Tactical Command.
 * Estilo visual: Skill retro-futurism (atompunk, esquinas aerodinámicas, sombras rígidas).
 */

import React, { useState } from 'react';
import {
  Wrench,
  Grid,
  Sparkles,
  MessageSquare,
  ArrowLeft,
  Sliders,
  Maximize2
} from 'lucide-react';
import { MapBuilder } from './modules/MapBuilder';
import { SpriteStudio } from './modules/SpriteStudio';
import { CommanderBarkStudio } from './modules/CommanderBarkStudio';

export type StudioTab = 'map_builder' | 'sprite_studio' | 'co_studio';

interface TacticalStudioEditorProps {
  onClose?: () => void;
}

export const TacticalStudioEditor: React.FC<TacticalStudioEditorProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('map_builder');

  return (
    <div className="w-full h-full flex flex-col bg-[#2B2C24] text-[#F2E8D5] font-mono select-none overflow-hidden">
      {/* Barra de Navegación Superior del Studio */}
      <header className="bg-[#46521F] border-b-2 border-[#2B2C24] px-4 py-2.5 shadow-[0_4px_0px_#2B2C24] flex flex-wrap items-center justify-between gap-3 shrink-0 z-30">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1 bg-[#2B2C24] hover:bg-[#34362c] text-[#F2E8D5] rounded-[8px_2px_8px_2px] border border-[#7B8A4A] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_#2B2C24]"
              title="Volver a la interfaz principal de la aplicación"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Salir de Studio
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[6px_2px_6px_2px] bg-[#C46A3A] border border-[#2B2C24] flex items-center justify-center font-black text-xs text-[#F2E8D5]">
              TS
            </div>
            <span className="font-black text-sm tracking-wider text-[#F2E8D5] uppercase hidden sm:inline">
              Tactical Studio Editor
            </span>
            <span className="px-2 py-0.5 rounded-[6px_2px_6px_2px] bg-[#2B2C24] text-[#C46A3A] font-black text-[10px] border border-[#7B8A4A]">
              v1.0 DEV
            </span>
          </div>
        </div>

        {/* Pestañas de Módulos de Creación */}
        <div className="flex items-center gap-1.5 bg-[#2B2C24] p-1 rounded-[12px_3px_12px_3px] border border-[#7B8A4A]">
          <button
            onClick={() => setActiveTab('map_builder')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-[8px_2px_8px_2px] text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'map_builder'
                ? 'bg-[#C46A3A] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                : 'text-[#F2E8D5]/70 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>1. Map Builder</span>
          </button>

          <button
            onClick={() => setActiveTab('sprite_studio')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-[8px_2px_8px_2px] text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sprite_studio'
                ? 'bg-[#C46A3A] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                : 'text-[#F2E8D5]/70 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>2. Sprite Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('co_studio')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-[8px_2px_8px_2px] text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'co_studio'
                ? 'bg-[#C46A3A] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                : 'text-[#F2E8D5]/70 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>3. CO & Bark Studio</span>
          </button>
        </div>
      </header>

      {/* Área de Trabajo del Módulo Activo */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'map_builder' && <MapBuilder />}
        {activeTab === 'sprite_studio' && <SpriteStudio />}
        {activeTab === 'co_studio' && <CommanderBarkStudio />}
      </main>
    </div>
  );
};

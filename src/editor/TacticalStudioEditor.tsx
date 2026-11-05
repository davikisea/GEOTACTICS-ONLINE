/**
 * ==============================================================================
 * TACTICAL STUDIO EDITOR — SUITE PRINCIPAL (HERRAMIENTA INTERNA DE DESARROLLO)
 * ==============================================================================
 * Entorno de desarrollo desacoplado de la interfaz de usuario final, enfocado
 * en la creación y calibración de activos 100% originales para Tactical Command.
 * Estilo visual: Skill retro-futurism (atompunk, esquinas aerodinámicas, sombras rígidas).
 */

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Grid,
  Sparkles,
  MessageSquare,
  ArrowLeft,
  Sliders,
  Maximize2,
  Cpu,
  ExternalLink,
  RefreshCw,
  Radio
} from 'lucide-react';
import { MapBuilder } from './modules/MapBuilder';
import { SpriteStudio } from './modules/SpriteStudio';
import { CommanderBarkStudio } from './modules/CommanderBarkStudio';

export type StudioTab = 'ai_forge' | 'map_builder' | 'sprite_studio' | 'co_studio';

interface TacticalStudioEditorProps {
  onClose?: () => void;
}

export const TacticalStudioEditor: React.FC<TacticalStudioEditorProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('ai_forge');
  const [isEngineOnline, setIsEngineOnline] = useState<boolean | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const engineUrl = 'http://localhost:8500';

  const checkEngineHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch(`${engineUrl}/health`, { method: 'GET', mode: 'cors' });
      if (res.ok) {
        setIsEngineOnline(true);
      } else {
        setIsEngineOnline(false);
      }
    } catch {
      setIsEngineOnline(false);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkEngineHealth();
  }, []);

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
              SPRINT 4 DEV
            </span>
          </div>
        </div>

        {/* Pestañas de Módulos de Creación */}
        <div className="flex items-center gap-1.5 bg-[#2B2C24] p-1 rounded-[12px_3px_12px_3px] border border-[#7B8A4A]">
          <button
            onClick={() => setActiveTab('ai_forge')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-[8px_2px_8px_2px] text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ai_forge'
                ? 'bg-[#C46A3A] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                : 'text-[#F2E8D5]/70 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-300" />
            <span>★ AI Studio Suite (:8500)</span>
          </button>

          <button
            onClick={() => setActiveTab('map_builder')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-[8px_2px_8px_2px] text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'map_builder'
                ? 'bg-[#C46A3A] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                : 'text-[#F2E8D5]/70 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Map Builder (Local)</span>
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
            <span>Sprite Inspector</span>
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
            <span>Bark Inspector</span>
          </button>
        </div>

        {/* Status indicator & Direct Open Link */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded bg-[#2B2C24] border border-[#7B8A4A]/50">
            <div
              className={`w-2 h-2 rounded-full ${
                isEngineOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-gray-300 font-mono">
              {isEngineOnline ? 'AI ENGINE EN LÍNEA' : 'MOTOR LOCAL :8500'}
            </span>
          </div>

          <a
            href={engineUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1 text-[#F2E8D5] hover:text-[#C46A3A] transition-colors"
            title="Abrir Tactical Studio en ventana independiente"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Área de Trabajo del Módulo Activo */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {activeTab === 'ai_forge' && (
          <div className="w-full h-full flex flex-col bg-[#141310] relative">
            {/* Embedded Studio iframe */}
            <iframe
              src={engineUrl}
              className="w-full h-full border-none"
              title="Tactical Studio AI Forge"
            />

            {/* Offline Helper Overlay if engine not reachable */}
            {isEngineOnline === false && (
              <div className="absolute inset-0 bg-[#2B2C24]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                <div className="max-w-md p-6 bg-[#46521F] border-4 border-[#7B8A4A] rounded-[40px_10px_40px_10px] shadow-[12px_12px_0px_#0A0B08]">
                  <div className="w-12 h-12 rounded-full bg-[#C46A3A] border-2 border-[#F2E8D5] flex items-center justify-center mx-auto mb-3">
                    <Cpu className="w-6 h-6 text-[#F2E8D5]" />
                  </div>
                  <h3 className="font-bold text-sm uppercase text-[#F2E8D5] mb-2 tracking-wide">
                    Motor Tactical Studio Desconectado
                  </h3>
                  <p className="text-xs text-[#F2E8D5]/80 mb-4 leading-relaxed font-sans">
                    Para activar la suite completa con inteligencia artificial (Gemini/Ollama),
                    generador multi-frame de sprites y diseño de mapas AWBW, inicia el motor local:
                  </p>

                  <div className="bg-[#2B2C24] p-3 rounded font-mono text-[11px] text-emerald-400 text-left mb-4 border border-[#7B8A4A]/50">
                    <div>cd ../texel-studio</div>
                    <div>./start.sh</div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={checkEngineHealth}
                      disabled={isCheckingHealth}
                      className="px-4 py-2 bg-[#C46A3A] hover:bg-[#d47a4a] text-white rounded font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-[4px_4px_0px_#0A0B08]"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                      <span>{isCheckingHealth ? 'Verificando...' : 'Reconectar Motor (:8500)'}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('map_builder')}
                      className="px-4 py-2 bg-[#2B2C24] hover:bg-[#34362c] text-[#F2E8D5] rounded border border-[#7B8A4A] text-xs font-bold transition-all cursor-pointer"
                    >
                      Usar Editor Offline
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'map_builder' && <MapBuilder />}
        {activeTab === 'sprite_studio' && <SpriteStudio />}
        {activeTab === 'co_studio' && <CommanderBarkStudio />}
      </main>
    </div>
  );
};

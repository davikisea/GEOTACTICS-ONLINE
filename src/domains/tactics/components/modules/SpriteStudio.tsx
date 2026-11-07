/**
 * ==============================================================================
 * TACTICAL STUDIO EDITOR — MÓDULO 2: SPRITE STUDIO (ESTUDIO DE SPRITES Y ANIMACIONES)
 * ==============================================================================
 * Herramienta de desarrollo interna para calibración de fotogramas, previsualización
 * pixel-art nítida, remapeador de paletas de facciones y cajas de colisión.
 * Estilo visual: Skill retro-futurism (atompunk, esquinas asimétricas, sombra dura).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Palette,
  Crosshair,
  Sliders,
  Layers,
  Download
} from 'lucide-react';
import { assetLoader } from '@shared';

const CANONICAL_UNITS = [
  { code: 'infantry', name: 'Infantería Ligera', category: 'foot', frames: 4 },
  { code: 'mech', name: 'Infantería Pesada (Mech)', category: 'mech', frames: 4 },
  { code: 'recon', name: 'Vehículo de Reconocimiento', category: 'wheels', frames: 4 },
  { code: 'tank_light', name: 'Tanque Ligero M1', category: 'treads', frames: 4 },
  { code: 'tank_medium', name: 'Tanque Medio M2', category: 'treads', frames: 4 },
  { code: 'tank_heavy', name: 'Neotanque Pesado', category: 'treads', frames: 4 },
  { code: 'artillery', name: 'Artillería Autopropulsada', category: 'treads', frames: 4 },
  { code: 'rocket', name: 'Lanzacohetes Múltiple', category: 'treads', frames: 4 },
  { code: 'anti_air', name: 'Blindado Antiaéreo Vulcan', category: 'treads', frames: 4 },
  { code: 'missile', name: 'Batería de Misiles AA', category: 'wheels', frames: 4 },
  { code: 'b_copter', name: 'Helicóptero de Ataque', category: 'air', frames: 4 },
  { code: 't_copter', name: 'Helicóptero de Transporte', category: 'air', frames: 4 },
  { code: 'fighter', name: 'Caza de Superioridad Aérea', category: 'air', frames: 4 },
  { code: 'bomber', name: 'Bombardero Estratégico', category: 'air', frames: 4 },
  { code: 'battleship', name: 'Acorazado Naval', category: 'sea', frames: 4 },
];

export const SpriteStudio: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selectedUnit, setSelectedUnit] = useState(CANONICAL_UNITS[3]); // tank_light
  const [selectedTeam, setSelectedTeam] = useState<'p1' | 'p2'>('p1');
  const [activeSkin, setActiveSkin] = useState<string>('default');
  const [zoomLevel, setZoomLevel] = useState<number>(4); // 4x pixel zoom
  const [fps, setFps] = useState<number>(6);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(true);

  // Bucle de renderizado de animación pixel art a escala
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastFrameTime = performance.now();

    const renderLoop = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      // Fondo transparente pixelado con cuadrícula de damero militar
      const checkSize = 12;
      for (let y = 0; y < canvas.height; y += checkSize) {
        for (let x = 0; x < canvas.width; x += checkSize) {
          ctx.fillStyle = ((x / checkSize) + (y / checkSize)) % 2 === 0 ? '#1f201a' : '#2b2c24';
          ctx.fillRect(x, y, checkSize, checkSize);
        }
      }

      // Dibujar Sprite centrado con zoom
      const baseSize = 48;
      const drawSize = baseSize * zoomLevel;
      const drawX = (canvas.width - drawSize) / 2;
      const drawY = (canvas.height - drawSize) / 2;

      // Sombras de suelo del vehículo / unidad
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height / 2 + drawSize * 0.35, drawSize * 0.35, drawSize * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Renderizar el sprite mediante assetLoader
      assetLoader.drawSprite(ctx, selectedUnit.code, {
        x: drawX,
        y: drawY,
        width: drawSize,
        height: drawSize,
        team: selectedTeam,
        skinId: activeSkin,
        animation: 'idle',
        frameTimeMs: time,
      });

      // Cuadrícula de píxeles auxiliar
      if (showGridOverlay) {
        ctx.strokeStyle = 'rgba(123, 138, 74, 0.2)';
        ctx.lineWidth = 1;
        const step = zoomLevel * 3;
        for (let x = drawX; x <= drawX + drawSize; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, drawY);
          ctx.lineTo(x, drawY + drawSize);
          ctx.stroke();
        }
        for (let y = drawY; y <= drawY + drawSize; y += step) {
          ctx.beginPath();
          ctx.moveTo(drawX, y);
          ctx.lineTo(drawX + drawSize, y);
          ctx.stroke();
        }

        // Borde exterior del contenedor de colisión
        ctx.strokeStyle = '#C46A3A';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, drawY, drawSize, drawSize);
      }

      // Actualizar contador de fotogramas según FPS
      if (isPlaying) {
        const interval = 1000 / fps;
        if (time - lastFrameTime >= interval) {
          setCurrentFrame(prev => (prev + 1) % selectedUnit.frames);
          lastFrameTime = time;
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [selectedUnit, selectedTeam, activeSkin, zoomLevel, fps, isPlaying, showGridOverlay]);

  return (
    <div className="flex-1 flex flex-col bg-[#2B2C24] text-[#F2E8D5] font-mono p-4 sm:p-6 overflow-y-auto select-none">
      {/* Cabecera Atompunk del Sprite Studio */}
      <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[24px_6px_24px_6px] p-4 shadow-[6px_6px_0px_#2B2C24] mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-[8px_2px_8px_2px] bg-[#C46A3A] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border border-[#2B2C24]">
              DEV TOOL
            </span>
            <h1 className="text-lg font-black tracking-wide text-[#F2E8D5] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C46A3A]" />
              TACTICAL STUDIO: SPRITE & ANIMATION STUDIO
            </h1>
          </div>
          <p className="text-xs text-[#F2E8D5]/80 mt-1">
            Calibrador de fotogramas, zoom pixel-art en alta precisión y remapeador de paletas militares.
          </p>
        </div>

        {/* Controles de Vista de Zoom */}
        <div className="flex items-center gap-2 bg-[#2B2C24] px-3 py-1.5 rounded-[12px_3px_12px_3px] border border-[#7B8A4A]">
          <span className="text-xs text-[#F2E8D5]/70">Zoom:</span>
          {[2, 4, 6, 8].map(z => (
            <button
              key={z}
              onClick={() => setZoomLevel(z)}
              className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                zoomLevel === z
                  ? 'bg-[#C46A3A] text-[#F2E8D5]'
                  : 'text-[#F2E8D5]/70 hover:text-white'
              }`}
            >
              {z}x
            </button>
          ))}
        </div>
      </div>

      {/* Contenido Principal: Lista de Unidades a la Izquierda y Lienzo de Animación al Centro */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 items-start overflow-hidden">
        {/* Catálogo de Unidades Tácticas */}
        <div className="w-full lg:w-64 bg-[#46521F] border-2 border-[#2B2C24] rounded-[18px_4px_18px_4px] p-3 shadow-[4px_4px_0px_#2B2C24] flex flex-col gap-2 shrink-0">
          <div className="pb-1.5 border-b border-[#7B8A4A] text-xs font-bold flex justify-between text-[#F2E8D5]">
            <span>Unidades Canónicas</span>
            <span className="text-[#C46A3A]">{CANONICAL_UNITS.length} fichas</span>
          </div>

          <div className="flex flex-col gap-1 max-h-[440px] overflow-y-auto pr-1">
            {CANONICAL_UNITS.map(u => {
              const isSelected = selectedUnit.code === u.code;
              return (
                <button
                  key={u.code}
                  onClick={() => setSelectedUnit(u)}
                  className={`p-2 rounded-[8px_2px_8px_2px] border text-left text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                      : 'bg-[#2B2C24] border-[#7B8A4A]/60 text-[#F2E8D5]/80 hover:bg-[#34362c]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{u.name}</span>
                    <span className="text-[10px] opacity-75 font-normal uppercase">{u.category}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lienzo de Renderizado de Animación */}
        <div className="flex-1 flex flex-col gap-3 w-full">
          <div className="bg-[#2B2C24] border-2 border-[#7B8A4A] rounded-[20px_5px_20px_5px] p-4 shadow-[6px_6px_0px_#2B2C24] flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
            <canvas
              ref={canvasRef}
              width={420}
              height={320}
              className="rounded border border-[#7B8A4A]/40 shadow-2xl block"
            />

            {/* Overlay flotante de información de sprite */}
            <div className="absolute top-6 left-6 bg-[#46521F]/90 border border-[#2B2C24] rounded-[10px_3px_10px_3px] px-3 py-1.5 text-xs shadow-md backdrop-blur">
              <span className="text-[#C46A3A] font-bold">{selectedUnit.name.toUpperCase()}</span>
              <span className="text-[#F2E8D5]/70 ml-2">| Frame: {currentFrame + 1}/{selectedUnit.frames}</span>
            </div>
          </div>

          {/* Barra de Control de Animación y Fotogramas (Scrubber) */}
          <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[18px_4px_18px_4px] p-3 shadow-[4px_4px_0px_#2B2C24] flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Reproducción y Fotogramas por segundo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(prev => !prev)}
                className="px-3 py-1.5 bg-[#C46A3A] hover:bg-[#b05c2e] text-[#F2E8D5] font-bold rounded-[8px_2px_8px_2px] border border-[#2B2C24] shadow-[2px_2px_0px_#2B2C24] flex items-center gap-1.5 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pausar' : 'Animar'}</span>
              </button>

              <div className="flex items-center gap-2 bg-[#2B2C24] px-2.5 py-1 rounded border border-[#7B8A4A]">
                <span className="text-[#F2E8D5]/70">Velocidad:</span>
                <input
                  type="range"
                  min="2"
                  max="16"
                  value={fps}
                  onChange={e => setFps(Number(e.target.value))}
                  className="w-24 accent-[#C46A3A] cursor-pointer"
                />
                <span className="font-bold text-[#C46A3A] w-10 text-right">{fps} FPS</span>
              </div>
            </div>

            {/* Facciones y Variantes de Color */}
            <div className="flex items-center gap-2">
              <span className="text-[#F2E8D5]/70 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-[#C46A3A]" /> Facción:
              </span>
              <button
                onClick={() => setSelectedTeam('p1')}
                className={`px-2.5 py-1 rounded-[8px_2px_8px_2px] border text-xs font-bold transition-all cursor-pointer ${
                  selectedTeam === 'p1'
                    ? 'bg-red-700 border-[#2B2C24] text-white shadow-[2px_2px_0px_#2B2C24]'
                    : 'bg-[#2B2C24] border-[#7B8A4A] text-[#F2E8D5]/70'
                }`}
              >
                Orange Star
              </button>
              <button
                onClick={() => setSelectedTeam('p2')}
                className={`px-2.5 py-1 rounded-[8px_2px_8px_2px] border text-xs font-bold transition-all cursor-pointer ${
                  selectedTeam === 'p2'
                    ? 'bg-blue-700 border-[#2B2C24] text-white shadow-[2px_2px_0px_#2B2C24]'
                    : 'bg-[#2B2C24] border-[#7B8A4A] text-[#F2E8D5]/70'
                }`}
              >
                Blue Moon
              </button>

              <span className="text-[#7B8A4A]">|</span>

              <button
                onClick={() => setShowGridOverlay(prev => !prev)}
                className={`px-2.5 py-1 rounded-[8px_2px_8px_2px] border text-xs font-bold transition-all cursor-pointer ${
                  showGridOverlay
                    ? 'bg-[#7B8A4A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                    : 'bg-[#2B2C24] border-[#7B8A4A] text-[#F2E8D5]/70'
                }`}
              >
                Caja Colisión
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

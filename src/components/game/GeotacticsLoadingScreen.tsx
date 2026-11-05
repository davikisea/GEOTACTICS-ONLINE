import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Shield, Radio, Terminal, Play, CheckCircle2, Crosshair, Cpu } from 'lucide-react';

interface GeotacticsLoadingScreenProps {
  mapName?: string;
  onLoadingComplete?: () => void;
  autoProceed?: boolean;
  autoProceedDelayMs?: number;
  isBootScreen?: boolean;
}

const TACTICAL_BOOT_LOGS = [
  '>> [C4ISR] INICIALIZANDO PROTOCOLO DE TRANSMISIÓN CUARTEL GENERAL...',
  '>> [CRIPTO] NEGOCIANDO CLAVE ASIMÉTRICA MIL-STD-810H...',
  '>> [HEX] SINCRONIZANDO MATRIZ DE BALÍSTICA Y COBERTURA DE TERRENO...',
  '>> [RADAR] ESCANEANDO ESPACIO AÉREO, TERRESTRE Y MARÍTIMO...',
  '>> [INDUSTRIA] ENLAZANDO BÚFER DE RECURSOS P2P Y REFINERÍA...',
  '>> [MAZO] AUDITANDO 10 CARTAS TÁCTICAS DEL HANGAR Y VANGUARDIA...',
  '>> [IA] ALINEANDO RED NEURONAL DE BOT CON DETERMINISMO GBA...',
  '>> [AUDIO] SINTETIZADOR WEB AUDIO API CALIBRADO (0 LATENCIA)...',
  '>> [DEFCON-2] ENLACE OPERATIVO COMPLETO. AUTORIZACIÓN ALFA CONCEDIDA.',
];

export const GeotacticsLoadingScreen: React.FC<GeotacticsLoadingScreenProps> = ({
  mapName,
  onLoadingComplete,
  autoProceed = false,
  autoProceedDelayMs = 800,
  isBootScreen = true,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [ghostProgress, setGhostProgress] = useState<number>(0);
  const [currentLogIndex, setCurrentLogIndex] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([TACTICAL_BOOT_LOGS[0]]);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [zuluTime, setZuluTime] = useState<string>('');

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sintetizador procedural rápido para clics de telemetría y pulsos
  const playTacticalBlip = useCallback((freq = 440, type: OscillatorType = 'sine', duration = 0.03) => {
    if (audioMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + duration);
    } catch {
      // AudioContext bloqueado hasta interacción de usuario, ignorar de forma segura
    }
  }, [audioMuted]);

  const playHeavyDeploySound = useCallback(() => {
    if (audioMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, audioCtxRef.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, audioCtxRef.current.currentTime + 0.16);
      gain.gain.setValueAtTime(0.3, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + 0.18);
    } catch {
      // safe ignore
    }
  }, [audioMuted]);

  // Reloj militar Zulu en tiempo real
  useEffect(() => {
    const updateZulu = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setZuluTime(`${h}:${m}:${s}Z`);
    };
    updateZulu();
    const timer = setInterval(updateZulu, 1000);
    return () => clearInterval(timer);
  }, []);

  // Animación del progreso de precarga y Ghost Bar
  useEffect(() => {
    let currentPct = 0;
    const interval = setInterval(() => {
      currentPct += Math.floor(Math.random() * 9) + 4;
      if (currentPct >= 100) {
        currentPct = 100;
        clearInterval(interval);
        setProgress(100);
        setIsReady(true);
        playTacticalBlip(880, 'triangle', 0.08);
      } else {
        setProgress(currentPct);
        playTacticalBlip(320 + currentPct * 3, 'sine', 0.02);
      }
    }, 120);

    return () => clearInterval(interval);
  }, [playTacticalBlip]);

  // Ghost bar que sigue al progreso real con retardo (Surge Trail)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setGhostProgress(progress);
    }, 180);
    return () => clearTimeout(timeout);
  }, [progress]);

  // Streaming de logs de telemetría militar
  useEffect(() => {
    const logInterval = setInterval(() => {
      setCurrentLogIndex(prev => {
        const next = prev + 1;
        if (next < TACTICAL_BOOT_LOGS.length) {
          setLogs(l => [...l.slice(-4), TACTICAL_BOOT_LOGS[next]]);
          return next;
        }
        return prev;
      });
    }, 380);

    return () => clearInterval(logInterval);
  }, []);

  // Autoproceed opcional
  useEffect(() => {
    if (isReady && autoProceed && onLoadingComplete) {
      const timer = setTimeout(() => {
        onLoadingComplete();
      }, autoProceedDelayMs);
      return () => clearTimeout(timer);
    }
  }, [isReady, autoProceed, autoProceedDelayMs, onLoadingComplete]);

  const handleStart = () => {
    playHeavyDeploySound();
    if (onLoadingComplete) {
      onLoadingComplete();
    }
  };

  // Soporte para teclado [ESPACIO] o [ENTER] para desplegar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && isReady) {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReady]);

  return (
    <div className="relative w-full h-full min-h-screen bg-[#161712] text-[#F2E8D5] flex flex-col items-center justify-between p-4 sm:p-6 lg:p-8 select-none overflow-hidden font-sans">
      {/* 1. FONDO DIEGÉTICO: Rejilla balística + Trama Ben-Day + Viñeta CRT */}
      <div className="absolute inset-0 bg-[radial-gradient(#2B2C24_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute inset-0 ben-day-dark opacity-35 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B08] via-transparent to-[#0A0B08]/80 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(10,11,8,0.9)]" />

      {/* 2. RADAR TÁCTICO ROTATORIO CENTRAL (Detrás del logo) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[480px] lg:w-[620px] h-[340px] sm:h-[480px] lg:h-[620px] rounded-full pointer-events-none flex items-center justify-center opacity-30">
        <div className="absolute inset-0 rounded-full border border-[#7B8A4A]/30 border-dashed" />
        <div className="absolute inset-12 sm:inset-16 rounded-full border border-[#7B8A4A]/40" />
        <div className="absolute inset-28 sm:inset-36 rounded-full border border-[#C46A3A]/30" />
        <div className="absolute w-full h-[1px] bg-[#7B8A4A]/25" />
        <div className="absolute h-full w-[1px] bg-[#7B8A4A]/25" />
        {/* Haz de barrido continuo */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden animate-spin"
          style={{ animationDuration: '6s' }}
        >
          <div className="w-1/2 h-1/2 bg-gradient-to-br from-[#00FF66]/20 via-[#00FF66]/5 to-transparent transform origin-bottom-right" />
        </div>
      </div>

      {/* 3. CAPA NO-DIEGÉTICA: HUD SUPERIOR DE 4 ESQUINAS */}
      <header className="relative z-10 w-full max-w-7xl flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#2B2C24] pb-3 text-xs font-mono">
        {/* Esquina Superior Izquierda: C4ISR Netlink */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px_2px_8px_2px] bg-[#2B2C24] border border-[#7B8A4A] flex items-center justify-center shadow-[2px_2px_0px_#0A0B08]">
            <Radio className="w-4 h-4 text-[#00FF66] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-[#F2E8D5] uppercase tracking-wider">C4ISR NETLINK</span>
              <span className="inline-block w-2 h-2 rounded-full bg-[#00FF66] shadow-[0_0_8px_#00FF66] animate-ping" />
            </div>
            <div className="text-[10px] text-[#7B8A4A] font-bold">
              FREQ: 142.85 MHz SAT-COM • CANONICAL BALISTICS
            </div>
          </div>
        </div>

        {/* Centro Superior: Clasificación Militar */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#1E1F18] border border-[#7B8A4A]/40 rounded-[6px_2px_6px_2px] shadow-[2px_2px_0px_#0A0B08]">
          <Shield className="w-3.5 h-3.5 text-[#C46A3A]" />
          <span className="text-[11px] font-bold text-[#F2E8D5] tracking-widest uppercase">
            ESTADO MAYOR OPERATIVO // DETERMINISMO TÁCTICO
          </span>
        </div>

        {/* Esquina Superior Derecha: Reloj Zulu y DEFCON */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] font-black text-amber-400 tabular-nums tracking-widest">
              ZULU: {zuluTime || '00:00:00Z'}
            </div>
            <div className="text-[10px] text-[#C46A3A] font-bold uppercase tracking-wider">
              DEFCON 2 // ALERTA MÁXIMA
            </div>
          </div>
          <button
            onClick={() => setAudioMuted(m => !m)}
            title={audioMuted ? 'Activar Audio Táctico' : 'Silenciar Audio Táctico'}
            className="w-8 h-8 rounded-[8px_2px_8px_2px] bg-[#2B2C24] hover:bg-[#383A2F] border border-[#7B8A4A] flex items-center justify-center cursor-pointer transition-transform active:scale-90 shadow-[2px_2px_0px_#0A0B08]"
          >
            {audioMuted ? (
              <VolumeX className="w-4 h-4 text-stone-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#F2E8D5]" />
            )}
          </button>
        </div>
      </header>

      {/* 4. NÚCLEO CINÉTICO CENTRAL: LOGOTIPO SIN FONDO + NOMBRE + SELLO POP-ART DE VERSIÓN */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center my-4 max-w-4xl w-full">
        {/* Contenedor del Logotipo con Respiración Idle y Sombras Duras de Novela Gráfica */}
        <div className="relative flex flex-col items-center group">
          {/* Resplandor ámbar de fondo */}
          <div className="absolute -inset-6 bg-[#C46A3A]/15 rounded-full blur-2xl pointer-events-none" />

          {/* Sello Pop-Art Angulado de Clasificación Top Secret */}
          <div className="absolute -top-4 sm:-top-6 -left-2 sm:-left-6 z-20 px-3 py-1 bg-[#161712] border-2 border-[#C46A3A] text-[#C46A3A] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-[3px_3px_0px_#0A0B08] rotate-[-5deg]">
            ★ TOP SECRET // C4ISR UPLINK
          </div>

          {/* Sello Pop-Art Angulado de Versión Canónica (Requerimiento Alfa 0.0.1) */}
          <div className="absolute -top-5 sm:-top-7 -right-2 sm:-right-8 z-20 px-3.5 py-1.5 bg-[#F59E0B] border-2 border-[#0A0B08] text-slate-950 font-black text-xs sm:text-sm uppercase tracking-widest shadow-[4px_4px_0px_#0A0B08] rotate-[4deg] animate-pulse">
            VER 0.0.1 ALFA
          </div>

          {/* Imagen del Logotipo Oficial (Sin Fondo Croma) */}
          <div className="relative max-w-[320px] sm:max-w-[460px] md:max-w-[560px] lg:max-w-[620px] w-full p-2">
            <picture>
              <source srcSet="/logo-cropped.webp" type="image/webp" />
              <img
                src="/logo-cropped.png"
                alt="GEOTACTICS ONLINE"
                className="w-full h-auto object-contain filter drop-shadow-[0_16px_28px_rgba(0,0,0,0.9)] drop-shadow-[0_0_30px_rgba(196,106,58,0.3)] co-idle-breathe select-none pointer-events-none"
              />
            </picture>
          </div>

          {/* Título en Tipografía de Consola Blindada y Novela Gráfica */}
          <div className="mt-2 space-y-1">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-display tracking-widest text-[#F2E8D5] uppercase drop-shadow-[3px_3px_0px_#0A0B08] flex items-center justify-center gap-2">
              <span className="text-[#F2E8D5]">GEOTACTICS</span>
              <span className="text-[#C46A3A]">ONLINE</span>
            </h1>

            {/* Subtítulo Diegético */}
            <div className="inline-flex items-center gap-2 px-3 py-0.5 bg-[#2B2C24] border border-[#7B8A4A]/50 rounded-[6px_2px_6px_2px] shadow-[2px_2px_0px_#0A0B08]">
              <Crosshair className="w-3 h-3 text-[#00FF66]" />
              <span className="text-[11px] font-mono font-bold text-[#F2E8D5] tracking-wider uppercase">
                {mapName ? `SECTOR: ${mapName}` : 'GUERRA DE HEGEMONÍA TERRITORIAL & ECONOMÍA P2P'}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* 5. CAPA INFERIOR: BARRA DE PROGRESO DE DOBLE CAPA (GHOST DRAIN / SURGE TRAIL) + TERMINAL */}
      <footer className="relative z-10 w-full max-w-3xl space-y-4">
        {/* Bloque de Barra con Ghost Trail */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-2 text-[#F2E8D5] font-bold">
              <Cpu className="w-3.5 h-3.5 text-[#C46A3A]" />
              {isReady
                ? '¡¡MATRIZ TÁCTICA SINCRONIZADA AL 100%!!'
                : 'CALIBRANDO BÚFERES TÁCTICOS Y PROTOCOLOS DE MANDO...'}
            </span>
            <span className="text-amber-400 font-black tabular-nums tracking-widest text-sm">
              [{progress}%]
            </span>
          </div>

          {/* Pista de la Barra de Progreso con Doble Capa: Ghost Trail + Front Spring */}
          <div className="relative h-4 bg-[#0E0F0B] border-2 border-[#7B8A4A] rounded-[8px_2px_8px_2px] shadow-[3px_3px_0px_#0A0B08] overflow-hidden p-0.5">
            {/* Ghost Trail (Barra Fantasma retrasada con ease-out-expo) */}
            <div
              className="absolute inset-y-0.5 left-0.5 bg-[#F2E8D5] rounded-[4px_1px_4px_1px] bar-ghost-trail"
              style={{ width: `calc(${ghostProgress}% - 4px)` }}
            />
            {/* Barra Frontal Cinética */}
            <div
              className="absolute inset-y-0.5 left-0.5 bg-gradient-to-r from-[#C46A3A] via-[#E65100] to-[#F59E0B] rounded-[4px_1px_4px_1px] bar-fill-spring shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              style={{ width: `calc(${progress}% - 4px)` }}
            />
          </div>
        </div>

        {/* Consola Terminal de E/S Militar */}
        <div className="bg-[#1E1F18]/90 border border-[#7B8A4A]/50 rounded-[10px_3px_10px_3px] p-2.5 font-mono text-[11px] text-[#A9B87A] shadow-[4px_4px_0px_#0A0B08]">
          <div className="flex items-center justify-between pb-1 border-b border-[#7B8A4A]/30 text-[10px] text-[#7B8A4A] font-bold uppercase mb-1">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-[#00FF66]" /> CONSOLA DE DIAGNÓSTICO C4ISR
            </span>
            <span className="text-amber-400">60 FPS VERIFIED</span>
          </div>
          <div className="space-y-0.5 min-h-[52px]">
            {logs.map((line, idx) => (
              <div key={idx} className="truncate tracking-wide text-[#F2E8D5]/90">
                {line}
              </div>
            ))}
          </div>
        </div>

        {/* Botón de Entrada Táctico (Activo al 100% o Interactivo) */}
        <div className="pt-1 flex flex-col items-center gap-2">
          {isReady ? (
            <button
              onClick={handleStart}
              className="w-full sm:w-auto min-w-[320px] py-3.5 px-8 tactical-btn-heavy flex items-center justify-center gap-3 text-sm sm:text-base animate-pulse"
            >
              <Play className="w-4 h-4 fill-current text-amber-300" />
              <span>COMANDANTE: ENTRAR AL ESTADO MAYOR</span>
              <span className="text-[10px] bg-[#0A0B08]/60 px-2 py-0.5 rounded border border-[#F2E8D5]/30">
                [ESPACIO]
              </span>
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#7B8A4A] py-3">
              <div className="w-4 h-4 border-2 border-[#C46A3A] border-t-transparent rounded-full animate-spin" />
              <span>Estableciendo conexión militar segura...</span>
            </div>
          )}

          {/* Badges de Pie de Pantalla */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono text-[#7B8A4A]">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#00FF66]" /> Motor GBA Balístico
            </span>
            <span>•</span>
            <span>Mazo de 10 Cartas</span>
            <span>•</span>
            <span>Soberanía Territorial P2P</span>
            <span>•</span>
            <span className="text-amber-400 font-bold">Alfa v0.0.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

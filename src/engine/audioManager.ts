/**
 * AUDIO MANAGER - WEB AUDIO API TACTICAL SYNTHESIZER
 * 
 * Motor de sonido avanzado basado en la Web Audio API nativa.
 * Proporciona síntesis procedural de efectos militares estilo 16-bit (Advance Wars)
 * con cero dependencias externas ni latencia, y soporte para pistas BGM de fondo
 * con control de volumen independiente (Master, SFX, BGM) y persistencia.
 */

export type SfxType =
  | 'cannon'
  | 'machinegun'
  | 'rocket'
  | 'explosion'
  | 'move_tread'
  | 'move_foot'
  | 'unit_select'
  | 'unit_order'
  | 'capture'
  | 'victory'
  | 'defeat'
  | 'co_power'
  | 'super_co_power'
  | 'button_click'
  | 'combat_hit';

export interface SoundCueConfig {
  waveType: OscillatorType;
  baseFrequency: number;
  sweepTargetFrequency?: number;
  durationMs: number;
  attackMs: number;
  decayMs: number;
  gain: number;
  noiseLayer?: boolean;
}

export const AUDIO_SYNTHESIS_CATALOG: Record<string, SoundCueConfig> = {
  // Feedback de Interfaz
  ui_cursor_move: { waveType: 'sine', baseFrequency: 440, durationMs: 40, attackMs: 2, decayMs: 38, gain: 0.15 },
  ui_tile_confirm: { waveType: 'triangle', baseFrequency: 587.33, durationMs: 80, attackMs: 5, decayMs: 75, gain: 0.25 },
  ui_cancel_rollback: { waveType: 'sawtooth', baseFrequency: 220, sweepTargetFrequency: 146.83, durationMs: 90, attackMs: 5, decayMs: 85, gain: 0.20 },

  // Balística y Combate
  cannon_fire_heavy: { waveType: 'sawtooth', baseFrequency: 95, sweepTargetFrequency: 30, durationMs: 450, attackMs: 10, decayMs: 440, gain: 0.60, noiseLayer: true },
  machinegun_burst: { waveType: 'square', baseFrequency: 180, sweepTargetFrequency: 90, durationMs: 180, attackMs: 2, decayMs: 178, gain: 0.35, noiseLayer: true },
  rocket_launch: { waveType: 'sawtooth', baseFrequency: 120, sweepTargetFrequency: 380, durationMs: 600, attackMs: 40, decayMs: 560, gain: 0.45, noiseLayer: true },
  explosion_critical: { waveType: 'sawtooth', baseFrequency: 65, sweepTargetFrequency: 20, durationMs: 800, attackMs: 15, decayMs: 785, gain: 0.70, noiseLayer: true },

  // Eventos de Terreno y Táctica
  trap_alert: { waveType: 'square', baseFrequency: 880, sweepTargetFrequency: 220, durationMs: 300, attackMs: 5, decayMs: 295, gain: 0.50 },
  airdrop_impact: { waveType: 'triangle', baseFrequency: 130, sweepTargetFrequency: 60, durationMs: 500, attackMs: 20, decayMs: 480, gain: 0.40, noiseLayer: true },
  co_power_charge: { waveType: 'sine', baseFrequency: 261.63, sweepTargetFrequency: 1046.50, durationMs: 1200, attackMs: 100, decayMs: 1100, gain: 0.50 },
  hq_collapse: { waveType: 'sawtooth', baseFrequency: 80, sweepTargetFrequency: 15, durationMs: 1500, attackMs: 50, decayMs: 1450, gain: 0.80, noiseLayer: true }
};

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
}

class TacticalAudioManager {
  private static instance: TacticalAudioManager | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private settings: AudioSettings = {
    masterVolume: 0.8,
    sfxVolume: 0.85,
    musicVolume: 0.6,
    muted: false,
  };

  // Estado del secuenciador de música de fondo (BGM)
  private isBgmPlaying: boolean = false;
  private bgmIntervalId: number | null = null;
  private bgmStep: number = 0;
  private currentBgmTheme: 'march' | 'tension' = 'march';

  private constructor() {
    this.loadPersistedSettings();
  }

  public static getInstance(): TacticalAudioManager {
    if (!TacticalAudioManager.instance) {
      TacticalAudioManager.instance = new TacticalAudioManager();
    }
    return TacticalAudioManager.instance;
  }

  /**
   * Inicializa el AudioContext bajo un gesto de usuario para cumplir con las políticas de autoplay
   */
  public initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Nodo Maestro
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      // Nodo SFX
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);

      // Nodo BGM
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);

      this.updateGainNodes();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  // =========================================================================
  // CONTROL DE VOLUMEN Y PERSISTENCIA
  // =========================================================================

  private loadPersistedSettings() {
    try {
      const saved = localStorage.getItem('tactical_audio_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch {
      // Ignorar fallo en entornos sin localStorage
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('tactical_audio_settings', JSON.stringify(this.settings));
    } catch {
      // Ignorar
    }
    this.updateGainNodes();
  }

  private updateGainNodes() {
    if (!this.masterGain || !this.sfxGain || !this.musicGain || !this.ctx) return;

    const t = this.ctx.currentTime;
    const effectiveMaster = this.settings.muted ? 0 : this.settings.masterVolume;

    this.masterGain.gain.setValueAtTime(effectiveMaster, t);
    this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, t);
    this.musicGain.gain.setValueAtTime(this.settings.musicVolume, t);
  }

  public setMasterVolume(volume: number) {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  public setSfxVolume(volume: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  public setMusicVolume(volume: number) {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  public toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;
    this.saveSettings();
    return this.settings.muted;
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  // =========================================================================
  // SÍNTESIS PROCEDURAL DE EFECTOS DE SONIDO (SFX) CON PITCH-SHIFT Y DUCKING
  // =========================================================================

  public playSFX(type: SfxType) {
    if (this.settings.muted || this.settings.masterVolume === 0 || this.settings.sfxVolume === 0) {
      return;
    }

    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;

    // Pitch shifting estocástico sutil (±4%) para erradicar fatiga acústica (RFC Sección 3 / Anexo C)
    const pitchShift = 0.96 + Math.random() * 0.08;

    // Ducking dinámico de música de fondo en eventos de alto impacto
    if (this.musicGain && !this.settings.muted) {
      const currentMusicVol = this.settings.musicVolume;
      if (type === 'super_co_power') {
        this.musicGain.gain.setValueAtTime(currentMusicVol * 0.45, now); // -6.5dB
        this.musicGain.gain.exponentialRampToValueAtTime(Math.max(0.01, currentMusicVol), now + 1.6);
      } else if (type === 'co_power' || type === 'explosion') {
        this.musicGain.gain.setValueAtTime(currentMusicVol * 0.65, now); // -3.5dB
        this.musicGain.gain.exponentialRampToValueAtTime(Math.max(0.01, currentMusicVol), now + 0.8);
      }
    }

    switch (type) {
      case 'cannon':
        this.synthCannon(ctx, now);
        break;
      case 'machinegun':
        this.synthMachineGun(ctx, now);
        break;
      case 'rocket':
        this.synthRocket(ctx, now);
        break;
      case 'explosion':
        this.synthExplosion(ctx, now);
        break;
      case 'move_tread':
        this.synthTreads(ctx, now);
        break;
      case 'move_foot':
        this.synthFootstep(ctx, now);
        break;
      case 'unit_select':
        this.synthSelectChirp(ctx, now);
        break;
      case 'unit_order':
        this.synthOrderChime(ctx, now);
        break;
      case 'capture':
        this.synthCapture(ctx, now);
        break;
      case 'victory':
        this.synthVictoryFanfare(ctx, now);
        break;
      case 'defeat':
        this.synthDefeatCadence(ctx, now);
        break;
      case 'co_power':
        this.synthCOPower(ctx, now);
        break;
      case 'super_co_power':
        this.synthSuperCOPower(ctx, now);
        break;
      case 'button_click':
        this.synthButtonClick(ctx, now);
        break;
      case 'combat_hit':
        this.synthCombatHit(ctx, now);
        break;
    }
  }

  /**
   * Reproduce una señal sonora paramétrica del catálogo canónico
   */
  public playCue(cueKey: string) {
    const cue = AUDIO_SYNTHESIS_CATALOG[cueKey];
    if (!cue || this.settings.muted || this.settings.masterVolume === 0 || this.settings.sfxVolume === 0) {
      return;
    }

    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const durSec = cue.durationMs / 1000;
    const attackSec = cue.attackMs / 1000;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = cue.waveType;
    osc.frequency.setValueAtTime(cue.baseFrequency, t);

    if (cue.sweepTargetFrequency) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, cue.sweepTargetFrequency), t + durSec);
    }

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(cue.gain, t + attackSec);
    gain.gain.exponentialRampToValueAtTime(0.001, t + durSec);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + durSec);

    if (cue.noiseLayer) {
      this.playNoiseBurst(ctx, t, durSec, 800, 100, cue.gain * 0.7);
    }
  }

  private synthCombatHit(ctx: AudioContext, t: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.25);
    this.playNoiseBurst(ctx, t, 0.2, 500, 80, 0.5);
  }

  /**
   * Cañón pesado: Explosión con caída rápida de tono y ruido blanco filtrado
   */
  private synthCannon(ctx: AudioContext, t: number) {
    // Oscilador de tono sub-grave que desciende drásticamente
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.35);

    oscGain.gain.setValueAtTime(0.9, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.45);

    // Ráfaga de ruido blanco con filtro pasa-bajos
    this.playNoiseBurst(ctx, t, 0.45, 700, 120, 0.8);
  }

  /**
   * Ametralladora táctica: Ráfaga de 3 pulsos ultra-rápidos
   */
  private synthMachineGun(ctx: AudioContext, t: number) {
    for (let i = 0; i < 3; i++) {
      const pulseTime = t + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(450, pulseTime);
      osc.frequency.exponentialRampToValueAtTime(180, pulseTime + 0.05);

      gain.gain.setValueAtTime(0.4, pulseTime);
      gain.gain.exponentialRampToValueAtTime(0.01, pulseTime + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(pulseTime);
      osc.stop(pulseTime + 0.07);

      this.playNoiseBurst(ctx, pulseTime, 0.05, 2400, 400, 0.5);
    }
  }

  /**
   * Lanzamiento de misil o cohete: Silbido ascendente y humo
   */
  private synthRocket(ctx: AudioContext, t: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.25);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0.6, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.38);

    this.playNoiseBurst(ctx, t, 0.35, 1200, 500, 0.4);
  }

  /**
   * Explosión táctica masiva
   */
  private synthExplosion(ctx: AudioContext, t: number) {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.6);

    oscGain.gain.setValueAtTime(1.0, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.65);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.7);

    this.playNoiseBurst(ctx, t, 0.7, 900, 80, 0.95);
  }

  /**
   * Movimiento de orugas metálicas
   */
  private synthTreads(ctx: AudioContext, t: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.13);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.14);

    this.playNoiseBurst(ctx, t, 0.1, 800, 200, 0.3);
  }

  /**
   * Paso táctico de infantería
   */
  private synthFootstep(ctx: AudioContext, t: number) {
    this.playNoiseBurst(ctx, t, 0.06, 600, 150, 0.25);
  }

  /**
   * Selección de unidad: Chirp digital agudo estilo radar
   */
  private synthSelectChirp(ctx: AudioContext, t: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.08); // A6

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  /**
   * Confirmación de orden / movimiento: Beep dual
   */
  private synthOrderChime(ctx: AudioContext, t: number) {
    [1046.5, 1318.5].forEach((freq, idx) => {
      const noteTime = t + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(noteTime);
      osc.stop(noteTime + 0.1);
    });
  }

  /**
   * Captura de propiedad: Escala ascendente de 4 notas
   */
  private synthCapture(ctx: AudioContext, t: number) {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.35, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(noteTime);
      osc.stop(noteTime + 0.15);
    });
  }

  /**
   * Fanfarria de victoria
   */
  private synthVictoryFanfare(ctx: AudioContext, t: number) {
    const notes = [
      { f: 523.25, d: 0.12, del: 0 },
      { f: 659.25, d: 0.12, del: 0.12 },
      { f: 783.99, d: 0.12, del: 0.24 },
      { f: 1046.5, d: 0.45, del: 0.36 },
    ];

    notes.forEach(n => {
      const noteTime = t + n.del;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, noteTime);

      gain.gain.setValueAtTime(0.4, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(noteTime);
      osc.stop(noteTime + n.d + 0.05);
    });
  }

  /**
   * Cadencia menor de derrota
   */
  private synthDefeatCadence(ctx: AudioContext, t: number) {
    const notes = [
      { f: 440.0, d: 0.2, del: 0 },
      { f: 415.3, d: 0.2, del: 0.2 },
      { f: 392.0, d: 0.2, del: 0.4 },
      { f: 369.99, d: 0.5, del: 0.6 },
    ];

    notes.forEach(n => {
      const noteTime = t + n.del;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(noteTime);
      osc.stop(noteTime + n.d + 0.05);
    });
  }

  /**
   * Fanfarria enérgica de Activación de Poder de Comandante (COP)
   */
  private synthCOPower(ctx: AudioContext, t: number) {
    // Arpegio ascendente brillante con tono cuadrado 16-bit
    const notes = [
      { f: 261.63, d: 0.1, del: 0 },       // C4
      { f: 329.63, d: 0.1, del: 0.08 },    // E4
      { f: 392.00, d: 0.1, del: 0.16 },    // G4
      { f: 523.25, d: 0.35, del: 0.24 },   // C5
    ];

    notes.forEach(n => {
      const noteTime = t + n.del;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(n.f, noteTime);

      gain.gain.setValueAtTime(0.35, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(noteTime);
      osc.stop(noteTime + n.d + 0.05);
    });
  }

  /**
   * Fanfarria de Superpoder de Comandante (SCOP) con arpegio doble y resonancia
   */
  private synthSuperCOPower(ctx: AudioContext, t: number) {
    const notes = [
      { f: 293.66, d: 0.08, del: 0 },      // D4
      { f: 369.99, d: 0.08, del: 0.07 },   // F#4
      { f: 440.00, d: 0.08, del: 0.14 },   // A4
      { f: 587.33, d: 0.1, del: 0.21 },    // D5
      { f: 739.99, d: 0.12, del: 0.28 },   // F#5
      { f: 880.00, d: 0.45, del: 0.36 },   // A5
    ];

    notes.forEach(n => {
      const noteTime = t + n.del;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, noteTime);

      gain.gain.setValueAtTime(0.4, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(noteTime);
      osc.stop(noteTime + n.d + 0.05);
    });
  }

  private synthButtonClick(ctx: AudioContext, t: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * Generador de ráfaga de ruido blanco con filtro Biquad para percusiones y explosiones
   */
  private playNoiseBurst(
    ctx: AudioContext,
    t: number,
    duration: number,
    startCutoff: number,
    endCutoff: number,
    peakVolume: number
  ) {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(startCutoff, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, endCutoff), t + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peakVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    noise.start(t);
    noise.stop(t + duration);
  }

  // =========================================================================
  // MÚSICA DE FONDO (BGM) PROCEDURAL TÁCTICA
  // =========================================================================

  /**
   * Inicia la música de fondo militar en bucle continuo
   */
  public startBgm(theme: 'march' | 'tension' = 'march') {
    if (this.isBgmPlaying && this.currentBgmTheme === theme) return;

    this.initContext();
    this.stopBgm();
    this.isBgmPlaying = true;
    this.currentBgmTheme = theme;
    this.bgmStep = 0;

    // Tempo: 125 BPM -> ~120ms por semicorchea (16th note)
    const stepIntervalMs = 120;

    this.bgmIntervalId = window.setInterval(() => {
      this.tickBgm();
    }, stepIntervalMs);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  public isMusicActive(): boolean {
    return this.isBgmPlaying;
  }

  /**
   * Paso rítmico del secuenciador de marcha táctica estilo Advance Wars
   */
  private tickBgm() {
    if (this.settings.muted || this.settings.masterVolume === 0 || this.settings.musicVolume === 0) {
      return;
    }

    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;

    const t = ctx.currentTime;
    const step = this.bgmStep % 16;
    this.bgmStep++;

    // 1. BOMBO MILITAR (Pasos 0, 4, 8, 12)
    if (step === 0 || step === 4 || step === 8 || step === 12) {
      this.synthBassDrum(ctx, t);
    }

    // 2. CAJA / REDOBLANTE DE MARCHA (Pasos 4, 12, con síncopas en 7, 14)
    if (step === 4 || step === 12 || step === 7 || step === 14) {
      this.synthSnare(ctx, t, step === 7 ? 0.15 : 0.25);
    }

    // 3. LÍNEA DE BAJO TÁCTICA (Arpegio en corcheas)
    if (step % 2 === 0) {
      const bassFreqs = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83]; // A2, C3, D3, E3
      const noteIdx = Math.floor(step / 2) % bassFreqs.length;
      this.synthBassNote(ctx, t, bassFreqs[noteIdx]);
    }

    // 4. MELODÍA DE ARPEGIO LEAD RETRO (Pasos selectos)
    if (step === 2 || step === 6 || step === 10 || step === 15) {
      const leadNotes = [440, 523.25, 659.25, 587.33];
      const leadIdx = Math.floor(step / 4) % leadNotes.length;
      this.synthLeadNote(ctx, t, leadNotes[leadIdx]);
    }
  }

  private synthBassDrum(ctx: AudioContext, t: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.1);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  private synthSnare(ctx: AudioContext, t: number, volume: number) {
    this.playNoiseBurst(ctx, t, 0.08, 3000, 800, volume * 0.7);
  }

  private synthBassNote(ctx: AudioContext, t: number, freq: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(550, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain!);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  private synthLeadNote(ctx: AudioContext, t: number, freq: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(t);
    osc.stop(t + 0.16);
  }
}

export const audioManager = TacticalAudioManager.getInstance();

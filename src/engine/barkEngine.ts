/**
 * ==============================================================================
 * BARK ENGINE PROCEDURAL DE NOVELA GRÁFICA (SIN VOCES)
 * ==============================================================================
 * Proyecto: Tactical Command: Wars of Legacy
 * Especificación Canónica: docs/03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md
 * Estilo de Diseño Visual: agents/skills/retro-futurism/skill.md
 * 
 * Reglas Fundacionales:
 * 1. Cero archivos de audio de voz pesados (100% visual y reactivo sobre Canvas).
 * 2. Bocadillos tipográficos dinámicos: speech, shout, thought, whisper, radio.
 * 3. Sellos Pop-Art de onomatopeyas rotados con sombra dura offset.
 * 4. Muestreo ponderado estocástico O(1) con memoria anti-repetición.
 * 5. Interpolación dinámica según nivel de afinidad (Bonding 1 a 10).
 */

import { supabase } from '../lib/supabase/client';

export type BarkTriggerContext =
  | 'match_start'
  | 'low_hp'
  | 'enemy_near_miss'
  | 'kill_heavy_tank'
  | 'trap_ambush'
  | 'hq_siege'
  | 'cop_activated'
  | 'scop_activated'
  | 'victory'
  | 'defeat'
  | 'airdrop_spawn'
  | 'airdrop_claimed'
  | 'tilt_streak'
  | 'idle_funds';

export type BubbleShape = 'speech' | 'shout' | 'thought' | 'whisper' | 'radio';

export type OnomatopoeiaStamp =
  | '¡BOOM!'
  | '¡RATATAT!'
  | '¡TACTICAL!'
  | '¡ALERT!'
  | '¡CLUTCH!'
  | '¡TRAP!'
  | '¡AIRDROP!'
  | '¡HOLD!'
  | '¡CALCULATED!'
  | '¡PANIC!'
  | '¡HEADSHOT!'
  | '¡SINK!'
  | '¡CRASH!';

export type VignetteMood =
  | 'neutral'
  | 'stern'
  | 'angry'
  | 'mocking'
  | 'proud'
  | 'alarmed'
  | 'tactical_focus'
  | 'clutch_relief'
  | 'defeat_despair';

export interface BarkTemplate {
  id: string;
  commanderId: string; // 'stella', 'volkov', 'vance', 'colin', 'andy', 'all', etc.
  triggerContext: BarkTriggerContext;
  triggerPhase?: 'pre_match' | 'in_match' | 'post_match' | 'menu_lobby';
  bubbleShape: BubbleShape;
  onomatopoeia: OnomatopoeiaStamp | null;
  mood: VignetteMood;
  minBondingLevel: number; // 1 a 10
  priorityWeight: number; // Mayor peso = mayor probabilidad
  cooldownTurns: number;
  text: string;
}

export interface ActiveBarkDisplay {
  id: string;
  commanderId: string;
  commanderName: string;
  commanderTitle: string;
  portraitUrl: string;
  faction: string;
  bubbleShape: BubbleShape;
  onomatopoeia: OnomatopoeiaStamp | null;
  mood: VignetteMood;
  text: string;
  bondingLevel: number;
  durationMs: number;
  stampRotationDeg: number;
}

// ----------------------------------------------------------------------------
// CATÁLOGO LOCAL CANÓNICO DE PLANTILLAS DE BARKS
// Usado en tiempo real sin latencia de red, con soporte de respaldo offline.
// ----------------------------------------------------------------------------
export const CANONICAL_BARK_TEMPLATES: BarkTemplate[] = [
  // ========================== STELLA ==========================
  {
    id: 'stella_start_01',
    commanderId: 'stella',
    triggerContext: 'match_start',
    bubbleShape: 'shout',
    onomatopoeia: '¡RATATAT!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 10,
    cooldownTurns: 10,
    text: '¡Pisa el acelerador a fondo! ¡No quiero ver un solo tanque frenando antes de aplastar su cuartel!',
  },
  {
    id: 'stella_start_b3',
    commanderId: 'stella',
    triggerContext: 'match_start',
    bubbleShape: 'shout',
    onomatopoeia: '¡RATATAT!',
    mood: 'proud',
    minBondingLevel: 3,
    priorityWeight: 25,
    cooldownTurns: 10,
    text: '¡{player_name}! ¡Espero que hoy no me hagas perder el tiempo contra estos aficionados!',
  },
  {
    id: 'stella_low_hp_01',
    commanderId: 'stella',
    triggerContext: 'low_hp',
    bubbleShape: 'shout',
    onomatopoeia: '¡ALERT!',
    mood: 'alarmed',
    minBondingLevel: 1,
    priorityWeight: 20,
    cooldownTurns: 2,
    text: '¡¿Qué diablos haces?! ¡Están pulverizando nuestro blindaje! ¡Reorganiza esa línea YA!',
  },
  {
    id: 'stella_kill_heavy_01',
    commanderId: 'stella',
    triggerContext: 'kill_heavy_tank',
    bubbleShape: 'shout',
    onomatopoeia: '¡BOOM!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 30,
    cooldownTurns: 3,
    text: '¡CHEMARES! ¡Ese blindado pesado explotó como una lata de conserva barata!',
  },
  {
    id: 'stella_near_miss_01',
    commanderId: 'stella',
    triggerContext: 'enemy_near_miss',
    bubbleShape: 'shout',
    onomatopoeia: '¡BOOM!',
    mood: 'angry',
    minBondingLevel: 1,
    priorityWeight: 40,
    cooldownTurns: 5,
    text: '¡MALDITA SEA! ¡Se quedaron a 1 HP por culpa de su blindaje! ¡Ese tanque debía ser chatarra!',
  },
  {
    id: 'stella_trap_01',
    commanderId: 'stella',
    triggerContext: 'trap_ambush',
    bubbleShape: 'shout',
    onomatopoeia: '¡TRAP!',
    mood: 'alarmed',
    minBondingLevel: 1,
    priorityWeight: 25,
    cooldownTurns: 2,
    text: '¡Maldita sea, una emboscada! ¡Giren las torretas hacia el bosque inmediatamente!',
  },
  {
    id: 'stella_cop_01',
    commanderId: 'stella',
    triggerContext: 'cop_activated',
    bubbleShape: 'shout',
    onomatopoeia: '¡RATATAT!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 20,
    cooldownTurns: 1,
    text: '¡Sobrecarga Alfa activada! ¡Abran fuego con todo lo que tengan en la recámara!',
  },
  {
    id: 'stella_scop_01',
    commanderId: 'stella',
    triggerContext: 'scop_activated',
    bubbleShape: 'shout',
    onomatopoeia: '¡BOOM!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 35,
    cooldownTurns: 1,
    text: '¡ASALTO BLITZKRIEG TOTAL! ¡Borren esa cuadrícula del mapa ahora mismo!',
  },
  {
    id: 'stella_victory_01',
    commanderId: 'stella',
    triggerContext: 'victory',
    bubbleShape: 'speech',
    onomatopoeia: '¡CLUTCH!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 15,
    cooldownTurns: 10,
    text: '¡Aplastados bajo nuestras orugas! Eso les enseñará a no desafiar a la división blindada.',
  },
  {
    id: 'stella_clutch_b3',
    commanderId: 'stella',
    triggerContext: 'victory',
    bubbleShape: 'speech',
    onomatopoeia: '¡CLUTCH!',
    mood: 'clutch_relief',
    minBondingLevel: 3,
    priorityWeight: 30,
    cooldownTurns: 10,
    text: '¡Por un pelo de acero, {player_name}! Estuvimos al borde del abismo... ¡así es como se gana!',
  },
  {
    id: 'stella_defeat_01',
    commanderId: 'stella',
    triggerContext: 'defeat',
    bubbleShape: 'shout',
    onomatopoeia: '¡PANIC!',
    mood: 'angry',
    minBondingLevel: 1,
    priorityWeight: 20,
    cooldownTurns: 10,
    text: '¡Esto no se queda así! ¡Reabastezcan los tanques, volveremos a pasarles por encima!',
  },
  {
    id: 'stella_airdrop_01',
    commanderId: 'stella',
    triggerContext: 'airdrop_spawn',
    bubbleShape: 'shout',
    onomatopoeia: '¡AIRDROP!',
    mood: 'tactical_focus',
    minBondingLevel: 1,
    priorityWeight: 20,
    cooldownTurns: 3,
    text: '¡Suministros aéreos detectados! ¡Aseguren esa caja antes de que esos buitres la toquen!',
  },

  // ========================== VOLKOV ==========================
  {
    id: 'volkov_start_01',
    commanderId: 'volkov',
    triggerContext: 'match_start',
    bubbleShape: 'thought',
    onomatopoeia: '¡CALCULATED!',
    mood: 'neutral',
    minBondingLevel: 1,
    priorityWeight: 10,
    cooldownTurns: 10,
    text: 'Baterías listas. Cada casilla es un vector de impacto. No desperdicies munición en disparos inciertos.',
  },
  {
    id: 'volkov_start_b3',
    commanderId: 'volkov',
    triggerContext: 'match_start',
    bubbleShape: 'speech',
    onomatopoeia: '¡CALCULATED!',
    mood: 'neutral',
    minBondingLevel: 3,
    priorityWeight: 25,
    cooldownTurns: 10,
    text: 'Camarada {player_name}, los cálculos de balística están calibrados a tu favor. Procede con disciplina.',
  },
  {
    id: 'volkov_trap_01',
    commanderId: 'volkov',
    triggerContext: 'trap_ambush',
    bubbleShape: 'whisper',
    onomatopoeia: '¡TRAP!',
    mood: 'alarmed',
    minBondingLevel: 1,
    priorityWeight: 25,
    cooldownTurns: 2,
    text: 'Emboscada en sector boscoso. Error de reconocimiento elemental. Retrocede a rango de tiro indirecto.',
  },
  {
    id: 'volkov_near_miss_01',
    commanderId: 'volkov',
    triggerContext: 'enemy_near_miss',
    bubbleShape: 'thought',
    onomatopoeia: '¡CALCULATED!',
    mood: 'stern',
    minBondingLevel: 1,
    priorityWeight: 35,
    cooldownTurns: 5,
    text: 'El vector balístico fue matemáticamente impecable; sin embargo, su blindaje resistió con 2 HP. Recomiendo reforzar el calibre.',
  },
  {
    id: 'volkov_cop_01',
    commanderId: 'volkov',
    triggerContext: 'cop_activated',
    bubbleShape: 'speech',
    onomatopoeia: '¡CALCULATED!',
    mood: 'tactical_focus',
    minBondingLevel: 1,
    priorityWeight: 20,
    cooldownTurns: 1,
    text: 'Proyectiles de largo alcance cebados. El rango de fuego efectivo se ha incrementado.',
  },
  {
    id: 'volkov_scop_01',
    commanderId: 'volkov',
    triggerContext: 'scop_activated',
    bubbleShape: 'shout',
    onomatopoeia: '¡BOOM!',
    mood: 'tactical_focus',
    minBondingLevel: 1,
    priorityWeight: 35,
    cooldownTurns: 1,
    text: '¡LLUVIA DE ACERO! Coordenadas bloqueadas en todo el teatro. Fuego a discreción.',
  },
  {
    id: 'volkov_victory_01',
    commanderId: 'volkov',
    triggerContext: 'victory',
    bubbleShape: 'speech',
    onomatopoeia: '¡CALCULATED!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 15,
    cooldownTurns: 10,
    text: 'Victoria confirmada con margen estadístico aceptable. Buen trabajo en el control de cuadrícula.',
  },

  // ========================== VANCE ==========================
  {
    id: 'vance_start_01',
    commanderId: 'vance',
    triggerContext: 'match_start',
    bubbleShape: 'speech',
    onomatopoeia: '¡HOLD!',
    mood: 'stern',
    minBondingLevel: 1,
    priorityWeight: 10,
    cooldownTurns: 10,
    text: '¡Mantengan la formación! Un ejército que defiende sus fábricas es un ejército invencible.',
  },
  {
    id: 'vance_start_b3',
    commanderId: 'vance',
    triggerContext: 'match_start',
    bubbleShape: 'speech',
    onomatopoeia: '¡HOLD!',
    mood: 'proud',
    minBondingLevel: 3,
    priorityWeight: 25,
    cooldownTurns: 10,
    text: '¡Al frente una vez más, {player_name}! La Vanguardia de Hierro nunca da un paso atrás.',
  },
  {
    id: 'vance_low_hp_01',
    commanderId: 'vance',
    triggerContext: 'low_hp',
    bubbleShape: 'shout',
    onomatopoeia: '¡ALERT!',
    mood: 'alarmed',
    minBondingLevel: 1,
    priorityWeight: 20,
    cooldownTurns: 2,
    text: '¡No cedan un solo metro! ¡Atrinchérense en las ciudades y reparen ese blindaje!',
  },
  {
    id: 'vance_cop_01',
    commanderId: 'vance',
    triggerContext: 'cop_activated',
    bubbleShape: 'shout',
    onomatopoeia: '¡HOLD!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 20,
    cooldownTurns: 1,
    text: '¡Reparación de campo de emergencia! ¡Levanten esas orugas, la batalla continúa!',
  },
  {
    id: 'vance_hq_siege_01',
    commanderId: 'vance',
    triggerContext: 'hq_siege',
    bubbleShape: 'shout',
    onomatopoeia: '¡ALERT!',
    mood: 'alarmed',
    minBondingLevel: 1,
    priorityWeight: 40,
    cooldownTurns: 1,
    text: '¡EL CUARTEL GENERAL ESTÁ BAJO ASEDIO! ¡Concentren todo el fuego en el capturador!',
  },
  {
    id: 'vance_defeat_01',
    commanderId: 'vance',
    triggerContext: 'defeat',
    bubbleShape: 'speech',
    onomatopoeia: '¡PANIC!',
    mood: 'defeat_despair',
    minBondingLevel: 1,
    priorityWeight: 20,
    cooldownTurns: 10,
    text: 'Retrocedan con orden. Aprendan de las brechas en la defensa para el próximo despliegue.',
  },

  // ========================== COLIN ==========================
  {
    id: 'colin_start_01',
    commanderId: 'colin',
    triggerContext: 'match_start',
    bubbleShape: 'speech',
    onomatopoeia: '¡TACTICAL!',
    mood: 'neutral',
    minBondingLevel: 1,
    priorityWeight: 10,
    cooldownTurns: 10,
    text: '¡Mis fondos están listos para la producción en masa! Espero no arruinar el presupuesto...',
  },
  {
    id: 'colin_cop_01',
    commanderId: 'colin',
    triggerContext: 'cop_activated',
    bubbleShape: 'shout',
    onomatopoeia: '¡TACTICAL!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 25,
    cooldownTurns: 1,
    text: '¡Inyección de capital de emergencia! ¡Produzcan tanques con el descuento de oro!',
  },

  // ========================== ANDY ==========================
  {
    id: 'andy_start_01',
    commanderId: 'andy',
    triggerContext: 'match_start',
    bubbleShape: 'speech',
    onomatopoeia: '¡TACTICAL!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 10,
    cooldownTurns: 10,
    text: '¡Llaves inglesas listas! ¡No hay daño en el campo que mis técnicos no puedan reparar!',
  },
  {
    id: 'andy_cop_01',
    commanderId: 'andy',
    triggerContext: 'cop_activated',
    bubbleShape: 'shout',
    onomatopoeia: '¡HOLD!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 20,
    cooldownTurns: 1,
    text: '¡Hyper Repair! ¡Todas las unidades recuperan 2 HP y vuelven a la carga!',
  },
  {
    id: 'andy_scop_01',
    commanderId: 'andy',
    triggerContext: 'scop_activated',
    bubbleShape: 'shout',
    onomatopoeia: '¡BOOM!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 30,
    cooldownTurns: 1,
    text: '¡HYPER UPGRADE! ¡Cura masiva de 5 HP y +1 de movimiento para todo el ejército!',
  },

  // ========================== HAWKE ==========================
  {
    id: 'hawke_start_01',
    commanderId: 'hawke',
    triggerContext: 'match_start',
    bubbleShape: 'radio',
    onomatopoeia: '¡HEADSHOT!',
    mood: 'stern',
    minBondingLevel: 1,
    priorityWeight: 10,
    cooldownTurns: 10,
    text: 'Cielos bajo radar. Su derrota ya ha sido calculada, solo resta ejecutarla.',
  },
  {
    id: 'hawke_scop_01',
    commanderId: 'hawke',
    triggerContext: 'scop_activated',
    bubbleShape: 'shout',
    onomatopoeia: '¡BOOM!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 35,
    cooldownTurns: 1,
    text: '¡BLACK STORM! ¡Drenen su energía vital y reabastezcan nuestros cazas de inmediato!',
  },

  // ========================== RACHEL ==========================
  {
    id: 'rachel_scop_01',
    commanderId: 'rachel',
    triggerContext: 'scop_activated',
    bubbleShape: 'shout',
    onomatopoeia: '¡BOOM!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 35,
    cooldownTurns: 1,
    text: '¡COBERTURA MISILÍSTICA! ¡Tres ojivas estratégicas impactando coordenadas enemigas!',
  },

  // ========================== SAMI ==========================
  {
    id: 'sami_scop_01',
    commanderId: 'sami',
    triggerContext: 'scop_activated',
    bubbleShape: 'shout',
    onomatopoeia: '¡TACTICAL!',
    mood: 'proud',
    minBondingLevel: 1,
    priorityWeight: 35,
    cooldownTurns: 1,
    text: '¡HQ CAPTURE VICTORY! ¡Infantería aerotransportada tomando instalaciones a velocidad relámpago!',
  },
];

export interface BarkContextPayload {
  commanderId: string;
  triggerContext: BarkTriggerContext;
  playerName?: string;
  unitName?: string;
  lossesCount?: number;
  bondingLevel?: number;
}

type BarkListener = (bark: ActiveBarkDisplay) => void;

class ProceduralBarkEngine {
  private static instance: ProceduralBarkEngine | null = null;
  private listeners: Set<BarkListener> = new Set();
  private recentBarkIds: string[] = [];
  private currentTurnCooldowns: Map<string, number> = new Map();
  private activeBark: ActiveBarkDisplay | null = null;
  private activeTimeoutId: number | null = null;

  private constructor() {}

  public static getInstance(): ProceduralBarkEngine {
    if (!ProceduralBarkEngine.instance) {
      ProceduralBarkEngine.instance = new ProceduralBarkEngine();
    }
    return ProceduralBarkEngine.instance;
  }

  public subscribe(listener: BarkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Detona un diálogo reactivo del comandante según el contexto táctico actual.
   */
  public async triggerBark(context: BarkContextPayload): Promise<ActiveBarkDisplay | null> {
    const bondingLevel = context.bondingLevel ?? 1;
    const playerName = context.playerName || 'Comandante';

    // 1. Intentar consultar RPC en Supabase si está disponible en línea
    let selectedTemplate: BarkTemplate | null = null;

    try {
      const { data, error } = await supabase.rpc('rpc_get_contextual_bark', {
        p_commander_id: context.commanderId,
        p_trigger_context: context.triggerContext,
      });

      if (!error && data && data.has_bark) {
        selectedTemplate = {
          id: data.bark_id,
          commanderId: data.commander_id,
          triggerContext: context.triggerContext,
          bubbleShape: data.speaker_shape as BubbleShape,
          onomatopoeia: data.onomatopoeia as OnomatopoeiaStamp,
          mood: data.vignette_mood as VignetteMood,
          minBondingLevel: data.bonding_level,
          priorityWeight: 10,
          cooldownTurns: 2,
          text: data.dialogue_text,
        };
      }
    } catch {
      // Modo offline o simulación local: continúa al fallback local sin interrupción
    }

    // 2. Si no hubo RPC o estamos offline, usar el catálogo canónico local con muestreo O(1)
    if (!selectedTemplate) {
      selectedTemplate = this.sampleLocalTemplate(context.commanderId, context.triggerContext, bondingLevel);
    }

    if (!selectedTemplate) {
      return null;
    }

    // 3. Interpolación de tokens dinámicos
    let interpolatedText = selectedTemplate.text;
    if (bondingLevel >= 3) {
      interpolatedText = interpolatedText.replace(/{player_name}/g, playerName);
    } else {
      interpolatedText = interpolatedText.replace(/{player_name}/g, 'Cadete');
    }

    if (context.unitName) {
      interpolatedText = interpolatedText.replace(/{unit_name}/g, context.unitName);
    }

    // Rotación aleatoria moderada para el sello Pop-Art (-12° a +12°)
    const stampRotationDeg = Math.floor(Math.random() * 24) - 12;

    const activeDisplay: ActiveBarkDisplay = {
      id: `${selectedTemplate.id}_${Date.now()}`,
      commanderId: selectedTemplate.commanderId,
      commanderName: this.getCommanderDisplayName(selectedTemplate.commanderId),
      commanderTitle: this.getCommanderTitle(selectedTemplate.commanderId),
      portraitUrl: this.getCommanderPortraitUrl(selectedTemplate.commanderId, selectedTemplate.mood),
      faction: this.getCommanderFaction(selectedTemplate.commanderId),
      bubbleShape: selectedTemplate.bubbleShape,
      onomatopoeia: selectedTemplate.onomatopoeia,
      mood: selectedTemplate.mood,
      text: interpolatedText,
      bondingLevel,
      durationMs: 4500, // 4.5 segundos en pantalla
      stampRotationDeg,
    };

    // Actualizar historial anti-repetición
    this.recordBarkActivation(selectedTemplate.id);
    this.activeBark = activeDisplay;

    // Notificar a todos los suscriptores UI
    this.listeners.forEach(cb => cb(activeDisplay));

    // Temporizador de auto-cierre
    if (this.activeTimeoutId) {
      clearTimeout(this.activeTimeoutId);
    }
    this.activeTimeoutId = window.setTimeout(() => {
      this.clearActiveBark();
    }, activeDisplay.durationMs);

    return activeDisplay;
  }

  public clearActiveBark(): void {
    if (this.activeTimeoutId) {
      clearTimeout(this.activeTimeoutId);
      this.activeTimeoutId = null;
    }
    this.activeBark = null;
    this.listeners.forEach(cb => cb(null as unknown as ActiveBarkDisplay));
  }

  public getActiveBark(): ActiveBarkDisplay | null {
    return this.activeBark;
  }

  /**
   * Muestreo estocástico ponderado O(1) con exclusión de barks recientes.
   */
  private sampleLocalTemplate(
    commanderId: string,
    context: BarkTriggerContext,
    bondingLevel: number
  ): BarkTemplate | null {
    const candidates = CANONICAL_BARK_TEMPLATES.filter(t => {
      const matchCo = t.commanderId === commanderId || t.commanderId === 'all';
      const matchCtx = t.triggerContext === context;
      const matchBond = t.minBondingLevel <= bondingLevel;
      const notRecent = !this.recentBarkIds.includes(t.id);
      return matchCo && matchCtx && matchBond && notRecent;
    });

    if (candidates.length === 0) {
      // Si todos fueron filtrados por historial reciente, relajar el filtro de historial
      const fallbackCandidates = CANONICAL_BARK_TEMPLATES.filter(
        t => (t.commanderId === commanderId || t.commanderId === 'all') && t.triggerContext === context
      );
      if (fallbackCandidates.length === 0) return null;
      return fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)];
    }

    // Muestreo estocástico ponderado por priorityWeight
    const totalWeight = candidates.reduce((sum, c) => sum + c.priorityWeight, 0);
    let rand = Math.random() * totalWeight;

    for (const cand of candidates) {
      if (rand < cand.priorityWeight) {
        return cand;
      }
      rand -= cand.priorityWeight;
    }

    return candidates[0];
  }

  private recordBarkActivation(barkId: string): void {
    this.recentBarkIds.push(barkId);
    if (this.recentBarkIds.length > 5) {
      this.recentBarkIds.shift();
    }
  }

  private getCommanderDisplayName(coId: string): string {
    const names: Record<string, string> = {
      stella: 'Mayor Stella',
      volkov: 'Coronel Volkov',
      vance: 'Gral. Vance',
      colin: 'Colin',
      andy: 'Andy',
      hawke: 'Hawke',
      rachel: 'Rachel',
      sami: 'Sami',
      kanbei: 'Kanbei',
      grit: 'Grit',
      max: 'Max',
      eagle: 'Eagle',
    };
    return names[coId] || coId.toUpperCase();
  }

  private getCommanderTitle(coId: string): string {
    const titles: Record<string, string> = {
      stella: 'Especialista en Blindados Ligeros',
      volkov: 'Maestro de Balística de Asedio',
      vance: 'Comandante de la Vanguardia de Hierro',
      colin: 'Heredero Financiero de Blue Moon',
      andy: 'Especialista Mecánico de Reparación',
      hawke: 'Brigadier de Supremacía Táctica',
      rachel: 'Coordinadora de Artillería Estratégica',
      sami: 'Capitana de Infantería Aerotransportada',
    };
    return titles[coId] || 'Oficial Táctico';
  }

  private getCommanderFaction(coId: string): string {
    const factions: Record<string, string> = {
      stella: 'iron-vanguard',
      volkov: 'frost-legion',
      vance: 'iron-vanguard',
      colin: 'frost-legion',
      andy: 'aurora-dominion',
      hawke: 'shadow-syndicate',
      rachel: 'aurora-dominion',
      sami: 'aurora-dominion',
    };
    return factions[coId] || 'coalition';
  }

  private getCommanderPortraitUrl(coId: string, mood: VignetteMood): string {
    // Retratos en base pública con fallback a los retratos estándar
    return `/assets/CO/pixelated/${coId}-full.png`;
  }
}

export const barkEngine = ProceduralBarkEngine.getInstance();

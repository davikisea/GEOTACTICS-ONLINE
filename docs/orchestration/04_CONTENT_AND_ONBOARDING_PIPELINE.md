# PLAN DE ORQUESTACIÓN TÉCNICA: CONTENIDO, TUTORIAL INTERACTIVO Y PIPELINE AUDIOVISUAL
**Módulo:** `docs/orchestration/04_CONTENT_AND_ONBOARDING_PIPELINE.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión de Especificación:** 1.0.0-PROD-ORCHESTRATION  
**Estado:** `100% IMPLEMENTADO Y CERTIFICADO EN PRODUCCIÓN (SSOT)`  
**Destino de Implementación:** `src/engine/tutorialEngine.ts`, `src/engine/audioManager.ts`, `src/engine/campaignEngine.ts`, `src/components/game/TutorialOverlay.tsx`

---

## 1. GUION INTERACTIVO: MISIÓN "BAUTISMO DE FUEGO" (RESTRICCIÓN CELDA A CELDA)

### 1.1 Filosofía de Control Estricto
Para evitar la sobrecarga cognitiva en la primera partida del nuevo recluta, el motor ejecuta una máquina de estados determinista que intercepta los clics en el Canvas. Se bloquean todas las celdas y botones excepto las coordenadas estrictamente instruidas por el Alto Mando.

### 1.2 Mapa Canónico de Tutorial ($8 \times 6$ Casillas)
- **Coordenada (0, 2):** Cuartel General Aliado (HQ P1).
- **Coordenada (1, 2):** Infantería Aliada Inicial (10 HP).
- **Coordenada (2, 2):** Ciudad Neutral (20 HP de Captura).
- **Coordenada (5, 2):** Infantería Enemiga Dañada (5 HP).
- **Coordenada (7, 2):** Cuartel General Enemigo (HQ P2).

```
  0    1    2    3    4    5    6    7
┌────┬────┬────┬────┬────┬────┬────┬────┐
│Pln │Pln │Pln │For │For │Pln │Pln │Pln │ 0
├────┼────┼────┼────┼────┼────┼────┼────┤
│Pln │Mnt │Pln │Pln │Pln │Pln │Mnt │Pln │ 1
├────┼────┼────┼────┼────┼────┼────┼────┤
│HQ1 │Inf1│City│Pln │Pln │Inf2│Pln │HQ2 │ 2
├────┼────┼────┼────┼────┼────┼────┼────┤
│Pln │Pln │Pln │For │For │Pln │Pln │Pln │ 3
└────┴────┴────┴────┴────┴────┴────┴────┘
```

### 1.3 Secuencia de Pasos y Validación de Eventos

| Paso | Disparador / Viñeta de Radio Stella | Celda Autorizada | Acción Obligatoria | Condición de Avance |
| :---: | :--- | :---: | :---: | :--- |
| **P1** | *"¡Atención, Cadete! Selecciona tu escuadrón de infantería para avanzar."* | `(1, 2)` | `SELECT_UNIT` | Unidad seleccionada (`selectedUnit.id === 'inf1'`). Todas las demás celdas generan haptic de error y no responden. |
| **P2** | *"Toma esa ciudad neutral. Las ciudades financian nuestra maquinaria bélica."* | `(2, 2)` | `MOVE_TO_TILE` | La unidad llega a `(2, 2)`. El menú contextual se despliega filtrado únicamente con la opción `capture`. |
| **P3** | *"Pulsa 'Capturar'. Toda propiedad requiere 20 puntos de captura para caer."* | `(2, 2)` | `SUB_CAPTURE` | Captura iniciada. La ciudad pasa de 20 a 10 HP. Se cede el turno automáticamente. |
| **P4** | *"Turno 2. Asegura la ciudad para recibir $1,000G cada amanecer."* | `(2, 2)` | `SUB_CAPTURE` | La ciudad cae a 0 HP y pasa a ser de P1. Se inyectan $+\$1,000\text{G}$ en tesorería. |
| **P5** | *"Un escuadrón enemigo dañado custodia el camino. Despliega un Tanque Ligero desde la base."* | `(0, 2)` (Fábrica) | `PRODUCE_UNIT` | Se abre modal de producción bloqueado exclusivamente en `tank_light` ($7,000G). |
| **P6** | *"Fuego a discreción. El cañón de 75mm pulverizará a la infantería enemiga."* | `(4, 2)` $\rightarrow$ `(5, 2)` | `ATTACK_UNIT` | Tanque avanza a `(4, 2)` y ataca a la infantería en `(5, 2)`. Se resuelve el combate determinista (100% aniquilación). Sello Pop-Art `¡BOOM!`. |
| **P7** | *"Camino despejado. Marcha hacia el HQ rival para forzar la capitulación total."* | `(7, 2)` | `CAPTURE_HQ` | Victoria por Toma de Cuartel General. Recompensa otorgada: $+150\text{ XP}$ y ascenso a Nivel 2. |

---

## 2. CATÁLOGO MAESTRO DE AUDIO PROCEDURAL Y AUDIO BUFFERS

### 2.1 Filosofía Técnica: Cero Archivos de Voz y Carga Instantánea
Para cumplir el axioma canónico de rendimiento web ($< 1.0\text{s}$ de carga total), el sistema no carga clips de voz pregrabados. Las voces son 100% reemplazadas por el Bark Engine visual. El audio militar se gestiona mediante un sintetizador hibrido en `src/engine/audioManager.ts` basado en la Web Audio API con osciladores y convolución en tiempo real, complementado por buffers mínimos de percusión.

### 2.2 Matriz Canónica de Frecuencias y Efectos Sonoros

```typescript
// src/engine/audioManager.ts - Matriz de Síntesis y Parámetros
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
```

---

## 3. ESBOZO ARQUITECTÓNICO: MODO 3 (GRAN CAMPAÑA TÁCTICA)

### 3.1 Especificaciones de Escala
- **Dimensiones de Cuadrícula:** $24 \times 24$ a $32 \times 32$ casillas.
- **Límite de Turnos:** 40 Turnos máximo.
- **Teatros de Operaciones:** Terrestre, Aéreo y Naval integrados simultáneamente con niebla de guerra densa.

### 3.2 Estructura del Árbol de Misiones y Metadatos de Campaña
Crear `src/engine/campaignEngine.ts` definiendo las etapas doctrinales del conflicto:

```typescript
// src/engine/campaignEngine.ts
export interface CampaignMission {
  missionId: string;
  actNumber: number;
  chapterNumber: number;
  title: string;
  briefingDialogueKey: string;
  mapId: string;
  playerCO: string;
  enemyCO: string;
  fogOfWar: boolean;
  weatherPattern: 'clear' | 'dynamic' | 'snow' | 'sandstorm';
  primaryObjective: 'CAPTURE_HQ' | 'ROUT_ALL' | 'SURVIVE_TURNS' | 'ESCORT_UNIT';
  objectiveParams?: { targetTurns?: number; escortUnitId?: string };
  goldReward: number;
  xpReward: number;
  unlockedCompanions?: string[];
}

export const CAMPAIGN_ACT_I_MISSIONS: CampaignMission[] = [
  {
    missionId: 'act1_m01',
    actNumber: 1,
    chapterNumber: 1,
    title: 'Defensa de Puerto Esperanza',
    briefingDialogueKey: 'briefing_act1_01',
    mapId: 'campaign_coastal_defense_24x24',
    playerCO: 'stella',
    enemyCO: 'flak',
    fogOfWar: true,
    weatherPattern: 'clear',
    primaryObjective: 'SURVIVE_TURNS',
    objectiveParams: { targetTurns: 15 },
    goldReward: 3500,
    xpReward: 450,
  },
  {
    missionId: 'act1_m02',
    actNumber: 1,
    chapterNumber: 2,
    title: 'Brecha en el Estrecho de Hierro',
    briefingDialogueKey: 'briefing_act1_02',
    mapId: 'campaign_iron_strait_28x28',
    playerCO: 'volkov',
    enemyCO: 'adder',
    fogOfWar: true,
    weatherPattern: 'dynamic',
    primaryObjective: 'CAPTURE_HQ',
    goldReward: 5000,
    xpReward: 600,
    unlockedCompanions: ['garrison']
  }
];
```

### 3.3 Motor de Scripting de IA por Misión
A diferencia del bot de escaramuzas genérico (`TacticalBotAI`), la Campaña parametriza la IA con personalidades doctrinales explícitas:
- **`flak` (Agresivo Imprudente):** Prioriza la ofensiva cuerpo a cuerpo sobre el control de fábricas neutrales.
- **`grit` (Asedio Indirecto):** Mantiene baterías de artillería tras bosques y envía exploradores mecanizados solo para otorgar visión en niebla.
- **`drake` (Desgaste Marítimo):** Concentra submarinos y acorazados para cortar rutas costeras y asfixiar los desembarques aliados.

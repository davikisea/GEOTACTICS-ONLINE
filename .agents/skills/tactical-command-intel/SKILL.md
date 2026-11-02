---
name: tactical-command-intel
description: Directriz canónica de diseño, arquitectura UI/UX y motor de Game Feel para Tactical Command (Wars of Legacy). Fusiona la consola de mando táctico militar (C4ISR, blindaje, radares) con la energía cinética de la novela gráfica bélica (Advance Wars meets Persona 5 / Hades), bocadillos dinámicos del Bark Engine, sellos pop-art de onomatopeyas, paleta por facciones y física táctil reactiva (resortes, ghost bars, squash & stretch).
version: 4.0.0
date_added: "2026-11-01"
tags: [tactical-command, advance-wars, comic-war-room, kinetic-pop-art, c4isr, game-feel, bark-engine, diegetic-ui]
---

# Tactical Command Intel: Kinetic Comic War-Room UI/UX Engine

> *"La tensión estratégica de una sala de mando militar (C4ISR) fusionada con la contundencia cinética de la novela gráfica bélica: consolas de acero blindado, viñetas de cómic reactivas, bocadillos con tramas Ben-Day, sellos de onomatopeyas pop-art (Advance Wars meets Persona 5 / Hades), colores heráldicos de facción y una respuesta física táctil llena de Juice donde cada orden sacude el tablero."*

---

## 1. Manifiesto y ADN Visual Canónico

Esta skill define el **estándar canónico absoluto de interfaz, interacción y experiencia de usuario (UI/UX)** para *Tactical Command: Wars of Legacy*, alineado con los tres pilares fundacionales del Master GDD:
1. **Pilar 1 (Táctica Determinista GBA):** Claridad balística, matriz de daño sin azar, lectura instantánea de casillas y estados.
2. **Pilar 2 (Metajuego Industrial & Mazo de 10 Cartas):** Despliegue de tropas táctiles, hangares, refinería y mercado P2P.
3. **Pilar 3 (Bark Engine Cómic):** Narrativa contextual reactiva estilo cómic (CERO voces, 100% gráfico/texto), bocadillos con 5 formas (*shout*, *thought*, *whisper*, *radio*, *panic*) y sellos de onomatopeyas.

### 🚫 Anti-Patrones Terminantemente Prohibidos
* **NO es una Terminal Monocromática Muerta:** Queda prohibido forzar toda la interfaz a un verde Matrix `#00FF66` plano y austero. El juego tiene facciones coloridas, comandantes con identidad propia y dinamismo gráfico.
* **NO es un SaaS Corporativo Aburrido:** Prohibidas las tarjetas simétricas blancas o gris neutro con `border-radius: 8px` y sombras difuminadas suaves de Tailwind (`box-shadow: 0 4px 6px rgba(0,0,0,0.1)`).
* **NO es Fantasía Espacial ni Steampunk:** Cero naves interestelares, toberas de cohetes o engranajes de bronce victoriano. Es tecnología militar contemporánea/retro-futurista de alta tensión bélica (terrestre, naval y aérea).

---

## 2. Las 4 Capas de Diegesis de la Interfaz

Para garantizar que la información fluya sin saturar la atención del comandante, toda vista debe estructurarse en 4 cuadrantes diegéticos:

```
+---------------------------------------------------------------------------------------------------------+
| CAPA 4: NO-DIEGÉTICA (HUD de Esquinas)  | Fondos $G, Reloj Fischer (15s/30s), Atajos [Q], [E], [SPACE]  |
| CAPA 3: META (Cristal de Pantalla)      | Viñeta roja en daño crítico/DEFCON 1, resplandor dorado en SCOP|
| CAPA 2: ESPACIAL (Coordenadas de Acción)| Daño flotante (-4 HP), rutas A*, marcas ¡TRAP!, airdrops      |
| CAPA 1: DIEGÉTICA (Dentro del Mundo)    | Mapa de cuadrícula 2D, consolas blindadas, diorama de cuartel  |
+---------------------------------------------------------------------------------------------------------+
```

1. **Capa Diegética:** Contenedores que simulan equipo del mundo real: consolas de mando, cartas del hangar de producción y diales analógicos.
2. **Capa Espacial:** Feedback renderizado directamente sobre el Canvas o la loseta: indicadores de cobertura (★), barras de captura de bases y números balísticos con trayectoria parabólica.
3. **Capa Meta:** Efectos en el marco del viewport: parpadeo de alarma periférica ante emboscadas o asaltos a la sede HQ.
4. **Capa No-Diegética:** HUD táctico de alta velocidad en las esquinas superiores, legible en menos de 100ms.

---

## 3. Paleta Cromática: Base Blindada y Facciones Heráldicas

El color comunica facción, estado de alerta y jerarquía operativa:

### 3.1. Núcleo Blindado (Chasis de Mando)
| Token | Hex | Rol en Interfaz |
| :--- | :--- | :--- |
| `--color-bunker-void` | `#161712` | Fondo de aplicación, fosos de pantalla y sombras de profundidad. |
| `--color-armor-base` | `#2B2C24` | Fondo de paneles, tarjetas de unidad y consolas de mando. |
| `--color-military-olive`| `#46521F` | Cubiertas secundarias, acentos de blindaje y módulos de apoyo. |
| `--color-metal-edge` | `#7B8A4A` | Biseles, cantos metálicos y uniones estructurales. |
| `--color-rust-alert` | `#C46A3A` | Botones de orden de combate, avisos DEFCON y daño balístico. |
| `--color-data-cream` | `#F2E8D5` | Tipografía principal, cifras tácticas, fondos de bocadillo y etiquetas. |

### 3.2. Facciones Canónicas (Acentos de Mando y COs)
* **Orange Star (Ofensiva Directa):** `--color-fac-orange: #E65100;` / `--color-fac-amber: #F59E0B;`
* **Blue Moon (Asedio & Ártico):** `--color-fac-blue: #1D4ED8;` / `--color-fac-ice: #93C5FD;`
* **Green Earth (Superioridad Aérea/Naval):** `--color-fac-green: #15803D;` / `--color-fac-nickel: #86EFAC;`
* **Yellow Comet (Tácticas Samurái & Élite):** `--color-fac-gold: #D97706;` / `--color-fac-sand: #FDE047;`
* **Black Hole (Tecnología Oscura & Asalto):** `--color-fac-void: #4C1D95;` / `--color-fac-crimson: #991B1B;`

### 3.3. Telemetría y Radares
* **Verde Fósforo CRT / Online:** `#00FF66` (Radares tácticos terrestres, terminales activas, telemetría online).
* **Ámbar Precaución:** `#FBBF24` (Suministros bajos, alerta de combustible).
* **Carmesí DEFCON 1:** `#EF4444` (Cuartel General bajo asedio, derrota inminente).

---

## 4. Geometría Cinética: Bordes Afilados y Asimetría Cómic

La identidad geométrica fusiona los cortes mecanizados a 45° con las curvas asimétricas y dinámicas de la novela gráfica:

### 4.1. Curvatura Asimétrica Táctica Canónica
Para tarjetas de comandantes, badges de rango, medidores de recursos y bocadillos de diálogo:
```css
/* Esquinas asimétricas estándar del proyecto */
border-radius: 14px 4px 14px 4px;
/* Variación para tarjetas mayores y cabeceras de pantalla */
border-radius: 40px 10px 40px 10px;
```

### 4.2. Chaflanes a 45° para Módulos Blindados
Para ventanas de armería, modales de despliegue y slots de producción:
```css
clip-path: polygon(
  12px 0, calc(100% - 12px) 0,
  100% 12px, 100% calc(100% - 12px),
  calc(100% - 12px) 100%, 12px 100%,
  0 calc(100% - 12px), 0 12px
);
```

### 4.3. Sombras de Tinta Offset y Tramas Ben-Day
Sombras duras de cómic militar sin desenfoque (offset rígido):
```css
/* Sombra dura de impacto */
box-shadow: 4px 4px 0px #0A0B08;
box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.95);

/* Trama de puntos Ben-Day para fondos de viñeta */
background-image: radial-gradient(#7B8A4A 15%, transparent 16%);
background-size: 8px 8px;
```

---

## 5. Motor de "Game Feel" & "Juice" Táctico

Toda interacción debe sentirse física, elástica y visceral:

```css
:root {
  /* Resorte elástico para hovers y aperturas */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  /* Desaceleración balística para proyectiles y salidas */
  --ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1);
}
```

### 5.1. Botones de Mando con Hundimiento Físico 3D y Squash & Stretch
Los botones de acción militar (`¡ORDEN DE COMBATE!`, `DESPLEGAR`, `ACTIVAR SCOP`) deben tener espesor físico real:
```css
.tactical-btn-heavy {
  background: linear-gradient(180deg, #df7b48 0%, #C46A3A 60%, #873612 100%);
  color: var(--color-data-cream);
  border: 2px solid var(--color-data-cream);
  border-bottom: 5px solid #5a1e05;
  border-radius: 6px 2px 6px 2px;
  font-family: 'Futura', 'Jost', sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  box-shadow: 3px 3px 0px #0A0B08;
  cursor: pointer;
  transition: transform 0.12s var(--ease-spring), border-bottom-width 0.06s ease;
}

.tactical-btn-heavy:hover {
  transform: translateY(-2px) scale(1.02);
  filter: brightness(1.1);
}

.tactical-btn-heavy:active {
  transform: translateY(3px) scale(1.04, 0.94);
  border-bottom-width: 2px;
  box-shadow: 1px 1px 0px #0A0B08;
}
```

### 5.2. Barras de Vida y Energía con "Ghost Drain"
Toda barra de HP, captura de sede o carga de Superpoder CO debe tener doble barra:
1. **Barra Frontal:** Actualiza al instante el nuevo valor numérico.
2. **Barra Fantasma (Ghost Trail en Crema o Amarillo):** Espera `220ms` y se desliza suavemente (`transition: width 0.45s var(--ease-out-expo)`), haciendo visible la magnitud exacta del daño o la carga.

```html
<div class="relative h-3 bg-[#161712] border border-[#7B8A4A] rounded-[4px_1px_4px_1px] overflow-hidden">
  <!-- Ghost Bar -->
  <div class="absolute inset-y-0 left-0 bg-[#F2E8D5] transition-[width] duration-500 ease-out delay-200" style="width: 70%"></div>
  <!-- Fill Bar -->
  <div class="absolute inset-y-0 left-0 bg-[#C46A3A] transition-[width] duration-150 ease-out" style="width: 45%"></div>
</div>
```

---

## 6. Pilar 3: Bark Engine Cómic y Bocadillos Reactivos

La narrativa de mando ocurre a través de viñetas de novela gráfica con 5 tipos de bocadillos y sellos de onomatopeyas:

### 6.1. Taxonomía de Formas de Bocadillo
* **`shout` (Grito de Combate / SCOP):** Fondo naranja `#C46A3A` con bordes dentados y cola explosiva.
* **`radio` (Transmisión C4ISR):** Fondo carbón `#2B2C24` con borde verde Matrix `#00FF66`, esquinas `rounded-[8px_2px_8px_2px]` y efecto de barrido de interferencia.
* **`thought` (Táctica Interna):** Fondo crema `#F2E8D5`, borde oliva `#7B8A4A`, texto oscuro y burbujas circulares flotantes.
* **`whisper` (Inteligencia Sigilosa):** Fondo oscuro semitransparente con borde discontinuo (`border-dashed`).
* **`panic` (Alerta Crítica / Near-Miss):** Fondo rojo DEFCON con vibración continua (`animate-pulse`).

### 6.2. Sellos Pop-Art de Onomatopeyas
Sellos angulados (`rotate(-6deg)`) con doble trazo y sombra negra sólida:
```html
<div class="inline-block px-3 py-1 bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest border-2 border-slate-950 shadow-[4px_4px_0px_#000] rotate-[-5deg]">
  ¡¡KABOOM!!
</div>
```

---

## 7. Componentes de Referencia en React + Tailwind CSS

### 7.1. Carta Táctica de Hangar (Mazo de 10 Cartas)
```tsx
import React from 'react';

interface TacticalCardProps {
  name: string;
  category: 'INFANTRY' | 'VEHICLE' | 'AIR' | 'NAVAL';
  cost: number;
  hp: number;
  fuel: number;
  icon: string;
  faction?: 'orange' | 'blue' | 'green' | 'yellow' | 'black';
  isReady?: boolean;
  onDeploy: () => void;
}

export const TacticalCard: React.FC<TacticalCardProps> = ({
  name,
  category,
  cost,
  hp,
  fuel,
  icon,
  faction = 'orange',
  isReady = true,
  onDeploy,
}) => {
  const factionBorder = {
    orange: 'border-[#E65100] hover:shadow-[5px_5px_0px_#E65100]',
    blue: 'border-[#1D4ED8] hover:shadow-[5px_5px_0px_#1D4ED8]',
    green: 'border-[#15803D] hover:shadow-[5px_5px_0px_#15803D]',
    yellow: 'border-[#D97706] hover:shadow-[5px_5px_0px_#D97706]',
    black: 'border-[#4C1D95] hover:shadow-[5px_5px_0px_#4C1D95]',
  }[faction];

  return (
    <div
      onClick={isReady ? onDeploy : undefined}
      className={`relative w-44 bg-[#2B2C24] border-2 ${factionBorder} rounded-[14px_4px_14px_4px] p-3 text-[#F2E8D5] shadow-[4px_4px_0px_#0A0B08] transition-all duration-150 cursor-pointer hover:-translate-y-1 select-none font-mono ${
        !isReady ? 'opacity-50 grayscale pointer-events-none' : ''
      }`}
    >
      {/* Coste $G en sello de esquina */}
      <div className="flex items-center justify-between border-b border-[#7B8A4A]/40 pb-1.5 mb-2">
        <span className="text-[10px] font-bold text-[#7B8A4A] tracking-wider uppercase">
          {category}
        </span>
        <span className="bg-[#161712] border border-[#7B8A4A] text-amber-300 font-black text-xs px-2 py-0.5 rounded-[4px_1px_4px_1px]">
          ${cost.toLocaleString()}G
        </span>
      </div>

      {/* Miniatura / Avatar de la Unidad */}
      <div className="relative h-20 bg-[#161712] rounded-[8px_2px_8px_2px] border border-[#7B8A4A]/50 flex items-center justify-center my-2 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#7B8A4A_10%,transparent_11%)] [background-size:6px_6px] opacity-25" />
        <span className="text-3xl filter drop-shadow-[2px_2px_0px_#000]">{icon}</span>
      </div>

      {/* Nombre y Estadísticas Tácticas */}
      <h4 className="font-sans font-black text-xs uppercase tracking-wider text-[#F2E8D5] truncate mb-2">
        {name}
      </h4>

      <div className="grid grid-cols-2 gap-1 text-[10px] bg-[#1E1F18] p-1.5 rounded-[6px_2px_6px_2px] border border-[#7B8A4A]/30">
        <span className="flex items-center gap-1">
          <span className="text-emerald-400">HP:</span> {hp}/10
        </span>
        <span className="flex items-center gap-1">
          <span className="text-amber-400">GAS:</span> {fuel}
        </span>
      </div>
    </div>
  );
};
```

---

### 7.2. Barra de Superpoder CO con Estrellas Reactivas
```tsx
import React from 'react';

interface COPowerBarProps {
  coName: string;
  portraitUrl: string;
  currentMeter: number;
  maxMeter: number;
  totalStars: number;
  copStars: number;
  isReadyCop: boolean;
  isReadyScop: boolean;
  onActivate: (type: 'cop' | 'scop') => void;
}

export const COPowerBar: React.FC<COPowerBarProps> = ({
  coName,
  portraitUrl,
  currentMeter,
  maxMeter,
  totalStars,
  copStars,
  isReadyCop,
  isReadyScop,
  onActivate,
}) => {
  const meterPercent = Math.min(100, Math.floor((currentMeter / maxMeter) * 100));

  return (
    <div className="flex items-center gap-3 bg-[#2B2C24] border-2 border-[#7B8A4A] rounded-[14px_4px_14px_4px] p-2 text-[#F2E8D5] shadow-[4px_4px_0px_#0A0B08] font-mono">
      {/* Retrato del Comandante con Marco de Ficción */}
      <div className="relative w-12 h-12 rounded-[10px_3px_10px_3px] overflow-hidden border-2 border-[#F2E8D5] bg-[#161712] shrink-0">
        <img src={portraitUrl} alt={coName} className="w-full h-full object-cover" />
        {isReadyScop && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
        )}
      </div>

      {/* Medidor Estelar y Barra de Carga */}
      <div className="flex-1 min-w-[140px]">
        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
          <span className="text-[#F2E8D5] uppercase tracking-wider">{coName}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: totalStars }).map((_, idx) => {
              const filled = idx < Math.floor((currentMeter / maxMeter) * totalStars);
              return (
                <span
                  key={idx}
                  className={`text-xs ${
                    filled
                      ? idx < copStars
                        ? 'text-amber-400 animate-pulse'
                        : 'text-[#C46A3A]'
                      : 'text-stone-700'
                  }`}
                >
                  ★
                </span>
              );
            })}
          </div>
        </div>

        {/* Barra con Ghost Drain */}
        <div className="relative h-2.5 bg-[#161712] border border-[#7B8A4A] rounded-[4px_1px_4px_1px] overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-amber-400/80 transition-all duration-300"
            style={{ width: `${meterPercent}%` }}
          />
        </div>
      </div>

      {/* Botón Táctico SCOP */}
      <button
        disabled={!isReadyScop}
        onClick={() => onActivate('scop')}
        className={`px-3 py-1.5 rounded-[6px_2px_6px_2px] font-sans font-black text-xs uppercase tracking-wider transition-transform border ${
          isReadyScop
            ? 'bg-gradient-to-b from-amber-400 to-[#C46A3A] text-slate-950 border-[#F2E8D5] shadow-[0_0_12px_rgba(251,191,36,0.8)] hover:scale-105 active:scale-95 cursor-pointer animate-pulse'
            : 'bg-stone-800 text-stone-600 border-stone-700 pointer-events-none'
        }`}
      >
        ¡¡SCOP!!
      </button>
    </div>
  );
};
```

---

## 8. Módulo de Audio Procedural Táctico (Web Audio API)

Sintetizador procedural en tiempo real sin requerir archivos de audio externos:

```javascript
export class TacticalAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Clic seco de conmutador de baquelita de servicio pesado
  playHeavySwitch() {
    if (!this.enabled) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  // Odómetro de recuento de fondos ($G) con pitch escalonado
  playGoldTick(index = 0) {
    if (!this.enabled) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pitch = 440 * Math.pow(1.059463, Math.min(index, 12));
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  // Impacto de onomatopeya Pop-Art en viñeta o disparo crítico
  playComicImpact() {
    if (!this.enabled) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }
}
```

---

## 9. Lista de Control de Calidad (Anti-Slop Checklist)

Audita todo componente antes de aprobarlo:

* [ ] **¿Tiene carácter y dinamismo?** Se prohíben las tarjetas neutras cuadradas y sombras con blur difuso. Usa siluetas `rounded-[14px_4px_14px_4px]` o chaflanes a 45° con sombras sólidas `box-shadow: 4px 4px 0px #0A0B08`.
* [ ] **¿Es expresivo y contextual?** No utilices texto plano cuando el momento pide un bocadillo reactivo del Bark Engine o un sello pop-art.
* [ ] **¿Tiene respuesta física (Juice)?** Los botones principales deben tener resorte (`--ease-spring`) y hundimiento físico (`border-bottom`). Las barras de vida deben incluir *Ghost Drain*.
* [ ] **¿Respeta la jerarquía de facciones?** El color no es arbitrario; las tropas y comandantes reflejan la identidad de su nación (Orange Star, Blue Moon, Green Earth, Yellow Comet, Black Hole).
* [ ] **¿Ofrece soporte para atajos de teclado?** Los botones críticos muestran badges visuales (`[SPACE]`, `[1]`, `[ESC]`) para control rápido sin ratón.

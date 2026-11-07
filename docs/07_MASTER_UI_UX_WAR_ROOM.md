# VOLUMEN 7: SISTEMA CANÓNICO DE DISEÑO UI/UX Y SALA DE GUERRA VIVA
**Documento Canónico Unificado:** `07_MASTER_UI_UX_WAR_ROOM.md`

**Proyecto:** *Tactical Command: Wars of Legacy (GEOTACTICS ONLINE)*  
**Versión de Arquitectura:** 5.1.0 (*Kinetic Comic War-Room Engine — Advance Wars meets Persona 5 / Hades + C4ISR Modular*)  
**Estado:** Producción Certificada (Arquitectura Modular de 4 Dominios + Shared Verificada)  
**Invariante Crítica:** **CERO modificaciones destructivas a la lógica de combate (1–100 HP enteros, derrota a 0 tropas), motores matemáticos, contratos de Supabase ni firmas públicas de `WarLobbyHubProps`. Cumplimiento estricto de los 7 Pilares Canónicos (CERO Cartas TCG / Almacén Físico de 16 Tropas).**

---

## 1. Visión Arquitectónica: La Sala de Guerra Viva (Kinetic Comic War-Room)

La arquitectura transforma el Menú Principal (`src/domains/world/components/WarLobbyHub.tsx`) y su articulación con `src/App.tsx` y `src/domains/tactics/components/CombatTheaterView.tsx` pasando de una "terminal verde estática desconectada" a un **Centro de Mando C4ISR Vivo con Energía de Novela Gráfica Bélica**:

1. **Persistencia Espacial Total (Zero-Unmount HQ Shell):** El Cuartel General, el Mapa Geopolítico WebGL (`src/domains/world/components/TacticalWorldMap.tsx`) y el diorama isométrico (`src/domains/world/components/TacticalC4ISRBaseDiorama.tsx`) nunca se desmontan al visitar la Intendencia (`ShopCatalog.tsx`), Hangar Físico de Tropas (`UnitHangarModal.tsx`) / Armería (`LoadoutCustomizer.tsx`), Complejo Industrial de 10 Parcelas (`IndustrialComplexView.tsx`), Bolsa P2P (`P2PMarketplaceView.tsx`), Alianza (`ClanHeadquartersView.tsx`) o Archivos. En su lugar, la cámara hace un **enfoque cinético (Zoom & Pan con resorte)** hacia la estación correspondiente y despliega una **Terminal Táctica Diegética Superpuesta (`<WarRoomModal />` / Shell de Estación)** con desenfoque de cristal táctico (`backdrop-blur-md`), permitiendo cambiar de estación en 1 clic desde el Dock Inferior (`src/domains/world/components/TacticalDock.tsx`) sin perder timers ni estado.
2. **Presencia del Comandante en Guardia + Bark Engine en el Lobby:** El Cuartel General incorpora al Comandante activo (ej. *Mayor Stella*, *Coronel Volkov*, *Andy*, *Gral. Vance*) a través de `src/domains/game-feel/components/CommanderLivingVignette.tsx` y `src/domains/game-feel/components/CommanderBarkWidget.tsx`, con su estandarte de facción y bocadillo cómic reactivo del `barkEngine` (`src/domains/game-feel/core/barkEngine.ts`, tramas Ben-Day, papel táctico `#F2E8D5` y sellos pop-art rotados `¡TACTICAL!`, `¡ALERT!`, `¡RATATAT!`), conectando emocionalmente el Lobby con el Teatro de Combate.
3. **Geometría Híbrida & Tinta Sólida (`45° Armor` + `14px/4px Comic Asymmetry`):** Se resuelve el bug de recorte de sombras separando los chasis blindados achaflanados (con `drop-shadow(4px 4px 0px #0A0B08)`) de las tarjetas, medidores y bocadillos con curvatura asimétrica canónica (`rounded-[14px_4px_14px_4px]`, `border-2 border-[#0A0B08]`, `shadow-[4px_4px_0px_#0A0B08]`).

---

## 2. Sistema Unificado de Tokens Visuales (`src/index.css` & `index.html`)

### 2.1. Tipografía Expresiva y Tabular (`index.html`)
Se cargarán desde Google Fonts tres familias con personalidad militar y de novela gráfica:
- **Display / Titulares de Impacto y Sellos (`--font-display`):** `'Chakra Petch'` (700, 800, Italics) — Geometría mecanizada con cortes angulares ideales para encabezados C4ISR y onomatopeyas.
- **UI Táctica y Narrativa (`--font-sans`):** `'Space Grotesk'` (500, 700) — Lectura ultraclara para expedientes, fichas de unidades físicas del hangar (0 cartas TCG) y bocadillos del Bark Engine.
- **Telemetría, Coordenadas y Odómetros (`--font-mono`):** `'JetBrains Mono'` (600, 800) con `font-variant-numeric: tabular-nums` obligatorio en todo contador o reloj.

### 2.2. Paleta Cromática Canónica (70-20-10 + Heráldica de Facciones)

| Categoría | Token CSS | Valor Hex | Uso Estricto en la Interfaz |
| :--- | :--- | :---: | :--- |
| **Núcleo Blindado (70%)** | `--color-bunker-void` | `#161712` | Foso de aplicación, sombras internas y bahía profunda. |
| | `--color-ink-black` | `#0A0B08` | Contornos de tinta cómic (`2px–3px`) y sombras duras offset (`4px 4px 0px`). |
| | `--color-armor-base` | `#2B2C24` | Chasis principal de paneles, tarjetas de unidad y consolas. |
| | `--color-military-olive` | `#46521F` | Cubiertas secundarias, módulos de apoyo y calzadas. |
| | `--color-metal-edge` | `#7B8A4A` | Biseles estructurales y bordes pasivos. |
| | `--color-olive- high` | `#A9B87A` | **Nuevo token accesible (WCAG AA `4.9:1` sobre `#2B2C24`)** para subtítulos y etiquetas. |
| **Papel Táctico & Datos (20%)** | `--color-data-cream` | `#F2E8D5` | Tipografía primaria, fondo de dossieres de misión, bocadillos cómic y *Ghost Bars*. |
| **Acentos de Combate (10%)** | `--color-rust-alert` | `#C46A3A` | CTA `¡ORDEN DE COMBATE!`, alertas DEFCON y daño balístico. |
| | `--color-amber-command` | `#F59E0B` | Recompensas de Oro, estrellas de rango/COP y botones de suministro. |
| | `--color-crt-radar` | `#00FF66` | **USO RESTRINGIDO:** Únicamente radares polares, barrido C4ISR y LED `ONLINE`. |
| **5 Facciones Heráldicas** | `--color-fac-orange` | `#E65100` / `#F59E0B` | **Orange Star / Iron Vanguard** (Stella, Andy, Max, Sami). |
| | `--color-fac-blue` | `#1D4ED8` / `#60A5FA` | **Blue Moon / Frost Legion** (Colin, Volkov, Grit). |
| | `--color-fac-green` | `#15803D` / `#4ADE80` | **Green Earth / Emerald Guard** (Eagle, Vance). |
| | `--color-fac-yellow` | `#D97706` / `#FDE047` | **Yellow Comet / Solar Shogunate** (Kanbei, Sonja). |
| | `--color-fac-black` | `#4C1D95` / `#EF4444` | **Black Hole / Shadow Syndicate** (Hawke, Sturm). |

### 2.3. Primitivas Geométricas y de Física (`src/index.css`)

```css
@import "tailwindcss";

:root {
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1);

  --color-bunker-void: #161712;
  --color-ink-black: #0A0B08;
  --color-armor-base: #2B2C24;
  --color-military-olive: #46521F;
  --color-metal-edge: #7B8A4A;
  --color-olive-high: #A9B87A;
  --color-rust-alert: #C46A3A;
  --color-data-cream: #F2E8D5;
  --color-crt-radar: #00FF66;
}

/* 1. Tarjeta Táctica Asimétrica con Tinta Sólida (Sin recorte de sombra) */
.tactical-comic-card {
  background-color: var(--color-armor-base);
  border: 2px solid var(--color-ink-black);
  outline: 1px solid rgba(123, 138, 74, 0.45);
  outline-offset: -3px;
  border-radius: 14px 4px 14px 4px;
  box-shadow: 4px 4px 0px var(--color-ink-black);
  transition: transform 0.2s var(--ease-spring), box-shadow 0.2s var(--ease-spring), border-color 0.15s ease;
}
.tactical-comic-card:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 6px 6px 0px var(--color-ink-black);
}

/* 2. Chasis Blindado Achaflanado a 45° con Drop-Shadow Externo */
.tactical-chamfer-wrap {
  filter: drop-shadow(4px 4px 0px #0A0B08);
}
.tactical-chamfer-box {
  clip-path: polygon(
    10px 0, calc(100% - 10px) 0,
    100% 10px, 100% calc(100% - 10px),
    calc(100% - 10px) 100%, 10px 100%,
    0 calc(100% - 10px), 0 10px
  );
}

/* 3. Botón de Mando Pesado 3D con Squash & Stretch (<16ms) */
.tactical-btn-heavy {
  background: linear-gradient(180deg, #df7b48 0%, #C46A3A 60%, #873612 100%);
  color: var(--color-data-cream);
  border: 2px solid var(--color-data-cream);
  border-bottom: 5px solid #5a1e05;
  border-radius: 14px 4px 14px 4px;
  box-shadow: 4px 4px 0px var(--color-ink-black);
  transition: transform 0.16s var(--ease-spring), border-bottom-width 0.06s ease, filter 0.12s ease;
  will-change: transform;
}
.tactical-btn-heavy:hover {
  transform: translateY(-2px) scale(1.03);
  filter: brightness(1.1);
}
.tactical-btn-heavy:active {
  transform: translateY(3px) scale(1.08, 0.90);
  border-bottom-width: 2px;
  box-shadow: 1px 1px 0px var(--color-ink-black);
}

/* 4. Trama de Puntos Ben-Day (Novela Gráfica) */
.ben-day-overlay {
  background-image: radial-gradient(rgba(123, 138, 74, 0.28) 18%, transparent 19%);
  background-size: 8px 8px;
}
.ben-day-cream {
  background-color: #F2E8D5;
  background-image: radial-gradient(rgba(196, 106, 58, 0.18) 18%, transparent 19%);
  background-size: 8px 8px;
}

/* 5. Barras de Doble Capa (Ghost Drain / Surge Trail) */
.bar-ghost-trail {
  transition: width 0.55s var(--ease-out-expo) 0.22s;
}
.bar-fill-spring {
  transition: width 0.15s var(--ease-spring);
}
```

---

## 3. Wireframes Esquemáticos por Zona (`100vh × 100vw` Puro, >70% Lienzo Despejado)

### 3.1. Distribución Espacial General y Las 4 Capas de Diegesis

```
+======================================================================================================+
| ZONA 1: TOP COMMAND HUD / DUAL RESOURCE HEADER (h-14 / 56px fijo, z-30) — CAPA 4 NO-DIEGÉTICA        |
| [Retrato CO + Rango NVL.5 + Ghost EXP Bar]  [⚡ C4ISR • Arena • 🏆2450 • Cap N11]  [💰Oro|💎Gem|⚙️Acero|⚡En]|
+======================================================================================================+
|                                                                                                      |
|  ZONA 3A: INTEL & BARK (Izq, w-64)        ZONA 2: LIENZO / DIORAMA CENTRAL   ZONA 3B: OPS (Der, w-48)|
|  +-------------------------------+        (CAPA 1 DIEGÉTICA + CAPA 2)        +---------------------+ |
|  | 🗣️ VIÑETA GUARDIA CO (Bark)   |                                           | 🎡 ROTOR SUMINISTRO | |
|  | "Mayor Stella: ¡Silos al 90%!"|     [⚓ ASTILLERO NAVAL -> Industria]     | [¡GIRAR! - Ceremonia| |
|  | [Sello Pop-Art: ¡TACTICAL!]   |                                           +---------------------+ |
|  +-------------------------------+     [⚡ BÚNKER SILOS -> Cosecha +Acero]   | 📋 ÓRDENES DIARIAS  | |
|  | 📁 DOSSIER MISIÓN (Papel Crema|                                           | [1/3] ★ Logros  [R] | |
|  | "Sector Alpha: Baterías" [1/2]|     [🪖 HANGAR FÍSICO -> 16 Tropas/Arm.]  +---------------------+ |
|  | [Ghost Progress] [Reclamar]   |                                                                   |
|  +-------------------------------+     [📡 RADAR POLAR 360° -> Mapa Frentes]                         |
|  | 🚨 DEFCON-1 + 🔥 RACHA 4x     |     (Conmutador Teatro MapLibre WebGL)                            |
|  +-------------------------------+                                                                   |
|                                                                                                      |
|  (CAPA 3 META: Viñeta perimetral roja en DEFCON-1 / Scanlines CRT sutiles / Destello de Suministro)  |
+======================================================================================================+
| ZONA 4 & 5: TACTICAL DOCK + RADIO-NET + CTA TITÁN (h-20 / 80px fijo, z-30)                           |
| [1:Tienda][2:Industria][3:Armería][4:Bolsa P2P][5:Alianza][6:Doctrina] | [📡 Radio-Net] | [⚔️¡COMBATE!]|
+======================================================================================================+
```

### 3.2. Detalle de las 5 Zonas Clave

1. **Zona 1: `CommandHUD` (`src/domains/world/components/CommandHUD.tsx`) y `DualResourceHeader` (`src/domains/world/components/DualResourceHeader.tsx`):**
   - **Expediente del Comandante (`[P]`):** Sustituye el SVG genérico por el retrato real del Comandante activo (`/assets/CO/pixelated/stella-full.png` con fallback vectorial estilizado via `getCOFullBodyUrl`), borde heráldico de su facción (`Orange Star`), insignia de Nivel correcta (`resolvedLevel = userLevel ?? simLevel ?? 5`) y **Barra de EXP de Doble Capa (`TacticalGhostBar` en `src/shared/ui/TacticalGhostBar.tsx`)**.
   - **Telemetría Central:** Tag del Clan (`[FERRO]` / `[IVS]`), nombre de Arena, Trofeos con icono, Escudos (`3/3`) y conmutador elástico `TORNEO (CAP N11)` vs `LADDER (N15)`.
   - **Banco de Recursos con Odómetro `motion`:** Contadores de `Fondos ($G)`, `Gemas`, `Acero`, `Chatarra Tecnológica (tech_scrap)` y `Energía (EC + Barra Ghost)` que escalan (`scale(1.3) -> scale(1)`) con `tabular-nums` al cambiar de valor. Los botones `+` se amplían a **`24×24px` (`w-6 h-6`)** cumpliendo Ley de Fitts y WCAG AA.

2. **Zona 2: `TacticalC4ISRBaseDiorama` (`src/domains/world/components/TacticalC4ISRBaseDiorama.tsx`) y `TacticalWorldMap` (`src/domains/world/components/TacticalWorldMap.tsx`):**
   - **Entintado Cómic y Trama Ben-Day:** Todos los edificios y vehículos reciben contornos de tinta negra (`stroke="#0A0B08" strokeWidth="3"`), sombras proyectadas sólidas (`fill="#0A0B08"`), espuma costera animada y patrón `<pattern id="benDayDots">` en las laderas y sombras.
   - **Siluetas *Advance Wars* de Alta Fidelidad:** Rediseño vectorial del Tanque Pesado en el Hangar (orugas con remaches, chasis inclinado, torreta con estrella heráldica), Helicóptero Artillado en el Helipuerto (con luces estroboscópicas) y Destructor Torpedero en el Muelle Naval.
   - **4 Estaciones Diegéticas con Etiquetas Espaciales Cómic (`rounded-[14px_4px_14px_4px]`):**
     - `⚓ ASTILLERO // INDUSTRIA` (Muelle Naval — abre Complejo Industrial de 10 Parcelas `IndustrialComplexView.tsx`).
     - `⚡ SILOS // +ACERO & ORO` (Búnker Generador — con barra de capacidad y partículas al cosechar).
     - `🪖 HANGAR // ALMACÉN FÍSICO DE 16 TROPAS` (Bahía Blindada — abre Hangar Físico `UnitHangarModal.tsx` y Armería `LoadoutCustomizer.tsx`; **Pilar 1 Canónico: CERO Cartas TCG/CCG, 16 unidades físicas máximo = 4 en Battlegroup activo + 12 en reserva**).
     - `📡 RADAR C4ISR // FRENTES` (Torre de Radar Polar — conmuta al Teatro Geopolítico WebGL `TacticalWorldMap.tsx` con `TacticalMapControls.tsx` y elimina la duplicación del HUD derecho).
   - **Alarma de Búnker Conectada (`handleBunkerAlarm`):** Clicar el Helipuerto/Comando activa la alerta `DEFCON-1` proyectando la viñeta roja pulsante en la Capa Meta del viewport.

3. **Zona 3: `FactionBanner` (`src/domains/world/components/FactionBanner.tsx`), `CommanderLivingVignette` (`src/domains/game-feel/components/CommanderLivingVignette.tsx`) y `CommanderBarkWidget` (`src/domains/game-feel/components/CommanderBarkWidget.tsx`):**
   - **Columna Izquierda / Viñeta Viva (`w-64` en modo banner o Cuadrante Izquierdo 58% en modo Living Canvas):**
     - **Viñeta Reactiva del Comandante (Bark Engine):** Muestra al CO activo a cuerpo completo (`CommanderLivingVignette.tsx`) o en placa de guardia (`CommanderBarkWidget.tsx` / `FactionBanner.tsx`) con bocadillo en papel táctico (`#F2E8D5`), 5 morfologías (`radio`, `panic`, `thought`, `shout`, `whisper`), trama Ben-Day y sello pop-art (`¡TACTICAL!`, `¡RATATAT!`, `¡¡AUTORIZADO!!`). Al hacer clic sobre el personaje o bocadillo, aplica física *Squash & Stretch* y cicla partes tácticos reales usando `barkEngine` (`src/domains/game-feel/core/barkEngine.ts`).
     - **Dossier de Misión de Campaña (Estilo Carpeta Militar Crema `#F2E8D5`):** Contraste negro sobre crema, barra de progreso con *Ghost Trail* y botón de reclamo con explosión de recursos y odómetro.
     - **Píldora Unificada DEFCON-1 + Racha de Victorias:** Fusiona la alerta de incursión y el multiplicador de racha (`🔥 Racha: 4 Victorias • 1.25x BOTÍN`) con botones rápidos de `Suministros` y `Mensajes`.
   - **Columna Derecha (`w-48`, sin Radar duplicado):**
     - Acceso directo a `🎡 Rotor de Suministros` (con sello `¡LISTO!`), `📋 Órdenes Diarias (1/3)` y `🏆 Condecoraciones / Torneo (#4)`.

4. **Zona 4: `TacticalDock` (`src/domains/world/components/TacticalDock.tsx`) y Botón Titán `¡ORDEN DE COMBATE!`:**
   - **6 Estaciones con Hotkeys `[1]`–`[6]` y Estado Activo:** `[1] Tienda` (`ShopCatalog.tsx`), `[2] Industria` (`IndustrialComplexView.tsx`), `[3] Armería` (`LoadoutCustomizer.tsx` / `UnitHangarModal.tsx`), `[4] Bolsa P2P` (`P2PMarketplaceView.tsx`), `[5] Alianza` (`ClanHeadquartersView.tsx`), `[6] Doctrina` + botón `[E] Editor` (`TacticalStudioEditor.tsx`).
   - **Corrección del Gate de Nivel:** `Industria` y `Bolsa P2P` quedan 100% accesibles para el Comandante desde el Dock sin bloquear la apertura de `IndustrialComplexView` ni `P2PMarketplaceView`.
   - **Botón Titán Dual (`¡ORDEN DE COMBATE!` + `⚡ BLITZ 1-CLIC`):**
     - El botón principal `¡ORDEN DE COMBATE! [SPACE]` usa `.tactical-btn-heavy` (hundimiento físico 3D de `5px` a `2px` + *Squash & Stretch*) y abre el selector táctico de los 3 teatros (`Duelo Espejo 15s`, `Escaramuza Blitz 30s`, `Gran Campaña 60s`) en `WarRoomModal.tsx` o el modal pre-batalla `PreBattleDeploymentModal.tsx`.
     - Junto a él, un botón de acción rápida `⚡ BLITZ 1-CLIC [F]` lanza `blitz_skirmish` en **1 solo clic** cumpliendo la garantía de cero fricción.

5. **Zona 5: Barra Social `RADIO-NET // ENLACE TÁCTICO`:**
   - Integrada en el zócalo inferior de `TacticalDock.tsx` con tarjetas de aliados (`Carlos`, `Ana`, `Luis`), avatares de facción, textos legibles (`>= 10px`, contraste AA) y transferencia instantánea de suministros con feedback sonoro y visual.

---

## 4. Especificación de Animaciones, Resortes, Audio Procedural, Háptica y Ceremonia de Botín

### 4.1. Física de Animación con `motion` (`motion/react`)
1. **Apertura de `<WarRoomModal />` (`src/domains/world/components/WarRoomModal.tsx`) y Modales del Lobby:**
   - Entrada: `initial={{ opacity: 0, scale: 0.92, y: 18 }}` → `animate={{ opacity: 1, scale: 1, y: 0 }}` con `transition={{ type: "spring", stiffness: 420, damping: 26 }}`.
   - Salida (`<AnimatePresence>`): `exit={{ opacity: 0, scale: 0.95, y: 10 }}` en `140ms`.
2. **Odómetro de Recursos en `CommandHUD` y `MatchSummaryModal` (`src/shared/ui/MatchSummaryModal.tsx`):**
   - Cada vez que cambia `localGold`, `userGems` o `localSteel`, el `<motion.span key={value}>` ejecuta `initial={{ scale: 1.35, color: "#F59E0B" }}` → `animate={{ scale: 1, color: "#F2E8D5" }}` con resorte elástico y disparo de `audioManager.playGoldTick()`.
3. **Ceremonia de Revelación de 3 Tiempos en el Rotor de Suministros (`modal-ruleta` en `WarRoomModal.tsx`):**
   - **Tiempo 1 (Anticipación - `0ms a 4000ms`):** Mientras la rueda gira con desaceleración `cubic-bezier(0.12, 0.9, 0.2, 1)`, un intervalo desacelerado dispara `audioManager.playHoverTick()` cada vez que un segmento cruza el puntero superior.
   - **Tiempo 2 (Clímax - `4000ms`):** Flash luminoso de `100ms` (`hit-stop` visual) + `audioManager.playComboAction(6)` + sacudida del contenedor.
   - **Tiempo 3 (Presentación por Rareza):** Se despliega una tarjeta de botín con marco heráldico según la recompensa (`COMMON`, `RARE`, `EPIC`, `LEGENDARY`) y sello pop-art (`¡SUMINISTRO!`, `¡TACTICAL!`, `¡CLUTCH!`, `¡¡JACKPOT!!`).

### 4.2. Síntesis Web Audio API (`src/domains/game-feel/core/audioManager.ts`) y Retroalimentación Háptica (`src/domains/game-feel/core/hapticFeedback.ts`)
1. **Conexión Real de `pitchShift` (`0.96 + Math.random() * 0.08`):** Se aplica `pitchShift` a todos los métodos `synth*` y a `playCue()` dentro de `TacticalAudioManager` (`src/domains/game-feel/core/audioManager.ts`) para erradicar la fatiga acústica en sesiones prolongadas, utilizando `AUDIO_SYNTHESIS_CATALOG` (`ui_cursor_move`, `ui_tile_confirm`, `ui_cancel_rollback`, `cannon_fire_heavy`, `machinegun_burst`, `rocket_launch`, `explosion_critical`, `trap_alert`, `airdrop_impact`, `co_power_charge`, `hq_collapse`).
2. **Método `playHoverTick()`:** Pulso triangular de `20ms` (`680Hz -> 920Hz`) con variación aleatoria de `±8%` conectado al `onMouseEnter` de los botones de `TacticalDock`, tarjetas de teatro y edificios del Diorama.
3. **Métodos `playComboAction(comboIndex)` y `playGoldTick(index)`:** Escalado semitonal ascendente (`baseFreq * Math.pow(1.059463, Math.min(index, 14))`) para cosecha de silos, reclamo de misiones, desguace de unidades y odómetros de recompensa en `MatchSummaryModal.tsx`.
4. **Motor Háptico Nativo (`src/domains/game-feel/core/hapticFeedback.ts`):** Exporta `triggerHaptic(pattern: HapticPattern)` integrado con la Web Vibration API (`navigator.vibrate`) con 6 perfiles táctiles calibrados: `selection` (`10ms`), `movement` (`25ms`), `attack` (`[40, 30, 60]`), `trap` (`[80, 50, 120, 50, 200]`), `co_power` (`[100, 40, 100, 40, 250]`) y `error` (`[30, 20, 30]`), invocado desde `CombatTheaterView.tsx`, `GameCanvas.tsx`, `COCommandBar.tsx` y `PreBattleDeploymentModal.tsx`.

### 4.3. Modelo de Trauma Cuadrático (Screen Shake) y Coherencia en `src/domains/tactics/components/GameCanvas.tsx`
1. **Screen Shake Cuadrático (`traumaRef`):** En `src/domains/tactics/components/GameCanvas.tsx`, al producirse impactos balísticos (escala continua de **1 a 100 HP enteros**, Pilar 2), explosiones o emboscadas (`TRAP`), se inyecta `trauma` (`0.3` a `0.7`) cuyo desplazamiento es `maxOffset * (trauma ** 2)`, respetando el toggle de accesibilidad `reduceMotion`.
2. **Sincronización Cromática y Daltonismo (P1 vs P2):** Coherencia cromática 100% sincronizada entre `src/domains/tactics/components/GameCanvas.tsx`, `src/domains/tactics/components/CombatTheaterView.tsx` y `src/domains/tactics/components/COCommandBar.tsx`, con doble codificación por símbolo (`★` P1 / `☾` P2).
3. **Limpieza de Controles Flotantes del Canvas:** Se erradican botones de debug y estilos SaaS genéricos en los controles de cámara y audio, aplicando el chasis blindado `#2B2C24` con bordes `#0A0B08` y esquinas `rounded-[10px_3px_10px_3px]`.

---

## 5. Arquitectura Modular por Dominios (`world`, `economy`, `tactics`, `game-feel`, `shared`)

```mermaid
flowchart LR
    subgraph FaseA["1. Fundaciones, Shared UI & Game-Feel"]
        IndexHTML["index.html (Fuentes Google)"]
        IndexCSS["src/index.css (Tokens + Resortes)"]
        AudioMgr["src/domains/game-feel/core/audioManager.ts + hapticFeedback.ts"]
        BarkComponents["src/domains/game-feel/components/CommanderBarkWidget.tsx + CommanderLivingVignette.tsx"]
        SharedUI["src/shared/ui/TacticalGhostBar.tsx + MatchSummaryModal.tsx + TacticalErrorBoundary.tsx"]
    end

    subgraph FaseB["2. Dominio World (src/domains/world/components/)"]
        CommandHUD["CommandHUD.tsx + DualResourceHeader.tsx"]
        Diorama["TacticalC4ISRBaseDiorama.tsx + TacticalWorldMap.tsx + TacticalMapControls.tsx"]
        FactionBanner["FactionBanner.tsx + ParadoxCommandDrawer.tsx"]
        TacticalDock["TacticalDock.tsx (Dock + Hotkeys + Radio-Net)"]
        WorldModals["WarRoomModal.tsx + TerritoryInspectorModal.tsx + TerritorySiegeModal.tsx + StateSovereignDeckModal.tsx + ClanHeadquartersView.tsx"]
        WarLobbyHub["WarLobbyHub.tsx (Orquestador Zero-Unmount)"]
    end

    subgraph FaseC["3. Dominios Economy & Tactics"]
        EconomyViews["src/domains/economy/components/UnitHangarModal.tsx + IndustrialComplexView.tsx + P2PMarketplaceView.tsx + TacticalConstructionDrawer.tsx + LoadoutCustomizer.tsx + ShopCatalog.tsx"]
        CombatView["src/domains/tactics/components/CombatTheaterView.tsx + COCommandBar.tsx + PreBattleDeploymentModal.tsx + TacticalStudioEditor.tsx"]
        Canvas["src/domains/tactics/components/GameCanvas.tsx (1-100 HP + Trauma Shake + Chasis C4ISR)"]
    end

    FaseA --> FaseB --> FaseC
```

### Mapa Canónico de Componentes y Motores por Dominio

| Ruta Modular Real | Dominio | Responsabilidad e Invariantes Canónicas Protegidas |
| :--- | :---: | :--- |
| `index.html` & `src/index.css` | Global | Cargar `Chakra Petch`, `Space Grotesk` y `JetBrains Mono`; declarar variables CSS, `.tactical-comic-card`, `.tactical-btn-heavy`, `.ben-day-overlay`, `.bar-ghost-trail`. |
| `src/domains/game-feel/core/audioManager.ts` | `game-feel` | Síntesis Web Audio API (`AUDIO_SYNTHESIS_CATALOG`), `pitchShift` en `playSFX`/`playCue`, `playHoverTick()`, `playComboAction()` y `playGoldTick()`. |
| `src/domains/game-feel/core/hapticFeedback.ts` | `game-feel` | Retroalimentación táctil Web Vibration API (`triggerHaptic`) con patrones `selection`, `movement`, `attack`, `trap`, `co_power` y `error`. |
| `src/domains/game-feel/components/CommanderBarkWidget.tsx` | `game-feel` | Viñeta reactiva esquina inferior izquierda con 5 tipos de bocadillo (`radio`, `panic`, `thought`, `shout`, `whisper`), sellos pop-art y conexión con `barkEngine`. |
| `src/domains/game-feel/components/CommanderLivingVignette.tsx` | `game-feel` | Lienzo vivo del Comandante a cuerpo completo (`smoothFull`), parallax, filtro por facción, *Squash & Stretch* y barks contextuales de lobby. |
| `src/shared/ui/TacticalGhostBar.tsx` | `shared` | Barra de progreso de doble capa reutilizable (*Ghost Drain / Surge Trail* con retardo de `220ms`) para EXP, Energía, COP/SCOP, TCP y Silos. |
| `src/shared/ui/MatchSummaryModal.tsx` | `shared` | Modal post-partida con odómetro acústico (`playGoldTick`), progresión de XP/ELO y reemparejamiento instantáneo tras victoria o derrota a 0 tropas (Pilar 3). |
| `src/shared/ui/TacticalErrorBoundary.tsx` | `shared` | Terminal de contención fail-safe `DEFCON-1` que captura excepciones en React sin pérdida de datos ni pantallas en blanco. |
| `src/domains/world/components/WarLobbyHub.tsx` | `world` | Orquestador principal de la Sala de Guerra Viva (Zero-Unmount HQ), conmutador Base/Mapa Geopolítico, hotkeys (`1-6`, `Space`, `F`, `Escape`, `R`). |
| `src/domains/world/components/WarRoomModal.tsx` | `world` | Contenedor diegético animado con `motion` para la Sala de Operaciones (3 Teatros de Combate), Rotor de Suministros de 3 tiempos y Dossier de Oficiales. |
| `src/domains/world/components/CommandHUD.tsx` | `world` | Barra superior C4ISR con retrato heráldico del CO, `TacticalGhostBar` de EXP, Arena/Trofeos y odómetros `motion`. |
| `src/domains/world/components/DualResourceHeader.tsx` | `world` | Cabecera dual C4ISR: Bloque izquierdo de recursos individuales (`$G`, `EC`, `tech_scrap`, Nivel) y bloque derecho de facción (Bóveda Clan, Stock, TCP). |
| `src/domains/world/components/TacticalC4ISRBaseDiorama.tsx` | `world` | Diorama isométrico vectorial entintado (`#0A0B08`), tramas Ben-Day, 4 estaciones interactivas, alarma `DEFCON-1` y cámara con Zoom & Pan por estación. |
| `src/domains/world/components/TacticalDock.tsx` | `world` | Dock inferior con hotkeys `[1]-[6]`, Editor `[E]`, CTA `.tactical-btn-heavy` `[SPACE]`, Despliegue Blitz 1-Clic `[F]` y barra social `RADIO-NET`. |
| `src/domains/world/components/TacticalWorldMap.tsx` | `world` | Renderizador cartográfico WebGL 2.0 (MapLibre GL) con 3 niveles de LOD Semántico (Macro, Operacional, Táctico), barks espaciales y trazadores RTS. |
| `src/domains/world/components/TacticalMapControls.tsx` | `world` | Selector de las 4 vistas especializadas C4ISR (`V1_SOVEREIGNTY`, `V2_LOGISTICS`, `V3_RESOURCES`, `V4_THREATS`) y estampado táctico en vivo. |
| `src/domains/world/components/TerritoryInspectorModal.tsx` | `world` | Consola C4ISR de inspección provincial: soberanía, progreso TCP, estatus de Capital Regional (+5% recursos/logística, Pilar 5) e inicio de asalto/refuerzo. |
| `src/domains/world/components/TerritorySiegeModal.tsx` | `world` | Modal de asedio territorial con temporizador de **Human Handshake de 120 segundos (2 minutos)** antes de que asuma la IA de Guarnición Niveles 1–5 (Pilar 7). |
| `src/domains/world/components/StateSovereignDeckModal.tsx` | `world` | Consola soberana exclusiva para Líderes de Clan que permite proclamar decretos y renombrar Estados/Regiones conquistadas. |
| `src/domains/world/components/ClanHeadquartersView.tsx` | `world` | Sede corporativa del Clan: registro y escalafón de miembros, bóveda escalonada (T1–T3), rescate de camaradas, sectores de guerra y salvaguarda. |
| `src/domains/world/components/ParadoxCommandDrawer.tsx` | `world` | Gaveta retráctil derecha estilo *Stellaris / Victoria 3* con 5 pestañas: Territorio, Puntos Estratégicos, Forja & Cola, Arsenal de Facción y Mercado P2P. |
| `src/domains/economy/components/UnitHangarModal.tsx` | `economy` | **Almacén Físico de 16 Tropas (Pilar 1: CERO Cartas TCG; 4 activas en Battlegroup + 12 en reserva)**, forja por Patentes T1–T5 (+2%/tier, máx +8% en T5, Pilar 4) y desguace con recuperación del **35% en `tech_scrap`** (Pilar 6). |
| `src/domains/economy/components/IndustrialComplexView.tsx` | `economy` | **Complejo Industrial de 10 Parcelas**, ciclo circadiano (12h + 4h gracia), bono de eficiencia (+10% y +500G), cargamento varado, demolición con guarda abatible y refinado multi-batch. |
| `src/domains/economy/components/P2PMarketplaceView.tsx` | `economy` | **Mercado Libre P2P** conectado a `public.p2p_market_orders` con **impuesto canónico del 2% (1% quemado en Sink + 1% regalía al Clan dueño del Hub regional)** y bandas dinámicas **VWAP Collar ±25%**. |
| `src/domains/economy/components/TacticalConstructionDrawer.tsx` | `economy` | Gaveta de construcción táctica in-situ (`z=15`) para edificar refinerías, radares FLIR, búnkeres de armería y centros de suministro en celdas del mapa. |
| `src/domains/economy/components/LoadoutCustomizer.tsx` | `economy` | Armería de personalización visual y equipamiento de camuflajes sobre el catálogo de unidades físicas (100 HP base). |
| `src/domains/economy/components/ShopCatalog.tsx` | `economy` | Intendencia militar y catálogo de skins cosméticas con filtros rápidos por teclado (`[1]`–`[6]`) y adquisición por Oro o Gemas. |
| `src/domains/tactics/components/CombatTheaterView.tsx` | `tactics` | Orquestador del Teatro de Combate: reloj Fischer, niebla de guerra, auras de edificios, refuerzos e integración con victoria por captura de HQ o aniquilación total (0 tropas, Pilar 3). |
| `src/domains/tactics/components/GameCanvas.tsx` | `tactics` | Lienzo táctico HTML5 2D con escala balística continua de **1 a 100 HP enteros** (Pilar 2), previsualización de daño in-situ, menú contextual de subacciones y Screen Shake cuadrático. |
| `src/domains/tactics/components/COCommandBar.tsx` | `tactics` | Barra de mando del Comandante en combate con estrellas de energía, `TacticalGhostBar` de carga COP/SCOP y solicitud de refuerzos. |
| `src/domains/tactics/components/PreBattleDeploymentModal.tsx` | `tactics` | Modal de despliegue pre-batalla estilo *Total War* para seleccionar la vanguardia física desde el stock de reserva y configurar semilla/escala del teatro. |
| `src/domains/tactics/components/TacticalStudioEditor.tsx` | `tactics` | Suite interna de desarrollo desacoplada con 4 módulos: AI Forge, Map Builder (`MapBuilder.tsx`), Sprite Studio (`SpriteStudio.tsx`) y CO Bark Studio (`CommanderBarkStudio.tsx`). |
| `src/App.tsx` | Root | Mantiene `<WarLobbyHub />` montado en modo Zero-Unmount cuando se abren sub-vistas (`shop`, `armory`, `industry`, `marketplace`, `clans`, `docs`, `qa`) y articula la transición al combate. |

---

## 6. Tríada C4ISR Canónica y Vistas de Economía de Guerra

Para integrar la experiencia macro, territorial e industrial (*Advance Wars meets Paradox / Stellaris*), el War Lobby articula la Tríada C4ISR junto con las terminales económicas modulares:

### 6.1. Cabecera Dual de Recursos (`src/domains/world/components/DualResourceHeader.tsx`)
- Proyecta en la parte superior la telemetría dual dividida con estética militar:
  1. **Recursos Personales del Jugador:** Fondos Tácticos (`$G`), Energía (`EC`), Chatarra Tecnológica (`tech_scrap`, recuperada al 35% de bajas físicas conforme al Pilar 6) y Rango/Nivel con `TacticalGhostBar`.
  2. **Arcas Comunitarias de Facción:** Estandarte y Bóveda del Clan (`clanVaultEc`), stock compartido de unidades (`clanSharedStockCount`), control de Puntos de Control Territorial (`TCP`) y bonificaciones por **Conquista de Capitales Regionales (+5% recursos/logística en la región conforme al Pilar 5)** junto a los multiplicadores de Nodos Estratégicos.

### 6.2. Viñeta Táctica del Comandante (`src/domains/game-feel/components/CommanderBarkWidget.tsx` y `CommanderLivingVignette.tsx`)
- Ubicada en la esquina inferior izquierda (`bottom-left`) del mapa geopolítico o en el cuadrante izquierdo del Lobby:
  - Retrato dinámico del Comandante activo con marco Ben-Day, sombra dura cómic sin cajas blancas invasivas y badge de facción.
  - Bocadillo estilo cómic con 5 morfologías (`radio`, `panic`, `thought`, `shout`, `whisper`) y sellos pop-art angulados conectados a `src/domains/game-feel/core/barkEngine.ts`.
  - Interactividad física: reacciona clic a clic con *Squash & Stretch*, SFX de radio (`audioManager`) y directivas sobre el Hangar Físico, el Handshake defensivo de 120s (Pilar 7) y la refundición del 35% de chatarra (Pilar 6).

### 6.3. Gaveta Retráctil de Mando Paradox (`src/domains/world/components/ParadoxCommandDrawer.tsx`)
- Panel lateral retráctil en el extremo derecho (`right drawer`) inspirado en la interfaz C4ISR de *Stellaris* y *Victoria 3* con 5 pestañas operacionales:
  - **Pestaña `[TERRITORIO]`:** Estado de las regiones, fortificaciones de búnker (Niveles 1–5), asedios en curso (conectados a `TerritorySiegeModal.tsx` con **Human Handshake de 120s**, Pilar 7) y control de TCP.
  - **Pestaña `[PUNTOS ESTRATÉGICOS]`:** Control soberano de los activos clave del teatro (Capitales con **Buff Regional +5%**, Pilar 5, además de refinerías, estrechos y centrales) y sus multiplicadores proyectados.
  - **Pestaña `[FORJA & COLA]`:** Colas de producción física de unidades (T1 a T5 con progresión horizontal **+2% por tier, máximo +8% en T5**, Pilar 4) con cuentas regresivas en vivo y reclamo directo al Hangar Físico de 16 Tropas (`UnitHangarModal.tsx`, Pilar 1).
  - **Pestaña `[ARSENAL DE FACCIÓN]`:** Tropas físicas del stock comunitario del clan disponibles para requisición autorizada según rango militar (`authorizeFactionUnitBorrow`).
  - **Pestaña `[MERCADO P2P]`:** Acceso rápido y resumen de la Bolsa P2P (`P2PMarketplaceView.tsx`) regida por el **impuesto total del 2% (1% quemado en Sink + 1% regalía al Clan dueño del Hub regional)** y **VWAP Collar ±25%**.


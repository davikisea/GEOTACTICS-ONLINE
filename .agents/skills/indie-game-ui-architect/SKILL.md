---
name: indie-game-ui-architect
description: Sistema de diseño, arquitectura UX y motor de gamificación para crear interfaces de videojuegos indie y aplicaciones altamente gamificadas (estilo Persona 5, Hades, Advance Wars, Celeste). En GEOTACTICS ONLINE trabaja en sinergia con /tactical-command-intel aplicando siluetas poligonales, física de resortes, barras con Ghost Trail, síntesis Web Audio API (@domains/game-feel) y respeto estricto al Pilar 1 (CERO cartas/gacha, usando Bahías de Chasis Físico).
---
# Indie Game UI/UX & Gamification Architect (GEOTACTICS Aligned)

Transforma interfaces planas y predecibles en experiencias táctiles, diegéticas y llenas de "Game Feel" (*Juice*) dignas de los mejores videojuegos indie. Esta skill prohíbe el diseño corporativo por defecto de la IA (tarjetas blancas simétricas, tipografía Inter, transiciones lineales y tablas estáticas) y obliga a implementar siluetas con carácter, física de resortes, capas diegéticas, audio procedural y bucles psicológicos de gamificación.

> [!IMPORTANT]
> **REGLA DE ORO EN GEOTACTICS ONLINE (SINERGIA CON `/tactical-command-intel`):**
> Cuando operes dentro del repositorio de **GEOTACTICS: ONLINE**, rige el **Pilar Canónico 1: CERO CARTAS (NO TCG/CCG/Gacha)**. Jamás diseñes "mazos de 10 cartas" ni "sobres coleccionables"; toda unidad se representa como una **Bahía de Chasis Físico en el Almacén de 16 Tropas** (`4` activas + `12` en reserva), con integridad en **escala continua de 1 a 100 HP enteros**, Tiers **T1 a T5 (+2% por tier, máx +8% en T5)** y reciclaje del **35% en `tech_scrap`**.

## When to Use

- El usuario pide crear o mejorar la interfaz (UI/UX), HUD, menú principal, hangar industrial, mercado P2P, inspector territorial o pantalla de combate/recompensas.
- El usuario quiere gamificar una vista con estética inmersiva de juego indie (*Advance Wars meets Persona 5 / Hades*) en lugar de un dashboard SaaS aburrido.
- El usuario menciona conceptos como *game feel*, *juiciness*, *diegetic UI*, *screenshake*, *hit-stop*, *ghost bar* o micro-interacciones táctiles.

## Steps

### Paso 1: Comprometer una Dirección de Arte Indie (Anti-SaaS Gate)

Antes de escribir código, selecciona el arquetipo visual apropiado (en **GEOTACTICS ONLINE** la fusión canónica combina **Kinetic Rebel Cutout** + **Mythic Handcrafted Tactical C4ISR**):

1. **Kinetic Rebel Cutout (Estilo *Persona 5* / *Hi-Fi Rush* / *Bark Engine*)**:
   - **Geometría**: Contenedores poligonales asimétricos (`clip-path: polygon(...)`) o curvatura táctica `border-radius: 14px 4px 14px 4px` con inclinaciones dinámicas (`-2deg` a `-5deg`) en sellos pop-art.
   - **Sombra y Textura**: Sombras duras desplazadas sin difuminado (`box-shadow: 4px 4px 0px #0A0B08`), tramas semitono Ben-Day (`radial-gradient(#7B8A4A 15%, transparent 16%)`) y tipografía display condensada en mayúsculas.

2. **Tactical C4ISR Armor Console (Estilo *Advance Wars* / *Hades* Industrial)**:
   - **Geometría**: Marcos biselados a 45° (`clip-path`), doble borde interior metálico y remaches en las esquinas.
   - **Paleta Blindada**: Vacío de Búnker (`#161712` / `#0E100C`), Base de Blindaje (`#2B2C24`), Oliva Militar (`#46521F`), Canto de Metal (`#7B8A4A`), Alerta Óxido (`#C46A3A`) y Crema de Datos (`#F2E8D5`).

3. **Tactile Physical Switchboard (Hundimiento Físico 3D)**:
   - **Geometría**: Botones físicos con grosor 3D real (`border-bottom: 5px solid #5a1e05`) que se hunden físicamente al presionarlos (`transform: translateY(3px) scale(1.04, 0.94); border-bottom-width: 2px`).

### Paso 2: Distribuir la Información en las 4 Capas de Diegesis

1. **Capa Diegética (Dentro del mundo)**: Consolas blindadas, bahías físicas del hangar de 16 tropas, diorama C4ISR (`src/domains/world/components/TacticalC4ISRBaseDiorama.tsx`) y mapa vectorial WebGL (`src/domains/world/components/TacticalWorldMap.tsx`).
2. **Capa Espacial (En las coordenadas de la acción)**: Daño flotante en escala 1–100 HP (`-24 HP`), trazadores balísticos, rutas viales $A^*$ y alertas `¡TRAP!`.
3. **Capa Meta (En el cristal de la pantalla)**: Viñeta roja en DEFCON 1 / asedio activo (Handshake de 120s), destello dorado al activar SCOP y viñetas vivas (`src/domains/game-feel/components/CommanderLivingVignette.tsx`).
4. **Capa No-Diegética (HUD de lectura en <100ms)**: Cabecera de recursos duales (`src/domains/world/components/DualResourceHeader.tsx`), barras con *ghost trail* (`src/shared/ui/TacticalGhostBar.tsx`), reloj Fischer y badges de atajos de teclado (`[1]`–`[6]`, `[SPACE]`, `[ESC]`).

### Paso 3: Inyectar "Game Feel" y "Juice" Procedural (Física y Micro-interacciones)

Toda acción del usuario debe recibir respuesta multisensorial en menos de 16ms (1 frame):

1. **Prohibición de Movimiento Lineal (Spring & Overshoot Easing)**:
   - Nunca uses `transition: all 0.3s ease` ni `linear`.
   - Usa curvas de resorte con rebote: `cubic-bezier(0.34, 1.56, 0.64, 1)` (`--ease-spring`).
   - Usa desaceleración explosiva para salidas: `cubic-bezier(0.22, 1, 0.36, 1)` (`--ease-out-expo`).
2. **Squash & Stretch (Conservación de Volumen)**:
   - Al hacer `:active`, comprime primero (`scale(1.12, 0.88)`), estira al soltar y devuelve a `scale(1, 1)` con curva elástica.
3. **Barras de Progreso de Doble Capa (`TacticalGhostBar`)**:
   - Toda barra de HP (1–100), progreso industrial o puntos TCP (`10,000`/`15,000`) debe tener barra frontal inmediata y barra fantasma trasera con retardo de `220ms` y transición de `450ms`.
4. **Modelo de Trauma Cuadrático para Screen Shake y Hit-Stop**:
   - El desplazamiento visual es proporcional a `trauma ** 2`, respetando siempre interruptores de accesibilidad (`reduceMotion`).
5. **Síntesis de Audio Procedural y Háptica (`@domains/game-feel`)**:
   - Conecta cada botón y evento con `audioManager` (`src/domains/game-feel/core/audioManager.ts`: `playHoverTick`, `playComboAction`, `playGoldTick`, `playSFX`) y `triggerHaptic` (`src/domains/game-feel/core/hapticFeedback.ts`).

### Paso 4: Arquitecturar los 3 Bucles de Gamificación (Octalysis Engine)

1. **Micro-Bucle (0.1s a 3s - Gratificación Táctil Inmediata)**:
   - Clic con hundimiento 3D, sonido procedural con pitch variable (`±4%` a `±8%`), texto flotante y vibración háptica (`10ms`–`25ms`).
2. **Meso-Bucle (1 min a 15 min - Tensión Táctica y Ceremonia de Suministros)**:
   - Cuenta atrás de ensamblaje en tiempo real en la Consola Paradox, medidor estelar de COP/SCOP y ceremonia de 3 tiempos en recompensas (Anticipación -> Clímax -> Presentación).
3. **Macro-Bucle (Progresión Geopolítica e Industrial)**:
   - Complejo industrial de 10 parcelas por feudo, conquista de capitales (+5% buff regional), soberanía De Facto/De Jure (ventana de 24h) y progresión de chasis de T1 a T5 (+2% por tier).

## Gotchas (Anti-Slop Checklist)

- **PROHIBIDO el "SaaS Card Grid"**: Nunca entregues tarjetas con `border-radius: 8px`, fondo blanco/gris plano y sombras difusas.
- **PROHIBIDO introducir vocabulario de Cartas/TCG en GEOTACTICS**: Usa siempre *Chasis Físico*, *Bahía de Hangar (16 máx)*, *Patente Industrial (T1–T5)* y *Escala 1–100 HP*.
- **PROHIBIDOS los cambios de estado mudos**: Toda interacción debe invocar `audioManager` y animar sus contadores con `tabular-nums`.

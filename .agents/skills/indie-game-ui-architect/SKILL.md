---
name: indie-game-ui-architect
description: Sistema de diseno, arquitectura UX y motor de gamificacion para crear interfaces de videojuegos indie y aplicaciones altamente gamificadas (estilo Balatro, Persona 5, Hades, Slay the Spire, Celeste). Usa esta skill siempre que el usuario pida disenar o programar UI/UX para juegos, HUDs, menus interactivos, arboles de habilidades, sistemas de cartas/inventario, dashboards gamificados o experiencias con alto "game feel" y "juiciness", evitando por completo la estetica generica de SaaS corporativo.
---
# Indie Game UI/UX & Gamification Architect

Transforma interfaces planas y predecibles en experiencias tactiles, diegeticas y llenas de "Game Feel" (*Juice*) dignas de los mejores videojuegos indie. Esta skill prohibe el diseno corporativo por defecto de la IA (tarjetas blancas simetricas, tipografia Inter, transiciones lineales y tablas estaticas) y obliga a implementar siluetas con caracter, fisica de resortes, capas diegeticas, audio procedural y bucles psicologicos de gamificacion.

## When to Use

- El usuario pide crear la interfaz (UI/UX), HUD, menu principal, inventario, tienda, arbol de habilidades o pantalla de combate/recompensas de un videojuego (web, Canvas, React, Godot, Unity o movil).
- El usuario quiere gamificar una aplicacion (aprendizaje, productividad, habito, finanzas, fitness) con una estetica inmersiva de juego indie en lugar de un dashboard SaaS aburrido.
- El usuario menciona conceptos como *game feel*, *juiciness*, *diegetic UI*, *screenshake*, *hit-stop*, cartas coleccionables, rachas (*streaks*), cofres/recompensas o referencias como *Balatro*, *Persona 5*, *Hades*, *Hollow Knight* o *Slay the Spire*.

## Steps

### Paso 1: Comprometer una Direccion de Arte Indie (Anti-SaaS Gate)

Antes de escribir una sola linea de codigo, selecciona o infiere uno de los **4 Arquetipos Visuales Indie** y declara sus tokens CSS/visuales. Nunca uses el promedio estadistico de Tailwind/Bootstrap:

1. **Kinetic Rebel Cutout (Estilo *Persona 5* / *Hi-Fi Rush*)**:
   - **Geometria**: Contenedores poligonales asimetricos (`clip-path: polygon(...)`) inclinados entre `-2deg` y `-6deg`. Cero esquinas redondeadas estandar.
   - **Paleta (70-20-10)**: Negro Abisal (`#0A0A0C` 70%), Blanco Tiza (`#F4F4F0` 20%) y Carmesi Electrico (`#E60012` o Amarillo Acido `#FFE600` 10%).
   - **Sombra y Textura**: Sombras duras desplazadas sin difuminado (`box-shadow: 8px 8px 0px #E60012`), tramas semitono (*halftone dots*) y tipografia display condensada en mayusculas con fuerte *tracking*.

2. **Tactile CRT Deckbuilder (Estilo *Balatro* / *Inscryption*)**:
   - **Geometria**: Tapete de juego con textura o viñeta profunda, cartas fisicas con perspectiva 3D (`transform: perspective(800px) rotateX(...) rotateY(...)`) que reaccionan a la posicion del cursor.
   - **Paleta**: Verde Tapete Oscuro (`#112218`) o Azul Noche CRT (`#0F1423`), Marfil Gastado (`#FFF8E7`), Fichas Azul Neon (`#0099FF`) y Multiplicador Rojo Fuego (`#FF4D29`).
   - **Efectos Clave**: Shaders de brillo holografico/foil con `mix-blend-mode: color-dodge`, contadores numericos tipo odometro que saltan y escalan en cada incremento, y filtro opcional de scanlines CRT.

3. **Mythic Handcrafted Ornate (Estilo *Hades* / *Hollow Knight* / *Slay the Spire*)**:
   - **Geometria**: Marcos biselados con esquinas en chaflan o diamante (`clip-path`), doble borde interior metalico (`outline: 1px solid rgba(212, 175, 55, 0.4); outline-offset: -5px`) y remaches decorativos en las esquinas.
   - **Paleta**: Obsidiana Profunda (`#0D0B14`), Purpura Estigia (`#1E192B`), Oro Bronceado (`#D4AF37`), Esmeralda Etereo (`#2CE8A2`) y Sangre Titan (`#C92A2A`).
   - **Tipografia**: Fuentes serif epicas/caligraficas (`Cinzel`, `Cormorant SC`, `Playfair Display`) para titulos y sans humanista limpia para estadisticas.

4. **Cozy Tactile Toybox (Estilo *Stardew Valley* / *Celeste* / *Nintendo*)**:
   - **Geometria**: Botones fisicos con grosor 3D real (`border-bottom: 6px solid #colorMasOscuro`) que se hunden fisicamente al presionarlos (`transform: translateY(4px); border-bottom-width: 2px`).
   - **Paleta**: Tonos calidos de madera, pergamino suave (`#FDF3E7`), verde bosque (`#386641`) y naranja sol (`#F28482`) con bordes gruesos tipo tinta (`2px` a `3px solid #2B2D42`).

### Paso 2: Distribuir la Informacion en las 4 Capas de Diegesis

No agrupes todos los datos en una barra superior o lateral plana. Organiza la interfaz usando el modelo de 4 cuadrantes de diseno de videojuegos:

1. **Capa Diegetica (Dentro del mundo y la historia)**: Convierte contenedores de UI en objetos fisicos del mundo (un tablero de mando, un libro abierto, cartas sobre una mesa, un monitor tactico).
2. **Capa Espacial (En el espacio 2D/3D de la accion)**: Muestra feedback inmediato en las coordenadas exactas del clic o evento (numeros flotantes de `+25 XP` o `CRIT!` con trayectoria parabolica y desvanecimiento, anillos de seleccion y tooltips magneticos).
3. **Capa Meta (En el cristal de la pantalla)**: Usa los bordes del viewport para comunicar estado critico sin texto (pulso de viñeta roja cuando una racha o vida peligra, destello dorado en los bordes al subir de nivel, aberracion cromatica breve en impactos criticos).
4. **Capa No-Diegetica (HUD de lectura rapida)**: Reserva las esquinas exclusivamente para telemetria que exige lectura en menos de 100ms (barras de vida/energia con *ghost trail*, multiplicadores de combo y atajos de teclado `[Q]`, `[E]`, `[SPACE]`).

### Paso 3: Inyectar "Game Feel" y "Juice" Procedural (Fisica y Micro-interacciones)

Toda accion del usuario debe recibir una respuesta multisensorial en menos de 16ms (1 frame). Implementa obligatoriamente estas 5 primitivas tecnicas:

1. **Prohibicion de Movimiento Lineal (Spring & Overshoot Easing)**:
   - Nunca uses `transition: all 0.3s ease` ni `linear`.
   - Usa curvas de resorte con rebote (*overshoot*) para entradas y hovers: `cubic-bezier(0.34, 1.56, 0.64, 1)`.
   - Usa desaceleracion explosiva para salidas y proyectiles: `cubic-bezier(0.22, 1, 0.36, 1)`.

2. **Squash & Stretch (Conservacion de Volumen)**:
   - Al hacer `:active` o disparar un elemento, comprime primero (`scale(1.15, 0.85)`) durante `60ms`, estira al lanzar (`scale(0.92, 1.12)`) y devuelve a `scale(1, 1)` con curva elastica.

3. **Barras de Progreso de Doble Capa (Ghost Drain / Surge Trail)**:
   - Toda barra de HP, XP, Mana o Progreso de Mision debe tener **dos barras superpuestas**:
     - La barra frontal cambia al instante con el nuevo valor.
     - La barra trasera (*ghost bar* en color blanco o amarillo brillante) espera `250ms` y se desliza suavemente (`transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1)`) mostrando visualmente la magnitud exacta del daño o la ganancia de XP.

4. **Modelo de Trauma Cuadratico para Screen Shake y Hit-Stop**:
   - Implementa una funcion `addTrauma(amount)` donde `trauma` decae con el tiempo y el desplazamiento visual es proporcional a `trauma * trauma` (`shake = maxOffset * (trauma ** 2)`).
   - En impactos criticos o logros mayores, aplica un **Hit-Stop** (pausa de `50ms` a `80ms` en la animacion acompañada de un flash blanco de `100ms` sobre el elemento afectado) antes de liberar las particulas.
   - Incluye siempre un interruptor de accesibilidad (`reduceMotion`) que permita desactivar el *screenshake* y los destellos (cumpliendo WCAG 2.3.1, maximo 3 destellos por segundo).

5. **Sintetizador de Audio Procedural Integrado (Web Audio API)**:
   - Una UI de videojuego en silencio se siente rota. Incluye siempre un micro-motor de sonido con `AudioContext` (sin depender de archivos `.mp3` externos) que genere:
     - **Hover tick**: Pulso corto de onda sinusoidal/triangular (`15ms` a `25ms`) con variacion aleatoria de tono (`pitch +/- 8%`) para evitar fatiga auditiva.
     - **Click / Confirm thump**: Barrido rapido de frecuencia con envolvente percusiva.
     - **Combo / Streak Escalation**: Escala pentatonica o semitonal ascendente (`baseFreq * Math.pow(1.059463, comboCount)`) donde cada accion consecutiva suena un semitono mas aguda.

### Paso 4: Arquitecturar los 3 Bucles de Gamificacion (Octalysis Engine)

No limites la gamificacion a una tabla estatica de puntos. Diseña un sistema de retencion en tres escalas de tiempo:

1. **Micro-Bucle (0.1s a 3s - Gratificacion Tactil Inmediata)**:
   - Cada tarea completada o clic dispara particulas locales en coordenadas del cursor, texto flotante (`+XP`), incremento tipo odometro del marcador y escalado del multiplicador de combo (`x1.5`, `x2.0`) con vibracion sutil.

2. **Meso-Bucle (1 min a 15 min - Flujo de Sesion y Recompensa Variable)**:
   - **Medidor de Racha / Combo con Tension de Perdida**: Muestra visualmente el estado activo (fuego, sobrecarga, racha) que cambia de color e intensidad conforme sube el nivel.
   - **Ceremonia de Revelacion (Loot / Card / Milestone Unlock)**: Nunca entregues una recompensa con un simple `alert()` o modal plano. Crea una secuencia de 3 tiempos: *Anticipacion* (el sobre/cofre tiembla y brilla durante `400ms`) -> *Climax* (destello + hit-stop + explosion de particulas) -> *Presentacion por Rareza* (Comun, Raro, Epico, Legendario con marcos y brillos distintos).

3. **Macro-Bucle (Progresion Meta y Efecto Zeigarnik)**:
   - **Arboles de Habilidades / Constelaciones (Skill Trees)**: Representa el progreso a largo plazo mediante nodos conectados por lineas SVG que se iluminan al desbloquearse (estados: *Bloqueado/Silueta*, *Disponible con pulso*, *Dominado/Dorado*).
   - **Coleccion / Compendio con Siluetas Misteriosas**: Muestra los huecos de logros o cartas aun no descubiertos como siluetas oscuras con pistas cripticas (`???`), activando la curiosidad intrinseca del jugador.

## Blueprint de Referencia (CSS + JS Core Engine)

Usa esta base arquitectonica como punto de partida para interfaces web o prototipos en Canvas y adaptala al arquetipo elegido:

```html
<style>
  :root {
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1);
    --bg-abyss: #0D0B14;
    --surface-card: #1A1626;
    --accent-gold: #F5B700;
    --accent-crimson: #FF2A54;
    --accent-cyan: #00F0FF;
    --text-ivory: #F9F6F0;
  }

  /* Contenedor con silueta asimetrica indie y sombra dura */
  .game-panel {
    background: var(--surface-card);
    border: 2px solid var(--accent-gold);
    clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
    box-shadow: 6px 6px 0px #000000;
    transition: transform 0.25s var(--ease-spring), filter 0.15s ease;
    position: relative;
  }

  /* Boton tactil con Squash & Stretch y hundimiento fisico */
  .game-btn {
    background: var(--accent-crimson);
    color: var(--text-ivory);
    border: 2px solid var(--text-ivory);
    border-bottom-width: 6px;
    padding: 12px 24px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: transform 0.18s var(--ease-spring), border-bottom-width 0.08s ease;
  }
  .game-btn:hover {
    transform: translateY(-3px) scale(1.04) rotate(-1deg);
  }
  .game-btn:active {
    transform: translateY(4px) scale(1.12, 0.88);
    border-bottom-width: 2px;
  }

  /* Barra de doble capa con Ghost Trail */
  .bar-track {
    position: relative;
    height: 18px;
    background: #07050A;
    border: 2px solid var(--text-ivory);
    clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
    overflow: hidden;
  }
  .bar-ghost {
    position: absolute;
    inset: 0;
    background: var(--text-ivory);
    width: var(--bar-pct, 50%);
    transition: width 0.55s var(--ease-out-expo) 0.22s;
  }
  .bar-fill {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, var(--accent-crimson), var(--accent-gold));
    width: var(--bar-pct, 50%);
    transition: width 0.12s var(--ease-spring);
  }
</style>

<script>
  // Micro-Sintetizador Procedural Web Audio con escalado de Pitch por Combo
  class JuiceAudio {
    constructor() { this.ctx = null; }
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    playPop(combo = 0) {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const pitchShift = Math.pow(1.059463, Math.min(combo, 14)) * (0.95 + Math.random() * 0.1);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280 * pitchShift, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(620 * pitchShift, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + 0.09);
    }
  }
</script>
```

## Gotchas (Anti-Slop Checklist)

Audita tu codigo antes de entregarlo y corrige cualquiera de estos antipatrones:

- **PROHIBIDO el "SaaS Card Grid"**: Nunca entregues una cuadricula simetrica de tarjetas con `border-radius: 8px`, fondo `#ffffff` o `#1e293b` y `box-shadow: 0 4px 6px rgba(0,0,0,0.1)`. Usa siluetas recortadas (`clip-path`), bordes dobles, inclinaciones ligeras o cartas 3D interactivas.
- **PROHIBIDAS las fuentes de sistema por defecto sin personalidad**: Nunca uses `Inter`, `Roboto`, `Arial` o `system-ui` para encabezados o numeros de impacto. Combina una fuente display expresiva (geometrica pesada, pixel-art, serif epica o display condensada) con numeros tabulares (`font-variant-numeric: tabular-nums`) para evitar que los contadores bailen al cambiar de digito.
- **PROHIBIDOS los cambios de estado silenciosos o instantaneos**: Si un contador sube, debe animar sus digitos y escalar (`scale(1.3)` -> `scale(1)`). Si una tarea se completa, debe emitir particulas, actualizar una barra con *ghost trail* y disparar sonido procedural.
- **PROHIBIDO ignorar el teclado y el mando (Gamepad/Hotkeys)**: Los jugadores esperan navegar sin depender solo del raton. Añade insignias visuales de atajos (`[1]`, `[2]`, `[SPACE]`, `[ESC]`) en los botones principales y soporta sus eventos de teclado reales.

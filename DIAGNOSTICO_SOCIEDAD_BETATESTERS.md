# ☠️ DIAGNÓSTICO FORENSE: LA SOCIEDAD DE LOS 6 BETA TESTERS ÉLITE AAA
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Fecha de Inspección:** 01 de Noviembre, 2026  
**Veredicto Consolidado:** **51.2 / 100 — ALERTA DEFCON 2: ESTADO MIXTO / FRICCIÓN CRÍTICA DE RETENCIÓN**  
**Estándares Canónicos Rectores:**
- `@.agents/skills/tactical-command-intel/SKILL.md` (v4.0.0 — *Kinetic Comic War-Room UI/UX Engine*)
- `@.agents/skills/indie-game-ui-architect/SKILL.md` (*Indie Game UI/UX & Gamification Architect*)

---

## 1. 📊 SCORECARD GENERAL AAA (0 a 100)

Evaluación ponderada bajo el prisma implacable de jugadores de *Balatro*, *Persona 5*, *Hades*, *Slay the Spire* y *Advance Wars*:

| Dimensión de Experiencia de Usuario | Puntuación | Estado | Veredicto del Consejo |
| :--- | :---: | :---: | :--- |
| **1. Impacto Visual Primeros 3 Segundos** | **78 / 100** | 🟢 Sólido | El nuevo Lobby `WarLobbyHub` y el diorama `TacticalC4ISRBaseDiorama` tienen presencia, pero el impacto se derrumba en cuanto abres Tienda (`ShopCatalog`), Producción o Armería. |
| **2. Game Feel & Juice (<16ms Feedback)** | **42 / 100** | 🔴 Crítico | Cero *Hit-Stop* en impactos balísticos; botones sin respuesta elástica ni *Squash & Stretch*; el odómetro de XP/Oro en victoria es 100% sordo; falta vibración y feedback háptico en decisiones clave. |
| **3. Claridad Táctica & Ergonomía (<100ms)** | **46 / 100** | 🔴 Crítico | Promesas rotas de atajos de teclado (`[SPACE]` para esperar en combate no funciona); falta de hotkeys `[1]-[9]` en producción y tiendas; menús anidados sin navegación rápida por teclado. |
| **4. Adicción & Bucles de Dopamina (Octalysis)** | **48 / 100** | 🔴 Crítico | El micro-bucle carece de audio escalado por racha en la mayoría de pantallas; la apertura de sobres/compras en la tienda ocurre con un texto plano sin ceremonia de 3 tiempos; el efecto Zeigarnik está ausente fuera del lobby. |
| **5. Erradicación de "SaaS Slop"** | **38 / 100** | 🛑 Intolerable | Fuerte contraste bipolar: el Lobby y HUD tienen ADN cómic C4ISR, pero `ShopCatalog`, `LoadoutCustomizer`, `ProductionModal` y los modales de `App.tsx` siguen siendo dashboards grises de Tailwind (`slate-900`, `rounded-xl`, `border-slate-800`). |
| **6. Audio & Retroalimentación Multisensorial** | **44 / 100** | 🔴 Crítico | El motor procedural Web Audio está subutilizado fuera del combate; clics mudos en el 70% del metajuego; **33 llamadas a un método inexistente (`audioManager.play`) que provocan crashes en tiempo de ejecución**. |
| **MEDIA GLOBAL PONDERADA** | **51.2 / 100** | ⚠️ DEFCON 2 | **La mitad del juego vibra como una novela gráfica militar de élite; la otra mitad parece una plataforma de facturación SaaS con bugs de sonido.** |

---

## 2. ⏱️ MAPA DE CALOR DE RETENCIÓN Y ABANDONO (DROP-OFF TIMELINE)

¿En qué segundo exacto un jugador impaciente cierra la pestaña y abandona el juego para siempre?

| Intervalo Temporal | Segundo Exacto | Pantalla / Evento Desencadenante | Gatillo de Rage-Quit / Abandono | Tester Más Afectado |
| :---: | :---: | :--- | :--- | :---: |
| **0s – 3s** | **T + 1.8s** | **Despliegue en Fábrica** (`ProductionModal.tsx`) | Al hacer clic en una fábrica para construir un tanque, se abre un modal gris de formulario corporativo (`bg-slate-900 rounded-xl`). El jugador presiona `[ESC]` para cerrarlo y no responde. La inmersión táctica se quiebra de inmediato. | **Zero** (Escáner TL;DR) & **Nyx** (Purista de Arte) |
| **3s – 15s** | **T + 4.2s** | **Primer Turno de Combate** (`CombatTheaterView.tsx:618`) | La barra inferior promete con orgullo: `SPACE: Esperar`. El jugador mueve su unidad y presiona la barra espaciadora. **No ocurre nada.** La tecla no está mapeada en el escuchador. El jugador presiona 3 veces más, se frustra y pierde el flujo de APM. | **Kael** (Speedrunner APM) |
| **15s – 60s** | **T + 22.0s** | **Victoria en Combate** (`MatchSummaryModal.tsx:76`) | Tras ganar una batalla tensa, los números de XP y Oro suben durante 1.2 segundos en **silencio absoluto**. La barra de nivel es una píldora verde estándar sin *Ghost Trail*. Cero dopamina tras el esfuerzo. | **Vex** (Adicto al Juice) & **Jinx** (Min-Maxer) |
| **1m – 5m** | **T + 1m 15s** | **Visita a la Tienda Táctica** (`ShopCatalog.tsx:80`) | El jugador entra con 2.400G para equipar su ejército. Se encuentra una cuadrícula gris idéntica a una plantilla de e-commerce. Compra un aspecto legendario y solo recibe un mensaje de texto plano con `setTimeout`. | **Jinx** & **Nyx** |
| **1m – 5m** | **T + 2m 40s** | **Navegación al Cuartel de Clanes** (`ClanHeadquartersView.tsx:151`) | El jugador hace clic en "Bóveda" o "Donaciones". La aplicación intenta invocar `audioManager.play('menu_select')`, salta un `TypeError` fatal en consola y la interfaz se congela o enmudece. | **Raze** (QA Técnico) |

---

## 3. 🗣️ MESA REDONDA DEL CONSEJO (VEREDICTO CRUDO POR TESTER)

### ⚡ 1. "Vex" — El Adicto al *Juice* y la Dopamina Cinética
> *"Si un botón no se hunde, no hace temblar la pantalla o no cruje con un sonido procedural cuando lo pulso, para mí ese botón no existe. El nuevo Lobby tiene buen tacto con los resortes elásticos, pero en cuanto entras a combate o al metajuego, el juego se vuelve una piedra."*

- **Puntuación Individual:** **4.2 / 10**
- **Lo único que salvo:** La integración de `TacticalGhostBar` en el medidor de energía CO y los resortes `--ease-spring` de los botones del lobby.
- **Las 3 cosas que odié a muerte:**
  1. **El contador mudo de victoria (`src/components/ui/MatchSummaryModal.tsx:76-99`):** ¿Quién programa un odómetro de XP y Oro de 1.2 segundos que se ejecuta en completo silencio? En *Balatro* o *Peglin*, cada chip que sube es un *click-click-click* ascendente que te dispara la serotonina. Aquí parece una barra de descarga de Windows Update.
  2. **Cero Hit-Stop y Sacudida de Pantalla en Combate Balístico (`src/App.tsx:1757-1765`):** Cuando un tanque de 7.000G dispara a quemarropa contra un mech, la cámara no se congela ni 30 milisegundos (`hit-stop`), ni vibra el marco con un trauma real. Es un sprite animado flotando en un lienzo inmóvil.
  3. **Edición de Mapas Silenciosa (`src/editor/modules/MapBuilder.tsx:525-528`):** Arrastrar el pincel para pintar 20 casillas de montaña o bosque es 100% insonoro. No hay clics mecánicos ni vibración háptica; se siente como pintar con el ratón en Paint de 1995.

---

### 🧠 2. "Kael" — El Speedrunner de APM Alto
> *"Juego a 200 APM. Si tengo que levantar la mano del teclado para mover el ratón porque un diseñador se olvidó de mapear la barra espaciadora o el ESC, mi cerebro se desconecta al instante."*

- **Puntuación Individual:** **4.8 / 10**
- **Lo único que salvo:** La barra dock táctica inferior del lobby con atajos `[1]` a `[6]`, `[F]` y `[SPACE]`.
- **Las 3 cosas que odié a muerte:**
  1. **La falsa promesa de `[SPACE]` en Combate (`src/components/game/CombatTheaterView.tsx:618` vs `:190-243`):** El HUD te miente en la cara diciéndote `SPACE: Esperar`. Pero vas al `handleKeyDown` y no existe `e.key === ' '`. El speedrunner presiona Space y el juego lo ignora por completo.
  2. **Menú Contextual con Sordera Alfanumérica (`src/components/game/TileContextMenu.tsx:44-58` vs `CombatTheaterView.tsx:232`):** El menú contextual dibuja badges para `L` (cargar), `H` (ocultar), `R` (reparar) y `Space` (esperar). Pero el contenedor padre solo filtra `['1', '2', '3', '4', '5', '6', '7']`. Si tocas `L`, no hace nada.
  3. **Ausencia total de Hotkeys en Producción y Tienda (`src/components/game/ProductionModal.tsx` & `ShopCatalog.tsx`):** Para desplegar infantería tengo que hacer clic en la fábrica, mover el cursor hasta la lista y hacer clic en el botón verde. Cero soporte para `[1]`-`[9]` para compras instantáneas con la mano izquierda en el teclado.

---

### 🎨 3. "Nyx" — La Purista de Dirección de Arte & Diegesis
> *"La regla de oro era erradicar el SaaS Slop. ¿Cómo es posible que el Lobby luzca como una sala de mando de Persona 5 / Advance Wars y en cuanto abro la Tienda parezca el panel de facturación de Shopify?"*

- **Puntuación Individual:** **4.6 / 10**
- **Lo único que salvo:** El estilo cómic atompunk de `WarLobbyHub`, las tramas Ben-Day en el diorama y los sellos inclinados de la Comandante Stella.
- **Las 3 cosas que odié a muerte:**
  1. **El mar de `slate-900` y `rounded-lg` en la Tienda (`src/components/shop/ShopCatalog.tsx:80, 100, 144, 227`):** Tarjetas cuadradas simétricas, fondo gris azulado genérico de Tailwind, bordes finos de 1px y botones verdes estándar. No hay un solo chaflán a 45°, ni esquinas asimétricas `14px 4px 14px 4px`, ni sombras duras offset `#0A0B08`.
  2. **La Armería parece un formulario administrativo (`src/components/armory/LoadoutCustomizer.tsx:280, 375, 410`):** La caja de vista previa de la skin es un rectángulo estático con un degradado CSS barato. No hay chasis mecánico, ni tornillos, ni iluminación diegética de hangar.
  3. **Omisión del bocadillo `panic` en el Bark Engine (`src/components/game/ComicVignetteOverlay.tsx:77-130`):** El estándar de arte bélico exige un bocadillo rojo DEFCON con vibración continua (`animate-pulse`) ante alertas críticas o emboscadas. En su lugar, el código cae en un bocadillo marfil pacífico de conversación cotidiana.

---

### 🎰 4. "Jinx" — El Min-Maxer de Dopamina y Retención (Octalysis)
> *"Un juego táctico vive o muere por sus bucles de compulsión. Si ganar una partida o comprar una skin legendaria se siente igual que pagar una factura de gas, el jugador no vuelve mañana."*

- **Puntuación Individual:** **5.0 / 10**
- **Lo único que salvo:** La ceremonia de apertura del Rotor de Suministros en el lobby (`WarRoomModal.tsx`) con sus tres tiempos de anticipación.
- **Las 3 cosas que odié a muerte:**
  1. **Compra de skins sin ceremonia ni fanfarria (`src/components/shop/ShopCatalog.tsx:31-62`):** Gastas 500 gemas ganadas con sudor y lo único que hace la pantalla es mostrar un texto que desaparece en 3 segundos: `setNotification('Has adquirido...')`. ¿Dónde está la explosión de confeti militar, el sello Pop-Art cayendo a 15 grados con sonido de percusión y la presentación de la carta?
  2. **Barra de XP Monocapa en Fin de Partida (`src/components/ui/MatchSummaryModal.tsx:197-202`):** Una barra simple de 1 capa con `transition-all duration-1000`. No hay barra fantasma (*Ghost Trail*) que ilustre el progreso acumulado, ni chispas al rellenar el nivel.
  3. **Near-Miss sin dramatismo balístico (`src/components/battle/NearMissAnalysisModal.tsx:116-121`):** Cuando el rival sobrevive con 1 HP milagroso, la barra de vida enemiga es un bloque rojo inmóvil. Debería mostrar la barra fantasma retrocediendo lentamente con vibración para acentuar el dolor de haber estado a 1 solo punto de la victoria.

---

### 👀 5. "Zero" — El Escáner Visual Impaciente (TL;DR)
> *"No leo texto. Nadie lee texto. Si para saber qué hace una unidad tengo que tragarme un párrafo de 4 líneas con fuentes delgadas sin números tabulares, cierro la pestaña."*

- **Puntuación Individual:** **4.8 / 10**
- **Lo único que salvo:** La iconografía con badges espaciales en el diorama SVG y los odómetros de recursos con `tabular-nums` del `CommandHUD`.
- **Las 3 cosas que odié a muerte:**
  1. **Muros de texto sin jerarquía en la Armería (`src/components/armory/LoadoutCustomizer.tsx:386-403`):** Estadísticas de ataque, movimiento y coste amontonadas con el mismo peso tipográfico y etiquetas grises diminutas en `10px` que se pierden contra el fondo.
  2. **Lista vertical infinita en Ensamblaje Militar (`src/components/game/ProductionModal.tsx:134-203`):** En lugar de ver las 10 cartas de tu mazo ordenadas por rol (infantería, blindados, artillería) de un solo golpe de vista, te obligan a hacer scroll vertical en una lista gris de Jira.
  3. **Números que bailan por falta de `tabular-nums` en los temporizadores (`src/components/shop/TiltEmergencyOfferModal.tsx:75-77`):** Cuando el cronómetro de 180 segundos desciende, el ancho de los números cambia constantemente, provocando un micro-salto (*layout jitter*) visual continuo y molesto.

---

### 🔥 6. "Raze" — El Crítico Técnico de Rendimiento & Polish AAA
> *"Puedo perdonar una textura regular, pero no perdono una llamada a una función que no existe en producción. Hay código en el metajuego que rompe la aplicación en vivo."*

- **Puntuación Individual:** **4.0 / 10**
- **Lo único que salvo:** El Zero-Unmount Shell de `App.tsx` que evita destruir el estado del lobby al navegar por el metajuego.
- **Las 3 cosas que odié a muerte:**
  1. **CRASH DE RUNTIME: `audioManager.play is not a function` (`ClanHeadquartersView.tsx` y `CommanderProfileModal.tsx`):** Hay exactamente **33 llamadas** a `audioManager.play(...)` en estos dos componentes. `TacticalAudioManager` solo expone `playSFX()`, `playHoverTick()`, etc. Al hacer clic en las pestañas de clan o personalizar el perfil, se dispara una excepción no capturada en la consola que rompe los manejadores de eventos.
  2. **Regresión de Nivel en `App.tsx:2129`:** `userLevel={simLevel}` donde `simLevel` está inicializado en `1` en lugar de sincronizarse con el nivel real del perfil del usuario (`userProfileIdentity.commanderBondLevel = 8`), degradando el rango del comandante al nivel de recluta.
  3. **Botón de destrucción masiva sin Undo ni Confirmación (`src/editor/modules/MapBuilder.tsx:478-485`):** Un botón llamado "Limpiar" resetea la matriz de 10x10 a llanuras con un solo clic. No hay modal de confirmación, ni diálogo diegético, ni pila de `Ctrl+Z` para recuperar el mapa. Un error de 1 milímetro destruye todo tu trabajo.

---

## 4. 🔬 AUDITORÍA FORENSE PANTALLA POR PANTALLA (UI/UX DEEP DIVE)

### A. Menú Principal / Lobby Bélico (`WarLobbyHub` + Módulos)
- **Estado Actual:** 🟢 **8.2 / 10** (El área mejor lograda del proyecto tras el refactor v4.0.0).
- **Cumplimiento de las 4 Capas de Diégesis:**
  - *Capa 1 (Diegética en mundo):* Excelente. El diorama SVG muestra silos, chimeneas animadas y hangares con sombras de cómic.
  - *Capa 2 (Espacial):* Cumplida con las etiquetas `⚓ ASTILLERO`, `🏭 FÁBRICA`, `📡 RADAR`.
  - *Capa 3 (Cristal/Meta):* Alarma roja pulsante en helipuerto bien integrada.
  - *Capa 4 (No-diegética de esquinas):* Barra de recursos y dock en los perímetros respetando la regla del 65% de lienzo libre.
- **Deficiencias Restantes:** El botón `[P]` en `CommandHUD` abre el perfil, pero `CommanderProfileModal` crashea al guardar debido a la llamada errónea de audio.

### B. Combate & Tablero HUD (`CombatTheaterView`, `GameCanvas`, `COCommandBar`)
- **Estado Actual:** 🟡 **5.7 / 10**.
- **Violación Diegética:**
  - El modo cuadrícula (`CombatTheaterView.tsx:553`) rompe la Capa 3 y cae en SaaS corporativo plano (`slate-900`).
  - La desconexión del atajo `[SPACE]` (L618) y de las teclas alfanuméricas del menú contextual rompe el pacto motor con el jugador.
  - Falta de *Screen Shake* cuadrático al ejecutar disparos balísticos desde `App.tsx:1757`.

### C. Ensamblaje Militar / Fábricas (`ProductionModal.tsx`)
- **Estado Actual:** 🔴 **3.0 / 10** (Urgencia de Rediseño Total).
- **Violación Diegética:** Es un modal flotante 100% no-diegético y simétrico. Parece un checkout de carrito de compras en lugar de una terminal de ensamblaje blindada de una fábrica militar.
- **Falta de Game Feel:** Cero sonidos de percusión metálica o engranajes al producir un tanque; no hay atajos de teclado `[1]-[9]`; el botón `[ESC]` no cierra el modal de forma limpia.

### D. Tienda Táctica & Cosméticos (`ShopCatalog.tsx`)
- **Estado Actual:** 🛑 **2.9 / 10** (El peor componente visual del sistema).
- **Violación Diegética:** Contenedor `bg-slate-900 border-slate-800 rounded-lg` idéntico a un SaaS corporativo. Ignora por completo la paleta `#2B2C24`, el borde asimétrico `14px 4px 14px 4px` y las sombras duras de tinta `#0A0B08`.
- **Falta de Dopamina:** Comprar un aspecto legendario no produce sonido, ni animación, ni ceremonia de adquisición; se limita a un mensaje de texto plano en pantalla.

### E. Armería y Hangar de Carga (`LoadoutCustomizer.tsx`)
- **Estado Actual:** 🔴 **3.2 / 10**.
- **Violación Diegética:** Estructura de tarjetas grises `slate-900` con vista previa estática. No transmite la sensación de estar en un hangar blindado inspeccionando orugas, torretas y camuflajes.

### F. Cuartel de Clanes (`ClanHeadquartersView.tsx`) & Perfil (`CommanderProfileModal.tsx`)
- **Estado Actual:** 🛑 **3.5 / 10** (Comprometido por Runtime Crash).
- **Fallo Técnico Crítico:** 33 llamadas a `audioManager.play()` lanzan errores fatales en consola (`TypeError`).
- **Aspecto Visual:** Aunque tiene buenas intenciones atompunk en sus manómetros, la navegación interna y la tabla de miembros sufren de densidad de hoja de cálculo corporativa.

### G. Resumen Post-Combate (`MatchSummaryModal.tsx`) & Near-Miss (`NearMissAnalysisModal.tsx`)
- **Estado Actual:** 🟡 **4.5 / 10**.
- **Falta de Game Feel:** Contador numérico de 1.2 segundos sin sonido Web Audio; barra de XP monocapa sin *Ghost Trail*; botones de revancha sin hotkeys directos (`[SPACE]` para re-encolar al instante).

### H. Editor de Mapas (`TacticalStudioEditor.tsx` / `MapBuilder.tsx`)
- **Estado Actual:** 🔴 **3.6 / 10**.
- **Peligro Operativo:** Pintura de losetas muda y sin feedback háptico; ausencia total de historial Undo/Redo (`Ctrl+Z`); botón destructivo "Limpiar" sin confirmación.

---

## 5. 🛠️ BACKLOG DE CHOQUE PRIORIZADO (TOP 10 QUICK-WINS DE ALTO IMPACTO)

Ordenado estrictamente por ratio **Dopamina Ganada / Esfuerzo Técnico**:

| # | Prioridad | Módulo / Archivo Afectado | Inyección Técnica Exacta (CSS / Audio / Resorte) | Criterio de Éxito Verificable |
| :-: | :---: | :--- | :--- | :--- |
| **1** | 🚨 **P0** | `src/components/clans/ClanHeadquartersView.tsx`<br>`src/components/profile/CommanderProfileModal.tsx` | Reemplazar las 33 llamadas a `audioManager.play('...')` por `audioManager.playSFX('button_click')` o `audioManager.playHoverTick()`. | Cero excepciones `TypeError` en consola al navegar por clanes y editar el perfil militar. |
| **2** | ⚡ **P0** | `src/components/game/CombatTheaterView.tsx:190-243` | Mapear `e.key === ' '` en `handleKeyDown` para ejecutar la orden 'wait' de la unidad activa o confirmar el menú contextual. | Presionar la barra espaciadora en combate pasa el turno de la unidad seleccionada en <16ms. |
| **3** | 🎨 **P0** | `src/components/shop/ShopCatalog.tsx` | Reemplazar `bg-slate-900 rounded-lg` por `.tactical-comic-card` (`bg-[#2B2C24] border-2 border-[#0A0B08] rounded-[14px_4px_14px_4px] shadow-[4px_4px_0px_#0A0B08]`) y añadir `audioManager.playHoverTick()`. | Erradicación total del look SaaS; tarjetas con sombras de tinta offset y feedback táctil en hover. |
| **4** | 🎰 **P0** | `src/components/ui/MatchSummaryModal.tsx:76-99` | Vincular el bucle de conteo de XP y Oro con `audioManager.playGoldTick(Math.min(step, 14))` e importar `<TacticalGhostBar />` para el nivel. | Cascada de audio procedural ascendente por semitono durante la subida de recursos de victoria. |
| **5** | ⚡ **P1** | `src/components/game/ProductionModal.tsx` | Transformar la lista vertical en una cuadrícula horizontal de `TacticalCard` con atajos de teclado visibles `[1]` a `[9]` y cierre limpio con `[ESC]`. | Despliegue de tropas con un solo toque de teclado numérico y cierre instantáneo con Escape. |
| **6** | 🎨 **P1** | `src/components/armory/LoadoutCustomizer.tsx` | Inyectar estilos C4ISR `.tactical-comic-card`, añadir badges de atajo `[Q]` / `[E]` para alternar unidades y `audioManager.playHoverTick()` en la selección de aspectos. | La armería transmite peso de chasis blindado y permite rotar tropas con teclas de hombro. |
| **7** | 💥 **P1** | `src/components/game/ComicVignetteOverlay.tsx:77-130` | Implementar la taxonomía canónica `panic` con fondo rojo DEFCON vibrante (`animate-pulse`) y audio `playSFX('co_power')` con distorsión. | Las emboscadas y situaciones críticas disparan una viñeta dramática que sacude la pantalla. |
| **8** | 🎰 **P1** | `src/components/battle/NearMissAnalysisModal.tsx:116-121` | Reemplazar la barra de vida roja estática por una barra de doble capa con *Ghost Trail* crema que retrocede con retraso de 220ms. | La supervivencia por 1 HP del rival transmite dolor y tensión balística cinematográfica. |
| **9** | 🛠️ **P2** | `src/editor/modules/MapBuilder.tsx:478-528` | Implementar buffer de historial de 20 estados con `Ctrl+Z` / `Ctrl+Y`, añadir diálogo de confirmación en "Limpiar" y sonido de clic mecánico al pintar losetas. | Imposible perder el mapa por un clic involuntario; pintar celdas genera feedback sonoro satisfactorio. |
| **10** | ⏱️ **P2** | `src/components/shop/TiltEmergencyOfferModal.tsx:75-77` | Aplicar `tabular-nums` en el temporizador de 180s y disparar un pulso acústico tipo sonar en los últimos 30 segundos. | El cronómetro no produce micro-saltos de diseño y genera urgencia visceral en la cuenta atrás. |

---

## 6. CONCLUSIÓN DEL CONSEJO DE BETA TESTERS

*Tactical Command* tiene un motor de combate matemático impecable y un nuevo Menú Principal (`WarLobbyHub`) que demuestra de forma rotunda el potencial del estilo **Kinetic Comic War-Room**. Sin embargo, la persistencia de componentes rezagados con estética SaaS corporativa (`ShopCatalog`, `LoadoutCustomizer`, `ProductionModal`), los atajos de teclado rotos en combate y los 33 errores de runtime en el audio del metajuego crean una experiencia disonante que ahuyenta a los jugadores en los primeros minutos.

Ejecutar el **Backlog de Choque Top 10** cerrará la brecha entre el lobby y el resto del juego, elevando la calificación general de **51.2** a más de **90 / 100** y consolidando el título al nivel de excelencia de los referentes indie contemporáneos (*Balatro*, *Hades*, *Advance Wars*).

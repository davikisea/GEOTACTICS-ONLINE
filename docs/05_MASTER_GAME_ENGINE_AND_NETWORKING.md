# VOLUMEN 5: ARQUITECTURA TÉCNICA DEL MOTOR, RED Y FRONTEND CANVAS
**Documento Canónico Unificado:** `05_MASTER_GAME_ENGINE_AND_NETWORKING.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 5.0.0-DEFINITIVE-MASTER-SPEC  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Archivos Consolidados y Reemplazados:**  
- `03_GAME_ENGINE_ARCHITECTURE.md` (Completo)  
- `04_NETWORKING_AND_BOTS.md` (Completo)  
- `09_FRONTEND_ENGINE_AND_AI_ARCHITECTURE.md` (Completo)  
- Secciones de motor y renderizado de `15_HYPER_ENGAGEMENT_AIRDROP_SYSTEM.md` y `16_HYPER_ENGAGEMENT_MIRROR_TACTICAL_DUEL.md`  
- Motores de integración de GEOTACTICS (`territorialExpansionEngine`, `strategicAndProductionEngine`, `tacticalCombatSeamlessIntegration`).  

---

# 1. FILOSOFÍA DEL MOTOR Y DESACOPLAMIENTO DE FRAMEWORK

El núcleo del motor de juego (*Game Engine Core*) está escrito en **TypeScript estricto y puro**, completamente desacoplado de React y del DOM. El motor opera como una máquina de estados determinista basada en eventos:

```
                            ARQUITECTURA DEL MOTOR TÁCTICO
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         ▼                                ▼                                ▼
[ SUBSISTEMAS DEL MOTOR ]        [ PIPELINE DE SINCRONIZACIÓN ]    [ RENDERIZADOR GRÁFICO ]
 • TurnManager                    • Supabase Realtime Channels      • Canvas 2D / WebGL 60 FPS
 • CombatCalculator (Determ.)     • Reconnect Protocol              • Sprite Animation Sheet
 • MovementPathfinder (A*)        • Lag Compensation NTP            • Web Audio API Procedural
 • FogOfWarService                • Bot AI Decision Engine          • UI React 19 Overlay
```

---

# 2. SUBSISTEMAS DEL MOTOR TÁCTICO (TYPESCRIPT CORE)

### 2.1 Gestor de Turnos y Tiempos (`autonomousOrchestrator.ts`)
**[ESTADO: 100% IMPLEMENTADO Y OPERATIVO EN MOTOR Y CANVAS]**
Controla la máquina de estados de las fases de turno y temporizadores en tiempo real:
1. **`START_TURN`:**
   - Calcula ingresos netos por propiedades capturadas (multiplicador 1.5x en Duelo Espejo, 2.0x en Blitz, 1.0x en Campaña).
   - Aplica deducción de combustible por turno a la aviación (si llega a 0, la unidad se autodestruye).
   - Aplica la penalización de Soft Cap ($-\$200$G por unidad viva a partir de 14).
2. **`ACTION_PHASE`:**
   - Temporizador de turno activo en tiempo real: **15 segundos** (Duelo Espejo), **30 segundos** (Blitz) o **60 segundos** (Campaña).
   - Árbitro Anti-AFK que cede el turno automáticamente al llegar a 0s.
   - Procesa comandos de movimiento, ataque, captura y producción en fábricas con Doble Llave ($G in-match + stock en Hangar).
3. **`END_TURN`:**
   - Limpia marcas de acción (`hasActed = false`).
   - Concede el turno al oponente y reinicia el cronómetro del HUD.

### 2.2 Calculadora Determinista de Combate (`canonicalCombat.ts` & `combat.ts`)
*Implementación de Referencia:* `src/engine/canonicalCombat.ts`, `src/engine/canonicalDamageChart.ts`, `src/engine/combat.ts`.

El cálculo balístico de daño se ejecuta de forma 100% determinista sin números aleatorios, computando munición primaria/secundaria y cobertura de terreno proporcional al HP:

```typescript
// Implementación canónica de CanonicalCombatEngine.calculateEngagement:
const attackModifier = coAttackModifier + commtowersCount * 10;
const defenseModifier = coDefenseModifier;

// Factor ofensivo Advance Wars (luckModifier = 0 en partidas deterministas)
const attackFactor = Math.max(0, Math.floor(baseDamage * (attackModifier / 100) + luckModifier));
const attackHPFactor = Math.floor(attackFactor * (attacker.hp / 10));

// Factor defensivo escalado por la salud del defensor
const defenderTerrainStars = defenderTile.defenseStars;
const defenseFactor = Math.floor(200 - (defenseModifier + defenderTerrainStars * defender.hp)) / 100;

// Daño porcentual y conversión a escala de 10 HP
const damagePercent = Math.max(1, Math.floor(attackHPFactor * defenseFactor));
const attackerDamageDealt = Math.min(defender.hp, Math.max(1, Math.floor(damagePercent / 10)));
const defenderHpAfter = Math.max(0, defender.hp - attackerDamageDealt);

// Contraataque inmediato evaluado sobre el HP remanente si está en rango
let counterDamageDealt = 0;
if (defenderHpAfter > 0 && inDefenderRange) {
  const counterWeapon = getCanonicalBaseDamage(defender.unitCode, attacker.unitCode, defenderHasAmmo);
  if (counterWeapon.baseDamage > 0) {
    const counterAttackFactor = Math.max(0, Math.floor(counterWeapon.baseDamage * (defenseModifier / 100)));
    const counterAttackHPFactor = Math.floor(counterAttackFactor * (defenderHpAfter / 10));
    const attackerDefenseFactor = Math.floor(200 - (attackModifier + attackerTile.defenseStars * attacker.hp)) / 100;
    const counterDmgPercent = Math.max(1, Math.floor(counterAttackHPFactor * attackerDefenseFactor));
    counterDamageDealt = Math.min(attacker.hp, Math.max(1, Math.floor(counterDmgPercent / 10)));
  }
}
```

### 2.3 Algoritmo A*, Dijkstra Dinámico, Transición Atómica y Regla `¡TRAP!` (`pathfinding.ts`, `App.tsx` & `subActions.ts`)
*Implementación de Referencia:* `src/engine/pathfinding.ts`, `src/engine/subActions.ts`, `src/App.tsx`.

- **A* y Dijkstra con Matriz de Locomoción Canónica:** Calcula el camino óptimo considerando costes de combustible y tracción por baldosa (`foot`, `mech`, `wheels`, `treads`, `air`, `sea`). Para la exploración de casillas alcanzables en niebla de guerra, el algoritmo utiliza `isTileImpassable` desde la perspectiva del equipo activo, asegurando que las tropas enemigas ocultas no bloqueen prematuramente el rango proyectado.
- **Regla `¡TRAP!` (Emboscada Dinámica en Niebla):** Durante la marcha, si una baldosa transitable oculta una tropa enemiga en bosque o arrecife, el avance se interrumpe de inmediato en la celda anterior a la colisión, el jugador pierde el turno de dicha unidad (`hasActed = true`), se cancela cualquier ataque encadenado y se detona el evento audiovisual y háptico `¡TRAP!`.
- **Despacho Atómico de Movimiento y Ataque (`handleAtomicMoveAndAttack`):**
  Para evitar condiciones de carrera en el ciclo de renderizado de React 19 y desincronizaciones de red en Vite, la transición de desplazamiento hacia una celda y el posterior cálculo balístico de fuego directo se resuelven en una única mutación síncrona atómica. Esto garantiza que la posición actualizada de la unidad atacante, el consumo de combustible y la resolución del daño se asienten de forma simultánea e indivisible en el estado global.
- **Menú de Sub-Acciones (`subActions.ts`):** Evalúa contextualmente `wait`, `attack`, `capture`, `join` (fusión de unidades con reembolso en tesoro), `load`/`unload` (transportes multitropa sincronizando `loadedUnitIds` y `isLoadedInsideId`), `supply` (recarga adyacente de APC/BlackBoat), `launch_silo` (misiles tácticos en área 3 HP), `explode` (Black Bomb kamikaze 5 HP) y `hide`/`show` (inmersión submarina y camuflaje aéreo).

### 2.4 Sistemas Auxiliares de Logística y Victoria
- `fuelLogistics.ts`: Drenaje de combustible por turno con penalización meteorológica (duplicado en nieve). Fatalidades directas: unidades aéreas a 0 combustible se estrellan (`Crash`), submarinos a 0 combustible sumergidos se hunden (`Sink`).
- `propertyMaintenance.ts`: Reabastecimiento gratuito y curación de +2 HP (+3 HP Rachel) con cobro del 10% del coste de la unidad por cada HP curado.
- `hqCaptureVictory.ts`: Toma de cuartel general provoca la rendición inmediata del enemigo, la transferencia total de sus propiedades territoriales al vencedor y la disolución de todas las unidades derrotadas.

### 2.5 Enrutamiento Estético de Flechas Tácticas (`pathingArrow.ts`)
*Implementación de Referencia:* `src/engine/pathingArrow.ts`, `src/components/game/GameCanvas.tsx`.

El motor descompone la trayectoria continua generada por el pathfinder en un conjunto discreto de 15 primitivas de segmento canónicas idénticas a la especificación de Advance Wars / WarsWorld:

```
[ CATÁLOGO DE 15 PRIMITIVAS DE SEGMENTO DE FLECHA ]
├── LÍNEAS RECTAS:
│   ├── 'ew' ('horizontal'): Segmento horizontal este-oeste.
│   └── 'ns' ('vertical'): Segmento vertical norte-sur.
├── ESQUINAS DE GIRO:
│   ├── 'ne' ('corner_ne'): Giro noreste (de abajo hacia la derecha).
│   ├── 'nw' ('corner_nw'): Giro noroeste (de abajo hacia la izquierda).
│   ├── 'se' ('corner_se'): Giro sureste (de arriba hacia la derecha).
│   └── 'sw' ('corner_sw'): Giro suroeste (de arriba hacia la izquierda).
├── CABEZAS DE FLECHA (TERMINAL):
│   ├── 'nd' ('arrow_up'): Flecha apuntando al norte.
│   ├── 'sd' ('arrow_down'): Flecha apuntando al sur.
│   ├── 'wd' ('arrow_left'): Flecha apuntando al oeste.
│   └── 'ed' ('arrow_right'): Flecha apuntando al este.
└── NÓDULOS DE ORIGEN:
    ├── 'od' ('start_dot'): Nódulo base estático (camino de 1 sola baldosa).
    ├── 'on' ('start_up'): Origen con salida hacia el norte.
    ├── 'os' ('start_down'): Origen con salida hacia el sur.
    ├── 'ow' ('start_left'): Origen con salida hacia el oeste.
    └── 'oe' ('start_right'): Origen con salida hacia el este.
```

- **Algoritmo de Conexión de 3 Puntos:** La función pura `getArrowSegmentCode(prev, curr, next)` evalúa los deltas de dirección entre el punto anterior, actual y siguiente para resolver esquinas y vectores ortogonales en tiempo constante $O(1)$.

### 2.6 Algoritmo de Convolución y Mapa de Calor de Amenazas (`threatRange.ts`)
*Implementación de Referencia:* `src/engine/threatRange.ts`.

Para proporcionar asistencia táctica visual y suministrar heurísticas al bot de IA, el subsistema calcula el alcance de peligro combinado de las tropas rivales:

1. **Amenaza Directa vs. Indirecta:**
   - **Unidades Indirectas (Artillería, Lanzacohetes, Acorazados):** Al no poder moverse y disparar en el mismo turno, proyectan una **corona de amenaza estacionaria** entre $\text{minRange}$ y $\text{maxRange}$ calculada con distancia Manhattan:
     $$\text{dist} = |x - x_{\text{unit}}| + |y - y_{\text{unit}}|, \quad \text{minRange} \le \text{dist} \le \text{maxRange}$$
   - **Unidades Directas (Infantería, Tanques, Cazas):** Proyectan una **zona de amenaza dinámica**: calculan primero todas las casillas alcanzables según su rango de movimiento y coste de terreno, y proyectan un radio ortogonal Manhattan $= 1$ sobre cada una de ellas.

2. **Mapa de Calor Convolucional (`heatMap`):**
   Se inicializa una matriz 2D $[H \times W]$ con ceros. Por cada unidad enemiga, se incrementan los valores de las celdas bajo su rango de ataque. La superposición indica zonas de fuego cruzado crítico ($\ge 2$ unidades enemigas convergiendo en la celda), visualizables en el canvas como gradientes de peligro para evitar errores de posicionamiento.

### 2.6 Motores de Integración Territorial y Escalado Alice
*Implementación de Referencia:* `src/engine/territorialExpansionEngine.ts`, `src/engine/strategicAndProductionEngine.ts`, `src/engine/tacticalCombatSeamlessIntegration.ts`.

1. **Motor de Ondas Celulares Territorial.io (`territorialExpansionEngine.ts`):**
   - Resuelve la expansión territorial mediante frentes continuos de celdas Voronoi/H3 alimentados por presupuesto de tropas/energía.
   - Cada pulso de expansión (`executeTerritorialExpansion`) consume $\approx 150\text{ tropas/coste}$ por celda, propagando ondas outward concéntricas hacia baldosas adyacentes no reclamadas o neutrales.
   - Detección automática de captura de Nodos Estratégicos (`checkStrategicNodeCaptureOnCell`) cuando una oleada alcanza la coordenada geográfica de un activo clave.
2. **Motor de Nodos y Rendimiento Económico (`strategicAndProductionEngine.ts`):**
   - Computa la agregación acumulativa de bonificaciones soberanas de los 7 nodos canónicos de Venezuela (Caracas, Maracaibo, Amuay, Paria, Guri, Margarita, Maracay).
   - Genera los multiplicadores multiplicativos para extracción de Créditos Energéticos (`energyExtractionMult`), velocidad de forja (`forgeSpeedMult`) y bonos de recon/área.
3. **Integración Táctica Sin Costuras (`tacticalCombatSeamlessIntegration.ts`):**
   - Transiciona de forma continua entre el mapa macro de teatro y el tablero de asedio táctico (Semantic LOD 1 $\to$ 2 $\to$ 3).
   - Valida la regla de Doble Llave ($G in-match + stock en hangar) en tiempo de instanciación.
   - Liquida pérdidas definitivas descontando del hangar del usuario o facción y calculando el retorno del 35% de chatarra recuperable (`tech_scrap`).

---

# 3. SINCRONIZACIÓN DE RED Y REALTIME WEBSOCKETS

### 3.1 Canales Supabase Realtime
La comunicación se organiza en tres canales independientes para aislar el tráfico de alta frecuencia:
1. `match_board:match_id`: Emite deltas de estado comprimidos (`MOVE_UNIT`, `ATTACK_UNIT`, `SPAWN_UNIT`, `CLAIM_AIRDROP`).
2. `match_chat:match_id`: Mensajería de texto libre filtrada, emotes y Quick Chat.
3. `telemetry_stream`: Métricas de PTE, clics y tiempos de turno para el Bark Engine y detección de Tilt.

### 3.2 Protocolo de Reconexión Transparente y Banco de Desconexión PvP
*Implementación de Referencia:* `src/hooks/useMatchSync.ts`, `src/types/network.ts`, `supabase/migrations/20261031000022_reconnection_snapshots_and_full_catalog.sql`.
Si un jugador pierde la conexión:
- El cliente local mantiene el estado in-memory y detecta la pérdida de señal mediante eventos de canal Supabase Realtime y `navigator.onLine`.
- Cero polling HTTP a endpoints REST: La sincronización es 100% conducida por eventos WebSocket a través del hook unificado `useMatchSync`.
- Al recuperar la señal, el cliente invoca atómicamente `rpc_reconnect_match_state(p_match_id, clientTurn, clientLastSeq)`. El servidor evalúa la tupla y devuelve o bien el `TurnSnapshot` íntegro (si el turno avanzó) o los deltas incrementales de `match_action_deltas` (si está en el mismo turno), rehidratando el tablero sin forzar la recarga completa de la página (`window.location.reload()`).

#### 3.2.1 Protocolo de Resincronización Atómica y Banco de Desconexión PvP
1. **Banco de Gracia de Desconexión (`DisconnectGraceBank`):**
   - Duelo Espejo: **$30\text{ segundos}$** por jugador.
   - Escaramuza Blitz: **$60\text{ segundos}$** por jugador.
   - Gran Campaña: **$120\text{ segundos}$** por jugador.
2. **Gobernanza Asimétrica de Reloj:**
   - Si el jugador se desconecta durante su turno activo, el cronómetro de turno consume primero sus segundos normales y a continuación consume su Banco de Gracia. Al llegar a $0\text{s}$, el servidor ejecuta `execute_match_forfeit(p_match_id, p_disconnected_id)` concediendo la victoria al rival por abandono.
   - Si el jugador se desconecta en el turno del rival, su Banco de Gracia no se consume hasta que el rival ceda el turno.
3. **Cero Congelación para el Rival en Línea:** El canvas del jugador activo permanece operativo y el HUD proyecta un banner superior no modal: `⚠️ RIVAL DESCONECTADO (Banco de Gracia: 00:24)`.
4. **Resincronización Atómica (Snapshot Dump):**
   Al reconectar, el cliente descarta cualquier estado local y ejecuta la función RPC `rpc_get_match_snapshot(p_match_id)`. El estado completo (`units`, `tiles`, `funds`, `turnTimeRemaining`, `playerCOs`) se hidrata en un único ciclo de renderizado $O(1)$, evitando desincronizaciones de eventos heredados.

### 3.3 Persistencia Segura de Transportes y Pasajeros
*Implementación de Referencia:* `src/types/index.ts`, `src/engine/specialAbilities.ts`, `src/components/game/GameCanvas.tsx`.

Para evitar desincronizaciones de red, recargas del navegador o corrupciones en Supabase:
- Toda unidad de transporte almacena la lista de identidades de sus pasajeros en `transport.loadedUnitIds: string[]`.
- Cada pasajero embarcado conserva un puntero inverso a su vehículo anfitrión en `passenger.isLoadedInsideId: string | null`.
- **Renderizado e Interacción en Canvas:** Las tropas con `isLoadedInsideId != null` son omitidas del bucle de dibujo principal y del hit-testing de clics, evitando selecciones fantasma.
- Al desembarcar (`unload`), el transporte desvincula el ID del pasajero de `loadedUnitIds` y limpia `passenger.isLoadedInsideId = null`, restaurando la unidad en la casilla de desembarque adyacente elegida.

### 3.4 Gobernanza Económica y Bucle de Progresión Offline
*Implementación de Referencia:* `src/types/index.ts`, `src/types/database.types.ts`, `supabase/migrations/20261031000015_offline_progression_and_transport_persistence.sql`, `src/engine/autonomousOrchestrator.ts`.

Se establece una estricta taxonomía económica de 3 niveles:
1. **`funds` (Fondos de Partida):** Divisa efímera generada in-match por ciudades, fábricas y sedes para desplegar tropas y financiar reparaciones.
2. **`battleCredits` (Créditos de Batalla):** Divisa persistente de cuenta otorgada tras concluir partidas para desbloquear cosméticos, skins y hangar.
3. **`commandGems` (Gemas de Mando):** Divisa premium persistente para pases y personalizaciones exclusivas.

**Regulación del Modo Offline (vs Bot):**
- **50% de Recompensas:** Las partidas offline contra la máquina otorgan exactamente la mitad de los créditos y XP de una partida online estándar.
- **Cero Trofeos:** No otorgan trofeos de ladder clasificatorio (`trophiesDelta = 0`), reservando el prestigio competitivo exclusivamente al modo online.
- **Tope Diario Estricto (Hard Cap):** Límite máximo de **3 partidas con recompensa al día**. Las partidas offline subsecuentes se consideran de práctica recreativa libre (0 créditos adicionales).
- **Escalado por Dificultad:** Multiplicador ligero de incentivo (Fácil: $0.85\times$, Normal: $1.0\times$, Difícil/Ajedrez: $1.20\times$).

---

# 4. RENDERIZADO FRONTEND: MAPLIBRE GL WEBGL, CANVAS 2D Y AUDIO PROCEDURAL

### 4.1 Arquitectura Híbrida de Renderizado y Semantic LOD
El cliente de *Tactical Command* combina dos motores de renderizado optimizados para soportar la experiencia sin costuras desde la perspectiva planetaria hasta la escaramuza de baldosas:

1. **Motor Cartográfico Macro (MapLibre GL / OpenPlace WebGL 2.0):**
   - Renderiza el globo terráqueo en modo oscuro estilo C4ISR (*dark mode militar*).
   - El resto de continentes y países no jugables permanecen atenuados con opacidad al 25% y shader de desaturación.
   - Proyecta los polígonos vectoriales GeoJSON de las 24 regiones de Venezuela y las 7 zonas limítrofes con coloreado dinámico según la facción soberana.
   - Pinta en tiempo real las olas de celdas celulares Voronoi/H3 conquistadas por clanes estilo *Territorial.io*.

2. **Niveles de Detalle Semántico (Semantic LOD 1 / 2 / 3):**
   - **LOD 1 (Continental / Estratégico, $z < 6.0$):**
     * Vista de mapa satelital simplificado.
     * Fronteras nacionales consolidadas, niebla macro estática y marcas heráldicas de las alianzas dominantes.
   - **LOD 2 (Operacional de Teatro, $6.0 \le z < 13.0$):**
     * Desglose provincial en micro-regiones.
     * Capa activa de celdas de avance territorial, flechas de vector de marcha y marcadores tridimensionales de los 7 Nodos Estratégicos (Amuay, Paria, Guri, etc.).
     * Proyección de asedios en curso con barras de Puntos de Control Territorial (TCP) y cuentas regresivas de Handshake (120s).
   - **LOD 3 (Táctico Local / Batalla, $z \ge 13.0$):**
     * Transición sin pantallas de carga al tablero de asedio Advance Wars sobre cuadrícula ortogonal $24 \times 24$.
     * Bucle de dibujo a 60 FPS con micro-terrenos, niebla de guerra con raycasting radial y sprites de combate.

3. **Bucle de Dibujo en Canvas Táctico a 60 FPS:**
   - *Capa 0 (Terreno Base):* Malla de celdas estáticas dibujada en un OffscreenCanvas para evitar redibujados innecesarios.
   - *Capa 1 (Propiedades y Fábricas):* Sprites de ciudades con animación de bandera según el bando capturador.
   - *Capa 2 (Suministros y Silos):* Balizas y depósitos tácticos con gradiente de iluminación.
   - *Capa 3 (Unidades):* Sprites pixelados escalados por pixel art nítido (`imageSmoothingEnabled = false`), con barras de HP proporcionales de 1 a 100.
   - *Capa 4 (Niebla de Guerra):* Máscara semitransparente con recorte radial (*globalCompositeOperation = 'destination-out'*).
   - *Capa 5 (VFX y Onomatopeyas):* Sellos de cómic Pop-Art, explosiones de partículas y trazos de proyectiles.

### 4.2 Motor de Audio Procedural Web Audio API
El juego **no descarga archivos de sonido externos** (.mp3 o .wav). Todos los efectos son sintetizados al vuelo mediante nodos de osciladores senoidales, ruido blanco y filtros biquad:
- **Disparo de Cañón:** Generador de ruido blanco filtrado con un filtro pasa-bajos exponencial descendente de $800\,\text{Hz} \to 40\,\text{Hz}$ en $0.4\text{s}$.
- **Sirena de Alerta DEFCON:** Dos ondas senoidales entrelazadas en 520Hz y 660Hz.
- **Temporizador de 15s (Duelo Espejo):** Pulsos de onda cuadrada a $880\,\text{Hz}$ con duración de $40\text{ms}$ en los segundos 5, 3, 2 y 1.

### 4.3 Sistema de Diseño Frontend: Especificación Canónica de la Skill `retro-futurism`
Todo el desarrollo de la interfaz de usuario web (HUD táctico, barras de mando, modales de producción, armería, tienda y viñetas de cómic) debe implementar obligatoriamente las directrices de diseño contenidas en [`.agents/skills/tactical-command-intel/SKILL.md`](.agents/skills/tactical-command-intel/SKILL.md):

1. **Axiomas de Maquetación Atompunk (Space-Age):**
   - **Formas Aerodinámicas:** Evitar cajas con rectángulos perfectos o bordes genéricos. Toda tarjeta contenedora táctica debe aplicar radios de esquina asimétricos:
     ```css
     border-radius: 40px 10px 40px 10px; /* Sweeping, aerodynamic corners */
     ```
   - **Sombreado Rígido (Hard Drop Shadow):** Sombras sólidas de alto contraste sin difuminado (*blur = 0*):
     ```css
     box-shadow: 15px 15px 0px rgba(0, 0, 0, 0.5);
     ```
   - **Biseles Metálicos y Cromados:** Los bordes de contenedores principales simulan cromo reflectante mediante gradientes lineales (`LinearGradient` de `#7B8A4A` a `#F2E8D5` y `#7B8A4A`).
   - **Curvas Googie y Starbursts:** Integración de remates en forma de estrella atómica y aletas aerodinámicas en encabezados y botones de acción primaria (`clip-path: polygon(...)`).

2. **Paleta Cromática Oficial:**
   | Token | Color Hex | Uso en Frontend |
   |:---|:---:|:---|
   | `bg-dark` | `#2B2C24` | Fondo base de pantalla y tableros |
   | `olive-card` | `#46521F` | Fondo de tarjetas tácticas, modales y barras de mando |
   | `green-border` | `#7B8A4A` | Bordes metálicos, divisores y elementos de HUD activo |
   | `rust-orange` | `#C46A3A` | Botones de ataque, alertas críticas, sellos y banners de acción |
   | `cream-text` | `#F2E8D5` | Tipografía principal, títulos y números legibles |

3. **Tipografía:** Tipografía geométrica sans-serif de mediados de siglo (`Futura`, `Trebuchet MS`), garantizando claridad visual y estética retro-futurista optimista ("Clean, optimistic and shiny").

### 4.4 Discriminación Matemática de Gestos Táctiles Móviles (`GameCanvas.tsx`)
En pantallas móviles táctiles (< 6 pulgadas), el lienzo ejecuta un clasificador continuo de gestos:

1. **Zona Muerta de Arrastre (`DRAG_THRESHOLD_PX = 10.0px`):** Si el desplazamiento táctil $||\vec{P}_{\text{actual}} - \vec{P}_{\text{inicio}}|| < 10\text{px}$ y la duración es inferior a $250\text{ms}$, se resuelve como `TAP` limpio, impidiendo desplazamientos accidentales de cámara.
2. **Inspección Táctica por Pulsación Prolongada (`LONG_PRESS_MS = 400ms`):** Mantener el dedo sobre una unidad o baldosa durante $\ge 400\text{ms}$ con una deriva $< 6\text{px}$ activa la inspección estática del radio de amenaza (`ThreatRange`) y emite una vibración háptica de $40\text{ms}$ (`navigator.vibrate`), bloqueando cualquier orden de movimiento.
3. **Escala y Límites de Zoom:**
   - **Rango Operativo:** $Z_{\min} = 0.45\times$ (visión estratégica total) a $Z_{\max} = 1.85\times$ (inspección de miniaturas).
   - **Sensibilidad Pinch-to-Zoom:** Multiplicador $\gamma = 0.008$ sobre el delta de distancia euclidiana entre contactos.
   - **Conservación de Centroide:** La cámara compensa dinámicamente las coordenadas $(C_x, C_y)$ para mantener el punto medio entre ambos dedos inmóvil durante el escalado.
4. **Hitbox Táctil Expandida:** Cada baldosa proyecta un margen perimetral virtual de $+6\text{px}$ en resoluciones móviles, garantizando que el objetivo cumpla el mínimo de $44\times44\text{px}$ estipulado en las pautas WCAG 2.1 AAA.

---

# 5. MOTOR DE INTELIGENCIA ARTIFICIAL HEURÍSTICA PARA BOTS

El bot opera evaluando un árbol de decisión ponderado sin consumir recursos excesivos en Edge:

$$\text{Puntuación}(\text{Acción}) = w_1 \cdot \Delta\text{ValorMilitar} + w_2 \cdot \Delta\text{Propiedades} + w_3 \cdot \Delta\text{ControlTerreno} - w_4 \cdot \text{RiesgoContragolpe}$$

- **Dificultad Fácil:** Prioriza captura de ciudades adyacentes; ignora la cobertura de estrellas de terreno.
- **Dificultad Normal:** Evalúa tablas de daño y protege sus unidades indirectas con blindados directos.
- **Dificultad Difícil:** Calcula distancias Manhattan, tiende emboscadas en niebla de guerra y prioriza la captura inmediata de los AirDrops que aparecen en turnos 2 y 5.
- **Dificultad Ajedrez (`chess` - Simulador de Alto Rendimiento):**
  Opera como un motor de análisis implacable inspirado en motores de ajedrez:
  1. *Ratio Financiero de Intercambio (Trade Efficiency):* Evalúa la relación costo/beneficio en fondos de cada escaramuza:
     $$\text{TradeScore} = \left(\text{CostoDefensor} \times \frac{\text{DañoInfligido}}{10}\right) - \left(\text{CostoAtacante} \times \frac{\text{DañoContraataque}}{10}\right)$$
  2. *Penalización Extrema por Riesgo:* Duplica la aversión al contraataque (penalización de $-140$ vs $-70$), negándose a ejecutar ataques donde el intercambio de fondos sea desfavorable.
  3. *Incentivo por Eliminación Completa:* Bono masivo ($+3,500$ vs $+2,000$) si el ataque aniquila a la tropa enemiga, impidiendo que el rival pueda fusionarla o repararla.
  4. *Ponderación de Cobertura de Terreno:* Valora de forma crítica las estrellas defensivas del destino (peso $+120$ vs $+80$), forzando posicionamientos en montañas y bosques.
  5. *Producción de Fábrica Determinista y Contra-Unidades:* Audita la composición del ejército rival para desplegar contramedidas exactas (antiaéreos Vulcan frente a cazas/helicópteros, blindados pesados y artillería frente a columnas de tanques).


---

# 6. SUITE DE ESTUDIO DE DESARROLLO Y EDICIÓN TÁCTICA (`src/editor/TacticalStudioEditor.tsx`)
**[ESTADO: 100% IMPLEMENTADO Y OPERATIVO EN CÓDIGO]**  
*Implementación de Referencia:* `src/editor/TacticalStudioEditor.tsx`, `src/editor/modules/MapBuilder.tsx`, `src/editor/modules/SpriteStudio.tsx`, `src/editor/modules/CommanderBarkStudio.tsx`, `src/editor/mapBuilder.test.ts`.

El entorno de desarrollo incluye una suite de herramientas de creación accesibles en tiempo de ejecución:

### 6.1 Constructor de Mapas Tácticos (`MapBuilder.tsx`)
- **Pincel Multiterreno:** Permite pintar las 17 tipologías de terreno canónicas (incluyendo silos balísticos, commtowers, arrecifes y tuberías).
- **Herramienta de Simetría Rotacional $180^\circ$:** Diseñada para mapas competitivos de Duelo Espejo; replica automáticamente cualquier colocación de terreno o propiedad en el cuadrante diametralmente opuesto.
- **Importador y Exportador AWBW/JSON:** Serializa y deserializa cuadrículas compatibles con WarsWorld y Advance Wars By Web (`mapImporter.ts`).

### 6.2 Estudio de Sprites Pixel-Art (`SpriteStudio.tsx`)
- **Lienzo de Inspección con Zoom Óptico:** Escala de $2\times$ a $8\times$ con conservación de bordes pixelados (*nearest-neighbor*).
- **Control de Ciclos de Animación:** Selector de fotogramas por segundo (FPS), estados de reposo (`idle`), marcha (`move`) y disparo (`fire`).
- **Remapeo Dinámico de Paletas:** Conmutación instantánea entre uniformes de facción (Orange Star, Blue Moon, Green Earth, Yellow Comet, Black Hole).

### 6.3 Estudio de Comandantes y Bark Engine (`CommanderBarkStudio.tsx`)
- **Probador de Viñetas Cómicas:** Previsualización de los 28 comandantes con 5 siluetas de bocadillos y sellos Pop-Art (`¡BOOM!`, `¡ALERT!`, `¡CLUTCH!`, `¡SINK!`, `¡CRASH!`).
- **Consola de Simulación de Triggers:** Permite forzar disparos de eventos (`co_power`, `airdrop_spawn`, `trap_ambush`, `near_miss`) e interpolar parámetros de amistad (`bondingLevel`).

---

# 7. ARNÉS DE TELEMETRÍA Y QA EN VIVO (`src/components/qa/QADevOpsRunner.tsx`)
**[ESTADO: 100% IMPLEMENTADO Y ACCESIBLE DESDE EL LOBBY]**  
*Implementación de Referencia:* `src/components/qa/QADevOpsRunner.tsx`, `src/engine/clanSystem.test.ts`, `src/engine/e2eIntegration.test.ts`.

Integrado en la cabecera técnica del Lobby como `[⚙️ Terminal de Estado Mayor]`, el ejecutor de QA permite:
1. **Validación Automática de Determinismo ($RNG = 0$):** Ejecuta 100 micro-duelos deterministas y valida que no exista desviación estándar en el daño.
2. **Benchmark de Rendimiento A\*:** Comprueba que las búsquedas de ruta en mapas de $32\times32$ resuelvan en menos de $2.5\text{ms}$.
3. **Chequeo de Integridad de Tablas Balísticas:** Verifica la no-regresión de las 144 interacciones directas del catálogo balístico.

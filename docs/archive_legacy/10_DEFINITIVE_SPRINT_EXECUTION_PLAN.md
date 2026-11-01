# PLAN DE SPRINTS DEFINITIVO (0% A 100% EN PRODUCCIÓN)
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión de Planificación:** 3.0.0-REALISTIC-SPRINTS  
**Estado Real Actual:** `v0.1.5-PROTOTYPE` (Sprint 1 Completado, Sprint 2 en Curso).  
**Metodología:** Agile Scrum (Sprints atómicos de 2 semanas, 12 semanas totales hasta producción).  
**Premisa Operativa:** Lo que no está documentado en esta suite no existe. Enfoque secuencial para cerrar bucles jugables antes de escalar a la nube.

---

## RESUMEN DE CRONOGRAMA MAESTRO

```
+----------------------------------------------------------------------------------------------------+
| SPRINT 1: NÚCLEO TÁCTICO CANÓNICO & RESCATE WARSWORLD                           [COMPLETADO]      |
| - Spritesheets 16-bit, Canvas/Matriz 60 FPS, Combate canónico, A*, Niebla, Economía y 6 COs      |
+----------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+----------------------------------------------------------------------------------------------------+
| SPRINT 2: MOTOR DE INTELIGENCIA ARTIFICIAL TÁCTICA (BOTS PVE)                   [COMPLETADO]      |
| - TacticalBotAI con Utility Score, 3 niveles (Cadete, Comandante, General) y turnos autónomos     |
+----------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+----------------------------------------------------------------------------------------------------+
| SPRINT 3: MODOS DUALES, MAZO DE 10 CARTAS Y LIBERTAD ORGÁNICA (SOFT CAP)         [COMPLETADO]      |
| - Escaramuza Rápida vs Campaña, Mazo 10 cartas, CERO Cooldowns y Soft Cap de 14 tropas              |
+----------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+----------------------------------------------------------------------------------------------------+
| SPRINT 4: BARK ENGINE EN CÓMIC, VIÑETAS REACTIVAS & TELEMETRÍA DE TILT           [EN CURSO]        |
| - WebSockets, Matchmaking por ritmo (PTE), Reloj Anti-AFK, 2v2 turnos cruzados y Chat/DM con Mute  |
+----------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+----------------------------------------------------------------------------------------------------+
| SPRINT 5: METAGAME DE COFRES, DUPLICADOS (+2.5%/LVL) Y CAP NIVEL 11             [SPRINT 7 - 8]    |
| - 4 ranuras de cofres (3h, 8h, 12h), subida de nivel por duplicados, Nivel 11 Torneo y Stripe      |
+----------------------------------------------------------------------------------------------------+
                                                 |
                                                 v
+----------------------------------------------------------------------------------------------------+
| SPRINT 6: AUDITORÍA RLS, OPTIMIZACIÓN EN VERCEL & RELEASE 1.0 PRODUCCIÓN        [SPRINT 9 - 10]   |
| - Pruebas de carga, atlas WebP en CDN, auditoría anti-trampas y lanzamiento oficial                |
+----------------------------------------------------------------------------------------------------+
```

---

## SPRINT 1: NÚCLEO TÁCTICO CANÓNICO & RESCATE WARSWORLD [COMPLETADO - 100%]

### 1. Objetivo Principal
Rescatar y modernizar todos los activos, atlas gráficos y lógica táctica de *WarsWorld*, fusionándolos con el motor determinista de *Advance Wars 2 / AWBW* y la arquitectura modular moderna de *Tactical Command*, validado por una suite de 45 pruebas canónicas automatizadas.

### 2. Lista de Tareas Técnicas (Checklist)
- [x] **Inyección Gráfica 16-bit:** Indexación de atlas de spritesheets (`orange-star`, `blue-moon`, `neutral`, `icons`, `arrow`, cursores y fuentes bitmap) en `public/assets/`.
- [x] **Renderizado Gráfico Dual:** Pipeline dual conmutando entre HTML5 Canvas 60 FPS acelerado y Matriz de Baja Latencia.
- [x] **Locomoción y Pathfinding A\*:** Algoritmo A* con costes de terreno heterogéneos para 6 tracciones (`foot`, `mech`, `wheels`, `treads`, `air`, `sea`) y clima.
- [x] **Matriz de Combate Canónica:** Cálculo exacto de daño primario/secundario con reducción proporcional por estrellas de terreno y contraataque.
- [x] **Importador de Mapas Comunitarios AWBW:** Parser de matrices de texto raw (IDs 1-194) con auto-padding y biblioteca de 6 mapas oficiales.
- [x] **Niebla de Guerra Dinámica & Emboscadas:** Ocultación en bosques/arrecifes, elevación de montaña (+3 visión) y detección forzosa de emboscadas TRAP.
- [x] **Ciclo de Turnos, Economía y Captura:** Cobro de +1.000G por sede, reparaciones en bases (+2 HP proporcional), captura de 20 HP y victoria por HQ.
- [x] **Comandantes (COs) & Medidores de Poder:** 6 Comandantes canónicos (Andy, Sami, Max, Colin, Grit, Sonja) con medidor 9.000G/estrella, COP y SCOP.
- [x] **Suite de Pruebas Automatizadas:** 45 pruebas canónicas automatizadas pasando al 100% (45/45 PASSED) en el panel Lead QA.

### 3. Criterios de Aceptación (Definition of Done)
1. El motor ejecuta partidas completas de dos jugadores alternando turnos y calculando movimientos, combates, capturas y poderes sin errores.
2. La suite de pruebas canónicas en el navegador ejecuta los 45 tests de reglas oficiales arrojando 100% de éxito.
3. El canvas mantiene 60 FPS estables con texturas de spritesheets nativas de 16-bit.

---

## SPRINT 2: MOTOR DE INTELIGENCIA ARTIFICIAL TÁCTICA (BOTS PVE) [COMPLETADO - 100%]

### 1. Objetivo Principal
Implementar el motor de inteligencia artificial autónomo (`TacticalBotAI`) y el orquestador desacoplado (`AutonomousTurnOrchestrator`) para dotar a *Tactical Command* de un modo individual offline/PvE completo, con función de evaluación de utilidad matemática, 3 niveles de sofisticación táctica (Cadete, Comandante y General), ejecución asíncrona de turnos con feedback en HUD, selector de formatos (Blitz Skirmish vs Grand Campaign) y suite de pruebas de estrés automatizadas (5 partidas headless, 0 deadlocks).

### 2. Lista de Tareas Técnicas (Checklist)
- [x] **Módulo Heurístico de Utilidad (`TacticalBotAI`):**
  - Función de evaluación ponderada: $\text{UtilityScore} = \text{Score}_{\text{Captura}} + \text{Score}_{\text{Combate}} + \text{Score}_{\text{Posición}} + \text{Score}_{\text{Producción}}$.
  - Priorización de captura de HQ (9.000 pts) y ciudades (1.500-3.500 pts) sobre desplazamientos erráticos.
- [x] **Implementación de los 3 Niveles de Dificultad:**
  - **Cadete (Fácil):** Avance directo hacia el enemigo, sin ponderar estrellas de terreno defensivo, compras básicas de infantería/tanques ligeros.
  - **Comandante (Normal):** Ponderación de ventajas armamentísticas (Antiaéreo contra B-Copter, Tanque contra Recon), protección de artillería indirecta y estrangulamiento económico.
  - **General (Difícil):** Evasión activa del contraataque letal, ponderación estricta de estrellas defensivas (80 pts/estrella) y concentración de fuego sobre tropas debilitadas.
- [x] **Bucle Secuencial de Turno Autónomo (`AutonomousTurnOrchestrator` & `App.tsx`):**
  - Ejecución fluida de órdenes: 1. Producción en fábricas $\rightarrow$ 2. Desplazamientos $\rightarrow$ 3. Ataques/Capturas $\rightarrow$ 4. Fin de turno.
  - Pausas tácticas de 400-450 ms entre acciones para legibilidad humana sin bloquear la interfaz.
  - Banner en HUD con indicación dinámica de la maniobra del Bot en tiempo real.
- [x] **Selector de Dificultad y Formato en UI:** Selector integrado en el panel de control del simulador para conmutar entre Hotseat (2P) y Partida vs Bot con selector de nivel (Cadete, Comandante, General) y selector de formato (Blitz Skirmish vs Campaña).
- [x] **Suite de Pruebas de Estrés Headless:** 6 baterías con simulación masiva Bot vs Bot (5 partidas consecutivas, 75 turnos, <1ms cálculo por turno e invariantes 100% verificadas).

### 3. Criterios de Aceptación (Definition of Done)
1. Un jugador humano puede disputar una partida completa contra el Bot en cualquiera de los 3 niveles de dificultad sin intervención manual en el bando P2.
2. En dificultad Difícil, el Bot nunca estaciona voluntariamente una unidad vulnerable dentro del alcance letal de una artillería enemiga estacionaria.
3. La IA toma sus decisiones en menos de 500 ms por unidad sin degradar la tasa de 60 FPS de la interfaz.

---

## SPRINT 3: MODOS DUALES, MAZO DE 10 CARTAS Y LIBERTAD ORGÁNICA (SOFT CAP) [COMPLETADO - 100%]

### 1. Objetivo Principal
Implementar la arquitectura de Mazos de 10 Cartas, los modos duales reglamentarios (*Escaramuza Rápida* y *Campaña Táctica*) y la **Doctrina de Libertad Orgánica** (eliminación total de cooldowns artificiales y reemplazo del tope rígido por un Soft Cap logístico de 14 tropas con mantenimiento orgánico).

### 2. Lista de Tareas Técnicas (Checklist)
- [x] **Motor de Modos de Juego Diferenciados:**
  - **Escaramuza Rápida (Blitz Skirmish):** Temporizador de 30s/turno, economía $\times 2$ ($2,000G/propiedad), bono de +2.000G iniciales, límite de 15 turnos con desempate militar.
  - **Campaña Táctica (Grand Campaign):** Temporizador de 60s/turno, economía $\times 1$ ($1,000G/propiedad), límite de hasta 40 turnos.
- [x] **Validador y Gestor de Mazos de 10 Cartas (`DeckManager`):**
  - Ranuras obligatorias 1 y 2: Infantería Ligera y Mecanizados.
  - 8 Ranuras flexibles con validación taxonómica (mínimo 2 directas terrestres, mínimo 1 antiaéreo, máximo 2 super-pesadas).
  - 4 Arquetipos oficiales integrados: Doctrina Combinada, Blitzkrieg (Rush), Supremacía Aérea y Fortaleza y Asedio (Tortuga).
- [x] **Doctrina de Libertad Orgánica (CERO Cooldowns):**
  - Eliminación total de esperas de turnos: el jugador puede fabricar cualquier unidad de su mazo en fábricas compatibles si posee los fondos.
  - `ProductionModal.tsx` filtra exclusivamente las cartas del mazo activo del jugador.
- [x] **Sostenibilidad Militar y Soft Cap de Suministros:**
  - Umbral libre de 1 a 14 tropas vivas (mantenimiento = $0G).
  - A partir de la tropa 15: impuesto de abastecimiento logístico de -$200G/turno por tropa excedente, integrado en el orquestador y la economía.
- [x] **Suite de Pruebas Automatizadas de Mazos y Suministros:**
  - 11 pruebas unitarias pasando al 100% y 1,000 pruebas de estrés en `deckAndSupply.test.ts`.

### 3. Criterios de Aceptación (Definition of Done)
1. El jugador puede seleccionar su Mazo Táctico en el HUD y el modal de producción muestra exclusivamente las cartas del mazo compatibles con la instalación.
2. Un jugador con fondos suficientes puede desplegar múltiples unidades de alto nivel en el mismo turno sin sufrir bloqueos artificiales de enfriamiento.
3. Al superar las 14 tropas, el indicador de suministros del HUD y la economía descuentan automáticamente el impuesto logístico ($200G por tropa extra).

---

## SPRINT 4: BACKEND SUPABASE, AUTH & SISTEMA DE COFRES [SPRINT 7-8]

### 1. Objetivo Principal
Conectar la arquitectura de datos relacional de Supabase con autenticación en la nube, desplegar el ciclo de 4 ranuras de cofres con apertura por temporizador, la subida de nivel de cartas mediante duplicados con escalado moderado (+2.5%/lvl) y el Estándar Competitivo de Torneo (Nivel 11).

### 2. Lista de Tareas Técnicas (Checklist)
- [ ] **Autenticación & Perfiles en PostgreSQL:**
  - Login seguro con Magic Link y Google OAuth conectado a `public.profiles`.
  - Migraciones DDL completas con RLS activo para `profiles`, `user_cards`, `user_chest_slots` y `user_decks`.
- [ ] **Ciclo de 4 Ranuras de Cofres (`user_chest_slots`):**
  - Asignación automática de cofre al vencer en partida (Madera 3h, Hierro 8h, Blindado 12h).
  - Contador regresivo de apertura y desbloqueo instantáneo con Gemas de Mando.
- [ ] **Colección de Cartas Duplicadas & Subida de Nivel (`user_cards`):**
  - Acumulación de duplicados y mejora mediante Créditos de Batalla.
  - Aplicación estricta de la fórmula de escalado moderado: $\text{Stat Final} = \text{Stat Base} \times (1 + (\text{Nivel} - 1) \times 0.025)$.
- [ ] **Cap de Torneo en Nivel 11 (Tournament Standard):**
  - Paridad obligatoria de estadísticas en partidas clasificatorias y torneos (todas las cartas igualadas a Nivel 11).
- [ ] **Sistema de Comandantes & Command Pass con Reclamación Retroactiva:**
  - Trío F2P de Comandantes base (Vance, Stella, Volkov) y Comandantes exclusivos monetizados.
  - Pase de Batalla de 50 niveles con Vía Gratuita y Premium, y RPC `rpc_claim_retroactive_pass_rewards`.
- [ ] **Bark Engine Narrativo en Cómic & Telemetría Cruzada:**
  - Rastreador profundo de telemetría y perfil psicológico (`player_tactical_behavior_profile` y `match_detailed_telemetry`: tilt_index, paciencia, rachas, win rates, ritmo PTE, tropas predilectas).
  - Vínculo progresivo con Comandantes (`commander_bonding_progress`).
  - Viñeta reactiva de cómic en UI (`CommanderComicVignette`), bocadillos estilizados (`speech`, `shout`, `thought`, `radio`) y sellos de onomatopeyas Pop-Art (sin archivos de voz, 100% gráfico y textual).
- [ ] **Triggers de Nivel y Liquidación de Partidas:**
  - Función almacenada `award_match_rewards` y trigger `trg_process_level_up` evaluando $\lfloor 150 \times N^{1.85} \rfloor$.

### 3. Criterios de Aceptación (Definition of Done)
1. Un usuario nuevo se registra y recibe su armada inicial y ranuras de cofres vacías en la base de datos real.
2. Al ganar una partida, se abona XP, créditos, trofeos y un cofre se aloja en una ranura libre si hay espacio.
3. El Comandante activo muestra diálogos contextuales personalizados acordes a las rachas y hábitos del jugador tanto en el menú principal como en la cola de matchmaking.
4. Si un jugador desbloquea el Command Pass Premium en el nivel 30, todas las recompensas premium de los niveles 1 al 30 se acreditan de inmediato sin pérdidas.
3. En partidas de liga clasificatoria, el motor fuerza todas las unidades a nivel 11 independientemente del nivel casual del jugador.

---

## SPRINT 5: MULTIJUGADOR REALTIME, MATCHMAKING PTE, MODO 2v2 & CAPA SOCIAL [SPRINT 9-10]

### 1. Objetivo Principal
Transformar el juego en una experiencia multijugador online PvP competitiva y cooperativa mediante Supabase Realtime Channels (WebSockets), matchmaking por ritmo mental (PTE), reloj dinámico anti-AFK, modo 2v2 por turnos cruzados con pings tácticos y capa social completa con chat global y DMs con botón de pánico "Mute".

### 2. Lista de Tareas Técnicas (Checklist)
- [ ] **Canales Supabase Realtime & Sincronización:**
  - Suscripción al canal de sala `match:{roomCode}` con broadcast para cursores, pings y animaciones en vivo.
  - Replicación autoritativa `postgres_changes` para cambios de estado en `match_state`.
  - Edge Function `/api/match/dispatch-action` con validación estricta de turno, costes A*, niebla de guerra y cooldowns de cartas.
- [ ] **Algoritmo de Matchmaking por Ritmo de Juego (PTE):**
  - Cálculo de $PTE = \sum \text{TiempoUsado} / \text{TurnosJugados}$ en las últimas 10 partidas.
  - Clasificación de perfiles: Blitz ($\le 15$s), Estándar ($16-35$s) y Analítico ($36-60$s).
  - Cola de emparejamiento en 3 fases: Fase 1 (0-5s: Mismo modo, $\pm 100$ trofeos, mismo PTE) $\rightarrow$ Fase 2 (6-12s: $\pm 200$ trofeos, PTE adyacente) $\rightarrow$ Fase 3 (>12s: $\pm 300$ trofeos).
- [ ] **Reloj Dinámico Anti-AFK (Anti-Roping):**
  - Temporizador adaptativo: 30s en Blitz Skirmish y 60s en Grand Campaign.
  - Reducción al 50% de tiempo tras 1 turno inactivo, compresión a 10s en el segundo turno y Forfeit automático tras 3 turnos inactivos consecutivos.
- [ ] **Modo 2v2 por Turnos Cruzados:**
  - Secuencia de turnos estilo ajedrez 2v2: A1 $\rightarrow$ B1 $\rightarrow$ A2 $\rightarrow$ B2.
  - Fondos individuales por jugador basados en sus propias capturas y herramienta de Ping Táctico en mapa (`PING_TARGET`, `PING_DEFEND`, `PING_REGROUP`).
- [ ] **Capa Social y Moderación:**
  - Chat Global en Menú Principal por salas regionales, reclutamiento de Clanes y búsqueda de compañeros 2v2.
  - Chat de Alianza en 2v2 y Mensajería DM en partida con Quick Chat predeterminado y filtro anti-toxicidad en tiempo real.
  - Botón de Pánico "MUTE": Silencia de inmediato todos los mensajes y emotes del rival con un solo toque.

### 3. Criterios de Aceptación (Definition of Done)
1. Dos jugadores en dispositivos distintos interactúan en tiempo real con latencia menor a 150 ms en el modo seleccionado (Blitz o Campaña).
2. Si un cliente malicioso intenta alterar coordenadas, saltarse el cooldown o mover tropas ajenas, el servidor rechaza la acción con error HTTP 400 y revierte el estado local.
3. Si un jugador abandona o pasa 3 turnos consecutivos inactivo, el sistema Anti-AFK decreta Forfeit y otorga la victoria completa al rival.

---

## SPRINT 6: AUDITORÍA RLS, OPTIMIZACIÓN EN VERCEL Y RELEASE 1.0

### 1. Objetivo Principal
Ejecutar el hardening de seguridad integral, optimizar el rendimiento de la red y assets para el despliegue global en Vercel Edge Network, y realizar pruebas de carga para el lanzamiento de la versión 1.0 a producción.

### 2. Lista de Tareas Técnicas (Checklist)
- [ ] **Auditoría de Seguridad RLS:**
  - Verificación de que ninguna tabla permita lecturas o escrituras públicas no autorizadas.
  - Pruebas de penetración simuladas para comprobar que un jugador no pueda leer el `match_state` de partidas en las que no participa.
- [ ] **Optimización de Assets en Vercel CDN:**
  - Empaquetado final de texturas y sprites en formato WebP con compresión sin pérdidas.
  - Configuración de cabeceras de respuesta `Cache-Control: public, max-age=31536000, immutable` para todos los assets estáticos.
  - Compresión Brotli y optimización de bundle JS (eliminación de librerías no utilizadas).
- [ ] **Pruebas de Carga y Resiliencia:**
  - Simulación de 500 partidas simultáneas conectadas a Supabase Realtime para verificar el uso de conexiones del pool de PostgreSQL (pgBouncer/Supavisor).
  - Manejo de reconexiones en redes móviles con latencia inestable o pérdidas momentáneas de paquete.
- [ ] **Monitoreo y Telemetría:**
  - Integración de Sentry para captura de errores en el cliente y en Edge Functions.
  - Activación de Vercel Analytics y Web Vitals (LCP < 1.2s, FID < 50ms, CLS = 0).
- [ ] **Despliegue a Producción:** Configuración de dominio personalizado, certificados SSL y verificación final de la build de producción.

### 3. Criterios de Aceptación (Definition of Done)
1. La auditoría de Supabase Security Advisor muestra 0 vulnerabilidades en políticas RLS.
2. El First Contentful Paint (FCP) en producción es menor a 1.0 segundo en escritorio y menor a 1.5 segundos en 4G móvil.
3. Todas las pruebas automatizadas de integración pasan exitosamente (100% pass rate).
4. El juego se despliega en producción en Vercel y se encuentra completamente operativo para registros públicos y partidas competitivas.

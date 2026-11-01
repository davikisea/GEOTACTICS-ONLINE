# PLAN DE RODAJE Y FASES DE DESARROLLO (PROJECT ROADMAP ACTUALIZADO)
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 2.0.0-HYBRID-SPEC  
**Metodología:** Agile / Sprints Quincenales  
**Arquitectura:** Fusión de los **3 Pilares Maestros**: Motor Táctico Canónico (*Advance Wars GBA*), Metajuego de Mazos de 10 Cartas, Cofres y PTE (*Clash Royale*), y el *Bark Engine en Viñetas de Cómic* (inspirado en la narrativa de *Hades*).  
**Documento de Auditoría y Estado Real:** Ver [14_REALISTIC_PROJECT_ROADMAP_AND_STATUS.md](file:///c:/Users/morin/TacticalCommand/docs/14_REALISTIC_PROJECT_ROADMAP_AND_STATUS.md) para el diagnóstico forense del estado real del código (`v0.1.5-PROTOTYPE`, ~16.5% completado) frente a la especificación total.

---

## 1. CRONOGRAMA DE FASES Y ENTREGABLES

```
+---------------------------------------------------------------------------------------+
| FASE 1: NÚCLEO TÁCTICO CANÓNICO & RESCATE WARSWORLD                    [COMPLETADO]   |
| • Inyección gráfica de spritesheets 16-bit y renderizado dual Canvas/Matriz           |
| • Fórmulas canónicas de combate (primarias/secundarias, defensa de terreno)           |
| • Pathfinding A* con costes de terreno, tracción y clima                              |
| • Importador comunitario AWBW (IDs 1-194) y biblioteca de 6 mapas oficiales           |
| • Niebla de Guerra dinámica, elevación +3 y detección de emboscadas TRAP              |
| • Flujo de turnos, economía (+1000G), reparación (+2 HP) y captura (20 HP)            |
| • 6 Comandantes (COs), medidor de estrellas (9000G) y poderes COP/SCOP                |
| • Suite de DevOps y Lead QA automatizada con 45 pruebas (45/45 PASSED)                |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| FASE 2: INTELIGENCIA ARTIFICIAL TÁCTICA (BOTS PVE)                     [EN CURSO]     |
| • Motor de IA para juego individual autónomo (TacticalBotAI)                          |
| • Heurística de Evaluación de Utilidad (Utility Score: Captura > Combate > Posición)  |
| • 3 Niveles de Dificultad: Cadete (Fácil), Comandante (Normal) y General (Difícil)    |
| • Automatización del turno rival (P2) con animaciones secuenciales y pausas           |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| FASE 3: MODOS DUALES Y MAZO DE 10 CARTAS CON COOLDOWNS                 [SIGUIENTE]    |
| • Modo Escaramuza Rápida (10-20 min, 30s/turno, x2 economía, mapas 12x12 a 16x16)     |
| • Modo Campaña Táctica (40-60 min, 60s/turno, x1 economía, mapas 24x24 a 32x32)       |
| • Constructor de Mazos de 10 Cartas (2 Obligatorias de Infantería + 8 Flexibles)      |
| • Sistema de Enfriamiento (Cooldown de Despliegue) por categoría en fábricas          |
| • Límite técnico de 15 unidades simultáneas por bando en mapa                         |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| FASE 4: BACKEND SUPABASE, COFRES & BARK ENGINE CONTEXTUAL              [SPRINT 7-8]   |
| • Autenticación Auth (Email Magic Link / Google OAuth) con perfiles en PostgreSQL     |
| • Ciclo de 4 Ranuras de Cofres (Madera 3h, Hierro 8h, Blindado 12h) y desbloqueo      |
| • Colección de Cartas (user_cards), duplicados y subida de nivel (+2.5% por nivel)   |
| • Nivel 11 Estándar de Torneo (Tournament Cap) para juego competitivo equilibrado    |
| • Bark Engine en Cómic: Telemetría cruzada profunda, perfil de tilt y viñetas en cómic|
| • Trío F2P de Comandantes base: Capitán Vance, Mayor Stella y Comandante Volkov       |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| FASE 5: MULTIJUGADOR REALTIME, MODO 2v2 & CAPA SOCIAL                  [SPRINT 9-10]  |
| • Canales Realtime de Supabase (WebSockets, Broadcast y Postgres Changes)             |
| • Algoritmo de Matchmaking por Ritmo de Juego (PTE: Blitz, Estándar, Analítico)       |
| • Reloj Dinámico Anti-AFK (50% tiempo en T1, 10s en T2, Forfeit en T3)                |
| • Modo Cooperativo 2v2 por turnos cruzados (A1 -> B1 -> A2 -> B2) y Ping Táctico      |
| • Capa Social: Chat Global, Clanes y Mensajes DM en partida con botón "Mute"          |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
| FASE 6: MONETIZACIÓN ÉTICA (COMMAND PASS RETROACTIVO) & RELEASE 1.0    [SPRINT 11-12] |
| • Stripe Checkout para paquetes de Gemas y Command Pass de 50 niveles                 |
| • Reclamación Retroactiva de recompensas acumuladas en el pase de batalla             |
| • Comandantes exclusivos cosméticos, packs de bocadillos de cómic y sellos (Cero P2W) |
| • Optimización de spritesheet WebP y caché en Vercel Edge CDN                         |
| • Auditoría final de carga y lanzamiento en dominio personalizado                     |
+---------------------------------------------------------------------------------------+
```

---

## 2. DETALLE DE TAREAS POR FASE (TASK BREAKDOWN)

### FASE 1: Núcleo Táctico Canónico & Rescate WarsWorld [COMPLETADO - 100%]
- [x] **Inyección Gráfica 16-bit:** Atlas de texturas PNG y JSON para facciones Orange Star, Blue Moon, Neutral e Icons.
- [x] **Renderizado Gráfico Dual:** Conmutación fluida entre Canvas HTML5 a 60 FPS y Matriz de Baja Latencia.
- [x] **Pathfinding A\*:** Cálculo de costes de terreno heterogéneos para 6 tipos de tracción (`foot`, `mech`, `wheels`, `treads`, `air`, `sea`) y clima.
- [x] **Matriz de Combate Canónica:** Cálculo exacto de daño con armas primarias y secundarias, cobertura defensiva y contraataques.
- [x] **Importador de Mapas AWBW:** Mapeo de IDs 1-194, 6 mapas oficiales integrados y parseo en vivo de texto raw con auto-padding.
- [x] **Niebla de Guerra & Emboscadas:** Elevación en montaña (+3 visión), cobertura en bosques/arrecifes, visión perimétrica y trampas TRAP.
- [x] **Economía, Turnos & Captura:** +1.000G por propiedad/turno, reparaciones en sedes (+2 HP proporcional), captura de 20 HP y toma de HQ.
- [x] **Comandantes (COs) & Superpoderes:** 6 comandantes canónicos (Andy, Sami, Max, Colin, Grit, Sonja) con medidor 9.000G/estrella, COP y SCOP.
- [x] **Suite de Pruebas Automatizadas:** 45 pruebas canónicas automatizadas integradas en el panel Lead QA (45/45 PASSED).

### FASE 2: Inteligencia Artificial Táctica (Bots PvE) [EN CURSO]
- [ ] **Módulo Heurístico de Utilidad (`TacticalBotAI`):** Evaluación matemática de acciones ponderadas: Captura de Sedes > Combate Favorable > Posicionamiento Defensivo > Producción en Fábrica.
- [ ] **3 Niveles de Dificultad:**
  - **Cadete (Fácil):** Avance directo, sin cálculo de coberturas, compras básicas de infantería/tanques ligeros.
  - **Comandante (Normal):** Captura prioritaria para asfixia económica, protección de artillería indirecta y balance de armas.
  - **General (Difícil):** Evasión de rangos de amenaza enemiga, emboscadas en bosques con niebla y ahorro estratégico para blindados pesados.
- [ ] **Automatización del Turno Rival (P2):** Ejecución secuencial de órdenes con pausas tácticas y animaciones fluidas sin congelar el hilo principal.
- [ ] **Selector de Modo Solitario en UI:** Selector de dificultad en el panel de control del simulador para partidas PvE inmediatas.

### FASE 3: Modos Duales y Mazo de 10 Cartas con Cooldowns [SIGUIENTE]
- [ ] **Modo Escaramuza Rápida (Blitz Skirmish):** Mapas $12 \times 12$ a $16 \times 16$, temporizador de 30s/turno, economía $\times 2$ ($2,000G/propiedad), cooldowns al 50%, límite de 12-15 turnos y desempate por valor militar.
- [ ] **Modo Campaña Táctica (Grand Campaign):** Mapas $24 \times 24$ a $32 \times 32$, temporizador de 60s/turno, economía $\times 1$ ($1,000G/propiedad), cooldowns completos, límite de hasta 40 turnos.
- [ ] **Constructor de Mazos de 10 Cartas (`DeckBuilder`):**
  - Ranuras obligatorias 1 y 2: Infantería Ligera y Mecanizados (Cooldown permanente = 0 turnos).
  - 8 Ranuras flexibles: Validación de taxonomía (mínimo 2 directas terrestres, mínimo 1 antiaéreo, máximo 2 super-pesadas).
- [ ] **Gestor de Enfriamiento en Fábricas (`DeploymentCooldownManager`):** Recarga de cartas por turno en fábricas y validación del límite de 15 unidades simultáneas por bando.

### FASE 4: Backend Supabase & Progresión de Cofres [SPRINT 7-8]
- [ ] **Autenticación en la Nube:** Login seguro con Magic Link y Google OAuth conectado a `public.profiles`.
- [ ] **Ciclo de 4 Ranuras de Cofres (`user_chest_slots`):** Cofre de Madera (3h), Hierro (8h) y Blindado (12h) con apertura por temporizador o Gemas de Mando.
- [ ] **Colección de Cartas & Subida de Nivel (`user_cards`):** Sistema de duplicados con escalado moderado de $+2.5\%$ de estadísticas por nivel ($\text{Stat Base} \times (1 + (\text{Nivel} - 1) \times 0.025)$).
- [ ] **Estándar Competitivo Nivel 11 (Tournament Cap):** Nivelación automática de cartas al Nivel 11 en partidas clasificatorias y torneos.

### FASE 5: Multijugador Realtime, Modo 2v2 & Capa Social [SPRINT 9-10]
- [ ] **Canales WebSockets Supabase Realtime:** Canales `broadcast` para animaciones y `postgres_changes` para sincronización de estado.
- [ ] **Matchmaking por Ritmo de Juego (PTE):** Emparejamiento por Trofeos y Promedio de Tiempo de Espera (Blitz $\le 15$s, Estándar $16-35$s, Analítico $36-60$s) con expansión progresiva en 3 fases.
- [ ] **Reloj Dinámico Anti-AFK:** Reducción al 50% de tiempo en primer turno inactivo, 10s en segundo turno y AFK Forfeit al tercer turno consecutivo.
- [ ] **Modo 2v2 por Turnos Cruzados:** Secuencia A1 $\rightarrow$ B1 $\rightarrow$ A2 $\rightarrow$ B2, economía individual de fondos por jugador y herramienta de Ping Táctico en mapa.
- [ ] **Capa Social y Moderación:** Chat Global por salas regionales, sistema de Clanes, Mensajes DM en partida con Quick Chat y botón de pánico "Mute".

### FASE 6: Despliegue en Vercel, Monetización Ética & Release 1.0 [SPRINT 11-12]
- [ ] **Stripe Checkout API:** Compra de paquetes de Gemas de Mando y Pase de Batalla de Temporada (100% cosmético, cero Pay-to-Win).
- [ ] **Webhooks Idempotentes en Edge Functions:** Acreditación segura de compras con validación de firmas criptográficas.
- [ ] **Optimización de Assets en Edge CDN:** Spritesheet unificado WebP y cabeceras de caché inmutables en Vercel.
- [ ] **Pruebas de Carga & Lanzamiento Global:** Auditoría de 1,000 conexiones concurrentes y despliegue final en producción.

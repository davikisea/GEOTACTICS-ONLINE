# VOLUMEN 7: PLAN MAESTRO DE EJECUCIÓN, SPRINTS Y ROADMAP UNIFICADO
**Documento Canónico Unificado:** `07_MASTER_PROJECT_ROADMAP_AND_SPRINTS.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 4.0.0-DEFINITIVE-MASTER-SPEC  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Archivos Consolidados y Reemplazados:**  
- `06_PROJECT_ROADMAP.md` (Completo)  
- `10_DEFINITIVE_SPRINT_EXECUTION_PLAN.md` (Completo)  
- `14_REALISTIC_PROJECT_ROADMAP_AND_STATUS.md` (Completo)  
- Listas de tareas y checklists de integración de `15, 16, 17, 18, 19, 20, 21`  

---

# 1. AUDITORÍA DEL ESTADO REAL DEL PROYECTO Y DEUDA TÉCNICA

A la fecha de corte, el proyecto presenta el siguiente desglose de avance real:

```
                            ESTADO DE AVANCE DEL PROYECTO
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         ▼                                ▼                                ▼
[ COMPLETADO: SPRINTS 1 A 7 (100%) ]  [ FASE ACTUAL: SPRINT 8 ]       [ PLANIFICADO: S9 Y POST-PRODUCCIÓN ]
 • Motor Táctico Determinista (AW)    • Consolidación Realtime en UI  • Hardening Final RLS y Rate-Limiting
 • Matriz Canónica de Daño & A*       • Arnés de Pruebas Integrado    • Core Web Vitals en Móvil (<1.2s)
 • Renderizador Canvas 2D 60 FPS      • Calibración Balance Final     • Optimización Texcel-Studio
 • Bark Engine Cómic en React         • Optimización Bundle Vercel    • Reemplazo a Arte 100% Original
 • Duelo Espejo, Blitz y Campaña                                      • Release Esports Competitivo
 • AirDrops Equidistantes & Requeue 5s
 • Tactical Studio Editor (Dev Tool)
 • Complejo Industrial (10 Parcelas)
 • Mercado P2P & Banco Central NPC
 • Clanes, Embargo y Salvaguarda
 • Ladder Asimétrico, Near-Miss & Tilt
```

### 1.1 Deuda Técnica Identificada y Resuelta
1. **Fragmentación Documental:** Resuelta mediante la consolidación de archivos dispersos en los Volúmenes Maestros Canónicos y propuestas calibradas.
2. **Evolución y Blindaje de Base de Datos:** Resuelta al 100% mediante las **Migraciones Maestras 12, 13 y 14**:
   - *Migración 12:* Expansión DDL consolidada, esquemas de telemetría, AirDrops, P2P y Tilt.
   - *Migración 13:* Despliegue de las 10 Parcelas Territoriales (`user_industrial_plots`), Cargamento Varado (`user_stranded_cargo`), ciclo circadiano de 16h y liquidador autónomo del Banco Central NPC (`fulfill_stale_p2p_orders`).
   - *Migración 14:* Tabla unificada `matchmaking_queue` para los tres modos, conciliación aditiva de `currency_ledger` con materiales industriales, `user_chest_slots` con anti-speedhack, `user_cosmetics` tipado y motor de trofeos Elo con Factor K dinámico, Escudo de Descenso y Season Reset cada 28 días.
3. **Tipado Estricto de Datos:** Resuelto mediante la actualización completa de `src/types/database.types.ts` cubriendo todas las entidades relacionales del ecosistema.
4. **Bark Engine Cómic y Suministros Dinámicos (AirDrops):** Resuelto y certificado al 100% con `barkEngine.ts`, `ComicVignetteOverlay.tsx`, `airdropSystem.ts`, renderizado de baliza en `GameCanvas.tsx`, temporizador de 15s en el HUD de `App.tsx` y botón `Revancha Exprés (5s)`.

---

# 2. PLAN MAESTRO DE SPRINTS RECALIBRADO (SPRINTS 1 AL 8)

### SPRINT 1: MOTOR TÁCTICO DETERMINISTA Y CANVAS BASE
* **Estado:** **100% COMPLETADO Y CERTIFICADO**
* **Entregables:**
  - Máquina de estados desacoplada en TypeScript puro (`TurnManager`, `CombatCalculator`, `MovementPathfinder`).
  - Renderizador Canvas 2D con soporte de OffscreenCanvas y escala pixel-art nítida.
  - Implementación matemática de las tablas oficiales atacante/defensor de *Advance Wars*.

---

### SPRINT 2: NETWORKING REALTIME, BOT IA Y ESCARAMUZAS BLITZ
* **Estado:** **80% COMPLETADO (Capa de Red en UI Activa)**
* **Avance:**
  - [x] Árbol de decisiones heurísticas del Bot IA en dificultades Cadete, Comandante y General (`aiBot.ts`).
  - [x] Temporizadores de turno y formato Blitz Skirmish (30s) / Campaña (60s) en orquestador (`autonomousOrchestrator.ts`).
  - [x] Cliente WebSocket y protocolo de mensajes Realtime en TypeScript (`realtime.ts`).
  - [ ] Conectar salas de juego en tiempo real (`match_board`) directamente en la interfaz React de `App.tsx`.

---

### SPRINT 3: DUELO TÁCTICO ESPEJO (15s), AIRDROPS Y BARK ENGINE CÓMIC
* **Estado:** **100% COMPLETADO Y CERTIFICADO**
* **Entregables:**
  - [x] **DB:** Desplegar tabla `mirror_duel_queue` y función RPC `join_mirror_duel_queue()` con `SKIP LOCKED` (Migración 12).
  - [x] **DB:** Tabla `match_airdrop_events` y función atómica `claim_airdrop()` con verificación estricta de casilla (Migración 12).
  - [x] **DB:** Catálogo `bark_dialogue_templates`, sembrado masivo de barks y RPC `rpc_get_contextual_bark()` (Migración 12).
  - [x] **Engine:** Motor de AirDrops `airdropSystem.ts` con cálculo de celda equidistante Manhattan ($|D_1 - D_2| \le 1$) y purga en 2 turnos.
  - [x] **Canvas:** Renderizado de baliza pulsante, paracaídas retro crema/naranja óxido y caja blindada en `GameCanvas.tsx`.
  - [x] **UI & Gameplay:** Temporizador de 15s en vivo con alerta $\le 5$s, árbitro anti-AFK y mapa simétrico `mirror_arena_10x10` en `App.tsx`.
  - [x] **Post-Combat:** Botón de `Revancha Exprés (5s)` con reinicio atómico en `MatchSummaryModal.tsx`.
  - [x] **Bark Engine UI:** Componente `ComicVignetteOverlay.tsx` con viñetas retro-futuristas, 5 siluetas de bocadillos y sellos Pop-Art integrado reactivamente en combate.
  - [x] **QA & Tests:** Suite unitaria `airdropSystem.test.ts` y Paso 8 en `e2eIntegration.test.ts`.

---

### SPRINT 4: TACTICAL STUDIO EDITOR (UNIDADES, COMANDANTES Y MAPAS)
* **Estado:** **100% COMPLETADO Y OPERATIVO COMO HERRAMIENTA INTERNA DEV**
* **Objetivo:** Herramienta interna de desarrollo estético y funcional para crear y calibrar activos 100% originales bajo la skill [`retro-futurism`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/agents/skills/retro-futurism/skill.md). Desacoplada de la interfaz del usuario final.
* **Entregables:**
  - [x] **Módulo 1: Map Builder (`MapBuilder.tsx`):** Diseñador interactivo con pincel de baldosas (17 tipos), herramienta de simetría asistida rotacional $180^\circ$ para mapas de Duelo Espejo, mapa de calor de AirDrops y exportador/importador JSON/AWBW.
  - [x] **Módulo 2: Unit Sprite Studio (`SpriteStudio.tsx`):** Lienzo de previsualización pixel-art con zoom ($2\times$ a $8\times$), control de fotogramas (FPS), calibrador de colisión y remapeador Orange Star / Blue Moon.
  - [x] **Módulo 3: Commander & Bark Studio (`CommanderBarkStudio.tsx`):** Diseñador de retratos, probador de 5 siluetas de bocadillos y sellos Pop-Art con consola de simulación de triggers e interpolación de camaradería.
  - [x] **Pruebas de Simetría:** Suite `mapBuilder.test.ts`.

---

### SPRINT 5: COMPLEJO INDUSTRIAL MILITAR, REFINADO Y MERCADO P2P
* **Estado:** **100% COMPLETADO Y CERTIFICADO**
* **Entregables:**
  - [x] **DB:** Desplegar tablas `user_industrial_inventory`, `industrial_refining_jobs` y `p2p_market_listings` (Migración 12).
  - [x] **DB:** RPC `harvest_industrial_resources()` con cálculo de merma de 10 horas (carcoma logística) (Migración 12).
  - [x] **DB:** RPC `execute_p2p_purchase()` con impuesto municipal del 12% a quema y libro mayor `currency_ledger` (Migración 12).
  - [x] **Engine:** Motor industrial `industrialEngine.ts` con cálculo estricto de silos, merma del 2.5%/h tras 10h, aceleración con combustible (50% tiempo) y bandas de precio P2P ($\pm 35\%$ PMM).
  - [x] **UI Complejo Industrial:** Vista atompunk `IndustrialComplexView.tsx` con monitoreo de silos, 3 líneas de fundición y selector de doctrinas (Vulcano, Aegis, Titán).
  - [x] **UI Mercado P2P:** Vista `P2PMarketplaceView.tsx` con libro de órdenes global, modal de publicación con cálculo de tasa del 12% a quema y compraventa atómica.
  - [x] **QA & Tests:** Suite unitaria `industrialEngine.test.ts` y Paso 9 en `e2eIntegration.test.ts`.

---

### SPRINT 6: CORPORACIONES MILITARES, EMBARGO POR DESHONOR Y SALVAGUARDA
* **Estado:** **100% COMPLETADO Y CERTIFICADO**
* **Entregables:**
  - [x] **DB:** Tablas `clans`, `clan_members`, `safeguard_crafting_jobs` y RPC `pay_dishonor_embargo_fee()` (Migración 12).
  - [x] **DB:** Aislamiento estricto de seguridad RLS en canales de chat y tabla de moderación (Migración 12).
  - [x] **Engine:** Motor de Clanes y Salvaguarda `clanSystem.ts` con auditoría de 24h, reparto aristocrático (50% tesoro, 50% Top 3: 50/30/20) y fórmula de racha ($1.0\times$ a $2.0\times$).
  - [x] **UI Cuartel y Bóveda T1-T3:** Componente retro-futurista `ClanHeadquartersView.tsx` con escalafón de bóveda, cuadro de honor militar y modal de pago de fianza de deshonor.
  - [x] **Gameplay/UI:** Conmutador del *Protocolo de Salvaguarda Táctica* en vivo, medidor de racha y taller de manufactura F2P (5,000G, 50 acero, 20 microchips).
  - [x] **Integración:** Integrado en navegación global `[🛡️ Corporación]` y procesador post-partida en `App.tsx`.
  - [x] **QA & Tests:** Suite unitaria `clanSystem.test.ts` y Paso 10 en `e2eIntegration.test.ts`.

---

### SPRINT 7: LADDER ASIMÉTRICO (N1-N15), NEAR-MISS Y MONETIZACIÓN REACTIVA
* **Estado:** **100% COMPLETADO Y CERTIFICADO**
* **Entregables:**
  - [x] **DB:** Registro de diagnóstico balístico `near_miss_data` y RPC `process_post_match_near_miss()` (Migración 12).
  - [x] **DB:** Tabla `tilt_emergency_offers` y RPC `evaluate_match_tilt_and_offer()` en 180s por \$0.99 (Migración 12).
  - [x] **Engine:** Motor de Ladder Asimétrico y Near-Miss `asymmetricLadderEngine.ts` con escalado $+2.0\%$ por nivel hasta Nivel 15, Tournament Cap a Nivel 11 y filtro APL $\le 1.5$.
  - [x] **UI Near-Miss:** Modal de análisis balístico `NearMissAnalysisModal.tsx` con informe contrafáctico a Nivel 11 y redirección contextual a Mercado P2P e Industria.
  - [x] **UI Oferta Flash por Tilt:** Modal de urgencia `TiltEmergencyOfferModal.tsx` con cronómetro regresivo de 180s, viñeta del Alto Mando y adquisición inmediata por \$0.99.
  - [x] **Integración:** Selector de modo en cabecera `[🏆 Torneo: Cap N11]` vs `[⚡ Ladder: N1-N15]` y evaluación automática post-derrota en `App.tsx`.
  - [x] **QA & Tests:** Suite unitaria `asymmetricLadderEngine.test.ts` y Paso 11 en `e2eIntegration.test.ts`.

---

### SPRINT 8: ESTABILIDAD INTEGRAL DEL SISTEMA, ARNÉS DE PRUEBAS Y VALIDACIÓN DE DESPLIEGUE
* **Estado:** **FASE ACTUAL / ENFOQUE PRIORITARIO DE DESARROLLO**
* **Directiva:** Priorizar la estabilidad técnica, la robustez del bucle de juego, la preparación del arnés de pruebas para validación del usuario y el despliegue en Vercel + Supabase. El reemplazo de arte se posterga estrictamente a la fase de post-producción.
* **Hitos Recientes Completados (Refactorización Estructural Aprobada):**
  - [x] **Purga de Código Huérfano:** Eliminación definitiva de `CombatEngine.ts` y `TacticalPathfinder.ts`; redirección al motor canónico.
  - [x] **Persistencia de Transportes:** Sincronización de `loadedUnitIds` y `isLoadedInsideId` en estado y Canvas para blindar desconexiones y recargas.
  - [x] **Bucle de Progresión Offline:** Gobernanza anti-granjas con Soft Cap decreciente en 4 tramos $\mu(k) = [0.60, 0.30, 0.10, 0.02]$, suelo inviolable $\ge +5\text{ XP}$ y $\ge +10\text{ Créditos}$, y bifurcación `elo_rating_esports` (Migración 21 y `autonomousOrchestrator.ts`).
  - [x] **IA Nivel Ajedrez (`chess`):** Toma de decisiones heurística con ratio financiero de intercambio, aversión extrema al contragolpe (-140) y contra-producción determinista en fábricas.
  - [x] **Normalización Económica:** Nomenclatura unificada en TypeScript, Base de Datos y Docs (`funds`, `battleCredits`, `commandGems`).
  - [x] **Sincronización Realtime WebSocket y Snapshots:** Hook unificado `useMatchSync.ts`, persistencia de `match_turn_snapshots` y `match_action_deltas` con rehidratación atómica `rpc_reconnect_match_state` (Migración 22).
  - [x] **Catálogo Fabril Completo:** Integración de APC, Neotank, T-Copter y Missiles en `turnEconomy.ts`, `ProductionModal.tsx` y `canonicalDamageChart.ts`.
  - [x] **Optimización de Bundles:** Partición en `vite.config.ts` (`vendor-react`, `vendor-supabase`, `vendor-lucide`, `engine-core`) con compatibilidad Windows/POSIX y Content Security Policy dual en `vercel.json`.

---

### SPRINT 9: AUDITORÍA DE RENDIMIENTO CORE WEB VITALS Y HARDENING DE SEGURIDAD RLS
* **Estado:** **PLANIFICADO / PRE-PRODUCCIÓN**
* **Tareas:**
  - [ ] Auditoría de Core Web Vitals en dispositivos móviles (LCP $< 1.2$s, CLS $= 0$, 60 FPS sostenidos en Canvas).
  - [ ] Verificación estricta de políticas Row Level Security (RLS) en todas las tablas transaccionales de Supabase.
  - [ ] Certificación de límites de rate-limiting y manejo de reconexiones en Edge.

---

### FASE DE POST-PRODUCCIÓN: OPTIMIZACIÓN DEL EDITOR (TEXCEL-STUDIO) Y REEMPLAZO A ARTE 100% ORIGINAL
* **Estado:** **POST-PRODUCCIÓN / POST-DESPLIEGUE (DESACASI-FINAL)**
* **Directiva Canónica:** Esta fase se ejecutará únicamente una vez que el sistema esté completamente estable, probado y desplegado en producción.
* **Tareas:**
  - [ ] Optimización y reescritura del Tactical Studio Editor integrando la arquitectura del proyecto `texcel-studio`.
  - [ ] Diseño y validación de activos 100% originales (16 unidades terrestres/aéreas/navales, edificios y cuarteles P1/P2).
  - [ ] Sustitución integral de los spritesheets heredados por los nuevos activos originales atompunk.
  - [ ] Despliegue de skins míticas de novela gráfica (Vínculo de Nivel 10) para los 28 Comandantes.

---

# 3. DEFINICIÓN DE TERMINADO (DEFINITION OF DONE - DoD)

Una funcionalidad se considera formalmente terminada cuando cumple los siguientes 6 criterios:
1. **Tipado Estricto:** Pasa `bun run typecheck` con cero advertencias y sin uso de `any`.
2. **Determinismo Verificado:** Las pruebas unitarias de Vitest validan el resultado matemático sin depender del reloj del sistema ni de valores aleatorios no reproducibles.
3. **Transaccionalidad ACID:** Toda mutación de inventario, créditos, gemas o materiales procesados se ejecuta a través de funciones RPC securizadas en Supabase (`SECURITY DEFINER`).
4. **Respuesta en Edge:** Los endpoints y funciones de servidor responden en menos de $150\text{ms}$ en el $95\%$ de las solicitudes ($p95 < 150\text{ms}$).
5. **Fidelidad Estética y Animación:** Las viñetas y sellos de cómic Pop-Art se renderizan a 60 FPS estables sin provocar saltos visuales (*CLS = 0*).
6. **Conformidad con la Skill `retro-futurism`:** Toda vista, componente, modal, tarjeta o HUD de frontend debe aplicar de forma vinculante los principios de [`agents/skills/retro-futurism/skill.md`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/agents/skills/retro-futurism/skill.md) (formas aerodinámicas asimétricas `border-radius: 40px 10px 40px 10px`, paleta oficial atompunk `#2B2C24`, `#46521F`, `#7B8A4A`, `#C46A3A`, `#F2E8D5`, degradados de bisel cromado, sombras duras con offset `15px 15px 0px rgba(0,0,0,0.5)` y tipografía geométrica `Futura`).

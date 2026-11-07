# 🧭 MAPA CANÓNICO DE DOCUMENTACIÓN: GEOTACTICS ONLINE (v0.0.2-alfa)
## *Índice Maestro de Arquitectura, Especificaciones y Verdad del Repositorio*

Bienvenido al corpus documental oficial de **GEOTACTICS: ONLINE (Wars of Legacy)**.
Toda la documentación está sincronizada con la base de código real y organizada en una suite de volúmenes canónicos sin contradicciones.

---

## 🏛️ LOS 8 VOLÚMENES CANÓNICOS MAESTROS (SSOT)

| Volumen / Documento | Tema y Alcance Técnico |
| :--- | :--- |
| [**`00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md`**](./00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md) | **SSOT Rector del Proyecto.** Los 7 pilares canónicos inmutables, arquitectura modular de 4 dominios + `shared`, taxonomía de 4 estados (`LISTO`, `DESPLEGADO`, `DESARROLLADO`, `EN DESARROLLO`) y matriz de todos los subsistemas. |
| [**`00_GEOTACTICS_ONLINE_MASTER_SPEC.md`**](./00_GEOTACTICS_ONLINE_MASTER_SPEC.md) | **Especificación Maestra de Producto.** Visión de juego, Teatro Venezuela (24 Estados + 7 Buffers), conquista de Capitales con Buff Regional (+5%), Human Handshake de 120s y equilibrio macro. |
| [**`01_MASTER_CARTOGRAPHY_WEBGL_ZERO_RASTER.md`**](./01_MASTER_CARTOGRAPHY_WEBGL_ZERO_RASTER.md) | **Arquitectura Cartográfica WebGL 2.0 (`@domains/world`).** Estilo Zero-Raster sin CartoDB/Mapbox, MapLibre GL v6, red vial troncal en GPU, picking analítico $O(1)$ y niebla binaria en 50 bytes. |
| [**`02_MASTER_METAGAME_INDUSTRY_ECONOMY.md`**](./02_MASTER_METAGAME_INDUSTRY_ECONOMY.md) | **Metajuego, Industria y Economía (`@domains/economy`).** Cero Cartas: Hangar físico de 16 tropas máximo por jugador (4 activas + 12 reserva) en `user_unit_hangar`, Tiers T1 a T5 (+2%/tier, máx. +8% en T5), pérdida física con 35% chatarra (`tech_scrap`), Mercado P2P con split 2% (1% Sink + 1% Clan) y VWAP Collar ±25%. |
| [**`03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md`**](./03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md) | **Comandantes, Bark Engine Cómic y Capa Social (`@domains/game-feel` & `@domains/world`).** Catálogo de 28 COs, viñetas de novela gráfica (Mayor Stella #01), telemetría adaptativa y corporaciones militares. |
| [**`04_MASTER_DATABASE_AND_SECURITY_SPEC.md`**](./04_MASTER_DATABASE_AND_SECURITY_SPEC.md) | **Base de Datos y Seguridad (`supabase/migrations/` & `@shared`).** DDL PostgreSQL 15, políticas RLS multi-tenant, RPCs atómicas y esquemas de las 31 migraciones (1 a 27 base + 4 extensiones de soberanía RBAC, Cabimas realtime, catálogo manifiesto y ventanas de vulnerabilidad). |
| [**`05_MASTER_GAME_ENGINE_AND_NETWORKING.md`**](./05_MASTER_GAME_ENGINE_AND_NETWORKING.md) | **Motor Táctico y Audio (`@domains/tactics` & `@domains/game-feel`).** Balística determinista Advance Wars 1-100 HP enteros, derrota por 0 tropas vivas, A* con regla `¡TRAP!`, gestión de turnos y síntesis procedural Web Audio API. |
| [**`06_MASTER_DEVOPS_QA_AND_TELEMETRY.md`**](./06_MASTER_DEVOPS_QA_AND_TELEMETRY.md) | **DevOps, Infraestructura y QA.** CI/CD con Node 20 / Vite 8, batería de tests deterministas por dominio (`src/domains/*/__tests__/`) y suite E2E Playwright Chromium. |
| [**`07_MASTER_UI_UX_WAR_ROOM.md`**](./07_MASTER_UI_UX_WAR_ROOM.md) | **Diseño Atompunk y Sala de Guerra.** Tokens visuales C4ISR, paleta blindada (`#161712`, `#2B2C24`, `#46521F`), curvaturas asimétricas y física reactiva. |

---

## 🧩 ARQUITECTURA MODULAR DE 4 DOMINIOS + SHARED (`tsconfig.json`)

El código fuente en `src/` se estructura en **4 Dominios Funcionales** y una **Capa Compartida (`shared`)**:

- **`src/domains/world/index.ts` (`@domains/world/*`):** Cartografía WebGL/MapLibre (`TacticalWorldMap`), coordenadas analíticas $O(1)$ (`coordinates.ts`), bitmaps (`tacticalBitmap.ts`), carreteras (`roadNetworkEngine.ts`, `roadGarrisonEngine.ts`), asedios 120s (`territorialSiegeOrchestrator.ts`), expansión celular (`territorialExpansionEngine.ts`), motor político ALICE (`politicalAliceEngine.ts`) y clanes (`clanSystem.ts`).
- **`src/domains/tactics/index.ts` (`@domains/tactics/*`):** Motor balístico 1-100 HP (`canonicalCombat.ts`, `combat.ts`, `canonicalDamageChart.ts`), 28 Comandantes (`coSystem.ts`), IA de Guarnición Nv.1-5 (`garrisonAIEngine.ts`, `aiBot.ts`), niebla y `¡TRAP!` (`fogOfWar.ts`, `pathfinding.ts`), refuerzos (`reinforcementsEngine.ts`, `reinforcementEngine.ts`) e integración Doble Llave (`tacticalCombatSeamlessIntegration.ts`).
- **`src/domains/economy/index.ts` (`@domains/economy/*`):** Almacén Físico de 16 tropas Cero Cartas (`useUserHangar.ts`, `UnitHangarModal.tsx`, `LoadoutCustomizer.tsx`), complejo industrial de 10 parcelas y Mercado P2P 2% (`industrialEngine.ts`, `IndustrialComplexView.tsx`, `P2PMarketplaceView.tsx`), colas de producción y nodos (`strategicAndProductionEngine.ts`, `turnEconomy.ts`, `upkeepEngine.ts`).
- **`src/domains/game-feel/index.ts` (`@domains/game-feel/*`):** Bark Engine Cómic (`barkEngine.ts`, `CommanderBarkWidget.tsx`, `CommanderLivingVignette.tsx`), Web Audio API (`audioManager.ts`) y respuesta háptica (`hapticFeedback.ts`).
- **`src/shared/index.ts` (`@shared/*`):** Tipos y constantes canónicas (`src/shared/types/metagame.ts`, `src/shared/types/index.ts`, `src/shared/types/database.types.ts`), cliente Supabase (`src/shared/lib/supabase/client.ts`), servicios de persistencia (`playerDatabaseService.ts`, `matchDatabaseService.ts`), autenticación (`useAuth.ts`, `AuthTerminalModal.tsx`) y primitivas UI (`TacticalGhostBar.tsx`, `TacticalErrorBoundary.tsx`, `MatchSummaryModal.tsx`, `QADevOpsRunner.tsx`).

---

## 📐 ARQUITECTURA MODULAR Y REPORTES ACTIVOS

- [**`MASTER_MVP_BLUEPRINT_AND_ROADMAP.md`**](./MASTER_MVP_BLUEPRINT_AND_ROADMAP.md): Arquitectura Hexagonal Pura (Ports & Adapters), contratos inter-dominio y desacoplamiento en los **4 Dominios Funcionales (`world`, `tactics`, `economy`, `game-feel`) + `shared`**.
- [**`AUDITORIA_DISCREPANCIAS_V0.0.2_ALFA.md`**](./AUDITORIA_DISCREPANCIAS_V0.0.2_ALFA.md): Informe forense y certificación de sincronización del hito `v0.0.2-alfa`.

---

## 🗄️ ARCHIVO HISTÓRICO (`docs/archive_legacy/`)

Los planes de fases superadas, diagnósticos preliminares y registros de migraciones previas se preservan con fines de trazabilidad histórica en:
📁 [**`docs/archive_legacy/`**](./archive_legacy/)

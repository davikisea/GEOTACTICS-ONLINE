# 🧭 MAPA CANÓNICO DE DOCUMENTACIÓN: GEOTACTICS ONLINE (v0.0.2-alfa)
## *Índice Maestro de Arquitectura, Especificaciones y Verdad del Repositorio*

Bienvenido al corpus documental oficial de **GEOTACTICS: ONLINE (Wars of Legacy)**.
Toda la documentación está sincronizada con la base de código real y organizada en una suite de volúmenes canónicos sin contradicciones.

---

## 🏛️ LOS 8 VOLÚMENES CANÓNICOS MAESTROS (SSOT)

| Volumen / Documento | Tema y Alcance Técnico |
| :--- | :--- |
| [**`00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md`**](./00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md) | **SSOT Rector del Proyecto.** Los 7 axiomas inmutables, taxonomía de 4 estados (Listo, Desplegado, Desarrollado, En Desarrollo) y matriz de todos los subsistemas. |
| [**`00_GEOTACTICS_ONLINE_MASTER_SPEC.md`**](./00_GEOTACTICS_ONLINE_MASTER_SPEC.md) | **Especificación Maestra de Producto.** Visión de juego, Teatro Venezuela (24 Estados + 7 Buffers), resolución por asedio y equilibrio macro. |
| [**`01_MASTER_CARTOGRAPHY_WEBGL_ZERO_RASTER.md`**](./01_MASTER_CARTOGRAPHY_WEBGL_ZERO_RASTER.md) | **Arquitectura Cartográfica WebGL 2.0.** Estilo Zero-Raster sin CartoDB/Mapbox, MapLibre GL v6, red vial troncal en GPU, picking analítico $O(1)$ y niebla binaria en 50 bytes. |
| [**`02_MASTER_METAGAME_INDUSTRY_ECONOMY.md`**](./02_MASTER_METAGAME_INDUSTRY_ECONOMY.md) | **Metajuego, Industria y Economía.** Hangar físico (`user_unit_hangar`), Tiers T1 a T5 (+2%/tier), Mercado P2P con split 2% y protocolo circadiano. |
| [**`03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md`**](./03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md) | **Comandantes, Bark Engine Cómic y Capa Social.** Catálogo de 28 COs, viñetas de novela gráfica (Mayor Stella #01), telemetría adaptativa y corporaciones militares. |
| [**`04_MASTER_DATABASE_AND_SECURITY_SPEC.md`**](./04_MASTER_DATABASE_AND_SECURITY_SPEC.md) | **Base de Datos y Seguridad.** DDL PostgreSQL 15, políticas RLS multi-tenant, RPCs atómicas y esquemas de migraciones 1 a 27. |
| [**`05_MASTER_GAME_ENGINE_AND_NETWORKING.md`**](./05_MASTER_GAME_ENGINE_AND_NETWORKING.md) | **Motor Táctico y Audio.** Balística determinista Advance Wars 1-100 HP, A* con regla `¡TRAP!`, gestión de turnos y síntesis procedural Web Audio API. |
| [**`06_MASTER_DEVOPS_QA_AND_TELEMETRY.md`**](./06_MASTER_DEVOPS_QA_AND_TELEMETRY.md) | **DevOps, Infraestructura y QA.** CI/CD con Node 20 / Vite 8, batería de tests deterministas y suite E2E Playwright Chromium. |
| [**`07_MASTER_UI_UX_WAR_ROOM.md`**](./07_MASTER_UI_UX_WAR_ROOM.md) | **Diseño Atompunk y Sala de Guerra.** Tokens visuales C4ISR, paleta blindada (`#161712`, `#2B2C24`, `#46521F`), curvaturas asimétricas y física reactiva. |

---

## 📐 ARQUITECTURA MODULAR Y REPORTES ACTIVOS

- [**`MASTER_MVP_BLUEPRINT_AND_ROADMAP.md`**](./MASTER_MVP_BLUEPRINT_AND_ROADMAP.md): Arquitectura Hexagonal Pura (Ports & Adapters) y desacoplamiento en 3 dominios inmutables.
- [**`AUDITORIA_DISCREPANCIAS_V0.0.2_ALFA.md`**](./AUDITORIA_DISCREPANCIAS_V0.0.2_ALFA.md): Informe forense y certificación de sincronización del hito `v0.0.2-alfa`.

---

## 🗄️ ARCHIVO HISTÓRICO (`docs/archive_legacy/`)

Los planes de fases superadas, diagnósticos preliminares y registros de migraciones previas se preservan con fines de trazabilidad histórica en:
📁 [**`docs/archive_legacy/`**](./archive_legacy/)

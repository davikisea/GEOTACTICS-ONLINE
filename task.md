# Master Checklist: Rework Táctico RTS Continuo & Soberanía Territorial 100%

- [x] **Fase 0: Anclaje de Contexto & Arquitectura Canónica** <!-- id: 0 -->
  - [x] Validar contratos de datos y matriz de 10 unidades en `docs/03_TACTICAL_STRATEGY_SYSTEM_DESIGN.md` <!-- id: 1 -->
  - [x] Establecer checklist operativa en `task.md` <!-- id: 2 -->

- [x] **Fase 1: Motor RTS Continuo de Celda (10 Ticks/s) & Balística Determinista** <!-- id: 3 -->
  - [x] Crear `src/engine/tacticalRtsEngine.ts` con loop de 10 ticks/s (100 ms) <!-- id: 4 -->
  - [x] Implementar cooldowns de recarga canónicos por chasis (tanque 3.5s, recon 1.2s, artillería 7.0s) <!-- id: 5 -->
  - [x] Implementar cola de intenciones de marcha interpoladas (`UNIT_MOVE_INTENT`) <!-- id: 6 -->
  - [x] Integrar cálculo balístico 1-100 HP determinista reutilizando `canonicalCombat.ts` <!-- id: 7 -->
  - [x] Crear `src/engine/tacticalRtsEngine.test.ts` con pruebas deterministas <!-- id: 8 -->

- [x] **Fase 2: Persistencia Soberana, Timers de Vulnerabilidad & Liquidación de Bajas** <!-- id: 9 -->
  - [x] Crear migración SQL `supabase/migrations/20261109_territorial_vulnerability_windows.sql` <!-- id: 10 -->
  - [x] Implementar RPC `check_territorial_vulnerability` con cooldown anti-evasión de 48h <!-- id: 11 -->
  - [x] Implementar RPC `settle_territorial_combat_losses` (65% sumidero / 35% scrap) <!-- id: 12 -->
  - [x] Integrar protección de inmunidad en `src/engine/territorialSiegeOrchestrator.ts` <!-- id: 13 -->
  - [x] Crear `src/engine/vulnerabilityWindows.test.ts` <!-- id: 14 -->

- [x] **Fase 3: Renderizado WebGL 2.0, Dirty Checking Zero-Jank & Trazadoras Balísticas** <!-- id: 15 -->
  - [x] Implementar Dirty Checking en el `TileCanvas` de `TacticalWorldMap.tsx` <!-- id: 16 -->
  - [x] Renderizar retícula C4ISR de selección de unidad y círculo de rango táctico <!-- id: 17 -->
  - [x] Renderizar trazadoras balísticas de 200 ms y halos ámbar de vulnerabilidad activa <!-- id: 18 -->

- [x] **Fase 4: Game Feel Cinético, Onomatopeyas Ben-Day & Integración de Audio** <!-- id: 19 -->
  - [x] Disparar micro-sacudidas de pantalla (`tactical-screen-shake`) en impactos críticos <!-- id: 20 -->
  - [x] Proyectar sellos Ben-Day diegéticos (`¡BLAM!`, `¡CRITICAL!`, `¡RICOCHET!`) en coordenadas del TileCanvas <!-- id: 21 -->
  - [x] Conectar efectos de audio con `audioManager.ts` <!-- id: 22 -->

- [x] **Fase 5: Verificación Integral, Build de Producción & Walkthrough** <!-- id: 23 -->
  - [x] Ejecutar suites unitarias (`tacticalRtsEngine.test.ts`, `vulnerabilityWindows.test.ts`, `test:metagame`) <!-- id: 24 -->
  - [x] Ejecutar compilación de producción con Vite (`npm run build`) <!-- id: 25 -->
  - [x] Actualizar `walkthrough.md` con telemetría de rendimiento y arquitectura final <!-- id: 26 -->

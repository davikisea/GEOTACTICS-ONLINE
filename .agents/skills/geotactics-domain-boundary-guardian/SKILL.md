---
name: geotactics-domain-boundary-guardian
description: Guardiana de la arquitectura modular de los 4 dominios (@domains/world, @domains/tactics, @domains/economy, @domains/game-feel) y la capa compartida (@shared) en GEOTACTICS ONLINE. Usa esta skill siempre que se creen, muevan o refactoricen archivos, cuando se depuren imports legacy (src/engine/*, src/components/*, src/services/*), cuando se actualicen barriles públicos (index.ts) o cuando se optimice el code-splitting de Vite.
---

# GEOTACTICS DOMAIN BOUNDARY GUARDIAN & LEGACY PURGE ARCHITECT

Garantiza el aislamiento estricto de los **4 Dominios Funcionales + Capa Compartida (`@shared`)** en **GEOTACTICS: ONLINE**, previniendo la contaminación cruzada de imports, las dependencias circulares y el uso accidental de carpetas monolíticas legacy (`src/engine/`, `src/components/`, `src/services/`, `src/hooks/`, `src/types/`).

---

## 1. CUÁNDO ACTIVAR ESTA SKILL

- Al crear un nuevo motor, servicio, hook o componente de React y decidir en qué carpeta ubicarlo.
- Al refactorizar imports internos o eliminar código duplicado entre `src/domains/*` y las carpetas legacy de la raíz de `src/`.
- Cuando `npm run build` emita advertencias `[INEFFECTIVE_DYNAMIC_IMPORT]` o errores de resolución de tipos en `tsconfig.json`.
- Al auditar que todos los barriles públicos (`index.ts`) expongan las constantes, funciones y componentes de su dominio.

---

## 2. MAPA DE SOBERANÍA DE LOS 4 DOMINIOS + SHARED (`tsconfig.json`)

| Alias de Dominio | Ruta Física | Barril Público Obligatorio | Responsabilidad Exclusiva |
| :--- | :--- | :--- | :--- |
| **`@domains/world`** | `src/domains/world/` | `src/domains/world/index.ts` | Cartografía MapLibre WebGL Zero-Raster (`TacticalWorldMap.tsx`), proyección WGS84 $O(1)$ (`coordinates.ts`), bitmap binario (`tacticalBitmap.ts`), red vial $A^*$ (`roadNetworkEngine.ts`, `spatialRoadIndex.ts`, `roadGarrisonEngine.ts`), política Project Alice (`politicalAliceEngine.ts`), asedios de 120s (`territorialSiegeOrchestrator.ts`) y Clanes (`clanSystem.ts`). |
| **`@domains/tactics`** | `src/domains/tactics/` | `src/domains/tactics/index.ts` | Motor balístico continuo 1–100 HP (`canonicalCombat.ts`, `canonicalDamageChart.ts`), cuadrícula $20\times 20$, los 29 Comandantes (`coSystem.ts`), IA de Guarnición Nv. 1–5 (`garrisonAIEngine.ts`), motor RTS (`tacticalRtsEngine.ts`), niebla de guerra (`fogOfWar.ts`), capturas y teatro de combate (`CombatTheaterView.tsx`, `GameCanvas.tsx`). |
| **`@domains/economy`** | `src/domains/economy/` | `src/domains/economy/index.ts` | Complejo industrial de 10 parcelas (`industrialEngine.ts`, `IndustrialComplexView.tsx`), Almacén Físico de 16 tropas (`UnitHangarModal.tsx`, `useUserHangar.ts`), forja T1–T5 al +2%/tier (`strategicAndProductionEngine.ts`), upkeep imperial (`upkeepEngine.ts`), flujo por turno (`turnEconomy.ts`), ticker Wplace (`useTerritoryEconomyTicker.ts`) y Mercado P2P al 2% (`P2PMarketplaceView.tsx`). |
| **`@domains/game-feel`** | `src/domains/game-feel/` | `src/domains/game-feel/index.ts` | Síntesis acústica Web Audio API sin dependencias (`audioManager.ts`), Bark Engine cómic con aprendizaje adaptativo (`barkEngine.ts`), bocadillos y viñetas vivas (`CommanderBarkWidget.tsx`, `CommanderLivingVignette.tsx`) y vibración háptica (`hapticFeedback.ts`). |
| **`@shared`** | `src/shared/` | `src/shared/index.ts` | Cliente Supabase (`lib/supabase/client.ts`), contratos SSOT (`types/metagame.ts`, `types/database.types.ts`), servicios transversales (`playerDatabaseService.ts`, `matchDatabaseService.ts`, `catalogRegistryService.ts`), UI atómica (`TacticalGhostBar.tsx`, `MatchSummaryModal.tsx`, `TacticalErrorBoundary.tsx`) y puente QA (`utils/qaHarness.ts`). |

---

## 3. REGLAS ESTRICTAS DE FRONTERA E IMPORTACIÓN (LAW OF DEMETER)

1. **Prohibido el Deep-Import entre Dominios Distintos**:
   - ❌ **Incorrecto** (desde `world` importando entrañas de `economy`):
     ```ts
     import { IndustrialEngine } from '../../economy/core/industrialEngine';
     ```
   - ✅ **Correcto** (consumiendo siempre el barril público del otro dominio):
     ```ts
     import { IndustrialEngine } from '@domains/economy';
     ```
2. **Prohibido Importar de Carpetas Legacy Monolíticas**:
   - Ningún archivo nuevo o editado puede contener `from '@/src/engine/...'`, `from '@/src/components/...'`, `from '@/src/services/...'`, `from '@/src/hooks/...'` ni `from '@/src/types/...'`.
   - Toda referencia debe apuntar a `@domains/world`, `@domains/tactics`, `@domains/economy`, `@domains/game-feel` o `@shared`.
3. **Jerarquía Unidireccional de Dependencias**:
   - `@shared` es la base: **no debe importar jamás** de `@domains/*` (salvo tipos puros si fuera estrictamente necesario; los tipos transversales deben vivir en `src/shared/types/`).
   - `@domains/game-feel` consume datos de `@shared` y catálogo de COs de `@domains/tactics`.
   - `@domains/economy`, `@domains/tactics` y `@domains/world` se comunican a través de sus barriles públicos y los contratos en `src/shared/types/metagame.ts`.

---

## 4. PROTOCOLO DE PURGA SEGURA DE ARCHIVOS DUPLICADOS (LEGACY MIRROR PURGE)

Cuando el usuario solicite limpiar o purgar archivos legacy en `src/engine/`, `src/components/`, `src/services/`, `src/hooks/` o `src/types/`, sigue este algoritmo de 5 pasos sin saltarte ninguno:

1. **Escaneo de Referencias Activas**:
   ```powershell
   Get-ChildItem -Path src\domains, src\shared, src\App.tsx, package.json -Recurse -File | Select-String -Pattern "src/engine|src/components|src/services|src/hooks|src/types"
   ```
2. **Comparación Diff Antes de Borrar**:
   - Antes de eliminar cualquier archivo en `src/engine/<archivo>.ts`, compáralo con su homólogo en `src/domains/<dominio>/core/<archivo>.ts` para verificar que el dominio tenga la versión más reciente.
3. **Reescritura de Imports a Alias de Dominio**:
   - Reemplaza los imports en `src/domains/*`, `src/shared/*` y `src/App.tsx` por `@domains/*` y `@shared`.
4. **Migración de Scripts en `package.json`**:
   - Actualiza los scripts `test:all`, `test:geotactics` y `test:e2e` en `package.json` para que apunten a `src/domains/{world,tactics,economy,game-feel}/__tests__/*.test.ts`.
5. **Verificación Triple antes de Confirmar**:
   - Ejecuta `npm run lint`, `npm run build`, `npm run test:all` y `npm run test:geotactics`. Todos deben terminar con código de salida `0`.

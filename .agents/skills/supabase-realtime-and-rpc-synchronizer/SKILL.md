---
name: supabase-realtime-and-rpc-synchronizer
description: Sincronizador de las 31+ migraciones SQL (supabase/migrations/), el despliegue consolidado (CONSOLIDATED_FULL_DATABASE_DEPLOY.sql), los contratos TypeScript (src/shared/types/database.types.ts), las políticas RLS multi-tenant y los canales Supabase Realtime / CDC (useMatchSync, useSiegeRealtime, stateSovereigntyService, spatialDeploymentService) en GEOTACTICS ONLINE. Usa esta skill siempre que crees o modifiques tablas, funciones RPC, triggers, políticas RLS o suscripciones Realtime.
---

# SUPABASE REALTIME, 31+ MIGRATIONS & RPC SYNCHRONIZER (`@shared` & `supabase/`)

Mantiene la sincronización atómica entre las **31+ migraciones SQL** (`supabase/migrations/`), el script maestro [`supabase/CONSOLIDATED_FULL_DATABASE_DEPLOY.sql`](file:///c:/Users/Morín/GEOTACTICS-ONLINE/supabase/CONSOLIDATED_FULL_DATABASE_DEPLOY.sql), las definiciones de tipos en [`src/shared/types/database.types.ts`](file:///c:/Users/Morín/GEOTACTICS-ONLINE/src/shared/types/database.types.ts) y los servicios/hooks de tiempo real en `@shared`, `@domains/world`, `@domains/tactics` y `@domains/economy`.

---

## 1. CUÁNDO ACTIVAR ESTA SKILL

- Al crear una nueva migración en `supabase/migrations/` o modificar funciones RPC (`SECURITY DEFINER`) y políticas RLS.
- Al eliminar casts `(supabase as any)` actualizando `src/shared/types/database.types.ts` con las tablas y RPCs de las migraciones 26 a 31+.
- Al diagnosticar o programar canales de Supabase Realtime (Broadcast, Presence o Postgres Changes CDC) en `useMatchSync.ts`, `useSiegeRealtime.ts`, `stateSovereigntyService.ts`, `spatialDeploymentService.ts` o `catalogRegistryService.ts`.

---

## 2. ARQUITECTURA DE LAS 31 MIGRACIONES Y TABLAS CRÍTICAS

### 2.1. Tablas Canónicas por Dominio
1. **Identidad, Clanes y RBAC (`@shared` & `@domains/world`)**:
   - `public.profiles`, `public.clans`, `public.clan_members`, `public.corporate_subsidiaries` (federación de hasta 10 clanes).
2. **Catálogos y Manifiesto ETag (`@shared`)**:
   - `public.units_catalog` (`hp_max = 100`), `public.terrain_catalog`, `public.unit_weapon_damage_matrix`, `public.commanders_catalog` (29 COs), `public.system_catalog_manifest` (Migración 30: `20261108_system_catalog_manifest.sql`).
3. **Economía, 10 Parcelas, Hangar Físico y P2P 2% (`@domains/economy`)**:
   - `public.user_unit_hangar` (máx. 16 unidades físicas por jugador, `hp BETWEEN 1 AND 100`, `tier BETWEEN 1 AND 5`), `public.faction_unit_hangar`, `public.unit_production_queue`.
   - `public.user_industrial_inventory` (incluye `tech_scrap`), `public.user_industrial_plots` (10 parcelas por feudo), `public.p2p_price_reference` (VWAP Collar ±25%), `public.p2p_market_orders` / `public.p2p_market_listings` (`platform_burn_ec` 1% + `province_royalty_ec` 1%).
4. **Geopolítica, Soberanía Dual, Despliegue Espacial y Asedios (`@domains/world` & `@domains/tactics`)**:
   - `public.regions` (24 estados + 7 buffers de Venezuela), `public.region_adjacencies` (`topology_flags`), `public.region_sovereignty` (`control_points` 0..15000, `owner_clan_id` De Jure, `controller_clan_id` De Facto), `public.strategic_nodes`.
   - `public.territorial_battle_sessions` (`handshake_expires_at` 120s, `mode IN ('pve_garrison', 'pvp_realtime')`), `public.garrison_deployments` (IA Nv. 1–5).
   - `public.state_sovereignty` (Migración 28: `20261106_state_sovereignty_rbac.sql`).
   - `public.tactical_spatial_deployments`, `public.tactical_fief_constructions`, `public.region_operational_state` (Migración 29: `20261107_theatre_cabimas_realtime.sql`).
   - `public.territorial_vulnerability_windows` (Migración 31: `20261109_territorial_vulnerability_windows.sql`).

### 2.2. RPCs Transaccionales Clave (`SECURITY DEFINER`)
- **Mercado P2P (2% Split)**: `execute_p2p_market_transaction` / `execute_p2p_trade_v2` (valida banda VWAP ±25%, quema 1% en Sink y transfiere 1% a la bóveda del clan dueño del Hub regional).
- **Asedio y Liquidación (35% Chatarra)**: `execute_territory_attack_declaration`, `deploy_reinforcements_to_battle`, `process_battle_territory_outcome`, `settle_territorial_combat_losses` (elimina el chasis destruido de `user_unit_hangar` y acredita el **35% en `user_industrial_inventory.tech_scrap`**).
- **Soberanía y Ventanas UTC**: `check_territorial_vulnerability`, `update_territorial_vulnerability_window`, `calculate_and_apply_territorial_upkeep`.
- **Reconexión Táctica**: `rpc_reconnect_match_state({ p_match_id, p_user_id })`.

---

## 3. CANALES REALTIME Y PATRÓN OPTIMISTIC UI + CDC

1. **Combate Táctico (`src/domains/tactics/hooks/useMatchSync.ts`)**:
   - Canal: `match:${matchId}` con eventos Broadcast `MATCH_ACTION`, `TACTICAL_PING` y `TACTICAL_PONG` (cálculo de `latencyMs = roundtrip / 2` para el Reloj Fischer).
2. **Asedio Territorial y Handshake de 120s (`src/domains/world/hooks/useSiegeRealtime.ts`)**:
   - Suscripción a `territorial_battle_sessions` y `region_sovereignty` para sincronizar el contador de 120s y el drenaje de barras TCP en vivo.
3. **Persistencia Espacial y Soberanía en Cabimas (`src/domains/world/services/spatialDeploymentService.ts` & `stateSovereigntyService.ts`)**:
   - Tablas configuradas con `REPLICA IDENTITY FULL` y añadidas a la publicación `supabase_realtime`.
   - Mantén siempre un **fallback en memoria (`localStorage` / estado local)** cuando `supabase` opere en modo offline/demo para que la UI jamás crashee sin conexión.

---

## 4. PROTOCOLO DE 4 PASOS AL AÑADIR O MODIFICAR SQL

1. **Crear Migración Idempotente**:
   - Usa `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ENABLE ROW LEVEL SECURITY` y `DROP POLICY IF EXISTS` antes de `CREATE POLICY`.
   - En funciones RBAC, referencia siempre `public.profiles` y `public.clan_members` (nunca tablas inexistentes como `player_profiles`).
2. **Sincronizar `supabase/CONSOLIDATED_FULL_DATABASE_DEPLOY.sql`**:
   - Añade el bloque SQL al final del script consolidado para mantener un único archivo de despliegue completo actualizado.
3. **Actualizar `src/shared/types/database.types.ts`**:
   - Agrega la definición `Row`, `Insert`, `Update` de la tabla y los `Args`/`Returns` de la función RPC en `Database['public']` para contar con autocompletado estricto y eliminar `(supabase as any)`.
4. **Actualizar `docs/04_MASTER_DATABASE_AND_SECURITY_SPEC.md` y Ejecutar Tests**:
   ```powershell
   npx tsx src/shared/lib/supabase/realtime.test.ts
   npx tsx src/domains/world/__tests__/theatreRealtimePersistence.test.ts
   npx tsx src/domains/world/__tests__/spatialDeployment.test.ts
   ```

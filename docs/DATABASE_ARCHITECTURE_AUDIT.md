# AUDITORÍA DE ARQUITECTURA DE BASE DE DATOS, PERSISTENCIA REALTIME Y SEGURIDAD RLS
**Proyecto:** Tactical Command: Wars of Legacy (GEOTACTICS: ONLINE)  
**Teatro Operacional Inicial:** Zulia / Cabimas (`REG_VE_02`, Coordenadas WGS84: `[-71.455, 10.395]`)  
**Fecha de Auditoría:** 2026-11-07 (Actualización Post-Migraciones `20261107` a `20261109` y Modularización en 4 Dominios)  
**Documento Relacionado:** `docs/04_MASTER_DATABASE_AND_SECURITY_SPEC.md`

---

## 1. RESUMEN EJECUTIVO

Esta auditoría técnica evalúa el estado real y ejecutable del esquema relacional PostgreSQL en Supabase (`supabase/CONSOLIDATED_FULL_DATABASE_DEPLOY.sql` y `supabase/migrations/`), el soporte de Row Level Security (RLS) multi-tenant, la suscripción a eventos en tiempo real (`supabase_realtime`), la alineación con los **7 Pilares Canónicos Inmutables** y la sincronización con los servicios modulares en `src/domains/{world,tactics,economy,game-feel}` y `src/shared/`.

### Diagnóstico Principal (Estado Actual Verificado en Código)
1. **Soberanía y RBAC (`state_sovereignty`) — RESUELTO Y SINCRONIZADO:** Creada en la migración `20261106_state_sovereignty_rbac.sql` con RLS estricto (`public.is_sovereignty_authorized`) y añadida a `supabase_realtime` con `REPLICA IDENTITY FULL` en `20261107_theatre_cabimas_realtime.sql`. El servicio `src/domains/world/services/stateSovereigntyService.ts` ejecuta hidratación inicial `select('*')` desde Supabase y mantiene suscripción activa CDC (`postgres_changes` en canal `sovereignty:global`).
2. **Despliegues Espaciales y Construcciones In-Situ (`tactical_spatial_deployments`, `tactical_fief_constructions`, `region_operational_state`) — PERSISTENCIA HÍBRIDA REALTIME ACTIVA:**
   - La migración `20261107_theatre_cabimas_realtime.sql` creó las tablas DDL con unicidad espacial $O(1)$ (`UNIQUE (region_id, cell_key)`), RLS multi-tenant y `REPLICA IDENTITY FULL`.
   - `src/domains/world/services/spatialDeploymentService.ts` hidrata el estado desde Supabase y escucha eventos `INSERT`, `UPDATE`, `DELETE` filtrados por región (`theatre:REG_VE_02`), haciendo upsert optimista en segundo plano.
   - `src/domains/tactics/services/operationalUnitsService.ts` y `src/domains/economy/services/fiefBuildingService.ts` mantienen los modelos en memoria del teatro táctico/económico y se coordinan con la grilla espacial de `spatialDeploymentService.ts`.
3. **Gobernanza de Catálogos SSOT (`system_catalog_manifest`) — IMPLEMENTADO:** La migración `20261108_system_catalog_manifest.sql` y el servicio `src/shared/services/catalogRegistryService.ts` proveen acceso $O(1)$ en memoria (< 0.05 ms) con verificación de hash SHA-256 (`get_catalog_manifest_header()`) y hot-patching reactivo en `src/domains/tactics/components/GeotacticsLoadingScreen.ts`.
4. **Ventanas de Vulnerabilidad y Reciclaje Balístico (`territorial_vulnerability_windows`) — IMPLEMENTADO:** La migración `20261109_territorial_vulnerability_windows.sql` implementa ventanas diarias de asedio de 2 a 4 horas UTC con cooldown anti-evasión de 48h (`check_territorial_vulnerability`, `update_territorial_vulnerability_window`) y la sobrecarga de `settle_territorial_combat_losses` para liquidar bajas espaciales con retorno del **35% en `tech_scrap`** (65% sumidero permanente).

---

## 2. CUMPLIMIENTO DE LOS 7 PILARES CANÓNICOS Y REGLA FINANCIERA EN BASE DE DATOS

| Pilar / Regla Canónica | Tabla(s) / RPC(s) en PostgreSQL | Servicio / Hook Modular | Estado de Verificación |
| :--- | :--- | :--- | :--- |
| **Pilar 1: Cero Cartas (NO TCG/CCG) y Almacén Físico de 16 Tropas** | `public.user_unit_hangar` (`player_hangar`: 4 activos + 12 reserva), `public.tactical_spatial_deployments` (`operational_units`) | `src/domains/economy/hooks/useUserHangar.ts`, `src/shared/types/metagame.ts` | **100% Alineado** (`MAX_HANGAR_CAPACITY: 16`, `ACTIVE_DEPLOYMENT_SLOTS: 4`, `RESERVE_HANGAR_SLOTS: 12`) |
| **Pilar 2: Escala Balística Continua 1 a 100 HP Enteros** | `public.units_catalog.hp_max = 100`, `public.user_unit_hangar.hp BETWEEN 1 AND 100`, `public.tactical_spatial_deployments.hp BETWEEN 0 AND 100` | `src/shared/services/catalogRegistryService.ts`, `src/domains/tactics/core/operationalUnitsEngine.ts` | **100% Alineado** (`UNIT_HP_MAX: 100`) |
| **Pilar 3: Derrota a 0 Tropas Supervivientes** | `public.match_history` (`end_reason = 'army_wiped'`) | `src/shared/services/matchDatabaseService.ts` | **100% Alineado** (`ZERO_TROOPS_DEFEAT: true`) |
| **Pilar 4: Tiers Horizontales T1 a T5 (+2% por Tier, máx +8% en T5)** | `public.user_patents`, `public.user_unit_hangar` (`tier BETWEEN 1 AND 5`) | `src/domains/economy/hooks/useUserHangar.ts`, `src/shared/types/metagame.ts` | **100% Alineado** (`MAX_PATENT_TIER: 5`, `TIER_STAT_BONUS_PER_STEP: 0.02`, `MAX_TIER_STAT_BONUS: 0.08`) |
| **Pilar 5: Conquista de Capitales con Buff Regional (+5%)** | `public.world_countries.national_tax_bonus_pct = 5.00`, `public.world_provinces.is_capturable = true`, `public.regions.is_capturable = true` (15,000 TCP) | `src/domains/world/hooks/useTerritoryMap.ts`, `src/domains/economy/hooks/useTerritoryEconomyTicker.ts` | **100% Alineado** (Sin escudos permanentes; +5% recursos/logística regional) |
| **Pilar 6: Pérdida Física Real y 35% Chatarra (`tech_scrap`)** | `public.user_industrial_inventory.tech_scrap`, RPC `settle_territorial_combat_losses`, RPC `resolve_combat_attrition_and_salvage` | `src/domains/economy/hooks/useUserHangar.ts`, `src/domains/economy/core/industrialEngine.ts` | **100% Alineado** (35% `tech_scrap`, 65% sumidero deflacionario permanente) |
| **Pilar 7: Human Handshake 120s y Ventanas de Vulnerabilidad** | `public.territorial_battle_sessions` (`handshake_expires_at = NOW() + 120s`), `public.garrison_deployments` (Búnkeres Nivel 1-5), `public.territorial_vulnerability_windows` (2-4h diarias, cooldown 48h) | `src/domains/world/hooks/useSiegeRealtime.ts`, `src/domains/world/hooks/useTerritoryMap.ts` | **100% Alineado** (`SIEGE_HANDSHAKE_SECONDS: 120`) |
| **Regla Financiera: Mercado P2P 2% Split + VWAP Collar ±25%** | `public.p2p_market_orders`, `public.p2p_market_listings`, `public.p2p_price_reference`, RPC `execute_p2p_market_transaction`, RPC `execute_p2p_trade_v2` | `src/shared/services/playerDatabaseService.ts`, `src/domains/economy/hooks/useUserIndustry.ts` | **100% Alineado** (1% Sink `platform_burn_ec` + 1% Clan Hub `province_royalty_ec`, Collar ±25%) |
| **Complejo Industrial de 10 Parcelas por Feudo (`fief_plots`)** | `public.user_industrial_plots` (`plot_index BETWEEN 1 AND 10`), RPC `harvest_industrial_territory` | `src/domains/economy/hooks/useUserIndustry.ts`, `src/shared/services/playerDatabaseService.ts` | **100% Alineado** (10 parcelas por feudo, ciclo circadiano 16h) |

---

## 3. MAPA DE DEPENDENCIAS MODULARES Y PERSISTENCIA MEMORIA VS. BASE DE DATOS

| Capa Funcional | Servicio / Hook Modular (`src/domains/*` y `src/shared/*`) | Tablas en PostgreSQL (Supabase) | Estado de Sincronización Realtime y Persistencia |
| :--- | :--- | :--- | :--- |
| **Soberanía Geopolítica y RBAC** | `src/domains/world/services/stateSovereigntyService.ts` | `public.state_sovereignty` (`20261106` + `20261107`) | **Sincronizado en Realtime:** Hidrata con `select('*')` al iniciar, escucha CDC `postgres_changes` en canal `sovereignty:global` y persiste mutaciones con `upsert()`. |
| **Regiones, Nodos y Soberanía Dual** | `src/domains/world/hooks/useTerritoryMap.ts`, `src/domains/world/hooks/useSiegeRealtime.ts` | `public.regions`, `public.region_adjacencies`, `public.region_sovereignty`, `public.strategic_nodes`, `public.territorial_battle_sessions`, `public.territorial_vulnerability_windows` | **Sincronizado:** 24 regiones de Venezuela sembradas (`REG_VE_01` a `REG_VE_24`), grafo topológico con máscara de bits (`topology_flags`) y alertas de asedio con Handshake de 120s. |
| **Microjuego Espacial ($z \ge 15$, Celdas 20m)** | `src/domains/world/services/spatialDeploymentService.ts` | `public.tactical_spatial_deployments`, `public.tactical_fief_constructions`, `public.region_operational_state` (`20261107`) | **Sincronizado en Realtime:** Hidrata desde DB y escucha CDC en canal `theatre:REG_VE_02` filtrado por `region_id=eq.REG_VE_02`. Unicidad espacial garantizada por `UNIQUE (region_id, cell_key)`. |
| **Despliegue Operacional ($z \ge 10$)** | `src/domains/tactics/services/operationalUnitsService.ts`, `src/domains/tactics/core/operationalUnitsEngine.ts` | `public.tactical_spatial_deployments` (vía puente con `spatialDeploymentService`) | **Híbrido:** El motor cinemático geodésico opera en memoria a 60 FPS mientras las posiciones de celda se persisten en `tactical_spatial_deployments`. |
| **Construcciones de Feudos de Clan** | `src/domains/economy/services/fiefBuildingService.ts` | `public.tactical_fief_constructions` (vía `spatialDeploymentService.registerConstructionInCell`) | **Híbrido:** La colocación de edificios en celdas de 20m se persiste en `tactical_fief_constructions`; el catálogo de tesorería local de feudos opera con caché resiliente en memoria. |
| **Hangar Físico (16 Tropas) y Colas** | `src/domains/economy/hooks/useUserHangar.ts` | `public.user_unit_hangar`, `public.faction_unit_hangar`, `public.unit_production_queue` (`20261105`) | **Sincronizado vía RPCs ACID:** `queue_unit_production`, `claim_finished_unit` y `settle_territorial_combat_losses` con fallback Offline-First. |
| **Industria (10 Parcelas) y Mercado P2P** | `src/domains/economy/hooks/useUserIndustry.ts`, `src/shared/services/playerDatabaseService.ts` | `public.user_industrial_inventory`, `public.user_industrial_plots`, `public.p2p_market_orders`, `public.p2p_market_listings`, `public.p2p_price_reference` | **Sincronizado:** Recolección circadiana de 10 parcelas y libro de órdenes P2P con impuesto del 2% (1% Sink + 1% Clan Hub) y Collar VWAP ±25%. |
| **Catálogos Inmutables y Manifiesto SSOT** | `src/shared/services/catalogRegistryService.ts`, `src/domains/tactics/components/GeotacticsLoadingScreen.ts` | `public.system_catalog_manifest`, `public.units_catalog`, `public.terrain_catalog`, `public.unit_weapon_damage_matrix` (`20261108`) | **Sincronizado:** Lookup $O(1)$ en memoria + hot-reloading mediante hash SHA-256 (`get_catalog_manifest_header`). |
| **Combate Táctico y Reconexión** | `src/shared/services/matchDatabaseService.ts`, `src/domains/tactics/hooks/useMatchSync.ts` | `public.active_matches`, `public.match_state`, `public.match_turn_snapshots`, `public.match_action_deltas` | **Sincronizado:** Reconexión instantánea por snapshots o deltas incrementales (`rpc_reconnect_match_state`). |

---

## 4. AUDITORÍA DETALLADA DEL ESQUEMA RELACIONAL, RLS Y REALTIME

### 4.1 Tablas Geopolíticas y Operacionales Activas
- `public.regions`: Catálogo de 24 regiones venezolanas (`REG_VE_01` a `REG_VE_24`). RLS habilitado con lectura pública (`regions_public_read`).
- `public.region_sovereignty`: Soberanía dual (`owner_clan_id`, `controller_clan_id`), estado (`stable`, `under_siege`, `occupied_grace`) y puntos de control (10,000 TCP regular / 15,000 TCP capital). RLS lectura pública (`region_sovereignty_public_read`).
- `public.state_sovereignty`: Soberanía estatal de primer orden, nombres personalizados de nación y lemas de clan. RLS con función `public.is_sovereignty_authorized(target_clan_id)`.
- `public.strategic_nodes`: Nodos provinciales (`capital_hq`, `refinery_hub`, `strait_canal`, `radar_c4isr`, `missile_silo`). RLS lectura pública.
- `public.tactical_spatial_deployments` y `public.tactical_fief_constructions`: Tablas del microjuego espacial ($z \ge 15$, celdas de 20m) con restricción `UNIQUE (region_id, cell_key)`.
- `public.region_operational_state`: Estado táctico consolidado y nivel DEFCON regional.
- `public.territorial_vulnerability_windows`: Ventanas de vulnerabilidad diaria (2–4h UTC) con cooldown de 48h para cambios de horario.

### 4.2 Publicación `supabase_realtime` e Identidad de Réplica Completa
Tras la ejecución de la migración `20261107_theatre_cabimas_realtime.sql`, la publicación `supabase_realtime` incluye todas las tablas de emparejamiento, combate, economía y teatro operacional:
- `public.matchmaking_queue`
- `public.active_matches`
- `public.match_participants`
- `public.chat_messages`
- `public.territory_control`
- `public.p2p_market_orders`
- `public.state_sovereignty` (`REPLICA IDENTITY FULL`)
- `public.tactical_spatial_deployments` (`REPLICA IDENTITY FULL`)
- `public.tactical_fief_constructions` (`REPLICA IDENTITY FULL`)
- `public.region_operational_state` (`REPLICA IDENTITY FULL`)

```sql
-- Configuración activa en 20261107_theatre_cabimas_realtime.sql:
ALTER TABLE public.state_sovereignty REPLICA IDENTITY FULL;
ALTER TABLE public.tactical_spatial_deployments REPLICA IDENTITY FULL;
ALTER TABLE public.tactical_fief_constructions REPLICA IDENTITY FULL;
ALTER TABLE public.region_operational_state REPLICA IDENTITY FULL;
```

### 4.3 Hallazgos de Tipado Estático (`database.types.ts`) y Consistencia SQL
1. **Cobertura de `src/shared/types/database.types.ts`:**
   - El archivo `src/shared/types/database.types.ts` (4,278 líneas) incluye las definiciones completas hasta la Migración 25 (`20261103000003_v2_canonical_consolidation.sql`), cubriendo 47 tablas y 49 RPCs.
   - Las tablas y RPCs introducidas en las Migraciones 26 a 31 (`regions`, `region_adjacencies`, `region_sovereignty`, `territorial_battle_sessions`, `strategic_nodes`, `faction_unit_hangar`, `unit_production_queue`, `state_sovereignty`, `tactical_spatial_deployments`, `tactical_fief_constructions`, `region_operational_state`, `system_catalog_manifest`, `territorial_vulnerability_windows`) son consumidas actualmente mediante contratos de dominio explícitos (`src/shared/types/stateSovereigntyTypes.ts`, `src/domains/world/services/spatialDeploymentService.ts`, `src/shared/services/catalogRegistryService.ts`) e invocaciones `(supabase as any)`. Se recomienda regenerar `database.types.ts` con `supabase gen types typescript` tras aplicar las migraciones 26–31 en el entorno remoto.
2. **Resolución de Tabla de Perfiles en Funciones RBAC (`profiles` vs `player_profiles`):**
   - La tabla canónica de perfiles en `CONSOLIDATED_FULL_DATABASE_DEPLOY.sql` es `public.profiles` (con membresías detalladas en `public.clan_members`).
   - En `20261106_state_sovereignty_rbac.sql` (`is_sovereignty_authorized`) y `20261109_territorial_vulnerability_windows.sql` (`update_territorial_vulnerability_window`), el bloque `EXISTS` consulta `public.player_profiles` dentro de un bloque protegido por `EXCEPTION WHEN undefined_table THEN RETURN FALSE;` (o validación de rol). Para entornos donde no exista vista de compatibilidad `player_profiles`, la autorización puede resolverse contra `public.profiles` + `public.clan_members`.
3. **Exportación en Barrel `src/shared/index.ts`:**
   - `src/shared/index.ts` exporta `playerDb` (`playerDatabaseService.ts`) y `matchDb` (`matchDatabaseService.ts`), mientras que `catalogRegistry` (`src/shared/services/catalogRegistryService.ts`) se importa directamente por ruta de módulo.

---

## 5. DIAGNÓSTICO DE RENDIMIENTO, ESCALABILIDAD Y CONCURRENCIA

1. **Mitigación de Inundación de Eventos (Event Flood Filtering):**
   - Al usar celdas de 20 m a zoom $z \ge 15$, la resolución geográfica es alta ($50 \times 50 = 2,500$ celdas por sector de $1\text{ km}^2$).
   - **Implementación Activa:** `src/domains/world/services/spatialDeploymentService.ts` filtra las suscripciones Realtime a nivel de región (`filter: 'region_id=eq.REG_VE_02'`) en el canal `theatre:REG_VE_02`, evitando que clientes en otros estados reciban tráfico innecesario.
2. **Invariante de Ocupación $O(1)$ y Prevención de Race Conditions:**
   - La restricción de unicidad `UNIQUE (region_id, cell_key)` en `public.tactical_spatial_deployments` y `public.tactical_fief_constructions` previene colisiones de despliegue simultáneo (dos comandantes intentando ocupar la misma celda de 20 m en el mismo milisegundo). El primer `INSERT` persiste; el segundo recibe rechazo determinista (`23505 unique_violation`).
3. **Resiliencia Offline-First y Fallback Local:**
   - Si `isSupabaseConfigured()` es `false` (entorno de pruebas CI/CD o desconexión temporal), `stateSovereigntyService.ts`, `spatialDeploymentService.ts`, `catalogRegistryService.ts`, `playerDatabaseService.ts` y `matchDatabaseService.ts` operan sin interrupción sobre sus cachés en memoria y `localStorage`, garantizando 0 crashes en tiempo de ejecución.

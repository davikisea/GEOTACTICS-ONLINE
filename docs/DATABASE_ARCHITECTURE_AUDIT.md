# AUDITORÍA DE ARQUITECTURA DE BASE DE DATOS Y ESTADO DE PERSISTENCIA REALTIME
**Proyecto:** Tactical Command: Wars of Legacy (GEOTACTICS: ONLINE)  
**Teatro Operacional Inicial:** Zulia / Cabimas (`REG_VE_02`, Coordenadas WGS84: `[-71.455, 10.395]`)  
**Fecha de Auditoría:** 2026-11-06  
**Documento Relacionado:** `docs/04_MASTER_DATABASE_AND_SECURITY_SPEC.md`

---

## 1. RESUMEN EJECUTIVO

Esta auditoría técnica evalúa el estado del esquema relacional PostgreSQL en Supabase, el soporte de Row Level Security (RLS), la suscripción a eventos en tiempo real (`supabase_realtime`) y el desfase arquitectónico entre las estructuras volátiles en memoria (servicios TypeScript) y las tablas requeridas para garantizar la persistencia del teatro operacional Cabimas / Zulia (`REG_VE_02`).

### Diagnóstico Principal
1. **Soberanía y RBAC (`state_sovereignty`)**: Creada en la migración `20261106_state_sovereignty_rbac.sql` con RLS estricto (lectura pública y mutación por líderes/gestores de clan), pero **no está registrada en la publicación `supabase_realtime`**, y el servicio `stateSovereigntyService.ts` no carga el estado de la base de datos al inicializarse ni escucha eventos CDC (`postgres_changes`).
2. **Despliegues Espaciales y Construcciones In-Situ**: `spatialDeploymentService.ts`, `operationalUnitsService.ts` y `fiefBuildingService.ts` operan **100% en memoria** mediante `Map<string, ...>` volátiles sembrados por código. No existen tablas DDL en las migraciones para persistir unidades operacionales en coordenadas WGS84 / celdas $O(1)$ ni edificios in-situ de feudos.
3. **Topología Geopolítica (`regions`, `region_sovereignty`)**: La migración `20261104000001_geotactics_alpha_siege_and_venezuela_seed.sql` sembró 24 entidades (`REG_VE_01` a `REG_VE_24`), incluyendo `REG_VE_02` (Zulia - Maracaibo), pero carece de enlace reactivo para celdas de microjuego ($z \ge 15$).

---

## 2. MAPA DE DEPENDENCIAS Y DISPARIDAD EN MEMORIA VS. BASE DE DATOS

| Capa Funcional | Entidades en Memoria (TypeScript) | Estado en PostgreSQL (Supabase) | Disparidad / Brecha Arquitectónica |
| :--- | :--- | :--- | :--- |
| **Soberanía Geopolítica** | `StateSovereigntyRecord` (`stateSovereigntyService.ts`) | Tabla `public.state_sovereignty` (Migración `20261106`) | La tabla existe y tiene RLS, pero no está en `supabase_realtime`. Falta hidratación inicial `select()` en el cliente. |
| **Regiones y Soberanía Dual** | Coordenadas macro y bonos de nodo en `regions` | Tablas `public.regions`, `public.region_sovereignty`, `public.strategic_nodes` | Tablas creadas con seed básico. No sincronizadas vía Realtime ni vinculadas con el microjuego. |
| **Despliegue Operacional ($z \ge 10$)** | `DeployedOperationalUnit` (`operationalUnitsService.ts`, sembrado con 4 unidades estáticas) | **Inexistente** en DB. | Cualquier movimiento o despliegue de tropas desaparece al recargar la página. |
| **Microjuego Espacial ($z \ge 15$)** | `occupiedCells: Map<string, {unitId, buildingId}>` (`spatialDeploymentService.ts`) | **Inexistente** en DB. | Asignación analítica $O(1)$ funciona matemáticamente, pero los bloqueos de celdas no se comparten entre jugadores concurrentes. |
| **Construcciones de Feudos** | `ClanFief`, `FiefBuilding` (`fiefBuildingService.ts`, sembrado con La Salina Seaport) | **Inexistente** en DB. | Las inversiones de tesorería y construcción in-situ no persisten. |

---

## 3. AUDITORÍA DETALLADA DEL ESQUEMA RELACIONAL Y RLS

### 3.1 Tablas Existentes Relevantes
- `public.regions`: Catálogo de 24 regiones venezolanas. RLS habilitado con lectura pública.
- `public.region_sovereignty`: Estado de asedio y puntos de control (10,000 TCP). RLS lectura pública.
- `public.state_sovereignty`: Definición de soberanía estatal, nombres de nación y lemas de clan. RLS con función de validación `is_sovereignty_authorized`.
- `public.strategic_nodes`: Nodos provinciales (refinerías, silos, puertos). RLS lectura pública.

### 3.2 Publicación `supabase_realtime`
Actualmente solo están suscritas las siguientes tablas en migraciones históricas:
- `public.matchmaking_queue`
- `public.active_matches`
- `public.match_participants`
- `public.chat_messages`
- `public.territory_control`
- `public.p2p_market_orders`

> [!WARNING]
> Ni `state_sovereignty`, ni `region_sovereignty`, ni ninguna tabla táctica de despliegue operacional forman parte de la publicación `supabase_realtime`. Sin esto, los clientes no pueden recibir eventos CDC nativos de Postgres.

---

## 4. ESQUEMA OBJETIVO REQUERIDO (TEATRO CABIMAS / ZULIA `REG_VE_02`)

Para consolidar la Persistencia Realtime en Fase 3 y 4 se requieren las siguientes tablas canónicas:

1. **`public.tactical_spatial_deployments`**:
   - `id VARCHAR(64) PRIMARY KEY`
   - `region_id TEXT NOT NULL REFERENCES public.regions(id)` (ej. `REG_VE_02`)
   - `cell_key VARCHAR(64) NOT NULL` (ej. `9880_15432_0_11`, garantizando unicidad espacial $O(1)$)
   - `sector_x INT NOT NULL, sector_y INT NOT NULL, cell_x INT NOT NULL, cell_y INT NOT NULL`
   - `lat NUMERIC(9,6) NOT NULL, lng NUMERIC(9,6) NOT NULL`
   - `unit_code VARCHAR(32) NOT NULL, unit_name VARCHAR(64) NOT NULL`
   - `clan_id VARCHAR(64) NOT NULL, clan_tag VARCHAR(8) NOT NULL, faction_id VARCHAR(32) NOT NULL`
   - `callsign VARCHAR(64) NOT NULL, tier SMALLINT NOT NULL DEFAULT 1`
   - `hp SMALLINT NOT NULL DEFAULT 100, max_hp SMALLINT NOT NULL DEFAULT 100`
   - `status VARCHAR(24) NOT NULL DEFAULT 'holding'`
   - `color_hex VARCHAR(10) NOT NULL`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
   - `CONSTRAINT uq_spatial_cell_deployment UNIQUE (region_id, cell_key)`

2. **`public.tactical_fief_constructions`**:
   - `id VARCHAR(64) PRIMARY KEY`
   - `fief_id VARCHAR(64) NOT NULL`
   - `region_id TEXT NOT NULL REFERENCES public.regions(id) DEFAULT 'REG_VE_02'`
   - `cell_key VARCHAR(64) NOT NULL`
   - `sector_x INT NOT NULL, sector_y INT NOT NULL, cell_x INT NOT NULL, cell_y INT NOT NULL`
   - `lat NUMERIC(9,6) NOT NULL, lng NUMERIC(9,6) NOT NULL`
   - `building_type VARCHAR(32) NOT NULL`
   - `clan_id VARCHAR(64) NOT NULL`
   - `level SMALLINT NOT NULL DEFAULT 1`
   - `current_hp INT NOT NULL, max_hp INT NOT NULL`
   - `hourly_upkeep_ec INT NOT NULL DEFAULT 100`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
   - `CONSTRAINT uq_spatial_cell_construction UNIQUE (region_id, cell_key)`

3. **Publicación Realtime**:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE 
     public.state_sovereignty, 
     public.tactical_spatial_deployments, 
     public.tactical_fief_constructions;
   ```

4. **Identidad de Réplica Completa**:
   ```sql
   ALTER TABLE public.state_sovereignty REPLICA IDENTITY FULL;
   ALTER TABLE public.tactical_spatial_deployments REPLICA IDENTITY FULL;
   ALTER TABLE public.tactical_fief_constructions REPLICA IDENTITY FULL;
   ```

---

## 5. DIAGNÓSTICO DE RENDIMIENTO Y CONCURRENCIA

1. **Riesgo de Inundación de Eventos (Event Flood)**:
   - Al usar celdas de 20 m a zoom $z \ge 15$, la resolución geográfica es alta. Si miles de clientes se suscribieran a un canal global sin filtro, el ancho de banda del WebSocket se saturaría.
   - **Solución**: Filtrar suscripciones Realtime a nivel de región (`filter: 'region_id=eq.REG_VE_02'`).
2. **Invariante de Ocupación $O(1)$**:
   - La restricción de unicidad `UNIQUE (region_id, cell_key)` en PostgreSQL previene colisiones de despliegue simultáneo (Race Conditions de dos jugadores haciendo clic en la misma celda de 20 m en el mismo milisegundo). El primero persiste; el segundo recibe rechazo de base de datos (`23505 unique_violation`).
3. **Resiliencia Offline y Fallback Local**:
   - Si `supabase` no está configurado (entorno de pruebas CI/CD o desconexión), los servicios deben almacenar en caché en memoria y notificar a suscriptores locales sin lanzar excepciones no controladas.

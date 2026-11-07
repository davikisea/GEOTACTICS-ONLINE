# 🛠️ ESPECIFICACIÓN DE IMPLEMENTACIÓN: FEUDOS URBANOS, MICROGESTIÓN Y MERCADO PLAYER-DRIVEN

> **Documento:** `docs/PLAN_IMPLEMENTACION_FEUDOS_CADENA_INDUSTRIAL.md`  
> **Propósito:** Especificación canónica de tareas frontend (`@domains/economy`, `@domains/world`, `@domains/tactics`) y backend (Supabase / PostgreSQL) para la integración de la red intra-urbana, sistema de 10 parcelas, cadena industrial estilo *Project Alice / Albion Online*, ticker económico estilo *Wplace*, Hangar Físico de 16 tropas (CERO cartas) y colocación de assets en coordenadas.  
> **Estado:** 100% Implementado y Sincronizado con la Arquitectura Modular de 4 Dominios + Shared.

---

## 1. MÓDULOS DE BACKEND / SUPABASE (`supabase/migrations/`)

### 1.1 Modelo de Feudos Urbanos y Aduanas Portuarias (`clan_fiefs` & `ClanFief`)
Implementado en `src/shared/types/tacticalRoadTypes.ts` y `src/domains/economy/services/fiefBuildingService.ts`:
```sql
CREATE TABLE public.clan_fiefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_name VARCHAR(100) NOT NULL,
    sector_name VARCHAR(100) NOT NULL,
    controlling_clan_id VARCHAR(64) REFERENCES public.clans(id),
    center_location GEOMETRY(Point, 4326) NOT NULL,
    tax_rate_percent NUMERIC(4,2) DEFAULT 8.0, -- Peaje aduanero portuario sobre descarga de convoyes foráneos (0% a 25%)
    defense_level INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clan_fiefs_location ON public.clan_fiefs USING GIST(center_location);
```
> [!IMPORTANT] Separación entre Peaje Aduanero de Convoyes e Impuesto Canónico del Mercado P2P
> Mientras `tax_rate_percent` ($0\% - 25\%$) regula el peaje aduanero de descarga física de convoyes marítimos/terrestres foráneos en los muelles del feudo (`fiefBuildingService.canConvoyDischarge` / `executeSeaportDischarge`), el **Mercado Libre P2P (`public.p2p_market_orders` / `public.p2p_market_listings`)** se rige invariablemente por la **Regla Financiera Canónica: Impuesto total del 2.0% (1.0% quemado en Sink deflacionario + 1.0% regalía al Clan dueño del Hub regional) y bandas dinámicas VWAP Collar $\pm 25\%$** (`MASTER_METAGAME_CONSTANTS.TOTAL_P2P_TAX_RATE = 0.02`, `VWAP_COLLAR_PERCENT = 0.25`).

### 1.2 Construcciones In-Situ en Coordenadas OpenPlace (`fief_buildings` & `public.tactical_fief_constructions`)
Desplegado en producción mediante `supabase/migrations/20261107_theatre_cabimas_realtime.sql` con soporte CDC en `supabase_realtime`:
```sql
CREATE TABLE IF NOT EXISTS public.tactical_fief_constructions (
    id VARCHAR(64) PRIMARY KEY,
    fief_id VARCHAR(64) NOT NULL,
    region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    cell_key VARCHAR(64) NOT NULL,
    sector_x INTEGER NOT NULL,
    sector_y INTEGER NOT NULL,
    cell_x INTEGER NOT NULL,
    cell_y INTEGER NOT NULL,
    lat NUMERIC(9,6) NOT NULL,
    lng NUMERIC(9,6) NOT NULL,
    building_type VARCHAR(32) NOT NULL, -- 'refinery', 'microchip_foundry', 'weapons_factory', 'logistics_silo', 'radar_station', 'seaport_terminal'
    clan_id VARCHAR(64) NOT NULL,
    adjacent_road_segment_id VARCHAR(64),
    level SMALLINT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
    current_hp INTEGER NOT NULL DEFAULT 10000 CHECK (current_hp >= 0),
    max_hp INTEGER NOT NULL DEFAULT 10000 CHECK (max_hp > 0),
    hourly_upkeep_ec INTEGER NOT NULL DEFAULT 100 CHECK (hourly_upkeep_ec >= 0),
    constructed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_spatial_cell_construction UNIQUE (region_id, cell_key)
);
```

### 1.3 Cuadrícula de 10 Parcelas, Cola de Forja y Hangar Físico (`user_industrial_plots`, `unit_production_queue`, `user_unit_hangar`, `faction_unit_hangar`)
Desplegados en `supabase/migrations/20261031000013_economy_idle_rework_territorial_plots.sql`, `supabase/migrations/20261103000001_master_metagame_v2_rework.sql` y `supabase/migrations/20261105000001_geotactics_strategic_nodes_and_queues.sql`:
- **`public.user_industrial_plots`:** 10 parcelas por jugador (`plot_index` 1 a 10) con ciclo circadiano de 12h + 4h de gracia, merma suavizada del $1.5\%/\text{h}$ (piso de seguridad $60\%$) y $70\%$ de merma protegida en `Cargamento Varado` (`StrandedCargo`).
- **`public.user_unit_hangar` & `public.faction_unit_hangar`:** Almacén físico de **16 tropas máximo por jugador (4 slots de despliegue activo + 12 en reserva)**, con **CERO cartas (NO TCG/CCG ni gacha)**, operando a escala continua de **1 a 100 HP enteros (Pilar 2)** y **Tiers T1 a T5 con progresión horizontal estricta de +2% por tier (+0%, +2%, +4%, +6%, +8% máximo en T5, Pilar 4)**.
- **`public.unit_production_queue` & RPCs (`queue_unit_production`, `claim_finished_unit`):** Ensamblaje físico con tiempos deterministas ($0\text{s}$ para Infantería T1 y Recon T1 F2P; $60\text{s}$ a $1,800\text{s}$ base para unidades mecanizadas, blindadas, aéreas y navales).

---

## 2. MÓDULOS DE FRONTEND Y ARQUITECTURA DE DOMINIOS (`src/domains/`)

1. **Expansión del Grafo Vial Intra-Urbano (`src/domains/world/core/roadNetworkEngine.ts` / `@domains/world`):**
   * Implementa las avenidas intra-urbanas de Cabimas (`REG_VE_02`): Av. Intercomunal, Av. Miraflores, Av. Universidad, Av. Andrés Bello, Carretera H, Carretera K y Carretera F.
   * Valida la adyacencia vial obligatoria ($\le 150\text{ m}$ del asfalto) mediante `roadNetworkEngine.isLocationAdjacentToRoad(location, 0.15)`.

2. **Servicio de Feudos Urbanos y Marcas WPlace (`src/domains/economy/services/fiefBuildingService.ts` / `@domains/economy`):**
   * Administra los feudos semilleros de Cabimas (`fief-cabimas-centro`, `fief-cabimas-salina`, `fief-cabimas-punta-gorda`) y las estructuras `FIEF_BUILDING_SPECS`.
   * Ejecuta `placeBuilding`, `processHourlyBuildingTick`, `setFiefTariff`, `declareCommercialEmbargo`, `canConvoyDischarge`, `executeSeaportDischarge` y `toGeoJSON()`.
   * Evalúa los efectos funcionales de marcas tácticas WPlace (`applyTacticalMarkEffects`): `danger_mine` ($400\text{ HP}$ de daño en $200\text{ m}$), `rally_strike` ($+10\%$ ataque/moral en $500\text{ m}$) y `recon` (disipa niebla de guerra en $5$ celdas).

3. **Capa WebGL de Edificios y Tropas en Coordenadas (`src/domains/world/components/TacticalWorldMap.tsx` / `@domains/world`):**
   * Renderiza los edificios colocados en las parcelas y vías de la ciudad utilizando los sprites de `public/assets/spritesheets/neutral.png` (`factory`, `city`, `silo`, `radar`, `seaport`) y facciones heráldicas.
   * Integra el **Human Handshake de 120 segundos (2 minutos, Pilar 7)** en asedios territoriales antes de que asuma la IA de Guarnición (Niveles 1 a 5, `src/domains/tactics/core/garrisonAIEngine.ts`).

4. **Integración con la Cadena Industrial de 10 Parcelas y Ticker Wplace (`@domains/economy`):**
   * `src/domains/economy/core/industrialEngine.ts` (`IndustrialEngine`) y `src/domains/economy/components/IndustrialComplexView.tsx`: Gestionan las **10 parcelas por feudo/comandante**, la extracción primaria y las 7 recetas multi-batch (`REFINING_RECIPES`: `refined_steel`, `refined_concrete`, `refined_microchip`, `synthetic_fuel`, `optical_flir_sensor`, `composite_armor_plate`, `c4isr_bunker_kit`).
   * `src/domains/economy/hooks/useUserIndustry.ts`: Sincroniza en tiempo real `user_industrial_inventory` y `user_industrial_plots` con Supabase.
   * `src/domains/economy/hooks/useTerritoryEconomyTicker.ts` y `src/domains/economy/core/upkeepEngine.ts`: Ejecutan el **Ticker Económico Continuo estilo Wplace** (acumulación por minuto de EC y Acero), el mantenimiento energético imperial (`TerritorialUpkeepEngine`, `calculateImperialUpkeep`) y el **Buff Regional de Conquista de Capitales (+5% recursos/logística en la región, Pilar 5)**.

5. **Forja, Hangar Físico de 16 Tropas y Reciclaje de Chatarra al 35% (`@domains/economy` & `@domains/tactics`):**
   * `src/domains/economy/core/strategicAndProductionEngine.ts`, `src/domains/economy/hooks/useUserHangar.ts` y `src/domains/economy/components/UnitHangarModal.tsx`: Gestionan la forja y almacenamiento en el **Hangar Físico de 16 tropas (4 activas + 12 reserva, CERO cartas)** con **Tiers T1 a T5 (+2% por tier, máximo +8% en T5)**.
   * `src/domains/tactics/core/tacticalCombatSeamlessIntegration.ts` (`validateDoubleKeyDeployment`, `settleCombatLossesAndScrap`) y `src/shared/types/metagame.ts` (`calculateLossScrapRecovery`): Aplican la pérdida física real de unidades destruidas (donde **0 tropas supervivientes en el tablero = derrota inapelable, Pilar 3**) y acreditan el **35% de recuperación en chatarra tecnológica (`tech_scrap`, `RECYCLE_SCRAP_RATE = 0.35` / `SALVAGE_TECH_SCRAP_RATE = 0.35`, Pilar 6)**.

6. **Conexión con el Mercado Libre P2P (`src/domains/economy/components/P2PMarketplaceView.tsx` / `@domains/economy`):**
   * Opera el libro de órdenes conectado en vivo a Supabase (`public.p2p_market_orders` y RPC `execute_p2p_market_transaction` / `execute_p2p_trade_v2`) aplicando estrictamente el **Impuesto P2P del 2% (1% quemado en Sink + 1% regalía al Clan dueño del Hub regional)** y las **bandas dinámicas VWAP Collar $\pm 25\%$**.

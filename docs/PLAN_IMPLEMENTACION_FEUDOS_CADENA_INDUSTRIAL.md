# 🛠️ ESPECIFICACIÓN DE IMPLEMENTACIÓN: FEUDOS URBANOS, MICROGESTIÓN Y MERCADO PLAYER-DRIVEN

> **Documento:** `docs/PLAN_IMPLEMENTACION_FEUDOS_CADENA_INDUSTRIAL.md`  
> **Propósito:** Especificación de tareas frontend y backend para la integración de la red intra-urbana, economía tipo Albion y colocación de assets en coordenadas.

---

## 1. MÓDULOS DE BACKEND / SUPABASE

### 1.1 Nueva Tabla: `clan_fiefs` (Feudos y Comunidades)
```sql
CREATE TABLE public.clan_fiefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_name VARCHAR(100) NOT NULL,
    sector_name VARCHAR(100) NOT NULL,
    controlling_clan_id VARCHAR(64) REFERENCES public.clans(id),
    center_location GEOMETRY(Point, 4326) NOT NULL,
    tax_rate_percent NUMERIC(4,2) DEFAULT 8.0, -- Arancel municipal sobre transacciones P2P
    defense_level INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clan_fiefs_location ON public.clan_fiefs USING GIST(center_location);
```

### 1.2 Nueva Tabla: `fief_buildings` (Edificios en Coordenadas OpenPlace)
```sql
CREATE TABLE public.fief_buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fief_id UUID REFERENCES public.clan_fiefs(id) ON DELETE CASCADE,
    clan_id VARCHAR(64) NOT NULL,
    building_type VARCHAR(64) NOT NULL, -- 'refinery', 'microchip_foundry', 'weapons_factory', 'harbor'
    location GEOMETRY(Point, 4326) NOT NULL,
    level INT DEFAULT 1,
    current_hp INT NOT NULL DEFAULT 5000,
    max_hp INT NOT NULL DEFAULT 5000,
    hourly_upkeep_ec INT NOT NULL DEFAULT 120,
    production_recipe_id VARCHAR(64),
    last_harvest_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fief_buildings_location ON public.fief_buildings USING GIST(location);
```

---

## 2. MÓDULOS DE FRONTEND (REACT 19 + MAPLIBRE GL)

1. **Expansión del Grafo Vial (`src/engine/roadNetworkEngine.ts`):**
   * Añadir las avenidas intra-urbanas de Cabimas: Av. Miraflores, Av. Universidad, Av. Hollywood, Carretera H, Carretera K.
2. **Capa WebGL de Edificios en Coordenadas (`src/components/world/TacticalWorldMap.tsx`):**
   * Renderizar los edificios colocados en la cuadrícula de la ciudad utilizando los sprites de `public/assets/spritesheets/neutral.png` (fábricas, refinerías, radares).
3. **Integración con la Cadena Industrial (`src/engine/industrialEngine.ts`):**
   * Vincular las recetas de crafteo de microchips, acero blindado y combustible refinado a los edificios ubicados en el mapa.
   * Conectar con `P2PMarketplaceView.tsx` para que cada feudo urbano tenga su propio libro de órdenes local con tarifas arancelarias fijadas por el clan soberano.

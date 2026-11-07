-- ==============================================================================
-- MIGRACIÓN CANÓNICA: MANIFIESTO DE CATÁLOGOS ESTÁTICOS Y GOBERNANZA DE BALANCE
-- ==============================================================================
-- Especificación: plan_catalog_ssot_synchronization.md
-- Tablas: public.system_catalog_manifest
-- RPC: public.get_catalog_manifest_header(), public.refresh_catalog_manifest()
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_catalog_manifest (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'current',
    version_tag VARCHAR(32) NOT NULL DEFAULT 'v1.0.0-canonical',
    content_hash VARCHAR(64) NOT NULL,
    bundle_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    tables_included TEXT[] NOT NULL DEFAULT ARRAY[
        'units_catalog',
        'terrain_catalog',
        'commanders_catalog',
        'unit_weapon_damage_matrix',
        'world_countries',
        'cosmetics_catalog',
        'store_products_catalog'
    ]::TEXT[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.system_catalog_manifest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_catalog_manifest_read_all" ON public.system_catalog_manifest;
CREATE POLICY "system_catalog_manifest_read_all"
    ON public.system_catalog_manifest
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "system_catalog_manifest_auth_write" ON public.system_catalog_manifest;
CREATE POLICY "system_catalog_manifest_auth_write"
    ON public.system_catalog_manifest
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 1. RPC: get_catalog_manifest_header (Chequeo ultrarrápido < 15ms en Boot Screen)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_catalog_manifest_header()
RETURNS TABLE (
    version_tag VARCHAR,
    content_hash VARCHAR,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        scm.version_tag, 
        scm.content_hash, 
        scm.updated_at 
    FROM public.system_catalog_manifest scm 
    WHERE scm.id = 'current'
    LIMIT 1;
$$;

-- ------------------------------------------------------------------------------
-- 2. RPC: refresh_catalog_manifest (Compilación y Hashing SHA-256 en Servidor)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_catalog_manifest(p_version_tag TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_units JSONB;
    v_terrains JSONB;
    v_commanders JSONB;
    v_damage_matrix JSONB;
    v_countries JSONB;
    v_cosmetics JSONB;
    v_store_products JSONB;
    v_bundle JSONB;
    v_bundle_text TEXT;
    v_hash TEXT;
    v_version TEXT;
BEGIN
    -- 1. Extraer unidades
    SELECT jsonb_agg(u ORDER BY u.id) INTO v_units
    FROM public.units_catalog u;

    -- 2. Extraer terrenos
    SELECT jsonb_agg(t ORDER BY t.id) INTO v_terrains
    FROM public.terrain_catalog t;

    -- 3. Extraer comandantes
    SELECT jsonb_agg(c ORDER BY c.id) INTO v_commanders
    FROM public.commanders_catalog c;

    -- 4. Extraer matriz de daño balístico
    SELECT jsonb_agg(d ORDER BY d.id) INTO v_damage_matrix
    FROM public.unit_weapon_damage_matrix d;

    -- 5. Extraer países
    SELECT jsonb_agg(wc ORDER BY wc.iso_code) INTO v_countries
    FROM public.world_countries wc;

    -- 6. Extraer cosméticos
    SELECT COALESCE(jsonb_agg(co ORDER BY co.id), '[]'::jsonb) INTO v_cosmetics
    FROM public.cosmetics_catalog co;

    -- 7. Extraer tienda
    SELECT COALESCE(jsonb_agg(sp ORDER BY sp.id), '[]'::jsonb) INTO v_store_products
    FROM public.store_products_catalog sp;

    -- Consolidar el bundle canónico
    v_bundle := jsonb_build_object(
        'units', COALESCE(v_units, '[]'::jsonb),
        'terrains', COALESCE(v_terrains, '[]'::jsonb),
        'commanders', COALESCE(v_commanders, '[]'::jsonb),
        'damage_matrix', COALESCE(v_damage_matrix, '[]'::jsonb),
        'countries', COALESCE(v_countries, '[]'::jsonb),
        'cosmetics', v_cosmetics,
        'store_products', v_store_products
    );

    v_bundle_text := v_bundle::text;
    v_hash := encode(digest(v_bundle_text, 'sha256'), 'hex');
    v_version := COALESCE(p_version_tag, 'v1.0.0-' || substring(v_hash from 1 for 8));

    INSERT INTO public.system_catalog_manifest (
        id, version_tag, content_hash, bundle_json, updated_at
    ) VALUES (
        'current', v_version, v_hash, v_bundle, timezone('utc', now())
    ) ON CONFLICT (id) DO UPDATE SET
        version_tag = EXCLUDED.version_tag,
        content_hash = EXCLUDED.content_hash,
        bundle_json = EXCLUDED.bundle_json,
        updated_at = timezone('utc', now());

    RETURN jsonb_build_object(
        'success', true,
        'version_tag', v_version,
        'content_hash', v_hash,
        'updated_at', timezone('utc', now())
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. SEED DETERMINISTA INICIAL DEL MANIFIESTO
-- ------------------------------------------------------------------------------
SELECT public.refresh_catalog_manifest('v1.0.0-canonical-genesis');

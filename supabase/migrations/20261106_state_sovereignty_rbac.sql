-- ==============================================================================
-- MIGRACIÓN CANÓNICA: SOBERANÍA TERRITORIAL DE ESTADOS Y CONTROL RBAC C4ISR
-- ==============================================================================
-- Especificación: docs/PROPUESTA_INGENIERIA_MAPA_METAPOLITICA_ALICE_CABIMAS.md
-- Tabla: public.state_sovereignty
-- RLS: Lectura pública; Escritura restringida a Líderes de Clan y Gestores de Facción
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.state_sovereignty (
  state_id VARCHAR(64) PRIMARY KEY,
  country_id VARCHAR(64) NOT NULL DEFAULT 'COUNTRY_VEN',
  canonical_country_name TEXT NOT NULL DEFAULT 'República de Venezuela',
  custom_country_name TEXT NOT NULL DEFAULT 'República Soberana de Venezuela',
  canonical_state_name TEXT NOT NULL,
  custom_state_name TEXT NOT NULL,
  controlling_faction_id VARCHAR(32) NOT NULL DEFAULT 'blue_moon',
  controlling_clan_id VARCHAR(64) NOT NULL DEFAULT 'clan-ferro',
  tcp_current INTEGER NOT NULL DEFAULT 10000 CHECK (tcp_current >= 0 AND tcp_current <= 10000),
  tcp_max INTEGER NOT NULL DEFAULT 10000,
  gdp_war_credits_per_hour INTEGER NOT NULL DEFAULT 5000,
  defense_level INTEGER NOT NULL DEFAULT 3 CHECK (defense_level >= 1 AND defense_level <= 5),
  custom_motto TEXT,
  sovereign_proclamation TEXT,
  updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.state_sovereignty ENABLE ROW LEVEL SECURITY;

-- Índice para consultas rápidas por facción y país
CREATE INDEX IF NOT EXISTS idx_state_sovereignty_faction ON public.state_sovereignty(controlling_faction_id);
CREATE INDEX IF NOT EXISTS idx_state_sovereignty_country ON public.state_sovereignty(country_id);

-- Política 1: Lectura libre para todos los comandantes y observadores en el mapa
CREATE POLICY "state_sovereignty_public_read"
  ON public.state_sovereignty
  FOR SELECT
  USING (true);

-- Función de ayuda de seguridad para comprobar rol de líder de clan o gestor de facción
CREATE OR REPLACE FUNCTION public.is_sovereignty_authorized(target_clan_id VARCHAR(64))
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clan_members cm
    WHERE cm.user_id = auth.uid()
      AND (cm.clan_id = target_clan_id OR cm.role IN ('leader', 'officer'))
  )
  OR EXISTS (
    SELECT 1 FROM public.player_profiles pp
    WHERE pp.id = auth.uid()
      AND (pp.is_admin = true OR pp.metadata->>'is_faction_manager' = 'true')
  );
$$;

-- Política 2: Inserción y Actualización exclusiva para comandantes autorizados
CREATE POLICY "state_sovereignty_leader_update"
  ON public.state_sovereignty
  FOR ALL
  TO authenticated
  USING (
    public.is_sovereignty_authorized(controlling_clan_id)
  )
  WITH CHECK (
    public.is_sovereignty_authorized(controlling_clan_id)
  );

-- Comentarios explicativos canónicos
COMMENT ON TABLE public.state_sovereignty IS 'SSOT de soberanía estatal, nombres proclamados de países/estados y control territorial en GEOTACTICS.';

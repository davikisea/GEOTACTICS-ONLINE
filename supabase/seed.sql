-- ============================================================================
-- SCRIPT CANÓNICO DE SEMILLAS (SEED DATA)
-- Proyecto: Tactical Command: Wars of Legacy
-- Especificación: docs/orchestration/00_MASTER_EXECUTION_PLAN.md (Fase 3)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USUARIOS DE AUTENTICACIÓN LOCAL / DESARROLLO (auth.users)
-- ----------------------------------------------------------------------------
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
) VALUES 
(
    'a0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'commander1@tactical.local',
    crypt('tactical2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"username": "Commander_Alpha", "display_name": "Mayor General Stella"}'::jsonb,
    false,
    now(),
    now()
),
(
    'a0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'commander2@tactical.local',
    crypt('tactical2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"username": "Commander_Beta", "display_name": "Brigadier Bren"}'::jsonb,
    false,
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. PERFILES MILITARES (public.profiles)
-- ----------------------------------------------------------------------------
INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    account_level,
    current_xp,
    battle_credits,
    command_gems,
    elo_rating,
    total_matches_played,
    total_victories,
    equipped_loadout,
    equipped_cosmetics,
    created_at,
    updated_at
) VALUES 
(
    'a0000000-0000-0000-0000-000000000001',
    'Commander_Alpha',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150',
    10,
    1450,
    18500,
    350,
    1420,
    45,
    32,
    '["infantry", "mech", "recon", "tank_light", "artillery", "anti_air", "b_copter"]'::jsonb,
    '{
        "tank_light": "skin_default",
        "infantry": "skin_default",
        "artillery": "skin_default",
        "avatar_frame": "frame_recruit",
        "hq_banner": "banner_standard"
    }'::jsonb,
    now(),
    now()
),
(
    'a0000000-0000-0000-0000-000000000002',
    'Commander_Beta',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=150',
    8,
    820,
    12400,
    180,
    1310,
    30,
    18,
    '["infantry", "mech", "recon", "tank_light", "artillery", "anti_air", "neotank"]'::jsonb,
    '{
        "tank_light": "skin_default",
        "infantry": "skin_default",
        "artillery": "skin_default",
        "avatar_frame": "frame_recruit",
        "hq_banner": "banner_standard"
    }'::jsonb,
    now(),
    now()
)
ON CONFLICT (id) DO UPDATE SET
    account_level = EXCLUDED.account_level,
    battle_credits = EXCLUDED.battle_credits,
    command_gems = EXCLUDED.command_gems,
    elo_rating = EXCLUDED.elo_rating;

-- ----------------------------------------------------------------------------
-- 3. DESBLOQUEOS INICIALES (public.user_unlocks)
-- ----------------------------------------------------------------------------
INSERT INTO public.user_unlocks (user_id, item_type, item_id, acquisition_method)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'co_commander', 'stella', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'co_commander', 'bren', 'level_reward'),
    ('a0000000-0000-0000-0000-000000000001', 'co_commander', 'rachel', 'level_reward'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'infantry', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'mech', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'recon', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'tank_light', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'artillery', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'anti_air', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'b_copter', 'starter'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'apc', 'credits_purchase'),
    ('a0000000-0000-0000-0000-000000000001', 'unit', 'neotank', 'credits_purchase'),

    ('a0000000-0000-0000-0000-000000000002', 'co_commander', 'bren', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'co_commander', 'colin', 'credits_purchase'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'infantry', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'mech', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'recon', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'tank_light', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'artillery', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'anti_air', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'b_copter', 'starter'),
    ('a0000000-0000-0000-0000-000000000002', 'unit', 'neotank', 'credits_purchase')
ON CONFLICT (user_id, item_type, item_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. PARTIDA MODELO DE PRUEBA (public.active_matches)
-- ----------------------------------------------------------------------------
INSERT INTO public.active_matches (
    id,
    room_code,
    player1_id,
    player2_id,
    current_turn_player_id,
    status,
    game_mode,
    map_id,
    turn_number,
    created_at,
    updated_at
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'WAR7777',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'in_progress',
    'pvp_realtime',
    'canonical_spade_island_16x16',
    1,
    now(),
    now()
)
ON CONFLICT (room_code) DO NOTHING;

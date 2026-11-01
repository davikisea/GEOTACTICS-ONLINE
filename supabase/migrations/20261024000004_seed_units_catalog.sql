-- ============================================================================
-- MIGRACIÓN 4: SEED DATA CANÓNICO DE UNIDADES TÁCTICAS
-- Proyecto: Tactical Command: Wars of Legacy
-- Fecha: 2026-10-24
-- ============================================================================

INSERT INTO public.units_catalog (
    id, display_name, category, hp_max, base_attack, min_range, max_range,
    movement_points, movement_type, vision_range, production_cost_g,
    ammo_max, fuel_max, required_account_level, unlock_cost_credits, is_base_unlocked
) VALUES
('infantry', 'Infantería Ligera', 'infantry', 10, 55, 1, 1, 3, 'foot', 3, 1000, 99, 99, 1, 0, true),
('mech', 'Infantería Pesada (Bazuca)', 'infantry', 10, 65, 1, 1, 2, 'mech', 2, 3000, 3, 70, 2, 0, true),
('recon', 'Vehículo de Reconocimiento', 'vehicle', 10, 60, 1, 1, 8, 'wheels', 5, 4000, 99, 80, 1, 0, true),
('tank_light', 'Tanque de Combate Ligero', 'vehicle', 10, 75, 1, 1, 6, 'treads', 3, 7000, 9, 70, 1, 0, true),
('tank_medium', 'Tanque Blindado Mediano', 'vehicle', 10, 105, 1, 1, 5, 'treads', 1, 16000, 8, 50, 7, 1200, false),
('artillery', 'Artillería de Obús Móvil', 'indirect', 10, 80, 2, 3, 5, 'treads', 1, 6000, 9, 50, 1, 0, true),
('rocket', 'Lanzacohetes de Asedio', 'indirect', 10, 95, 3, 5, 5, 'wheels', 1, 15000, 6, 50, 6, 1000, false),
('anti_air', 'Blindado Antiaéreo Vulcano', 'vehicle', 10, 100, 1, 1, 6, 'treads', 2, 8000, 9, 60, 3, 0, true),
('b_copter', 'Helicóptero de Ataque', 'aircraft', 10, 75, 1, 1, 6, 'air', 3, 9000, 6, 99, 4, 0, true),
('fighter', 'Caza de Supremsacía Aérea', 'aircraft', 10, 100, 1, 1, 9, 'air', 4, 20000, 9, 99, 9, 1500, false),
('bomber', 'Bombardero Táctico Pesado', 'aircraft', 10, 110, 1, 1, 7, 'air', 2, 22000, 9, 99, 12, 1800, false),
('battleship', 'Acorazado Naval de Guerra', 'naval', 10, 90, 2, 6, 5, 'sea', 2, 28000, 9, 99, 15, 2500, false)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    production_cost_g = EXCLUDED.production_cost_g,
    base_attack = EXCLUDED.base_attack,
    movement_points = EXCLUDED.movement_points,
    min_range = EXCLUDED.min_range,
    max_range = EXCLUDED.max_range,
    vision_range = EXCLUDED.vision_range;

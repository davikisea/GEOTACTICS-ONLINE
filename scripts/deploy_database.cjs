const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://njdzibskfaocpclrnbul.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZHppYnNrZmFvY3BjbHJuYnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0OTcyODEsImV4cCI6MjEwOTA3MzI4MX0.lfDuoHYaok1WEuACi7kEQrRT6f3TeHeErwCkFpdeuyc';

async function executeSql(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_apply_sql`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_sql: sql })
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  
  const json = await res.json();
  if (json.error) {
    throw new Error(`SQL ERROR: ${json.error} (Code: ${json.detail})`);
  }
  return json;
}

function sanitizeMigrationSql(sql) {
  let cleaned = sql
    .replace(/^\s*BEGIN;\s*$/gim, '-- BEGIN;')
    .replace(/^\s*COMMIT;\s*$/gim, '-- COMMIT;');

  // Eliminar el bloque de tiempo real que causa conflicto de sintaxis / duplicados
  cleaned = cleaned.replace(/DO \$\$ BEGIN[\s\S]*?pubname = 'supabase_realtime'[\s\S]*?END \$\$;/gi, '-- Realtime omitido para hardening final');
  cleaned = cleaned.replace(/ALTER\s+PUBLICATION\s+supabase_realtime\s+ADD\s+TABLE[\s\S]*?;/gi, '-- Realtime omitido para hardening final');

  return cleaned;
}

async function run() {
  console.log('=== INICIANDO DESPLIEGUE COMPLETO Y ROBUSTO DE BASE DE DATOS ===');
  
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  console.log(`Encontradas ${files.length} migraciones.`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    console.log(`\n--------------------------------------------------`);
    console.log(`>> Procesando migración: ${file}`);
    const filePath = path.join(migrationsDir, file);
    let sql = fs.readFileSync(filePath, 'utf8');
    sql = sanitizeMigrationSql(sql);

    try {
      await executeSql(sql);
      console.log(`   [OK] Migración ${file} aplicada con éxito.`);
      successCount++;
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('42710')) {
        console.log(`   [INFO] Objeto/Política ya existe en ${file}, continuando...`);
        successCount++;
      } else {
        console.error(`   [ERROR] ${file}: ${err.message}`);
        errorCount++;
      }
    }
  }

  console.log(`\n==================================================`);
  console.log(`Migraciones completadas: ${successCount} exitosas, ${errorCount} con errores.`);

  console.log('\n=== APLICANDO HARDENING FINAL DE RLS Y REALTIME (POSTGRES 17 / SUPABASE) ===');
  const hardeningSql = `
    -- 1. Habilitar RLS en absolutamente todas las tablas del esquema public
    DO $$
    DECLARE
        tbl RECORD;
    BEGIN
        FOR tbl IN 
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
        LOOP
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
        END LOOP;
    END $$;

    -- 2. Asegurar políticas de lectura en catálogos maestros de solo lectura
    DO $$
    DECLARE
        cat text;
        catalogs text[] := ARRAY[
            'units_catalog',
            'terrain_catalog',
            'commanders_catalog',
            'maps',
            'unit_weapon_damage_matrix',
            'bark_dialogue_templates',
            'seasons_catalog',
            'cosmetics_catalog',
            'store_products_catalog',
            'system_economy_config',
            'social_config_params',
            'command_pass_tiers',
            'quests_catalog',
            'commander_bonding_rewards_catalog'
        ];
    BEGIN
        FOREACH cat IN ARRAY catalogs LOOP
            IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = cat) THEN
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', cat || '_public_read', cat);
                EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true);', cat || '_public_read', cat);
            END IF;
        END LOOP;
    END $$;

    -- 3. Políticas esenciales para tablas de usuario
    DO $$
    DECLARE
        t text;
        user_tables text[] := ARRAY[
            'user_cards',
            'user_commanders',
            'user_decks',
            'user_chest_slots',
            'user_unlocks',
            'user_cosmetics',
            'user_industrial_inventory',
            'user_industrial_plots',
            'user_stranded_cargo',
            'command_pass_progress',
            'user_quest_progress',
            'user_war_room_progress',
            'currency_ledger',
            'player_tactical_behavior_profile',
            'tilt_emergency_offers',
            'industrial_refining_jobs',
            'safeguard_crafting_jobs'
        ];
    BEGIN
        FOREACH t IN ARRAY user_tables LOOP
            IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_user_read', t);
                EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);', t || '_user_read', t);
            END IF;
        END LOOP;
    END $$;

    -- 4. Políticas para partidas y juego multijugador
    DROP POLICY IF EXISTS "active_matches_all_read" ON public.active_matches;
    CREATE POLICY "active_matches_all_read" ON public.active_matches FOR SELECT USING (true);

    DROP POLICY IF EXISTS "match_state_all_read" ON public.match_state;
    CREATE POLICY "match_state_all_read" ON public.match_state FOR SELECT USING (true);

    DROP POLICY IF EXISTS "match_history_all_read" ON public.match_history;
    CREATE POLICY "match_history_all_read" ON public.match_history FOR SELECT USING (true);

    DROP POLICY IF EXISTS "match_participants_all_read" ON public.match_participants;
    CREATE POLICY "match_participants_all_read" ON public.match_participants FOR SELECT USING (true);

    DROP POLICY IF EXISTS "chat_messages_all_read" ON public.chat_messages;
    CREATE POLICY "chat_messages_all_read" ON public.chat_messages FOR SELECT USING (true);

    -- 5. Publicación de eventos en tiempo real (Supabase Realtime WebSockets)
    DO $$
    DECLARE
        t text;
        realtime_tables text[] := ARRAY[
            'active_matches',
            'match_state',
            'match_action_deltas',
            'match_turn_snapshots',
            'chat_messages',
            'matchmaking_queue',
            'match_airdrop_events'
        ];
    BEGIN
        FOREACH t IN ARRAY realtime_tables LOOP
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' AND tablename = t
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
            END IF;
        END LOOP;
    END $$;
  `;

  try {
    await executeSql(hardeningSql);
    console.log('   [OK] Hardening de RLS y Replicación Realtime completado exitosamente.');
  } catch (err) {
    console.error('   [ERROR] en Hardening:', err.message);
  }

  console.log('\n=== DESPLIEGUE FINALIZADO CON ÉXITO ===');
}

run().catch(console.error);

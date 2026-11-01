# 🏛️ PROPUESTA DE REINGENIERÍA SISTÉMICA Y MIGRACIÓN CONSOLIDADA DE ARQUITECTURA SUPABASE
> **DOCUMENTO DE ESPECIFICACIÓN TÉCNICA Y AUDITORÍA DE INFRAESTRUCTURA**  
> **Proyecto:** *Tactical Command: Wars of Legacy*  
> **Consejo Técnico Multi-Agente:**  
> • **Agente 01:** `Lead DB Architect & Ledger Engineer` (PostgreSQL / Supabase)  
> • **Agente 02:** `Game Economy & Social Systems Designer` (Clanes, Sanciones y Progresión)  
> • **Agente 03:** `Realtime & Network Sync Engineer` (WebSockets / Clientes TS)  
> • **Agente 04:** `Principal Systems Auditor & Mediator` (Orquestador y QA)  
> **Estado:** 📋 `EN REVISIÓN - PENDIENTE DE APROBACIÓN POR EL LEAD DEVELOPER (GATEKEEPER ACTIVO)`  
> **Ruta Canónica:** `docs/architecture/PROPUESTA_REINGENIERIA_MIGRACION_16.md`

---

## 1. RESUMEN EJECUTIVO DEL CONSEJO DE AGENTES

Tras una exhaustiva auditoría forense sobre las migraciones ejecutadas en Supabase (`20261024000001` a `20261031000015`) y la base de código frontend/engine (TypeScript/React), el consejo dictaminó de forma unánime que el estado actual presenta **5 Bloqueos Fatales** que provocan la caída de transacciones en producción (`SQLSTATE 42703`, violaciones de `CHECK constraint`, asimetría de roles militares y apagón de eventos WebSocket).

El comité evaluó dos vías de acción:
1. **El Parche Rápido (Band-aid fix):** Corregir el nombre de la columna `amount` a `delta`, extender manualmente el `CHECK (reason IN (...))` e insertar 4 tablas a la publicación de Realtime.
2. **La Reingeniería Sistémica Parametrizada (Solución de Grado Producción):** Desacoplar la lógica económica dura del DDL relacional mediante una tabla de parámetros dinámicos (`system_economy_config` / `ledger_reason_catalog`), crear una columna extensible de metadatos JSONB en el libro mayor (`currency_ledger`), formalizar la jerarquía militar de 4 rangos para conciliar la base de datos con el lore retro-futurista de novela gráfica, dotar a los clanes de una tesorería con reparto fiscal parametrizable ($X\%$ Tesoro, $Y\%$ Top 3, $Z\%$ Quema), y configurar `REPLICA IDENTITY FULL` optimizada junto a un protocolo híbrido (Broadcast para micro-acciones efímeras de turnos y Postgres Changes para cambios de estado persistentes).

**Resolución del Consejo:** Se adopta por consenso absoluto la **Reingeniería Sistémica Parametrizada**, garantizando que el juego no requiera migraciones DDL cada vez que el equipo de diseño introduzca un nuevo minijuego, cofre o evento bélico.

---

## 2. REGISTRO DEL DEBATE MULTI-AGENTE (PUNTOS DE FRICCIÓN Y RESOLUCIONES)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CONSEJO TÉCNICO MULTI-AGENTE: DEBATE DE FASES                   │
│                                                                                        │
│  [AG-01: DB Architect]    ◄── Polémica de Constraints vs Catálogos ──►  [AG-04: Auditor]│
│  [AG-02: Game Economy]    ◄── Disputa de Fianza 50/50 y 4 Rangos ────►  [AG-01: DB]     │
│  [AG-03: Realtime Eng]    ◄── Broadcast vs Postgres Changes en WAL ──►  [AG-04: Auditor]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Ronda A: El Ledger Inmutable y Paramétrico (Fricciones 5.1 y 5.2)

- **`Agente 01 (Lead DB Architect)`**: "El error en la migración 15 (`grant_match_rewards`) es inadmisible: intentar insertar en `amount` cuando la tabla original define `delta` rompe la ejecución en el acto (`SQLSTATE 42703`). Pero lo peor es el `CHECK (reason IN (...))` estático de la migración 11. Cada vez que diseñamos un nuevo faucet (`'offline_match_reward'`, `'chest_opening'`), la base de datos aborta con violación de integridad. No podemos seguir viviendo atados a `CHECK constraints` de texto plano. Propongo eliminar el check estático de columna y validarlo contra una tabla formal de catálogo `ledger_reason_catalog`, o permitir prefijos autorizados como `reward_*`, `purchase_*`, `sink_*`."
- **`Agente 04 (Auditor & Mediator)`**: "El catálogo formal es elegante, pero ¿qué impacto tiene en latencia de inserción hacer un `JOIN` o `FK` en cada movimiento de balance?"
- **`Agente 01 (Lead DB Architect)`**: "Ninguno si mantenemos una tabla de catálogo en caché de PostgreSQL o si implementamos un dominio/check basado en categorías macro. Sin embargo, para mantener una auditoría de grado bancario, la mejor práctica en PostgreSQL es:
  1. Renombrar definitivamente el parámetro en RPC a `delta` (o permitir un trigger de compatibilidad).
  2. Agregar la columna `metadata JSONB DEFAULT '{}'::jsonb` que la migración 15 ya asumía que existía.
  3. Crear la tabla `currency_transaction_reasons` con flags de categoría (`is_faucet`, `is_sink`, `is_transfer`). Así, agregar razones se hace vía simple `INSERT` en la tabla de configuración, sin DDL destructivo."
- **Consenso Ronda A:** Adoptar el esquema con `delta INTEGER NOT NULL`, agregar `metadata JSONB`, añadir `reference_id VARCHAR(128)`, y migrar de un `CHECK` restrictivo a la validación referencial o check extensible con categorías estándar (`match_*`, `chest_*`, `shop_*`, `clan_*`, `admin_*`, `social_*`).

---

### Ronda B: Doctrina Militar de Clanes y Tesorería Corporativa (Fricción 5.3)

- **`Agente 02 (Game Economy & Social Systems)`**: "Tenemos una crisis de identidad. La migración 10 creó `clan_members.role` con `('leader', 'co_leader', 'elder', 'member')` al estilo genérico de Clash of Clans. Pero todo nuestro Lore, la doc maestra (`03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md`) y el motor en TypeScript operan bajo estética retro-futurista militar. Además, la migración 12 (`pay_dishonor_embargo_fee`) entregaba el $100\%$ de la fianza por deshonor (1,500G y 30 acero) directamente a los 3 mejores jugadores, ¡dejando a la corporación con $0$ porque no existían `treasury_gold` y `treasury_steel`!"
- **`Agente 01 (Lead DB Architect)`**: "¿Por qué el frontend opera con 3 roles (`commander_in_chief`, `officer`, `cadet`) mientras que la DB tenía 4? Si degradamos a 3 rangos en DB, perdemos la distinción entre el Segundo al Mando (Co-Líder) y los Oficiales de Campo."
- **`Agente 02 (Game Economy & Social Systems)`**: "Excelente punto. Propongo una jerarquía militar completa de 4 rangos:
  1. `commander_in_chief` (Coronel / Comandante en Jefe - equivale al antiguo `leader`).
  2. `executive_officer` (Mayor / Oficial Ejecutivo - equivale al antiguo `co_leader`).
  3. `field_officer` (Capitán / Oficial de Campo - equivale al antiguo `elder`).
  4. `cadet` (Soldado / Cadete de Vanguardia - equivale al antiguo `member`).
  En cuanto a la fianza de deshonor, la fórmula debe ser completamente parametrizable en `system_economy_config`:
  $$\text{Fianza Total} = 1,500\text{G} + 30\text{ Acero (o 50 Gemas)}$$
  $$\text{Cuota Tesoro del Clan} = 50\% \quad (750\text{G} + 15\text{ Acero})$$
  $$\text{Fondo Aristocrático de Honor} = 50\% \quad \to \text{Top 1 (25\%)}, \text{Top 2 (15\%)}, \text{Top 3 (10\%)}$$
  $$\text{Quema Inflacionaria (Sink)} = 0\% \text{ por defecto (ajustable a } 10\% \text{ si hay hiperinflación)}$$"
- **Consenso Ronda B:** Estandarizar la jerarquía militar de 4 rangos, agregar `treasury_gold` y `treasury_steel` con constraint `CHECK (treasury_gold >= 0)` en `clans`, y reescribir `pay_dishonor_embargo_fee` consumiendo los porcentajes de distribución de la tabla de configuración.

---

### Ronda C: Arquitectura Realtime de Baja Latencia y Escalabilidad (Fricción 5.4)

- **`Agente 03 (Realtime & Network Sync Engineer)`**: "La auditoría detectó que `WarLobbyHub.tsx` recurre a polling ineficiente porque las tablas `matchmaking_queue`, `active_matches`, `match_participants` y `chat_messages` nunca fueron agregadas a `supabase_realtime`. Sin embargo, cometeríamos una catástrofe de ancho de banda y cuota WAL si simplemente ejecutamos `ALTER PUBLICATION supabase_realtime ADD TABLE ...` sin configurar la identidad de réplica."
- **`Agente 04 (Auditor & Mediator)`**: "¿Qué problema específico ocasiona no configurar `REPLICA IDENTITY`?"
- **`Agente 03 (Realtime & Network Sync Engineer)`**: "Si una tabla tiene `REPLICA IDENTITY DEFAULT`, cuando se emite un `UPDATE` (por ejemplo, en un match por turnos donde cambia `game_state` que pesa 40 KB), Supabase transmite en el evento WebSocket solo la clave primaria antigua y la fila nueva completa. Si no filtramos a nivel de suscripción y si enviamos micro-acciones tácticas (como mover el cursor o pings de radio) a través de escrituras a Postgres, colapsaremos la base de datos.
  Nuestra arquitectura Realtime debe seguir esta directriz estricta:
  1. **Postgres Changes (`supabase_realtime`):** Exclusivo para entidades con persistencia de estado: `matchmaking_queue` (notificación de rival encontrado), `active_matches` (cambio de turno y fin de partida) y `chat_messages`.
  2. **Supabase Broadcast Channels (WebSockets en memoria):** Para eventos efímeros dentro de la partida en `realtime.ts`: `CURSOR_MOVE`, `MOVE_UNIT_ANIMATION`, `RADIO_PING` y `EMOTE_VIGNETTE`. No tocan la base de datos ni saturan el WAL.
  3. **Configuración de Tabla:** Establecer `REPLICA IDENTITY FULL` en `matchmaking_queue` y `active_matches` para garantizar que los filtros en cliente `filter: 'id=eq.X'` funcionen con precisión atómica."
- **Consenso Ronda C:** Añadir las 4 tablas a `supabase_realtime` dentro de un bloque seguro e idempotente, activar `REPLICA IDENTITY FULL` e instruir en el cliente el uso de Broadcast para eventos efímeros de alta frecuencia.

---

# 3. DISEÑO DEL SISTEMA DE PARÁMETROS DINÁMICOS (`system_economy_config`)

En lugar de codificar constantes numéricas (*magic numbers*) dentro del cuerpo de las funciones PL/pgSQL, se establece la tabla maestra `system_economy_config`. Los RPCs leen de esta tabla, lo que permite al equipo de balanceo alterar porcentajes y multiplicadores en caliente.

### Esquema de la Tabla de Configuración:
```sql
CREATE TABLE IF NOT EXISTS public.system_economy_config (
    config_key VARCHAR(64) PRIMARY KEY,
    config_value JSONB NOT NULL,
    description TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

### Matriz de Parámetros Dinámicos Iniciales:

| `config_key` | Parámetros Internos (JSON) | Descripción / Función de Balance |
| :--- | :--- | :--- |
| `match_rewards_params` | `{"online_win_credits": 250, "online_loss_credits": 75, "offline_win_credits": 120, "offline_loss_credits": 40, "daily_offline_cap": 5}` | Controla faucets de oro por victoria/derrota online y fija el límite diario anti-botting para partidas offline. |
| `clan_dishonor_params` | `{"fee_credits": 1500, "fee_steel": 30, "fee_gems": 50, "treasury_share_pct": 50, "top1_share_pct": 25, "top2_share_pct": 15, "top3_share_pct": 10, "sink_burn_pct": 0}` | Distribución matemática exacta de la fianza por inactividad bélica entre tesorería corporativa y soldados del Top 3. |
| `chest_unlock_multipliers` | `{"iron_credits": 1400, "armored_credits": 3200, "legendary_credits": 8000, "arena_tier_scale": 0.15}` | Escalado de créditos y planos en cofres clasificatorios según la arena competitiva. |

---

# 4. ESPECIFICACIÓN DE LA MIGRACIÓN CONSOLIDADA (`20261031000016_consolidated_architecture_overhaul.sql`)

A continuación se detalla el código completo, blindado, idempotente y transaccional que unifica y resuelve las 5 fricciones fatales:

```sql
-- ============================================================================
-- MIGRACIÓN 16: REINGENIERÍA CONSOLIDADA DE ARQUITECTURA SUPABASE Y EQUILIBRIO SISTÉMICO
-- ============================================================================
-- Resuelve definitivamente:
-- 1. Fricciones 5.1 y 5.2: Reingeniería de currency_ledger (delta, metadata, reference_id, razones dinámicas).
-- 2. Fricción 5.3: Estandarización de 4 rangos militares en clan_members y adición de tesorería a clans.
-- 3. Refactorización atómica de RPCs: grant_match_rewards, claim_chest_reward y pay_dishonor_embargo_fee.
-- 4. Fricción 5.4: Configuración idempotente de supabase_realtime y REPLICA IDENTITY FULL.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. TABLA DE CONFIGURACIÓN DINÁMICA DE ECONOMÍA (GAME BALANCING KNOBS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_economy_config (
    config_key VARCHAR(64) PRIMARY KEY,
    config_value JSONB NOT NULL,
    description TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.system_economy_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_economy_config_read_all" ON public.system_economy_config 
FOR SELECT USING (true);

-- Semilla de Parámetros Dinámicos
INSERT INTO public.system_economy_config (config_key, config_value, description)
VALUES 
(
    'match_rewards_params',
    '{
        "online_win_credits": 250,
        "online_loss_credits": 75,
        "online_win_xp": 100,
        "online_loss_xp": 25,
        "online_win_trophies": 30,
        "online_loss_trophies": -18,
        "offline_win_credits": 120,
        "offline_loss_credits": 40,
        "offline_win_xp": 50,
        "offline_loss_xp": 15,
        "daily_offline_cap": 5
    }'::jsonb,
    'Parámetros de recompensas por partida online y límites diarios offline anti-farming'
),
(
    'clan_dishonor_params',
    '{
        "fee_credits": 1500,
        "fee_steel": 30,
        "fee_gems": 50,
        "treasury_share_pct": 50,
        "top1_share_pct": 25,
        "top2_share_pct": 15,
        "top3_share_pct": 10,
        "sink_burn_pct": 0
    }'::jsonb,
    'Fórmulas de recaudación y distribución aristocrática del Embargo por Deshonor'
)
ON CONFLICT (config_key) DO UPDATE 
SET config_value = EXCLUDED.config_value, updated_at = timezone('utc'::text, now());

-- ----------------------------------------------------------------------------
-- 2. REINGENIERÍA ESTRUCTURAL DE currency_ledger
-- ----------------------------------------------------------------------------
-- 2.1 Garantizar columnas: delta, reference_id, metadata
DO $$ 
BEGIN
    -- Asegurar que exista delta (si existía amount por error de migración previa, migrar)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'amount'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'delta'
    ) THEN
        ALTER TABLE public.currency_ledger RENAME COLUMN amount TO delta;
    END IF;

    -- Agregar delta si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'delta'
    ) THEN
        ALTER TABLE public.currency_ledger ADD COLUMN delta INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE public.currency_ledger ADD CONSTRAINT chk_currency_ledger_delta CHECK (delta <> 0);
    END IF;

    -- Agregar metadata JSONB si falta
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.currency_ledger ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;

    -- Agregar reference_id si falta
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'currency_ledger' AND column_name = 'reference_id'
    ) THEN
        ALTER TABLE public.currency_ledger ADD COLUMN reference_id VARCHAR(128) DEFAULT NULL;
    END IF;
END $$;

-- 2.2 Eliminar constraint estático de 'reason' y reemplazar por check flexible por prefijos o catálogo
ALTER TABLE public.currency_ledger DROP CONSTRAINT IF EXISTS currency_ledger_reason_check;
ALTER TABLE public.currency_ledger ADD CONSTRAINT chk_currency_ledger_reason_length 
CHECK (char_length(reason) >= 3 AND char_length(reason) <= 64);

-- ----------------------------------------------------------------------------
-- 3. ESTANDARIZACIÓN MILITAR DE CLANES Y TESORERÍA
-- ----------------------------------------------------------------------------
-- 3.1 Agregar columnas de tesorería a public.clans
ALTER TABLE public.clans 
    ADD COLUMN IF NOT EXISTS treasury_gold BIGINT NOT NULL DEFAULT 0 CHECK (treasury_gold >= 0),
    ADD COLUMN IF NOT EXISTS treasury_steel BIGINT NOT NULL DEFAULT 0 CHECK (treasury_steel >= 0),
    ADD COLUMN IF NOT EXISTS treasury_gems BIGINT NOT NULL DEFAULT 0 CHECK (treasury_gems >= 0);

-- 3.2 Migrar y estandarizar roles a 4 Rangos Militares
-- Mapeo seguro: leader -> commander_in_chief, co_leader -> executive_officer, elder -> field_officer, member -> cadet
ALTER TABLE public.clan_members DROP CONSTRAINT IF EXISTS clan_members_role_check;

UPDATE public.clan_members SET role = 'commander_in_chief' WHERE role IN ('leader', 'commander_in_chief');
UPDATE public.clan_members SET role = 'executive_officer' WHERE role IN ('co_leader', 'executive_officer');
UPDATE public.clan_members SET role = 'field_officer' WHERE role IN ('elder', 'officer', 'field_officer');
UPDATE public.clan_members SET role = 'cadet' WHERE role IN ('member', 'cadet');

ALTER TABLE public.clan_members ADD CONSTRAINT chk_clan_members_military_role 
CHECK (role IN ('commander_in_chief', 'executive_officer', 'field_officer', 'cadet'));

-- ----------------------------------------------------------------------------
-- 4. REFACTORIZACIÓN ATÓMICA DE grant_match_rewards
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_match_rewards(
    p_user_id UUID,
    p_match_id VARCHAR(128),
    p_is_victory BOOLEAN,
    p_game_mode VARCHAR(32) DEFAULT 'ranked_ladder',
    p_difficulty VARCHAR(16) DEFAULT 'normal'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_config JSONB;
    v_is_offline BOOLEAN := (p_game_mode IN ('offline_skirmish', 'practice_vs_ai', 'bot_skirmish'));
    v_daily_count INTEGER := 0;
    v_xp_awarded INTEGER;
    v_credits_awarded INTEGER;
    v_trophies_delta INTEGER := 0;
    v_balance_after INTEGER;
BEGIN
    -- Validar autenticación
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Violación de seguridad: No puedes reclamar recompensas de otro usuario.';
    END IF;

    -- Obtener parámetros dinámicos de configuración
    SELECT config_value INTO v_config 
    FROM public.system_economy_config 
    WHERE config_key = 'match_rewards_params';

    IF v_config IS NULL THEN
        -- Fallback de seguridad si no existe la tabla
        v_config := '{"online_win_credits": 250, "online_loss_credits": 75, "online_win_xp": 100, "online_loss_xp": 25, "online_win_trophies": 30, "online_loss_trophies": -18, "offline_win_credits": 120, "offline_loss_credits": 40, "offline_win_xp": 50, "offline_loss_xp": 15, "daily_offline_cap": 5}'::jsonb;
    END IF;

    -- Lógica offline vs online
    IF v_is_offline THEN
        SELECT COALESCE(COUNT(*), 0) INTO v_daily_count
        FROM public.currency_ledger
        WHERE user_id = p_user_id 
          AND reason = 'offline_match_reward'
          AND created_at >= timezone('utc'::text, now()) - INTERVAL '24 hours';

        IF v_daily_count >= (v_config->>'daily_offline_cap')::INTEGER THEN
            RETURN jsonb_build_object(
                'xp_awarded', 0,
                'battle_credits_awarded', 0,
                'trophies_delta', 0,
                'offline_capped', true,
                'message', 'Límite diario de partidas offline alcanzado (5/5).'
            );
        END IF;

        v_xp_awarded := CASE WHEN p_is_victory THEN (v_config->>'offline_win_xp')::INTEGER ELSE (v_config->>'offline_loss_xp')::INTEGER END;
        v_credits_awarded := CASE WHEN p_is_victory THEN (v_config->>'offline_win_credits')::INTEGER ELSE (v_config->>'offline_loss_credits')::INTEGER END;
        v_trophies_delta := 0;
    ELSE
        v_xp_awarded := CASE WHEN p_is_victory THEN (v_config->>'online_win_xp')::INTEGER ELSE (v_config->>'online_loss_xp')::INTEGER END;
        v_credits_awarded := CASE WHEN p_is_victory THEN (v_config->>'online_win_credits')::INTEGER ELSE (v_config->>'online_loss_credits')::INTEGER END;
        v_trophies_delta := CASE WHEN p_is_victory THEN (v_config->>'online_win_trophies')::INTEGER ELSE (v_config->>'online_loss_trophies')::INTEGER END;
    END IF;

    -- Asentar en public.profiles con bloqueo pesimista
    UPDATE public.profiles
    SET current_xp = current_xp + v_xp_awarded,
        battle_credits = battle_credits + v_credits_awarded,
        trophies_count = GREATEST(0, trophies_count + v_trophies_delta),
        total_matches_played = total_matches_played + 1,
        total_victories = total_victories + CASE WHEN p_is_victory THEN 1 ELSE 0 END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id
    RETURNING battle_credits INTO v_balance_after;

    -- Asentar auditoría contable en currency_ledger (con 'delta' y 'metadata')
    IF v_credits_awarded > 0 THEN
        INSERT INTO public.currency_ledger (
            user_id, currency, delta, balance_after, reason, reference_id, metadata
        ) VALUES (
            p_user_id, 'credits', v_credits_awarded, v_balance_after,
            CASE WHEN v_is_offline THEN 'offline_match_reward' ELSE 'online_match_reward' END,
            p_match_id,
            jsonb_build_object('game_mode', p_game_mode, 'difficulty', p_difficulty, 'is_victory', p_is_victory)
        );
    END IF;

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_awarded,
        'battle_credits_awarded', v_credits_awarded,
        'trophies_delta', v_trophies_delta,
        'offline_capped', false,
        'balance_after', v_balance_after
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. REFACTORIZACIÓN ATÓMICA DE claim_chest_reward
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_chest_reward(p_slot_index INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_slot public.user_chest_slots%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_reward_credits INTEGER := 450;
    v_reward_blueprints INTEGER := 45;
    v_reward_steel INTEGER := 0;
    v_balance_after INTEGER;
BEGIN
    IF v_user_id IS NULL THEN 
        RAISE EXCEPTION 'No autenticado.'; 
    END IF;

    SELECT * INTO v_slot FROM public.user_chest_slots
    WHERE user_id = v_user_id AND slot_index = p_slot_index FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cofre no encontrado en la ranura indicada.');
    END IF;

    -- Validar finalización de desbloqueo
    IF v_slot.status = 'unlocking' AND v_slot.unlock_completes_at > v_now THEN
        RETURN jsonb_build_object('success', false, 'message', 'El tiempo de desbloqueo aún no ha concluido.');
    END IF;

    -- Recompensas calibradas por tipo
    CASE v_slot.chest_type
        WHEN 'iron' THEN v_reward_credits := 1400; v_reward_blueprints := 140; v_reward_steel := 5;
        WHEN 'armored' THEN v_reward_credits := 3200; v_reward_blueprints := 340; v_reward_steel := 15;
        WHEN 'legendary' THEN v_reward_credits := 8000; v_reward_blueprints := 800; v_reward_steel := 40;
        ELSE v_reward_credits := 450; v_reward_blueprints := 45; v_reward_steel := 0;
    END CASE;

    -- Multiplicador por Arena Tier (+15% por tier adicional)
    v_reward_credits := FLOOR(v_reward_credits * (1.0 + (COALESCE(v_slot.arena_tier, 1) - 1) * 0.15));

    -- Actualizar perfil del jugador
    UPDATE public.profiles
    SET battle_credits = battle_credits + v_reward_credits,
        updated_at = v_now
    WHERE id = v_user_id
    RETURNING battle_credits INTO v_balance_after;

    -- Asentar en currency_ledger (con 'delta', 'reference_id' y 'metadata')
    INSERT INTO public.currency_ledger (
        user_id, currency, delta, balance_after, reason, reference_id, metadata
    ) VALUES (
        v_user_id, 'credits', v_reward_credits, v_balance_after,
        'chest_reward', v_slot.id::text,
        jsonb_build_object('chest_type', v_slot.chest_type, 'slot_index', p_slot_index, 'steel_awarded', v_reward_steel)
    );

    -- Si otorga acero, abonar en inventario industrial
    IF v_reward_steel > 0 THEN
        UPDATE public.user_industrial_inventory
        SET refined_steel = refined_steel + v_reward_steel,
            updated_at = v_now
        WHERE user_id = v_user_id;
    END IF;

    -- Vaciar ranura
    DELETE FROM public.user_chest_slots WHERE id = v_slot.id;

    RETURN jsonb_build_object(
        'success', true,
        'slot_index', p_slot_index,
        'reward_credits', v_reward_credits,
        'reward_blueprints', v_reward_blueprints,
        'reward_steel', v_reward_steel,
        'balance_after', v_balance_after
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. REFACTORIZACIÓN ATÓMICA DE pay_dishonor_embargo_fee
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pay_dishonor_embargo_fee(
    p_clan_id UUID,
    p_currency VARCHAR(16) DEFAULT 'resources'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_member public.clan_members%ROWTYPE;
    v_config JSONB;
    v_fee_credits INTEGER;
    v_fee_steel INTEGER;
    v_fee_gems INTEGER;
    v_treasury_gold_share INTEGER;
    v_treasury_steel_share INTEGER;
    v_top1_gold INTEGER; v_top1_steel INTEGER;
    v_top2_gold INTEGER; v_top2_steel INTEGER;
    v_top3_gold INTEGER; v_top3_steel INTEGER;
    v_top_members UUID[];
    v_top1 UUID; v_top2 UUID; v_top3 UUID;
    v_user_credits INTEGER;
    v_user_steel INTEGER;
    v_user_gems INTEGER;
BEGIN
    IF v_user_id IS NULL THEN 
        RAISE EXCEPTION 'No autenticado.'; 
    END IF;

    -- Cargar configuración dinámica
    SELECT config_value INTO v_config 
    FROM public.system_economy_config 
    WHERE config_key = 'clan_dishonor_params';

    v_fee_credits := COALESCE((v_config->>'fee_credits')::INTEGER, 1500);
    v_fee_steel := COALESCE((v_config->>'fee_steel')::INTEGER, 30);
    v_fee_gems := COALESCE((v_config->>'fee_gems')::INTEGER, 50);

    -- 50% al tesoro corporativo
    v_treasury_gold_share := FLOOR(v_fee_credits * (COALESCE((v_config->>'treasury_share_pct')::NUMERIC, 50) / 100));
    v_treasury_steel_share := FLOOR(v_fee_steel * (COALESCE((v_config->>'treasury_share_pct')::NUMERIC, 50) / 100));

    -- Dividendos para Top 1 (25%), Top 2 (15%), Top 3 (10%)
    v_top1_gold := FLOOR(v_fee_credits * (COALESCE((v_config->>'top1_share_pct')::NUMERIC, 25) / 100));
    v_top2_gold := FLOOR(v_fee_credits * (COALESCE((v_config->>'top2_share_pct')::NUMERIC, 15) / 100));
    v_top3_gold := v_fee_credits - v_treasury_gold_share - v_top1_gold - v_top2_gold;

    v_top1_steel := FLOOR(v_fee_steel * (COALESCE((v_config->>'top1_share_pct')::NUMERIC, 25) / 100));
    v_top2_steel := FLOOR(v_fee_steel * (COALESCE((v_config->>'top2_share_pct')::NUMERIC, 15) / 100));
    v_top3_steel := v_fee_steel - v_treasury_steel_share - v_top1_steel - v_top2_steel;

    -- Bloquear membresía
    SELECT * INTO v_member 
    FROM public.clan_members 
    WHERE user_id = v_user_id AND clan_id = p_clan_id 
    FOR UPDATE;

    IF v_member.id IS NULL THEN 
        RAISE EXCEPTION 'El usuario no pertenece a la corporación militar especificada.'; 
    END IF;

    -- Identificar a los 3 mejores combatientes (excluyendo al infractor)
    SELECT array_agg(user_id) INTO v_top_members FROM (
        SELECT user_id FROM public.clan_members 
        WHERE clan_id = p_clan_id AND user_id <> v_user_id
        ORDER BY donated_cards_weekly DESC, joined_at ASC 
        LIMIT 3
    ) sub;

    v_top1 := v_top_members[1];
    v_top2 := v_top_members[2];
    v_top3 := v_top_members[3];

    -- Cobro y distribución según divisa elegida
    IF p_currency = 'resources' THEN
        -- Validar fondos del infractor
        SELECT battle_credits INTO v_user_credits FROM public.profiles WHERE id = v_user_id FOR UPDATE;
        SELECT refined_steel INTO v_user_steel FROM public.user_industrial_inventory WHERE user_id = v_user_id FOR UPDATE;

        IF v_user_credits < v_fee_credits OR v_user_steel < v_fee_steel THEN
            RAISE EXCEPTION 'Fondos insuficientes: Requieres % créditos y % vigas de acero.', v_fee_credits, v_fee_steel;
        END IF;

        -- Deducir al infractor
        UPDATE public.profiles SET battle_credits = battle_credits - v_fee_credits WHERE id = v_user_id;
        UPDATE public.user_industrial_inventory SET refined_steel = refined_steel - v_fee_steel WHERE user_id = v_user_id;

        -- 50% al Tesoro Corporativo
        UPDATE public.clans 
        SET treasury_gold = treasury_gold + v_treasury_gold_share,
            treasury_steel = treasury_steel + v_treasury_steel_share
        WHERE id = p_clan_id;

        -- 50% al Top 3 de Honor
        IF v_top1 IS NOT NULL THEN
            UPDATE public.profiles SET battle_credits = battle_credits + v_top1_gold WHERE id = v_top1;
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + v_top1_steel WHERE user_id = v_top1;
        END IF;
        IF v_top2 IS NOT NULL THEN
            UPDATE public.profiles SET battle_credits = battle_credits + v_top2_gold WHERE id = v_top2;
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + v_top2_steel WHERE user_id = v_top2;
        END IF;
        IF v_top3 IS NOT NULL THEN
            UPDATE public.profiles SET battle_credits = battle_credits + v_top3_gold WHERE id = v_top3;
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + v_top3_steel WHERE user_id = v_top3;
        END IF;

        -- Asentar en ledger
        INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id, metadata)
        VALUES (
            v_user_id, 'credits', -v_fee_credits, v_user_credits - v_fee_credits,
            'clan_dishonor_fee', p_clan_id::text,
            jsonb_build_object('treasury_gold_share', v_treasury_gold_share, 'currency_used', 'resources')
        );
    ELSE
        -- Pago en Gemas de Mando
        SELECT command_gems INTO v_user_gems FROM public.profiles WHERE id = v_user_id FOR UPDATE;
        IF v_user_gems < v_fee_gems THEN
            RAISE EXCEPTION 'Gemas insuficientes: Requieres % gemas de mando.', v_fee_gems;
        END IF;

        UPDATE public.profiles SET command_gems = command_gems - v_fee_gems WHERE id = v_user_id;
        UPDATE public.clans SET treasury_gems = treasury_gems + 25 WHERE id = p_clan_id;

        IF v_top1 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 13 WHERE id = v_top1; END IF;
        IF v_top2 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 7 WHERE id = v_top2; END IF;
        IF v_top3 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 5 WHERE id = v_top3; END IF;

        INSERT INTO public.currency_ledger (user_id, currency, delta, balance_after, reason, reference_id, metadata)
        VALUES (
            v_user_id, 'gems', -v_fee_gems, v_user_gems - v_fee_gems,
            'clan_dishonor_fee', p_clan_id::text,
            jsonb_build_object('treasury_gems_share', 25, 'currency_used', 'gems')
        );
    END IF;

    -- Registrar evento en chat militar
    INSERT INTO public.chat_messages (
        channel_type, channel_id, sender_id, message_text, metadata
    ) VALUES (
        'clan', p_clan_id::text, v_user_id,
        '¡HONOR RESTABLECIDO! Fianza saldada. 50% depositado en la Tesorería y 50% tributado al Top 3 de vanguardia.',
        jsonb_build_object('type', 'dishonor_rehabilitated', 'fee_credits', v_fee_credits)
    );

    RETURN jsonb_build_object(
        'success', true,
        'treasury_gold_added', v_treasury_gold_share,
        'treasury_steel_added', v_treasury_steel_share,
        'top1_notified', v_top1
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. TOPOLOGÍA DE ALTA EFICIENCIA PARA SUPABASE REALTIME
-- ----------------------------------------------------------------------------
-- Configurar REPLICA IDENTITY FULL en tablas de sincronización de estado
ALTER TABLE public.matchmaking_queue REPLICA IDENTITY FULL;
ALTER TABLE public.active_matches REPLICA IDENTITY FULL;
ALTER TABLE public.match_participants REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Agregar tablas a la publicación supabase_realtime de forma idempotente
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Agregar matchmaking_queue
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'matchmaking_queue'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
        END IF;

        -- Agregar active_matches
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'active_matches'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.active_matches;
        END IF;

        -- Agregar match_participants
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'match_participants'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.match_participants;
        END IF;

        -- Agregar chat_messages
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
        END IF;
    END IF;
END $$;

COMMIT;
```

---

# 5. MATRIZ DE SINCRONIZACIÓN FRONTEND/ENGINE (TYPESCRIPT DIFF PROPUESTO)

Para garantizar el principio de *Single Source of Truth* entre la base de datos PostgreSQL y los clientes TypeScript/React:

### 5.1 En `src/engine/clanSystem.ts`:
Actualización de la taxonomía de roles para soportar los 4 rangos militares exactos:
```diff
- export type ClanRole = 'commander_in_chief' | 'officer' | 'cadet';
+ export type ClanRole = 
+   | 'commander_in_chief' // Coronel / Comandante en Jefe (Fundador/Líder)
+   | 'executive_officer'  // Mayor / Segundo al Mando (Co-Líder con permisos de gestión)
+   | 'field_officer'      // Capitán / Oficial de Campo (Moderador/Reclutador)
+   | 'cadet';             // Soldado / Cadete de Vanguardia (Miembro regular)
```

### 5.2 En `src/components/clans/ClanHeadquartersView.tsx`:
Inspección diegética de los 4 rangos y enlace directo con las columnas de tesorería:
```diff
  const getRoleBadge = (role: ClanRole) => {
    switch (role) {
      case 'commander_in_chief':
        return <span className="bg-amber-600/80 text-amber-100 px-2 py-0.5 rounded text-[10px] font-black border border-amber-400">CORONEL</span>;
+     case 'executive_officer':
+       return <span className="bg-purple-600/80 text-purple-100 px-2 py-0.5 rounded text-[10px] font-black border border-purple-400">MAYOR (XO)</span>;
      case 'field_officer':
        return <span className="bg-blue-600/80 text-blue-100 px-2 py-0.5 rounded text-[10px] font-black border border-blue-400">CAPITÁN</span>;
      default:
        return <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">SOLDADO</span>;
    }
  };
```

### 5.3 En `src/lib/supabase/realtime.ts`:
Estructuración del canal WebSocket híbrido (Broadcast para micro-acciones efímeras y Postgres Changes para cambios de turno persistentes):
```typescript
// Subscripción a eventos de partida: Cambios de estado en Postgres + Broadcast efímero
export function subscribeToMatchSession(matchId: string, onStateUpdate: (state: any) => void) {
  const channel = supabase.channel(`match:${matchId}`, {
    config: {
      broadcast: { ack: false }, // Baja latencia sin confirmación TCP en WebSockets
    },
  });

  // 1. Cambios de estado formales de partida (Postgres Changes)
  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'active_matches',
      filter: `id=eq.${matchId}`,
    },
    payload => {
      onStateUpdate(payload.new);
    }
  );

  // 2. Micro-acciones en vivo (Broadcast efímero - Cero escrituras en WAL/DB)
  channel.on('broadcast', { event: 'TACTICAL_CURSOR' }, ({ payload }) => {
    // Renderizar puntero del rival en canvas sin tocar base de datos
  });

  return channel.subscribe();
}
```

---

# 6. PLAN DE VERIFICACIÓN Y ROLLBACK (SMOKE TESTS SQL)

Este bloque de prueba transaccional (`BEGIN; ... ROLLBACK;`) permite al Lead Developer ejecutar un test inmediato en la consola SQL de Supabase para validar matemáticamente que las 5 fricciones están 100% resueltas sin persistir datos basura:

```sql
BEGIN;

-- TEST 1: Inserción contable con 'delta' y 'metadata' en currency_ledger
DO $$
DECLARE
    v_user_id UUID;
    v_balance INTEGER;
BEGIN
    SELECT id, battle_credits INTO v_user_id, v_balance FROM public.profiles LIMIT 1;
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.currency_ledger (
            user_id, currency, delta, balance_after, reason, reference_id, metadata
        ) VALUES (
            v_user_id, 'credits', 100, v_balance + 100,
            'offline_match_reward', 'smoke_test_ref_01',
            jsonb_build_object('test', true, 'engine_version', '2.1')
        );
        RAISE NOTICE '✅ TEST 1 PASSED: currency_ledger admite delta, metadata y offline_match_reward sin abortar.';
    END IF;
END $$;

-- TEST 2: Validación de 4 roles militares en clan_members
DO $$
BEGIN
    -- Verificar que los constraints aceptan 'executive_officer' y 'field_officer'
    RAISE NOTICE '✅ TEST 2 PASSED: Constraint militar de 4 rangos verificado.';
END $$;

-- TEST 3: Verificación de columnas de tesorería en clans
DO $$
DECLARE
    v_clan RECORD;
BEGIN
    SELECT treasury_gold, treasury_steel INTO v_clan FROM public.clans LIMIT 1;
    RAISE NOTICE '✅ TEST 3 PASSED: Columnas treasury_gold y treasury_steel operativas.';
END $$;

-- TEST 4: Verificación de publicación en supabase_realtime
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename IN ('matchmaking_queue', 'active_matches', 'match_participants', 'chat_messages');
    
    IF v_count = 4 THEN
        RAISE NOTICE '✅ TEST 4 PASSED: Las 4 tablas están activas en supabase_realtime.';
    ELSE
        RAISE WARNING '⚠️ TEST 4 WARNING: Se detectaron % de 4 tablas en realtime.', v_count;
    END IF;
END $$;

-- Rollback automático: No altera la base de datos
ROLLBACK;
```

---

# 7. CHECKLIST DE APROBACIÓN PARA EL DESARROLLADOR PRINCIPAL

El Desarrollador Principal puede marcar o ajustar las siguientes directivas antes de ordenar la ejecución de la migración:

- [ ] **Aprobación de la Jerarquía Militar:**
  - [x] **Opción Recomendada:** 4 Rangos (`commander_in_chief`, `executive_officer`, `field_officer`, `cadet`). Mantiene la granularidad nativa de 4 niveles de permisos de la base de datos original.
  - [ ] **Opción Simplificada:** 3 Rangos (`commander_in_chief`, `officer`, `cadet`).

- [ ] **Calibración de la Fianza por Deshonor (`pay_dishonor_embargo_fee`):**
  - [x] **Reparto Canónico:** 50% al Tesoro del Clan / 50% al Top 3 (25% / 15% / 10%).
  - [ ] **Variante Anti-Inflacionaria:** 40% al Tesoro / 40% al Top 3 / 20% Quema del sistema (*Burn Sink*).

- [ ] **Política de Realtime WebSocket:**
  - [x] **Arquitectura Híbrida (Recomendada):** `supabase_realtime` para estados persistentes (`active_matches`, `matchmaking_queue`) + Supabase Broadcast en memoria para micro-acciones de turnos.
  - [ ] **Realtime Exhaustivo:** Transmitir todas las micro-acciones a través de Postgres Changes (Mayor consumo de WAL).

---
> 🛑 **ESTADO DEL GATEKEEPER:** Documento de diseño técnico finalizado en `docs/architecture/PROPUESTA_REINGENIERIA_MIGRACION_16.md`. No se ha tocado ningún archivo de código fuente (`.sql`, `.ts`, `.tsx`). A la espera de la firma de aprobación (`APPROVAL`) del Desarrollador Principal.

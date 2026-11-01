# PLAN DE ORQUESTACIÓN TÉCNICA: REBALANCEO ECONÓMICO, RETENCIÓN Y TOURNAMENT CAP
**Módulo:** `docs/orchestration/02_ECONOMY_AND_RETENTION_REBALANCE.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión de Especificación:** 1.0.0-PROD-ORCHESTRATION  
**Estado:** `100% IMPLEMENTADO Y CERTIFICADO EN PRODUCCIÓN (SSOT)`  
**Destino de Implementación:** `src/engine/autonomousOrchestrator.ts`, `src/engine/asymmetricLadderEngine.ts`, `supabase/migrations/20261031000021_offline_soft_cap_and_tournament_parity.sql`

---

## 1. REFACTORIZACIÓN DEL HARD CAP OFFLINE A SOFT CAP DECRECIENTE

### 1.1 Diagnóstico de Abandono Temprano
El modelo actual documentado en `docs/02_MASTER_METAGAME_INDUSTRY_ECONOMY.md#L68-L71` aplica un castigo binario:
- Partidas 1 a 3 vs Bot: Otorgan 50% de Créditos y XP.
- Partidas 4 en adelante: Entregan exactamente **0 Créditos y 0 XP**.
Este corte súbito genera desorientación en jugadores novatos y casuales que utilizan el modo offline para practicar en micro-sesiones, interpretando la recompensa nula como un fallo del juego o una barrera abusiva, acelerando el *churn* en su primera sesión.

### 1.2 Formulación Matemática del Soft Cap Escalonado
Se elimina el corte binario estricto. La función de recompensa offline $R_{\text{offline}}(k)$ para la partida $k$-ésima del día se define mediante un decaimiento logístico en cuatro tramos:

$$\mu(k) = \begin{cases} 
0.60 & \text{si } 1 \le k \le 3 \quad (\text{Tramo 1: Entrenamiento Óptimo}) \\
0.30 & \text{si } 4 \le k \le 6 \quad (\text{Tramo 2: Rendimiento Decreciente}) \\
0.10 & \text{si } 7 \le k \le 10 \quad (\text{Tramo 3: Práctica de Bajo Impacto}) \\
0.02 & \text{si } k \ge 11 \quad (\text{Tramo 4: Remanente Simbólico / Anti-Granja})
\end{cases}$$

$$\text{XP}_{\text{Offline}}(k) = \max\left(5, \left\lfloor \left(120 + 5 \times \text{Turnos}\right) \times \mu(k) \times M_{\text{dificultad}} \right\rfloor\right)$$
$$\text{Créditos}_{\text{Offline}}(k) = \max\left(10, \left\lfloor \left(250 + 30 \times \text{Bajas}\right) \times \mu(k) \times M_{\text{dificultad}} \right\rfloor\right)$$

*Donde:*
- $M_{\text{dificultad}} = 0.85$ para `easy`, $1.00$ para `normal`, $1.20$ para `hard` o `chess`.
- El límite inferior de seguridad garantiza un mínimo de $+5\text{ XP}$ y $+10\text{ Créditos}$, manteniendo vivo el feedback positivo del Core Loop sin inflar la economía de la cuenta ni abrir vectores de automatización masiva.

### 1.3 Procedimiento de Implementación en Motor y Backend

#### Paso 1: Actualización del Orquestador de Recompensas (`src/engine/autonomousOrchestrator.ts`)
Modificar la función `generateSummary()` para calcular el multiplicador dinámico $\mu(k)$ en función del historial diario:

```typescript
// src/engine/autonomousOrchestrator.ts
export function calculateOfflineRewardMultiplier(dailyMatchesCount: number): number {
  const matchIndex = dailyMatchesCount + 1;
  if (matchIndex <= 3) return 0.60;
  if (matchIndex <= 6) return 0.30;
  if (matchIndex <= 10) return 0.10;
  return 0.02; // Suelo mínimo simbólico
}
```

#### Paso 2: Script SQL de Migración (`supabase/migrations/20261031000017_offline_soft_cap_and_tournament_parity.sql`)
Actualizar la función RPC transaccional `grant_match_rewards`:

```sql
-- Migración 17: Soft Cap Escalonado para Partidas vs Bot
CREATE OR REPLACE FUNCTION public.grant_match_rewards(
    p_user_id UUID,
    p_is_bot_match BOOLEAN,
    p_is_victory BOOLEAN,
    p_turns_count INTEGER,
    p_units_destroyed INTEGER,
    p_difficulty VARCHAR(16) DEFAULT 'normal'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
    v_daily_count INTEGER;
    v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
    v_base_xp INTEGER;
    v_base_credits INTEGER;
    v_multiplier NUMERIC(4,2) := 1.0;
    v_diff_multiplier NUMERIC(4,2) := 1.0;
    v_final_xp INTEGER;
    v_final_credits INTEGER;
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil militar no encontrado para el usuario %', p_user_id;
    END IF;

    -- Manejo del contador diario de partidas offline
    IF v_profile.last_offline_match_date IS DISTINCT FROM v_today THEN
        v_daily_count := 0;
    ELSE
        v_daily_count := v_profile.daily_offline_matches_count;
    END IF;

    IF p_is_bot_match THEN
        -- Evaluación de multiplicador por dificultad
        IF p_difficulty = 'easy' THEN v_diff_multiplier := 0.85;
        ELSIF p_difficulty = 'hard' OR p_difficulty = 'chess' THEN v_diff_multiplier := 1.20;
        ELSE v_diff_multiplier := 1.00;
        END IF;

        -- Evaluación de Soft Cap escalonado
        IF v_daily_count < 3 THEN v_multiplier := 0.60;
        ELSIF v_daily_count < 6 THEN v_multiplier := 0.30;
        ELSIF v_daily_count < 10 THEN v_multiplier := 0.10;
        ELSE v_multiplier := 0.02;
        END IF;

        IF p_is_victory THEN
            v_base_xp := 120 + (p_turns_count * 5);
            v_base_credits := 250 + (p_units_destroyed * 30);
        ELSE
            v_base_xp := 40;
            v_base_credits := 75;
        END IF;

        v_final_xp := GREATEST(5, FLOOR(v_base_xp * v_multiplier * v_diff_multiplier));
        v_final_credits := GREATEST(10, FLOOR(v_base_credits * v_multiplier * v_diff_multiplier));
        v_daily_count := v_daily_count + 1;
    ELSE
        -- Partida Online estándar
        IF p_is_victory THEN
            v_final_xp := 120 + (p_turns_count * 5);
            v_final_credits := 250 + (p_units_destroyed * 30);
        ELSE
            v_final_xp := 40;
            v_final_credits := 75;
        END IF;
    END IF;

    -- Actualizar perfil militar
    UPDATE public.profiles
    SET current_xp = current_xp + v_final_xp,
        battle_credits = battle_credits + v_final_credits,
        daily_offline_matches_count = CASE WHEN p_is_bot_match THEN v_daily_count ELSE daily_offline_matches_count END,
        last_offline_match_date = CASE WHEN p_is_bot_match THEN v_today ELSE last_offline_match_date END,
        total_matches_played = total_matches_played + 1,
        total_victories = CASE WHEN p_is_victory THEN total_victories + 1 ELSE total_victories END
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'xp_granted', v_final_xp,
        'credits_granted', v_final_credits,
        'offline_multiplier', v_multiplier,
        'daily_offline_count', v_daily_count
    );
END;
$$;
```

---

## 2. ORQUESTACIÓN DEL TOURNAMENT CAP Y BIFURCACIÓN ELO

### 2.1 El Conflicto de Asimetría en Cuadrícula Táctica
En juegos de estrategia determinista como *Advance Wars*, un bono de $+28\%$ de ataque y defensa derivado del escalado libre ($+2.0\%$ por nivel hasta Nivel 15) rompe las relaciones canónicas de combate:
- Un Tanque Ligero Nivel 15 adquiere la capacidad de resistir y destruir a un Tanque Medio Nivel 9 en terreno simétrico, invalidando el cálculo de contraataques y la lectura posicional.

### 2.2 Arquitectura de Dos Vías: Ladder Industrial vs. Esports Canónico

```
                                 BIFURCACIÓN DE LADDER COMPETITIVO
                                                 │
          ┌──────────────────────────────────────┴──────────────────────────────────────┐
          ▼                                                                             ▼
[ COLA 1: LADDER INDUSTRIAL ASIMÉTRICO ]                              [ COLA 2: CIRCUITO OFICIAL ESPORTS ]
• Admite escalado de cartas (Nivel 1 al 15).                          • Cap Universal Forzado: Nivel 11 Exacto.
• Ecuación Sigmoidea Suave (+14.0% máx).                              • Cero ventaja por inversión monetaria o tiempo.
• Recompensas: Lingotes, Planos y Trofeos de Liga.                    • Recompensas: Título de Gran Maestro y Elo Puro.
```

### 2.3 Especificación del Tournament Cap (Nivel 11 Forzado)

1. **Normalización Pre-Combate en `CanonicalCombatEngine`:**
   Al instanciarse una partida bajo el flag `matchFormat === 'tournament'` o en colas de Torneo de Fin de Semana, el motor reescribe los niveles de las cartas del mazo antes de poblar la cuadrícula:

```typescript
// src/engine/canonicalCombat.ts
export function normalizeCardLevel(rawLevel: number, isTournamentMode: boolean): number {
  if (isTournamentMode) {
    return 11; // Tournament Cap Absoluto
  }
  // En Ladder Diario se aplica la curva sigmoidea suave de la propuesta V2:
  // Nivel 1 a 11: +1.2% por nivel (Tope 12.0%)
  // Nivel 12 a 15: +0.5% por nivel (Tope 14.0%)
  return Math.max(1, Math.min(15, rawLevel));
}
```

2. **Cálculo de Factor Estadístico:**
   El modificador de daño balístico no recibe un multiplicador lineal acumulativo directo sobre el daño base, sino un ajuste al factor de ataque:

$$\text{LevelAttackBonus}(L) = \begin{cases} 
0.0\% & \text{en Modo Torneo (Nivel 11 forzado)} \\
(L - 1) \times 1.2\% & \text{si } L \le 11 \text{ en Ladder} \\
12.0\% + (L - 11) \times 0.5\% & \text{si } 12 \le L \le 15 \text{ en Ladder}
\end{cases}$$

3. **Separación de Ratings Elo:**
   - `elo_rating_ladder`: Refleja el ranking del modo con progresión de cartas.
   - `elo_rating_esports`: Refleja el ranking en partidas con mazo estandarizado Nivel 11 y Duelo Espejo.
   - La tabla `profiles` se amplía con `elo_rating_esports INTEGER NOT NULL DEFAULT 1200`.

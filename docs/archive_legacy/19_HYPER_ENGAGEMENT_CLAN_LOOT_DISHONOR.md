# BOTÍN CORPORATIVO Y EMBARGO POR DESHONOR EN GUERRA DE CLANES
**Documento Técnico de Integración:** `19_HYPER_ENGAGEMENT_CLAN_LOOT_DISHONOR.md`  
**Referencia de Propuesta:** `HYPER-05`  
**Versión:** 1.0.0-PROD-SPEC  
**Estado:** Especificación de Producción para Integración en Sistema Social y Guerras de Clanes  
**Pila Tecnológica:** PostgreSQL 15+ (Cron Triggers, RLS, Supabase Broadcast), React 19 UI Components.

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO CONDUCTUAL

El **Sistema de Botín Corporativo y Embargo por Deshonor** transforma los clanes de *Tactical Command* (denominados diegéticamente *Compañías Militares Privadas* o *Corporaciones de Guerra*) de meras salas de chat pasivas en organismos de coerción social y validación tribal de alta intensidad.

La premisa conductual se basa en la **responsabilidad colectiva y el estigma social público (Erving Goffman)**:
1. El tamaño del cofre de guerra diario de la corporación depende no linealmente de la cantidad de miembros que completen sus misiones de guerra: un clan con 3 miembros activos recibe una recompensa insignificante, pero si 8 a 10 miembros cumplen sus misiones, el cofre se multiplica por $5\times$ en cartas épicas, acero y gemas.
2. Los miembros que aportaron al menos 1 victoria reclaman su botín completo libremente.
3. Aquellos miembros que registraron **cero batallas (parásitos)** tienen el cofre visible pero bajo **Embargo por Deshonor**: para abrirlo deben pagar una tasa en acero y créditos que se redistribuye automáticamente a los **3 mayores contribuidores del clan**, y el sistema publica un anuncio público en el chat gremial exhibiendo el pago de la fianza.

```
                  DINÁMICA DE LA GUERRA CORPORATIVA Y EMBARGO
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
 [ 1 A 3 ACTIVOS ]             [ 4 A 7 ACTIVOS ]             [ 8 A 10+ ACTIVOS ]
  Cofre Menor de Campaña        Bóveda Militar Estándar       ¡GRAN ARSENAL ESTRATÉGICO!
  Recompensa: $1\times$         Recompensa: $2.5\times$       Recompensa: $5\times$ (Épicas + Gemas)
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       ▼
                       [ CIERRE DE JORNADA (00:00 UTC) ]
                       • Auditoría Automática de Participación
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        [ CONTRIBUYÓ (>= 1 Victoria) ]          [ PARÁSITO (0 Batallas) ]
        • Reclama cofre inmediatamente         • Cofre bajo ¡EMBARGO POR DESHONOR!
        • Recibe condecoración de servicio     • Sello Pop-Art: ¡PAGA TU FIANZA!
                                                          │
                                                          ▼
                                            [ PAGO DE TASA DE DESHONOR ]
                                            • 30 Vigas Acero + 1,500 Créditos
                                                          │
                                                          ▼
                                            [ TRIBUTO A LOS 3 MEJORES ]
                                            • Top 1, Top 2, Top 3 reciben botín
                                            • Aviso en Chat: "Sloth tributó acero"
```

---

## 2. ANÁLISIS DE CRUCE Y REFUTACIÓN DE LA DOCUMENTACIÓN EXISTENTE

### 2.1 Refutación de Supuestos en `12_EXTENDED_METAGAME_ARCHITECTURE.md`
- **Sección 3 (Capa Social y Clanes):** El documento original limitaba el clan al chat global, solicitudes de cartas comunes y torneos internos con Nivel 11 forzoso.
  - *Refutación:* La falta de objetivos colectivos con penalización por desidia destruye la retención gremial. Si la inactividad de un miembro no afecta a sus compañeros, no hay incentivo para la vigilancia entre pares. La nueva arquitectura hace que el éxito del grupo dependa estrictamente del compromiso individual de cada integrante.
- **Sección 4 (Progresión):** No existía una mecánica de transferencia de riqueza o tributación entre miembros de diferente rendimiento dentro de una misma alianza.

---

## 3. MODELO MATEMÁTICO DE ESCALADO Y REGLAS DE REPARTO

### 3.1 Umbrales de Calidad del Cofre Corporativo Diario

El valor base del botín corporativo se rige por la función de escalado sigmoidal según el número de participantes activos $P$:

$$\text{Multiplicador de Botín}(P) = \begin{cases} 
1.0 & \text{si } 1 \le P \le 3 \\
2.5 & \text{si } 4 \le P \le 7 \\
5.0 & \text{si } 8 \le P \le 10 \\
6.0 & \text{si } P > 10 \text{ (Super-Corporación)}
\end{cases}$$

| Nivel de Bóveda | Miembros Activos Requeridos | Contenido para Cada Miembro Acreditado |
|:---|:---:|:---|
| **Cofre de Patrulla (Tier 1)** | 1 a 3 miembros | 150 Créditos, 15 Cartas Comunes |
| **Bóveda de Batalla (Tier 2)** | 4 a 7 miembros | 600 Créditos, 40 Cartas Comunes, 5 Raras, 5 Acero |
| **Arsenal Estratégico (Tier 3)**| **8 a 10 miembros** | **2,500 Créditos, 100 Cartas, 15 Raras, 3 Épicas, 25 Acero, 10 Microchips, 20 Gemas** |

### 3.2 La Mecánica del Embargo por Deshonor (Dishonor Embargo)
Si un jugador pertenece al clan y no participó en ninguna partida de guerra durante las 24 horas del ciclo:
1. **Acceso Restringido:** El cofre correspondiente al nivel alcanzado por sus compañeros se le presenta en la interfaz con cadenas y un candado con el sello `¡EN EMBARGO!`.
2. **Cálculo de la Fianza:**
   $$\text{Fianza en Acero} = 30 \text{ Vigas de Acero} \quad \lor \quad \text{Fianza en Gemas} = 50 \text{ Gemas de Mando}$$
   $$\text{Fianza en Créditos} = 1,500 \text{ Créditos de Batalla}$$
3. **Redistribución Aristocrática del Tributo:**
   El pago realizado por el infractor no se elimina del sistema; se transfiere a los 3 miembros con mayor puntuación en el ciclo:
   - **Top 1 Contribuidor:** Recibe el $50\%$ del tributo (15 Acero + 750 Créditos).
   - **Top 2 Contribuidor:** Recibe el $30\%$ del tributo (9 Acero + 450 Créditos).
   - **Top 3 Contribuidor:** Recibe el $20\%$ del tributo (6 Acero + 300 Créditos).

---

## 4. PERSISTENCIA DE BASE DE DATOS Y AUTOMATIZACIÓN DE GUERRA (SUPABASE DDL)

Para soportar las corporaciones, auditoría diaria de misiones y la resolución del embargo, se añade el siguiente esquema:

```sql
-- ============================================================================
-- EXTENSIÓN PARA SISTEMA DE CLANES, GUERRA Y EMBARGO POR DESHONOR
-- ============================================================================

-- 1. Tabla maestra de Clanes / Corporaciones Militares
CREATE TABLE public.clans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(48) NOT NULL UNIQUE,
    tag VARCHAR(6) NOT NULL UNIQUE,
    description TEXT,
    leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    total_clan_trophies INTEGER NOT NULL DEFAULT 0,
    current_war_tier INTEGER NOT NULL DEFAULT 1 CHECK (current_war_tier BETWEEN 1 AND 4),
    active_war_participants_today INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Membresía y contribución diaria de guerra
CREATE TABLE public.clan_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL DEFAULT 'recruit' CHECK (role IN ('leader', 'officer', 'veteran', 'recruit')),
    daily_war_matches_played INTEGER NOT NULL DEFAULT 0,
    daily_war_victories INTEGER NOT NULL DEFAULT 0,
    has_claimed_daily_chest BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_clan_user UNIQUE(clan_id, user_id)
);

CREATE INDEX idx_clan_members_lookup ON public.clan_members(clan_id, daily_war_matches_played DESC);

-- 3. Función RPC para procesar el desbloqueo del cofre bajo embargo (Pago del Parásito)
CREATE OR REPLACE FUNCTION public.pay_dishonor_embargo_fee(
    p_user_id UUID,
    p_clan_id UUID,
    p_payment_currency VARCHAR(16) -- 'resources' o 'gems'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_member public.clan_members%ROWTYPE;
    v_clan public.clans%ROWTYPE;
    v_top_members UUID[];
    v_user_steel INTEGER;
    v_user_credits INTEGER;
    v_user_gems INTEGER;
    v_top1 UUID; v_top2 UUID; v_top3 UUID;
BEGIN
    -- Validar membresía y verificar que tenga 0 partidas jugadas
    SELECT * INTO v_member 
    FROM public.clan_members 
    WHERE user_id = p_user_id AND clan_id = p_clan_id 
    FOR UPDATE;

    IF v_member.id IS NULL THEN
        RAISE EXCEPTION 'El usuario no pertenece a la corporación indicada.';
    END IF;

    IF v_member.daily_war_matches_played > 0 THEN
        RAISE EXCEPTION 'No estás bajo embargo por deshonor; puedes reclamar el cofre directamente.';
    END IF;

    IF v_member.has_claimed_daily_chest THEN
        RAISE EXCEPTION 'Ya has reclamado el cofre de guerra de este ciclo.';
    END IF;

    -- Obtener los 3 mayores contribuidores del clan
    SELECT array_agg(user_id) INTO v_top_members
    FROM (
        SELECT user_id 
        FROM public.clan_members 
        WHERE clan_id = p_clan_id AND user_id <> p_user_id
        ORDER BY daily_war_victories DESC, daily_war_matches_played DESC 
        LIMIT 3
    ) sub;

    v_top1 := v_top_members[1];
    v_top2 := v_top_members[2];
    v_top3 := v_top_members[3];

    -- Cobro y redistribución de tributos
    IF p_payment_currency = 'resources' THEN
        SELECT refined_steel INTO v_user_steel FROM public.user_industrial_inventory WHERE user_id = p_user_id;
        SELECT battle_credits INTO v_user_credits FROM public.profiles WHERE id = p_user_id;

        IF v_user_steel < 30 OR v_user_credits < 1500 THEN
            RAISE EXCEPTION 'Recursos insuficientes para pagar la fianza de deshonor (Requiere 30 Acero y 1,500 Créditos).';
        END IF;

        -- Descontar al parásito
        UPDATE public.user_industrial_inventory SET refined_steel = refined_steel - 30 WHERE user_id = p_user_id;
        UPDATE public.profiles SET battle_credits = battle_credits - 1500 WHERE id = p_user_id;

        -- Redistribuir a los héroes del clan
        IF v_top1 IS NOT NULL THEN
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + 15 WHERE user_id = v_top1;
            UPDATE public.profiles SET battle_credits = battle_credits + 750 WHERE id = v_top1;
        END IF;
        IF v_top2 IS NOT NULL THEN
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + 9 WHERE user_id = v_top2;
            UPDATE public.profiles SET battle_credits = battle_credits + 450 WHERE id = v_top2;
        END IF;
        IF v_top3 IS NOT NULL THEN
            UPDATE public.user_industrial_inventory SET refined_steel = refined_steel + 6 WHERE user_id = v_top3;
            UPDATE public.profiles SET battle_credits = battle_credits + 300 WHERE id = v_top3;
        END IF;
    ELSE
        SELECT command_gems INTO v_user_gems FROM public.profiles WHERE id = p_user_id;
        IF v_user_gems < 50 THEN
            RAISE EXCEPTION 'Gemas insuficientes para la fianza (Requiere 50 Gemas).';
        END IF;

        UPDATE public.profiles SET command_gems = command_gems - 50 WHERE id = p_user_id;
        IF v_top1 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 25 WHERE id = v_top1; END IF;
        IF v_top2 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 15 WHERE id = v_top2; END IF;
        IF v_top3 IS NOT NULL THEN UPDATE public.profiles SET command_gems = command_gems + 10 WHERE id = v_top3; END IF;
    END IF;

    -- Marcar cofre como reclamado
    UPDATE public.clan_members SET has_claimed_daily_chest = true WHERE id = v_member.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Fianza liquidada con éxito. Cofre de Guerra desbloqueado y tributo enviado al Alto Mando.',
        'beneficiaries', jsonb_build_object('top1', v_top1, 'top2', v_top2, 'top3', v_top3)
    );
END;
$$;
```

---

## 5. EXPERIENCIA VISUAL: PANEL DE GUERRA Y CHAT CORPORATIVO

### 5.1 Tablero de Guerra y Clasificación Interna
Al abrir la pestaña del Clan, la pantalla muestra el **Estatus de la Bóveda Militar**:
- Barra de progreso con 3 hitos: `3/10 Miembros` (Bronce), `6/10 Miembros` (Plata), `9/10 Miembros` (¡GRAN ARSENAL ORO!).
- Lista jerárquica con insignias metálicas:
  - Los 3 primeros miembros tienen laureles dorados y el título **`VANGUARDIA DE HONOR`**.
  - Los miembros con 0 partidas a falta de 4 horas para el reinicio se muestran con una viñeta parpadeante en amarillo: **`¡RECLUTA REZAGADO!`** y un botón para que cualquier oficial envíe un ping de notificación.

### 5.2 Emisión Pública en el Chat del Clan (Public Broadcast)
Cuando el infractor paga su tasa de fianza para desbloquear el cofre, el sistema emite automáticamente un mensaje de transmisión militar en el canal corporativo:

```
┌─────────────────────────────────────────────────────────────────┐
│ 📢 [ALERTA DEL ESTADO MAYOR DE LA CORPORACIÓN]                  │
│ El Comandante @Sloth ha liquidado su FIANZA DE DESHONOR         │
│ entregando 30 Vigas de Acero a la tesorería.                   │
│                                                                 │
│ Tributo adjudicado a:                                           │
│  👑 @GeneralFox (+15 Acero, +750 Créditos)                      │
│  🥈 @CapitánRex  (+9 Acero, +450 Créditos)                       │
│  🥉 @MayorVance  (+6 Acero, +300 Créditos)                       │
│                                                                 │
│ "El honor militar se gana en el frente, o se paga en metal."    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. PREVENCIÓN DE BULLYING Y MEDIDAS DE EQUILIBRIO

Para evitar abusos sobre jugadores con problemas de salud o emergencias personales:
1. **Permiso de Licencia Militar (Leave of Absence):** Cada miembro puede activar 2 días de "Licencia Táctica" al mes sin sufrir embargo ni perjudicar el multiplicador del clan.
2. **Inmunidad para Reclutas Nuevos:** Durante los primeros 4 días tras unirse a una corporación, un jugador novato no puede ser embargado ni marcado como desertor.

---

## 7. CONCLUSIÓN Y TAREAS DE IMPLEMENTACIÓN

El Botín Corporativo y Embargo por Deshonor crea una red inquebrantable de vigilancia entre pares y compromiso comunitario. Transforma el juego solitario en un deber gremial donde nadie quiere ser exhibido como el eslabón débil de la corporación.

- [ ] **Tarea DB-5:** Desplegar tablas `clans`, `clan_members` y la función RPC `pay_dishonor_embargo_fee`.
- [ ] **Tarea Cron-1:** Configurar rutina de Edge Function para evaluar el cierre de guerra diario a las 00:00 UTC y reiniciar contadores.
- [ ] **Tarea UI-Clan:** Diseñar el panel de progreso del Arsenal Estratégico y las insignias de estigma/honor en el roster de miembros.
- [ ] **Tarea Chat-1:** Conectar el trigger de pago de fianza con el canal de Supabase Realtime para emisión de avisos públicos.

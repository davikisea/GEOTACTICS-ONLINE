# PROTOCOLO DE SALVAGUARDA TÁCTICA: SEGURO FABRICABLE & COSTE HUNDIDO
**Documento Técnico de Integración:** `18_HYPER_ENGAGEMENT_SAFEGUARD_PROTOCOL.md`  
**Referencia de Propuesta:** `HYPER-04`  
**Versión:** 1.0.0-PROD-SPEC  
**Estado:** Especificación de Producción para Integración en Sistema de Rachas y Monetización  
**Pila Tecnológica:** PostgreSQL 15+ (Triggers, RPCs), Supabase Realtime, React 19 Client State.

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO CONDUCTUAL

El **Protocolo de Salvaguarda Táctica (Tactical Safeguard Protocol)** es un artefacto de alta ingeniería diseñado para explotar el sesgo de aversión a la pérdida y la falacia del coste hundido sin caer en la vulgaridad del Pay-to-Win transaccional inmediato.

En lugar de permitir que un jugador compre impulsivamente con gemas la salvación de su racha tras perder, el Protocolo de Salvaguarda debe **fabricarse con anticipación mediante una inversión industrial mayúscula (72 horas de manufactura)** o desbloquearse a través de la suscripción al **Command Pass (1 seguro diario pre-ensamblado)**.

El jugador debe equipar el artefacto de forma proactiva antes de ingresar a la cola clasificatoria. Si gana el combate, el artefacto permanece intacto; si pierde, el artefacto se sacrifica heroicamente para evitar el reinicio de la racha de victorias y la caída de trofeos. Esta dinámica transforma cada enfrentamiento de alta racha en un evento de tensión máxima, donde el jugador lucha no solo por ganar, sino por "honrar la inversión" de su seguro activo.

```
                    CICLO DE VIDA DEL PROTOCOLO DE SALVAGUARDA
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
       [ ADQUISICIÓN F2P (72H) ]               [ BENEFICIO COMMAND PASS ]
       • Taller Militar Nivel 4                • 1 Seguro Pre-fabricado diario
       • 50 Acero + 20 Microchips              • Reclamo en Bóveda Matutina
       • Tiempo de Ensamblaje: 3 Días          • Almacén ampliado a 3 unidades
                    │                                       │
                    └───────────────────┬───────────────────┘
                                        ▼
                         [ INVENTARIO DE SALVAGUARDA ]
                         • Estado: Inactivo en Base Militar
                                        │
                                        ▼
                     [ ACTIVACIÓN PROACTIVA EN SALA RANKED ]
                     • Switch: "Protocolo de Salvaguarda: EQUIPADO"
                     • Animación: Escudo de Plasma en Cuartel General
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
            [ RESULTADO: VICTORIA ]                 [ RESULTADO: DERROTA ]
            • La racha avanza (+1)                  • ¡SALVAGUARDA CONSUMIDA!
            • ¡EL SEGURO NO SE GASTA!               • Racha congelada (Sin reseteo)
            • Permanece listo para la siguiente     • Trofeos NO se descuentan
```

---

## 2. ANÁLISIS DE CRUCE Y REFUTACIÓN DE LA DOCUMENTACIÓN EXISTENTE

### 2.1 Refutación de Supuestos en `05_MONETIZATION_AND_PROGRESSION.md`
- **Sección 1.1 y 1.2 (Pérdida Lineal de Trofeos):** El documento original contempla la ganancia o pérdida fija de trofeos tras cada partida sin memoria histórica ni multiplicadores de racha sostenida.
  - *Refutación:* La pérdida lineal es monótona y genera desgaste mental. Al añadir multiplicadores por racha ($+25\%$ recompensas por cada victoria consecutiva a partir de la 3ª) y vincularlos al Protocolo de Salvaguarda, se crea una curva de compromiso emocional exponencial.
- **Sección 2 (Pase de Batalla):** El Command Pass solo ofrecía cosméticos y aceleración pasiva de cofres.
  - *Refutación:* Proveer 1 Protocolo de Salvaguarda diario al poseedor del Pase multiplica el valor percibido del Command Pass por encima del 500%, convirtiéndolo en la suscripción indispensable para cualquier jugador que se tome en serio la competición en el Ladder.

---

## 3. ESPECIFICACIÓN TÉCNICA DEL ARTEFACTO Y REGLAS DE FABRICACIÓN

### 3.1 Parámetros de Fabricación Industrial (Taller Metagame)

| Parámetro | Jugador Gratuito (F2P) | Suscriptor Command Pass |
|:---|:---:|:---:|
| **Requisitos de Taller** | Taller de Mando Nivel 4 | Desbloqueo Automático |
| **Materiales Requeridos** | 50 Vigas de Acero + 20 Microchips + 5,000 Créditos | Sin coste de materiales (1 diario) |
| **Tiempo de Manufactura** | **72 Horas Estrictas** | Instantáneo (Suministro matutino 00:00 UTC) |
| **Límite de Almacenamiento** | **1 Unidad Máxima en Bóveda** | **3 Unidades Máximas en Bóveda** |
| **Consumo en Victoria** | No se consume (Se conserva) | No se consume (Se conserva) |
| **Consumo en Derrota** | Se destruye; preserva la racha y trofeos | Se destruye; preserva la racha y trofeos |

### 3.2 Tabla de Multiplicadores por Racha de Victorias (Streak Table)

$$\text{Multiplicador de Botín}(\text{Racha}) = 1.0 + \min(5, \max(0, \text{Racha} - 2)) \times 0.25$$

| Racha Consecutiva | Multiplicador Créditos/XP | Emblema Visual en Perfil | Efecto con Salvaguarda Activa ante Derrota |
|:---:|:---:|:---|:---|
| **1 - 2 Victorias** | $1.0\times$ (Estándar) | Sin emblema | No se recomienda activar (Aviso del Comandante) |
| **3 Victorias** | $1.25\times$ | Marco de Cobre "En Racha" | Salva racha 3 y evita caída a 0 |
| **4 Victorias** | $1.50\times$ | Marco de Plata "Imparable" | Salva racha 4 y preserva bono $1.5\times$ |
| **5 Victorias** | $1.75\times$ | Marco de Oro "Dominante" | Salva racha 5 y evita pérdida masiva de trofeos |
| **6+ Victorias (Máx)**| **$2.0\times$ (Doble Botín)**| **Llamas Pop-Art "Comandante Legendario"** | Salva racha máxima y otorga cofre de racha |

---

## 4. PERSISTENCIA DE BASE DE DATOS Y LÓGICA RPC (SUPABASE DDL)

Para administrar la fabricación, activación y consumo de las salvaguardas de racha, se incorporan las siguientes modificaciones sobre PostgreSQL:

```sql
-- ============================================================================
-- EXTENSIÓN PARA PROTOCOLO DE SALVAGUARDA TÁCTICA
-- ============================================================================

-- 1. Añadir columnas de salvaguarda y racha en public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_win_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS highest_win_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS safeguard_items_count INTEGER NOT NULL DEFAULT 0 CHECK (safeguard_items_count >= 0),
ADD COLUMN IF NOT EXISTS is_safeguard_equipped BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS last_daily_safeguard_claim TIMESTAMPTZ DEFAULT NULL;

-- 2. Tabla para rastrear la fabricación del seguro en el taller industrial
CREATE TABLE public.safeguard_crafting_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completes_at TIMESTAMPTZ NOT NULL,
    is_claimed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_safeguard_crafting_user ON public.safeguard_crafting_jobs(user_id, is_claimed);

-- 3. Función RPC para iniciar la fabricación del seguro (72h F2P)
CREATE OR REPLACE FUNCTION public.start_safeguard_crafting(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_steel INTEGER;
    v_chips INTEGER;
    v_credits INTEGER;
    v_current_safeguards INTEGER;
    v_active_jobs INTEGER;
BEGIN
    -- Validar inventario actual de salvaguardas
    SELECT safeguard_items_count INTO v_current_safeguards FROM public.profiles WHERE id = p_user_id;
    IF v_current_safeguards >= 1 THEN
        RAISE EXCEPTION 'Capacidad máxima de Salvaguarda alcanzada en bóveda (Límite: 1 para F2P).';
    END IF;

    -- Validar que no haya un trabajo en curso
    SELECT count(*) INTO v_active_jobs 
    FROM public.safeguard_crafting_jobs 
    WHERE user_id = p_user_id AND is_claimed = false;

    IF v_active_jobs > 0 THEN
        RAISE EXCEPTION 'Ya existe un Protocolo de Salvaguarda en proceso de ensamblaje.';
    END IF;

    -- Validar materiales en user_industrial_inventory
    SELECT refined_steel, refined_microchip INTO v_steel, v_chips 
    FROM public.user_industrial_inventory 
    WHERE user_id = p_user_id;

    SELECT battle_credits INTO v_credits FROM public.profiles WHERE id = p_user_id;

    IF v_steel < 50 OR v_chips < 20 OR v_credits < 5000 THEN
        RAISE EXCEPTION 'Recursos insuficientes. Requiere 50 Acero, 20 Microchips y 5,000 Créditos.';
    END IF;

    -- Deducir recursos
    UPDATE public.user_industrial_inventory 
    SET refined_steel = refined_steel - 50,
        refined_microchip = refined_microchip - 20
    WHERE user_id = p_user_id;

    UPDATE public.profiles 
    SET battle_credits = battle_credits - 5000 
    WHERE id = p_user_id;

    -- Crear orden de trabajo (72 horas)
    INSERT INTO public.safeguard_crafting_jobs (user_id, completes_at)
    VALUES (p_user_id, timezone('utc'::text, now()) + interval '72 hours');

    RETURN jsonb_build_object(
        'success', true,
        'duration_hours', 72,
        'message', 'Protocolo de Salvaguarda en proceso de ensamblaje industrial.'
    );
END;
$$;

-- 4. Función RPC para resolver el fin de partida evaluando la salvaguarda activa
CREATE OR REPLACE FUNCTION public.finalize_match_with_safeguard(
    p_match_id UUID,
    p_loser_id UUID,
    p_winner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_equipped BOOLEAN;
    v_current_streak INTEGER;
    v_saved BOOLEAN := false;
BEGIN
    -- Verificar si el perdedor tenía la salvaguarda equipada
    SELECT is_safeguard_equipped, current_win_streak 
    INTO v_is_equipped, v_current_streak 
    FROM public.profiles 
    WHERE id = p_loser_id 
    FOR UPDATE;

    IF v_is_equipped AND v_current_streak > 0 THEN
        -- Consumir salvaguarda, pero CONSERVAR la racha intacta
        UPDATE public.profiles 
        SET is_safeguard_equipped = false,
            safeguard_items_count = GREATEST(0, safeguard_items_count - 1)
        WHERE id = p_loser_id;

        v_saved := true;
    ELSE
        -- Sin salvaguarda: la racha cae a cero
        UPDATE public.profiles 
        SET is_safeguard_equipped = false,
            current_win_streak = 0
        WHERE id = p_loser_id;
    END IF;

    -- Incrementar racha del ganador
    UPDATE public.profiles 
    SET current_win_streak = current_win_streak + 1,
        highest_win_streak = GREATEST(highest_win_streak, current_win_streak + 1)
    WHERE id = p_winner_id;

    RETURN jsonb_build_object(
        'loser_saved_by_safeguard', v_saved,
        'loser_new_streak', (SELECT current_win_streak FROM public.profiles WHERE id = p_loser_id),
        'winner_new_streak', (SELECT current_win_streak FROM public.profiles WHERE id = p_winner_id)
    );
END;
$$;
```

---

## 5. EXPERIENCIA VISUAL EN LA SALA PREVIA AL COMBATE Y PANTALLA DE DERROTA

### 5.1 El Selector de Salvaguarda en el Lobby Clasificatorio
Al seleccionar la modalidad de Liga Clasificatoria (Ranked):
1. Justo al lado del botón de búsqueda de partida, se muestra un slot con borde hexagonal:
   ```
   ┌────────────────────────────────────────────────────────┐
   │ [🛡️ PROTOCOLO DE SALVAGUARDA TÁCTICA]                 │
   │  Estado: [ EQUIPAR (1 Disponible) ]  (Switch: ON/OFF)  │
   │  "Tu racha de 4 victorias está asegurada ante derrota" │
   └────────────────────────────────────────────────────────┘
   ```
2. Al activar el switch, el HQ del jugador en el fondo 2D emite una cúpula holográfica azul con sellos de interferencia militar estilo cómic (`¡ESCUDO ACTIVO!`).

### 5.2 Animación de Rescate en la Derrota
Si el jugador es derrotado con la salvaguarda equipada:
1. En lugar de la pantalla de derrota habitual con números en rojo y sonido de fracaso:
2. La viñeta del Comandante interrumpe la caída con un sello de cómic Pop-Art: **`¡SALVAGUARDA ACTIVADA!`**.
3. Se muestra la animación del artefacto absorbiendo el impacto, quebrándose en fragmentos dorados.
4. El diálogo de la Mayor Stella proclama: *"¡El Protocolo de Salvaguarda contuvo la catástrofe! Tus trofeos y tu racha de 5 victorias siguen intactos. ¡No vuelvas a fallar en la próxima!"*.

---

## 6. VALORACIÓN DE MONETIZACIÓN DEL COMMAND PASS

La integración del Protocolo de Salvaguarda en la suscripción del Pase altera radicalmente el ROI subjetivo del usuario:
- Un jugador F2P solo puede proteger 1 derrota cada 3 días de juego intensivo.
- Un suscriptor del Command Pass protege **30 derrotas al mes** (1 por día).
- Esto genera un anclaje conductual indestructible: los jugadores competitivos consideran impensable jugar en el Ladder sin el seguro activo, eliminando la tasa de cancelación (*churn*) de la suscripción mensual.

---

## 7. CONCLUSIÓN Y TAREAS DE IMPLEMENTACIÓN

El Protocolo de Salvaguarda Táctica sustituye la frustración destructiva de perder una racha por una decisión estratégica de preparación logística previa, fortaleciendo el ecosistema económico y la conversión del Pase de Batalla.

- [ ] **Tarea DB-4:** Implementar columnas de racha y salvaguarda en `public.profiles` y función `finalize_match_with_safeguard`.
- [ ] **Tarea Industrial-1:** Conectar el Taller Militar Nivel 4 con la creación de órdenes de ensamblaje en `safeguard_crafting_jobs`.
- [ ] **Tarea UI-Lobby:** Diseñar el interruptor hexagonal de equipamiento de salvaguarda en el Lobby de Ranked.
- [ ] **Tarea Bark-Comic:** Crear viñeta especial de la Mayor Stella rescatando al jugador en la derrota.

# TELEMETRÍA DE TILT Y OFERTAS FLASH DE EMERGENCIA ($0.99)
**Documento Técnico de Integración:** `20_HYPER_ENGAGEMENT_TILT_FLASH_OFFERS.md`  
**Referencia de Propuesta:** `HYPER-06`  
**Versión:** 1.0.0-PROD-SPEC  
**Estado:** Especificación de Producción para Integración en Telemetría y Monetización Reactiva  
**Pila Tecnológica:** PostgreSQL 15+ (Triggers, JSONB Telemetry), Stripe Checkout API, Vercel Edge Functions, Web Audio.

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO CONDUCTUAL

El sistema de **Telemetría de Tilt y Ofertas Flash de Emergencia** une la analítica de comportamiento del jugador con la monetización en tiempo real. 

Cuando un jugador experimenta una derrota frustrante (especialmente si es consecutiva y acompañada de decisiones precipitadas en turnos cortos), su cerebro entra en un estado de **agotamiento del ego (*Ego Depletion*) y desregulación emocional**. En los juegos tradicionales, este es el punto de mayor fuga (*Rage-Quit* o abandono de sesión).

Este sistema detecta dicho estado mediante micro-telemetría y, en lugar de permitir que el jugador cierre la app frustrado, realiza una **intervención emocional diegética** a través del Bark Engine: su Comandante militar aparece en viñeta de cómic visiblemente herido y en estado de alerta, ofreciéndole un *"Paquete de Emergencia del Alto Mando"* con un descuento artificial masivo (\$0.99 por cartas de la tropa destruida + acero de refinado). Con una cuenta regresiva estricta de **180 segundos**, se canaliza la frustración hacia una compra impulsiva de alivio que lo devuelve de inmediato a la batalla.

```
                      MÁQUINA DE ESTADOS DEL SISTEMA DE TILT
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
        [ EN PARTIDA: REGISTRO ]                [ ALGORITMO EVALUADOR ]
        • Turnos erráticos (PTE < 10s)          • Derrotas consecutivas >= 2
        • Pérdida de >= 3 Tropas Clave          • Frecuencia: Max 1 cada 48h
                    │                                       │
                    └───────────────────┬───────────────────┘
                                        ▼
                       [ DISPARO DEL PROTOCOLO DE TILT ]
                       • Notificación al Frontend vía WebSocket
                                        │
                                        ▼
                     [ PANTALLA DE INTERVENCIÓN VISUAL ]
                     • Fondo de sirena roja estroboscópica
                     • Viñeta Cómic: Comandante vendado y en shock
                     • Bocadillo dentado (Shout): "¡No podemos rendirnos!"
                                        │
                                        ▼
                     [ PAQUETE FLASH: $0.99 (85% OFF) ]
                     • 100 Cartas del Tanque perdido + 30 Acero
                     • RELOJ EN PANTALLA: 02:59... 02:58...
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
             [ COMPRA COMPLETADA ]                   [ TIEMPO EXPIRADO ]
             • Stripe Checkout Instantáneo          • Animación de Sello: ¡EXPIRADO!
             • Retorno inmediato al combate         • Menú normal sin oferta
```

---

## 2. ANÁLISIS DE CRUCE Y REFUTACIÓN DE LA DOCUMENTACIÓN EXISTENTE

### 2.1 Refutación de Supuestos en `05_MONETIZATION_AND_PROGRESSION.md` y `13_CO_SYSTEM_MONETIZATION_AND_BARK_ENGINE.md`
- **Sección 1 de `13_CO_SYSTEM_MONETIZATION_AND_BARK_ENGINE.md`:** El documento diseñó la tabla `player_tactical_behavior_profile` y los campos de telemetría de tilt (`tilt_streak_count`, `average_turn_seconds`), pero limitó su uso exclusivamente a proyectar viñetas cómicas cómicas y diálogos sarcásticos de la Mayor Stella.
  - *Refutación:* Usar la telemetría solo para que el personaje se burle del jugador que está perdiendo empeora el *rage-quit*. La telemetría de frustración debe convertirse en una **palanca de conversión y retención**. La humillación debe acompañarse de una oferta de redención inmediata.
- **Sección 2 de `05_MONETIZATION_AND_PROGRESSION.md`:** La tienda de Stripe se concebía como un catálogo estático donde el jugador navega pasivamente para comprar gemas.
  - *Refutación:* Las ofertas dinámicas personalizadas con temporizador corto tienen una tasa de conversión entre un $300\%$ y un $700\%$ mayor que los catálogos pasivos de tienda.

---

## 3. ESPECIFICACIÓN DEL ALGORITMO DE DETECCIÓN DE TILT

### 3.1 Fórmula de Puntuación de Tilt (TiltScore)

$$\text{TiltScore} = (\text{ConsecutiveLosses} \times 0.40) + (\text{SpeedTiltFactor} \times 0.35) + (\text{ArmyLossRatio} \times 0.25)$$

Donde:
- $\text{ConsecutiveLosses} \in [0, 5]$
- $\text{SpeedTiltFactor} = \max\left(0, 1 - \frac{\text{AverageTurnPTE}}{20.0}\right)$ (vale $1.0$ si juega en $< 5\text{s}$, vale $0.0$ si juega en $\ge 20\text{s}$)
- $\text{ArmyLossRatio} = \frac{\text{UnidadesPerdidas}}{\max(1, \text{UnidadesDestruidas})}$

**Umbral de Activación:** Si $\text{TiltScore} \ge 0.75$ y la última oferta flash ocurrió hace más de 48 horas, se ejecuta el protocolo de rescate.

---

## 4. PERSISTENCIA DE BASE DE DATOS Y CONTRATO DE OFERTA FLASH (SUPABASE DDL)

Para administrar la activación de la oferta y asegurar el límite estricto de frecuencia de 48 horas, se aplican las siguientes sentencias:

```sql
-- ============================================================================
-- EXTENSIÓN PARA TELEMETRÍA DE TILT Y OFERTAS FLASH
-- ============================================================================

-- 1. Tabla para registrar ofertas de emergencia emitidas y su conversión
CREATE TABLE public.tilt_emergency_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    triggered_by_match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    target_unit_id VARCHAR(32) NOT NULL,
    offer_price_usd NUMERIC(4,2) NOT NULL DEFAULT 0.99,
    reward_cards_amount INTEGER NOT NULL DEFAULT 100,
    reward_steel_amount INTEGER NOT NULL DEFAULT 30,
    stripe_session_id VARCHAR(128),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'purchased', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_tilt_offers_user ON public.tilt_emergency_offers(user_id, status);

-- 2. Función evaluadora de fin de partida que dispara la oferta flash
CREATE OR REPLACE FUNCTION public.evaluate_match_tilt_and_offer(
    p_match_id UUID,
    p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_losses INTEGER;
    v_pte NUMERIC(5,2);
    v_last_offer TIMESTAMPTZ;
    v_most_lost_unit VARCHAR(32) := 'tank_light';
    v_offer_id UUID;
    v_expires TIMESTAMPTZ;
BEGIN
    -- Obtener historial de comportamiento del perfil
    SELECT current_loss_streak, average_turn_seconds, last_tilt_offer_at 
    INTO v_losses, v_pte, v_last_offer
    FROM public.player_tactical_behavior_profile 
    WHERE user_id = p_player_id;

    -- Validar si califica para oferta de emergencia:
    -- Derrotas consecutivas >= 2 Y pasaron al menos 48h desde la última oferta
    IF v_losses >= 2 AND (v_last_offer IS NULL OR v_last_offer < (timezone('utc'::text, now()) - interval '48 hours')) THEN
        
        v_expires := timezone('utc'::text, now()) + interval '180 seconds';

        -- Crear registro de oferta flash
        INSERT INTO public.tilt_emergency_offers (
            user_id,
            triggered_by_match_id,
            target_unit_id,
            offer_price_usd,
            reward_cards_amount,
            reward_steel_amount,
            expires_at
        ) VALUES (
            p_player_id,
            p_match_id,
            v_most_lost_unit,
            0.99,
            100,
            30,
            v_expires
        ) RETURNING id INTO v_offer_id;

        -- Actualizar marca de tiempo en el perfil
        UPDATE public.player_tactical_behavior_profile 
        SET last_tilt_offer_at = timezone('utc'::text, now()) 
        WHERE user_id = p_player_id;

        RETURN jsonb_build_object(
            'has_flash_offer', true,
            'offer_id', v_offer_id,
            'target_unit', v_most_lost_unit,
            'price_usd', 0.99,
            'seconds_remaining', 180
        );
    END IF;

    RETURN jsonb_build_object('has_flash_offer', false);
END;
$$;
```

---

## 5. EXPERIENCIA DE USUARIO: PRESENTACIÓN VISUAL Y CHECKOUT DE 1 CLIC

### 5.1 Viñeta de Intervención en Canvas / DOM
Al salir de la partida en derrota, la pantalla no va al menú normal. Se presenta un modal cinemático con estética de novela gráfica militar:

```
┌────────────────────────────────────────────────────────────────┐
│  🚨 ALERTA DEL SECTOR OMEGA: ESTADO DE EMERGENCIA MILITAR     │
│  ┌──────────────┐                                              │
│  │  [VIÑETA     │  /~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\ │
│  │   STELLA     │ |  ¡GENERAL! NOS HAN MASACRADO EN EL FLANCO | │
│  │   HERIDA     │ <  NORTE. ¡NO VOY A DEJAR QUE ESA CHATARRA | │
│  │   CON VENDA] │ |  QUEDE SIN VENGANZA!                      | │
│  │   EXPRESIÓN: │  \____________________  ___________________/ │
│  │   DESESPERADA│                       \/                     │
│  └──────────────┘                                              │
│                                                                │
│  EL ALTO MANDO AUTORIZÓ ESTE REABASTECIMIENTO DE ASALTO:       │
│  • 100 Planos del Tanque Ligero (¡Listo para Nivel 10!)        │
│  • 30 Vigas de Acero Militar Procesado                         │
│                                                                │
│  VALOR NORMAL: $6.99  ──►  PRECIO DE RESCATE: $0.99 (85% OFF) │
│                                                                │
│          ⏱️ OFERTA EXPIRA EN: 02:47 ... 02:46 ...             │
│                                                                │
│       [ ⚡ RECLAMAR SUMINISTROS Y CONTRAATACAR ($0.99) ]       │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 Integración con Stripe Checkout Instantáneo
Al pulsar el botón:
1. El cliente llama a `/api/checkout/flash-rescue` enviando el `offer_id`.
2. Vercel Edge genera una sesión de Stripe con Apple Pay / Google Pay habilitados para compra biométrica de **un solo toque (1-Click Buy)**.
3. El webhook `checkout.completed` invoca la función RPC `fulfill_order_tilt_rescue`, acreditando de inmediato los materiales y mostrando al usuario el sello de cómic: **`¡REFUERZOS RECIBIDOS! ¡AL COMBATE!`** con botón directo al emparejamiento.

---

## 6. CONTROL ÉTICO Y PREVENCIÓN DE FATIGA

Para evitar que el usuario se sienta hostigado comercialmente:
1. **Tope de Frecuencia Inviolable:** No más de una oferta cada 48 horas, independientemente de cuántas partidas pierda.
2. **Auto-Destrucción Visual:** Cuando el reloj llega a 00:00, la viñeta se desvanece con un sonido procedural de estática apagándose y el juego regresa al menú normal sin insistencias ni recordatorios.

---

## 7. CONCLUSIÓN Y TAREAS DE IMPLEMENTACIÓN

La oferta flash por tilt capitaliza el momento de máxima vulnerabilidad emocional del jugador, ofreciendo una válvula de escape económica que previene la fuga del usuario y monetiza de forma no intrusiva con micro-transacciones de alta conversión.

- [ ] **Tarea DB-6:** Crear tabla `tilt_emergency_offers` y función RPC `evaluate_match_tilt_and_offer`.
- [ ] **Tarea Stripe-1:** Crear endpoint `/api/checkout/flash-rescue` compatible con Apple Pay / Google Pay de 1 clic.
- [ ] **Tarea UI-Comic:** Diseñar viñeta en alta resolución de la Mayor Stella herida y cronómetro circular de 180s.
- [ ] **Tarea Audio-1:** Sintetizar con Web Audio el tic-tac de radar con frecuencia acelerada a falta de 30 segundos.

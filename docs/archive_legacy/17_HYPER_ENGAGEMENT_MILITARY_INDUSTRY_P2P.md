# COMPLEJO INDUSTRIAL MILITAR, CADENA DE REFINADO Y MERCADO P2P
**Documento Técnico de Integración:** `17_HYPER_ENGAGEMENT_MILITARY_INDUSTRY_P2P.md`  
**Referencia de Propuesta:** `HYPER-03`  
**Versión:** 1.0.0-PROD-SPEC  
**Estado:** Especificación de Producción para Integración en Economía y Base de Datos  
**Pila Tecnológica:** PostgreSQL 15+ (Supabase Functions, Triggers, RLS), Next.js / React 19 Client UI, Stripe Webhooks.

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO CONDUCTUAL

El **Complejo Industrial Militar y Mercado P2P** introduce una capa profunda de gestión macroeconómica sobre el juego táctico. El metajuego deja de ser una recolección pasiva de cofres temporizados para convertirse en una cadena de manufactura y especulación comercial.

Para subir de nivel cualquier carta o vehículo del catálogo, el jugador ya no solo necesita créditos y duplicados; requiere **Materiales Procesados Estratégicos** (Acero Militar, Hormigón Reforzado, Microprocesadores de Guía y Polímeros Blindados). Estos recursos deben extraerse en bruto de refinerías en el metajuego y someterse a procesos de refinado temporal (2h, 4h, 8h).

La economía se sostiene bajo dos pilares conductuales:
1. **La Carcoma Logística de 10 Horas:** Los silos de almacenamiento se llenan en 10 horas. Si el jugador no inicia sesión para transferir el mineral a las fundiciones o recolectar el producto terminado, la producción se detiene y una porción entra en riesgo de pérdida por corrupción/merma.
2. **Mercado Libre P2P entre Jugadores:** Los comandantes pueden comprar y vender excedentes de materias primas a cambio de Créditos de Batalla o Gemas, regulado por bandas de precios dinámicas y una tasa impositiva del 12% que drena liquidez y combate la hiperinflación.

```
                  FLUJO DE LA CADENA INDUSTRIAL Y MERCADO P2P
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
 [ MINA DE HIERRO ]           [ CANTERA DE PIEDRA ]         [ POZO TIERRAS RARAS ]
  Mineral en Bruto             Piedra en Bruto               Tierras Raras en Bruto
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       ▼
                       [ SILOS DE MATERIA PRIMA ]
                       • Límite de Capacidad: 10 Horas
                       • Alarma Push: "Almacén lleno"
                                       │
                                       ▼
                     [ PLANTAS DE REFINADO Y FUNDICIÓN ]
                     • Requiere: Tiempo + Combustible de Batalla
                     • Hierro  ──► Altos Hornos (4h)   ──► Vigas de Acero
                     • Piedra  ──► Planta Cemento (2h) ──► Hormigón Armado
                     • Raras   ──► Lab. Chips (8h)     ──► Microchips
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
     [ MEJORA DE UNIDADES EN HANGAR ]      [ MERCADO P2P GLOBAL ]
     • Nivel 5: Requiere 20 Acero          • Venta de Excedentes a Jugadores
     • Nivel 11: Requiere 150 Acero +      • Tasa Municipal: 12% Gold Sink
       40 Microchips + Hormigón            • Bandas de Precio Anti-Exploit
```

---

## 2. ANÁLISIS DE CRUCE Y REFUTACIÓN DE LA DOCUMENTACIÓN EXISTENTE

### 2.1 Refutación de Supuestos en `05_MONETIZATION_AND_PROGRESSION.md`
- **Sección 1.3 (Subida de Nivel de Cartas):** El modelo anterior definía que subir cartas solo costaba "Cartas Duplicadas" y "Créditos de Batalla" (e.g. Nivel 11 requería 800 duplicados y 15,000 créditos).
  - *Refutación:* Este sistema es unidimensional y puramente pasivo. Desconecta al jugador de la narrativa militar e impide la creación de cuellos de botella dinámicos. Con el Complejo Industrial, subir al Nivel 11 requiere además 120 Vigas de Acero y 35 Microchips, lo que obliga al usuario a operar sus fundiciones o comerciar en el mercado.
- **Sección 2 (Monetización):** La monetización se limitaba a paquetes de gemas y el pase de batalla básico.
  - *Refutación:* La adición de materiales procesados abre vías de monetización ética mediante "Contratos de Suministro Industrial" y alquiler de hornos de refinado de alta velocidad.

---

## 3. ESPECIFICACIÓN DE RECURSOS, CONVERSIONES Y EDIFICIOS

### 3.1 Catálogo de Recursos

| ID Recurso | Tipo | Nombre | Procedencia | Uso Principal |
|:---|:---:|:---|:---|:---|
| `raw_iron` | Bruto | Mineral de Hierro | Yacimiento Minero (Metagame) | Insumo para Altos Hornos |
| `raw_stone`| Bruto | Piedra de Cantera | Cantera de Grava (Metagame) | Insumo para Hormigonera |
| `raw_rare_earth` | Bruto | Tierras Raras | Complejo Geológico | Insumo para Laboratorio Microelectrónico |
| `refined_steel` | Procesado | Viga de Acero Militar | Alto Horno (4h refinado) | Blindaje de Tanques, Neotanques y Artillería |
| `refined_concrete`| Procesado | Hormigón Armado | Hormigonera (2h refinado) | Mejoras de Cuartel General y Estructuras |
| `refined_microchip`| Procesado | Microprocesador de Guía| Sala Limpia (8h refinado) | Misiles AA, Cazas de Dominio y Radares |
| `campaign_fuel` | Catalizador | Barril de Combustible | Recompensa de Partidas | Alimenta los hornos para duplicar velocidad |

### 3.2 Fórmulas de Producción y Costes de Refinado

$$\text{Rendimiento Acero} = \lfloor 100 \times \text{raw\_iron} \rfloor \xrightarrow{4\text{ Horas}} 10 \text{ Vigas de Acero}$$
$$\text{Rendimiento Hormigón} = \lfloor 80 \times \text{raw\_stone} \rfloor \xrightarrow{2\text{ Horas}} 15 \text{ Bloques de Hormigón}$$
$$\text{Rendimiento Microchips} = \lfloor 200 \times \text{raw\_rare\_earth} \rfloor \xrightarrow{8\text{ Horas}} 5 \text{ Microchips}$$

* **Especializaciones Corporativas:** El jugador puede elegir una de las siguientes tres ramas de su corporación militar:
  1. **Consorcio Siderúrgico Vulcano:** $+35\%$ velocidad de producción de Acero, $-15\%$ producción de Microchips.
  2. **División Tecnológica Aegis:** $+35\%$ velocidad de Microchips, $-15\%$ producción de Hormigón.
  3. **Ingeniería Pesada Titán:** $+35\%$ producción de Hormigón y Capacidad de Silos $+50\%$.
  - Cambiar de especialización cuesta **500 Créditos de Batalla** y tiene un tiempo de reconversión industrial de **12 horas**.

---

## 4. PERSISTENCIA DE BASE DE DATOS Y TRANSACCIONALIDAD P2P (SUPABASE DDL)

Para implementar el sistema industrial y el mercado P2P, se incorporan las siguientes tablas y funciones en PostgreSQL:

```sql
-- ============================================================================
-- EXTENSIÓN PARA COMPLEJO INDUSTRIAL Y MERCADO P2P
-- ============================================================================

-- 1. Tabla de inventario de recursos industriales del jugador
CREATE TABLE public.user_industrial_inventory (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    raw_iron INTEGER NOT NULL DEFAULT 500 CHECK (raw_iron >= 0),
    raw_stone INTEGER NOT NULL DEFAULT 500 CHECK (raw_stone >= 0),
    raw_rare_earth INTEGER NOT NULL DEFAULT 100 CHECK (raw_rare_earth >= 0),
    refined_steel INTEGER NOT NULL DEFAULT 50 CHECK (refined_steel >= 0),
    refined_concrete INTEGER NOT NULL DEFAULT 50 CHECK (refined_concrete >= 0),
    refined_microchip INTEGER NOT NULL DEFAULT 10 CHECK (refined_microchip >= 0),
    campaign_fuel INTEGER NOT NULL DEFAULT 5 CHECK (campaign_fuel >= 0),
    corporate_specialization VARCHAR(32) NOT NULL DEFAULT 'balanced' 
        CHECK (corporate_specialization IN ('balanced', 'vulcano_steel', 'aegis_tech', 'titan_heavy')),
    last_harvest_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Tabla de colas de refinado activo (Hornos y Laboratorios)
CREATE TABLE public.industrial_refining_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    building_type VARCHAR(32) NOT NULL CHECK (building_type IN ('smelter', 'concrete_plant', 'tech_lab')),
    input_resource VARCHAR(32) NOT NULL,
    input_amount INTEGER NOT NULL,
    output_resource VARCHAR(32) NOT NULL,
    output_amount INTEGER NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completes_at TIMESTAMPTZ NOT NULL,
    is_boosted_with_fuel BOOLEAN NOT NULL DEFAULT false,
    is_claimed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_refining_user ON public.industrial_refining_jobs(user_id, is_claimed);

-- 3. Tabla del Mercado P2P Global de Suministros
CREATE TABLE public.p2p_market_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    resource_type VARCHAR(32) NOT NULL CHECK (resource_type IN ('refined_steel', 'refined_concrete', 'refined_microchip')),
    quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 1000),
    price_per_unit INTEGER NOT NULL CHECK (price_per_unit > 0),
    total_price INTEGER NOT NULL CHECK (total_price > 0),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '48 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_p2p_market_active ON public.p2p_market_listings(resource_type, status, price_per_unit ASC);

-- 4. Función RPC para compra atómica en el Mercado P2P con Impuesto Municipal del 12%
CREATE OR REPLACE FUNCTION public.execute_p2p_purchase(
    p_buyer_id UUID,
    p_listing_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing public.p2p_market_listings%ROWTYPE;
    v_buyer_credits INTEGER;
    v_tax_amount INTEGER;
    v_seller_payout INTEGER;
BEGIN
    -- Bloquear el listing para evitar condiciones de carrera
    SELECT * INTO v_listing 
    FROM public.p2p_market_listings 
    WHERE id = p_listing_id AND status = 'active'
    FOR UPDATE;

    IF v_listing.id IS NULL THEN
        RAISE EXCEPTION 'La orden de venta ya no está disponible.';
    END IF;

    IF v_listing.seller_id = p_buyer_id THEN
        RAISE EXCEPTION 'No puedes comprar tus propias órdenes de venta.';
    END IF;

    -- Verificar fondos del comprador
    SELECT battle_credits INTO v_buyer_credits 
    FROM public.profiles 
    WHERE id = p_buyer_id 
    FOR UPDATE;

    IF v_buyer_credits < v_listing.total_price THEN
        RAISE EXCEPTION 'Fondos insuficientes en Créditos de Batalla.';
    END IF;

    -- Calcular impuesto municipal del 12%
    v_tax_amount := FLOOR(v_listing.total_price * 0.12);
    v_seller_payout := v_listing.total_price - v_tax_amount;

    -- 1. Descontar créditos al comprador
    UPDATE public.profiles 
    SET battle_credits = battle_credits - v_listing.total_price 
    WHERE id = p_buyer_id;

    -- 2. Acreditar recursos al comprador
    IF v_listing.resource_type = 'refined_steel' THEN
        UPDATE public.user_industrial_inventory 
        SET refined_steel = refined_steel + v_listing.quantity 
        WHERE user_id = p_buyer_id;
    ELSIF v_listing.resource_type = 'refined_concrete' THEN
        UPDATE public.user_industrial_inventory 
        SET refined_concrete = refined_concrete + v_listing.quantity 
        WHERE user_id = p_buyer_id;
    ELSIF v_listing.resource_type = 'refined_microchip' THEN
        UPDATE public.user_industrial_inventory 
        SET refined_microchip = refined_microchip + v_listing.quantity 
        WHERE user_id = p_buyer_id;
    END IF;

    -- 3. Acreditar pago neto al vendedor
    UPDATE public.profiles 
    SET battle_credits = battle_credits + v_seller_payout 
    WHERE id = v_listing.seller_id;

    -- 4. Actualizar estado de la orden
    UPDATE public.p2p_market_listings 
    SET status = 'sold' 
    WHERE id = p_listing_id;

    RETURN jsonb_build_object(
        'success', true,
        'resource_type', v_listing.resource_type,
        'quantity', v_listing.quantity,
        'total_paid', v_listing.total_price,
        'tax_collected', v_tax_amount
    );
END;
$$;
```

---

## 5. LA CARCOMA LOGÍSTICA DE 10 HORAS: IMPLEMENTACIÓN

### 5.1 Regla de Desborde y Merma
Las minas acumulan recursos brutos a razón de:
- Hierro: $50 / \text{hora}$ (Capacidad máxima de silo: $500$ unidades en 10 horas).
- Piedra: $40 / \text{hora}$ (Capacidad máxima de silo: $400$ unidades en 10 horas).
- Tierras Raras: $15 / \text{hora}$ (Capacidad máxima de silo: $150$ unidades en 10 horas).

Si el timestamp transcurrido $(\text{now()} - \text{last\_harvest\_at}) > 10\text{ horas}$:
1. La producción se congela automáticamente.
2. Cada hora adicional que transcurra sin recolección activa el **Protocolo de Merma por Corrupción**: se descuenta un $2.5\%$ del volumen acumulado en el silo.
3. Se dispara una notificación push a través de Firebase/WebPush al móvil o navegador:
   > **Alerta del Estado Mayor:** *"¡Silos Industriales Saturados! La producción se ha detenido y estamos perdiendo acero por contrabando. Inicia sesión para transferir la carga a los altos hornos."*

---

## 6. POLÍTICA ANTI-EXPLOTACIÓN Y REGULACIÓN MACROECONÓMICA

Para evitar la creación de cuentas "granjas" (*smurfs/bots*) que vendan recursos a precios manipulados:
1. **Bandas de Precio Dinámicas (Price Collars):** El precio por unidad en el mercado P2P no puede desviarse más de un $\pm 35\%$ respecto al Promedio Móvil de Mercado (PMM) de las últimas 24 horas.
2. **Requisito de Entrada:** Para publicar órdenes en el mercado P2P se requiere **Nivel de Cuenta 8** y haber completado al menos **15 partidas PvP clasificatorias**.
3. **Límite de Órdenes Simultáneas:** Usuarios F2P tienen un máximo de 3 órdenes de venta activas. Miembros del Command Pass tienen hasta 8 órdenes simultáneas.

---

## 7. CONCLUSIÓN Y TAREAS DE IMPLEMENTACIÓN

La incorporación del Complejo Industrial Militar y Mercado P2P transforma *Tactical Command* en una experiencia de estrategia total, donde la supremacía en el campo de batalla depende de la solidez de la infraestructura logística y comercial.

- [ ] **Tarea DB-3:** Desplegar DDL de `user_industrial_inventory`, `industrial_refining_jobs` y `p2p_market_listings`.
- [ ] **Tarea Backend-1:** Programar Edge Function en cron para cálculo de PMM (Promedio Móvil de Mercado) cada 6 horas.
- [ ] **Tarea Frontend-1:** Desarrollar interfaz visual del Hangar Industrial con diagramas de flujo de fundición estilo plano militar (*blueprint*).
- [ ] **Tarea UI-P2P:** Construir el panel de compra y venta del mercado con libro de órdenes y confirmación de compra con cálculo de impuesto.

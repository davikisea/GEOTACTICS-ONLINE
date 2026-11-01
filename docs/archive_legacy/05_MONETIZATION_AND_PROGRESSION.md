# MODELO DE PROGRESIÓN, MONETIZACIÓN Y PAGOS (STRIPE + SUPABASE)
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 1.0.0-PROD-SPEC  
**Integración:** Stripe Checkout API, Supabase Database Webhooks, Row Level Security.

---

## 1. FÓRMULAS MATEMÁTICAS DE PROGRESIÓN

El diseño de progresión busca recompensar la habilidad táctica y el tiempo invertido sin generar inflación desmedida ni ventajas pay-to-win.

### 1.1 Curva de Nivel de Cuenta
La cantidad de Puntos de Experiencia (XP) necesarios para pasar del nivel $N$ al nivel $N+1$ se rige por una curva de potencia asimétrica:

$$\text{XP}_{\text{Requerido}}(N) = \left\lfloor 150 \times N^{1.85} \right\rfloor$$

$$\text{XP}_{\text{Acumulado}}(N) = \sum_{k=1}^{N-1} \text{XP}_{\text{Requerido}}(k)$$

#### Tabla de Hitos de Nivel (Niveles 1 al 20):

| Nivel ($N$) | XP para Siguiente Nivel | XP Acumulado Total | Recompensas Desbloqueadas |
|:---:|:---:|:---:|:---|
| **1** | 150 XP | 0 XP | Armada Inicial Básica (Infantería, Tanque Ligero, Recon, Artillería) |
| **2** | 541 XP | 150 XP | Desbloqueo: Unidad *Mecanizados (Bazuca Antitanque)* + 200 Créditos |
| **3** | 1,123 XP | 691 XP | Desbloqueo: *Helicóptero de Batalla (B-Copter)* + 300 Créditos |
| **4** | 1,883 XP | 1,814 XP | Desbloqueo: *Vehículo Antiaéreo* + Marco de Perfil "Cabo" |
| **5** | 2,813 XP | 3,697 XP | **Hito:** 25 Gemas de Mando + Skin Tanque Ligero "Camuflaje Desértico" |
| **6** | 3,907 XP | 6,510 XP | Desbloqueo: *Lanzamisiles Pesado* + 600 Créditos |
| **7** | 5,160 XP | 10,417 XP | Desbloqueo: *Tanque Mediano de Asalto* |
| **8** | 6,569 XP | 15,577 XP | Skin Infantería "Fuerzas Especiales Urbanas" |
| **9** | 8,129 XP | 22,146 XP | Desbloqueo: *Caza de Supremsacía Aérea* |
| **10** | 9,839 XP | 30,275 XP | **Hito:** 50 Gemas de Mando + Insignia "Veterano de Batalla" |
| **15** | 20,443 XP | 98,412 XP | **Hito:** Desbloqueo de Comandante Táctico "Garrison" (Especialista en Defensa) |
| **20** | 34,228 XP | 224,960 XP | **Hito:** Skin Legendario de Cuartel General "Base de Operaciones Ártica" |

---

### 1.2 Cálculo de Experiencia y Créditos por Partida

La recompensa de una partida finalizada evalúa tres factores objetivos: desempeño básico, objetivos capturados y neutralización de fuerzas enemigas.

$$\text{Puntaje Táctico} = \text{Base} + (\text{CiudadesCapturadas} \times A) + (\text{UnidadesDestruidas} \times B) + \min(\text{Turnos}, 30) \times C$$

Donde las constantes de diseño son:
- $\text{Base}_{\text{XP}} = 120$
- $A_{\text{Captura}} = 45 \text{ XP}$ por propiedad capturada exitosamente
- $B_{\text{Destrucción}} = 35 \text{ XP}$ por unidad enemiga eliminada
- $C_{\text{Turno}} = 6 \text{ XP}$ por turno resistido/completado (máximo 30 turnos para evitar exploit de estancamiento)

$$\text{Multiplicador de Resultado} = \begin{cases} 
2.2 & \text{si el jugador es Ganador (Victoria)} \\ 
0.85 & \text{si el jugador es Derrotado} \\
0.0 & \text{si el jugador Abandonó la partida (Penalización por deserción)}
\end{cases}$$

$$\text{XP Otorgado} = \lfloor \text{Puntaje Táctico} \times \text{Multiplicador de Resultado} \rfloor$$

#### Fórmula de Créditos de Batalla (Moneda Blanda):
$$\text{Créditos} = \lfloor (60 + (\text{CiudadesCapturadas} \times 20) + (\text{UnidadesDestruidas} \times 15)) \times \text{Multiplicador de Resultado} \rfloor$$

---

### 1.3 Ciclo de Cofres, Cartas Duplicadas y Escalado (+2.5%/nivel)

El metajuego fuera de partida implementa un sistema coleccionable inspirado en *Clash Royale* pero estrictamente controlado para salvaguardar el balance táctico:

```
┌─────────────────────────────────────────────────────────┐
│                   VICTORIA EN ENFRENTAMIENTO            │
└────────────────────────────┬────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   +Trofeos de Escalafón              Ranura de Cofres (Máx 4)
   (Avanza en Teatros de Guerra)      (Madera 3h, Hierro 8h, Blindado 12h)
            │                                 │
            ▼                                 ▼
   Desbloquea Nuevas Cartas           Apertura por Tiempo o Gemas
   de Unidades y Comandantes                  │
                                              ▼
                                      Otorga: Oro + Cartas Duplicadas
                                              │
                                              ▼
                                      Mejora de Nivel de Unidades
                                      (+2.5% Stats / XP de Comandante)
```

#### Tabla de Tipos de Cofre y Tiempos de Apertura:
| Tipo de Cofre | Tiempo de Apertura | Coste Desbloqueo Inmediato | Recompensas Típicas |
|:---|:---:|:---:|:---|
| **Cofre de Madera** | 3 Horas (10,800 s) | 18 Gemas | 120 - 180 Créditos + 15 Cartas (Comunes/Raras) |
| **Cofre de Hierro** | 8 Horas (28,800 s) | 48 Gemas | 350 - 500 Créditos + 45 Cartas (Épicas garantizadas) |
| **Cofre Blindado (Titanio)**| 12 Horas (43,200 s) | 72 Gemas | 800 - 1,200 Créditos + 90 Cartas (Comandantes y Legendarias) |

#### Tabla de Subida de Nivel de Cartas y Escalado Estandarizado:
$$\text{Stat Final} = \text{Stat Base} \times \left(1 + (\text{Nivel} - 1) \times 0.025\right)$$

| Nivel de Carta | Cartas Duplicadas Requeridas | Coste en Créditos | Multiplicador de Estadísticas | Entorno de Aplicación |
|:---:|:---:|:---:|:---:|:---|
| **Nivel 1** | Base (0) | 0 | 100.0% (Base) | Inicial |
| **Nivel 5** | 20 Duplicados | 400 Créditos | 110.0% (+10%) | Teatros de Guerra tempranos |
| **Nivel 9** | 200 Duplicados | 4,000 Créditos | 120.0% (+20%) | Teatros medios |
| **Nivel 11** | 800 Duplicados | 15,000 Créditos | 125.0% (+25%) | **CAP ESTÁNDAR DE TORNEOS (Esports / Ligas)** |
| **Nivel 15 (Máx)**| 5,000 Duplicados | 100,000 Créditos | 135.0% (+35%) | Máximo Casual / PvE |

> [!IMPORTANT]
> **Regla de Oro Competitiva:** En Ligas de Rango, Guerras de Clanes y Torneos Profesionales, todas las unidades se nivelan forzosamente al **Nivel 11 (Cap de Torneo)**, garantizando que el dinero o el tiempo acumulado no puedan comprar ventajas estadísticas en las competiciones oficiales.

---

## 2. INTEGRACIÓN DE MONETIZACIÓN Y PAGOS (STRIPE CHECKOUT + SUPABASE)

```
+------------------+         +----------------------+         +-----------------------+
|  Cliente Web     |         |  Vercel Edge Route   |         |    Stripe Checkout    |
|  (Tienda/Pase)   |         |  /api/checkout       |         |                       |
+--------+---------+         +----------+-----------+         +-----------+-----------+
         |                              |                                 |
         |-- 1. POST /api/checkout ---->|                                 |
         |   (packageId, userId)        |-- 2. stripe.checkout.create --->|
         |                              |   (client_reference_id=userId)  |
         |                              |<-- 3. session.url --------------|
         |<-- 4. Redirige a Stripe -----|                                 |
         |                                                                |
         |                     [Usuario completa el pago]                |
         |                                                                v
         |                   +----------------------+         +-----------------------+
         |                   |  Vercel Webhook      |<--------|  stripe webhook event |
         |                   |  /api/webhooks/stripe|         |  'checkout.completed' |
         |                   +----------+-----------+         +-----------------------+
         |                              |
         |               [Verifica firma HMAC con STRIPE_WEBHOOK_SECRET]
         |                              |
         |                              v
         |                   +----------------------+
         |                   | Supabase RPC         |
         |                   | 'fulfill_order_gems' |
         |                   +----------+-----------+
         |                              |
         |               [Acredita Gemas / Activa Pase de Temporada en DB]
         |                              |
         |<-- 5. Sync en Realtime ------+
```

### 2.1 Tabla de Auditoría de Compras y Transacciones (SQL DDL)

```sql
CREATE TABLE public.payments_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stripe_session_id VARCHAR(128) NOT NULL UNIQUE,
    stripe_payment_intent_id VARCHAR(128),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'usd',
    product_type VARCHAR(32) NOT NULL CHECK (product_type IN ('gems_pack', 'battle_pass', 'cosmetic_bundle')),
    product_sku VARCHAR(64) NOT NULL,
    items_delivered JSONB NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_payments_audit_user ON public.payments_audit(user_id);
```

### 2.2 Endpoint de Webhook Seguro en TypeScript (Vercel API Route)

```typescript
// /src/pages/api/webhooks/stripe.ts o /app/api/webhooks/stripe/route.ts
import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Llave de administrador para omitir RLS
);

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Firma ausente', { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Error de verificación de Webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const metadata = session.metadata || {};

    if (!userId) {
      return new Response('No se encontró client_reference_id', { status: 400 });
    }

    const gemsAmount = parseInt(metadata.gems_amount || '0', 10);
    const productSku = metadata.product_sku || 'gems_pack_standard';

    // Llamada idempotente en PostgreSQL
    const { error } = await supabaseAdmin.rpc('fulfill_order_gems', {
      p_user_id: userId,
      p_stripe_session_id: session.id,
      p_amount_cents: session.amount_total || 0,
      p_gems_amount: gemsAmount,
      p_product_sku: productSku
    });

    if (error) {
      console.error('Error al entregar pedido en Supabase:', error);
      return new Response('Error en procesamiento de base de datos', { status: 500 });
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

### 2.3 Función RPC Idempotente para Entrega de Gemas
```sql
CREATE OR REPLACE FUNCTION public.fulfill_order_gems(
    p_user_id UUID,
    p_stripe_session_id VARCHAR(128),
    p_amount_cents INTEGER,
    p_gems_amount INTEGER,
    p_product_sku VARCHAR(64)
)
RETURNS JSONB AS $$
BEGIN
    -- Comprobar si la sesión ya fue procesada (Idempotencia)
    IF EXISTS (SELECT 1 FROM public.payments_audit WHERE stripe_session_id = p_stripe_session_id) THEN
        RETURN jsonb_build_object('success', true, 'message', 'Orden ya entregada con anterioridad');
    END IF;

    -- Registrar auditoría de pago
    INSERT INTO public.payments_audit (
        user_id, stripe_session_id, amount_cents, product_type, product_sku, items_delivered
    ) VALUES (
        p_user_id, p_stripe_session_id, p_amount_cents, 'gems_pack', p_product_sku,
        jsonb_build_object('command_gems', p_gems_amount)
    );

    -- Abonar las gemas al perfil
    UPDATE public.profiles
    SET command_gems = command_gems + p_gems_amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'gems_added', p_gems_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---

## 3. SISTEMA DE PASE DE BATALLA (COMMAND PASS) Y COMANDANTES

### 3.1 Estructura del Command Pass (50 Niveles)
El Command Pass organiza la progresión estacional en dos vías simultáneas desbloqueadas mediante **Insignias de Batalla** (ganadas al destruir unidades, capturar sedes y completar misiones diarias):

```
[ SISTEMA DE PASE DE BATALLA: COMMAND PASS ]

Nivel 1 ───────────────────────────────────────────────────────────► Nivel 50
┌──────────────────────────────────────────────────────────────────────────┐
│ VÍA GRATUITA (Accesible para todos los jugadores mediante insignias)     │
│ [Cofre Madera]   [Oro]   [Comodín Común]   ...   [Cofre Legendario]     │
├──────────────────────────────────────────────────────────────────────────┤
│ VÍA PREMIUM (Reclamación Retroactiva Garantizada al Comprar)             │
│ [Comandante Exclusivo] [Piel de Fábrica] [Gemas] ... [Aspecto HQ Dorado]  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Mecánica de Reclamación Retroactiva (Retroactive Claiming)
- **Cero Ansiedad de Pérdida:** El jugador no necesita comprar el pase al día 1. Puede progresar enteramente en la Vía Gratuita hasta el Nivel 50.
- **Desbloqueo Instantáneo:** Si el jugador adquiere el *Command Pass Premium* en cualquier momento (ejemplo: estando en el Nivel 42), se ejecuta el RPC `rpc_claim_retroactive_pass_rewards` que desbloquea y deposita en el inventario todas las recompensas Premium acumuladas desde el Nivel 1 hasta el Nivel 42 en cascada inmediata.

### 3.3 Matriz de Recompensas: Vía Gratuita vs Command Pass Premium
| Tipo de Recompensa | Vía Gratuita | Vía Premium (Command Pass) |
|:---|:---|:---|
| **Comandantes Exclusivos** | No disponible (Trío F2P: Vance, Stella, Volkov) | 1 Comandante Exclusivo desbloqueado de inmediato en Nivel 1. |
| **Cosméticos de Cómic** | Bocadillos estándar blancos | Skins de bocadillos temáticos (Vintage Ben-Day, Manga, Noir) y sellos de onomatopeyas Pop-Art. |
| **Cofres de Recursos** | Cofres Básicos (Madera y Hierro) | Cofres Blindados y Cofres de Comodines de Élite. |
| **Oro y Gemas** | Oro estándar | Multiplicador de oro $\times 3$ y Gemas de Mando de pago. |
| **Cosméticos** | Emotes básicos | Pieles para Fábricas, Aspectos dorados de HQ y Marcos de Perfil de novela gráfica. |
| **Beneficios Funcionales** | Ninguno | Cola automática de apertura de cofres + 1 reintento con descuento en torneos. |

### 3.4 Filosofía Ética: Cero Pay-to-Win y Cap de Torneo
1. **Igualdad Numérica:** Los Comandantes de pago poseen los mismos puntos de salud base de HQ y límites de poder que los F2P. Su valor radica en la identidad narrativa, las expresiones ilustradas en viñeta de cómic (*Bark Engine*), los bocadillos estilizados, la interfaz temática y las animaciones de victoria.
2. **Nivel de Comandante (Torre del Rey):** Cada Comandante sube de nivel con XP acumulada de cartas mejoradas, aumentando los HP del HQ en partidas informales, pero rigurosamente limitado por el **Cap de Torneo Nivel 11** en cualquier enfrentamiento clasificatorio o competitivo.

---

## 4. TEATROS DE GUERRA (ARENAS COMPETITIVAS) Y TABLA DE HITOS DEL COMMAND PASS

### 4.1 Teatros de Guerra (Arenas de Trofeos 1 al 10)
Los trofeos obtenidos en victorias permiten ascender a través de 10 Teatros de Guerra que desbloquean nuevas unidades y mapas:

| Teatro de Guerra (Arena) | Rango de Trofeos | Entorno de Mapa Predominante | Cartas Desbloqueadas al Alcanzar | Recompensa de Oro por Victoria |
|:---|:---:|:---:|:---|:---:|
| **1. Campo de Instrucción** | 0 - 399 | Llanuras y carreteras básicas | Infantería, Mech, Recon, Tanque Ligero | +25 Oro |
| **2. Valle de la Niebla** | 400 - 799 | Bosques densos y ríos | Artillería, Transporte Blindado (APC) | +40 Oro |
| **3. Cumbres Rocosas** | 800 - 1,199 | Cordilleras y pasos estrechos | Tanque Mediano, B-Copter | +60 Oro |
| **4. Frente Antiaéreo** | 1,200 - 1,599 | Llanuras abiertas con pistas | Blindado Antiaéreo Vulcan | +85 Oro |
| **5. Bahía Táctica** | 1,600 - 1,999 | Litoral, islas y arrecifes | Lancha de Desembarco, Acorazado | +115 Oro |
| **6. Bastión de Asedio** | 2,000 - 2,499 | Zonas urbanas y fábricas | Lanzacohetes de Asedio, Batería Misiles | +150 Oro |
| **7. Espacio Aéreo Hostil**| 2,500 - 2,999 | Mapas abiertos sin cobertura | Caza de Superioridad, T-Copter | +190 Oro |
| **8. Fortaleza Blindada** | 3,000 - 3,499 | Fábricas múltiples y ciudades | Neotanque Pesado | +240 Oro |
| **9. Tormenta Ártica** | 3,500 - 3,999 | Terreno nevado con visibilidad baja | Bombardero Pesado | +300 Oro |
| **10. Liga Gran Mariscal** | 4,000+ | Todos los teatros combinados | Marco Legendario de Perfil "Gran Mariscal" | +400 Oro |

### 4.2 Tabla de Hitos del Command Pass (50 Niveles de Temporada)
- **Costo por Nivel:** 10 Insignias de Batalla (Total para completar: 500 Insignias).
- **Fuentes de Insignias:** +1 por unidad enemiga eliminada, +2 por propiedad capturada, +5 por victoria en partida.

| Nivel | Insignias Acumuladas | Recompensa Vía Gratuita | Recompensa Vía Premium (Command Pass) |
|:---:|:---:|:---|:---|
| **1** | 10 | 250 Oro | **Desbloqueo Inmediato: Comandante Exclusivo de Temporada** |
| **5** | 50 | Cofre de Madera (3h) | Skin de Bocadillo de Cómic "Vintage Ben-Day" |
| **10** | 100 | 500 Oro + 20 Comodines Comunes | Sello Pop-Art ¡BOOM! Dorado |
| **15** | 150 | Cofre de Hierro (8h) | Piel de Fábrica "Fortaleza de Hormigón" |
| **20** | 200 | 1,000 Oro | 100 Gemas de Mando + Aspecto de Cuartel General |
| **25** | 250 | Cofre de Hierro (8h) | Pack de Emotes de Historieta para el Comandante |
| **30** | 300 | 1,500 Oro + 10 Comodines Épicos | Skin de Tanque "Camuflaje de Temporada" |
| **35** | 350 | Cofre de Madera (3h) | 150 Gemas de Mando |
| **40** | 400 | 2,500 Oro | Marco de Viñeta Legendario para Perfil |
| **45** | 450 | Cofre Blindado (12h) | Animación de Superpoder SCOP con Tinta de Cómic |
| **50** | 500 | **Cofre Legendario de Gran Mariscal** | **Aspecto Dorado de Cuartel General "Palacio Militar"** |
```

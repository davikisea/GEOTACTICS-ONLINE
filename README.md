# Tactical Command: Wars of Legacy

Un videojuego de estrategia táctica por turnos (Turn-Based Strategy / TBS) ejecutado nativamente en el navegador web con estética militar estilizada, balance simétrico inspirado en **Advance Wars** y metagame de progresión RPG no pay-to-win.

- **Frontend:** Next.js 15 (React 19), TypeScript, Tailwind CSS v4, HTML5 Canvas 2D / PixiJS Core (60 FPS desacoplados).
- **Backend & Realtime:** Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security, Supabase Realtime Channels).
- **Despliegue & Edge:** Vercel Edge Runtime, Serverless Functions para arbitraje antitrampas y Web Workers en cliente.
- **Monetización:** Stripe Checkout API (Pase de Temporada y Gemas Cosméticas, cero venta de ventajas estadísticas).

---

## 1. COMANDOS DE INICIALIZACIÓN DEL PROYECTO

Para replicar este proyecto en un entorno local desde cero con Next.js App Router, TypeScript, Tailwind CSS y ESLint:

```bash
# 1. Crear el proyecto Next.js con App Router y TypeScript
npx create-next-app@latest tactical-command \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm

# 2. Navegar al directorio
cd tactical-command

# 3. Instalar dependencias del cliente de Supabase, iconos y animación
npm install @supabase/supabase-js @supabase/ssr lucide-react motion stripe

# 4. Instalar tipos de desarrollo
npm install -D @types/node @types/react @types/react-dom
```

---

## 2. ESTRUCTURA DE CARPETAS DEL PROYECTO

```
tactical-command/
├── docs/                                    # Documentación técnica y especificaciones de arquitectura
│   ├── 01_GAME_DESIGN_DOCUMENT.md          # GDD: Visión, core loop, terreno y unidades
│   ├── 02_DATABASE_SCHEMA.md               # Esquema DDL en PostgreSQL y políticas RLS
│   ├── 03_GAME_ENGINE_ARCHITECTURE.md      # Motor de Canvas, FSM de inputs y A* Pathfinding
│   ├── 04_NETWORKING_AND_BOTS.md           # Protocolo Supabase Realtime y heurística de Bots
│   ├── 05_MONETIZATION_AND_PROGRESSION.md  # Curva matemática de XP y Webhook de Stripe
│   ├── 06_PROJECT_ROADMAP.md               # Roadmap quincenal en 5 fases
│   ├── 07_DATABASE_INFRASTRUCTURE_PLAN.md  # Diagrama de flujo Next.js/Supabase y Triggers
│   ├── 08_TACTICAL_AND_ECONOMIC_SYSTEMS_GDD.md # Matriz 12x12 de daño y economía no-P2W
│   ├── 09_FRONTEND_ENGINE_AND_AI_ARCHITECTURE.md # Desacoplamiento a 60 FPS y Web Workers
│   └── 10_DEFINITIVE_SPRINT_EXECUTION_PLAN.md   # Plan de Sprints 1 a 6 con DoDs
├── public/                                  # Assets estáticos y spritesheets
│   ├── atlas_terrain_units.webp             # Spritesheet consolidado (380 KB)
│   └── favicon.ico
├── src/
│   ├── app/                                 # Next.js 15 App Router
│   │   ├── api/
│   │   │   ├── match/dispatch-action/       # Edge Function de arbitraje de turnos
│   │   │   └── webhooks/stripe/             # Webhook de pagos idempotente
│   │   ├── match/[id]/                      # Vista de partida con Canvas interactivo
│   │   ├── armory/                          # Constructor de Loadouts (Decks de 14 cartas)
│   │   ├── layout.tsx                       # Layout raíz
│   │   └── page.tsx                         # Menú principal y lobby
│   ├── components/                          # Componentes reutilizables de UI
│   │   ├── ActionRadialMenu.tsx             # Menú radial (Atacar, Capturar, Esperar)
│   │   ├── ResourceHUD.tsx                  # Contador de fondos G y temporizador de 120s
│   │   └── TacticalBoardCanvas.tsx          # Contenedor del Canvas de 60 FPS
│   ├── engine/                              # Lógica pura del motor de juego (independiente de React)
│   │   ├── CombatEngine.ts                  # Fórmulas de daño y contraataque
│   │   ├── EventBridge.ts                   # Bus de eventos React <-> Canvas
│   │   └── TacticalPathfinder.ts            # A* Pathfinding con costes por locomoción
│   ├── lib/
│   │   └── supabase/                        # Conexión y configuración de Supabase
│   │       ├── client.ts                    # Cliente para el navegador
│   │       └── server.ts                    # Cliente para Server Components / Actions
│   ├── types/
│   │   └── index.ts                         # Tipos TypeScript canónicos
│   ├── workers/
│   │   └── tacticalAiWorker.ts              # IA de Bot en Web Worker (Cero costo serverless)
│   ├── App.tsx                              # Centro de Mando Táctico y Visor de Arquitectura
│   ├── index.css                            # Estilos globales con Tailwind CSS
│   └── main.tsx                             # Entry point
├── .env.example                             # Plantilla de variables de entorno
├── metadata.json                            # Metadatos del applet
├── package.json                             # Dependencias y scripts
├── tsconfig.json                            # Configuración estricta de TypeScript
└── vite.config.ts / next.config.mjs         # Configuración del bundler
```

---

## 3. VARIABLES DE ENTORNO (.env.local)

Configura las siguientes variables en tu archivo `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-clave-anonima-publica"
SUPABASE_SERVICE_ROLE_KEY="tu-clave-de-servicio-privada" # Solo para backend/Edge

# Stripe (Monetización Ética)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# URL Base
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 4. GUÍA DE DESPLIEGUE DE BASE DE DATOS (SUPABASE)

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Dirígete a la sección **SQL Editor**.
3. Ejecuta en orden secuencial el archivo `docs/02_DATABASE_SCHEMA.md` o `docs/07_DATABASE_INFRASTRUCTURE_PLAN.md`:
   - **Paso 1:** Extensiones `uuid-ossp` y `pgcrypto`.
   - **Paso 2:** Tablas `profiles`, `units_catalog`, `user_unlocks`, `active_matches`, `match_state` y `match_history`.
   - **Paso 3:** Habilitación de Row Level Security (RLS) y aplicación de políticas.
   - **Paso 4:** Triggers `trg_process_level_up` y `on_auth_user_created`.
   - **Paso 5:** RPC `award_match_rewards`.
   - **Paso 6:** Seed de unidades estándar en `units_catalog`.

---

## 5. COMANDOS DE DESARROLLO

```bash
# Iniciar servidor de desarrollo en puerto 3000
npm run dev

# Ejecutar comprobación de tipos de TypeScript
npm run lint

# Construir para producción
npm run build

# Iniciar servidor de producción
npm start
```

---

## 6. ÍNDICE DE ESPECIFICACIONES TÉCNICAS EN `/docs`

| Archivo | Contenido Clave |
|:---|:---|
| **`docs/01_GAME_DESIGN_DOCUMENT.md`** | Visión del juego, Core Loop, catálogo base de 12 unidades y modificadores de terreno (1★ a 4★). |
| **`docs/02_DATABASE_SCHEMA.md`** | DDL completo de PostgreSQL en Supabase, políticas RLS, trigger de nivel y RPC de recompensas. |
| **`docs/03_GAME_ENGINE_ARCHITECTURE.md`** | Arquitectura de estado cliente/servidor, FSM de inputs y código de A* Pathfinding en TypeScript. |
| **`docs/04_NETWORKING_AND_BOTS.md`** | Supabase Realtime WebSockets, desconexiones, prevención de trampas y heurísticas de Bots. |
| **`docs/05_MONETIZATION_AND_PROGRESSION.md`** | Curva de XP ($150 \times N^{1.85}$), tabla de niveles 1 a 20 y Webhook seguro de Stripe. |
| **`docs/06_PROJECT_ROADMAP.md`** | Cronograma de 5 fases de desarrollo hasta la versión 1.0 en Vercel. |
| **`docs/07_DATABASE_INFRASTRUCTURE_PLAN.md`** | Diagrama de flujo de datos textual y Mermaid, constraints de tabla y smoke tests. |
| **`docs/08_TACTICAL_AND_ECONOMIC_SYSTEMS_GDD.md`** | Matriz de combate 12x12 completa, costes de terreno y diseño de economía no Pay-to-Win. |
| **`docs/09_FRONTEND_ENGINE_AND_AI_ARCHITECTURE.md`** | Desacoplamiento a 60 FPS, Web Workers en cliente ($0 costo en Vercel) e hitos de frontend. |
| **`docs/10_DEFINITIVE_SPRINT_EXECUTION_PLAN.md`** | Plan de 6 Sprints quincenales de 0% a 100% con listas de tareas y Definition of Done (DoD). |

# Tactical Command: Wars of Legacy — Global Sovereignty Edition

[![Version](https://img.shields.io/badge/version-0.1.0--alpha-blue.svg)](package.json)
[![Vite](https://img.shields.io/badge/Vite-8.3.0-646CFF.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0.1-61DAFB.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.3.3-38B2AC.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime_PostgreSQL-3ECF8E.svg)](https://supabase.com/)

Videojuego de estrategia táctica por turnos (Turn-Based Strategy / TBS) ejecutado nativamente en el navegador como una **Single Page Application (SPA)** de alto rendimiento. Combina el determinismo matemático balístico de **Advance Wars** (escala de 1 a 100 HP), la energía cinética de novela gráfica bélica del **Bark Engine** (estilo *Hades* / *Persona 5* en viñetas Pop-Art sin actores de voz) y un **Metajuego Territorial Masivo y Persistente** inspirado en las dinámicas geopolíticas de *Victoria 3*, *Stellaris*, *Wplace* y la economía artesanal libre de *Albion Online*.

---

## 1. Pila Tecnológica Canónica

- **Frontend & Bundler**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite 8](https://vitejs.dev/) (con `@vitejs/plugin-react` y `@tailwindcss/vite`).
- **Diseño & Animación**: [Tailwind CSS v4](https://tailwindcss.com/) + [Motion](https://motion.dev/) + [Lucide React](https://lucide.dev/).
- **Motor Gráfico & Táctico**: Canvas 2D HTML5 con renderizado desacoplado a 60 FPS, algoritmos de A* Pathfinding y simulación determinista ($\text{RNG} = 0$).
- **Backend & Base de Datos**: [Supabase](https://supabase.com/) con **PostgreSQL 15+**, 22 migraciones maestras, Row Level Security (RLS) y canales WebSocket de Supabase Realtime para sincronización de estados y presencia.
- **Audio & Háptica**: Motor Web Audio API diegético (`TacticalAudioManager`) y vibración háptica (`navigator.vibrate`) con patrones tácticos.

---

## 2. Requisitos Previos e Instalación Local

### Requisitos del Sistema
- **Node.js**: Versión `20.19+` o `22.12+` (recomendado Node 22 LTS).
- **npm**: Versión `10+`.

### Pasos de Instalación
```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-organizacion/tactical-command.git
cd tactical-command

# 2. Instalar dependencias exactas
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
```

---

## 3. Variables de Entorno (`.env.local`)

Crea un archivo `.env.local` en la raíz del proyecto con tus credenciales de Supabase:

```env
# Supabase Configuration (Vite Client-Side)
VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
VITE_SUPABASE_ANON_KEY="tu-anon-key-publica"

# Opcional: Gemini API para generación avanzada de diálogos y barks
VITE_GEMINI_API_KEY="tu-gemini-api-key"
```

---

## 4. Scripts y Comandos de Ejecución

Todos los scripts se gestionan mediante `npm`:

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo Vite en `http://localhost:3000` con Hot Module Replacement (HMR). |
| `npm run build` | Compila y optimiza la SPA completa en el directorio `dist/` para producción. |
| `npm run preview` | Previsualiza localmente el artefacto compilado en `dist/`. |
| `npm run test:all` | Ejecuta la suite completa de pruebas deterministas tácticas, de sistemas avanzados y de metajuego territorial. |
| `npm run test:metagame` | Ejecuta la batería de 30 pruebas deterministas del Metajuego Territorial Soberano V2. |
| `npm run test:pve` | Ejecuta las pruebas del orquestador autónomo y balanceador contra IA. |
| `npm run test:e2e` | Ejecuta la suite de integración de extremo a extremo. |
| `npm run lint` | Ejecuta la verificación estricta de tipos de TypeScript (`npx tsc --noEmit`). |

---

## 5. Arquitectura del Repositorio

```
TacticalCommand/
├── METAGAME_DESIGN/                 # Canon y especificación maestra de metajuego (SSOT)
│   ├── 14_CALIBRATED_HYBRID_CANON.md # Axiomas inmutables (0% incertidumbre)
│   └── MASTER_METAGAME_SPEC_V1.md   # Especificación técnica de soberanía y economía
├── docs/                            # Documentación técnica consolidada del proyecto
│   ├── 00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md # Árbol SSOT de sistemas y 4 estados
│   ├── 01_MASTER_GAME_DESIGN_DOCUMENT.md         # GDD maestro y fórmulas de combate
│   ├── 02_MASTER_METAGAME_INDUSTRY_ECONOMY.md    # Cadena de refinado, P2P 2% y EC
│   ├── 03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md   # Bark Engine y 28 Comandantes
│   ├── 04_MASTER_DATABASE_AND_SECURITY_SPEC.md   # Esquema relacional y RLS
│   ├── 05_MASTER_GAME_ENGINE_AND_NETWORKING.md   # Motor táctico, Canvas y Realtime
│   ├── 06_MASTER_DEVOPS_QA_AND_TELEMETRY.md      # Testing, CI/CD y telemetría
│   └── 07_MASTER_PROJECT_ROADMAP_AND_SPRINTS.md  # Roadmap, hitos y Sprints
├── public/                          # Assets estáticos, atlas pixel-art y sonidos
├── src/                             # Código fuente de la aplicación
│   ├── components/                  # Vistas y componentes modulares de interfaz
│   │   ├── auth/                    # Modales y autenticación de comandantes
│   │   ├── common/                  # Componentes base, botones tácticos y modales
│   │   ├── game/                    # HUD de combate, barra de mando CO y diorama
│   │   ├── industry/                # Hangares físicos, crafteo y Mercado P2P 2%
│   │   ├── lobby/                   # WarLobbyHub, HUD C4ISR y consola lateral
│   │   ├── metagame/                # Consola de metamando, inspector de sectores y guarniciones
│   │   └── world/                   # Lienzo interactivo del mapa mundial Wplace
│   ├── engine/                      # Núcleo del motor de juego desacoplado de React
│   │   ├── canonicalCombat.ts       # Fórmulas de daño y matriz Advance Wars 1-100 HP
│   │   ├── canonicalMovement.ts     # A* y cálculo de costes de locomoción por terreno
│   │   ├── garrisonAIEngine.ts      # IA de guarnición (T1 a T5, Minimax y MCTS)
│   │   ├── upkeepEngine.ts          # Ticker económico y cálculo de sobre-expansión
│   │   ├── worldMapEngine.ts        # Topología del mapa mundial y adyacencia de nodos
│   │   └── autonomousOrchestrator.ts # Árbitro de turnos y condiciones de victoria
│   ├── hooks/                       # Hooks de React para estado y conexión con Supabase
│   │   ├── useAuth.ts               # Sesión persistente y perfil de jugador
│   │   ├── useTerritoryMap.ts       # Sincronización de provincias y soberanía
│   │   ├── useUserHangar.ts         # Hangares físicos y patentes tecnológicas
│   │   └── useTerritoryEconomyTicker.ts # Flujo continuo por minuto y upkeep
│   ├── lib/                         # Cliente de Supabase y gestores de infraestructura
│   │   ├── audioManager.ts          # Motor de audio Web Audio API
│   │   └── supabaseClient.ts        # Instancia conectada de `@supabase/supabase-js`
│   ├── types/                       # Definiciones canónicas de TypeScript
│   │   ├── database.types.ts        # Tipos generados a partir del esquema PostgreSQL
│   │   ├── metagame.ts              # Tipos del metajuego territorial, P2P y guarniciones
│   │   └── index.ts                 # Tipos del motor táctico, unidades y COs
│   ├── App.tsx                      # Orquestador principal y puente táctico/metajuego
│   ├── docsData.ts                  # Datos estructurados para el visor interno de documentación
│   ├── main.tsx                     # Punto de entrada de la SPA React
│   └── index.css                    # Estilos globales y utilidades de Tailwind CSS v4
├── supabase/
│   └── migrations/                  # 22 migraciones maestras de PostgreSQL
├── CHANGELOG.md                     # Registro histórico de versiones (Keep a Changelog)
├── package.json                     # Metadatos del paquete y dependencias
├── tsconfig.json                    # Configuración estricta de TypeScript
└── vite.config.ts                   # Configuración de compilación y plugins de Vite
```

---

## 6. Pilares Canónicos de Diseño

1. **Determinismo Táctico Balístico**: Daño predecible con base matemática estricta (escala 1 a 100 HP), bonificaciones proporcionales por nivel de tropa ($+2\%$ por nivel), 0% tiradas de azar en combate y niebla de guerra con emboscada `TRAP`.
2. **Bark Engine Cómic**: Expresividad militar en viñetas Pop-Art con 5 siluetas de bocadillos y sellos de onomatopeyas reactivas; 0% voces, 100% dramatismo gráfico.
3. **Metajuego Territorial Soberano**: Lienzo mundial continuo estilo *Wplace* sin transiciones vacías; 0% regiones inexpugnables (las 195 capitales son conquistables con escudos temporales anti-steamroll).
4. **Hangares Físicos y Economía Descentralizada**: Tropas tratadas como munición descartable que deben ser forjadas físicamente; mercado libre P2P con split transaccional del 2% (1% sumidero deflacionario + 1% canon clan territorial) y bandas VWAP Collar $\pm 25\%$. Cero venta de tropas listas para la guerra (0% Pay-to-Win).

---

## 7. Licencia

Proyecto privado bajo desarrollo y propiedad de Tactical Command Team. Todos los derechos reservados.

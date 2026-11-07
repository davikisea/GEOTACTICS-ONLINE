# 🌳 ÁRBOL CANÓNICO DE SISTEMAS Y DESARROLLO (SSOT DEFINITIVO)
## *Tactical Command: Wars of Legacy — Global Sovereignty Edition*
**Documento Canónico Rector:** `docs/00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md`  
**Versión de Arquitectura:** `5.0.0-UNIFIED-CANON`  
**Única Fuente de Verdad (SSOT):** Este documento rige todas las especificaciones de diseño, bases de datos, lógica de motor e interfaces del proyecto. Toda documentación subordinada se calibra exclusivamente contra este árbol.

---

# 1. TAXONOMÍA DE LOS 4 ESTADOS DE DESARROLLO

Cada rama, nodo y subsistema del juego se clasifica de forma estricta e invariable bajo uno de los siguientes cuatro estados:

| Estado | Icono | Definición Operativa | Criterio de Transición |
| :--- | :---: | :--- | :--- |
| **`LISTO`** | 🟢 | **Producción Certificada y Auditada.** El sistema está completamente programado, integrado end-to-end (Frontend + Motor + Base de Datos) y cuenta con suite de pruebas automatizadas verdes sin regresiones. | Pasa todas las pruebas unitarias e integración en CI y no tiene deuda técnica pendiente. |
| **`DESPLEGADO`** | 🔵 | **Activo en Entorno / Infraestructura.** El esquema de tablas PostgreSQL, políticas RLS, vistas de React o rutas de servidor están creadas y montadas en la base de datos o en la interfaz, operativas pero pendientes de cierre de tests o auditoría final. | Migración SQL aplicada en Supabase o vista navegable en el cliente. |
| **`DESARROLLADO`** | 🟡 | **Lógica de Código Implementada.** Algoritmos, modelos de TypeScript o controladores de estado escritos y funcionales en local, pero aún no cableados a la interfaz principal o al backend persistente. | Archivo `.ts` o `.tsx` funcional en `src/domains/{world,tactics,economy,game-feel}/` o `src/shared/`. |
| **`EN DESARROLLO`** | 🟠 | **En Especificación o Refactor Activo.** Módulo en proceso de alineación con el canon, diseño de contratos o refactorización arquitectónica para erradicar discrepancias legacy. | PR abierto, RFC aprobado o tarea activa en roadmap. |

> [!NOTE] CALIBRACIÓN OPERATIVA DE CAPAS EN v0.0.2-alfa (MVP POLÍTICO)
> - **Capa 1 (Metajuego Político ALICE):** 🟢 `[LISTO / ACTIVO]` en Teatro Venezuela (24 Estados + 7 Zonas Buffer).
> - **Capa 2 (Combate Táctico en Cuadrícula 1-100 HP):** 🟡 `[DESARROLLADO / EN ESPERA DE FASE 2]` en runtime del cliente. El motor balístico y las reglas deterministas están programados y certificados con tests, pero el punto de entrada UI redirige al asedio geopolítico en el mapa macro.
> - **Capa 3 (Bark Engine & Mando):** 🟢 `[LISTO / CALIBRACIÓN DE SUJETO ÚNICO STELLA]` con aprendizaje adaptativo.

---

# 2. LOS 7 PILARES INMUTABLES DE LA FUENTE DE VERDAD (SSOT)

Antes de desplegar el árbol, se declaran los 7 axiomas rectores del juego ratificados por la dirección:

1. **CERO CARTAS $\rightarrow$ ALMACÉN FÍSICO DE UNIDADES (FLEET HANGAR DE 16 TROPAS):**  
   No existen barajas (NO TCG/CCG), no existen sobres de cartas ni manos de naipes. El jugador gestiona un **Almacén Físico de Unidades (`user_unit_hangar` / `faction_unit_hangar`) de 16 tropas máximo por jugador en orden de batalla (4 slots de despliegue activo de vanguardia + 12 unidades en reserva táctica)**, con acceso al catálogo de los **16 arquetipos militares del juego**. Las tropas se fabrican previamente en industrias territoriales acumulando **stock físico real**. En combate, las fábricas aliadas despliegan chasis existentes en dicho stock mediante **Doble Llave**, pagando además los Fondos Tácticos ($G) generados in-match por ciudades capturadas.
2. **ESCALA BALÍSTICA ESTRICTA: 1 A 100 HP ENTEROS:**  
   Toda unidad nace con **100 HP enteros continuos** (`CANONICAL_MAX_HP = 100`). El daño balístico, las estrellas de terreno (0★ a 4★) y los sprites de vida operan sobre la escala continua de 1 a 100 HP sin redondeos toscos (`@domains/tactics/core/canonicalCombat.ts`).
3. **CONDICIÓN DE DERROTA POR 0 TROPAS:**  
   Si un comandante pierde su última unidad activa sobre el grid (`units.length === 0`), sufre una **Derrota Inmediata Inapelable** (canon estricto *Advance Wars*), sin importar sus fábricas o fondos en reserva.
4. **PROGRESIÓN HORIZONTAL EXCLUSIVA: TIERS T1 A T5 (+2% POR TIER, MÁXIMO +8% EN T5):**  
   Queda erradicado el nivel de carta (1-15). La única bonificación balística en combate clasificado es la pureza de manufactura del chasis: **Tiers T1 a T5 (+2% efectividad por nivel; T1 $+0\%$, T2 $+2\%$, T3 $+4\%$, T4 $+6\%$, T5 $+8\%$)**. En torneos esports y Duelo Espejo se compite forzosamente a **Tier 1 (+0%)**.
5. **CAPITALES NACIONALES: CONQUISTABLES CON BUFF REGIONAL (+5%) Y HEGEMONÍA NACIONAL:**  
   Las 195 Capitales son disputables y conquistables en el mapa mundial como cualquier provincia (0% inexpugnabilidad, `CAPITAL_IMMUNITY = false`). La conquista de una Capital otorga un **Buff Regional de +5% en extracción de recursos y logística en la región**, y proyecta además un **Buff Hegemónico Nacional** a todos los territorios de la facción en esa nación: **+15% Créditos Energéticos (EC)**, **+10% velocidad de forja** y **-20% aranceles P2P** (`@domains/economy/core/strategicAndProductionEngine.ts` y `@domains/world/core/territorialExpansionEngine.ts`).
6. **PÉRDIDA FÍSICA DE UNIDADES + 35% CHATARRA (`tech_scrap`) + KIT BÁSICO F2P:**  
   Toda tropa destruida en combate territorial se descuenta de forma permanente del stock físico de su almacén, devolviendo el **35% de sus materiales como chatarra tecnológica (`tech_scrap`, `RECYCLE_SCRAP_RATE = 0.35`)**. Para evitar que nadie quede bloqueado sin jugar por falta de tropas, el Estado Mayor provee una **Línea de Pertrechos Básicos Inagotable (Infantería Ligera T1 y Reconocimiento T1 ilimitados)**.
7. **HUMAN HANDSHAKE DE 120 SEGUNDOS (2 MINUTOS):**  
   Al asaltar un territorio defendido por una **Guarnición IA**, el clan defensor dispone de **120 segundos (`HANDSHAKE_TIMEOUT_SECONDS = 120`)** para tomar el mando en un duelo PvP en vivo. Si expira el plazo sin respuesta humana, la IA de Guarnición (Niveles 1 a 5) comanda el combate autónomamente (`@domains/world/core/territorialSiegeOrchestrator.ts` y `@domains/tactics/core/garrisonAIEngine.ts`).

> [!IMPORTANT] REGLA FINANCIERA CANÓNICA (MERCADO LIBRE P2P)
> El **Mercado Libre P2P** (`@domains/economy/core/industrialEngine.ts` y `@shared/types/metagame.ts`) aplica un **impuesto transaccional total del 2% (`TOTAL_P2P_TAX_RATE = 0.02`)**, dividido exactamente en **1% quemado en Sink deflacionario (`PLATFORM_BURN_RATE = 0.01`)** + **1% de regalía al Clan dueño del Hub regional (`PROVINCE_ROYALTY_RATE = 0.01`)**, protegido por bandas de precios dinámicas **VWAP Collar ±25% (`VWAP_COLLAR_PERCENT = 0.25`)** anti-especulación y anti-RMT.

---

## 2.1 ARQUITECTURA MODULAR DE 4 DOMINIOS + SHARED (SSOT DE CÓDIGO)

Toda la base de código ejecutable se organiza en **4 Dominios Funcionales Desacoplados** y una **Capa Compartida (`shared`)**, gobernados mediante barriles públicos (`index.ts`) y alias de TypeScript en `tsconfig.json`:

| Dominio / Capa | Ruta Física y Alias TS | Punto de Entrada | Responsabilidad Arquitectónica |
| :--- | :--- | :--- | :--- |
| **Dominio 1: World** | `src/domains/world/` (`@domains/world/*`) | `src/domains/world/index.ts` | Cartografía WebGL/MapLibre (`TacticalWorldMap`), coordenadas analíticas $O(1)$ (`coordinates.ts`), bitmaps (`tacticalBitmap.ts`), red vial y guarniciones (`roadNetworkEngine.ts`, `roadGarrisonEngine.ts`), asedios 120s (`territorialSiegeOrchestrator.ts`), expansión celular (`territorialExpansionEngine.ts`), motor político ALICE (`politicalAliceEngine.ts`) y clanes (`clanSystem.ts`). |
| **Dominio 2: Tactics** | `src/domains/tactics/` (`@domains/tactics/*`) | `src/domains/tactics/index.ts` | Motor balístico determinista 1-100 HP (`canonicalCombat.ts`, `combat.ts`, `canonicalDamageChart.ts`), 28 Comandantes (`coSystem.ts`), IA de Guarnición Nv.1-5 (`garrisonAIEngine.ts`, `aiBot.ts`), niebla y `¡TRAP!` (`fogOfWar.ts`, `pathfinding.ts`), refuerzos (`reinforcementsEngine.ts`, `reinforcementEngine.ts`) e integración Doble Llave (`tacticalCombatSeamlessIntegration.ts`). |
| **Dominio 3: Economy** | `src/domains/economy/` (`@domains/economy/*`) | `src/domains/economy/index.ts` | Almacén Físico de 16 tropas Cero Cartas (`useUserHangar.ts`, `UnitHangarModal.tsx`, `LoadoutCustomizer.tsx`), complejo industrial de 10 parcelas y Mercado P2P 2% (`industrialEngine.ts`, `IndustrialComplexView.tsx`, `P2PMarketplaceView.tsx`), colas de forja y nodos estratégicos (`strategicAndProductionEngine.ts`, `turnEconomy.ts`, `upkeepEngine.ts`). |
| **Dominio 4: Game-Feel** | `src/domains/game-feel/` (`@domains/game-feel/*`) | `src/domains/game-feel/index.ts` | Bark Engine Cómic sin voces (`barkEngine.ts`, `CommanderBarkWidget.tsx`, `CommanderLivingVignette.tsx`), síntesis procedural Web Audio API (`audioManager.ts`) y matriz háptica (`hapticFeedback.ts`). |
| **Capa Shared** | `src/shared/` (`@shared/*`) | `src/shared/index.ts` | Contratos globales y constantes SSOT (`src/shared/types/metagame.ts`, `src/shared/types/index.ts`, `src/shared/types/database.types.ts`), cliente Supabase (`src/shared/lib/supabase/client.ts`), servicios de base de datos (`playerDatabaseService.ts`, `matchDatabaseService.ts`), autenticación (`useAuth.ts`, `AuthTerminalModal.tsx`) y primitivas UI (`TacticalGhostBar.tsx`, `TacticalErrorBoundary.tsx`, `MatchSummaryModal.tsx`, `QADevOpsRunner.tsx`). |

---

# 3. EL GRAN ÁRBOL DE SISTEMAS DEL JUEGO

```
                                  TACTICAL COMMAND: GLOBAL SOVEREIGNTY
                                                   │
         ┌───────────────────┬─────────────────────┼─────────────────────┬───────────────────┐
         ▼                   ▼                     ▼                     ▼                   ▼
   [ RAMA 1: TABLERO ] [ RAMA 2: INDUSTRIA ] [ RAMA 3: GEOPOLÍTICA ] [ RAMA 4: ATOMPUNK ] [ RAMA 5: BACKEND ]
   • @domains/tactics  • @domains/economy    • @domains/world        • @domains/game-feel • @shared + Supabase
   • Motor Balístico   • Almacén 16 Tropas   • Mapa Mundial 195 P.   • UI Retro-Futurista • 31 Migraciones
   • Escala 1-100 HP   • Stock Real T1-T5    • Soberanía Capital +5% • Bark Engine Cómic  • RLS Multi-Tenant
   • Turno Fischer     • Refinado 10 Parcelas• Asedios TCP & Escudo  • Ergonomía In-Situ  • Orquestador
   • Niebla & TRAP!    • Mercado P2P 2% Split• Guarnición IA 120s    • Matriz Háptica     • Arnés E2E QA
```

---

## ⚔️ RAMA 1: MECÁNICAS DEL TABLERO TÁCTICO (`@domains/tactics` — CORE TBS ENGINE)

*Motor de resolución determinista por turnos sobre cuadrícula ortogonal 2D (`src/domains/tactics/index.ts`).*

```
RAMA 1: TABLERO TÁCTICO
├── 1.1 Motor Balístico y Matriz de Daño
│   ├── 1.1.1 Determinismo balístico puro (luckModifier = 0) ................... 🟢 [LISTO]
│   ├── 1.1.2 Escala continua de 1 a 100 HP y cálculo de daño cuántico ......... 🟢 [LISTO]
│   ├── 1.1.3 Mitigación proporcional por Estrellas de Terreno (0★ a 4★) ........ 🟢 [LISTO]
│   ├── 1.1.4 Contraataque secuencial condicional (Directo d=1) ................ 🟢 [LISTO]
│   └── 1.1.5 Inmunidad a contraataque en fuego indirecto (d >= 2) .............. 🟢 [LISTO]
│
├── 1.2 Flujo del Turno y Control de Tiempo
│   ├── 1.2.1 Fase de Mantenimiento (Curación +20 HP, cobro 10% coste) .......... 🟢 [LISTO]
│   ├── 1.2.2 Quema pasiva de combustible y choque aéreo a 0 Fuel .............. 🟢 [LISTO]
│   ├── 1.2.3 Recaudación de Fondos Tácticos (+1,000G por propiedad/turno) ..... 🟢 [LISTO]
│   ├── 1.2.4 Impuesto de Soft Cap Logístico (>$200G/t sobre 14 unidades) ...... 🟢 [LISTO]
│   ├── 1.2.5 Reloj Fischer Táctico (15s/30s base + incremento por acción) ...... 🟢 [LISTO]
│   └── 1.2.6 Banco de Gracia de Desconexión de Red (30s / 60s) ................. 🟢 [LISTO]
│
├── 1.3 Condiciones de Victoria y Fin de Partida
│   ├── 1.3.1 Derrota Inmediata por 0 Tropas Vivas (units.length === 0) ........ 🟢 [LISTO]
│   ├── 1.3.2 Victoria por Captura de Cuartel General (HQ de 20 puntos) ......... 🟢 [LISTO]
│   ├── 1.3.3 Desempate Patrimonial Determinista al Límite de Turnos ............ 🟢 [LISTO]
│   └── 1.3.4 Bounty de Primera Sangre (+600G al autor de la primera baja) ...... 🟢 [LISTO]
│
├── 1.4 Catálogo Canónico de 16 Unidades Militares
│   ├── 1.4.1 Infantería Ligera e Infantería Mecanizada (Captura de sedes) ...... 🟢 [LISTO]
│   ├── 1.4.2 Blindados: Recon, Tanque Ligero, Tanque Mediano, Neotanque ....... 🟢 [LISTO]
│   ├── 1.4.3 Fuego Indirecto: Artillería Obús, Lanzacohetes Asedio ............. 🟢 [LISTO]
│   ├── 1.4.4 Cobertura Antiaérea: Vulcan Blindado, Batería Misiles SAM ........ 🟢 [LISTO]
│   ├── 1.4.5 Aviación: Helicóptero Batalla, Caza Superioridad, Bombardero ...... 🟢 [LISTO]
│   ├── 1.4.6 Logística y Transporte: Camión Blindado APC, Helo T-Copter ........ 🟢 [LISTO]
│   └── 1.4.7 Flota Naval: Acorazado Naval (Battleship alcance 2-6) ............. 🟢 [LISTO]
│
├── 1.5 Terrenos Especiales, Niebla y Sub-Acciones
│   ├── 1.5.1 Niebla de Guerra y Emboscadas TRAP! en bosques y arrecifes ........ 🟢 [LISTO]
│   ├── 1.5.2 Silos de Misiles Balísticos estáticos (30 HP de daño en área) ..... 🟢 [LISTO]
│   ├── 1.5.3 Torres de Comunicación Militar (+10% Ataque por torre) ............ 🟢 [LISTO]
│   ├── 1.5.4 Menú de Sub-Acciones In-Situ (Wait, Attack, Capture, Join, etc.) ... 🟢 [LISTO]
│   └── 1.5.5 Clima Dinámico (Despejado, Lluvia, Nieve, Tormenta de Arena) ...... 🟢 [LISTO]
│
└── 1.6 Sistema de Comandantes (CO System)
    ├── 1.6.1 Catálogo de 28 Comandantes con arquetipos doctrinales ............. 🟢 [LISTO]
    ├── 1.6.2 Carga de Barra de CO Power mediante daño infligido y recibido ...... 🟢 [LISTO]
    ├── 1.6.3 Activación de Poder de Comandante (COP) ........................... 🟢 [LISTO]
    └── 1.6.4 Activación de Super CO Power (SCOP) con congelación cinemática .... 🟢 [LISTO]
```

---

## 🏭 RAMA 2: INDUSTRIA BÉLICA, ALMACÉN Y ECONOMÍA (`@domains/economy` — ECONOMY & FLEET)

*Gestión de stock físico de chasis (16 tropas máximo por jugador: 4 activas + 12 reserva), refinerías territoriales y mercado descentralizado (`src/domains/economy/index.ts`).*

```
RAMA 2: INDUSTRIA Y ALMACÉN
├── 2.1 Almacén Físico de Unidades (Fleet Hangar: 4 Vanguardia + 12 Reserva)
│   ├── 2.1.1 Eliminación completa de cartas y mazos de la lógica ............... 🟢 [LISTO]
│   ├── 2.1.2 Registro de stock físico real por arquetipo en base de datos ...... 🟢 [LISTO]
│   ├── 2.1.3 Línea de Pertrechos Básica F2P (Infantería y Recon T1 ilimitados) . 🟢 [LISTO]
│   ├── 2.1.4 Modal de Producción por Doble Llave (Fondos $G + Stock de Chasis) . 🟢 [LISTO]
│   ├── 2.1.5 Cola de Producción Física y Concurrencia de Ensamblaje ............ 🟢 [LISTO]
│   └── 2.1.6 Hangar Compartido de Facción (Despliegue de Arsenal Común) ........ 🟢 [LISTO]
│
├── 2.2 Jerarquía de Calidad: Tiers T1 a T5 (+2% por Tier, máx. +8% en T5)
│   ├── 2.2.1 Erradicación de Niveles de Carta 1-15 del motor de combate ....... 🟢 [LISTO]
│   ├── 2.2.2 Bonificación industrial T1 a T5 (+2% balística por Tier) .......... 🟢 [LISTO]
│   ├── 2.2.3 Normalización obligatoria a Tier 1 (+0%) en Torneos y Espejo ..... 🟢 [LISTO]
│   └── 2.2.4 Patentes Tecnológicas Permanentes en centro de investigación ...... 🔵 [DESPLEGADO]
│
├── 2.3 Siniestralidad y Salvamento Balístico
│   ├── 2.3.1 Pérdida física definitiva del chasis al ser destruido ............. 🔵 [DESPLEGADO]
│   ├── 2.3.2 Recuperación del 35% de materiales en Chatarra Balística (tech_scrap) 🔵 [DESPLEGADO]
│   └── 2.3.3 Refundición de chatarra en lingotes de acero en Altos Hornos ...... 🔵 [DESPLEGADO]
│
├── 2.4 Complejo Industrial Territorial de 10 Parcelas
│   ├── 2.4.1 Cuadrícula modular de 10 parcelas (Extracción, Refinado, Soporte) . 🟢 [LISTO]
│   ├── 2.4.2 Cadena de refinado multi-batch (Hierro -> Acero, Piedra -> Hormigón) 🟢 [LISTO]
│   ├── 2.4.3 Ciclo Circadiano Ergonómico (12h producción + 4h de gracia) ....... 🟢 [LISTO]
│   ├── 2.4.4 Merma suavizada (1.5%/h tras h16) con piso de seguridad del 60% ... 🟢 [LISTO]
│   └── 2.4.5 Sistema de Cargamento Varado (70% recuperable ganando partidas) ... 🟢 [LISTO]
│
├── 2.5 Mercado Libre P2P y Split Transaccional
│   ├── 2.5.1 Split del 2% (1% Burn deflacionario / 1% Regalía Provincial) ...... 🟢 [LISTO]
│   ├── 2.5.2 Bandas de fluctuación VWAP collar +/- 25% anti-especulación ....... 🟢 [LISTO]
│   ├── 2.5.3 Prohibición estricta de venta de tropas terminadas (0% P2W) ....... 🟢 [LISTO]
│   └── 2.5.4 Banco Central NPC (absorción de órdenes estancadas tras 6h) ........ 🟢 [LISTO]
│
└── 2.6 Protocolo de Salvaguarda Táctica
    ├── 2.6.1 Crafteo F2P de Salvaguarda (Taller Nv.4, 24 horas) ................. 🟢 [LISTO]
    ├── 2.6.2 Protección de racha invicta en derrota (conserva trofeos) ......... 🟢 [LISTO]
    └── 2.6.3 Multiplicador de botín por racha hasta 2.0x (Llamas de Mando) ..... 🟢 [LISTO]
```

---

## 🌍 RAMA 3: GEOPOLÍTICA CONTINENTAL Y SOBERANÍA (`@domains/world` — WORLD SOVEREIGNTY)

*Mapa mundial persistente, asedios geopolíticos, guarniciones y diplomacia (`src/domains/world/index.ts`).*

```
RAMA 3: GEOPOLÍTICA Y SOBERANÍA
├── 3.1 Malla Cartográfica Planetaria
│   ├── 3.1.1 Jerarquía espacial: 6 Teatros, 195 Países, 750 Provincias, 3,000 Regiones 🟢 [LISTO]
│   ├── 3.1.2 0% Zonas Inexpugnables: Todas las provincias son conquistables .... 🟢 [LISTO]
│   ├── 3.1.3 Grafo de Adyacencia Estricta y validación de suministro BFS ...... 🟢 [LISTO]
│   ├── 3.1.4 Los 9 Estrechos y Canales Estratégicos (Suez, Panamá, Gibraltar) ... 🟡 [DESARROLLADO]
│   ├── 3.1.5 Motor de Expansión Territorial Celular (Territorial.io waves) ...... 🟢 [LISTO]
│   └── 3.1.6 Nodos Estratégicos de Venezuela (7 Nodos: Amuay, Guri, etc.) ...... 🟢 [LISTO]
│
├── 3.2 Soberanía de Capitales Nacionales
│   ├── 3.2.1 Asedio conquistable a las 195 Capitales (0% High-Sec inmune) ...... 🟢 [LISTO]
│   ├── 3.2.2 Buff Regional (+5% recursos/logística) y Hegemónico (+15% EC, +10% forja, -20% aranceles) 🟢 [LISTO]
│   └── 3.2.3 Estandarte de Clan y heráldica sobre la frontera nacional ......... 🟢 [LISTO]
│
├── 3.3 Dinámica de Asedio y Conquista
│   ├── 3.3.1 Puntos de Control Territorial (Barra de 10,000 TCP por provincia) . 🟢 [LISTO]
│   ├── 3.3.2 Resolución progresiva por acumulación de victorias tácticas ....... 🟢 [LISTO]
│   ├── 3.3.3 Escudo Anti-Steamroll (Cooldown de Prioridad de 4 horas) ........... 🟢 [LISTO]
│   └── 3.3.4 Refuerzos con latencia dinámica T+4 y penalización Pírrica (-15%) .. 🟢 [LISTO]
│
├── 3.4 Guarniciones IA y Relevo Humano
│   ├── 3.4.1 Modelo de Guarnición IA por Rareza (Común a Legendaria MCTS) ...... 🟢 [LISTO]
│   ├── 3.4.2 Handshake Defensivo Unificado en 120 Segundos (2 Minutos) ......... 🟢 [LISTO]
│   ├── 3.4.3 Retiro por Envejecimiento de Generales Legendarios (21 días reales) 🔵 [DESPLEGADO]
│   └── 3.4.4 Tasa de mantenimiento en Créditos Energéticos (EC/hora) ............ 🔵 [DESPLEGADO]
│
└── 3.5 Gobernanza Corporativa y Alianzas
    ├── 3.5.1 Corporaciones Militares y Bóveda de Clan comunitaria ............... 🟢 [LISTO]
    ├── 3.5.2 Límite anti-monopolio estricto de máximo 10 clanes por alianza ..... 🔵 [DESPLEGADO]
    └── 3.5.3 Elecciones mensuales de Comandante en Jefe por país ............... 🟡 [DESARROLLADO]
```

---

## 🎨 RAMA 4: PRESENTACIÓN, NARRATIVA Y ATOMPUNK (`@domains/game-feel` — ATOMPUNK EXPERIENCE)

*Identidad visual Space-Age 1950s/1960s, Bark Engine cómico y ergonomía in-situ (`src/domains/game-feel/index.ts`).*

```
RAMA 4: PRESENTACIÓN Y GAME FEEL
├── 4.1 Identidad Visual Retro-Futurista Atompunk
│   ├── 4.1.1 ADN Cromático: Base #2B2C24, Oliva #46521F, Naranja #C46A3A, Crema #F2E8D5 🟢 [LISTO]
│   ├── 4.1.2 Geometría aerodinámica Googie y esquinas asimétricas .............. 🟢 [LISTO]
│   └── 4.1.3 Sombras duras Ben-Day con offset de 2px-15px y biseles metálicos .. 🟢 [LISTO]
│
├── 4.2 Bark Engine Cómic y Audio Táctico
│   ├── 4.2.1 CERO actores de voz: 100% narrativa contextual gráfico/texto ..... 🟢 [LISTO]
│   ├── 4.2.2 Bocadillos dinámicos de radio militar (5 formas y colas reactivas) 🟢 [LISTO]
│   ├── 4.2.3 Sellos Pop-Art tipográficos (¡TRAP!, ¡AIRDROP!, ¡FIRST BLOOD!) .... 🟢 [LISTO]
│   └── 4.2.4 Splash cinemático de Super CO Power con congelación de 1,500ms .... 🟢 [LISTO]
│
├── 4.3 Pantalla de Inicio War-Room Viva y Tríada C4ISR
│   ├── 4.3.1 Mapa Mundial continuo como fondo permanente del lobby ............. 🟢 [LISTO]
│   ├── 4.3.2 Superposición del HUD C4ISR militar sin pantallas negras .......... 🟢 [LISTO]
│   ├── 4.3.3 Visualización en vivo de nodos en combate y modo espectador ........ 🟢 [LISTO]
│   ├── 4.3.4 DualResourceHeader: Telemetría personal y arcas de facción ........ 🟢 [LISTO]
│   ├── 4.3.5 CommanderBarkWidget: Viñeta reactiva estilo cómic (Bottom-Left) ... 🟢 [LISTO]
│   └── 4.3.6 ParadoxCommandDrawer: Gaveta retráctil macro (Right Side Panel) ... 🟢 [LISTO]
│
└── 4.4 Ergonomía de Entrada y Háptica
    ├── 4.4.1 Menú contextual in-situ sobre baldosa (órdenes en 1-2 clics) ....... 🟢 [LISTO]
    ├── 4.4.2 Esquema dual de atajos de teclado mano izquierda + ratón (APM > 120) 🟢 [LISTO]
    ├── 4.4.3 Gestos multitáctiles en móvil (Pinch-to-zoom continuo 0.65x a 1.80x) 🟢 [LISTO]
    └── 4.4.4 Matriz de retroalimentación háptica militar en dispositivos táctiles 🟢 [LISTO]
```

---

## 🛠️ RAMA 5: INFRAESTRUCTURA, PERSISTENCIA Y QA (`@shared` & `supabase/` — BACKEND & QA)

*Arquitectura de datos PostgreSQL, seguridad multi-tenant y pruebas E2E (`src/shared/index.ts` y `supabase/migrations/`).*

```
RAMA 5: INFRAESTRUCTURA Y QA
├── 5.1 Base de Datos PostgreSQL / Supabase
│   ├── 5.1.1 Consolidación de 31 Migraciones DDL (27 base + 4 extensiones) ..... 🟢 [LISTO]
│   ├── 5.1.2 Esquema relacional de parcelas industriales y órdenes P2P ......... 🟢 [LISTO]
│   ├── 5.1.3 Esquema cartográfico de continentes, países, provincias y nodos ... 🟢 [LISTO]
│   ├── 5.1.4 Esquema de hangares físicos de flota (user_unit_hangar) ............ 🟢 [LISTO]
│   ├── 5.1.5 Esquema de Asedios y Semillero de Venezuela (Migración 26) ........ 🟢 [LISTO]
│   ├── 5.1.6 Esquema de Nodos Estratégicos, Hangar Facción y Colas (Migración 27) 🟢 [LISTO]
│   └── 5.1.7 Soberanía RBAC, Cabimas Realtime, Catálogo y Ventanas (Migr. 28-31) 🟢 [LISTO]
│
├── 5.2 Seguridad y Lógica Transaccional
│   ├── 5.2.1 Políticas RLS estrictas multi-tenant para aislamiento de perfiles . 🟢 [LISTO]
│   ├── 5.2.2 Procedimientos RPC atómicos para colas, cobros y recompensas ...... 🟢 [LISTO]
│   └── 5.2.3 Verificación criptográfica HMAC de webhooks de pago (Stripe) ...... 🟢 [LISTO]
│
├── 5.3 Matchmaking y Orquestación de Partidas
│   ├── 5.3.1 Cola de emparejamiento unificada para Duelo, Blitz y Campaña ....... 🟢 [LISTO]
│   ├── 5.3.2 Sistema de clasificación Elo asimétrico y Elo esports independiente 🟢 [LISTO]
│   ├── 5.3.3 Desconexión y arbitraje anti-AFK mediante Banco de Gracia ......... 🟢 [LISTO]
│   └── 5.3.4 Botón Revancha Exprés (5s) para reenganche instantáneo ............ 🟢 [LISTO]
│
└── 5.4 Arnés de Pruebas y Aseguramiento de Calidad
    ├── 5.4.1 Batería de tests unitarios de motor táctico (@domains/tactics/__tests__/combat.test.ts) 🟢 [LISTO]
    ├── 5.4.2 Tests de ciclo circadiano e industria (@domains/economy/__tests__/industrialEngine.test.ts) 🟢 [LISTO]
    ├── 5.4.3 Suite de telemetría y playtesting multimodal con Playwright ....... 🟢 [LISTO]
    ├── 5.4.4 Consola de desarrollo y depuración aislada (@domains/tactics/components/DebugDevConsoleModal.tsx) 🟢 [LISTO]
    └── 5.4.5 Batería Geotactics Unificada (npm run test:geotactics: 93/93 tests) 🟢 [LISTO]
```

---

# 4. MATRIZ DE SINCRONIZACIÓN Y PLAN DE CIERRE DE DISCREPANCIAS

Para que la base de código y la documentación subordinada alcancen el estado 100% `LISTO`, se ejecutaron y certificaron las siguientes acciones de alineación sobre los 4 dominios modulares (`@domains/world`, `@domains/tactics`, `@domains/economy`, `@domains/game-feel`) y `@shared`:

| Nodo del Árbol | Estado Anterior | Acción de Limpieza / Refactor Ejecutada | Estado Actual |
| :--- | :---: | :--- | :---: |
| **1.1.2 Escala 1-100 HP** | 🟠 | Fijada escala continua 1-100 HP enteros (`CANONICAL_MAX_HP = 100`) sin redondeos en `src/domains/tactics/core/canonicalCombat.ts` y `src/domains/tactics/core/canonicalDamageChart.ts`. | 🟢 `[LISTO]` |
| **2.1.1 Eliminación de Cartas** | 🟠 | Erradicación de mazos TCG/CCG. Almacén físico de 16 tropas máximo por jugador (4 activas + 12 reserva) en `user_unit_hangar` y `faction_unit_hangar` (`src/domains/economy/hooks/useUserHangar.ts` y `src/domains/economy/components/UnitHangarModal.tsx`). | 🟢 `[LISTO]` |
| **2.1.4 Modal de Producción** | 🟠 | Desacoplado de mazos. Opera mediante Doble Llave ($G + Chasis físico) en `src/domains/tactics/components/ProductionModal.tsx` y `src/domains/tactics/core/tacticalCombatSeamlessIntegration.ts`. | 🟢 `[LISTO]` |
| **2.2.1 Retiro de Nivel de Carta** | 🟠 | Purgado nivel 1-15 y `getLevelAttackBonus`. Todo el motor en `src/domains/tactics/core/canonicalCombat.ts` opera bajo Tiers industriales T1-T5 (+2%/tier, máximo +8% en T5). | 🟢 `[LISTO]` |
| **2.5.1 & 2.5.2 Mercado P2P 2%** | 🟠 | Certificado split transaccional del 2% (`1%` Burn Sink + `1%` Regalía al Clan del Hub regional) y bandas `VWAP_COLLAR_PERCENT = 0.25` (±25%) en `src/shared/types/metagame.ts` y `src/domains/economy/core/industrialEngine.ts`. | 🟢 `[LISTO]` |
| **3.1.2 WebGL Zero-Raster** | 🟠 | Erradicación de CartoDB. Componente unificado en `src/domains/world/components/TacticalWorldMap.tsx` (re-exportado como `WorldMapCanvas` en `src/domains/world/index.ts`) con carga local de `world_land.json`, `theatre_regions.json` y `theatre_roads.json`. | 🟢 `[LISTO]` |
| **3.1.5 Expansión Territorial** | 🟠 | Implementado motor de ondas celulares tipo Territorial.io y buffs de nodos estratégicos en `src/domains/world/core/territorialExpansionEngine.ts`. | 🟢 `[LISTO]` |
| **3.2.2 Buff Regional Capital** | 🟠 | Consolidado Buff Regional de Capital (+5% recursos/logística regional) junto con hegemonía nacional (+15% EC, +10% forja, -20% aranceles P2P) en `src/domains/economy/core/strategicAndProductionEngine.ts` y `src/domains/world/core/territorialExpansionEngine.ts`. | 🟢 `[LISTO]` |
| **3.4.2 Handshake 120s** | 🟠 | Fijado `HANDSHAKE_TIMEOUT_SECONDS: 120` en `src/shared/types/metagame.ts`, orquestado en `src/domains/world/core/territorialSiegeOrchestrator.ts` y certificado en `src/domains/world/__tests__/territorialSiege.test.ts` y `src/domains/tactics/core/tacticalCombatSeamlessIntegration.ts`. | 🟢 `[LISTO]` |
| **1.0.0 Capa 2 MVP Standby** | 🟢 | El motor determinista TBS (`src/domains/tactics/`) queda en espera en la UI según `THREE_LAYER_ARCHITECTURE` en `src/domains/world/core/politicalAliceEngine.ts` para priorizar la estabilidad geopolítica de Capa 1. | 🟡 `[DESARROLLADO]` |
| **5.1.1 a 5.1.7 Migraciones SQL** | 🟠 | Consolidadas las 31 migraciones DDL en `supabase/migrations/` (incluyendo asedios, 24 regiones VE, nodos estratégicos, soberanía RBAC, Cabimas realtime, manifiesto de catálogos y ventanas de vulnerabilidad). | 🟢 `[LISTO]` |

---

> **FIN DEL ÁRBOL CANÓNICO DE SISTEMAS Y DESARROLLO**  
> *Este documento es el nuevo SSOT maestro universal de Tactical Command.*

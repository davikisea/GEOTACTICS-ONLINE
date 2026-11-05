# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-11-05

### Lanzamiento Alfa en Desarrollo (v0.1.0) — Geotactics Persistente, Consola C4ISR Atompunk & Global Sovereignty

Consolidación acumulativa de la versión `0.1.0` en desarrollo: arquitectura del motor táctico por turnos (TBS), experiencia visual de historieta cinética, motor Geotactics persistente (Project Alice Engine × Consola C4ISR Atompunk), expansión territorial celular y metajuego de soberanía masiva.

### Fase 1 & 2: Geotactics Persistente (Project Alice Engine × Consola C4ISR Atompunk)

### Documentación & Especificación Arquitectónica Canónica

#### Added
- **Master MVP Blueprint & Roadmap (`docs/MASTER_MVP_BLUEPRINT_AND_ROADMAP.md`)**:
  - Especificación canónica de refundación modular bajo Arquitectura Hexagonal Pura y Estado Unidireccional Basado en Eventos (v5.1.0-MODULAR-FOUNDATION).
  - Aislamiento e invariantes de los 4 Dominios: Metapolítica Macro & Cartografía WGS84 (Estudio Alpha), Motor Táctico TBS & Atrición Determinista (Estudio Beta), Bark Engine & Game Feel Cómic (Estudio Gamma) y Capa de Invariantes Universales (Estudio Delta).
  - Contratos de tipo inmutables (`docs/contracts/`): `macroCartographyContracts.ts`, `tacticalContracts.ts`, `schema.ts`, `typesBridge.ts`.
- **Análisis Forense & Replicación Cartográfica WarEra (`docs/WARERA_MAP_ARCHITECTURE_DEEP_DIVE.md`)**:
  - Deconstrucción de arquitectura WebGL Zero-Raster, TopoJSON estático quantizado y reactividad en GPU con `feature-state` con 0% de re-renders de CPU.
- **Plan de Implementación Mapa Vectorial Zero-Raster (`docs/PLAN_IMPLEMENTACION_MAPA_VECTORIAL_ZERO_RASTER.md`)**:
  - Hoja de ruta para migración a TopoJSON, MapLibre GL nativo y Deck.gl (`MapboxOverlay`).
- **Análisis de Arquitectura Geotactics (`docs/ANALISIS_ARQUITECTURA_GEOTACTICS.md`)**:
  - Convergencia entre lienzo territorial OpenPlace y motor de eventos y logística Project Alice.

#### Added
- **Topología de Nodos Estratégicos & Soberanía Regional (`20261105000001_geotactics_strategic_nodes_and_queues.sql`)**:
  - Migración DDL con tabla `public.strategic_nodes` para los 7 puntos estratégicos del Teatro Venezuela: Capital Central Caracas (`REG_VE_01`), Estrecho Canal de Maracaibo (`REG_VE_02`), Refinería CRP Amuay (`REG_VE_11`), Estrecho Golfo de Paria (`REG_VE_13`), Hidroeléctrica Guri (`REG_VE_03`), Radar C4ISR Margarita (`REG_VE_14`) y Base SAM Maracay (`REG_VE_08`).
  - Hangar Comunitario de Facción (`public.faction_unit_hangar`) que permite a los clanes sostener inventarios militares colectivos administrados por rango de mando.
  - Cola de Producción Física (`public.unit_production_queue`) con duraciones de espera deterministas y funciones RPC atómicas `queue_unit_production` y `claim_finished_unit`.
- **Motor Lógico de Forja y Nodos Estratégicos (`src/engine/strategicAndProductionEngine.ts`)**:
  - Función `calculateUnitProductionDuration` con escalado de Tiers T1 a T5 (+35% de duración por grado industrial) y reducción de tiempo por Buff Hegemónico de Capital Nacional Caracas (-10%).
  - Kit de Supervivencia F2P inagotable: Infantería Ligera y Reconocimiento T1 con duración de 0s y costo nulo de insumos pesados.
  - Reglas de Comando Delegado de Facción: Reclutas bloqueados, Cabos acotados a Tier 2, Sargentos y Veteranos autorizados para desplegar blindados pesados y aviación comunitaria.
- **Interfaz C4ISR Atompunk (Fase 2 UI/UX)**:
  - **Header Superior Dual (`DualResourceHeader.tsx`)**: Separación diegética estricta entre recursos individuales del comandante ($G, EC, tech_scrap, rango, trofeos) y recursos de facción (estandarte, bóveda en EC, chasis comunes, control TCP).
  - **Bark Engine Reactivo (`CommanderBarkWidget.tsx`)**: Viñeta interactiva en la esquina inferior izquierda con retrato cómic del comandante activo, tramas Ben-Day, 5 geometrías de bocadillo (`radio`, `panic`, `thought`, `shout`, `whisper`) y sellos pop-art angulados (`¡¡BAJO FUEGO!!`, `¡DEFCON 1!`). Responde a cada clic directo y emite avisos situacionales ante clics en el mapa.
  - **Candado de Zonas Buffer**: Clics en sectores de amortiguación fronteriza (`BUF_CO`, `BUF_BR`, `BUF_GY`, etc.) activan bocadillo de pánico y sello "ZONA RESTRINGIDA" con el mensaje `"SECTOR FUERA DEL TEATRO OPERACIONAL DE FASE 1 (ACTIVO: REPÚBLICA DE VENEZUELA)"`.
  - **Consola Lateral Retráctil Paradox (`ParadoxCommandDrawer.tsx`)**: Panel deslizable estilo *Stellaris* / *Victoria 3* con 4 pestañas operativas: Macro-inspección territorial, Nodos estratégicos con buffs hegemónicos, Colas de forja con temporizadores de cuenta atrás en tiempo real y solicitud de unidades al Arsenal de Facción.
- **Batería de Pruebas de Calidad**:
  - `strategicAndProductionEngine.test.ts`: 14/14 tests superados (100%).
  - `phase2InterfaceAndBark.test.ts`: 13/13 tests superados (100%).
  - Build de producción Vite/Tailwind verificado sin errores.

### Fase 3: Expansión Territorial.io & Multiplicador de Nodos Industriales

#### Added
- **Motor de Expansión Territorial Celular (`src/engine/territorialExpansionEngine.ts`)**:
  - Malla celular determinista de sub-sectores por región con cobertura de estrellas de terreno (1★ a 4★).
  - Algoritmo de avance de frontera por ondas ("Pintado de Zonas" estilo *Territorial.io*): propagación celular ortogonal según presupuesto de Fondos $G / Manpower militar.
  - Desgaste dinámico de celdas enemigas y consolidación de Soberanía *De Facto* al superar el umbral del 50% de la región.
  - Captura en vivo de Puntos Estratégicos (Capital Nacional Caracas, Refinería CRP Amuay, Hidroeléctrica Guri, etc.).
  - Función `calculateIndustrialYieldWithNodes` que aplica en tiempo real los buffs de nodos sobre el rendimiento extractivo de las 10 Parcelas Territoriales (ej. 1,000 EC $\to$ 1,400 EC con Capital + Refinería) y la aceleración de forja (+10%).
- **Batería de Pruebas Automatizadas de Fase 3**:
  - `territorialExpansionEngine.test.ts`: 13/13 tests superados (100%).
  - Build de producción Vite/Tailwind verificado y empaquetado en 33.83s.

### Fase 4: Seamless Zoom, Doble Llave & Human Handshake 120s

#### Added
- **Integración de Combate Táctico y Zoom Continuo (`src/engine/tacticalCombatSeamlessIntegration.ts`)**:
  - Controlador de Semantic LOD (LOD 1 Global $z < 6.0$, LOD 2 Operacional $6.0 \le z < 13.0$, LOD 3 Táctico $z \ge 13.0$).
  - Inyección dinámica de `TileCanvas` HTML5 sobre coordenadas WGS84 con conmutación de textura bilineal a `nearest` (pixel-art).
  - Validador estricto de la **Doble Llave**: exige Fondos $\$G$ in-match Y existencia física de chasis en Hangar Personal o Arsenal de Facción (con excepción del Kit F2P inagotable para Infantería y Recon T1).
  - Liquidación de siniestralidad real: sumidero permanente del 65% de unidades no-F2P destruidas + recuperación del **35% en Chatarra Balística (`tech_scrap`)** refundible en Altos Hornos (2 Scrap $\to$ 1 Acero).
  - Protocolo de Human Handshake de 120 segundos: alerta defensiva DEFCON 1 en Bark Engine, relevo a PvP en vivo con un clic, o asunción automática de Guarnición IA al expirar el tiempo.
- **Batería de Pruebas Automatizadas de Fase 4**:
  - `tacticalCombatSeamlessIntegration.test.ts`: 17/17 tests superados (100%).

### Base Fundacional (v0.1.0 Core) — Motor Táctico, Metajuego y Backend

#### Added
- **Motor Táctico Determinista (Advance Wars 1-100 HP Core)**:
  - Implementación determinista estricta (cero azar, $\text{RNG} = 0$) basada en la matriz oficial atacante/defensor de *Advance Wars*.
  - Escala balística de precisión continua de **1 a 100 HP** que erradica redondeos artificiales y soporta bonos incrementales del $+2\%$ por nivel.
  - Mitigación proporcional de daño por cobertura de estrellas de terreno (1★ Llanuras, 2★ Bosques, 3★ Ciudades/Fábricas, 4★ Montañas/Cuartel General).
  - Regla canónica de emboscada **TRAP** en niebla de guerra: detención en seco, revelación de unidad enemiga oculta y pérdida de turno.
  - Sistema de combustible y abastecimiento logístico: derribo de aeronaves en vuelo (`Crash`), hundimiento de submarinos sin combustible (`Sink`) y reabastecimiento en sedes aliadas.
  - Sistema de captura y desmantelamiento de Cuartel General (20 puntos de captura) con anexión de propiedades e incautación de contingentes supervivientes.
  - Roster de **28 Oficiales Comandantes (COs)** balanceados con poderes activos (`COP` y `SCOP`), cargas pasivas de medidor y bonificaciones simétricas.
  - Balística destructible y mapeador de elementos *Advance Wars By Web* (AWBW): torres de telecomunicaciones, tuberías y costuras blindadas con 100 HP.
- **Bark Engine Cómic y HUD Táctico C4ISR**:
  - Motor de narrativa reactiva contextual estilo novela gráfica bélica inspirado en *Hades* y *Persona 5*, operando 100% de manera visual (cero locución de voz).
  - 5 geometrías de bocadillos dinámicos (Globo Habla, Grito Dentado, Radio Militar Cuadrado, Pensamiento Nube, Susurro Punteado) y sellos de onomatopeyas Pop-Art con tramas Ben-Day (`¡BOOM!`, `¡CRASH!`, `¡ALERT!`, `¡SINK!`, `¡CLUTCH!`).
  - Viñeta diegética flotante del Comandante en Jefe con física reactiva de resortes y amortiguación elástica (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
  - Consola lateral retráctil C4ISR (`MetaCommandConsole`) que integra en una sola vista la telemetría del sector, órdenes de asedio, mando de guarniciones, hangares y ticker de recursos.
- **Metajuego Territorial Soberano (Lienzo Vivo Victoria 3 × Wplace)**:
  - Lienzo mundial interactivo a pantalla completa renderizado continuamente sobre la pantalla principal, eliminando menús estáticos flotantes.
  - **Cero regiones inexpugnables**: Las 195 capitales históricas y sedes mundiales son conquistables y operan como súper-nodos económicos con multiplicador $2.0\times$ de producción.
  - Asedio territorial por drenaje de Puntos de Control Territorial (**TCP**) y activación de Escudos de Cooldown de Prioridad (4 a 6 horas) para evitar *steamrolling*.
  - Protocolo de refuerzos tácticos con retardo logístico calibrado de **1 a 4 turnos** según la fatiga del combate.
  - Generación continua de recursos por minuto (*Wplace Economy*) con liquidación periódica y cobro de upkeep en Créditos Energéticos (**EC**).
  - Ecuación matemática de sobre-expansión imperial $\Psi_{\text{Over}}$ con penalización superlineal de mantenimiento a partir del umbral $N_{\text{cap}} = 6$ provincias.
- **Hangar Físico de Unidades y Cadena de Valor Industrial (Albion Online)**:
  - Deprecación definitiva del mazo rígido de 10 cartas: transición hacia **Hangares Físicos de Chasis** donde toda tropa desplegada representa munición descartable crafteada previamente.
  - Escalamiento industrial de tropas en 5 Tiers de calidad (T1 a T5):
    $$\text{BonoEfectividad}(N) = (N - 1) \times 2.0\% \quad \text{hasta } +10\% \text{ en Nivel 5}$$
  - Desbloqueo de **Patentes Tecnológicas Permanentes** mediante quema de materiales brutos y refinados de la guerra moderna (aleaciones de titanio, tierras raras, grafeno, micro-conductores, hormigón armado e hidrocarburos).
  - Sistema de reciclaje y recuperación de chatarra con retención base del 35% de valor en desguace.
- **Mercado Libre P2P Descentralizado**:
  - Negociación de materias primas, refinados, patentes y consumibles con **split transaccional del 2%**:
    - **1%** quemado permanentemente como sumidero deflacionario.
    - **1%** transferido como regalía soberana a la corporación dueña del territorio donde radica el mercado.
  - Estabilización algorítmica mediante **Bandas VWAP Collar $\pm 25\%$** para impedir transferencias fraudulentas o manipulación de precios.
  - Prohibición terminante de venta de tropas terminadas (crafteo físico obligatorio, 0% Pay-to-Win).
- **Mando Autónomo de Guarniciones IA**:
  - 5 niveles cognitivos de guarnición defensiva (desde Milicia Local heurística hasta Gran Mariscal Búnker con árbol MCTS y mapas de calor).
  - Regla canónica de envejecimiento y pase a retiro de Comandantes Legendarios tras **21 días reales** de servicio activo.
  - Protocolo de relevo humano (*Human Handshake* de 3 minutos) previo a la intervención de la IA.
- **Infraestructura de Datos y Backend (Supabase PostgreSQL)**:
  - 22 migraciones maestras de esquemas relacionales consolidadas.
  - Seguridad declarativa mediante **Row Level Security (RLS)** y ejecución atómica vía funciones RPC (`execute_p2p_market_transaction`, `rebalance_garrison_tier`, `grant_match_rewards`).
  - Sincronización en tiempo real a través de canales WebSocket de Supabase Realtime.

### Changed
- Reemplazo del sistema de mazo por Hangares Físicos persistentes en base de datos (`public.user_unit_hangar`).
- Sustitución de la tasa municipal previa del 12% por la regla canónica del split del 2% en el Mercado P2P.
- Migración de la arquitectura web hacia una SPA nativa en React 19 empaquetada con Vite 8 y estilizada con Tailwind CSS v4.

### Security & Infrastructure
- Erradicación de almacenamiento en memoria volátil o colecciones mock para inventarios, mercados y guarniciones; 100% de persistencia en PostgreSQL.
- Verificación criptográfica y validación estricta de coordenadas, límites territoriales adyacentes y balance de Créditos Energéticos en procedimientos almacenados.

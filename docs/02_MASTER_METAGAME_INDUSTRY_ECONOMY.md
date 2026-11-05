# VOLUMEN 2: METAJUEGO, COMPLEJO INDUSTRIAL Y ECONOMÍA DE MONETIZACIÓN
**Documento Canónico Unificado:** `02_MASTER_METAGAME_INDUSTRY_ECONOMY.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 4.0.0-DEFINITIVE-MASTER-SPEC  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Archivos Consolidados y Reemplazados:**  
- `05_MONETIZATION_AND_PROGRESSION.md` (Completo)  
- `17_HYPER_ENGAGEMENT_MILITARY_INDUSTRY_P2P.md` (Completo)  
- `18_HYPER_ENGAGEMENT_SAFEGUARD_PROTOCOL.md` (Completo)  
- `20_HYPER_ENGAGEMENT_TILT_FLASH_OFFERS.md` (Completo)  
- `21_HYPER_ENGAGEMENT_ASYMMETRIC_LADDER_NEARMISS.md` (Secciones económicas y de progresión)  

---

# 1. MODELO MATEMÁTICO DE PROGRESIÓN DE CUENTA

La progresión recompensa la habilidad táctica y la actividad constante sin generar inflación incontrolable.

### 1.1 Curva de Nivel de Cuenta
La cantidad de Puntos de Experiencia (XP) necesarios para pasar del nivel $N$ al nivel $N+1$ se rige por una curva de potencia asimétrica:

$$\text{XP}_{\text{Requerido}}(N) = \left\lfloor 150 \times N^{1.85} \right\rfloor$$
$$\text{XP}_{\text{Acumulado}}(N) = \sum_{k=1}^{N-1} \text{XP}_{\text{Requerido}}(k)$$

| Nivel ($N$) | XP Siguiente Nivel | XP Acumulado Total | Recompensas Desbloqueadas |
|:---:|:---:|:---:|:---|
| **1** | 150 XP | 0 XP | Armada Inicial (Infantería, Tanque Ligero, Recon, Artillería) |
| **2** | 541 XP | 150 XP | Desbloqueo: *Mecanizados (Bazuca Antitanque)* + 200 Créditos |
| **3** | 1,123 XP | 691 XP | Desbloqueo: *Helicóptero de Batalla (B-Copter)* + 300 Créditos |
| **4** | 1,883 XP | 1,814 XP | Desbloqueo: *Vehículo Antiaéreo* + Marco "Cabo" + Taller Militar |
| **5** | 2,813 XP | 3,697 XP | **Hito:** 25 Gemas de Mando + Skin Tanque "Camuflaje Desértico" |
| **6** | 3,907 XP | 6,510 XP | Desbloqueo: *Lanzamisiles Pesado* + 600 Créditos |
| **7** | 5,160 XP | 10,417 XP | Desbloqueo: *Tanque Mediano de Asalto* |
| **8** | 6,569 XP | 15,577 XP | **Hito:** Acceso al Mercado Libre P2P + Skin Infantería Urbana |
| **9** | 8,129 XP | 22,146 XP | Desbloqueo: *Caza de Supremsacía Aérea* |
| **10** | 9,839 XP | 30,275 XP | **Hito:** 50 Gemas de Mando + Insignia "Veterano de Batalla" |
| **15** | 20,443 XP | 98,412 XP | **Hito:** Desbloqueo de Comandante "Garrison" (Especialista en Defensa) |
| **20** | 34,228 XP | 224,960 XP | **Hito:** Skin Legendario de Cuartel General "Base de Operaciones Ártica" |

### 1.2 Cálculo de XP, Créditos y Regulación de Partidas (Online vs. Offline)
*Implementación de Referencia:* `src/engine/autonomousOrchestrator.ts` (`generateSummary`), `supabase/migrations/20261031000015_offline_progression_and_transport_persistence.sql` (`grant_match_rewards`).

> [!NOTE] Evolución de la Fórmula de Recompensas
> Originalmente proyectado como una ponderación acumulativa compleja por ciudades y bajas ($120 + 45C + 35U + 6T$), el motor consolidó una fórmula más robusta, transparente y calibrada contra la inflación, vinculada directamente a la duración del combate y la destrucción militar:

#### Partidas Multijugador Online (Estándar):
- **Experiencia de Cuenta ($\text{XP}$):**
  $$\text{XP}_{\text{Victoria}} = 120 + (\text{TurnosDisputados} \times 5)$$
  $$\text{XP}_{\text{Derrota}} = 40$$
- **Créditos de Batalla (`battleCredits`):**
  $$\text{Créditos}_{\text{Victoria}} = 250 + (\text{BajasEnemigasCausadas} \times 30)$$
  $$\text{Créditos}_{\text{Derrota}} = 75$$
- **Trofeos Competitivos de Ladder:**
  - Victoria: $+30$ trofeos (sujeto al Factor K dinámico).
  - Derrota: $-18$ trofeos (sujeto a protección de Escudo de Descenso).
  - Límite diario: **Sin límite de partidas ni recompensas**.

#### Partidas de Entrenamiento Offline (vs Bot):
Para evitar granjas pasivas (*bot farming*) preservando al mismo tiempo una rampa de aprendizaje atractiva para nuevos reclutas:
- **Reducción del 50%:** Toda partida contra la IA otorga exactamente el **$50\%$ de los créditos y XP** respecto a una partida online equivalente:
  $$\text{XP}_{\text{Offline}} = \left\lfloor \text{XP}_{\text{Online}} \times 0.50 \times \text{MultiplicadorDificultad} \right\rfloor$$
  $$\text{Créditos}_{\text{Offline}} = \left\lfloor \text{Créditos}_{\text{Online}} \times 0.50 \times \text{MultiplicadorDificultad} \right\rfloor$$
- **Multiplicadores por Dificultad del Bot:**
  - Fácil (`easy`): $0.85\times$
  - Normal (`normal`): $1.00\times$
  - Difícil (`hard`) / Ajedrez (`chess`): $1.20\times$
- **Cero Trofeos:** $\text{trophiesDelta} = 0$. El prestigio clasificatorio se reserva exclusivamente a batallas PvP humanas.
- **Curva de Rendimiento Decreciente (Soft Cap Logístico en 4 Tramos):**
  - Implementado en `src/engine/autonomousOrchestrator.ts` (`calculateOfflineRewardMultiplier`) y en la función RPC de Supabase `grant_match_rewards` (Migración 21):
    - **Partidas 1 a 3 del día:** Multiplicador $\mu = 1.0$ ($100\%$ de la recompensa offline base).
    - **Partida 4 del día:** Multiplicador $\mu = 0.60$ ($60\%$).
    - **Partida 5 del día:** Multiplicador $\mu = 0.30$ ($30\%$).
    - **Partida 6 del día:** Multiplicador $\mu = 0.10$ ($10\%$).
    - **Partida 7 en adelante:** Multiplicador $\mu = 0.02$ ($2\%$).
  - **Suelo Mínimo de Recompensa Positiva:** Toda victoria o combate completado retiene un suelo inviolable garantizado de al menos $+5\text{ XP}$ y $+10\text{ Créditos}$, erradicando la sensación de recompensa nula sin habilitar bots de farming no supervisado. El contador diario se resetea a las 00:00 UTC.

#### Bifurcación Competitiva: Elo Asimétrico vs Elo Esports
- La base de datos y el motor implementan dos sistemas de clasificación independientes en `public.profiles`:
  1. `elo_rating`: Clasificación del Ladder asimétrico regular y asedios territoriales, donde influyen los Tiers de manufactura industrial de los chasis (Tiers T1 a T5, +2% por escalón) y la disponibilidad de stock físico de hangares.
  2. `elo_rating_esports`: Clasificación del circuito competitivo oficial y Duelo Espejo, donde el combate opera con Tier 1 Standard Base y modificadores normalizados a $0.0\%$ (paridad competitiva absoluta).

#### Incentivo de Primera Sangre en Partida (`First Blood Bounty`):
- Implementado en `App.tsx` (`FIRST_BLOOD_BOUNTY_G = 600`), el primer comandante en destruir una tropa enemiga recibe un bono instantáneo de **$+\$600\text{G}$** en sus fondos de partida (`funds`), dinamizando el segundo 90 y acelerando la producción de contra-unidades antes del primer AirDrop.

### 1.3 Arquitectura de Divulgación Progresiva del Lobby (`WarLobbyHub.tsx`)
Para evitar la sobrecarga cognitiva en nuevos reclutas y garantizar un embudo de retención de alta conversión (evitando que el Complejo Industrial se perciba prematuramente como un juego *idle* ajeno al combate), el Lobby restringe las pestañas según el nivel de cuenta del jugador:

| Fase de Mando | Rango / Nivel | Módulos Visibles | Módulos Bloqueados (Candado) | Misión Guiada de Onboarding |
| :---: | :---: | :--- | :--- | :--- |
| **Fase 1: Recluta** | Nivel 1 | • `combat` (Duelo Espejo & Práctica vs Bot)<br>• `lobby` (Cabecera y Despliegue) | • `shop`, `armory`, `clans`<br>• `industry`, `marketplace`<br>• Balances de Acero/Gemas | **Misión 1: Bautismo de Fuego.**<br>Disputa tu primer combate PvP o vs Bot. Recompensa: $+150\text{ XP}$. |
| **Fase 2: Cabo** | Nivel 2–3 | • `combat`<br>• `armory` (Almacén de Unidades T1-T5)<br>• `shop` (Intendencia Militar) | • `clans`<br>• `industry`<br>• `marketplace` | **Misión 2: Gestión de Almacén.**<br>Revisa tu stock físico y equipa tus divisiones militares T1-T5. |
| **Fase 3: Sargento** | Nivel 4–7 | • `combat`, `armory`, `shop`<br>• `clans` (Corporaciones, Bóveda, Salvaguarda) | • `industry`<br>• `marketplace` | **Misión 3: Alianza Estratégica.**<br>Afíliate a una corporación militar o activa un seguro de racha. |
| **Fase 4: Veterano** | Nivel 8+ | **ACCESO INTEGRAL (8 Módulos):**<br>• `industry` (10 Parcelas Territoriales)<br>• `marketplace` (Bolsa Libre P2P) | *Ninguno.* | **Misión 4: Forja Territorial.**<br>Construye tu primera fundición y extrae 50 lingotes de Acero en los Altos Hornos Vulcan. |
| **Modo Auditor** | Todos | • `qa` (Telemetría de arnés)<br>• `docs` (Inteligencia de doctrina) | Agrupados en cabecera técnica: `[⚙️ Terminal de Estado Mayor]` | Acceso a arnés de pruebas y benchmarks en vivo. |

### 1.4 Motor de Tutorial Restrictivo Guiado (`tutorialEngine.ts`)
*Implementación de Referencia:* `src/engine/tutorialEngine.ts`, `src/components/game/TutorialOverlay.tsx`.

Para garantizar que el nuevo recluta internalice los fundamentos mecánicos sin margen de desvío ni fricción cognitiva, se despliega una máquina de estados finitos determinista sobre una cuadrícula táctica restringida de $8 \times 4$:
- **7 Pasos Secuenciales Inviolables:**
  1. `SELECT_INFANTRY`: El cursor y la interacción se bloquean excepto sobre la infantería aliada en $(1, 1)$.
  2. `MOVE_INFANTRY`: Movimiento forzado hacia la baldosa $(2, 1)$.
  3. `CONFIRM_WAIT`: Confirmación de la orden de espera (`wait`).
  4. `END_PLAYER_TURN`: Ceso de iniciativa y paso al turno de la IA instructora.
  5. `SELECT_COMBAT`: Selección de la infantería posicionada para entrar en combate.
  6. `ATTACK_ENEMY`: Ejecución de fuego directo contra la infantería enemiga en $(3, 1)$.
  7. `CAPTURE_HQ`: Ocupación y toma de la sede territorial para sellar la victoria táctica.
- **Overlay Visual Reactivo (`TutorialOverlay.tsx`):**
  - Resalta con borde pulsante la casilla obligatoria del paso actual.
  - Bloquea clics en cualquier otra coordenada del tablero (`pointer-events: none` selectivo).
  - Proyecta viñetas de diálogo cómic con las directivas de la Comandante Rachel.

### 1.5 Modo Campaña Narrativa - Acto I (`campaignEngine.ts`)
*Implementación de Referencia:* `src/engine/campaignEngine.ts`.

Progresión estructurada individual para afianzar doctrinas militares antes de la arena PvP:
1. **Misión 1: Defensa del Perímetro (`perimeter_defense`):**
   - Introducción al posicionamiento defensivo en bosques y ciudades.
   - Recompensas: $+200\text{ XP}$, $+500\text{ Créditos}$.
2. **Misión 2: Emboscada en el Valle (`valley_ambush`):**
   - Dominio de la mecánica `¡TRAP!` en niebla de guerra y maniobras de flanqueo con vehículos blindados.
   - Recompensas: $+350\text{ XP}$, $+800\text{ Créditos}$.
3. **Misión 3: Contraofensiva Blindada (`armored_counter`):**
   - Asalto coordinado con tanques medianos, artillería indirecta y uso táctico del Super CO Power.
   - Recompensas: $+500\text{ XP}$, $+1,200\text{ Créditos}$, Desbloqueo de Marco Cosmético de Veterano.

---

# 2. EL COMPLEJO INDUSTRIAL MILITAR Y CADENA DE REFINADO
**[ESTADO: 100% IMPLEMENTADO Y CERTIFICADO EN MOTOR, FRONTEND, DB Y TESTS]**  
*Implementación de Referencia:* `src/engine/industrialEngine.ts`, `src/components/industry/IndustrialComplexView.tsx`, `src/components/industry/P2PMarketplaceView.tsx`, `supabase/migrations/20261031000013_economy_idle_rework_territorial_plots.sql`.

> [!NOTE] Evolución Arquitectónica
> Originalmente diseñado como un silo estático único con ciclo de 10 horas y merma agresiva del 2.5%/h, el sistema fue completamente modernizado en la propuesta aprobada y desplegada `docs/08_PROPOSAL_ECONOMY_IDLE_REWORK.md` (Migración 13), transformándolo en un sistema territorial modular de 10 Parcelas con ciclo circadiano ergonómico, cola multi-batch de refinado y sumidero deflacionario estabilizado.

```
                  SISTEMA TERRITORIAL DE 10 PARCELAS INDUSTRIALES
                                         │
          ┌──────────────────────────────┼──────────────────────────────┐
          ▼                              ▼                              ▼
  [ CATEGORÍA A: PRIMARIA ]     [ CATEGORÍA B: REFINACIÓN ]    [ CATEGORÍA C: SOPORTE ]
  • Mina de Hierro               • Altos Hornos Vulcan          • Silos de Reserva Logística
  • Cantera de Piedra            • Planta de Hormigón Armado    • Terminal de Mercado P2P
  • Pozo de Tierras Raras        • Sala Limpia de Microchips    • Generador de Combustible
  • Destilería Sintética         • Laboratorio Nanocompuestos
                                         │
                                         ▼
                      [ CICLO CIRCADIANO ERGONÓMICO ]
                      • 12 Horas de Producción Continua
                      • +4 Horas de Gracia (16 Horas de Ventana Segura)
                      • Cosecha a Tiempo: +10% Recursos Puros y +500G
                                         │
                                         ▼
             ┌───────────────────────────┴───────────────────────────┐
             ▼                                                       ▼
  [ CARCOMA SUAVIZADA (1.5%/h) ]                           [ COLA MULTI-BATCH (3 CICLOS) ]
  • Límite piso de seguridad: 60%                          • Hasta 3 lotes consecutivos
  • 70% de merma va a "Cargamento Varado"                  • Refinado nocturno autónomo
    recuperable ganando batallas PvP/PvE                   • Aceleración con Combustible (-50% t)
```

### 2.1 Cuadrícula Territorial de 10 Parcelas (`user_industrial_plots`)
El complejo industrial opera sobre una cuadrícula modular donde cada parcela puede albergar una empresa especializada:
- **Parcelas 1 a 7 (Fase 1 - Niveles 1 al 11):** Desbloqueo progresivo por nivel de cuenta con costes accesibles en oro.
- **Parcelas 8 a 10 (Fase 2 - Endgame Comercial Niveles 12 al 15):** Requieren títulos de expansión corporativa y abastecen la demanda industrial avanzada.
- **Empresas Disponibles:**
  1. *Extracción Primaria:* `mine_iron` (Hierro), `quarry_stone` (Piedra), `drill_rare_earth` (Tierras Raras), `distillery_synth_fuel` (Combustible de Campaña).
  2. *Refinado Secundario:* `smelter_vulcan` (Vigas de Acero), `concrete_plant` (Hormigón Armado), `cleanroom_chips` (Microchips de Guía), `lab_nano_compounds` (Blindaje Reactivo).
  3. *Infraestructura:* `logistics_silo` (Expansión de capacidad y mitigación de carcoma), `market_terminal` (Acceso al Mercado P2P con reducción de aranceles), `fuel_generator` (Energía constante).
- **Overhaul y Demolición Segura:** Reconfigurar una parcela devuelve el 50% de los materiales invertidos y requiere confirmación en dos pasos.

### 2.2 Catálogo de Recursos Industriales y Recetas Multi-Batch
1. **Materias Primas:** `raw_iron`, `raw_stone`, `raw_rare_earth`.
2. **Materiales Procesados:**
   - **Vigas de Acero Militar (`refined_steel`):** 100 hierro $\to$ 10 vigas en 4 horas (Altos Hornos).
   - **Hormigón Armado (`refined_concrete`):** 80 piedra $\to$ 15 bloques en 2 horas (Planta Hormigón).
   - **Microchips de Guía (`refined_microchip`):** 200 tierras raras $\to$ 5 chips en 8 horas (Sala Limpia).
3. **Cola Multi-Batch (Hasta 3 Lotes):** Permite encolar hasta 3 tandas sucesivas sin requerir inicio de sesión entre ellas.
4. **Combustible de Campaña (`campaign_fuel`):** Recompensa de batalla que reduce en un 50% el tiempo de fundición.

### 2.3 Protocolo Circadiano y Protección contra Carcoma
- **Ventana de Recolección (16 Horas Seguras):** 12 horas de llenado de almacén base más 4 horas de gracia sin penalización alguna.
- **Bono de Eficiencia Logística:** Si el jugador recolecta dentro de la ventana de 16 horas, recibe un bono positivo de **+10% en recursos de alta pureza y +500 Créditos**.
- **Merma Suavizada (1.5% / hora tras la hora 16):**
  - La merma máxima tiene un piso de seguridad estricto del **60%** (el almacén nunca cae por debajo del 40% del inventario).
  - **Sistema de Cargamento Varado (`user_stranded_cargo`):** El 70% de los recursos perdidos por carcoma se acumulan en un convoy varado, el cual puede recuperarse de forma gratuita ganando partidas en el Frente.

---

# 3. EL MERCADO P2P GLOBAL, SPLIT TRANSACCIONAL DEL 2% Y BANCO CENTRAL NPC

Los comandantes comercian materias primas, derivados industriales, patentes tecnológicas y consumibles en un mercado descentralizado:
- **Moneda de Intercambio:** Créditos Energéticos (EC) —fluido operativo y divisa universal de *Stellaris*— y fondos de intendencia.
- **Split Transaccional del 2% (Canónico SSOT):** Sobre el monto total de cada transacción se aplica una deducción del **2.0%**:
  - **1.0%** se quema de forma permanente como sumidero deflacionario (*Sink*).
  - **1.0%** se liquida como regalía soberana a la tesorería de la corporación que ostenta la soberanía sobre el territorio donde radica el nodo de mercado.
- **Bandas de Precio Dinámicas (VWAP Collar $\pm 25\%$):** El precio unitario de cualquier orden queda acotado dentro de un intervalo estricto de $\pm 25\%$ respecto al Precio Medio Ponderado por Volumen (VWAP) de las últimas 24 horas, bloqueando manipulaciones especulativas o traspaso ilícito de activos entre cuentas secundarias.
- **Prohibición Terminante de Tropas Terminadas:** Queda prohibida la venta de unidades militares terminadas (tanques, cazas, artillería armada). Toda unidad debe forjarse físicamente en los hangares y fábricas territoriales (0% Pay-to-Win).
- **Banco Central de Intendencia Militar (NPC Liquidity Stabilizer):**
  A través de la función de backend `fulfill_stale_p2p_orders`, cualquier orden de venta en el mercado que permanezca sin comprador durante más de **6 horas** dentro del rango VWAP es absorbida de forma autónoma por intendencia militar NPC al precio medio de mercado, garantizando liquidez permanente.
- **Requisitos de Acceso:** Nivel de Cuenta 8 mínimo y al menos 15 partidas disputadas.

---

# 4. SISTEMA DE HANGAR FÍSICO, TIERS T1-T5 Y PATENTES TECNOLÓGICAS (CANON 2.0)

La progresión de combate se desacopla de colecciones pasivas de cartas y se traslada a la calidad de forja industrial:

$$\text{BonoEfectividad}(N) = (N - 1) \times 2.0\% \quad \text{para } N \in \{1, 2, 3, 4, 5\}$$

| Tier de Tropa | Bono Balístico | Bono Mitigación | Requisitos de Materiales y Pureza | Ámbito de Despliegue |
|:---:|:---:|:---:|:---|:---|
| **Tier 1 (Estándar)** | $+0\%$ | $+0\%$ | Chasis básico fundacional (Mineral Metálico + Carbono) | Inicial / Duelos Espejo Simétricos |
| **Tier 2 (Reforzado)** | $+2\%$ | $+2\%$ | Aleaciones de Acero Templado + Hidrocarburos | Teatros Provinciales Iniciales |
| **Tier 3 (Avanzado)** | $+4\%$ | $+4\%$ | Titanio + Micro-Conductores de Alta Densidad | Teatros Fronterizos Medios |
| **Tier 4 (Pesado)** | $+6\%$ | $+6\%$ | Grafeno + Polímeros + Óptica Cuántica | Campañas de Alta Tensión |
| **Tier 5 (Élite Exp.)**| **$+10\%$** | **$+10\%$** | Cerámica Blindada + Tierras Raras Purificadas | Asedios a Capitales Nacionales |

### 4.1 Patentes Tecnológicas Permanentes y Desguace de Chatarra
- **Patentes Permanentes:** El comandante desbloquea la capacidad de forjar arquetipos avanzados quemando lotes de recursos brutos y refinados en el centro tecnológico de su corporación.
- **Recuperación de Chatarra Balística:** Al destruirse una unidad en combate o ejecutarse una orden de desguace voluntario en el hangar, el taller recupera un **35% del valor base** de sus materiales en forma de chatarra recuperable (`tech_scrap`), minimizando el desecho industrial.

### 4.2 Cola de Producción Física y Tiempos de Ensamblaje ($t_{\text{forja}}$)
A diferencia de los juegos de cartas con despliegue instantáneo ilimitado, la fabricación de unidades físicas en *Tactical Command* consume tiempo y recursos industriales continuos (`unit_production_queue`):

| Arquetipo de Unidad | Tier | Tiempo de Forja ($t_{\text{forja}}$) | Coste Industrial Base |
| :--- | :---: | :---: | :--- |
| **Infantería Ligera (Kit Básico F2P)** | T1 | **0 segundos (Instantáneo)** | Gratuito / Inagotable |
| **Vehículo de Reconocimiento (Recon F2P)** | T1 | **0 segundos (Instantáneo)** | Gratuito / Inagotable |
| **Infantería Mecanizada (Mech)** | T1-T2 | **30 - 60 segundos** | 15 Mineral Metálico + 50 EC |
| **Tanque Ligero / Artillería Obús** | T1-T3 | **90 - 150 segundos** | 30 Mineral + 10 Acero + 120 EC |
| **Tanque Mediano / B-Copter / Antiaéreo** | T2-T4 | **180 - 240 segundos** | 60 Mineral + 25 Acero + 250 EC |
| **Neotanque / Caza / Bombardero / Acorazado**| T3-T5 | **300 - 450 segundos** | 100 Mineral + 50 Acero + 20 Chips + 500 EC |

- **Kit Básico F2P Inviolable:** Para evitar que un comandante quede excluido de la guerra por quiebra o pérdida total de flota, el Estado Mayor provee infantería ligera y patrullas de reconocimiento T1 ilimitadas y sin tiempo de espera.
- **Concurrencia:** Los comandantes disponen de slots concurrentes de forja según el nivel de su taller militar. Una vez completado el tiempo de espera, la unidad terminada se transfiere al hangar del jugador (`user_unit_hangar`) o al hangar compartido de su facción (`faction_unit_hangar`) mediante la RPC atómica `claim_finished_unit`.

### 4.3 Arsenal Compartido de Facción (`faction_unit_hangar`)
Los clanes y corporaciones militares operan un arsenal logístico centralizado que permite a los miembros cooperar militarmente al estilo de las alianzas de *Stellaris* y *Albion Online*:
- **Aportaciones de Miembros:** Cualquier miembro puede forjar unidades asignando el destino `'faction'` para donar tropas terminadas al hangar comunitario del clan.
- **Despliegue y Préstamo de Tropas:** Los miembros del clan pueden seleccionar y desplegar tropas del hangar de facción en asedios provinciales como si fuesen de su propio almacén, siempre que cuenten con la autorización y jerarquía requerida (`role IN ('veteran', 'officer', 'leader')`).
- **Pérdida en Combate de Tropas de Facción:** Si una unidad prestada de la facción es destruida en el frente territorial, se descuenta de forma irreversible del stock de la facción, y el 35% de chatarra recuperada (`tech_scrap`) se deposita en la Bóveda del Clan para reconstrucción.

---

# 5. PROTOCOLO DE SALVAGUARDA TÁCTICA (SEGURO DE RACHA CALIBRADO)

Artefacto consumible legendario que protege la racha de victorias ante una derrota:

```
[ PROTOCOLO DE SALVAGUARDA TÁCTICA ]
├── Fabricación F2P: Taller Nivel 4 | 24 Horas | 40 Acero + 15 Hormigón + 5 Combustible + 3,500 Créditos. (0 Microchips - Max 2 en almacén)
├── Suscripción Command Pass: 1 Salvaguarda pre-ensamblada diaria sin coste. (Max 3 en almacén)
└── Operación en Partida:
    ├── Equipamiento PROACTIVO en el lobby previo a la cola de Ranked.
    ├── En Victoria: La racha avanza (+1) y la salvaguarda NO SE CONSUME.
    └── En Derrota: La salvaguarda se sacrifica; racha y trofeos se CONSERVAN INTACTOS.
```

### 5.1 Tabla de Multiplicadores por Racha Invicta
$$\text{Multiplicador de Botín}(\text{Racha}) = 1.0 + \min(5, \max(0, \text{Racha} - 2)) \times 0.25$$

| Racha Consecutiva | Multiplicador Créditos/XP | Insignia Visual en Perfil |
|:---:|:---:|:---|
| **1 - 2 Victorias** | $1.0\times$ (Estándar) | Sin insignia |
| **3 Victorias** | $1.25\times$ | Marco de Cobre "En Racha" |
| **4 Victorias** | $1.50\times$ | Marco de Plata "Imparable" |
| **5 Victorias** | $1.75\times$ | Marco de Oro "Dominante" |
| **6+ Victorias (Máx)** | **$2.0\times$ (Doble Botín)** | **Llamas Pop-Art "Comandante Legendario"** |

---

# 6. MONETIZACIÓN INTEGRAL: STRIPE, COMMAND PASS Y OFERTAS DE TILT

### 6.1 Catálogo de Tienda y Command Pass
- **Gemas de Mando (`command_gems`):** Paquetes desde \$1.99 (100 gemas) hasta \$49.99 (3,500 gemas) gestionados con Stripe Checkout y verificación webhook HMAC.
- **Command Pass de Temporada (\$5.99 / mes):**
  - Reclamación Retroactiva: Si el jugador sube niveles en el pase gratuito y compra el pase al final del mes, desbloquea instantáneamente todas las recompensas acumuladas.
  - 1 Protocolo de Salvaguarda diario entregado a las 00:00 UTC.
  - Cola de apertura automática de cofres.
  - Cosméticos de cómic exclusivos (bocadillos Neón y sellos Pop-Art).

### 6.2 Ofertas Flash de Emergencia por Tilt (\$0.99)
- **Activación:** Se dispara tras 2 derrotas consecutivas con turnos precipitados ($PTE < 10\text{s}$).
- **Presentación:** La pantalla muestra la viñeta del Comandante vendado y en shock ofreciendo un paquete flash del Alto Mando: 1 Chasis Reforzado T2 de la tropa destruida + 30 Vigas de Acero procesado por **\$0.99 (85% OFF)**.
- **Urgencia Temporal:** Cronómetro gigante de **180 segundos**. Si no se adquiere en ese tiempo, la oferta se autodestruye.
- **Tope de Frecuencia:** Máximo **1 oferta cada 48 horas por cuenta**.

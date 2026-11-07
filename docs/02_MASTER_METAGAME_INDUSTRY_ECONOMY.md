# VOLUMEN 2: METAJUEGO, COMPLEJO INDUSTRIAL Y ECONOMÍA DE MONETIZACIÓN
**Documento Canónico Unificado:** `02_MASTER_METAGAME_INDUSTRY_ECONOMY.md`  
**Proyecto:** *GEOTACTICS ONLINE (Wars of Legacy)*  
**Versión:** 5.0.0-MODULAR-DOMAINS-SSOT  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Dominio Principal de Código:** `src/domains/economy/` (`@domains/economy`) + `src/shared/` (`@shared`)  
**Archivos Consolidados y Reemplazados:**  
- `05_MONETIZATION_AND_PROGRESSION.md` (Completo)  
- `17_HYPER_ENGAGEMENT_MILITARY_INDUSTRY_P2P.md` (Completo)  
- `18_HYPER_ENGAGEMENT_SAFEGUARD_PROTOCOL.md` (Completo)  
- `20_HYPER_ENGAGEMENT_TILT_FLASH_OFFERS.md` (Completo)  
- `21_HYPER_ENGAGEMENT_ASYMMETRIC_LADDER_NEARMISS.md` (Secciones económicas y de progresión)  

---

# 1. MODELO MATEMÁTICO DE PROGRESIÓN DE CUENTA

La progresión recompensa la habilidad táctica y la actividad constante sin generar inflación incontrolable, operando bajo el **Pilar 1 Canónico (CERO CARTAS / NO TCG ni Gacha)** y abasteciendo un **Almacén Físico / Hangar de 16 tropas máximo por jugador (4 slots de despliegue activo + 12 en reserva)**.

### 1.1 Curva de Nivel de Cuenta
La cantidad de Puntos de Experiencia (XP) necesarios para pasar del nivel $N$ al nivel $N+1$ se rige por una curva de potencia asimétrica:

$$\text{XP}_{\text{Requerido}}(N) = \left\lfloor 150 \times N^{1.85} \right\rfloor$$
$$\text{XP}_{\text{Acumulado}}(N) = \sum_{k=1}^{N-1} \text{XP}_{\text{Requerido}}(k)$$

| Nivel ($N$) | XP Siguiente Nivel | XP Acumulado Total | Recompensas Desbloqueadas |
|:---:|:---:|:---:|:---|
| **1** | 150 XP | 0 XP | Dotación F2P Inicial (Infantería T1, Tanque Ligero, Recon T1, Artillería) |
| **2** | 541 XP | 150 XP | Patente: *Mecanizados (Bazuca Antitanque)* + 200 Créditos + Parcela P-3 |
| **3** | 1,123 XP | 691 XP | Patente: *Helicóptero de Batalla (B-Copter)* + 300 Créditos |
| **4** | 1,883 XP | 1,814 XP | Patente: *Vehículo Antiaéreo* + Marco "Cabo" + Taller Militar + Parcela P-4 |
| **5** | 2,813 XP | 3,697 XP | **Hito:** 25 Gemas de Mando + Skin Tanque "Camuflaje Desértico" |
| **6** | 3,907 XP | 6,510 XP | Patente: *Lanzamisiles Pesado* + 600 Créditos + Parcela P-5 |
| **7** | 5,160 XP | 10,417 XP | Patente: *Tanque Mediano de Asalto* |
| **8** | 6,569 XP | 15,577 XP | **Hito:** Acceso al Mercado Libre P2P + Skin Infantería Urbana + Parcela P-6 |
| **9** | 8,129 XP | 22,146 XP | Patente: *Caza de Supremacía Aérea* |
| **10** | 9,839 XP | 30,275 XP | **Hito:** 50 Gemas de Mando + Insignia "Veterano de Batalla" + Parcela P-7 |
| **15** | 20,443 XP | 98,412 XP | **Hito:** Comandante "Garrison" (Especialista en Defensa) + Parcela P-10 |
| **20** | 34,228 XP | 224,960 XP | **Hito:** Skin Legendario de Cuartel General "Base de Operaciones Ártica" |

### 1.2 Cálculo de XP, Créditos y Regulación de Partidas (Online vs. Offline)
*Implementación de Referencia:* `src/domains/tactics/core/autonomousOrchestrator.ts` (`@domains/tactics`, método `generateSummary`), `src/domains/economy/core/industrialEngine.ts` (`ECONOMY_CONFIG_V2.pvpArenaMultiplier`), `supabase/migrations/20261031000015_offline_progression_and_transport_persistence.sql` (`grant_match_rewards`).

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
  - Victoria: $+30$ trofeos (sujeto al Factor K dinámico en `src/domains/tactics/core/rankedLadderEngine.ts`).
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
  - Implementado en `src/domains/tactics/core/autonomousOrchestrator.ts` (`calculateOfflineRewardMultiplier`) y en la función RPC de Supabase `grant_match_rewards` (Migración 21):
    - **Partidas 1 a 3 del día:** Multiplicador $\mu = 1.0$ ($100\%$ de la recompensa offline base).
    - **Partida 4 del día:** Multiplicador $\mu = 0.60$ ($60\%$).
    - **Partida 5 del día:** Multiplicador $\mu = 0.30$ ($30\%$).
    - **Partida 6 del día:** Multiplicador $\mu = 0.10$ ($10\%$).
    - **Partida 7 en adelante:** Multiplicador $\mu = 0.02$ ($2\%$).
  - **Suelo Mínimo de Recompensa Positiva:** Toda victoria o combate completado retiene un suelo inviolable garantizado de al menos $+5\text{ XP}$ y $+10\text{ Créditos}$, erradicando la sensación de recompensa nula sin habilitar bots de farming no supervisado. El contador diario se resetea a las 00:00 UTC.

#### Bifurcación Competitiva: Elo Asimétrico vs Elo Esports
- La base de datos y el motor implementan dos sistemas de clasificación independientes en `public.profiles`:
  1. `elo_rating`: Clasificación del Ladder asimétrico regular y asedios territoriales, donde influyen los Tiers de manufactura industrial de los chasis (**Tiers T1 a T5, progresión horizontal estricta de +2% por escalón: +0%, +2%, +4%, +6% y máximo +8% en T5**) y la disponibilidad de stock físico en el Hangar de 16 unidades (4 slots activos + 12 reserva).
  2. `elo_rating_esports`: Clasificación del circuito competitivo oficial y Duelo Espejo, donde el combate opera con Tier 1 Standard Base y modificadores normalizados a $0.0\%$ (paridad competitiva absoluta).

#### Incentivo de Primera Sangre en Partida (`First Blood Bounty`):
- Implementado en `App.tsx` (`FIRST_BLOOD_BOUNTY_G = 600`), el primer comandante en destruir una tropa enemiga recibe un bono instantáneo de **$+\$600\text{G}$** en sus fondos de partida (`funds`), dinamizando el segundo 90 y acelerando la producción de contra-unidades antes del primer AirDrop.

### 1.3 Arquitectura de Divulgación Progresiva del Lobby (`src/domains/world/components/WarLobbyHub.tsx`)
Para evitar la sobrecarga cognitiva en nuevos reclutas y garantizar un embudo de retención de alta conversión (evitando que el Complejo Industrial se perciba prematuramente como un juego *idle* ajeno al combate), el Lobby (`@domains/world`) restringe las pestañas según el nivel de cuenta del jugador:

| Fase de Mando | Rango / Nivel | Módulos Visibles | Módulos Bloqueados (Candado) | Misión Guiada de Onboarding |
| :---: | :---: | :--- | :--- | :--- |
| **Fase 1: Recluta** | Nivel 1 | • `combat` (Duelo Espejo & Práctica vs Bot)<br>• `lobby` (Cabecera y Despliegue) | • `shop`, `armory`, `clans`<br>• `industry`, `marketplace`<br>• Balances de Acero/Gemas | **Misión 1: Bautismo de Fuego.**<br>Disputa tu primer combate PvP o vs Bot. Recompensa: $+150\text{ XP}$. |
| **Fase 2: Cabo** | Nivel 2–3 | • `combat`<br>• `armory` (Hangar Físico de 16 Tropas T1-T5)<br>• `shop` (Intendencia Militar) | • `clans`<br>• `industry`<br>• `marketplace` | **Misión 2: Gestión de Hangar Físico.**<br>Revisa tu almacén de 16 unidades (4 despliegue + 12 reserva) y equipa tus chasis T1-T5. |
| **Fase 3: Sargento** | Nivel 4–7 | • `combat`, `armory`, `shop`<br>• `clans` (Corporaciones, Bóveda, Salvaguarda) | • `industry`<br>• `marketplace` | **Misión 3: Alianza Estratégica.**<br>Afíliate a una corporación militar o activa un seguro de racha. |
| **Fase 4: Veterano** | Nivel 8+ | **ACCESO INTEGRAL (8 Módulos):**<br>• `industry` (10 Parcelas Territoriales)<br>• `marketplace` (Bolsa Libre P2P) | *Ninguno.* | **Misión 4: Forja Territorial.**<br>Construye tu primera fundición y extrae 50 lingotes de Acero en los Altos Hornos Vulcan. |
| **Modo Auditor** | Todos | • `qa` (`src/shared/qa/QADevOpsRunner.tsx`)<br>• `docs` (Inteligencia de doctrina) | Agrupados en cabecera técnica: `[⚙️ Terminal de Estado Mayor]` | Acceso a arnés de pruebas y benchmarks en vivo. |

### 1.4 Motor de Onboarding Táctico y Doctrina de Combate (`@domains/tactics`)
*Implementación de Referencia:* `src/domains/tactics/core/autonomousOrchestrator.ts`, `src/domains/tactics/components/CombatTheaterView.tsx`, `src/domains/game-feel/core/barkEngine.ts`.

Para garantizar que el nuevo recluta internalice los fundamentos mecánicos sin margen de desvío ni fricción cognitiva, el flujo de instrucción táctica guía sobre cuadrícula restringida:
- **7 Pasos Secuenciales Inviolables:**
  1. `SELECT_INFANTRY`: El cursor y la interacción se focalizan sobre la infantería aliada en $(1, 1)$.
  2. `MOVE_INFANTRY`: Movimiento guiado hacia la baldosa $(2, 1)$.
  3. `CONFIRM_WAIT`: Confirmación de la orden de espera (`wait`).
  4. `END_PLAYER_TURN`: Ceso de iniciativa y paso al turno de la IA instructora.
  5. `SELECT_COMBAT`: Selección de la infantería posicionada para entrar en combate (escala continua de **1 a 100 HP enteros**, Pilar 2).
  6. `ATTACK_ENEMY`: Ejecución de fuego directo contra la infantería enemiga en $(3, 1)$.
  7. `CAPTURE_HQ`: Ocupación y toma de la sede territorial o aniquilación total (0 tropas supervivientes = derrota inapelable, Pilar 3).
- **Directivas Reactivas (`src/domains/game-feel/components/CommanderBarkWidget.tsx`):**
  - Resalta la casilla obligatoria del paso actual y proyecta viñetas de diálogo cómic con las directivas de la Comandante Rachel.

### 1.5 Escenarios Tácticos y Progresión de Campaña (`@domains/tactics`)
*Implementación de Referencia:* `src/domains/tactics/core/predefinedMaps.ts`, `src/domains/tactics/core/aiBot.ts`.

Progresión estructurada individual para afianzar doctrinas militares antes de la arena PvP:
1. **Misión 1: Defensa del Perímetro (`perimeter_defense`):**
   - Introducción al posicionamiento defensivo en bosques y ciudades.
   - Recompensas: $+200\text{ XP}$, $+500\text{ Créditos}$.
2. **Misión 2: Emboscada en el Valle (`valley_ambush`):**
   - Dominio de la mecánica `¡TRAP!` en niebla de guerra (`src/domains/tactics/core/fogOfWar.ts`) y maniobras de flanqueo con vehículos blindados.
   - Recompensas: $+350\text{ XP}$, $+800\text{ Créditos}$.
3. **Misión 3: Contraofensiva Blindada (`armored_counter`):**
   - Asalto coordinado con tanques medianos, artillería indirecta y uso táctico del Super CO Power (`src/domains/tactics/core/coSystem.ts`).
   - Recompensas: $+500\text{ XP}$, $+1,200\text{ Créditos}$, Desbloqueo de Marco Cosmético de Veterano.

---

# 2. EL COMPLEJO INDUSTRIAL MILITAR, CADENA DE REFINADO Y TICKER WPLACE
**[ESTADO: 100% IMPLEMENTADO Y CERTIFICADO EN MOTOR, FRONTEND, DB Y TESTS]**  
*Implementación de Referencia (`@domains/economy`):*
- `src/domains/economy/core/industrialEngine.ts` (`IndustrialEngine`, `REFINING_RECIPES`, `PLOT_UNLOCK_TABLE`, `ECONOMY_CONFIG_V2`)
- `src/domains/economy/core/upkeepEngine.ts` (`TerritorialUpkeepEngine`, `calculateImperialUpkeep`, `calculateRgoRegionalYield`)
- `src/domains/economy/core/turnEconomy.ts` (`TurnEconomyEngine`, `CANONICAL_UNIT_PRODUCTION_CATALOG`)
- `src/domains/economy/core/propertyMaintenance.ts` (`processPropertyMaintenance`, `isPropertyCompatibleWithUnit`)
- `src/domains/economy/services/fiefBuildingService.ts` (`fiefBuildingService`, `FiefBuildingService`, `applyTacticalMarkEffects`)
- `src/domains/economy/hooks/useUserIndustry.ts` (`useUserIndustry`)
- `src/domains/economy/hooks/useTerritoryEconomyTicker.ts` (`useTerritoryEconomyTicker`)
- `src/domains/economy/components/IndustrialComplexView.tsx` (`IndustrialComplexView`)
- `src/domains/economy/components/P2PMarketplaceView.tsx` (`P2PMarketplaceView`)
- `supabase/migrations/20261031000013_economy_idle_rework_territorial_plots.sql` & `supabase/migrations/20261103000001_master_metagame_v2_rework.sql`.

> [!NOTE] Evolución Arquitectónica
> Originalmente diseñado como un silo estático único con ciclo de 10 horas y merma agresiva del 2.5%/h, el sistema fue completamente modernizado en un sistema territorial modular de **10 Parcelas por feudo/comandante** con ciclo circadiano ergonómico de 16 horas seguras, cadena industrial estilo *Project Alice / Albion Online*, ticker económico continuo por minuto estilo *Wplace* y sumidero deflacionario estabilizado.

```
                   SISTEMA TERRITORIAL DE 10 PARCELAS INDUSTRIALES
                                         │
          ┌──────────────────────────────┼──────────────────────────────┐
          ▼                              ▼                              ▼
  [ CATEGORÍA A: PRIMARIA ]     [ CATEGORÍA B: REFINACIÓN ]    [ CATEGORÍA C: SOPORTE ]
  • Mina de Hierro (60/h)        • Altos Hornos Vulcan          • Silos de Reserva Logística
  • Cantera de Piedra (50/h)     • Planta de Hormigón Armado    • Terminal de Mercado P2P
  • Pozo de Tierras Raras (25/h) • Sala Limpia de Microchips    • Generador de Combustible
  • Destilería Sintética (15/h)  • Laboratorio Nanocompuestos
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

### 2.1 Cuadrícula Territorial de 10 Parcelas (`user_industrial_plots` & `PLOT_UNLOCK_TABLE`)
El complejo industrial (`src/domains/economy/core/industrialEngine.ts` y `src/domains/economy/hooks/useUserIndustry.ts`) opera sobre una cuadrícula modular de **10 parcelas** donde cada solar puede albergar una empresa especializada:
- **Parcelas 1 a 7 (Fase 1 - Niveles 1 al 10):** Desbloqueo progresivo por nivel de cuenta con costes en créditos (`PLOT_UNLOCK_TABLE`: P1-P3 gratuitas en niveles 1-2; P4 en Nv.4 por $1,000\text{G}$; P5 en Nv.6 por $4,000\text{G}$; P6 en Nv.8 por $10,000\text{G}$; P7 en Nv.10 por $20,000\text{G}$).
- **Parcelas 8 a 10 (Fase 2 - Endgame Industrial Niveles 12 al 15):** Requieren expansión corporativa (P8 en Nv.12: $80,000\text{G} + 150$ Gemas; P9 en Nv.13: $180,000\text{G} + 350$ Gemas; P10 en Nv.15: $400,000\text{G} + 800$ Gemas) y abastecen la demanda industrial pesada.
- **Empresas Disponibles (`PlotEnterpriseType`):**
  1. *Extracción Primaria (`PLOT_PRODUCTION_RATES`):* `mine_iron` ($60\text{ hierro/h} \times \text{Tier}$), `quarry_stone` ($50\text{ piedra/h} \times \text{Tier}$), `drill_rare_earth` ($25\text{ raras/h} \times \text{Tier}$), `distillery_synth_fuel` ($15\text{ fuel/h} \times \text{Tier}$).
  2. *Refinado Secundario:* `smelter_vulcan` (Vigas de Acero), `concrete_plant` (Hormigón Armado), `cleanroom_chips` (Microchips de Guía), `lab_nano_compounds` (Blindaje Compuesto Reactivo).
  3. *Infraestructura:* `logistics_silo` ($+4.0\text{h} \times \text{Tier}$ de capacidad segura y mitigación de carcoma al $50\%$), `market_terminal` (Acceso al Mercado P2P), `fuel_generator` (Energía constante).
- **Overhaul y Demolición Segura (`IndustrialComplexView.tsx`):** Reconfigurar o demoler una parcela requiere confirmación en dos pasos mediante interruptor de salvaguarda abatible (2 segundos de pulsación sostenida) y reembolsa créditos al tesoro.

### 2.2 Catálogo Completo de Recursos Industriales y Recetas Multi-Batch (`REFINING_RECIPES`)
Implementado en `src/domains/economy/core/industrialEngine.ts`:
1. **Materias Primas (`RawResourceType`):** `raw_iron`, `raw_stone`, `raw_rare_earth`, `raw_heavy_crude`, `raw_silicon`.
2. **Materiales Procesados y Recetas de Fundición (`RefinedResourceType`):**

| ID de Receta (`RefinedResourceType`) | Nombre de Producto | Insumo Requerido (`RawResourceType`) | Cantidad Entrada | Salida por Lote | Duración Base | Uso Estratégico |
|:---|:---|:---|:---:|:---:|:---:|:---|
| `refined_steel` | **Vigas de Acero Militar** | `raw_iron` | $100$ | $10$ | $240\text{ min}$ ($4\text{h}$) | Blindaje balístico templado para tanques y artillería |
| `refined_concrete` | **Hormigón Armado** | `raw_stone` | $80$ | $15$ | $120\text{ min}$ ($2\text{h}$) | Refuerzo estructural para cuarteles generales y defensas |
| `refined_microchip` | **Microprocesadores de Guía** | `raw_rare_earth` | $150$ | $5$ | $240\text{ min}$ ($4\text{h}$) | Sistemas electrónicos de radar para cazas, misiles y drones |
| `synthetic_fuel` | **Combustible Sintético y Polímeros** | `raw_heavy_crude` | $100$ | $20$ | $180\text{ min}$ ($3\text{h}$) | Combustible de alta densidad energética para convoyes y generadores |
| `optical_flir_sensor` | **Módulo Óptico Térmico FLIR** | `raw_silicon` | $80$ | $4$ | $300\text{ min}$ ($5\text{h}$) | Sensores electro-ópticos infrarrojos para drones y torretas C4ISR |
| `composite_armor_plate` | **Placa de Blindaje Compuesto** | `raw_iron` | $120$ | $8$ | $270\text{ min}$ ($4.5\text{h}$) | Blindaje multicapa reactivo para fortificaciones y vehículos pesados |
| `c4isr_bunker_kit` | **Kit Prefabricado de Búnker C4ISR** | `raw_stone` | $200$ | $2$ | $360\text{ min}$ ($6\text{h}$) | Estructura modular prefabricada con inhibidor EW para guarniciones Nv. 3-4 |

3. **Cola Multi-Batch (Hasta 3 Lotes):** `IndustrialEngine.startRefiningJob` permite encolar de $1$ a $3$ tandas sucesivas sin requerir inicio de sesión intermedio.
4. **Combustible de Campaña (`campaign_fuel`) y Especialización Corporativa:** El uso de combustible reduce en un $50\%$ el tiempo de fundición (`durationMinutesPerBatch * 0.5`). Adicionalmente, la doctrina corporativa (`vulcan` para acero, `aegis` para microchips, `titan` para hormigón) aplica un factor de tiempo de $0.65\times$ ($-35\%$ de duración).
5. **Transmutación de Chatarra Tecnológica (`transmuteTechScrapToMicrochips`):** En `ECONOMY_CONFIG_V2.scrapSystem.transmutation`, $40$ unidades de `tech_scrap` + $20$ de `raw_rare_earth` producen $1$ `refined_microchip` en $45$ minutos.

### 2.3 Protocolo Circadiano y Protección contra Carcoma (`calculateTerritoryStatus`)
- **Ventana de Recolección (16 Horas Seguras):** `CALIBRATED_BASE_HOURS = 12` horas de llenado base (ampliables en $+4\text{h} \times \text{Tier}$ mediante `logistics_silo`) más `CALIBRATED_GRACE_HOURS = 4` horas de gracia sin penalización alguna (`CALIBRATED_TOTAL_SAFE_HOURS = 16`).
- **Bono de Eficiencia Logística:** Si el jugador recolecta dentro de la ventana productiva ($\ge 0.5\text{h}$ y antes de saturar `baseSafeHours`), recibe un bono positivo de **$+10\%$ en recursos de alta pureza (`EFFICIENCY_BONUS_MULTIPLIER = 1.10`) y $+500\text{ Créditos}$ (`EFFICIENCY_BONUS_CREDITS = 500`)**.
- **Merma Suavizada (`CALIBRATED_DECAY_RATE = 0.015` / $1.5\%$ por hora tras la hora 16):**
  - La merma máxima tiene un tope de pérdida del $40\%$ (`CALIBRATED_MAX_DECAY = 0.40`), garantizando un piso de seguridad estricto del **$60\%$** del inventario acumulado.
  - **Sistema de Cargamento Varado (`StrandedCargo` / `STRANDED_CARGO_RECOVERY_RATIO = 0.70`):** El $70\%$ de los recursos perdidos por carcoma se resguarda en un convoy varado, el cual se recupera mediante `IndustrialEngine.recoverStrandedCargo` ganando partidas en el Frente.

### 2.4 Ticker Económico Territorial Estilo Wplace y Mantenimiento Imperial (`useTerritoryEconomyTicker.ts` & `upkeepEngine.ts`)
*Implementación de Referencia:* `src/domains/economy/hooks/useTerritoryEconomyTicker.ts`, `src/domains/economy/core/upkeepEngine.ts`, `src/domains/economy/core/turnEconomy.ts`, `src/domains/economy/core/propertyMaintenance.ts`.
- **Generación Continua por Minuto (Wplace Pipeline):** El hook `useTerritoryEconomyTicker` acumula cada 60 segundos Créditos Energéticos (`ecPerMinute`) y Acero (`steelPerMinute`) en función de los nodos territoriales controlados por el clan (`factory`, `refinery`, `capital_citadel`, `city`).
- **Conquista de Capitales y Buff Regional (Pilar 5 Canónico):** Controlar la Capital otorga el **Buff Regional Canónico (+5% recursos/logística en la región)**, además de los multiplicadores estratégicos de producción y energía en nodos capitalinos (`evaluateStrategicNodes` en `src/domains/economy/core/strategicAndProductionEngine.ts` y `calculateRgoRegionalYield` en `src/domains/economy/core/upkeepEngine.ts`). Si una región queda aislada de su línea de suministro hacia la capital (`hasSupplyLineToCapital = false`), su rendimiento RGO cae al $50\%$; si entra en inanición energética (`isEnergyStarved = true`), cae a $0$.
- **Penalización de Sobre-Expansión (`TerritorialUpkeepEngine` & `calculateImperialUpkeep`):** Superar la capacidad administrativa (`adminCapacity`) o el límite imperial ($K_{\text{Límite\_Imperial}} = 6$ regiones) activa la curva anti-snowballing exponencial ($\Psi_{\text{Over}}(r) \in [0.00, 0.55]$ y multiplicador $1 + 0.18 \times (\text{exceso})^{1.8}$).
- **Economía Táctica en Partida (`TurnEconomyEngine` & `processPropertyMaintenance`):** En el teatro táctico (`src/domains/economy/core/turnEconomy.ts` y `src/domains/economy/core/propertyMaintenance.ts`), cada propiedad aliada genera $+1,000\text{G}$ por turno, reabastece munición y combustible gratis, y repara hasta $+20\text{ HP}$ por turno ($+30\text{ HP}$ con la Comandante Rachel) en la **escala continua de 1 a 100 HP enteros (Pilar 2)**. El Soft Cap logístico (`calculateSupplyUpkeep`) permite mantener hasta $14$ unidades libres de sobrecoste y deduce $-\$200\text{G}$ por cada unidad excedente a partir de la 15ª.

---

# 3. EL MERCADO P2P GLOBAL, IMPUESTO CANÓNICO DEL 2% Y BANDAS VWAP COLLAR ±25%
*Implementación de Referencia:* `src/domains/economy/components/P2PMarketplaceView.tsx`, `src/domains/economy/core/industrialEngine.ts`, `src/shared/types/metagame.ts` (`MASTER_METAGAME_CONSTANTS`, `calculateP2PTransactionSplit`), `supabase/migrations/20261103000001_master_metagame_v2_rework.sql`.

Los comandantes comercian materias primas, derivados industriales, patentes tecnológicas y consumibles en un mercado P2P descentralizado (`public.p2p_market_orders` / `public.p2p_market_listings`):
- **Moneda de Intercambio:** Créditos Energéticos (EC) y fondos de intendencia.
- **Impuesto P2P Canónico del 2% (`TOTAL_P2P_TAX_RATE = 0.02` / `P2P_MARKET_FEE_RATE = 0.02`):** Sobre el monto bruto de cada transacción se aplica una deducción exacta del **2.0%** (`calculateP2PTransactionSplit`):
  - **1.0% (`PLATFORM_BURN_RATE = 0.01`)** se quema de forma permanente como sumidero deflacionario (*Sink*).
  - **1.0% (`PROVINCE_ROYALTY_RATE = 0.01`)** se liquida como regalía soberana a la tesorería del Clan dueño del Hub regional donde radica el nodo de mercado.
  - **98.0%** ingresa netamente al tesoro del comandante vendedor (`netSellerRevenueEc`).
- **Bandas de Precio Dinámicas (VWAP Collar $\pm 25\%$ — `VWAP_COLLAR_PERCENT = 0.25` / `P2P_COLLAR_MAX_DEVIATION = 0.25`):** El precio unitario de cualquier orden queda acotado dentro de un intervalo estricto de $\pm 25\%$ respecto al Precio Medio Ponderado por Volumen (VWAP) de las últimas 24 horas (ej. Acero Militar PMM $50\text{G} \to [37\text{G}, 63\text{G}]$; Hormigón Armado PMM $30\text{G} \to [22\text{G}, 38\text{G}]$; Microchips PMM $120\text{G} \to [90\text{G}, 150\text{G}]$), bloqueando manipulaciones especulativas o traspaso ilícito de activos entre cuentas secundarias.
- **Prohibición Terminante de Tropas Terminadas (`chk_p2p_no_military_units`):** Queda prohibida la venta de unidades militares terminadas en el mercado P2P. Toda unidad debe forjarse físicamente en los hangares y fábricas territoriales (0% Pay-to-Win).
- **Fricción Comercial Player-Driven y Órdenes Varadas (`fulfillStaleP2POrders` & `processStrandedMarketListings`):** Conforme a la doctrina económica *Player-Driven* (inspirada en *Albion Online* y *Project Alice*), cualquier orden de venta que permanezca sin comprador durante más de **6 horas** (`maxAgeMs = 6 * 3600 * 1000`) pasa a estado `'stranded'` (*Cargamento Varado*). Si permanece estancada sin ser retirada al silo (`withdrawListingToSilo`), sufre deterioro logístico del $1.5\%/\text{h}$ (hasta el tope del $40\%$), transfiriéndose el $70\%$ de la merma al registro de `StrandedCargo` recuperable en combate.
- **Requisitos de Acceso:** Nivel de Cuenta 8 mínimo y al menos 15 partidas disputadas.

---

# 4. SISTEMA DE ALMACÉN FÍSICO / HANGAR (16 TROPAS), TIERS T1-T5 (+2%) Y RECICLAJE AL 35%
*Implementación de Referencia:*
- `src/domains/economy/core/strategicAndProductionEngine.ts` (`calculateUnitProductionDuration`, `calculateUnitProductionCost`, `createProductionQueueItem`, `authorizeFactionUnitBorrow`)
- `src/domains/economy/hooks/useUserHangar.ts` (`useUserHangar`)
- `src/domains/economy/components/UnitHangarModal.tsx` (`UnitHangarModal`)
- `src/domains/tactics/core/tacticalCombatSeamlessIntegration.ts` (`validateDoubleKeyDeployment`, `settleCombatLossesAndScrap`)
- `src/shared/types/metagame.ts` (`MASTER_METAGAME_CONSTANTS`, `calculateLossScrapRecovery`)
- `supabase/migrations/20261105000001_geotactics_strategic_nodes_and_queues.sql`.

### 4.1 Pilar 1 Canónico: CERO CARTAS y Almacén Físico de 16 Tropas
En *GEOTACTICS ONLINE* **no existen mazos de cartas, coleccionables TCG/CCG ni mecánicas gacha**. Todo el ejército opera mediante existencias físicas reales en el **Almacén Físico / Hangar Militar (`public.user_unit_hangar`)**, con una capacidad estructural de **16 tropas máximo por jugador**:
- **4 Slots de Despliegue Activo (Vanguardia):** Divisiones seleccionadas para inserción inmediata al inicio del combate táctico.
- **12 Slots en Reserva Operacional (Retaguardia):** Unidades almacenadas listas para ser solicitadas como oleada de refuerzos en combate (llegada en turno $T+4$, o $T+3$ con buff de fábrica aliada activa) o desplegadas desde instalaciones mediante el **Validador de Doble Llave (`validateDoubleKeyDeployment`)** que exige simultáneamente fondos tácticos en partida (`$G`) y un chasis físico real en el hangar.

### 4.2 Pilar 4 Canónico: Progresión Horizontal Estricta de Tiers T1 a T5 (+2% por Tier, Máximo +8% en T5)
La progresión de los chasis manufacturados sigue una escala horizontal estricta de **$+2.0\%$ por cada escalón de Tier sobre Tier 1**, alcanzando un **techo máximo inapelable de $+8.0\%$ en Tier 5**:

$$\text{BonoEfectividad}(T) = (T - 1) \times 2.0\% \quad \text{para } T \in \{1, 2, 3, 4, 5\}$$

| Tier de Tropa | Bono Balístico | Bono Mitigación | Coste Escalar (`calculateUnitProductionCost`) | Requisitos de Materiales y Pureza | Ámbito de Despliegue |
|:---:|:---:|:---:|:---:|:---|:---|
| **Tier 1 (Estándar)** | **$+0\%$** | **$+0\%$** | $1.00\times$ Base ($4$ Acero, $0$ Chips) | Chasis básico fundacional (Hierro + Carbono) | Inicial / Duelos Espejo Simétricos |
| **Tier 2 (Reforzado)** | **$+2\%$** | **$+2\%$** | $1.25\times$ Base ($8$ Acero, $0$ Chips) | Aleaciones de Acero Templado + Polímeros | Teatros Provinciales Iniciales |
| **Tier 3 (Avanzado)** | **$+4\%$** | **$+4\%$** | $1.56\times$ Base ($12$ Acero, $2$ Chips) | Acero Blindado + Microprocesadores de Guía | Teatros Fronterizos Medios |
| **Tier 4 (Pesado)** | **$+6\%$** | **$+6\%$** | $1.95\times$ Base ($16$ Acero, $4$ Chips) | Blindaje Compuesto + Sensores Ópticos FLIR | Campañas de Alta Tensión |
| **Tier 5 (Élite Exp.)**| **$+8\%$ (Máx)** | **$+8\%$ (Máx)** | $2.44\times$ Base ($20$ Acero, $6$ Chips) | Aleación Experimental + Tierras Raras Purificadas | Asedios a Capitales Nacionales |

### 4.3 Pilar 6 Canónico: Pérdida Física Real y Reciclaje de Chatarra al 35% (`tech_scrap`)
- **Patentes Tecnológicas Permanentes (`public.user_patents`):** El comandante desbloquea la homologación para forjar chasis de Tiers superiores registrando patentes permanentes en el hangar (`unlockPatent` en `src/domains/economy/hooks/useUserHangar.ts`).
- **Siniestralidad Real y Recuperación del 35% (`RECYCLE_SCRAP_RATE = 0.35` / `BASE_SALVAGE_RATE = 0.35` / `SALVAGE_TECH_SCRAP_RATE = 0.35`):** Toda unidad no-F2P destruida en el tablero de batalla (donde llegar a **0 tropas supervivientes representa la derrota inapelable**, Pilar 3) se descuenta físicamente del hangar (`permanentSinkUnitsCount`). Tanto en bajas de combate (`settleCombatLossesAndScrap` en `src/domains/tactics/core/tacticalCombatSeamlessIntegration.ts` y `calculateLossScrapRecovery` en `src/shared/types/metagame.ts`) como en el desguace voluntario en el arsenal (`scrapUnit` en `src/domains/economy/hooks/useUserHangar.ts`), el taller recupera exactamente el **35% del valor base** en forma de chatarra tecnológica (`tech_scrap` = $\lfloor 50 \times \text{Tier} \times 0.35 \rfloor$) y materiales recuperables.

### 4.4 Cola de Producción Física y Tiempos de Ensamblaje ($t_{\text{forja}}$)
Implementado en `src/domains/economy/core/strategicAndProductionEngine.ts` (`BASE_PRODUCTION_DURATIONS` y `calculateUnitProductionDuration`) y en la tabla `public.unit_production_queue` (Migración 27):

$$t_{\text{forja}} = \max\left(5, \text{round}\left(\frac{t_{\text{base}} \times (1 + 0.35 \times (\text{Tier} - 1))}{(1 + \text{BonoTaller}) \times \text{MultCapital}}\right)\right)$$

donde $\text{MultCapital} = 1.10$ si el clan posee hegemonía sobre la Capital Nacional (`hasCapitalHegemony = true`).

| Código (`unitCode`) | Arquetipo de Unidad | Duración Base T1 ($t_{\text{base}}$) | Tiempo de Forja T1–T5 ($t_{\text{forja}}$) | Coste Industrial (`calculateUnitProductionCost`) |
| :--- | :--- | :---: | :---: | :--- |
| `infantry` | **Infantería Ligera (Kit F2P)** | **0 s (Instantáneo en T1)** | $0\text{s}$ (T1) / $162\text{s} - 288\text{s}$ (T2-T5) | T1: $\$1,000\text{G}$, $0\text{ EC}$, $0$ Acero (Inagotable) |
| `recon` | **Vehículo Recon (Kit F2P)** | **0 s (Instantáneo en T1)** | $0\text{s}$ (T1) / $162\text{s} - 288\text{s}$ (T2-T5) | T1: $\$4,000\text{G}$, $0\text{ EC}$, $0$ Acero (Inagotable) |
| `mech` | **Infantería Mecanizada** | **60 segundos (1 min)** | $60\text{s}$ (T1) a $144\text{s}$ (T5) | $\$2,500\text{G} \times 1.25^{T-1} + 150\text{ EC} \times 1.25^{T-1} + 4T\text{ Acero}$ |
| `tank` | **Tanque Ligero** | **180 segundos (3 min)** | $180\text{s}$ (T1) a $432\text{s}$ (T5) | Escala exponencial $1.25^{T-1}$ + Chips en $T \ge 3$ |
| `anti_air` | **Vehículo Antiaéreo Vulcan** | **300 segundos (5 min)** | $300\text{s}$ (T1) a $720\text{s}$ (T5) | Escala exponencial $1.25^{T-1}$ + Chips en $T \ge 3$ |
| `artillery` | **Artillería de Obús** | **360 segundos (6 min)** | $360\text{s}$ (T1) a $864\text{s}$ (T5) | Escala exponencial $1.25^{T-1}$ + Chips en $T \ge 3$ |
| `medium_tank` | **Tanque Mediano de Asalto** | **480 segundos (8 min)** | $480\text{s}$ (T1) a $1,152\text{s}$ (T5) | Escala exponencial $1.25^{T-1}$ + Chips en $T \ge 3$ |
| `b_copter` | **Helicóptero de Batalla** | **600 segundos (10 min)** | $600\text{s}$ (T1) a $1,440\text{s}$ (T5) | Escala exponencial $1.25^{T-1}$ + Chips en $T \ge 3$ |
| `fighter` | **Caza Interceptor** | **900 segundos (15 min)** | $900\text{s}$ (T1) a $2,160\text{s}$ (T5) | Escala exponencial $1.25^{T-1}$ + Chips en $T \ge 3$ |
| `bomber` | **Bombardero Pesado** | **1,200 segundos (20 min)** | $1,200\text{s}$ (T1) a $2,880\text{s}$ (T5) | Escala exponencial $1.25^{T-1}$ + Chips en $T \ge 3$ |
| `battleship` | **Acorazado Naval** | **1,800 segundos (30 min)** | $1,800\text{s}$ (T1) a $4,320\text{s}$ (T5) | Escala exponencial $1.25^{T-1}$ + Chips en $T \ge 3$ |

- **Kit Básico F2P Inviolable:** Para evitar que un comandante quede bloqueado por pérdida total de flota, el Estado Mayor provee Infantería Ligera T1 y Reconocimiento T1 sin consumo de materiales ni tiempo de espera ($0\text{s}$).
- **Concurrencia y Entrega Atómica:** Una vez completado `ready_at`, la unidad terminada se transfiere al hangar personal (`public.user_unit_hangar`) o al hangar compartido de facción (`public.faction_unit_hangar`) mediante la RPC atómica `claim_finished_unit`.

### 4.5 Arsenal Compartido de Facción (`public.faction_unit_hangar` & `authorizeFactionUnitBorrow`)
Los clanes y corporaciones militares operan un arsenal logístico centralizado en `src/domains/economy/core/strategicAndProductionEngine.ts`:
- **Aportaciones de Miembros:** Cualquier miembro puede encolar unidades asignando `destination = 'faction'` para donar tropas terminadas al hangar comunitario del clan.
- **Autorización por Jerarquía (`authorizeFactionUnitBorrow`):**
  - Rango `'recruit'`: Acceso denegado al Hangar Comunitario.
  - Rango `'corporal'`: Autorizado para solicitar unidades de facción hasta **Tier 2**.
  - Rangos `'sergeant'` y `'veteran'`: Autorización plena para desplegar unidades de facción de **Tier 1 a Tier 5**.
- **Pérdida en Combate de Tropas de Facción:** Si una unidad prestada de la facción es destruida en el frente territorial, se descuenta de forma irreversible del stock de la facción, y el **35% de chatarra recuperada (`tech_scrap`)** se deposita en la Bóveda del Clan para reconstrucción.

---

# 5. PROTOCOLO DE SALVAGUARDA TÁCTICA (SEGURO DE RACHA CALIBRADO)
*Implementación de Referencia:* `src/domains/economy/core/industrialEngine.ts` (`ECONOMY_CONFIG_V2.safeguardCrafting`).

Artefacto consumible estratégico que protege la racha de victorias ante una derrota:

```
[ PROTOCOLO DE SALVAGUARDA TÁCTICA (ECONOMY_CONFIG_V2.safeguardCrafting) ]
├── Fabricación F2P: Taller Nivel 4 | 18 Horas (64,800s) | 30 Acero + 10 Hormigón + 3 Combustible + 2,500 Créditos. (0 Microchips - Max 2 en almacén F2P)
├── Suscripción Command Pass: 1 Salvaguarda pre-ensamblada diaria sin coste. (Max 3 en almacén Pass)
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
*Implementación de Referencia:* `src/domains/economy/components/ShopCatalog.tsx`, `src/domains/economy/components/LoadoutCustomizer.tsx`.

### 6.1 Catálogo de Tienda y Command Pass
- **Gemas de Mando (`command_gems`):** Paquetes desde \$1.99 (100 gemas) hasta \$49.99 (3,500 gemas) gestionados con Stripe Checkout y verificación webhook HMAC.
- **Command Pass de Temporada (\$5.99 / mes):**
  - Reclamación Retroactiva: Si el jugador sube niveles en el pase gratuito y compra el pase al final del mes, desbloquea instantáneamente todas las recompensas acumuladas.
  - 1 Protocolo de Salvaguarda diario entregado a las 00:00 UTC (capacidad de almacén ampliada a 3).
  - Cola de refinado multi-batch optimizada y cosméticos de cómic exclusivos (bocadillos Neón y sellos Pop-Art para el Bark Engine en `@domains/game-feel`).

### 6.2 Ofertas Flash de Emergencia por Tilt (\$0.99)
- **Activación:** Se dispara tras 2 derrotas consecutivas con turnos precipitados ($PTE < 10\text{s}$).
- **Presentación:** La pantalla muestra la viñeta del Comandante vendado y en shock ofreciendo un paquete flash del Alto Mando: 1 Chasis Reforzado T2 (+2% efectividad) de la tropa destruida para el Hangar Físico + 30 Vigas de Acero procesado por **\$0.99 (85% OFF)**.
- **Urgencia Temporal:** Cronómetro gigante de **180 segundos**. Si no se adquiere en ese tiempo, la oferta se autodestruye.
- **Tope de Frecuencia:** Máximo **1 oferta cada 48 horas por cuenta**.

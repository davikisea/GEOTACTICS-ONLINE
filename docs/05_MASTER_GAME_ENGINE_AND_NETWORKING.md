# VOLUMEN 5: ARQUITECTURA TÉCNICA DEL MOTOR, RED Y FRONTEND CANVAS
**Documento Canónico Unificado:** `05_MASTER_GAME_ENGINE_AND_NETWORKING.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 5.0.0-DEFINITIVE-MASTER-SPEC  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Archivos Consolidados y Reemplazados:**  
- `03_GAME_ENGINE_ARCHITECTURE.md` (Completo)  
- `04_NETWORKING_AND_BOTS.md` (Completo)  
- `09_FRONTEND_ENGINE_AND_AI_ARCHITECTURE.md` (Completo)  
- Secciones de motor y renderizado de `15_HYPER_ENGAGEMENT_AIRDROP_SYSTEM.md` y `16_HYPER_ENGAGEMENT_MIRROR_TACTICAL_DUEL.md`  
- Motores de integración de GEOTACTICS (`territorialExpansionEngine`, `strategicAndProductionEngine`, `tacticalCombatSeamlessIntegration`).  

---

# 1. FILOSOFÍA DEL MOTOR Y DESACOPLAMIENTO DE FRAMEWORK

El núcleo del motor de juego (*Game Engine Core*) está escrito en **TypeScript estricto y puro**, completamente desacoplado de React y del DOM. El motor opera como una máquina de estados determinista basada en eventos:

```
                            ARQUITECTURA DEL MOTOR TÁCTICO
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         ▼                                ▼                                ▼
[ SUBSISTEMAS DEL MOTOR ]        [ PIPELINE DE SINCRONIZACIÓN ]    [ RENDERIZADOR GRÁFICO ]
 • TurnManager                    • Supabase Realtime Channels      • Canvas 2D / WebGL 60 FPS
 • CombatCalculator (Determ.)     • Reconnect Protocol              • Sprite Animation Sheet
 • MovementPathfinder (A*)        • Lag Compensation NTP            • Web Audio API Procedural
 • FogOfWarService                • Bot AI Decision Engine          • UI React 19 Overlay
```

---

# 2. SUBSISTEMAS DEL MOTOR TÁCTICO (TYPESCRIPT CORE — `src/domains/tactics/`)

### 2.1 Gestor de Turnos, Reloj Fischer y Tiempos (`autonomousOrchestrator.ts`)
**[ESTADO: 100% IMPLEMENTADO Y OPERATIVO EN MOTOR Y CANVAS]**  
*Implementación de Referencia:* `src/domains/tactics/core/autonomousOrchestrator.ts` (`@domains/tactics`), `src/domains/economy/core/turnEconomy.ts` (`@domains/economy`).

Controla la máquina de estados de las fases de turno, los formatos de partida (`MATCH_FORMAT_CONFIGS`) y los temporizadores con **Reloj Fischer Táctico** en tiempo real:
1. **`START_TURN`:**
   - Calcula ingresos netos por propiedades capturadas (`TurnEconomyEngine.calculateIncome`: $+\$1,000\text{G}$ base por propiedad operativa: `city`, `factory`, `airport`, `port`, `hq`, `commtower`, `lab`, escalado por `economyMultiplier`: **$1.5\times$** en Duelo Espejo `mirror_duel`, **$2.0\times$** en Escaramuza Rápida `blitz_skirmish`, **$1.0\times$** en Gran Campaña `grand_campaign`).
   - Aplica la penalización logística de **Soft Cap** (`TurnEconomyEngine.calculateSupplyUpkeep`: hasta 14 unidades coste $\$0\text{G}$; a partir de la unidad 15, $-\$200\text{G}$ por cada unidad viva excedente).
   - Aplica deducción de combustible por turno (`processTurnFuelConsumption` en `src/domains/tactics/core/fuelLogistics.ts`): si una unidad aérea llega a 0 se estrella (`Crash`), y si un submarino sumergido llega a 0 se hunde (`Sink`).
   - Ejecuta reparación y reabastecimiento en propiedades aliadas (`TurnEconomyEngine.processRepairsAndResupply`) y verifica la llegada de refuerzos tácticos en el turno $T + 4$ (`TacticalReinforcementEngine.checkReinforcementArrival`).
2. **`ACTION_PHASE` y Reloj Fischer Táctico:**
   - Configuración canónica de tiempos por formato en `MATCH_FORMAT_CONFIGS`:
     * **`mirror_duel` (Duelo Táctico Espejo):** Turno base de **$15\text{s}$**, incremento Fischer `actionBonusSec = +2.0s` por acción confirmada, tope `maxTurnCapSec = 25s`, límite de $12\text{ turnos}$, bono inicial $+\$3,000\text{G}$, banco de desconexión `disconnectGraceBankSec = 30s`.
     * **`blitz_skirmish` (Escaramuza Rápida Blitz):** Turno base de **$30\text{s}$**, incremento Fischer `actionBonusSec = +3.0s`, tope `maxTurnCapSec = 45s`, límite de $15\text{ turnos}$, bono inicial $+\$2,000\text{G}$, banco de desconexión `disconnectGraceBankSec = 60s`.
     * **`grand_campaign` (Gran Campaña):** Turno base de **$60\text{s}$**, incremento Fischer `actionBonusSec = +4.0s`, tope `maxTurnCapSec = 90s`, límite de $40\text{ turnos}$, bono inicial $\$0\text{G}$, banco de desconexión `disconnectGraceBankSec = 120s`.
   - Árbitro Anti-AFK que cede el turno automáticamente al agotarse el reloj, y detector telemétrico de `tiltIndex` (0 a 100) cuando el promedio de los últimos 3 turnos cae por debajo de $12\text{s}$ tras perder $\ge 2$ unidades.
   - Procesa comandos de movimiento, ataque, captura y producción en fábricas bajo la **Ley de la Doble Llave** (Fondos $\$G$ in-match + chasis físico en Hangar de máximo 16 unidades: 4 en vanguardia activa + 12 en reserva, CERO CARTAS).
3. **`END_TURN`:**
   - Restablece banderas de acción (`hasMoved = false`, `hasActed = false`) de las unidades del jugador entrante.
   - Evalúa condiciones de fin de partida (`TurnEconomyEngine.checkGameOver` y límite de turnos `resolveTurnLimitVictory`) y transfiere el turno al oponente o dispara el flujo asíncrono del Bot (`runBotTurnWorkflow`).

### 2.2 Calculadora Determinista de Combate en Escala Continua 1-100 HP (`canonicalCombat.ts` & `combat.ts`)
*Implementación de Referencia:* `src/domains/tactics/core/canonicalCombat.ts`, `src/domains/tactics/core/canonicalDamageChart.ts`, `src/domains/tactics/core/combat.ts` (`@domains/tactics`).

El motor balístico opera sobre la **escala continua e indivisible de 1 a 100 HP enteros** (`scale100Hp = true`, `CANONICAL_MAX_HP = 100`), integrando progresión horizontal de Tiers industriales (**T1 a T5**: $+2\%$ de efectividad ofensiva por nivel sobre T1, hasta un techo estricto de **$+8\%$ en T5**), torres de comunicaciones ($+10\%$ por torre), clima (`weatherSystem.ts`), auras de estructuras (`buildingAuras.ts`) y cobertura de terreno proporcional al HP:

```typescript
// Implementación canónica en CanonicalCombatEngine.calculateEngagement (src/domains/tactics/core/canonicalCombat.ts):
const attackerTier = attacker.tier || attackerTierLevel || 1;
const tierBonus = Math.max(0, (attackerTier - 1) * 2.0); // T1: 0%, T2: +2%, T3: +4%, T4: +6%, T5: +8%
const auraAttackBonus = options.buildingAuraModifiers?.attackerEffectiveAttackBonus || 0;

let weatherAttackMultiplier = 1.0;
if (weather && distance >= 2) {
  weatherAttackMultiplier = getWeatherModifiers(weather, coId).indirectDamageModifier;
}

const attackModifier = (coAttackModifier + commtowersCount * 10 + tierBonus + auraAttackBonus) * weatherAttackMultiplier;
const auraDefenseBonus = options.buildingAuraModifiers?.defenderEffectiveDefenseBonus || 0;
const defenseModifier = coDefenseModifier + auraDefenseBonus;

// Suerte táctica acotada (0 en modo determinista competitivo; 0 a 9% cuando deterministic = false)
let luckModifier = 0;
if (!deterministic) {
  const maxGoodLuck = 10;
  luckModifier = Math.floor(luckRoll.goodLuck * maxGoodLuck) - Math.floor(luckRoll.badLuck * 0);
}

// Normalización para escala continua 1-100 HP (100 HP = 10.0 en factor clásico AW)
const is100Scale = scale100Hp || attacker.hp > 10 || defender.hp > 10 || attacker.maxHp === 100 || defender.maxHp === 100;
const attackerHPVal = is100Scale ? attacker.hp / 10 : attacker.hp;
const defenderHPVal = is100Scale ? defender.hp / 10 : defender.hp;

// Factor ofensivo y escalado por HP del atacante
const attackFactor = Math.max(0, Math.floor(baseDamage * (attackModifier / 100) + luckModifier));
const attackHPFactor = Math.floor(attackFactor * (attackerHPVal / 10));

// Factor defensivo de terreno escalado por el HP actual del defensor (con penetración de blindaje opcional)
let defenderTerrainStars = defenderTile.defenseStars + (options.buildingAuraModifiers?.defenderExtraStars || 0);
if (options.buildingAuraModifiers?.attackerArmorPenetration) {
  const pen = options.buildingAuraModifiers.attackerArmorPenetration / 100;
  defenderTerrainStars = Math.max(0, defenderTerrainStars * (1 - pen));
}
const defenseFactor = Math.floor(200 - (defenseModifier + defenderTerrainStars * defenderHPVal)) / 100;

// Daño directo en escala continua 1-100 HP enteros
const damagePercent = Math.max(1, Math.floor(attackHPFactor * defenseFactor));
const attackerDamageDealt = is100Scale
  ? Math.min(defender.hp, Math.max(1, damagePercent))
  : Math.min(defender.hp, Math.max(1, Math.floor(damagePercent / 10)));
const defenderHpAfter = Math.max(0, defender.hp - attackerDamageDealt);
const defenderEliminated = defenderHpAfter === 0;

// Contraataque inmediato evaluado sobre el HP remanente (defenderHpAfter) si el defensor sobrevive y está en rango
if (!defenderEliminated && inDefenderRange) {
  const counterWeapon = getCanonicalBaseDamage(defender.unitCode, attacker.unitCode, defenderHasAmmo);
  if (counterWeapon.baseDamage > 0 && counterWeapon.weaponUsed !== 'none') {
    const defenderTier = defender.tier || defenderTierLevel || 1;
    const defenderTierBonus = Math.max(0, (defenderTier - 1) * 2.0);
    const counterAttackFactor = Math.max(0, Math.floor(counterWeapon.baseDamage * ((defenseModifier + defenderTierBonus) / 100)));
    const defenderHpAfterVal = is100Scale ? defenderHpAfter / 10 : defenderHpAfter;
    const counterAttackHPFactor = Math.floor(counterAttackFactor * (defenderHpAfterVal / 10));
    const attackerDefenseFactor = Math.floor(200 - (attackModifier + attackerTile.defenseStars * attackerHPVal)) / 100;
    const counterDamagePercent = Math.max(1, Math.floor(counterAttackHPFactor * attackerDefenseFactor));
    counterDamageDealt = is100Scale
      ? Math.min(attacker.hp, Math.max(1, counterDamagePercent))
      : Math.min(attacker.hp, Math.max(1, Math.floor(counterDamagePercent / 10)));
  }
}
```

### 2.3 Algoritmo A*, Dijkstra Dinámico, Niebla de Guerra Empaquetada y Regla `¡TRAP!` (`pathfinding.ts`, `canonicalMovement.ts`, `fogOfWar.ts` & `subActions.ts`)
*Implementación de Referencia:* `src/domains/tactics/core/pathfinding.ts`, `src/domains/tactics/core/canonicalMovement.ts`, `src/domains/tactics/core/fogOfWar.ts`, `src/domains/tactics/core/subActions.ts`, `src/domains/world/core/tacticalBitmap.ts`, `src/App.tsx`.

- **A* y Dijkstra con Matriz de Locomoción y Clima Canónico (`canonicalMovement.ts` & `pathfinding.ts`):** `TacticalPathfindingEngine` calcula casillas alcanzables (`getReachableTiles`) y rutas óptimas (`findOptimalPath` con heurística Manhattan $h = |x_1 - x_2| + |y_1 - y_2|$) evaluando `CANONICAL_TERRAIN_PROPERTIES` y `getCanonicalMovementCost(movementType, terrainType, weather)` para las 6 tracciones (`foot`, `mech`, `wheels`, `treads`, `air`, `sea`) sobre los 18 tipos de terreno. En clima `rain`, las llanuras y bosques incrementan $+1$ el coste para `wheels` y `treads`; en `snow`, el coste aéreo y de montaña se duplica ($\times 2$) y llanuras/mares suman $+1$.
- **Motor de Niebla de Guerra (`FogOfWarEngine` en `src/domains/tactics/core/fogOfWar.ts`) y Empaquetado Binario (`TacticalBitMap` en `src/domains/world/core/tacticalBitmap.ts`):**
  1. *Visión Base y Elevación:* Cada unidad proyecta un campo de visión Manhattan según `CANONICAL_UNIT_BASE_VISION` (`recon: 5`, `tank_light: 3`, `b_copter: 3`, `infantry/mech: 2`, `tank_medium/artillery/rocket: 1`). Las tropas a pie (`infantry` y `mech`) sobre montañas ganan **$+3\text{ casillas}$ de visión**; la lluvia (`rain`) penaliza con **$-1\text{ casilla}$** (mínimo 1). Las propiedades aliadas otorgan visión pasiva de radio Manhattan $1$.
  2. *Ocultación en Bosques y Arrecifes:* Las casillas de `forest` y `reef` a distancia $> 1$ no revelan a las unidades enemigas en su interior (salvo bajo poder de visión penetrante de Sonja `sonjaPowerActive = true`); solo se descubren al situar una unidad aliada directamente adyacente ($\text{dist} \le 1$).
  3. *Empaquetado Binario Ultraligero (`TacticalBitMap`):* Para transmisión WebSocket y persistencia sin sobrecarga, la matriz de visibilidad de una cuadrícula táctica de $20 \times 20$ ($400\text{ celdas}$) se comprime en un `Uint8Array` de exactamente **$50\text{ bytes}$** ($400\text{ bits} / 8$) serializado en Base64 (`toBase64()` / `fromBase64()`).
- **Regla `¡TRAP!` (Emboscada Dinámica en Niebla — `FogOfWarEngine.checkTrapOnPath`):** Durante la marcha planificada, si una baldosa contiene una unidad enemiga que no figuraba en `revealedEnemyUnitIds` antes de iniciar el movimiento, el avance se trunca en la última casilla segura anterior a la colisión (`interruptedAt`), la unidad pierde su acción del turno (`hasMoved = true`, `hasActed = true`) y se detona la alerta audiovisual y háptica `¡TRAP!`.
- **Despacho Atómico de Movimiento y Ataque (`handleAtomicMoveAndAttack`):**
  Para evitar condiciones de carrera en el ciclo de renderizado de React 19 y desincronizaciones de red, la transición de desplazamiento hacia una celda y el posterior cálculo balístico de fuego directo se resuelven en una única mutación síncrona atómica.
- **Menú de Sub-Acciones (`src/domains/tactics/core/subActions.ts`):** `evaluateAvailableSubActions` evalúa contextualmente por prioridad: `attack` (prioridad 1), `launch_silo` (prioridad 2, misil balístico en área Manhattan $\le 2$ / $3\times 3$), `capture` (prioridad 3), `supply` (prioridad 4, recarga adyacente por APC), `unload` (prioridad 5), `explode` (prioridad 6, Black Bomb kamikaze de 5 HP en radio Manhattan $\le 3$ vía `executeBlackBombExplosion`), `hide`/`show` (prioridad 7, inmersión submarina/stealth), `join` (prioridad 10, fusión de unidades aliadas heridas), `load` (prioridad 11, embarque en transportes), `delete` (prioridad 20, licenciar unidad no movida recuperando el 50% de fondos) y `wait` (prioridad 99).

### 2.4 Sistemas de Logística, Captura y Condiciones Canónicas de Victoria/Derrota
*Implementación de Referencia:* `src/domains/tactics/core/fuelLogistics.ts`, `src/domains/economy/core/turnEconomy.ts`, `src/domains/tactics/core/captureSystem.ts`, `src/domains/tactics/core/hqCaptureVictory.ts`.

- **Logística de Combustible (`src/domains/tactics/core/fuelLogistics.ts`):** `processTurnFuelConsumption` drena combustible al inicio del turno según el chasis (`air`: 5/turno, helicópteros: 2/turno, stealth oculto: 8/turno, pasiva de Eagle: $-2$ fuel; `sea`: 1/turno, submarino sumergido: 5/turno; duplicado en clima `snow` salvo Olaf). Fatalidades directas al llegar a `fuel === 0`: aeronaves se estrellan (`crashed = true`, `hp = 0`) y submarinos sumergidos se hunden (`sunken = true`, `hp = 0`).
- **Mantenimiento y Reparación en Escala 1-100 HP (`TurnEconomyEngine.processRepairsAndResupply` en `src/domains/economy/core/turnEconomy.ts`):** Las unidades estacionadas al inicio de su turno sobre propiedades aliadas compatibles (`factory`/`city`/`hq` para tierra, `airport` para aire, `port` para mar) recargan gratis munición y combustible al máximo y reparan hasta **$+20\text{ HP}$ por turno** en la escala canónica de 100 HP (equivalente a $+2\text{ HP}$ en escala 10), descontando del tesoro el **$1\%$ del coste de producción por cada punto de HP restaurado** (`Math.floor(unit.productionCost / 100)`).
- **Captura de Propiedades (`CaptureEngine` en `src/domains/tactics/core/captureSystem.ts` y `CombatEngine.processPropertyCapture`):** Toda sede neutral o enemiga tiene **20 puntos de captura** (`captureHp = 20`). Solo `infantry` y `mech` pueden capturar, restando en cada turno $\lceil \text{HP} / 10 \rceil$ puntos (10 puntos por turno a 100 HP).
- **Doble Condición de Victoria/Derrota Inapelable (`TurnEconomyEngine.checkGameOver` y `executeHqCaptureElimination` en `src/domains/tactics/core/hqCaptureVictory.ts`):**
  1. **Pilar 3 Canónico — Derrota Inapelable por Aniquilación Total (`0 tropas supervivientes`):** Si en cualquier instante un comandante queda con **0 unidades vivas en el tablero** (`p1Units.length === 0` o `p2Units.length === 0`), sufre la derrota inmediata e inapelable (`reason: 'all_units_destroyed'` / `'army_wiped'`), sin importar cuántas fábricas o fondos conserve.
  2. **Captura de Cuartel General (`hq_captured`):** Cuando `captureHp` de un `hq` llega a 0, `executeHqCaptureElimination` ejecuta la rendición inmediata del defensor, transfiere todas sus propiedades al conquistador (restaurando `captureHp = 20`) y disuelve todas sus unidades restantes en el tablero.
  3. **Desempate por Límite de Turnos (`turn_limit`):** Si se supera `maxTurnsLimit`, `AutonomousTurnOrchestrator.resolveTurnLimitVictory` adjudica la victoria al comandante con mayor suma de valor militar en campo más valor de propiedades controladas.

### 2.5 Enrutamiento Estético de Flechas Tácticas (`pathingArrow.ts`)
*Implementación de Referencia:* `src/domains/tactics/core/pathingArrow.ts`, `src/domains/tactics/components/GameCanvas.tsx`.

El motor descompone la trayectoria continua generada por el pathfinder en un conjunto discreto de 15 primitivas de segmento canónicas idénticas a la especificación de Advance Wars / WarsWorld:

```
[ CATÁLOGO DE 15 PRIMITIVAS DE SEGMENTO DE FLECHA ]
├── LÍNEAS RECTAS:
│   ├── 'ew' ('horizontal'): Segmento horizontal este-oeste.
│   └── 'ns' ('vertical'): Segmento vertical norte-sur.
├── ESQUINAS DE GIRO:
│   ├── 'ne' ('corner_ne'): Giro noreste (de abajo hacia la derecha).
│   ├── 'nw' ('corner_nw'): Giro noroeste (de abajo hacia la izquierda).
│   ├── 'se' ('corner_se'): Giro sureste (de arriba hacia la derecha).
│   └── 'sw' ('corner_sw'): Giro suroeste (de arriba hacia la izquierda).
├── CABEZAS DE FLECHA (TERMINAL):
│   ├── 'nd' ('arrow_up'): Flecha apuntando al norte.
│   ├── 'sd' ('arrow_down'): Flecha apuntando al sur.
│   ├── 'wd' ('arrow_left'): Flecha apuntando al oeste.
│   └── 'ed' ('arrow_right'): Flecha apuntando al este.
└── NÓDULOS DE ORIGEN:
    ├── 'od' ('start_dot'): Nódulo base estático (camino de 1 sola baldosa).
    ├── 'on' ('start_up'): Origen con salida hacia el norte.
    ├── 'os' ('start_down'): Origen con salida hacia el sur.
    ├── 'ow' ('start_left'): Origen con salida hacia el oeste.
    └── 'oe' ('start_right'): Origen con salida hacia el este.
```

- **Algoritmo de Conexión de 3 Puntos y Acumulación Dinámica:** La función pura `getArrowSegmentCode(prev, curr, next)` evalúa los deltas de dirección entre el punto anterior, actual y siguiente para resolver esquinas y vectores ortogonales en tiempo constante $O(1)$, mientras que `updateDynamicPath` rebobina o extiende la ruta interactiva al arrastrar el cursor dentro del presupuesto de movimiento.

### 2.6 Algoritmo de Convolución y Mapa de Calor de Amenazas (`threatRange.ts`)
*Implementación de Referencia:* `src/domains/tactics/core/threatRange.ts`.

Para proporcionar asistencia táctica visual y suministrar heurísticas al bot de IA, el subsistema calcula el alcance de peligro combinado de las tropas rivales (`calculateSingleUnitThreat` y `calculateCombinedEnemyThreatMap`):

1. **Amenaza Directa vs. Indirecta:**
   - **Unidades Indirectas (`artillery`, `rocket`, `missile`, `battleship`, `piperunner`):** Al no poder moverse y disparar en el mismo turno, proyectan una **corona de amenaza estacionaria** entre $\text{minRange}$ y $\text{maxRange}$ calculada con distancia Manhattan:
     $$\text{dist} = |x - x_{\text{unit}}| + |y - y_{\text{unit}}|, \quad \text{minRange} \le \text{dist} \le \text{maxRange}$$
   - **Unidades Directas (`infantry`, `mech`, `recon`, `tank_light`, `tank_medium`, `anti_air`, `b_copter`, `fighter`, `bomber`):** Proyectan una **zona de amenaza dinámica**: calculan primero todas las casillas alcanzables mediante `TacticalPathfindingEngine.getReachableTiles` y proyectan un radio ortogonal Manhattan $= 1$ sobre cada una de ellas.

2. **Mapa de Calor Convolucional (`heatMap`):**
   Se inicializa una matriz 2D $[H \times W]$ con ceros. Por cada unidad enemiga viva ($\text{hp} > 0$), se incrementan los valores de las celdas bajo su rango de ataque. La superposición indica zonas de fuego cruzado crítico ($\ge 2$ unidades enemigas convergiendo en la celda), visualizables en el canvas como gradientes de peligro para evitar errores de posicionamiento.

### 2.7 Motores de Integración Territorial, Doble Llave y Escalado Alice
*Implementación de Referencia:* `src/domains/world/core/territorialExpansionEngine.ts` (`@domains/world`), `src/domains/economy/core/strategicAndProductionEngine.ts` (`@domains/economy`), `src/domains/tactics/core/tacticalCombatSeamlessIntegration.ts` (`@domains/tactics`).

1. **Motor de Ondas Celulares Territorial.io (`src/domains/world/core/territorialExpansionEngine.ts`):**
   - Resuelve la expansión territorial mediante frentes continuos de celdas alimentados por presupuesto de tropas/energía (`executeTerritorialExpansion`).
   - Recalcula la soberanía regional (`recalculateSovereignty`) y aplica el **Pilar 5 Canónico**: la conquista de la Capital regional otorga un **Buff Regional de $+5\%$** en rendimiento de recursos y logística en toda la región.
2. **Motor de Nodos y Rendimiento Económico (`src/domains/economy/core/strategicAndProductionEngine.ts`):**
   - Computa la agregación acumulativa de bonificaciones soberanas de los 7 nodos estratégicos canónicos de Venezuela (Caracas, Maracaibo, Amuay, Paria, Guri, Margarita, Maracay) mediante `evaluateStrategicNodes`.
   - Gestiona los tiempos y costes de forja industrial de unidades (`calculateUnitProductionDuration`, `calculateUnitProductionCost`) y el préstamo regulado de unidades del Arsenal del Clan (`authorizeFactionUnitBorrow`).
3. **Integración Táctica Sin Costuras (`src/domains/tactics/core/tacticalCombatSeamlessIntegration.ts`):**
   - **Semantic LOD (`resolveSemanticLOD`):** Transiciona de forma continua entre `LOD1_GLOBAL` ($z < 6.0$, muestreo `linear`, budget $45\text{ MB}$, canal `world_sovereignty_ticker`), `LOD2_OPERATIONAL` ($6.0 \le z < 13.0$, muestreo `linear`, budget $85\text{ MB}$, canal `theater_ops:VE`) y `LOD3_TACTICAL` ($z \ge 13.0$, `isTileCanvasActive = true`, muestreo `nearest` pixel-art, budget $140\text{ MB}$, canal `territorial_battle:${activeProvinceId}`).
   - **Validador de Doble Llave (`validateDoubleKeyDeployment`):** Exige simultáneamente fondos de partida (`availableFunds >= unitCostFunds`) y chasis físico en el Hangar (`userHangarStock >= 1` o `factionHangarStock >= 1`), otorgando dotación infinita (`sourceUsed: 'f2p_infinite'`) únicamente a `infantry` T1 y `recon` T1.
   - **Pilar 6 Canónico — Liquidación de Bajas y 35% Chatarra Tecnológica (`settleCombatLossesAndScrap`):** Descuenta permanentemente del hangar las unidades destruidas (excepto las F2P básicas T1) y recupera exactamente el **$35\%$ de su valor base** ($\lfloor 50 \times \text{Tier} \times 0.35 \rfloor$) en **Chatarra Tecnológica (`tech_scrap`)**, refundible a razón de $2\text{ Scrap} \to 1\text{ Placa de Acero}$ (`steelPlatesRefundable`).
   - **Pilar 7 Canónico — Protocolo Defensivo Human Handshake de 120s (`evaluateDefensiveHandshake`):** Durante los primeros **$120\text{ segundos}$** desde el inicio del asedio, mantiene activa la alerta `defconAlert = true` en el Bark Engine esperando que un comandante defensor reclame el mando (`claimedByDefender -> combatMode: 'pvp_realtime'`). Si el contador llega a $0\text{s}$ sin relevo humano, la sesión queda gobernada por la IA de Guarnición (`combatMode: 'pve_garrison'`).

---

# 3. SINCRONIZACIÓN DE RED Y REALTIME WEBSOCKETS

### 3.1 Canales Supabase Realtime y Sincronización de Baja Latencia (`useMatchSync.ts`)
*Implementación de Referencia:* `src/domains/tactics/hooks/useMatchSync.ts` (`@domains/tactics`), `src/shared/lib/supabase/client.ts`, `src/shared/types/network.ts` (`@shared`).

La comunicación táctica en vivo se articula sobre canales WebSocket dedicados de Supabase Realtime:
1. **`match:${matchId}` (`useMatchSync.ts`):**
   - Configurado con `broadcast: { ack: true, self: false }` y `presence: { key: userId }`.
   - **`MATCH_ACTION`:** Transmite eventos `MatchSyncEvent` con deltas secuenciales (`DeltaAction` con `actionId` incremental y `timestamp`) en $< 50\text{ms}$ mediante `broadcastAction`.
   - **`TACTICAL_PING` / `TACTICAL_PONG`:** Intercambio automático de marcas de tiempo al suscribirse para calcular `latencyMs = Math.round(roundtrip / 2)` y alimentar la compensación de latencia del Reloj Fischer.
2. **Canales Territoriales por Nivel de Zoom (`resolveSemanticLOD` & `SpatialDeploymentService`):**
   - `world_sovereignty_ticker` (LOD 1), `theater_ops:VE` y `theatre:${regionId}` (LOD 2, cambios CDC en `tactical_spatial_deployments` y `tactical_fief_constructions`), y `territorial_battle:${activeProvinceId}` (LOD 3).

### 3.2 Protocolo de Reconexión Transparente y Banco de Desconexión PvP
*Implementación de Referencia:* `src/domains/tactics/hooks/useMatchSync.ts`, `src/shared/types/network.ts`, `supabase/migrations/20261031000022_reconnection_snapshots_and_full_catalog.sql`.
Si un jugador pierde la conexión (`TIMED_OUT`, `CLOSED` o `CHANNEL_ERROR`):
- El cliente local mantiene el estado in-memory y transiciona `connectionStatus` a `'RECONNECTING'` o `'DISCONNECTED'`.
- Cero polling HTTP a endpoints REST: La sincronización es 100% conducida por eventos WebSocket a través del hook `useMatchSync`.
- Al recuperar la señal, `requestStateResync()` invoca `supabase.rpc('rpc_reconnect_match_state', { p_match_id: matchId, p_user_id: userId })`, recibiendo `data.snapshot` (`TurnSnapshot`) y rehidratando el tablero mediante `onStateSync(data.snapshot)` sin recargar el navegador.

#### 3.2.1 Protocolo de Resincronización Atómica y Banco de Desconexión PvP
1. **Banco de Gracia de Desconexión (`disconnectGraceBankSec` en `MATCH_FORMAT_CONFIGS`):**
   - Duelo Espejo (`mirror_duel`): **$30\text{ segundos}$** por jugador.
   - Escaramuza Blitz (`blitz_skirmish`): **$60\text{ segundos}$** por jugador.
   - Gran Campaña (`grand_campaign`): **$120\text{ segundos}$** por jugador.
2. **Gobernanza Asimétrica de Reloj:**
   - Si el jugador se desconecta durante su turno activo, el cronómetro de turno consume primero sus segundos normales y a continuación consume su Banco de Gracia. Al llegar a $0\text{s}$, el servidor ejecuta `execute_match_forfeit(p_match_id, p_disconnected_id)` concediendo la victoria al rival por abandono.
   - Si el jugador se desconecta en el turno del rival, su Banco de Gracia no se consume hasta que el rival ceda el turno.
3. **Cero Congelación para el Rival en Línea:** El canvas del jugador activo permanece operativo y el HUD proyecta un banner superior no modal: `⚠️ RIVAL DESCONECTADO (Banco de Gracia: 00:24)`.
4. **Resincronización Atómica (Snapshot Dump):**
   Al reconectar, el estado completo (`units`, `tiles`, `funds`, `turnTimeRemaining`, `playerCOs`) se hidrata en un único ciclo de renderizado $O(1)$, evitando desincronizaciones de eventos heredados.

### 3.3 Persistencia Segura de Transportes y Pasajeros
*Implementación de Referencia:* `src/shared/types/index.ts`, `src/domains/tactics/core/specialAbilities.ts`, `src/domains/tactics/components/GameCanvas.tsx`.

Para evitar desincronizaciones de red, recargas del navegador o corrupciones en Supabase (`MultiUnitTransportManager` en `src/domains/tactics/core/specialAbilities.ts`):
- Capacidad canónica por chasis (`getCapacity`): `lander`, `cruiser` y `blackboat` transportan hasta **2 unidades**; `apc` y `t_copter` transportan **1 unidad** (`infantry` o `mech`).
- Toda unidad de transporte almacena la lista de identidades de sus pasajeros en `transport.loadedUnitIds: string[]`.
- Cada pasajero embarcado conserva un puntero inverso a su vehículo anfitrión en `passenger.isLoadedInsideId: string | null` y sincroniza sus coordenadas `(x, y)` con las del transporte.
- **Renderizado e Interacción en Canvas:** Las tropas con `isLoadedInsideId != null` son omitidas del bucle de dibujo principal y del hit-testing de clics en `src/domains/tactics/components/GameCanvas.tsx`, evitando selecciones fantasma.
- Al desembarcar (`unload`), el transporte desvincula el ID del pasajero de `loadedUnitIds` y limpia `passenger.isLoadedInsideId = null`, restaurando la unidad en la casilla de desembarque adyacente elegida.

### 3.4 Gobernanza Económica y Bucle de Progresión Offline (Curva Soft Cap)
*Implementación de Referencia:* `src/shared/types/index.ts`, `src/shared/types/database.types.ts`, `supabase/migrations/20261031000015_offline_progression_and_transport_persistence.sql`, `src/domains/tactics/core/autonomousOrchestrator.ts`.

Se establece una estricta taxonomía económica de 3 niveles en partida y cuenta:
1. **`funds` (Fondos de Partida $\$G$):** Divisa efímera generada in-match por ciudades, fábricas y sedes para desplegar tropas y financiar reparaciones.
2. **`battleCredits` (Créditos de Batalla):** Divisa persistente de cuenta otorgada tras concluir partidas para progresión y personalización.
3. **`commandGems` (Gemas de Mando):** Divisa premium persistente exclusivamente para cosméticos y pases visuales (Cero P2W).

**Regulación del Modo Offline (vs Bot — `calculateOfflineRewardMultiplier` en `autonomousOrchestrator.ts`):**
- **Curva Soft Cap Escalonada $\mu(k)$:** Según el número de partidas offline diarias jugadas ($k = \text{dailyMatchesCount} + 1$), las recompensas de XP y Créditos aplican un multiplicador decreciente anti-granja:
  $$\mu(k) = \begin{cases} 0.60 & \text{si } 1 \le k \le 3 \\ 0.30 & \text{si } 4 \le k \le 6 \\ 0.10 & \text{si } 7 \le k \le 10 \\ 0.02 & \text{si } k \ge 11 \end{cases}$$
- **Suelo Mínimo Garantizado:** Toda partida offline completada garantiza al menos **$+5\text{ XP}$ y $+10\text{ Créditos}$**.
- **Cero Trofeos Competitivos:** Las partidas offline no otorgan trofeos de ladder clasificatorio (`trophiesDelta = 0`).
- **Escalado por Dificultad del Bot:** Multiplicador de incentivo según nivel (`easy`: $0.85\times$, `normal`: $1.0\times$, `hard` / `chess`: $1.20\times$).
- **Penalización por Victoria Pírrica:** Solicitar refuerzos del hangar durante la batalla reduce la recompensa final en un **$-15\%$** (`TacticalReinforcementEngine.applyPyrrhicVictoryPenalty`).

---

# 4. RENDERIZADO FRONTEND: MAPLIBRE GL WEBGL, CANVAS 2D Y AUDIO PROCEDURAL

### 4.1 Arquitectura Híbrida de Renderizado y Semantic LOD
El cliente de *Tactical Command* combina dos motores de renderizado optimizados para soportar la experiencia sin costuras desde la perspectiva planetaria hasta la escaramuza de baldosas:

1. **Motor Cartográfico Macro (MapLibre GL / OpenPlace WebGL 2.0):**
   - Renderiza el globo terráqueo en modo oscuro estilo C4ISR (*dark mode militar*).
   - El resto de continentes y países no jugables permanecen atenuados con opacidad al 25% y shader de desaturación.
   - Proyecta los polígonos vectoriales GeoJSON de las 24 regiones de Venezuela y las 7 zonas limítrofes con coloreado dinámico según la facción soberana.
   - Pinta en tiempo real las olas de celdas celulares Voronoi/H3 conquistadas por clanes estilo *Territorial.io*.

2. **Niveles de Detalle Semántico (Semantic LOD 1 / 2 / 3):**
   - **LOD 1 (Continental / Estratégico, $z < 6.0$):**
     * Vista de mapa satelital simplificado.
     * Fronteras nacionales consolidadas, niebla macro estática y marcas heráldicas de las alianzas dominantes.
   - **LOD 2 (Operacional de Teatro, $6.0 \le z < 13.0$):**
     * Desglose provincial en micro-regiones.
     * Capa activa de celdas de avance territorial, flechas de vector de marcha y marcadores tridimensionales de los 7 Nodos Estratégicos (Amuay, Paria, Guri, etc.).
     * Proyección de asedios en curso con barras de Puntos de Control Territorial (TCP) y cuentas regresivas de Handshake (120s).
   - **LOD 3 (Táctico Local / Batalla, $z \ge 13.0$):**
     * Transición sin pantallas de carga al tablero de asedio Advance Wars sobre cuadrícula ortogonal $24 \times 24$.
     * Bucle de dibujo a 60 FPS con micro-terrenos, niebla de guerra con raycasting radial y sprites de combate.

3. **Bucle de Dibujo en Canvas Táctico a 60 FPS:**
   - *Capa 0 (Terreno Base):* Malla de celdas estáticas dibujada en un OffscreenCanvas para evitar redibujados innecesarios.
   - *Capa 1 (Propiedades y Fábricas):* Sprites de ciudades con animación de bandera según el bando capturador.
   - *Capa 2 (Suministros y Silos):* Balizas y depósitos tácticos con gradiente de iluminación.
   - *Capa 3 (Unidades):* Sprites pixelados escalados por pixel art nítido (`imageSmoothingEnabled = false`), con barras de HP proporcionales de 1 a 100.
   - *Capa 4 (Niebla de Guerra):* Máscara semitransparente con recorte radial (*globalCompositeOperation = 'destination-out'*).
   - *Capa 5 (VFX y Onomatopeyas):* Sellos de cómic Pop-Art, explosiones de partículas y trazos de proyectiles.

### 4.2 Motor de Audio Procedural Web Audio API
El juego **no descarga archivos de sonido externos** (.mp3 o .wav). Todos los efectos son sintetizados al vuelo mediante nodos de osciladores senoidales, ruido blanco y filtros biquad:
- **Disparo de Cañón:** Generador de ruido blanco filtrado con un filtro pasa-bajos exponencial descendente de $800\,\text{Hz} \to 40\,\text{Hz}$ en $0.4\text{s}$.
- **Sirena de Alerta DEFCON:** Dos ondas senoidales entrelazadas en 520Hz y 660Hz.
- **Temporizador de 15s (Duelo Espejo):** Pulsos de onda cuadrada a $880\,\text{Hz}$ con duración de $40\text{ms}$ en los segundos 5, 3, 2 y 1.

### 4.3 Sistema de Diseño Frontend: Especificación Canónica de la Skill `retro-futurism`
Todo el desarrollo de la interfaz de usuario web (HUD táctico, barras de mando, modales de producción, armería, tienda y viñetas de cómic) debe implementar obligatoriamente las directrices de diseño contenidas en [`.agents/skills/tactical-command-intel/SKILL.md`](.agents/skills/tactical-command-intel/SKILL.md):

1. **Axiomas de Maquetación Atompunk (Space-Age):**
   - **Formas Aerodinámicas:** Evitar cajas con rectángulos perfectos o bordes genéricos. Toda tarjeta contenedora táctica debe aplicar radios de esquina asimétricos:
     ```css
     border-radius: 40px 10px 40px 10px; /* Sweeping, aerodynamic corners */
     ```
   - **Sombreado Rígido (Hard Drop Shadow):** Sombras sólidas de alto contraste sin difuminado (*blur = 0*):
     ```css
     box-shadow: 15px 15px 0px rgba(0, 0, 0, 0.5);
     ```
   - **Biseles Metálicos y Cromados:** Los bordes de contenedores principales simulan cromo reflectante mediante gradientes lineales (`LinearGradient` de `#7B8A4A` a `#F2E8D5` y `#7B8A4A`).
   - **Curvas Googie y Starbursts:** Integración de remates en forma de estrella atómica y aletas aerodinámicas en encabezados y botones de acción primaria (`clip-path: polygon(...)`).

2. **Paleta Cromática Oficial:**
   | Token | Color Hex | Uso en Frontend |
   |:---|:---:|:---|
   | `bg-dark` | `#2B2C24` | Fondo base de pantalla y tableros |
   | `olive-card` | `#46521F` | Fondo de tarjetas tácticas, modales y barras de mando |
   | `green-border` | `#7B8A4A` | Bordes metálicos, divisores y elementos de HUD activo |
   | `rust-orange` | `#C46A3A` | Botones de ataque, alertas críticas, sellos y banners de acción |
   | `cream-text` | `#F2E8D5` | Tipografía principal, títulos y números legibles |

3. **Tipografía:** Tipografía geométrica sans-serif de mediados de siglo (`Futura`, `Trebuchet MS`), garantizando claridad visual y estética retro-futurista optimista ("Clean, optimistic and shiny").

### 4.4 Discriminación Matemática de Gestos Táctiles Móviles (`src/domains/tactics/components/GameCanvas.tsx`)
En pantallas móviles táctiles (< 6 pulgadas), el lienzo ejecuta un clasificador continuo de gestos:

1. **Zona Muerta de Arrastre (`DRAG_THRESHOLD_PX = 10.0px`):** Si el desplazamiento táctil $||\vec{P}_{\text{actual}} - \vec{P}_{\text{inicio}}|| < 10\text{px}$ y la duración es inferior a $250\text{ms}$, se resuelve como `TAP` limpio, impidiendo desplazamientos accidentales de cámara.
2. **Inspección Táctica por Pulsación Prolongada (`LONG_PRESS_MS = 400ms`):** Mantener el dedo sobre una unidad o baldosa durante $\ge 400\text{ms}$ con una deriva $< 6\text{px}$ activa la inspección estática del radio de amenaza (`ThreatRange`) y emite una vibración háptica de $40\text{ms}$ (`navigator.vibrate`), bloqueando cualquier orden de movimiento.
3. **Escala y Límites de Zoom:**
   - **Rango Operativo:** $Z_{\min} = 0.45\times$ (visión estratégica total) a $Z_{\max} = 1.85\times$ (inspección de miniaturas).
   - **Sensibilidad Pinch-to-Zoom:** Multiplicador $\gamma = 0.008$ sobre el delta de distancia euclidiana entre contactos.
   - **Conservación de Centroide:** La cámara compensa dinámicamente las coordenadas $(C_x, C_y)$ para mantener el punto medio entre ambos dedos inmóvil durante el escalado.
4. **Hitbox Táctil Expandida:** Cada baldosa proyecta un margen perimetral virtual de $+6\text{px}$ en resoluciones móviles, garantizando que el objetivo cumpla el mínimo de $44\times44\text{px}$ estipulado en las pautas WCAG 2.1 AAA.

---

# 5. MOTORES DE INTELIGENCIA ARTIFICIAL TÁCTICA Y GUARNICIONES ESCALABLES (`aiBot.ts` & `garrisonAIEngine.ts`)
*Implementación de Referencia:* `src/domains/tactics/core/aiBot.ts`, `src/domains/tactics/core/garrisonAIEngine.ts` (`@domains/tactics`), `src/domains/world/core/territorialSiegeOrchestrator.ts` (`@domains/world`).

### 5.1 Motor Heurístico de Escaramuza (`TacticalBotAI` en `src/domains/tactics/core/aiBot.ts`)
El bot evalúa un árbol de decisión ponderado sin consumir recursos excesivos en Edge:

$$\text{Puntuación}(\text{Acción}) = w_1 \cdot \Delta\text{ValorMilitar} + w_2 \cdot \Delta\text{Propiedades} + w_3 \cdot \Delta\text{ControlTerreno} - w_4 \cdot \text{RiesgoContragolpe}$$

- **Dificultad Fácil (`easy`):** Prioriza captura de ciudades adyacentes; ignora la penalización por daño de contraataque.
- **Dificultad Normal (`normal`):** Evalúa tablas de daño, cobertura de terreno ($+80$ por estrella) y penaliza contraataques ($-70$ por punto de daño recibido).
- **Dificultad Difícil (`hard`):** Calcula distancias Manhattan, tiende emboscadas en niebla de guerra y prioriza objetivos estratégicos de alto valor.
- **Dificultad Ajedrez (`chess` - Simulador de Alto Rendimiento):**
  Opera como un motor de análisis implacable inspirado en motores de ajedrez:
  1. *Ratio Financiero de Intercambio (Trade Efficiency):* Evalúa la relación costo/beneficio en fondos de cada escaramuza:
     $$\text{TradeNet} = \left(\text{CostoDefensor} \times \frac{\text{DañoInfligido}}{10}\right) - \left(\text{CostoAtacante} \times \frac{\text{DañoContraataque}}{10}\right)$$
  2. *Penalización Extrema por Riesgo:* Duplica la aversión al contraataque (penalización de $-140$ vs $-70$), negándose a ejecutar ataques donde el intercambio de fondos sea desfavorable.
  3. *Incentivo por Eliminación Completa:* Bono masivo ($+3,500$ vs $+2,000$) si el ataque aniquila a la tropa enemiga, impidiendo que el rival pueda fusionarla o repararla.
  4. *Ponderación de Cobertura de Terreno:* Valora de forma crítica las estrellas defensivas del destino (peso $+120$ vs $+80$), forzando posicionamientos en montañas y bosques.
  5. *Producción de Fábrica Determinista y Contra-Unidades:* Audita la composición del ejército rival (`decideFactoryProduction`) para desplegar contramedidas exactas (antiaéreos Vulcan `anti_air` frente a aeronaves, blindados pesados `tank_medium` y `rocket`/`artillery` frente a columnas de tanques).

### 5.2 Motor de Guarniciones IA de Niveles 1 a 5 y Protocolo Human Handshake de 120s (`GarrisonAIEngine` en `src/domains/tactics/core/garrisonAIEngine.ts`)
Conforme al **Pilar 7 Canónico**, cuando una provincia entra en asedio (`TerritorialSiegeOrchestrator.createSiegeSession`), se abre un **Human Handshake de 120 segundos** (`HANDSHAKE_TIMEOUT_SECONDS = 120`). Si ningún oficial humano del clan defensor reclama el mando (`claimDefensiveHandshake`) antes de que expire la cuenta regresiva (`evaluateDefensiveHandshake`), `TerritorialSiegeOrchestrator.resolveHandshakeTimeout` transfiere el mando táctico automáticamente al **Motor de Guarniciones IA (`GarrisonAIEngine`)**, cuyas capacidades cognitivas escalan según la inversión del clan en el Búnker regional (`GARRISON_TIER_SPECS`):

| Nivel | Nombre Canónico | Motor IA (`aiEngineTier`) | Algoritmo de Búsqueda | Plies / Presupuesto | Max Tier Operable | Coste Activación (EC) | Mantenimiento / Hora | Reserva Chasis (`SupplyPool`) | Capacidades CO |
| :---: | :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Nv. 1** | Milicia Local | `easy` | *1-ply Greedy Heuristic* | 1 ply / 250 estados | Tier 2 | $0\text{ EC}$ | $0\text{ EC/h}$ | 12 chasis | Sin General ni SCOP ($1.0\times$) |
| **Nv. 2** | División Regular | `normal` | *2-ply Positional Minimax* | 2 plies / 2,500 estados | Tier 3 | $4,500\text{ EC}$ | $180\text{ EC/h}$ | 24 chasis | Permite General contratado ($1.25\times$) |
| **Nv. 3** | Guardia Acorazada Veterana | `hard` | *3-ply Task-Force Tree* | 3 plies / 18,000 estados | Tier 4 | $18,000\text{ EC}$ | $750\text{ EC/h}$ | 40 chasis | General + Disparo de COP ($1.6\times$) |
| **Nv. 4** | Cuerpo de Estado Mayor | `chess` | *Alpha-Beta (4-5 ply) + Killer Heuristic* | 5 plies / 120,000 estados | Tier 4 | $65,000\text{ EC}$ | $2,800\text{ EC/h}$ | 60 chasis | General + Sincronía COP/SCOP ($2.1\times$) |
| **Nv. 5** | Gran Mariscal ("Búnker Implacable") | `mcts_legendary` | *Híbrido Alpha-Beta + MCTS-UCT + Heatmaps* | 6 plies / 450,000 estados | Tier 5 | $220,000\text{ EC}$ | $9,500\text{ EC/h}$ | 85 chasis | Sinergia letal SCOP + CO Zone ($3.0\times$) |

- **Rebalanceo Financiero (`GarrisonAIEngine.calculateRebalance`):** Calcula el diferencial de activación (`upgradeCostEc`), mantenimiento horario (`hourlyUpkeepEcDelta`) y capacidad de reserva (`supplyPoolCapacityDelta`) al ascender o degradar el nivel del búnker.
- **Degradación por Desgaste de Chasis (`GarrisonAIEngine.checkAttritionDowngrade`):** Si la reserva física de chasis de la guarnición (`remainingChassisCount`) cae a $0$, el búnker degrada automáticamente a **Nivel 1 (Milicia Local)**; si cae por debajo del umbral crítico del **$25\%$** (`baseSupplyPoolChassis * 0.25`) en niveles $> 2$, su nivel efectivo se reduce en $1$ grado.

---

# 6. SUITE DE ESTUDIO DE DESARROLLO Y EDICIÓN TÁCTICA (`src/domains/tactics/components/TacticalStudioEditor.tsx`)
**[ESTADO: 100% IMPLEMENTADO Y OPERATIVO EN CÓDIGO]**  
*Implementación de Referencia:* `src/domains/tactics/components/TacticalStudioEditor.tsx`, `src/domains/tactics/components/modules/MapBuilder.tsx`, `src/domains/tactics/components/modules/SpriteStudio.tsx`, `src/domains/tactics/components/modules/CommanderBarkStudio.tsx`, `src/domains/tactics/components/mapBuilder.test.ts`.

El entorno de desarrollo incluye una suite de herramientas de creación accesibles en tiempo de ejecución:

### 6.1 Constructor de Mapas Tácticos (`src/domains/tactics/components/modules/MapBuilder.tsx`)
- **Pincel Multiterreno:** Permite pintar las 18 tipologías de terreno canónicas (`CANONICAL_TERRAIN_PROPERTIES` en `src/domains/tactics/core/canonicalMovement.ts`, incluyendo silos balísticos, commtowers, laboratorios, arrecifes y tuberías).
- **Herramienta de Simetría Rotacional $180^\circ$:** Diseñada para mapas competitivos de Duelo Espejo; replica automáticamente cualquier colocación de terreno o propiedad en el cuadrante diametralmente opuesto.
- **Importador y Exportador AWBW/JSON:** Serializa y deserializa cuadrículas compatibles con WarsWorld y Advance Wars By Web (`src/domains/tactics/core/mapImporter.ts`).

### 6.2 Estudio de Sprites Pixel-Art (`src/domains/tactics/components/modules/SpriteStudio.tsx`)
- **Lienzo de Inspección con Zoom Óptico:** Escala de $2\times$ a $8\times$ con conservación de bordes pixelados (*nearest-neighbor*).
- **Control de Ciclos de Animación:** Selector de fotogramas por segundo (FPS), estados de reposo (`idle`), marcha (`move`) y disparo (`fire`).
- **Remapeo Dinámico de Paletas:** Conmutación instantánea entre uniformes de facción (Orange Star, Blue Moon, Green Earth, Yellow Comet, Black Hole).

### 6.3 Estudio de Comandantes y Bark Engine (`src/domains/tactics/components/modules/CommanderBarkStudio.tsx`)
- **Probador de Viñetas Cómicas:** Previsualización de los comandantes (`src/domains/tactics/core/coSystem.ts`) con 5 siluetas de bocadillos y sellos Pop-Art (`¡BOOM!`, `¡ALERT!`, `¡CLUTCH!`, `¡SINK!`, `¡CRASH!`) conectados a `src/domains/game-feel/core/barkEngine.ts`.
- **Consola de Simulación de Triggers:** Permite forzar disparos de eventos (`co_power`, `airdrop_spawn`, `trap_ambush`, `near_miss`) e interpolar parámetros de amistad (`bondingLevel`).

---

# 7. ARNÉS DE TELEMETRÍA Y QA EN VIVO (`src/shared/qa/QADevOpsRunner.tsx`)
**[ESTADO: 100% IMPLEMENTADO Y ACCESIBLE DESDE EL LOBBY]**  
*Implementación de Referencia:* `src/shared/qa/QADevOpsRunner.tsx` (`@shared`), `src/domains/world/__tests__/clanSystem.test.ts`, `src/domains/tactics/__tests__/e2eIntegration.test.ts`.

Integrado en la cabecera técnica del Lobby como `[⚙️ Terminal de Estado Mayor]`, el ejecutor de QA permite:
1. **Validación Automática de Determinismo ($RNG = 0$):** Ejecuta 100 micro-duelos deterministas en escala 1-100 HP y valida que no exista desviación estándar en el daño.
2. **Benchmark de Rendimiento A\*:** Comprueba que las búsquedas de ruta en mapas de $32\times32$ resuelvan en menos de $2.5\text{ms}$.
3. **Chequeo de Integridad de Tablas Balísticas:** Verifica la no-regresión de las interacciones directas e indirectas del catálogo balístico (`CANONICAL_DAMAGE_CHART` en `src/domains/tactics/core/canonicalDamageChart.ts`).

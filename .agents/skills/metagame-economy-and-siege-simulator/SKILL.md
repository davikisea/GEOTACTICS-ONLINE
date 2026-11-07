---
name: metagame-economy-and-siege-simulator
description: Arquitecto y simulador determinista de los 7 Pilares Canónicos, la cadena industrial de 10 parcelas por feudo, el Almacén Físico de 16 tropas (CERO cartas), el Mercado Libre P2P (2% split = 1% Sink + 1% Clan, VWAP Collar ±25%) y el protocolo de Asedio Territorial con Human Handshake de 120s (@domains/economy, @domains/world, @domains/tactics). Usa esta skill siempre que modifiques fórmulas económicas, precios, recetas de refinado, tiempos de forja, mantenimiento imperial o reglas de asedio TCP.
---

# METAGAME ECONOMY, INDUSTRIAL FORGE & SIEGE BALANCE ARCHITECT

Protege el equilibrio matemático y las invariantes de los **7 Pilares Canónicos + Regla Financiera P2P** en **GEOTACTICS: ONLINE**, articulando los motores de `@domains/economy`, `@domains/world`, `@domains/tactics` y las constantes maestras en `src/shared/types/metagame.ts`.

---

## 1. CUÁNDO ACTIVAR ESTA SKILL

- Al tocar cualquier fórmula o constante en `src/shared/types/metagame.ts` (`MASTER_METAGAME_CONSTANTS`).
- Al modificar la cadena industrial, las 10 parcelas por feudo, las 7 recetas de refinado o el mercado P2P en `src/domains/economy/core/industrialEngine.ts` y `P2PMarketplaceView.tsx`.
- Al modificar los tiempos/costes de forja de chasis T1–T5 o los bonos de nodos estratégicos en `src/domains/economy/core/strategicAndProductionEngine.ts`.
- Al modificar el mantenimiento imperial o el rendimiento RGO regional en `src/domains/economy/core/upkeepEngine.ts` o `turnEconomy.ts`.
- Al modificar el protocolo de asedio territorial, drenaje de puntos TCP, escudos temporales o el *Human Handshake* de 120s en `src/domains/world/core/territorialSiegeOrchestrator.ts` y `src/domains/tactics/core/tacticalCombatSeamlessIntegration.ts`.

---

## 2. TABLA DE INVARIANTES MATEMÁTICAS INMUTABLES (SSOT)

Ninguna modificación de código ni de base de datos puede violar estos parámetros:

| Pilar / Sistema | Constante / Parámetro Canónico | Valor Exacto | Archivo Fuente Autoritativo |
| :--- | :--- | :---: | :--- |
| **Pilar 1: Hangar Físico (0 Cartas)** | `MAX_PHYSICAL_HANGAR_CAPACITY` | `16` tropas (`4` activas + `12` reserva) | `src/domains/economy/index.ts` & `UnitHangarModal.tsx` |
| **Pilar 1: Kit Básico F2P Infinito** | `infantry` T1 & `recon` T1 | `0s` espera, `0 EC`, sin baja permanente | `src/domains/economy/core/strategicAndProductionEngine.ts` |
| **Pilar 2: Escala de Salud** | `CANONICAL_MAX_HP` | `100` HP enteros (`1..100`) | `src/shared/types/metagame.ts` & `canonicalCombat.ts` |
| **Pilar 2: Reparación por Turno** | Curación en propiedad aliada | `+20 HP` (`+30 HP` Rachel) a `1%` coste/HP | `src/domains/economy/core/turnEconomy.ts` |
| **Pilar 3: Derrota por Aniquilación** | `all_units_destroyed` / `army_wiped` | `0` tropas vivas = derrota inmediata | `src/domains/economy/core/turnEconomy.ts` |
| **Pilar 4: Bono por Tier (T1–T5)** | `TIER_EFFECTIVENESS_BONUS_PER_LEVEL` | `+2%` por tier (`T1:0% .. T5:+8%` máx) | `src/domains/tactics/core/canonicalCombat.ts` |
| **Pilar 5: Capitales & TCP** | `CAPITAL_TCP_THRESHOLD` / `STANDARD_TCP_THRESHOLD` | `15,000 TCP` (Capital) / `10,000 TCP` (Estándar) | `src/shared/types/metagame.ts` |
| **Pilar 5: Buff de Capital** | Regional / Nacional | `+5%` recursos/logística regional; `+15% EC` y `+10%` velocidad forja nacional | `src/domains/economy/core/strategicAndProductionEngine.ts` & `upkeepEngine.ts` |
| **Pilar 6: Chatarra por Baja** | `RECYCLE_SCRAP_RATE` / `SALVAGE_TECH_SCRAP_RATE` | `0.35` (**35% `tech_scrap`**) | `src/shared/types/metagame.ts` & `tacticalCombatSeamlessIntegration.ts` |
| **Pilar 7: Human Handshake** | `HANDSHAKE_TIMEOUT_SECONDS` | `120` segundos (`120,000 ms`) | `src/shared/types/metagame.ts` & `territorialSiegeOrchestrator.ts` |
| **Pilar 7: Guarnición IA** | `GARRISON_TIER_SPECS` | Niveles `1` a `5` (`1-ply` hasta `6-ply MCTS-UCT`) | `src/domains/tactics/core/garrisonAIEngine.ts` |
| **Finanzas: Impuesto P2P** | `TOTAL_P2P_TAX_RATE` (`calculateP2PTransactionSplit`) | `0.02` (**2% total**: `1%` Burn Sink + `1%` Regalía Clan Hub) | `src/shared/types/metagame.ts` & `P2PMarketplaceView.tsx` |
| **Finanzas: Bandas de Precio P2P** | `VWAP_COLLAR_PERCENT` | `0.25` (**±25% sobre VWAP 24h**) | `src/shared/types/metagame.ts` & `P2PMarketplaceView.tsx` |
| **Soberanía Dual: Escudos** | `COOLDOWN_PRIORITY_HOURS` / `OCCUPIED_GRACE_HOURS_MIN` | `4h` escudo post-asedio / `24h` gracia De Facto $\to$ De Jure | `src/domains/world/core/territorialSiegeOrchestrator.ts` |

---

## 3. CADENA INDUSTRIAL DE 10 PARCELAS Y LOGÍSTICA

1. **10 Parcelas por Feudo (`PLOT_UNLOCK_TABLE` en `industrialEngine.ts`)**:
   - Parcelas 1–2 gratuitas en el arranque; parcelas 3–10 desbloqueables con Créditos Energéticos (`EC`), Acero Refinado y Hormigón.
2. **5 Materias Primas (`RawResourceType`) y 7 Recetas (`REFINING_RECIPES`)**:
   - Materias primas: `raw_iron`, `raw_stone`, `raw_rare_earth`, `raw_heavy_crude`, `raw_silicon`.
   - Refinados: `refined_steel`, `refined_concrete`, `refined_microchip`, `synthetic_fuel`, `optical_flir_sensor`, `composite_armor_plate`, `c4isr_bunker_kit`.
   - Transmutación de chatarra: `40 tech_scrap + 20 raw_rare_earth -> 1 refined_microchip` en 45 minutos (`transmuteTechScrapToMicrochips`).
3. **Soft Cap de Suministro en Campo (`turnEconomy.ts`)**:
   - Hasta `14` unidades en el tablero tienen `$0G` de sobrecoste logístico; a partir de la unidad `15`, cada unidad excedente deduce `-$200G`/turno.

---

## 4. PROTOCOLO DE VERIFICACIÓN DETERMINISTA POST-CAMBIO

Cada vez que ajustes una fórmula económica, de forja o de asedio, ejecuta obligatoriamente las suites matemáticas del dominio antes de dar por buena la tarea:

```powershell
npx tsx src/domains/economy/__tests__/industrialEngine.test.ts
npx tsx src/domains/economy/__tests__/strategicAndProductionEngine.test.ts
npx tsx src/domains/economy/__tests__/hangarAndSupply.test.ts
npx tsx src/domains/economy/__tests__/turnEconomy.test.ts
npx tsx src/domains/world/__tests__/territorialSiege.test.ts
npx tsx src/domains/world/__tests__/territorialExpansionEngine.test.ts
npm run test:geotactics
```

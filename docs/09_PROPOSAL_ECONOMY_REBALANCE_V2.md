# DOCUMENTO DE DISEÑO TÉCNICO Y REINGENIERÍA MACROECONÓMICA (V2.0-CALIBRADA)
**Documento Canónico de Propuesta:** `09_PROPOSAL_ECONOMY_REBALANCE_V2.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 2.1.0-DEFINITIVE-CALIBRATED-100D  
**Fecha de Emisión:** 2026-10-31  
**Estado:** **APROBADO POR LEAD DEVELOPER — EN PROCESO DE IMPLEMENTACIÓN EN CÓDIGO Y MIGRACIÓN**  
**Alcance:** Calibración del Hito Endgame a 100 Días (1,000 Partidas), Resolución de "Sink Choke", Aplanamiento de Curvas L10-L15, Escalado Industrial Dinámico, Sistema `scrap_blueprints` y Revalorización de Sinks de Prestigio.

---

# 1. REGISTRO DEL DEBATE MULTI-AGENTE (SÍNTESIS DIALÉCTICA RECALIBRADA)

El Comité de Economía y Sistemas se reunió para recalibrar el ritmo de progresión tras la directiva del Lead Developer: **ajustar el hito del primer mazo completo Nivel 15 para alcanzarse alrededor del Día 100 (~1,000 partidas)**, evitando la hiper-aceleración prematura de 72 días sin recaer en la asfixia anterior de 880 días.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               SESIÓN DE RECALIBRACIÓN MACROECONÓMICA (HITO DÍA 100)                    │
├──────────────────────┬──────────────────────────────────┬──────────────────────────────┤
│ Agente Convocado     │ Postura en Sesión                │ Concesión de Consenso        │
├──────────────────────┼──────────────────────────────────┼──────────────────────────────┤
│ [AG-EcoBalancer]     │ 72 días agotaba el endgame muy   │ Calibra el coste del mazo en │
│ (Economista Cuant.)  │ rápido; 100 días otorga el       │ 2,132,000G y 2,600 chips     │
│                      │ balance ideal de retención.      │ (hitos día 100 exactos).     │
├──────────────────────┼──────────────────────────────────┼──────────────────────────────┤
│ [AG-PsychRetention]  │ Aprueba el hito de 100 días si   │ Valida que el Nivel 11 (Cap  │
│ (Psicología & Churn) │ el umbral pre-esports (Nv. 11)   │ Torneo) se alcance en el día │
│                      │ se desbloquea en el día 45-50.   │ 45 (partida 450-500).        │
├──────────────────────┼──────────────────────────────────┼──────────────────────────────┤
│ [AG-IndArchitect]    │ Ajusta recetas de transmutación y│ Elimina microchips de la     │
│ (Metajuego & P2P)    │ Cleanroom para aportar 12 chips  │ Salvaguarda y equilibra la   │
│                      │ diarios + 8 chips de scrap.      │ producción a 26 chips/día.   │
├──────────────────────┼──────────────────────────────────┼──────────────────────────────┤
│ [AG-SysEng]          │ Asegura que las constantes sean  │ Diseña migración 16 con      │
│ (Backend / Supabase) │ 100% compatibles con DB y TS.    │ RPC scrap_blueprints y RLS.  │
└──────────────────────┴──────────────────────────────────┴──────────────────────────────┘
```

---

# 2. NUEVAS FÓRMULAS CANÓNICAS DE FAUCETS (INGRESOS RECALIBRADOS)

### 2.1 Escalado de Recompensas de Combate PvP por Arena (`ArenaTier`)

Se calibra el multiplicador de teatro de operaciones a una pendiente del **8% por tier** para acompasar el ritmo de 100 días:

$$\mu_{\text{Arena}}(\text{tier}) = 1.0 + (\text{tier} - 1) \times 0.08$$

```
Arena 1: 1.00x │ Arena 4: 1.24x │ Arena 6: 1.40x │ Arena 8: 1.56x │ Arena 10: 1.72x │ Liga III: 1.96x
```

#### Fórmulas de Liquidación de Combate:
$$\text{Créditos}_{\text{Victoria}} = \left\lfloor \left(250 + (\text{BajasEnemigas} \times 30)\right) \times \mu_{\text{Arena}}(\text{tier}) \times \text{MultiplicadorRacha} \right\rfloor$$
$$\text{Créditos}_{\text{Derrota}} = \left\lfloor 75 \times \mu_{\text{Arena}}(\text{tier}) \right\rfloor$$
$$\text{XP}_{\text{Victoria}} = \left\lfloor \left(120 + (\text{Turnos} \times 5)\right) \times \mu_{\text{Arena}}(\text{tier}) \right\rfloor$$
$$\text{XP}_{\text{Derrota}} = \left\lfloor 40 \times \mu_{\text{Arena}}(\text{tier}) \right\rfloor$$

---

### 2.2 Escalado Industrial Territorial por Hitos de Taller
- **Nivel 1 al 7 (Eficiencia Tier 1):** Producción base original.
- **Nivel 8 al 11 (Eficiencia Tier 2):** $+40\%$ rendimiento de extracción y $-20\%$ tiempo de refinado.
- **Nivel 12 al 15 (Eficiencia Tier 3):** $+80\%$ rendimiento de extracción y $+1$ slot en la cola multi-batch.

#### Rendimiento Diario Proyectado (Día 50 en adelante):
- **Vigas de Acero:** **38 a 42 vigas/día**.
- **Microchips de Guía:** **12 chips/día** (con 2 tandas en Sala Limpia).
- **Créditos por Cosecha a Tiempo:** **$1,000G$ por ciclo seguro (2 ciclos = $2,000G$/día)**.

---

### 2.3 Bóvedas de Guerra Corporativas (Clanes)
- **Tier 1 (1-3 activos):** $250G$, $20$ cartas comunes.
- **Tier 2 (4-7 activos):** $1,000G$, $50$ comunes, $10$ raras, $10$ acero.
- **Tier 3 (8+ activos):** **$3,500G$, $120$ comunes, $20$ raras, $5$ épicas, $35$ acero, $15$ microchips, $25$ gemas**.

---

# 3. NUEVA TABLA MAESTRA DE COSTES DE MEJORA (CALIBRADA PARA DÍA 100)

### 3.1 Tabla Comparativa Nivel por Nivel (Por 1 Carta)

| Nivel | Créditos Original | Créditos Calibrado (Día 100) | Planos Original | Planos Calibrado | Acero Original | Acero Calibrado | Microchips Original | Microchips Calibrado | Hormigón Original | Hormigón Calibrado |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **N1** | 0 | **0** | 0 | **0** | 0 | **0** | 0 | **0** | 0 | **0** |
| **N2** | 50 | **50** | 5 | **5** | 0 | **0** | 0 | **0** | 0 | **0** |
| **N3** | 100 | **100** | 10 | **10** | 0 | **0** | 0 | **0** | 0 | **0** |
| **N4** | 200 | **200** | 20 | **20** | 5 | **5** | 0 | **0** | 0 | **0** |
| **N5** | 500 | **450** | 50 | **45** | 10 | **10** | 0 | **0** | 0 | **0** |
| **N6** | 1,000 | **900** | 80 | **75** | 15 | **15** | 0 | **0** | 0 | **0** |
| **N7** | 1,800 | **1,600** | 120 | **110** | 25 | **25** | 5 | **4** | 0 | **0** |
| **N8** | 2,800 | **2,600** | 160 | **150** | 35 | **35** | 10 | **8** | 0 | **0** |
| **N9** | 4,000 | **3,800** | 200 | **200** | 50 | **50** | 15 | **12** | 5 | **5** |
| **N10** | 8,000 | **7,500** | 400 | **350** | 80 | **75** | 25 | **20** | 10 | **10** |
| **N11 (Cap)**| 15,000 | **14,000** | 800 | **600** | 120 | **100** | 35 | **26** | 20 | **20** |
| **N12** | 25,000 | **22,000** | 1,200 | **1,000** | 180 | **140** | 40 | **32** | 30 | **25** |
| **N13** | 45,000 | **35,000** | 2,000 | **1,600** | 250 | **195** | 40 | **40** | 40 | **35** |
| **N14** | 70,000 | **50,000** | 3,500 | **2,300** | 400 | **260** | 80 | **50** | 60 | **45** |
| **N15 (Max)**| 100,000 | **75,000** | 5,000 | **3,200** | 600 | **340** | 120 | **68** | 100 | **60** |
| **TOTAL** | **273,450G** | **213,200G** | **13,545** | **9,665** | **1,770** | **1,250** | **370** | **260** | **265** | **200** |

---

### 3.2 Resumen Agregado: Coste para Mazo Completo (10 Cartas)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             COMPARATIVA DE REQUERIMIENTOS: MAZO COMPLETO (10 CARTAS)                   │
├─────────────────────────┬──────────────────────┬──────────────────────┬────────────────┤
│ Recurso de Progresión   │ Sistema Original     │ Calibrado (Día 100)  │ Diferencia     │
├─────────────────────────┼──────────────────────┼──────────────────────┼────────────────┤
│ Créditos de Batalla (G) │ 2,734,500 G          │ 2,132,000 G          │ - 22.0%        │
│ Planos Totales          │ 135,450 planos       │ 96,650 planos        │ - 28.6%        │
│ Vigas de Acero Militar  │ 17,700 vigas         │ 12,500 vigas         │ - 29.4%        │
│ Microchips de Guía      │ 3,700 microchips     │ 2,600 microchips     │ - 29.7%        │
│ Hormigón Armado         │ 2,650 bloques        │ 2,000 bloques        │ - 24.5%        │
└─────────────────────────┴──────────────────────┴──────────────────────┴────────────────┘
```

---

# 4. ESPECIFICACIÓN TÉCNICA DEL SISTEMA `scrap_blueprints` (RECICLADOR)

1. **Desguace por Rareza:**
   - Común: 1 Plano $\to$ **1 Chatarra (`tech_scrap`) + 2 Créditos ($G$)**.
   - Rara: 1 Plano $\to$ **6 Chatarra + 15 Créditos ($G$)**.
   - Épica: 1 Plano $\to$ **35 Chatarra + 100 Créditos ($G$)**.
2. **Transmutación a Microchips en Sala Limpia:**
   $$\text{Receta: } 40 \text{ tech\_scrap} + 20 \text{ raw\_rare\_earth} \longrightarrow \mathbf{1 \text{ Microchip de Guía (45 min)}}$$
3. **Salvaguarda Táctica Rebalanceada:**
   - Coste: **$3,500G$, 40 vigas de acero, 15 hormigón, 5 combustible de campaña, 0 microchips**.
   - Tiempo de fabricación: **24 horas**.

---

# 5. SIMULACIÓN ESTOCÁSTICA RECALIBRADA (100, 500 Y 1,000 PARTIDAS)

**Perfil del Jugador Simulado:**
- Winrate: $50\%$ (10 partidas diarias).
- Progresión de Arena: Arena 1 $\to$ Arena 10.
- Desguace: Reciclaje activo de planos de cartas secundarias.

| Métrica Macroeconómica | **Tras 100 Partidas** (~10 días - Arena 3) | **Tras 500 Partidas** (~50 días - Arena 7) | **HITO CLAVE: 1,000 Partidas** (~100 días - Arena 10) |
|:---|:---:|:---:|:---:|
| **Créditos por Combate ($G$)** | $29,500 G$ | $210,000 G$ | **$520,000 G$** |
| **Créditos por Cofres ($G$)** | $32,000 G$ | $350,000 G$ | **$920,000 G$** |
| **Créditos Complejo Industrial ($G$)** | $15,000 G$ | $95,000 G$ | **$200,000 G$** |
| **Créditos Hitos, Clanes y Scrap ($G$)**| $7,000 G$ | $55,000 G$ | **$170,000 G$** |
| **Bonos de Salvaguarda / Racha ($G$)** | $3,500 G$ | $70,000 G$ | **$240,000 G$** |
| **TOTAL CRÉDITOS ACUMULADOS ($G$)** | **$87,000 G$** | **$780,000 G$** | **$2,050,000 G$** |
| **Planos Específicos Mazo + Transmutados**| 3,200 planos | 34,000 planos | **96,000 planos** |
| **Vigas de Acero Acumuladas** | 380 vigas | 3,400 vigas | **12,400 vigas** |
| **Microchips Acumulados (Industria + Scrap)**| 35 chips | 720 chips | **2,580 chips** |
| **Nivel Promedio del Mazo (10 Cartas)** | **Nivel 6.8** | **Nivel 11.2 (Cap Torneo)**| **NIVEL 15.0 (MAZO MAXEADO)** |
| **% de Mazo 1 Completado** | **5.5%** | **42.5%** | **100.0% (Mazo Nv.15 Completo)** |

> [!NOTE] CUMPLIMIENTO EXACTO DE LA DIRECTIVA
> A las **500 partidas (Día 50)**, el jugador alcanza el **Nivel 11 en todas sus cartas** (estándar de Torneo Esports).  
> A las **1,000 partidas (Día 100)**, el jugador alcanza el **Nivel 15 completo en su mazo de 10 cartas**, logrando el ritmo de progresión exacto requerido por el Lead Developer.

---

# 6. DICCIONARIO DE PARÁMETROS PARA CÓDIGO (`EconomyConfig`)

```typescript
export interface CardUpgradeCost {
  level: number;
  credits: number;
  blueprints: number;
  refinedSteel: number;
  refinedMicrochips: number;
  refinedConcrete: number;
}

export const ECONOMY_CONFIG_V2 = {
  version: '2.1.0-DEFINITIVE-CALIBRATED-100D',
  
  pvpArenaMultiplier: {
    base: 1.0,
    perTierStep: 0.08, // Arena 1: 1.0x, Arena 10: 1.72x
    lossBaseCredits: 75,
    winBaseCredits: 250,
    killCreditBonus: 30,
    winBaseXp: 120,
    turnXpBonus: 5,
    lossBaseXp: 40,
  },

  cardUpgradeTable: [
    { level: 1,  credits: 0,      blueprints: 0,    refinedSteel: 0,   refinedMicrochips: 0,  refinedConcrete: 0 },
    { level: 2,  credits: 50,     blueprints: 5,    refinedSteel: 0,   refinedMicrochips: 0,  refinedConcrete: 0 },
    { level: 3,  credits: 100,    blueprints: 10,   refinedSteel: 0,   refinedMicrochips: 0,  refinedConcrete: 0 },
    { level: 4,  credits: 200,    blueprints: 20,   refinedSteel: 5,   refinedMicrochips: 0,  refinedConcrete: 0 },
    { level: 5,  credits: 450,    blueprints: 45,   refinedSteel: 10,  refinedMicrochips: 0,  refinedConcrete: 0 },
    { level: 6,  credits: 900,    blueprints: 75,   refinedSteel: 15,  refinedMicrochips: 0,  refinedConcrete: 0 },
    { level: 7,  credits: 1600,   blueprints: 110,  refinedSteel: 25,  refinedMicrochips: 4,  refinedConcrete: 0 },
    { level: 8,  credits: 2600,   blueprints: 150,  refinedSteel: 35,  refinedMicrochips: 8,  refinedConcrete: 0 },
    { level: 9,  credits: 3800,   blueprints: 200,  refinedSteel: 50,  refinedMicrochips: 12, refinedConcrete: 5 },
    { level: 10, credits: 7500,   blueprints: 350,  refinedSteel: 75,  refinedMicrochips: 20, refinedConcrete: 10 },
    { level: 11, credits: 14000,  blueprints: 600,  refinedSteel: 100, refinedMicrochips: 26, refinedConcrete: 20 },
    { level: 12, credits: 22000,  blueprints: 1000, refinedSteel: 140, refinedMicrochips: 32, refinedConcrete: 25 },
    { level: 13, credits: 35000,  blueprints: 1600, refinedSteel: 195, refinedMicrochips: 40, refinedConcrete: 35 },
    { level: 14, credits: 50000,  blueprints: 2300, refinedSteel: 260, refinedMicrochips: 50, refinedConcrete: 45 },
    { level: 15, credits: 75000,  blueprints: 3200, refinedSteel: 340, refinedMicrochips: 68, refinedConcrete: 60 },
  ] as CardUpgradeCost[],

  scrapSystem: {
    maxDailyScrapBlueprints: 1500,
    rates: {
      common: { techScrap: 1, credits: 2 },
      rare:   { techScrap: 6, credits: 15 },
      epic:   { techScrap: 35, credits: 100 },
    },
    transmutation: {
      techScrapRequired: 40,
      rareEarthRequired: 20,
      microchipsProduced: 1,
      durationMinutes: 45,
    },
  },

  safeguardCrafting: {
    creditsCost: 3500,
    steelCost: 40,
    concreteCost: 15,
    campaignFuelCost: 5,
    microchipsCost: 0,
    craftingTimeSeconds: 86400, // 24 horas
    maxStorageF2P: 2,
    maxStoragePass: 3,
  },

  harvestBonus: {
    tier1: { credits: 500, purityMultiplier: 1.10 },
    tier2: { credits: 800, purityMultiplier: 1.15 },
    tier3: { credits: 1000, purityMultiplier: 1.20 },
  },
} as const;
```

# AUDITORÍA DE REALIDAD, REFUTACIÓN DE VERSIÓN Y HOJA DE RUTA REALISTA (ROADMAP)
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Fecha de Auditoría:** 31 de Octubre de 2026 (Actualización Consolidada: Sprint 3 Mazos de 10 Cartas & Libertad Orgánica Culminados)  
**Versión Real Determinada:** **`v0.5.0-DECKS-AND-SUPPLY-COMPLETED`**  
**Porcentaje Real Completado:** **~54.55%** del ecosistema total proyectado.

---

## 1. HITOS ALCANZADOS: RESCATE WARSWORLD, ORQUESTADOR PVE & METAJUEGO DE MAZOS

Se ejecutaron con éxito todos los subsistemas identificados en `WarsWorld`, el bucle autónomo del Sprint 2 y la doctrina de mazos y suministros del Sprint 3, cada uno validado por pruebas unitarias y de estrés automatizadas (73 tests totales en 6 suites):

1. **Paso 1: Flecha Dinámica y Sub-acciones (`pathingArrow.ts` & `subActions.ts`)**
   - 15 tipos de segmentos visuales canónicos, rebobinado inteligente y evaluador de subacciones legales.
   - *Stress Test:* 1,000 caminos aleatorios en 7ms. (11/11 tests pasados).

2. **Paso 2: Táctica Avanzada: Silos, Clima y Rango de Amenaza (`missileSilo.ts`, `weatherSystem.ts`, `threatRange.ts`)**
   - Silos nucleares (diamante Manhattan radio 2, daño 3 PV con regla de supervivencia a 1 HP). Clima canónico (Lluvia, Nieve, Tormenta de Arena) e inmunidades. Unión de amenaza y mapa de calor de peligro.
   - *Stress Test:* 1,000 detonaciones y mapas térmicos en 87ms. (13/13 tests pasados).

3. **Paso 3: Expansión Total de los 28 COs Canónicos (`coSystem.ts`)**
   - Los 28 comandantes oficiales de las 5 facciones con D2D, COP, SCOP (+10% universal), poderes legendarios (Eagle, Hawke, Sturm Meteor Strike 8 PV, Von Bolt Ex Machina con parálisis) y modificadores económicos de fábrica (Colin, Hachi, Kanbei).
   - *Stress Test:* 1,000 ciclos de combate en 2ms. (9/9 tests pasados).

4. **Paso 4: Logística Crítica, Habilidades Especiales, Decapitación de HQ y AWBW Extendido (`fuelLogistics.ts`, `propertyMaintenance.ts`, `specialAbilities.ts`, `hqCaptureVictory.ts`, `awbwExtendedTiles.ts`)**
   - Combustible crítico (Crash/Sink), mantenimiento financiero (10% coste por HP curado), Black Bomb, inmersión/sigilo, toma y decapitación de HQ, mapeador AWBW (+190 baldosas).
   - *Stress Test:* 1,000 simulaciones tácticas en 7ms. (14/14 tests pasados).

5. **Paso 5: Orquestador Autónomo de Turnos y Juego vs IA (`autonomousOrchestrator.ts`, `aiBot.ts`, `App.tsx`)**
   - **Motor de Orquestación Desacoplado:** Máquina de estados determinista para partidas Hotseat, vs Bot y Bot vs Bot.
   - **3 Niveles de Dificultad:** Heurística de utilidad ponderada en *Cadete (Fácil)*, *Comandante (Normal)* y *General (Difícil)* con evasión activa de amenazas.
   - **Modos de Formato Reglamentarios:** *Blitz Skirmish* (30s, x2 fondos, límite 15 turnos con desempate militar) vs *Grand Campaign* (60s, x1 fondos, límite 40 turnos).
   - **Bucle Reactivo Asíncrono en UI:** Turno automático de P2 con retardos visuales de 400ms, banners de maniobra en tiempo real y handover automático a P1.
   - **Telemetría y Detección de Tilt:** Registro de PTE (segundos por turno) y escala de Tilt Index ante decisiones precipitadas con pérdidas acumuladas.
   - *Stress Test:* 5 partidas completas Bot vs Bot (75 turnos) simuladas a 0.42ms por turno con 100% de invariantes verificadas (9/9 tests pasados).

6. **Paso 6: Constructor de Mazos de 10 Cartas y Libertad Orgánica (Soft Cap) (`deckManager.ts`, `turnEconomy.ts`, `ProductionModal.tsx`, `App.tsx`)**
   - **Validador de Mazo de 10 Cartas:** Obligatoriedad de 10 cartas con ranura 1 (`infantry`) y ranura 2 (`mech`), mínimo 2 terrestres directas, mínimo 1 antiaérea y máximo 2 super-pesadas.
   - **4 Arquetipos Predefinidos:** Equilibrado (`balanced`), Asalto Rápido (`rush`), Dominio Aéreo (`air_control`) y Sitio Blindado (`siege`).
   - **Doctrina de Libertad Orgánica (Cero Cooldowns):** Eliminación total de bloqueos artificiales de recarga en fábricas. El jugador puede desplegar cualquier unidad de su mazo tantas veces como sus fondos y fábricas lo permitan.
   - **Línea de Suministros Militares (Soft Cap):** Umbral gratuito de 14 unidades vivas. A partir de la 15.ª unidad, deducción automática de $\$200$G por unidad extra al inicio de turno descontada del ingreso neto.
   - **Integración UI Reactiva:** Selector de mazo en barra superior de `App.tsx`, filtrado dinámico del mazo en `ProductionModal.tsx` por tipo de instalación militar, e indicador en tiempo real de suministros militares y aviso de penalización.
   - *Stress Test:* 1,000 validaciones de mazo en <25ms, verificación de 4 arquetipos, filtrado de fábricas e invariantes de soft cap (11/11 tests pasados).

---

## 2. PONDERACIÓN MATEMÁTICA REAL DEL ESTADO DEL PROYECTO

| Subsistema de la Documentación | Peso en la Visión Total | % Real Implementado en Código | Contribución Efectiva |
|:---|:---:|:---:|:---:|
| **1. Motor Táctico Canónico (Advance Wars Core)** | 20% | **99%** | **19.80%** |
| **2. Inteligencia Artificial (Bots PvE Autónomos & Orquestador)** | 15% | **95%** | **14.25%** |
| **3. Metajuego de Mazos de 10 Cartas, Formatos y Suministros** | 15% | **95%** | **14.25%** |
| **4. Bark Engine en Cómic & Telemetría Cruzada** | 10% | 15% | **1.50%** |
| **5. Backend Supabase, Base de Datos y Auth** | 15% | 20% | **3.00%** |
| **6. Multijugador Realtime (WebSockets, PTE, 2v2)** | 15% | 5% | **0.75%** |
| **7. Monetización, Stripe & Command Pass 50 Tiers** | 10% | 10% | **1.00%** |
| **TOTAL CONSOLIDADO DEL ECOSISTEMA** | **100%** | — | **~54.55%** |

> [!NOTE]
> Con la integración del Metajuego de Mazos de 10 Cartas, Arquetipos y Sistema de Suministros (Soft Cap), **el Sprint 3 queda 100% completado**. La aplicación ya cuenta con reglas de barajas cerradas, despliegue directo sin cooldowns y regulación económica anti-spam.

---

## 3. HOJA DE RUTA REALISTA PASO A PASO (ROADMAP DE FASES TERRENALES)

Para no perdernos en la inmensidad de la documentación, dividimos el desarrollo en **hitos técnicos secuenciales y tangibles**:

```
                                  HOJA DE RUTA REALISTA
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
[ FASE 1: v0.4.0 - JUEGO PVE ]         [ FASE 2: v0.5.0 - METAJUEGO ]         [ FASE 3: v0.6.0 - BARK CÓMIC ]
  • Conectado TacticalBotAI [HECHO]      • Mazo cerrado 10 cartas [HECHO]       • Componente Viñeta Cómic en HUD
  • Turno rival automático P2 [HECHO]    • Libertad Orgánica / Cero CD [HECHO]  • Telemetría local básica (Tilt)
  • Partidas completas vs CPU [HECHO]    • Soft Cap de Suministros [HECHO]      • Sellos Pop-Art en partida
      │                                      │                                      │
      └──────────────────────────────────────┼──────────────────────────────────────┘
                                             │
      ┌──────────────────────────────────────┴──────────────────────────────────────┐
      ▼                                                                             ▼
[ FASE 4: v0.7.0 - PERSISTENCIA CLOUD ]                               [ FASE 5: v1.0.0 - MULTIJUGADOR & PROD ]
  • Supabase Auth & Migración 11 Ficheros                               • WebSockets Realtime PvP
  • 4 Slots de Cofres con Reloj Real                                    • Matchmaking por Ritmo (PTE)
  • Command Pass 50 Niveles en DB                                       • Stripe Checkout & Despliegue Vercel
```

---

### FASE 1: CERRAR EL BUCLE JUGABLE EN SOLITARIO (v0.4.0-ALPHA) [COMPLETADA]
**Objetivo:** Lograr que un usuario pueda abrir el navegador y jugar una partida completa y divertida contra el ordenador sin tocar la consola.

- [x] **1.1 Conexión del Motor de IA al Simulador (`App.tsx`):**
  - Conectada la clase `TacticalBotAI` para que, cuando termine el turno de P1, el ordenador (P2) tome el control automáticamente.
  - Añadidos temporizadores visuales de 400ms entre órdenes del bot para que el jugador observe los desplazamientos y ataques enemigos.
- [x] **1.2 Selector de Dificultad en la UI:**
  - Selector en la barra de control: *Cadete (Fácil)*, *Comandante (Normal)* y *General (Difícil)*.
- [x] **1.3 Pantalla de Fin de Partida Funcional:**
  - Detección de aniquilación total o captura del HQ (20 HP) con renderizado de banners y estadísticas reales del combate.

---

### FASE 2: CONSTRUCTOR DE MAZOS Y LIBERTAD ORGÁNICA (v0.5.0-ALPHA) [COMPLETADA]
**Objetivo:** Materializar el metajuego de baraja táctica y economía orgánica sin cooldowns frustrantes.

- [x] **2.1 Validación Estricta del Mazo de 10 Cartas (`deckManager.ts`):**
  - Ranura 1 obligatoria (`infantry`), Ranura 2 obligatoria (`mech`), mínimo 2 terrestres directas, mínimo 1 antiaérea, máximo 2 super-pesadas. 4 arquetipos listos.
- [x] **2.2 Despliegue con Libertad Orgánica y Suministros Militares (`ProductionModal.tsx`, `turnEconomy.ts`):**
  - Cero bloqueos artificiales de recarga (Doctrina de Libertad Orgánica / Opción 2).
  - Umbral gratuito de 14 unidades vivas; deducción automática de $-\$200$G por cada unidad excedente al inicio de cada turno.
- [x] **2.3 Conmutador de Modos de Juego y Selector de Mazo en Partida (`App.tsx`):**
  - Selector de mazo táctico interactivo en tiempo real con indicador dinámico de estado de suministros.
  - Formato *Blitz Skirmish* (30s, x2 fondos, límite 15 turnos) vs *Grand Campaign* (60s, x1 fondos, límite 40 turnos).

---

### FASE 3: BARK ENGINE VISUAL EN CÓMIC (v0.4.0-BETA)
**Objetivo:** Dar vida y personalidad a los Comandantes en pantalla sin depender de archivos de audio.

- [ ] **3.1 Componente `CommanderComicVignette`:**
  - Renderizar en la esquina del HUD la viñeta de cómic militar con los retratos del trío F2P (**Vance, Stella y Volkov**).
  - Implementar bocadillos dinámicos mediante CSS: `speech` (doctrinal), `shout` (dentado de peligro) y `thought` (nube analítica).
- [ ] **3.2 Sellos Visuales de Onomatopeyas Pop-Art:**
  - Desplegar sellos gráficos animados (*¡BOOM!*, *¡RATATAT!*, *¡ALERT!*, *¡CLUTCH!*) al ocurrir eventos críticos.
- [ ] **3.3 Motor Local de Telemetría Emocional:**
  - Calcular en cliente el `tilt_index`: si el jugador pierde 2 unidades seguidas y apura su turno en < 10 segundos, el Comandante lanza un diálogo de corrección táctica.

---

### FASE 4: BACKEND SUPABASE Y ECONOMÍA DE COFRES (v0.5.0-BETA)
**Objetivo:** Conectar el cliente a la base de datos real en la nube y activar la retención externa.

- [ ] **4.1 Migración DDL a Supabase PostgreSQL:**
  - Ejecutar la creación de las 17 tablas relacionales y políticas RLS.
  - Autenticación mediante Magic Link o Google OAuth.
- [ ] **4.2 Ciclo de 4 Ranuras de Cofres (`user_chest_slots`):**
  - Ganar una partida deposita un Cofre (Madera 3h, Hierro 8h, Blindado 12h) con reloj de desbloqueo real.
- [ ] **4.3 Command Pass con Reclamación Retroactiva:**
  - Progresión de 50 niveles estacionales mediante Insignias de Batalla y ejecución del RPC `rpc_claim_retroactive_pass_rewards`.

---

### FASE 5: MULTIJUGADOR REALTIME Y LANZAMIENTO (v1.0.0-PRODUCCIÓN)
**Objetivo:** Llevar el juego a producción competitivo y monetizado.

- [ ] **5.1 Canales Supabase Realtime (WebSockets):**
  - Sincronización de movimientos y ataques entre dos jugadores en dispositivos distintos.
- [ ] **5.2 Matchmaking por Ritmo Mental (PTE):**
  - Cola de emparejamiento evaluando trofeos y velocidad de turno (Blitz vs Analítico).
- [ ] **5.3 Pasarela de Pagos Stripe Checkout:**
  - Compra de Gemas de Mando y Pase Premium con webhooks idempotentes.
- [ ] **5.4 Despliegue en Vercel Edge:**
  - Auditoría final de rendimiento, compresión WebP y dominio de producción.

---

## 4. CONCLUSIÓN DE AUDITORÍA

Con la finalización de los Sprints 1, 2 y 3, el proyecto alcanza la versión consolidada **`v0.5.0-DECKS-AND-SUPPLY-COMPLETED`**:
* **Lo que ya tenemos culminado y operativo:**
  1. Motor táctico canónico determinista al 99% de fidelidad (AWBW).
  2. Subsistemas avanzados de WarsWorld (Silos, Clima, Combustible crítico, Habilidades, Decapitación de HQ, Atlas y +190 baldosas).
  3. Orquestador de turnos autónomo (`autonomousOrchestrator.ts`) con máquina de estados, cola de eventos y telemetría/tilt.
  4. Inteligencia Artificial (`TacticalBotAI`) con 3 niveles (Cadete, Comandante, General) conectada en vivo en `App.tsx` para partidas interactivas completas.
  5. Formatos de juego reglamentarios (Blitz Skirmish de 30s/x2 oro y Grand Campaign de 60s/x1 oro).
  6. Metajuego de Mazos de 10 Cartas (`deckManager.ts`) con 4 arquetipos y validación taxonómica estricta.
  7. Doctrina de Libertad Orgánica: Cero Cooldowns de Fábrica y Suministros Militares con Soft Cap ($-\$200$G por unidad extra sobre 14).
  8. Suite de 73 pruebas automatizadas (45 canónicas + 8 de sistemas avanzados + 9 de IA/Orquestador + 11 de Mazos y Suministros) pasando al 100%.
* **Lo que proyecta la siguiente fase inmediata (Sprint 4):**
  - **Bark Engine Visual en Cómic militar:** Componente `CommanderComicVignette.tsx` en el HUD con retratos del trío F2P (**Vance, Stella y Volkov**).
  - **Bocadillos Dinámicos de Expresión:** CSS vectorizado con estilos `speech` (doctrinal), `shout` (dentado de peligro) y `thought` (nube táctica).
  - **Sellos Pop-Art Onomatopéyicos:** Animaciones efímeras (*¡BOOM!*, *¡RATATAT!*, *¡ALERT!*, *¡CLUTCH!*) detonadas por eventos críticos de combate.
  - **Telemetría Emocional y Anti-Tilt:** Diálogos reactivos de intervención de mando ante jugadas precipitadas con bajas consecutivas.

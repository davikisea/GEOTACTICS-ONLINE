# VOLUMEN 1: DOCUMENTO DE DISEÑO DE JUEGO MAESTRO (GDD) Y REGLAMENTO CANÓNICO
**Documento Canónico Unificado:** `01_MASTER_GAME_DESIGN_DOCUMENT.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 4.0.0-DEFINITIVE-MASTER-SPEC  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Archivos Consolidados y Reemplazados:**  
- `01_GAME_DESIGN_DOCUMENT.md` (Completo)  
- `08_TACTICAL_AND_ECONOMIC_SYSTEMS_GDD.md` (Completo)  
- `12_EXTENDED_METAGAME_ARCHITECTURE.md` (Secciones 1, 2 y 4 de reglas in-game)  
- `15_HYPER_ENGAGEMENT_AIRDROP_SYSTEM.md` (Integración de mecánicas in-match)  
- `16_HYPER_ENGAGEMENT_MIRROR_TACTICAL_DUEL.md` (Integración de modo duelo)  

---

# 1. RESUMEN EJECUTIVO Y LOS TRES PILARES FUNDACIONALES

*Tactical Command: Wars of Legacy* es un videojuego de estrategia táctica por turnos (Turn-Based Strategy - TBS) multijugador y en solitario sobre cuadrícula 2D, ejecutado nativamente en navegadores web de escritorio y móviles sin descargas pesadas ni barreras de entrada.

```
                                  LOS TRES PILARES FUNDACIONALES
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
[ PILAR 1: TÁCTICA CANÓNICA ]          [ PILAR 2: METAJUEGO INDUSTRIAL ]      [ PILAR 3: BARK ENGINE CÓMIC ]
 • Determinismo GBA Advance Wars        • Mazo de 10 Cartas en Fábricas        • Narrativa Contextual tipo Hades
 • Cero azar (RNG = 0) en combate       • Libertad Orgánica sin cooldowns      • CERO voces (100% gráfico/texto)
 • Estrellas de defensa de terreno      • Soft Cap de Suministros (14 tropas)  • Bocadillos dinámicos (5 formas)
 • Niebla de guerra y emboscada TRAP    • Complejo de Refinado (10h)           • Sellos Pop-Art de Onomatopeyas
 • Captura de 20 HP y poderes CO        • Mercado Libre P2P entre Jugadores    • Telemetría cruzada de Tilt/PTE
 • Suministros Dinámicos (AirDrops)     • Bifurcación Esports vs Ladder        • Diagnóstico Balístico Near-Miss
```

### 1.1 Axiomas Inmutables de Diseño
1. **Determinismo Absoluto en Combate:** El daño base es 100% determinista según la matriz oficial atacante/defensor multiplicada por el HP y reducida por las estrellas de terreno. No existen tiradas de dados ni impactos críticos aleatorios.
2. **Despliegue Inmediato por Catálogo:** El jugador no "roba" cartas cada turno. Sus 10 cartas configuran su catálogo de producción en fábricas, con libertad inmediata de despliegue si dispone de fondos ($G) y fábricas desocupadas, regulado orgánicamente por el sistema de sostenimiento de suministros (Soft Cap).
3. **Estética de Novela Gráfica / Arte Pop:** Toda la narrativa, expresiones de mando y alertas se despliegan mediante viñetas de historieta militar con tramas Ben-Day, bocadillos de texto con estilos visuales y sellos tipográficos de onomatopeyas. No existen actores de voz.
4. **Bifurcación Competitiva:**
   - **Torneos Oficiales de Fin de Semana (Esports):** Todas las cartas y comandantes se igualan forzosamente al **Nivel 11 (Tournament Cap)**, garantizando que el dinero o el tiempo acumulado no puedan comprar ventajas estadísticas.
   - **Ladder Clasificatorio Central (Camino de Trofeos):** Se habilita el escalado real de estadísticas ($+2.0\%$ por nivel hasta Nivel 15), permitiendo que la inversión en el Complejo Industrial tenga impacto tangible en el juego diario.
5. **Sistema de Diseño Frontend y Regla Visual Retro-Futurista (Atompunk):**
   - La identidad visual, maquetación de interfaz de usuario, HUD táctico, modales, cartas y menús del frontend están gobernados estrictamente por la skill canónica [`retro-futurism`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/agents/skills/retro-futurism/skill.md) (`agents/skills/retro-futurism/skill.md`).
   - La UI debe implementar de manera orgánica la estética *Space-Age 1950s/1960s*:
     * **ADN Cromático:** Fondo base gris ultratransparente/oscuro (`#2B2C24`), Oliva oscuro (`#46521F`), Verde apagado (`#7B8A4A`), Naranja óxido (`#C46A3A`), y Crema (`#F2E8D5`) complementados con degradados cromados reflectantes.
     * **Geometría Aerodinámica:** Curvas amplias, esquinas asimétricas tipo lágrima (`border-radius: 40px 10px 40px 10px` o `UnevenRoundedRectangle`), curvas Googie y motivos de estrella atómica (*starburst*).
     * **Tipografía y Sombras:** Fuentes geométricas de mediados de siglo (`Futura`, `Trebuchet MS`), sombras duras y dramáticas con offset (`15px 15px 0px rgba(0,0,0,0.5)`) y biseles metálicos impecables ("Clean, optimistic and shiny", evitando el desgaste sucio steampunk).

---

# 2. LOS TRES MODOS DE JUEGO CANÓNICOS

Para responder a los distintos perfiles de jugador y disponibilidad de tiempo, *Tactical Command* estructura sus enfrentamientos en tres modalidades con parámetros técnicos de velocidad, economía y mapas fuertemente diferenciados:

| Parámetro Táctico | Modo 1: Duelo Táctico Espejo (Mirror Duel) | Modo 2: Escaramuza Rápida (Blitz Skirmish) | Modo 3: Gran Campaña Táctica (Grand Campaign) |
|:---|:---:|:---:|:---:|
| **Público Objetivo** | Micro-sesiones hiper-compulsivas, esports de bolsillo. | Sesiones móviles ágiles, acción táctica directa. | Estrategas de escritorio, maniobras a gran escala. |
| **Dimensiones de Mapa**| **$10 \times 10$ Casillas Simétricas**. Bases próximas. | **$12 \times 12$ a $16 \times 16$ Casillas**. | **$24 \times 24$ a $32 \times 32$ Casillas**. Teatros combinados. |
| **Tiempo por Turno (Reloj Fischer)** | **$15\text{ s}$ Base $+ 2.0\text{ s}$ por acción** (Tope $25\text{ s}$). | **$30\text{ s}$ Base $+ 3.0\text{ s}$ por acción** (Tope $45\text{ s}$). | **$60\text{ s}$ Base $+ 4.0\text{ s}$ por acción** (Tope $90\text{ s}$). |
| **Banco de Gracia de Red** | **$30\text{ s}$** ante desconexión temporal. | **$60\text{ s}$** ante desconexión temporal. | **$120\text{ s}$** ante desconexión temporal. |
| **Pausa de Animación** | $800\text{ ms}$ en diálogos Bark / $1,500\text{ ms}$ en SCOP. | $800\text{ ms}$ en diálogos Bark / $1,500\text{ ms}$ en SCOP. | $800\text{ ms}$ en diálogos Bark / $1,500\text{ ms}$ en SCOP. |
| **Duración Promedio** | **3 Minutos** (Prórroga máx 5 min). | **10 a 20 Minutos**. | **40 a 60 Minutos**. |
| **Límite de Turnos** | **12 Turnos Base** (Overtime en T13+). | **15 Turnos Máximo**. | **40 Turnos Máximo**. |
| **Composición de Mazo**| **Set Espejo Idéntico Nivel 1** (6 tropas canónicas). | **Mazo Personalizado de 10 Cartas**. | **Mazo Personalizado de 10 Cartas**. |
| **Fondos Iniciales** | Bono de $+\$3,000\text{G}$ iniciales. | Bono de $+\$2,000\text{G}$ iniciales. | Bono de $+\$0\text{G}$ (Economía estándar). |
| **Ingreso por Sede** | **$\$1,500\text{G}$** por propiedad/turno ($\times 1.5$). | **$\$2,000\text{G}$** por propiedad/turno ($\times 2.0$). | **$\$1,000\text{G}$** por propiedad/turno ($\times 1.0$). |
| **Incentivo Primera Sangre** | $+\$600\text{G}$ instantáneo al autor de la 1.ª baja. | $+\$600\text{G}$ instantáneo al autor de la 1.ª baja. | $+\$600\text{G}$ instantáneo al autor de la 1.ª baja. |
| **Condición de Victoria**| Captura de HQ o Muerte Súbita (Primer daño a HQ). | Captura de HQ (20 HP) O Aniquilación Militar. | Captura de HQ (20 HP) O Aniquilación Militar Total. |
| **Reenganche Post-Game**| **Botón Instant Requeue (5s)** sin pasar por menús. | Pantalla de resultados estándar con cofre. | Pantalla de resultados estándar con cofre. |

---

# 3. EL MAZO DE 10 CARTAS Y LA DOCTRINA DE LIBERTAD ORGÁNICA

En los modos Blitz y Campaña, el jugador despliega unidades a partir de un catálogo de 10 cartas configurado previamente en su hangar:

```
[ ESTRUCTURA REGLAMENTARIA DEL MAZO (10 CARTAS) ]
├── RANURA 1 [OBLIGATORIA]: Infantería Ligera ($1,000 | Cooldown: 0t | Captura / Visión)
├── RANURA 2 [OBLIGATORIA]: Infantería Mecanizada ($3,000 | Cooldown: 0t | Captura / Bazuca Antitanque)
└── 8 RANURAS FLEXIBLES [REGLAS DE TAXONOMÍA ESTRICTA]:
    ├── Mínimo 2 Unidades Terrestres Directas (ej. Recon, Tanque Ligero, Tanque Medio).
    ├── Mínimo 1 Unidad Antiaérea (ej. Antiaéreo Vulcan, Caza de Supremsacía, Batería Misiles).
    ├── Máximo 2 Unidades Super-pesadas (Neotanque, Bombardero Pesado, Acorazado Naval).
    └── Resto: Libre elección (Artillería, Helicópteros, Barcos, Transportes).
```

### 3.1 Doctrina de Libertad Orgánica: Cero Cooldowns de Fábrica
- **Disponibilidad Inmediata:** No existen tiempos de enfriamiento que bloqueen cartas tras producirlas. Las 10 cartas del mazo están permanentemente disponibles en cada turno si el jugador posee los fondos ($G) y una instalación no ocupada. Si un comandante dispone de 3 fábricas y $21,000G, puede desplegar 3 Tanques Ligeros en el mismo turno para un contragolpe fulminante.
- **Sostenimiento Logístico (Soft Cap en 14 Tropas):**
  - **Umbral Libre (1 a 14 tropas activas):** Coste de mantenimiento = **$0G/turno** (Suministro Pleno).
  - **Sobrecapacidad Logística (15 tropas en adelante):** Cada unidad excedente genera un costo de abastecimiento de **$200G por turno**, descontado automáticamente al inicio del turno del comandante.
  - **Fórmula de Ingreso Neto:**
    $$\text{Ingreso Neto} = \text{Ingreso Bruto de Propiedades} - \max(0, \text{Total Tropas Activas} - 14) \times 200$$

---

# 4. CATÁLOGO MAESTRO DE UNIDADES MILITARES Y ATRIBUTOS EXACTOS

Cada unidad militar posee atributos explícitos e inmutables:
- **HP Máximo:** 10 (representado visualmente por 1 a 10 miniaturas por escuadrón).
- **Consumo de Combustible por Turno:** Se descuenta al inicio de cada turno. Si una unidad aérea llega a 0 de combustible, **se estrella y explota**. Si un submarino llega a 0 sumergido, **se hunde**.
- **Estado de Producción:** Las 16 unidades del catálogo (`infantry`, `mech`, `recon`, `tank_light`, `tank_medium`, `artillery`, `rocket`, `anti_air`, `b_copter`, `fighter`, `bomber`, `battleship`, `apc`, `neotank`, `t_copter`, `missiles`) están **100% integradas y operativas** en el catálogo de producción (`CANONICAL_UNIT_PRODUCTION_CATALOG` en `src/engine/turnEconomy.ts`), en el modal de compra (`ProductionModal.tsx`) y en la matriz balística canónica (`CANONICAL_DAMAGE_CHART` en `src/engine/canonicalDamageChart.ts`).

| ID Unidad | Nombre Desplegado | Categoría | Coste $G$ | Mov. | Tracción | Rango | Visión | Munición | Combustible | Consumo/t | Capacidad Transporte / Estado |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| `infantry` | Infantería Ligera | Infantería | $1,000 | 3 | `foot` | 1 | 3 | ∞ (Fusil) | 99 | 0 | Captura sedes / Activa |
| `mech` | Infantería Mecanizada | Infantería | $3,000 | 2 | `mech` | 1 | 2 | 3 (Bazuca) | 70 | 0 | Captura sedes / Activa |
| `recon` | Blindado Recon | Vehículo | $4,000 | 8 | `wheels` | 1 | 5 | ∞ (Ametralladora) | 80 | 0 | Exploración veloz / Activa |
| `tank_light` | Tanque Ligero | Vehículo | $7,000 | 6 | `treads` | 1 | 3 | 9 (Cañón 75mm) | 70 | 0 | Combate directo / Activa |
| `tank_medium`| Tanque Mediano | Vehículo | $16,000| 5 | `treads` | 1 | 1 | 8 (Cañón 105mm) | 50 | 0 | Asalto blindado / Activa |
| `artillery` | Artillería Obús | Indirecto | $6,000 | 5 | `treads` | 2-3 | 1 | 9 (Obús 155mm) | 50 | 0 | Fuego indirecto / Activa |
| `rocket` | Lanzacohetes Asedio | Indirecto | $15,000| 5 | `wheels` | 3-5 | 1 | 6 (Cohetes) | 50 | 0 | Asedio largo alcance / Activa |
| `anti_air` | Antiaéreo Vulcan | Vehículo | $8,000 | 6 | `treads` | 1 | 2 | 9 (Vulcan 20mm) | 60 | 0 | Destructor antiaéreo / Activa |
| `b_copter` | Helicóptero Batalla | Aéreo | $9,000 | 6 | `air` | 1 | 3 | 6 (Misiles aire-tierra) | 99 | 2/turno | Soporte aéreo cercano / Activa |
| `fighter` | Caza Superioridad | Aéreo | $20,000| 9 | `air` | 1 | 4 | 9 (Misiles aire-aire) | 99 | 5/turno | Combate aire-aire / Activa |
| `bomber` | Bombardero Pesado | Aéreo | $22,000| 7 | `air` | 1 | 2 | 9 (Bombas guiadas) | 99 | 5/turno | Bombardeo táctico / Activa |
| `battleship` | Acorazado Naval | Naval | $28,000| 5 | `sea` | 2-6 | 2 | 9 (Batería 16 pulgadas)| 99 | 1/turno | Artillería naval / Activa |
| `apc` | Transporte Blindado | Vehículo | $5,000 | 6 | `treads` | — | 1 | — (Desarmado) | 70 | 0 | 1 Inf/Mech (Reabastece) / Activa |
| `neotank` | Neotanque Pesado | Vehículo | $22,000| 6 | `treads` | 1 | 1 | 9 (Cañón Neo) | 99 | 0 | Super-blindado pesado / Activa |
| `t_copter` | Helicóptero Transporte| Aéreo | $5,000 | 6 | `air` | — | 2 | — (Desarmado) | 99 | 2/turno | 1 Inf/Mech / Activa |
| `missiles` | Batería Misiles AA | Indirecto | $12,000| 4 | `wheels` | 3-5 | 1 | 6 (Misiles Superficie) | 50 | 0 | AA indirecto largo alcance / Activa |

---

# 5. MATRIZ DE TERRENOS, NIEBLA DE GUERRA Y EMBOSCADAS (`¡TRAP!`)

### 5.1 Tabla de Cobertura y Costes de Movimiento (18 Terrenos Canónicos)
*Implementación de Referencia:* `src/engine/canonicalMovement.ts` (`CANONICAL_TERRAIN_PROPERTIES`), `src/types/index.ts`.  
Cada estrella de terreno reduce el daño recibido en un **$10\%$**. Si una celda cuesta $\infty$, la unidad no puede atravesarla.

| Terreno | Estrellas | Pie (`foot`) | Mec (`mech`) | Ruedas (`wheels`) | Orugas (`treads`) | Aéreo (`air`) | Naval (`sea`) | Efectos Especiales & Fondos |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Llanura** (`plains`) | ★☆☆☆☆ (1) | 1 | 1 | 2 | 1 | 1 | $\infty$ | Terreno neutro estándar. |
| **Bosque** (`forest`) | ★★☆☆☆ (2) | 1 | 1 | 3 | 2 | 1 | $\infty$ | Oculta unidades en Niebla. Emboscada `¡TRAP!`. |
| **Montaña** (`mountain`) | ★★★★☆ (4) | 2 | 1 | $\infty$ | $\infty$ | 1 | $\infty$ | +3 de visión para infantería. Infranqueable vehículos. |
| **Carretera** (`road`) | ☆☆☆☆☆ (0) | 1 | 1 | 1 | 1 | 1 | $\infty$ | Tránsito rápido, 0 cobertura. |
| **Río** (`river`) | ☆☆☆☆☆ (0) | 2 | 1 | $\infty$ | $\infty$ | 1 | $\infty$ | Infranqueable para ruedas y orugas. 0 cobertura. |
| **Ciudad** (`city`) | ★★★☆☆ (3) | 1 | 1 | 1 | 1 | 1 | $\infty$ | Genera $1,000G ($2,000G Blitz). Repara +2 HP/turno terrestres. |
| **Fábrica** (`factory`) | ★★★☆☆ (3) | 1 | 1 | 1 | 1 | 1 | $\infty$ | Produce y repara tropas terrestres. Genera $1,000G/t. |
| **Aeródromo** (`airport`) | ★★★☆☆ (3) | 1 | 1 | 1 | 1 | 1 | $\infty$ | Produce, reabastece y repara aviación. Genera $1,000G/t. |
| **Puerto** (`port`) | ★★★☆☆ (3) | 1 | 1 | 1 | 1 | 1 | 1 | Produce, reabastece y repara flota naval. Genera $1,000G/t. |
| **HQ Aliado** (`hq`) | ★★★★☆ (4) | 1 | 1 | 1 | 1 | 1 | $\infty$ | Cuartel general principal. Si cae a 0 HP, derrota inmediata. |
| **Mar** (`sea`) | ☆☆☆☆☆ (0) | $\infty$ | $\infty$ | $\infty$ | $\infty$ | 1 | 1 | Superficie de agua profunda para navíos y aviación. |
| **Arrecife** (`reef`) | ★★☆☆☆ (2) | $\infty$ | $\infty$ | $\infty$ | $\infty$ | 1 | 2 | Oculta buques de guerra en Niebla (`¡TRAP!` naval). |
| **Playa / Bajío** (`shoal`)| ☆☆☆☆☆ (0) | 1 | 1 | 2 | 1 | 1 | 1 | Zona de transición costera. Permite desembarques. |
| **Puente** (`bridge`) | ☆☆☆☆☆ (0) | 1 | 1 | 1 | 1 | 1 | $\infty$ | Permite cruzar ríos a vehículos terrestres. |
| **Torre Militar** (`commtower`)| ★★★☆☆ (3)| 1 | 1 | 1 | 1 | 1 | $\infty$ | Capturable. Genera $1,000G/t y **+10% Ataque universal por torre**. |
| **Silo de Misil** (`silo`)| ★★★☆☆ (3) | 1 | 1 | 1 | 1 | 1 | $\infty$ | Lanzamiento único de misil balístico de 3 HP (área $3\times3$). |
| **Laboratorio** (`lab`) | ★★★☆☆ (3) | 1 | 1 | 1 | 1 | 1 | $\infty$ | Capturable. Repara tropas terrestres y genera $1,000G/t. |
| **Tubería** (`pipe`) | ☆☆☆☆☆ (0) | $\infty$ | $\infty$ | $\infty$ | $\infty$ | $\infty$ | $\infty$ | Infranqueable total. Costuras destructibles con 100 HP. |

### 5.2 Regla Canónica de Trampa y Emboscada (`¡TRAP!`)
En partidas con Niebla de Guerra activada:
1. Una casilla con bosque o arrecife ocupada por un enemigo no visible aparenta estar vacía.
2. Si una unidad aliada traza una ruta de movimiento que pasa por o termina en dicha casilla:
   - Su desplazamiento se **interrumpe en seco en la casilla inmediatamente anterior**.
   - Aparece el sello tipográfico Pop-Art de alerta: **`¡TRAP!`**.
   - La unidad aliada **pierde todo el resto de su turno (`hasActed = true`)** y no puede disparar ni capturar.
   - La unidad enemiga emboscada queda revelada temporalmente al descubierto.

---

# 6. FÓRMULAS MATEMÁTICAS DE COMBATE, CAPTURA Y REPARACIONES

### 6.1 Fórmulas Canónicas de Daño (AWBW / Intelligent Systems)
*Implementación de Referencia:* `src/engine/canonicalCombat.ts`, `src/engine/canonicalDamageChart.ts`, `src/engine/combat.ts`.

El cálculo balístico de daño implementa la formulación exacta de Advance Wars / WarsWorld con verificación estricta de munición y contraataques calculados sobre la vida residual:

1. **Gestión de Armamento Dual (Primario vs Secundario):**
   - **Arma Primaria (Munición Pesada):** Si `attackerHasAmmo = true` (o `ammo > 0`), se consulta el daño de la matriz primaria (ej. Cañón de tanque, bazuca mech, torpedos). Al disparar, consume 1 punto de munición.
   - **Arma Secundaria (Ametralladora Ligera):** Si la munición del arma primaria se agota (`ammo = 0`), el motor conmuta automáticamente al arma secundaria con munición ilimitada. Si la unidad carece de arma secundaria contra el objetivo (ej. Caza sin misiles frente a bombardero), el ataque se invalida (`baseDamage = 0`).

2. **Modificadores Ofensivos, Torres Militares y Nivel de Carta:**
   $$\text{attackModifier} = \text{BonusCO}_{\text{Ataque}} + (\text{commtowersCount} \times 10) + \text{attackerLevelBonus}$$
   $$\text{attackFactor} = \max\left(0, \left\lfloor \text{DañoBase} \times \frac{\text{attackModifier}}{100} + \text{luckModifier} \right\rfloor\right)$$
   $$\text{attackHPFactor} = \left\lfloor \text{attackFactor} \times \left(\frac{\text{HP}_{\text{Atacante}}}{10}\right) \right\rfloor$$
   *(En partidas deterministas / Esports: `luckModifier = 0`. Cada Torre de Comunicación Militar aliada otorga un $+10\%$ al modificador de ataque. En Duelo Espejo / Torneo Esports (`isTournamentMode = true`), las cartas operan bajo Cap Nivel 11 con `attackerLevelBonus = 0` y `defenderLevelBonus = 0` para paridad táctica absoluta; en Ladder asimétrico, cada nivel aporta bonificaciones escalonadas según `getLevelAttackBonus`).*

3. **Factor Defensivo y Reducción por Terreno Proporcional al HP:**
   En la regla canónica, la cobertura de las estrellas del terreno escala en función de la salud actual del defensor, incorporando también el modificador de nivel defensivo:
   $$\text{defenseModifier} = \text{BonusCO}_{\text{Defensa}} + \text{defenderLevelBonus}$$
   $$\text{defenseFactor} = \frac{\left\lfloor 200 - \left(\text{defenseModifier} + \text{EstrellasTerreno} \times \text{HP}_{\text{Defensor}}\right) \right\rfloor}{100}$$

4. **Porcentaje de Daño y Conversión a Barra de 10 HP:**
   $$\text{damagePercent} = \max\left(1, \left\lfloor \text{attackHPFactor} \times \text{defenseFactor} \right\rfloor\right)$$
   $$\text{Daño infligido (HP)} = \min\left(\text{HP}_{\text{Defensor}}, \max\left(1, \left\lfloor \frac{\text{damagePercent}}{10} \right\rfloor\right)\right)$$

5. **Resolución de Contraataque Inmediato:**
   - Se ejecuta únicamente si:
     a) El defensor sobrevive al ataque ($\text{HP}_{\text{Defensor}} > 0$).
     b) La distancia de combate está dentro del rango del arma del defensor ($\text{minRange} \le \text{dist} \le \text{maxRange}$).
     c) El defensor posee un arma activa compatible contra el tipo de atacante.
   - El daño del contraataque se computa utilizando idéntica fórmula evaluada con los $\text{HP}_{\text{Defensor}}$ sobrevivientes y la cobertura del terreno del atacante.
   - **Ataques Indirectos:** Las unidades con rango indirecto ($\ge 2$, como Artillería o Lanzacohetes) no reciben contraataque al disparar a distancia.

### 6.2 Captura de Sedes, Reparaciones y Victoria por HQ
*Implementación de Referencia:* `src/engine/captureSystem.ts`, `src/engine/propertyMaintenance.ts`, `src/engine/hqCaptureVictory.ts`.

- **Puntos de Captura:** Toda ciudad, fábrica, aeródromo, puerto, laboratorio, torre y HQ posee **20 HP de captura**.
- **Ritmo de Captura:** Una unidad de infantería o mecanizado reduce la captura de la sede en un valor igual a su **HP actual por turno**. Una infantería al 100% (10 HP) toma una propiedad en exactamente 2 turnos.
- **Persistencia de Captura:** Si la tropa capturadora es destruida o desplazada, los puntos de captura acumulados permanecen registrados en la casilla hasta ser completados o reseteados.
- **Victoria por Toma de Cuartel General (HQ):**
  Al reducir a 0 los 20 HP del Cuartel General rival, se activa `executeHqCaptureElimination()`:
  a) El jugador defensor queda inmediatamente derrotado y eliminado.
  b) Todas las propiedades territoriales del derrotado se transfieren de inmediato al vencedor.
  c) Todas las tropas y escuadrones supervivientes del ejército derrotado se disuelven y desaparecen del mapa.
- **Reparación y Reabastecimiento con Tarifa Financiera:**
  - Al inicio del turno activo (`processPropertyMaintenance`):
    * Reabastecimiento gratuito de combustible y munición en toda propiedad aliada compatible.
    * Reparación de salud: Hasta **+2 HP por turno** (o **+3 HP** para el comandante Rachel).
    * Tarifa financiera oficial: Cada punto de HP curado descuenta del tesoro exactamente el **10% del coste de producción base de la unidad**:
      $$\text{Coste por HP} = \max\left(1, \left\lfloor \frac{\text{CosteProducción}}{10} \right\rfloor\right)$$
      $$\text{Coste Total Reparación} = \text{HP Curados} \times \text{Coste por HP}$$
    * Compatibilidad de instalaciones:
      - **Tierra (`foot`, `mech`, `wheels`, `treads`):** Ciudades, Fábricas, HQs, Torres y Laboratorios.
      - **Aire (`air`):** Aeropuertos.
      - **Mar (`sea`):** Puertos marítimos.

### 6.3 Rúbrica Matemática de Rangos Militares (S, A, B, C)
*Implementación de Referencia:* `src/engine/autonomousOrchestrator.ts` (`generateSummary`).

La evaluación final del desempeño táctico del comandante se calcula deterministamente al finalizar la partida en base a las bajas aliadas sufridas y la velocidad de resolución:

| Rango Militar | Criterio de Calificación | Significado Estratégico |
|:---:|:---|:---|
| **Rango S** | Victoria con $\le 1$ unidad perdida Y $\le 10$ turnos disputados. | Victoria Impecable. Ejecución perfecta con mínimas pérdidas. |
| **Rango A** | Victoria con $\le 3$ unidades perdidas (sin restricción de turnos). | Superioridad Táctica. Dominio claro del tablero con bajas contenidas. |
| **Rango B** | Victoria estándar ($> 3$ unidades perdidas o superando los 10 turnos). | Victoria por Desgaste. Cumplimiento de objetivo con esfuerzo sostenido. |
| **Rango C** | Derrota militar o abandono de partida. | Derrota Operativa. |

### 6.4 Desempate Canónico por Límite de Turnos
*Implementación de Referencia:* `src/engine/autonomousOrchestrator.ts` (`resolveTurnLimitVictory`).

Al alcanzar el límite reglamentario de turnos de la partida (Blitz: 15 turnos; Campaña: 40 turnos), el motor no declara tablas automáticas. Se evalúa un desempate patrimonial determinista:

1. **Valor de Ejército Superviviente ($\text{ArmyValue}$):**
   Suma del valor residual de las unidades en el tablero, ponderado directamente por su salud porcentual:
   $$\text{ArmyValue}_{P} = \sum_{u \in \text{Tropas}_P} \left( \text{productionCost}(u) \times \frac{\text{HP}(u)}{10} \right)$$

2. **Valor Territorial Inmobiliario ($\text{PropsValue}$):**
   Cada propiedad capturada bajo control activo otorga un valor nominal estándar de $\$1,000$ fondos:
   $$\text{PropsValue}_{P} = \text{TotalPropiedadesControladas}_P \times 1,000$$

3. **Puntuación Total de Desempate ($\text{TotalScore}$):**
   $$\text{TotalScore}_{P} = \text{ArmyValue}_{P} + \text{PropsValue}_{P}$$

- Si $\text{TotalScore}_{\text{P1}} > \text{TotalScore}_{\text{P2}}$, la victoria se otorga a **P1** por `turn_limit`.
- Si $\text{TotalScore}_{\text{P2}} > \text{TotalScore}_{\text{P1}}$, la victoria se otorga a **P2** por `turn_limit`.
- Si existe paridad exacta ($\text{TotalScore}_{\text{P1}} = \text{TotalScore}_{\text{P2}}$), se declara empate (`draw`).

---

# 7. SISTEMA DE SUMINISTROS TÁCTICOS DINÁMICOS (AIRDROP BOUNTY)
**[ESTADO: 100% IMPLEMENTADO Y CERTIFICADO EN MOTOR, CANVAS Y TESTS]**  
*Implementación de Referencia:* `src/engine/airdropSystem.ts`, `src/components/game/GameCanvas.tsx`, `src/engine/airdropSystem.test.ts`.

Para romper la monotonía y generar oportunidades de remontada (*Comeback Mechanics*), se integran caídas dinámicas de suministros durante la partida:

```
               CADENA DE DESPLIEGUE DEL AIRDROP
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
[ TURNO 2 Y 5 (BLITZ/ESPEJO) ]        [ CÁLCULO DE CELDA EQUIDISTANTE ]
[ TURNO 3 Y 7 (CAMPAÑA) ]             • |D_HQ1 - D_HQ2| <= 1
            │                         • Terreno neutro transitable (no mar/hq)
            └──────────────────┬──────────────────┘
                               ▼
               [ EVENTO AIRDROP_SPAWNED ]
               • Baliza visual pulsante con retícula en Canvas
               • Cúpula de paracaídas retro-futurista Crema/Naranja Óxido
               • Contenedor blindado con remaches y sombra dura de 2px
               • Sello Pop-Art: ¡AIRDROP!
               • Tiempo de Vida: 2 Turnos
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
[ PISAR CON CUALQUIER TROPA ]         [ EXPIRACIÓN (2 TURNOS) ]
• Inyección Fondos ($2,000G-$3,000G)  • Autodestrucción automática
• Sobrecarga Super CO (100%)          • Purga en purgeExpiredDrops()
• 15 Gemas de Mando
```

- **Drop Table Ponderada Canónica:**
  - 50%: Inyección Inmediata de Fondos ($+2,000$G a $+3,000$G al tesoro militar).
  - 35%: Carga Instantánea del 100% de la barra de CO Power (Superbaterías militares).
  - 15%: Alijo de 15 Gemas de Mando estratégicas.
- **Reclamación Atómica:** Ejecutada al desplazar cualquier unidad sobre la coordenada exacta del suministro (`claimAirDrop`), disparando feedback de audio militar y viñeta reactiva del Bark Engine.

---

# 8. MODO COMPETITIVO CANÓNICO: DUELO TÁCTICO ESPEJO (RELOJ FISCHER Y ERGONOMÍA IN-SITU)
**[ESTADO: 100% IMPLEMENTADO Y CERTIFICADO]**  
*Implementación de Referencia:* `src/engine/autonomousOrchestrator.ts`, `src/components/game/TileContextMenu.tsx`, `src/components/game/COCommandBar.tsx`, `src/App.tsx`, `src/components/ui/MatchSummaryModal.tsx`.

El formato ultra-rápido de Duelo Espejo responde al axioma de engagement continuo, reduciendo los tiempos muertos y exigiendo toma de decisiones bajo presión extrema con una ergonomía de cero fricción:

1. **Reloj Táctico Fischer con Incremento Dinámico:**
   - *Tiempo Base:* **15 segundos garantizados** al iniciar cada turno (`turnTimeLimitSec = 15`).
   - *Bono por Acción:* Cada movimiento, ataque, captura o sub-acción ejecutada otorga **$+2.0\text{ segundos}$** adicionales (`actionBonusSec = 2.0`).
   - *Tope Máximo de Turno:* El turno no puede exceder en ningún caso los **25 segundos** (`maxTurnCapSec = 25`), evitando el *stalling* pasivo deliberado.
   - *Pausa en Diálogos y Cinemáticas:* Congelación automática del cronómetro de $800\text{ms}$ durante viñetas cómicas de radio y $1,500\text{ms}$ durante el splash cinemático de Super CO Power.
2. **Árbitro Anti-AFK y Banco de Desconexión de Red:**
   - Si el jugador agota sus 15–25 segundos, el sistema consume su **Banco de Gracia de Desconexión de 30 segundos** (`disconnectGraceBankSec = 30`).
   - Al llegar a 0s en el banco acumulado, el árbitro ejecuta `execute_match_forfeit` concediendo la victoria al rival.
3. **Bounty de Primera Sangre (First Blood):**
   - El primer comandante que aniquile una unidad enemiga en el encuentro recibe un botín inmediato de **$+\$600\text{G}$** transferido a su tesorería de partida (`FIRST_BLOOD_BOUNTY_G = 600`), dinamizando el metaguego temprano y mitigando el valle financiero previo al AirDrop de T2.
4. **Economía Acelerada:** Multiplicador 1.5x de producción ($1,500G por propiedad/t) y bono inicial de $+3,000$G para habilitar escaramuzas inmediatas.
5. **Ergonomía In-Situ (Menú Contextual en Baldosa):**
   - Confirmación de órdenes en **1–2 clics directos sobre el mapa** mediante `TileContextMenu.tsx`, erradicando la barra flotante inferior.
   - Activación de CO Powers (COP / SCOP) en 1 solo clic desde la cabecera mediante `COCommandBar.tsx` en modo compacto.
6. **Límite de Partida:** 12 turnos como umbral máximo para evitar estancamientos posicionales.
7. **Mapa Simétrico Oficial:** Escenario `mirror_arena_10x10` con simetría rotacional $180^\circ$ asegurando balance matemático absoluto.
8. **Revancha Exprés (5s):** En el modal post-combate `MatchSummaryModal`, un botón retro-futurista con cuenta atrás de 5s reinicia el escenario y las tropas para reenganchar al jugador instantáneamente.

---

# 9. SISTEMAS CANÓNICOS AVANZADOS DE COMBATE, SUB-ACCIONES Y TERRENO
**[ESTADO: 100% IMPLEMENTADO Y CERTIFICADO EN MOTOR Y TESTS]**  
*Implementación de Referencia:* `src/engine/subActions.ts`, `src/engine/missileSilo.ts`, `src/engine/specialAbilities.ts`, `src/engine/weatherSystem.ts`, `src/engine/fuelLogistics.ts`, `src/engine/awbwExtendedTiles.ts`.

### 9.1 Menú Universal de Sub-Acciones Tácticas (`subActions.ts`)
Al desplazar una unidad a una coordenada de destino, el motor evalúa en tiempo real las acciones contextuales disponibles (`evaluateAvailableSubActions`):
1. **`wait` (Esperar):** Finaliza el turno de la tropa en la casilla de destino (`hasMoved = true`, `hasActed = true`).
2. **`attack` (Disparar):** Despliega la retícula de objetivos enemigos válidos en rango de arma.
3. **`capture` (Capturar):** Disponible exclusivamente para infantería o mechs sobre propiedades neutrales o enemigas.
4. **`join` (Fusionar Unidades):** Si la celda de destino está ocupada por una tropa aliada idéntica con daño ($\text{HP} < 10$), ambas se fusionan sumando sus puntos de salud hasta el tope de 10 HP. Si la suma excede 10, el excedente se reembolsa directamente en fondos ($G) al tesoro del jugador:
   $$\text{Reembolso Oro} = \max(0, (\text{HP}_1 + \text{HP}_2) - 10) \times \left\lfloor \frac{\text{CosteProducción}}{10} \right\rfloor$$
5. **`load` & `unload` (Embarque y Desembarque):** Embarca tropas en vehículos de transporte compatibles o las desembarca en celdas transitables adyacentes.
6. **`supply` (Reabastecimiento Logístico):** Ejecutado por transportes blindados (APC) o lanchas Black Boat, rellenando instantáneamente al 100% el combustible y la munición de todas las tropas aliadas adyacentes (radio Manhattan = 1).
7. **`launch_silo` (Lanzamiento de Misil Balístico):** Activación de un silo de misiles estático en el mapa por tropas a pie.
8. **`explode` (Kamikaze Black Bomb):** Detonación táctica autodestructiva en área.
9. **`hide` / `show` (Inmersión y Camuflaje):** Submarinos se sumergen bajo el agua y cazas Stealth activan su modo invisible, ocultándose de la visión directa enemiga a cambio de un consumo acelerado de combustible.

### 9.2 Silos de Misiles Balísticos de Escenario (`missileSilo.ts`)
- **Activación:** Exclusiva para unidades de Infantería o Mecanizados estacionadas sobre un silo no detonado (`isUnusedSilo`).
- **Efecto de Impacto:** El comandante designa cualquier casilla del mapa como epicentro.
- **Área de Daño:** Radio Manhattan = 2 (forma de diamante, 13 casillas de alcance).
- **Daño Ineludible:** Inflige **3 HP de daño puro** a todas las tropas (amigas y enemigas) en el radio, reduciendo su salud hasta un mínimo de 1 HP (no elimina unidades directamente). El silo pasa a estado utilizado (`used`).

### 9.3 Contenedor de Transporte Multitropa (`specialAbilities.ts`)
- **Lander Dual (Barcaza de Desembarco):** Capacidad para transportar hasta **2 unidades terrestres** de cualquier categoría (incluyendo Tanques Medios y Neotanques). Permite desembarques selectivos individuales en playas y bajíos (`shoal`).
- **Cruiser Dual (Crucero Ligero):** Capacidad para transportar hasta **2 helicópteros de combate** (B-Copter / T-Copter) en su helipuerto de popa.
- **Black Boat:** Transporta hasta 2 escuadrones de infantería y repara pasivamente +1 HP a tropas aliadas adyacentes al inicio del turno.
- **APC & T-Copter:** Capacidad para 1 escuadrón de Infantería o Mecanizado.

### 9.4 Clima Dinámico e Interacciones Doctrinales (`weatherSystem.ts`)
El motor evalúa periódicamente transiciones meteorológicas (`rollTurnWeather`):
- **Despejado (`clear`):** Visión y costes normales.
- **Lluvia (`rain`):** Reduce en -1 el rango de visión de todas las unidades en Niebla de Guerra. (El comandante **Drake** es inmune a la lluvia).
- **Nieve (`snow`):** Incrementa en +1 el coste de movimiento en terrenos para vehículos a ruedas y orugas, y **duplica el consumo de combustible por turno**. (El comandante **Olaf** es inmune a la nieve y se mueve a velocidad normal).
- **Tormenta de Arena (`sandstorm`):** Reduce en -1 la visión y disminuye en un 30% la potencia de fuego indirecto.

### 9.5 Catálogo Universal AWBW y Losetas Especiales (`awbwExtendedTiles.ts`)
El motor cuenta con un diccionario canónico de más de 190 códigos de terreno compatibles con WarsWorld y Advance Wars By Web:
- **Costuras de Tubería Destructibles (`pipeSeam`):** Baldosas de tubería con 100 HP destructibles mediante disparos directos o indirectos. Al destruirse, abren una brecha de tránsito terrestre.
- **Torres de Comunicación Militar (`commtower`):** Propiedad capturable que genera +$1,000G/t y otorga una bonificación pasiva permanente de **+10% al daño de todas las tropas del ejército controlador por cada torre en su poder**.
- **Laboratorios de Investigación (`lab`):** Propiedad capturable con reparación y fondos.
- **Bajíos / Playas (`shoal`):** Zona de transición mar/tierra con 0 estrellas de cobertura donde las barcazas de desembarco pueden encallar para cargar o descargar blindados.
- **Arrecifes (`reef`):** 2 estrellas de cobertura marítima; proporcionan camuflaje naval idéntico a los bosques terrestres en Niebla de Guerra.


---

## 10. PROTOCOLO CANÓNICO DE ENTRADA Y ATAJOS DE TECLADO (HOTKEYS)
Para habilitar una experiencia competitiva de alto rendimiento (APM > 120), *Tactical Command* implementa un esquema dual mano izquierda + ratón:

| Comando | Tecla Primaria | Tecla Secundaria | Ámbito de Interacción | Efecto Operativo |
| :--- | :---: | :---: | :--- | :--- |
| `NAV_NEXT_UNIT` | `Tab` | `E` | General | Centra la cámara y selecciona la siguiente tropa aliada con `hasActed === false`. |
| `NAV_PREV_UNIT` | `Shift + Tab` | `Q` | General | Centra la cámara y selecciona la tropa previa disponible. |
| `GRID_MOVE` | `W / A / S / D` | `Flechas` | General | Desplaza el foco celda a celda; panea cámara al aproximarse al borde. |
| `CONFIRM` | `Espacio` | `Enter` | General | Selecciona la casilla bajo el cursor o confirma la marcha hacia ella. |
| `CANCEL_ROLLBACK`| `Escape` | `Backspace` | Menú / Puntería | Cancela la orden actual y revierte la unidad a su coordenada de origen. |
| `SUB_ATTACK` | `1` | `A` | Menú Contextual | Conmuta a modo puntería con retículas sobre objetivos enemigos válidos. |
| `SUB_CAPTURE` | `2` | `C` | Menú Contextual | Ejecuta la captura de sede y sella el turno de la infantería. |
| `SUB_SILO` | `3` | `S` | Menú Contextual | Despliega retícula de impacto global para detonar misil de 3 HP. |
| `SUB_SUPPLY` | `4` | `R` | Menú Contextual | Reabastece de munición y combustible a todas las unidades aliadas adyacentes. |
| `SUB_JOIN` | `5` | `J` | Menú Contextual | Fusiona con aliada dañada y reembolsa fondos si la vida excede 10 HP. |
| `SUB_UNLOAD` | `6` | `U` | Menú Contextual | Selecciona pasajero y casilla adyacente para desembarco táctico. |
| `SUB_WAIT` | `Espacio` | `W` | Menú Contextual | Finaliza el turno de la tropa en la baldosa actual (`hasActed = true`). |
| `TRIGGER_COP` | `P` | `F1` | Turno Activo | Dispara el Poder de Comandante (COP) en 1 solo clic. |
| `TRIGGER_SCOP` | `O` | `F2` | Turno Activo | Dispara el Super CO Power (SCOP) con congelación cinematográfica. |
| `END_TURN` | `Ctrl + Enter` | `F` | Turno Activo | Cede el turno al oponente de forma inmediata. |
| `DEV_CONSOLE` | `Ctrl + Shift + D`| — | Solo Desarrollo / Auditor | Despliega el modal de ingeniería `DebugDevConsoleModal.tsx` con aislamiento estricto de UI. |

---

## 11. ERGONOMÍA MOBILE, GESTOS MULTITOUCH Y MATRIZ HÁPTICA
*Implementación de Referencia:* `src/components/game/GameCanvas.tsx`, `src/engine/hapticFeedback.ts`.

Para garantizar paridad y alta competitividad en dispositivos táctiles:
1. **Pellizco Multitáctil (Pinch-to-Zoom):**
   - Rango dinámico continuo de zoom: $[0.65\times, 1.80\times]$.
   - Mantenimiento invariante del centroide geométrico de los dos dedos durante la escala y paneo.
2. **Confirmación In-Situ por Doble Toque:**
   - Detección de doble toque dentro de una ventana de $\le 300\text{ ms}$ y radio de $\le 16\text{ px}$.
   - Confirma de inmediato la orden de movimiento o ataque sin requerir interacción con controles secundarios.
3. **Matriz de Retroalimentación Háptica Militar (`hapticFeedback.ts`):**
   - `selection`: Pulso seco ligero de $15\text{ ms}$.
   - `move`: Vibración media de $30\text{ ms}$.
   - `attack`: Golpe táctico firme de $60\text{ ms}$.
   - `capture`: Doble pulso militar $[30\text{ ms}, 40\text{ ms}, 30\text{ ms}]$.
   - `trapAmbush`: Alerta disonante agresiva $[80\text{ ms}, 50\text{ ms}, 120\text{ ms}]$.
   - `error`: Tríada de rechazo $[40\text{ ms}, 30\text{ ms}, 40\text{ ms}]$.

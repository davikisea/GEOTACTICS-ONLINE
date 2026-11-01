# DOCUMENTO DE DISEÑO DE JUEGO MAESTRO (GDD): TACTICAL COMMAND
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 3.0.0-DEFINITIVE-MASTER-SPEC  
**Estado:** Documento de Verdad Absoluta (Premisa: *Lo que no está escrito aquí, no existe en el juego*).  
**Pila Tecnológica:** TypeScript, Next.js (React 19), HTML5 Canvas 2D / WebGL 60 FPS, Web Audio API (solo SFX procedurales), Supabase PostgreSQL 15+, Vercel Edge.

---

# 1. RESUMEN EJECUTIVO Y LOS TRES PILARES MAESTROS

*Tactical Command: Wars of Legacy* es un videojuego de estrategia táctica por turnos (TBS) multijugador y en solitario sobre cuadrícula 2D, ejecutado nativamente en navegadores web de escritorio y móviles sin descargas pesadas.

```
                                  LOS TRES PILARES FUNDACIONALES
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
[ PILAR 1: TÁCTICA CANÓNICA ]          [ PILAR 2: METAJUEGO EQUITATIVO ]      [ PILAR 3: BARK ENGINE CÓMIC ]
 • Determinismo GBA Advance Wars        • Mazo de 10 Cartas en Fábricas        • Narrativa Contextual tipo Hades
 • Cero azar (RNG = 0) en combate       • Mazo de 10 Cartas en Fábricas        • CERO voces (100% gráfico/texto)
 • Estrellas de defensa de terreno      • CERO Cooldowns (Libertad Orgánica)   • Bocadillos dinámicos (5 formas)
 • Niebla de guerra y emboscada TRAP    • Soft Cap de Suministros (14 tropas)  • Sellos Pop-Art de Onomatopeyas
 • Captura de 20 HP y poderes CO        • Cap de Torneo forzoso Nivel 11       • Telemetría cruzada de Tilt/PTE
```

### 1.1 Premisa de Diseño: Lo que no se menciona, no existe
1. **No existe azar en el combate:** El daño base es 100% determinista según la tabla oficial atacante/defensor multiplicada por el HP y reducida por las estrellas de terreno. No hay tiradas de dados ni impactos críticos aleatorios.
2. **No existe robo aleatorio ni cooldowns artificiales en partida:** El jugador no "roba" cartas cada turno. Sus 10 cartas configuran su catálogo de producción en fábricas, con libertad inmediata de despliegue si dispone de fondos ($G) y fábricas desocupadas, regulado orgánicamente por el sistema de sostenimiento de suministros (Soft Cap).
3. **No existen voces grabadas ni actores de voz:** Toda la narrativa del Bark Engine se despliega mediante viñetas de historieta militar, bocadillos de texto con estilos visuales y sellos tipográficos de onomatopeyas Pop-Art.
4. **No existe Pay-to-Win:** En cualquier enfrentamiento de Liga Clasificatoria (Ranked), Torneos y Guerras de Clanes, todas las cartas y comandantes se igualan automáticamente al **Nivel 11 (Tournament Cap)**.

---

# 2. MODOS DE JUEGO Y REGLAS DE TIEMPO

El juego implementa dos modalidades de partida fuertemente diferenciadas en ritmo, economía y escala:

| Parámetro Táctico | Modo 1: Escaramuza Rápida (Blitz Skirmish) | Modo 2: Campaña Táctica (Grand Campaign) |
|:---|:---:|:---:|
| **Público Objetivo** | Sesiones móviles ágiles, acción táctica directa. | Estrategas de escritorio, maniobras a gran escala. |
| **Dimensiones de Mapa** | $12 \times 12$ a $16 \times 16$ casillas. Bases próximas. | $24 \times 24$ a $32 \times 32$ casillas. Teatros combinados. |
| **Tiempo por Turno** | **30 segundos** estrictos por jugador. | **60 segundos** de planificación táctica profunda. |
| **Fondos Iniciales** | Duplicados (+100% de fondos iniciales). | Estándar (Escasez inicial de apertura). |
| **Ingreso por Propiedad** | **$2,000G** por propiedad/turno ($\times 2$). | **$1,000G** por propiedad/turno ($\times 1$). |
| **Multiplicador Cooldowns** | **$0.5\times$** (Recargas aceleradas al 50%). | **$1.0\times$** (Enfriamiento completo estándar). |
| **Límite de Turnos** | **12 a 15 turnos máximo**. | **40 turnos máximo**. |
| **Condición de Victoria** | Captura de HQ (20 HP) O aniquilación. En turno límite: mayor valor militar + sedes. | Captura de HQ (20 HP) O aniquilación militar total. |

---

# 3. EL MAZO DE 10 CARTAS Y EL SISTEMA DE DESPLIEGUE EN FÁBRICAS

En partida, el jugador únicamente puede producir las 10 unidades que configuró en su mazo antes de iniciar el enfrentamiento. 

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

### 3.1 Doctrina de Libertad Orgánica: Cero Cooldowns y Suministros Militares (Soft Cap)
* **CERO Cooldowns Artificiales (Despliegue Inmediato):** No existen tiempos de enfriamiento que bloqueen cartas tras producirlas. Las 10 cartas del mazo están permanentemente disponibles en cada turno si el jugador posee los fondos ($G) y una instalación no ocupada. Si un comandante dispone de 3 fábricas y $21,000G, puede desplegar 3 Tanques en el mismo turno para un contragolpe fulminante (máxima agencia y gratificación táctica).
* **Capacidad de Suministros Militares (Soft Cap en 14 Tropas):**
  - En lugar de imponer un tope rígido con bloqueos frustrantes, se aplica una regla orgánica de sostenimiento logístico:
    * **Umbral Libre (1 a 14 tropas):** Mantenimiento logístico = **$0G/turno** (Suministro Pleno).
    * **Sobrecapacidad Logística (15 tropas en adelante):** Cada unidad excedente genera un costo de abastecimiento logístico de **$200G por turno**, descontado automáticamente al inicio del turno del comandante.
    * *Ejemplo:* Un ejército de 17 unidades (3 de exceso) paga $600G de mantenimiento logístico por turno.
  - Esto desincentiva de forma natural el spam masivo e infinito de infantería barata sin quitarle jamás el control ni la libertad al jugador.

---

# 4. CATÁLOGO COMPLETO DE 16 UNIDADES Y ATRIBUTOS NUMÉRICOS EXACTOS

Cada unidad militar posee atributos explícitos e inmutables:
- **HP Máximo:** 10 (representado visualmente por 1 a 10 miniaturas por escuadrón).
- **Consumo de Combustible por Turno:** Se resta al inicio de cada turno. Si una unidad aérea se queda con 0 de combustible, **se estrella y explota de inmediato**. Si un submarino se queda sin combustible sumergido, **se hunde y es destruido**.

| ID Unidad | Nombre Desplegado | Categoría | Coste $G | Mov. | Tracción | Rango | Visión | Munición | Combustible | Consumo/t | Capacidad Transporte |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `infantry` | Infantería Ligera | Infantería | $1,000 | 3 | `foot` | 1 | 3 | ∞ (Fusil) | 99 | 0 | Ninguna |
| `mech` | Infantería Mecanizada | Infantería | $3,000 | 2 | `mech` | 1 | 2 | 3 (Bazuca) | 70 | 0 | Ninguna |
| `recon` | Blindado Recon | Vehículo | $4,000 | 8 | `wheels` | 1 | 5 | ∞ (Ametralladora) | 80 | 0 | Ninguna |
| `apc` | Transporte Blindado | Vehículo | $5,000 | 6 | `treads` | — | 1 | — (Desarmado) | 70 | 0 | 1 Infantería/Mech (Suministra) |
| `tank_light` | Tanque Ligero | Vehículo | $7,000 | 6 | `treads` | 1 | 3 | 9 (Cañón 75mm) | 70 | 0 | Ninguna |
| `tank_medium`| Tanque Mediano | Vehículo | $16,000| 5 | `treads` | 1 | 1 | 8 (Cañón 105mm) | 50 | 0 | Ninguna |
| `neotank` | Neotanque Pesado | Vehículo | $22,000| 6 | `treads` | 1 | 1 | 9 (Cañón Neo) | 99 | 0 | Ninguna |
| `artillery` | Artillería Obús | Indirecto | $6,000 | 5 | `treads` | 2-3 | 1 | 9 (Obús 155mm) | 50 | 0 | Ninguna (Mover o disparar) |
| `rocket` | Lanzacohetes Asedio | Indirecto | $15,000| 5 | `wheels` | 3-5 | 1 | 6 (Cohetes) | 50 | 0 | Ninguna (Mover o disparar) |
| `anti_air` | Antiaéreo Vulcan | Vehículo | $8,000 | 6 | `treads` | 1 | 2 | 9 (Vulcan 20mm) | 60 | 0 | Ninguna |
| `missiles` | Batería Misiles AA | Indirecto | $12,000| 4 | `wheels` | 3-5 | 1 | 6 (Misiles Superficie) | 50 | 0 | Exclusivo antiaéreo indirecto |
| `b_copter` | Helicóptero Batalla | Aéreo | $9,000 | 6 | `air` | 1 | 3 | 6 (Misiles aire-tierra) | 99 | 2/turno | Ninguna |
| `t_copter` | Helicóptero Transporte| Aéreo | $5,000 | 6 | `air` | — | 2 | — (Desarmado) | 99 | 2/turno | 1 Infantería/Mech |
| `fighter` | Caza Superioridad | Aéreo | $20,000| 9 | `air` | 1 | 4 | 9 (Misiles aire-aire) | 99 | 5/turno | Exclusivo combate aire-aire |
| `bomber` | Bombardero Pesado | Aéreo | $22,000| 7 | `air` | 1 | 2 | 9 (Bombas guiadas) | 99 | 5/turno | Exclusivo aire-tierra/mar |
| `battleship` | Acorazado Naval | Naval | $28,000| 5 | `sea` | 2-6 | 2 | 9 (Batería 16 pulgadas)| 99 | 1/turno | Artillería naval estratégica |

---

# 5. MATRIZ DE TERRENO, COSTES DE MOVIMIENTO Y MECÁNICAS DE NIEBLA

### 5.1 Tabla de Cobertura y Costes de Movimiento
Cada estrella de defensa reduce el daño recibido en un **10%**. Si una celda cuesta $\infty$, la unidad no puede atravesarla bajo ninguna circunstancia.

| Terreno | Estrellas | Pie (`foot`) | Mec (`mech`) | Ruedas (`wheels`) | Orugas (`treads`) | Aéreo (`air`) | Naval (`sea`) | Efectos Especiales |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Llanura** | ★☆☆☆☆ (1) | 1 | 1 | 2 | 1 | 1 | $\infty$ | Terreno neutro estándar. |
| **Bosque** | ★★☆☆☆ (2) | 1 | 1 | 3 | 2 | 1 | $\infty$ | Oculta unidades en Niebla. Visible solo por adyacencia (distancia 1). |
| **Montaña** | ★★★★☆ (4) | 2 | 1 | $\infty$ | $\infty$ | 1 | $\infty$ | 40% reducción daño. Otorga +3 casillas de visión a infantería. |
| **Carretera** | ☆☆☆☆☆ (0) | 1 | 1 | 1 | 1 | 1 | $\infty$ | Máxima velocidad terrestre, 0 estrellas defensivas. |
| **Río** | ☆☆☆☆☆ (0) | 2 | 1 | $\infty$ | $\infty$ | 1 | $\infty$ | Infranqueable para vehículos. 0 defensa. |
| **Ciudad** | ★★★☆☆ (3) | 1 | 1 | 1 | 1 | 1 | $\infty$ | Genera $1000G ($2000G en Blitz). Repara +2 HP/turno terrestres. |
| **Fábrica** | ★★★☆☆ (3) | 1 | 1 | 1 | 1 | 1 | $\infty$ | Produce y repara tropas terrestres aliadas. |
| **Aeródromo**| ★★★☆☆ (3) | 1 | 1 | 1 | 1 | 1 | $\infty$ | Produce, reabastece y repara aviación aliada. |
| **Puerto** | ★★★☆☆ (3) | 1 | 1 | 1 | 1 | 1 | 1 | Produce, reabastece y repara flota naval aliada. |
| **HQ Aliado**| ★★★★☆ (4) | 1 | 1 | 1 | 1 | 1 | $\infty$ | Cuartel general principal. Si cae a 0 de captura, derrota inmediata. |
| **Mar** | ☆☆☆☆☆ (0) | $\infty$ | $\infty$ | $\infty$ | $\infty$ | 1 | 1 | Superficie de agua profunda para navíos. |
| **Arrecife** | ★★☆☆☆ (2) | $\infty$ | $\infty$ | $\infty$ | $\infty$ | 1 | 2 | Oculta buques de guerra en Niebla (equivalente a bosque marítimo). |

### 5.2 Regla Canónica de Trampa y Emboscada (TRAP / Ambush)
En partidas con Niebla de Guerra activada:
1. Una casilla con bosque o arrecife ocupada por un enemigo no visible aparenta estar vacía.
2. Si una unidad aliada traza una ruta de movimiento que pasa por o termina en dicha casilla:
   - Su desplazamiento se **interrumpe en seco en la casilla inmediatamente anterior**.
   - Aparece el sello tipográfico Pop-Art de alerta: **`¡TRAP!`**.
   - La unidad aliada **pierde todo el resto de su turno (`hasActed = true`)** y no puede disparar ni capturar.
   - La unidad enemiga emboscada queda revelada temporalmente al descubierto.

---

# 6. FÓRMULAS DE COMBATE, CAPTURA Y LOGÍSTICA

### 6.1 Fórmula Matemática Canónica de Combate
$$\text{Daño Base} = \text{Tabla}(\text{Atacante}, \text{Defensor})$$
$$\text{Poder Ofensivo} = \text{Daño Base} \times \left(\frac{\text{HP}_{\text{Atacante}}}{10}\right) \times \left(1 + \text{BonusCO}_{\text{Ataque}}\right)$$
$$\text{Reducción Defensiva} = 1 - \left(\text{EstrellasTerreno} \times 0.10 + \text{BonusCO}_{\text{Defensa}}\right)$$
$$\text{Daño Final} = \max\left(1, \lfloor \text{Poder Ofensivo} \times \text{Reducción Defensiva} \rfloor\right)$$

* **Contraataque Inmediato:** Si el combate es directo (Rango 1) y el defensor sobrevive ($\text{HP}_{\text{Remanente}} > 0$), el defensor contraataca instantáneamente calculando su poder ofensivo con sus puntos de vida supervivientes.
* **Fuego Indirecto (Rango $\ge 2$):** La artillería, lanzamisiles y acorazados no pueden moverse y disparar en el mismo turno. Sus ataques a distancia **nunca reciben contraataque**.

### 6.2 Captura de Sedes y Reparaciones con Descuento Financiero
- **Puntos de Captura:** Toda ciudad, fábrica y HQ posee **20 HP de captura**.
- **Ritmo de Captura:** Una unidad de infantería o mecanizado reduce la captura de la sede en un valor igual a su **HP actual por turno**. Una infantería al 100% (10 HP) toma una ciudad neutral en exactamente 2 turnos.
- **Persistencia de Captura:** Si la unidad capturadora es atacada o se retira, los puntos de captura acumulados **permanecen grabados** en la celda hasta que el defensor los repare o capture a su favor.
- **Reparación y Reabastecimiento en Sedes Aliadas:** Toda unidad estacionada en una propiedad compatible de su bando (terrestres en ciudad/fábrica/HQ, aviación en aeropuerto, navíos en puerto):
  - Recibe **reabastecimiento gratuito al 100%** de combustible y munición pesada.
  - Recupera hasta **+2 HP por turno** (+3 HP si el Comandante es Rachel).
  - La curación **no es gratuita**: descuenta automáticamente del tesoro del jugador el coste proporcional por cada punto de vida restaurado:
    $$\text{Coste por HP} = \left\lfloor \frac{\text{Coste de Producción de la Unidad}}{10} \right\rfloor$$
  - Si el tesoro no dispone de fondos suficientes, la unidad repara únicamente los puntos de vida que el saldo disponible pueda solventar.

### 6.3 Logística Canónica de Combustible, Crash Aéreo y Hundimiento Naval
- **Consumo Diario de Combustible:** Se aplica al inicio de cada turno según la naturaleza de la unidad:
  - *Aviación Estándar (Cazas, Bombarderos):* **5 unidades de combustible/turno**.
  - *Helicópteros (B-Copter, T-Copter):* **2 unidades de combustible/turno**.
  - *Cazas Furtivos (Stealth) en modo oculto:* **8 unidades de combustible/turno**.
  - *Navíos de Superficie:* **1 unidad de combustible/turno**.
  - *Submarinos en Inmersión:* **5 unidades de combustible/turno**.
  - *Bonificación Eagle:* Reduce el consumo de combustible de todas las aeronaves en **-2 unidades/turno** (mínimo 1).
  - *Penalización por Nieve:* Duplica el consumo de combustible en combate ártico ($2\times$).
- **Regla Fatal de Extinción de Combustible:**
  1. Si una unidad aérea agota su combustible en pleno vuelo ($0\text{ fuel}$), **se estrella de inmediato (Crash) y es destruida en el acto ($\text{HP} = 0$)**.
  2. Si un submarino agota su combustible en estado de inmersión ($0\text{ fuel}$), **se hunde en el abismo marino (Sink) y es destruido ($\text{HP} = 0$)**.
  3. Las tropas terrestres y barcos en superficie con 0 de combustible quedan **inmovilizados**, sin poder desplazarse hasta ser reabastecidos por un APC o en una sede aliada.

### 6.4 Victoria por Toma de Cuartel General y Transferencia de Propiedades
Al capturar los 20 HP del Cuartel General (HQ) enemigo:
1. **Derrota Inmediata:** Se decreta la eliminación del comandante derrotado.
2. **Transferencia Territorial Total:** Todas las ciudades, fábricas, puertos, aeropuertos y torres que pertenecían al rival **se transfieren instantáneamente bajo el control del jugador vencedor**.
3. **Disolución de Tropas:** Todas las unidades supervivientes del ejército derrotado son disueltas y retiradas del tablero.

### 6.5 Habilidades Especiales y Transporte Dual
- **Bomba Negra (`blackBomb`):** Arma autodestructiva que detona en un radio Manhattan 3 (25 casillas), causando **5 PV de daño directo** a todas las tropas circundantes sin destruirlas (regla de mínimo 1 HP).
- **Inmersión / Sigilo (`hide`/`show`):** Submarinos y cazas furtivos ocultan su posición del radar enemigo, forzando detección por adyacencia directa a cambio de un consumo acelerado de combustible.
- **Transportes Duales (2 Slots):** Barcazas Lander capaces de transportar simultáneamente **hasta 2 tanques medianos o neotanques**, y Cruceros ligeros capaces de transportar **hasta 2 helicópteros** con desembarque individual selectivo.
- **Costuras de Tubería (`pipeSeam`):** Puntos débiles destructibles de 100 HP incrustados en tuberías infranqueables, atacables por fuego directo o artillería para abrir pasos estratégicos.

---

# 7. SISTEMA DE COMANDANTES (COs) Y MEDIDORES DE PODER (LOS 28 COs DE WARSWORLD)

Cada jugador selecciona un Comandante al configurar su mazo. El medidor de poder se carga acumulando fondos de daño infringido y recibido:
- **Tasa de Conversión:** **$9,000G de valor militar = 1 Estrella de Poder**.
- **Carga Defensiva (Daño recibido):** 100% del valor de la unidad perdida ($\frac{\text{Coste}}{10} \times \text{Daño Recibido}$).
- **Carga Ofensiva (Daño infligido):** 50% del valor de la unidad enemiga impactada ($\frac{\text{Coste}}{10} \times \text{Daño Infligido} \times 0.5$).
- **Bonus Universal de Poder:** Durante el turno en que se activa un COP o SCOP, **todas las unidades aliadas reciben automáticamente +10% de ataque y +10% de defensa** de forma universal, además de los efectos particulares de cada comandante.

### 7.1 Catálogo Canónico Completo de los 28 Comandantes de WarsWorld

#### A. Orange Star (La Fuerza de la Libertad)
1. **Andy (El Mecánico Genio):** D2D equilibrado sin penalizaciones. COP *Hyper Repair* (3★: repara instantáneamente +2 HP a todo el ejército). SCOP *Hyper Upgrade* (6★: cura +5 HP a todos los aliados, +1 de movimiento y +20% de ataque).
2. **Sami (Comando de Fuerzas Especiales):** D2D: Infantería y Mecanizados tienen +30% de ataque y capturan a tasa acelerada de 1.5x. Blindados directos -10% ataque. COP *Double Time* (3★: +1 movimiento y +20% daño a infantería). SCOP *Victory March* (8★: +2 movimiento a tropas a pie y **CAPTURA INSTANTÁNEA de 20 HP en 1 turno**).
3. **Max (Fuerza Bruta Acorazada):** D2D: Combate directo blindado tiene +20% de ataque. Fuego indirecto sufre -10% de ataque y -1 rango de alcance. COP *Max Force* (3★: +1 de movilidad y +20% ataque directo). SCOP *Max Blast* (6★: +2 de movilidad y +40% de ataque brutal a blindados).
4. **Nell (La Dama de la Fortuna):** D2D: Suerte bélica bendecida (daño extra aleatorio entre 0 y +15%). COP *Lucky Star* (3★: críticos por suerte hasta +60%). SCOP *Lady Luck* (6★: impactos críticos devastadores de hasta +100% de daño).
5. **Hachi (Comerciante Legendario):** D2D: Suministros comerciales con -10% de coste en todas las unidades militares. COP *Barter* (3★: despliegue de unidades con -50% de coste). SCOP *Merchant Union* (5★: permite producir y desplegar unidades terrestres desde cualquier ciudad aliada).
6. **Jake (Comandante Urbano):** D2D: +10% de ataque en casillas de llanuras. COP *Beat Box* (3★: +1 movimiento de vehículos y +20% ataque en llanuras). SCOP *Block Rock* (6★: +2 movimiento de vehículos y +40% de ataque en llanuras).
7. **Rachel (Artillería Estratégica):** D2D: Reparación acelerada en propiedades (+3 HP/turno). COP *Lucky Lass* (3★: suerte hasta +40%). SCOP *Covering Fire* (6★: 3 misiles balísticos automáticos disparados sobre las 3 mayores concentraciones enemigas, causando 3 PV de daño por misil).

#### B. Blue Moon (La Alianza Boreal)
8. **Colin (El Joven Magnate):** D2D: Descuento del 20% en costes de producción de todas las unidades; a cambio sus unidades tienen -10% de ataque. COP *Gold Rush* (2★: multiplica los fondos del tesoro por 1.5x). SCOP *Power of Money* (6★: otorga +1% de ataque a todo el ejército por cada 300G en el tesoro).
9. **Grit (Tirador de Élite a Distancia):** D2D: Artillería, lanzacohetes y misiles ganan +1 de alcance y +20% de ataque; unidades de combate directo sufren -20% de ataque. COP *Snipe Attack* (3★: +1 rango adicional y +30% daño indirecto). SCOP *Super Snipe* (6★: +2 rango adicional y +30% daño indirecto).
10. **Olaf (El Señor del Invierno):** D2D: Inmune a penalizaciones de nieve (se desplaza con coste de despejado). En lluvia sufre penalización de nieve. COP *Blizzard* (3★: desata tormenta de nieve durante 1 turno ralentizando a rivales). SCOP *Winter Fury* (7★: ventisca ártica que causa 2 PV de daño a todos los enemigos y desata nieve).
11. **Sasha (La Heredera Diplomática):** D2D: Ingreso adicional de +100G por cada propiedad en cada turno. COP *Market Crash* (2★: drena el medidor de poder del oponente proporcional a los fondos en caja). SCOP *War Bonds* (6★: recolecta en fondos el 50% de todo el valor de daño infligido a enemigos).

#### C. Yellow Comet (El Imperio del Sol Naciente)
12. **Kanbei (El Emperador Samurai):** D2D: Honor militar absoluto: todas las unidades tienen +20% de ataque y +20% de defensa de base, pero cuestan +20% más de producción. COP *Morale Boost* (4★: +40% ataque y +30% defensa). SCOP *Samurai Spirit* (7★: +40% ataque, +30% defensa y duplica el daño de todos los contraataques).
13. **Sonja (Estratega Silenciosa):** D2D: +1 casilla de visión en niebla de guerra, oculta el HP exacto de sus tropas al rival y sus contraataques infligen +50% de daño extra. COP *Enhanced Vision* (3★: +1 visión y penetra visión dentro de bosques/arrecifes). SCOP *Counter Break* (5★: contraataque preventivo antes de recibir el golpe enemigo).
14. **Sensei (Comandante Paracaidista):** D2D: Helicópteros de combate +50% de ataque; tropas a pie +40% de ataque; vehículos y navíos -10% de ataque. COP *Copter Command* (2★: helicópteros +1 mov y engendra paracaidistas 9 HP en todas las ciudades aliadas desocupadas). SCOP *Airborne Assault* (6★: helicópteros +2 mov y despliega tropas mecanizadas 9 HP en todas las ciudades vacías).
15. **Grimm (El Luchador Indomable):** D2D: Ataque temerario con +30% de daño en todas las unidades, pero sufren -20% de defensa. COP *Knuckleduster* (3★: +50% de daño total). SCOP *Haymaker* (6★: +80% de daño masivo total).

#### D. Green Earth (La Vanguardia Continental)
16. **Eagle (As de la Aviación):** D2D: Unidades aéreas tienen +20% de ataque y gastan -2 combustible por turno. COP *Lightning Drive* (3★: reactiva todas las aeronaves que ya actuaron este turno). SCOP *Lightning Strike* (9★: **REACTIVA A TODO EL EJÉRCITO ALIADO** para un segundo turno consecutivo completo).
17. **Drake (Lobo de Mar):** D2D: Navíos con +20% de defensa y +1 de movimiento. Inmune a penalizaciones de lluvia. COP *Tsunami* (4★: 1 PV de daño a todos los enemigos y -50% combustible). SCOP *Typhoon* (7★: 2 PV de daño a todos los enemigos, lluvia torrencial y -50% combustible).
18. **Jess (Especialista en Blindados):** D2D: Vehículos terrestres tienen +10% de ataque y +1 de movimiento; infantería, aire y mar -10% de ataque. COP *Turbo Charge* (3★: +1 movimiento de vehículos, +20% ataque y reabastecimiento total al 100%). SCOP *Overdrive* (6★: +2 de movimiento de vehículos, +40% ataque y recarga completa de munición y fuel).
19. **Javier (El Caballero Blindado):** D2D: Las torres de comunicación capturadas otorgan defensa adicional (+10% def y +20% def vs fuego indirecto por torre). COP *Tower Shield* (3★: duplica el bono de las torres). SCOP *Tower of Power* (6★: triplica el bono defensivo de las torres y añade +20% de ataque).

#### E. Black Hole (La Legión Oscura)
20. **Flak (Comandante Brutal):** D2D: Suerte caótica e impredecible (daño variable entre -10% y +25%). COP *Brute Force* (3★: golpes críticos hasta +50%). SCOP *Barbaric Blow* (6★: golpes demoledores hasta +90% de daño aleatorio).
21. **Lash (La Pequeña Genio Táctica):** D2D: Aprovechamiento del terreno: +10% de ataque por cada estrella de cobertura de la celda donde combate. COP *Terrain Tactics* (4★: coste de movimiento = 1 en todo terreno). SCOP *Prime Tactics* (7★: duplica las estrellas de defensa de las casillas y reduce costes de movimiento a 1).
22. **Adder (Comandante Víbora):** D2D: Velocidad y rotación rápida. COP *Sideslip* (2★: +1 movimiento para todo el ejército). SCOP *Sidewinder* (5★: +2 movimiento general y +20% de daño).
23. **Hawke (El Estratega Halcón):** D2D: Disciplina de acero: +10% de ataque permanente a todas las unidades. COP *Black Wave* (5★: drena 1 PV de todos los enemigos y regenera +1 HP a todos los aliados). SCOP *Black Storm* (9★: drena 2 PV de todos los enemigos del mapa y cura +2 HP a todas las unidades aliadas).
24. **Jugger (Cyborg de Combate):** D2D: Inestabilidad de procesamiento (-15% a +30% daño por suerte). COP *Overclock* (3★: suerte hasta +55%). SCOP *Crush* (7★: daño por golpe crítico hasta +95%).
25. **Koal (Maestro del Asfalto):** D2D: Guerra relámpago: +10% de ataque en carreteras y puentes. COP *Hungry March* (3★: +1 mov y +20% ataque en carreteras). SCOP *Trail of Woe* (5★: +2 mov y +30% ataque en carreteras).
26. **Kindle (La Baronesa Urbana):** D2D: +40% de ataque a tropas situadas en ciudades o cuarteles. COP *Urban Blight* (3★: 3 PV de daño instantáneo a todo enemigo situado en propiedades). SCOP *High Society* (6★: +3% de ataque por cada propiedad en posesión del jugador).
27. **Sturm (Comandante Supremo de Black Hole):** D2D: Movimiento perfecto: coste de desplazamiento = 1 en todo terreno (excepto mar); +20% de ataque y +20% de defensa universal. SCOP *Meteor Strike* (10★: convoca un meteoro colosal desde el espacio que arrasa un área diamante causando 8 PV de daño masivo a las unidades enemigas).
28. **Von Bolt (El Comandante Inmortal):** D2D: Regeneración biomecánica: +10% de ataque y +10% de defensa a todo el ejército. SCOP *Ex Machina* (10★: pulso electromagnético masivo que inflige 3 PV de daño a todos los enemigos y los paraliza, impidiéndoles actuar en el siguiente turno).

---

# 7.2 SISTEMAS TÁCTICOS AVANZADOS DE CAMPO DE BATALLA

### A. Flecha Dinámica de Trayectoria (Dynamic Pathing Arrow)
* **Algoritmo Canónico de Tramos:** El motor descompone la ruta en 15 tipos de segmentos visuales exactos:
  - *Inicio:* Punto de origen inmóvil (`od`), o inicio dirigido (`oe`, `ow`, `on`, `os`).
  - *Líneas Rectas:* Tramo horizontal este-oeste (`ew`), tramo vertical norte-sur (`ns`).
  - *Esquinas y Giros en L:* Giros canónicos en 90 grados (`ne`, `nw`, `se`, `sw`).
  - *Cabezas de Flecha:* Puntas orientadas según vector de llegada (`ed`, `wd`, `nd`, `sd`).
* **Interacción Dinámica:** Al arrastrar o hacer hover sobre el mapa:
  1. Si el cursor retrocede a una casilla previa del camino, la flecha se **rebobina instantáneamente** truncando los tramos posteriores.
  2. Si el cursor se desplaza a una casilla adyacente transitable y el presupuesto de movimiento lo permite, el tramo se **anexa dinámicamente**.
  3. Si se salta una distancia no ortogonal, el motor recalcula el camino óptimo vía A*.

### B. Evaluador de Sub-acciones Disponibles (Sub-Actions Engine)
Al alcanzar la casilla destino, el menú contextual filtra de forma determinista las acciones legales según el contexto:
1. `wait`: Siempre disponible para agotar el turno en la posición.
2. `attack`: Disponible si hay enemigos válidos dentro del alcance directo (adyacente) o indirecto (sin haberse movido).
3. `capture`: Disponible si es infantería o mecanizado situado sobre una propiedad no aliada (HQ, Ciudad, Fábrica, Puerto, Aeródromo, Torre de Comunicación, Laboratorio).
4. `launch_silo`: Disponible si es infantería o mecanizado situado sobre un Silo de Misiles sin disparar.
5. `join`: Disponible si la casilla de destino está ocupada por una unidad aliada del mismo tipo con daño (<10 HP). Se fusionan sumando HP.
6. `load`: Disponible si la casilla de destino contiene un transporte aliado compatible (Infantería en APC/T-Copter/Lander; Tanques en Lander).
7. `unload`: Disponible si el transporte contiene unidades y existe al menos una casilla adyacente transitable y desocupada.
8. `supply`: Disponible para vehículos de abastecimiento (APC) con unidades aliadas adyacentes necesitadas de munición o combustible.
9. `explode`: Disponible para unidades autodestructivas (Black Bomb / Bomba Sigilosa).
10. `hide` / `show`: Disponible para submarinos y cazas furtivos para sumergirse o emerger.
11. `delete`: Disponible únicamente si la unidad NO se ha movido este turno, permitiendo licenciarla y recuperar el 50% de sus fondos de producción.

### C. Silos de Misiles Balísticos (Missile Silos)
* **Condición de Lanzamiento:** Infantería o Mecanizado situado en la casilla de un silo no utilizado (`isUnusedSilo = true`).
* **Área de Impacto:** Diamante de radio Manhattan 2 (13 casillas en total) centrado en cualquier coordenada del tablero.
* **Daño:** Inflige exactamente **3 PV de daño directo** a todas las unidades dentro del radio (aliadas o enemigas).
* **Regla de Supervivencia Canónica:** El misil de silo **nunca destruye una unidad**; el daño está topado para dejar a las unidades afectadas con un mínimo de **1 HP**.
* **Persistencia:** Al ser detonado, el silo queda agotado permanentemente (`captureHp = 0`) y no puede ser vuelto a disparar en toda la partida.

### D. Sistema de Clima Canónico (Weather System)
* **Tipos de Clima:** `clear` (Despejado), `rain` (Lluvia), `snow` (Nieve), `sandstorm` (Tormenta de Arena).
* **Efectos:**
  - *Lluvia:* Reduce la visión en Niebla de Guerra en -1 casilla para todas las unidades terrestres y marítimas.
  - *Nieve:* Aumenta en +1 el coste de movimiento de terreno para ruedas y orugas, y duplica el consumo diario de combustible ($2\times$).
  - *Tormenta de Arena:* Reduce la potencia de fuego de las unidades de disparo indirecto en un **-30%**.
* **Inmunidades:** Olaf no sufre penalización de movimiento en nieve; Drake convierte lluvia en clima despejado.

### E. Rango de Amenaza Enemiga y Mapa de Calor (Enemy Threat Heat Map)
* **Cálculo de Amenaza Directa:** Para cada unidad enemiga de combate directo, calcula sus casillas accesibles mediante Dijkstra más las 4 casillas ortogonales de ataque adyacente.
* **Cálculo de Amenaza Indirecta:** Para cada unidad de asedio (Artillería, Cohetes, Acorazado), proyecta el anillo entre su `minRange` y `maxRange` respetando su zona ciega.
* **Mapa de Calor de Peligro:** Genera una matriz `heatMap[y][x]` donde cada coordenada registra el número de unidades enemigas capaces de disparar sobre esa posición. Permite colorear el HUD táctico en gradientes rojos de peligro y guía a la IA para evitar fuego cruzado.

---

# 8. BARK ENGINE VISUAL EN CÓMIC (ESTÉTICA 100% CÓMIC / CERO VOCES)

El Comandante activo no tiene archivos de voz. Se proyecta como una **viñeta de novela gráfica militar** en la interfaz con bocadillos dinámicos y sellos de onomatopeyas Pop-Art.

```
 ┌───────────────────────────────────────────────────────────────┐
 │  VIÑETA DEL COMANDANTE: MAYOR STELLA                          │
 │  ┌──────────────┐    /~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\  │
 │  │              │   |  ¡¿OTRA VEZ BOMBARDEIROS FRENTE A    |  │
 │  │   [RETRATO   │   <   TRES ANTIAÉREOS?! ¡¿ES QUE ACASO   |  │
 │  │    CÓMIC     │   |  QUIERES REGALARLES CHATARRA?!       |  │
 │  │   EXPRESIÓN: │    \__________________  _________________/  │
 │  │   SARCÁSTICA]│                       \/ [COLA DENTADA]     │
 │  └──────────────┘      ┌──────────────┐                       │
 │      ★★★★★             │  ¡¡KABOOM!!  │ <- SELLO ONOMATOPEYA  │
 │   BOND NIVEL 6         └──────────────┘    ESTILO ARTE POP    │
 └───────────────────────────────────────────────────────────────┘
```

### 8.1 Tipología Visual de Bocadillos (`bubble_shape`):
1. **`speech` (Estándar):** Óvalo blanco suave con reborde negro y cola curva. Utilizado para doctrina y órdenes normales.
2. **`shout` (Grito / Alarma):** Contorno dentado en zigzag con cola aguda. Utilizado al sufrir daños críticos en el HQ o activar SCOP.
3. **`thought` (Pensamiento):** Nube con círculos ascendentes. Utilizado por Volkov al analizar datos o esperar en emboscada.
4. **`whisper` (Sigilo):** Contorno de trazos discontinuos punteados. Utilizado al ocultarse en bosques en Niebla de Guerra.
5. **`radio` (Transmisión Militar):** Rectángulo técnico con estática y tipografía verde fósforo. Utilizado en la cola de matchmaking.

### 8.2 Sellos Tipográficos de Onomatopeyas Pop-Art:
Insignias visuales rotadas que aparecen con una animación de impacto pop sobre la viñeta:
* **`¡BOOM!`:** Disparos de obuses, cañones pesados y destrucción de unidades.
* **`¡RATATAT!`:** Ráfagas de ametralladoras y fuego antiaéreo.
* **`¡ALERT!`:** Detección de unidades enemigas en niebla o amenaza de captura de HQ.
* **`¡TRAP!`:** Interrupción de movimiento por emboscada en bosque/arrecife.
* **`¡CLUTCH!`:** Supervivencia milagrosa con el HQ a menos de 4 HP.

---

# 9. METAGAME, COFRES, PROGRESIÓN Y ESCALADO ÉTICO

### 9.1 Ciclo de 4 Ranuras de Cofres
Al vencer en una partida, el jugador recibe un cofre si tiene al menos 1 de sus 4 ranuras vacías:
- **Cofre de Madera:** 3 horas de desbloqueo (18 Gemas). Otorga $120-180$ Oro y 15 cartas comunes/raras.
- **Cofre de Hierro:** 8 horas de desbloqueo (48 Gemas). Otorga $350-500$ Oro y 45 cartas con épicas garantizadas.
- **Cofre Blindado (Titanio):** 12 horas de desbloqueo (72 Gemas). Otorga $800-1200$ Oro y 90 cartas con comandantes/legendarias.

### 9.2 Fórmula de Subida de Nivel y Cap de Torneo Nivel 11
$$\text{Stat Final} = \text{Stat Base} \times \left(1 + (\text{Nivel} - 1) \times 0.025\right)$$
- Una carta sube del Nivel 1 al Nivel 15 acumulando duplicados y Oro de Batalla. Cada nivel incrementa las estadísticas en un moderado **+2.5%** (frente al agresivo +10% de otros juegos).
- **Cap de Torneo Forzoso (Nivel 11):** En Ligas Clasificatorias (Ranked) y Torneos, todas las cartas y comandantes se igualan forzosamente al Nivel 11. Cero ventajas para jugadores veteranos o de pago.

### 9.3 Command Pass de 50 Niveles con Reclamación Retroactiva
- **Vía Gratuita:** 50 niveles con Oro, comodines de cartas, cofres básicos y sellos comunes de cómic.
- **Vía Premium:** Desbloquea un Comandante Exclusivo en Nivel 1, skins de bocadillos temáticos (ej. *Vintage Ben-Day*, *Manga Speed*), aspectos dorados de HQ y cola automática de apertura de cofres.
- **Reclamación Retroactiva:** Si un usuario avanza gratis hasta el Nivel 40 y compra el pase premium en ese momento, el sistema ejecuta el RPC `rpc_claim_retroactive_pass_rewards`, acreditando instantáneamente todas las recompensas premium del nivel 1 al 40.

---

# 10. PROTOCOLO DE RED, RELOJ ANTI-AFK Y MODO 2v2

### 10.1 Algoritmo de Reloj Dinámico Anti-AFK (Anti-Roping)
Si el temporizador de turno expira sin acciones del jugador:
1. **Turno 1 Inactivo:** El turno siguiente del jugador se reduce al **50% de su tiempo** (15s en Blitz / 30s en Campaña).
2. **Turno 2 Consecutivo Inactivo:** El turno se comprime a **10 segundos**.
3. **Turno 3 Consecutivo Inactivo:** Se decreta **Derrota por Abandono (AFK Forfeit)**, otorgando la victoria inmediata al rival.

### 10.2 Matchmaking por Ritmo de Juego (PTE)
$$PTE = \frac{\sum \text{Tiempo Usado en Turnos}}{\text{Total de Turnos Jugados en las Últimas 10 Partidas}}$$
- **Blitz:** PTE $\le 15$ segundos.
- **Estándar:** PTE de 16 a 35 segundos.
- **Analítico:** PTE de 36 a 60 segundos.
- El servidor empareja primero por Modo + Rango de Trofeos ($\pm 100$) + Misma categoría de PTE. Si transcurren más de 12s en cola, amplía la búsqueda a rangos adyacentes.

### 10.3 Modo Cooperativo 2v2 por Turnos Cruzados
- **Secuencia:** Jugador A1 $\rightarrow$ Jugador B1 $\rightarrow$ Jugador A2 $\rightarrow$ Jugador B2.
- **Economía Separada:** Cada comandante gestiona sus propios fondos generados por las propiedades que su infantería capture.
- **Pings Tácticos en Mapa:** Sistema de marcado en cuadrícula (`PING_ATTACK`, `PING_DEFEND`, `PING_MOVE`, `PING_ASSIST`) para coordinar maniobras con el aliado sin demoras.

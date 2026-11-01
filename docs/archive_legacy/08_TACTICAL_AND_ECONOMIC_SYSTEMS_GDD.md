# DOCUMENTO DE DISEÑO DE SISTEMAS TÁCTICOS, RPG Y ECONOMÍA (GDD)
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 1.0.0-SYSTEMS-DESIGN  
**Rol:** Lead Game Designer & Lead Economy Systems Designer  
**Objetivo:** Especificación matemática, matrices de daño y reglas económicas para la programación del motor de juego y la base de datos.

---

## 1. SISTEMAS Y CURVAS DE PROGRESIÓN RPG

El sistema de progresión recompensa la maestría estratégica sin otorgar ventajas estadísticas en combate (Cero Pay-to-Win).

### 1.1 Fórmula Matemática de Experiencia por Nivel
La cantidad de Puntos de Experiencia (XP) requerida para ascender del nivel $N$ al nivel $N+1$ se modela mediante una función potencial amortiguada:

$$\text{XP}_{\text{necesaria}}(N) = \left\lfloor 150 \times N^{1.85} \right\rfloor$$

$$\text{XP}_{\text{total\_acumulada}}(N) = \sum_{i=1}^{N-1} \left\lfloor 150 \times i^{1.85} \right\rfloor$$

#### Tabla de Hitos de Nivel (Niveles 1 al 25):

| Nivel ($N$) | XP para Siguiente Nivel | XP Acumulada | Desbloqueo Táctico / Cosmético Asociado |
|:---:|:---:|:---:|:---|
| **1** | 150 XP | 0 XP | **Loadout Básico:** Infantería, Recon, Tanque Ligero, Artillería |
| **2** | 541 XP | 150 XP | Desbloqueo: *Mecanizados (Bazuca)* + 200 Oro |
| **3** | 1,123 XP | 691 XP | Desbloqueo: *Vehículo Antiaéreo Vulcano* + 300 Oro |
| **4** | 1,883 XP | 1,814 XP | Desbloqueo: *Helicóptero de Ataque (B-Copter)* + Marco de Avatar "Recluta" |
| **5** | 2,813 XP | 3,697 XP | **Hito:** 25 Gemas + Skin Tanque Ligero "Camuflaje Desértico" |
| **6** | 3,907 XP | 6,510 XP | Desbloqueo: *Lanzamisiles de Asedio* + 500 Oro |
| **7** | 5,160 XP | 10,417 XP | Desbloqueo: *Tanque Mediano Blindado* |
| **8** | 6,569 XP | 15,577 XP | Skin Infantería "Fuerzas Urbanas" |
| **9** | 8,129 XP | 22,146 XP | Desbloqueo: *Caza de Intercepción Aérea* |
| **10** | 9,839 XP | 30,275 XP | **Hito:** 50 Gemas + Insignia de Perfil "Veterano Táctico" |
| **12** | 13,678 XP | 52,654 XP | Desbloqueo: *Bombardero Pesado* |
| **15** | 20,443 XP | 98,412 XP | **Hito:** Comandante Táctico "Garrison" (Afinidad Defensiva) |
| **20** | 34,228 XP | 224,960 XP | **Hito:** Skin Cuartel General "Base de Operaciones Ártica" + 100 Gemas |
| **25** | 51,204 XP | 425,780 XP | **Hito de Maestría:** Marco de Perfil Legendario "Gran Mariscal" |

---

### 1.2 Fórmula de Recompensa por Partida

La recompensa final se computa evaluando de manera objetiva el desempeño táctico en el tablero, previniendo exploits de estancamiento mediante un límite superior en los turnos computables:

$$\text{Puntaje Táctico} = \text{Base} + (\text{CiudadesCapturadas} \times A) + (\text{UnidadesDestruidas} \times B) + (\min(\text{Turnos}, 30) \times C)$$

Donde las constantes de calibración son:
- $\text{Base}_{\text{XP}} = 120$
- $A_{\text{Ciudades}} = 45 \text{ XP}$ por cada propiedad neutral o enemiga capturada
- $B_{\text{Bajas}} = 35 \text{ XP}$ por cada unidad enemiga eliminada por completo
- $C_{\text{Turnos}} = 6 \text{ XP}$ por turno completado (tope en 30 turnos para evitar partidas infinitas pactadas)

$$\text{Multiplicador de Victoria} = \begin{cases} 
2.2 & \text{si el jugador gana la partida (HQ capturado o ejército rival destruido)} \\ 
0.85 & \text{si el jugador es derrotado} \\
0.0 & \text{si el jugador deserta o abandona voluntariamente}
\end{cases}$$

$$\text{XP Otorgado} = \lfloor \text{Puntaje Táctico} \times \text{Multiplicador de Victoria} \rfloor$$

#### Fórmula de Oro de Batalla (Moneda Blanda - Gold):
$$\text{Oro Ganado} = \lfloor (60 + (\text{CiudadesCapturadas} \times 20) + (\text{UnidadesDestruidas} \times 15)) \times \text{Multiplicador de Victoria} \rfloor$$

---

## 2. MATRIZ DE COMBATE ESTILO ADVANCE WARS

### 2.1 Especificaciones de Atributos por Unidad (Catálogo de 16 Unidades)

| Unidad | Código | Categoría | Coste (G) | Movimiento | Tipo Mov. | Rango Atq | Visión | Munición | Combustible | Consumo/t | Capacidad Transporte |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Infantería** | `infantry` | Infantería | 1,000G | 3 | Pie (`foot`) | 1 | 3 | ∞ (Fusil) | 99 | 0 | Ninguna |
| **Mecanizado** | `mech` | Infantería | 3,000G | 2 | Mecánico (`mech`) | 1 | 2 | 3 (Bazuca) | 70 | 0 | Ninguna |
| **Recon** | `recon` | Vehículo Ligero | 4,000G | 8 | Ruedas (`wheels`) | 1 | 5 | ∞ (Ametralladora) | 80 | 0 | Ninguna |
| **Transporte APC** | `apc` | Vehículo Logístico| 5,000G | 6 | Orugas (`treads`) | — (Desarmado) | 1 | — | 70 | 0 | 1 Infantería/Mech (Suministra) |
| **Tanque Ligero** | `tank_light` | Blindado | 7,000G | 6 | Orugas (`treads`) | 1 | 3 | 9 (Cañón 75mm) | 70 | 0 | Ninguna |
| **Tanque Mediano** | `tank_medium`| Blindado | 16,000G | 5 | Orugas (`treads`) | 1 | 1 | 8 (Cañón 105mm) | 50 | 0 | Ninguna |
| **Neotanque** | `neotank` | Blindado Pesado | 22,000G | 6 | Orugas (`treads`) | 1 | 1 | 9 (Cañón Neo) | 99 | 0 | Ninguna |
| **Artillería** | `artillery` | Fuego Indirecto | 6,000G | 5 | Orugas (`treads`) | 2 - 3 | 1 | 9 (Obús 155mm) | 50 | 0 | Ninguna (Mover o disparar) |
| **Lanzacohetes** | `rocket` | Fuego Indirecto | 15,000G | 5 | Ruedas (`wheels`) | 3 - 5 | 1 | 6 (Cohetes Asedio)| 50 | 0 | Ninguna (Mover o disparar) |
| **Antiaéreo** | `anti_air` | Blindado Ligero | 8,000G | 6 | Orugas (`treads`) | 1 | 2 | 9 (Vulcan 20mm) | 60 | 0 | Ninguna |
| **Batería Misiles** | `missiles` | Fuego Indirecto | 12,000G | 4 | Ruedas (`wheels`) | 3 - 5 | 1 | 6 (Misiles AA) | 50 | 0 | Exclusivo antiaéreo indirecto |
| **B-Copter** | `b_copter` | Aéreo | 9,000G | 6 | Aéreo (`air`) | 1 | 3 | 6 (Misiles) | 99 | 2 | Ninguna |
| **T-Copter** | `t_copter` | Aéreo Transporte | 5,000G | 6 | Aéreo (`air`) | — (Desarmado) | 2 | — | 99 | 2 | 1 Infantería/Mech |
| **Caza** | `fighter` | Aéreo | 20,000G | 9 | Aéreo (`air`) | 1 (Aire-Aire) | 4 | 9 (Misiles AA) | 99 | 5 | Exclusivo aire-aire |
| **Bombardero** | `bomber` | Aéreo | 22,000G | 7 | Aéreo (`air`) | 1 (Aire-Tierra) | 2 | 9 (Bombas) | 99 | 5 | Exclusivo aire-tierra/mar |
| **Acorazado** | `battleship` | Naval | 28,000G | 5 | Naval (`sea`) | 2 - 6 | 2 | 9 (Cañones 16") | 99 | 1 | Ninguna (Mover o disparar) |

#### Reglas de Transporte y Reabastecimiento Logístico:
1. **Embarque y Desembarque:**
   - Una unidad de infantería o mecanizado puede moverse y entrar a una unidad de transporte aliada adyacente (`apc`, `t_copter`).
   - El transporte puede moverse y desplegar la unidad cargada en una casilla válida adyacente en el mismo turno. La unidad desembarcada queda marcada como `hasActed = true`.
   - **Destrucción de Transporte:** Si el transporte es destruido con tropas a bordo, la unidad transportada es **aniquilada de inmediato sin posibilidad de escape**.
2. **Reabastecimiento de Combustible y Munición:**
   - El APC reabastece automáticamente al 100% de combustible y munición a todas las unidades terrestres aliadas adyacentes al inicio del turno del jugador.
   - Las ciudades, fábricas, aeródromos y puertos reabastecen al 100% a las unidades estacionadas sobre ellas al inicio del turno.
   - Si una unidad aérea agota su combustible a 0, **se estrella y explota al inicio del turno**.

---

### 2.2 Matriz de Daño Base (Porcentajes Canónicos Atacante vs Defensor)
Valores calculados asumiendo atacante a 10 HP y defensor con 0 estrellas de defensa (en carretera o río).

| Atacante \ Defensor | Infantería | Mecanizado | Recon | Tanque Ligero | Tanque Med. | Artillería | Lanzacohetes | Antiaéreo | B-Copter | Caza | Bombardero | Acorazado |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Infantería** | 55% | 45% | 12% | 5% | 1% | 15% | 25% | 5% | 7% | — | — | — |
| **Mecanizado** | 65% | 55% | 85% | 55% | 15% | 70% | 85% | 65% | 9% | — | — | — |
| **Recon** | 70% | 65% | 35% | 12% | 1% | 45% | 55% | 4% | 10% | — | — | — |
| **Tanque Ligero**| 75% | 70% | 85% | 55% | 15% | 70% | 85% | 65% | 10% | — | — | 5% |
| **Tanque Med.** | 105% | 95% | 105% | 85% | 55% | 105% | 105% | 105% | 12% | — | — | 10% |
| **Artillería** | 90% | 85% | 80% | 70% | 45% | 75% | 80% | 75% | — | — | — | 40% |
| **Lanzacohetes** | 95% | 90% | 90% | 80% | 55% | 80% | 85% | 85% | — | — | — | 55% |
| **Antiaéreo** | 105% | 105% | 60% | 25% | 10% | 50% | 55% | 45% | 105% | 65% | 75% | — |
| **B-Copter** | 75% | 75% | 55% | 55% | 25% | 65% | 65% | 25% | 65% | — | — | 25% |
| **Caza** | — | — | — | — | — | — | — | — | 100% | 100% | 100% | — |
| **Bombardero** | 110% | 110% | 105% | 105% | 95% | 105% | 105% | 95% | — | — | — | 75% |
| **Acorazado** | 95% | 90% | 90% | 85% | 55% | 85% | 90% | 85% | — | — | — | 50% |

*Fórmula con Cobertura y Vida Remanente:*
$$\text{Daño Recibido} = \max\left(1, \left\lfloor \text{DañoBase} \times \left(\frac{\text{HP}_{\text{Atacante}}}{10}\right) \times (1 - \text{EstrellasTerreno} \times 0.10) \right\rfloor\right)$$

---

### 2.3 Modificadores de Terreno (Defensa y Costes de Locomoción)

| Terreno | Cobertura Defensiva | Pie (`foot`) | Mecánico (`mech`) | Ruedas (`wheels`) | Orugas (`treads`) | Aéreo (`air`) | Naval (`sea`) | Efectos Especiales |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **Llanura (Plains)** | ★☆☆☆☆ (10%) | 1 | 1 | 2 | 1 | 1 | ∞ | Terreno abierto estándar. |
| **Bosque (Forest)** | ★★☆☆☆ (20%) | 1 | 1 | 3 | 2 | 1 | ∞ | **Ocultación total** en Niebla de Guerra. |
| **Montaña (Mountain)** | ★★★★☆ (40%) | 2 | 1 | ∞ (Bloqueado) | ∞ (Bloqueado) | 1 | ∞ | **Elevación:** +3 Rango Visión a infantería. |
| **Carretera (Road)** | ☆☆☆☆☆ (0%) | 1 | 1 | 1 | 1 | 1 | ∞ | Vía rápida para ruedas; sin protección. |
| **Río (River)** | ☆☆☆☆☆ (0%) | 2 | 1 | ∞ (Bloqueado) | ∞ (Bloqueado) | 1 | ∞ | Cruce lento a pie. |
| **Ciudad (City)** | ★★★☆☆ (30%) | 1 | 1 | 1 | 1 | 1 | ∞ | Renta +1,000G/turno. Repara +2 HP/turno. |
| **Fábrica / Base** | ★★★☆☆ (30%) | 1 | 1 | 1 | 1 | 1 | ∞ | Despliegue y reparación de terrestres. |
| **Cuartel General (HQ)**| ★★★★☆ (40%) | 1 | 1 | 1 | 1 | 1 | ∞ | Si se captura (20 HP), el dueño pierde. |
| **Mar (Sea)** | ☆☆☆☆☆ (0%) | ∞ | ∞ | ∞ | ∞ | 1 | 1 | Exclusivo naval y aéreo. |
| **Arrecife (Reef)** | ★★☆☆☆ (20%) | ∞ | ∞ | ∞ | ∞ | 1 | 2 | Oculta barcos en Niebla de Guerra. |

---

## 3. ECONOMÍA DUAL Y MONETIZACIÓN NO PAY-TO-WIN

### 3.1 Estructura de Monedas: Oro de Batalla vs Gemas de Mando

```
+---------------------------------------------------+---------------------------------------------------+
|               ORO DE BATALLA (GOLD)               |              GEMAS DE MANDO (GEMS)                |
|               [Moneda Blanda - In-Game]           |              [Moneda Dura - Premium]              |
+---------------------------------------------------+---------------------------------------------------+
| • Adquisición: 100% gratuita jugando partidas,    | • Adquisición: Tienda Stripe con dinero real o    |
|   completando misiones diarias y subiendo nivel.  |   como recompensa en hitos de nivel (cada 5 lvls).|
| • Usos:                                           | • Usos:                                           |
|   1. Desbloquear variantes tácticas de unidades.  |   1. Pase de Batalla Táctico (Battle Pass).       |
|   2. Skins estándar de camuflaje militar.         |   2. Skins exclusivas animadas y efectos visuales.|
|   3. Banners y títulos de perfil básicos.         |   3. Banderas de Facción para el Cuartel General. |
| • REGLA DE ORO: No se puede comprar con dinero    | • REGLA DE ORO: Las gemas JAMÁS compran ventaja   |
|   real para evitar atajos económicos.             |   estadística, aceleradores de turno ni daño.     |
+---------------------------------------------------+---------------------------------------------------+
```

### 3.2 Sistema Canónico de Mazos de 10 Cartas y Despliegue en Fábricas
A diferencia de los juegos de cartas en tiempo real, en *Tactical Command* no hay azar de robo durante la partida: las 10 cartas configuradas forman el catálogo de producción permanente de las instalaciones aliadas, regulado por fondos ($) y **Tiempos de Enfriamiento (Cooldowns)**.

```
[ ESTRUCTURA DEL MAZO COMPETITIVO TÍPICO (10 CARTAS) ]
1. [OBLIGATORIA] Infantería Ligera    - Coste $1,000 | Cooldown: 0t | Rol: Captura rápida / Visión en niebla
2. [OBLIGATORIA] Infantería Bazuca    - Coste $3,000 | Cooldown: 0t | Rol: Captura / Anti-Blindado corto alcance
3. [FLEXIBLE]    Recon / Explorador   - Coste $4,000 | Cooldown: 1t | Rol: Anti-Infantería / Visión 5 casillas
4. [FLEXIBLE]    Tanque Ligero        - Coste $7,000 | Cooldown: 1t | Rol: Combate Directo Terrestre estándar
5. [FLEXIBLE]    Tanque Mediano       - Coste $16,000| Cooldown: 2t | Rol: Rompe-líneas blindado pesado
6. [FLEXIBLE]    Artillería Móvil     - Coste $6,000 | Cooldown: 1t | Rol: Fuego Indirecto Asedio (Alcance 2-3)
7. [FLEXIBLE]    Antiaéreo Móvil      - Coste $8,000 | Cooldown: 2t | Rol: Dominio Aéreo y triturador de infantería
8. [FLEXIBLE]    Helicóptero Ataque   - Coste $9,000 | Cooldown: 2t | Rol: Apoyo Móvil Versátil todo-terreno
9. [FLEXIBLE]    Caza de Dominio      - Coste $20,000| Cooldown: 3t | Rol: Supremacía Aérea exclusiva
10.[FLEXIBLE]    Lanzacohetes Móvil   - Coste $15,000| Cooldown: 3t | Rol: Asedio pesado de largo alcance (3-5)
```

#### Reglas de Validación de Mazo (Deck Taxonomy):
- **Ranura 1 y 2 (Obligatorias):** Infantería Ligera y Mecanizados. Cooldown permanente de 0 turnos (siempre producibles).
- **8 Ranuras Flexibles:**
  - Mínimo 2 unidades terrestres directas.
  - Mínimo 1 unidad con capacidades antiaéreas.
  - Máximo 2 unidades de categoría "Super-pesada" (Neotanque, Bombardero, Acorazado naval).
- **Límite de Tropas en Mapa:** Máximo **15 unidades simultáneas por jugador** para prevenir partidas infinitas y saturación del motor.

### 3.3 Modelo de Escalado de Cartas ($+2.5\%$ por Nivel) y Nivel 11 de Torneo
Para evitar la distorsión del equilibrio donde una unidad de nivel alto aniquila de un golpe a una de nivel bajo:

$$\text{Stat Final} = \text{Stat Base} \times \left(1 + (\text{Nivel} - 1) \times 0.025\right)$$

- **Camino de Trofeos Casual:** Se aplican las estadísticas calculadas con el nivel real de las cartas del jugador.
- **Ligas Competitivas, Torneos y Modo Esport:** Todas las cartas se igualan automáticamente al **Nivel 11 (Cap Estándar)**, asegurando que la victoria dependa 100% de la destreza táctica y el control de mapa.

### 3.4 Bucle de Progresión de Cofres y Duplicados
- **Ranuras de Cofre (Máximo 4 slots):** Ganar una partida otorga un cofre según el cofre-drop rate:
  - *Cofre de Madera:* 3 horas de desbloqueo (Oro base + 15 cartas comunes/raras).
  - *Cofre de Hierro:* 8 horas de desbloqueo (Oro moderado + 45 cartas con épicas garantizadas).
  - *Cofre Blindado / Titanio:* 12 horas de desbloqueo (Oro alto + 90 cartas con comandantes/legendarias).
- Los duplicados de cartas se acumulan para subir de nivel la unidad mediante Oro de Batalla.

### 3.5 Catálogo de Cosméticos y Especificación de Datos
Los cosméticos son estrictamente visuales y de audio. No modifican `hp_max`, `base_attack` ni `movement_points`.

```typescript
export interface CosmeticSkinItem {
  id: string;
  unitCode: string;               // Ej: 'tank_light'
  skinName: string;               // Ej: 'Caza Tormentas del Desierto'
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  priceGold?: number;             // Adquirible con Oro
  priceGems?: number;             // Adquirible con Gemas
  atlasFrame: string;             // Coordenada en el spritesheet WebP
  customAudioVfx?: string;        // Sonido de disparo personalizado
  particleVfxId?: string;         // Partículas de humo/fuego en canvas
}
```

### 3.4 Flujo Ético de Tienda y Pase de Batalla (Command Pass)
1. **Command Pass de Temporada (50 Niveles con Reclamación Retroactiva):**
   - Vía Gratuita: Otorga Cofres Básicos, Oro, comodines de cartas y títulos de perfil mediante Insignias de Batalla.
   - Vía Premium: Otorga un Comandante Exclusivo en Nivel 1, Packs de Bocadillos de Cómic y Sellos de Onomatopeyas Pop-Art, aspectos de HQ y fábricas, y cola de cofres. Si se adquiere de forma tardía, desbloquea retroactivamente todas las recompensas alcanzadas.
2. **Tienda Rotativa Diaria:**
   - Compra directa sin cajas de botín (Loot Boxes) engañosas: skins de vehículos militares, estilos de bocadillo, marcos de viñeta de cómic y comandantes cosméticos.

### 3.6 Arquitectura de Comandantes y Triggers del Bark Engine (Estética Cómic)
Los Comandantes no tienen voces; interactúan visualmente con el jugador a través del **Bark Engine en viñetas de historieta**:
- **Trío F2P Inicial:**
  - *Capitán Vance:* Táctico disciplinado con bocadillo formal recto (`speech`), aconseja conservar unidades y vigilar suministros.
  - *Mayor Stella:* Agresiva y sarcástica con bocadillo dentado (`shout`) y sellos (*¡RATATAT!*, *¡DIVE!*), incita al ataque rápido y maniobras aéreas arriesgadas.
  - *Comandante Volkov:* Analítico y paciente con bocadillo de pensamiento (`thought`) y sellos (*¡CALCULATED!*), potencia la artillería y el juego calculado a largo plazo.
- **Triggers Tácticos en Partida:**
  - `HQ_CRITICAL`: Diálogo de alarma en viñeta con bocadillo dentado y sello *¡ALERT!* cuando la sede aliada cae por debajo de 5 HP.
  - `HQ_ENEMY_CAPTURE`: Línea de victoria inminente al capturar la base enemiga.
---

## 4. SISTEMAS DE CAMPO RESCATADOS DE WARSWORLD E INTEGRADOS

### 4.1 Matriz de 28 Comandantes Canónicos y Economía de Activación
- **Valor por Estrella:** Cada estrella de poder requiere **9,000G de valor de daño**.
- **Carga Defensiva:** $1.0\times$ (100% del valor de daño recibido).
- **Carga Ofensiva:** $0.5\times$ (50% del valor de daño causado).
- **Sobrecostes y Descuentos de Producción en Fábrica:**
  - *Colin:* Descuento del **-20%** en todas las unidades militares (`Math.floor(baseCost * 0.8)`).
  - *Hachi:* Descuento del **-10%** en todas las unidades militares (`Math.floor(baseCost * 0.9)`).
  - *Kanbei:* Sobrecoste del **+20%** por tropas de élite samurai (`Math.floor(baseCost * 1.2)`).
- **Poderes Económicos Únicos:**
  - *Colin Gold Rush (2★):* Multiplica los fondos en tesorería por **1.5x**.
  - *Colin Power of Money (6★):* Concede **+1% de daño general por cada 300G en el tesoro**.
  - *Sasha Market Crash (2★):* Drena las estrellas de poder del rival proporcionalmente a los fondos propios.
  - *Sasha War Bonds (6★):* Convierte el **50% del daño infligido a enemigos directamente en oro ($G)**.
  - *Hachi Barter (3★):* Despliega unidades a mitad de precio (**-50% de coste**).
  - *Hachi Merchant Union (5★):* Permite producir unidades terrestres en cualquier ciudad capturada.

### 4.2 Silos de Misiles y Economía de Daño en Área
- **Disparador:** Únicamente unidades de infantería o mecanizadas posicionadas en una casilla de silo activa.
- **Área:** Diamante Manhattan de radio 2 ($|dx| + |dy| \le 2$, 13 casillas).
- **Daño:** 3 PV de daño directo a todas las unidades en el área sin discriminación de bando.
- **Regla de Supervivencia Canónica:** El misil nunca mata; si una unidad tiene 1, 2 o 3 HP, su HP final es fijado en **1 HP mínimo**.
- **Estado de Casilla:** El silo queda agotado permanentemente (`captureHp = 0`).

### 4.3 Sistema de Clima y Penalizaciones de Operación
- **Lluvia:** -1 casilla a la visión en niebla de guerra. Inmunidad total para Drake.
- **Nieve:** +1 al coste de movimiento de terreno para ruedas y orugas, y consumo de combustible duplicado ($2\times$). Inmunidad total para Olaf.
- **Tormenta de Arena:** -30% a la potencia de fuego de todas las unidades de disparo indirecto.
- **Tirada Aleatoria de Clima por Turno:** Basada en la cantidad de jugadores y la presencia de comandantes Drake en partida.

### 4.4 Rango de Amenaza Enemiga y Mapa Térmico
- Proyecta la unión de trayectorias potenciales y alcances de disparo de todas las unidades enemigas en el mapa.
- Genera la matriz de calor `heatMap[y][x]` indicando la cantidad de unidades rivales capaces de alcanzar cada baldosa del tablero, utilizada por el HUD táctico y la IA.

### 4.5 Economía de Mantenimiento y Reparaciones al Inicio de Turno
- **Gratuidad de Suministros:** La reposición completa de munición y fuel es 100% gratuita para toda unidad estacionada en una propiedad de su propiedad coincidente.
- **Tarifa Financiera por HP:** Cada punto de vida reparado deduce $\lfloor \text{CosteBase} / 10 \rfloor$ del tesoro del jugador.
  - Tanque Ligero (7,000G): $700G por cada HP. Reparar 2 HP cuesta $1,400G.
  - Bombardero (22,000G): $2,200G por cada HP. Reparar 2 HP cuesta $4,400G.
- **Tope de Presupuesto:** La curación se interrumpe automáticamente cuando los fondos disponibles descienden por debajo del coste de 1 HP.

### 4.6 Logística Crítica: Coste de Descuido y Reglas de Crash/Sink
- El abandono de unidades aéreas sin fuel resulta en pérdida total patrimonial instantánea (destrucción automática).
- Submarinos en inmersión sufren colapso hidrostático al agotar el fuel (hundimiento fatal).
- Protege el balance impidiendo que unidades aéreas acampen indefinidamente en territorio hostil sin líneas de abastecimiento de APC o bases aéreas.

### 4.7 Transferencia Patrimonial por Decapitación de HQ
- Al consumarse la captura del Cuartel General rival, todas las propiedades del oponente se anexan al vencedor, incrementando instantáneamente su flujo de ingresos en $+1,000G$ ($+2,000G$ en Blitz) por cada ciudad/fábrica capturada.
- Todas las unidades del rival son desarticuladas, sellando la partida.



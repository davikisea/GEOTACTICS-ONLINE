# Arquitectura Holística y Análisis de Diseño del Metajuego: Tactical Command

Este documento constituye la especificación técnica y conceptual definitiva para **Tactical Command**. Su objetivo es reconciliar las mecánicas deterministas por turnos en cuadrícula (estilo *Advance Wars*) con las mecánicas de progresión, economía, construcción de mazos y matchmaking asíncrono/competitivo (estilo *Clash Royale*), cerrando cada vacío de diseño mediante un ciclo iterativo de análisis de viabilidad.

# SECCIÓN 1: ANÁLISIS DE INCONSISTENCIAS Y MATRIZ DE COMPATIBILIDAD

Antes de definir la arquitectura, es necesario auditar los choques estructurales entre ambos juegos base:

| Mecánica en Clash Royale | Mecánica en Advance Wars | Inconsistencia Identificada | Solución Adoptada en Tactical Command | 
| ----- | ----- | ----- | ----- | 
| **Generación de Elixir Automático** | **Fondos por Propiedades (\$)** | Clash usa mana reactivo en tiempo real; AW usa ingresos pasivos por turnos basados en mapa. | Los fondos de producción en partida son otorgados al inicio del turno según el número de propiedades capturadas. | 
| **Ciclo Aleatorio de 4 cartas en mano** | **Fábricas / Cuarteles Fijos** | En AW compras lo que quieres si tienes dinero; en CR dependes de la rotación del mazo. | **Catálogo por Mazo de 10 Cartas (Libertad Orgánica):** Las 10 cartas del mazo definen el catálogo disponible en las fábricas compatibles. No hay cooldowns artificiales de turnos; el límite de spam se regula orgánicamente mediante coste de suministros ($Soft\ Cap$). | 
| **Destrucción de Torre del Rey (Victoria Corta)** | **Aniquilación o Captura de HQ** | Las partidas de AW pueden durar horas; CR busca partidas de 3 minutos. | **Modos de Juego Diferenciados:** Se crean dos estructuras de partida independientes con límites de turnos, ingresos y tamaños de mapa ajustados (Escaramuza Rápida vs. Campaña Táctica). | 
| **Subida de Nivel de Cartas (+10% Stats)** | **Daño Balanceado (10 HP max por unidad)** | Un Tanque de Nivel 15 destruye de un golpe a uno de Nivel 11, rompiendo la triangulación táctica. | **Escalado Estandarizado:** Los niveles aumentan las estadísticas en un porcentaje reducido ($+2.5\%$ por nivel) para evitar romper la tabla de daño táctico, priorizando la ventaja estratégica. | 

# SECCIÓN 2: MODOS DE JUEGO PRINCIPALES

Para responder a los distintos perfiles de jugador y disponibilidad de tiempo, *Tactical Command* divide sus partidas competitivas y casuales en dos modalidades con parámetros técnicos de velocidad, economía y mapas fuertemente diferenciados.

```
                                  MODOS DE JUEGO
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
[ ESCARAMUZA RÁPIDA (BLITZ SKIRMISH) ]                   [ CAMPAÑA TÁCTICA (GRAND CAMPAIGN) ]
  • Duración: 10 - 20 Minutos                              • Duración: 40 - 60 Minutos
  • Enfoque: Acción Directa / Rush                         • Enfoque: Estrategia y Control Complejo
  • Mapas Pequeños (12x12 a 16x16)                         • Mapas Extensos (24x24 a 32x32)
  • Temporizador: 30s por turno                            • Temporizador: 60s por turno
  • Multiplicador Económico: x2                            • Multiplicador Económico: x1 (Estándar)
  • Límite: 12 - 15 Turnos                                 • Límite: Sin límite o 40 Turnos
```

## Modo 1: Escaramuza Rápida (Blitz Skirmish)
Este modo está optimizado para sesiones rápidas en dispositivos móviles, donde priman los enfrentamientos continuos y la ejecución táctica directa.

* **Duración Promedio:** 10 a 20 minutos.
* **Tamaño del Mapa:** Compacto ($12 \times 12$ a $16 \times 16$ casillas). Las bases principales están más próximas entre sí.
* **Tiempo por Turno:** **30 segundos máximo** por jugador.
* **Aceleración Económica (Rush Multiplier):**
  * **Fondos Iniciales:** $+100\%$ de capital inicial (comienzas con suficientes fondos para desplegar vehículos ligeros/medianos en el Turno 1).
  * **Generación de Ingresos:** Las propiedades producen el **doble de oro por turno** ($\$2,000$ por propiedad en lugar de los $\$1,000$ tradicionales).
* **Cero Cooldowns de Despliegue:** En sintonía con la alta velocidad del modo, el despliegue es directo según fondos y mazo activo sin bloqueos de espera.
* **Límite de Turnos y Criterio de Victoria Rápidos:**
  * Límite estricto de **12 a 15 turnos totales**.
  * Si ningún jugador captura el Cuartel General (HQ) enemigo antes del límite, el ganador se determina por el **Valor Total del Ejército Activo + Valor de Propiedades Controladas**.

---

## Modo 2: Campaña Táctica (Grand Campaign)
Es la experiencia clásica y profunda inspirada directamente en las batallas bélicas tradicionales. Prioriza la maniobra estratégica a largo plazo, el desgaste de recursos y las operaciones combinadas (terrestres, aéreas y navales).

* **Duración Promedio:** 40 a 60 minutos.
* **Tamaño del Mapa:** Extenso ($24 \times 24$ a $32 \times 32$ casillas), con presencia de múltiples frentes de combate, cuellos de botella y teatros navales/aéreos complejos.
* **Tiempo por Turno:** **60 segundos máximo** por jugador (permite cálculos minuciosos de alcance y líneas de visión).
* **Economía Estándar:**
  * **Fondos Iniciales:** Mínimos (requiere captura progresiva de la red de propiedades).
  * **Generación de Ingresos:** Estándar ($\$1,000$ por propiedad/turno).
* **Libertad Orgánica y Soft Cap:** Las cartas se despliegan directamente si hay fondos; el coste de mantenimiento de suministros militares ($-\$200$G por unidad extra a partir de 14) evita el descontrol de tropas.
* **Criterio de Victoria:**
  * Captura exitosa del HQ rival o aniquilación completa de sus unidades/fábricas.
  * Límite amplio de hasta **40 turnos** antes de activar el sistema de desempate por puntuación logística.

---

# SECCIÓN 3: CICLOS ITERATIVOS DE PREGUNTAS, VALIDACIÓN Y ESPECIFICACIÓN

## MÓDULO 1: LA ECONOMÍA DEL MAZO Y EL DESPLIEGUE EN PARTIDA

### ❓ Pregunta 1.1: ¿Cómo se traslada el mazo de 10 cartas a la fase de compra dentro de la partida sin arruinar el ritmo?

* **Cómo funciona en Clash Royale:**
  El jugador tiene 8 cartas. Mantiene 4 en la mano y paga Elixir para jugarlas al instante. La carta jugada pasa al final de la cola de rotación.

* **¿Tiene sentido en Tactical Command?:**
  No directamente. Si un jugador depende de la azarosa rotación de cartas para sacar un Antiaéreo cuando el rival lo ataca con un Caza, la partida se siente injusta y decidida por el azar, violando el determinismo táctico de *Advance Wars*.

* **¿Qué falta?:**
  Un sistema donde el mazo de 10 cartas defina el **Catálogo Disponible** de la partida, eliminando el azar de robo.

#### 💡 Resolución y Reglas de Despliegue (Doctrina de Libertad Orgánica - Sprint 3):

1. **Acceso Total al Mazo y Cero Cooldowns Artificiales (Opción 2):**
   * Al interactuar con una fábrica o instalación de despliegue, el jugador tiene acceso inmediato a las cartas de su mazo compatibles con dicha instalación.
   * **Cero Enfriamientos:** No existen bloqueos artificiales de turnos para volver a fabricar una unidad. Si el jugador dispone de los fondos suficientes generados por sus propiedades y control territorial, tiene absoluta libertad táctica para desplegar sus cartas consecutivamente. Esto maximiza la dopamina, la agencia estratégica y permite respuestas defensivas o contraataques contundentes ("Big Plays").

2. **Línea de Suministros Militares y Regulación Orgánica (Soft Cap):**
   * En lugar de un bloqueo forzoso artificial a 15 unidades que frustre la experiencia de juego, se implementa una **Regulación Económica Orgánica por Coste de Suministros**:
     * **Umbral Gratuito de Mando:** Hasta **14 unidades simultáneas vivas**, el coste de mantenimiento de suministros es $\$0$ G/turno.
     * **Coste de Suministro por Exceso:** Por cada unidad activa que sobrepase las 14 unidades, se descuentan automáticamente **$\$200$ G por unidad al inicio de cada turno** directamente de los ingresos brutos del jugador.
     * **Fórmula de Ingresos Netos:**
       $$\text{Net Income} = \text{Gross Income} - \max(0, \text{Total Unidades} - 14) \times 200$$
   * Este sistema penaliza de manera natural y orgánica el spam desmedido de carne de cañón (*meatshielding*), premiando la eficiencia y preservando la libertad total del jugador.

### ❓ Pregunta 1.2: Si siempre se deben llevar 2 cartas de Infantería, ¿cómo se evita la monotonía y qué función cumplen las otras 8 cartas?

* **Cómo funciona en Clash Royale:**
  Hay flexibilidad total, pero ciertas "categorías" son implícitas (Win Condition, Hechizo Pequeño, Estructura).

* **¿Tiene sentido en Tactical Command?:**
  Sí. En *Advance Wars*, sin infantería no se pueden capturar propiedades, lo que significa que no hay ingresos económicos ni condición de victoria por HQ.

* **¿Qué falta?:**
  Definir la taxonomía exacta de las 8 cartas restantes y las reglas de validación del mazo.

#### 💡 Resolución y Reglas de Composición del Mazo:

```
[ RANURAS OBLIGATORIAS ] 
  ├── Ranura 1: Infantería Ligera (Captura rápida, visión en niebla de guerra).
  └── Ranura 2: Infantería Mecanizada (Captura, daño antitanque corto alcance).

[ 8 RANURAS FLEXIBLES - RESTRICCIONES DE CATEGORÍA ]
  ├── Mínimo 2 Unidades Terrestres Directas (ej. Tanque Ligero, Recon, VLM).
  ├── Mínimo 1 Unidad Antiaérea (ej. Caza, Antiaéreo, Misiles).
  └── Mismo mazo máximo de 2 Unidades de Categoría "Super-pesada" (Neotanque, Bombardero, Acorazado).
```

* **Especialización de Arquetipos de Mazo:**

  * **Mazo "Rush" de Terreno:** Enfoque en vehículos ligeros, transporte rápido y artillería móvil. Ideal para el modo *Escaramuza Rápida*.

  * **Mazo de Control Aéreo (Air Superiority):** Enfoque en Cazas, Helicópteros de Ataque y Apoyo Logístico Aéreo.

  * **Mazo Anfibio/Naval:** Maximiza Lanchas de Desembarco, Cruceros y Submarinos en mapas con acceso a agua.

  * **Mazo "Siege" / Tortuga:** Centrado en Lanzacohetes, Artillería y Tanques Pesados de cobertura. Ideal para la *Campaña Táctica*.

## MÓDULO 2: SISTEMA DE RITMO, MATCHMAKING Y MÉTRICAS DE TIEMPO

### ❓ Pregunta 2.1: ¿Cómo funciona exactamente el Matchmaking basado en el Promedio de Tiempo de Espera (PTE)?

* **Cómo funciona en Clash Royale:**
  El matchmaking utiliza principalmente los **Trofeos** y el **Nivel de Torre del Rey**. El tiempo de juego es fijo (3 minutos por partida).

* **¿Tiene sentido en Tactical Command?:**
  En juegos por turnos, un jugador que tarda 60 segundos por turno desespera a uno que juega en 10 segundos. Separar a los jugadores por su "ritmo mental" es vital para la retención de usuarios.

* **¿Qué falta?:**
  La fórmula matemática exacta para calcular el PTE y la forma en que el algoritmo de matchmaking equilibra **Trofeos vs. PTE**, adaptándose al modo de juego seleccionado.

#### 💡 Resolución y Algoritmo de Matchmaking (PTE):

1. **Fórmula del PTE:**
   

   $$
   PTE = \frac{\sum_{i=1}^{M} \text{Tiempo Usado en Turno}_i}{\text{Total de Turnos Jugados en las Últimas 10 Partidas}}
   $$

2. **Clasificación de Perfiles de Jugador:**

   * **Perfil Blitz (Fast):** PTE $\le 15$ segundos (Predominante en *Escaramuza Rápida*).

   * **Perfil Estandard (Tactical):** PTE entre $16$ y $35$ segundos.

   * **Perfil Analítico (Calculated):** PTE entre $36$ y $60$ segundos (Predominante en *Campaña Táctica*).

3. **Lógica del Algoritmo de Emparejamiento:**

   * **Fase 1 (0-5 segundos en cola):** Busca oponentes dentro del mismo modo seleccionado, en el rango de $\pm 100$ Trofeos **Y** la misma categoría de PTE.

   * **Fase 2 (6-12 segundos en cola):** Expande el rango a $\pm 200$ Trofeos **Y** adjunta categorías de PTE adyacentes.

   * **Fase 3 (>12 segundos en cola):** Prioriza estricta igualdad de Trofeos ($\pm 300$) reduciendo la prioridad del PTE para evitar tiempos de espera largos en el menú.

### ❓ Pregunta 2.2: ¿Qué ocurre cuando un jugador abandona la partida o abusa de consumir el tiempo máximo por turno (Intentional Roping)?

* **Cómo funciona en Clash Royale:**
  Si te desconectas, el rival te destruye la base en 10 segundos porque la partida continúa en tiempo real.

* **¿Tiene sentido en Tactical Command?:**
  No, porque es un juego por turnos. Si un jugador abandona en el Turno 1, el jugador activo pierde tiempo valioso esperando un temporizador vacío.

* **¿Qué falta?:**
  Un sistema de detección de AFK y penalización de tiempo dinámico según el modo de juego.

#### 💡 Resolución y Sistema Anti-AFK:

* **Reloj Dinámico Defensivo:**
  Si un jugador agota su turno (30s en *Escaramuza Rápida* o 60s en *Campaña Táctica*) **sin realizar una sola acción** (mover, atacar o comprar):

  1. El siguiente turno su tiempo máximo se reduce al $50\%$ (15s en Escaramuza / 30s en Campaña).

  2. Si vuelve a pasar el turno sin acciones, se le reduce a **10 segundos**.

  3. Tras 3 turnos consecutivos inactivo, el servidor declara **Derrota por Abandono (AFK Forfeit)** y el rival recibe la victoria completa con trofeos.

## MÓDULO 3: CAPA SOCIAL, COMUNICACIÓN Y MODO 2v2

### ❓ Pregunta 3.1: ¿Cómo se estructura el Chat Global y la mensajería DM durante la partida para evitar abusos y spam táctico?

* **Cómo funciona en Clash Royale:**
  No hay chat de texto en partida, solo *Emotes* limitados con opción de silenciar. El chat existe únicamente dentro del Clan.

* **¿Tiene sentido en Tactical Command?:**
  Se solicitó integración de **DM dentro de la partida** y **Chat Global fuera de la partida**. Esto añade una capa social única, pero requiere contenciones severas.

* **¿Qué falta?:**
  Reglas de moderación, interfaz de chat dentro de la partida y control de toxicidad.

#### 💡 Resolución de la Capa de Comunicación:

```
[ MENÚ PRINCIPAL ]
  └── CHAT GLOBAL
       ├── Salas regionales / por idioma.
       ├── Canales de Reclutamiento de Clanes.
       └── Canales de Búsqueda de Compañero 2v2.

[ DENTRO DE LA PARTIDA ]
  ├── CHAT DE ALIANZA (Sólo Modo 2v2)
  │    └── Canal privado seguro entre compañeros de equipo para coordinar turnos.
  └── MENSAJES DIRECTOS (DM / Rival)
       ├── Sistema de Mensajes Predeterminados (Quick Chat Táctico).
       ├── Texto Libre con filtro de palabras malsonantes en tiempo real.
       └── BOTÓN DE PÁNICO "MUTE": Silencia DMs y Emotes del rival con 1 toque.
```

### ❓ Pregunta 3.2: ¿Cómo funciona mecánicamente el Modo 2v2 en un tablero por turnos?

* **Cómo funciona en Clash Royale:**
  En 2v2, ambos jugadores comparten la arena y tiran cartas simultáneamente acumulando elixir de forma individual.

* **¿Tiene sentido en Tactical Command?:**
  No se pueden mover unidades simultáneamente en un tablero de casillas sin generar colisiones de órdenes.

* **¿Qué falta?:**
  Definir la secuencia de turnos, el mapa y la economía compartida.

#### 💡 Resolución del Modo 2v2:

1. **Secuencia de Turnos Cruzada (Estilo AJEDREZ 2v2):**

   * Orden de turnos: **Jugador A1 -> Jugador B1 -> Jugador A2 -> Jugador B2**.

   * Cada jugador tiene su propio temporizador según el modo jugado (30s en Escaramuza Rápida / 60s en Campaña Táctica).

2. **Propiedades e Ingresos Compartidos vs. Individuales:**

   * Cada jugador administra sus propios Fondos (\$) según las propiedades que él mismo haya capturado con su infantería.

   * Las fábricas son propiedad individual de quien las capturó.

3. **Control de Unidades:**

   * Un jugador **no puede mover** las unidades de su aliado, pero puede ver su rango de movimiento y líneas de tiro previas.

   * Se añade una herramienta de **Ping en Mapa** para señalar objetivos al aliado en su turno.

## MÓDULO 4: PROGRESIÓN DE NIVELES, COFRES Y ECONOMÍA EXTERNA

### ❓ Pregunta 4.1: ¿Cómo escalar el nivel de las unidades sin arruinar la tabla de daño táctico de Advance Wars?

* **Cómo funciona en Clash Royale:**
  Cada nivel aumenta $+10\%$ vida y daño. En 15 niveles, la diferencia entre Nivel 1 y 15 es abrumadora.

* **¿Tiene sentido en Tactical Command?:**
  En *Advance Wars*, los enfrentamientos están finamente calibrados (ej. un Antiaéreo destruye a un Caza si ataca primero). Si un Antiaéreo Nivel 1 no destruye a un Caza Nivel 15 debido a la brecha de estadísticas, la base táctica se rompe.

* **¿Qué falta?:**
  Un modelo de escalado de estadísticas matemáticamente controlado y balance de ligas.

#### 💡 Resolución del Escalado de Estadísticas:

1. **Curva de Escalado Reducida (**$+2.5\%$ **por Nivel):**

   * En lugar del $+10\%$ de Clash Royale, el escalado en *Tactical Command* utiliza la fórmula:
     

     $$
     \text{Stat Final} = \text{Stat Base} \times (1 + (\text{Nivel} - 1) \times 0.025)
     $$

   * De esta forma, una diferencia de 3 niveles solo otorga una ventaja del $7.5\%$, manteniendo las relaciones tácticas clásicas donde la posición y el primer golpe siguen siendo determinantes.

2. **Estándar Competitivo en Ligas y Torneos (Nivel Cap):**

   * **Camino de Trofeos Casual:** Se aplican los niveles reales de las cartas.

   * **Modo Competitivo / Ligas / Torneos de Clan:** Todas las cartas son igualadas automáticamente al **Nivel 11 (Estándar Competitivo)**, eliminando el "Pay to Win" o la ventaja por tiempo en la vertiente profesional.

### ❓ Pregunta 4.2: ¿Cuál es el ciclo completo de recompensa y progresión fuera del juego?

#### 💡 Resolución de la Estructura de Progresión y Recompensas:

```
┌─────────────────────────────────────────────────────────┐
│                   VICTORIA EN ENFRENTAMIENTO            │
└────────────────────────────┬────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   +Trofeos de Escalafón              Ranura de Cofres (Máx 4)
   (Avanza en Teatros de Guerra)      (Cofre de Madera, Hierro, Blindado)
            │                                 │
            ▼                                 ▼
   Desbloquea Nuevas Cartas           Requieren Tiempo de Apertura
   de Unidades y Comandantes          (3h, 8h, 12h) o Gemas
                                              │
                                              ▼
                                      Otorga: Oro + Cartas Duplicadas
                                              │
                                              ▼
                                      Mejora de Nivel de Unidades
                                      (+2.5% Stats / XP de Comandante)
```

# SECCIÓN 4: ESPECIFICACIÓN TÉCNICA DE LA MATRIZ DE BALANCE

Para garantizar que el juego sea funcional, se presenta la especificación final del mazo de 10 cartas equilibrado para entornos competitivos:

```
[ ESTRUCTURA DEL MAZO COMPETITIVO TÍPICO (10 CARTAS) ]

1. [OBLIGATORIA] Infantería Ligera    - Coste $1,000 | Cooldown: 0t | Rol: Captura / Visión
2. [OBLIGATORIA] Infantería Bazooka  - Coste $3,000 | Cooldown: 0t | Rol: Captura / Anti-Blindado Ligero
3. [FLEXIBLE]    Recon / Vehículo    - Coste $4,000 | Cooldown: 1t | Rol: Anti-Infantería / Exploración
4. [FLEXIBLE]    Tanque Ligero       - Coste $7,000 | Cooldown: 1t | Rol: Combate Directo Terrestre
5. [FLEXIBLE]    Tanque Pesado       - Coste $12,000| Cooldown: 2t | Rol: Rompe-líneas
6. [FLEXIBLE]    Artillería Móvil    - Coste $6,000 | Cooldown: 1t | Rol: Fuego Indirecto (Alcance 2-3)
7. [FLEXIBLE]    Antiaéreo Móvil     - Coste $8,000 | Cooldown: 2t | Rol: Defensa de Dominio Aéreo
8. [FLEXIBLE]    Helicóptero Ataque  - Coste $9,000 | Cooldown: 2t | Rol: Apoyo Móvil Versátil
9. [FLEXIBLE]    Caza de Dominio     - Coste $20,000| Cooldown: 3t | Rol: Control del Cielo
10.[FLEXIBLE]   Lanzacohetes        - Coste $15,000| Cooldown: 3t | Rol: Fuego Indirecto Pesado (Alcance 3-5)
```

# SECCIÓN 5: CONCLUSIÓN DE LA ARQUITECTURA DEL METAJUEGO

**Tactical Command** resuelve el conflicto entre *Advance Wars* y *Clash Royale* eliminando el azar en el robo durante la partida y reemplazándolo por un **Sistema de Catálogo Limitado por Cooldowns y Costes de Producción**.

La incorporación de los modos **Escaramuza Rápida** (10-20 min) y **Campaña Táctica** (up to 60 min) permite segmentar eficazmente a los jugadores según sus necesidades de tiempo sin romper la coherencia táctica. El metajuego fuera de la partida recompensa la progresión coleccionable, el perfeccionamiento del mazo de 10 cartas y el desarrollo social a través de DMs, Clanes y el Modo 2v2, mientras que el **Matchmaking por PTE** asegura que el ritmo táctico de cada partida se mantenga fluido y satisfactorio.

Asimismo, la integración del **Tercer Pilar Maestro: Bark Engine Narrativo y Monetización de Comandantes** (especificado en detalle en [13_CO_SYSTEM_MONETIZATION_AND_BARK_ENGINE.md](file:///c:/Users/morin/TacticalCommand/docs/13_CO_SYSTEM_MONETIZATION_AND_BARK_ENGINE.md)) culmina la experiencia conectando la personalidad reactiva de los Comandantes con la telemetría del jugador y el Command Pass con Reclamación Retroactiva.
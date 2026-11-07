# VOLUMEN 3: COMANDANTES, BARK ENGINE CÓMIC Y CAPA SOCIAL CORPORATIVA
**Documento Canónico Unificado:** `03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md`  
**Proyecto:** *GEOTACTICS ONLINE (Tactical Command: Wars of Legacy)*  
**Versión:** 5.0.0-MODULAR-CANON-SSOT  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Arquitectura de Dominios Sincronizada:**  
- `@domains/tactics` (`src/domains/tactics/core/coSystem.ts`, `src/domains/tactics/components/COCommandBar.tsx`, `src/domains/tactics/components/ComicVignetteOverlay.tsx`)  
- `@domains/game-feel` (`src/domains/game-feel/core/barkEngine.ts`, `src/domains/game-feel/core/audioManager.ts`, `src/domains/game-feel/components/CommanderBarkWidget.tsx`, `src/domains/game-feel/components/CommanderLivingVignette.tsx`)  
- `@domains/world` (`src/domains/world/core/clanSystem.ts`, `src/domains/world/components/ClanHeadquartersView.tsx`)  
- `@domains/economy` (`src/domains/economy/core/industrialEngine.ts`, `src/domains/economy/components/P2PMarketplaceView.tsx`)  
- `@shared` (`src/shared/types/metagame.ts`, `src/shared/types/index.ts`)  

**Archivos Consolidados y Reemplazados:**  
- `13_CO_SYSTEM_MONETIZATION_AND_BARK_ENGINE.md` (Completo)  
- `19_HYPER_ENGAGEMENT_CLAN_LOOT_DISHONOR.md` (Completo)  
- `12_EXTENDED_METAGAME_ARCHITECTURE.md` (Módulo 3: Capa Social y 2v2)  
- `21_HYPER_ENGAGEMENT_ASYMMETRIC_LADDER_NEARMISS.md` (Diagnóstico Balístico Near-Miss y Liquidación 35% Tech Scrap)  

---

# 0. ALINEACIÓN INMUTABLE CON LOS 7 PILARES CANÓNICOS Y REGLA FINANCIERA

Toda la ingeniería de Comandantes, Bark Engine y Clanes opera bajo las invariantes matemáticas de `MASTER_METAGAME_CONSTANTS` (`src/shared/types/metagame.ts`):

1. **Pilar 1 — Cero Cartas (NO TCG/CCG):** Almacén físico estricto de **16 tropas máximo por jugador** (**4 slots de despliegue activo** en vanguardia + **12 en reserva** en el hangar físico). Cualquier referencia histórica a "cartas" en estructuras de soporte (`ClanCardRequest`) representa suministros de planos industriales y dotación logística sin mecánicas de mazo aleatorio.
2. **Pilar 2 — Escala Balística Continua (1 a 100 HP Enteros):** Integridad estructural continua de `1` a `100` HP enteros (`CANONICAL_MAX_HP = 100`).
3. **Pilar 3 — Aniquilación Táctica Inapelable:** Derrota inmediata e inapelable al llegar a **0 tropas supervivientes** en el tablero táctico.
4. **Pilar 4 — Progresión Horizontal de Tiers (T1 a T5):** Bonificación de **+2% por Tier** (`TIER_EFFECTIVENESS_BONUS_PER_LEVEL = 0.02`), con techo competitivo de **+8% máximo en T5** sobre T1.
5. **Pilar 5 — Conquista de Capitales con Buff Regional:** Las capitales nacionales son capturables (`CAPITAL_IMMUNITY = false`, umbral `15,000 TCP`) y otorgan un **Buff Regional de +5% en recursos y logística** sobre la región bajo hegemonía.
6. **Pilar 6 — Pérdida Física Real y 35% Tech Scrap:** Toda unidad destruida en batallas territoriales desaparece físicamente del hangar, acreditando un **35% de recuperación en chatarra tecnológica (`tech_scrap`)** (`RECYCLE_SCRAP_RATE = 0.35`).
7. **Pilar 7 — Human Handshake de 120 Segundos:** Al declararse un asedio territorial, el defensor dispone de **120 segundos (2 minutos)** (`HANDSHAKE_TIMEOUT_SECONDS = 120`) para asumir el mando humano antes de que intervenga la **IA de Guarnición (Niveles 1 a 5)**.
8. **Regla Financiera Canónica P2P:** El Mercado P2P opera con un **impuesto total del 2%** (`TOTAL_P2P_TAX_RATE = 0.02`), dividido exactamente en **1% quemado en Sink deflacionario** (`PLATFORM_BURN_RATE = 0.01`) + **1% de regalía transferida al Tesoro del Clan dueño del Hub Regional** (`PROVINCE_ROYALTY_RATE = 0.01`), protegido por bandas dinámicas **VWAP Collar ±25%** (`VWAP_COLLAR_PERCENT = 0.25`).

---

# 1. SISTEMA DE COMANDANTES TÁCTICOS (COMMANDING OFFICERS - COs)

Los Comandantes representan la cúspide doctrinal del ejército del jugador. A diferencia de las unidades físicas del hangar (máximo 16 tropas: 4 activas + 12 en reserva), los COs no ocupan slots de hangar ni se despliegan como fichas vulnerables; operan como la entidad de mando que otorga bonificaciones pasivas permanentes (**Day-to-Day / D2D**), un **Poder Táctico (COP)** y un **Superpoder Táctico de Mando (SCOP)** activable cuando su medidor de energía se llena mediante combate activo.

```
                    ARQUITECTURA DE UN COMANDANTE TÁCTICO
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
[ DOCTRINA PASIVA (D2D) ]    [ MEDIDOR DE PODER (COP/SCOP) ] [ VÍNCULO DE CAMARADERÍA ]
• Bonus de Ataque/Defensa    • 1 Estrella = 9,000G valor     • Niveles de Vínculo (1-10)
  a clases de unidades       • Carga 100% Def / 50% Ofensiva • Diálogos personalizados
• Modificador de Terreno     • Buff Universal +10% ATK/DEF   • Telemetría adaptativa IA
```

### 1.1 Catálogo Canónico de los 29 Comandantes (28 Clásicos de Facción + 1 Comandante Especial IA Stella)
*Implementación de Referencia:*
- Motor Core: [`src/domains/tactics/core/coSystem.ts`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/tactics/core/coSystem.ts) (`CANONICAL_CO_REGISTRY`, `ALL_CANONICAL_CO_IDS`, `COEngine`, `CO_FACTION_META`, `resolveCanonicalCOId`, `getCOFullBodyUrl`)
- Componentes UI: [`src/domains/tactics/components/COCommandBar.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/tactics/components/COCommandBar.tsx), [`src/domains/game-feel/components/CommanderLivingVignette.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/game-feel/components/CommanderLivingVignette.tsx), [`src/domains/game-feel/components/CommanderBarkWidget.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/game-feel/components/CommanderBarkWidget.tsx)

El registro ejecutable (`ALL_CANONICAL_CO_IDS` en `src/domains/tactics/core/coSystem.ts`) implementa exactamente **29 Comandantes (`COId`)**: **28 Comandantes Clásicos distribuidos en 5 facciones** más **1 Comandante Especial de IA y C4ISR (`stella`) con aprendizaje adaptativo auto-optimizable**:

1. **Mecánica Oficial del Medidor de Poder (`COEngine`):**
   - **Valor por Estrella:** Cada estrella del medidor equivale a **$9,000G** de valor de combate (`STAR_CHARGE_VALUE = 9000`).
   - **Carga Defensiva:** Daño sufrido carga el **100%** del valor financiero de la salud perdida (`DEFENSIVE_CHARGE_MULT = 1.0`, fórmula: `(ownUnitCost / 10) * damageReceivedHp * 1.0`).
   - **Carga Ofensiva:** Daño infligido carga el **50%** del valor financiero de la salud enemiga destruida (`OFFENSIVE_CHARGE_MULT = 0.5`, fórmula: `(targetUnitCost / 10) * damageDealtHp * 0.5`).
   - **Poderes de CO (`cop`):** Primer umbral de estrellas (`power.stars * 9000`); otorga efectos inmediatos más un **+10% Ataque y +10% Defensa universal** durante el turno activo.
   - **Superpoderes de CO (`scop`):** Barra estelar completa (`scop.stars * 9000`); desata efectos doctrinales estratégicos más el bono universal de **+10% Ataque y +10% Defensa**.
   - **Resolución de Alias Legacy (`CO_LEGACY_ALIAS_MAP`):** Cualquier invocación a identificadores de lore antiguos se normaliza sin errores 404 mediante `resolveCanonicalCOId()`: `volkov -> grit`, `vance -> max`, `vonbolt / von-bolt -> von_bolt`, y el arte Full Body de `stella` resuelve a `/assets/CO/smoothFull/Awds-sami.webp`.

2. **Matriz de Facciones y Metadatos Heráldicos (`CO_FACTION_META`):**

| Facción (`faction`) | Código Corto (`shortCode`) | Color Primario / Acento | Total COs | Identificadores Canónicos (`COId`) |
|:---|:---|:---|:---:|:---|
| **Orange Star** (`orange-star`) | `OS // VANGUARDIA` | `#E65100` / `#F59E0B` | **7 + 1 IA** | `andy`, `hachi`, `jake`, `max`, `nell`, `rachel`, `sami` + **`stella` (Especial IA C4ISR)** |
| **Blue Moon** (`blue-moon`) | `BM // FRENTE ÁRTICO` | `#1D4ED8` / `#93C5FD` | **4** | `colin`, `grit`, `olaf`, `sasha` |
| **Green Earth** (`green-earth`) | `GE // ESCUADRÓN AÉREO-NAVAL` | `#15803D` / `#86EFAC` | **4** | `drake`, `eagle`, `javier`, `jess` |
| **Yellow Comet** (`yellow-comet`) | `YC // GUARDIA IMPERIAL` | `#D97706` / `#FDE047` | **4** | `grimm`, `kanbei`, `sensei`, `sonja` |
| **Black Hole** (`black-hole`) | `BH // DIVISIÓN SOMBRA` | `#4C1D95` / `#EF4444` | **9** | `adder`, `flak`, `hawke`, `jugger`, `kindle`, `koal`, `lash`, `sturm`, `von_bolt` |

3. **Especificación Completa de los 29 Comandantes (`CANONICAL_CO_REGISTRY`):**

| # | `COId` | Nombre y Título Oficial | Facción | Doctrina Pasiva Día a Día (`dayToDay.description`) | Poder CO (`COP` y ★) | Superpoder CO (`SCOP` y ★) |
|:---:|:---|:---|:---|:---|:---|:---|
| 1 | `adder` | **Adder** — *Comandante Víbora* | `black-hole` | Líder astuto e implacable. Carga sus medidores de poder a una velocidad extrema debido a su bajo umbral estelar. | **Sideslip (2★):** Todas las unidades del ejército ganan +1 casilla de movimiento. | **Sidewinder (5★):** Todas las unidades aliadas ganan +2 casillas de movilidad y +20% de potencia ofensiva. |
| 2 | `andy` | **Andy** — *El Mecánico Genio* | `orange-star` | Especialista en mantenimiento. Sin debilidades ni penalizaciones en ningún terreno o unidad. | **Hyper Repair (3★):** Repara instantáneamente +2 HP a todas las unidades aliadas y otorga +10% de ataque y defensa. | **Hyper Upgrade (6★):** Repara instantáneamente +5 HP a todas las unidades aliadas, otorga +1 de movimiento y +20% de ataque. |
| 3 | `colin` | **Colin** — *El Joven Magnate* | `blue-moon` | Descuento del 20% en costes de producción de todas las unidades. Sus unidades tienen -10% de ataque. | **Gold Rush (2★):** Multiplica los fondos actuales del tesoro por 1.5x (+50% de oro instantáneo). | **Power of Money (6★):** Todas las unidades aliadas ganan +1% de ataque por cada 300G en el tesoro. |
| 4 | `drake` | **Drake** — *Lobo de Mar* | `green-earth` | Navíos de guerra tienen +20% de defensa y +1 de movimiento. Inmune a penalizaciones de lluvia. | **Tsunami (4★):** Desata una ola gigante que causa 1 PV de daño a todos los enemigos y reduce su combustible a la mitad. | **Typhoon (7★):** Causa 2 PV de daño a todos los enemigos, reduce su combustible a la mitad e invoca lluvia torrencial. |
| 5 | `eagle` | **Eagle** — *As de la Aviación* | `green-earth` | Unidades aéreas tienen +20% de ataque y consumen 2 unidades menos de combustible al día. | **Lightning Drive (3★):** Reactiva todas las unidades aéreas que ya han actuado este turno para un segundo ataque. | **Lightning Strike (9★):** ¡Reactiva a todas las unidades aliadas para realizar un segundo turno consecutivo! |
| 6 | `flak` | **Flak** — *Comandante Brutal* | `black-hole` | Ataques erráticos e impredecibles. Sus unidades pueden infligir desde -10% hasta +25% de daño extra por suerte. | **Brute Force (3★):** Aumenta el rango de impacto crítico aleatorio hasta un +50% de daño brutal. | **Barbaric Blow (6★):** Potencia masiva de impacto crítico aleatorio hasta un +90% de daño adicional por suerte. |
| 7 | `grimm` | **Grimm** — *El Luchador Indomable* | `yellow-comet` | Ofensiva temeraria: todas las unidades aliadas tienen +30% de ataque, pero sufren -20% de defensa. | **Knuckleduster (3★):** Aumenta la potencia de ataque de todas las unidades al +50% de daño adicional. | **Haymaker (6★):** Ataque demoledor: todas las unidades aliadas combaten con un brutal +80% de daño. |
| 8 | `grit` | **Grit** — *Tirador de Élite a Distancia* | `blue-moon` | Artillería y misiles obtienen +1 de alcance y +20% de ataque. Tropas de combate directo tienen -20% de ataque. | **Snipe Attack (3★):** Unidades indirectas ganan +1 de alcance adicional (+2 total) y +30% de daño. | **Super Snipe (6★):** Unidades indirectas ganan +2 de alcance adicional (+3 total) y +30% de daño. |
| 9 | `hachi` | **Hachi** — *Comerciante Legendario* | `orange-star` | Acceso a canales de suministros privilegiados: -10% de coste en todas las unidades militares. | **Barter (3★):** Reduce el coste de despliegue de todas las unidades en un -50% durante este turno. | **Merchant Union (5★):** Permite desplegar unidades terrestres desde CUALQUIER ciudad aliada, no solo desde fábricas. |
| 10 | `hawke` | **Hawke** — *El Estratega Halcón* | `black-hole` | Disciplina militar absoluta: todas las unidades tienen +10% de ataque en cualquier circunstancia. | **Black Wave (5★):** Drena 1 PV de todas las unidades enemigas del mapa y regenera +1 HP a todas las unidades aliadas. | **Black Storm (9★):** Drena 2 PV de todas las unidades enemigas en el mapa y cura +2 HP a todas las aliadas. |
| 11 | `jake` | **Jake** — *Comandante Urbano* | `orange-star` | Especialista en llanuras: todas las unidades terrestres tienen +10% de ataque sobre terreno de llanuras. | **Beat Box (3★):** +1 de movimiento para todos los vehículos blindados y +20% de daño en llanuras. | **Block Rock (6★):** +2 casillas de movilidad para vehículos y un devastador +40% de ataque en llanuras. |
| 12 | `javier` | **Javier** — *El Caballero Blindado* | `green-earth` | Las torres de comunicación otorgan bonificación defensiva adicional (+10% def y +20% def vs fuego indirecto por torre). | **Tower Shield (3★):** Duplica el bono defensivo de las torres de comunicación capturadas (+20% def adicional por torre). | **Tower of Power (6★):** Triplica el bono defensivo de las torres (+30% def por torre) y añade +20% de ataque. |
| 13 | `jess` | **Jess** — *Especialista en Blindados* | `green-earth` | Vehículos terrestres tienen +10% de ataque y +1 de movimiento. Infantería, aeronaves y buques sufren -10% de ataque. | **Turbo Charge (3★):** Vehículos terrestres ganan +1 de movimiento, +20% de ataque y reabastecen combustible y munición al 100%. | **Overdrive (6★):** Vehículos terrestres ganan +2 de movimiento, +40% de ataque y reabastecimiento instantáneo total. |
| 14 | `jugger` | **Jugger** — *Cyborg de Combate* | `black-hole` | Algoritmo caótico inestable: daño fluctuante entre -15% y +30% por suerte en cada ataque. | **Overclock (3★):** Sobrecarga de procesadores: aumenta la suerte aleatoria hasta un +55% de daño extra. | **Crush (7★):** Furia de aniquilación: probabilidad de golpes críticos catastróficos de hasta +95% de daño adicional. |
| 15 | `kanbei` | **Kanbei** — *El Emperador Samurai* | `yellow-comet` | Honor de samurai: todas las unidades aliadas tienen +20% de ataque y +20% de defensa de base, pero cuestan +20% más. | **Morale Boost (4★):** Aumenta el ataque de todas las unidades al +40% y la defensa al +30%. | **Samurai Spirit (7★):** Ataque +40%, defensa +30% y DUPLICA el daño de todos los contraataques del ejército. |
| 16 | `kindle` | **Kindle** — *La Baronesa Urbana* | `black-hole` | Lucha en entornos urbanos: unidades posicionadas en ciudades o cuarteles tienen +40% de ataque. | **Urban Blight (3★):** Causa 3 PV de daño instantáneo a todas las unidades enemigas en ciudades o propiedades. | **High Society (6★):** Todas las unidades aliadas ganan +3% de ataque por cada propiedad en posesión del jugador. |
| 17 | `koal` | **Koal** — *Maestro del Asfalto* | `black-hole` | Guerra relámpago en carreteras: unidades en carreteras o puentes tienen +10% de ataque. | **Hungry March (3★):** +1 de movimiento para todas las tropas y +20% de daño en carreteras. | **Trail of Woe (5★):** +2 casillas de movilidad general y +30% de ataque sobre carreteras y puentes. |
| 18 | `lash` | **Lash** — *La Pequeña Genio Táctica* | `black-hole` | Aprovechamiento del terreno: gana +10% de ataque por cada estrella de cobertura del terreno en que se ubica la unidad. | **Terrain Tactics (4★):** El coste de movimiento de todas las unidades se reduce a 1 en cualquier terreno franqueable. | **Prime Tactics (7★):** Duplica las estrellas de defensa de todas las casillas y reduce a 1 el coste de movimiento universal. |
| 19 | `max` | **Max** — *Fuerza Bruta Acorazada* | `orange-star` | Unidades de combate directo blindadas tienen +20% de ataque. Unidades indirectas sufren -10% de ataque y -1 de alcance. | **Max Force (3★):** Unidades de combate directo no-infantería ganan +1 de movilidad y +20% de potencia ofensiva. | **Max Blast (6★):** Unidades directas blindadas ganan +2 de movilidad y +40% de ataque brutal (+60% total). |
| 20 | `nell` | **Nell** — *La Dama de la Fortuna* | `orange-star` | Bendecida por la suerte: sus unidades infligen entre 0 y +15% de daño extra aleatorio. | **Lucky Star (3★):** Aumenta el margen de impacto crítico por suerte hasta un +60% de daño extra. | **Lady Luck (6★):** ¡La suerte suprema! Posibilidad de infligir hasta un demoledor +100% de daño crítico. |
| 21 | `olaf` | **Olaf** — *El Señor del Invierno* | `blue-moon` | Inmune a penalizaciones de nieve (se mueve como en clima despejado). En lluvia se ralentiza como en nieve. | **Blizzard (3★):** Desata una tormenta de nieve durante 1 turno que ralentiza a los enemigos y duplica su gasto de combustible. | **Winter Fury (7★):** Ventisca ártica masiva: causa 2 PV de daño a todos los enemigos e impone nieve extrema. |
| 22 | `rachel` | **Rachel** — *Comandante de Artillería Estratégica* | `orange-star` | Tasa de reparación acelerada: unidades en propiedades aliadas reparan +1 HP adicional (total +3 HP por turno). | **Lucky Lass (3★):** Aumenta la suerte del ejército con críticos de hasta +40% de daño. | **Covering Fire (6★):** Lanza 3 misiles balísticos automáticos contra las 3 unidades enemigas de mayor HP (-3 PV por misil). |
| 23 | `sami` | **Sami** — *Comando de Fuerzas Especiales* | `orange-star` | Tropas a pie (Infantería y Mecanizados) tienen +30% de ataque y capturan a tasa acelerada de 1.5x. | **Double Time (3★):** Infantería y Mecanizados obtienen +1 casilla de movilidad y +20% de ataque adicional (+50% total). | **Victory March (8★):** Infantería y Mecanizados ganan +2 de movimiento, +50% de ataque y CAPTURA INSTANTÁNEA (20 pts) en 1 turno. |
| 24 | `sasha` | **Sasha** — *La Heredera Diplomática* | `blue-moon` | Diplomacia financiera: genera +100G adicionales por cada propiedad capturada en cada turno. | **Market Crash (2★):** Reduce el medidor de poder del oponente en proporción directa a los fondos almacenados en tu tesoro. | **War Bonds (6★):** Obtienes fondos directos del 50% de todo el valor de daño infligido a unidades enemigas este turno. |
| 25 | `sensei` | **Sensei** — *Comandante Paracaidista* | `yellow-comet` | Helicópteros tienen +50% de ataque. Infantería +40% de ataque. Vehículos y barcos sufren -10% de ataque. | **Copter Command (2★):** Helicópteros ganan +1 de movimiento y despliega Infantería (9 HP) en ciudades aliadas desocupadas. | **Airborne Assault (6★):** Helicópteros ganan +2 de movimiento y despliega Mecanizados (9 HP) en ciudades aliadas vacías. |
| 26 | `sonja` | **Sonja** — *Estratega Silenciosa* | `yellow-comet` | +1 casilla de visión en niebla de guerra. Oculta el HP exacto de sus unidades al rival y +50% de daño en contraataques. | **Enhanced Vision (3★):** Visión aumentada en +1 adicional (+2 total) y revela bosques y arrecifes sin adyacencia. | **Counter Break (5★):** Contraataque anticipado: sus unidades contraatacan antes de recibir el impacto del ataque enemigo. |
| 27 | **`stella`** | **Mayor Stella** — *Sujeto de Prueba C4ISR #01 (Capa 3 Bark Engine)* | `orange-star` | **Comandante Especial IA con Aprendizaje Adaptativo:** Comandante de Prueba del Bark Engine Auto-Optimizable y enlace directo con el Motor Geopolítico Project Alice en el Teatro Venezuela. | **Directiva Hegemónica (3★):** Aumenta +25% la proyección de soberanía sobre regiones en disputa y optimiza la telemetría de radio C4ISR. | **Doctrina Soberana Total (7★):** Consolidación inmediata de líneas de suministro desde Caracas y +50% de eficiencia de asedio político. |
| 28 | `sturm` | **Sturm** — *Comandante Supremo de Black Hole* | `black-hole` | Movimiento perfecto: todas las unidades terrestres se desplazan con coste de 1 en cualquier terreno. +20% ataque y +20% defensa universal. | *Sin COP intermedio* (Concentra toda su carga estelar en SCOP). | **Meteor Strike (10★):** Invoca un meteoro colosal desde el espacio que inflige 8 PV de daño masivo a las unidades enemigas. |
| 29 | `von_bolt` | **Von Bolt** — *El Comandante Inmortal* | `black-hole` | Tecnología biomecánica: todas las unidades tienen +10% de ataque y +10% de defensa permanentemente. | *Sin COP intermedio* (Concentra toda su carga estelar en SCOP). | **Ex Machina (10★):** Onda electromagnética que causa 3 PV de daño a todos los enemigos y paraliza sus unidades (`hasMoved = true`, `hasActed = true`). |

### 1.2 Medidor de Vínculo de Camaradería (`Bonding Level` 1 a 10)
- La relación entre el jugador y cada Comandante es bilateral y persistente (`commanderBondLevel` en `UserProfileIdentity` y `CommanderLivingVignetteProps`).
- Al combatir con un mismo comandante o interactuar en la consola C4ISR, se acumula experiencia de vínculo (Niveles 1 al 10).
- Subir de nivel de vínculo desbloquea:
  - *Niveles 1 a 2:* El Comandante se dirige al usuario con el rango genérico `"Cadete"`.
  - *Nivel 3+ (`bondingLevel >= 3`):* El Comandante interpola dinámicamente `{player_name}` con el nombre real del jugador (o `"Comandante"`) y desbloquea plantillas exclusivas de alta prioridad (`stella_start_b3`, `stella_clutch_b3`, `volkov_start_b3`, `vance_start_b3`).
  - *Nivel 6:* Desbloqueo de sellos de onomatopeyas exclusivos de su doctrina.
  - *Nivel 10:* Máxima afinidad en el Dossier de Oficiales y marcos de perfil de novela gráfica militar.

---

# 2. EL BARK ENGINE PROCEDURAL DE NOVELA GRÁFICA (SIN VOCES)
**[ESTADO: 100% IMPLEMENTADO Y CERTIFICADO EN MOTOR, FRONTEND Y TESTS]**  
*Implementación de Referencia:*
- Motor Core y Aprendizaje Adaptativo: [`src/domains/game-feel/core/barkEngine.ts`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/game-feel/core/barkEngine.ts) (`barkEngine`, `CANONICAL_BARK_TEMPLATES`, `BarkTriggerContext`, `LobbyBarkIntent`, `BarkSelfOptimizationMetrics`)
- Widget Diegético de Esquina (Mapa/Combate): [`src/domains/game-feel/components/CommanderBarkWidget.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/game-feel/components/CommanderBarkWidget.tsx) (`CommanderBarkWidget`, `BarkBalloonType`, `BarkMessage`)
- Gran Viñeta Viva de Lobby ("The Living Comic Canvas"): [`src/domains/game-feel/components/CommanderLivingVignette.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/game-feel/components/CommanderLivingVignette.tsx) (`CommanderLivingVignette`)
- Overlay Cinético de Combate: [`src/domains/tactics/components/ComicVignetteOverlay.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/tactics/components/ComicVignetteOverlay.tsx) (`ComicVignetteOverlay`)

El Bark Engine proyecta sobre el Canvas y la interfaz web una narrativa visual reactiva inspirada en la novela gráfica bélica, el Pop-Art clásico con tramas de puntos Ben-Day y la directriz canónica [`.agents/skills/tactical-command-intel/SKILL.md`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/.agents/skills/tactical-command-intel/SKILL.md), **prescindiendo por completo de archivos de audio de voz** para garantizar tiempos de carga instantáneos ($< 1.0\text{s}$) y cero consumo innecesario de ancho de banda.

### 2.0 Arquitectura de Ejecución en Tiempo Real y Aprendizaje Adaptativo (Stella IA)
1. **Buffer de Memoria Anti-Repetición (`recentBarkIds`):** Almacena los últimos **6 IDs** de diálogo disparados (`if (this.recentBarkIds.length > 6) this.recentBarkIds.shift()`), descartándolos en el muestreo O(1) para erradicar frases repetitivas durante una sesión.
2. **Motor de Auto-Optimización Adaptativa (`BarkSelfOptimizationMetrics`):**
   - Persistido en `localStorage` bajo la clave `BARK_OPTIMIZATION_STORAGE_KEY = 'geotactics_bark_self_opt_stella_v1'`.
   - En el MVP de 3 Capas (`singleSubjectLock = true`), la **Mayor Stella (`stella`)** opera como sujeto de prueba único con telemetría de aprendizaje adaptativo:
     - Cada vez que se emite una plantilla `selectedTemplate.id`, su multiplicador de peso dinámico en `dynamicWeightMultipliers` se atenúa multiplicándose por `0.82` hasta un piso de `0.35` (`Math.max(0.35, prevMult * 0.82)`).
     - Simultáneamente, todas las demás plantillas no emitidas recuperan gradualmente su peso multiplicándose por `1.06` hasta un techo de `1.5` (`Math.min(1.5, mult * 1.06)`).
     - Rastrea `totalTriggersEvaluated`, `totalBarksEmitted`, `repetitionSuppressionsCount`, `userPokeCount`, `contextFrequencyMap` y calcula en vivo el `adaptiveScorePercent` (hasta `99%`).
3. **Interpolación Dinámica de Tokens:**
   - `{player_name}`: Se interpola con el nombre del jugador si `bondingLevel >= 3`; de lo contrario, se sustituye por `"Cadete"`.
   - `{unit_name}`: Reemplazado en caliente con la denominación de la unidad, provincia, estrecho o edicto involucrado (`context.unitName`).
4. **Canal Dual Supabase RPC / Fallback Local O(1):**
   - Invoca primero la función RPC `rpc_get_contextual_bark(p_commander_id, p_trigger_context)`.
   - Ante modo offline o sin coincidencia remota, ejecuta `sampleLocalTemplate(effectiveCommanderId, context.triggerContext, bondingLevel)` sobre `CANONICAL_BARK_TEMPLATES` con muestreo estocástico ponderado (`priorityWeight * dynamicWeightMultiplier`), y si el comandante es uno de los 28 oficiales sin plantilla estática para ese contexto, sintetiza automáticamente un bark dinámico con su `dayToDay`, `cop` o `scop`.
5. **Catálogo Completo de Disparadores Reactivos (`BarkTriggerContext` — 21 Contextos):**
   - **Combate Táctico (14):** `match_start`, `low_hp`, `enemy_near_miss`, `kill_heavy_tank`, `trap_ambush`, `hq_siege`, `cop_activated`, `scop_activated`, `victory`, `defeat`, `airdrop_spawn`, `airdrop_claimed`, `tilt_streak`, `idle_funds`.
   - **Geopolítica y Soberanía Dual Project Alice (7):** `region_claimed`, `siege_declared`, `capital_hegemony`, `overexpansion_warning`, `chokepoint_toll`, `buffer_zone_blocked`, `edict_enacted`.
6. **Catálogo de Intenciones Contextuales de Lobby (`LobbyBarkIntent` — 15 Intenciones en `CommanderLivingVignette.tsx`):**
   - Prioridad de resolución: `hoverIntent` $\to$ `commander_poke` (clic directo con física Squash & Stretch `scale(1.07, 0.92)`) $\to$ `last_match_victory` / `last_match_defeat` $\to$ `time_of_day` (Guardia Matutina 05:00-11:59, Operaciones Diurnas 12:00-18:59, Guardia Nocturna 19:00-04:59).
   - Terminales de Hover soportadas: `hover_deploy`, `hover_blitz`, `hover_armory`, `hover_war_room`, `hover_industry`, `hover_shop`, `hover_marketplace`, `hover_clans`, `hover_profile`, `hover_docs`, `hover_rotor`.

```
 ┌───────────────────────────────────────────────────────────────┐
 │  VIÑETA DEL COMANDANTE: MAYOR STELLA (ESTILO NOVELA GRÁFICA)  │
 │  ┌──────────────┐                                             │
 │  │              │    /~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\  │
 │  │   [RETRATO   │   |  ¡¿OTRA VEZ BOMBARDEROS FRENTE A      |  │
 │  │    FULL BODY │   <   TRES ANTIAÉREOS?! ¡¿ES QUE ACASO   |  │
 │  │    DIEGÉTICO │   |  QUIERES REGALARLES CHATARRA?!       |  │
 │  │   EXPRESIÓN: │    \__________________  _________________/  │
 │  │   ALARMED]   │                       \/ [COLA CÓMIC]       │
 │  │              │                                             │
 │  └──────────────┘      ┌──────────────┐                       │
 │      ★★★★★             │  ¡¡RATATAT!! │ <- SELLO ONOMATOPEYA  │
 │   VÍNCULO NV.6/10      └──────────────┘    ROTADO (-12°/+12°) │
 └───────────────────────────────────────────────────────────────┘
```

### 2.1 Las 5 Morfologías Tácticas de Bocadillos de Cómic (`BarkBalloonType` / `BubbleShape`)
En `CommanderBarkWidget.tsx` (`BarkBalloonType`) y `barkEngine.ts` (`BubbleShape`), los bocadillos adoptan geometría asimétrica (`rounded-[12px_4px_12px_4px]`) y sombras duras sin desenfoque (`shadow-[4px_4px_0px_#0A0B08]`):

1. **Bocadillo de Transmisión Militar (`radio`):** Fondo `#1E2019`/95 con borde verde radar `#00FF66` (`border-2 border-[#00FF66]`), texto crema `#F2E8D5` e indicador pulsante `CANAL C4ISR`. Usado para telemetría de sectores, partes nocturnos y enlaces de mando.
2. **Bocadillo de Alerta Crítica (`panic`):** Fondo carmesí oscuro `#3A1414`/95 con borde rojo `#EF4444` pulsante (`animate-pulse`), sello rojo `¡¡DEFCON 1!!` y disparo automático de SFX `explosion` más sacudida de pantalla (`__TRIGGER_TACTICAL_SHAKE__`). Usado en asedios territoriales inminentes (120s Handshake) o colapso defensivo.
3. **Bocadillo de Pensamiento Estratégico (`thought`):** En el widget diegético usa fondo `#2B2C24`/95 con borde ámbar `#F59E0B`; en la Gran Viñeta Viva usa papel crema `#F4F1EA` con borde oliva `#46521F` y esquinas suaves (`rounded-[24px_8px_24px_8px]`). Usado para evaluaciones logísticas, advertencias de sobre-expansión y análisis de mercado P2P.
4. **Bocadillo de Grito de Guerra (`shout`):** Fondo naranja óxido `#C46A3A`/95 con borde crema `#F2E8D5` (o negro `#0A0B08` de `4px` en viñeta) y disparo de SFX `co_power`. Usado en activación de COP/SCOP, inicios de partida, destrucciones de tanques pesados y victorias.
5. **Bocadillo Punteado de Sigilo (`whisper`):** Fondo `#161712`/95 con contorno discontinuo verde oliva (`border-2 border-dashed border-[#7B8A4A]`). Usado al detectar o tender emboscadas en bosques y arrecifes (`trap_ambush`).
6. **Bocadillo Estándar de Directiva (`speech` en `BubbleShape`):** Fondo `#2B2C24` con borde `#0A0B08` (`rounded-[20px_5px_20px_5px]`). Usado en diálogos de doctrina general y partes diurnos.

### 2.2 Catálogo de Sellos Pop-Art Cinéticos (`OnomatopoeiaStamp`) y Estados de Ánimo (`VignetteMood`)
1. **Los 13 Sellos Pop-Art de `OnomatopoeiaStamp` (`src/domains/game-feel/core/barkEngine.ts`):**
   Textos tipográficos rotados dinámicamente (`-12°` a `+12°` en combate; ángulo determinista en lobby) con sombra dura y reborde negro:
   - `¡BOOM!`: Remates de artillería pesada, destrucción de blindados pesados (`kill_heavy_tank`), `enemy_near_miss` o detonación de SCOP.
   - `¡RATATAT!`: Inicio de asalto motorizado (`match_start`), activación de COP o despliegue relámpago Blitz.
   - `¡TACTICAL!`: Maniobras de flanqueo, declaración de asedio (`siege_declared`) o directivas de hangar.
   - `¡ALERT!`: Daño crítico recibido (`low_hp`), asedio al Cuartel General (`hq_siege`), advertencia de sobre-expansión (`overexpansion_warning`) o guardia nocturna.
   - `¡CLUTCH!`: Victoria ajustada (`victory`), conquista de provincia (`region_claimed`) o supervivencia al límite.
   - `¡TRAP!`: Choque frontal contra unidad oculta en bosque o arrecife en niebla de guerra (`trap_ambush`).
   - `¡AIRDROP!`: Baliza de suministros dinámicos aterrizando en el sector (`airdrop_spawn`) o activación del Rotor C4ISR.
   - `¡HOLD!`: Defensa tenaz, cobro de peaje en estrechos (`chokepoint_toll`), bloqueo en zona de amortiguación (`buffer_zone_blocked`) o contraofensiva tras derrota.
   - `¡CALCULATED!`: Hegemonía sobre Capital (`capital_hegemony`), promulgación de edictos (`edict_enacted`) o cálculo balístico de Volkov.
   - `¡PANIC!`: Pérdida catastrófica de línea o retirada forzosa (`defeat`).
   - `¡HEADSHOT!`: Eliminación quirúrgica o fijación de objetivos de alta prioridad (Hawke).
   - `¡SINK!`: Fatalidad naval de buque o submarino que se hunde sin combustible.
   - `¡CRASH!`: Fatalidad aérea de caza o bombardero que se estrella por agotamiento de combustible.
2. **Sellos Diegéticos del Widget de Mapa (`CommanderBarkWidget.tsx`):**
   - `ESTADO MAYOR`, `ESTRATEGIA`, `LOGÍSTICA`, `¡¡AUTORIZADO!!`, `DOCTRINA`, `C4ISR ONLINE`, `SECTOR FIJADO`, `¡¡DEFCON 1!!`, `SUMINISTRO`, `FORJA`.
3. **Los 9 Estados de Ánimo de Viñeta (`VignetteMood`):**
   - `'neutral' | 'stern' | 'angry' | 'mocking' | 'proud' | 'alarmed' | 'tactical_focus' | 'clutch_relief' | 'defeat_despair'`.

---

# 3. DIAGNÓSTICO BALÍSTICO POST-COMBATE Y LIQUIDACIÓN TERRITORIAL (35% TECH SCRAP)
**[ESTADO: SINCRONIZADO CON LOS PILARES CANÓNICOS 2, 3 Y 6]**  
*Implementación de Referencia:* [`src/domains/tactics/core/tacticalCombatSeamlessIntegration.ts`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/tactics/core/tacticalCombatSeamlessIntegration.ts) (`settleCombatLossesAndScrap`) y [`src/shared/types/metagame.ts`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/shared/types/metagame.ts) (`calculateLossScrapRecovery`, `RECYCLE_SCRAP_RATE = 0.35`).

*Nota Arquitectónica:* El antiguo modelo de ofertas flash Tilt ($0.99) y niveles de carta 1-15 ha sido **erradicado**. En batallas territoriales, la derrota ocurre de forma inapelable al quedar con **0 tropas supervivientes en el tablero (Pilar 3)** sobre la escala balística continua de **1 a 100 HP enteros (Pilar 2)**. El reporte post-combate ejecuta el RPC transaccional `settle_territorial_combat_losses`, eliminando físicamente del hangar las unidades destruidas y acreditando exactamente el **35% de su valor en chatarra tecnológica (`tech_scrap`) (Pilar 6)** mediante `calculateLossScrapRecovery(tier, quantity)`.

```
┌────────────────────────────────────────────────────────────────┐
│  🔍 INFORME DE DAÑOS Y PÉRDIDAS DEL ALTO MANDO MILITAR         │
│                                                                │
│  BATALLA TERRITORIAL: REG_VE_01 (Distrito Capital Caracas)     │
│  ESCALA BALÍSTICA:    1 - 100 HP Enteros (0 Cartas / Hangar)   │
│  ESTADO DE OPERACIÓN: DERROTA POR ANIQUILACIÓN (0 Tropas Vivas)│
│                                                                │
│  BAJAS FÍSICAS REALES EN HANGAR (CAPACIDAD MÁX: 4 ACT + 12 RES)│
│  • 1x Tanque Medio T1 (0/100 HP) -> Baja Física Definitiva     │
│  • 1x Artillería T1   (0/100 HP) -> Baja Física Definitiva     │
│                                                                │
│  RECUPERACIÓN DE MATERIAL BÉLICO (35% TECH SCRAP - PILAR 6):   │
│  • Chatarra Tecnológica Acreditada: +35% (`tech_scrap`)        │
│  • Reintegración Industrial: Fundición en Parcelas / P2P       │
│                                                                │
│   [ 🏭 FORJAR CHASIS EN PARCELAS ]   [ 🛡️ SALVAGUARDA F2P ]    │
└────────────────────────────────────────────────────────────────┘
```

- **Mecánica Conductual Near-Miss (`enemy_near_miss`):** Cuando un blindado enemigo sobrevive con escasos puntos en la escala de 1-100 HP, el Bark Engine dispara el contexto `enemy_near_miss` (`priorityWeight: 40`), explotando el pensamiento contrafáctico (*Counterfactual Thinking*) y canalizando al jugador hacia la forja industrial de chasis de Tier superior (T1 a T5, +2% por tier hasta +8% máximo en T5 — **Pilar 4**) o el comercio en el mercado P2P.

---

# 4. CORPORACIONES MILITARES (CLANES), REGALÍAS P2P Y GUERRA TERRITORIAL
**[ESTADO: 100% IMPLEMENTADO Y CERTIFICADO EN MOTOR, FRONTEND Y TESTS]**  
*Implementación de Referencia:*
- Motor de Clanes: [`src/domains/world/core/clanSystem.ts`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/world/core/clanSystem.ts) (`ClanEngine`, `CLAN_VAULT_TIERS`, `CANONICAL_TERRITORY_SECTORS`, `CLAN_PROJECTS`)
- Interfaz de Cuartel General: [`src/domains/world/components/ClanHeadquartersView.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/world/components/ClanHeadquartersView.tsx)
- Reglas Financieras y Soberanía: [`src/shared/types/metagame.ts`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/shared/types/metagame.ts) (`MASTER_METAGAME_CONSTANTS`, `calculateP2PTransactionSplit`) y [`src/domains/economy/components/P2PMarketplaceView.tsx`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/economy/components/P2PMarketplaceView.tsx)

Las Corporaciones Militares son alianzas de hasta **30 comandantes** (`maxMembers: 30`, y hasta `MAX_CLANS_PER_ALLIANCE = 10` clanes por coalición) estructuradas bajo 4 rangos jerárquicos (`ClanRole`):
- `'commander_in_chief'`: Coronel / Comandante en Jefe (Fundador/Líder, exento de embargo diario).
- `'executive_officer'`: Mayor / Segundo al Mando (Co-Líder con permisos de proyectos de Estado Mayor).
- `'field_officer'` (y alias `'officer'`): Capitán / Oficial de Campo (Moderador/Reclutador con permisos de proyectos).
- `'cadet'`: Soldado / Cadete de Vanguardia (Miembro operativo regular).

### 4.0 Soberanía de Hubs Regionales, Regalías P2P del 1% y Conquista de Capitales
De acuerdo con la **Regla Financiera Canónica** y los **Pilares 5 y 7**:
1. **Split Fiscal P2P del 2% (`calculateP2PTransactionSplit` en `src/shared/types/metagame.ts`):**
   - Toda transacción ejecutada en el Mercado P2P (`public.p2p_market_orders`) aplica un **impuesto total estricto del 2%** (`TOTAL_P2P_TAX_RATE = 0.02`):
     $$\text{Impuesto Total (2\%)} = \underbrace{1\% \text{ Quema Deflacionaria (Sink)}}_{\text{PLATFORM\_BURN\_RATE} = 0.01} + \underbrace{1\% \text{ Regalía al Clan del Hub Regional}}_{\text{PROVINCE\_ROYALTY\_RATE} = 0.01}$$
   - El vendedor recibe el **98% neto** (`netSellerPayout = totalPriceEc - taxTotal`).
   - El **1% de Regalía Provincial (`provinceRoyaltyEc`)** se transfiere automáticamente a la tesorería del Clan que posee la soberanía del Hub Regional donde opera la terminal comercial.
   - Todas las órdenes están reguladas por las bandas dinámicas anti-inflación/anti-RMT **VWAP Collar ±25%** (`VWAP_COLLAR_PERCENT = 0.25`).
2. **Conquista de Capitales (+5% Buff Regional — Pilar 5):**
   - Las Capitales Regionales requieren abatir **15,000 TCP** (`CAPITAL_TCP_THRESHOLD = 15000` vs `10,000 TCP` en provincias estándar) y confieren al Clan controlador el **Buff Regional de +5% en extracción de recursos y eficiencia logística** en toda la región.
3. **Human Handshake de 120 Segundos en Asedios (Pilar 7):**
   - Cuando un Clan declara un asedio sobre un sector o provincia enemiga (`status = 'handshake_pending'`), se abre una ventana obligatoria de **120 segundos (2 minutos)** (`HANDSHAKE_TIMEOUT_SECONDS = 120`). Si un comandante humano del clan defensor no realiza el drop-in antes del vencimiento de `handshakeExpiresAt`, asume automáticamente la **IA de Guarnición (Niveles 1 a 5)** según el nivel de búnker del territorio.

```
                   DINÁMICA DE LA GUERRA CORPORATIVA Y EMBARGO
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          ▼                             ▼                             ▼
  [ 1 A 3 ACTIVOS ]             [ 4 A 7 ACTIVOS ]             [ 8 A 10+ ACTIVOS ]
   Cofre Menor de Campaña        Bóveda Militar Estándar       ¡GRAN ARSENAL ESTRATÉGICO!
   150G + Dotación Base          600G + 5 Acero + 5 Gemas      2,500G + 25 Acero + 10 Chips + 20 Gemas
          │                             │                             │
          └─────────────────────────────┼─────────────────────────────┘
                                        ▼
                        [ CIERRE DE JORNADA (00:00 UTC) ]
                        • Auditoría Automática (`ClanEngine.auditDailyWarClosure`)
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
         [ CONTRIBUYÓ (>= 1 Batalla) ]           [ PARÁSITO (0 Batallas) ]
         • Reclama bóveda inmediatamente         • Cofre bajo ¡EMBARGO POR DESHONOR!
         • Suma DP a Guerra Territorial          • Sello Pop-Art: ¡PAGA TU FIANZA!
                                                           │
                                                           ▼
                                             [ PAGO DE FIANZA O RESCATE ]
                                             • 30 Vigas Acero + 1,500 Créditos
                                                           │
                                            ┌──────────────┴──────────────┐
                                            ▼                             ▼
                             [ 50% TESORO CORPORATIVO ]     [ 50% TRIBUTO AL TOP 3 ]
                             • 750G + 15 Vigas Acero        • Top 1 (50% div): 375G + 7 Acero
                             • Fondos de clan blindados     • Top 2 (30% div): 225G + 4 Acero
                                                            • Top 3 (20% div): 150G + 4 Acero
```

### 4.1 Bóveda de Guerra Escalonada (`CLAN_VAULT_TIERS`)
Calculada mediante `ClanEngine.calculateVaultTier(activeMembersCount)` según los miembros con batallas activas en el ciclo diario de 24h (nota: los campos `commonCards`, `rareCards`, `epicCards` representan lotes de planos industriales/suministros bajo el Pilar 1 de Cero Cartas):
- **Tier 1 (`tier_1` — 1 a 3 activos, *Cofre Menor de Campaña*):** `150` Créditos (`creditsGold`), `15` lotes de suministros comunes (`commonCards: 15`).
- **Tier 2 (`tier_2` — 4 a 7 activos, *Bóveda Militar Estándar*):** `600` Créditos, `40` suministros comunes, `5` raros, `5` Vigas de Acero (`refinedSteel: 5`) y `5` Gemas (`gems: 5`).
- **Tier 3 (`tier_3` — 8+ activos, *¡GRAN ARSENAL ESTRATÉGICO!*):** **`2,500` Créditos, `100` suministros comunes, `15` raros, `3` épicos, `25` Vigas de Acero (`refinedSteel: 25`), `10` Microchips (`refinedMicrochips: 10`) y `20` Gemas (`gems: 20`)**.

### 4.2 La Regla del Embargo por Deshonor, Rescate de Camarada y Licencias
1. **Condición de Parásito (`auditDailyWarClosure`):** Miembros con **0 batallas** registradas (`warBattlesCount === 0`) durante el ciclo de 24 horas quedan marcados con `isEmbargoed = true`.
2. **Fianza de Deshonor (`payDishonorEmbargo`):** Para levantar el embargo, el miembro debe abonar **`EMBARGO_FEE_STEEL = 30` Vigas de Acero Militar + `EMBARGO_FEE_GOLD = 1,500` Créditos** (o `EMBARGO_FEE_GEMS = 50` Gemas).
3. **Redistribución Matemática Exacta:**
   - **50% al Tesoro Corporativo:** `+750G` y `+15` Vigas de Acero ingresan a `clan.treasuryGold` y `clan.treasurySteel`.
   - **50% como Dividendo Aristocrático al Top 3 de Contribución (`contributionPoints`):**
     - **Top 1 (50% del dividendo):** `375G` + `7` Acero.
     - **Top 2 (30% del dividendo):** `225G` + `4` Acero.
     - **Top 3 (20% del dividendo):** `150G` + `4` Acero.
4. **Protocolo de Rescate de Camarada (`ClanEngine.rescueComrade`):**
   - Un compañero de clan (`savior`) puede pagar de su propio bolsillo los `1,500G + 30 Acero` para liberar a un aliado embargado.
   - El salvador recibe **`+150` puntos de contribución/XP (`saviorXpEarned = 150`)** y se emite un parte heroico en el canal del clan.
   - El miembro rescatado tiene un enfriamiento de **14 días** (`14 * 86400000` ms en `lastRescueAt`) antes de poder volver a ser rescatado por otro aliado.
5. **Inmunidades y Licencias de Cuartel (`requestMilitaryFurlough`):**
   - Están exentos del embargo diario: el `commander_in_chief`, los reclutas recientes durante sus primeros **4 días** (`isImmuneNewRecruit = true`) y los miembros que activen una **Licencia Táctica Mensual** (`furloughsLeft`, máximo **2 días al mes**, consumida automáticamente al cierre de jornada).

### 4.3 Guerra Territorial de 7 Sectores (`CANONICAL_TERRITORY_SECTORS`) y Proyectos del Alto Mando (`CLAN_PROJECTS`)
1. **Los 7 Sectores Estratégicos (`CANONICAL_TERRITORY_SECTORS` en `src/domains/world/core/clanSystem.ts`):**
   - **Sector 1 — Base Aérea Águila Negra (`buff_air_drop`):** +10% probabilidad de planos aéreos en bóvedas (`1,250 DP` base).
   - **Sector 2 — Refinería Petroquímica (`buff_fuel_extraction`):** +10% extracción pasiva de combustible industrial para miembros (`2,400 DP` base).
   - **Sector 3 — Radar Maestro de Cota Cero (`buff_early_intel`):** Telemetría de largo alcance que revela tácticas enemigas (`1,800 DP` base).
   - **Sector 4 — Ciudadela Central (Bastión Supremo) (`buff_capital_tribute`):** Sector capital. Aporta `+500G` y `20` Vigas de Acero diarias al tesoro (`4,500 DP` base).
   - **Sector 5 — Centro de Ciber-Comando (`buff_forge_discount`):** -5% costo de forja en el Complejo Industrial (`1,950 DP` base).
   - **Sector 6 — Astillero Fluvial (`buff_naval_supply`):** Mayor asignación de planos navales y artillería costera (`1,600 DP` base).
   - **Sector 7 — Depósito Ferroviario (`buff_free_rail_transport`):** Logística pesada sin impuestos para transferencias internas (`2,100 DP` base).
2. **Aportación de Puntos de Despliegue (`ClanEngine.contributeTerritoryPoints`):**
   - Victoria 1v1: **`+100 DP`**.
   - Derrota 1v1: **`+25 DP`**.
   - Victoria Cooperativa 2v2 en Pareja de Clan: **`+200 DP`** (multiplicador $2.0\times$).
   - Sector Prioritario fijado por el Clan (`isPrioritySector = true`): **`+25% DP` adicional** (`Math.floor(baseDp * 1.25)`).
3. **Proyectos del Alto Mando (`CLAN_PROJECTS` — activables por Oficiales mediante `activateClanProject`):**
   - **`industrial_overcharge` (*Sobrealimentación Industrial*):** Coste `15,000G` + `250 Acero`. Otorga **+5% velocidad de extracción** en el Complejo Industrial para todo el clan durante **24 horas**.
   - **`war_siege_funding` (*Financiamiento de Asedio Bélico*):** Coste `25,000G` + `400 Acero`. Otorga **+15% de Puntos de Despliegue (DP)** en el sector disputado durante **12 horas**.

### 4.4 Protocolo de Salvaguarda Táctica (Seguro de Racha Proactivo)
- **Equipamiento Pre-Batalla (`ClanEngine.toggleSafeguard`):** El comandante decide si activa la Salvaguarda antes de iniciar el combate (`isEquipped = true`).
- **Mecánica de Victoria (`ClanEngine.processMatchOutcome`):**
  - La racha de victorias aumenta en $+1$ (`currentStreak + 1`).
  - La Salvaguarda Táctica **NO se consume** (`wasSafeguardConsumed = false`) y permanece equipada para el siguiente despliegue.
- **Mecánica de Derrota:**
  - Si estaba equipada y hay stock (`stock > 0`), la Salvaguarda Táctica se **sacrifica heroicamente**: se consume 1 unidad del inventario (`stock - 1`), pasa a `isEquipped = false`, y la racha de victorias **se mantiene blindada intacta** (`streakDelta = 0`).
  - Si no estaba equipada, la racha se reinicia a `0`.
- **Escala de Multiplicador de Botín por Racha (`ClanEngine.calculateStreakMultiplier`):**
  $$\text{Multiplicador}(\text{Racha}) = 1.0 + \min(5, \max(0, \text{Racha} - 2)) \times 0.25$$
  - 1 a 2 Victorias: $1.0\times$ (Botín Estándar).
  - 3 Victorias: $1.25\times$.
  - 4 Victorias: $1.50\times$.
  - 5 Victorias: $1.75\times$.
  - 6 a 7+ Victorias: **$2.0\times$ a $2.25\times$ (🔥 ¡Botín Multiplicado de Racha Invicta!)**.
- **Taller Militar de Forja F2P (`ECONOMY_CONFIG_V2.safeguardCrafting` en `src/domains/economy/core/industrialEngine.ts`):** Los jugadores pueden forjar Salvaguardas invirtiendo **`2,500` Créditos, `30` Vigas de Acero Militar, `10` de Hormigón Armado y `3` de Combustible de Campaña (`0` Microchips)** con un tiempo de forja de **18 horas** (`64,800` segundos). Stock máximo: **2 unidades en F2P** (`maxStorageF2P: 2`) y **3 con Command Pass** (`maxStoragePass: 3`).

---

# 5. SISTEMA DE COMUNICACIÓN Y MODO SOCIAL 2v2

### 5.1 Capa de Comunicación y Moderación
- **Menú Principal (`WarLobbyHub.tsx` y `CommanderLivingVignette.tsx`):** Canales regionales de Chat Global, Transmisiones Encriptadas C4ISR (`COMMS`), Reclamo de Suministros de Alianza (`+50t`), Tablón de Reclutamiento Corporativo y búsqueda de pareja 2v2.
- **Dentro de la Partida:**
  - Canal privado de escuadrón (Modo 2v2).
  - Quick Chat Táctico predeterminado (mensajes instantáneos en viñeta cómic).
  - Botón de Pánico "MUTE": Silencia de inmediato todo emote o mensaje rival.

### 5.2 Mecánica del Modo 2v2 (Ajedrez Cruzado)
- **Secuencia de Turnos:** Jugador A1 $\to$ Jugador B1 $\to$ Jugador A2 $\to$ Jugador B2.
- **Economía:** Fondos individuales generados por las propiedades que cada jugador capturó personalmente.
- **Sinergia de Guerra Territorial:** Las victorias en pareja 2v2 con un compañero de clan otorgan el doble de Puntos de Despliegue (`200 DP` vs `100 DP` en 1v1).
- **Herramienta de Coordinación:** Pings en el mapa para marcar casillas de ataque o señalar rutas de transporte aéreo/naval a su aliado.

---

# 6. REGISTRO MAESTRO DE SONIDO TÁCTICO Y SÍNTESIS PROCEDURAL WEB AUDIO
*Implementación de Referencia:* [`src/domains/game-feel/core/audioManager.ts`](file:///c:/Users/Mor%C3%ADn/GEOTACTICS-ONLINE/src/domains/game-feel/core/audioManager.ts) (`audioManager`, `AUDIO_SYNTHESIS_CATALOG`, `SfxType`, `SoundCueConfig`).

Todas las pistas y efectos militares operan mediante **síntesis procedural nativa en Web Audio API**, requiriendo **0 descargas de assets de audio externos**. El sintetizador incluye un secuenciador BGM en tiempo real (`'march' | 'tension'`), escalado semitonal de combos (`playComboAction`) y el catálogo `AUDIO_SYNTHESIS_CATALOG`:

### 6.1 Catálogo de Cues de Síntesis Directa (`AUDIO_SYNTHESIS_CATALOG` en `src/domains/game-feel/core/audioManager.ts`)

| Cue ID (`AUDIO_SYNTHESIS_CATALOG`) | Tipo de Onda (`waveType`) | Frecuencia Base $\to$ Barrido | Duración (`durationMs`) | Ataque / Decaimiento | Ganancia (`gain`) | Capa de Ruido (`noiseLayer`) | Contexto de Disparo en Motor |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `ui_cursor_move` | `sine` | $440\text{ Hz}$ (fijo) | $40\text{ ms}$ | $2\text{ ms} / 38\text{ ms}$ | `0.15` | No | Movimiento de cursor sobre cuadrícula o hover UI. |
| `ui_tile_confirm` | `triangle` | $587.33\text{ Hz}$ (fijo) | $80\text{ ms}$ | $5\text{ ms} / 75\text{ ms}$ | `0.25` | No | Selección de casilla y confirmación de orden. |
| `ui_cancel_rollback` | `sawtooth` | $220\text{ Hz} \to 146.83\text{ Hz}$ | $90\text{ ms}$ | $5\text{ ms} / 85\text{ ms}$ | `0.20` | No | Cancelación de ruta o cierre de modal. |
| `cannon_fire_heavy` | `sawtooth` | $95\text{ Hz} \to 30\text{ Hz}$ | $450\text{ ms}$ | $10\text{ ms} / 440\text{ ms}$ | `0.60` | **Sí** | Disparo de Tanques Medios, Pesados y Acorazados. |
| `machinegun_burst` | `square` | $180\text{ Hz} \to 90\text{ Hz}$ | $180\text{ ms}$ | $2\text{ ms} / 178\text{ ms}$ | `0.35` | **Sí** | Ráfagas de Infantería, Jeeps Recon y Helicópteros. |
| `rocket_launch` | `sawtooth` | $120\text{ Hz} \to 380\text{ Hz}$ | $600\text{ ms}$ | $40\text{ ms} / 560\text{ ms}$ | `0.45` | **Sí** | Artillería Obús, Lanzacohetes y Misiles AA. |
| `explosion_critical` | `sawtooth` | $65\text{ Hz} \to 20\text{ Hz}$ | $800\text{ ms}$ | $15\text{ ms} / 785\text{ ms}$ | `0.70` | **Sí** | Destrucción total de chasis o bocadillo `panic`. |
| `trap_alert` | `square` | $880\text{ Hz} \to 220\text{ Hz}$ | $300\text{ ms}$ | $5\text{ ms} / 295\text{ ms}$ | `0.50` | No | Emboscada en niebla de guerra (`¡TRAP!`). |
| `airdrop_impact` | `triangle` | $130\text{ Hz} \to 60\text{ Hz}$ | $500\text{ ms}$ | $20\text{ ms} / 480\text{ ms}$ | `0.40` | **Sí** | Aterrizaje de suministros o refuerzos. |
| `co_power_charge` | `sine` | $261.63\text{ Hz} \to 1046.50\text{ Hz}$ | $1,200\text{ ms}$ | $100\text{ ms} / 1,100\text{ ms}$ | `0.50` | No | Activación de Poder CO (`cop`) / Superpoder (`scop`). |
| `hq_collapse` | `sawtooth` | $80\text{ Hz} \to 15\text{ Hz}$ | $1,500\text{ ms}$ | $50\text{ ms} / 1,450\text{ ms}$ | `0.80` | **Sí** | Captura o caída de Cuartel General / Bastión. |

### 6.2 Especificación Acústica Extendida y Normalización LUFS (`playSFX(type: SfxType)`)
Los efectos invocados mediante `audioManager.playSFX(type)` (`'cannon' | 'machinegun' | 'rocket' | 'explosion' | 'move_tread' | 'move_foot' | 'unit_select' | 'unit_order' | 'capture' | 'victory' | 'defeat' | 'co_power' | 'super_co_power' | 'button_click' | 'combat_hit'`) operan a $44.1\text{kHz} / 48\text{kHz}$ con ducking dinámico sobre el canal BGM:

| Asset / Evento | Categoría | Duración | Ganancia / LUFS | Ducking Música | Algoritmo Web Audio API Primario (Procedural Nativo) | Trigger Context |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `sfx_cannon_heavy` (`cannon`) | `combat` | $650\text{ ms}$ | $-2.0\text{ dB}$ / $-14\text{ LUFS}$ | $-3\text{ dB}$ ($400\text{ms}$) | Oscilador triangular con caída de $140\text{Hz} \rightarrow 35\text{Hz}$ + Buffer de ruido filtrado a $450\text{Hz}$. | Tanques Medios, Neotanques, Acorazados. |
| `sfx_machinegun` (`machinegun`) | `combat` | $420\text{ ms}$ | $-3.5\text{ dB}$ / $-16\text{ LUFS}$ | $0\text{ dB}$ | 6 pulsos estocásticos de ruido blanco paso-banda a $1,200\text{Hz}$ espaciados cada $65\text{ms}$. | Infantería, Blindados Recon, Helicópteros. |
| `sfx_rocket_launch` (`rocket`) | `combat` | $850\text{ ms}$ | $-2.5\text{ dB}$ / $-15\text{ LUFS}$ | $-3\text{ dB}$ ($600\text{ms}$) | Barrido senoidal ascendente ($200\text{Hz} \rightarrow 800\text{Hz}$) con resonancia armónica. | Artillería Obús, Lanzacohetes Asedio. |
| `sfx_explosion_unit` (`explosion`) | `combat` | $950\text{ ms}$ | $-1.5\text{ dB}$ / $-13\text{ LUFS}$ | $-4\text{ dB}$ ($800\text{ms}$) | Ruido marrón con curva de decaimiento exponencial ($T_{60} = 0.8\text{s}$) y sub-bajo de $45\text{Hz}$. | Destrucción absoluta de escuadrón (0/100 HP). |
| `sfx_trap_ambush` | `combat` | $700\text{ ms}$ | $-1.0\text{ dB}$ / $-12\text{ LUFS}$ | $-5\text{ dB}$ ($600\text{ms}$) | Acorde disonante en trémolo rápido ($440\text{Hz} + 466\text{Hz}$) y percusión metálica en seco. | Choque de marcha en niebla (`¡TRAP!`). |
| `sfx_airdrop_chute` | `ambient` | $1,200\text{ ms}$ | $-4.0\text{ dB}$ / $-18\text{ LUFS}$ | $-2\text{ dB}$ ($800\text{ms}$) | Silbido descendente por filtro paso-alto decreciente ($3\text{kHz} \rightarrow 800\text{Hz}$) + impacto. | Spawneo de caja de suministros T2/T5. |
| `sfx_silo_nuclear` | `combat` | $2,400\text{ ms}$ | $0.0\text{ dB}$ / $-10\text{ LUFS}$ | **$-8\text{ dB}$ ($2,000\text{ms}$)** | Sirena bitonal descendente + saturación armónica en onda cuadrada suavizada. | Impacto de misil balístico estratégico. |
| `sfx_scop_cinematic` (`super_co_power`) | `narrative` | $1,800\text{ ms}$ | $-0.5\text{ dB}$ / $-11\text{ LUFS}$ | **$-6\text{ dB}$ ($1,500\text{ms}$)** | Glissando orquestal ascendente en modo jónico, platillo resonante y pulso atómico. | Activación de Super CO Power (`scop`). |
| `sfx_capture_tick` (`capture`) | `ui` | $180\text{ ms}$ | $-6.0\text{ dB}$ / $-20\text{ LUFS}$ | $0\text{ dB}$ | Doble pulso senoidal puro de $880\text{Hz}$ y $1,320\text{Hz}$ con decaimiento percusivo de $25\text{ms}$. | Pulsación de captura o resta de puntos de sede. |
| `sfx_unit_join` | `ui` | $450\text{ ms}$ | $-3.0\text{ dB}$ / $-16\text{ LUFS}$ | $-2\text{ dB}$ ($300\text{ms}$) | Tono ascendente en quinta justa ($523\text{Hz} \rightarrow 784\text{Hz}$) + tintineo metálico de reembolso. | Fusión de tropas (`join`) con tesoro. |
| `sfx_timer_tick` | `ui` | $120\text{ ms}$ | $-4.0\text{ dB}$ / $-18\text{ LUFS}$ | $-2\text{ dB}$ | Pulso percusivo a $1,000\text{Hz}$ con modulación a $2\text{Hz}$ al restar $\le 5\text{s}$ de turno. | Alerta visual/acústica de tiempo crítico o Handshake 120s. |

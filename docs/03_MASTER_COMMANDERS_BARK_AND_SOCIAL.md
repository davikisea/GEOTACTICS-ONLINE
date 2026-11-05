# VOLUMEN 3: COMANDANTES, BARK ENGINE CÓMIC Y CAPA SOCIAL CORPORATIVA
**Documento Canónico Unificado:** `03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 4.0.0-DEFINITIVE-MASTER-SPEC  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Archivos Consolidados y Reemplazados:**  
- `13_CO_SYSTEM_MONETIZATION_AND_BARK_ENGINE.md` (Completo)  
- `19_HYPER_ENGAGEMENT_CLAN_LOOT_DISHONOR.md` (Completo)  
- `12_EXTENDED_METAGAME_ARCHITECTURE.md` (Módulo 3: Capa Social y 2v2)  
- `21_HYPER_ENGAGEMENT_ASYMMETRIC_LADDER_NEARMISS.md` (Diagnóstico Balístico Near-Miss)  

---

# 1. SISTEMA DE COMANDANTES TÁCTICOS (COMMANDING OFFICERS - COs)

Los Comandantes representan la cúspide doctrinal del ejército del jugador. A diferencia de las unidades estándar, los COs no se despliegan físicamente como fichas en el tablero; operan como la entidad de mando que otorga bonificaciones pasivas permanentes y un **Superpoder Táctico de Mando (Super CO Power)** activable cuando su medidor de energía se llena mediante combate y bajas sufridas.

```
                    ARQUITECTURA DE UN COMANDANTE TÁCTICO
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
[ DOCTRINA PASIVA ]          [ MEDIDOR DE SUPERPODER ]     [ VÍNCULO DE CAMARADERÍA ]
• Bonus de Ataque/Defensa    • Carga por daño infligido/   • Niveles de Vínculo (1-10)
  a tipos específicos         recibido y AirDrops          • Diálogos personalizados
• Modificador de Terreno     • Activación de Gran Impacto  • Apodos y viñetas únicas
```

### 1.1 Catálogo de Comandantes Canónicos (28 COs Implementados)
*Implementación de Referencia:* `src/engine/coSystem.ts`, `src/components/game/COCommandBar.tsx`, `src/engine/coSystem.test.ts`, `src/engine/expandedCOs.test.ts`.

El motor implementa el catálogo canónico completo de **28 Comandantes Tácticos** clasificados por facción y doctrina bélica de Advance Wars / WarsWorld, junto con los comandantes originales del Alto Mando:

1. **Mecánica Oficial del Medidor de Poder (COP & SCOP):**
   - **Valor por Estrella:** Cada estrella del medidor equivale a **$9,000G** de valor de combate (`STAR_CHARGE_VALUE = 9000`).
   - **Carga Defensiva:** Daño sufrido carga el **100%** del valor financiero de la salud perdida (`DEFENSIVE_CHARGE_MULT = 1.0`).
   - **Carga Ofensiva:** Daño infligido carga el **50%** del valor financiero de la salud enemiga destruida (`OFFENSIVE_CHARGE_MULT = 0.5`).
   - **Poderes de CO (COP):** Primer nivel de estrellas; otorga efectos inmediatos más un **+10% Ataque y +10% Defensa universal** durante el turno.
   - **Superpoderes de CO (SCOP):** Barra estelar completa; desata efectos doctrinales devastadores.

2. **Matriz de Comandantes por Facción:**
| Facción | Comandantes Canónicos (`COId`) | Doctrinas Destacadas |
|:---|:---|:---|
| **Orange Star** | `andy`, `max`, `sami`, `nell`, `hachi`, `rachel`, `jake` | Reparación de emergencia (`Hyper Upgrade`), combate directo cuerpo a cuerpo, supremacía de infantería y captura acelerada. |
| **Blue Moon** | `olaf`, `grit`, `colin`, `sasha` | Inmunidad ártica (ventiscas invernales), francotiradores de artillería de largo alcance, economía de bajo coste (`Gold Rush`) y robo de fondos. |
| **Green Earth** | `eagle`, `drake`, `jess`, `javier` | Aviación de ataque relámpago con doble turno (`Lightning Strike`), inmunidad marina a tormentas y blindaje de torres de telecomunicación. |
| **Yellow Comet**| `kanbei`, `sonja`, `sensei`, `grimm` | Tropas de élite con moral samurái (+20% ataque/defensa base), visión superior en niebla de guerra e invasión paracaidista masiva. |
| **Black Hole**  | `flak`, `adder`, `lash`, `hawke`, `sturm`, `von_bolt`, `jugger`, `koal`, `kindle` | Carga ultra-rápida, movimiento ágil sobre cualquier terreno, drenaje biológico global (`Black Wave`), bombardeo orbital con meteoritos (`Meteor Strike`) y shock electromagnético. |
| **Alto Mando Original** | `stella`, `volkov`, `garrison`, `vance` | Comandantes de novela gráfica integrados en el Bark Engine reactivo (`stella`: blindados Blitz, `volkov`: artillería, `garrison`: defensa territorial). |

### 1.2 Medidor de Vínculo de Camaradería (Bonding Level)
- La relación entre el jugador y cada Comandante es bilateral y persistente.
- Al combatir con un mismo comandante, se acumula **XP de Camaradería** (Niveles de Vínculo 1 al 10).
- Subir de nivel de vínculo desbloquea:
  - *Nivel 3:* El Comandante utiliza el nombre del jugador en sus viñetas.
  - *Nivel 6:* Desbloqueo de sellos de onomatopeyas exclusivos de su doctrina.
  - *Nivel 10:* Retrato animado alternativo y marcos de perfil de novela gráfica militar.

---

# 2. EL BARK ENGINE PROCEDURAL DE NOVELA GRÁFICA (SIN VOCES)
**[ESTADO: 100% IMPLEMENTADO Y CERTIFICADO EN MOTOR, FRONTEND Y TESTS]**  
*Implementación de Referencia:* `src/engine/barkEngine.ts`, `src/components/game/ComicVignetteOverlay.tsx`, `src/engine/barkEngine.test.ts`.

El Bark Engine proyecta sobre el Canvas y la interfaz web una narrativa visual reactiva inspirada en la novela gráfica bélica, el Pop-Art clásico con tramas de puntos Ben-Day y el **sistema de diseño atompunk de la skill [`retro-futurism`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/agents/skills/retro-futurism/skill.md)** (`agents/skills/retro-futurism/skill.md`), **prescindiendo por completo de archivos de audio de voz** para garantizar tiempos de carga instantáneos ($< 1.0$s) y cero consumo innecesario de ancho de banda.

### 2.0 Arquitectura de Ejecución en Tiempo Real
1. **Buffer de Memoria Anti-Repetición (`recentBarksBuffer`):** Almacena los últimos 5 IDs de diálogo disparados, descartándolos estocásticamente para evitar frases repetitivas durante un mismo combate.
2. **Interpolación Dinámica de Tokens:**
   - `{player_name}`: Se interpola con el nombre del jugador si el `bondingLevel >= 3`; de lo contrario, se sustituye por `"Cadete"`.
   - `{unit_name}` / `{co_name}`: Reemplazados en caliente con la denominación de la unidad o comandante involucrado.
3. **Canal Dual Supabase RPC / Fallback Local:** Consulta la función transaccional `rpc_get_contextual_bark(p_commander_id, p_trigger_context, p_bonding_level)` y, ante latencia de red o juego offline, recurre de inmediato al catálogo estocástico local en memoria.
4. **Disparadores Reactivos (Hooks) Integrados en Combate (`App.tsx`):**
   - Detonación de Superpoderes CO (`co_power_active` / `co_power_enemy`).
   - Emboscadas en niebla de guerra (`trap_ambush`).
   - Caída y captura de cajas de suministros (`airdrop_spawn`).
   - Destrucción de unidades blindadas pesadas (`kill_heavy_tank`).
   - Derrota ajustada por telemetría (`near_miss`).

Las viñetas, marcos de diálogo, tarjetas de perfil y medidores de energía adoptan la geometría aerodinámica de la skill `retro-futurism`:
- Biseles cromados y degradados metálicos en los marcos de viñeta.
- Esquinas asimétricas (`40px 10px 40px 10px`) para tarjetas de comandantes y diálogos de radio.
- Paleta canónica retro-futurista: base `#2B2C24`, acentos en Oliva Oscuro `#46521F`, Verde Apagado `#7B8A4A`, Naranja Óxido `#C46A3A` y Crema `#F2E8D5`.
- Sombras sólidas proyectadas a $15\text{px}$ sin desenfoque (`box-shadow: 15px 15px 0px rgba(0,0,0,0.5)`).

```
 ┌───────────────────────────────────────────────────────────────┐
 │  VIÑETA DEL COMANDANTE: MAYOR STELLA (ESTILO NOVELA GRÁFICA)  │
 │  ┌──────────────┐                                             │
 │  │              │    /~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\  │
 │  │   [RETRATO   │   |  ¡¿OTRA VEZ BOMBARDEIROS FRENTE A    |  │
 │  │    PIXEL/    │   <   TRES ANTIAÉREOS?! ¡¿ES QUE ACASO   |  │
 │  │    COMIC     │   |  QUIERES REGALARLES CHATARRA?!       |  │
 │  │   EXPRESIÓN: │    \__________________  _________________/  │
 │  │   SARCÁSTICA]│                       \/ [COLA DENTADA]     │
 │  │              │                                             │
 │  └──────────────┘      ┌──────────────┐                       │
 │      ★★★★★             │  ¡¡KABOOM!!  │ <- SELLO ONOMATOPEYA  │
 │   BOND NIVEL 6         └──────────────┘    ESTILO ARTE POP    │
 └───────────────────────────────────────────────────────────────┘
```

### 2.1 Taxonomía Visual de Bocadillos de Diálogo
1. **Bocadillo Estándar (`speech`):** Óvalo suave con cola curva. Usado para directivas tácticas estándar.
2. **Bocadillo Dentado de Grito (`shout`):** Bordes angulares en zigzag agudo. Usado en derrotas consecutivas, activación de Superpoderes o impactos al HQ.
3. **Bocadillo de Pensamiento (`thought`):** Nube esponjosa con círculos ascendentes. Usado por estrategas calculadores evaluando la niebla de guerra.
4. **Bocadillo Punteado de Sigilo (`whisper`):** Contorno discontinuo. Usado al tender emboscadas en bosques (`¡TRAP!`).
5. **Bocadillo de Transmisión Militar (`radio`):** Rectángulo técnico con textura de estática. Usado durante la búsqueda de emparejamiento.

### 2.2 Catálogo de Sellos Pop-Art de Onomatopeyas (`OnomatopoeiaStamp`)
Textos tipográficos rotados con sombra dura y reborde negro implementados en `src/engine/barkEngine.ts`:
- `¡BOOM!`: Remates de artillería pesada o daño masivo a sede central.
- `¡RATATAT!`: Ráfagas de antiaéreo Vulcan y ametralladoras ligeras.
- `¡TACTICAL!`: Flanqueo efectivo o captura de ciudad enemiga.
- `¡PANIC!`: Detección de pérdida de 3 unidades en el mismo turno.
- `¡CLUTCH!`: Supervivencia milagrosa con menos de 3 HP en el HQ.
- `¡TRAP!`: Choque frontal contra unidad oculta en bosque o arrecife.
- `¡AIRDROP!`: Baliza de suministros dinámicos aterrizando en el sector.
- `¡HOLD!`: Defensa tenaz y absorción de impacto sobre terreno fortificado.
- `¡CALCULATED!`: Jugada maestra y aniquilación sin bajas.
- `¡HEADSHOT!`: Eliminación fulminante de unidad de alto valor táctico.
- `¡SINK!`: Fatalidad de submarino sin combustible que se hunde en las profundidades.
- `¡CRASH!`: Fatalidad de aeronave sin combustible que se estrella contra el suelo.

---

# 3. DIAGNÓSTICO BALÍSTICO POST-COMBATE Y LIQUIDACIÓN TERRITORIAL
**[ESTADO: ACTUALIZADO AL CANON GEOTACTICS: ONLINE (v0.0.1-alfa)]**  
*Nota Arquitectónica:* El antiguo modelo de ofertas flash Tilt ($0.99) y niveles de carta 1-15 (`asymmetricLadderEngine.ts`, `TiltEmergencyOfferModal.tsx`) ha sido **deprecado y archivado** en `docs/archive_legacy/code_v0_ccg/`. En su lugar, el reporte post-combate en batallas provinciales opera mediante el RPC transaccional `settle_territorial_combat_losses`, acreditando el **35% de chatarra tecnológica (`tech_scrap`)** sobre los chasis destruidos para su refundición en lingotes de acero.

```
┌────────────────────────────────────────────────────────────────┐
│  🔍 INFORME DE DAÑOS Y PÉRDIDAS DEL ALTO MANDO MILITAR         │
│                                                                │
│  BATALLA TERRITORIAL: REG_VE_01 (Caracas Central)              │
│  ESTADO DE OPERACIÓN:  DERROTA TÁCTICA (-1,500 TCP)            │
│                                                                │
│  BAJAS REGISTRADAS EN HANGAR:                                  │
│  • 1x Tanque Medio T1 (Destruido) -> Sumidero Real             │
│  • 1x Artillería T1 (Destruida)   -> Sumidero Real             │
│                                                                │
│  RECUPERACIÓN DE MATERIAL BÉLICO (35% TECH SCRAP):             │
│  • Chatarra Tecnológica Acreditada: +455 Scrap                 │
│  • Tasa de Conversión en Fundición: 2 Scrap -> 1 Acero         │
│                                                                │
│   [ 🏭 FORJAR CHASIS EN PARCELAS ]   [ 🛡️ SALVAGUARDA F2P ]    │
└────────────────────────────────────────────────────────────────┘
```

- **Mecánica Conductual:** Explota el pensamiento contrafáctico (*Counterfactual Thinking*). El jugador no siente que fue superado intelectualmente, sino que su equipo se quedó a milímetros de la victoria, canalizando la necesidad de revancha hacia la producción industrial de acero o la compra en el mercado P2P.

---

# 4. CORPORACIONES MILITARES (CLANES) Y GUERRA CORPORATIVA
**[ESTADO: 100% IMPLEMENTADO Y CERTIFICADO EN MOTOR, FRONTEND Y TESTS]**  
*Implementación de Referencia:* `src/engine/clanSystem.ts`, `src/components/clans/ClanHeadquartersView.tsx`, `src/engine/clanSystem.test.ts`.

Las corporaciones son alianzas de hasta 30 comandantes que compiten en operaciones bélicas diarias sincronizadas.

```
                  DINÁMICA DE LA GUERRA CORPORATIVA Y EMBARGO
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
 [ 1 A 3 ACTIVOS ]             [ 4 A 7 ACTIVOS ]             [ 8 A 10+ ACTIVOS ]
  Cofre Menor de Campaña        Bóveda Militar Estándar       ¡GRAN ARSENAL ESTRATÉGICO!
  Recompensa: $1\times$         Recompensa: $2.5\times$       Recompensa: $5\times$ (Épicas + Gemas)
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       ▼
                       [ CIERRE DE JORNADA (00:00 UTC) ]
                       • Auditoría Automática de Participación
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        [ CONTRIBUYÓ (>= 1 Victoria) ]          [ PARÁSITO (0 Batallas) ]
        • Reclama cofre inmediatamente         • Cofre bajo ¡EMBARGO POR DESHONOR!
        • Recibe condecoración de servicio     • Sello Pop-Art: ¡PAGA TU FIANZA!
                                                          │
                                                          ▼
                                            [ PAGO DE TASA DE DESHONOR ]
                                            • 30 Vigas Acero + 1,500 Créditos
                                                          │
                                           ┌──────────────┴──────────────┐
                                           ▼                             ▼
                            [ 50% TESORO CORPORATIVO ]     [ 50% TRIBUTO AL TOP 3 ]
                            • 750G + 15 Vigas Acero        • Top 1 (50% div): 375G + 7 Acero
                            • Fondos de clan blindados     • Top 2 (30% div): 225G + 4 Acero
                                                           • Top 3 (20% div): 150G + 4 Acero
```

### 4.1 Bóveda de Guerra Escalonada
- **Tier 1 (1 a 3 activos):** 150 Créditos, 15 Cartas Comunes.
- **Tier 2 (4 a 7 activos):** 600 Créditos, 40 Cartas Comunes, 5 Raras, 5 Acero.
- **Tier 3 (8 a 10+ activos - ¡Gran Arsenal!):** **2,500 Créditos, 100 Cartas, 15 Raras, 3 Épicas, 25 Acero, 10 Microchips y 20 Gemas**.

### 4.2 La Regla del Embargo por Deshonor
- **Condición de Parásito:** Miembros con **0 batallas** registradas durante las 24 horas del ciclo de guerra.
- **Visualización en Interfaz:** El cofre legendario está visible pero atado con cadenas y el sello Pop-Art `¡EN EMBARGO!`.
- **Fianza de Deshonor:** Para abrirlo, el parásito debe pagar obligatoriamente **30 Vigas de Acero Militar + 1,500 Créditos** (o 50 Gemas de Mando).
- **Redistribución Canónica:**
  - **50% al Tesoro Corporativo:** 750G y 15 vigas de acero militar fortalecen las reservas del clan.
  - **50% como Dividendo Aristocrático al Top 3:**
    - **Top 1:** Recibe el $50\%$ del dividendo (375G + 7 Acero).
    - **Top 2:** Recibe el $30\%$ del dividendo (225G + 4 Acero).
    - **Top 3:** Recibe el $20\%$ del dividendo (150G + 4 Acero).
  - El chat del clan emite automáticamente la alerta militar de deshonor y rehabilitación con honores.
- **Protecciones:** 2 días de Licencia Táctica al mes y 4 días de inmunidad para reclutas recién ingresados.

### 4.3 Protocolo de Salvaguarda Táctica (Seguro de Racha Proactivo)
- **Equipamiento Pre-Batalla:** El comandante decide si activa la Salvaguarda antes de iniciar el combate.
- **Mecánica de Victoria:**
  - La racha de victorias aumenta en $+1$.
  - La Salvaguarda Táctica **NO se consume** y permanece equipada para el siguiente despliegue.
- **Mecánica de Derrota:**
  - La Salvaguarda Táctica se **sacrifica heroicamente**: se consume 1 unidad del inventario y se desequipa.
  - La racha de victorias **se mantiene blindada intacta**, sin reiniciar a 0.
- **Escala de Multiplicador de Botín por Racha:**
  $$\text{Multiplicador}(\text{Racha}) = 1.0 + \min(5, \max(0, \text{Racha} - 2)) \times 0.25$$
  - 1 a 2 Victorias: $1.0\times$ (Botín Estándar).
  - 3 Victorias: $1.25\times$.
  - 4 Victorias: $1.50\times$.
  - 5 Victorias: $1.75\times$.
  - 6+ Victorias: **$2.0\times$ (🔥 ¡Doble Botín Completo!)**.
- **Taller Militar de Forja F2P:** Los jugadores pueden forjar Salvaguardas en los talleres corporativos invirtiendo 3,500 Créditos, 40 Vigas de Acero Militar, 15 de Hormigón y 5 de Combustible (0 Microchips). Stock máximo: 2 unidades en F2P (3 con Command Pass).

---

# 5. SISTEMA DE COMUNICACIÓN Y MODO SOCIAL 2v2

### 5.1 Capa de Comunicación y Moderación
- **Menú Principal:** Canales regionales de Chat Global, Tablón de Reclutamiento Corporativo y búsqueda de pareja 2v2.
- **Dentro de la Partida:**
  - Canal privado de escuadrón (Modo 2v2).
  - Quick Chat Táctico predeterminado (mensajes instantáneos en viñeta cómic).
  - Botón de Pánico "MUTE": Silencia de inmediato todo emote o mensaje rival.

### 5.2 Mecánica del Modo 2v2 (Ajedrez Cruzado)
- **Secuencia de Turnos:** Jugador A1 $\to$ Jugador B1 $\to$ Jugador A2 $\to$ Jugador B2.
- **Economía:** Fondos individuales generados por las propiedades que cada jugador capturó personalmente.
- **Herramienta de Coordinación:** Pings en el mapa para marcar casillas de ataque o señalar rutas de transporte aéreo/naval a su aliado.


---

# 6. REGISTRO MAESTRO DE SONIDO TÁCTICO Y SÍNTESIS PROCEDURAL WEB AUDIO
Todas las pistas y efectos militares operan mediante **síntesis procedural nativa en Web Audio API** (`AUDIO_SYNTHESIS_CATALOG` en `src/engine/audioManager.ts`), requiriendo **0 descargas de assets de audio externos**. Operan a $44.1\text{kHz} / 48\text{kHz}$ normalizados con pitch shifting estocástico ($\pm 4\%$) para erradicar la fatiga acústica:

| Asset ID | Categoría | Duración | Ganancia / LUFS | Ducking Música | Algoritmo Web Audio API Primario (Procedural Nativo) | Trigger Context |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `sfx_cannon_heavy` | `combat` | $650\text{ ms}$ | $-2.0\text{ dB}$ / $-14\text{ LUFS}$ | $-3\text{ dB}$ ($400\text{ms}$) | Oscilador triangular con caída de $140\text{Hz} \rightarrow 35\text{Hz}$ + Buffer de ruido filtrado a $450\text{Hz}$. | Tanques Medios, Neotanques, Acorazados. |
| `sfx_machinegun` | `combat` | $420\text{ ms}$ | $-3.5\text{ dB}$ / $-16\text{ LUFS}$ | $0\text{ dB}$ | 6 pulsos estocásticos de ruido blanco paso-banda a $1,200\text{Hz}$ espaciados cada $65\text{ms}$. | Infantería, Blindados Recon, Helicópteros. |
| `sfx_rocket_launch` | `combat` | $850\text{ ms}$ | $-2.5\text{ dB}$ / $-15\text{ LUFS}$ | $-3\text{ dB}$ ($600\text{ms}$) | Barrido senoidal ascendente ($200\text{Hz} \rightarrow 800\text{Hz}$) con resonancia armónica. | Artillería Obús, Lanzacohetes Asedio. |
| `sfx_explosion_unit`| `combat` | $950\text{ ms}$ | $-1.5\text{ dB}$ / $-13\text{ LUFS}$ | $-4\text{ dB}$ ($800\text{ms}$) | Ruido marrón con curva de decaimiento exponencial ($T_{60} = 0.8\text{s}$) y sub-bajo de $45\text{Hz}$. | Destrucción absoluta de escuadrón. |
| `sfx_trap_ambush` | `combat` | $700\text{ ms}$ | $-1.0\text{ dB}$ / $-12\text{ LUFS}$ | $-5\text{ dB}$ ($600\text{ms}$) | Acorde disonante en trémolo rápido ($440\text{Hz} + 466\text{Hz}$) y percusión metálica en seco. | Choque de marcha en niebla (`¡TRAP!`). |
| `sfx_airdrop_chute` | `ambient` | $1,200\text{ ms}$ | $-4.0\text{ dB}$ / $-18\text{ LUFS}$ | $-2\text{ dB}$ ($800\text{ms}$) | Silbido descendente por filtro paso-alto decreciente ($3\text{kHz} \rightarrow 800\text{Hz}$) + impacto. | Spawneo de caja de suministros T2/T5. |
| `sfx_silo_nuclear` | `combat` | $2,400\text{ ms}$ | $0.0\text{ dB}$ / $-10\text{ LUFS}$ | **$-8\text{ dB}$ ($2,000\text{ms}$)** | Sirena bitonal descendente + saturación armónica en onda cuadrada suavizada. | Impacto de misil balístico de 3 HP. |
| `sfx_scop_cinematic`| `narrative`| $1,800\text{ ms}$ | $-0.5\text{ dB}$ / $-11\text{ LUFS}$ | **$-6\text{ dB}$ ($1,500\text{ms}$)** | Glissando orquestal ascendente en modo jónico, platillo resonante y pulso atómico. | Activación de Super CO Power. |
| `sfx_capture_tick` | `ui` | $180\text{ ms}$ | $-6.0\text{ dB}$ / $-20\text{ LUFS}$ | $0\text{ dB}$ | Doble pulso senoidal puro de $880\text{Hz}$ y $1,320\text{Hz}$ con decaimiento percusivo de $25\text{ms}$. | Pulsación de captura o resta de HP sede. |
| `sfx_unit_join` | `ui` | $450\text{ ms}$ | $-3.0\text{ dB}$ / $-16\text{ LUFS}$ | $-2\text{ dB}$ ($300\text{ms}$) | Tono ascendente en quinta justa ($523\text{Hz} \rightarrow 784\text{Hz}$) + tintineo metálico de reembolso. | Fusión de tropas (`join`) con tesoro. |
| `sfx_timer_tick` | `ui` | $120\text{ ms}$ | $-4.0\text{ dB}$ / $-18\text{ LUFS}$ | $-2\text{ dB}$ | Pulso percusivo a $1,000\text{Hz}$ con modulación a $2\text{Hz}$ al restar $\le 5\text{s}$ de turno. | Alerta visual/acústica de tiempo crítico. |

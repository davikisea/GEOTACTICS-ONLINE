# DOCUMENTO DE DISEÑO TÉCNICO Y ARQUITECTURA DE BASE DE DATOS (RFC CALIBRADO)
**Documento Canónico de Propuesta:** `PROPOSAL_DB_ARCHITECTURE.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 2.0.0-CALIBRATED-BACKEND-RFC  
**Rol:** Arquitecto de Base de Datos y Sistemas Distribuidos  
**Estado:** AUDITADO POR EQUIPO MULTIDISCIPLINAR (DBA, CIBERSEGURIDAD, MATEMÁTICAS) — LISTO PARA APROBACIÓN FINAL  
**Área:** Infraestructura PostgreSQL / Supabase, Seguridad RLS, Matchmaking Multi-Modo y Economía de Trofeos  

---

## 1. RESUMEN EJECUTIVO Y OBJETIVOS DEL RFC CALIBRADO

El presente RFC formaliza la arquitectura de backend definitiva para el soporte de emparejamiento multi-modo, integridad relacional contable y el sistema de ligas clasificatorias de *Tactical Command: Wars of Legacy*.

Tras someter el borrador inicial a una auditoría técnica profunda por tres agentes especializados (DBA & Concurrencia, Ciberseguridad & Anti-Cheat, y Matemática de Sistemas de Juego), se han integrado **5 calibraciones arquitectónicas críticas**:

1. **Unificación de Colas de Emparejamiento (`matchmaking_queue`):** En lugar de 3 tablas dispersas que provocaban riesgo de doble encolado y fragmentación, se establece una tabla unificada con discriminador `game_mode` e índices parciales optimizados para escaneo de rango por B-Tree (`trophies BETWEEN`), erradicando el uso ineficiente de `ABS()`.
2. **Conciliación Aditiva con Migraciones Previas (Zero-Breaking):** Se detectó que `user_chest_slots`, `currency_ledger` y `user_cosmetics` ya contaban con estructuras parciales en las migraciones 10, 11 y 12. La migración se define como **estrictamente aditiva** (`ALTER TABLE ADD COLUMN IF NOT EXISTS`), preservando la retrocompatibilidad con las funciones RPC en producción.
3. **Blindaje Ciego de Mazos y Anti-Spoofing en RLS:** Se prohíbe que los clientes envíen `trophies` o `deck_snapshot` por parámetro; estos se cargan y validan exclusivamente en servidor. El mazo del rival se enmascara bajo la niebla de guerra hasta que el estado de la partida sea `finished`.
4. **Protección Financiera del Ledger (`ON DELETE RESTRICT`):** La auditoría contable de `currency_ledger` sustituye el borrado en cascada por `ON DELETE RESTRICT` y triggers de inmutabilidad estricta (*Append-Only*).
5. **Estabilización Antideflacionaria de Trofeos y Ligas (10 Arenas + 3 Ligas):** Se elimina la inyección neta a partir de 2,000 trofeos (transición a suma cero estricta), se reemplazan las puertas inmortales por **Escudos de Descenso (3 cargas)** para evitar estancamientos, y se introduce el **Reseteo Estacional con Compresión no Lineal**.

---

## 2. DISEÑO UNIFICADO DE COLAS DE EMPAREJAMIENTO (`matchmaking_queue`)

### 2.1 Tabla Unificada vs. Tablas Dispersas
Para garantizar que un jugador no pueda estar encolado simultáneamente en dos modos distintos, evitar dispersión de índices y eliminar el table bloat:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               ARQUITECTURA DE COLA UNIFICADA DE EMPAREJAMIENTO                         │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [ JUGADOR INVOCA RPC: join_matchmaking_queue(p_game_mode, p_preferred_theater) ]
                                    │
                                    ▼
 [ VALIDACIÓN SERVER-SIDE: auth.uid(), sin partidas vivas, lectura de mazo y trofeos ]
                                    │
                                    ▼
       ¿Existe oponente compatible en matchmaking_queue con SKIP LOCKED?
       ├──► SÍ: Bloquea tupla, crea partida en active_matches y participantes.
       │        Elimina oponente de la cola. Retorna match_id (CERO FUGA DE MAZO).
       └──► NO: Inserta en matchmaking_queue (user_id PK, mode, trophies, expires_at).
                Retorna status: 'searching'.
```

### 2.2 Definición Teórica de la Tabla `matchmaking_queue`
- `user_id`: UUID, Primary Key, Foreign Key a `public.profiles(id)` ON DELETE CASCADE (garantiza $\le 1$ cola por usuario en todo el sistema).
- `game_mode`: VARCHAR(24), NOT NULL (Check: `'mirror_duel'`, `'blitz_skirmish'`, `'grand_campaign'`).
- `commander_id`: VARCHAR(32), NOT NULL, Foreign Key a `public.commanders_catalog(id)`.
- `deck_snapshot`: JSONB, NOT NULL (validado server-side desde `user_decks` y `user_cards`).
- `preferred_theater`: VARCHAR(16), NOT NULL DEFAULT `'any'` (Check: `'land'`, `'naval'`, `'combined'`, `'any'`).
- `trophies`: INTEGER, NOT NULL (leído directamente de `profiles.trophies_count`).
- `weighted_power`: NUMERIC(4,2), NOT NULL (Average Power Level ponderado del mazo).
- `queued_at`: TIMESTAMPTZ, NOT NULL DEFAULT `timezone('utc'::text, now())`.
- `matched_match_id`: UUID, NULLable (ID de partida asignada).
- `expires_at`: TIMESTAMPTZ, NOT NULL (marca temporal de timeout).

### 2.3 Índice Parcial Determinista de Alta Velocidad
Para evitar escaneos secuenciales y permitir Index Range Scan en `FOR UPDATE SKIP LOCKED`:
```sql
CREATE INDEX idx_matchmaking_active_seek
ON public.matchmaking_queue (game_mode, trophies, queued_at)
WHERE matched_match_id IS NULL;
```

### 2.4 Calibración de Timeouts y Brackets Progresivos

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MATRIZ DE EXPANSIÓN TEMPORAL DE COLAS                           │
├─────────────────────┬──────────────┬───────────────┬───────────────────────────────────┤
│ Modo de Juego       │ Intervalo    │ Ventana Elo   │ Criterio de Poder y Filtros       │
├─────────────────────┼──────────────┼───────────────┼───────────────────────────────────┤
│ **Duelo Espejo**    │ 0 a 10s      │ $\pm 150$     │ Set espejo idéntico N1            │
│ (15s por turno)     │ 10 a 20s     │ $\pm 300$     │ Set espejo idéntico N1            │
│                     │ $\ge 20\text{s}$ | Timeout   │ Asignación inmediata de Bot Espejo│
├─────────────────────┼──────────────┼───────────────┼───────────────────────────────────┤
│ **Blitz Skirmish**  │ 0 a 10s      │ $\pm 150$     │ $\Delta \text{Poder} \le 1.0$     │
│ (30s por turno)     │ 10 a 20s     │ $\pm 300$     │ $\Delta \text{Poder} \le 1.5$     │
│                     │ 20 a 30s     │ $\pm 450$     │ $\Delta \text{Poder} \le 2.0$     │
│                     │ $\ge 30\text{s}$ | Timeout   │ Bot Táctico Blitz de la Arena     │
├─────────────────────┼──────────────┼───────────────┼───────────────────────────────────┤
│ **Gran Campaña**    │ 0 a 15s      │ $\pm 200$     │ Teatro idéntico, $\Delta P \le 1.5$│
│ (60s por turno)     │ 15 a 30s     │ $\pm 400$     │ Teatro afín, $\Delta P \le 2.0$   │
│                     │ 30 a 45s     │ $\pm 600$     │ Cualquier teatro                  │
│                     │ 45 a 60s     │ $\pm 800$     │ Cualquier teatro                  │
│                     │ $\ge 60\text{s}$ | Timeout   │ Bot Táctico Experto GC            │
└─────────────────────┴──────────────┴───────────────┴───────────────────────────────────┘
```
> [!NOTE]
> `preferred_theater` no actúa como cláusula WHERE rígida que fracture la cola, sino como una heurística suave que se desactiva pasados los primeros 15 segundos para garantizar un tiempo de espera no superior a 60s.

---

## 3. CONCILIACIÓN ADITIVA Y RESOLUCIÓN DE TABLAS PREVIAS

Para preservar intactas las funciones en producción de las migraciones 10, 11 y 12:

### 3.1 Tabla: `user_chest_slots` (Conciliación Aditiva sobre Migración 10)
- **Estructura Existente en BD:** Ya posee `user_id`, `slot_index (1 a 4)`, `chest_type ('wood', 'iron', 'armored', 'legendary')`, `status`, `unlock_started_at`, `unlock_duration_seconds`.
- **Modificación Aditiva Requerida:**
  - Agregar columna `unlock_completes_at TIMESTAMPTZ` (calculada en servidor para verificación instantánea anti-cheat).
  - Agregar columna `arena_tier INTEGER NOT NULL DEFAULT 1`.
  - Homogeneizar los alias visuales de cofres en frontend (Bronce = Wood, Plata = Iron, Oro = Armored, Élite = Legendary) sin romper el ENUM de base de datos.
- **Seguridad y Anti Speed-Hack:**
  - Revocación total de `INSERT/UPDATE/DELETE` a clientes.
  - El RPC `claim_chest_reward(p_slot_index)` valida:
    $$\text{now}() \ge \text{unlock\_completes\_at}$$
    rechazando cualquier reclamo prematuro con código de error estricto.

### 3.2 Tabla: `user_cosmetics` (Consolidación sobre Migración 12)
- **Estructura Existente en BD:** Creada en `20261031000012` con `user_id`, `cosmetic_id`, `is_equipped`, `acquired_at`.
- **Modificación Aditiva Requerida:**
  - Añadir columna `category VARCHAR(24) NOT NULL DEFAULT 'unit_skin'` (Check: `'unit_skin'`, `'avatar_frame'`, `'comic_bubble'`, `'pop_art_stamp'`, `'co_uniform'`).
  - FK a `public.cosmetics_catalog(id)` con `ON DELETE RESTRICT` (evita borrar cosméticos que los usuarios ya compraron).
  - RLS: `SELECT` restringido a `auth.uid() = user_id`.

### 3.3 Tabla: `currency_ledger` (Protección de Auditoría sobre Migración 11)
- **Estructura Existente en BD:** Posee `user_id`, `currency`, `delta`, `balance_after`, `reason`, `reference_id`, `created_at`.
- **Modificación Aditiva y Blindaje:**
  - Agregar columna `metadata JSONB DEFAULT '{}'::jsonb`.
  - Ampliar el constraint de divisas para integrar materiales procesados:
    `CHECK (currency IN ('credits', 'gems', 'refined_steel', 'refined_concrete', 'refined_microchip'))`.
  - **BLINDAJE FINANCIERO OBLIGATORIO:** Cambiar la FK a `public.profiles(id)` para que opere con **`ON DELETE RESTRICT`**. Si un usuario es eliminado, el libro de balance contable no se destruye.
  - **Trigger de Inmutabilidad Absoluta:** Trigger `BEFORE UPDATE OR DELETE` que lanza excepción inmediata, haciendo a la tabla 100% *Append-Only*.

---

## 4. SISTEMA MATEMÁTICO DE TROFEOS Y ARENAS (LADDER CLASIFICATORIO)

### 4.1 Modelo Elo Asimétrico Calibrado con Factor K Dinámico
Para dos jugadores con trofeos $R_A$ y $R_B$:

$$E_A = \frac{1}{1 + 10^{\frac{R_B - R_A}{400}}}, \quad E_B = 1 - E_A$$

$$\Delta T_A = \begin{cases} 
\text{round}\left( K \times (1 - E_A) \right) & \text{si es Victoria} \\
-\text{round}\left( \mu \times K \times E_A \right) & \text{si es Derrota}
\end{cases}$$

Donde $K$ y $\mu$ (amortiguador de derrota) varían según el rango:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│            CALIBRACIÓN DEFINITIVA DEL FACTOR K Y AMORTIGUACIÓN POR RANGO               │
├─────────────────────┬──────────────┬───────────────┬───────────────────────────────────┤
│ Rango de Trofeos    │ Factor K     │ Pérdida ($\mu$)│ Dinámica Macroeconómica           │
├─────────────────────┼──────────────┼───────────────┼───────────────────────────────────┤
│ **0 a 499**         │ $K = 40$     │ $0.00\times$  │ Cero pérdida (Piso novato)        │
│ **500 a 999**       │ $K = 36$     │ $0.60\times$  │ Gana +18 / Pierde -11. Ascenso D1 │
│ **1,000 a 1,999**   │ $K = 32$     │ $0.85\times$  │ Gana +16 / Pierde -14. Fricción   │
│ **2,000 a 2,999**   │ $K = 28$     │ **$1.00\times$**│ **SUMA CERO ESTRICTA (0 Inflación)**│
│ **3,000 a 3,999**   │ $K = 24$     │ **$1.00\times$**│ **SUMA CERO ESTRICTA**            │
│ **4,000+** (Ligas)  │ $K = 20$     │ **$1.00\times$**│ **ALTA PRECISIÓN COMPETITIVA**    │
└─────────────────────┴──────────────┴───────────────┴───────────────────────────────────┘
```

### 4.2 Escudo Dinámico de Descenso (Eliminación de la Trampa de Atrapamiento)
Para evitar que un jugador quede atrapado en una arena perdiendo 15 partidas consecutivas:
1. **Arenas 1 a 3 (0 a 999 trofeos):** Puerta indestructible (protección al principiante).
2. **Arenas 4 a 8 (1,000 a 3,599 trofeos):** Al ingresar por primera vez a una nueva Arena, se otorgan **3 Cargas de Escudo de Descenso**.
   - Cada derrota en el piso exacto de la Arena consume 1 carga sin bajar de arena.
   - Al agotar las 3 cargas, la 4.ª derrota produce un descenso amortiguado a la arena previa ($T_{\text{piso}} - 30$), permitiendo al jugador volver a ganar partidas y progresar.
3. **Arena 9 y Ligas (3,600+ trofeos):** Sin puertas ni escudos; clasificación pura por mérito Elo.

### 4.3 Algoritmo de Compresión Estacional (Season Reset cada 28 Días)
Para drenar la inyección neta generada en ligas bajas por novatos y bots, al final de cada temporada del Command Pass (28 días) se aplica:

$$T_{\text{nuevo}} = \begin{cases} 
T & \text{si } T < 3,200 \text{ (Arenas 1 a 8 no se tocan)} \\
3,200 + 0.70 \times (T - 3,200) & \text{si } 3,200 \le T < 4,000 \text{ (Compresión suave del 30\%)} \\
4,000 + 0.50 \times (T - 4,000) & \text{si } T \ge 4,000 \text{ (Compresión del 50\%)}
\end{cases}$$

---

### 4.4 Matriz Maestra Calibrada: 10 Arenas + 3 Ligas Legendarias

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               ESCALA CANÓNICA DE ARENAS Y LIGAS CLASIFICATORIAS                        │
├─────────┬──────────────────────────┬──────────────┬──────────────┬─────────────────────┤
│ Rango   │ Nombre de Arena          │ Trofeos      │ Nivel Cuenta │ Desbloqueo / Hito   │
├─────────┼──────────────────────────┼──────────────┼──────────────┼─────────────────────┤
│ Arena 1 │ Polígono "Fort Bragg"    │ 0 - 399      │ Nivel 1      │ Onboarding / P1-P2  │
│ Arena 2 │ Sector "Río Bravo"       │ 400 - 799    │ Nivel 2      │ Parcela 3 (Día 1)   │
│ Arena 3 │ Paso "El Alamein"        │ 800 - 1,199  │ Nivel 4      │ Parcela 4 (Día 2)   │
│ Arena 4 │ Zona "Valle del Silicio" │ 1,200 - 1,599│ Nivel 5      │ Altos Hornos Vulcan │
│ Arena 5 │ Atolón "Midway"          │ 1,600 - 1,999│ Nivel 6      │ Parcela 5 / Cantera │
│ Arena 6 │ Metrópolis "Stalingrado" │ 2,000 - 2,399│ Nivel 8      │ **MERCADO P2P (D10)**│
│ Arena 7 │ Tundra "Op. Fracaso"     │ 2,400 - 2,799│ Nivel 9      │ Sala Limpia Chips   │
│ Arena 8 │ Reducto "Bastión Hierro" │ 2,800 - 3,199│ Nivel 10     │ Parcela 7 / Silo Log│
│ Arena 9 │ Ciudadela "Alto Mando"   │ 3,200 - 3,599│ Nivel 11     │ **CAP TORNEO (D30)**│
│ Arena 10│ Complejo "Astra Zenith"  │ 3,600 - 3,999│ Nivel 12     │ Parcela 8 (Endgame) │
├─────────┼──────────────────────────┼──────────────┼──────────────┼─────────────────────┤
│ LIGA I  │ División Contendientes   │ 4,000 - 4,499│ Nivel 13     │ Parcela 9 / Quántica│
│ LIGA II │ División Élite Mando     │ 4,500 - 4,999│ Nivel 14     │ Parcela 10 / Fusión │
│ LIGA III│ Gran Liga Legendaria Top │ 5,000+       │ Nivel 15     │ Circuito Esports Pro│
└─────────┴──────────────────────────┴──────────────┴──────────────┴─────────────────────┘
```

> [!IMPORTANT]
> **Desacople de Torneos Esports:** Al alcanzar **Arena 9 (3,200 Trofeos / Nivel 11)** se desbloquea el acceso formal a los Torneos Esports de Fin de Semana. En esos torneos, todas las cartas se igualan a Nivel 11, asegurando igualdad absoluta frente a jugadores de Nivel 12 a 15 de las Ligas superiores.

---

## 5. PROTOCOLO DE SEGURIDAD, INTEGRIDAD Y SANITY CHECK

### 5.1 Aislamiento Ciego de Mazos bajo Niebla de Guerra
Para erradicar la vulnerabilidad donde un cliente inspecciona el `deck_state` del rival al iniciar la partida:
1. En `match_participants`, la columna `deck_state` se enmascara mediante una vista o política RLS:
   ```sql
   -- El oponente solo ve un array vacío mientras la partida esté activa
   CASE 
       WHEN match_participants.user_id = auth.uid() OR m.status = 'finished' 
       THEN match_participants.deck_state 
       ELSE '[]'::jsonb 
   END
   ```
2. La revelación de tropas enemigas solo ocurre de forma determinista conforme entran en el rango de visión del jugador sobre el tablero táctico (`match_player_views`).

### 5.2 Prevención de Wintrading y Sniping
- **Jitter Aleatorio:** En la cola de emparejamiento se aplica un retraso estocástico de 0 a 2,500 ms antes de ejecutar el emparejamiento.
- **Cooldown Anti-Revancha:** El RPC rechaza emparejar a los mismos dos usuarios si disputaron una partida clasificatoria en los últimos 15 minutos.

### 5.3 Bloqueos Consultivos (`pg_advisory_xact_lock`)
Para evitar condiciones de carrera donde un jugador invoca múltiples llamadas paralelas de encolado:
```sql
PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));
```

---

## 6. CONCLUSIÓN Y COMPROMISO DE SEGURIDAD

Este RFC calibrado transforma una propuesta preliminar con riesgos de colisión y vulnerabilidades en un diseño de nivel de producción de alta disponibilidad, seguridad criptográfica y balance macroeconómico.

> [!CAUTION]
> **RESTRICCIÓN ACTIVA:**  
> Ninguna sentencia DDL, SQL, función PL/pgSQL o archivo TypeScript ha sido ejecutado o modificado. El sistema se detiene en este punto exacto a la espera de tu aprobación.

---

### FIRMA DE APROBACIÓN
Para autorizar formalmente la generación de la migración SQL aditiva (`20261031000014_unified_matchmaking_and_ranked_ladder.sql`) y los modelos TypeScript correspondientes, responde con la palabra:

# `APROBADO`

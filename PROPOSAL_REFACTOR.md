# PROPUESTA DE REFACTORIZACIÓN ESTRUCTURAL Y HOJA DE RUTA TÉCNICA (RFC)
**Documento de Especificación Formal:** `PROPOSAL_REFACTOR.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 1.0.0-PROPOSAL  
**Autoría:** Enjambre de Ingeniería de Software (Arquitectura, Backend, Frontend, Game Design)  
**Estado:** `PROPUESTA TÉCNICA PARA REVISIÓN Y APROBACIÓN DEL LEAD DEVELOPER`  

---

## ÍNDICE SISTEMÁTICO
1. [Resumen Ejecutivo y Objetivos de la Refactorización](#1-resumen-ejecutivo-y-objetivos-de-la-refactorización)
2. [Análisis de Viabilidad Técnica y Cuellos de Botella](#2-análisis-de-viabilidad-técnica-y-cuellos-de-botella)
   - 2.1 Carga Computacional del Bot Heurístico "Ajedrez" en Cliente (Web Workers vs Main Thread)
   - 2.2 Serialización, Integridad Referencial y Persistencia de Transportes Multitropa
   - 2.3 Rampa de Progresión Offline y Presupuesto Económico Controlado
3. [Propuesta Arquitectónica Detallada](#3-propuesta-arquitectónica-detallada)
   - 3.1 Purga de Código Huérfano y Desacoplamiento de Dependencias
   - 3.2 Normalización Transversal de la Nomenclatura Económica (`funds`, `battleCredits`, `commandGems`)
   - 3.3 Esquema de Persistencia para Transportes Duales (`loadedUnitIds`)
   - 3.4 Motor de Inteligencia Artificial Modular y Modo "Ajedrez"
   - 3.5 Esquemas de Base de Datos Supabase (Migración Aditiva 15)
   - 3.6 Contratos de Tipos TypeScript (`src/types/index.ts` & `src/types/database.types.ts`)
4. [Integración Canónica en la Documentación de Diseño (GDD)](#4-integración-canónica-en-la-documentación-de-diseño-gdd)
   - 4.1 Desempate por Límite de Turnos (Valor Militar + Valor Territorial)
   - 4.2 Rúbrica de Rangos Militares (S, A, B, C)
   - 4.3 Trazado Estético de Flechas Tácticas (`pathingArrow.ts`)
   - 4.4 Convolución del Mapa de Calor de Amenazas (`threatRange.ts`)
5. [Ruta de Implementación Planificada (PRs y Commits)](#5-ruta-de-implementación-planificada-prs-y-commits)
   - Fase 1: Saneamiento y Purga de Código Muerto
   - Fase 2: Normalización de Tipos y Persistencia de Transportes
   - Fase 3: Migración de Base de Datos y Economía Offline
   - Fase 4: Refactorización Modular del Bot IA y Algoritmo "Ajedrez"
   - Fase 5: Documentación y Verificación Integral

---

# 1. RESUMEN EJECUTIVO Y OBJETIVOS DE LA REFACTORIZACIÓN

A raíz de los hallazgos revelados en el *Informe de Contrauditoría y Análisis de Puntos Ciegos*, esta propuesta técnica define el plan de saneamiento, modernización y robustecimiento estructural para el motor táctico de *Tactical Command: Wars of Legacy*.

### Objetivos Clave:
1. **Erradicar la Deuda Técnica Zombie:** Eliminar definitivamente los módulos huérfanos que provocan confusión arquitectónica (`CombatEngine.ts` y `TacticalPathfinder.ts`).
2. **Blindar la Persistencia de Transportes:** Garantizar que los pasajeros embarcados en barcazas (Lander) y helicópteros (T-Copter) sobrevivan a recargas de pantalla y sincronización en Supabase Realtime mediante `loadedUnitIds`.
3. **Equilibrar el Bucle Offline:** Instituir una rampa de onboarding y entrenamiento con economía restringida (50% de recompensas online, 0 trofeos, límite de 3 partidas remuneradas/día y escalado por dificultad) para evitar el abuso del bot como granja de créditos.
4. **Desarrollar la IA "Nivel Ajedrez":** Diseñar una arquitectura desacoplada para el bot táctico que permita un simulador de combate implacable con poda alfa-beta heurística sin congelar la interfaz de usuario.
5. **Estandarizar la Nomenclatura Económica:** Unificar el vocabulario en TypeScript, Supabase y GDD bajo tres términos inmutables: `funds` (in-match), `battleCredits` (progresión) y `commandGems` (premium).
6. **Exclusiones Explícitas:** Se respetan las directivas de post-producción, omitiendo cualquier modificación o análisis del sintetizador de audio y del editor de mapas.

---

# 2. ANÁLISIS DE VIABILIDAD TÉCNICA Y CUELLOS DE BOTELLA

```
                    MAPA DE IMPACTO Y CUELLOS DE BOTELLA
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
[ CUELLO DE BOTELLA 1 ]      [ CUELLO DE BOTELLA 2 ]      [ CUELLO DE BOTELLA 3 ]
  Explosión Combinatoria       Pérdida de Pasajeros por     Explotación de Créditos
  del Bot IA en Navegador      Desconexión / F5             en Prácticas Offline
  • Solución: Web Worker       • Solución: loadedUnitIds    • Solución: Límite diario (3)
    + Beam Search Top-K          en TacticalUnit e in-sync    y ratio al 50%
```

### 2.1 Carga Computacional del Bot Heurístico "Ajedrez" en Cliente (Web Workers vs Main Thread)

#### El Problema del Factor de Ramificación:
En el ajedrez clásico, un estado promedio presenta $\approx 35$ movimientos legales. En *Tactical Command*, si la IA controla 8 unidades y cada unidad puede desplazarse a 15 casillas distintas y ejecutar entre 1 y 4 acciones (atacar a 2 rivales, capturar o esperar), el árbol de decisión de un solo turno alcanza:
$$\text{Ramificaciones por turno} \approx (15 \times 3)^8 \approx 1.68 \times 10^{13} \text{ permutaciones}$$

Ejecutar un algoritmo minimax exhaustivo en el hilo principal de JavaScript (*Main Thread*) bloquearía inevitablemente el Event Loop del navegador, provocando congelamiento de la pestaña, advertencias de "Página no responde" y caídas a 0 FPS en el renderizado de Canvas.

#### Dictamen de Viabilidad y Solución Arquitectónica:
* **Ejecución Asíncrona en Web Worker (`aiBot.worker.ts`):** Todo el cómputo del bot se traslada a un subproceso en segundo plano mediante la Web Workers API estándar de los navegadores. La interfaz gráfica se mantiene fluida a 60 FPS estables.
* **Poda Heurística Guiada (Beam Search):**
  En lugar de combinar todas las unidades a la vez, se realiza una descomposición por orden de iniciativa:
  1. Unidades de daño crítico o remate (Top 3 jugadas por unidad).
  2. Unidades de captura sobre propiedades de alta prioridad.
  3. Unidades de soporte o recolocación.
  El factor de ramificación efectivo se reduce a $B \le 18$ ramas por nodo.
* **Lookahead de 2 Semiturnos con Evaluación Minimax:**
  La IA simula su turno óptimo, luego computa la respuesta adversarial más dañina del jugador humano (usando `threatRange.ts`) y maximiza el valor militar residual neto.
* **Viabilidad:** **ALTA**, siempre y cuando se respete el confinamiento en Web Worker y el límite de profundidad a 2 semiturnos con poda Beam Search ($< 350\text{ms}$ por turno).

---

### 2.2 Serialización, Integridad Referencial y Persistencia de Transportes Multitropa

#### El Problema de la Memoria Volátil:
Actualmente, `specialAbilities.ts` gestiona los pasajeros mediante un `Map<string, TransportManifest>` residente en la memoria RAM del cliente. Cuando una partida se serializa en el JSONB `board_state` de la tabla `active_matches` de Supabase, las unidades embarcadas no se reflejan explícitamente en el estado de la unidad de transporte, corriendo el riesgo de que desaparezcan al reconectar o recargar la página.

#### Dictamen de Viabilidad y Solución Arquitectónica:
* **Inclusión de `loadedUnitIds: string[]` en `TacticalUnit`:**
  Cada unidad de transporte (APC, Lander, Cruiser, T-Copter) almacena directamente en su estructura los identificadores únicos de las unidades a bordo.
* **Inclusión de `isLoadedInsideId?: string | null`:**
  Las unidades embarcadas reciben el ID del transporte que las alberga.
* **Regla de Serialización:**
  Las unidades contenidas permanecen dentro del array/mapa de unidades de la partida (`MatchState.units`), pero:
  1. Su posición $(x, y)$ se mantiene sincronizada con la del transporte portador.
  2. Su bandera `hasMoved` y `hasActed` se sincroniza con el estado del transporte.
  3. El motor de renderizado (`GameCanvas.tsx`) y los algoritmos de pathfinding las excluyen de la cuadrícula visible mientras `isLoadedInsideId != null`.
* **Viabilidad:** **MÁXIMA (100% Viable)**. Resuelve de raíz el problema sin requerir nuevas tablas en Supabase, manteniéndose compatible con el esquema JSONB existente.

---

### 2.3 Rampa de Progresión Offline y Presupuesto Económico Controlado

#### El Problema de la Explotación Económica:
Si las partidas contra el bot otorgan recompensas idénticas al juego online sin límites de entrada, los usuarios pueden desarrollar scripts o automatizaciones en local para farmear Créditos de Batalla infinitos sin participar en la comunidad multijugador ni en el mercado P2P.

#### Dictamen de Viabilidad y Solución:
* **Progresión al 50%:** Todo cálculo de recompensas offline divide los Créditos y XP entre 2:
  $$\text{battleCredits}_{\text{offline}} = \left\lfloor 0.50 \times \text{battleCredits}_{\text{online}} \right\rfloor$$
  $$\text{xp}_{\text{offline}} = \left\lfloor 0.50 \times \text{xp}_{\text{online}} \right\rfloor$$
* **Cero Trofeos:** $\Delta \text{trophies} = 0$ inmutable. El ranking y las Arenas son exclusivos del PvP.
* **Límite Duro Diario (3 Partidas con Botín):**
  Un contador persistente en la cuenta limita la obtención de botín a **máximo 3 victorias offline cada 24 horas (UTC 00:00)**. La cuarta partida offline en adelante conmuta automáticamente a modo "Entrenamiento Libre" (0 créditos, 0 XP).
* **Escalado Ligero por Dificultad Offline:**
  - Fácil (Cadete): $0.85\times$ del botín offline base ($42.5\%$ del valor online).
  - Normal (Comandante): $1.00\times$ del botín offline base ($50.0\%$ del valor online).
  - Difícil / Ajedrez (General): $1.20\times$ del botín offline base ($60.0\%$ del valor online).
* **Viabilidad:** **ALTA**. Requiere únicamente 2 columnas adicionales en la tabla `profiles` y validación server-side en la RPC `grant_match_rewards`.

---

# 3. PROPUESTA ARQUITECTÓNICA DETALLADA

## 3.1 Purga de Código Huérfano y Desacoplamiento de Dependencias

### Archivos a Eliminar Físicamente:
1. `src/engine/CombatEngine.ts` (3,551 bytes) — Reemplazado por `src/engine/combat.ts` y `src/engine/canonicalCombat.ts`.
2. `src/engine/TacticalPathfinder.ts` (3,036 bytes) — Reemplazado por `src/engine/pathfinding.ts`.

### Plan de Desacoplamiento de Importaciones:
* **Auditoría de Referencias:** Ningún archivo de producción en `src/` importa actualmente `CombatEngine.ts` (todos consumen `./engine/combat`).
* **Saneamiento en `src/docsData.ts`:**
  Reemplazar las menciones de cadena que citaban la clase huérfana:
  ```typescript
  // Antes (docsData.ts):
  // TacticalPathfinder.getReachableTiles(...)
  // Después:
  TacticalPathfindingEngine.getReachableTiles(...)
  ```

---

## 3.2 Normalización Transversal de la Nomenclatura Económica

Para eliminar la fricción entre `gold`, `credits`, `battle_credits` y `funds`, se establece la siguiente matriz de tipado estricto:

```
┌──────────────────┬───────────────────┬───────────────────┬──────────────────────────────────────┐
│ TÉRMINO ESTÁNDAR │ TIPO TYPESCRIPT   │ CAMPO POSTGRESQL  │ ALCANCE Y DEFINICIÓN OPERATIVA       │
├──────────────────┼───────────────────┼───────────────────┼──────────────────────────────────────┤
│ funds            │ number            │ player_funds      │ Moneda efímera in-match generada por │
│                  │                   │ (JSONB)           │ sedes aliadas. Cero persistencia.    │
├──────────────────┼───────────────────┼───────────────────┼──────────────────────────────────────┤
│ battleCredits    │ number            │ battle_credits    │ Moneda persistente de cuenta para    │
│                  │                   │ (profiles)        │ cartas, parcelas y mercado P2P.      │
├──────────────────┼───────────────────┼───────────────────┼──────────────────────────────────────┤
│ commandGems      │ number            │ command_gems      │ Moneda premium para ofertas flash y  │
│                  │                   │ (profiles)        │ Command Pass de temporada.           │
└──────────────────┴───────────────────┴───────────────────┴──────────────────────────────────────┘
```

### Directivas de Refactorización en Código:
1. En `src/types/index.ts`: Garantizar que `PlayerProfile` use exclusivamente `battleCredits: number` y `commandGems: number`.
2. En `src/lib/shopData.ts`: Cambiar `currency: 'gold' | 'gems'` a `currency: 'battleCredits' | 'commandGems'`.
3. En `src/App.tsx`: Renombrar el estado `userGold` a `userBattleCredits` y `userGems` a `userCommandGems`.
4. En `src/engine/turnEconomy.ts`: Mantener `funds` / `playerFunds` para todo el flujo dentro del tablero de combate.

---

## 3.3 Esquema de Persistencia para Transportes Duales (`loadedUnitIds`)

### Modificación de la Interfaz Canónica `TacticalUnit`:
```typescript
// En src/types/index.ts
export interface TacticalUnit {
  id: string;
  unitCode: string;
  displayName: string;
  ownerId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ammo: number;
  fuel: number;
  movementPoints: number;
  movementType: MovementType;
  minRange: number;
  maxRange: number;
  visionRange: number;
  baseAttack: number;
  productionCost: number;
  hasMoved: boolean;
  hasActed: boolean;
  skinId: string;
  
  // ==========================================================================
  // EXTENSIÓN ARQUITECTÓNICA: PERSISTENCIA DE TRANSPORTES MULTITROPA
  // ==========================================================================
  loadedUnitIds: string[];        // Array de IDs de unidades albergadas en este transporte
  isLoadedInsideId?: string | null; // ID de la unidad contenedora (si esta unidad está a bordo)
}
```

### Ciclo de Vida y Transiciones de Estado:
1. **Acción `load` (Embarcar):**
   - Se valida capacidad según la unidad portadora (Lander = 2, Cruiser = 2, APC = 1, T-Copter = 1).
   - Se añade el ID de la unidad pasajera al array `transport.loadedUnitIds`.
   - Se marca la unidad pasajera con `passenger.isLoadedInsideId = transport.id`.
   - Se actualizan las coordenadas del pasajero a las coordenadas del transporte (`passenger.x = transport.x`, `passenger.y = transport.y`).
   - Se marcan `passenger.hasMoved = true` y `passenger.hasActed = true`.
2. **Acción `unload` (Desembarcar):**
   - Se retira el ID del array `transport.loadedUnitIds`.
   - Se asigna `passenger.isLoadedInsideId = null`.
   - Se asignan las nuevas coordenadas del terreno adyacente transitable seleccionado (`passenger.x = targetX`, `passenger.y = targetY`).
   - El pasajero agota su turno (`hasMoved = true`, `hasActed = true`).
3. **Destrucción Fatal del Transporte:**
   - Si un transporte es destruido en combate, el motor busca todas las unidades con `isLoadedInsideId === destroyedTransport.id` y las elimina inmediatamente (`hp = 0`), evitando unidades fantasma.

---

## 3.4 Motor de Inteligencia Artificial Modular y Modo "Ajedrez"

### Arquitectura de Módulos Desacoplados (`src/engine/ai/`):
Se propone estructurar el bot en 4 submódulos especializados:
```
src/engine/ai/
├── evaluationEngine.ts       # Función de evaluación de tablero estático
├── heuristicFactory.ts        # Producción militar según presupuesto y doctrina
├── captureOptimizer.ts        # Ponderador de conquista territorial A*
└── chessTacticalPlanner.ts    # Motor Minimax Beam-Search de 2 semiturnos
```

### Algoritmo del Modo "Ajedrez" (Nivel Gran Maestro Táctico):
El modo Ajedrez opera como un simulador de alto rendimiento:

1. **Consulta Preventiva de Cobertura y Amenaza (`threatRange.ts`):**
   Antes de considerar cualquier casilla de destino, la IA consulta el mapa de calor enemigo.
2. **Matriz de Intercambio Militar Favorable:**
   La IA no ataca simplemente por hacer daño. Evalúa el intercambio en ratio de valor financiero ($G$):
   $$\Delta \text{Valor} = (\text{DañoCausado} \times \text{CosteRival}) - (\text{ContraataqueSufrido} \times \text{CostePropio})$$
   Si $\Delta \text{Valor} < 0$, la IA cancela el ataque y busca un posicionamiento ventajoso en terreno de alta cobertura (Montañas 4★ o Bosques 2★).
3. **Poda Alfa-Beta con Lookahead de 2 Semiturnos:**
   Evalúa el peor contragolpe posible del jugador humano. Si una maniobra deja a una unidad pesada expuesta a artillería o bombarderos sin posibilidad de soporte, la rama es podada de inmediato.
4. **Prioridad Implacable de HQ:**
   Si la IA detecta que el Cuartel General humano está desprotegido y puede ser tomado o sitiado con infantería en $\le 2$ turnos, concentra todos los recursos para forzar la victoria por captura.

---

## 3.5 Esquemas de Base de Datos Supabase (Migración Aditiva 15)

```sql
-- ==============================================================================
-- MIGRACIÓN 15: CONTROL DE ECONOMÍA OFFLINE Y ADAPTACIÓN DE TRANSPORTES
-- ==============================================================================

-- 1. Control de Límite Diario de Partidas Offline en profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS daily_offline_matches_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_offline_match_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 2. Actualización de la función RPC grant_match_rewards para aplicar la regla 50%
CREATE OR REPLACE FUNCTION public.grant_match_rewards(
    p_user_id UUID,
    p_match_id UUID,
    p_game_mode TEXT,
    p_is_victory BOOLEAN,
    p_turns_count INTEGER,
    p_properties_captured INTEGER,
    p_units_destroyed INTEGER,
    p_difficulty TEXT DEFAULT 'normal'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_base_score NUMERIC;
    v_result_mult NUMERIC;
    v_difficulty_mult NUMERIC := 1.0;
    v_xp_awarded INTEGER;
    v_credits_awarded INTEGER;
    v_trophies_delta INTEGER := 0;
    v_is_offline BOOLEAN;
    v_daily_count INTEGER;
    v_last_date DATE;
    v_reward_capped BOOLEAN := false;
BEGIN
    v_is_offline := (p_game_mode IN ('vs_bot', 'offline_practice', 'tutorial'));

    -- Comprobación de límites offline (Máximo 3 partidas remuneradas por día)
    IF v_is_offline THEN
        SELECT daily_offline_matches_count, last_offline_match_date
        INTO v_daily_count, v_last_date
        FROM public.profiles
        WHERE id = p_user_id
        FOR UPDATE;

        -- Reinicio del ciclo diario a medianoche UTC
        IF v_last_date < CURRENT_DATE THEN
            v_daily_count := 0;
            v_last_date := CURRENT_DATE;
        END IF;

        IF v_daily_count >= 3 THEN
            v_reward_capped := true;
        END IF;
    END IF;

    -- Si superó el límite offline diario, recompensas se anulan (Modo entrenamiento)
    IF v_reward_capped THEN
        RETURN jsonb_build_object(
            'xp_awarded', 0,
            'battle_credits_awarded', 0,
            'trophies_delta', 0,
            'offline_capped', true,
            'message', 'Límite diario de recompensas offline alcanzado (3/3). Partida registrada sin créditos.'
        );
    END IF;

    -- Cálculo del puntaje base
    v_base_score := 120 + (p_properties_captured * 45) + (p_units_destroyed * 35) + (LEAST(p_turns_count, 30) * 6);
    
    IF p_is_victory THEN
        v_result_mult := 2.2;
    ELSE
        v_result_mult := 0.85;
    END IF;

    -- Multiplicadores de dificultad offline
    IF v_is_offline THEN
        IF p_difficulty = 'easy' THEN v_difficulty_mult := 0.85;
        ELSIF p_difficulty = 'hard' OR p_difficulty = 'chess' THEN v_difficulty_mult := 1.20;
        ELSE v_difficulty_mult := 1.00;
        END IF;
    END IF;

    -- Recompensas estándar
    v_xp_awarded := FLOOR(v_base_score * v_result_mult);
    v_credits_awarded := FLOOR((60 + (p_properties_captured * 20) + (p_units_destroyed * 15)) * v_result_mult);

    -- REGLA OFFLINE: 50% de recompensas y 0 trofeos
    IF v_is_offline THEN
        v_xp_awarded := FLOOR(v_xp_awarded * 0.50 * v_difficulty_mult);
        v_credits_awarded := FLOOR(v_credits_awarded * 0.50 * v_difficulty_mult);
        v_trophies_delta := 0;

        -- Actualizar contador diario
        UPDATE public.profiles
        SET daily_offline_matches_count = v_daily_count + 1,
            last_offline_match_date = v_last_date
        WHERE id = p_user_id;
    END IF;

    -- Asentar en perfiles
    UPDATE public.profiles
    SET current_xp = current_xp + v_xp_awarded,
        battle_credits = battle_credits + v_credits_awarded,
        total_matches_played = total_matches_played + 1,
        total_victories = total_victories + CASE WHEN p_is_victory THEN 1 ELSE 0 END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;

    -- Asentar auditoría contable en currency_ledger
    IF v_credits_awarded > 0 THEN
        INSERT INTO public.currency_ledger (
            user_id, currency, amount, balance_after, reason, reference_id, metadata
        ) VALUES (
            p_user_id, 'credits', v_credits_awarded,
            (SELECT battle_credits FROM public.profiles WHERE id = p_user_id),
            CASE WHEN v_is_offline THEN 'offline_match_reward' ELSE 'online_match_reward' END,
            p_match_id,
            jsonb_build_object('game_mode', p_game_mode, 'difficulty', p_difficulty)
        );
    END IF;

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_awarded,
        'battle_credits_awarded', v_credits_awarded,
        'trophies_delta', v_trophies_delta,
        'offline_capped', false,
        'daily_offline_matches_used', CASE WHEN v_is_offline THEN v_daily_count + 1 ELSE 0 END
    );
END;
$$;
```

---

## 3.6 Contratos de Tipos TypeScript (`src/types/index.ts`)

```typescript
// Extensión en src/types/index.ts

export type EconomicCurrency = 'funds' | 'battleCredits' | 'commandGems';

export interface PlayerProfile {
  id: string;
  username: string;
  avatarUrl: string;
  accountLevel: number;
  currentXp: number;
  battleCredits: number;           // Normalizado (sustituye cualquier 'gold')
  commandGems: number;             // Normalizado
  eloRating: number;
  trophiesCount: number;
  totalMatchesPlayed: number;
  totalVictories: number;
  dailyOfflineMatchesCount: number; // Límite 3/día
  lastOfflineMatchDate: string;
  equippedLoadout: string[];
  equippedCosmetics: Record<string, string>;
}
```

---

# 4. INTEGRACIÓN CANÓNICA EN LA DOCUMENTACIÓN DE DISEÑO (GDD)

Se redactan los fragmentos formales para ser incluidos en los volúmenes correspondientes de `/docs`:

### 4.1 Desempate por Límite de Turnos (GDD Volumen 1 §2 y §6)
> En partidas que alcancen el límite de turnos sin captura de HQ ni aniquilación total (12t en Duelo Espejo, 15t en Blitz, 40t en Campaña), el vencedor se dictamina por **Puntaje Militar Absoluto**:
> $$\text{Puntaje Total} = \sum_{u \in \text{Tropas}} \left(\text{CosteProducción}_u \times \frac{\text{HP}_u}{10}\right) + (\text{PropiedadesControladas} \times 1,000)$$
> El comandante con mayor valor financiero en el tablero gana el encuentro; si ambos valores coinciden exactamente, la partida concluye en Empate (`draw`).

### 4.2 Rúbrica de Rangos Militares (GDD Volumen 1 §6.3)
> Toda partida concluida otorga una calificación de mérito basada en la pulcritud táctica y la eficiencia de bajas:
> - **Rango 'S' (Excelente):** Victoria obtenida sufriendo $\le 1$ baja militar y en $\le 10$ turnos de combate.
> - **Rango 'A' (Sobresaliente):** Victoria obtenida sufriendo $\le 3$ bajas militares.
> - **Rango 'B' (Aprobado):** Victoria obtenida sufriendo 4 o más bajas militares.
> - **Rango 'C' (Derrota):** Derrota o capitulación del comandante.

### 4.3 Trazado Estético de Flechas Tácticas (Volumen 5 §2.4)
> La trayectoria del cursor de desplazamiento implementa un algoritmo de convolución en tiempo real (`pathingArrow.ts`):
> Para cada terna de celdas $(P_{k-1}, P_k, P_{k+1})$, el sistema calcula el vector de entrada y el vector de salida, resolviendo de forma determinista la primitiva de textura canónica:
> - Líneas rectas: `ew` (este-oeste), `ns` (norte-sur).
> - Codos y esquinas: `ne`, `nw`, `se`, `sw`.
> - Puntas de flecha terminales: `nd`, `sd`, `wd`, `ed`.
> - Marcador de origen: `od` (punto estacionario), `on`, `os`, `ow`, `oe`.

### 4.4 Convolución del Mapa de Calor de Amenazas (Volumen 5 §2.5)
> El subsistema balístico proyecta las zonas de riesgo enemigas mediante `threatRange.ts`:
> 1. Las unidades indirectas (Artillería, Cohetes) proyectan su amenaza desde su casilla actual, dado que no pueden moverse y disparar en el mismo turno.
> 2. Las unidades directas (Tanques, Infantería) calculan la envolvente de Minkowski entre sus casillas alcanzables por Dijkstra y su vecindad ortogonal de disparo ($\text{distancia} = 1$).
> 3. El resultado se vuelca en una matriz `heatMap[y][x]` que indica el conteo de cañones enemigos apuntando a cada baldosa, alimentando el sombreado visual de peligro y el árbol de búsqueda de la IA.

---

# 5. RUTA DE IMPLEMENTACIÓN PLANIFICADA (PRs Y COMMITS)

La ejecución se estructurará en 5 fases secuenciales e independientes para garantizar la estabilidad del repositorio:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 CRONOGRAMA DE COMMITS Y PULL REQUESTS (PRs)                 │
├─────────┬─────────────────────────┬─────────────────────────────────────────┤
│ FASE    │ ALCANCE                 │ ENTREGABLES Y VALIDACIÓN                │
├─────────┼─────────────────────────┼─────────────────────────────────────────┤
│ FASE 1  │ Purga de Huérfanos      │ • git rm CombatEngine.ts &              │
│         │                         │   TacticalPathfinder.ts                 │
│         │                         │ • Limpieza de referencias en docsData   │
│         │                         │ • Test: bun run typecheck               │
├─────────┼─────────────────────────┼─────────────────────────────────────────┤
│ FASE 2  │ Persistencia y Tipado   │ • Extensión de TacticalUnit con         │
│         │                         │   loadedUnitIds e isLoadedInsideId      │
│         │                         │ • Integración en specialAbilities.ts    │
│         │                         │ • Normalización a battleCredits         │
│         │                         │ • Test: subActionsAndArrow.test.ts      │
├─────────┼─────────────────────────┼─────────────────────────────────────────┤
│ FASE 3  │ Backend y Economía      │ • Migración 15 Supabase                 │
│         │ Offline                 │ • RPC grant_match_rewards (50% & cap 3) │
│         │                         │ • Actualización types/database.types    │
│         │                         │ • Test: turnEconomy.test.ts             │
├─────────┼─────────────────────────┼─────────────────────────────────────────┤
│ FASE 4  │ Modularidad de la IA    │ • Desacoplamiento de aiBot.ts           │
│         │ y Modo Ajedrez          │ • Web Worker aiBot.worker.ts            │
│         │                         │ • Algoritmo Minimax con Beam Search     │
│         │                         │ • Test: aiBot.test.ts                   │
├─────────┼─────────────────────────┼─────────────────────────────────────────┤
│ FASE 5  │ Documentación GDD       │ • Actualización formal en docs/         │
│         │ y Cierre                │ • Rúbricas militares y desempate        │
│         │                         │ • Validación general de la suite E2E    │
└─────────┴─────────────────────────┴─────────────────────────────────────────┘
```

---

### Conclusión y Dictamen del Enjambre
Las 7 directivas planteadas por el usuario son **técnicamente viables**, resuelven debilidades estructurales latentes detectadas en la contrauditoría y dotan al proyecto de una arquitectura escalable, segura contra exploits y con rendimiento de 60 FPS garantizado.

**Recomendación:** Aprobar este RFC (`PROPOSAL_REFACTOR.md`) para proceder a la ejecución controlada a partir de la Fase 1.

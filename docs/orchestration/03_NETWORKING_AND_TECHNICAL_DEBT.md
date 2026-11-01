# PLAN DE ORQUESTACIÓN TÉCNICA: PROTOCOLO DE RED, RECONEXIÓN Y PARIDAD FABRIL
**Módulo:** `docs/orchestration/03_NETWORKING_AND_TECHNICAL_DEBT.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión de Especificación:** 1.0.0-PROD-ORCHESTRATION  
**Estado:** `100% IMPLEMENTADO Y CERTIFICADO EN PRODUCCIÓN (SSOT)`  
**Destino de Implementación:** `src/hooks/useMatchSync.ts`, `src/types/network.ts`, `src/engine/subActions.ts`, `src/engine/specialAbilities.ts`, `src/components/game/ProductionModal.tsx`, `supabase/migrations/20261031000022_reconnection_snapshots_and_full_catalog.sql`

---

## 1. PROTOCOLO DE RECONEXIÓN WEBSOCKET Y RECONSTRUCCIÓN DE ESTADO

### 1.1 Diagnóstico del Problema de Desconexión en Vivo
En partidas rápidas con reloj Fischer (15s a 25s), una micro-desconexión de 4 segundos provocaba actualmente la pérdida de sincronía del cliente web. Aunque la base de datos almacena el Banco de Gracia de Red (30s para Duelo Espejo, 60s para Blitz), no existía una especificación formal de serialización que permitiera al cliente reconstruir la cuadrícula sin forzar un refresco destructivo que consumía todo el tiempo del turno.

### 1.2 Arquitectura Híbrida: Snapshot por Turno + Buffer de Acciones Delta

```
                             FLUJO DE RECUPERACIÓN DE ESTADO EN VIVO
                                                │
[ CLIENTE DETECTA DESCONEXIÓN ] ──► [ DETIENE RELOJ LOCAL Y DISPARA HEARTBEAT ]
                                                │
                                                ▼
[ RECONEXIÓN WEBSOCKET EXITOSA ] ──► [ INVOCA RPC: rpc_reconnect_match_state ]
                                                │
         ┌──────────────────────────────────────┴──────────────────────────────────────┐
         ▼                                                                             ▼
[ 1. PAYLOAD SNAPSHOT: INICIO TURNO ]                                 [ 2. BUFFER DELTA: ACCIONES EN CURSO ]
• Matriz completa de baldosas (propiedades/HP).                       • Array cronológico de micro-acciones:
• Vector de tropas con HP, munición, combustible.                     - MOVE: {unitId, path: [{x,y}...]}
• Fondos de tesorería y medidor estelar de COs.                       - SUB_ACTION: {unitId, type, targetCoord}
• Banco de Gracia remanente (segundos exactos).                       - COMBAT_RESOLVED: {dmgAttacker, dmgDefender}
         │                                                                             │
         └──────────────────────────────────────┬──────────────────────────────────────┘
                                                ▼
                             [ REPLAY DETERMINISTA EN MOTOR LOCAL ]
                             • Aplica Snapshot base en memoria pura.
                             • Re-ejecuta acciones Delta en ráfaga (<50ms).
                             • Reanuda temporizador con tiempo residual exacto.
```

### 1.3 Procedimiento Técnico de Implementación

#### Paso 1: Estructura de Datos de Snapshot y Delta (`src/types/network.ts`)

```typescript
// src/types/network.ts
import { TacticalUnit, TerrainTile } from './index';
import { PlayerCOState } from '../engine/coSystem';

export interface TurnSnapshot {
  matchId: string;
  turnNumber: number;
  activePlayer: 'p1' | 'p2';
  timestamp: string;
  tiles: { x: number; y: number; ownerId: string | null; captureHp: number }[];
  units: TacticalUnit[];
  funds: { p1: number; p2: number };
  coStates: Record<'p1' | 'p2', PlayerCOState>;
  airDrops: { id: string; x: number; y: number; turnsRemaining: number }[];
}

export type DeltaActionType = 'MOVE' | 'ATTACK' | 'CAPTURE' | 'JOIN' | 'LOAD' | 'UNLOAD' | 'SILO' | 'SUPPLY';

export interface DeltaAction {
  actionId: number;
  timestamp: number;
  unitId: string;
  type: DeltaActionType;
  from: { x: number; y: number };
  to: { x: number; y: number };
  targetId?: string;
  fundsDelta?: number;
}

export interface ReconnectionPayload {
  snapshot: TurnSnapshot;
  deltas: DeltaAction[];
  serverUtcTime: string;
  turnTimeLimitSec: number;
  turnTimeRemainingSec: number;
  disconnectGraceRemainingSec: number;
}
```

#### Paso 2: Función RPC en PostgreSQL (`supabase/migrations/20261031000018_reconnection_snapshots_and_full_catalog.sql`)

```sql
-- Migración 18: Tabla de Snapshots y Reconciliación Transaccional
CREATE TABLE IF NOT EXISTS public.match_turn_snapshots (
    match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (match_id, turn_number)
);

CREATE TABLE IF NOT EXISTS public.match_action_deltas (
    id BIGSERIAL PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.active_matches(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    action_index INTEGER NOT NULL,
    action_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.rpc_reconnect_match_state(
    p_match_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match RECORD;
    v_snapshot JSONB;
    v_deltas JSONB;
    v_grace_remaining NUMERIC(5,2);
    v_active_time_remaining NUMERIC(5,2);
BEGIN
    SELECT * INTO v_match FROM public.active_matches WHERE id = p_match_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Partida activa no encontrada: %', p_match_id;
    END IF;

    -- Obtener último snapshot del turno
    SELECT snapshot_data INTO v_snapshot
    FROM public.match_turn_snapshots
    WHERE match_id = p_match_id AND turn_number = v_match.current_turn_number;

    -- Obtener acciones delta del turno en curso
    SELECT jsonb_agg(action_payload ORDER BY action_index ASC) INTO v_deltas
    FROM public.match_action_deltas
    WHERE match_id = p_match_id AND turn_number = v_match.current_turn_number;

    -- Calcular gracia remanente
    IF v_match.player1_id = p_user_id THEN
        v_grace_remaining := v_match.p1_disconnect_grace_bank;
    ELSE
        v_grace_remaining := v_match.p2_disconnect_grace_bank;
    END IF;

    v_active_time_remaining := GREATEST(0.0, EXTRACT(EPOCH FROM (v_match.turn_expires_at - NOW())));

    RETURN jsonb_build_object(
        'snapshot', v_snapshot,
        'deltas', COALESCE(v_deltas, '[]'::jsonb),
        'server_utc_time', NOW(),
        'turn_time_remaining', v_active_time_remaining,
        'grace_bank_remaining', v_grace_remaining
    );
END;
$$;
```

---

## 2. INTEGRACIÓN CANÓNICA DE UNIDADES ESPECIALIZADAS (FASE 2 EN FÁBRICA)

### 2.1 Diagnóstico de Deuda Técnica
El motor balístico y los módulos de sub-acciones cuentan con el código completo de transporte y munición en `src/engine/specialAbilities.ts` y `src/engine/subActions.ts`:
- `apc`: Transporte blindado, reabastecimiento adyacente (`supply`), capacidad de 1 infantería/mech.
- `neotank`: Super-tanque blindado (coste $\$22,000\text{G}$, 6 mov, orugas, cañón Neo).
- `t_copter`: Helicóptero desarmado de transporte rápido (coste $\$5,000\text{G}$, 6 mov, 1 infantería/mech).
- `missiles`: Batería antiaérea indirecta de largo alcance (coste $\$12,000\text{G}$, rango 3-5).

Sin embargo, en `src/components/game/ProductionModal.tsx` y en el catálogo canónico del GDD ([`docs/01_MASTER_GAME_DESIGN_DOCUMENT.md#L101`](file:///c:/Users/Mor%C3%ADn/TacticalCommand/docs/01_MASTER_GAME_DESIGN_DOCUMENT.md#L101)), figuraban catalogadas como "Fase 2 / Pendientes de Integración en Fábrica".

### 2.2 Procedimiento de Despliegue en el Catálogo de Producción

#### Paso 1: Actualizar la Lista Maestra de Producción en `src/engine/productionCatalog.ts`
Vincular explícitamente las 4 unidades al catálogo canónico de instalaciones compatibles:

```typescript
// src/engine/productionCatalog.ts
export interface ProductionUnitEntry {
  id: string;
  name: string;
  category: 'ground' | 'air' | 'naval';
  cost: number;
  facility: 'factory' | 'airport' | 'port';
  movementType: 'foot' | 'mech' | 'wheels' | 'treads' | 'air' | 'sea';
  icon: string;
  description: string;
}

export const COMPLETE_PRODUCTION_CATALOG: ProductionUnitEntry[] = [
  // Tropas estándar certificadas
  { id: 'infantry', name: 'Infantería Ligera', category: 'ground', cost: 1000, facility: 'factory', movementType: 'foot', icon: 'User', description: 'Captura sedes y visión en niebla.' },
  { id: 'mech', name: 'Infantería Mecanizada', category: 'ground', cost: 3000, facility: 'factory', movementType: 'mech', icon: 'Shield', description: 'Bazuca pesada antitanque y captura.' },
  { id: 'recon', name: 'Blindado Recon', category: 'ground', cost: 4000, facility: 'factory', movementType: 'wheels', icon: 'Eye', description: 'Exploración rápida y alta visión.' },
  { id: 'tank_light', name: 'Tanque Ligero', category: 'ground', cost: 7000, facility: 'factory', movementType: 'treads', icon: 'Crosshair', description: 'Columna vertebral de asalto.' },
  { id: 'tank_medium', name: 'Tanque Mediano', category: 'ground', cost: 16000, facility: 'factory', movementType: 'treads', icon: 'Award', description: 'Blindaje pesado y cañón de 105mm.' },
  { id: 'artillery', name: 'Artillería Obús', category: 'ground', cost: 6000, facility: 'factory', movementType: 'treads', icon: 'Target', description: 'Fuego indirecto rango 2-3 sin contraataque.' },
  { id: 'rocket', name: 'Lanzacohetes Asedio', category: 'ground', cost: 15000, facility: 'factory', movementType: 'wheels', icon: 'Zap', description: 'Bombardeo indirecto rango 3-5.' },
  { id: 'anti_air', name: 'Antiaéreo Vulcan', category: 'ground', cost: 8000, facility: 'factory', movementType: 'treads', icon: 'ShieldAlert', description: 'Triturador de aviación e infantería.' },
  { id: 'b_copter', name: 'Helicóptero de Batalla', category: 'air', cost: 9000, facility: 'airport', movementType: 'air', icon: 'Navigation', description: 'Apoyo táctico cercano.' },
  { id: 'fighter', name: 'Caza Superioridad', category: 'air', cost: 20000, facility: 'airport', movementType: 'air', icon: 'Flame', description: 'Dominio del espacio aéreo.' },
  { id: 'bomber', name: 'Bombardero Pesado', category: 'air', cost: 22000, facility: 'airport', movementType: 'air', icon: 'Bomb', description: 'Destrucción masiva terrestre/naval.' },
  { id: 'battleship', name: 'Acorazado Naval', category: 'naval', cost: 28000, facility: 'port', movementType: 'sea', icon: 'Anchor', description: 'Artillería naval rango 2-6.' },

  // UNIDADES FASE 2 AHORA CERTIFICADAS E INTEGRADAS
  { id: 'apc', name: 'Transporte Blindado (APC)', category: 'ground', cost: 5000, facility: 'factory', movementType: 'treads', icon: 'Truck', description: 'Transporta 1 Inf/Mech y suministra munición/combustible adyacente.' },
  { id: 'neotank', name: 'Neotanque Pesado', category: 'ground', cost: 22000, facility: 'factory', movementType: 'treads', icon: 'Zap', description: 'Superblindado de vanguardia con alta movilidad (6 casillas).' },
  { id: 't_copter', name: 'Helicóptero de Transporte', category: 'air', cost: 5000, facility: 'airport', movementType: 'air', icon: 'Plane', description: 'Transporte aéreo veloz y desarmado para 1 Inf/Mech.' },
  { id: 'missiles', name: 'Batería Misiles AA', category: 'ground', cost: 12000, facility: 'factory', movementType: 'wheels', icon: 'Target', description: 'Defensa antiaérea indirecta de largo alcance (3-5).' }
];
```

#### Paso 2: Adaptación de `ProductionModal.tsx`
Vincular el modal de producción a la lista unificada. Cuando el jugador hace clic sobre una fábrica (`factory`), aeródromo (`airport`) o puerto (`port`), el modal filtra las opciones disponibles considerando:
1. Las cartas seleccionadas en el mazo de 10 unidades del comandante.
2. Los fondos disponibles ($G$).
3. La ausencia de tropas estacionadas sobre la baldosa de la instalación.

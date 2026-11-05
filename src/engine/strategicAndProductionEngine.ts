/**
 * ==============================================================================
 * MOTOR DE NODOS ESTRATÉGICOS, HANGAR DE FACCIÓN Y COLA DE PRODUCCIÓN
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md
 * Plan Maestro: PLAN_MAESTRO_IMPLEMENTACION_GEOTACTICS_ALICE_CERO_INCERTIDUMBRE.md
 * Migración: supabase/migrations/20261105000001_geotactics_strategic_nodes_and_queues.sql
 * ==============================================================================
 */

export interface StrategicNode {
  id: string;
  regionId: string;
  nodeType: 'capital_hq' | 'refinery_hub' | 'strait_canal' | 'radar_c4isr' | 'missile_silo';
  name: string;
  buffType: 'hegemonic_capital' | 'energy_extraction' | 'toll_chokepoint' | 'radar_recon' | 'area_denial';
  buffValue: number;
  controllingClanId?: string | null;
}

export interface UnitProductionItem {
  id: string;
  userId: string;
  clanId?: string | null;
  destination: 'user' | 'faction';
  unitCode: string;
  tier: 1 | 2 | 3 | 4 | 5;
  durationSeconds: number;
  startedAt: string;
  readyAt: string;
  isClaimed: boolean;
}

export interface FactionHangarStock {
  clanId: string;
  unitCode: string;
  tier: 1 | 2 | 3 | 4 | 5;
  stockQuantity: number;
}

export interface ProductionCost {
  fundsG: number;
  energyCreditEc: number;
  steelPlates: number;
  microchips: number;
}

// ============================================================================
// 1. CÁLCULO DETERMINISTA DE TIEMPOS DE FORJA FÍSICA
// ============================================================================

export const BASE_PRODUCTION_DURATIONS: Record<string, number> = {
  infantry: 0,        // T1 instantánea (kit F2P ilimitado)
  recon: 0,           // T1 instantánea (kit F2P ilimitado)
  mech: 60,           // 1 minuto
  tank: 180,          // 3 minutos
  artillery: 360,     // 6 minutos
  medium_tank: 480,   // 8 minutos
  anti_air: 300,      // 5 minutos
  b_copter: 600,      // 10 minutos
  fighter: 900,       // 15 minutos
  bomber: 1200,       // 20 minutos
  battleship: 1800,   // 30 minutos
};

/**
 * Calcula la duración exacta de ensamblaje en segundos.
 * Fórmula canónica:
 * t = (t_base * tierFactor) / ((1 + workshopBonus) * (1 + capitalBonus))
 */
export function calculateUnitProductionDuration(
  unitCode: string,
  tier: 1 | 2 | 3 | 4 | 5,
  options?: {
    hasCapitalHegemony?: boolean;
    workshopBonus?: number; // e.g. 0.15 para +15% de aceleración
  }
): number {
  // Kit F2P inagotable: T1 es 0 segundos
  if ((unitCode === 'infantry' || unitCode === 'recon') && tier === 1) {
    return 0;
  }

  const baseDuration = BASE_PRODUCTION_DURATIONS[unitCode] ?? 120;
  // Multiplicador por tier: +35% por nivel sobre Tier 1
  const tierMultiplier = 1 + (tier - 1) * 0.35;
  const rawDuration = baseDuration * tierMultiplier;

  const workshopMult = 1 + Math.max(0, options?.workshopBonus ?? 0);
  const capitalMult = options?.hasCapitalHegemony ? 1.10 : 1.00; // +10% velocidad por Capital Nacional

  const finalDuration = Math.round(rawDuration / (workshopMult * capitalMult));
  return Math.max(5, finalDuration); // Mínimo 5 segundos para cualquier unidad no F2P
}

/**
 * Calcula los costos de manufactura según la jerarquía de Tiers.
 */
export function calculateUnitProductionCost(
  unitCode: string,
  tier: 1 | 2 | 3 | 4 | 5
): ProductionCost {
  const isBasicF2p = (unitCode === 'infantry' || unitCode === 'recon') && tier === 1;

  if (isBasicF2p) {
    return {
      fundsG: unitCode === 'infantry' ? 1000 : 4000,
      energyCreditEc: 0,
      steelPlates: 0,
      microchips: 0,
    };
  }

  const tierScale = Math.pow(1.25, tier - 1);
  return {
    fundsG: Math.round(2500 * tierScale),
    energyCreditEc: Math.round(150 * tierScale),
    steelPlates: Math.round(4 * tier),
    microchips: tier >= 3 ? Math.round(2 * (tier - 2)) : 0,
  };
}

// ============================================================================
// 2. GESTIÓN DE COLA DE PRODUCCIÓN
// ============================================================================

export function createProductionQueueItem(
  userId: string,
  unitCode: string,
  tier: 1 | 2 | 3 | 4 | 5,
  destination: 'user' | 'faction',
  clanId?: string | null,
  options?: {
    hasCapitalHegemony?: boolean;
    workshopBonus?: number;
    startTimeOverride?: Date;
  }
): UnitProductionItem {
  const duration = calculateUnitProductionDuration(unitCode, tier, options);
  const start = options?.startTimeOverride ?? new Date();
  const ready = new Date(start.getTime() + duration * 1000);

  return {
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    clanId: destination === 'faction' ? (clanId ?? null) : null,
    destination,
    unitCode,
    tier,
    durationSeconds: duration,
    startedAt: start.toISOString(),
    readyAt: ready.toISOString(),
    isClaimed: false,
  };
}

export function isProductionItemReady(item: UnitProductionItem, currentTime?: Date): boolean {
  if (item.isClaimed) return false;
  const now = currentTime ? currentTime.getTime() : Date.now();
  const ready = new Date(item.readyAt).getTime();
  return now >= ready;
}

// ============================================================================
// 3. NODOS ESTRATÉGICOS Y BUFFS DE ZONA
// ============================================================================

export interface RegionalStrategicState {
  hasCapitalHegemony: boolean; // Control de REG_VE_01
  energyYieldMultiplier: number;
  tollFeePercent: number;
  radarSightBonus: number;
  activeMissileSilosCount: number;
}

export function evaluateStrategicNodes(
  clanId: string,
  nodes: StrategicNode[]
): RegionalStrategicState {
  let hasCapital = false;
  let energyMultiplier = 1.0;
  let maxToll = 0.0;
  let radarBonus = 0;
  let missileSilos = 0;

  for (const node of nodes) {
    if (node.controllingClanId === clanId) {
      if (node.nodeType === 'capital_hq') {
        hasCapital = true;
      }
      if (node.nodeType === 'refinery_hub') {
        energyMultiplier += (node.buffValue - 1.0);
      }
      if (node.nodeType === 'strait_canal') {
        maxToll = Math.max(maxToll, node.buffValue);
      }
      if (node.nodeType === 'radar_c4isr') {
        radarBonus += node.buffValue;
      }
      if (node.nodeType === 'missile_silo') {
        missileSilos += 1;
      }
    }
  }

  // Capital otorga adicionalmente +15% de energía nacional
  if (hasCapital) {
    energyMultiplier += 0.15;
  }

  return {
    hasCapitalHegemony: hasCapital,
    energyYieldMultiplier: Number(energyMultiplier.toFixed(2)),
    tollFeePercent: maxToll,
    radarSightBonus: radarBonus,
    activeMissileSilosCount: missileSilos,
  };
}

// ============================================================================
// 4. HANGAR COMUNITARIO DE FACCIÓN (PRÉSTAMO Y COMANDO DE UNIDADES)
// ============================================================================

export interface FactionBorrowRequest {
  clanId: string;
  userId: string;
  userRank: 'recruit' | 'corporal' | 'sergeant' | 'veteran';
  unitCode: string;
  tier: 1 | 2 | 3 | 4 | 5;
}

export interface FactionBorrowResult {
  approved: boolean;
  reason?: string;
  unitCode?: string;
  tier?: 1 | 2 | 3 | 4 | 5;
  remainingStock?: number;
}

/**
 * Valida si un oficial puede tomar prestada una unidad del arsenal del clan.
 * Regla de doctrina: Rango mínimo Sargento para unidades blindadas/pesadas de facción.
 */
export function authorizeFactionUnitBorrow(
  request: FactionBorrowRequest,
  hangarStock: FactionHangarStock[]
): FactionBorrowResult {
  // Verificación de jerarquía de rango
  if (request.userRank === 'recruit') {
    return {
      approved: false,
      reason: 'Rango insuficiente. Los Reclutas no tienen acceso al Hangar Comunitario.',
    };
  }

  if (request.userRank === 'corporal' && request.tier >= 3) {
    return {
      approved: false,
      reason: 'Los Cabos solo pueden solicitar unidades de Facción hasta Tier 2.',
    };
  }

  const stockEntry = hangarStock.find(
    (item) =>
      item.clanId === request.clanId &&
      item.unitCode === request.unitCode &&
      item.tier === request.tier
  );

  if (!stockEntry || stockEntry.stockQuantity <= 0) {
    return {
      approved: false,
      reason: `No hay existencias disponibles de ${request.unitCode} (Tier ${request.tier}) en el Hangar del Clan.`,
    };
  }

  return {
    approved: true,
    unitCode: request.unitCode,
    tier: request.tier,
    remainingStock: stockEntry.stockQuantity - 1,
  };
}

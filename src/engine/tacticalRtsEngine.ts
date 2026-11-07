/**
 * MOTOR DE COMBATE TÁCTICO RTS CONTINUO (10 TICKS / SEGUNDO)
 * 
 * Basado en la especificación canónica: docs/03_TACTICAL_STRATEGY_SYSTEM_DESIGN.md
 * - Frecuencia de simulación: 10 ticks/s (delta = 100 ms).
 * - Cooldowns de recarga y movimiento continuos por tipo de chasis.
 * - Maniobra por intenciones de marcha interpoladas (UNIT_MOVE_INTENT).
 * - Balística determinista 1-100 HP reutilizando CanonicalCombatEngine.
 * - Cero spam de red: eventos de orden y resolución balística.
 */

import { TacticalUnit, TerrainTile } from '../types';
import { CanonicalCombatEngine, CanonicalCombatOptions, CanonicalCombatResult } from './canonicalCombat';

export type ChassisType = 'foot' | 'mech' | 'wheels' | 'treads' | 'air';

export interface RtsUnitProfile {
  unitCode: string;
  name: string;
  chassis: ChassisType;
  baseMoveRange: number;
  minRange: number;
  maxRange: number;
  reloadCooldownMs: number;
  moveSpeedCellsPerSec: number;
  baseCost: number;
  isInfiniteStock?: boolean;
}

/**
 * Matriz canónica balanceada de las 10 unidades bélicas
 * Fuente: docs/03_TACTICAL_STRATEGY_SYSTEM_DESIGN.md - Sección 6
 */
export const CANONICAL_RTS_PROFILES: Record<string, RtsUnitProfile> = {
  infantry: {
    unitCode: 'infantry',
    name: 'Infantería Ligera',
    chassis: 'foot',
    baseMoveRange: 3,
    minRange: 1,
    maxRange: 1,
    reloadCooldownMs: 1000, // 1.0s
    moveSpeedCellsPerSec: 1.5,
    baseCost: 1000,
    isInfiniteStock: true,
  },
  mech: {
    unitCode: 'mech',
    name: 'Mecanizado (Bazooka)',
    chassis: 'mech',
    baseMoveRange: 2,
    minRange: 1,
    maxRange: 1,
    reloadCooldownMs: 2000, // 2.0s
    moveSpeedCellsPerSec: 1.2,
    baseCost: 3000,
  },
  recon: {
    unitCode: 'recon',
    name: 'Jeep Reconocimiento',
    chassis: 'wheels',
    baseMoveRange: 8,
    minRange: 1,
    maxRange: 1,
    reloadCooldownMs: 1200, // 1.2s
    moveSpeedCellsPerSec: 4.0,
    baseCost: 4000,
    isInfiniteStock: true,
  },
  tank_light: {
    unitCode: 'tank_light',
    name: 'Tanque Ligero',
    chassis: 'treads',
    baseMoveRange: 6,
    minRange: 1,
    maxRange: 1,
    reloadCooldownMs: 2500, // 2.5s
    moveSpeedCellsPerSec: 2.8,
    baseCost: 7000,
  },
  tank_medium: {
    unitCode: 'tank_medium',
    name: 'Tanque Medio',
    chassis: 'treads',
    baseMoveRange: 5,
    minRange: 1,
    maxRange: 1,
    reloadCooldownMs: 3500, // 3.5s
    moveSpeedCellsPerSec: 2.2,
    baseCost: 12000,
  },
  artillery: {
    unitCode: 'artillery',
    name: 'Artillería Autopropulsada',
    chassis: 'treads',
    baseMoveRange: 5,
    minRange: 2,
    maxRange: 3,
    reloadCooldownMs: 5500, // 5.5s
    moveSpeedCellsPerSec: 1.8,
    baseCost: 6000,
  },
  rocket: {
    unitCode: 'rocket',
    name: 'Lanzacohetes Pesado',
    chassis: 'wheels',
    baseMoveRange: 5,
    minRange: 3,
    maxRange: 5,
    reloadCooldownMs: 7500, // 7.5s
    moveSpeedCellsPerSec: 2.0,
    baseCost: 15000,
  },
  anti_air: {
    unitCode: 'anti_air',
    name: 'Blindado Antiaéreo',
    chassis: 'treads',
    baseMoveRange: 6,
    minRange: 1,
    maxRange: 1,
    reloadCooldownMs: 1000, // 1.0s
    moveSpeedCellsPerSec: 3.0,
    baseCost: 8000,
  },
  missile: {
    unitCode: 'missile',
    name: 'Batería SAM Móvil',
    chassis: 'wheels',
    baseMoveRange: 4,
    minRange: 3,
    maxRange: 5,
    reloadCooldownMs: 6000, // 6.0s
    moveSpeedCellsPerSec: 1.6,
    baseCost: 12000,
  },
  chopper_battle: {
    unitCode: 'chopper_battle',
    name: 'Helicóptero Asalto',
    chassis: 'air',
    baseMoveRange: 6,
    minRange: 1,
    maxRange: 1,
    reloadCooldownMs: 1800, // 1.8s
    moveSpeedCellsPerSec: 3.5,
    baseCost: 9000,
  },
};

export interface UnitMoveIntent {
  unitId: string;
  path: Array<{ x: number; y: number }>;
  currentWaypointIndex: number;
  stepProgressMs: number;
  msPerStep: number;
}

export interface TacticalRtsUnitState extends TacticalUnit {
  reloadRemainingMs: number;
  lastFiredTimestamp: number;
  currentMoveIntent: UnitMoveIntent | null;
  tier: number; // 1-5
  isDestroyed?: boolean;
}

export interface BallisticTracer {
  id: string;
  attackerId: string;
  targetId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  startedAt: number;
  durationMs: number; // Típicamente 200 ms
  damageDealt: number;
  isCritical: boolean;
}

export interface RtsFireResult {
  success: boolean;
  reason?: string;
  combatResult?: CanonicalCombatResult;
  tracer?: BallisticTracer;
  defenderDestroyed?: boolean;
  attackerDestroyed?: boolean;
}

export interface TacticalRtsEngineOptions {
  tickIntervalMs?: number; // 100 ms por defecto (10 ticks/s)
  isCompetitiveMirror?: boolean; // Tier 1 espejo (+0%)
}

export class TacticalRtsEngine {
  private units: Map<string, TacticalRtsUnitState> = new Map();
  private terrainMap: Map<string, TerrainTile> = new Map();
  private activeTracers: BallisticTracer[] = [];
  private tickIntervalMs: number;
  private isCompetitiveMirror: boolean;
  private isDirty: boolean = true;
  private lastTickTimestamp: number = 0;

  constructor(options: TacticalRtsEngineOptions = {}) {
    this.tickIntervalMs = options.tickIntervalMs ?? 100;
    this.isCompetitiveMirror = options.isCompetitiveMirror ?? false;
  }

  public registerUnit(unit: TacticalUnit, tier: number = 1): TacticalRtsUnitState {
    const existing = this.units.get(unit.id);
    if (existing) return existing;

    const profile = CANONICAL_RTS_PROFILES[unit.unitCode] || CANONICAL_RTS_PROFILES.infantry;
    const rtsUnit: TacticalRtsUnitState = {
      ...unit,
      hp: unit.hp ?? 100,
      tier: Math.max(1, Math.min(5, tier)),
      reloadRemainingMs: 0,
      lastFiredTimestamp: 0,
      currentMoveIntent: null,
      minRange: profile.minRange,
      maxRange: profile.maxRange,
      moveRange: profile.baseMoveRange,
      isDestroyed: false,
    };

    this.units.set(unit.id, rtsUnit);
    this.isDirty = true;
    return rtsUnit;
  }

  public setTerrain(x: number, y: number, tile: TerrainTile): void {
    this.terrainMap.set(`${x},${y}`, tile);
  }

  public getTerrain(x: number, y: number): TerrainTile {
    return this.terrainMap.get(`${x},${y}`) ?? {
      type: 'plains',
      defenseStars: 1,
      movementCost: { foot: 1, mech: 1, tires: 2, treads: 1, air: 1, sea: 99 },
    };
  }

  public getUnit(id: string): TacticalRtsUnitState | undefined {
    return this.units.get(id);
  }

  public getAllUnits(): TacticalRtsUnitState[] {
    return Array.from(this.units.values()).filter((u) => !u.isDestroyed);
  }

  public getActiveTracers(): BallisticTracer[] {
    return this.activeTracers;
  }

  public consumeDirtyFlag(): boolean {
    const dirty = this.isDirty;
    this.isDirty = false;
    return dirty;
  }

  /**
   * Ciclo de simulación continua a 10 ticks/s (deltaMs = 100 ms)
   */
  public tick(now: number = Date.now()): { stateChanged: boolean; expiredTracers: string[] } {
    const deltaMs = this.lastTickTimestamp > 0 ? Math.min(now - this.lastTickTimestamp, 500) : this.tickIntervalMs;
    this.lastTickTimestamp = now;

    let stateChanged = false;

    // 1. Limpiar trazadoras balísticas expiradas (> 200 ms)
    const activeTracersCountBefore = this.activeTracers.length;
    this.activeTracers = this.activeTracers.filter((t) => now - t.startedAt < t.durationMs);
    if (this.activeTracers.length !== activeTracersCountBefore) {
      stateChanged = true;
    }

    // 2. Decrementar cooldowns de recarga y avanzar movimiento
    for (const unit of this.units.values()) {
      if (unit.isDestroyed) continue;

      // Decrementar recarga
      if (unit.reloadRemainingMs > 0) {
        unit.reloadRemainingMs = Math.max(0, unit.reloadRemainingMs - deltaMs);
        if (unit.reloadRemainingMs === 0) {
          stateChanged = true;
        }
      }

      // Procesar intención de marcha
      if (unit.currentMoveIntent) {
        stateChanged = true;
        const intent = unit.currentMoveIntent;
        intent.stepProgressMs += deltaMs;

        if (intent.stepProgressMs >= intent.msPerStep) {
          intent.stepProgressMs = 0;
          intent.currentWaypointIndex++;

          if (intent.currentWaypointIndex < intent.path.length) {
            const nextCoord = intent.path[intent.currentWaypointIndex];
            unit.x = nextCoord.x;
            unit.y = nextCoord.y;
            if (intent.currentWaypointIndex >= intent.path.length - 1) {
              unit.currentMoveIntent = null;
            }
          } else {
            // Llegada al destino final
            unit.currentMoveIntent = null;
          }
        }
      }
    }

    if (stateChanged) {
      this.isDirty = true;
    }

    return { stateChanged, expiredTracers: [] };
  }

  /**
   * Ordena a una unidad marchar por un camino planificado
   */
  public issueMoveOrder(unitId: string, path: Array<{ x: number; y: number }>, now: number = Date.now()): boolean {
    const unit = this.units.get(unitId);
    if (!unit || unit.isDestroyed || path.length < 2) return false;

    const profile = CANONICAL_RTS_PROFILES[unit.unitCode] || CANONICAL_RTS_PROFILES.infantry;
    const msPerStep = Math.round(1000 / profile.moveSpeedCellsPerSec);

    unit.currentMoveIntent = {
      unitId,
      path,
      currentWaypointIndex: 0,
      stepProgressMs: 0,
      msPerStep,
    };

    this.isDirty = true;
    return true;
  }

  /**
   * Detiene el movimiento de una unidad inmediatamente
   */
  public haltUnit(unitId: string): void {
    const unit = this.units.get(unitId);
    if (unit && unit.currentMoveIntent) {
      unit.currentMoveIntent = null;
      this.isDirty = true;
    }
  }

  /**
   * Comprueba si la unidad atacante puede disparar sobre el objetivo
   */
  public canFire(attackerId: string, targetId: string, now: number = Date.now()): { canFire: boolean; reason?: string } {
    const attacker = this.units.get(attackerId);
    const target = this.units.get(targetId);

    if (!attacker || attacker.isDestroyed) return { canFire: false, reason: 'ATTACKER_UNAVAILABLE' };
    if (!target || target.isDestroyed) return { canFire: false, reason: 'TARGET_UNAVAILABLE' };
    if (attacker.owner === target.owner) return { canFire: false, reason: 'FRIENDLY_FIRE_PROHIBITED' };

    // Validación de Cooldown de Recarga
    if (attacker.reloadRemainingMs > 0) {
      return { canFire: false, reason: `WEAPON_RELOADING_${attacker.reloadRemainingMs}MS` };
    }

    // Artillería o armas pesadas no disparan en movimiento
    const profile = CANONICAL_RTS_PROFILES[attacker.unitCode];
    if (profile && (profile.unitCode === 'artillery' || profile.unitCode === 'rocket') && attacker.currentMoveIntent) {
      return { canFire: false, reason: 'INDIRECT_FIRE_REQUIRES_STATIONARY' };
    }

    // Validación de Rango de Distancia Manhattan
    const distance = Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
    if (distance < attacker.minRange || distance > attacker.maxRange) {
      return { canFire: false, reason: `OUT_OF_RANGE_DIST_${distance}` };
    }

    return { canFire: true };
  }

  /**
   * Ejecuta el disparo en tiempo real gobernado por cooldowns y balística canónica
   */
  public executeFire(attackerId: string, targetId: string, now: number = Date.now()): RtsFireResult {
    const validation = this.canFire(attackerId, targetId, now);
    if (!validation.canFire) {
      return { success: false, reason: validation.reason };
    }

    const attacker = this.units.get(attackerId)!;
    const target = this.units.get(targetId)!;
    const profile = CANONICAL_RTS_PROFILES[attacker.unitCode] || CANONICAL_RTS_PROFILES.infantry;

    const attackerTile = this.getTerrain(attacker.x, attacker.y);
    const defenderTile = this.getTerrain(target.x, target.y);

    // Configuración canónica anti-P2W (+0% en esports, +2% territorial tier)
    const options: CanonicalCombatOptions = {
      scale100Hp: true,
      deterministic: true,
      attackerTierLevel: this.isCompetitiveMirror ? 1 : attacker.tier,
      defenderTierLevel: this.isCompetitiveMirror ? 1 : target.tier,
    };

    const combatResult = CanonicalCombatEngine.calculateEngagement(attacker, target, attackerTile, defenderTile, options);

    if (!combatResult.canAttack) {
      return { success: false, reason: 'COMBAT_REJECTED_BY_ENGINE' };
    }

    // 1. Aplicar daño balístico al defensor (1-100 HP)
    target.hp = Math.max(0, combatResult.defenderHpAfter);
    if (target.hp === 0) {
      target.isDestroyed = true;
      target.currentMoveIntent = null;
    }

    // 2. Si el defensor sobrevive y puede contraatacar (solo ataque directo adyacente a rango 1)
    if (combatResult.canCounterAttack && !target.isDestroyed) {
      attacker.hp = Math.max(0, combatResult.attackerHpAfter);
      if (attacker.hp === 0) {
        attacker.isDestroyed = true;
        attacker.currentMoveIntent = null;
      }
    }

    // 3. Aplicar Cooldown de Recarga al Atacante
    attacker.reloadRemainingMs = profile.reloadCooldownMs;
    attacker.lastFiredTimestamp = now;

    // 4. Crear Trazadora Balística Visual para WebGL TileCanvas (200 ms de vida)
    const isCritical = combatResult.attackerDamageDealt >= 40;
    const tracer: BallisticTracer = {
      id: `tracer-${now}-${Math.random().toString(36).substring(2, 7)}`,
      attackerId,
      targetId,
      from: { x: attacker.x, y: attacker.y },
      to: { x: target.x, y: target.y },
      startedAt: now,
      durationMs: 200,
      damageDealt: combatResult.attackerDamageDealt,
      isCritical,
    };
    this.activeTracers.push(tracer);

    this.isDirty = true;

    return {
      success: true,
      combatResult,
      tracer,
      defenderDestroyed: target.isDestroyed,
      attackerDestroyed: attacker.isDestroyed,
    };
  }
}

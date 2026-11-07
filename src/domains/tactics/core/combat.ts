import { TacticalUnit, TerrainTile } from '../types';
import {
  CANONICAL_DAMAGE_CHART,
  getCanonicalBaseDamage,
  normalizeUnitCode,
} from './canonicalDamageChart';
import {
  CanonicalCombatEngine,
  CanonicalCombatOptions,
  CanonicalCombatResult,
} from './canonicalCombat';

export { CANONICAL_DAMAGE_CHART, getCanonicalBaseDamage, normalizeUnitCode };
export type { CanonicalCombatOptions, CanonicalCombatResult };

/**
 * Matriz canónica de efectividad de combate de Advance Wars.
 * Daño base porcentual infligido por un atacante con 10 HP sobre un defensor en terreno con 0 estrellas.
 */
export const COMBAT_EFFECTIVENESS_MATRIX: Record<string, Record<string, number>> = {
  infantry: {
    infantry: 55, mech: 45, recon: 12, tank_light: 5, tank_medium: 1,
    artillery: 15, rocket: 25, anti_air: 5, b_copter: 7, fighter: 0, bomber: 0, battleship: 0,
  },
  mech: {
    infantry: 65, mech: 55, recon: 85, tank_light: 55, tank_medium: 15,
    artillery: 70, rocket: 85, anti_air: 65, b_copter: 9, fighter: 0, bomber: 0, battleship: 0,
  },
  recon: {
    infantry: 70, mech: 65, recon: 35, tank_light: 12, tank_medium: 1,
    artillery: 45, rocket: 55, anti_air: 4, b_copter: 10, fighter: 0, bomber: 0, battleship: 0,
  },
  tank_light: {
    infantry: 75, mech: 70, recon: 85, tank_light: 55, tank_medium: 15,
    artillery: 70, rocket: 85, anti_air: 65, b_copter: 10, fighter: 0, bomber: 0, battleship: 5,
  },
  tank_medium: {
    infantry: 105, mech: 95, recon: 105, tank_light: 85, tank_medium: 55,
    artillery: 105, rocket: 105, anti_air: 105, b_copter: 12, fighter: 0, bomber: 0, battleship: 10,
  },
  artillery: {
    infantry: 90, mech: 85, recon: 80, tank_light: 70, tank_medium: 45,
    artillery: 75, rocket: 80, anti_air: 75, b_copter: 0, fighter: 0, bomber: 0, battleship: 40,
  },
  rocket: {
    infantry: 95, mech: 90, recon: 90, tank_light: 80, tank_medium: 55,
    artillery: 80, rocket: 85, anti_air: 85, b_copter: 0, fighter: 0, bomber: 0, battleship: 55,
  },
  anti_air: {
    infantry: 105, mech: 105, recon: 60, tank_light: 25, tank_medium: 10,
    artillery: 50, rocket: 55, anti_air: 45, b_copter: 105, fighter: 65, bomber: 75, battleship: 0,
  },
  b_copter: {
    infantry: 75, mech: 75, recon: 55, tank_light: 55, tank_medium: 25,
    artillery: 65, rocket: 65, anti_air: 25, b_copter: 65, fighter: 0, bomber: 0, battleship: 25,
  },
  fighter: {
    infantry: 0, mech: 0, recon: 0, tank_light: 0, tank_medium: 0,
    artillery: 0, rocket: 0, anti_air: 0, b_copter: 100, fighter: 100, bomber: 100, battleship: 0,
  },
  bomber: {
    infantry: 110, mech: 110, recon: 105, tank_light: 105, tank_medium: 95,
    artillery: 105, rocket: 105, anti_air: 95, b_copter: 0, fighter: 0, bomber: 0, battleship: 75,
  },
  battleship: {
    infantry: 95, mech: 90, recon: 90, tank_light: 85, tank_medium: 55,
    artillery: 85, rocket: 90, anti_air: 85, b_copter: 0, fighter: 0, bomber: 0, battleship: 50,
  },
};

export interface CombatResult {
  canAttack: boolean;
  distance: number;
  attackerDamageDealt: number;
  defenderHpBefore: number;
  defenderHpAfter: number;
  defenderEliminated: boolean;
  canCounterAttack: boolean;
  counterDamageDealt: number;
  attackerHpBefore: number;
  attackerHpAfter: number;
  attackerEliminated: boolean;
  defenderCoverageStars: number;
  damageReductionPercent: number;
  // Propiedades canónicas enriquecidas
  weaponUsed?: 'primary' | 'secondary' | 'none';
  attackerDamagePercent?: number;
  counterWeaponUsed?: 'primary' | 'secondary' | 'none';
  counterDamagePercent?: number;
  luckBonus?: number;
  baseDamage?: number;
}

export interface CaptureResult {
  success: boolean;
  message: string;
  isCompleted: boolean;
  isHqCaptured: boolean;
  previousCaptureHp: number;
  remainingCaptureHp: number;
  propertyType: TerrainTile['type'];
  newOwnerId: string | null;
}

export class CombatEngine {
  /**
   * Calcula el daño directo o indirecto entre atacante y defensor respetando
   * rangos, HP actual, estrellas de terreno, armas primarias/secundarias y contraataques.
   */
  public static calculateDamage(
    attacker: TacticalUnit,
    defender: TacticalUnit,
    attackerTile: TerrainTile,
    defenderTile: TerrainTile,
    coAttackBonus: number = 0,
    coDefenseBonus: number = 0,
    options?: CanonicalCombatOptions
  ): CombatResult {
    const distance = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
    const inRange = distance >= attacker.minRange && distance <= attacker.maxRange;

    if (!inRange) {
      return {
        canAttack: false,
        distance,
        attackerDamageDealt: 0,
        defenderHpBefore: defender.hp,
        defenderHpAfter: defender.hp,
        defenderEliminated: false,
        canCounterAttack: false,
        counterDamageDealt: 0,
        attackerHpBefore: attacker.hp,
        attackerHpAfter: attacker.hp,
        attackerEliminated: false,
        defenderCoverageStars: defenderTile.defenseStars,
        damageReductionPercent: defenderTile.defenseStars * 10,
        weaponUsed: 'none',
      };
    }

    // Si la matriz básica define daño nulo explícito (ej. Caza vs tropas terrestres), descartar ataque
    const quickBase = COMBAT_EFFECTIVENESS_MATRIX[attacker.unitCode]?.[defender.unitCode];
    if (quickBase === 0) {
      return {
        canAttack: false,
        distance,
        attackerDamageDealt: 0,
        defenderHpBefore: defender.hp,
        defenderHpAfter: defender.hp,
        defenderEliminated: false,
        canCounterAttack: false,
        counterDamageDealt: 0,
        attackerHpBefore: attacker.hp,
        attackerHpAfter: attacker.hp,
        attackerEliminated: false,
        defenderCoverageStars: defenderTile.defenseStars,
        damageReductionPercent: defenderTile.defenseStars * 10,
        weaponUsed: 'none',
      };
    }

    // Ejecutar motor de cálculo canónico con fórmula Advance Wars / AWBW
    const canonicalRes = CanonicalCombatEngine.calculateEngagement(
      attacker,
      defender,
      attackerTile,
      defenderTile,
      {
        attackerHasAmmo: options?.attackerHasAmmo ?? attacker.ammo > 0,
        defenderHasAmmo: options?.defenderHasAmmo ?? defender.ammo > 0,
        commtowersCount: options?.commtowersCount ?? 0,
        coAttackModifier: Math.round((1 + coAttackBonus) * 100),
        coDefenseModifier: Math.round((1 + coDefenseBonus) * 100),
        luckRoll: options?.luckRoll ?? { goodLuck: 0, badLuck: 0 },
        deterministic: options?.deterministic ?? true,
      }
    );

    return canonicalRes;
  }

  /**
   * Ejecuta la mecánica de captura de propiedades por tropas a pie (Infantería o Mecanizados).
   * Cada propiedad inicia con 20 Puntos de Captura.
   */
  public static processPropertyCapture(
    unit: TacticalUnit,
    propertyTile: TerrainTile
  ): CaptureResult {
    const isCapturingTroop = unit.movementType === 'foot' || unit.movementType === 'mech';
    const isCapturableProperty = [
      'city',
      'factory',
      'airport',
      'port',
      'hq',
    ].includes(propertyTile.type);

    if (!isCapturingTroop) {
      return {
        success: false,
        message: 'Solo las tropas de Infantería o Mecanizados pueden capturar propiedades',
        isCompleted: false,
        isHqCaptured: false,
        previousCaptureHp: propertyTile.captureHp ?? 20,
        remainingCaptureHp: propertyTile.captureHp ?? 20,
        propertyType: propertyTile.type,
        newOwnerId: propertyTile.ownerId ?? null,
      };
    }

    if (!isCapturableProperty) {
      return {
        success: false,
        message: 'Este tipo de terreno no puede ser capturado',
        isCompleted: false,
        isHqCaptured: false,
        previousCaptureHp: 20,
        remainingCaptureHp: 20,
        propertyType: propertyTile.type,
        newOwnerId: propertyTile.ownerId ?? null,
      };
    }

    if (propertyTile.ownerId === unit.ownerId) {
      return {
        success: false,
        message: 'Esta propiedad ya está bajo tu control',
        isCompleted: true,
        isHqCaptured: false,
        previousCaptureHp: 20,
        remainingCaptureHp: 20,
        propertyType: propertyTile.type,
        newOwnerId: unit.ownerId,
      };
    }

    const previousCaptureHp = propertyTile.captureHp ?? 20;
    // La reducción de puntos de captura es proporcional al HP actual (escala 100 HP: 10 pts por turno a 100 HP, escala 10 HP: unit.hp)
    const pointsPerTurn = (unit.maxHp === 100 || unit.hp > 10) ? Math.max(1, Math.ceil(unit.hp / 10)) : unit.hp;
    const capturePointsDeducted = Math.min(previousCaptureHp, pointsPerTurn);
    const remainingCaptureHp = Math.max(0, previousCaptureHp - capturePointsDeducted);

    const isCompleted = remainingCaptureHp === 0;
    const isHqCaptured = isCompleted && propertyTile.type === 'hq';

    return {
      success: true,
      message: isCompleted
        ? `¡Propiedad capturada exitosamente para el ejército ${unit.ownerId}!`
        : `Captura en progreso. Puntos restantes: ${remainingCaptureHp}/20`,
      isCompleted,
      isHqCaptured,
      previousCaptureHp,
      remainingCaptureHp: isCompleted ? 20 : remainingCaptureHp,
      propertyType: propertyTile.type,
      newOwnerId: isCompleted ? unit.ownerId : propertyTile.ownerId ?? null,
    };
  }
}

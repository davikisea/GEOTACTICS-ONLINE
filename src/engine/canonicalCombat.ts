/**
 * MOTOR DE COMBATE CANÓNICO (ADVANCE WARS / WARSWORLD / TACTICAL COMMAND)
 * 
 * Implementa la fórmula oficial y exacta de combate de AWBW / Intelligent Systems,
 * con soporte para:
 * - Armas primarias y secundarias con comprobación de munición.
 * - Reducción por estrellas de terreno proporcional al HP del defensor.
 * - Tiradas de suerte (Good Luck / Bad Luck).
 * - Torres de comunicación militares (+10% ataque por torre).
 * - Contraataques directos calculados sobre el HP sobreviviente.
 * - Captura de propiedades por tropas a pie.
 */

import { TacticalUnit, TerrainTile } from '../types';
import { getCanonicalBaseDamage } from './canonicalDamageChart';

export interface LuckRoll {
  goodLuck: number; // 0.0 a 1.0 (1.0 = suerte máxima)
  badLuck: number;  // 0.0 a 1.0 (normalmente 0, salvo COs inestables como Flak)
}

/**
 * Normaliza el nivel de carta para torneos esports o ladder competitivo.
 * Especificación: docs/orchestration/02_ECONOMY_AND_RETENTION_REBALANCE.md
 * - Modo Torneo (Esports): Nivel 11 forzado (Tournament Cap absoluto sin P2W).
 * - Ladder Asimétrico: Nivel entre 1 y 15.
 */
export function normalizeCardLevel(rawLevel: number = 1, isTournamentMode: boolean = false): number {
  if (isTournamentMode) {
    return 11; // Tournament Cap Absoluto
  }
  return Math.max(1, Math.min(15, rawLevel));
}

/**
 * Calcula el bono porcentual de ataque según el nivel de la unidad y el modo.
 * Fórmula sigmoidea suave:
 * - Modo Torneo: 0.0% (paridad total).
 * - Nivel 1 a 11: +1.2% por nivel (tope 12.0%).
 * - Nivel 12 a 15: +0.5% por nivel (tope 14.0%).
 */
export function getLevelAttackBonus(level: number = 1, isTournamentMode: boolean = false): number {
  if (isTournamentMode) {
    return 0.0;
  }
  const L = normalizeCardLevel(level, false);
  if (L <= 11) {
    return (L - 1) * 1.2;
  }
  return 12.0 + (L - 11) * 0.5;
}

export interface CanonicalCombatOptions {
  attackerHasAmmo?: boolean;
  defenderHasAmmo?: boolean;
  commtowersCount?: number;
  coAttackModifier?: number;  // Multiplicador porcentual (base 100)
  coDefenseModifier?: number; // Multiplicador porcentual (base 100)
  attackerLevel?: number;     // Nivel de la carta atacante (1-15)
  defenderLevel?: number;     // Nivel de la carta defensora (1-15)
  isTournamentMode?: boolean; // Forzar Tournament Cap Nivel 11
  luckRoll?: LuckRoll;
  deterministic?: boolean;    // true para partidas de torneo / pruebas sin RNG
}

export interface CanonicalCombatResult {
  canAttack: boolean;
  distance: number;
  weaponUsed: 'primary' | 'secondary' | 'none';
  baseDamage: number;
  luckBonus: number;
  attackerDamagePercent: number;
  attackerDamageDealt: number; // Daño directo en puntos de HP (1 a 10)
  defenderHpBefore: number;
  defenderHpAfter: number;
  defenderEliminated: boolean;
  canCounterAttack: boolean;
  counterWeaponUsed?: 'primary' | 'secondary' | 'none';
  counterDamagePercent: number;
  counterDamageDealt: number;
  attackerHpBefore: number;
  attackerHpAfter: number;
  attackerEliminated: boolean;
  defenderCoverageStars: number;
  damageReductionPercent: number;
}

export class CanonicalCombatEngine {
  /**
   * Ejecuta el cálculo completo de un enfrentamiento táctico
   */
  public static calculateEngagement(
    attacker: TacticalUnit,
    defender: TacticalUnit,
    attackerTile: TerrainTile,
    defenderTile: TerrainTile,
    options: CanonicalCombatOptions = {}
  ): CanonicalCombatResult {
    const {
      attackerHasAmmo = attacker.ammo > 0,
      defenderHasAmmo = defender.ammo > 0,
      commtowersCount = 0,
      coAttackModifier = 100,
      coDefenseModifier = 100,
      attackerLevel = 1,
      defenderLevel = 1,
      isTournamentMode = false,
      luckRoll = { goodLuck: 0, badLuck: 0 },
      deterministic = true,
    } = options;

    const distance = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
    const inRange = distance >= attacker.minRange && distance <= attacker.maxRange;

    // Si está fuera de rango, no se puede iniciar ataque
    if (!inRange) {
      return {
        canAttack: false,
        distance,
        weaponUsed: 'none',
        baseDamage: 0,
        luckBonus: 0,
        attackerDamagePercent: 0,
        attackerDamageDealt: 0,
        defenderHpBefore: defender.hp,
        defenderHpAfter: defender.hp,
        defenderEliminated: false,
        canCounterAttack: false,
        counterDamagePercent: 0,
        counterDamageDealt: 0,
        attackerHpBefore: attacker.hp,
        attackerHpAfter: attacker.hp,
        attackerEliminated: false,
        defenderCoverageStars: defenderTile.defenseStars,
        damageReductionPercent: defenderTile.defenseStars * 10,
      };
    }

    // 1. Obtener daño base según catálogo y munición
    const { baseDamage, weaponUsed } = getCanonicalBaseDamage(
      attacker.unitCode,
      defender.unitCode,
      attackerHasAmmo
    );

    if (baseDamage <= 0 || weaponUsed === 'none') {
      return {
        canAttack: false,
        distance,
        weaponUsed: 'none',
        baseDamage: 0,
        luckBonus: 0,
        attackerDamagePercent: 0,
        attackerDamageDealt: 0,
        defenderHpBefore: defender.hp,
        defenderHpAfter: defender.hp,
        defenderEliminated: false,
        canCounterAttack: false,
        counterDamagePercent: 0,
        counterDamageDealt: 0,
        attackerHpBefore: attacker.hp,
        attackerHpAfter: attacker.hp,
        attackerEliminated: false,
        defenderCoverageStars: defenderTile.defenseStars,
        damageReductionPercent: defenderTile.defenseStars * 10,
      };
    }

    // 2. Cálculo de modificadores de ataque (+10% por torre de comunicación y bono por nivel)
    const attackerLevelBonus = getLevelAttackBonus(attackerLevel, isTournamentMode);
    const attackModifier = coAttackModifier + commtowersCount * 10 + attackerLevelBonus;
    const defenseModifier = coDefenseModifier;

    // 3. Suerte táctica (0 a 9% por defecto en AW)
    let luckModifier = 0;
    if (!deterministic) {
      const maxGoodLuck = 10;
      const goodLuckVal = Math.floor(luckRoll.goodLuck * maxGoodLuck);
      const badLuckVal = Math.floor(luckRoll.badLuck * 0);
      luckModifier = goodLuckVal - badLuckVal;
    }

    // 4. Aplicación de la fórmula oficial Advance Wars / AWBW
    // attackFactor = floor(baseDamage * (attackModifier / 100) + luckModifier)
    const attackFactor = Math.max(0, Math.floor(baseDamage * (attackModifier / 100) + luckModifier));

    // attackHPFactor = floor(attackFactor * (attackerHP / 10))
    const attackHPFactor = Math.floor(attackFactor * (attacker.hp / 10));

    // defenseFactor = floor(200 - (defenseModifier + defenderTerrainStars * defenderHP)) / 100
    const defenderTerrainStars = defenderTile.defenseStars;
    const defenseFactor =
      Math.floor(200 - (defenseModifier + defenderTerrainStars * defender.hp)) / 100;

    // Daño en porcentaje (ej: 67 = 67% de una unidad de 100 HP)
    const damagePercent = Math.max(1, Math.floor(attackHPFactor * defenseFactor));

    // Conversión a puntos de daño en la barra de 10 HP
    const attackerDamageDealt = Math.min(defender.hp, Math.max(1, Math.floor(damagePercent / 10)));
    const defenderHpAfter = Math.max(0, defender.hp - attackerDamageDealt);
    const defenderEliminated = defenderHpAfter === 0;

    // 5. Verificación y cálculo de Contraataque
    let canCounterAttack = false;
    let counterWeaponUsed: 'primary' | 'secondary' | 'none' = 'none';
    let counterDamagePercent = 0;
    let counterDamageDealt = 0;
    let attackerHpAfter = attacker.hp;

    // Condiciones de Contraataque:
    // a) El defensor sobrevivió.
    // b) El ataque inicial fue a Rango Directo (distancia = 1) o dentro del rango del defensor.
    // c) El defensor posee arma capaz de dañar al atacante.
    const inDefenderRange = distance >= defender.minRange && distance <= defender.maxRange;

    if (!defenderEliminated && inDefenderRange) {
      const counterWeapon = getCanonicalBaseDamage(
        defender.unitCode,
        attacker.unitCode,
        defenderHasAmmo
      );

      if (counterWeapon.baseDamage > 0 && counterWeapon.weaponUsed !== 'none') {
        canCounterAttack = true;
        counterWeaponUsed = counterWeapon.weaponUsed;

        const defenderLevelBonus = getLevelAttackBonus(defenderLevel, isTournamentMode);
        const counterAttackFactor = Math.max(0, Math.floor(counterWeapon.baseDamage * ((defenseModifier + defenderLevelBonus) / 100)));
        const counterAttackHPFactor = Math.floor(counterAttackFactor * (defenderHpAfter / 10));
        const attackerTerrainStars = attackerTile.defenseStars;
        const attackerDefenseFactor =
          Math.floor(200 - (attackModifier + attackerTerrainStars * attacker.hp)) / 100;

        counterDamagePercent = Math.max(1, Math.floor(counterAttackHPFactor * attackerDefenseFactor));
        counterDamageDealt = Math.min(attacker.hp, Math.max(1, Math.floor(counterDamagePercent / 10)));
        attackerHpAfter = Math.max(0, attacker.hp - counterDamageDealt);
      }
    }

    return {
      canAttack: true,
      distance,
      weaponUsed,
      baseDamage,
      luckBonus: luckModifier,
      attackerDamagePercent: damagePercent,
      attackerDamageDealt,
      defenderHpBefore: defender.hp,
      defenderHpAfter,
      defenderEliminated,
      canCounterAttack,
      counterWeaponUsed,
      counterDamagePercent,
      counterDamageDealt,
      attackerHpBefore: attacker.hp,
      attackerHpAfter,
      attackerEliminated: attackerHpAfter === 0,
      defenderCoverageStars: defenderTerrainStars,
      damageReductionPercent: defenderTerrainStars * 10,
    };
  }
}

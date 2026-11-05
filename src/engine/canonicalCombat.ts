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
import { getWeatherModifiers, WeatherType } from './weatherSystem';
import { CombatAuraModifierResult } from './buildingAuras';

export interface LuckRoll {
  goodLuck: number; // 0.0 a 1.0 (1.0 = suerte máxima)
  badLuck: number;  // 0.0 a 1.0 (normalmente 0, salvo COs inestables como Flak)
}


export interface CanonicalCombatOptions {
  attackerHasAmmo?: boolean;
  defenderHasAmmo?: boolean;
  commtowersCount?: number;
  coAttackModifier?: number;  // Multiplicador porcentual (base 100)
  coDefenseModifier?: number; // Multiplicador porcentual (base 100)
  attackerTierLevel?: number; // Nivel de manufactura industrial de tropa (1-5, +2% efectividad por nivel)
  defenderTierLevel?: number; // Nivel de manufactura industrial del defensor (1-5)
  weather?: WeatherType;      // Clima activo en la cuadrícula
  coId?: string;              // Comandante CO (para inmunidades climáticas)
  scale100Hp?: boolean;       // Forzar escala 1-100 HP (por defecto true)
  luckRoll?: LuckRoll;
  deterministic?: boolean;    // true para partidas de torneo / pruebas sin RNG
  buildingAuraModifiers?: CombatAuraModifierResult; // Modificadores dinámicos de auras de edificios
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
      attackerTierLevel = 1,
      defenderTierLevel = 1,
      weather,
      coId,
      scale100Hp = true,
      luckRoll = { goodLuck: 0, badLuck: 0 },
      deterministic = true,
    } = options;


    const distance = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
    const effectiveMaxRange = attacker.maxRange + (options.buildingAuraModifiers?.attackerMaxRangeBonus || 0);
    const inRange = distance >= attacker.minRange && distance <= effectiveMaxRange;

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

    // 2. Cálculo de modificadores de ataque (+10% por torre de comunicación, tier industrial y clima)
    const attackerTier = attacker.tier || attackerTierLevel || 1;
    const tierBonus = Math.max(0, (attackerTier - 1) * 2.0);
    const auraAttackBonus = options.buildingAuraModifiers?.attackerEffectiveAttackBonus || 0;
    
    let weatherAttackMultiplier = 1.0;
    if (weather) {
      const weatherMods = getWeatherModifiers(weather, coId);
      if (distance >= 2) {
        weatherAttackMultiplier = weatherMods.indirectDamageModifier;
      }
    }

    const attackModifier = (coAttackModifier + commtowersCount * 10 + tierBonus + auraAttackBonus) * weatherAttackMultiplier;
    const auraDefenseBonus = options.buildingAuraModifiers?.defenderEffectiveDefenseBonus || 0;
    const defenseModifier = coDefenseModifier + auraDefenseBonus;

    // 3. Suerte táctica (0 a 9% por defecto en AW)
    let luckModifier = 0;
    if (!deterministic) {
      const maxGoodLuck = 10;
      const goodLuckVal = Math.floor(luckRoll.goodLuck * maxGoodLuck);
      const badLuckVal = Math.floor(luckRoll.badLuck * 0);
      luckModifier = goodLuckVal - badLuckVal;
    }

    // 4. Aplicación de la fórmula oficial Advance Wars / AWBW normalizada para escala continua 1-100 HP
    const is100Scale = scale100Hp || attacker.hp > 10 || defender.hp > 10 || attacker.maxHp === 100 || defender.maxHp === 100;
    const attackerHPVal = is100Scale ? attacker.hp / 10 : attacker.hp;
    const defenderHPVal = is100Scale ? defender.hp / 10 : defender.hp;

    // attackFactor = floor(baseDamage * (attackModifier / 100) + luckModifier)
    const attackFactor = Math.max(0, Math.floor(baseDamage * (attackModifier / 100) + luckModifier));

    // attackHPFactor = floor(attackFactor * (attackerHP / 10))
    const attackHPFactor = Math.floor(attackFactor * (attackerHPVal / 10));

    // defenseFactor = floor(200 - (defenseModifier + defenderTerrainStars * defenderHP)) / 100
    let defenderTerrainStars = defenderTile.defenseStars + (options.buildingAuraModifiers?.defenderExtraStars || 0);
    if (options.buildingAuraModifiers?.attackerArmorPenetration) {
      const pen = options.buildingAuraModifiers.attackerArmorPenetration / 100;
      defenderTerrainStars = Math.max(0, defenderTerrainStars * (1 - pen));
    }
    const defenseFactor =
      Math.floor(200 - (defenseModifier + defenderTerrainStars * defenderHPVal)) / 100;

    // Daño en porcentaje (ej: 67 = 67% de una unidad de 100 HP)
    const damagePercent = Math.max(1, Math.floor(attackHPFactor * defenseFactor));

    // Conversión a puntos de daño respetando la escala continua (1 a 100 HP)
    const attackerDamageDealt = is100Scale
      ? Math.min(defender.hp, Math.max(1, damagePercent))
      : Math.min(defender.hp, Math.max(1, Math.floor(damagePercent / 10)));
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

        const defenderTier = defender.tier || defenderTierLevel || 1;
        const defenderTierBonus = Math.max(0, (defenderTier - 1) * 2.0);
        const counterAttackFactor = Math.max(0, Math.floor(counterWeapon.baseDamage * ((defenseModifier + defenderTierBonus) / 100)));
        const defenderHpAfterVal = is100Scale ? defenderHpAfter / 10 : defenderHpAfter;
        const counterAttackHPFactor = Math.floor(counterAttackFactor * (defenderHpAfterVal / 10));
        const attackerTerrainStars = attackerTile.defenseStars;
        const attackerDefenseFactor =
          Math.floor(200 - (attackModifier + attackerTerrainStars * attackerHPVal)) / 100;

        counterDamagePercent = Math.max(1, Math.floor(counterAttackHPFactor * attackerDefenseFactor));
        counterDamageDealt = is100Scale
          ? Math.min(attacker.hp, Math.max(1, counterDamagePercent))
          : Math.min(attacker.hp, Math.max(1, Math.floor(counterDamagePercent / 10)));
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

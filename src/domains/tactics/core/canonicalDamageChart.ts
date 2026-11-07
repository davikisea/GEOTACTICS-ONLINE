/**
 * TABLA CANÓNICA DE DAÑO BASE (ADVANCE WARS 2 / AWDS ESPECIFICACIÓN OFICIAL)
 * 
 * Define las matrices de daño primario (con consumo de munición pesada)
 * y secundario (ametralladora de munición infinita) para todas las unidades tácticas.
 * 
 * Extraído de la lógica canónica de WarsWorld y adaptado a las especificaciones de TacticalCommand.
 */

export interface WeaponDamageMap {
  [targetUnitCode: string]: number;
}

export interface UnitWeaponry {
  primary?: WeaponDamageMap;
  secondary?: WeaponDamageMap;
}

// ----------------------------------------------------------------------------
// ARSENAL POR UNIDAD TÁCTICA
// ----------------------------------------------------------------------------

const infantryWeaponry: UnitWeaponry = {
  secondary: {
    infantry: 55,
    mech: 45,
    recon: 12,
    tank_light: 5,
    tank_medium: 1,
    artillery: 15,
    rocket: 25,
    anti_air: 5,
    b_copter: 7,
    fighter: 0,
    bomber: 0,
    battleship: 0,
  },
};

const mechWeaponry: UnitWeaponry = {
  primary: {
    // Bazuca Pesado (Requiere munición)
    recon: 85,
    tank_light: 55,
    tank_medium: 15,
    artillery: 70,
    rocket: 85,
    anti_air: 65,
    battleship: 0,
  },
  secondary: {
    // Ametralladora (Munición infinita)
    infantry: 65,
    mech: 55,
    recon: 18,
    tank_light: 6,
    tank_medium: 1,
    artillery: 32,
    rocket: 35,
    anti_air: 6,
    b_copter: 9,
    fighter: 0,
    bomber: 0,
    battleship: 0,
  },
};

const reconWeaponry: UnitWeaponry = {
  secondary: {
    infantry: 70,
    mech: 65,
    recon: 35,
    tank_light: 6,
    tank_medium: 1,
    artillery: 45,
    rocket: 55,
    anti_air: 4,
    b_copter: 10,
    fighter: 0,
    bomber: 0,
    battleship: 0,
  },
};

const tankLightWeaponry: UnitWeaponry = {
  primary: {
    // Cañón de 75mm (Requiere munición)
    recon: 85,
    tank_light: 55,
    tank_medium: 15,
    artillery: 70,
    rocket: 85,
    anti_air: 65,
    battleship: 5,
  },
  secondary: {
    // Ametralladora coaxial
    infantry: 75,
    mech: 70,
    recon: 40,
    tank_light: 6,
    tank_medium: 1,
    artillery: 45,
    rocket: 55,
    anti_air: 5,
    b_copter: 10,
    fighter: 0,
    bomber: 0,
    battleship: 1,
  },
};

const tankMediumWeaponry: UnitWeaponry = {
  primary: {
    // Cañón Pesado de 120mm (Requiere munición)
    recon: 105,
    tank_light: 85,
    tank_medium: 55,
    artillery: 105,
    rocket: 105,
    anti_air: 105,
    battleship: 10,
  },
  secondary: {
    infantry: 105,
    mech: 95,
    recon: 45,
    tank_light: 8,
    tank_medium: 1,
    artillery: 45,
    rocket: 55,
    anti_air: 7,
    b_copter: 12,
    fighter: 0,
    bomber: 0,
    battleship: 1,
  },
};

const artilleryWeaponry: UnitWeaponry = {
  primary: {
    // Obuses de Asedio de 155mm (Requiere munición, Fuego Indirecto)
    infantry: 90,
    mech: 85,
    recon: 80,
    tank_light: 70,
    tank_medium: 45,
    artillery: 75,
    rocket: 80,
    anti_air: 75,
    b_copter: 0,
    fighter: 0,
    bomber: 0,
    battleship: 40,
  },
};

const rocketWeaponry: UnitWeaponry = {
  primary: {
    // Batería de Cohetes MLRS (Requiere munición, Fuego Indirecto Largo)
    infantry: 95,
    mech: 90,
    recon: 90,
    tank_light: 85,
    tank_medium: 55,
    artillery: 80,
    rocket: 85,
    anti_air: 85,
    b_copter: 0,
    fighter: 0,
    bomber: 0,
    battleship: 55,
  },
};

const antiAirWeaponry: UnitWeaponry = {
  primary: {
    // Cañones Vulcan Dobles (Requiere munición)
    infantry: 105,
    mech: 105,
    recon: 60,
    tank_light: 25,
    tank_medium: 10,
    artillery: 50,
    rocket: 55,
    anti_air: 45,
    b_copter: 105,
    fighter: 65,
    bomber: 75,
    battleship: 0,
  },
};

const bCopterWeaponry: UnitWeaponry = {
  primary: {
    // Misiles Aire-Tierra (Requiere munición)
    recon: 55,
    tank_light: 55,
    tank_medium: 25,
    artillery: 65,
    rocket: 65,
    anti_air: 25,
    b_copter: 0,
    fighter: 0,
    bomber: 0,
    battleship: 25,
  },
  secondary: {
    // Cañón Gatling rotatorio
    infantry: 75,
    mech: 75,
    recon: 30,
    tank_light: 6,
    tank_medium: 1,
    artillery: 25,
    rocket: 35,
    anti_air: 6,
    b_copter: 65,
    fighter: 0,
    bomber: 0,
    battleship: 0,
  },
};

const fighterWeaponry: UnitWeaponry = {
  primary: {
    // Misiles Aire-Aire (Exclusivo contra aeronaves)
    b_copter: 100,
    fighter: 100,
    bomber: 100,
  },
};

const bomberWeaponry: UnitWeaponry = {
  primary: {
    // Bombas Guiadas de Caída Libre (Exclusivo Aire-Tierra/Naval)
    infantry: 110,
    mech: 110,
    recon: 105,
    tank_light: 105,
    tank_medium: 95,
    artillery: 105,
    rocket: 105,
    anti_air: 95,
    b_copter: 0,
    fighter: 0,
    bomber: 0,
    battleship: 75,
  },
};

const battleshipWeaponry: UnitWeaponry = {
  primary: {
    // Baterías Navales Pesadas de 16 pulgadas (Fuego Indirecto Masivo)
    infantry: 95,
    mech: 90,
    recon: 90,
    tank_light: 85,
    tank_medium: 55,
    artillery: 85,
    rocket: 90,
    anti_air: 85,
    b_copter: 0,
    fighter: 0,
    bomber: 0,
    battleship: 50,
  },
};

const neotankWeaponry: UnitWeaponry = {
  primary: {
    // Neo-Cañón (Munición pesada de plasma/hiper-velocidad)
    infantry: 125,
    mech: 115,
    recon: 125,
    apc: 125,
    tank_light: 105,
    tank_medium: 75,
    neotank: 55,
    artillery: 115,
    rocket: 125,
    missiles: 125,
    anti_air: 115,
    battleship: 45,
  },
  secondary: {
    // Ametralladora coaxial
    infantry: 65,
    mech: 55,
    recon: 35,
    apc: 45,
    tank_light: 15,
    tank_medium: 5,
    neotank: 3,
    artillery: 45,
    rocket: 55,
    missiles: 55,
    anti_air: 20,
    b_copter: 22,
    t_copter: 35,
  },
};

const apcWeaponry: UnitWeaponry = {
  // Transporte Blindado (Desarmado)
};

const tCopterWeaponry: UnitWeaponry = {
  // Helicóptero de Transporte (Desarmado)
};

const missilesWeaponry: UnitWeaponry = {
  primary: {
    // Batería Antiaérea Pesada Superficie-Aire
    b_copter: 120,
    t_copter: 120,
    fighter: 100,
    bomber: 100,
  },
};

// ----------------------------------------------------------------------------
// CATÁLOGO CANÓNICO COMPLETO
// ----------------------------------------------------------------------------

export const CANONICAL_DAMAGE_CHART: Record<string, UnitWeaponry> = {
  infantry: infantryWeaponry,
  mech: mechWeaponry,
  recon: reconWeaponry,
  tank_light: tankLightWeaponry,
  tank_medium: tankMediumWeaponry,
  neotank: neotankWeaponry,
  apc: apcWeaponry,
  t_copter: tCopterWeaponry,
  missiles: missilesWeaponry,
  artillery: artilleryWeaponry,
  rocket: rocketWeaponry,
  anti_air: antiAirWeaponry,
  b_copter: bCopterWeaponry,
  fighter: fighterWeaponry,
  bomber: bomberWeaponry,
  battleship: battleshipWeaponry,
};

/**
 * Normaliza nombres alternativos de unidades al formato interno de TacticalCommand
 */
export function normalizeUnitCode(code: string): string {
  const c = code.toLowerCase().replace('-', '_');
  if (c === 'tank') return 'tank_light';
  if (c === 'mediumtank') return 'tank_medium';
  if (c === 'antiair') return 'anti_air';
  if (c === 'battlecopter' || c === 'copter') return 'b_copter';
  if (c === 'transport_copter' || c === 'transportcopter' || c === 'tcopter') return 't_copter';
  if (c === 'missile' || c === 'missile_launcher') return 'missiles';
  return c;
}

/**
 * Consulta el daño base según atacante, defensor y disponibilidad de munición
 */
export function getCanonicalBaseDamage(
  attackerCode: string,
  defenderCode: string,
  hasAmmo: boolean = true
): { baseDamage: number; weaponUsed: 'primary' | 'secondary' | 'none' } {
  const normAttacker = normalizeUnitCode(attackerCode);
  const normDefender = normalizeUnitCode(defenderCode);

  const weaponry = CANONICAL_DAMAGE_CHART[normAttacker];
  if (!weaponry) {
    return { baseDamage: 0, weaponUsed: 'none' };
  }

  const getDamageFromMap = (map?: WeaponDamageMap): number | undefined => {
    if (!map) return undefined;
    if (normDefender in map) return map[normDefender];
    if (normDefender === 'apc' && 'recon' in map) return map['recon'];
    if (normDefender === 't_copter' && 'b_copter' in map) return map['b_copter'];
    if (normDefender === 'missiles' && 'rocket' in map) return map['rocket'];
    if (normDefender === 'neotank' && 'tank_medium' in map) return Math.max(1, Math.round(map['tank_medium'] * 0.8));
    return undefined;
  };

  // 1. Intentar arma primaria si tiene munición
  if (hasAmmo && weaponry.primary) {
    const primaryDmg = getDamageFromMap(weaponry.primary);
    if (primaryDmg !== undefined) {
      return {
        baseDamage: primaryDmg,
        weaponUsed: 'primary',
      };
    }
  }

  // 2. Fallback a arma secundaria (ametralladora / munición infinita)
  if (weaponry.secondary) {
    const secondaryDmg = getDamageFromMap(weaponry.secondary);
    if (secondaryDmg !== undefined) {
      return {
        baseDamage: secondaryDmg,
        weaponUsed: 'secondary',
      };
    }
  }

  return { baseDamage: 0, weaponUsed: 'none' };
}

/**
 * Retorna true si la unidad es de disparo indirecto (artillería, cohetes, misiles, acorazado)
 */
export function isIndirectFireUnit(unitCode: string): boolean {
  const code = normalizeUnitCode(unitCode);
  return code === 'artillery' || code === 'rocket' || code === 'missile' || code === 'battleship' || code === 'piperunner';
}

/**
 * Determina si una unidad puede atacar directamente a otra unidad
 */
export function canDirectlyAttack(attackerCode: string, defenderCode: string): boolean {
  if (isIndirectFireUnit(attackerCode)) return false;
  const { baseDamage } = getCanonicalBaseDamage(attackerCode, defenderCode, true);
  return baseDamage > 0;
}

export const COMBAT_EFFECTIVENESS_MATRIX = CANONICAL_DAMAGE_CHART;


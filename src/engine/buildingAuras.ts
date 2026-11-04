/**
 * ==============================================================================
 * MOTOR DE AURAS TERRITORIALES DE EDIFICIOS & DESGASTE TÁCTICO
 * ==============================================================================
 * Convierte las propiedades capturadas en nodos estratégicos que proyectan:
 * - Buffs directos al bando controlador (Ataque, Cobertura, Blindaje, Visión, Alcance).
 * - Debuffs de fricción e interferencia al bando enemigo (Moral, Guerra Electrónica,
 *   Pérdida de Movimiento en asedio).
 */

import { TerrainTile, TacticalUnit, GridPosition } from '../types';

export interface BuildingAuraProfile {
  controllingPlayer: 'p1' | 'p2';
  // Cuartel General (HQ)
  hqCount: number;
  hqAttackBonusPercent: number;        // +10% Ataque por HQ
  enemyMoraleDebuffPercent: number;    // -5% Daño al enemigo por presencia de HQ

  // Torre de Comunicaciones (Commtower)
  commtowerCount: number;
  commtowerDamageBonusPercent: number; // +15% Daño balístico por torre
  visionBonusRange: number;            // +1 al rango de visión en niebla
  enemyEWInterferencePercent: number;  // -5% Evasión / Defensa al enemigo

  // Fábrica / Complejo Industrial (Factory)
  factoryCount: number;
  vehicleArmorBonusPercent: number;    // +10% Blindaje a unidades con tracción 'wheels' / 'treads'
  reinforcementTurnDelay: number;      // 3 turnos con fábricas activas, 4 por defecto

  // Ciudad / Centro Urbano (City)
  cityCount: number;
  cityCoverageBonusStars: number;      // +2 estrellas defensivas al defender en ciudad propia
  adjacentFrictionActive: boolean;     // Aplica -1 PM a tropas enemigas adyacentes

  // Laboratorio Tecnológico (Lab)
  labCount: number;
  armorPenetrationPercent: number;     // +10% Perforación de blindaje que ignora estrellas de terreno
  indirectRangeBonus: number;          // +1 al alcance máximo de unidades de artillería indirecta
}

export interface CombatAuraModifierResult {
  attackerEffectiveAttackBonus: number;   // Suma de bonos de ataque (HQ, Commtower, etc.)
  defenderEffectiveDefenseBonus: number;  // Suma de bonos de armadura/defensa (Factory, EW debuff)
  attackerArmorPenetration: number;       // Ignora porcentaje de cobertura enemiga
  defenderExtraStars: number;             // Estrellas extra si defiende en ciudad propia
  attackerMaxRangeBonus: number;          // Bono a unidades indirectas
  defenderCounterAttackPenalty: number;   // Reducción a la moral/daño de contraataque enemigo
}

/**
 * Escanea el tablero y calcula el perfil completo de auras de un jugador.
 */
export function calculateBuildingAuras(
  tiles: TerrainTile[][],
  player: 'p1' | 'p2'
): BuildingAuraProfile {
  let hqCount = 0;
  let commtowerCount = 0;
  let factoryCount = 0;
  let cityCount = 0;
  let labCount = 0;

  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y].length; x++) {
      const tile = tiles[y][x];
      if (tile.ownerId === player) {
        if (tile.type === 'hq') hqCount++;
        else if (tile.type === 'commtower') commtowerCount++;
        else if (tile.type === 'factory') factoryCount++;
        else if (tile.type === 'city') cityCount++;
        else if (tile.type === 'lab') labCount++;
      }
    }
  }

  return {
    controllingPlayer: player,
    hqCount,
    hqAttackBonusPercent: hqCount * 10,
    enemyMoraleDebuffPercent: hqCount * 5,

    commtowerCount,
    commtowerDamageBonusPercent: commtowerCount * 15,
    visionBonusRange: Math.min(2, commtowerCount),
    enemyEWInterferencePercent: commtowerCount * 5,

    factoryCount,
    vehicleArmorBonusPercent: factoryCount * 10,
    reinforcementTurnDelay: factoryCount > 0 ? 3 : 4,

    cityCount,
    cityCoverageBonusStars: 2,
    adjacentFrictionActive: cityCount > 0,

    labCount,
    armorPenetrationPercent: labCount * 10,
    indirectRangeBonus: labCount > 0 ? 1 : 0,
  };
}

/**
 * Calcula los modificadores de auras aplicables a un combate específico entre dos unidades.
 */
export function resolveCombatAuras(
  attackerAuras: BuildingAuraProfile,
  defenderAuras: BuildingAuraProfile,
  attacker: TacticalUnit,
  defender: TacticalUnit,
  attackerTile: TerrainTile,
  defenderTile: TerrainTile
): CombatAuraModifierResult {
  // 1. Bono de Ataque del Atacante:
  // HQ (+10% por HQ) + Commtower (+15% por torre) - Debuff de Moral del enemigo si el defensor tiene HQ
  const baseAttackBonus =
    attackerAuras.hqAttackBonusPercent +
    attackerAuras.commtowerDamageBonusPercent;
  const attackMoraleDebuff = defenderAuras.enemyMoraleDebuffPercent;
  const attackerEffectiveAttackBonus = Math.max(0, baseAttackBonus - attackMoraleDebuff);

  // 2. Bono de Defensa del Defensor:
  // Vehículos reciben +10% de blindaje por fábrica aliada
  const isVehicle = defender.movementType === 'wheels' || defender.movementType === 'treads';
  let defenderArmorBonus = isVehicle ? defenderAuras.vehicleArmorBonusPercent : 0;
  // Interferencia de Guerra Electrónica del atacante debilita la defensa
  defenderArmorBonus = Math.max(0, defenderArmorBonus - attackerAuras.enemyEWInterferencePercent);

  // 3. Cobertura extra de baluarte si el defensor está en una ciudad propia
  let defenderExtraStars = 0;
  if (defenderTile.type === 'city' && defenderTile.ownerId === defender.ownerId) {
    defenderExtraStars = defenderAuras.cityCoverageBonusStars;
  }

  // 4. Perforación de blindaje del laboratorio atacante
  const attackerArmorPenetration = attackerAuras.armorPenetrationPercent;

  // 5. Alcance extra para unidades indirectas (minRange > 1 o maxRange > 1)
  const isIndirect = attacker.minRange > 1 || attacker.maxRange > 1;
  const attackerMaxRangeBonus = isIndirect ? attackerAuras.indirectRangeBonus : 0;

  // 6. Penalización al contraataque enemigo
  const defenderCounterAttackPenalty = attackerAuras.enemyMoraleDebuffPercent;

  return {
    attackerEffectiveAttackBonus,
    defenderEffectiveDefenseBonus: defenderArmorBonus,
    attackerArmorPenetration,
    defenderExtraStars,
    attackerMaxRangeBonus,
    defenderCounterAttackPenalty,
  };
}

/**
 * Comprueba si una posición sufre fricción de asedio (-1 PM) por estar adyacente
 * a una ciudad hostil.
 */
export function getHostileCityFriction(
  tiles: TerrainTile[][],
  unitOwner: 'p1' | 'p2',
  pos: GridPosition
): number {
  const hostileOwner = unitOwner === 'p1' ? 'p2' : 'p1';
  const neighbors = [
    { x: pos.x + 1, y: pos.y },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x, y: pos.y - 1 },
  ];

  for (const n of neighbors) {
    if (n.y >= 0 && n.y < tiles.length && n.x >= 0 && n.x < tiles[0].length) {
      const tile = tiles[n.y][n.x];
      if (tile.type === 'city' && tile.ownerId === hostileOwner) {
        return 1; // 1 Punto de movimiento de fricción de asedio
      }
    }
  }

  return 0;
}

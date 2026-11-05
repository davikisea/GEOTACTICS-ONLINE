/**
 * REGLAS CANÓNICAS DE LOCOMOCIÓN Y CLIMA (ADVANCE WARS / WARSWORLD)
 * 
 * Gestiona los costes de movimiento por tipo de terreno y tracción,
 * junto con las penalizaciones meteorológicas (Despejado, Lluvia, Nieve).
 */

import { MovementType, TerrainType } from '../types';

export type WeatherType = 'clear' | 'rain' | 'snow' | 'sandstorm';


export interface TerrainProperties {
  defenseStars: number;
  movementCosts: Record<MovementType, number>;
  healsUnits: boolean;
  canCapture: boolean;
  generatesFunds: number;
}

/**
 * Costes base con clima despejado ('clear')
 * Infinity = Infranqueable
 */
export const CANONICAL_TERRAIN_PROPERTIES: Record<TerrainType, TerrainProperties> = {
  plains: {
    defenseStars: 1,
    movementCosts: { foot: 1, mech: 1, wheels: 2, treads: 1, air: 1, sea: Infinity },
    healsUnits: false,
    canCapture: false,
    generatesFunds: 0,
  },
  forest: {
    defenseStars: 2,
    movementCosts: { foot: 1, mech: 1, wheels: 3, treads: 2, air: 1, sea: Infinity },
    healsUnits: false,
    canCapture: false,
    generatesFunds: 0,
  },
  mountain: {
    defenseStars: 4,
    movementCosts: { foot: 2, mech: 1, wheels: Infinity, treads: Infinity, air: 1, sea: Infinity },
    healsUnits: false,
    canCapture: false,
    generatesFunds: 0,
  },
  road: {
    defenseStars: 0,
    movementCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
    healsUnits: false,
    canCapture: false,
    generatesFunds: 0,
  },
  river: {
    defenseStars: 0,
    movementCosts: { foot: 2, mech: 1, wheels: Infinity, treads: Infinity, air: 1, sea: Infinity },
    healsUnits: false,
    canCapture: false,
    generatesFunds: 0,
  },
  city: {
    defenseStars: 3,
    movementCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
    healsUnits: true,
    canCapture: true,
    generatesFunds: 1000,
  },
  factory: {
    defenseStars: 3,
    movementCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
    healsUnits: true,
    canCapture: true,
    generatesFunds: 1000,
  },
  airport: {
    defenseStars: 3,
    movementCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
    healsUnits: true,
    canCapture: true,
    generatesFunds: 1000,
  },
  port: {
    defenseStars: 3,
    movementCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: 1 },
    healsUnits: true,
    canCapture: true,
    generatesFunds: 1000,
  },
  hq: {
    defenseStars: 4,
    movementCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
    healsUnits: true,
    canCapture: true,
    generatesFunds: 1000,
  },
  sea: {
    defenseStars: 0,
    movementCosts: { foot: Infinity, mech: Infinity, wheels: Infinity, treads: Infinity, air: 1, sea: 1 },
    healsUnits: false,
    canCapture: false,
    generatesFunds: 0,
  },
  reef: {
    defenseStars: 2,
    movementCosts: { foot: Infinity, mech: Infinity, wheels: Infinity, treads: Infinity, air: 1, sea: 2 },
    healsUnits: false,
    canCapture: false,
    generatesFunds: 0,
  },
  shoal: {
    defenseStars: 0,
    movementCosts: { foot: 1, mech: 1, wheels: 2, treads: 1, air: 1, sea: 1 },
    healsUnits: false,
    canCapture: false,
    generatesFunds: 0,
  },
  bridge: {
    defenseStars: 0,
    movementCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
    healsUnits: false,
    canCapture: false,
    generatesFunds: 0,
  },
  commtower: {
    defenseStars: 3,
    movementCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
    healsUnits: false,
    canCapture: true,
    generatesFunds: 1000,
  },
  silo: {
    defenseStars: 3,
    movementCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
    healsUnits: false,
    canCapture: false,
    generatesFunds: 0,
  },
  lab: {
    defenseStars: 3,
    movementCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: Infinity },
    healsUnits: true,
    canCapture: true,
    generatesFunds: 1000,
  },
  pipe: {
    defenseStars: 0,
    movementCosts: { foot: Infinity, mech: Infinity, wheels: Infinity, treads: Infinity, air: Infinity, sea: Infinity },
    healsUnits: false,
    canCapture: false,
    generatesFunds: 0,
  },
};

/**
 * Calcula el coste de movimiento dinámico integrando las penalizaciones meteorológicas
 * canónicas de Advance Wars (AWBW spec).
 */
export function getCanonicalMovementCost(
  movementType: MovementType,
  terrainType: TerrainType,
  weather: WeatherType = 'clear'
): number {
  const baseProperties = CANONICAL_TERRAIN_PROPERTIES[terrainType];
  const clearCost = baseProperties?.movementCosts[movementType] ?? Infinity;

  // Un terreno infranqueable nunca se puede cruzar, sin importar el clima
  if (clearCost === Infinity) {
    return Infinity;
  }

  if (weather === 'clear') {
    return clearCost;
  }

  // 1. LLUVIA (Rain): Dificulta el barro para ruedas y cadenas en llanuras y bosques
  if (weather === 'rain') {
    if (['plains', 'forest'].includes(terrainType) && ['wheels', 'treads'].includes(movementType)) {
      return clearCost + 1;
    }
    return clearCost;
  }

  // 2. NIEVE (Snow): Congelamiento severo y visibilidad reducida
  if (weather === 'snow') {
    // Unidades aéreas sufren doble coste de combustible/viento
    if (movementType === 'air') {
      return clearCost * 2;
    }

    // Llanuras cubiertas de nieve densa (+1 coste a pie, ruedas y cadenas)
    if (terrainType === 'plains' && ['foot', 'wheels', 'treads'].includes(movementType)) {
      return clearCost + 1;
    }

    // Bosque nevado (+1 a pie)
    if (terrainType === 'forest' && movementType === 'foot') {
      return clearCost + 1;
    }

    // Montaña nevada (Coste doble para infantería y mecanizados)
    if (terrainType === 'mountain' && ['foot', 'mech'].includes(movementType)) {
      return clearCost * 2;
    }

    // Mares y puertos congelados (+1 para unidades navales)
    if (['sea', 'port'].includes(terrainType) && movementType === 'sea') {
      return clearCost + 1;
    }

    return clearCost;
  }

  return clearCost;
}

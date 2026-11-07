/**
 * ==============================================================================
 * TIPOS Y DEFINICIONES: TOPOLOGÍA VIAL, COMANDANTES WPLACE Y GUARNICIONES C4ISR
 * ==============================================================================
 * Especificación Canónica: docs/ANALISIS_PROJECT_ALICE_RUTAS_INGENIERIA_MAPA_METAPOLITICA.md
 * Doctrina: Guerra Moderna 2026 (Tiranía del Asfalto, Killzones de Drones y Asedio Logístico)
 * ==============================================================================
 */

export type RoadClass =
  | 'highway'
  | 'avenue'
  | 'rural_track'
  | 'bridge'
  | 'urban_artery'
  | 'industrial_collector';

export type RoadSurfaceQuality = 'paved_asphalt' | 'reinforced_concrete' | 'gravel' | 'dirt';

export type POIType =
  | 'refinery'
  | 'oil_terminal'
  | 'oil_field'
  | 'highway_junction'
  | 'bridge_checkpoint'
  | 'military_base';

export interface RoadNode {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  elevationMeters?: number;
  poiType?: POIType;
  resourceYield?: {
    heavyCrudeBpd?: number;
    lightCrudeBpd?: number;
    energyCreditsPerHour?: number;
  };
}

export interface RoadSegment {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  roadClass: RoadClass;
  lengthKm: number;
  surfaceQuality: RoadSurfaceQuality;
  throughputCapacity: number; // Capacidad máxima de flujo logístico (0 a 100%)
  currentThroughput: number;   // Throughput actual
  controllerClanId: string | null;
  isBlocked: boolean;
  blockedReason?: string;
  coordinates?: [number, number][]; // Polilínea completa de la vía
}

export interface CommanderFieldPosition {
  userId: string;
  callsign: string;
  clanId: string;
  currentRoadSegmentId: string;
  currentCoord: [number, number]; // [lng, lat]
  targetNodeId: string | null;
  pathRemainingNodeIds: string[];
  speedKmh: number;
  isMoving: boolean;
  supplyPercent: number; // 0 - 100%
  lastMovedAt: string;
}

export type TacticalMarkType = 'recon' | 'danger_mine' | 'claim' | 'rally_strike';

export interface TacticalMapMark {
  id: string;
  clanId: string;
  createdBy: string;
  markType: TacticalMarkType;
  location: [number, number]; // [lng, lat]
  label?: string;
  colorHex: string;
  createdAt: string;
  expiresAt: string;
}

export interface TacticalMarkEffectResult {
  damageInflicted: number;
  speedMultiplier: number;
  fowRevealed: boolean;
  moralBonusPercent: number;
}

export type GarrisonTierLevel = 1 | 2 | 3 | 4;

export type GarrisonDoctrineType =
  | 'standard_infantry'
  | 'anti_armor_ditch'
  | 'ew_jammer_bubble'
  | 'c_uas_air_defense'
  | 'artillery_firebase';

export interface GarrisonTierSpec {
  tier: GarrisonTierLevel;
  name: string;
  hpMax: number;
  initialCostEc: number;
  hourlyUpkeepEc: number;
  ewJammingRadiusKm: number;
  antiDroneCoverage: boolean;
  artilleryRangeKm: number;
  doctrine?: GarrisonDoctrineType;
}

export const GARRISON_TIER_SPECS: Record<GarrisonTierLevel, GarrisonTierSpec> = {
  1: {
    tier: 1,
    name: 'Puesto Ligero / Retén',
    hpMax: 1000,
    initialCostEc: 1500,
    hourlyUpkeepEc: 40,
    ewJammingRadiusKm: 0.5,
    antiDroneCoverage: false,
    artilleryRangeKm: 0,
  },
  2: {
    tier: 2,
    name: 'Puesto Avanzado Fortificado',
    hpMax: 2500,
    initialCostEc: 4000,
    hourlyUpkeepEc: 95,
    ewJammingRadiusKm: 1.5,
    antiDroneCoverage: true,
    artilleryRangeKm: 0,
  },
  3: {
    tier: 3,
    name: 'Fortín Integrado C4ISR (C-UAS + EW)',
    hpMax: 6000,
    initialCostEc: 9500,
    hourlyUpkeepEc: 220,
    ewJammingRadiusKm: 3.5,
    antiDroneCoverage: true,
    artilleryRangeKm: 2.0,
  },
  4: {
    tier: 4,
    name: 'Complejo de Búnker de Asedio Pesado',
    hpMax: 15000,
    initialCostEc: 24000,
    hourlyUpkeepEc: 550,
    ewJammingRadiusKm: 7.0,
    antiDroneCoverage: true,
    artilleryRangeKm: 8.5,
  },
};

export interface RoadGarrison {
  id: string;
  nodeId: string;
  roadSegmentId: string;
  clanId: string;
  tierLevel: GarrisonTierLevel;
  doctrine?: GarrisonDoctrineType;
  currentHp: number;
  maxHp: number;
  hourlyUpkeepEc: number;
  isUnderAttack: boolean;
  isIsolatedFromSupply: boolean;
  hoursWithoutSupply: number;
  lastUpkeepPaidAt: string;
  createdAt: string;
}

export interface RoadBattleEvent {
  battleId: string;
  roadSegmentId: string;
  nodeId: string;
  attackerClanId: string;
  defenderClanId: string;
  attackerHp: number;
  defenderHp: number;
  attackerReinforcingPlayers: string[]; // Max 2 jugadores activos en combate directo
  defenderReinforcingPlayers: string[]; // Max 2 jugadores activos en combate directo
  attackerReservePlayers?: string[];    // 3er y 4to comandante en reserva de apoyo
  defenderReservePlayers?: string[];    // 3er y 4to comandante en reserva de apoyo
  status: 'in_progress' | 'attacker_victory' | 'defender_victory';
  updatedAt: string;
}

export type C4ISRMapViewMode =
  | 'V1_SOVEREIGNTY'
  | 'V2_LOGISTICS'
  | 'V3_RESOURCES'
  | 'V4_THREATS';

// ============================================================================
// FEUDOS URBANOS Y EDIFICIOS INDUSTRIALES EN COORDENADAS (OPENPLACE / ALBION)
// ============================================================================

export interface ClanFief {
  id: string;
  cityName: string;
  sectorName: string;
  controllingClanId: string | null;
  centerLocation: [number, number]; // [lng, lat]
  taxRatePercent: number; // 0.0 - 25.0% arancel municipal
  defenseLevel: number;
  jurisdictionNodeIds: string[];
  createdAt: string;
}

export type FiefBuildingType =
  | 'refinery'
  | 'microchip_foundry'
  | 'weapons_factory'
  | 'logistics_silo'
  | 'radar_station'
  | 'seaport_terminal';

export interface FiefBuildingSpec {
  type: FiefBuildingType;
  name: string;
  initialCostEc: number;
  hourlyUpkeepEc: number;
  maxHp: number;
  spriteName: string; // Para renderizado de sprites en MapLibre GL
  allowedTerrainDistMeters: number; // Distancia máxima al asfalto (150m)
  description: string;
}

export const FIEF_BUILDING_SPECS: Record<FiefBuildingType, FiefBuildingSpec> = {
  refinery: {
    type: 'refinery',
    name: 'Refinería y Complejo Petroquímico',
    initialCostEc: 12000,
    hourlyUpkeepEc: 250,
    maxHp: 8000,
    spriteName: 'factory',
    allowedTerrainDistMeters: 150,
    description: 'Transforma crudo pesado y liviano en combustible sintético y polímeros.',
  },
  microchip_foundry: {
    type: 'microchip_foundry',
    name: 'Taller de Fundición de Microchips y Silicio',
    initialCostEc: 18000,
    hourlyUpkeepEc: 380,
    maxHp: 6500,
    spriteName: 'city',
    allowedTerrainDistMeters: 150,
    description: 'Refina tierras raras y silicio en circuitos integrados para drones y C4ISR.',
  },
  weapons_factory: {
    type: 'weapons_factory',
    name: 'Fábrica de Armamento y Chasis Militares',
    initialCostEc: 15000,
    hourlyUpkeepEc: 310,
    maxHp: 10000,
    spriteName: 'factory',
    allowedTerrainDistMeters: 150,
    description: 'Ensambla chasis acorazados, kits de búnker y sensores guiados FLIR.',
  },
  logistics_silo: {
    type: 'logistics_silo',
    name: 'Silo Logístico y Patio de Carga',
    initialCostEc: 6000,
    hourlyUpkeepEc: 110,
    maxHp: 5000,
    spriteName: 'silo',
    allowedTerrainDistMeters: 100,
    description: 'Almacena recursos refinados y protege los convoyes contra la carcoma logística.',
  },
  radar_station: {
    type: 'radar_station',
    name: 'Estación de Radar EW y Detección Térmica',
    initialCostEc: 9500,
    hourlyUpkeepEc: 190,
    maxHp: 4000,
    spriteName: 'radar',
    allowedTerrainDistMeters: 150,
    description: 'Otorga visión FLIR continua en un radio de 10 km e inhibe drones no autorizados.',
  },
  seaport_terminal: {
    type: 'seaport_terminal',
    name: 'Terminal Marítimo y Muelle de Exportación',
    initialCostEc: 20000,
    hourlyUpkeepEc: 450,
    maxHp: 12000,
    spriteName: 'seaport',
    allowedTerrainDistMeters: 200,
    description: 'Exporta crudo y productos manufacturados con bonificaciones arancelarias.',
  },
};

export interface FiefBuilding {
  id: string;
  fiefId: string;
  clanId: string;
  buildingType: FiefBuildingType;
  location: [number, number]; // [lng, lat]
  adjacentRoadSegmentId: string;
  level: number;
  currentHp: number;
  maxHp: number;
  hourlyUpkeepEc: number;
  activeRecipeId?: string;
  efficiencyModifier: number; // 0.0 - 1.5
  isOperating: boolean;
  isIsolatedFromSupply: boolean;
  lastHarvestAt: string;
  createdAt: string;
}


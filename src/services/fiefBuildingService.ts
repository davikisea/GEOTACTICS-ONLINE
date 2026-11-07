/**
 * ==============================================================================
 * SERVICIO DE FEUDOS URBANOS Y COLOCACIÓN DE EDIFICIOS (FIEF BUILDING SERVICE)
 * ==============================================================================
 * Especificación Canónica: docs/ARQUITECTURA_FEUDOS_CADENA_INDUSTRIAL_ALICE_ALBION.md
 * Doctrina: Economía Player-Driven (Albion Online) y Microgestión Territorial (OpenPlace)
 * ==============================================================================
 */

import {
  ClanFief,
  FiefBuilding,
  FiefBuildingType,
  FIEF_BUILDING_SPECS,
} from '../types/tacticalRoadTypes';
import { roadNetworkEngine } from '../engine/roadNetworkEngine';

export interface ClanTreasuryState {
  clanId: string;
  energyCredits: number;
}

export interface PlaceBuildingOrder {
  fiefId: string;
  clanId: string;
  buildingType: FiefBuildingType;
  location: [number, number]; // [lng, lat]
}

export class FiefBuildingService {
  private fiefs: Map<string, ClanFief> = new Map();
  private buildings: Map<string, FiefBuilding> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.seedCabimasFiefs();
  }

  /**
   * Inicializa los Feudos Urbanos y Estructuras Semilleras en Cabimas
   */
  public seedCabimasFiefs(): void {
    const cabimasFiefs: ClanFief[] = [
      {
        id: 'fief-cabimas-centro',
        cityName: 'Cabimas',
        sectorName: 'Distrito Central (Miraflores - Delicias)',
        controllingClanId: 'clan-ferro',
        centerLocation: [-71.448, 10.388],
        taxRatePercent: 8.0,
        defenseLevel: 2,
        jurisdictionNodeIds: [
          'node-cabimas-centro',
          'node-cabimas-miraflores',
          'node-cabimas-universidad',
          'node-cabimas-campo-blanco',
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'fief-cabimas-salina',
        cityName: 'Cabimas',
        sectorName: 'Distrito Portuario y Exportador La Salina',
        controllingClanId: 'clan-ferro',
        centerLocation: [-71.458, 10.395],
        taxRatePercent: 10.0,
        defenseLevel: 3,
        jurisdictionNodeIds: ['node-la-salina', 'node-cabimas-norte', 'node-cabimas-carretera-h'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'fief-cabimas-punta-gorda',
        cityName: 'Cabimas',
        sectorName: 'Complejo Petroquímico Punta Gorda',
        controllingClanId: 'clan-orinoco',
        centerLocation: [-71.432, 10.325],
        taxRatePercent: 7.5,
        defenseLevel: 2,
        jurisdictionNodeIds: ['node-punta-gorda', 'node-carretera-f'],
        createdAt: new Date().toISOString(),
      },
    ];

    for (const fief of cabimasFiefs) {
      this.fiefs.set(fief.id, fief);
    }

    // Edificios iniciales ubicados en coordenadas reales adyacentes a vías
    const initialBuildings: FiefBuilding[] = [
      {
        id: 'bld-salina-seaport',
        fiefId: 'fief-cabimas-salina',
        clanId: 'clan-ferro',
        buildingType: 'seaport_terminal',
        location: [-71.458, 10.395],
        adjacentRoadSegmentId: 'seg-intercomunal-ambrosio-salina',
        level: 3,
        currentHp: 12000,
        maxHp: 12000,
        hourlyUpkeepEc: 450,
        efficiencyModifier: 1.25,
        isOperating: true,
        isIsolatedFromSupply: false,
        lastHarvestAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'bld-punta-gorda-refinery',
        fiefId: 'fief-cabimas-punta-gorda',
        clanId: 'clan-orinoco',
        buildingType: 'refinery',
        location: [-71.432, 10.325],
        adjacentRoadSegmentId: 'seg-carretera-f-punta-gorda',
        level: 2,
        currentHp: 8000,
        maxHp: 8000,
        hourlyUpkeepEc: 250,
        activeRecipeId: 'synthetic_fuel',
        efficiencyModifier: 1.15,
        isOperating: true,
        isIsolatedFromSupply: false,
        lastHarvestAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'bld-universidad-microchips',
        fiefId: 'fief-cabimas-centro',
        clanId: 'clan-ferro',
        buildingType: 'microchip_foundry',
        location: [-71.435, 10.405],
        adjacentRoadSegmentId: 'seg-universidad-miraflores',
        level: 1,
        currentHp: 6500,
        maxHp: 6500,
        hourlyUpkeepEc: 380,
        activeRecipeId: 'refined_microchip',
        efficiencyModifier: 1.0,
        isOperating: true,
        isIsolatedFromSupply: false,
        lastHarvestAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'bld-carretera-h-silo',
        fiefId: 'fief-cabimas-salina',
        clanId: 'clan-ferro',
        buildingType: 'logistics_silo',
        location: [-71.446, 10.410],
        adjacentRoadSegmentId: 'seg-carretera-h-intercomunal',
        level: 2,
        currentHp: 5000,
        maxHp: 5000,
        hourlyUpkeepEc: 110,
        efficiencyModifier: 1.0,
        isOperating: true,
        isIsolatedFromSupply: false,
        lastHarvestAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'bld-campo-blanco-radar',
        fiefId: 'fief-cabimas-centro',
        clanId: 'clan-ferro',
        buildingType: 'radar_station',
        location: [-71.440, 10.380],
        adjacentRoadSegmentId: 'seg-campo-blanco-miraflores',
        level: 2,
        currentHp: 4000,
        maxHp: 4000,
        hourlyUpkeepEc: 190,
        efficiencyModifier: 1.2,
        isOperating: true,
        isIsolatedFromSupply: false,
        lastHarvestAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    for (const bld of initialBuildings) {
      this.buildings.set(bld.id, bld);
    }
  }

  public getFief(id: string): ClanFief | undefined {
    return this.fiefs.get(id);
  }

  public getAllFiefs(): ClanFief[] {
    return Array.from(this.fiefs.values());
  }

  public getBuilding(id: string): FiefBuilding | undefined {
    return this.buildings.get(id);
  }

  public getAllBuildings(): FiefBuilding[] {
    return Array.from(this.buildings.values());
  }

  public registerBuilding(building: FiefBuilding): void {
    this.buildings.set(building.id, building);
    this.notifyListeners();
  }

  public removeBuilding(id: string): void {
    this.buildings.delete(id);
    this.notifyListeners();
  }

  /**
   * Ordena y valida la colocación de un nuevo edificio industrial en coordenadas geodésicas.
   * Reglas Inviolables:
   * 1. Fondos suficientes en el tesoro del clan.
   * 2. Adyacencia a carretera transitable (<= 150 metros).
   */
  public placeBuilding(
    order: PlaceBuildingOrder,
    treasury: ClanTreasuryState
  ): { success: boolean; building?: FiefBuilding; reason?: string } {
    const spec = FIEF_BUILDING_SPECS[order.buildingType];
    if (!spec) {
      return { success: false, reason: 'Tipo de edificio no reconocido.' };
    }

    // 1. Verificación de fondos
    if (treasury.energyCredits < spec.initialCostEc) {
      return {
        success: false,
        reason: `Fondos insuficientes. Requerido: ${spec.initialCostEc} EC, Disponible: ${treasury.energyCredits} EC.`,
      };
    }

    // 2. Verificación de Adyacencia Vial (<= 150m)
    const adjacency = roadNetworkEngine.isLocationAdjacentToRoad(order.location, 0.15);
    if (!adjacency.isAdjacent) {
      return {
        success: false,
        reason: `Ubicación no viable. El edificio debe estar adyacente a una carretera transitada (Distancia actual: ${adjacency.distanceMeters} m, Máximo permitido: 150 m).`,
      };
    }

    // Deducir fondos
    treasury.energyCredits -= spec.initialCostEc;

    const buildingId = `bld-${order.buildingType}-${Date.now()}`;
    const newBuilding: FiefBuilding = {
      id: buildingId,
      fiefId: order.fiefId,
      clanId: order.clanId,
      buildingType: order.buildingType,
      location: order.location,
      adjacentRoadSegmentId: adjacency.nearestSegmentId || 'seg-unknown',
      level: 1,
      currentHp: spec.maxHp,
      maxHp: spec.maxHp,
      hourlyUpkeepEc: spec.hourlyUpkeepEc,
      efficiencyModifier: 1.0,
      isOperating: true,
      isIsolatedFromSupply: false,
      lastHarvestAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.buildings.set(buildingId, newBuilding);
    this.notifyListeners();
    return { success: true, building: newBuilding };
  }

  /**
   * Procesa el ciclo horario de mantenimiento y producción de edificios
   */
  public processHourlyBuildingTick(clanTreasuries: Map<string, ClanTreasuryState>): {
    totalUpkeepDeducted: number;
    operatingBuildingsCount: number;
    shutdownBuildings: string[];
  } {
    let totalUpkeepDeducted = 0;
    let operatingCount = 0;
    const shutdown: string[] = [];

    for (const building of this.buildings.values()) {
      const treasury = clanTreasuries.get(building.clanId);
      const roadSeg = roadNetworkEngine.getSegment(building.adjacentRoadSegmentId);

      // Si la carretera adyacente está físicamente bloqueada por combate o sabotaje
      if (roadSeg && roadSeg.isBlocked) {
        building.isIsolatedFromSupply = true;
        building.isOperating = false;
        shutdown.push(building.id);
        continue;
      }

      // Cobro de Upkeep
      if (treasury && treasury.energyCredits >= building.hourlyUpkeepEc) {
        treasury.energyCredits -= building.hourlyUpkeepEc;
        totalUpkeepDeducted += building.hourlyUpkeepEc;
        building.isOperating = true;
        building.isIsolatedFromSupply = false;
        operatingCount++;
      } else {
        // Falta de fondos: se apaga la producción
        building.isOperating = false;
        shutdown.push(building.id);
      }
    }

    return {
      totalUpkeepDeducted,
      operatingBuildingsCount: operatingCount,
      shutdownBuildings: shutdown,
    };
  }

  /**
   * Genera el GeoJSON de edificios industriales para renderizado en MapLibre GL
   */
  public toGeoJSON(): {
    type: 'FeatureCollection';
    features: any[];
  } {
    const features: any[] = [];

    for (const bld of this.buildings.values()) {
      const spec = FIEF_BUILDING_SPECS[bld.buildingType];
      features.push({
        type: 'Feature',
        id: bld.id,
        geometry: {
          type: 'Point',
          coordinates: bld.location,
        },
        properties: {
          id: bld.id,
          name: spec ? spec.name : bld.buildingType,
          buildingType: bld.buildingType,
          clanId: bld.clanId,
          level: bld.level,
          currentHp: bld.currentHp,
          maxHp: bld.maxHp,
          isOperating: bld.isOperating,
          isIsolatedFromSupply: bld.isIsolatedFromSupply,
          spriteName: spec ? spec.spriteName : 'factory',
          activeRecipeId: bld.activeRecipeId || null,
        },
      });
    }

    return { type: 'FeatureCollection', features };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[FiefBuildingService] Error en suscriptor:', err);
      }
    });
  }
}

export const fiefBuildingService = new FiefBuildingService();

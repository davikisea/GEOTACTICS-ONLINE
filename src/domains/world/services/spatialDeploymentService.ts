/**
 * ==============================================================================
 * SERVICIO DE ASIGNACIÓN ESPACIAL O(1), DESPLIEGUE Y CONSTRUCCIÓN C4ISR (SPRINT 3)
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3.3
 * Convierte cualquier coordenada WGS84 en una celda táctica fija O(1)
 * y permite desplegar unidades y construir edificios in-situ a Zoom x15,
 * sincronizando en tiempo real con Supabase CDC y fallback seguro en memoria.
 * ==============================================================================
 */

import {
  ZOOM_TACTICO,
  lngLatToGridCoords,
  gridCoordsToLngLat,
  LngLat,
} from '@domains/world';
import {
  operationalUnitsService,
  DeployedOperationalUnit,
} from '@domains/tactics';
import {
  fiefBuildingService,
} from '@domains/economy';
import type { FiefBuilding, FiefBuildingType } from '@domains/economy';
import { supabase, isSupabaseConfigured } from '@shared';

export type MicroTerrainType =
  | 'urban_asphalt'
  | 'industrial_compound'
  | 'coastal_basin'
  | 'open_plains'
  | 'defensive_ridge';

export interface SpatialCellAssignment {
  sector: [number, number];
  cell: [number, number];
  centerLngLat: LngLat;
  formattedCoordinate: string; // ej: "SEC-10294:15424 / CELL-[5,13]"
  terrainType: MicroTerrainType;
  terrainName: string;
  defenseCoverPercent: number;  // 10% - 40%
  movementCost: number;         // 1 - 2
  deployedUnit?: DeployedOperationalUnit;
  deployedBuilding?: FiefBuilding;
  isDeployable: boolean;
  isConstructible: boolean;
}

export interface DeployUnitInput {
  sector: [number, number];
  cell: [number, number];
  lngLat: LngLat;
  unitCode: string;
  unitName: string;
  clanId: string;
  clanTag: string;
  factionId: string;
  callsign: string;
  tier?: number;
}

export interface ConstructBuildingInput {
  sector: [number, number];
  cell: [number, number];
  lngLat: LngLat;
  buildingType: FiefBuildingType;
  clanId: string;
  fiefId?: string;
  treasury?: { clanId: string; energyCredits: number };
}

type SpatialChangeListener = () => void;

class SpatialDeploymentService {
  private listeners: Set<SpatialChangeListener> = new Set();
  private occupiedCells: Map<string, { unitId?: string; buildingId?: string }> = new Map();
  private activeRegionId: string = 'REG_VE_02';
  private realtimeChannel: any = null;
  private isHydrated: boolean = false;

  constructor() {
    // Inicialización no bloqueante de canal Realtime
    this.initRealtimeSubscription(this.activeRegionId).catch((err) => {
      console.warn('[SpatialDeploymentService] Fallo inicializando Realtime (degradado a memoria):', err);
    });
  }

  /**
   * Genera la clave espacial canónica O(1) de una celda.
   */
  public calculateSpatialCellId(sector: [number, number], cell: [number, number]): string {
    return `${sector[0]}_${sector[1]}_${cell[0]}_${cell[1]}`;
  }

  /**
   * Inicializa la suscripción a canales de Postgres Changes para la región operacional.
   */
  public async initRealtimeSubscription(regionId: string = 'REG_VE_02'): Promise<void> {
    this.activeRegionId = regionId;

    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      // 1. Carga inicial selectiva por región (Hidratación delta O(1))
      await this.hydrateFromDatabase(regionId);

      // 2. Desuscribir canal previo si existía
      this.unsubscribeRealtime();

      // 3. Suscribir canal específico del teatro de operaciones
      const channelName = `theatre:${regionId}`;
      this.realtimeChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tactical_spatial_deployments',
            filter: `region_id=eq.${regionId}`,
          },
          (payload: any) => this.handleDeploymentRealtimeChange(payload)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tactical_fief_constructions',
            filter: `region_id=eq.${regionId}`,
          },
          (payload: any) => this.handleConstructionRealtimeChange(payload)
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.info(`[SpatialDeploymentService] Canal Realtime conectado: ${channelName}`);
          }
        });
    } catch (e) {
      console.warn('[SpatialDeploymentService] Error configurando suscripción Realtime:', e);
    }
  }

  /**
   * Cierra el canal Realtime activo.
   */
  public unsubscribeRealtime(): void {
    if (this.realtimeChannel && supabase) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch (err) {
        console.warn('[SpatialDeploymentService] Error al desuscribir canal:', err);
      }
      this.realtimeChannel = null;
    }
  }

  /**
   * Hidrata las unidades y edificios desplegados desde la base de datos Supabase.
   */
  private async hydrateFromDatabase(regionId: string): Promise<void> {
    if (!supabase) return;

    try {
      // Despliegues militares
      const { data: deployments, error: depError } = await (supabase as any)
        .from('tactical_spatial_deployments')
        .select('*')
        .eq('region_id', regionId);

      if (!depError && Array.isArray(deployments)) {
        deployments.forEach((row: any) => {
          const unit: DeployedOperationalUnit = {
            id: row.id,
            name: row.unit_name,
            code: row.unit_code,
            clanId: row.clan_id,
            clanTag: row.clan_tag,
            factionId: row.faction_id,
            coordinates: [Number(row.lng), Number(row.lat)],
            hp: row.hp,
            maxHp: row.max_hp,
            tier: row.tier,
            status: row.status,
            callsign: row.callsign,
            colorHex: row.color_hex,
          };
          operationalUnitsService.deployUnit(unit);
          this.occupiedCells.set(row.cell_key, {
            ...this.occupiedCells.get(row.cell_key),
            unitId: row.id,
          });
        });
      }

      // Estructuras de feudos
      const { data: constructions, error: constError } = await (supabase as any)
        .from('tactical_fief_constructions')
        .select('*')
        .eq('region_id', regionId);

      if (!constError && Array.isArray(constructions)) {
        constructions.forEach((row: any) => {
          const building: FiefBuilding = {
            id: row.id,
            fiefId: row.fief_id,
            clanId: row.clan_id,
            buildingType: row.building_type,
            location: [Number(row.lng), Number(row.lat)],
            adjacentRoadSegmentId: row.adjacent_road_segment_id || 'seg-salina-main',
            level: row.level,
            currentHp: row.current_hp,
            maxHp: row.max_hp,
            hourlyUpkeepEc: row.hourly_upkeep_ec,
            efficiencyModifier: 1.0,
            isOperating: true,
            isIsolatedFromSupply: false,
            lastHarvestAt: row.last_harvest_at || row.created_at || new Date().toISOString(),
            createdAt: row.created_at,
          };
          fiefBuildingService.registerBuilding(building);
          this.occupiedCells.set(row.cell_key, {
            ...this.occupiedCells.get(row.cell_key),
            buildingId: row.id,
          });
        });
      }

      this.isHydrated = true;
      this.notifyListeners();
    } catch (hydrateErr) {
      console.warn('[SpatialDeploymentService] Error hidratando estado de región:', hydrateErr);
    }
  }

  /**
   * Manejador CDC Realtime para cambios en unidades tácticas.
   */
  private handleDeploymentRealtimeChange(payload: any) {
    const { eventType, new: newRec, old: oldRec } = payload;

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (!newRec) return;
      const unit: DeployedOperationalUnit = {
        id: newRec.id,
        name: newRec.unit_name,
        code: newRec.unit_code,
        clanId: newRec.clan_id,
        clanTag: newRec.clan_tag,
        factionId: newRec.faction_id,
        coordinates: [Number(newRec.lng), Number(newRec.lat)],
        hp: newRec.hp,
        maxHp: newRec.max_hp,
        tier: newRec.tier,
        status: newRec.status,
        callsign: newRec.callsign,
        colorHex: newRec.color_hex,
      };
      operationalUnitsService.deployUnit(unit);
      if (newRec.cell_key) {
        this.occupiedCells.set(newRec.cell_key, {
          ...this.occupiedCells.get(newRec.cell_key),
          unitId: unit.id,
        });
      }
      this.notifyListeners();
    } else if (eventType === 'DELETE') {
      if (!oldRec) return;
      if (oldRec.id) operationalUnitsService.removeUnit(oldRec.id);
      if (oldRec.cell_key) {
        const cellData = this.occupiedCells.get(oldRec.cell_key);
        if (cellData) {
          delete cellData.unitId;
          if (!cellData.buildingId) this.occupiedCells.delete(oldRec.cell_key);
        }
      }
      this.notifyListeners();
    }
  }

  /**
   * Manejador CDC Realtime para cambios en construcciones in-situ.
   */
  private handleConstructionRealtimeChange(payload: any) {
    const { eventType, new: newRec, old: oldRec } = payload;

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (!newRec) return;
      const building: FiefBuilding = {
        id: newRec.id,
        fiefId: newRec.fief_id,
        clanId: newRec.clan_id,
        buildingType: newRec.building_type,
        location: [Number(newRec.lng), Number(newRec.lat)],
        adjacentRoadSegmentId: newRec.adjacent_road_segment_id || 'seg-salina-main',
        level: newRec.level,
        currentHp: newRec.current_hp,
        maxHp: newRec.max_hp,
        hourlyUpkeepEc: newRec.hourly_upkeep_ec,
        efficiencyModifier: 1.0,
        isOperating: true,
        isIsolatedFromSupply: false,
        lastHarvestAt: newRec.last_harvest_at || new Date().toISOString(),
        createdAt: newRec.created_at,
      };
      fiefBuildingService.registerBuilding(building);
      if (newRec.cell_key) {
        this.occupiedCells.set(newRec.cell_key, {
          ...this.occupiedCells.get(newRec.cell_key),
          buildingId: building.id,
        });
      }
      this.notifyListeners();
    } else if (eventType === 'DELETE') {
      if (!oldRec) return;
      if (oldRec.id) fiefBuildingService.removeBuilding(oldRec.id);
      if (oldRec.cell_key) {
        const cellData = this.occupiedCells.get(oldRec.cell_key);
        if (cellData) {
          delete cellData.buildingId;
          if (!cellData.unitId) this.occupiedCells.delete(oldRec.cell_key);
        }
      }
      this.notifyListeners();
    }
  }

  /**
   * Obtiene la asignación espacial analítica O(1) de cualquier punto en el mapa.
   */
  public getSpatialAssignment(
    lngLat: LngLat,
    gridSize: number = 20,
    zoom: number = ZOOM_TACTICO
  ): SpatialCellAssignment {
    const { sector, cell } = lngLatToGridCoords(lngLat, gridSize, zoom);
    const centerLngLat = gridCoordsToLngLat(sector, cell, gridSize, zoom);
    const cellKey = this.calculateSpatialCellId(sector, cell);

    // Buscar si hay unidad desplegada en las proximidades de esta coordenada
    const allUnits = operationalUnitsService.getAllUnits();
    const deployedUnit = allUnits.find((u) => {
      const uCoords = lngLatToGridCoords(u.coordinates, gridSize, zoom);
      return (
        uCoords.sector[0] === sector[0] &&
        uCoords.sector[1] === sector[1] &&
        uCoords.cell[0] === cell[0] &&
        uCoords.cell[1] === cell[1]
      );
    });

    // Buscar si hay edificio desplegado en esta coordenada
    const allBuildings = fiefBuildingService.getAllBuildings();
    const deployedBuilding = allBuildings.find((b) => {
      const bCoords = lngLatToGridCoords(b.location, gridSize, zoom);
      return (
        bCoords.sector[0] === sector[0] &&
        bCoords.sector[1] === sector[1] &&
        bCoords.cell[0] === cell[0] &&
        bCoords.cell[1] === cell[1]
      );
    });

    // Clasificación determinista de terreno según hash espacial
    const terrainSeed = Math.abs(
      Math.sin(sector[0] * 374761393 + sector[1] * 668265263 + cell[0] * 127 + cell[1])
    );

    let terrainType: MicroTerrainType = 'open_plains';
    let terrainName = 'Llanura Abierta / Terreno Firme';
    let defenseCoverPercent = 10;
    let movementCost = 1;

    if (deployedBuilding) {
      terrainType = 'industrial_compound';
      terrainName = `Zona de Estructura: ${deployedBuilding.buildingType}`;
      defenseCoverPercent = 35;
      movementCost = 1;
    } else if (terrainSeed > 0.75) {
      terrainType = 'urban_asphalt';
      terrainName = 'Corredor de Asfalto Urbano';
      defenseCoverPercent = 15;
      movementCost = 1;
    } else if (terrainSeed > 0.55) {
      terrainType = 'defensive_ridge';
      terrainName = 'Cresta Defensiva y Borde Fortificado';
      defenseCoverPercent = 40;
      movementCost = 2;
    } else if (terrainSeed > 0.35) {
      terrainType = 'industrial_compound';
      terrainName = 'Sector de Acopio e Instalaciones';
      defenseCoverPercent = 25;
      movementCost = 1;
    }

    const isDeployable = !deployedUnit;
    const isConstructible = !deployedBuilding && !deployedUnit;

    return {
      sector,
      cell,
      centerLngLat,
      formattedCoordinate: `SEC [${sector.join(',')}] • CELL [${cell.join(',')}]`,
      terrainType,
      terrainName,
      defenseCoverPercent,
      movementCost,
      deployedUnit,
      deployedBuilding,
      isDeployable,
      isConstructible,
    };
  }

  /**
   * Despliega una unidad militar en una coordenada espacial concreta.
   */
  public deployUnitAt(input: DeployUnitInput): {
    success: boolean;
    unit?: DeployedOperationalUnit;
    reason?: string;
  } {
    const assignment = this.getSpatialAssignment(input.lngLat);
    if (!assignment.isDeployable) {
      return {
        success: false,
        reason: 'CELDA OCUPADA: Ya existe una unidad militar posicionada en estas coordenadas.',
      };
    }

    const newUnit: DeployedOperationalUnit = {
      id: `unit-dep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: input.unitName,
      code: input.unitCode,
      clanId: input.clanId,
      clanTag: input.clanTag,
      factionId: input.factionId,
      coordinates: input.lngLat,
      hp: 100,
      maxHp: 100,
      tier: input.tier || 1,
      status: 'holding',
      callsign: input.callsign,
      colorHex:
        input.factionId === 'orange_star'
          ? '#E65100'
          : input.factionId === 'blue_moon'
          ? '#1D4ED8'
          : input.factionId === 'green_earth'
          ? '#15803D'
          : input.factionId === 'yellow_comet'
          ? '#D97706'
          : '#991B1B',
    };

    operationalUnitsService.deployUnit(newUnit);

    const cellKey = this.calculateSpatialCellId(input.sector, input.cell);
    this.occupiedCells.set(cellKey, {
      ...this.occupiedCells.get(cellKey),
      unitId: newUnit.id,
    });

    // Persistencia asíncrona no bloqueante en Supabase
    if (isSupabaseConfigured() && supabase) {
      (supabase as any)
        .from('tactical_spatial_deployments')
        .upsert({
          id: newUnit.id,
          region_id: this.activeRegionId,
          cell_key: cellKey,
          sector_x: input.sector[0],
          sector_y: input.sector[1],
          cell_x: input.cell[0],
          cell_y: input.cell[1],
          lat: input.lngLat[1],
          lng: input.lngLat[0],
          unit_code: input.unitCode,
          unit_name: input.unitName,
          clan_id: input.clanId,
          clan_tag: input.clanTag,
          faction_id: input.factionId,
          callsign: input.callsign,
          tier: input.tier || 1,
          hp: newUnit.hp,
          max_hp: newUnit.maxHp,
          status: newUnit.status,
          color_hex: newUnit.colorHex,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }: any) => {
          if (error) console.warn('[SpatialDeploymentService] Error persistiendo unidad en Supabase:', error.message);
        })
        .catch((err: any) => console.warn('[SpatialDeploymentService] Error de red Supabase:', err));
    }

    this.notifyListeners();
    return { success: true, unit: newUnit };
  }

  /**
   * Alias de compatibilidad para contratos del HUD y Playwright.
   */
  public deployTacticalUnit(input: DeployUnitInput) {
    return this.deployUnitAt(input);
  }

  /**
   * Construye una estructura industrial / búnker in-situ en las coordenadas indicadas.
   */
  public constructBuildingAt(input: ConstructBuildingInput): {
    success: boolean;
    building?: FiefBuilding;
    reason?: string;
  } {
    const assignment = this.getSpatialAssignment(input.lngLat);
    if (!assignment.isConstructible) {
      return {
        success: false,
        reason: 'ESPACIO NO DISPONIBLE: No se puede construir sobre una estructura o unidad preexistente.',
      };
    }

    const defaultTreasury = input.treasury || {
      clanId: input.clanId,
      energyCredits: 50000,
    };

    const orderRes = fiefBuildingService.placeBuilding(
      {
        fiefId: input.fiefId || 'fief-cabimas-centro',
        clanId: input.clanId,
        buildingType: input.buildingType,
        location: input.lngLat,
      },
      defaultTreasury
    );

    if (!orderRes.success || !orderRes.building) {
      return {
        success: false,
        reason: orderRes.reason || 'Fallo al autorizar la orden de construcción.',
      };
    }

    const cellKey = this.calculateSpatialCellId(input.sector, input.cell);
    this.occupiedCells.set(cellKey, {
      ...this.occupiedCells.get(cellKey),
      buildingId: orderRes.building.id,
    });

    // Persistencia asíncrona no bloqueante en Supabase
    if (isSupabaseConfigured() && supabase) {
      (supabase as any)
        .from('tactical_fief_constructions')
        .upsert({
          id: orderRes.building.id,
          fief_id: orderRes.building.fiefId,
          region_id: this.activeRegionId,
          cell_key: cellKey,
          sector_x: input.sector[0],
          sector_y: input.sector[1],
          cell_x: input.cell[0],
          cell_y: input.cell[1],
          lat: input.lngLat[1],
          lng: input.lngLat[0],
          building_type: orderRes.building.buildingType,
          clan_id: orderRes.building.clanId,
          adjacent_road_segment_id: orderRes.building.adjacentRoadSegmentId,
          level: orderRes.building.level,
          current_hp: orderRes.building.currentHp,
          max_hp: orderRes.building.maxHp,
          hourly_upkeep_ec: orderRes.building.hourlyUpkeepEc,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }: any) => {
          if (error) console.warn('[SpatialDeploymentService] Error persistiendo edificio en Supabase:', error.message);
        })
        .catch((err: any) => console.warn('[SpatialDeploymentService] Error de red Supabase:', err));
    }

    this.notifyListeners();
    return { success: true, building: orderRes.building };
  }

  /**
   * Alias de compatibilidad para contratos del HUD y Playwright.
   */
  public constructTacticalBuilding(input: ConstructBuildingInput) {
    return this.constructBuildingAt(input);
  }

  public subscribe(listener: SpatialChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('[SpatialDeploymentService] Error en suscriptor:', e);
      }
    });
  }
}

export const spatialDeploymentService = new SpatialDeploymentService();

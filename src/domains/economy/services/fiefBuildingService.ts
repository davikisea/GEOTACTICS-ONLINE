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
  TacticalMapMark,
  TacticalMarkEffectResult,
} from '@domains/world';
import { roadNetworkEngine } from '@domains/world';

/**
 * Calcula la distancia geodésica en kilómetros entre dos coordenadas [lng, lat].
 */
export function calculateGeodesicDistanceKm(coord1: [number, number], coord2: [number, number]): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const midLatRad = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const dx = (lng1 - lng2) * 111.32 * Math.cos(midLatRad);
  const dy = (lat1 - lat2) * 110.57;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 1. EFECTOS FUNCIONALES REALES DE MARCAS WPLACE
 * Aplica los efectos tácticos de marcas WPlace sobre unidades/convoyes:
 * - danger_mine: Inflige 400 HP de daño a convoyes/unidades hostiles en radio de 200m (0.2km).
 * - rally_strike: Confiere +10% de ataque a tropas del clan en radio de 500m (0.5km).
 * - recon: Disipa la niebla de guerra en un radio de 5 celdas espaciales (revelación de zona).
 */
export function applyTacticalMarkEffects(
  unitCoords: [number, number],
  marks: TacticalMapMark[],
  unitClanIdOrOptions?: string | { unitClanId?: string; isHostile?: boolean },
  explicitIsHostile?: boolean
): TacticalMarkEffectResult {
  let unitClanId: string | undefined;
  let isHostile: boolean | undefined = explicitIsHostile;

  if (typeof unitClanIdOrOptions === 'object' && unitClanIdOrOptions !== null) {
    unitClanId = unitClanIdOrOptions.unitClanId;
    if (unitClanIdOrOptions.isHostile !== undefined) {
      isHostile = unitClanIdOrOptions.isHostile;
    }
  } else if (typeof unitClanIdOrOptions === 'string') {
    unitClanId = unitClanIdOrOptions;
  }

  let damageInflicted = 0;
  let attackBonusPercent = 0;
  let moralBonusPercent = 0;
  let fowRevealed = false;
  let revealedRadiusCells = 0;
  const triggeredMarks: TacticalMapMark[] = [];

  for (const mark of marks) {
    const distKm = calculateGeodesicDistanceKm(unitCoords, mark.location);

    // Determinar si la unidad es hostil o aliada respecto a la marca
    const isClanMatch = unitClanId ? mark.clanId === unitClanId : false;
    const isTargetHostile = isHostile !== undefined
      ? isHostile
      : unitClanId
        ? !isClanMatch
        : true; // Por defecto hostil ante minas si no se especifica clan

    const isTargetAllied = isHostile !== undefined
      ? !isHostile
      : unitClanId
        ? isClanMatch
        : true; // Por defecto tropas aliadas para buffs de clan

    switch (mark.markType) {
      case 'danger_mine': {
        // Radio de 200m (0.2km)
        if (distKm <= 0.2001 && isTargetHostile) {
          damageInflicted += 400;
          triggeredMarks.push(mark);
        }
        break;
      }
      case 'rally_strike': {
        // Radio de 500m (0.5km)
        if (distKm <= 0.5001 && isTargetAllied) {
          attackBonusPercent += 10;
          moralBonusPercent += 10;
          triggeredMarks.push(mark);
        }
        break;
      }
      case 'recon': {
        // Disipa niebla de guerra en radio de 5 celdas espaciales (~0.5km o adyacencia de zona)
        if (distKm <= 0.5001) {
          fowRevealed = true;
          revealedRadiusCells = Math.max(revealedRadiusCells, 5);
          triggeredMarks.push(mark);
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    damageInflicted,
    speedMultiplier: 1.0,
    fowRevealed,
    moralBonusPercent,
    attackBonusPercent,
    revealedRadiusCells: fowRevealed ? revealedRadiusCells : 0,
    triggeredMarks,
  };
}

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

  /**
   * Configura el arancel aduanero del feudo (0% a 25%).
   * Solo el clan controlador puede emitir o modificar la tasa arancelaria.
   */
  public setFiefTariff(
    fiefId: string,
    clanId: string,
    taxRatePercent: number
  ): { success: boolean; updatedTaxRate?: number; reason?: string } {
    const fief = this.fiefs.get(fiefId);
    if (!fief) {
      return { success: false, reason: 'Feudo no encontrado.' };
    }
    if (fief.controllingClanId !== clanId) {
      return {
        success: false,
        reason: 'Acción denegada: Solo el clan controlador puede configurar el arancel aduanero.',
      };
    }
    if (taxRatePercent < 0 || taxRatePercent > 25) {
      return {
        success: false,
        reason: 'Arancel inválido: La tasa debe configurarse entre 0% y 25%.',
      };
    }

    fief.taxRatePercent = taxRatePercent;
    this.notifyListeners();
    return { success: true, updatedTaxRate: taxRatePercent };
  }

  /**
   * Declara un embargo comercial contra un clan hostil.
   * Impide que convoyes de dicho clan descarguen en terminales y muelles del feudo.
   */
  public declareCommercialEmbargo(
    fiefId: string,
    clanId: string,
    targetClanId: string
  ): { success: boolean; embargoedClanIds?: string[]; reason?: string } {
    const fief = this.fiefs.get(fiefId);
    if (!fief) {
      return { success: false, reason: 'Feudo no encontrado.' };
    }
    if (fief.controllingClanId !== clanId) {
      return {
        success: false,
        reason: 'Acción denegada: Solo el clan controlador puede declarar embargos comerciales.',
      };
    }
    if (clanId === targetClanId) {
      return {
        success: false,
        reason: 'Acción inválida: Un clan no puede declarar un embargo contra sí mismo.',
      };
    }

    if (!fief.embargoedClanIds) {
      fief.embargoedClanIds = [];
    }

    if (!fief.embargoedClanIds.includes(targetClanId)) {
      fief.embargoedClanIds.push(targetClanId);
    }

    this.notifyListeners();
    return { success: true, embargoedClanIds: [...fief.embargoedClanIds] };
  }

  /**
   * Levanta el embargo comercial previamente impuesto sobre un clan.
   */
  public liftCommercialEmbargo(
    fiefId: string,
    clanId: string,
    targetClanId: string
  ): { success: boolean; embargoedClanIds?: string[]; reason?: string } {
    const fief = this.fiefs.get(fiefId);
    if (!fief) {
      return { success: false, reason: 'Feudo no encontrado.' };
    }
    if (fief.controllingClanId !== clanId) {
      return {
        success: false,
        reason: 'Acción denegada: Solo el clan controlador puede levantar embargos.',
      };
    }

    if (fief.embargoedClanIds) {
      fief.embargoedClanIds = fief.embargoedClanIds.filter(id => id !== targetClanId);
    }

    this.notifyListeners();
    return { success: true, embargoedClanIds: [...(fief.embargoedClanIds || [])] };
  }

  /**
   * Retorna la lista de clanes embargados en un feudo.
   */
  public getEmbargoedClans(fiefId: string): string[] {
    return this.fiefs.get(fiefId)?.embargoedClanIds || [];
  }

  /**
   * Verifica si un clan está bajo embargo en un feudo.
   */
  public isClanEmbargoed(fiefId: string, clanId: string): boolean {
    return (this.fiefs.get(fiefId)?.embargoedClanIds || []).includes(clanId);
  }

  /**
   * Valida si un convoy puede descargar en el terminal marítimo / muelle del feudo:
   * 1. Bloqueo total si existe un embargo comercial activo contra el clan.
   * 2. Exención para el clan controlador (0% arancel).
   * 3. Cobro coercitivo de peaje/arancel aduanero (0% a 25%) para clanes foráneos autorizados.
   */
  public canConvoyDischarge(
    fiefId: string,
    convoyClanId: string,
    cargoValueEc: number = 0,
    convoyTreasury?: ClanTreasuryState
  ): {
    allowed: boolean;
    isEmbargoed: boolean;
    taxRatePercent: number;
    requiredTollEc: number;
    reason?: string;
  } {
    const fief = this.fiefs.get(fiefId);
    if (!fief) {
      return {
        allowed: false,
        isEmbargoed: false,
        taxRatePercent: 0,
        requiredTollEc: 0,
        reason: 'Feudo no encontrado.',
      };
    }

    // 1. Verificar si hay embargo activo contra el clan
    if (fief.embargoedClanIds && fief.embargoedClanIds.includes(convoyClanId)) {
      return {
        allowed: false,
        isEmbargoed: true,
        taxRatePercent: fief.taxRatePercent,
        requiredTollEc: 0,
        reason: `Embargo comercial activo: Las operaciones y descargas de ${convoyClanId} están bloqueadas en ${fief.sectorName}.`,
      };
    }

    // 2. Clan local controlador: exento de peaje coercitivo
    if (fief.controllingClanId === convoyClanId) {
      return {
        allowed: true,
        isEmbargoed: false,
        taxRatePercent: 0,
        requiredTollEc: 0,
      };
    }

    // 3. Clan foráneo autorizado: cálculo de arancel coercitivo
    const requiredTollEc = Math.ceil(cargoValueEc * (fief.taxRatePercent / 100));

    if (convoyTreasury && convoyTreasury.energyCredits < requiredTollEc) {
      return {
        allowed: false,
        isEmbargoed: false,
        taxRatePercent: fief.taxRatePercent,
        requiredTollEc,
        reason: `Fondos insuficientes para peaje aduanero coercitivo. Requiere: ${requiredTollEc} EC, Disponible: ${convoyTreasury.energyCredits} EC.`,
      };
    }

    return {
      allowed: true,
      isEmbargoed: false,
      taxRatePercent: fief.taxRatePercent,
      requiredTollEc,
    };
  }

  /**
   * Ejecuta la descarga comercial en un terminal portuario deduciendo el arancel
   * aduanero y transfiriéndolo al tesoro del clan soberano del feudo.
   */
  public executeSeaportDischarge(params: {
    fiefId: string;
    convoyClanId: string;
    cargoValueEc: number;
    convoyTreasury: ClanTreasuryState;
    controllingClanTreasury?: ClanTreasuryState;
    buildingId?: string;
  }): {
    success: boolean;
    feePaidEc: number;
    netValueEc: number;
    reason?: string;
  } {
    const check = this.canConvoyDischarge(
      params.fiefId,
      params.convoyClanId,
      params.cargoValueEc,
      params.convoyTreasury
    );

    if (!check.allowed) {
      return {
        success: false,
        feePaidEc: 0,
        netValueEc: 0,
        reason: check.reason,
      };
    }

    const feePaidEc = check.requiredTollEc;
    params.convoyTreasury.energyCredits -= feePaidEc;

    if (params.controllingClanTreasury && feePaidEc > 0) {
      params.controllingClanTreasury.energyCredits += feePaidEc;
    }

    const netValueEc = Math.max(0, params.cargoValueEc - feePaidEc);
    return {
      success: true,
      feePaidEc,
      netValueEc,
    };
  }

  /**
   * Evalúa los efectos de marcas tácticas WPlace sobre una posición.
   */
  public applyTacticalMarkEffects(
    unitCoords: [number, number],
    marks: TacticalMapMark[],
    unitClanIdOrOptions?: string | { unitClanId?: string; isHostile?: boolean },
    explicitIsHostile?: boolean
  ): TacticalMarkEffectResult {
    return applyTacticalMarkEffects(unitCoords, marks, unitClanIdOrOptions, explicitIsHostile);
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

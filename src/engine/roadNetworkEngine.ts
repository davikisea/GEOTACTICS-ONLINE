/**
 * ==============================================================================
 * MOTOR DE RED VIAL, GRAFO DE NAVEGACIÓN Y LOGÍSTICA (ROAD NETWORK ENGINE)
 * ==============================================================================
 * Especificación Canónica: docs/ANALISIS_PROJECT_ALICE_RUTAS_INGENIERIA_MAPA_METAPOLITICA.md
 * Inspiración Algorítmica: Project Alice (Open V2) src/military/military.cpp (movement_time)
 * y src/map/modes/infrastructure.hpp
 * ==============================================================================
 */

import {
  RoadNode,
  RoadSegment,
  RoadClass,
  RoadSurfaceQuality,
  CommanderFieldPosition,
} from '../types/tacticalRoadTypes';
import { SpatialRoadIndex } from './spatialRoadIndex';

export interface RouteStep {
  fromNodeId: string;
  toNodeId: string;
  segmentId: string;
  distanceKm: number;
  estimatedHours: number;
}

export interface RouteCalculationResult {
  found: boolean;
  totalDistanceKm: number;
  totalEstimatedHours: number;
  pathNodeIds: string[];
  steps: RouteStep[];
  blockedByHostileGarrisonNodeId?: string;
}

// Modificadores de velocidad por clase de superficie según Project Alice
const SURFACE_SPEED_MULTIPLIER: Record<RoadSurfaceQuality, number> = {
  reinforced_concrete: 1.15,
  paved_asphalt: 1.0,
  gravel: 0.65,
  dirt: 0.40,
};

// Velocidad base de convoy según clase de vía (km/h)
const BASE_ROAD_CLASS_SPEED_KMH: Record<RoadClass, number> = {
  highway: 80,
  bridge: 60,
  avenue: 50,
  urban_artery: 45,
  industrial_collector: 35,
  rural_track: 30,
};

export class RoadNetworkEngine {
  private nodes: Map<string, RoadNode> = new Map();
  private segments: Map<string, RoadSegment> = new Map();
  private adjacencyList: Map<string, { targetNodeId: string; segmentId: string }[]> = new Map();
  private spatialIndex: SpatialRoadIndex = new SpatialRoadIndex();

  constructor() {
    this.seedCabimasNetwork();
  }

  /**
   * Inicializa la red semillero del Teatro Cabimas (Costa Oriental del Lago de Maracaibo, Zulia)
   */
  public seedCabimasNetwork(): void {
    const cabimasNodes: RoadNode[] = [
      {
        id: 'node-puente-urdaneta',
        name: 'Puente Gral. Rafael Urdaneta (Cabecera Oriental)',
        coordinates: [-71.512, 10.582],
        poiType: 'bridge_checkpoint',
        resourceYield: { energyCreditsPerHour: 250 },
      },
      {
        id: 'node-cabimas-norte',
        name: 'Cabimas Norte (Sector Ambrosio)',
        coordinates: [-71.465, 10.420],
        poiType: 'highway_junction',
      },
      {
        id: 'node-la-salina',
        name: 'Terminal Marítimo y Patio La Salina',
        coordinates: [-71.458, 10.395],
        poiType: 'oil_terminal',
        resourceYield: { lightCrudeBpd: 15000, energyCreditsPerHour: 500 },
      },
      {
        id: 'node-cabimas-centro',
        name: 'Cabimas Centro (Av. Miraflores)',
        coordinates: [-71.448, 10.388],
        poiType: 'highway_junction',
      },
      {
        id: 'node-el-barroso',
        name: 'Pozo El Barroso II (Santa Clara)',
        coordinates: [-71.425, 10.370],
        poiType: 'oil_field',
        resourceYield: { heavyCrudeBpd: 22000, energyCreditsPerHour: 350 },
      },
      {
        id: 'node-carretera-f',
        name: 'Intersección Carretera F / Av. Intercomunal',
        coordinates: [-71.442, 10.360],
        poiType: 'highway_junction',
      },
      {
        id: 'node-punta-gorda',
        name: 'Complejo Industrial Punta Gorda',
        coordinates: [-71.432, 10.325],
        poiType: 'refinery',
        resourceYield: { lightCrudeBpd: 8000, energyCreditsPerHour: 400 },
      },
      {
        id: 'node-interseccion-lara-zulia',
        name: 'Nudo Vial Las Cabillas (Carretera Lara-Zulia)',
        coordinates: [-71.365, 10.375],
        poiType: 'highway_junction',
        resourceYield: { energyCreditsPerHour: 150 },
      },
      {
        id: 'node-tia-juana',
        name: 'Campos Petrolíferos Tía Juana',
        coordinates: [-71.385, 10.270],
        poiType: 'oil_field',
        resourceYield: { heavyCrudeBpd: 18000, energyCreditsPerHour: 300 },
      },
      {
        id: 'node-ciudad-ojeda',
        name: 'Refinería y Puerto Ciudad Ojeda',
        coordinates: [-71.315, 10.205],
        poiType: 'refinery',
        resourceYield: { lightCrudeBpd: 12000, energyCreditsPerHour: 450 },
      },
      // Malla Vial Intra-Urbana y Feudos de Cabimas (L2 y L3)
      {
        id: 'node-cabimas-miraflores',
        name: 'Av. Miraflores (Distrito Comercial / Feudo Centro)',
        coordinates: [-71.442, 10.392],
        poiType: 'highway_junction',
        resourceYield: { energyCreditsPerHour: 180 },
      },
      {
        id: 'node-cabimas-universidad',
        name: 'Av. Universidad / Delicias (Talleres y Microchips)',
        coordinates: [-71.435, 10.405],
        poiType: 'highway_junction',
        resourceYield: { energyCreditsPerHour: 200 },
      },
      {
        id: 'node-cabimas-carretera-h',
        name: 'Carretera H (Eje Industrial Norte)',
        coordinates: [-71.446, 10.410],
        poiType: 'highway_junction',
      },
      {
        id: 'node-cabimas-carretera-k',
        name: 'Carretera K (Corredor Pozos Barroso)',
        coordinates: [-71.430, 10.378],
        poiType: 'oil_field',
        resourceYield: { heavyCrudeBpd: 5000 },
      },
      {
        id: 'node-cabimas-campo-blanco',
        name: 'Av. Hollywood / Campo Blanco (Sede Residencial de Mando)',
        coordinates: [-71.440, 10.380],
        poiType: 'military_base',
        resourceYield: { energyCreditsPerHour: 120 },
      },
    ];

    for (const node of cabimasNodes) {
      this.addNode(node);
    }

    const cabimasSegments: Omit<RoadSegment, 'throughputCapacity' | 'currentThroughput' | 'isBlocked'>[] = [
      {
        id: 'seg-puente-cabimas-norte',
        name: 'Autopista Interurbana Norte - Acceso Puente Urdaneta',
        fromNodeId: 'node-puente-urdaneta',
        toNodeId: 'node-cabimas-norte',
        roadClass: 'highway',
        lengthKm: 18.5,
        surfaceQuality: 'reinforced_concrete',
        controllerClanId: 'clan-ferro',
      },
      {
        id: 'seg-intercomunal-ambrosio-salina',
        name: 'Av. Intercomunal (Ambrosio - La Salina)',
        fromNodeId: 'node-cabimas-norte',
        toNodeId: 'node-la-salina',
        roadClass: 'avenue',
        lengthKm: 3.2,
        surfaceQuality: 'paved_asphalt',
        controllerClanId: 'clan-ferro',
      },
      {
        id: 'seg-salina-centro',
        name: 'Av. Andrés Bello (Acceso Terminal La Salina)',
        fromNodeId: 'node-la-salina',
        toNodeId: 'node-cabimas-centro',
        roadClass: 'avenue',
        lengthKm: 1.5,
        surfaceQuality: 'paved_asphalt',
        controllerClanId: 'clan-ferro',
      },
      {
        id: 'seg-centro-barroso',
        name: 'Carretera K (Eje Histórico El Barroso)',
        fromNodeId: 'node-cabimas-centro',
        toNodeId: 'node-el-barroso',
        roadClass: 'avenue',
        lengthKm: 3.8,
        surfaceQuality: 'paved_asphalt',
        controllerClanId: 'clan-ferro',
      },
      {
        id: 'seg-centro-carretera-f',
        name: 'Av. Intercomunal Centro - Cruce F',
        fromNodeId: 'node-cabimas-centro',
        toNodeId: 'node-carretera-f',
        roadClass: 'avenue',
        lengthKm: 3.1,
        surfaceQuality: 'paved_asphalt',
        controllerClanId: 'clan-ferro',
      },
      {
        id: 'seg-carretera-f-lara-zulia',
        name: 'Carretera F Transversal (Conexión Lara-Zulia)',
        fromNodeId: 'node-carretera-f',
        toNodeId: 'node-interseccion-lara-zulia',
        roadClass: 'highway',
        lengthKm: 8.7,
        surfaceQuality: 'paved_asphalt',
        controllerClanId: 'clan-ferro',
      },
      {
        id: 'seg-carretera-f-punta-gorda',
        name: 'Av. Intercomunal Sur (Cruce F - Punta Gorda)',
        fromNodeId: 'node-carretera-f',
        toNodeId: 'node-punta-gorda',
        roadClass: 'avenue',
        lengthKm: 4.2,
        surfaceQuality: 'paved_asphalt',
        controllerClanId: 'clan-ferro',
      },
      {
        id: 'seg-punta-gorda-tia-juana',
        name: 'Av. Intercomunal Sur (Punta Gorda - Tía Juana)',
        fromNodeId: 'node-punta-gorda',
        toNodeId: 'node-tia-juana',
        roadClass: 'highway',
        lengthKm: 7.8,
        surfaceQuality: 'paved_asphalt',
        controllerClanId: 'clan-ferro',
      },
      {
        id: 'seg-tia-juana-ciudad-ojeda',
        name: 'Corredor Costero Tía Juana - Ciudad Ojeda',
        fromNodeId: 'node-tia-juana',
        toNodeId: 'node-ciudad-ojeda',
        roadClass: 'highway',
        lengthKm: 11.2,
        surfaceQuality: 'reinforced_concrete',
        controllerClanId: 'clan-ferro',
      },
      {
        id: 'seg-lara-zulia-ciudad-ojeda',
        name: 'Troncal Lara-Zulia hacia Eje Lagunillas',
        fromNodeId: 'node-interseccion-lara-zulia',
        toNodeId: 'node-ciudad-ojeda',
        roadClass: 'highway',
        lengthKm: 19.4,
        surfaceQuality: 'paved_asphalt',
        controllerClanId: null, // Zona disputada neutral
      },
      // Segmentos Viales Intra-Urbanos (L2 Arterias y L3 Colectoras)
      {
        id: 'seg-miraflores-centro',
        name: 'Av. Miraflores Comercial',
        fromNodeId: 'node-cabimas-centro',
        toNodeId: 'node-cabimas-miraflores',
        roadClass: 'urban_artery',
        lengthKm: 1.1,
        surfaceQuality: 'paved_asphalt',
        controllerClanId: 'clan-ferro',
      },
      {
        id: 'seg-universidad-miraflores',
        name: 'Av. Universidad Tecnológica',
        fromNodeId: 'node-cabimas-miraflores',
        toNodeId: 'node-cabimas-universidad',
        roadClass: 'urban_artery',
        lengthKm: 1.7,
        surfaceQuality: 'paved_asphalt',
        controllerClanId: 'clan-ferro',
      },
      {
        id: 'seg-carretera-h-intercomunal',
        name: 'Carretera H Transversal',
        fromNodeId: 'node-cabimas-norte',
        toNodeId: 'node-cabimas-carretera-h',
        roadClass: 'industrial_collector',
        lengthKm: 2.3,
        surfaceQuality: 'paved_asphalt',
        controllerClanId: 'clan-ferro',
      },
      {
        id: 'seg-carretera-k-centro',
        name: 'Carretera K Petrolera',
        fromNodeId: 'node-cabimas-centro',
        toNodeId: 'node-cabimas-carretera-k',
        roadClass: 'industrial_collector',
        lengthKm: 2.1,
        surfaceQuality: 'paved_asphalt',
        controllerClanId: 'clan-ferro',
      },
      {
        id: 'seg-campo-blanco-miraflores',
        name: 'Av. Hollywood Residencial',
        fromNodeId: 'node-cabimas-campo-blanco',
        toNodeId: 'node-cabimas-miraflores',
        roadClass: 'urban_artery',
        lengthKm: 1.4,
        surfaceQuality: 'paved_asphalt',
        controllerClanId: 'clan-ferro',
      },
    ];

    for (const seg of cabimasSegments) {
      this.addSegment({
        ...seg,
        throughputCapacity: 100,
        currentThroughput: 100,
        isBlocked: false,
      });
    }
  }

  public addNode(node: RoadNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
    this.spatialIndex.insertNode(node);
  }

  public addSegment(segment: RoadSegment): void {
    this.segments.set(segment.id, segment);
    this.adjacencyList.get(segment.fromNodeId)?.push({
      targetNodeId: segment.toNodeId,
      segmentId: segment.id,
    });
    this.adjacencyList.get(segment.toNodeId)?.push({
      targetNodeId: segment.fromNodeId,
      segmentId: segment.id,
    });
    this.spatialIndex.insertSegment(segment);
  }

  public getSpatialIndex(): SpatialRoadIndex {
    return this.spatialIndex;
  }

  public getNode(id: string): RoadNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): RoadNode[] {
    return Array.from(this.nodes.values());
  }

  public getSegment(id: string): RoadSegment | undefined {
    return this.segments.get(id);
  }

  public getAllSegments(): RoadSegment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Calcula el tiempo de marcha estimado entre dos nodos conectados por un segmento vial.
   * Basado en la fórmula canónica de Project Alice (movement_time_from_to).
   */
  public calculateSegmentTraversalTimeHours(
    segment: RoadSegment,
    unitSpeedModifier: number = 1.0
  ): number {
    const baseSpeed = BASE_ROAD_CLASS_SPEED_KMH[segment.roadClass] || 50;
    const surfaceMod = SURFACE_SPEED_MULTIPLIER[segment.surfaceQuality] || 1.0;
    const effectiveSpeed = baseSpeed * surfaceMod * unitSpeedModifier;
    return segment.lengthKm / Math.max(effectiveSpeed, 5);
  }

  /**
   * Algoritmo A* para búsqueda de ruta óptima por carreteras entre dos nodos.
   * Respeta bloqueos viales y puestos de control hostiles.
   */
  public findOptimalRoadRoute(
    fromNodeId: string,
    toNodeId: string,
    playerClanId?: string,
    hostileGarrisonNodeIds: Set<string> = new Set()
  ): RouteCalculationResult {
    if (!this.nodes.has(fromNodeId) || !this.nodes.has(toNodeId)) {
      return { found: false, totalDistanceKm: 0, totalEstimatedHours: 0, pathNodeIds: [], steps: [] };
    }

    if (fromNodeId === toNodeId) {
      return { found: true, totalDistanceKm: 0, totalEstimatedHours: 0, pathNodeIds: [fromNodeId], steps: [] };
    }

    // Heurística de distancia euclidiana aproximada (en km)
    const heuristic = (nodeAId: string, nodeBId: string): number => {
      const a = this.nodes.get(nodeAId);
      const b = this.nodes.get(nodeBId);
      if (!a || !b) return 0;
      const dx = (a.coordinates[0] - b.coordinates[0]) * 111.32 * Math.cos((a.coordinates[1] * Math.PI) / 180);
      const dy = (a.coordinates[1] - b.coordinates[1]) * 110.57;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const openSet = new Set<string>([fromNodeId]);
    const cameFrom = new Map<string, { prevNodeId: string; segmentId: string }>();

    const gScore = new Map<string, number>();
    gScore.set(fromNodeId, 0);

    const fScore = new Map<string, number>();
    fScore.set(fromNodeId, heuristic(fromNodeId, toNodeId));

    while (openSet.size > 0) {
      let currentId = Array.from(openSet).reduce((lowest, nodeId) => {
        const score = fScore.get(nodeId) ?? Infinity;
        const lowestScore = fScore.get(lowest) ?? Infinity;
        return score < lowestScore ? nodeId : lowest;
      });

      if (currentId === toNodeId) {
        // Reconstrucción del camino
        const pathNodeIds: string[] = [currentId];
        const steps: RouteStep[] = [];
        let curr = currentId;

        while (cameFrom.has(curr)) {
          const { prevNodeId, segmentId } = cameFrom.get(curr)!;
          const seg = this.segments.get(segmentId)!;
          const hours = this.calculateSegmentTraversalTimeHours(seg);
          steps.unshift({
            fromNodeId: prevNodeId,
            toNodeId: curr,
            segmentId,
            distanceKm: seg.lengthKm,
            estimatedHours: hours,
          });
          pathNodeIds.unshift(prevNodeId);
          curr = prevNodeId;
        }

        const totalDistanceKm = steps.reduce((sum, s) => sum + s.distanceKm, 0);
        const totalEstimatedHours = steps.reduce((sum, s) => sum + s.estimatedHours, 0);

        return {
          found: true,
          totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
          totalEstimatedHours: Number(totalEstimatedHours.toFixed(2)),
          pathNodeIds,
          steps,
        };
      }

      openSet.delete(currentId);

      const neighbors = this.adjacencyList.get(currentId) || [];
      for (const edge of neighbors) {
        const neighborNodeId = edge.targetNodeId;
        const segment = this.segments.get(edge.segmentId);
        if (!segment) continue;

        // Si la vía está físicamente destruida/bloqueada
        if (segment.isBlocked) continue;

        // Si hay una guarnición hostil en el nodo vecino (a menos que sea el destino de asedio)
        if (hostileGarrisonNodeIds.has(neighborNodeId) && neighborNodeId !== toNodeId) {
          continue;
        }

        const cost = this.calculateSegmentTraversalTimeHours(segment);
        const tentativeGScore = (gScore.get(currentId) ?? Infinity) + cost;

        if (tentativeGScore < (gScore.get(neighborNodeId) ?? Infinity)) {
          cameFrom.set(neighborNodeId, { prevNodeId: currentId, segmentId: segment.id });
          gScore.set(neighborNodeId, tentativeGScore);
          fScore.set(neighborNodeId, tentativeGScore + heuristic(neighborNodeId, toNodeId));
          openSet.add(neighborNodeId);
        }
      }
    }

    return { found: false, totalDistanceKm: 0, totalEstimatedHours: 0, pathNodeIds: [], steps: [] };
  }

  /**
   * Proyección y snapping espacial O(1)/O(log N): encuentra el nodo más cercano a unas coordenadas dadas
   * utilizando partición espacial 2D nativa sin búsqueda por fuerza bruta O(N).
   */
  public snapCoordinatesToNearestNode(coords: [number, number]): {
    nearestNode: RoadNode | null;
    distanceKm: number;
  } {
    return this.spatialIndex.snapCoordinatesToNearestNode(coords);
  }

  /**
   * Valida si unas coordenadas geodésicas están a una distancia menor o igual
   * al umbral permitido (ej. 150 metros = 0.15 km) de una carretera o nodo vial.
   * Regla de Juego: Edificios industriales solo pueden erigirse adyacentes a vías.
   * Ejecución O(1) tiempo constante gracias al SpatialRoadIndex.
   */
  public isLocationAdjacentToRoad(
    coords: [number, number],
    maxDistanceKm: number = 0.15
  ): {
    isAdjacent: boolean;
    nearestSegmentId?: string;
    distanceMeters: number;
  } {
    return this.spatialIndex.isLocationAdjacentToRoad(coords, maxDistanceKm);
  }

  /**
   * Calcula el número mínimo de saltos (hops) en el grafo vial entre dos nodos
   */
  public getHopsBetweenNodes(startNodeId: string, endNodeId: string): number {
    if (startNodeId === endNodeId) return 0;
    if (!this.nodes.has(startNodeId) || !this.nodes.has(endNodeId)) return Infinity;

    const visited = new Set<string>([startNodeId]);
    const queue: { nodeId: string; hops: number }[] = [{ nodeId: startNodeId, hops: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.adjacencyList.get(current.nodeId) || [];
      for (const edge of neighbors) {
        if (edge.targetNodeId === endNodeId) {
          return current.hops + 1;
        }
        if (!visited.has(edge.targetNodeId)) {
          visited.add(edge.targetNodeId);
          queue.push({ nodeId: edge.targetNodeId, hops: current.hops + 1 });
        }
      }
    }
    return Infinity;
  }

  /**
   * Calcula el número de saltos entre un nodo y un segmento vial
   */
  public getHopsToSegment(fromNodeId: string, segmentId: string): number {
    const seg = this.segments.get(segmentId);
    if (!seg) return Infinity;
    if (fromNodeId === seg.fromNodeId || fromNodeId === seg.toNodeId) return 0;
    const hopsFrom = this.getHopsBetweenNodes(fromNodeId, seg.fromNodeId);
    const hopsTo = this.getHopsBetweenNodes(fromNodeId, seg.toNodeId);
    return Math.min(hopsFrom, hopsTo);
  }

  /**
   * Convierte la red vial en un GeoJSON dinámico para consumo directo de MapLibre GL
   */
  public toGeoJSON(): {
    type: 'FeatureCollection';
    features: any[];
  } {
    const features: any[] = [];

    for (const seg of this.segments.values()) {
      const fromNode = this.nodes.get(seg.fromNodeId);
      const toNode = this.nodes.get(seg.toNodeId);
      if (!fromNode || !toNode) continue;

      features.push({
        type: 'Feature',
        id: seg.id,
        geometry: {
          type: 'LineString',
          coordinates: seg.coordinates || [fromNode.coordinates, toNode.coordinates],
        },
        properties: {
          id: seg.id,
          name: seg.name,
          roadClass: seg.roadClass,
          lengthKm: seg.lengthKm,
          surfaceQuality: seg.surfaceQuality,
          throughputCapacity: seg.throughputCapacity,
          currentThroughput: seg.currentThroughput,
          controllerClanId: seg.controllerClanId || 'neutral',
          isBlocked: seg.isBlocked,
        },
      });
    }

    return { type: 'FeatureCollection', features };
  }
}

export const roadNetworkEngine = new RoadNetworkEngine();

/**
 * ==============================================================================
 * MOTOR GEOPOLÍTICO Y TOPOLOGÍA TERRITORIAL (WORLD MAP ENGINE)
 * ==============================================================================
 * Especificación Canónica: METAGAME_DESIGN/MASTER_METAGAME_SPEC_V1.md §3 y §4
 * Pilares: Risk.io + Victoria 3 Macro-Economy
 * ==============================================================================
 */

import {
  WorldRegion,
  TerritoryControlState,
  MASTER_METAGAME_CONSTANTS,
  calculateOverExpansionFactor,
} from '../types/metagame';

export interface AdjacencyEdge {
  regionA: string;
  regionB: string;
  isMaritimeBridge?: boolean;
}

export class WorldMapEngine {
  /**
   * Verifica si una región es capturable (las capitales son capturables y de alto rendimiento).
   */
  public static isRegionCapturable(region: WorldRegion): boolean {
    return region.isCapturable;
  }

  /**
   * Verifica si una corporación puede atacar una región objetivo basándose en adyacencia de frontera.
   */
  public static canAttackRegion(
    targetRegionId: string,
    ownedRegionIds: string[],
    adjacencyGraph: AdjacencyEdge[],
    isEmergencyLandingAllowed: boolean = false
  ): {
    canAttack: boolean;
    reason?: string;
  } {
    if (ownedRegionIds.includes(targetRegionId)) {
      return { canAttack: false, reason: 'La región ya está bajo control corporativo.' };
    }

    // Si la corporación no tiene territorios y se autoriza desembarco expedicionario
    if (ownedRegionIds.length === 0) {
      if (isEmergencyLandingAllowed) {
        return { canAttack: true, reason: 'Desembarco expedicionario de reclamación autorizado.' };
      }
      return { canAttack: false, reason: 'Se requiere autorización de desembarco expedicionario.' };
    }

    // Comprobar si existe arista entre alguna región propia y el objetivo
    const isAdjacent = adjacencyGraph.some(
      edge =>
        (ownedRegionIds.includes(edge.regionA) && edge.regionB === targetRegionId) ||
        (ownedRegionIds.includes(edge.regionB) && edge.regionA === targetRegionId)
    );

    if (!isAdjacent) {
      return {
        canAttack: false,
        reason: 'La región objetivo no comparte frontera adyacente con ningún territorio controlado.',
      };
    }

    return { canAttack: true };
  }

  /**
   * Calcula el coste de mantenimiento horario total en Créditos Energéticos (EC)
   * aplicando la curva superlineal de sobre-expansión imperial (Victoria 3 Macro-Economy).
   */
  public static calculateCorporateUpkeep(
    provincesCount: number,
    buildingsList: Array<{ type: string; level: number }>
  ): {
    baseProvinceUpkeepEc: number;
    baseBuildingsUpkeepEc: number;
    rawTotalEc: number;
    overExpansionFactor: number;
    penaltyMultiplier: number;
    finalHourlyUpkeepEc: number;
  } {
    const baseProvinceUpkeepEc = provincesCount * MASTER_METAGAME_CONSTANTS.PROVINCE_BASE_UPKEEP_EC;

    let baseBuildingsUpkeepEc = 0;
    for (const b of buildingsList) {
      let costPerLevel = 60; // Mina/extractor
      if (b.type === 'refinery') costPerLevel = 110;
      else if (b.type === 'factory') costPerLevel = 180;
      else if (b.type === 'garrison_bunker') costPerLevel = 250;
      else if (b.type === 'rail_station') costPerLevel = 80;

      baseBuildingsUpkeepEc += costPerLevel * b.level;
    }

    const rawTotalEc = baseProvinceUpkeepEc + baseBuildingsUpkeepEc;
    const overExpansionFactor = calculateOverExpansionFactor(provincesCount);
    const penaltyMultiplier = 1.0 + overExpansionFactor;
    const finalHourlyUpkeepEc = Math.floor(rawTotalEc * penaltyMultiplier);

    return {
      baseProvinceUpkeepEc,
      baseBuildingsUpkeepEc,
      rawTotalEc,
      overExpansionFactor,
      penaltyMultiplier,
      finalHourlyUpkeepEc,
    };
  }

  /**
   * Calcula la resolución de puntos TCP tras una batalla territorial táctica.
   */
  public static calculateTcpResolution(
    currentState: TerritoryControlState,
    winnerClanId: string,
    isDecisiveVictory: boolean = false
  ): {
    updatedTcp: number;
    sovereigntyFlipped: boolean;
    newStatus: TerritoryControlState['status'];
    cooldownExpiresAt: string | null;
  } {
    const baseDelta = isDecisiveVictory ? 1500 : 1200;
    const isDefenderWinner = currentState.controllingClanId === winnerClanId;

    if (isDefenderWinner) {
      // Defensor recupera TCP
      const updatedTcp = Math.min(currentState.tcpThreshold, currentState.currentTcp + baseDelta);
      const newStatus = updatedTcp >= currentState.tcpThreshold ? 'stable' : 'disputed';
      return {
        updatedTcp,
        sovereigntyFlipped: false,
        newStatus,
        cooldownExpiresAt: currentState.cooldownExpiresAt,
      };
    } else {
      // Atacante drena TCP
      const updatedTcp = currentState.currentTcp - baseDelta;
      if (updatedTcp <= 0) {
        // Volteo de soberanía
        const cooldownExpiry = new Date(
          Date.now() + MASTER_METAGAME_CONSTANTS.COOLDOWN_PRIORITY_HOURS * 3600 * 1000
        ).toISOString();
        return {
          updatedTcp: MASTER_METAGAME_CONSTANTS.TCP_MAX_STABLE,
          sovereigntyFlipped: true,
          newStatus: 'cooldown_priority',
          cooldownExpiresAt: cooldownExpiry,
        };
      } else {
        return {
          updatedTcp,
          sovereigntyFlipped: false,
          newStatus: 'under_siege',
          cooldownExpiresAt: null,
        };
      }
    }
  }
}

// ==============================================================================
// FUNCIONES TOPOLÓGICAS PROJECT ALICE (BRESENHAM & BFS SUPPLY CONNECTIVITY)
// ==============================================================================

import { GeotacticsRegionAdjacency, TOPOLOGY_FLAGS } from '../types/metagame';

/**
 * Traza un vector discreto de línea de suministro en coordenadas enteras (Algoritmo de Bresenham).
 */
export function traceSupplyLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let cx = Math.round(x0);
  let cy = Math.round(y0);
  const tx = Math.round(x1);
  const ty = Math.round(y1);

  const dx = Math.abs(tx - cx);
  const dy = Math.abs(ty - cy);
  const sx = cx < tx ? 1 : -1;
  const sy = cy < ty ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ x: cx, y: cy });
    if (cx === tx && cy === ty) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }

  return points;
}

/**
 * Valida por BFS si una región controlada tiene ruta logística ininterrumpida hacia la Capital/Nodo Primario.
 */
export function validateSupplyLineConnectivity(
  regionId: string,
  capitalRegionIds: string[],
  controlledRegionIds: Set<string>,
  adjacencies: GeotacticsRegionAdjacency[]
): {
  isConnected: boolean;
  hops: number;
  path: string[];
} {
  if (capitalRegionIds.includes(regionId)) {
    return { isConnected: true, hops: 0, path: [regionId] };
  }

  if (capitalRegionIds.length === 0 || !controlledRegionIds.has(regionId)) {
    return { isConnected: false, hops: -1, path: [] };
  }

  const visited = new Set<string>([regionId]);
  const queue: Array<{ current: string; path: string[] }> = [
    { current: regionId, path: [regionId] },
  ];

  while (queue.length > 0) {
    const item = queue.shift()!;
    for (const adj of adjacencies) {
      if ((adj.topologyFlags & TOPOLOGY_FLAGS.IMPASSIBLE) !== 0) continue;

      let neighbor: string | null = null;
      if (adj.fromRegionId === item.current) neighbor = adj.toRegionId;
      else if (adj.toRegionId === item.current) neighbor = adj.fromRegionId;

      if (!neighbor || visited.has(neighbor) || !controlledRegionIds.has(neighbor)) {
        continue;
      }

      const nextPath = [...item.path, neighbor];
      if (capitalRegionIds.includes(neighbor)) {
        return {
          isConnected: true,
          hops: nextPath.length - 1,
          path: nextPath,
        };
      }

      visited.add(neighbor);
      queue.push({ current: neighbor, path: nextPath });
    }
  }

  return { isConnected: false, hops: -1, path: [] };
}

/**
 * ==============================================================================
 * MOTOR DE EXPANSIÓN TERRITORIAL DINÁMICA (ESTILO TERRITORIAL.IO) Y CONTROL DE NODOS
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md
 * Plan Maestro: PLAN_MAESTRO_IMPLEMENTACION_GEOTACTICS_ALICE_CERO_INCERTIDUMBRE.md
 * ==============================================================================
 * Modela el avance de frontera celular determinista ("pintado del mapa"),
 * el control de zonas de influencia y la captura activa de Puntos Estratégicos.
 * ==============================================================================
 */

import { StrategicNode } from './strategicAndProductionEngine';

export interface TerritorialCell {
  x: number;
  y: number;
  clanId: string | null; // null si es tierra de nadie / neutral
  controlStrength: number; // 0 a 100%
  strategicNodeId?: string | null;
  terrainDefenseStar: number; // 0★ a 4★ de cobertura de terreno
}

export interface RegionGridMap {
  regionId: string;
  dimension: number; // e.g. 10x10 = 100 celdas
  cells: TerritorialCell[];
  controllingClanId: string | null;
  sovereigntyPercent: Record<string, number>; // clanId -> % de control
}

export interface ExpansionOrder {
  regionId: string;
  clanId: string;
  expansionBudgetFunds: number; // Fondos $G o Manpower invertido en el avance
  bridgeheadOrigin?: { x: number; y: number }; // Coordenada de inicio si es primera incursión
}

export interface ExpansionResult {
  regionId: string;
  clanId: string;
  cellsConquered: number;
  cellsContested: number;
  newSovereigntyPercent: number;
  capturedStrategicNodeIds: string[];
  remainingBudget: number;
}

// ============================================================================
// 1. INICIALIZACIÓN DE LA MALLA TERRITORIAL POR REGIÓN
// ============================================================================

/**
 * Genera la cuadrícula de micro-celdas para una región geopolítica.
 * Ubica nodos estratégicos en coordenadas centrales y asigna estrellas de terreno.
 */
export function initializeRegionGrid(
  regionId: string,
  dimension = 10,
  strategicNodes: StrategicNode[] = [],
  initialOwnerClanId: string | null = null
): RegionGridMap {
  const cells: TerritorialCell[] = [];
  const nodesInRegion = strategicNodes.filter((n) => n.regionId === regionId);

  // Mapear posiciones de nodos estratégicos en la cuadrícula
  const nodePositionMap = new Map<string, string>();
  if (nodesInRegion.length > 0) {
    // Si hay un nodo capital, va al centro (dim/2, dim/2)
    const mid = Math.floor(dimension / 2);
    nodesInRegion.forEach((node, index) => {
      const nx = (mid + index * 2) % dimension;
      const ny = (mid + Math.floor(index / 2) * 2) % dimension;
      nodePositionMap.set(`${nx},${ny}`, node.id);
    });
  }

  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const coordKey = `${x},${y}`;
      const nodeId = nodePositionMap.get(coordKey) ?? null;

      // Terreno defensivo: los nodos y bordes tienen mayor cobertura (2★-4★)
      let stars = 1;
      if (nodeId) stars = 4; // Búnker / HQ estratégico
      else if (x === 0 || y === 0 || x === dimension - 1 || y === dimension - 1) stars = 2; // Colinas fronterizas
      else if ((x + y) % 3 === 0) stars = 3; // Bosques tácticos

      cells.push({
        x,
        y,
        clanId: initialOwnerClanId,
        controlStrength: initialOwnerClanId ? 100 : 0,
        strategicNodeId: nodeId,
        terrainDefenseStar: stars,
      });
    }
  }

  const grid: RegionGridMap = {
    regionId,
    dimension,
    cells,
    controllingClanId: initialOwnerClanId,
    sovereigntyPercent: {},
  };

  recalculateSovereignty(grid);
  return grid;
}

// ============================================================================
// 2. RECÁLCULO DE SOBERANÍA Y PORCENTAJE DE PINTADO
// ============================================================================

export function recalculateSovereignty(grid: RegionGridMap): void {
  const totalCells = grid.cells.length;
  if (totalCells === 0) return;

  const clanCounts: Record<string, number> = {};

  for (const cell of grid.cells) {
    if (cell.clanId) {
      clanCounts[cell.clanId] = (clanCounts[cell.clanId] || 0) + (cell.controlStrength / 100);
    }
  }

  const percentages: Record<string, number> = {};
  let dominantClan: string | null = null;
  let maxPercent = 0;

  for (const [clanId, count] of Object.entries(clanCounts)) {
    const percent = Number(((count / totalCells) * 100).toFixed(1));
    percentages[clanId] = percent;
    if (percent > maxPercent) {
      maxPercent = percent;
      dominantClan = clanId;
    }
  }

  grid.sovereigntyPercent = percentages;
  // Soberanía de facto consolidada al superar el 50%
  grid.controllingClanId = maxPercent >= 50 ? dominantClan : null;
}

// ============================================================================
// 3. ALGORITMO DE AVANCE Y PINTADO DE ZONA (TERRITORIAL.IO CORE)
// ============================================================================

/**
 * Ejecuta un pulso de expansión de frontera estilo Territorial.io.
 * Avanza célula a célula en 4 direcciones ortogonales a partir de la frontera actual.
 */
export function executeTerritorialExpansion(
  grid: RegionGridMap,
  order: ExpansionOrder,
  strategicNodesCatalog: StrategicNode[] = []
): ExpansionResult {
  const { clanId, expansionBudgetFunds, bridgeheadOrigin } = order;
  let currentBudget = expansionBudgetFunds;
  let conqueredCount = 0;
  let contestedCount = 0;
  const capturedNodes: string[] = [];

  const dim = grid.dimension;
  const getCell = (x: number, y: number) => grid.cells[y * dim + x];

  // 1. Encontrar celdas aliadas actuales
  const alliedCells = grid.cells.filter((c) => c.clanId === clanId && c.controlStrength >= 50);

  // Si el clan no tiene celdas, necesita una cabeza de puente inicial
  if (alliedCells.length === 0) {
    const originX = bridgeheadOrigin ? Math.min(dim - 1, Math.max(0, bridgeheadOrigin.x)) : 0;
    const originY = bridgeheadOrigin ? Math.min(dim - 1, Math.max(0, bridgeheadOrigin.y)) : 0;
    const bridgehead = getCell(originX, originY);

    if (currentBudget >= 500) {
      currentBudget -= 500;
      bridgehead.clanId = clanId;
      bridgehead.controlStrength = 100;
      conqueredCount++;

      if (bridgehead.strategicNodeId) {
        capturedNodes.push(bridgehead.strategicNodeId);
      }
    }
  }

  // 2. Bucle de Avance por Olas mientras haya presupuesto suficiente (mínimo 150 $G)
  const directions = [
    { dx: 0, dy: -1 }, // Norte
    { dx: 0, dy: 1 },  // Sur
    { dx: -1, dy: 0 }, // Oeste
    { dx: 1, dy: 0 },  // Este
  ];

  let progressMadeInWave = true;
  let waveLimit = 50; // Salvaguarda anti-bucle infinito

  while (currentBudget >= 150 && progressMadeInWave && waveLimit > 0) {
    waveLimit--;
    progressMadeInWave = false;

    // Identificar frontera activa
    const currentAllied = grid.cells.filter((c) => c.clanId === clanId && c.controlStrength >= 50);
    const frontierCandidates: TerritorialCell[] = [];
    const visited = new Set<string>();

    for (const allied of currentAllied) {
      for (const d of directions) {
        const nx = allied.x + d.dx;
        const ny = allied.y + d.dy;

        if (nx >= 0 && nx < dim && ny >= 0 && ny < dim) {
          const neighbor = getCell(nx, ny);
          const key = `${nx},${ny}`;

          if (!visited.has(key) && (neighbor.clanId !== clanId || neighbor.controlStrength < 100)) {
            visited.add(key);
            frontierCandidates.push(neighbor);
          }
        }
      }
    }

    if (frontierCandidates.length === 0) break;

    // Priorizar celdas con menor resistencia de terreno
    frontierCandidates.sort((a, b) => a.terrainDefenseStar - b.terrainDefenseStar);

    for (const target of frontierCandidates) {
      const cellCost = 150 * Math.max(1, target.terrainDefenseStar);
      if (currentBudget < cellCost) continue;

      currentBudget -= cellCost;
      progressMadeInWave = true;

      if (target.clanId === null) {
        target.clanId = clanId;
        target.controlStrength = 100;
        conqueredCount++;
      } else {
        contestedCount++;
        const resistancePenalty = target.terrainDefenseStar * 20;
        const netDamage = 60 - resistancePenalty;

        target.controlStrength -= netDamage;
        if (target.controlStrength <= 0) {
          target.clanId = clanId;
          target.controlStrength = Math.abs(target.controlStrength) + 50;
          conqueredCount++;
        }
      }

      if (target.strategicNodeId && target.clanId === clanId && target.controlStrength >= 50) {
        if (!capturedNodes.includes(target.strategicNodeId)) {
          capturedNodes.push(target.strategicNodeId);
        }
        const nodeObj = strategicNodesCatalog.find((n) => n.id === target.strategicNodeId);
        if (nodeObj) {
          nodeObj.controllingClanId = clanId;
        }
      }
    }
  }

  // 3. Actualizar porcentajes totales de soberanía
  recalculateSovereignty(grid);

  return {
    regionId: grid.regionId,
    clanId,
    cellsConquered: conqueredCount,
    cellsContested: contestedCount,
    newSovereigntyPercent: grid.sovereigntyPercent[clanId] ?? 0,
    capturedStrategicNodeIds: capturedNodes,
    remainingBudget: currentBudget,
  };
}

// ============================================================================
// 4. MULTIPLICADOR INDUSTRIAL Y LOGÍSTICO POR NODOS CAPTURADOS
// ============================================================================

export interface IndustrialNodeBuffs {
  rawExtractionMultiplier: number;
  refinerySpeedMultiplier: number;
  tollRevenueMultiplier: number;
  activeHegemonicBuff: boolean;
}

export function calculateIndustrialYieldWithNodes(
  baseYield: number,
  clanId: string,
  nodes: StrategicNode[]
): { finalYield: number; buffs: IndustrialNodeBuffs } {
  let extractionMult = 1.0;
  let refinerySpeed = 1.0;
  let tollMult = 1.0;
  let hegemonic = false;

  for (const node of nodes) {
    if (node.controllingClanId === clanId) {
      if (node.nodeType === 'capital_hq') {
        hegemonic = true;
        refinerySpeed += 0.10; // +10% velocidad de forja
        extractionMult += 0.15; // +15% producción energética nacional
      }
      if (node.nodeType === 'refinery_hub') {
        extractionMult += (node.buffValue - 1.0); // e.g. +25% en CRP Amuay o +30% Guri
      }
      if (node.nodeType === 'strait_canal') {
        tollMult += (node.buffValue / 100); // e.g. +5% peaje
      }
    }
  }

  const finalYield = Math.round(baseYield * extractionMult);

  return {
    finalYield,
    buffs: {
      rawExtractionMultiplier: Number(extractionMult.toFixed(2)),
      refinerySpeedMultiplier: Number(refinerySpeed.toFixed(2)),
      tollRevenueMultiplier: Number(tollMult.toFixed(2)),
      activeHegemonicBuff: hegemonic,
    },
  };
}

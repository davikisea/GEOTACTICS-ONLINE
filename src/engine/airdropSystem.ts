/**
 * ==============================================================================
 * SISTEMA CANÓNICO DE AIRDROPS (SUMINISTROS TÁCTICOS DINÁMICOS)
 * ==============================================================================
 * Proyecto: Tactical Command: Wars of Legacy
 * Especificación Canónica: docs/01_MASTER_GAME_DESIGN_DOCUMENT.md §7
 * Base de Datos: docs/04_MASTER_DATABASE_AND_SECURITY_SPEC.md §3.1 (claim_airdrop)
 * 
 * Reglas Oficiales:
 * 1. Aparición programada en Turnos 2 y 5 (en Blitz / Duelo Espejo) o 3 y 7 (Campaña).
 * 2. Cálculo estricto de equidistancia Manhattan entre ambos HQ: |D_M(HQ1, C) - D_M(HQ2, C)| <= 1.
 * 3. Las cajas solo caen en casillas transitables (no mar, no montaña, no HQ).
 * 4. Reclamación atómica: La unidad debe ocupar exactamente la coordenada.
 * 5. Recompensas: Fondos ($2000G-$3000G), Recarga de CO Power (100%) o Gemas.
 * 6. Expiración automática: Se destruye tras 2 turnos sin ser capturada.
 */

import { GridPosition, TerrainTile, TacticalUnit } from '../types';
import { barkEngine } from './barkEngine';
import { audioManager } from './audioManager';

export type AirDropRewardType = 'funds' | 'co_power' | 'gems';

export interface AirDrop {
  id: string;
  x: number;
  y: number;
  spawnTurn: number;
  expiresTurn: number;
  rewardType: AirDropRewardType;
  rewardValue: number;
  isClaimed: boolean;
  claimedByPlayerId?: 'p1' | 'p2';
  claimedTurn?: number;
}

export interface AirDropSpawnConfig {
  spawnTurns: number[]; // e.g. [2, 5]
  lifespanTurns: number; // e.g. 2 turnos
}

export const DEFAULT_AIRDROP_CONFIG: AirDropSpawnConfig = {
  spawnTurns: [2, 5],
  lifespanTurns: 2,
};

export class AirDropEngine {
  /**
   * Genera un nuevo AirDrop con coordenadas equidistantes entre los dos cuarteles generales (HQ).
   */
  public static calculateEquidistantDrop(
    gridWidth: number,
    gridHeight: number,
    tiles: TerrainTile[][],
    units: { x: number; y: number }[],
    existingDrops: AirDrop[],
    currentTurn: number
  ): AirDrop | null {
    // 1. Localizar los HQs de P1 y P2 en el mapa
    let hqP1: GridPosition | null = null;
    let hqP2: GridPosition | null = null;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const tile = tiles[y]?.[x];
        if (tile && tile.type === 'hq') {
          if (tile.ownerId === 'p1' || tile.ownerId === 'orange-star') {
            hqP1 = { x, y };
          } else if (tile.ownerId === 'p2' || tile.ownerId === 'blue-moon') {
            hqP2 = { x, y };
          }
        }
      }
    }

    // Si no hay HQ identificados por owner, usar extremos del mapa como aproximación
    if (!hqP1) hqP1 = { x: 1, y: 1 };
    if (!hqP2) hqP2 = { x: Math.max(1, gridWidth - 2), y: Math.max(1, gridHeight - 2) };

    // 2. Filtrar casillas candidatas
    const candidates: { x: number; y: number; diff: number; distCenter: number }[] = [];
    const centerX = gridWidth / 2;
    const centerY = gridHeight / 2;

    for (let y = 1; y < gridHeight - 1; y++) {
      for (let x = 1; x < gridWidth - 1; x++) {
        const tile = tiles[y]?.[x];
        if (!tile) continue;

        // No permitir caídas en montañas, mar profundo o instalaciones principales
        const isImpassable = tile.type === 'mountain' || tile.type === 'sea' || tile.type === 'hq';
        if (isImpassable) continue;

        // Verificar que no haya unidades ni otros airdrops en esa casilla
        const isOccupiedByUnit = units.some(u => u.x === x && u.y === y);
        const isOccupiedByDrop = existingDrops.some(d => !d.isClaimed && d.x === x && d.y === y);
        if (isOccupiedByUnit || isOccupiedByDrop) continue;

        // Distancias Manhattan
        const distP1 = Math.abs(x - hqP1.x) + Math.abs(y - hqP1.y);
        const distP2 = Math.abs(x - hqP2.x) + Math.abs(y - hqP2.y);
        const diff = Math.abs(distP1 - distP2);

        // CONDICIÓN MATEMÁTICA: Equidistancia estricta (|D1 - D2| <= 1)
        if (diff <= 1) {
          const distCenter = Math.abs(x - centerX) + Math.abs(y - centerY);
          candidates.push({ x, y, diff, distCenter });
        }
      }
    }

    if (candidates.length === 0) {
      // Fallback a casillas centrales disponibles si la equidistancia exacta es inaccesible
      for (let y = 1; y < gridHeight - 1; y++) {
        for (let x = 1; x < gridWidth - 1; x++) {
          const tile = tiles[y]?.[x];
          if (tile && tile.type !== 'sea' && tile.type !== 'hq') {
            const isOccupied = units.some(u => u.x === x && u.y === y);
            if (!isOccupied) {
              candidates.push({ x, y, diff: 2, distCenter: 0 });
            }
          }
        }
      }
    }

    if (candidates.length === 0) return null;

    // Ordenar por proximidad al centro del mapa para máxima disputa táctica
    candidates.sort((a, b) => a.diff - b.diff || a.distCenter - b.distCenter);

    // Seleccionar entre las mejores 3 opciones para dar variabilidad
    const topCandidates = candidates.slice(0, Math.min(3, candidates.length));
    const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    // 3. Ponderación de botín (Loot Table)
    const lootRoll = Math.random();
    let rewardType: AirDropRewardType = 'funds';
    let rewardValue = 2500;

    if (lootRoll < 0.50) {
      // 50% Probabilidad: Fondos de guerra inmediatos ($2000G a $3000G)
      rewardType = 'funds';
      rewardValue = 2000 + Math.floor(Math.random() * 3) * 500;
    } else if (lootRoll < 0.85) {
      // 35% Probabilidad: Supercarga de medidor de CO (100% de barra instantánea)
      rewardType = 'co_power';
      rewardValue = 100;
    } else {
      // 15% Probabilidad: Gemas de mando de bonificación
      rewardType = 'gems';
      rewardValue = 15;
    }

    const dropId = `airdrop_t${currentTurn}_${chosen.x}_${chosen.y}`;

    return {
      id: dropId,
      x: chosen.x,
      y: chosen.y,
      spawnTurn: currentTurn,
      expiresTurn: currentTurn + DEFAULT_AIRDROP_CONFIG.lifespanTurns,
      rewardType,
      rewardValue,
      isClaimed: false,
    };
  }

  /**
   * Reclama un AirDrop si la unidad activa ocupa la casilla del suministro.
   */
  public static claimAirDrop(
    airdrop: AirDrop,
    unit: { id: string; ownerId: 'p1' | 'p2'; x: number; y: number },
    coId: string
  ): {
    success: boolean;
    claimedDrop: AirDrop;
    rewardMessage: string;
  } {
    if (airdrop.isClaimed) {
      return { success: false, claimedDrop: airdrop, rewardMessage: 'Suministro ya reclamado.' };
    }

    // Verificación estricta de coordenadas
    if (airdrop.x !== unit.x || airdrop.y !== unit.y) {
      return {
        success: false,
        claimedDrop: airdrop,
        rewardMessage: 'La unidad no ocupa la casilla del AirDrop.',
      };
    }

    const updatedDrop: AirDrop = {
      ...airdrop,
      isClaimed: true,
      claimedByPlayerId: unit.ownerId,
    };

    let rewardMessage = '';
    if (airdrop.rewardType === 'funds') {
      rewardMessage = `¡Suministros capturados! +$${airdrop.rewardValue}G al tesoro militar.`;
      audioManager.playSFX('capture');
    } else if (airdrop.rewardType === 'co_power') {
      rewardMessage = `¡Baterías de combate capturadas! Medidor de CO cargado al 100%.`;
      audioManager.playSFX('co_power');
    } else {
      rewardMessage = `¡Caja estratégica capturada! +${airdrop.rewardValue} Gemas de mando.`;
      audioManager.playSFX('victory');
    }

    // Detonar viñeta cómic reactiva con sello Pop-Art ¡AIRDROP!
    barkEngine.triggerBark({
      commanderId: coId,
      triggerContext: 'airdrop_spawn',
      bondingLevel: 3,
      playerName: unit.ownerId === 'p1' ? 'Orange Star' : 'Blue Moon',
    });

    return {
      success: true,
      claimedDrop: updatedDrop,
      rewardMessage,
    };
  }

  /**
   * Purga los airdrops caducados que no fueron reclamados a tiempo.
   */
  public static purgeExpiredDrops(drops: AirDrop[], currentTurn: number): AirDrop[] {
    return drops.filter(d => d.isClaimed || currentTurn <= d.expiresTurn);
  }
}

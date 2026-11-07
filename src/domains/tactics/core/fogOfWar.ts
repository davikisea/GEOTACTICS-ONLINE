/**
 * SISTEMA CANÓNICO DE NIEBLA DE GUERRA (FOG OF WAR) & EMBOSCADAS
 * Especificación Advance Wars / WarsWorld
 * 
 * Reglas:
 * 1. Radio de visión por unidad y bonificación de elevación en Montañas (+3 para infantería/mecanizados).
 * 2. Visión pasiva otorgada por propiedades aliadas (HQ, Ciudades, Bases) de radio 1.
 * 3. Penalización por clima (Lluvia reduce -1 casilla de visión).
 * 4. Ocultación en Bosques y Arrecifes: unidades enemigas solo son reveladas si hay una unidad aliada directamente adyacente (distancia Manhattan <= 1).
 * 5. Detección de colisiones e interrupción de movimiento (TRAP / Emboscada).
 */

import { GridPosition, TacticalUnit, TerrainTile, TerrainType } from '../types';
import { WeatherType } from './canonicalMovement';

export const CANONICAL_UNIT_BASE_VISION: Record<string, number> = {
  infantry: 2,
  mech: 2,
  recon: 5,
  tank_light: 3,
  tank_medium: 1,
  artillery: 1,
  rocket: 1,
  anti_air: 2,
  b_copter: 3,
  fighter: 2,
  bomber: 2,
  battleship: 2,
};

export interface FogOfWarState {
  enabled: boolean;
  viewerPlayerId: string; // 'p1' | 'p2' | 'spectator'
  visibleTileKeys: Set<string>; // 'x,y'
  revealedEnemyUnitIds: Set<string>;
}

export interface TrapCheckResult {
  isTrapped: boolean;
  interruptedAt: GridPosition;
  trappingUnit: TacticalUnit | null;
  finalPath: GridPosition[];
}

export class FogOfWarEngine {
  /**
   * Calcula el alcance de visión dinámico de una unidad según su terreno, facción y clima.
   */
  public static calculateUnitVisionRange(
    unit: TacticalUnit,
    currentTile: TerrainTile | null,
    weather: WeatherType = 'clear',
    coVisionBonus: number = 0
  ): number {
    const baseVision = CANONICAL_UNIT_BASE_VISION[unit.unitCode] ?? unit.visionRange ?? 2;

    // Bonificación de elevación: Infantería y Mecanizados ganan +3 visión en Montañas
    const isFootSoldier = unit.unitCode === 'infantry' || unit.unitCode === 'mech';
    const isMountain = currentTile?.type === 'mountain';
    const mountainBonus = isFootSoldier && isMountain ? 3 : 0;

    let totalVision = baseVision + mountainBonus + coVisionBonus;

    // Penalización meteorológica: la lluvia reduce la visibilidad en 1 casilla
    if (weather === 'rain') {
      totalVision -= 1;
    }

    return Math.max(1, totalVision);
  }

  /**
   * Genera el conjunto de casillas visibles y unidades reveladas para un jugador.
   */
  public static computeVision(
    viewerPlayerId: string,
    allUnits: TacticalUnit[],
    tiles: TerrainTile[][],
    weather: WeatherType = 'clear',
    sonjaPowerActive: boolean = false
  ): {
    visibleTileKeys: Set<string>;
    revealedEnemyUnitIds: Set<string>;
  } {
    const visibleTileKeys = new Set<string>();
    const revealedEnemyUnitIds = new Set<string>();

    const height = tiles.length;
    const width = tiles[0]?.length || 0;

    // Modo espectador: visión total absoluta
    if (viewerPlayerId === 'spectator') {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          visibleTileKeys.add(`${x},${y}`);
        }
      }
      for (const u of allUnits) {
        revealedEnemyUnitIds.add(u.id);
      }
      return { visibleTileKeys, revealedEnemyUnitIds };
    }

    const alliedUnits = allUnits.filter(u => u.ownerId === viewerPlayerId);
    const enemyUnits = allUnits.filter(u => u.ownerId !== viewerPlayerId);

    // 1. Visión otorgada por propiedades aliadas (Radio 1: casilla propia + 4 adyacentes)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tiles[y][x];
        if (tile.ownerId === viewerPlayerId) {
          visibleTileKeys.add(`${x},${y}`);
          const neighbors = [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 },
          ];
          for (const n of neighbors) {
            if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
              visibleTileKeys.add(`${n.x},${n.y}`);
            }
          }
        }
      }
    }

    // 2. Visión circular en Manhattan proyectada por cada unidad aliada
    for (const unit of alliedUnits) {
      const tileAtUnit = tiles[unit.y]?.[unit.x] || null;
      const visionRange = this.calculateUnitVisionRange(unit, tileAtUnit, weather);

      for (let dy = -visionRange; dy <= visionRange; dy++) {
        const remainingDist = visionRange - Math.abs(dy);
        for (let dx = -remainingDist; dx <= remainingDist; dx++) {
          const targetX = unit.x + dx;
          const targetY = unit.y + dy;

          if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) {
            continue;
          }

          const dist = Math.abs(dx) + Math.abs(dy);
          const targetTile = tiles[targetY][targetX];

          // Regla Canónica de Bosques y Arrecifes:
          // Unidades aliadas solo ven el interior de un bosque/arrecife si están directamente adyacentes (dist <= 1)
          // a menos que un poder de visión penetrante (ej. Sonja) esté activo.
          const isCoverTerrain = targetTile.type === 'forest' || targetTile.type === 'reef';
          if (isCoverTerrain && !sonjaPowerActive && dist > 1) {
            // No se ilumina el interior del bosque profundo
            continue;
          }

          visibleTileKeys.add(`${targetX},${targetY}`);
        }
      }
    }

    // 3. Determinar qué unidades enemigas son visibles
    for (const enemy of enemyUnits) {
      const key = `${enemy.x},${enemy.y}`;
      if (!visibleTileKeys.has(key)) {
        // En casilla en tinieblas
        continue;
      }

      const enemyTile = tiles[enemy.y]?.[enemy.x];
      const isInCover = enemyTile && (enemyTile.type === 'forest' || enemyTile.type === 'reef');

      if (isInCover && !sonjaPowerActive) {
        // En bosque o arrecife: solo es visible si existe al menos una unidad aliada directamente adyacente
        const hasAdjacentAlly = alliedUnits.some(
          a => Math.abs(a.x - enemy.x) + Math.abs(a.y - enemy.y) <= 1
        );
        if (hasAdjacentAlly) {
          revealedEnemyUnitIds.add(enemy.id);
        }
      } else {
        // En terreno descubierto visible
        revealedEnemyUnitIds.add(enemy.id);
      }
    }

    return { visibleTileKeys, revealedEnemyUnitIds };
  }

  /**
   * Simula la trayectoria de una unidad y detecta si colisiona con un enemigo oculto (EMBOSCADA / TRAP).
   * Si tropieza, el movimiento se interrumpe en la casilla inmediatamente anterior.
   */
  public static checkTrapOnPath(
    movingUnit: TacticalUnit,
    plannedPath: GridPosition[],
    allUnits: TacticalUnit[],
    viewerPlayerId: string,
    tiles: TerrainTile[][]
  ): TrapCheckResult {
    if (plannedPath.length <= 1) {
      return {
        isTrapped: false,
        interruptedAt: plannedPath[0] || { x: movingUnit.x, y: movingUnit.y },
        trappingUnit: null,
        finalPath: plannedPath,
      };
    }

    const enemies = allUnits.filter(u => u.ownerId !== movingUnit.ownerId);
    const finalPath: GridPosition[] = [plannedPath[0]];

    for (let i = 1; i < plannedPath.length; i++) {
      const step = plannedPath[i];
      const enemyOnTile = enemies.find(e => e.x === step.x && e.y === step.y);

      if (enemyOnTile) {
        // Comprobar si el enemigo estaba previamente oculto en niebla o cobertura
        const visionBefore = this.computeVision(viewerPlayerId, allUnits, tiles);
        const wasHidden = !visionBefore.revealedEnemyUnitIds.has(enemyOnTile.id);

        if (wasHidden) {
          // EMBOSCADA: Se interrumpe en la casilla anterior a la del enemigo
          const lastSafePos = finalPath[finalPath.length - 1];
          return {
            isTrapped: true,
            interruptedAt: lastSafePos,
            trappingUnit: enemyOnTile,
            finalPath,
          };
        }
      }

      finalPath.push(step);
    }

    return {
      isTrapped: false,
      interruptedAt: finalPath[finalPath.length - 1],
      trappingUnit: null,
      finalPath,
    };
  }
}

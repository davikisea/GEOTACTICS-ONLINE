import { GridPosition } from '../types';

export type ArrowSegmentType =
  // Straight lines
  | 'horizontal'  // 'ew'
  | 'vertical'    // 'ns'
  // Corners
  | 'corner_ne'   // 'ne' (bottom-left to top-right corner)
  | 'corner_nw'   // 'nw'
  | 'corner_se'   // 'se'
  | 'corner_sw'   // 'sw'
  // Arrow heads (direction arrow points towards)
  | 'arrow_up'    // 'nd'
  | 'arrow_down'  // 'sd'
  | 'arrow_left'  // 'wd'
  | 'arrow_right' // 'ed'
  // Start origin segments
  | 'start_dot'   // 'od'
  | 'start_up'    // 'on'
  | 'start_down'  // 'os'
  | 'start_left'  // 'ow'
  | 'start_right';// 'oe'

export interface ArrowSegment {
  position: GridPosition;
  type: ArrowSegmentType;
  rawCode: string; // AW canon code: 'ew', 'ns', 'ne', 'nw', 'se', 'sw', 'nd', 'sd', 'wd', 'ed', etc.
}

/**
 * Pure function to map 3 consecutive path points (A -> B -> C) to the sprite/segment at point B.
 * Follows Advance Wars / WarsWorld canonical sprite logic.
 */
export function getArrowSegmentCode(
  prev: GridPosition,
  curr: GridPosition,
  next: GridPosition
): { code: string; type: ArrowSegmentType } {
  const isStart = prev.x === curr.x && prev.y === curr.y;
  const isEnd = next.x === curr.x && next.y === curr.y;

  // Single tile path (start & end)
  if (isStart && isEnd) {
    return { code: 'od', type: 'start_dot' };
  }

  // Starting tile directed toward next
  if (isStart) {
    if (next.x < curr.x) return { code: 'ow', type: 'start_left' };
    if (next.x > curr.x) return { code: 'oe', type: 'start_right' };
    if (next.y > curr.y) return { code: 'os', type: 'start_down' };
    return { code: 'on', type: 'start_up' };
  }

  // Ending tile (Arrow Head) coming from prev
  if (isEnd) {
    if (prev.x < curr.x) return { code: 'ed', type: 'arrow_right' };
    if (prev.x > curr.x) return { code: 'wd', type: 'arrow_left' };
    if (prev.y < curr.y) return { code: 'sd', type: 'arrow_down' };
    return { code: 'nd', type: 'arrow_up' };
  }

  // Intermediate tile: diff between prev and next
  const dx = Math.abs(prev.x - next.x);
  const dy = Math.abs(prev.y - next.y);

  if (dx === 2 && dy === 0) {
    return { code: 'ew', type: 'horizontal' };
  }
  if (dy === 2 && dx === 0) {
    return { code: 'ns', type: 'vertical' };
  }

  // Corner turn
  let verticalPart: 'n' | 's' = (prev.y > curr.y || next.y > curr.y) ? 's' : 'n';
  let horizontalPart: 'e' | 'w' = (prev.x > curr.x || next.x > curr.x) ? 'e' : 'w';
  const cornerCode = `${verticalPart}${horizontalPart}`;

  const cornerTypeMap: Record<string, ArrowSegmentType> = {
    'ne': 'corner_ne',
    'nw': 'corner_nw',
    'se': 'corner_se',
    'sw': 'corner_sw',
  };

  return {
    code: cornerCode,
    type: cornerTypeMap[cornerCode] || 'corner_ne',
  };
}

/**
 * Calculates all arrow visual segments for a given path sequence.
 * @param path Array of grid positions from origin to destination.
 */
export function calculatePathArrow(path: GridPosition[]): ArrowSegment[] {
  if (!path || path.length === 0) return [];

  if (path.length === 1) {
    const single = path[0];
    const seg = getArrowSegmentCode(single, single, single);
    return [{ position: single, type: seg.type, rawCode: seg.code }];
  }

  const result: ArrowSegment[] = [];
  const extendedPath = [...path, path[path.length - 1]];

  for (let i = 0; i < path.length; i++) {
    const prev = i === 0 ? path[0] : path[i - 1];
    const curr = path[i];
    const next = extendedPath[i + 1];

    const seg = getArrowSegmentCode(prev, curr, next);
    result.push({
      position: curr,
      type: seg.type,
      rawCode: seg.code,
    });
  }

  return result;
}

/**
 * Validates whether two grid positions are orthogonal neighbors (distance 1).
 */
export function areNeighbors(a: GridPosition, b: GridPosition): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

/**
 * Dynamic path accumulation helper:
 * When hovering or dragging over tile `newPos`, updates the current active path:
 * - If hovering over an existing tile in `currentPath`, rewinds back to that point.
 * - If neighboring the last tile and movement allowance permits, appends.
 * - Otherwise falls back to full path recalculation.
 */
export function updateDynamicPath(
  currentPath: GridPosition[],
  newPos: GridPosition,
  movementCostFn: (pos: GridPosition) => number | null,
  maxMovementPoints: number,
  fallbackShortestPathFn: (target: GridPosition) => GridPosition[]
): GridPosition[] {
  if (currentPath.length === 0) {
    return fallbackShortestPathFn(newPos);
  }

  // 1. Check if newPos already exists in path -> rewind
  const existingIndex = currentPath.findIndex(p => p.x === newPos.x && p.y === newPos.y);
  if (existingIndex !== -1) {
    return currentPath.slice(0, existingIndex + 1);
  }

  // 2. Check if neighboring the last tile
  const lastPos = currentPath[currentPath.length - 1];
  if (areNeighbors(lastPos, newPos)) {
    const stepCost = movementCostFn(newPos);
    if (stepCost !== null && stepCost !== Infinity) {
      // Calculate total path cost
      let totalCost = 0;
      for (let i = 1; i < currentPath.length; i++) {
        const c = movementCostFn(currentPath[i]);
        if (c === null || c === Infinity) {
          return fallbackShortestPathFn(newPos);
        }
        totalCost += c;
      }
      if (totalCost + stepCost <= maxMovementPoints) {
        return [...currentPath, newPos];
      }
    }
  }

  // 3. Fallback to pathfinder shortest path
  return fallbackShortestPathFn(newPos);
}

import { TacticalUnit, TerrainTile } from '../types';

export interface HqCaptureResult {
  winnerId: string;
  loserId: string;
  propertiesTransferredCount: number;
  unitsDisbandedCount: number;
  updatedTiles: TerrainTile[][];
  remainingUnits: TacticalUnit[];
  logMessage: string;
}

/**
 * Executes player elimination and property transfer upon HQ capture.
 * Canon Advance Wars / WarsWorld rule:
 * - When an HQ is captured, the defending player is eliminated.
 * - All surviving properties owned by the defeated player are transferred to the conqueror.
 * - All remaining military units of the defeated player are disbanded/removed from the board.
 */
export function executeHqCaptureElimination(
  conquerorPlayerId: string,
  defeatedPlayerId: string,
  tiles: TerrainTile[][],
  units: TacticalUnit[]
): HqCaptureResult {
  let propertiesTransferredCount = 0;
  let unitsDisbandedCount = 0;

  // 1. Transfer all properties owned by defeated player to conqueror
  const updatedTiles: TerrainTile[][] = tiles.map(row =>
    row.map(tile => {
      if (tile.ownerId === defeatedPlayerId) {
        propertiesTransferredCount++;
        return {
          ...tile,
          ownerId: conquerorPlayerId,
          captureHp: 20, // Reset to full health under new command
        };
      }
      return tile;
    })
  );

  // 2. Disband all units belonging to defeated player
  const remainingUnits: TacticalUnit[] = [];
  for (const unit of units) {
    if (unit.ownerId === defeatedPlayerId) {
      unitsDisbandedCount++;
    } else {
      remainingUnits.push(unit);
    }
  }

  const logMessage = `¡VICTORIA DECISIVA! El Cuartel General ha sido tomado. ${propertiesTransferredCount} propiedades transferidas al vencedor y ${unitsDisbandedCount} unidades enemigas disueltas.`;

  return {
    winnerId: conquerorPlayerId,
    loserId: defeatedPlayerId,
    propertiesTransferredCount,
    unitsDisbandedCount,
    updatedTiles,
    remainingUnits,
    logMessage,
  };
}

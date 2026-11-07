import { GridPosition, TacticalUnit } from '../types';

export interface ExplosionImpactResult {
  unitId: string;
  unitCode: string;
  ownerId: string;
  previousHp: number;
  newHp: number;
  damageDealt: number;
}

export interface BlackBombResult {
  success: boolean;
  epicenter: GridPosition;
  blastTiles: GridPosition[];
  affectedUnits: ExplosionImpactResult[];
  bombDestroyed: boolean;
  error?: string;
}

/**
 * Calculates all tiles encompassed by a Black Bomb explosion radius (Manhattan distance <= 3).
 */
export function getBlackBombBlastZone(
  epicenter: GridPosition,
  radius: number = 3,
  gridWidth: number,
  gridHeight: number
): GridPosition[] {
  const result: GridPosition[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) <= radius) {
        const tx = epicenter.x + dx;
        const ty = epicenter.y + dy;
        if (tx >= 0 && tx < gridWidth && ty >= 0 && ty < gridHeight) {
          result.push({ x: tx, y: ty });
        }
      }
    }
  }
  return result;
}

/**
 * Detonates a Black Bomb: damages all units within Manhattan distance 3 by 5 HP (leaves min 1 HP),
 * and self-destructs the bomb.
 */
export function executeBlackBombExplosion(
  bombUnit: TacticalUnit,
  unitsMap: Map<string, TacticalUnit>,
  gridWidth: number,
  gridHeight: number
): BlackBombResult {
  const isBomb = bombUnit.unitCode.toLowerCase() === 'blackbomb' || bombUnit.unitCode.toLowerCase() === 'bomb';
  if (!isBomb) {
    return {
      success: false,
      epicenter: { x: bombUnit.x, y: bombUnit.y },
      blastTiles: [],
      affectedUnits: [],
      bombDestroyed: false,
      error: 'La unidad no es una bomba autodestructiva.',
    };
  }

  const epicenter = { x: bombUnit.x, y: bombUnit.y };
  const blastTiles = getBlackBombBlastZone(epicenter, 3, gridWidth, gridHeight);
  const blastSet = new Set(blastTiles.map(p => `${p.x},${p.y}`));

  const affectedUnits: ExplosionImpactResult[] = [];

  for (const unit of unitsMap.values()) {
    if (unit.id !== bombUnit.id && blastSet.has(`${unit.x},${unit.y}`)) {
      const prevHp = unit.hp;
      const nextHp = Math.max(1, prevHp - 5);
      unit.hp = nextHp;

      affectedUnits.push({
        unitId: unit.id,
        unitCode: unit.unitCode,
        ownerId: unit.ownerId,
        previousHp: prevHp,
        newHp: nextHp,
        damageDealt: prevHp - nextHp,
      });
    }
  }

  // Self-destruct bomb
  bombUnit.hp = 0;

  return {
    success: true,
    epicenter,
    blastTiles,
    affectedUnits,
    bombDestroyed: true,
  };
}

/**
 * Multi-passenger transport container (e.g., Lander carries 2 ground vehicles, Cruiser carries 2 copters).
 */
export interface TransportManifest {
  transportUnitId: string;
  capacity: number;
  loadedPassengers: TacticalUnit[];
}

export class MultiUnitTransportManager {
  private manifests: Map<string, TransportManifest> = new Map();

  public getCapacity(transportCode: string): number {
    const code = transportCode.toLowerCase();
    if (code === 'lander' || code === 'cruiser' || code === 'blackboat') {
      return 2;
    }
    // APC, T-Copter
    return 1;
  }

  public canBoard(passengerCode: string, transportCode: string): boolean {
    const p = passengerCode.toLowerCase();
    const t = transportCode.toLowerCase();

    if (t === 'apc' || t === 'tcopter' || t === 't_copter') {
      return p === 'infantry' || p === 'mech';
    }
    if (t === 'lander') {
      return (
        p === 'infantry' ||
        p === 'mech' ||
        p === 'tank' ||
        p === 'tank_light' ||
        p === 'tank_medium' ||
        p === 'neotank' ||
        p === 'recon' ||
        p === 'artillery' ||
        p === 'rocket' ||
        p === 'anti_air' ||
        p === 'apc'
      );
    }
    if (t === 'cruiser') {
      return p === 'b_copter' || p === 't_copter' || p === 'copter';
    }
    if (t === 'blackboat') {
      return p === 'infantry' || p === 'mech';
    }
    return false;
  }

  public board(transport: TacticalUnit, passenger: TacticalUnit): { success: boolean; error?: string } {
    const cap = this.getCapacity(transport.unitCode);
    let manifest = this.manifests.get(transport.id);
    if (!manifest) {
      manifest = { transportUnitId: transport.id, capacity: cap, loadedPassengers: [] };
      this.manifests.set(transport.id, manifest);
    }

    if (manifest.loadedPassengers.length >= manifest.capacity) {
      return { success: false, error: 'El transporte se encuentra a máxima capacidad.' };
    }

    if (!this.canBoard(passenger.unitCode, transport.unitCode)) {
      return { success: false, error: 'Esta unidad no es compatible con el tipo de transporte.' };
    }

    // Persistencia bidireccional en las entidades TacticalUnit
    if (!transport.loadedUnitIds) transport.loadedUnitIds = [];
    if (!transport.loadedUnitIds.includes(passenger.id)) {
      transport.loadedUnitIds.push(passenger.id);
    }
    passenger.isLoadedInsideId = transport.id;
    passenger.x = transport.x;
    passenger.y = transport.y;
    passenger.hasMoved = true;
    passenger.hasActed = true;

    manifest.loadedPassengers.push(passenger);
    return { success: true };
  }

  public unload(
    transportOrId: TacticalUnit | string,
    passengerIndex: number,
    destination: GridPosition
  ): { success: boolean; passenger?: TacticalUnit; error?: string } {
    const transportId = typeof transportOrId === 'string' ? transportOrId : transportOrId.id;
    const manifest = this.manifests.get(transportId);
    if (!manifest || manifest.loadedPassengers.length === 0) {
      return { success: false, error: 'No hay unidades a bordo para desembarcar.' };
    }

    if (passengerIndex < 0 || passengerIndex >= manifest.loadedPassengers.length) {
      return { success: false, error: 'Índice de pasajero inválido.' };
    }

    const [passenger] = manifest.loadedPassengers.splice(passengerIndex, 1);
    passenger.isLoadedInsideId = null;
    passenger.x = destination.x;
    passenger.y = destination.y;
    passenger.hasMoved = true;
    passenger.hasActed = true;

    if (typeof transportOrId !== 'string' && transportOrId.loadedUnitIds) {
      transportOrId.loadedUnitIds = transportOrId.loadedUnitIds.filter(id => id !== passenger.id);
    }

    return { success: true, passenger };
  }

  public getPassengers(transportId: string): TacticalUnit[] {
    return this.manifests.get(transportId)?.loadedPassengers || [];
  }
}

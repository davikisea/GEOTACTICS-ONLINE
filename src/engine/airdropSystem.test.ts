/**
 * ==============================================================================
 * PRUEBAS UNITARIAS: SISTEMA CANÓNICO DE AIRDROPS Y DUELO ESPEJO (15S)
 * ==============================================================================
 * Proyecto: Tactical Command: Wars of Legacy
 * Especificación Canónica: docs/01_MASTER_GAME_DESIGN_DOCUMENT.md §7
 * Base de Datos: docs/04_MASTER_DATABASE_AND_SECURITY_SPEC.md §3.1 (claim_airdrop)
 */

import { AirDropEngine, DEFAULT_AIRDROP_CONFIG, AirDrop } from './airdropSystem';
import { MATCH_FORMAT_CONFIGS } from './autonomousOrchestrator';
import { TerrainTile } from '../types';

describe('Sistema Canónico de AirDrops (Dynamic Tactical Supply Drops)', () => {
  const createMockTile = (x: number, y: number, type: any, ownerId?: string): TerrainTile => ({
    x,
    y,
    type,
    defenseStars: 1,
    defenseBonus: 10,
    movementCost: { foot: 1, mech: 1, tires: 1, treads: 1, air: 1, ship: 99, transport: 99 },
    capturePoints: 20,
    ownerId,
  });

  const create10x10Grid = (): TerrainTile[][] => {
    const grid: TerrainTile[][] = [];
    for (let y = 0; y < 10; y++) {
      const row: TerrainTile[] = [];
      for (let x = 0; x < 10; x++) {
        let type = 'plains';
        let owner: string | undefined = undefined;
        if (x === 0 && y === 0) {
          type = 'hq';
          owner = 'p1';
        } else if (x === 9 && y === 9) {
          type = 'hq';
          owner = 'p2';
        }
        row.push(createMockTile(x, y, type, owner));
      }
      grid.push(row);
    }
    return grid;
  };

  it('debe calcular coordenadas de AirDrop estrictamente equidistantes entre los dos HQ (|D1 - D2| <= 1)', () => {
    const grid = create10x10Grid();
    const drop = AirDropEngine.calculateEquidistantDrop(10, 10, grid, [], [], 2);

    expect(drop).not.toBeNull();
    if (!drop) return;

    // Distancia Manhattan a HQ1 (0,0) y HQ2 (9,9)
    const distP1 = Math.abs(drop.x - 0) + Math.abs(drop.y - 0);
    const distP2 = Math.abs(drop.x - 9) + Math.abs(drop.y - 9);
    const diff = Math.abs(distP1 - distP2);

    expect(diff).toBeLessThanOrEqual(1);
    expect(drop.spawnTurn).toBe(2);
    expect(drop.expiresTurn).toBe(4);
    expect(drop.isClaimed).toBe(false);
  });

  it('no debe generar AirDrops sobre casillas intransitables (montañas, mar, HQ) ni ocupadas por tropas', () => {
    const grid = create10x10Grid();
    // Poner mar en casillas centrales
    grid[4][4].type = 'sea';
    grid[5][5].type = 'mountain';

    const units = [{ x: 4, y: 5 }, { x: 5, y: 4 }];
    const drop = AirDropEngine.calculateEquidistantDrop(10, 10, grid, units, [], 5);

    expect(drop).not.toBeNull();
    if (!drop) return;

    expect(grid[drop.y][drop.x].type).not.toBe('sea');
    expect(grid[drop.y][drop.x].type).not.toBe('mountain');
    expect(grid[drop.y][drop.x].type).not.toBe('hq');
    expect(units.some(u => u.x === drop.x && u.y === drop.y)).toBe(false);
  });

  it('debe asignar una recompensa válida según la tabla de botín (funds, co_power, gems)', () => {
    const grid = create10x10Grid();
    const drop = AirDropEngine.calculateEquidistantDrop(10, 10, grid, [], [], 2);

    expect(drop).not.toBeNull();
    if (!drop) return;

    expect(['funds', 'co_power', 'gems']).toContain(drop.rewardType);
    if (drop.rewardType === 'funds') {
      expect(drop.rewardValue).toBeGreaterThanOrEqual(2000);
      expect(drop.rewardValue).toBeLessThanOrEqual(3000);
    } else if (drop.rewardType === 'co_power') {
      expect(drop.rewardValue).toBe(100);
    } else if (drop.rewardType === 'gems') {
      expect(drop.rewardValue).toBe(15);
    }
  });

  it('debe rechazar reclamaciones si la unidad no está en la coordenada exacta del AirDrop', () => {
    const mockDrop: AirDrop = {
      id: 'drop_1',
      x: 4,
      y: 5,
      spawnTurn: 2,
      expiresTurn: 4,
      rewardType: 'funds',
      rewardValue: 2500,
      isClaimed: false,
    };

    const result = AirDropEngine.claimAirDrop(
      mockDrop,
      { id: 'unit_tank', ownerId: 'p1', x: 4, y: 6 }, // Casilla vecina
      'andy'
    );

    expect(result.success).toBe(false);
    expect(result.claimedDrop.isClaimed).toBe(false);
  });

  it('debe reclamar atómicamente el AirDrop cuando la unidad ocupa exactamente la casilla', () => {
    const mockDrop: AirDrop = {
      id: 'drop_1',
      x: 4,
      y: 5,
      spawnTurn: 2,
      expiresTurn: 4,
      rewardType: 'funds',
      rewardValue: 2500,
      isClaimed: false,
    };

    const result = AirDropEngine.claimAirDrop(
      mockDrop,
      { id: 'unit_tank', ownerId: 'p1', x: 4, y: 5 }, // Misma coordenada
      'andy'
    );

    expect(result.success).toBe(true);
    expect(result.claimedDrop.isClaimed).toBe(true);
    expect(result.claimedDrop.claimedByPlayerId).toBe('p1');
    expect(result.rewardMessage).toContain('+$2500G');
  });

  it('debe impedir una doble reclamación de un AirDrop ya capturado', () => {
    const mockDrop: AirDrop = {
      id: 'drop_1',
      x: 4,
      y: 5,
      spawnTurn: 2,
      expiresTurn: 4,
      rewardType: 'co_power',
      rewardValue: 100,
      isClaimed: true,
      claimedByPlayerId: 'p1',
    };

    const secondClaim = AirDropEngine.claimAirDrop(
      mockDrop,
      { id: 'unit_p2', ownerId: 'p2', x: 4, y: 5 },
      'colin'
    );

    expect(secondClaim.success).toBe(false);
    expect(secondClaim.claimedDrop.claimedByPlayerId).toBe('p1');
  });

  it('debe purgar AirDrops expirados tras 2 turnos de vigencia', () => {
    const drops: AirDrop[] = [
      { id: 'd1', x: 3, y: 3, spawnTurn: 2, expiresTurn: 4, rewardType: 'funds', rewardValue: 2000, isClaimed: false },
      { id: 'd2', x: 6, y: 6, spawnTurn: 5, expiresTurn: 7, rewardType: 'gems', rewardValue: 15, isClaimed: false },
      { id: 'd3', x: 2, y: 2, spawnTurn: 1, expiresTurn: 3, rewardType: 'funds', rewardValue: 2000, isClaimed: true },
    ];

    // En turno 4, d1 sigue activo (expiresTurn: 4)
    const turn4 = AirDropEngine.purgeExpiredDrops(drops, 4);
    expect(turn4.some(d => d.id === 'd1')).toBe(true);

    // En turno 5, d1 expiró
    const turn5 = AirDropEngine.purgeExpiredDrops(drops, 5);
    expect(turn5.some(d => d.id === 'd1')).toBe(false);
    expect(turn5.some(d => d.id === 'd2')).toBe(true); // d2 sigue vigente
    expect(turn5.some(d => d.id === 'd3')).toBe(true); // d3 está claimed, se conserva en historial
  });

  it('debe validar las reglas oficiales canónicas del formato Duelo Espejo (15s)', () => {
    const mirrorConfig = MATCH_FORMAT_CONFIGS.mirror_duel;
    expect(mirrorConfig).toBeDefined();
    expect(mirrorConfig.turnTimeLimitSec).toBe(15);
    expect(mirrorConfig.economyMultiplier).toBe(1.5);
    expect(mirrorConfig.maxTurnsLimit).toBe(12);
    expect(mirrorConfig.initialFundsBonus).toBe(3000);
  });
});

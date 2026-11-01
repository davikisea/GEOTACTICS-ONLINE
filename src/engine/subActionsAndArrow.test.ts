import { calculatePathArrow, getArrowSegmentCode, updateDynamicPath, areNeighbors } from './pathingArrow';
import { evaluateAvailableSubActions, isFootSoldier, isTransportUnit, canUnitBoardTransport } from './subActions';
import { GridPosition, TacticalUnit, TerrainTile } from '../types';

export interface SimpleTestResult {
  name: string;
  passed: boolean;
  message: string;
}

export function runSubActionsAndArrowSuite(): { total: number; passed: number; results: SimpleTestResult[] } {
  const results: SimpleTestResult[] = [];
  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, detail: string = '') {
    if (condition) {
      results.push({ name: desc, passed: true, message: detail });
      passed++;
    } else {
      results.push({ name: desc, passed: false, message: detail });
      failed++;
    }
  }

  // --- TEST 1: Canonical Path Arrow Segments ---
  const straightHorizontalPath: GridPosition[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ];
  const arrowH = calculatePathArrow(straightHorizontalPath);
  assert(
    'Cálculo de flecha horizontal recta (3 casillas este)',
    arrowH.length === 3 &&
      arrowH[0].rawCode === 'oe' && // start right
      arrowH[1].rawCode === 'ew' && // horizontal middle
      arrowH[2].rawCode === 'ed',   // head right
    `Segmentos obtenidos: ${arrowH.map(s => s.rawCode).join(' -> ')}`
  );

  const straightVerticalPath: GridPosition[] = [
    { x: 2, y: 0 },
    { x: 2, y: 1 },
    { x: 2, y: 2 },
  ];
  const arrowV = calculatePathArrow(straightVerticalPath);
  assert(
    'Cálculo de flecha vertical recta (3 casillas sur)',
    arrowV.length === 3 &&
      arrowV[0].rawCode === 'os' && // start down
      arrowV[1].rawCode === 'ns' && // vertical middle
      arrowV[2].rawCode === 'sd',   // head down
    `Segmentos obtenidos: ${arrowV.map(s => s.rawCode).join(' -> ')}`
  );

  // Corner turn: Right then Down (from (0,0) -> (1,0) -> (1,1))
  const cornerPath: GridPosition[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ];
  const arrowCorner = calculatePathArrow(cornerPath);
  assert(
    'Cálculo de flecha con giro en L (Este -> Sur)',
    arrowCorner.length === 3 &&
      arrowCorner[0].rawCode === 'oe' &&
      arrowCorner[1].type === 'corner_sw' &&
      arrowCorner[2].rawCode === 'sd',
    `Esquina detectada: ${arrowCorner[1].rawCode} (${arrowCorner[1].type})`
  );

  // Single tile path
  const singlePath: GridPosition[] = [{ x: 5, y: 5 }];
  const arrowSingle = calculatePathArrow(singlePath);
  assert(
    'Cálculo de flecha en casilla única (od / start_dot)',
    arrowSingle.length === 1 && arrowSingle[0].rawCode === 'od',
    `Código: ${arrowSingle[0].rawCode}`
  );

  // --- TEST 2: Dynamic Path Rewind & Append ---
  let dynamicPath: GridPosition[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ];

  // Hovering over (1,0) should rewind path back to (1,0)
  const rewound = updateDynamicPath(
    dynamicPath,
    { x: 1, y: 0 },
    () => 1,
    10,
    () => [{ x: 1, y: 0 }]
  );
  assert(
    'Rebobinado de trayectoria al hacer hover en casilla previa',
    rewound.length === 2 && rewound[1].x === 1 && rewound[1].y === 0,
    `Longitud tras rebobinar: ${rewound.length} casillas`
  );

  // Neighbor appending
  const appended = updateDynamicPath(
    rewound,
    { x: 1, y: 1 },
    () => 1,
    10,
    () => []
  );
  assert(
    'Extensión aditiva de trayectoria a casilla vecina transitable',
    appended.length === 3 && appended[2].x === 1 && appended[2].y === 1,
    `Trayectoria extendida: ${appended.map(p => `(${p.x},${p.y})`).join(' -> ')}`
  );

  // --- TEST 3: Evaluador de Sub-acciones (Wait, Attack, Capture, Silo, Join, Load) ---
  const mockTiles: TerrainTile[][] = Array.from({ length: 10 }, (_, y) =>
    Array.from({ length: 10 }, (_, x) => ({
      x,
      y,
      type: 'plains',
      defenseStars: 1,
    }))
  );
  mockTiles[2][2] = { x: 2, y: 2, type: 'city', defenseStars: 2, ownerId: 'enemy_p2', captureHp: 20 };
  mockTiles[4][4] = { x: 4, y: 4, type: 'silo', defenseStars: 3, captureHp: 20 };

  const infantry: TacticalUnit = {
    id: 'inf_1',
    unitCode: 'infantry',
    displayName: 'Infantería',
    ownerId: 'player_p1',
    x: 2,
    y: 1,
    hp: 10,
    maxHp: 10,
    ammo: 99,
    fuel: 99,
    movementPoints: 3,
    movementType: 'foot',
    minRange: 1,
    maxRange: 1,
    visionRange: 2,
    baseAttack: 55,
    productionCost: 1000,
    hasMoved: true,
    hasActed: false,
    skinId: 'default',
  };

  const enemyTank: TacticalUnit = {
    id: 'tank_enemy',
    unitCode: 'tank',
    displayName: 'Tanque Enemigo',
    ownerId: 'player_p2',
    x: 2,
    y: 3,
    hp: 8,
    maxHp: 10,
    ammo: 9,
    fuel: 70,
    movementPoints: 6,
    movementType: 'treads',
    minRange: 1,
    maxRange: 1,
    visionRange: 3,
    baseAttack: 75,
    productionCost: 7000,
    hasMoved: false,
    hasActed: false,
    skinId: 'default',
  };

  const unitsMap = new Map<string, TacticalUnit>();
  unitsMap.set(infantry.id, infantry);
  unitsMap.set(enemyTank.id, enemyTank);

  // Case 3A: Infantry moves to enemy city (2,2) with enemy tank adjacent at (2,3)
  const actionsInfCity = evaluateAvailableSubActions({
    unit: infantry,
    destination: { x: 2, y: 2 },
    hasMoved: true,
    tiles: mockTiles,
    unitsMap,
    gridWidth: 10,
    gridHeight: 10,
  });

  const hasCapture = actionsInfCity.some(a => a.type === 'capture');
  const hasAttack = actionsInfCity.some(a => a.type === 'attack');
  const hasWait = actionsInfCity.some(a => a.type === 'wait');

  assert(
    'Evaluación de Infantería sobre ciudad enemiga adyacente a tanque',
    hasCapture && hasAttack && hasWait,
    `Acciones detectadas: ${actionsInfCity.map(a => a.displayName).join(', ')}`
  );

  // Case 3B: Infantry on Missile Silo (4,4)
  const actionsInfSilo = evaluateAvailableSubActions({
    unit: infantry,
    destination: { x: 4, y: 4 },
    hasMoved: true,
    tiles: mockTiles,
    unitsMap,
    gridWidth: 10,
    gridHeight: 10,
  });
  const hasLaunchSilo = actionsInfSilo.some(a => a.type === 'launch_silo');
  assert(
    'Evaluación de Infantería sobre Silo de Misiles sin disparar',
    hasLaunchSilo,
    `Acciones detectadas: ${actionsInfSilo.map(a => a.displayName).join(', ')}`
  );

  // Case 3C: Join damaged unit
  const damagedInfantry: TacticalUnit = {
    ...infantry,
    id: 'inf_damaged',
    x: 1,
    y: 1,
    hp: 4,
  };
  unitsMap.set(damagedInfantry.id, damagedInfantry);

  const actionsJoin = evaluateAvailableSubActions({
    unit: infantry,
    destination: { x: 1, y: 1 },
    hasMoved: true,
    tiles: mockTiles,
    unitsMap,
    gridWidth: 10,
    gridHeight: 10,
  });
  assert(
    'Evaluación de Fusión (Join) sobre unidad aliada dañada',
    actionsJoin.length === 1 && actionsJoin[0].type === 'join',
    `Acción única retornada: ${actionsJoin[0].displayName}`
  );

  // Case 3D: Boarding APC (Load)
  const alliedAPC: TacticalUnit = {
    id: 'apc_ally',
    unitCode: 'apc',
    displayName: 'VTP Blindado',
    ownerId: 'player_p1',
    x: 0,
    y: 0,
    hp: 10,
    maxHp: 10,
    ammo: 0,
    fuel: 100,
    movementPoints: 6,
    movementType: 'treads',
    minRange: 0,
    maxRange: 0,
    visionRange: 1,
    baseAttack: 0,
    productionCost: 5000,
    hasMoved: false,
    hasActed: false,
    skinId: 'default',
  };
  unitsMap.set(alliedAPC.id, alliedAPC);

  const actionsLoad = evaluateAvailableSubActions({
    unit: infantry,
    destination: { x: 0, y: 0 },
    hasMoved: true,
    tiles: mockTiles,
    unitsMap,
    gridWidth: 10,
    gridHeight: 10,
  });
  assert(
    'Evaluación de Embarque (Load) de infantería en transporte APC',
    actionsLoad.length === 1 && actionsLoad[0].type === 'load',
    `Acción: ${actionsLoad[0].displayName}`
  );

  // --- TEST 4: PRUEBA DE ESTRÉS (1,000 caminos aleatorios y 1,000 evaluaciones) ---
  console.log('\n--- INICIANDO PRUEBA DE ESTRÉS (STRESS TEST 1,000 ITERACIONES) ---');
  const stressStart = performance.now();
  let stressSuccess = true;

  for (let i = 0; i < 1000; i++) {
    // Generate random valid orthogonal path bounded inside 10x10 map
    const len = Math.floor(Math.random() * 6) + 2;
    const startX = Math.floor(Math.random() * 8) + 1;
    const startY = Math.floor(Math.random() * 8) + 1;
    const path: GridPosition[] = [{ x: startX, y: startY }];

    for (let step = 1; step < len; step++) {
      const last = path[step - 1];
      const validNext: GridPosition[] = [
        { x: Math.min(9, Math.max(0, last.x + 1)), y: last.y },
        { x: Math.min(9, Math.max(0, last.x - 1)), y: last.y },
        { x: last.x, y: Math.min(9, Math.max(0, last.y + 1)) },
        { x: last.x, y: Math.min(9, Math.max(0, last.y - 1)) },
      ].filter(p => !(p.x === last.x && p.y === last.y));

      const chosen = validNext[Math.floor(Math.random() * validNext.length)];
      path.push(chosen);
    }

    // Arrow calculation must never crash and must have correct segment count
    const arrow = calculatePathArrow(path);
    if (arrow.length !== path.length) {
      stressSuccess = false;
      break;
    }

    // Sub-actions evaluation on a valid tile destination
    const dest = path[path.length - 1];
    const subActions = evaluateAvailableSubActions({
      unit: infantry,
      destination: dest,
      hasMoved: Math.random() > 0.5,
      tiles: mockTiles,
      unitsMap: new Map(), // empty map so tile is unoccupied
      gridWidth: 10,
      gridHeight: 10,
    });
    // Unoccupied valid tile must always return at least 'wait'
    if (subActions.length === 0 || !subActions.some(a => a.type === 'wait')) {
      stressSuccess = false;
      break;
    }
  }

  const stressDuration = Math.round(performance.now() - stressStart);
  assert(
    'Prueba de Estrés: 1,000 trayectorias y evaluaciones aleatorias completadas sin fallos',
    stressSuccess,
    `Ejecutadas 1,000 iteraciones en ${stressDuration}ms (${(stressDuration / 1000).toFixed(3)}ms por ciclo). Cero crashes ni fallos de invariantes.`
  );

  return {
    total: passed + failed,
    passed,
    results,
  };
}

// Auto-run if executed directly via node / tsx
if (process.argv[1] && process.argv[1].includes('subActionsAndArrow.test')) {
  const summary = runSubActionsAndArrowSuite();
  console.log(`\nRESUMEN PASO 1: ${summary.passed}/${summary.total} PASARON`);
  if (summary.passed < summary.total) {
    process.exit(1);
  }
}

import { DeckManager, PREDEFINED_DECKS } from './deckManager';
import { TurnEconomyEngine } from './turnEconomy';
import { TacticalUnit } from '../types';

export interface DeckTestResult {
  name: string;
  passed: boolean;
  message: string;
  durationMs?: number;
}

export function runDeckAndSupplySuite(): {
  total: number;
  passed: number;
  failed: number;
  results: DeckTestResult[];
  stressReport: {
    totalDeckValidations: number;
    totalSupplySimulations: number;
    avgValidationDurationMs: number;
    allTaxonomyInvariantsValid: boolean;
  };
} {
  console.log('==============================================================================');
  console.log('EJECUTANDO SUITE: CONSTRUCTOR DE MAZOS (10 CARTAS) & SUMINISTROS (SOFT CAP)');
  console.log('==============================================================================\n');

  const results: DeckTestResult[] = [];
  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, detail: string = '', durationMs?: number) {
    if (condition) {
      results.push({ name: desc, passed: true, message: detail, durationMs });
      passed++;
    } else {
      results.push({ name: desc, passed: false, message: detail || 'Aserción fallida', durationMs });
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Los 4 Arquetipos Canónicos Predefinidos son 100% Válidos
  // --------------------------------------------------------------------------
  try {
    for (const [key, deck] of Object.entries(PREDEFINED_DECKS)) {
      const val = DeckManager.validateDeck(deck.cards);
      assert(
        `Test 1.${key}: Arquetipo predefinido '${deck.name}' cumple la taxonomía reglamentaria`,
        val.isValid && val.errors.length === 0,
        `Arquetipo detectado: ${val.archetype}, Errores: ${val.errors.join('; ')}`
      );
    }
  } catch (err: any) {
    assert('Test 1: Error en arquetipos predefinidos', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Detección y Rechazo de Violaciones Taxonómicas
  // --------------------------------------------------------------------------
  try {
    // 2.1 Mazo con menos de 10 cartas
    const shortDeck = ['infantry', 'mech', 'recon', 'tank_light', 'anti_air'];
    const valShort = DeckManager.validateDeck(shortDeck);
    assert(
      'Test 2.1: Mazo con 5 cartas es rechazado',
      !valShort.isValid && valShort.errors.some(e => e.includes('10 cartas')),
      `Errores detectados: ${valShort.errors.join('; ')}`
    );

    // 2.2 Mazo sin Infantería Ligera obligatoria en Ranura 1
    const invalidSlot1 = ['recon', 'mech', 'tank_light', 'tank_medium', 'artillery', 'anti_air', 'b_copter', 'fighter', 'rocket', 'apc'];
    const valSlot1 = DeckManager.validateDeck(invalidSlot1);
    assert(
      'Test 2.2: Ranura 1 debe ser obligatoriamente Infantería Ligera (infantry)',
      !valSlot1.isValid && valSlot1.errors.some(e => e.includes('Ranura 1')),
      `Error: ${valSlot1.errors[0]}`
    );

    // 2.3 Mazo sin Infantería Mecanizada obligatoria en Ranura 2
    const invalidSlot2 = ['infantry', 'recon', 'tank_light', 'tank_medium', 'artillery', 'anti_air', 'b_copter', 'fighter', 'rocket', 'apc'];
    const valSlot2 = DeckManager.validateDeck(invalidSlot2);
    assert(
      'Test 2.3: Ranura 2 debe ser obligatoriamente Mecanizada (mech)',
      !valSlot2.isValid && valSlot2.errors.some(e => e.includes('Ranura 2')),
      `Error: ${valSlot2.errors[0]}`
    );

    // 2.4 Mazo con exceso de unidades super-pesadas (> 2)
    const excessSuperHeavy = ['infantry', 'mech', 'recon', 'tank_light', 'anti_air', 'neotank', 'bomber', 'battleship', 'artillery', 'b_copter'];
    const valSuperHeavy = DeckManager.validateDeck(excessSuperHeavy);
    assert(
      'Test 2.4: Mazo con 3 unidades super-pesadas (Neotanque, Bombardero, Acorazado) es rechazado',
      !valSuperHeavy.isValid && valSuperHeavy.errors.some(e => e.includes('super-pesadas')),
      `Error: ${valSuperHeavy.errors[0]}`
    );

    // 2.5 Mazo sin antiaéreo
    const noAntiAir = ['infantry', 'mech', 'recon', 'tank_light', 'tank_medium', 'artillery', 'b_copter', 't_copter', 'apc', 'rocket'];
    const valNoAA = DeckManager.validateDeck(noAntiAir);
    assert(
      'Test 2.5: Mazo sin cobertura antiaérea es rechazado',
      !valNoAA.isValid && valNoAA.errors.some(e => e.includes('antiaérea')),
      `Error: ${valNoAA.errors[0]}`
    );
  } catch (err: any) {
    assert('Test 2: Error en validaciones taxonómicas', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Filtrado de Fábrica según Mazo Activo (Sin Cooldowns)
  // --------------------------------------------------------------------------
  try {
    const activeDeck = PREDEFINED_DECKS.balanced.cards;
    const factoryDeployable = DeckManager.getDeployableUnitsForFacility(activeDeck, 'factory');
    const airportDeployable = DeckManager.getDeployableUnitsForFacility(activeDeck, 'airport');

    assert(
      'Test 3.1: En fábrica terrestre solo se despliegan las cartas terrestres del mazo',
      factoryDeployable.every(c => c.facility === 'factory'),
      `Unidades de fábrica: ${factoryDeployable.map(u => u.unitCode).join(', ')}`
    );

    assert(
      'Test 3.2: En aeródromo se despliegan Caza y Helicóptero del mazo',
      airportDeployable.some(c => c.unitCode === 'b_copter') && airportDeployable.some(c => c.unitCode === 'fighter'),
      `Unidades aéreas: ${airportDeployable.map(u => u.unitCode).join(', ')}`
    );
  } catch (err: any) {
    assert('Test 3: Filtrado de instalaciones', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Sostenibilidad Militar y Soft Cap de Suministros
  // --------------------------------------------------------------------------
  try {
    // 4.1 Hasta 14 unidades el coste de suministro es $0G
    const supply10 = DeckManager.calculateSupplyStatus(10);
    const supply14 = DeckManager.calculateSupplyStatus(14);
    assert(
      'Test 4.1: Con 10 o 14 unidades el coste de mantenimiento logístico es $0G (Suministro Pleno)',
      supply10.totalUpkeepG === 0 && supply14.totalUpkeepG === 0 && !supply14.isOverCapacity,
      `Upkeep 10: ${supply10.totalUpkeepG}G, Upkeep 14: ${supply14.totalUpkeepG}G`
    );

    // 4.2 Con 15 unidades (1 de exceso) el coste es $200G
    const supply15 = DeckManager.calculateSupplyStatus(15);
    assert(
      'Test 4.2: Con 15 unidades se aplica un impuesto de $200G/turno',
      supply15.totalUpkeepG === 200 && supply15.excessUnits === 1 && supply15.isOverCapacity,
      `Exceso: ${supply15.excessUnits}, Coste: ${supply15.totalUpkeepG}G`
    );

    // 4.3 Con 18 unidades (4 de exceso) el coste es $800G
    const supply18 = DeckManager.calculateSupplyStatus(18);
    assert(
      'Test 4.3: Con 18 unidades se aplica un impuesto de $800G/turno (Libertad Orgánica)',
      supply18.totalUpkeepG === 800 && supply18.excessUnits === 4,
      `Exceso: ${supply18.excessUnits}, Coste: ${supply18.totalUpkeepG}G`
    );
  } catch (err: any) {
    assert('Test 4: Sostenibilidad y Soft Cap', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Integración Económica de Turno con Soft Cap
  // --------------------------------------------------------------------------
  try {
    const mockUnits: TacticalUnit[] = [];
    for (let i = 0; i < 16; i++) {
      mockUnits.push({
        id: `u_${i}`,
        unitCode: 'infantry',
        displayName: 'Infantería',
        ownerId: 'p1',
        x: i % 4,
        y: Math.floor(i / 4),
        hp: 10,
        maxHp: 10,
        ammo: 9,
        fuel: 99,
        movementPoints: 3,
        movementType: 'foot',
        minRange: 1,
        maxRange: 1,
        visionRange: 3,
        baseAttack: 55,
        productionCost: 1000,
        hasMoved: false,
        hasActed: false,
        skinId: 'default',
      });
    }

    const upkeep = TurnEconomyEngine.calculateSupplyUpkeep('p1', mockUnits);
    assert(
      'Test 5.1: Con 16 unidades de P1, TurnEconomyEngine detecta sobrecapacidad y deduce $400G',
      upkeep.isOverCapacity && upkeep.excessUnits === 2 && upkeep.upkeepCost === 400,
      `Total: ${upkeep.totalUnits}, Exceso: ${upkeep.excessUnits}, Descuento: -${upkeep.upkeepCost}G`
    );
  } catch (err: any) {
    assert('Test 5: Integración económica con Soft Cap', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: PRUEBA DE ESTRÉS DE MAZOS Y LOGÍSTICA
  // --------------------------------------------------------------------------
  const startStress = performance.now();
  let totalValidations = 0;
  let totalSupplyCalculations = 0;

  try {
    const testDeck = PREDEFINED_DECKS.balanced.cards;

    // 1,000 validaciones de mazo
    for (let i = 0; i < 1000; i++) {
      DeckManager.validateDeck(testDeck);
      totalValidations++;
    }

    // 100 cálculos de abastecimiento militar
    for (let armySize = 0; armySize <= 50; armySize++) {
      DeckManager.calculateSupplyStatus(armySize);
      totalSupplyCalculations++;
    }

    const duration = performance.now() - startStress;
    const avgMs = duration / (totalValidations + totalSupplyCalculations);

    assert(
      `Test 6.1: 1,000 validaciones y cálculos completados en ${duration.toFixed(2)} ms`,
      duration < 25,
      `Tiempo medio por validación: ${avgMs.toFixed(4)} ms`
    );
  } catch (err: any) {
    assert('Test 6: Prueba de estrés', false, err.message);
  }

  const finalDuration = performance.now() - startStress;

  return {
    total: passed + failed,
    passed,
    failed,
    results,
    stressReport: {
      totalDeckValidations: totalValidations,
      totalSupplySimulations: totalSupplyCalculations,
      avgValidationDurationMs: Number((finalDuration / (totalValidations || 1)).toFixed(4)),
      allTaxonomyInvariantsValid: passed > 0 && failed === 0,
    },
  };
}

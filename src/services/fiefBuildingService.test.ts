import assert from 'node:assert';
import {
  fiefBuildingService,
  ClanTreasuryState,
  applyTacticalMarkEffects,
  calculateGeodesicDistanceKm,
} from './fiefBuildingService';
import {
  IndustrialEngine,
  IndustrialInventory,
  P2PMarketListing,
  StrandedCargo,
} from '../engine/industrialEngine';
import { TacticalMapMark } from '../types/tacticalRoadTypes';

console.log('==============================================================================');
console.log('TEST SUITE: SERVICIO DE FEUDOS URBANOS Y EDIFICIOS INDUSTRIALES');
console.log('==============================================================================');

// Test 1: Comprobar feudos iniciales en Cabimas
const fiefs = fiefBuildingService.getAllFiefs();
console.log(`[TEST 1] Feudos iniciales cargados en Cabimas: ${fiefs.length}`);
assert(fiefs.length >= 3, 'Deben existir al menos 3 feudos en Cabimas');

const salinaFief = fiefBuildingService.getFief('fief-cabimas-salina');
assert(salinaFief !== undefined, 'El feudo de La Salina debe existir');
assert(salinaFief.taxRatePercent === 10.0, 'El arancel municipal de La Salina debe ser 10.0%');
console.log('✅ [PASSED] Test 1: Feudos de Cabimas verificados con aranceles municipales.');

// Test 2: Comprobar edificios industriales iniciales en coordenadas
const buildings = fiefBuildingService.getAllBuildings();
console.log(`[TEST 2] Edificios industriales iniciales: ${buildings.length}`);
assert(buildings.length >= 5, 'Deben existir al menos 5 edificios semilleros');

const microchips = fiefBuildingService.getBuilding('bld-universidad-microchips');
assert(microchips !== undefined, 'El taller de microchips debe existir');
assert(microchips.buildingType === 'microchip_foundry');
console.log('✅ [PASSED] Test 2: Edificios industriales iniciales posicionados en coordenadas reales.');

// Test 3: Colocación de nuevo edificio con fondos suficientes y adyacencia a carretera
const treasury: ClanTreasuryState = { clanId: 'clan-ferro', energyCredits: 25000 };
const placeSuccess = fiefBuildingService.placeBuilding(
  {
    fiefId: 'fief-cabimas-centro',
    clanId: 'clan-ferro',
    buildingType: 'logistics_silo',
    location: [-71.448, 10.388], // En Cabimas Centro, adyacente a la Av. Miraflores
  },
  treasury
);

console.log('[TEST 3] Colocación válida en Cabimas Centro:', placeSuccess);
assert(placeSuccess.success === true, 'La colocación debe ser exitosa');
assert(placeSuccess.building?.buildingType === 'logistics_silo');
assert(treasury.energyCredits === 19000, 'Se debieron deducir 6000 EC del tesoro');
console.log('✅ [PASSED] Test 3: Validación y deducción de colocación adyacente a carretera exitosa.');

// Test 4: Rechazo de colocación por distancia excesiva a carretera (> 150m)
const placeFailDist = fiefBuildingService.placeBuilding(
  {
    fiefId: 'fief-cabimas-centro',
    clanId: 'clan-ferro',
    buildingType: 'radar_station',
    location: [-71.200, 10.100], // Coordenadas remotas sin carretera
  },
  treasury
);

console.log('[TEST 4] Rechazo por lejanía a carretera:', placeFailDist);
assert(placeFailDist.success === false, 'Debe rechazar colocación no adyacente a vía');
assert(placeFailDist.reason?.includes('adyacente a una carretera'), 'El motivo debe indicar lejanía vial');
console.log('✅ [PASSED] Test 4: Regla de adyacencia vial (<= 150m) validada estrictamente.');

// Test 5: Rechazo de colocación por fondos insuficientes
const poorTreasury: ClanTreasuryState = { clanId: 'clan-andes', energyCredits: 500 };
const placeFailFunds = fiefBuildingService.placeBuilding(
  {
    fiefId: 'fief-cabimas-salina',
    clanId: 'clan-andes',
    buildingType: 'refinery', // Cuesta 12000 EC
    location: [-71.458, 10.395],
  },
  poorTreasury
);

console.log('[TEST 5] Rechazo por fondos insuficientes:', placeFailFunds);
assert(placeFailFunds.success === false, 'Debe rechazar por falta de fondos');
console.log('✅ [PASSED] Test 5: Restricción presupuestaria de colocación comprobada.');

// Test 6: Ciclo horario de mantenimiento de edificios (Upkeep Tick)
const treasuriesMap = new Map<string, ClanTreasuryState>([
  ['clan-ferro', treasury],
  ['clan-orinoco', { clanId: 'clan-orinoco', energyCredits: 10000 }],
]);

const tickRes = fiefBuildingService.processHourlyBuildingTick(treasuriesMap);
console.log('[TEST 6] Resultado Upkeep Tick de Edificios:', tickRes);
assert(tickRes.operatingBuildingsCount >= 5, 'Los edificios con fondos deben continuar operando');
assert(tickRes.totalUpkeepDeducted > 0, 'Se debe haber cobrado upkeep');
console.log('✅ [PASSED] Test 6: Mantenimiento horario de estructuras industriales validado.');

// Test 7: Generación de GeoJSON para MapLibre GL
const geojson = fiefBuildingService.toGeoJSON();
assert(geojson.type === 'FeatureCollection');
assert(geojson.features.length >= 6);
console.log(`✅ [PASSED] Test 7: GeoJSON de estructuras industriales generado con ${geojson.features.length} features.`);

// ==============================================================================
// 1. EFECTOS FUNCIONALES REALES DE MARCAS WPLACE
// ==============================================================================

// Test 8: Marca de Mina Táctica (danger_mine)
const mineMark: TacticalMapMark = {
  id: 'mark-mine-1',
  clanId: 'clan-ferro',
  createdBy: 'commander-lead',
  markType: 'danger_mine',
  location: [-71.450, 10.390],
  colorHex: '#EF4444',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
};

// Convoy hostil a ~55m de la mina (< 200m)
const hostileCoordNear: [number, number] = [-71.4505, 10.390];
const effectHostileNear = applyTacticalMarkEffects(hostileCoordNear, [mineMark], 'clan-andes');
console.log('[TEST 8] Efecto mina sobre convoy hostil cercano:', effectHostileNear);
assert(effectHostileNear.damageInflicted === 400, 'Debe infligir 400 HP de daño a convoy hostil dentro de 200m');
assert(effectHostileNear.triggeredMarks?.length === 1, 'Debe registrar la mina como detonada');

// Convoy aliado a ~55m de su propia mina
const friendlyEffect = applyTacticalMarkEffects(hostileCoordNear, [mineMark], 'clan-ferro');
assert(friendlyEffect.damageInflicted === 0, 'Tropas del mismo clan no deben sufrir daño de sus propias minas');

// Convoy hostil lejos de la mina (> 200m, ej. ~550m)
const hostileCoordFar: [number, number] = [-71.455, 10.390];
const effectHostileFar = applyTacticalMarkEffects(hostileCoordFar, [mineMark], 'clan-andes');
assert(effectHostileFar.damageInflicted === 0, 'Convoy fuera del radio de 200m no debe sufrir daño');
console.log('✅ [PASSED] Test 8: Efecto de minas tácticas WPlace (400 HP daño < 200m) validado.');

// Test 9: Marca de Grito de Asalto (rally_strike)
const rallyMark: TacticalMapMark = {
  id: 'mark-rally-1',
  clanId: 'clan-ferro',
  createdBy: 'commander-lead',
  markType: 'rally_strike',
  location: [-71.450, 10.390],
  colorHex: '#F59E0B',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
};

// Tropa aliada a ~220m de la marca (< 500m)
const friendlyRallyCoord: [number, number] = [-71.452, 10.390];
const rallyEffect = applyTacticalMarkEffects(friendlyRallyCoord, [rallyMark], 'clan-ferro');
console.log('[TEST 9] Efecto rally strike sobre tropas aliadas:', rallyEffect);
assert(rallyEffect.attackBonusPercent === 10, 'Debe otorgar +10% de ataque a tropas del clan dentro de 500m');
assert(rallyEffect.moralBonusPercent === 10, 'Debe otorgar +10% de moral a tropas aliadas');

// Tropa enemiga no recibe el bono
const enemyRallyEffect = applyTacticalMarkEffects(friendlyRallyCoord, [rallyMark], 'clan-andes');
assert((enemyRallyEffect.attackBonusPercent || 0) === 0, 'Tropas enemigas no deben recibir el bono de ataque');

// Tropa aliada fuera del radio (> 500m)
const farFriendlyCoord: [number, number] = [-71.460, 10.390];
const farRallyEffect = applyTacticalMarkEffects(farFriendlyCoord, [rallyMark], 'clan-ferro');
assert((farRallyEffect.attackBonusPercent || 0) === 0, 'Tropas aliadas fuera de 500m no reciben bono');
console.log('✅ [PASSED] Test 9: Efecto de Rally Strike WPlace (+10% ataque < 500m) validado.');

// Test 10: Marca de Reconocimiento (recon)
const reconMark: TacticalMapMark = {
  id: 'mark-recon-1',
  clanId: 'clan-ferro',
  createdBy: 'scout-01',
  markType: 'recon',
  location: [-71.458, 10.395],
  colorHex: '#06B6D4',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
};

const reconEffect = applyTacticalMarkEffects([-71.458, 10.395], [reconMark], 'clan-ferro');
console.log('[TEST 10] Efecto reconocimiento:', reconEffect);
assert(reconEffect.fowRevealed === true, 'Debe disipar la niebla de guerra');
assert(reconEffect.revealedRadiusCells === 5, 'Debe revelar un radio de 5 celdas espaciales');
console.log('✅ [PASSED] Test 10: Efecto de Reconocimiento WPlace (revelación de 5 celdas) validado.');

// ==============================================================================
// 2. FRICCIÓN COMERCIAL, ARANCELES Y EMBARGOS EN FEUDOS
// ==============================================================================

// Test 11: Configuración de Arancel Aduanero Municipal (taxRatePercent de 0% a 25%)
const tariffRes = fiefBuildingService.setFiefTariff('fief-cabimas-salina', 'clan-ferro', 15.0);
console.log('[TEST 11] Configuración válida de arancel:', tariffRes);
assert(tariffRes.success === true, 'El clan controlador debe poder ajustar el arancel');
assert(tariffRes.updatedTaxRate === 15.0, 'El arancel debe actualizarse a 15%');

// Intento por clan no controlador
const unauthorizedTariff = fiefBuildingService.setFiefTariff('fief-cabimas-salina', 'clan-andes', 5.0);
assert(unauthorizedTariff.success === false, 'Debe rechazar cambios de arancel por clanes no controladores');

// Intento con tasa fuera de rango (> 25%)
const excessiveTariff = fiefBuildingService.setFiefTariff('fief-cabimas-salina', 'clan-ferro', 35.0);
assert(excessiveTariff.success === false, 'Debe rechazar aranceles superiores al 25%');
console.log('✅ [PASSED] Test 11: Reglas soberanas de configuración arancelaria (0-25%) comprobadas.');

// Test 12: Declaración y Levantamiento de Embargo Comercial
const embargoRes = fiefBuildingService.declareCommercialEmbargo('fief-cabimas-salina', 'clan-ferro', 'clan-andes');
console.log('[TEST 12] Declaración de embargo comercial:', embargoRes);
assert(embargoRes.success === true, 'El clan controlador debe poder declarar embargos');
assert(fiefBuildingService.isClanEmbargoed('fief-cabimas-salina', 'clan-andes') === true, 'clan-andes debe estar embargado');

// Auto-embargo rechazado
const selfEmbargo = fiefBuildingService.declareCommercialEmbargo('fief-cabimas-salina', 'clan-ferro', 'clan-ferro');
assert(selfEmbargo.success === false, 'Un clan no puede embargarse a sí mismo');
console.log('✅ [PASSED] Test 12: Declaración de embargo comercial entre clanes hostiles validada.');

// Test 13: Bloqueo de Descarga Portuaria y Cobro Coercitivo de Peaje
const andesTreasury: ClanTreasuryState = { clanId: 'clan-andes', energyCredits: 50000 };
const ferroTreasury: ClanTreasuryState = { clanId: 'clan-ferro', energyCredits: 10000 };
const orinocoTreasury: ClanTreasuryState = { clanId: 'clan-orinoco', energyCredits: 5000 };

// 1. Clan embargado intenta descargar en La Salina -> BLOQUEADO
const blockedDischarge = fiefBuildingService.canConvoyDischarge('fief-cabimas-salina', 'clan-andes', 2000, andesTreasury);
console.log('[TEST 13] Intento de descarga de clan embargado:', blockedDischarge);
assert(blockedDischarge.allowed === false, 'La descarga de un clan embargado debe ser bloqueada');
assert(blockedDischarge.isEmbargoed === true, 'El estado debe indicar embargo activo');

// 2. Clan controlador descarga con exención (0% arancel)
const ferroDischarge = fiefBuildingService.canConvoyDischarge('fief-cabimas-salina', 'clan-ferro', 2000, ferroTreasury);
assert(ferroDischarge.allowed === true, 'El clan soberano puede operar sin pagar peaje coercitivo');
assert(ferroDischarge.requiredTollEc === 0, 'Arancel interno debe ser 0 EC');

// 3. Clan foráneo autorizado paga peaje aduanero coercitivo (15% de 2000 EC = 300 EC)
const executeDischargeRes = fiefBuildingService.executeSeaportDischarge({
  fiefId: 'fief-cabimas-salina',
  convoyClanId: 'clan-orinoco',
  cargoValueEc: 2000,
  convoyTreasury: orinocoTreasury,
  controllingClanTreasury: ferroTreasury,
});
console.log('[TEST 13] Ejecución de descarga con arancel:', executeDischargeRes);
assert(executeDischargeRes.success === true, 'La descarga con peaje pagado debe procesarse');
assert(executeDischargeRes.feePaidEc === 300, 'Debe cobrar 300 EC de arancel aduanero');
assert(executeDischargeRes.netValueEc === 1700, 'El valor neto recibido debe ser 1700 EC');
assert(orinocoTreasury.energyCredits === 4700, 'Se debieron deducir 300 EC del convoy');
assert(ferroTreasury.energyCredits === 10300, 'El tesoro del clan soberano debe recibir los 300 EC');

// 4. Levantamiento de embargo restaura el derecho a comerciar pagando arancel
fiefBuildingService.liftCommercialEmbargo('fief-cabimas-salina', 'clan-ferro', 'clan-andes');
assert(fiefBuildingService.isClanEmbargoed('fief-cabimas-salina', 'clan-andes') === false);
const andesRestored = fiefBuildingService.canConvoyDischarge('fief-cabimas-salina', 'clan-andes', 1000, andesTreasury);
assert(andesRestored.allowed === true, 'Tras levantar el embargo, se permite la descarga');
assert(andesRestored.requiredTollEc === 150, 'Debe requerir el 15% de arancel');
console.log('✅ [PASSED] Test 13: Fricción comercial portuaria (embargo, peaje aduanero y soberanía) validada.');

// ==============================================================================
// 3. PURGA DEL BANCO CENTRAL NPC Y MECÁNICA DE CARGAMENTO VARADO (P2P)
// ==============================================================================

// Test 14: Purga de liquidez artificial NPC y retiro de cargamento varado al silo
const now = Date.now();
const staleMarketOrders: P2PMarketListing[] = [
  {
    id: 'listing-stale-001',
    sellerId: 'user-miner-01',
    sellerName: 'Comandante Acero',
    resourceType: 'refined_steel',
    quantity: 100,
    pricePerUnitGold: 50,
    totalPriceGold: 5000,
    taxDeductedGold: 600,
    netSellerRevenueGold: 4400,
    status: 'active',
    createdAt: now - 10 * 3600 * 1000, // 10 horas de antigüedad (> 6 horas)
  },
  {
    id: 'listing-fresh-002',
    sellerId: 'user-miner-02',
    sellerName: 'Comandante Silicio',
    resourceType: 'refined_microchip',
    quantity: 20,
    pricePerUnitGold: 120,
    totalPriceGold: 2400,
    taxDeductedGold: 288,
    netSellerRevenueGold: 2112,
    status: 'active',
    createdAt: now - 2 * 3600 * 1000, // 2 horas (orden reciente)
  },
];

// Comprobar que el NPC bot NO absorbe órdenes artificialmente
const botCheck = IndustrialEngine.fulfillStaleP2POrders(staleMarketOrders, now);
console.log('[TEST 14] Resultado purga bot NPC:', botCheck);
assert(botCheck.fulfilledCount === 0, 'El bot NPC NUNCA debe comprar órdenes ni inyectar liquidez artificial');
assert(botCheck.totalCreditsDisbursed === 0, 'No debe disbursar créditos artificiales');
assert(botCheck.strandedCount === 1, 'La orden de 10 horas debe pasar a estado varado (stranded)');
assert(botCheck.updatedListings[0].status === 'stranded', 'El estado de la orden debe ser stranded');
assert(botCheck.updatedListings[1].status === 'active', 'La orden reciente permanece activa');

// Retirar cargamento varado de regreso al silo con decay comercial real
const sellerInventory: IndustrialInventory = {
  userId: 'user-miner-01',
  rawIron: 0,
  rawStone: 0,
  rawRareEarth: 0,
  refinedSteel: 10,
  refinedConcrete: 0,
  refinedMicrochip: 0,
  campaignFuel: 0,
  specialization: 'none',
  lastHarvestAt: now,
};

const sellerStrandedCargo: StrandedCargo = {
  userId: 'user-miner-01',
  strandedIron: 0,
  strandedStone: 0,
  strandedRareEarth: 0,
  strandedFuel: 0,
  strandedSteel: 0,
};

// 10 horas de antigüedad = 4 horas de exceso sobre las 6h base
// Merma: 4h x 1.5% = 6% -> 6 unidades perdidas de 100, 94 devueltas al silo
// El 70% de 6 = 4 unidades transferidas a StrandedCargo
const withdrawRes = IndustrialEngine.withdrawListingToSilo(
  botCheck.updatedListings[0],
  sellerInventory,
  sellerStrandedCargo,
  now
);

console.log('[TEST 14] Retiro de orden varada al silo:', withdrawRes);
assert(withdrawRes.success === true, 'El retiro al silo debe ser exitoso');
assert(withdrawRes.returnedQuantity === 94, 'Debe devolver 94 unidades no mermadas al silo');
assert(withdrawRes.decayedQuantity === 6, 'Debe registrar 6 unidades mermadas por decay comercial');
assert(withdrawRes.updatedInventory?.refinedSteel === 104, 'Inventario: 10 previos + 94 devueltos = 104');
assert((withdrawRes.updatedStrandedCargo?.strandedSteel || 0) === 4, 'StrandedCargo debe resguardar 4 unidades');

// Recuperación de cargamento varado mediante victoria en combate
const recovered = IndustrialEngine.recoverStrandedCargo(
  withdrawRes.updatedInventory!,
  withdrawRes.updatedStrandedCargo!
);
assert((recovered.recoveredSteel || 0) === 4, 'Debe recuperar el cargamento varado en combate');
assert(recovered.updatedInventory.refinedSteel === 108, 'Inventario final con botín de combate: 108');
console.log('✅ [PASSED] Test 14: Purga de bot NPC, Cargamento Varado y decay comercial P2P validados.');

console.log('==============================================================================');
console.log('TODAS LAS PRUEBAS DE FEUDOS, MARCAS WPLACE Y ECONOMÍA COMPLETADAS (14/14)');
console.log('==============================================================================');

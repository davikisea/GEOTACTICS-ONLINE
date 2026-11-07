/**
 * ==============================================================================
 * SCRIPT DE SINCRONIZACIÓN Y GENERACIÓN DDL -> TYPESCRIPT (SSOT CATALOG SYNC)
 * ==============================================================================
 * Conforme a plan_catalog_ssot_synchronization.md
 * Extrae o compila las tablas maestras de catálogo desde PostgreSQL / Migraciones
 * y genera el bundle inmutable y tipado: src/engine/data/catalogs.generated.ts
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface UnitCatalogItem {
  id: string;
  name: string;
  category: string;
  productionCostG: number;
  hpMax: number;
  baseAttack: number;
  movementPoints: number;
  movementType: string;
  visionRange: number;
  minRange: number;
  maxRange: number;
  fuelMax: number;
  ammoMax: number;
  weightClass: string;
  primaryWeaponName?: string;
  secondaryWeaponName?: string;
}

interface TerrainCatalogItem {
  id: string;
  displayName: string;
  defenseStars: number;
  generatesFunds: number;
  isCapturable: boolean;
  healsLand: boolean;
  healsAir: boolean;
  healsSea: boolean;
  moveCosts: {
    foot?: number;
    mech?: number;
    wheels?: number;
    treads?: number;
    air?: number;
    sea?: number;
  };
}

interface FiefBuildingItem {
  type: string;
  name: string;
  initialCostEc: number;
  hourlyUpkeepEc: number;
  maxHp: number;
  allowedTerrainDistMeters: number;
  spriteName: string;
  description: string;
}

// ------------------------------------------------------------------------------
// CATÁLOGO BASE CANÓNICO RESGUARDADO EN MOTOR (SEED DE GENERACIÓN)
// ------------------------------------------------------------------------------
const CANONICAL_UNITS: UnitCatalogItem[] = [
  { id: 'infantry', name: 'Infantería Ligera', category: 'infantry', productionCostG: 1000, hpMax: 100, baseAttack: 55, movementPoints: 3, movementType: 'foot', visionRange: 2, minRange: 1, maxRange: 1, fuelMax: 99, ammoMax: 0, weightClass: 'mandatory_infantry', secondaryWeaponName: 'Fusil 9mm' },
  { id: 'mech', name: 'Infantería Pesada (Bazuca)', category: 'infantry', productionCostG: 3000, hpMax: 100, baseAttack: 65, movementPoints: 2, movementType: 'mech', visionRange: 2, minRange: 1, maxRange: 1, fuelMax: 70, ammoMax: 3, weightClass: 'mandatory_infantry', primaryWeaponName: 'Bazuca Antitanque', secondaryWeaponName: 'Ametralladora' },
  { id: 'recon', name: 'Blindado de Reconocimiento', category: 'vehicle', productionCostG: 4000, hpMax: 100, baseAttack: 70, movementPoints: 8, movementType: 'wheels', visionRange: 5, minRange: 1, maxRange: 1, fuelMax: 80, ammoMax: 0, weightClass: 'light_vehicle', secondaryWeaponName: 'Ametralladora Pesada' },
  { id: 'apc', name: 'Transporte Blindado APC', category: 'vehicle', productionCostG: 5000, hpMax: 100, baseAttack: 0, movementPoints: 6, movementType: 'treads', visionRange: 1, minRange: 1, maxRange: 1, fuelMax: 70, ammoMax: 0, weightClass: 'transport' },
  { id: 'tank_light', name: 'Tanque Ligero', category: 'vehicle', productionCostG: 7000, hpMax: 100, baseAttack: 75, movementPoints: 6, movementType: 'treads', visionRange: 3, minRange: 1, maxRange: 1, fuelMax: 70, ammoMax: 9, weightClass: 'direct_combat', primaryWeaponName: 'Cañón 75mm', secondaryWeaponName: 'Ametralladora Coaxial' },
  { id: 'tank_medium', name: 'Tanque Mediano', category: 'vehicle', productionCostG: 16000, hpMax: 100, baseAttack: 105, movementPoints: 5, movementType: 'treads', visionRange: 1, minRange: 1, maxRange: 1, fuelMax: 50, ammoMax: 8, weightClass: 'direct_combat', primaryWeaponName: 'Cañón Pesado 105mm', secondaryWeaponName: 'Ametralladora Coaxial' },
  { id: 'neotank', name: 'Neotanque Pesado', category: 'vehicle', productionCostG: 22000, hpMax: 100, baseAttack: 125, movementPoints: 6, movementType: 'treads', visionRange: 1, minRange: 1, maxRange: 1, fuelMax: 99, ammoMax: 9, weightClass: 'super_heavy', primaryWeaponName: 'Cañón Neofase', secondaryWeaponName: 'Ametralladora Pesada' },
  { id: 'artillery', name: 'Artillería de Obús Móvil', category: 'indirect', productionCostG: 6000, hpMax: 100, baseAttack: 80, movementPoints: 5, movementType: 'treads', visionRange: 1, minRange: 2, maxRange: 3, fuelMax: 50, ammoMax: 9, weightClass: 'indirect_fire', primaryWeaponName: 'Obús 155mm' },
  { id: 'rocket', name: 'Lanzacohetes de Asedio', category: 'indirect', productionCostG: 15000, hpMax: 100, baseAttack: 95, movementPoints: 5, movementType: 'wheels', visionRange: 1, minRange: 3, maxRange: 5, fuelMax: 50, ammoMax: 6, weightClass: 'indirect_fire', primaryWeaponName: 'Batería Cohetes' },
  { id: 'anti_air', name: 'Blindado Antiaéreo Vulcano', category: 'vehicle', productionCostG: 8000, hpMax: 100, baseAttack: 105, movementPoints: 6, movementType: 'treads', visionRange: 2, minRange: 1, maxRange: 1, fuelMax: 60, ammoMax: 9, weightClass: 'anti_air', primaryWeaponName: 'Cañón Vulcano 20mm' },
  { id: 'b_copter', name: 'Helicóptero de Ataque', category: 'aircraft', productionCostG: 9000, hpMax: 100, baseAttack: 75, movementPoints: 6, movementType: 'air', visionRange: 3, minRange: 1, maxRange: 1, fuelMax: 99, ammoMax: 6, weightClass: 'air_unit', primaryWeaponName: 'Misiles Aire-Tierra', secondaryWeaponName: 'Ametralladora Rotatoria' },
  { id: 'fighter', name: 'Caza de Supremacía Aérea', category: 'aircraft', productionCostG: 20000, hpMax: 100, baseAttack: 100, movementPoints: 9, movementType: 'air', visionRange: 4, minRange: 1, maxRange: 1, fuelMax: 99, ammoMax: 9, weightClass: 'air_unit', primaryWeaponName: 'Misiles Aire-Aire' },
  { id: 'bomber', name: 'Bombardero Táctico Pesado', category: 'aircraft', productionCostG: 22000, hpMax: 100, baseAttack: 110, movementPoints: 7, movementType: 'air', visionRange: 2, minRange: 1, maxRange: 1, fuelMax: 99, ammoMax: 9, weightClass: 'air_unit', primaryWeaponName: 'Bombas Guiadas' },
  { id: 'battleship', name: 'Acorazado Naval de Guerra', category: 'naval', productionCostG: 28000, hpMax: 100, baseAttack: 90, movementPoints: 5, movementType: 'sea', visionRange: 2, minRange: 2, maxRange: 6, fuelMax: 99, ammoMax: 9, weightClass: 'naval_unit', primaryWeaponName: 'Cañones Navales 406mm' },
];

const CANONICAL_TERRAINS: TerrainCatalogItem[] = [
  { id: 'plains', displayName: 'Llanura', defenseStars: 1, generatesFunds: 0, isCapturable: false, healsLand: false, healsAir: false, healsSea: false, moveCosts: { foot: 1, mech: 1, wheels: 2, treads: 1, air: 1 } },
  { id: 'forest', displayName: 'Bosque', defenseStars: 2, generatesFunds: 0, isCapturable: false, healsLand: false, healsAir: false, healsSea: false, moveCosts: { foot: 1, mech: 1, wheels: 3, treads: 2, air: 1 } },
  { id: 'mountain', displayName: 'Montaña', defenseStars: 4, generatesFunds: 0, isCapturable: false, healsLand: false, healsAir: false, healsSea: false, moveCosts: { foot: 2, mech: 1, air: 1 } },
  { id: 'road', displayName: 'Carretera', defenseStars: 0, generatesFunds: 0, isCapturable: false, healsLand: false, healsAir: false, healsSea: false, moveCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1 } },
  { id: 'river', displayName: 'Río', defenseStars: 0, generatesFunds: 0, isCapturable: false, healsLand: false, healsAir: false, healsSea: false, moveCosts: { foot: 2, mech: 1, air: 1 } },
  { id: 'city', displayName: 'Ciudad', defenseStars: 3, generatesFunds: 1000, isCapturable: true, healsLand: true, healsAir: false, healsSea: false, moveCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1 } },
  { id: 'factory', displayName: 'Fábrica Militar', defenseStars: 3, generatesFunds: 1000, isCapturable: true, healsLand: true, healsAir: false, healsSea: false, moveCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1 } },
  { id: 'airport', displayName: 'Base Aérea', defenseStars: 3, generatesFunds: 1000, isCapturable: true, healsLand: false, healsAir: true, healsSea: false, moveCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1 } },
  { id: 'port', displayName: 'Puerto Naval', defenseStars: 3, generatesFunds: 1000, isCapturable: true, healsLand: false, healsAir: false, healsSea: true, moveCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: 1 } },
  { id: 'hq', displayName: 'Cuartel General (HQ)', defenseStars: 4, generatesFunds: 1000, isCapturable: true, healsLand: true, healsAir: false, healsSea: false, moveCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1 } },
  { id: 'sea', displayName: 'Mar Abierto', defenseStars: 0, generatesFunds: 0, isCapturable: false, healsLand: false, healsAir: false, healsSea: false, moveCosts: { air: 1, sea: 1 } },
  { id: 'reef', displayName: 'Arrecife Coralino', defenseStars: 1, generatesFunds: 0, isCapturable: false, healsLand: false, healsAir: false, healsSea: false, moveCosts: { air: 1, sea: 2 } },
  { id: 'shoal', displayName: 'Bajío / Playa', defenseStars: 0, generatesFunds: 0, isCapturable: false, healsLand: false, healsAir: false, healsSea: false, moveCosts: { foot: 1, mech: 1, wheels: 1, treads: 1, air: 1, sea: 1 } },
];

const CANONICAL_FIEF_BUILDINGS: FiefBuildingItem[] = [
  { type: 'refinery', name: 'Refinería y Complejo Petroquímico', initialCostEc: 12000, hourlyUpkeepEc: 250, maxHp: 8000, allowedTerrainDistMeters: 150, spriteName: 'factory', description: 'Transforma crudo pesado y liviano en combustible sintético y polímeros.' },
  { type: 'microchip_foundry', name: 'Fundición de Microchips y Optoelectrónica', initialCostEc: 15000, hourlyUpkeepEc: 320, maxHp: 6500, allowedTerrainDistMeters: 150, spriteName: 'research', description: 'Purifica silicio óptico en microcircuitos C4ISR y giroscopios de puntería.' },
  { type: 'weapons_factory', name: 'Fábrica de Armamento y Chasis Táctico', initialCostEc: 18000, hourlyUpkeepEc: 400, maxHp: 10000, allowedTerrainDistMeters: 150, spriteName: 'armory', description: 'Ensambla placas blindadas compuestas y torretas para tanques y artillería.' },
  { type: 'logistics_silo', name: 'Silo Logístico y Depósito de Suministros', initialCostEc: 8000, hourlyUpkeepEc: 150, maxHp: 12000, allowedTerrainDistMeters: 150, spriteName: 'warehouse', description: 'Almacena hasta 50,000 unidades de recursos en adyacencia a carreteras.' },
  { type: 'radar_station', name: 'Estación de Radar EW y Detección Térmica', initialCostEc: 9500, hourlyUpkeepEc: 190, maxHp: 4000, allowedTerrainDistMeters: 150, spriteName: 'radar', description: 'Disipa niebla de guerra en 400 metros a la redonda e intercepta transmisiones enemigas.' },
  { type: 'seaport_terminal', name: 'Terminal Portuario de Ultramar', initialCostEc: 25000, hourlyUpkeepEc: 450, maxHp: 12000, allowedTerrainDistMeters: 150, spriteName: 'seaport', description: 'Nodo costero para exportación e importación masiva de commodities y combustible.' },
];

async function generateCatalogs() {
  console.log('🔄 Sincronizando catálogos canónicos de base de datos...');

  const bundleData = {
    units: CANONICAL_UNITS,
    terrains: CANONICAL_TERRAINS,
    fiefBuildings: CANONICAL_FIEF_BUILDINGS,
    generatedAt: new Date().toISOString(),
  };

  const rawJson = JSON.stringify(bundleData);
  const bundleHash = crypto.createHash('sha256').update(rawJson).digest('hex');
  const versionTag = `v1.0.0-${bundleHash.substring(0, 8)}`;

  const outputContent = `/**
 * ==============================================================================
 * CATÁLOGOS CANÓNICOS ESTÁTICOS GENERADOS (AUTO-GENERATED • DO NOT EDIT DIRECTLY)
 * ==============================================================================
 * Generado por scripts/syncCatalogsFromDb.ts
 * Hash SHA-256: ${bundleHash}
 * Versión: ${versionTag}
 * ==============================================================================
 */

export const CATALOG_MANIFEST_METADATA = {
  versionTag: '${versionTag}',
  contentHash: '${bundleHash}',
  generatedAt: '${bundleData.generatedAt}',
} as const;

export interface GeneratedUnitSpec {
  id: string;
  name: string;
  category: string;
  productionCostG: number;
  hpMax: number;
  baseAttack: number;
  movementPoints: number;
  movementType: string;
  visionRange: number;
  minRange: number;
  maxRange: number;
  fuelMax: number;
  ammoMax: number;
  weightClass: string;
  primaryWeaponName?: string;
  secondaryWeaponName?: string;
}

export interface GeneratedTerrainSpec {
  id: string;
  displayName: string;
  defenseStars: number;
  generatesFunds: number;
  isCapturable: boolean;
  healsLand: boolean;
  healsAir: boolean;
  healsSea: boolean;
  moveCosts: {
    foot?: number;
    mech?: number;
    wheels?: number;
    treads?: number;
    air?: number;
    sea?: number;
  };
}

export interface GeneratedFiefBuildingSpec {
  type: string;
  name: string;
  initialCostEc: number;
  hourlyUpkeepEc: number;
  maxHp: number;
  allowedTerrainDistMeters: number;
  spriteName: string;
  description: string;
}

export const GENERATED_UNITS_CATALOG: Record<string, GeneratedUnitSpec> = {
${CANONICAL_UNITS.map(
  (u) => `  '${u.id}': ${JSON.stringify(u, null, 2).replace(/\n/g, '\n  ')},`
).join('\n')}
} as const;

export const GENERATED_TERRAINS_CATALOG: Record<string, GeneratedTerrainSpec> = {
${CANONICAL_TERRAINS.map(
  (t) => `  '${t.id}': ${JSON.stringify(t, null, 2).replace(/\n/g, '\n  ')},`
).join('\n')}
} as const;

export const GENERATED_FIEF_BUILDINGS_CATALOG: Record<string, GeneratedFiefBuildingSpec> = {
${CANONICAL_FIEF_BUILDINGS.map(
  (b) => `  '${b.type}': ${JSON.stringify(b, null, 2).replace(/\n/g, '\n  ')},`
).join('\n')}
} as const;
`;

  const outputDir = path.resolve('src/shared/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'catalogs.generated.ts');
  fs.writeFileSync(outputPath, outputContent, 'utf-8');

  console.log(`✅ Catálogos generados con éxito en: ${outputPath}`);
  console.log(`📦 Hash: ${bundleHash} | Versión: ${versionTag}`);
}

generateCatalogs().catch((err) => {
  console.error('❌ Error generando catálogos:', err);
  process.exit(1);
});

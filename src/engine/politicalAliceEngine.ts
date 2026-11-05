/**
 * ==============================================================================
 * ARQUITECTURA DE SEPARACIÓN EN 3 CAPAS & MOTOR POLÍTICO PROJECT ALICE (MVP)
 * ==============================================================================
 * Especificación Canónica:
 * - docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md
 * - docs/PLAN_MAESTRO_REESTRUCTURACION_HEGEMONIA.md
 * - docs/02_MASTER_METAGAME_INDUSTRY_ECONOMY.md
 * - docs/03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md
 * - supabase/migrations/20261104000001_geotactics_alpha_siege_and_venezuela_seed.sql
 *
 * CAPA 1 (ACTIVA - MVP): Metajuego Geopolítico & Macroeconomía (Victoria 3 × Stellaris
 *   × Project Alice) sobre el Mapa OpenPlace en la Zona de Pruebas (Teatro Venezuela:
 *   24 estados soberanos jugables + 7 zonas buffer fronterizas).
 * CAPA 2 (DESHABILITADA EN MVP): Combate Táctico en Cuadrícula (Advance Wars 1-100 HP).
 *   Las operaciones de asedio, consolidación de soberanía y presión militar se resuelven
 *   de forma autónoma y determinista en la Capa 1 sin abrir el tablero táctico.
 * CAPA 3 (SUJETO DE PRUEBA ÚNICO + AUTO-OPTIMIZACIÓN): Bark Engine operado exclusivamente
 *   con la Mayor Stella ('stella') como sujeto de prueba con bucle de telemetría
 *   auto-optimizable de pesos y enfriamientos.
 * ==============================================================================
 */

import {
  GeotacticsRegion,
  GeotacticsRegionAdjacency,
  GeotacticsRegionSovereignty,
  WorldCountry,
  WorldProvince,
  TerritoryNode,
  TerritoryAdjacency,
  TerritoryControlState,
  TOPOLOGY_FLAGS,
  MASTER_METAGAME_CONSTANTS,
} from '../types/metagame';
import {
  calculateImperialUpkeep,
  calculateRgoRegionalYield,
  ImperialUpkeepBreakdown,
} from './upkeepEngine';
import {
  traceSupplyLine,
  validateSupplyLineConnectivity,
} from './worldMapEngine';

// ============================================================================
// 1. CONFIGURACIÓN CANÓNICA DE LAS 3 CAPAS DEL SISTEMA
// ============================================================================

export interface ThreeLayerArchitectureConfig {
  layer1PoliticalMetagame: {
    enabled: boolean;
    activeTheaterIso: string;
    activeTheaterName: string;
    playableRegionsCount: number;
    bufferRegionsCount: number;
    imperialCapRegions: number;
    overexpansionExponent: number;
  };
  layer2TacticalCombat: {
    enabled: boolean;
    disabledReason: string;
    resolutionMode: 'alice_political_autoresolve';
  };
  layer3BarkEngine: {
    enabled: boolean;
    singleTestSubjectCommanderId: 'stella';
    singleTestSubjectName: string;
    selfOptimizationEnabled: boolean;
  };
}

export const THREE_LAYER_ARCHITECTURE: ThreeLayerArchitectureConfig = {
  layer1PoliticalMetagame: {
    enabled: true,
    activeTheaterIso: 'VE',
    activeTheaterName: 'Teatro Inicial Fase 1 — República de Venezuela',
    playableRegionsCount: 24,
    bufferRegionsCount: 7,
    imperialCapRegions: 6, // K_Límite_Imperial = 6 en Isla de Pruebas (Escala a 12 global)
    overexpansionExponent: 1.8,
  },
  layer2TacticalCombat: {
    enabled: false,
    disabledReason:
      'CAPA 2 (Combate Táctico Advance Wars) deshabilitada en el MVP Político. Las operaciones territoriales se resuelven mediante el Motor Geopolítico Project Alice sobre el mapa.',
    resolutionMode: 'alice_political_autoresolve',
  },
  layer3BarkEngine: {
    enabled: true,
    singleTestSubjectCommanderId: 'stella',
    singleTestSubjectName: 'Mayor Stella (Sujeto de Prueba C4ISR #01)',
    selfOptimizationEnabled: true,
  },
};

// ============================================================================
// 2. FACCIONES Y CORPORACIONES GEOPOLÍTICAS EN EL TEATRO VENEZUELA
// ============================================================================

export interface GeopoliticalFaction {
  id: string;
  name: string;
  tag: string;
  emblem: string;
  color: string;
  doctrine: string;
  diplomaticStance: 'allied' | 'rival' | 'neutral' | 'embargoed';
  influenceScore: number;
}

export const VENEZUELA_FACTION_REGISTRY: Record<string, GeopoliticalFaction> = {
  'clan-ferro': {
    id: 'clan-ferro',
    name: 'Iron Vanguard Syndicate',
    tag: 'IVS',
    emblem: '🛡️',
    color: '#3B82F6', // Azul C4ISR Aliado
    doctrine: 'Hegemonía Industrial & Blindaje Pesado',
    diplomaticStance: 'allied',
    influenceScore: 1850,
  },
  'clan-orinoco': {
    id: 'clan-orinoco',
    name: 'Consorcio Siderúrgico del Orinoco',
    tag: 'CSO',
    emblem: '⚙️',
    color: '#F59E0B', // Ámbar Industrial
    doctrine: 'Monopolio de Bauxita, Hierro y Cruces Fluviales',
    diplomaticStance: 'rival',
    influenceScore: 1420,
  },
  'clan-caribe': {
    id: 'clan-caribe',
    name: 'Flota Mercante del Caribe',
    tag: 'FMC',
    emblem: '⚓',
    color: '#10B981', // Esmeralda Naval
    doctrine: 'Control de Estrechos Marítimos y Refinerías Costeras',
    diplomaticStance: 'neutral',
    influenceScore: 1290,
  },
  'clan-andes': {
    id: 'clan-andes',
    name: 'Frente Balístico de los Andes',
    tag: 'FBA',
    emblem: '⛰️',
    color: '#EF4444', // Rojo Hostil
    doctrine: 'Fortificación de Alta Montaña y Guerra de Desgaste',
    diplomaticStance: 'rival',
    influenceScore: 1360,
  },
};

// ============================================================================
// 3. EDICTOS POLÍTICOS ESTILO VICTORIA 3 / STELLARIS (PROJECT ALICE)
// ============================================================================

export type PoliticalEdictId =
  | 'edict_forced_industrialization'
  | 'edict_c4isr_energy_subsidy'
  | 'edict_border_martial_law'
  | 'edict_maritime_customs_tariff'
  | 'edict_diplomatic_pacification';

export interface PoliticalEdict {
  id: PoliticalEdictId;
  name: string;
  category: 'economy' | 'military' | 'diplomacy';
  costEc: number;
  upkeepEcPerCycle: number;
  rgoYieldMultiplier: number;
  siegeAttackBonus: number;
  siegeDefenseBonus: number;
  upkeepReductionMultiplier: number;
  description: string;
}

export const POLITICAL_EDICTS_CATALOG: PoliticalEdict[] = [
  {
    id: 'edict_forced_industrialization',
    name: 'Plan Quinquenal de Extracción RGO',
    category: 'economy',
    costEc: 350,
    upkeepEcPerCycle: 60,
    rgoYieldMultiplier: 1.30,
    siegeAttackBonus: 0,
    siegeDefenseBonus: -0.05,
    upkeepReductionMultiplier: 1.0,
    description: '+30% rendimiento de materias primas RGO en todas las regiones controladas; -5% defensa de búnker por fatiga industrial.',
  },
  {
    id: 'edict_c4isr_energy_subsidy',
    name: 'Racionalización de Red Eléctrica Guri-C4ISR',
    category: 'economy',
    costEc: 300,
    upkeepEcPerCycle: 30,
    rgoYieldMultiplier: 1.05,
    siegeAttackBonus: 0,
    siegeDefenseBonus: 0.05,
    upkeepReductionMultiplier: 0.78,
    description: 'Reduce un 22% el drenaje de energía por Sobre-Expansión Imperial (Exponente 1.8) y +5% eficiencia RGO.',
  },
  {
    id: 'edict_border_martial_law',
    name: 'Doctrina de Asedio y Cerco Estratégico',
    category: 'military',
    costEc: 400,
    upkeepEcPerCycle: 75,
    rgoYieldMultiplier: 0.95,
    siegeAttackBonus: 0.35,
    siegeDefenseBonus: 0.25,
    upkeepReductionMultiplier: 1.0,
    description: '+35% potencia de erosión de TCP en ofensivas políticas y +25% blindaje de guarnición en fronteras.',
  },
  {
    id: 'edict_maritime_customs_tariff',
    name: 'Soberanía Aduanera de Estrechos (Maracaibo & Paria)',
    category: 'diplomacy',
    costEc: 250,
    upkeepEcPerCycle: 25,
    rgoYieldMultiplier: 1.15,
    siegeAttackBonus: 0.10,
    siegeDefenseBonus: 0.10,
    upkeepReductionMultiplier: 0.92,
    description: 'Maximiza la recaudación arancelaria en CHK-MARACAIBO y CHK-PARIA (+15% ingresos comerciales y +10% proyección anfibia).',
  },
  {
    id: 'edict_diplomatic_pacification',
    name: 'Consolidación Jurídica De Jure Acelerada',
    category: 'diplomacy',
    costEc: 450,
    upkeepEcPerCycle: 50,
    rgoYieldMultiplier: 1.10,
    siegeAttackBonus: 0.15,
    siegeDefenseBonus: 0.30,
    upkeepReductionMultiplier: 0.90,
    description: 'Permite consolidar territorios ocupados (De Facto -> De Jure) de forma acelerada y refuerza +30% la estabilidad de TCP.',
  },
];

// ============================================================================
// 4. SEED CANÓNICO DE LAS 31 REGIONES DEL TEATRO VENEZUELA (24 + 7 BUFFERS)
// ============================================================================

export const CANONICAL_VENEZUELA_REGIONS: GeotacticsRegion[] = [
  // 24 Entidades Federales Jugables (isPlayable = true)
  { id: 'REG_VE_01', countryIso: 'VE', name: 'Distrito Capital - Caracas', biome: 'BIO-URB', isPlayable: true, isNationalCapital: true, isCapturable: true, centerX: 50.0, centerY: 20.0, primaryCommodity: 'petroquimica_fina', resourceTier: 5, baseHourlyYield: 800, baseEnergyUpkeepEc: 300, maxBuildingSlots: 16 },
  { id: 'REG_VE_02', countryIso: 'VE', name: 'Zulia - Maracaibo', biome: 'BIO-PLA', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 20.0, centerY: 25.0, primaryCommodity: 'crudo_ligero', resourceTier: 4, baseHourlyYield: 600, baseEnergyUpkeepEc: 250, maxBuildingSlots: 14 },
  { id: 'REG_VE_03', countryIso: 'VE', name: 'Bolívar - Ciudad Guayana', biome: 'BIO-HGH', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 70.0, centerY: 70.0, primaryCommodity: 'hierro_bauxita', resourceTier: 5, baseHourlyYield: 750, baseEnergyUpkeepEc: 280, maxBuildingSlots: 14 },
  { id: 'REG_VE_04', countryIso: 'VE', name: 'Anzoátegui - Barcelona/PLC', biome: 'BIO-PLA', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 65.0, centerY: 30.0, primaryCommodity: 'crudo_pesado', resourceTier: 4, baseHourlyYield: 550, baseEnergyUpkeepEc: 220, maxBuildingSlots: 12 },
  { id: 'REG_VE_05', countryIso: 'VE', name: 'Carabobo - Valencia/Pto. Cabello', biome: 'BIO-URB', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 42.0, centerY: 24.0, primaryCommodity: 'ensamblaje_mec', resourceTier: 4, baseHourlyYield: 580, baseEnergyUpkeepEc: 240, maxBuildingSlots: 14 },
  { id: 'REG_VE_06', countryIso: 'VE', name: 'Miranda - Valles del Tuy', biome: 'BIO-PLA', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 55.0, centerY: 23.0, primaryCommodity: 'manufactura_ligera', resourceTier: 3, baseHourlyYield: 400, baseEnergyUpkeepEc: 160, maxBuildingSlots: 10 },
  { id: 'REG_VE_07', countryIso: 'VE', name: 'Lara - Barquisimeto', biome: 'BIO-PLA', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 33.0, centerY: 28.0, primaryCommodity: 'nudo_ferroviario', resourceTier: 3, baseHourlyYield: 420, baseEnergyUpkeepEc: 170, maxBuildingSlots: 12 },
  { id: 'REG_VE_08', countryIso: 'VE', name: 'Aragua - Maracay', biome: 'BIO-URB', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 46.0, centerY: 25.0, primaryCommodity: 'blindaje_aereo', resourceTier: 3, baseHourlyYield: 450, baseEnergyUpkeepEc: 180, maxBuildingSlots: 12 },
  { id: 'REG_VE_09', countryIso: 'VE', name: 'Táchira - San Cristóbal', biome: 'BIO-HGH', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 18.0, centerY: 48.0, primaryCommodity: 'carbon_aduanero', resourceTier: 3, baseHourlyYield: 380, baseEnergyUpkeepEc: 150, maxBuildingSlots: 10 },
  { id: 'REG_VE_10', countryIso: 'VE', name: 'Mérida - Cordillera Andina', biome: 'BIO-HGH', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 23.0, centerY: 42.0, primaryCommodity: 'silicio_optico', resourceTier: 3, baseHourlyYield: 350, baseEnergyUpkeepEc: 140, maxBuildingSlots: 8 },
  { id: 'REG_VE_11', countryIso: 'VE', name: 'Falcón - Paraguaná', biome: 'BIO-PLA', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 32.0, centerY: 15.0, primaryCommodity: 'refinacion_crp', resourceTier: 4, baseHourlyYield: 520, baseEnergyUpkeepEc: 210, maxBuildingSlots: 12 },
  { id: 'REG_VE_12', countryIso: 'VE', name: 'Monagas - Maturín', biome: 'BIO-PLA', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 73.0, centerY: 33.0, primaryCommodity: 'gas_natural', resourceTier: 4, baseHourlyYield: 500, baseEnergyUpkeepEc: 200, maxBuildingSlots: 10 },
  { id: 'REG_VE_13', countryIso: 'VE', name: 'Sucre - Cumaná/Golfo de Paria', biome: 'BIO-ARC-ISL', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 73.0, centerY: 22.0, primaryCommodity: 'astillero_naval', resourceTier: 3, baseHourlyYield: 420, baseEnergyUpkeepEc: 170, maxBuildingSlots: 10 },
  { id: 'REG_VE_14', countryIso: 'VE', name: 'Nueva Esparta - Margarita', biome: 'BIO-ARC-ISL', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 68.0, centerY: 13.0, primaryCommodity: 'radar_zonafranca', resourceTier: 2, baseHourlyYield: 300, baseEnergyUpkeepEc: 120, maxBuildingSlots: 8 },
  { id: 'REG_VE_15', countryIso: 'VE', name: 'Barinas - Llanos Altos', biome: 'BIO-PLA', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 28.0, centerY: 46.0, primaryCommodity: 'agropecuaria_crudo', resourceTier: 3, baseHourlyYield: 380, baseEnergyUpkeepEc: 150, maxBuildingSlots: 10 },
  { id: 'REG_VE_16', countryIso: 'VE', name: 'Portuguesa - Acarigua', biome: 'BIO-PLA', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 34.0, centerY: 38.0, primaryCommodity: 'biocombustibles', resourceTier: 3, baseHourlyYield: 390, baseEnergyUpkeepEc: 155, maxBuildingSlots: 10 },
  { id: 'REG_VE_17', countryIso: 'VE', name: 'Guárico - Calabozo/San Juan', biome: 'BIO-PLA', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 50.0, centerY: 38.0, primaryCommodity: 'satelital_canteras', resourceTier: 3, baseHourlyYield: 410, baseEnergyUpkeepEc: 165, maxBuildingSlots: 10 },
  { id: 'REG_VE_18', countryIso: 'VE', name: 'Trujillo - Andes Centrales', biome: 'BIO-HGH', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 26.0, centerY: 34.0, primaryCommodity: 'silice_cemento', resourceTier: 2, baseHourlyYield: 280, baseEnergyUpkeepEc: 110, maxBuildingSlots: 8 },
  { id: 'REG_VE_19', countryIso: 'VE', name: 'Yaracuy - San Felipe', biome: 'BIO-PLA', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 37.0, centerY: 23.0, primaryCommodity: 'cobre_fertilizantes', resourceTier: 2, baseHourlyYield: 300, baseEnergyUpkeepEc: 120, maxBuildingSlots: 8 },
  { id: 'REG_VE_20', countryIso: 'VE', name: 'Cojedes - San Carlos', biome: 'BIO-PLA', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 41.0, centerY: 34.0, primaryCommodity: 'pastizales_roca', resourceTier: 2, baseHourlyYield: 290, baseEnergyUpkeepEc: 115, maxBuildingSlots: 8 },
  { id: 'REG_VE_21', countryIso: 'VE', name: 'Apure - San Fernando', biome: 'BIO-PLA', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 38.0, centerY: 56.0, primaryCommodity: 'eje_fluvial', resourceTier: 2, baseHourlyYield: 310, baseEnergyUpkeepEc: 125, maxBuildingSlots: 8 },
  { id: 'REG_VE_22', countryIso: 'VE', name: 'Delta Amacuro - Caños Orinoco', biome: 'BIO-ARC-ISL', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 84.0, centerY: 40.0, primaryCommodity: 'bauxita_delta', resourceTier: 3, baseHourlyYield: 370, baseEnergyUpkeepEc: 150, maxBuildingSlots: 8 },
  { id: 'REG_VE_23', countryIso: 'VE', name: 'Amazonas - Puerto Ayacucho', biome: 'BIO-JGL', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 46.0, centerY: 80.0, primaryCommodity: 'tierras_raras', resourceTier: 3, baseHourlyYield: 360, baseEnergyUpkeepEc: 140, maxBuildingSlots: 6 },
  { id: 'REG_VE_24', countryIso: 'VE', name: 'Guayana Esequiba - Zona Reclamación', biome: 'BIO-JGL', isPlayable: true, isNationalCapital: false, isCapturable: true, centerX: 88.0, centerY: 56.0, primaryCommodity: 'oro_diamantes', resourceTier: 4, baseHourlyYield: 520, baseEnergyUpkeepEc: 200, maxBuildingSlots: 10 },

  // 7 Zonas de Amortiguación Fronteriza (isPlayable = false)
  { id: 'BUF_CO_01', countryIso: 'CO', name: 'Norte de Santander (Cúcuta)', biome: 'BIO-HGH', isPlayable: false, isNationalCapital: false, isCapturable: false, centerX: 10.0, centerY: 49.0, primaryCommodity: 'mineral_metalico', resourceTier: 3, baseHourlyYield: 200, baseEnergyUpkeepEc: 100, maxBuildingSlots: 8 },
  { id: 'BUF_CO_02', countryIso: 'CO', name: 'La Guajira (Maicao)', biome: 'BIO-PLA', isPlayable: false, isNationalCapital: false, isCapturable: false, centerX: 12.0, centerY: 16.0, primaryCommodity: 'mineral_metalico', resourceTier: 2, baseHourlyYield: 200, baseEnergyUpkeepEc: 100, maxBuildingSlots: 8 },
  { id: 'BUF_CO_03', countryIso: 'CO', name: 'Arauca (Arauquita)', biome: 'BIO-PLA', isPlayable: false, isNationalCapital: false, isCapturable: false, centerX: 26.0, centerY: 63.0, primaryCommodity: 'mineral_metalico', resourceTier: 2, baseHourlyYield: 200, baseEnergyUpkeepEc: 100, maxBuildingSlots: 8 },
  { id: 'BUF_BR_01', countryIso: 'BR', name: 'Roraima (Pacaraima / Boa Vista)', biome: 'BIO-JGL', isPlayable: false, isNationalCapital: false, isCapturable: false, centerX: 68.0, centerY: 88.0, primaryCommodity: 'tierras_raras', resourceTier: 3, baseHourlyYield: 200, baseEnergyUpkeepEc: 100, maxBuildingSlots: 8 },
  { id: 'BUF_GY_01', countryIso: 'GY', name: 'Demerara (Georgetown)', biome: 'BIO-PLA', isPlayable: false, isNationalCapital: false, isCapturable: false, centerX: 95.0, centerY: 50.0, primaryCommodity: 'bauxita_delta', resourceTier: 3, baseHourlyYield: 200, baseEnergyUpkeepEc: 100, maxBuildingSlots: 8 },
  { id: 'BUF_TT_01', countryIso: 'TT', name: 'Trinidad & Tobago', biome: 'BIO-ARC-ISL', isPlayable: false, isNationalCapital: false, isCapturable: false, centerX: 83.0, centerY: 18.0, primaryCommodity: 'astillero_naval', resourceTier: 3, baseHourlyYield: 200, baseEnergyUpkeepEc: 100, maxBuildingSlots: 8 },
  { id: 'BUF_CW_01', countryIso: 'CW', name: 'Antillas Neerlandesas (Curazao/Aruba)', biome: 'BIO-ARC-ISL', isPlayable: false, isNationalCapital: false, isCapturable: false, centerX: 36.0, centerY: 6.0, primaryCommodity: 'radar_zonafranca', resourceTier: 2, baseHourlyYield: 200, baseEnergyUpkeepEc: 100, maxBuildingSlots: 8 },
];

const RAW_VENEZUELA_ADJACENCIES: Omit<GeotacticsRegionAdjacency, 'id'>[] = [
  // Nudo Capital Central
  { fromRegionId: 'REG_VE_01', toRegionId: 'REG_VE_06', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 25, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_01', toRegionId: 'REG_VE_08', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 45, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_08', toRegionId: 'REG_VE_05', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 50, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_08', toRegionId: 'REG_VE_17', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 75, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_06', toRegionId: 'REG_VE_17', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 80, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_06', toRegionId: 'REG_VE_04', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 120, transitRounds: 1, tollFeePercent: 0 },

  // Centro-Occidente
  { fromRegionId: 'REG_VE_05', toRegionId: 'REG_VE_19', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 45, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_05', toRegionId: 'REG_VE_20', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 55, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_19', toRegionId: 'REG_VE_07', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 40, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_19', toRegionId: 'REG_VE_11', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 90, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_07', toRegionId: 'REG_VE_16', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 60, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_07', toRegionId: 'REG_VE_18', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 70, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_07', toRegionId: 'REG_VE_11', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 110, transitRounds: 1, tollFeePercent: 0 },

  // Noroccidente y Lago de Maracaibo (CHK-MARACAIBO: flag 20 = coastal 4 + strait_choke 16)
  { fromRegionId: 'REG_VE_11', toRegionId: 'REG_VE_02', topologyFlags: 20, chokeControllingRegionId: 'REG_VE_02', distanceKm: 95, transitRounds: 1, tollFeePercent: 5.0 },
  { fromRegionId: 'REG_VE_02', toRegionId: 'REG_VE_18', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 85, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_02', toRegionId: 'REG_VE_10', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 110, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_02', toRegionId: 'REG_VE_09', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 140, transitRounds: 1, tollFeePercent: 0 },

  // Eje Andino
  { fromRegionId: 'REG_VE_18', toRegionId: 'REG_VE_10', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 50, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_18', toRegionId: 'REG_VE_15', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 80, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_10', toRegionId: 'REG_VE_09', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 65, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_10', toRegionId: 'REG_VE_15', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 75, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_09', toRegionId: 'REG_VE_15', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 90, transitRounds: 1, tollFeePercent: 0 },

  // Llanos Occidentales y Centrales (33 = land_open 1 + river_crossing 32)
  { fromRegionId: 'REG_VE_16', toRegionId: 'REG_VE_20', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 50, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_16', toRegionId: 'REG_VE_15', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 65, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_20', toRegionId: 'REG_VE_17', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 70, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_15', toRegionId: 'REG_VE_21', topologyFlags: 33, chokeControllingRegionId: null, distanceKm: 110, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_17', toRegionId: 'REG_VE_21', topologyFlags: 33, chokeControllingRegionId: null, distanceKm: 95, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_17', toRegionId: 'REG_VE_04', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 130, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_17', toRegionId: 'REG_VE_03', topologyFlags: 33, chokeControllingRegionId: null, distanceKm: 150, transitRounds: 1, tollFeePercent: 0 },

  // Oriente, Sur y Delta
  { fromRegionId: 'REG_VE_04', toRegionId: 'REG_VE_12', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 70, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_04', toRegionId: 'REG_VE_13', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 85, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_04', toRegionId: 'REG_VE_03', topologyFlags: 33, chokeControllingRegionId: null, distanceKm: 90, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_12', toRegionId: 'REG_VE_13', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 65, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_12', toRegionId: 'REG_VE_22', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 75, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_12', toRegionId: 'REG_VE_03', topologyFlags: 33, chokeControllingRegionId: null, distanceKm: 85, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_13', toRegionId: 'REG_VE_14', topologyFlags: 4, chokeControllingRegionId: null, distanceKm: 40, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_22', toRegionId: 'REG_VE_03', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 95, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_22', toRegionId: 'REG_VE_24', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 130, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_03', toRegionId: 'REG_VE_24', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 160, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_03', toRegionId: 'REG_VE_23', topologyFlags: 1, chokeControllingRegionId: null, distanceKm: 180, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_21', toRegionId: 'REG_VE_23', topologyFlags: 33, chokeControllingRegionId: null, distanceKm: 140, transitRounds: 1, tollFeePercent: 0 },

  // Adyacencias Internacionales / Zonas de Amortiguación (3 = land_open 1 + national_border 2; 20 = coastal 4 + strait_choke 16)
  { fromRegionId: 'REG_VE_09', toRegionId: 'BUF_CO_01', topologyFlags: 3, chokeControllingRegionId: null, distanceKm: 25, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_02', toRegionId: 'BUF_CO_02', topologyFlags: 3, chokeControllingRegionId: null, distanceKm: 40, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_21', toRegionId: 'BUF_CO_03', topologyFlags: 3, chokeControllingRegionId: null, distanceKm: 30, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_03', toRegionId: 'BUF_BR_01', topologyFlags: 3, chokeControllingRegionId: null, distanceKm: 80, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_24', toRegionId: 'BUF_GY_01', topologyFlags: 3, chokeControllingRegionId: null, distanceKm: 90, transitRounds: 1, tollFeePercent: 0 },
  { fromRegionId: 'REG_VE_13', toRegionId: 'BUF_TT_01', topologyFlags: 20, chokeControllingRegionId: 'REG_VE_13', distanceKm: 45, transitRounds: 1, tollFeePercent: 4.0 },
  { fromRegionId: 'REG_VE_11', toRegionId: 'BUF_CW_01', topologyFlags: 4, chokeControllingRegionId: null, distanceKm: 70, transitRounds: 1, tollFeePercent: 0 },
];

export const CANONICAL_VENEZUELA_ADJACENCIES: GeotacticsRegionAdjacency[] =
  RAW_VENEZUELA_ADJACENCIES.map((adj, idx) => ({
    id: `ADJ_VE_${idx + 1}`,
    ...adj,
  }));

// ============================================================================
// 5. ESTADO PERSISTENTE DEL MOTOR POLÍTICO PROJECT ALICE
// ============================================================================

export interface PoliticalOperationLogEntry {
  id: string;
  timestamp: string;
  type: 'siege' | 'conquest' | 'consolidation' | 'edict' | 'toll' | 'economy' | 'buffer_blocked';
  regionId?: string;
  headline: string;
  detail: string;
}

export interface PoliticalAliceState {
  playerClanId: string;
  energyCells: number;
  industrialSteel: number;
  rareEarth: number;
  politicalInfluence: number;
  cycleCount: number;
  activeEdictIds: PoliticalEdictId[];
  chokepointTolls: {
    'CHK-MARACAIBO': number; // 0.0% a 10.0% (Controlado por REG_VE_02 Zulia)
    'CHK-PARIA': number;     // 0.0% a 10.0% (Controlado por REG_VE_13 Sucre)
  };
  sovereigntyMap: Record<string, GeotacticsRegionSovereignty>;
  operationLogs: PoliticalOperationLogEntry[];
}

const POLITICAL_STORAGE_KEY = 'geotactics_venezuela_political_state_v1';

/**
 * Distribución geopolítica inicial en el Teatro Venezuela para que el MVP
 * sea inmediatamente jugable, con fronteras activas, estrechos y disputas.
 */
function buildInitialSovereigntyMap(): Record<string, GeotacticsRegionSovereignty> {
  const map: Record<string, GeotacticsRegionSovereignty> = {};

  // Eje Central-Occidental bajo mando inicial del jugador ('clan-ferro' - Iron Vanguard)
  const playerInitialRegions = new Set([
    'REG_VE_01', // Caracas (Capital Nacional)
    'REG_VE_05', // Carabobo
    'REG_VE_06', // Miranda
    'REG_VE_08', // Aragua
    'REG_VE_17', // Guárico
  ]);

  // Eje Sur-Oriental ('clan-orinoco' - Consorcio Siderúrgico del Orinoco)
  const orinocoRegions = new Set([
    'REG_VE_03', // Bolívar
    'REG_VE_04', // Anzoátegui
    'REG_VE_12', // Monagas
    'REG_VE_22', // Delta Amacuro
    'REG_VE_23', // Amazonas
    'REG_VE_24', // Guayana Esequiba
  ]);

  // Eje Costero-Insular ('clan-caribe' - Flota Mercante del Caribe)
  const caribeRegions = new Set([
    'REG_VE_02', // Zulia (Controla CHK-MARACAIBO)
    'REG_VE_11', // Falcón
    'REG_VE_13', // Sucre (Controla CHK-PARIA)
    'REG_VE_14', // Nueva Esparta
    'REG_VE_19', // Yaracuy
    'REG_VE_07', // Lara
  ]);

  // Eje Andino-Llanero ('clan-andes' - Frente Balístico de los Andes)
  const andesRegions = new Set([
    'REG_VE_09', // Táchira
    'REG_VE_10', // Mérida
    'REG_VE_15', // Barinas
    'REG_VE_16', // Portuguesa
    'REG_VE_18', // Trujillo
    'REG_VE_20', // Cojedes
    'REG_VE_21', // Apure
  ]);

  for (const reg of CANONICAL_VENEZUELA_REGIONS) {
    const maxTcp = reg.isNationalCapital
      ? MASTER_METAGAME_CONSTANTS.CAPITAL_TCP_THRESHOLD
      : MASTER_METAGAME_CONSTANTS.STANDARD_TCP_THRESHOLD;

    let ownerClanId: string | null = null;
    let controllerClanId: string | null = null;
    let status: GeotacticsRegionSovereignty['status'] = 'stable';
    let currentTcp = maxTcp;

    if (!reg.isPlayable) {
      ownerClanId = null;
      controllerClanId = null;
    } else if (playerInitialRegions.has(reg.id)) {
      ownerClanId = 'clan-ferro';
      controllerClanId = 'clan-ferro';
    } else if (orinocoRegions.has(reg.id)) {
      ownerClanId = 'clan-orinoco';
      controllerClanId = 'clan-orinoco';
    } else if (caribeRegions.has(reg.id)) {
      ownerClanId = 'clan-caribe';
      controllerClanId = 'clan-caribe';
    } else if (andesRegions.has(reg.id)) {
      ownerClanId = 'clan-andes';
      controllerClanId = 'clan-andes';
    }

    // Crear 2 frentes calientes iniciales para demostrar Dual Sovereignty y Asedio en vivo
    if (reg.id === 'REG_VE_20') {
      // Cojedes en asedio fronterizo activo con Carabobo/Guárico
      status = 'under_siege';
      currentTcp = 6500;
    } else if (reg.id === 'REG_VE_04') {
      // Anzoátegui con desgaste en la cuenca oriental
      status = 'under_siege';
      currentTcp = 7000;
    }

    const nowIso = new Date().toISOString();
    map[reg.id] = {
      regionId: reg.id,
      ownerClanId,
      controllerClanId,
      controlPoints: currentTcp,
      maxControlPoints: maxTcp,
      bunkerLevel: reg.isNationalCapital ? 3 : 1,
      status,
      customsEscrowLocked: status === 'occupied_grace',
      isEnergyStarved: false,
      activeBattleId: null,
      cooldownExpiresAt: null,
      graceExpiresAt: null,
      lastTickAt: nowIso,
      updatedAt: nowIso,
    };
  }

  return map;
}

export class PoliticalAliceEngine {
  private static instance: PoliticalAliceEngine;
  private state: PoliticalAliceState;
  private listeners: Set<(state: PoliticalAliceState) => void> = new Set();

  private constructor() {
    this.state = this.loadState();
  }

  public static getInstance(): PoliticalAliceEngine {
    if (!PoliticalAliceEngine.instance) {
      PoliticalAliceEngine.instance = new PoliticalAliceEngine();
    }
    return PoliticalAliceEngine.instance;
  }

  private loadState(): PoliticalAliceState {
    try {
      const raw = localStorage.getItem(POLITICAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PoliticalAliceState;
        if (parsed && parsed.sovereigntyMap && parsed.sovereigntyMap['REG_VE_01']) {
          return parsed;
        }
      }
    } catch {
      // Fallback al estado canónico inicial
    }

    return this.createDefaultState();
  }

  public createDefaultState(): PoliticalAliceState {
    return {
      playerClanId: 'clan-ferro',
      energyCells: 2800,
      industrialSteel: 420,
      rareEarth: 160,
      politicalInfluence: 350,
      cycleCount: 1,
      activeEdictIds: ['edict_c4isr_energy_subsidy'],
      chokepointTolls: {
        'CHK-MARACAIBO': 5.0,
        'CHK-PARIA': 4.0,
      },
      sovereigntyMap: buildInitialSovereigntyMap(),
      operationLogs: [
        {
          id: 'op_boot_1',
          timestamp: new Date().toLocaleTimeString(),
          type: 'economy',
          regionId: 'REG_VE_01',
          headline: 'TEATRO VENEZUELA INICIALIZADO (CAPA 1 ACTIVA)',
          detail:
            '24 Entidades Federales soberanas y 7 Zonas de Amortiguación sincronizadas bajo topología Project Alice. Combate táctico (Capa 2) deshabilitado.',
        },
      ],
    };
  }

  private saveState(): void {
    try {
      localStorage.setItem(POLITICAL_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Ignorar errores de cuota en modo privado
    }
    this.listeners.forEach(cb => cb(this.state));
  }

  public subscribe(listener: (state: PoliticalAliceState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): PoliticalAliceState {
    return this.state;
  }

  public resetTheaterState(): PoliticalAliceState {
    this.state = this.createDefaultState();
    this.saveState();
    return this.state;
  }

  /**
   * Devuelve la lista completa de las 31 regiones del Teatro Venezuela.
   */
  public getRegions(): GeotacticsRegion[] {
    return CANONICAL_VENEZUELA_REGIONS;
  }

  public getRegionById(regionId: string): GeotacticsRegion | undefined {
    return CANONICAL_VENEZUELA_REGIONS.find(r => r.id === regionId);
  }

  public getAdjacencies(): GeotacticsRegionAdjacency[] {
    return CANONICAL_VENEZUELA_ADJACENCIES;
  }

  /**
   * Calcula las métricas macroeconómicas e imperiales en vivo (Victoria 3 / Stellaris / Alice).
   */
  public getEmpireMetrics(clanId: string = this.state.playerClanId): {
    controlledRegions: GeotacticsRegion[];
    deJureRegions: GeotacticsRegion[];
    occupiedGraceRegions: GeotacticsRegion[];
    controlsNationalCapital: boolean;
    controlsMaracaiboChoke: boolean;
    controlsPariaChoke: boolean;
    upkeepBreakdown: ImperialUpkeepBreakdown;
    hourlyEcGrossYield: number;
    hourlyTollRevenueEc: number;
    edictUpkeepEc: number;
    netEcPerCycle: number;
    supplyConnectedMap: Record<string, boolean>;
  } {
    const controlledRegions = CANONICAL_VENEZUELA_REGIONS.filter(
      r => r.isPlayable && this.state.sovereigntyMap[r.id]?.controllerClanId === clanId
    );
    const deJureRegions = CANONICAL_VENEZUELA_REGIONS.filter(
      r => r.isPlayable && this.state.sovereigntyMap[r.id]?.ownerClanId === clanId
    );
    const occupiedGraceRegions = CANONICAL_VENEZUELA_REGIONS.filter(
      r =>
        r.isPlayable &&
        this.state.sovereigntyMap[r.id]?.controllerClanId === clanId &&
        this.state.sovereigntyMap[r.id]?.ownerClanId !== clanId
    );

    const controlsNationalCapital =
      this.state.sovereigntyMap['REG_VE_01']?.controllerClanId === clanId;
    const controlsMaracaiboChoke =
      this.state.sovereigntyMap['REG_VE_02']?.controllerClanId === clanId;
    const controlsPariaChoke =
      this.state.sovereigntyMap['REG_VE_13']?.controllerClanId === clanId;

    const activeEdicts = POLITICAL_EDICTS_CATALOG.filter(e =>
      this.state.activeEdictIds.includes(e.id)
    );

    const rgoEdictMultiplier = activeEdicts.reduce((acc, e) => acc * e.rgoYieldMultiplier, 1.0);
    const upkeepEdictMultiplier = activeEdicts.reduce(
      (acc, e) => acc * e.upkeepReductionMultiplier,
      1.0
    );

    const rawUpkeep = calculateImperialUpkeep(
      controlledRegions.map(r => ({
        regionId: r.id,
        baseEnergyUpkeepEc: r.baseEnergyUpkeepEc,
        bunkerLevel: this.state.sovereigntyMap[r.id]?.bunkerLevel ?? 1,
      })),
      this.state.energyCells,
      THREE_LAYER_ARCHITECTURE.layer1PoliticalMetagame.imperialCapRegions
    );

    const adjustedTotalUpkeep = Number(
      (rawUpkeep.totalUpkeepEc * upkeepEdictMultiplier).toFixed(2)
    );

    const upkeepBreakdown: ImperialUpkeepBreakdown = {
      ...rawUpkeep,
      totalUpkeepEc: adjustedTotalUpkeep,
      willTriggerEnergyStarvation: this.state.energyCells < adjustedTotalUpkeep,
    };

    // Conectividad logística BFS hacia la capital o nodo primario del clan
    const controlledSet = new Set(controlledRegions.map(r => r.id));
    const capitalIds = controlsNationalCapital
      ? ['REG_VE_01']
      : controlledRegions.length > 0
      ? [controlledRegions[0].id]
      : [];

    const supplyConnectedMap: Record<string, boolean> = {};
    let hourlyEcGrossYield = 0;

    for (const reg of controlledRegions) {
      const sov = this.state.sovereigntyMap[reg.id];
      const supplyCheck = validateSupplyLineConnectivity(
        reg.id,
        capitalIds,
        controlledSet,
        CANONICAL_VENEZUELA_ADJACENCIES
      );
      supplyConnectedMap[reg.id] = supplyCheck.isConnected;

      const yieldVal = calculateRgoRegionalYield({
        baseHourlyYield: reg.baseHourlyYield,
        resourceTier: reg.resourceTier,
        isEnergyStarved: Boolean(sov?.isEnergyStarved),
        controlsNationalCapital,
        hasSupplyLineToCapital: supplyCheck.isConnected,
      });

      hourlyEcGrossYield += Math.round(yieldVal * rgoEdictMultiplier);
    }

    // Ingresos por Peajes de Estrechos Estratégicos (CHK-MARACAIBO y CHK-PARIA)
    let hourlyTollRevenueEc = 0;
    if (controlsMaracaiboChoke) {
      hourlyTollRevenueEc += Math.round(this.state.chokepointTolls['CHK-MARACAIBO'] * 38);
    }
    if (controlsPariaChoke) {
      hourlyTollRevenueEc += Math.round(this.state.chokepointTolls['CHK-PARIA'] * 32);
    }

    const edictUpkeepEc = activeEdicts.reduce((sum, e) => sum + e.upkeepEcPerCycle, 0);
    const netEcPerCycle = Math.round(
      hourlyEcGrossYield + hourlyTollRevenueEc - adjustedTotalUpkeep - edictUpkeepEc
    );

    return {
      controlledRegions,
      deJureRegions,
      occupiedGraceRegions,
      controlsNationalCapital,
      controlsMaracaiboChoke,
      controlsPariaChoke,
      upkeepBreakdown,
      hourlyEcGrossYield,
      hourlyTollRevenueEc,
      edictUpkeepEc,
      netEcPerCycle,
      supplyConnectedMap,
    };
  }

  /**
   *Verifica si una región objetivo es adyacente a algún territorio controlado por el clan atacante.
   */
  public findOriginAdjacentRegion(
    targetRegionId: string,
    attackerClanId: string = this.state.playerClanId
  ): {
    valid: boolean;
    originRegionId: string | null;
    adjacency: GeotacticsRegionAdjacency | null;
    reason?: string;
  } {
    const targetRegion = this.getRegionById(targetRegionId);
    if (!targetRegion) {
      return { valid: false, originRegionId: null, adjacency: null, reason: 'Región inexistente en la topología.' };
    }

    // Regla de Candado de Fase 1 (Buffer Zones no jugables)
    if (!targetRegion.isPlayable) {
      return {
        valid: false,
        originRegionId: null,
        adjacency: null,
        reason: 'SECTOR FUERA DEL TEATRO OPERACIONAL DE FASE 1 (ACTIVO: REPÚBLICA DE VENEZUELA)',
      };
    }

    for (const adj of CANONICAL_VENEZUELA_ADJACENCIES) {
      const isForward = adj.fromRegionId === targetRegionId;
      const isBackward = adj.toRegionId === targetRegionId;
      if (!isForward && !isBackward) continue;

      if ((adj.topologyFlags & TOPOLOGY_FLAGS.IMPASSIBLE) !== 0) continue;

      const neighborId = isForward ? adj.toRegionId : adj.fromRegionId;
      const neighborSov = this.state.sovereigntyMap[neighborId];
      if (neighborSov && neighborSov.controllerClanId === attackerClanId) {
        return {
          valid: true,
          originRegionId: neighborId,
          adjacency: adj,
        };
      }
    }

    return {
      valid: false,
      originRegionId: null,
      adjacency: null,
      reason: 'Infracción Topológica: Necesitas controlar una región limítrofe adyacente para proyectar soberanía.',
    };
  }

  /**
   * Calcula la línea de suministro Bresenham entre la Capital/Origen y la región objetivo.
   */
  public getBresenhamSupplyVector(fromRegionId: string, toRegionId: string): { x: number; y: number }[] {
    const fromReg = this.getRegionById(fromRegionId);
    const toReg = this.getRegionById(toRegionId);
    if (!fromReg || !toReg) return [];
    return traceSupplyLine(
      Math.round(fromReg.centerX),
      Math.round(fromReg.centerY),
      Math.round(toReg.centerX),
      Math.round(toReg.centerY)
    );
  }

  /**
   * Ejecuta una Operación de Presión Geopolítica / Asedio Autónomo sobre una región
   * (Resolución en Capa 1 sin abrir el tablero táctico de Capa 2).
   */
  public executePoliticalSiegeOperation(targetRegionId: string): {
    success: boolean;
    conquered: boolean;
    tcpDamageDealt: number;
    remainingTcp: number;
    message: string;
    barkContext: 'hq_siege' | 'victory' | 'trap_ambush' | 'low_hp';
  } {
    const targetRegion = this.getRegionById(targetRegionId);
    if (!targetRegion) {
      return {
        success: false,
        conquered: false,
        tcpDamageDealt: 0,
        remainingTcp: 0,
        message: 'Región no encontrada.',
        barkContext: 'low_hp',
      };
    }

    if (!targetRegion.isPlayable) {
      this.prependLog({
        type: 'buffer_blocked',
        regionId: targetRegionId,
        headline: `BLOQUEO DE FRONTERA: ${targetRegion.name}`,
        detail: 'SECTOR FUERA DEL TEATRO OPERACIONAL DE FASE 1 (ACTIVO: REPÚBLICA DE VENEZUELA)',
      });
      this.saveState();
      return {
        success: false,
        conquered: false,
        tcpDamageDealt: 0,
        remainingTcp: 10000,
        message: 'SECTOR FUERA DEL TEATRO OPERACIONAL DE FASE 1 (ACTIVO: REPÚBLICA DE VENEZUELA)',
        barkContext: 'trap_ambush',
      };
    }

    const sov = this.state.sovereigntyMap[targetRegionId];
    if (!sov) {
      return {
        success: false,
        conquered: false,
        tcpDamageDealt: 0,
        remainingTcp: 0,
        message: 'Estado de soberanía no encontrado.',
        barkContext: 'low_hp',
      };
    }

    if (sov.controllerClanId === this.state.playerClanId) {
      return {
        success: false,
        conquered: false,
        tcpDamageDealt: 0,
        remainingTcp: sov.controlPoints,
        message: `${targetRegion.name} ya se encuentra bajo control de tu Corporación.`,
        barkContext: 'hq_siege',
      };
    }

    // Verificar Cooldown de Prioridad (4h)
    if (
      sov.cooldownExpiresAt &&
      new Date(sov.cooldownExpiresAt).getTime() > Date.now()
    ) {
      return {
        success: false,
        conquered: false,
        tcpDamageDealt: 0,
        remainingTcp: sov.controlPoints,
        message: `Escudo de Prioridad C4ISR activo en ${targetRegion.name}.`,
        barkContext: 'trap_ambush',
      };
    }

    const adjCheck = this.findOriginAdjacentRegion(targetRegionId, this.state.playerClanId);
    if (!adjCheck.valid || !adjCheck.originRegionId || !adjCheck.adjacency) {
      return {
        success: false,
        conquered: false,
        tcpDamageDealt: 0,
        remainingTcp: sov.controlPoints,
        message: adjCheck.reason || 'Sin adyacencia válida.',
        barkContext: 'trap_ambush',
      };
    }

    const operationCostEc = 180;
    const operationCostSteel = 20;
    if (this.state.energyCells < operationCostEc || this.state.industrialSteel < operationCostSteel) {
      return {
        success: false,
        conquered: false,
        tcpDamageDealt: 0,
        remainingTcp: sov.controlPoints,
        message: `Recursos insuficientes para proyectar ofensiva política (Requiere ${operationCostEc} EC y ${operationCostSteel} Acero).`,
        barkContext: 'low_hp',
      };
    }

    // Descontar coste logístico de la operación
    this.state.energyCells -= operationCostEc;
    this.state.industrialSteel -= operationCostSteel;

    // Calcular modificadores políticos (Edictos + Topología + Búnker)
    const activeEdicts = POLITICAL_EDICTS_CATALOG.filter(e =>
      this.state.activeEdictIds.includes(e.id)
    );
    const attackBonus = activeEdicts.reduce((sum, e) => sum + e.siegeAttackBonus, 0);

    // Fricción topológica (Cruces fluviales Orinoco/Apure o Estrechos)
    const flags = adjCheck.adjacency.topologyFlags;
    const isRiverCrossing = (flags & TOPOLOGY_FLAGS.RIVER_CROSSING) !== 0;
    const isStraitChoke = (flags & TOPOLOGY_FLAGS.STRAIT_CHOKE) !== 0;
    const terrainFriction = isRiverCrossing ? 0.85 : isStraitChoke ? 0.88 : 1.0;

    // Penalización por búnker defensor
    const bunkerMitigation = Math.max(0.55, 1.0 - (sov.bunkerLevel - 1) * 0.1);

    const baseStrikeTcp = MASTER_METAGAME_CONSTANTS.TCP_LOSS_ATTACKER_VICTORY; // 3500 TCP
    const tcpDamageDealt = Math.max(
      2000,
      Math.round(baseStrikeTcp * (1 + attackBonus) * terrainFriction * bunkerMitigation)
    );

    const nextTcp = Math.max(0, sov.controlPoints - tcpDamageDealt);
    const nowIso = new Date().toISOString();

    if (nextTcp === 0) {
      // ¡Ocupación Militar De Facto! (Ventana de Consolidación de 24h)
      const consolidationDate = new Date(
        Date.now() + MASTER_METAGAME_CONSTANTS.OCCUPIED_GRACE_HOURS_MIN * 3600 * 1000
      ).toISOString();

      this.state.sovereigntyMap[targetRegionId] = {
        ...sov,
        controllerClanId: this.state.playerClanId,
        controlPoints: Math.round(sov.maxControlPoints * 0.5),
        status: 'occupied_grace',
        customsEscrowLocked: true,
        graceExpiresAt: consolidationDate,
        lastTickAt: nowIso,
        updatedAt: nowIso,
      };
      this.state.politicalInfluence += targetRegion.isNationalCapital ? 150 : 65;

      this.prependLog({
        type: 'conquest',
        regionId: targetRegionId,
        headline: `¡OCUPACIÓN DE FACTO EN ${targetRegion.name.toUpperCase()}!`,
        detail: `Desde ${adjCheck.originRegionId} se colapsó el TCP a 0 (-${tcpDamageDealt} TCP). Inicia ventana de consolidación De Jure (24h).`,
      });

      this.saveState();
      return {
        success: true,
        conquered: true,
        tcpDamageDealt,
        remainingTcp: this.state.sovereigntyMap[targetRegionId].controlPoints,
        message: `¡${targetRegion.name} ocupada De Facto! Consolidación soberana en curso.`,
        barkContext: 'victory',
      };
    } else {
      // Erosión de Soberanía (Provincia entra/continúa en Asedio + Escudo de 4h opcional)
      this.state.sovereigntyMap[targetRegionId] = {
        ...sov,
        controlPoints: nextTcp,
        status: 'under_siege',
        lastTickAt: nowIso,
        updatedAt: nowIso,
      };
      this.state.politicalInfluence += 25;

      this.prependLog({
        type: 'siege',
        regionId: targetRegionId,
        headline: `PRESIÓN DE ASEDIO EN ${targetRegion.name.toUpperCase()}`,
        detail: `Operación lanzada desde ${adjCheck.originRegionId}: -${tcpDamageDealt} TCP (Restante: ${nextTcp}/${sov.maxControlPoints} TCP).`,
      });

      this.saveState();
      return {
        success: true,
        conquered: false,
        tcpDamageDealt,
        remainingTcp: nextTcp,
        message: `Asedio político ejecutado sobre ${targetRegion.name}: -${tcpDamageDealt} TCP (${nextTcp}/${sov.maxControlPoints} TCP).`,
        barkContext: 'hq_siege',
      };
    }
  }

  /**
   * Consolida la soberanía De Jure o refuerza el TCP y el Búnker de una región controlada.
   */
  public reinforceAndConsolidateRegion(regionId: string): {
    success: boolean;
    message: string;
  } {
    const region = this.getRegionById(regionId);
    const sov = this.state.sovereigntyMap[regionId];
    if (!region || !sov) {
      return { success: false, message: 'Región inválida.' };
    }

    if (sov.controllerClanId !== this.state.playerClanId) {
      return { success: false, message: 'Solo puedes reforzar o consolidar regiones bajo tu control.' };
    }

    const costEc = 150;
    const costSteel = 15;
    if (this.state.energyCells < costEc || this.state.industrialSteel < costSteel) {
      return {
        success: false,
        message: `Necesitas ${costEc} EC y ${costSteel} Acero para reforzar la infraestructura regional.`,
      };
    }

    this.state.energyCells -= costEc;
    this.state.industrialSteel -= costSteel;

    const wasDeFacto = sov.ownerClanId !== this.state.playerClanId;
    const nextTcp = Math.min(sov.maxControlPoints, sov.controlPoints + 2500);
    const nextBunker = Math.min(5, sov.bunkerLevel + (sov.controlPoints >= sov.maxControlPoints ? 1 : 0)) as 1 | 2 | 3 | 4 | 5;

    const nowIso = new Date().toISOString();
    this.state.sovereigntyMap[regionId] = {
      ...sov,
      ownerClanId: this.state.playerClanId, // Consolida Soberanía De Jure
      controllerClanId: this.state.playerClanId,
      controlPoints: nextTcp,
      bunkerLevel: nextBunker,
      status: 'stable',
      customsEscrowLocked: false,
      graceExpiresAt: null,
      lastTickAt: nowIso,
      updatedAt: nowIso,
    };

    this.prependLog({
      type: 'consolidation',
      regionId,
      headline: wasDeFacto
        ? `SOBERANÍA DE JURE CONSOLIDADA: ${region.name}`
        : `FORTIFICACIÓN C4ISR EN ${region.name}`,
      detail: `TCP restaurado a ${nextTcp}/${sov.maxControlPoints} • Búnker Nivel ${nextBunker}.`,
    });

    this.saveState();
    return {
      success: true,
      message: wasDeFacto
        ? `¡Soberanía De Jure consolidada en ${region.name}! (TCP ${nextTcp}/${sov.maxControlPoints})`
        : `Guarnición reforzada en ${region.name} (TCP ${nextTcp}/${sov.maxControlPoints}, Búnker Nv.${nextBunker}).`,
    };
  }

  /**
   * Activa o desactiva un Edicto Político (Victoria 3 / Stellaris).
   */
  public togglePoliticalEdict(edictId: PoliticalEdictId): {
    success: boolean;
    enacted: boolean;
    message: string;
  } {
    const edict = POLITICAL_EDICTS_CATALOG.find(e => e.id === edictId);
    if (!edict) {
      return { success: false, enacted: false, message: 'Edicto no encontrado.' };
    }

    const isAlreadyActive = this.state.activeEdictIds.includes(edictId);
    if (isAlreadyActive) {
      this.state.activeEdictIds = this.state.activeEdictIds.filter(id => id !== edictId);
      this.prependLog({
        type: 'edict',
        headline: `EDICTO DEROGADO: ${edict.name}`,
        detail: `Se libera el mantenimiento de ${edict.upkeepEcPerCycle} EC/ciclo.`,
      });
      this.saveState();
      return {
        success: true,
        enacted: false,
        message: `Edicto «${edict.name}» derogado.`,
      };
    }

    if (this.state.energyCells < edict.costEc) {
      return {
        success: false,
        enacted: false,
        message: `Fondos energéticos insuficientes para promulgar «${edict.name}» (${edict.costEc} EC requeridos).`,
      };
    }

    this.state.energyCells -= edict.costEc;
    this.state.activeEdictIds.push(edictId);

    this.prependLog({
      type: 'edict',
      headline: `EDICTO PROMULGADO: ${edict.name.toUpperCase()}`,
      detail: edict.description,
    });

    this.saveState();
    return {
      success: true,
      enacted: true,
      message: `¡Edicto «${edict.name}» promulgado en el Teatro Venezuela!`,
    };
  }

  /**
   * Ajusta la tasa de peaje (0% a 10%) en los estrechos estratégicos de Venezuela.
   */
  public setChokepointToll(chokeId: 'CHK-MARACAIBO' | 'CHK-PARIA', tollPercent: number): {
    success: boolean;
    message: string;
  } {
    const clamped = Math.max(0, Math.min(10, Number(tollPercent.toFixed(1))));
    this.state.chokepointTolls[chokeId] = clamped;

    this.prependLog({
      type: 'toll',
      regionId: chokeId === 'CHK-MARACAIBO' ? 'REG_VE_02' : 'REG_VE_13',
      headline: `ARANCEL DE ESTRECHO ACTUALIZADO (${chokeId})`,
      detail: `Nueva tarifa de tránsito marítimo/logístico fijada en ${clamped.toFixed(1)}%.`,
    });

    this.saveState();
    return {
      success: true,
      message: `Peaje en ${chokeId} ajustado a ${clamped.toFixed(1)}%.`,
    };
  }

  /**
   * Ejecuta un Ciclo Macroeconómico Horario/Estratégico (Recaudación RGO, Peajes, Upkeep Imperial 1.8 y Regeneración TCP).
   */
  public advancePoliticalEconomyCycle(): {
    netEcDelta: number;
    steelDelta: number;
    rareEarthDelta: number;
    isEnergyStarved: boolean;
    summary: string;
  } {
    const metrics = this.getEmpireMetrics(this.state.playerClanId);
    const nextEc = Math.max(0, this.state.energyCells + metrics.netEcPerCycle);
    const isStarved = this.state.energyCells + metrics.netEcPerCycle < 0;

    // Producción industrial derivada de regiones siderúrgicas y mineras (Bolívar, Zulia, Carabobo, Amazonas)
    let steelDelta = 0;
    let rareEarthDelta = 0;

    for (const reg of metrics.controlledRegions) {
      if (isStarved) break;
      if (reg.resourceTier >= 4) {
        steelDelta += 18;
      } else {
        steelDelta += 8;
      }
      if (reg.primaryCommodity.includes('tierras_raras') || reg.primaryCommodity.includes('oro') || reg.resourceTier === 5) {
        rareEarthDelta += 12;
      }
    }

    this.state.energyCells = nextEc;
    this.state.industrialSteel += steelDelta;
    this.state.rareEarth += rareEarthDelta;
    this.state.politicalInfluence += metrics.controlsNationalCapital ? 30 : 15;
    this.state.cycleCount += 1;

    // Actualizar flag de inanición energética y regenerar TCP (+500 TCP en provincias estables)
    for (const reg of metrics.controlledRegions) {
      const sov = this.state.sovereigntyMap[reg.id];
      if (!sov) continue;
      const regeneratedTcp = isStarved
        ? sov.controlPoints
        : Math.min(sov.maxControlPoints, sov.controlPoints + 500);

      this.state.sovereigntyMap[reg.id] = {
        ...sov,
        isEnergyStarved: isStarved,
        controlPoints: regeneratedTcp,
      };
    }

    const summary = isStarved
      ? `¡ALERTA DE INANICIÓN ENERGÉTICA! Upkeep Imperial (${metrics.upkeepBreakdown.totalUpkeepEc} EC) supera las reservas. Producción RGO en 0%.`
      : `Ciclo #${this.state.cycleCount} completado: ${metrics.netEcPerCycle >= 0 ? '+' : ''}${metrics.netEcPerCycle} EC netos, +${steelDelta} Acero, +${rareEarthDelta} Tierras Raras.`;

    this.prependLog({
      type: 'economy',
      headline: `CIERRE DE CICLO MACROECONÓMICO #${this.state.cycleCount}`,
      detail: summary,
    });

    this.saveState();
    return {
      netEcDelta: metrics.netEcPerCycle,
      steelDelta,
      rareEarthDelta,
      isEnergyStarved: isStarved,
      summary,
    };
  }

  /**
   * Adapta el estado de Project Alice al contrato de `useTerritoryMap` para que
   * `WorldMapCanvas`, `TacticalWorldMap` y `MetaCommandConsole` funcionen sin fricción.
   */
  public toTerritoryMapLegacyData(): {
    countries: WorldCountry[];
    provinces: WorldProvince[];
    nodes: TerritoryNode[];
    adjacencies: TerritoryAdjacency[];
    controlMap: Record<string, TerritoryControlState>;
    clansMap: Record<string, { id: string; name: string; tag: string; emblem: string; color: string }>;
  } {
    const countries: WorldCountry[] = [
      {
        isoCode: 'VE',
        name: 'República de Venezuela (Teatro Fase 1)',
        continent: 'SA',
        coordinates: { lat: 8.5, lng: -66.9 },
        defenseDoctrine: 'C4ISR Hegemonía Soberana',
        createdAt: new Date().toISOString(),
      },
    ];

    const provinces: WorldProvince[] = CANONICAL_VENEZUELA_REGIONS.map(r => ({
      id: r.id,
      countryIso: r.countryIso,
      name: r.name,
      isCapital: r.isNationalCapital,
      isCapturable: r.isPlayable && r.isCapturable,
      baseTerrain:
        r.biome === 'BIO-HGH'
          ? 'mountain'
          : r.biome === 'BIO-JGL'
          ? 'forest'
          : r.biome === 'BIO-ARC-ISL'
          ? 'archipelago'
          : 'plains',
      nativeWeather: 'clear',
      resourceMultiplier: r.isNationalCapital ? 2.0 : r.resourceTier * 0.35,
      buildingSlots: r.maxBuildingSlots,
      posX: r.centerX,
      posY: r.centerY,
      width: r.isNationalCapital ? 6.5 : 5.5,
      height: r.isNationalCapital ? 5.5 : 4.5,
      createdAt: new Date().toISOString(),
    }));

    const nodes: TerritoryNode[] = CANONICAL_VENEZUELA_REGIONS.map(r => {
      const sov = this.state.sovereigntyMap[r.id];
      return {
        id: `NODE_${r.id}`,
        provinceId: r.id,
        name: `${r.primaryCommodity.replace(/_/g, ' ').toUpperCase()} (T${r.resourceTier})`,
        nodeType: r.isNationalCapital
          ? 'capital_citadel'
          : r.resourceTier >= 4
          ? 'factory'
          : 'radar',
        controllerClanId: sov?.controllerClanId ?? null,
        defenseLevel: (sov?.bunkerLevel ?? 1) as 1 | 2 | 3 | 4 | 5,
        energyUpkeep: r.baseEnergyUpkeepEc,
        structuralHp: sov?.controlPoints ?? 10000,
        maxHp: sov?.maxControlPoints ?? 10000,
        outputPerMin: r.baseHourlyYield,
        isUnderAttack: sov?.status === 'under_siege',
        updatedAt: new Date().toISOString(),
      };
    });

    const adjacencies: TerritoryAdjacency[] = CANONICAL_VENEZUELA_ADJACENCIES.map((adj, idx) => {
      const isStrait = (adj.topologyFlags & TOPOLOGY_FLAGS.STRAIT_CHOKE) !== 0;
      const isCoastal = (adj.topologyFlags & TOPOLOGY_FLAGS.COASTAL) !== 0;
      const isBorder = (adj.topologyFlags & TOPOLOGY_FLAGS.NATIONAL_BORDER) !== 0;

      return {
        id: `ADJ_VE_${idx + 1}`,
        fromProvinceId: adj.fromRegionId,
        toProvinceId: adj.toRegionId,
        connectionType: isStrait ? 'strait' : isCoastal ? 'sea_lane' : 'land_open',
        isBlocked: isBorder, // Las fronteras con Buffer Zones están marcadas con bloqueo operacional Fase 1
        maxBandwidthTons: isStrait ? 8500 : 5000,
        tollRatePercent:
          adj.chokeControllingRegionId === 'REG_VE_02'
            ? this.state.chokepointTolls['CHK-MARACAIBO']
            : adj.chokeControllingRegionId === 'REG_VE_13'
            ? this.state.chokepointTolls['CHK-PARIA']
            : adj.tollFeePercent,
      };
    });

    const controlMap: Record<string, TerritoryControlState> = {};
    for (const r of CANONICAL_VENEZUELA_REGIONS) {
      const sov = this.state.sovereigntyMap[r.id];
      controlMap[r.id] = {
        provinceId: r.id,
        controllingClanId: sov?.controllerClanId ?? null,
        controllingAllianceId: null,
        currentTcp: sov?.controlPoints ?? 10000,
        tcpThreshold: sov?.maxControlPoints ?? 10000,
        status:
          sov?.status === 'occupied_grace'
            ? 'disputed'
            : (sov?.status as TerritoryControlState['status']) || 'stable',
        cooldownExpiresAt: sov?.cooldownExpiresAt ?? null,
        lastBattleAt: sov?.updatedAt ?? null,
        fortressLevel: sov?.bunkerLevel ?? 1,
      };
    }

    const clansMap: Record<string, { id: string; name: string; tag: string; emblem: string; color: string }> = {};
    for (const [key, fac] of Object.entries(VENEZUELA_FACTION_REGISTRY)) {
      clansMap[key] = {
        id: fac.id,
        name: fac.name,
        tag: fac.tag,
        emblem: fac.emblem,
        color: fac.color,
      };
    }

    return {
      countries,
      provinces,
      nodes,
      adjacencies,
      controlMap,
      clansMap,
    };
  }

  private prependLog(entry: Omit<PoliticalOperationLogEntry, 'id' | 'timestamp'>): void {
    const newEntry: PoliticalOperationLogEntry = {
      ...entry,
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    this.state.operationLogs = [newEntry, ...this.state.operationLogs.slice(0, 29)];
  }
}

export const politicalAliceEngine = PoliticalAliceEngine.getInstance();

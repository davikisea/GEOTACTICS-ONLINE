/**
 * ==============================================================================
 * INTEGRACIÓN CONTINUA DE COMBATE TÁCTICO, SEAMLESS ZOOM Y DOBLE LLAVE (FASE 4)
 * ==============================================================================
 * Especificación Canónica: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3, §4 & §5
 * Plan Maestro: PLAN_MAESTRO_IMPLEMENTACION_GEOTACTICS_ALICE_CERO_INCERTIDUMBRE.md
 * ==============================================================================
 * Controla:
 * 1. Semantic LOD (LOD 1 Global -> LOD 2 Operacional -> LOD 3 Táctico a z >= 13.0).
 * 2. Human Handshake de 120s con alerta DEFCON 1 reactiva en Bark Engine.
 * 3. Validación de Doble Llave ($G in-match + stock físico en user/faction hangar).
 * 4. Liquidación transaccional: Siniestralidad real + 35% Chatarra Balística.
 * ==============================================================================
 */

import { ZOOM_GLOBAL, ZOOM_OPERACIONAL, ZOOM_TACTICO } from '@domains/world';
import { TacticalBitMap } from '@domains/world';
import { TacticalUnit } from '../types';

export type SemanticLODLevel = 'LOD1_GLOBAL' | 'LOD2_OPERATIONAL' | 'LOD3_TACTICAL';

export interface CameraLODState {
  zoom: number;
  lod: SemanticLODLevel;
  isTileCanvasActive: boolean;
  textureSampling: 'linear' | 'nearest';
  vramBudgetMb: number;
  subscribedChannel: string | null;
}

export interface DoubleKeyValidationParams {
  unitCode: string;
  tier: 1 | 2 | 3 | 4 | 5;
  facilityType: 'factory' | 'airport' | 'port';
  availableFunds: number;
  unitCostFunds: number;
  userHangarStock: number;
  factionHangarStock?: number;
  allowFactionStock?: boolean;
}

export interface DoubleKeyValidationResult {
  canDeploy: boolean;
  reason?: string;
  sourceUsed?: 'f2p_infinite' | 'user_hangar' | 'faction_hangar';
}

export interface DestroyedUnitRecord {
  unitCode: string;
  tier: 1 | 2 | 3 | 4 | 5;
  ownerId: string;
  source: 'user' | 'faction';
}

export interface CombatLossSettlementResult {
  totalUnitsDestroyed: number;
  permanentSinkUnitsCount: number;
  techScrapRecovered: number;
  steelPlatesRefundable: number;
  tcpDrain: number;
}

// ============================================================================
// 1. SEMANTIC LOD Y CONTROL DE CÁMARA WEBGL
// ============================================================================

export function resolveSemanticLOD(zoom: number, activeProvinceId?: string | null): CameraLODState {
  if (zoom < 6.0) {
    return {
      zoom,
      lod: 'LOD1_GLOBAL',
      isTileCanvasActive: false,
      textureSampling: 'linear',
      vramBudgetMb: 45,
      subscribedChannel: 'world_sovereignty_ticker',
    };
  }

  if (zoom >= 6.0 && zoom < 13.0) {
    return {
      zoom,
      lod: 'LOD2_OPERATIONAL',
      isTileCanvasActive: false,
      textureSampling: 'linear',
      vramBudgetMb: 85,
      subscribedChannel: 'theater_ops:VE',
    };
  }

  // Zoom >= 13.0: Inmersión táctica en vivo sobre TileCanvas HTML5 (1000x1000 px)
  return {
    zoom,
    lod: 'LOD3_TACTICAL',
    isTileCanvasActive: true,
    textureSampling: 'nearest', // Pixel-art nítido de Advance Wars
    vramBudgetMb: 140,
    subscribedChannel: activeProvinceId ? `territorial_battle:${activeProvinceId}` : null,
  };
}

// ============================================================================
// 2. VALIDACIÓN ESTRICTA DE LA DOBLE LLAVE (DOUBLE KEY VALIDATOR)
// ============================================================================

export function validateDoubleKeyDeployment(params: DoubleKeyValidationParams): DoubleKeyValidationResult {
  const {
    unitCode,
    tier,
    facilityType,
    availableFunds,
    unitCostFunds,
    userHangarStock,
    factionHangarStock = 0,
    allowFactionStock = false,
  } = params;

  // Llave 1: Fondos tácticos generados en la partida por ciudades capturadas
  if (availableFunds < unitCostFunds) {
    return {
      canDeploy: false,
      reason: `Fondos insuficientes: Se requieren $${unitCostFunds.toLocaleString()}G (Disponibles: $${availableFunds.toLocaleString()}G).`,
    };
  }

  // Kit de Supervivencia F2P inagotable: Infantería Ligera T1 y Recon T1
  const isBasicF2P = (unitCode === 'infantry' || unitCode === 'recon') && tier === 1;
  if (isBasicF2P) {
    return {
      canDeploy: true,
      sourceUsed: 'f2p_infinite',
    };
  }

  // Llave 2: Existencia física real de chasis ensamblado en Hangar Personal
  if (userHangarStock >= 1) {
    return {
      canDeploy: true,
      sourceUsed: 'user_hangar',
    };
  }

  // Si no tiene stock personal, verificar si puede desplegar del Arsenal de Facción
  if (allowFactionStock && factionHangarStock >= 1) {
    return {
      canDeploy: true,
      sourceUsed: 'faction_hangar',
    };
  }

  return {
    canDeploy: false,
    reason: `Sin chasis físico de ${unitCode} (Tier ${tier}) en Hangar. Forja unidades en talleres o solicita al Arsenal del Clan.`,
  };
}

// ============================================================================
// 3. LIQUIDACIÓN DE BAJAS Y RECUPERACIÓN DEL 35% DE CHATARRA BALÍSTICA
// ============================================================================

export function settleCombatLossesAndScrap(
  destroyedUnits: DestroyedUnitRecord[],
  winner: 'attacker' | 'defender',
  isAttacker: boolean
): CombatLossSettlementResult {
  let scrapTotal = 0;
  let sinkCount = 0;

  for (const unit of destroyedUnits) {
    // Las unidades F2P básicas no generan chatarra ni se descuentan
    const isBasicF2P = (unit.unitCode === 'infantry' || unit.unitCode === 'recon') && unit.tier === 1;
    if (isBasicF2P) continue;

    sinkCount++;
    // Valor base de chatarra: 50 * Tier
    const baseVal = 50 * unit.tier;
    // 35% recuperado como tech_scrap
    const scrapRecovered = Math.floor(baseVal * 0.35);
    scrapTotal += scrapRecovered;
  }

  // Cálculo de erosión de Puntos de Control Territorial (TCP)
  // Atacante ganador resta entre 1,200 y 2,000 TCP
  let tcpDelta = 0;
  if (winner === 'attacker') {
    tcpDelta = isAttacker ? 1500 : -1500;
  } else {
    // Defensor recupera +500 TCP
    tcpDelta = isAttacker ? -500 : 500;
  }

  return {
    totalUnitsDestroyed: destroyedUnits.length,
    permanentSinkUnitsCount: sinkCount,
    techScrapRecovered: scrapTotal,
    steelPlatesRefundable: Math.floor(scrapTotal / 2), // Tasa canónica: 2 unidades de chatarra balística -> 1 placa de acero reciclado
    tcpDrain: Math.abs(tcpDelta),
  };
}

// ============================================================================
// 4. PROTOCOLO DEFENSIVO HUMAN HANDSHAKE (120 SEGUNDOS)
// ============================================================================

export interface HandshakeEvaluation {
  isHandshakeActive: boolean;
  secondsRemaining: number;
  combatMode: 'pve_garrison' | 'pvp_realtime';
  defconAlert: boolean;
}

export function evaluateDefensiveHandshake(
  handshakeExpiresAt: string,
  claimedByDefender: boolean,
  currentTime: Date = new Date()
): HandshakeEvaluation {
  if (claimedByDefender) {
    return {
      isHandshakeActive: false,
      secondsRemaining: 0,
      combatMode: 'pvp_realtime',
      defconAlert: false,
    };
  }

  const expiresTime = new Date(handshakeExpiresAt).getTime();
  const diffSeconds = Math.max(0, Math.round((expiresTime - currentTime.getTime()) / 1000));

  if (diffSeconds > 0) {
    return {
      isHandshakeActive: true,
      secondsRemaining: diffSeconds,
      combatMode: 'pve_garrison',
      defconAlert: true, // Dispara viñeta de pánico en Bark Engine
    };
  }

  // Tiempo expirado: la IA toma el control permanente
  return {
    isHandshakeActive: false,
    secondsRemaining: 0,
    combatMode: 'pve_garrison',
    defconAlert: false,
  };
}
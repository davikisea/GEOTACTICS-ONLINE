/**
 * ==============================================================================
 * HOOK DE GENERACIÓN ECONÓMICA CONTINUA Y TICKER WPLACE (USE TERRITORY ECONOMY TICKER)
 * ==============================================================================
 * Arquitectura: Wplace × Victoria 3 Continuous Production Pipeline
 * Conforme a @tactical-command-intel e @indie-game-ui-architect:
 * - Acumulación por minuto de output de nodos territoriales controlados.
 * - Multiplicador masivo de 2.00x en capitales de provincia (is_capital = true).
 * - Descuento horario de upkeep energético con penalización superlineal Psi_Over(r).
 * ==============================================================================
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  WorldProvince,
  TerritoryNode,
  TerritoryControlState,
  MASTER_METAGAME_CONSTANTS,
} from '@shared';
import { TerritorialUpkeepEngine, UpkeepCalculationOutput } from '@domains/economy';
import { audioManager } from '@domains/game-feel';

export interface UseTerritoryEconomyTickerProps {
  clanId?: string | null;
  provinces: WorldProvince[];
  nodes: TerritoryNode[];
  controlMap: Record<string, TerritoryControlState>;
  onHarvestResources?: (delta: { ec: number; steel: number }) => void;
  onDeductUpkeep?: (upkeepEc: number) => void;
}

export interface TerritoryEconomyTickerState {
  ecPerMinute: number;
  steelPerMinute: number;
  accumulatedEc: number;
  accumulatedSteel: number;
  secondsUntilNextMinuteTick: number;
  controlledProvincesCount: number;
  controlledNodesCount: number;
  hasCapitalControl: boolean;
  upkeepMetrics: UpkeepCalculationOutput;
  harvestResources: () => { ec: number; steel: number };
}

export function useTerritoryEconomyTicker({
  clanId = 'clan-ferro',
  provinces,
  nodes,
  controlMap,
  onHarvestResources,
  onDeductUpkeep,
}: UseTerritoryEconomyTickerProps): TerritoryEconomyTickerState {
  const [accumulatedEc, setAccumulatedEc] = useState<number>(180);
  const [accumulatedSteel, setAccumulatedSteel] = useState<number>(35);
  const [secondsUntilNextMinuteTick, setSecondsUntilNextMinuteTick] = useState<number>(60);

  // 1. Provincias y nodos soberanos controlados por el clan
  const controlledProvinces = useMemo(() => {
    if (!clanId) return [];
    return provinces.filter(p => {
      const ctrl = controlMap[p.id];
      return ctrl ? ctrl.controllingClanId === clanId : false;
    });
  }, [provinces, controlMap, clanId]);

  const controlledNodes = useMemo(() => {
    if (!clanId) return [];
    return nodes.filter(n => n.controllerClanId === clanId);
  }, [nodes, clanId]);

  const hasCapitalControl = useMemo(() => {
    return controlledProvinces.some(p => p.isCapital);
  }, [controlledProvinces]);

  // 2. Cálculo integral de Upkeep y Sobre-expansión Psi_Over
  const upkeepMetrics = useMemo(() => {
    const nodeUpkeepData = controlledNodes.map(n => ({
      id: n.id,
      nodeType: n.nodeType,
      defenseLevel: n.defenseLevel,
      energyUpkeep: n.energyUpkeep,
      outputPerMin: n.outputPerMin,
    }));

    return TerritorialUpkeepEngine.calculateClanTerritorialUpkeep({
      clanId: clanId ?? 'clan-ferro',
      adminCapacity: 8, // Capacidad administrativa base
      controlledProvincesCount: Math.max(1, controlledProvinces.length),
      nodes: nodeUpkeepData,
      isCapitalProvince: hasCapitalControl,
    });
  }, [clanId, controlledProvinces.length, controlledNodes, hasCapitalControl]);

  // 3. Tasa de generación por minuto (con multiplicador 2.0x en capitales)
  const { ecPerMinute, steelPerMinute } = useMemo(() => {
    let baseEcRate = 0;
    let baseSteelRate = 0;

    controlledNodes.forEach(node => {
      // Determinar si el nodo está en una provincia capital
      const parentProv = provinces.find(p => p.id === node.provinceId);
      const isCap = parentProv?.isCapital ?? false;
      const mult = isCap ? MASTER_METAGAME_CONSTANTS.CAPITAL_RESOURCE_MULTIPLIER : 1.0;

      if (node.nodeType === 'factory' || node.nodeType === 'refinery') {
        baseSteelRate += (node.outputPerMin || 3) * mult;
        baseEcRate += (node.outputPerMin * 2 || 6) * mult;
      } else if (node.nodeType === 'capital_citadel' || node.nodeType === 'city') {
        baseEcRate += (node.outputPerMin * 3 || 12) * mult;
        baseSteelRate += (node.outputPerMin || 2) * mult;
      } else {
        baseEcRate += (node.outputPerMin || 2) * mult;
      }
    });

    // Si no controla nodos directos en la seed, garantizar tasa basal mínima soberana
    const finalEc = Math.max(8, Math.round(baseEcRate * upkeepMetrics.productionMultiplier));
    const finalSteel = Math.max(2, Math.round(baseSteelRate * upkeepMetrics.productionMultiplier));

    return { ecPerMinute: finalEc, steelPerMinute: finalSteel };
  }, [controlledNodes, provinces, upkeepMetrics.productionMultiplier]);

  // 4. Temporizador de ticker por minuto (Wplace Continuous Generation)
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsUntilNextMinuteTick(prev => {
        if (prev <= 1) {
          // Disparo de acumulación de minuto
          setAccumulatedEc(e => e + ecPerMinute);
          setAccumulatedSteel(s => s + steelPerMinute);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [ecPerMinute, steelPerMinute]);

  // 5. Cosecha activa de recursos acumulados
  const harvestResources = useCallback(() => {
    const ec = accumulatedEc;
    const steel = accumulatedSteel;

    if (ec > 0 || steel > 0) {
      audioManager.playComboAction(6);
      onHarvestResources?.({ ec, steel });
      setAccumulatedEc(0);
      setAccumulatedSteel(0);
    } else {
      audioManager.playHoverTick();
    }

    return { ec, steel };
  }, [accumulatedEc, accumulatedSteel, onHarvestResources]);

  return {
    ecPerMinute,
    steelPerMinute,
    accumulatedEc,
    accumulatedSteel,
    secondsUntilNextMinuteTick,
    controlledProvincesCount: controlledProvinces.length,
    controlledNodesCount: controlledNodes.length,
    hasCapitalControl,
    upkeepMetrics,
    harvestResources,
  };
}
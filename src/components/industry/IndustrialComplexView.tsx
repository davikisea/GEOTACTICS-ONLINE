/**
 * ==============================================================================
 * VISTA DEL COMPLEJO INDUSTRIAL MILITAR, PARCELAS IDLE Y HANGAR DE REFINADO
 * ==============================================================================
 * Estilo visual: Skill retro-futurism (Atompunk, esquinas asimétricas, biseles metálicos,
 * sombras duras y paleta canónica #46521F, #7B8A4A, #C46A3A, #F2E8D5, #2B2C24).
 *
 * Implementa:
 * 1. Consola de Mando y Radar Táctico Atompunk con manómetros circulares analógicos.
 * 2. Ciclo Circadiano Ergonómico: 12h base + Silos + 4h de Gracia (16h totales seguras).
 * 3. Bono de Eficiencia Logística (+10% y +500 Créditos) al cosechar con puntualidad.
 * 4. Almacén de Cargamento Militar Varado (70% de merma recuperable con 1 victoria).
 * 5. Cuadrícula Territorial de 10 Parcelas con gestión de empresas y desbloqueo por nivel.
 * 6. Interruptor de Salvaguarda Abatible de dos pasos para demoliciones u overhaul técnico.
 * 7. Colas de Refinado Multi-Batch (hasta 3 lotes consecutivos de operación autónoma).
 */

import React, { useState, useEffect } from 'react';
import {
  Factory,
  Flame,
  Layers,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Zap,
  TrendingUp,
  Shield,
  Hammer,
  Cpu,
  Boxes,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Lock,
  Unlock,
  Sliders,
  RotateCcw,
  PackageCheck,
  AlertOctagon
} from 'lucide-react';
import {
  IndustrialEngine,
  IndustrialInventory,
  ActiveRefiningJob,
  REFINING_RECIPES,
  CorporateSpecialization,
  RefinedResourceType,
  IndustrialPlot,
  PlotEnterpriseType,
  PLOT_UNLOCK_TABLE,
  StrandedCargo
} from '../../engine/industrialEngine';
import { audioManager } from '../../engine/audioManager';

interface IndustrialComplexViewProps {
  inventory: IndustrialInventory;
  onUpdateInventory: (updated: IndustrialInventory) => void;
  activeJobs: ActiveRefiningJob[];
  onUpdateJobs: (jobs: ActiveRefiningJob[]) => void;
  onNavigateToMarket?: () => void;
  userPlots?: IndustrialPlot[];
  onUpdatePlots?: (plots: IndustrialPlot[]) => void;
  userCredits?: number;
  onUpdateUserCredits?: (newCredits: number) => void;
  accountLevel?: number;
}

export const IndustrialComplexView: React.FC<IndustrialComplexViewProps> = ({
  inventory,
  onUpdateInventory,
  activeJobs,
  onUpdateJobs,
  onNavigateToMarket,
  userPlots,
  onUpdatePlots,
  userCredits = 25000,
  onUpdateUserCredits,
  accountLevel = 10,
}) => {
  const [activeTab, setActiveTab] = useState<'radar' | 'territory' | 'refinery' | 'specialization'>('radar');
  const [selectedRecipe, setSelectedRecipe] = useState<RefinedResourceType>('refined_steel');
  const [selectedBatchCount, setSelectedBatchCount] = useState<number>(1);
  const [useFuelBoost, setUseFuelBoost] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal de gestión de parcela territorial
  const [selectedPlotForManage, setSelectedPlotForManage] = useState<IndustrialPlot | null>(null);
  const [safetyFlipOpen, setSafetyFlipOpen] = useState<boolean>(false);
  const [holdTimer, setHoldTimer] = useState<number>(0);
  const [isHoldingDemolish, setIsHoldingDemolish] = useState<boolean>(false);

  // Cargamento varado simulado (recuperable)
  const [strandedCargo, setStrandedCargo] = useState<StrandedCargo>({
    userId: inventory.userId,
    strandedIron: 0,
    strandedStone: 0,
    strandedRareEarth: 0,
    strandedFuel: 0,
  });

  // Estado local de parcelas si no se pasa por prop
  const [plots, setPlots] = useState<IndustrialPlot[]>(() => {
    if (userPlots && userPlots.length > 0) return userPlots;
    return [
      { id: 'plot_1', userId: inventory.userId, plotIndex: 1, enterpriseType: 'mine_iron', tier: 1, status: 'active' },
      { id: 'plot_2', userId: inventory.userId, plotIndex: 2, enterpriseType: 'smelter_vulcan', tier: 1, status: 'active' },
      { id: 'plot_3', userId: inventory.userId, plotIndex: 3, enterpriseType: 'quarry_stone', tier: 1, status: 'active' },
      { id: 'plot_4', userId: inventory.userId, plotIndex: 4, enterpriseType: 'concrete_plant', tier: 1, status: 'active' },
      { id: 'plot_5', userId: inventory.userId, plotIndex: 5, enterpriseType: 'drill_rare_earth', tier: 1, status: 'active' },
      { id: 'plot_6', userId: inventory.userId, plotIndex: 6, enterpriseType: 'cleanroom_chips', tier: 1, status: 'active' },
      { id: 'plot_7', userId: inventory.userId, plotIndex: 7, enterpriseType: 'logistics_silo', tier: 1, status: 'active' },
      { id: 'plot_8', userId: inventory.userId, plotIndex: 8, enterpriseType: 'empty', tier: 1, status: 'active' },
      { id: 'plot_9', userId: inventory.userId, plotIndex: 9, enterpriseType: 'empty', tier: 1, status: 'active' },
      { id: 'plot_10', userId: inventory.userId, plotIndex: 10, enterpriseType: 'empty', tier: 1, status: 'active' },
    ];
  });

  const updatePlotsInternal = (newPlots: IndustrialPlot[]) => {
    setPlots(newPlots);
    if (onUpdatePlots) onUpdatePlots(newPlots);
  };

  // Recalcular estado territorial cada 5 segundos
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Efecto para el interruptor abatible de demolición (2 segundos de hold)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isHoldingDemolish) {
      interval = setInterval(() => {
        setHoldTimer(prev => {
          if (prev >= 2.0) {
            handleConfirmDemolish();
            setIsHoldingDemolish(false);
            return 0;
          }
          return prev + 0.2;
        });
      }, 200);
    } else {
      setHoldTimer(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isHoldingDemolish]);

  const territoryStatus = IndustrialEngine.calculateTerritoryStatus(plots, inventory.lastHarvestAt, now);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Acción: Cosechar Silos Territoriales con protocolo circadiano y bonos
  const handleHarvest = () => {
    const result = IndustrialEngine.harvestTerritory(plots, inventory, Date.now());
    onUpdateInventory(result.updatedInventory);

    if (result.harvestResult.efficiencyBonusApplied && onUpdateUserCredits) {
      onUpdateUserCredits(userCredits + result.harvestResult.efficiencyBonusCredits);
    }

    if (result.harvestResult.strandedIron > 0) {
      setStrandedCargo(prev => ({
        ...prev,
        strandedIron: prev.strandedIron + result.harvestResult.strandedIron,
        strandedStone: prev.strandedStone + result.harvestResult.strandedStone,
        strandedRareEarth: prev.strandedRareEarth + result.harvestResult.strandedRareEarth,
        strandedFuel: prev.strandedFuel + result.harvestResult.strandedFuel,
      }));
    }

    audioManager.playSFX('capture');
    showNotification(
      `¡Recursos cosechados! +${result.harvestResult.accumulatedIron} Hierro, +${result.harvestResult.accumulatedStone} Piedra, +${result.harvestResult.accumulatedRareEarth} Raras.${
        result.harvestResult.efficiencyBonusApplied ? ' ¡BONO DE EFICIENCIA LOGÍSTICA (+10% y +500G) ACREDITADO!' : ''
      }`
    );
  };

  // Acción: Iniciar Trabajo de Refinado con soporte Multi-Batch
  const handleStartJob = (recipeType: RefinedResourceType) => {
    const result = IndustrialEngine.startRefiningJob(
      inventory,
      recipeType,
      useFuelBoost,
      Date.now(),
      selectedBatchCount
    );

    if (!result.success || !result.job || !result.updatedInventory) {
      audioManager.playSFX('combat_hit');
      showNotification(result.errorMessage || 'Error al iniciar fundición.', 'error');
      return;
    }

    onUpdateInventory(result.updatedInventory);
    onUpdateJobs([...activeJobs, result.job]);
    audioManager.playSFX('button_click');
    showNotification(
      `¡Horno encendido! Produciendo ${REFINING_RECIPES[recipeType].name} (${selectedBatchCount} ${
        selectedBatchCount > 1 ? 'lotes' : 'lote'
      }).`
    );
  };

  // Acción: Reclamar Trabajo de Refinado Finalizado
  const handleCollectJob = (job: ActiveRefiningJob) => {
    const result = IndustrialEngine.collectRefiningJob(inventory, job, Date.now());
    if (!result.success || !result.updatedInventory || !result.updatedJob) {
      audioManager.playSFX('combat_hit');
      showNotification(result.errorMessage || 'El trabajo aún no termina.', 'error');
      return;
    }

    onUpdateInventory(result.updatedInventory);
    onUpdateJobs(activeJobs.map(j => (j.id === job.id ? result.updatedJob! : j)));
    audioManager.playSFX('victory');
    showNotification(`¡Lote terminado y transferido al arsenal con éxito!`);
  };

  // Acción: Desbloquear Parcela Territorial
  const handleUnlockPlot = (plotIndex: number) => {
    const req = PLOT_UNLOCK_TABLE[plotIndex];
    if (!req) return;

    if (accountLevel < req.requiredAccountLevel) {
      audioManager.playSFX('combat_hit');
      showNotification(`Nivel insuficiente. Requiere Nivel de Cuenta ${req.requiredAccountLevel}.`, 'error');
      return;
    }

    if (userCredits < req.costCredits) {
      audioManager.playSFX('combat_hit');
      showNotification(`Fondos insuficientes. Requiere ${req.costCredits} Créditos.`, 'error');
      return;
    }

    if (onUpdateUserCredits) {
      onUpdateUserCredits(userCredits - req.costCredits);
    }

    const newPlots = plots.map(p =>
      p.plotIndex === plotIndex ? { ...p, status: 'active' as const, enterpriseType: 'empty' as const } : p
    );
    updatePlotsInternal(newPlots);
    audioManager.playSFX('victory');
    showNotification(`¡Parcela ${plotIndex} desbloqueada y lista para edificación!`);
  };

  // Acción: Confirmar Demolición de Empresa en Parcela (50% reembolso)
  const handleConfirmDemolish = () => {
    if (!selectedPlotForManage) return;

    const refund = 500;
    if (onUpdateUserCredits) {
      onUpdateUserCredits(userCredits + refund);
    }

    const newPlots = plots.map(p =>
      p.plotIndex === selectedPlotForManage.plotIndex
        ? { ...p, enterpriseType: 'empty' as const, status: 'active' as const }
        : p
    );
    updatePlotsInternal(newPlots);
    setSelectedPlotForManage(null);
    setSafetyFlipOpen(false);
    audioManager.playSFX('capture');
    showNotification(`Demolición completada. Solar despejado y +${refund}G de reembolso acreditado.`);
  };

  // Acción: Overhaul / Edificar en Parcela
  const handleBuildEnterprise = (enterprise: PlotEnterpriseType) => {
    if (!selectedPlotForManage) return;

    const cost = 1500;
    if (userCredits < cost) {
      audioManager.playSFX('combat_hit');
      showNotification(`Créditos insuficientes para overhaul (${cost}G requeridos).`, 'error');
      return;
    }

    if (onUpdateUserCredits) {
      onUpdateUserCredits(userCredits - cost);
    }

    const newPlots = plots.map(p =>
      p.plotIndex === selectedPlotForManage.plotIndex
        ? {
            ...p,
            enterpriseType: enterprise,
            status: 'active' as const,
          }
        : p
    );
    updatePlotsInternal(newPlots);
    setSelectedPlotForManage(null);
    audioManager.playSFX('button_click');
    showNotification(`¡Nueva empresa construida y en operaciones!`);
  };

  // Acción: Rescatar Cargamento Varado
  const handleRecoverStranded = () => {
    const result = IndustrialEngine.recoverStrandedCargo(inventory, strandedCargo);
    onUpdateInventory(result.updatedInventory);
    setStrandedCargo({
      userId: inventory.userId,
      strandedIron: 0,
      strandedStone: 0,
      strandedRareEarth: 0,
      strandedFuel: 0,
    });
    audioManager.playSFX('victory');
    showNotification(`¡Cargamento militar varado recuperado con honores!`);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#2B2C24] text-[#F2E8D5] font-mono p-4 sm:p-6 overflow-y-auto select-none">
      {/* Cabecera Atompunk del Complejo Industrial */}
      <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[24px_6px_24px_6px] p-4 shadow-[6px_6px_0px_#2B2C24] mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-[8px_2px_8px_2px] bg-[#C46A3A] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border border-[#2B2C24]">
              FASE BIFÁSICA CALIBRADA
            </span>
            <h1 className="text-lg font-black tracking-wide text-[#F2E8D5] flex items-center gap-2">
              <Factory className="w-5 h-5 text-[#C46A3A]" />
              COMPLEJO INDUSTRIAL MILITAR & RADAR TERRITORIAL
            </h1>
          </div>
          <p className="text-xs text-[#F2E8D5]/80 mt-1">
            Simulador Tycoon de 10 parcelas, ciclo circadiano 12h + 4h de gracia y trading de excedentes.
          </p>
        </div>

        {/* Resumen de Inventario Procesado */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-[#2B2C24] px-2.5 py-1 rounded-[10px_3px_10px_3px] border border-[#7B8A4A]">
            <Hammer className="w-3.5 h-3.5 text-slate-300" />
            <span>Acero: <strong className="text-white">{inventory.refinedSteel}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#2B2C24] px-2.5 py-1 rounded-[10px_3px_10px_3px] border border-[#7B8A4A]">
            <Boxes className="w-3.5 h-3.5 text-stone-400" />
            <span>Hormigón: <strong className="text-white">{inventory.refinedConcrete}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#2B2C24] px-2.5 py-1 rounded-[10px_3px_10px_3px] border border-[#7B8A4A]">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Chips: <strong className="text-white">{inventory.refinedMicrochip}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#2B2C24] px-2.5 py-1 rounded-[10px_3px_10px_3px] border border-[#7B8A4A]">
            <Flame className="w-3.5 h-3.5 text-[#C46A3A]" />
            <span>Fuel: <strong className="text-white">{inventory.campaignFuel}</strong></span>
          </div>
        </div>
      </div>

      {/* Alerta de Notificación Temporal */}
      {statusMessage && (
        <div
          className={`p-3 rounded-[12px_3px_12px_3px] border-2 shadow-[4px_4px_0px_#2B2C24] mb-4 text-xs font-bold flex items-center gap-2 animate-bounce ${
            statusMessage.type === 'success'
              ? 'bg-[#7B8A4A] border-[#2B2C24] text-white'
              : 'bg-[#C46A3A] border-[#2B2C24] text-white'
          }`}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Banner de Cargamento Varado Rescatable (si existe merma) */}
      {(strandedCargo.strandedIron > 0 || strandedCargo.strandedStone > 0 || strandedCargo.strandedRareEarth > 0) && (
        <div className="bg-[#C46A3A]/20 border-2 border-[#C46A3A] rounded-[16px_4px_16px_4px] p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-[4px_4px_0px_#2B2C24]">
          <div className="flex items-center gap-2.5">
            <PackageCheck className="w-5 h-5 text-[#C46A3A]" />
            <div>
              <div className="text-xs font-black text-white uppercase tracking-wider">
                ¡CARGAMENTO MILITAR VARADO DETECTADO! (70% RECUPERABLE)
              </div>
              <div className="text-[11px] text-[#F2E8D5]/80">
                Reserva varada: {strandedCargo.strandedIron} Hierro, {strandedCargo.strandedStone} Piedra, {strandedCargo.strandedRareEarth} Raras.
              </div>
            </div>
          </div>
          <button
            onClick={handleRecoverStranded}
            className="px-4 py-1.5 bg-[#C46A3A] hover:bg-[#b05c2e] text-[#F2E8D5] font-black text-xs uppercase tracking-wider rounded-[10px_2px_10px_2px] border border-[#2B2C24] shadow-[2px_2px_0px_#2B2C24] cursor-pointer"
          >
            Reclamar Salvamento
          </button>
        </div>
      )}

      {/* Selector de Pestañas Atompunk */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setActiveTab('radar')}
          className={`px-4 py-2 rounded-[12px_3px_12px_3px] font-bold text-xs uppercase tracking-wider border-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'radar'
              ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[4px_4px_0px_#2B2C24]'
              : 'bg-[#46521F] border-[#2B2C24] text-[#F2E8D5]/75 hover:bg-[#3d481b]'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>1. Radar Táctico CRT</span>
        </button>

        <button
          onClick={() => setActiveTab('territory')}
          className={`px-4 py-2 rounded-[12px_3px_12px_3px] font-bold text-xs uppercase tracking-wider border-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'territory'
              ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[4px_4px_0px_#2B2C24]'
              : 'bg-[#46521F] border-[#2B2C24] text-[#F2E8D5]/75 hover:bg-[#3d481b]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Parcelas Territoriales (10)</span>
        </button>

        <button
          onClick={() => setActiveTab('refinery')}
          className={`px-4 py-2 rounded-[12px_3px_12px_3px] font-bold text-xs uppercase tracking-wider border-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'refinery'
              ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[4px_4px_0px_#2B2C24]'
              : 'bg-[#46521F] border-[#2B2C24] text-[#F2E8D5]/75 hover:bg-[#3d481b]'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>3. Altos Hornos (Multi-Batch)</span>
        </button>

        <button
          onClick={() => setActiveTab('specialization')}
          className={`px-4 py-2 rounded-[12px_3px_12px_3px] font-bold text-xs uppercase tracking-wider border-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'specialization'
              ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[4px_4px_0px_#2B2C24]'
              : 'bg-[#46521F] border-[#2B2C24] text-[#F2E8D5]/75 hover:bg-[#3d481b]'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>4. Doctrina de Consorcio</span>
        </button>

        {onNavigateToMarket && (
          <button
            onClick={onNavigateToMarket}
            className="ml-auto px-4 py-2 rounded-[12px_3px_12px_3px] font-bold text-xs uppercase tracking-wider bg-[#7B8A4A] border-2 border-[#2B2C24] text-[#F2E8D5] shadow-[4px_4px_0px_#2B2C24] hover:bg-[#68763d] flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <span>Ir al Mercado Libre P2P</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* PESTAÑA 1: RADAR TÁCTICO CRT CON MANÓMETROS ANALÓGICOS */}
      {activeTab === 'radar' && (
        <div className="flex flex-col gap-4">
          {/* Banner de Monitoreo Circadiano 12h + 4h de Gracia */}
          <div
            className={`p-4 rounded-[18px_4px_18px_4px] border-2 shadow-[4px_4px_0px_#2B2C24] flex flex-wrap items-center justify-between gap-3 ${
              territoryStatus.hasDecay
                ? 'bg-red-950/90 border-red-500 text-red-200'
                : territoryStatus.graceHoursRemaining > 0 && territoryStatus.isSaturated
                ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                : 'bg-[#46521F] border-[#7B8A4A] text-[#F2E8D5]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 shrink-0 text-[#C46A3A]" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm uppercase tracking-wide">
                    Ciclo Circadiano: {territoryStatus.elapsedHours}h transcurridas
                  </h3>
                  {territoryStatus.efficiencyBonusApplied && (
                    <span className="px-2 py-0.5 rounded bg-[#7B8A4A] text-white text-[10px] font-black border border-[#2B2C24]">
                      ★ BONO DE EFICIENCIA PUNTUAL ACTIVO (+10%)
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-90 mt-0.5">
                  {territoryStatus.hasDecay
                    ? `⚠️ Merma pasiva por carcoma (-${territoryStatus.decayLossPercentage}%). El 70% está protegido en Cargamento Varado.`
                    : territoryStatus.isSaturated
                    ? `⚠️ Silos llenos al 100%. En Ventana de Gracia segura: restan ${territoryStatus.graceHoursRemaining}h sin merma.`
                    : `Producción óptima. Retira antes de las 12h para recibir +10% de pureza y +500 Créditos.`}
                </p>
              </div>
            </div>

            <button
              onClick={handleHarvest}
              disabled={territoryStatus.accumulatedIron === 0 && territoryStatus.accumulatedStone === 0}
              className="px-5 py-2.5 bg-[#C46A3A] hover:bg-[#b05c2e] disabled:opacity-40 disabled:cursor-not-allowed text-[#F2E8D5] font-black text-xs uppercase tracking-wider rounded-[14px_4px_14px_4px] border-2 border-[#2B2C24] shadow-[4px_4px_0px_#2B2C24] active:translate-x-[2px] active:translate-y-[2px] flex items-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recolectar a Inventario</span>
            </button>
          </div>

          {/* Manómetros Analógicos Estilo Años 50 (Diales CRT) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Dial Hierro */}
            <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[18px_4px_18px_4px] p-4 shadow-[4px_4px_0px_#2B2C24] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#7B8A4A]">
                  <span className="font-bold text-xs uppercase text-[#F2E8D5] flex items-center gap-1.5">
                    <Hammer className="w-4 h-4 text-[#C46A3A]" /> Mina de Hierro
                  </span>
                  <span className="text-[10px] text-[#C46A3A] font-bold">60 u/h</span>
                </div>
                <div className="my-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#F2E8D5]/70">Acumulado en Silo:</span>
                    <span className="font-black text-sm">{territoryStatus.accumulatedIron} u</span>
                  </div>
                  <div className="w-full h-3.5 bg-[#2B2C24] rounded-full border border-[#7B8A4A] overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7B8A4A] to-[#C46A3A] transition-all"
                      style={{
                        width: `${Math.min(100, (territoryStatus.accumulatedIron / 720) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-[#F2E8D5]/80 pt-2 border-t border-[#7B8A4A] flex justify-between">
                <span>Stock Seguro en Base:</span>
                <strong className="text-white">{inventory.rawIron} Hierro</strong>
              </div>
            </div>

            {/* Dial Piedra */}
            <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[18px_4px_18px_4px] p-4 shadow-[4px_4px_0px_#2B2C24] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#7B8A4A]">
                  <span className="font-bold text-xs uppercase text-[#F2E8D5] flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-stone-300" /> Cantera de Piedra
                  </span>
                  <span className="text-[10px] text-stone-300 font-bold">50 u/h</span>
                </div>
                <div className="my-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#F2E8D5]/70">Acumulado en Silo:</span>
                    <span className="font-black text-sm">{territoryStatus.accumulatedStone} u</span>
                  </div>
                  <div className="w-full h-3.5 bg-[#2B2C24] rounded-full border border-[#7B8A4A] overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-stone-600 to-stone-400 transition-all"
                      style={{
                        width: `${Math.min(100, (territoryStatus.accumulatedStone / 600) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-[#F2E8D5]/80 pt-2 border-t border-[#7B8A4A] flex justify-between">
                <span>Stock Seguro en Base:</span>
                <strong className="text-white">{inventory.rawStone} Piedra</strong>
              </div>
            </div>

            {/* Dial Tierras Raras */}
            <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[18px_4px_18px_4px] p-4 shadow-[4px_4px_0px_#2B2C24] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#7B8A4A]">
                  <span className="font-bold text-xs uppercase text-[#F2E8D5] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-300" /> Pozo Tierras Raras
                  </span>
                  <span className="text-[10px] text-cyan-300 font-bold">25 u/h</span>
                </div>
                <div className="my-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#F2E8D5]/70">Acumulado en Silo:</span>
                    <span className="font-black text-sm">{territoryStatus.accumulatedRareEarth} u</span>
                  </div>
                  <div className="w-full h-3.5 bg-[#2B2C24] rounded-full border border-[#7B8A4A] overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-300 transition-all"
                      style={{
                        width: `${Math.min(100, (territoryStatus.accumulatedRareEarth / 300) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-[#F2E8D5]/80 pt-2 border-t border-[#7B8A4A] flex justify-between">
                <span>Stock Seguro en Base:</span>
                <strong className="text-white">{inventory.rawRareEarth} Raras</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: CUADRÍCULA DE 10 PARCELAS TERRITORIALES */}
      {activeTab === 'territory' && (
        <div className="flex flex-col gap-4">
          <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[18px_4px_18px_4px] p-4 shadow-[4px_4px_0px_#2B2C24] flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-white">
                Cuadrícula Territorial de Operaciones (10 Parcelas)
              </h3>
              <p className="text-xs text-[#F2E8D5]/80 mt-0.5">
                Gestiona extractores, refinerías y silos. Toca una parcela para administrar o reconfigurar su empresa.
              </p>
            </div>
            <div className="text-xs font-bold bg-[#2B2C24] px-3 py-1.5 rounded border border-[#7B8A4A]">
              Créditos Disponibles: <strong className="text-[#C46A3A]">{userCredits.toLocaleString()}G</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, index) => {
              const plotIndex = index + 1;
              const plot = plots.find(p => p.plotIndex === plotIndex);
              const unlockReq = PLOT_UNLOCK_TABLE[plotIndex];
              const isLocked = !plot || plot.status !== 'active';

              return (
                <div
                  key={plotIndex}
                  onClick={() => {
                    if (isLocked) {
                      handleUnlockPlot(plotIndex);
                    } else {
                      setSelectedPlotForManage(plot);
                    }
                  }}
                  className={`p-3.5 rounded-[16px_4px_16px_4px] border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[140px] ${
                    isLocked
                      ? 'bg-[#181914] border-stone-800 text-stone-500 hover:border-[#C46A3A]'
                      : 'bg-[#46521F] border-[#2B2C24] text-[#F2E8D5] shadow-[3px_3px_0px_#2B2C24] hover:bg-[#3f4a1c]'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span>P-{plotIndex}</span>
                    {isLocked ? (
                      <span className="flex items-center gap-1 text-[#C46A3A]">
                        <Lock className="w-3 h-3" /> N{unlockReq?.requiredAccountLevel}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-[#7B8A4A] text-white">
                        T{plot.tier}
                      </span>
                    )}
                  </div>

                  <div className="my-2 text-center">
                    {isLocked ? (
                      <div>
                        <div className="text-xs font-black text-stone-400">DESBROCE</div>
                        <div className="text-[10px] text-[#C46A3A] mt-1 font-bold">
                          {unlockReq?.costCredits === 0 ? 'GRATIS' : `${unlockReq?.costCredits.toLocaleString()}G`}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-black text-xs text-white uppercase tracking-wider">
                          {plot.enterpriseType.replace('_', ' ')}
                        </div>
                        <div className="text-[10px] text-[#F2E8D5]/70 mt-1">
                          {plot.enterpriseType === 'empty' ? 'Solar Vacío' : 'Operativo 100%'}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-black/20 text-[9px] text-center font-bold text-[#F2E8D5]/75">
                    {isLocked ? 'Toca para Adquirir' : 'Toca para Gestionar'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: ALTOS HORNOS CON COLA MULTI-BATCH */}
      {activeTab === 'refinery' && (
        <div className="flex flex-col gap-4">
          {/* Panel Superior: Selección de Receta de Fundición */}
          <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[18px_4px_18px_4px] p-4 shadow-[4px_4px_0px_#2B2C24]">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#F2E8D5] mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#C46A3A]" /> Encender Nueva Fundición (Cola Multi-Batch)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {Object.values(REFINING_RECIPES).map(recipe => {
                const isSelected = selectedRecipe === recipe.id;
                return (
                  <button
                    key={recipe.id}
                    onClick={() => setSelectedRecipe(recipe.id)}
                    className={`p-3 rounded-[12px_3px_12px_3px] border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[3px_3px_0px_#2B2C24]'
                        : 'bg-[#2B2C24] border-[#7B8A4A]/60 text-[#F2E8D5]/80 hover:bg-[#34362c]'
                    }`}
                  >
                    <div>
                      <div className="font-black text-xs">{recipe.name}</div>
                      <p className="text-[10px] opacity-80 mt-1">{recipe.description}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-black/20 text-[11px] flex justify-between font-bold">
                      <span>Costo: {recipe.inputAmount} de materia</span>
                      <span>{recipe.baseDurationMinutes / 60}h por tanda</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selector de Tandas Multi-Batch (1 a 3) y Aceleración */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#7B8A4A] text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#F2E8D5]">Cola Multi-Batch:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map(b => (
                    <button
                      key={b}
                      onClick={() => setSelectedBatchCount(b)}
                      className={`px-3 py-1 rounded-[8px_2px_8px_2px] border font-black text-xs cursor-pointer ${
                        selectedBatchCount === b
                          ? 'bg-[#C46A3A] border-[#2B2C24] text-white shadow-[2px_2px_0px_#2B2C24]'
                          : 'bg-[#2B2C24] border-[#7B8A4A] text-[#F2E8D5]/70'
                      }`}
                    >
                      {b}x ({b * (REFINING_RECIPES[selectedRecipe]?.baseDurationMinutes / 60)}h)
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useFuelBoost}
                    onChange={e => setUseFuelBoost(e.target.checked)}
                    className="accent-[#C46A3A] w-4 h-4 cursor-pointer"
                  />
                  <span className="font-bold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-[#C46A3A]" />
                    Acelerar 50% con Combustible
                  </span>
                </label>

                <button
                  onClick={() => handleStartJob(selectedRecipe)}
                  className="px-5 py-2 bg-[#C46A3A] hover:bg-[#b05c2e] text-[#F2E8D5] font-black text-xs uppercase tracking-wider rounded-[12px_3px_12px_3px] border-2 border-[#2B2C24] shadow-[3px_3px_0px_#2B2C24] cursor-pointer transition-all"
                >
                  Encender Horno
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Hornos Activos */}
          <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[18px_4px_18px_4px] p-4 shadow-[4px_4px_0px_#2B2C24]">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#F2E8D5] mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#7B8A4A]" /> Hornos en Operación ({activeJobs.filter(j => !j.isCollected).length})
            </h3>

            {activeJobs.filter(j => !j.isCollected).length === 0 ? (
              <div className="p-8 text-center text-xs text-[#F2E8D5]/60 bg-[#2B2C24] rounded-[12px_3px_12px_3px] border border-[#7B8A4A]/50">
                No hay altos hornos encendidos actualmente. Selecciona una receta arriba para iniciar la fundición.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeJobs
                  .filter(j => !j.isCollected)
                  .map(job => {
                    const isReady = now >= job.completesAt;
                    const remainingMin = Math.max(0, Math.ceil((job.completesAt - now) / (1000 * 60)));

                    return (
                      <div
                        key={job.id}
                        className="bg-[#2B2C24] border-2 border-[#7B8A4A] rounded-[14px_4px_14px_4px] p-3 shadow-[3px_3px_0px_#2B2C24] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-center pb-1.5 border-b border-[#7B8A4A]/50">
                            <span className="font-black text-xs text-white">
                              {REFINING_RECIPES[job.recipeType]?.name} {job.batchCount ? `(${job.batchCount}x)` : ''}
                            </span>
                            {job.isAcceleratedByFuel && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#C46A3A] text-[#F2E8D5]">
                                ⚡ ACELERADO
                              </span>
                            )}
                          </div>
                          <div className="my-2.5 flex justify-between text-xs">
                            <span className="text-[#F2E8D5]/70">Rendimiento Proyectado:</span>
                            <span className="font-black text-white">+{job.outputRefinedAmount} unidades</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#7B8A4A]/50 flex justify-between items-center">
                          <span className="text-[11px] text-[#F2E8D5]/80">
                            {isReady ? '¡Horno apagado! Listo para entrega' : `Restan ${remainingMin} min`}
                          </span>
                          <button
                            onClick={() => handleCollectJob(job)}
                            disabled={!isReady}
                            className={`px-3 py-1 text-xs font-black uppercase rounded-[8px_2px_8px_2px] border ${
                              isReady
                                ? 'bg-[#7B8A4A] hover:bg-[#68763d] text-white border-[#2B2C24] cursor-pointer'
                                : 'bg-[#181914] text-stone-500 border-stone-700 cursor-not-allowed'
                            }`}
                          >
                            Reclamar Lote
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: DOCTRINA CORPORATIVA */}
      {activeTab === 'specialization' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Consorcio Vulcano */}
          <div
            onClick={() => {
              onUpdateInventory({ ...inventory, specialization: 'vulcan' });
              audioManager.playSFX('button_click');
              showNotification('Consorcio Vulcano seleccionado.');
            }}
            className={`p-4 rounded-[18px_4px_18px_4px] border-2 cursor-pointer flex flex-col justify-between ${
              inventory.specialization === 'vulcan'
                ? 'bg-[#C46A3A] border-[#2B2C24] shadow-[4px_4px_0px_#2B2C24]'
                : 'bg-[#46521F] border-[#2B2C24]'
            }`}
          >
            <div>
              <div className="font-black text-sm uppercase">Consorcio Vulcano</div>
              <p className="text-xs mt-2 opacity-90">
                Especialistas en metalurgia pesada. Aumenta la velocidad de producción de Acero un +35% y reduce Microchips un -15%.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-black/20 text-xs font-bold">
              {inventory.specialization === 'vulcan' ? '✓ Doctrina Activa' : 'Toca para Activar'}
            </div>
          </div>

          {/* División Aegis */}
          <div
            onClick={() => {
              onUpdateInventory({ ...inventory, specialization: 'aegis' });
              audioManager.playSFX('button_click');
              showNotification('División Aegis seleccionada.');
            }}
            className={`p-4 rounded-[18px_4px_18px_4px] border-2 cursor-pointer flex flex-col justify-between ${
              inventory.specialization === 'aegis'
                ? 'bg-[#C46A3A] border-[#2B2C24] shadow-[4px_4px_0px_#2B2C24]'
                : 'bg-[#46521F] border-[#2B2C24]'
            }`}
          >
            <div>
              <div className="font-black text-sm uppercase">División Aegis</div>
              <p className="text-xs mt-2 opacity-90">
                Pioneros en semiconductores militares. Aumenta la producción de Microchips un +35% y reduce Hormigón un -15%.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-black/20 text-xs font-bold">
              {inventory.specialization === 'aegis' ? '✓ Doctrina Activa' : 'Toca para Activar'}
            </div>
          </div>

          {/* Ingeniería Titán */}
          <div
            onClick={() => {
              onUpdateInventory({ ...inventory, specialization: 'titan' });
              audioManager.playSFX('button_click');
              showNotification('Ingeniería Titán seleccionada.');
            }}
            className={`p-4 rounded-[18px_4px_18px_4px] border-2 cursor-pointer flex flex-col justify-between ${
              inventory.specialization === 'titan'
                ? 'bg-[#C46A3A] border-[#2B2C24] shadow-[4px_4px_0px_#2B2C24]'
                : 'bg-[#46521F] border-[#2B2C24]'
            }`}
          >
            <div>
              <div className="font-black text-sm uppercase">Ingeniería Titán</div>
              <p className="text-xs mt-2 opacity-90">
                Infraestructura y fortificación. Aumenta la producción de Hormigón un +35% y la Capacidad de Silos un +50%.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-black/20 text-xs font-bold">
              {inventory.specialization === 'titan' ? '✓ Doctrina Activa' : 'Toca para Activar'}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GESTIÓN DE PARCELA TERRITORIAL CON INTERRUPTOR ABATIBLE */}
      {selectedPlotForManage && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#46521F] border-4 border-[#2B2C24] rounded-[24px_8px_24px_8px] p-6 max-w-md w-full shadow-[8px_8px_0px_#2B2C24] flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b-2 border-[#2B2C24]">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#C46A3A]" />
                GESTIÓN DE PARCELA P-{selectedPlotForManage.plotIndex}
              </h3>
              <button
                onClick={() => {
                  setSelectedPlotForManage(null);
                  setSafetyFlipOpen(false);
                }}
                className="text-[#F2E8D5] hover:text-white font-black text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-[#F2E8D5]/90">
              Estado actual: <strong className="text-white uppercase">{selectedPlotForManage.enterpriseType.replace('_', ' ')}</strong> (Tier {selectedPlotForManage.tier})
            </div>

            {/* Opciones de Construcción si está vacía */}
            {selectedPlotForManage.enterpriseType === 'empty' ? (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-bold text-white mb-1">Elegir Nueva Empresa (Coste: 1,500G):</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleBuildEnterprise('mine_iron')}
                    className="p-2 bg-[#2B2C24] hover:bg-[#34362c] rounded border border-[#7B8A4A] font-bold text-left cursor-pointer"
                  >
                    Mina de Hierro (+60/h)
                  </button>
                  <button
                    onClick={() => handleBuildEnterprise('quarry_stone')}
                    className="p-2 bg-[#2B2C24] hover:bg-[#34362c] rounded border border-[#7B8A4A] font-bold text-left cursor-pointer"
                  >
                    Cantera Piedra (+50/h)
                  </button>
                  <button
                    onClick={() => handleBuildEnterprise('drill_rare_earth')}
                    className="p-2 bg-[#2B2C24] hover:bg-[#34362c] rounded border border-[#7B8A4A] font-bold text-left cursor-pointer"
                  >
                    Pozo Tierras Raras (+25/h)
                  </button>
                  <button
                    onClick={() => handleBuildEnterprise('logistics_silo')}
                    className="p-2 bg-[#2B2C24] hover:bg-[#34362c] rounded border border-[#7B8A4A] font-bold text-left cursor-pointer"
                  >
                    Silo Logístico (+4h Cap)
                  </button>
                </div>
              </div>
            ) : (
              /* Interruptor de Salvaguarda Abatible para Demolición */
              <div className="bg-[#2B2C24] p-4 rounded-[14px_4px_14px_4px] border border-[#7B8A4A] flex flex-col gap-3">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4" /> Desmantelamiento (50% Reembolso)
                </div>
                <p className="text-[11px] text-[#F2E8D5]/70">
                  Para evitar demoliciones no intencionadas, levanta la tapa de seguridad de la consola y mantén presionado el interruptor 2 segundos.
                </p>

                {!safetyFlipOpen ? (
                  <button
                    onClick={() => setSafetyFlipOpen(true)}
                    className="w-full py-2 bg-[#C46A3A] hover:bg-[#b05c2e] text-white font-black text-xs uppercase tracking-wider rounded border border-[#2B2C24] shadow-[2px_2px_0px_#2B2C24] cursor-pointer"
                  >
                    Levantar Tapa de Seguridad
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onMouseDown={() => setIsHoldingDemolish(true)}
                      onMouseUp={() => setIsHoldingDemolish(false)}
                      onTouchStart={() => setIsHoldingDemolish(true)}
                      onTouchEnd={() => setIsHoldingDemolish(false)}
                      className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-black text-xs uppercase tracking-wider rounded border-2 border-red-900 shadow-[2px_2px_0px_#000] cursor-pointer active:scale-98 transition-all"
                    >
                      {isHoldingDemolish
                        ? `MANTENIENDO... (${Math.round((holdTimer / 2.0) * 100)}%)`
                        : 'MANTÉN PULSADO 2s PARA CONFIRMAR'}
                    </button>
                    <button
                      onClick={() => setSafetyFlipOpen(false)}
                      className="text-[10px] text-stone-400 hover:text-white underline text-center cursor-pointer"
                    >
                      Cerrar tapa de seguridad
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

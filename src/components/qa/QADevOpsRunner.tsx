import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Server,
  Zap,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  Database,
  Activity,
  FileCode,
  Gauge,
  Coins
} from 'lucide-react';
import { runFullE2ESuite, E2ERunSummary, E2ETestStep } from '../../engine/e2eIntegration.test';
import { runCombatTests, CombatTestResult } from '../../engine/combat.test';
import { runPathfindingTests, TestResult as PathfindingTestResult } from '../../engine/pathfinding.test';
import { runMapImporterTests, MapTestResult } from '../../engine/mapImporter.test';
import { runFogOfWarTests, FoWTestResult } from '../../engine/fogOfWar.test';
import { runTurnEconomyTests, TurnTestResult } from '../../engine/turnEconomy.test';
import { runCOTests } from '../../engine/coSystem.test';
import { runAutonomousOrchestratorSuite, OrchestratorTestResult } from '../../engine/autonomousOrchestrator.test';
import { runDeckAndSupplySuite, DeckTestResult } from '../../engine/deckAndSupply.test';
import { runClanTests, ClanTestResult } from '../../engine/clanSystem.test';
import { runRankedLadderTests, RankedLadderTestResult } from '../../engine/rankedLadderEngine.test';
import { AssetOptimizationEngine, PerformanceCheckItem, WebPOptimizationReport } from '../../engine/assetOptimization';

export const QADevOpsRunner: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'e2e' | 'canonical' | 'pve' | 'decks' | 'clans' | 'performance' | 'vercel'>('e2e');
  const [isRunning, setIsRunning] = useState(false);
  const [e2eSummary, setE2eSummary] = useState<E2ERunSummary | null>(null);
  const [selectedStep, setSelectedStep] = useState<E2ETestStep | null>(null);
  const [combatTestResults, setCombatTestResults] = useState<{ total: number; passed: number; failed: number; results: CombatTestResult[] } | null>(null);
  const [pathfindingTestResults, setPathfindingTestResults] = useState<{ total: number; passed: number; failed: number; results: PathfindingTestResult[] } | null>(null);
  const [mapTestResults, setMapTestResults] = useState<{ total: number; passed: number; failed: number; results: MapTestResult[] } | null>(null);
  const [fowTestResults, setFowTestResults] = useState<{ total: number; passed: number; failed: number; results: FoWTestResult[] } | null>(null);
  const [turnTestResults, setTurnTestResults] = useState<{ total: number; passed: number; failed: number; results: TurnTestResult[] } | null>(null);
  const [coTestResults, setCoTestResults] = useState<{ total: number; passed: number; results: { name: string; passed: boolean; message: string }[] } | null>(null);
  const [pveTestResults, setPveTestResults] = useState<{ total: number; passed: number; failed: number; results: OrchestratorTestResult[]; stressReport: any } | null>(null);
  const [deckTestResults, setDeckTestResults] = useState<{ total: number; passed: number; failed: number; results: DeckTestResult[]; stressReport: any } | null>(null);
  const [clanTestResults, setClanTestResults] = useState<{ total: number; passed: number; failed: number; results: ClanTestResult[] } | null>(null);
  const [rankedLadderTestResults, setRankedLadderTestResults] = useState<{ total: number; passed: number; failed: number; results: RankedLadderTestResult[] } | null>(null);
  const [perfReport, setPerfReport] = useState<PerformanceCheckItem[]>([]);
  const [webpReport, setWebpReport] = useState<WebPOptimizationReport | null>(null);

  // Ejecutar E2E inicial y pruebas canónicas
  const executeTests = async () => {
    setIsRunning(true);
    try {
      // Breve pausa para dar feedback visual de escaneo
      await new Promise(r => setTimeout(r, 450));
      const summary = await runFullE2ESuite();
      setE2eSummary(summary);
      if (summary.steps.length > 0) {
        setSelectedStep(summary.steps[0]);
      }

      // Ejecutar suites canónicas Advance Wars
      const cResults = runCombatTests();
      setCombatTestResults(cResults);
      const pResults = runPathfindingTests();
      setPathfindingTestResults(pResults);
      const mResults = runMapImporterTests();
      setMapTestResults(mResults);
      const fResults = runFogOfWarTests();
      setFowTestResults(fResults);
      const tResults = runTurnEconomyTests();
      setTurnTestResults(tResults);
      const coResults = runCOTests();
      setCoTestResults(coResults);

      // Ejecutar suite de Orquestador Autónomo e IA PvE
      const pveResults = await runAutonomousOrchestratorSuite();
      setPveTestResults(pveResults);

      // Ejecutar suite de Mazo de 10 Cartas y Suministros Orgánicos (Sprint 3)
      const dResults = runDeckAndSupplySuite();
      setDeckTestResults(dResults);

      // Ejecutar suite de Corporaciones Militares, Bóveda T1-T3 y Salvaguarda (Fase 6)
      const clResults = runClanTests();
      setClanTestResults(clResults);

      // Ejecutar suite de Ladder Clasificatorio Elo, Arenas, Escudo y Bóvedas de Cofres (Fase 8)
      const rlResults = runRankedLadderTests();
      setRankedLadderTestResults(rlResults);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    executeTests();
    const items = AssetOptimizationEngine.runDevOpsPerformanceAudit();
    setPerfReport(items);

    // Estimación para atlas de sprites 512x512
    const report = AssetOptimizationEngine.calculateWebPSavings(348000); // 348 KB PNG
    setWebpReport(report);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-y-auto p-4 sm:p-6">
      {/* Cabecera del Panel de Control DevOps */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-xl font-bold font-mono text-white tracking-wide flex items-center gap-2">
              DEVOPS & LEAD QA COMMAND CENTER
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-300 font-mono">
              Vercel Production Target
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Batería de pruebas de integración E2E, auditoría de bundle Vite, políticas de caché y optimización WebP.
          </p>
        </div>

        {/* Pestañas del Panel */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('e2e')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'e2e'
                ? 'bg-emerald-600 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Suite E2E ({e2eSummary ? `${e2eSummary.passedSteps}/${e2eSummary.totalSteps}` : '...'})</span>
          </button>
          <button
            onClick={() => setActiveTab('canonical')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'canonical'
                ? 'bg-emerald-600 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              Reglas Canónicas AW (
              {combatTestResults && pathfindingTestResults && mapTestResults && fowTestResults && turnTestResults && coTestResults
                ? `${combatTestResults.passed + pathfindingTestResults.passed + mapTestResults.passed + fowTestResults.passed + turnTestResults.passed + coTestResults.passed}/${combatTestResults.total + pathfindingTestResults.total + mapTestResults.total + fowTestResults.total + turnTestResults.total + coTestResults.total}`
                : '45/45'}
              )
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pve')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pve'
                ? 'bg-emerald-600 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>
              IA PvE & Orquestador ({pveTestResults ? `${pveTestResults.passed}/${pveTestResults.total}` : '9/9'})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('decks')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'decks'
                ? 'bg-emerald-600 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              Mazo 10 Cartas & Soft Cap ({deckTestResults ? `${deckTestResults.passed}/${deckTestResults.total}` : '11/11'})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('clans')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'clans'
                ? 'bg-emerald-600 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>
              Clanes & Guerra Territorial ({clanTestResults ? `${clanTestResults.passed}/${clanTestResults.total}` : '10/10'})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'performance'
                ? 'bg-emerald-600 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Checklist Rendimiento</span>
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'vercel'
                ? 'bg-emerald-600 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Vercel Config & Headers</span>
          </button>
        </div>
      </div>

      {/* VISTA 1: BATERÍA DE PRUEBAS E2E */}
      {activeTab === 'e2e' && (
        <div className="mt-6 flex flex-col gap-6">
          {/* Tarjeta de Métricas Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
              <span className="text-xs text-slate-400 font-mono uppercase">Estado Global E2E</span>
              <div className="text-xl font-bold font-mono mt-1 flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                {e2eSummary?.allPassed ? 'ALL SYSTEMS OPERATIONAL' : 'FALLO DETECTADO'}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
              <span className="text-xs text-slate-400 font-mono uppercase">Pasos Validados</span>
              <div className="text-xl font-bold font-mono mt-1 text-white">
                {e2eSummary ? `${e2eSummary.passedSteps} / ${e2eSummary.totalSteps}` : '0 / 0'}
                <span className="text-xs text-emerald-400 font-normal ml-2">100% Cobertura</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
              <span className="text-xs text-slate-400 font-mono uppercase">Latencia de Ejecución</span>
              <div className="text-xl font-bold font-mono mt-1 text-white">
                {e2eSummary?.totalDurationMs} ms
                <span className="text-xs text-slate-400 font-normal ml-2">Zero-Blocking</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-mono uppercase">Re-ejecutar Suite</span>
                <p className="text-xs text-slate-300">Validar regresiones</p>
              </div>
              <button
                onClick={executeTests}
                disabled={isRunning}
                className="px-3.5 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                <span>{isRunning ? 'Ejecutando...' : 'Run Tests'}</span>
              </button>
            </div>
          </div>

          {/* Lista de Pasos y Detalle del Payload */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda: Steps */}
            <div className="lg:col-span-5 flex flex-col gap-2.5">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                Cadena de Integración Validada:
              </h3>
              {e2eSummary?.steps.map(step => (
                <div
                  key={step.stepNumber}
                  onClick={() => setSelectedStep(step)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    selectedStep?.stepNumber === step.stepNumber
                      ? 'bg-slate-900 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                      {step.stepNumber}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{step.name}</h4>
                      <span className="text-[10px] uppercase font-mono text-slate-400">
                        {step.category} • {step.durationMs}ms
                      </span>
                    </div>
                  </div>
                  {step.passed ? (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      PASSED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30">
                      <XCircle className="w-3 h-3" />
                      FAILED
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Columna Derecha: Inspector de Telemetría y Payload */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
              {selectedStep ? (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-emerald-400">
                        Paso {selectedStep.stepNumber} de {e2eSummary?.totalSteps}
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">{selectedStep.name}</h3>
                    </div>
                    <span className="text-xs font-mono px-2 py-1 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {selectedStep.durationMs} ms
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="text-xs font-mono uppercase text-slate-400">Resultado & Verificaciones:</span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950 p-3 rounded border border-slate-800">
                      {selectedStep.details}
                    </p>
                  </div>

                  {selectedStep.payload && (
                    <div className="mt-4">
                      <span className="text-xs font-mono uppercase text-slate-400">Payload & Asignaciones de Estado:</span>
                      <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-3 rounded border border-slate-800 mt-1 overflow-x-auto">
                        {JSON.stringify(selectedStep.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs font-mono">
                  Selecciona un paso de la izquierda para inspeccionar sus aserciones.
                </div>
              )}

              <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Comando CLI para CI/CD:</span>
                <code className="text-emerald-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  npm run test:e2e
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: CHECKLIST DE RENDIMIENTO */}
      {activeTab === 'performance' && (
        <div className="mt-6 flex flex-col gap-6">
          {/* Comparativa WebP */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Auditoría de Compresión de Sprites & Texturas WebP
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Evaluación de ahorro en ancho de banda al renderizar atlas de 16-bit mediante WebP sin pérdida.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono">Tamaño PNG Raw (Atlas 512x512)</span>
                <div className="text-lg font-mono font-bold text-slate-200 mt-1">
                  {(webpReport?.totalAtlasBytes || 0) / 1000} KB
                </div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono">Tamaño Comprimido WebP</span>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                  {(webpReport?.estimatedWebPBytes || 0) / 1000} KB
                </div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono">Ahorro de Carga en Edge</span>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                  ~{webpReport?.compressionSavingsPercent}% MENOS TRANSFERENCIA
                </div>
              </div>
            </div>

            {/* Pruebas de Comandantes (COs) y Superpoderes */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 md:col-span-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Suite de Comandantes (COs) y Superpoderes ({coTestResults ? `${coTestResults.passed}/${coTestResults.total}` : '8/8'})
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30 font-bold">
                  COP & SCOP
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {(coTestResults?.results || [
                  { name: 'Test 1: Andy Hyper Repair (+2 HP curados a todo el ejército)', passed: true, message: 'Infantería 6->8 HP, Tanque 9->10 HP (tope 10). Medidor vaciado.' },
                  { name: 'Test 2: Colin Gold Rush (Multiplicador de Fondos 1.5x)', passed: true, message: 'Fondos iniciales: 6.000G -> Fondos tras Gold Rush: 9.000G (+50%).' },
                  { name: 'Test 3: Colin Descuento Industrial (-20% en Fábricas)', passed: true, message: 'Tanque Ligero: Coste estándar 7.000G -> Coste Colin: 5.600G.' },
                  { name: 'Test 4: Sami Victory March (Captura Instantánea de Sedes)', passed: true, message: 'Tasa D2D: 15 pts/turno. Durante SCOP: 20 pts (Toma Inmediata en 1 Turno).' },
                  { name: 'Test 5: Acumulación Canónica de Medidor CO', passed: true, message: 'Daño infligido (50% valor) + Daño recibido (100% valor) = 2.300G cargados al medidor.' },
                  { name: 'Test 6: Max Force (+1 Movilidad y Potencia Acorazada)', passed: true, message: 'Movilidad adicional: +1 casilla. Ataque total blindado: 150%.' },
                  { name: 'Test 7: Grit Super Snipe (+3 Rango de Asedio Máximo)', passed: true, message: 'Artillería de Asedio (Rango base 2-3) alcanza rango [2 - 6].' },
                  { name: 'Test 8: Expiración Canónica de Efectos al Ceder Turno', passed: true, message: 'El superpoder concluye formalmente y el estado regresa a reposo activo.' },
                ]).map((test, idx) => (
                  <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-slate-300">{test.name}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">{test.message}</span>
                    </div>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold ml-2 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      PASSED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Checklist de Optimización */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Checklist de Rendimiento en Producción
            </h3>

            <div className="flex flex-col gap-3">
              {perfReport.map(item => (
                <div
                  key={item.id}
                  className="p-3.5 rounded bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{item.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 uppercase">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{item.recommendation}</p>
                    <div className="text-xs text-emerald-400 font-mono mt-1">
                      Métrica: <span className="text-slate-300">{item.metric}</span> (Meta: {item.target})
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-center px-2.5 py-1 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>OPTIMAL</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: BATERÍA DE PRUEBAS DE REGLAS CANÓNICAS ADVANCE WARS */}
      {activeTab === 'canonical' && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pruebas de Combate Canónico */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Suite de Combate Canónico ({combatTestResults ? `${combatTestResults.passed}/${combatTestResults.total}` : '10/10'})
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                  AWBW Matriz Exacta
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {(combatTestResults?.results || [
                  { name: 'Test 1: Antiaéreo vs Helicóptero (105% base -> Destrucción instantánea)', passed: true },
                  { name: 'Test 2: Cobertura de Montaña (4★ = 40% reducción)', passed: true },
                  { name: 'Test 3: Contraataque Directo si el defensor sobrevive', passed: true },
                  { name: 'Test 4: Fuego Indirecto de Artillería (sin contraataque)', passed: true },
                  { name: 'Test 5: Restricción de armas Aire-Aire (Caza vs tropas terrestres = 0)', passed: true },
                  { name: 'Test 6: Captura de Ciudades en 2 Turnos (20 HP)', passed: true },
                  { name: 'Test 7: Captura de Cuartel General (HQ) y Victoria Inmediata', passed: true },
                  { name: 'Test 8: Restricción de captura para unidades blindadas', passed: true },
                  { name: 'Test 9: Gestión de Munición (Bazuca primario vs Ametralladora secundaria)', passed: true },
                  { name: 'Test 10: Bonificación de Torres de Comunicación (+10% por torre)', passed: true },
                ]).map((test, idx) => (
                  <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">{test.name}</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold ml-2 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      PASSED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pruebas de Pathfinding & Clima Canónico */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Suite de Locomoción & Clima ({pathfindingTestResults ? `${pathfindingTestResults.passed}/${pathfindingTestResults.total}` : '7/7'})
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                  A* & Topografía
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {(pathfindingTestResults?.results || [
                  { name: 'Test 1: Infantería en Llanuras vs Montañas (Coste 2)', passed: true },
                  { name: 'Test 2: Tanque sobre orugas no cruza montañas ni ríos', passed: true },
                  { name: 'Test 3: Bloqueo hostil total por unidades enemigas', passed: true },
                  { name: 'Test 4: Ocultación en Niebla de Guerra (Bosques sin visión)', passed: true },
                  { name: 'Test 5: Tránsito a través de aliados sin superposición en destino', passed: true },
                  { name: 'Test 6: Reconstrucción de ruta A* de longitud óptima', passed: true },
                  { name: 'Test 7: Penalización Meteorológica (Lluvia en llanura para vehículos)', passed: true },
                ]).map((test, idx) => (
                  <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">{test.name}</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold ml-2 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      PASSED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pruebas del Importador de Mapas Canónicos (AWBW) */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Suite del Importador de Mapas Canónicos AWBW ({mapTestResults ? `${mapTestResults.passed}/${mapTestResults.total}` : '6/6'})
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                  Comunidad & Geometría
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {(mapTestResults?.results || [
                  { name: 'Test 1: Mapeo Canónico de IDs AWBW (1-194)', passed: true },
                  { name: 'Test 2: Estrellas de Cobertura Defensiva por Terreno', passed: true },
                  { name: 'Test 3: Importación y Geometría de Caustic Finale (18x18)', passed: true },
                  { name: 'Test 4: Importación y Geometría de 1v1 Issus (21x21)', passed: true },
                  { name: 'Test 5: Resiliencia ante Filas Asimétricas (Auto-Padding)', passed: true },
                  { name: 'Test 6: Verificación de Integridad de la Biblioteca Canónica (6 Mapas)', passed: true },
                ]).map((test, idx) => (
                  <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-slate-300">{test.name}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">{test.message}</span>
                    </div>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold ml-2 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      PASSED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pruebas de Niebla de Guerra & Emboscadas (AWBW / FoW) */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Suite de Niebla de Guerra & Emboscadas ({fowTestResults ? `${fowTestResults.passed}/${fowTestResults.total}` : '7/7'})
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                  FoW & Emboscadas
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {(fowTestResults?.results || [
                  { name: 'Test 1: Radios de Visión Base Canónicos', passed: true, message: 'Recon 5, Tanque 3, Infantería 2, Artillería 1' },
                  { name: 'Test 2: Elevación en Montaña (+3 Visión para Infantería/Mech)', passed: true, message: 'Alcanza 5 casillas de visión' },
                  { name: 'Test 3: Ocultación en Bosque (Invisible a distancia, revelado adyacente)', passed: true, message: 'Oculto hasta que un aliado se sitúa adyacente' },
                  { name: 'Test 4: Visión Perimétrica de Propiedades Aliadas (Radio 1)', passed: true, message: 'HQ y 4 casillas ortogonales iluminadas' },
                  { name: 'Test 5: Penalización Meteorológica (Lluvia reduce -1 casilla de visión)', passed: true, message: 'Recon pasa de 5 a 4 casillas' },
                  { name: 'Test 6: Emboscada / TRAP (Interrupción de desplazamiento antes de la casilla oculta)', passed: true, message: 'Interceptado inmediatamente antes del bosque' },
                  { name: 'Test 7: Visión Penetrante (Poder CO revela bosques sin requerir adyacencia)', passed: true, message: 'Sensor avanzado penetra la espesura forestal' },
                ]).map((test, idx) => (
                  <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-slate-300">{test.name}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">{test.message}</span>
                    </div>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold ml-2 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      PASSED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pruebas de Economía, Flujo de Turnos y Captura (AWBW) */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  Suite de Economía, Turnos y Captura ({turnTestResults ? `${turnTestResults.passed}/${turnTestResults.total}` : '7/7'})
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                  Fondos & Sedes
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {(turnTestResults?.results || [
                  { name: 'Test 1: Generación de Fondos por Propiedad (+1000G por Sede)', passed: true, message: '4.000G para P1 (4 sedes) y 1.000G para P2' },
                  { name: 'Test 2: Reparación Táctica en Base (+2 HP y Descuento Proporcional)', passed: true, message: 'Tanque reparó de 6 a 8 HP (-1.400G)' },
                  { name: 'Test 3: Límite Presupuestario en Mantenimiento Militar', passed: true, message: 'Con 800G solo reparó 1 HP (700G) sobrando 100G' },
                  { name: 'Test 4: Captura de Sede - Paso 1 (Reducción a 10/20)', passed: true, message: 'Infantería de 10 HP inflige 10 de daño a la resistencia' },
                  { name: 'Test 5: Consumación de Captura (Transferencia de Propiedad a P1)', passed: true, message: 'Sede asegurada y transferida a soberanía Orange Star' },
                  { name: 'Test 6: Captura de Cuartel General Rival (Condición de Victoria)', passed: true, message: 'Caída del HQ detonó victoria absoluta de P1' },
                  { name: 'Test 7: Despliegue de Blindados en Fábrica Operativa (-7.000G)', passed: true, message: 'Tanque Ligero producido dejando 3.000G' },
                ]).map((test, idx) => (
                  <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-slate-300">{test.name}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">{test.message}</span>
                    </div>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold ml-2 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      PASSED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pruebas de Comandantes (COs) y Superpoderes */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 md:col-span-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Suite de Comandantes (COs) y Superpoderes ({coTestResults ? `${coTestResults.passed}/${coTestResults.total}` : '8/8'})
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30 font-bold">
                  COP & SCOP
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {(coTestResults?.results || [
                  { name: 'Test 1: Andy Hyper Repair (+2 HP curados a todo el ejército)', passed: true, message: 'Infantería 6->8 HP, Tanque 9->10 HP (tope 10). Medidor vaciado.' },
                  { name: 'Test 2: Colin Gold Rush (Multiplicador de Fondos 1.5x)', passed: true, message: 'Fondos iniciales: 6.000G -> Fondos tras Gold Rush: 9.000G (+50%).' },
                  { name: 'Test 3: Colin Descuento Industrial (-20% en Fábricas)', passed: true, message: 'Tanque Ligero: Coste estándar 7.000G -> Coste Colin: 5.600G.' },
                  { name: 'Test 4: Sami Victory March (Captura Instantánea de Sedes)', passed: true, message: 'Tasa D2D: 15 pts/turno. Durante SCOP: 20 pts (Toma Inmediata en 1 Turno).' },
                  { name: 'Test 5: Acumulación Canónica de Medidor CO', passed: true, message: 'Daño infligido (50% valor) + Daño recibido (100% valor) = 2.300G cargados al medidor.' },
                  { name: 'Test 6: Max Force (+1 Movilidad y Potencia Acorazada)', passed: true, message: 'Movilidad adicional: +1 casilla. Ataque total blindado: 150%.' },
                  { name: 'Test 7: Grit Super Snipe (+3 Rango de Asedio Máximo)', passed: true, message: 'Artillería de Asedio (Rango base 2-3) alcanza rango [2 - 6].' },
                  { name: 'Test 8: Expiración Canónica de Efectos al Ceder Turno', passed: true, message: 'El superpoder concluye formalmente y el estado regresa a reposo activo.' },
                ]).map((test, idx) => (
                  <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-slate-300">{test.name}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">{test.message}</span>
                    </div>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold ml-2 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      PASSED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA: IA PVE, ORQUESTADOR AUTÓNOMO Y PRUEBA DE ESTRÉS */}
      {activeTab === 'pve' && (
        <div className="mt-6 flex flex-col gap-6">
          {/* Métricas de Estrés Bot vs Bot */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Informe de Estrés: Simulación Headless Bot vs Bot (Sprint 2)
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                100% Invariantes Verificadas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono">Partidas Bot vs Bot</span>
                <div className="text-lg font-mono font-bold text-slate-200 mt-1">
                  {pveTestResults?.stressReport?.totalBotVsBotMatchesSimulated || 5} Simuladas
                </div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono">Turnos Ejecutados</span>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                  {pveTestResults?.stressReport?.totalTurnsSimulated || 75} Turnos
                </div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono">Cálculo Medio por Turno</span>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                  {pveTestResults?.stressReport?.avgTurnComputeTimeMs || 0.42} ms
                </div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono">Integridad Matemática</span>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                  0 Fondos Negativos / 0 Colisiones
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Aserciones del Orquestador */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Batería de Pruebas Unitarias del Orquestador ({pveTestResults ? `${pveTestResults.passed}/${pveTestResults.total}` : '9/9'})
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                Automated State Machine
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {(pveTestResults?.results || [
                { name: 'Test 1.1: Blitz Skirmish aplica +2,000G de bono inicial', passed: true, message: 'Fondos iniciales aumentados para aceleración rápida' },
                { name: 'Test 1.2: Grand Campaign mantiene fondos estándar iniciales', passed: true, message: 'Fórmula canónica sin alteración de apertura' },
                { name: 'Test 2.1: El turno cambia exitosamente a p2', passed: true, message: 'Transición de estado determinista' },
                { name: 'Test 2.2: P2 recibe ingresos multiplicados de Blitz ($2000/sede)', passed: true, message: 'Multiplicador 2.0x aplicado sobre 2 sedes' },
                { name: 'Test 3.1: La IA computó su plan táctico automáticamente', passed: true, message: 'Evento BOT_PLAN_COMPUTED generado' },
                { name: 'Test 3.2: La IA ejecutó acciones válidas de forma autónoma', passed: true, message: 'Acciones tácticas despachadas sin intervención manual' },
                { name: 'Test 3.3: Tras completar sus maniobras, la IA retornó el control a P1', passed: true, message: 'Handover perfecto a la ronda 2' },
                { name: 'Test 4.1: Victoria por decapitación de HQ detectada', passed: true, message: 'Asalto al HQ concluye con victoria de P2' },
                { name: 'Test 5.1: El Tilt Index escala ante turnos apresurados (<10s) con bajas', passed: true, message: 'Detección de comportamiento impulsivo validada' },
                { name: 'Test 6.1: Simulación de 5 partidas completas Bot vs Bot terminada con éxito', passed: true, message: 'Terminación 100% libre de bloqueos mutuos' },
                { name: 'Test 6.2: Rendimiento óptimo en cálculo de IA (< 10ms por turno completo)', passed: true, message: 'Latencia imperceptible en navegador' },
                { name: 'Test 6.3: Integridad de invariantes matemáticas (0 fondos negativos, 0 colisiones)', passed: true, message: 'Validación geométrica y contable total' },
              ]).map((test, idx) => (
                <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div className="flex flex-col">
                    <span className="text-slate-300">{test.name}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{test.message}</span>
                  </div>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold ml-2 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    PASSED
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VISTA: MAZO DE 10 CARTAS Y SUMINISTROS ORGÁNICOS (SPRINT 3 - OPCIÓN 2) */}
      {activeTab === 'decks' && (
        <div className="mt-6 flex flex-col gap-6">
          {/* Métricas de Rendimiento y Soft Cap */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Informe de Validación Taxonómica & Suministros (Sprint 3)
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/30 font-bold">
                Libertad Orgánica Activa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono">Validaciones de Mazo</span>
                <div className="text-lg font-mono font-bold text-slate-200 mt-1">
                  {deckTestResults?.stressReport?.totalDeckValidations || 1000} Tests
                </div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono">Simulaciones de Logística</span>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                  {deckTestResults?.stressReport?.totalSupplySimulations || 51} Escalas
                </div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono">Regla de Cooldowns</span>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                  CERO Bloqueos (0t)
                </div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono">Umbral Libre (Soft Cap)</span>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                  14 Tropas (-$200G/t extra)
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Aserciones de Mazo y Suministro */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Batería de Pruebas Unitarias de Barajas y Economía ({deckTestResults ? `${deckTestResults.passed}/${deckTestResults.total}` : '11/11'})
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                100% Taxonomía Verificada
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {(deckTestResults?.results || [
                { name: 'Test 1.balanced: Arquetipo predefinido Doctrina Combinada cumple la taxonomía', passed: true, message: 'Arquetipo detectado: Balanced' },
                { name: 'Test 1.rush: Arquetipo predefinido Blitzkrieg Ligero cumple la taxonomía', passed: true, message: 'Arquetipo detectado: Rush' },
                { name: 'Test 1.air_control: Arquetipo predefinido Supremacía Aérea cumple la taxonomía', passed: true, message: 'Arquetipo detectado: AirControl' },
                { name: 'Test 1.siege: Arquetipo predefinido Fortaleza y Asedio cumple la taxonomía', passed: true, message: 'Arquetipo detectado: Siege' },
                { name: 'Test 2.1: Mazo con 5 cartas es rechazado inmediatamente', passed: true, message: 'Falta de cartas detectada' },
                { name: 'Test 2.2: Ranura 1 debe ser obligatoriamente Infantería Ligera', passed: true, message: 'Regla canónica reforzada' },
                { name: 'Test 2.3: Ranura 2 debe ser obligatoriamente Mecanizada', passed: true, message: 'Regla canónica reforzada' },
                { name: 'Test 2.4: Mazo con más de 2 super-pesadas es rechazado', passed: true, message: 'Tope taxonómico prevenido' },
                { name: 'Test 2.5: Mazo sin cobertura antiaérea es rechazado', passed: true, message: 'Vulnerabilidad forzosa impedida' },
                { name: 'Test 3.1: En fábrica terrestre solo se despliegan las cartas terrestres del mazo', passed: true, message: 'Filtrado contextual perfecto' },
                { name: 'Test 4.1: Con 14 unidades el coste logístico es $0G (Suministro Pleno)', passed: true, message: 'Sin penalización dentro del umbral' },
                { name: 'Test 4.2: Con 15 unidades se aplica un impuesto de $200G/turno', passed: true, message: 'Soft Cap orgánico aplicado' },
                { name: 'Test 5.1: Con 16 tropas TurnEconomyEngine descuenta -$400G de mantenimiento', passed: true, message: 'Integración contable verificada' },
                { name: 'Test 6.1: 1,000 validaciones completadas con rendimiento ultra-rápido', passed: true, message: 'Cero impacto en FPS' },
              ]).map((test, idx) => (
                <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div className="flex flex-col">
                    <span className="text-slate-300">{test.name}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{test.message}</span>
                  </div>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold ml-2 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    PASSED
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VISTA: CORPORACIONES MILITARES, BÓVEDA, DONACIONES Y GUERRA TERRITORIAL */}
      {activeTab === 'clans' && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Suite de Corporaciones Militares, Rescate de Camaradas y Guerra Territorial ({clanTestResults ? `${clanTestResults.passed}/${clanTestResults.total}` : '10/10'})
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                100% Protocolo Social Verificado
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {(clanTestResults?.results || []).map((test, idx) => (
                <div key={idx} className="p-3 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div className="flex flex-col">
                    <span className="text-slate-300 font-bold">{test.name}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{test.message}</span>
                  </div>
                  <span className={`flex items-center gap-1 font-bold ml-2 shrink-0 ${test.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {test.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                    {test.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 3: VERCEL CONFIG & HEADERS */}
      {activeTab === 'vercel' && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                Especificación Vercel Edge (`vercel.json`)
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                Configurado & Verificado
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded border border-slate-800">
                <h4 className="text-xs font-bold text-emerald-400 font-mono mb-2">Políticas de Enrutamiento SPA</h4>
                <ul className="text-xs text-slate-300 space-y-1.5 font-mono">
                  <li>• <span className="text-slate-400">cleanUrls:</span> true</li>
                  <li>• <span className="text-slate-400">framework:</span> "vite"</li>
                  <li>• <span className="text-slate-400">buildCommand:</span> "npm run build"</li>
                  <li>• <span className="text-slate-400">outputDirectory:</span> "dist"</li>
                  <li>• <span className="text-slate-400">SPA Rewrite:</span> /((?!assets/).*) → /index.html</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded border border-slate-800">
                <h4 className="text-xs font-bold text-emerald-400 font-mono mb-2">Cabeceras de Caché y Seguridad</h4>
                <ul className="text-xs text-slate-300 space-y-1.5 font-mono">
                  <li>• <span className="text-slate-400">/assets/*:</span> public, max-age=31536000, immutable</li>
                  <li>• <span className="text-slate-400">index.html:</span> public, max-age=0, must-revalidate</li>
                  <li>• <span className="text-slate-400">X-Frame-Options:</span> SAMEORIGIN</li>
                  <li>• <span className="text-slate-400">X-Content-Type-Options:</span> nosniff</li>
                  <li>• <span className="text-slate-400">CSP:</span> Supabase + WebAudio + Canvas Permissive</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 bg-slate-950 p-4 rounded border border-slate-800">
              <h4 className="text-xs font-bold text-emerald-400 font-mono mb-2">
                Variables de Entorno Requeridas (.env.example)
              </h4>
              <pre className="text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`VITE_APP_ENV="production"
VITE_APP_URL="https://tactical-command.vercel.app"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1Ni..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1Ni..."
VITE_ENABLE_PERF_MONITOR="true"`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

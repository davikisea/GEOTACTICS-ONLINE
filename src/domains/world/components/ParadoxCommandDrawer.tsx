/**
 * ==============================================================================
 * PARADOX COMMAND DRAWER (PANEL LATERAL RETRÁCTIL ESTILO STELLARIS / VICTORIA 3)
 * ==============================================================================
 * Conforme a @tactical-command-intel y PLAN_MAESTRO_IMPLEMENTACION_GEOTACTICS_ALICE
 * - Lateral derecho deslizable con pestañas verticales compactas.
 * - Pestaña [TERRITORIO]: Macro-inspección de regiones, búnkeres y asedios en curso.
 * - Pestaña [PUNTOS ESTRATÉGICOS]: Nodos clave (Capital Caracas, Estrechos, Refinerías, Silos).
 * - Pestaña [FORJA & COLA]: Colas de producción física con temporizadores de cuenta atrás en vivo.
 * - Pestaña [ARSENAL DE FACCIÓN]: Stock común del clan disponible para comandar.
 * - Pestaña [MERCADO P2P]: Bolsa de recursos con split del 2% y collar VWAP.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MapPin,
  Flame,
  Shield,
  Clock,
  Factory,
  Users,
  Coins,
  ChevronRight,
  Zap,
  Globe,
  Radio,
  Crosshair,
  AlertOctagon,
  Wrench,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { audioManager } from '@domains/game-feel';
import {
  UnitProductionItem,
  calculateUnitProductionDuration,
  calculateUnitProductionCost,
  createProductionQueueItem,
  isProductionItemReady,
  FactionHangarStock,
  authorizeFactionUnitBorrow,
} from '@domains/economy';

export type ParadoxDrawerTab =
  | 'territory'
  | 'strategic_nodes'
  | 'production'
  | 'faction_arsenal'
  | 'marketplace';

export interface ParadoxCommandDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRank?: 'recruit' | 'corporal' | 'sergeant' | 'veteran';
  userGold?: number;
  userEnergyEc?: number;
  clanTag?: string;
  onDeployUnitToHangar?: (unitCode: string, tier: 1 | 2 | 3 | 4 | 5) => void;
  onSelectRegion?: (regionId: string) => void;
  onTriggerBark?: (text: string, type?: 'radio' | 'panic' | 'thought' | 'shout') => void;
}

export const ParadoxCommandDrawer: React.FC<ParadoxCommandDrawerProps> = ({
  isOpen,
  onClose,
  userRank = 'corporal',
  userGold = 12500,
  userEnergyEc = 850,
  clanTag = 'IVS',
  onDeployUnitToHangar,
  onSelectRegion,
  onTriggerBark,
}) => {
  const [activeTab, setActiveTab] = useState<ParadoxDrawerTab>('territory');
  const [now, setNow] = useState(Date.now());

  // Actualizar reloj cada segundo para temporizadores de cola
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock inicial de colas de producción activas
  const [queueItems, setQueueItems] = useState<UnitProductionItem[]>([
    {
      id: 'q_tank_01',
      userId: 'user_01',
      destination: 'user',
      unitCode: 'tank',
      tier: 1,
      durationSeconds: 180,
      startedAt: new Date(now - 120000).toISOString(),
      readyAt: new Date(now + 60000).toISOString(),
      isClaimed: false,
    },
    {
      id: 'q_mech_01',
      userId: 'user_01',
      destination: 'faction',
      clanId: 'clan_ivs',
      unitCode: 'mech',
      tier: 2,
      durationSeconds: 120,
      startedAt: new Date(now - 140000).toISOString(),
      readyAt: new Date(now - 20000).toISOString(), // Ya listo para reclamo
      isClaimed: false,
    },
  ]);

  // Mock inicial de stock comunitario de facción
  const [factionStock, setFactionStock] = useState<FactionHangarStock[]>([
    { clanId: 'clan_ivs', unitCode: 'tank', tier: 1, stockQuantity: 6 },
    { clanId: 'clan_ivs', unitCode: 'medium_tank', tier: 2, stockQuantity: 3 },
    { clanId: 'clan_ivs', unitCode: 'artillery', tier: 2, stockQuantity: 2 },
    { clanId: 'clan_ivs', unitCode: 'b_copter', tier: 3, stockQuantity: 1 },
  ]);

  // Manejar forja de nueva unidad
  const handleStartForge = (unitCode: string, tier: 1 | 2 | 3 | 4 | 5, destination: 'user' | 'faction') => {
    audioManager.play('menu_confirm');
    const newItem = createProductionQueueItem('user_01', unitCode, tier, destination, 'clan_ivs');
    setQueueItems((prev) => [newItem, ...prev]);
    onTriggerBark?.(
      `Orden de ensamblaje transmitida. Chasis de ${unitCode} (Tier ${tier}) en línea de producción.`,
      'radio'
    );
  };

  // Reclamar unidad terminada
  const handleClaimUnit = (itemId: string) => {
    const item = queueItems.find((q) => q.id === itemId);
    if (!item) return;

    audioManager.play('success');
    setQueueItems((prev) => prev.map((q) => (q.id === itemId ? { ...q, isClaimed: true } : q)));
    onDeployUnitToHangar?.(item.unitCode, item.tier);
    onTriggerBark?.(
      `¡Unidad ${item.unitCode} Tier ${item.tier} entregada con éxito al hangar militar!`,
      'shout'
    );
  };

  // Solicitar préstamo de unidad de facción
  const handleBorrowFactionUnit = (unitCode: string, tier: 1 | 2 | 3 | 4 | 5) => {
    const res = authorizeFactionUnitBorrow(
      {
        clanId: 'clan_ivs',
        userId: 'user_01',
        userRank,
        unitCode,
        tier,
      },
      factionStock
    );

    if (!res.approved) {
      audioManager.play('error');
      onTriggerBark?.(res.reason ?? 'Solicitud denegada por el Estado Mayor del Clan.', 'panic');
      return;
    }

    audioManager.play('menu_confirm');
    setFactionStock((prev) =>
      prev.map((s) =>
        s.unitCode === unitCode && s.tier === tier ? { ...s, stockQuantity: s.stockQuantity - 1 } : s
      )
    );
    onDeployUnitToHangar?.(unitCode, tier);
    onTriggerBark?.(
      `¡Comando Delegado aprobado! Tropa de Facción (${unitCode} T${tier}) transferida a tu división.`,
      'shout'
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed top-12 right-0 bottom-0 z-40 w-full sm:w-[420px] md:w-[460px] bg-[#1A1B15] border-l-2 border-[#7B8A4A] shadow-[-6px_0px_0px_#0A0B08] flex flex-col select-none"
        >
          {/* Header del Panel */}
          <div className="p-3 bg-[#22231C] border-b-2 border-[#0A0B08] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#00FF66] animate-pulse" />
              <span className="font-mono font-black text-xs uppercase tracking-wider text-[#F2E8D5]">
                C4ISR // CONSOLA DE MACROGESTIÓN
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                audioManager.play('menu_cancel');
                onClose();
              }}
              className="p-1 text-[#7B8A4A] hover:text-[#F2E8D5] hover:bg-[#2B2C24] rounded border border-transparent hover:border-[#7B8A4A] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Pestañas Estilo Paradox (Horizontal compacta con biseles) */}
          <div className="flex bg-[#161712] border-b border-[#2B2C24] overflow-x-auto text-[10px] font-black uppercase tracking-wider shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('territory')}
              className={`flex-1 py-2 px-2 text-center border-b-2 transition-all cursor-pointer ${
                activeTab === 'territory'
                  ? 'border-[#00FF66] text-[#00FF66] bg-[#22231C]'
                  : 'border-transparent text-[#7B8A4A] hover:text-[#F2E8D5]'
              }`}
            >
              Territorio
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('strategic_nodes')}
              className={`flex-1 py-2 px-2 text-center border-b-2 transition-all cursor-pointer ${
                activeTab === 'strategic_nodes'
                  ? 'border-yellow-400 text-yellow-400 bg-[#22231C]'
                  : 'border-transparent text-[#7B8A4A] hover:text-[#F2E8D5]'
              }`}
            >
              Nodos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('production')}
              className={`flex-1 py-2 px-2 text-center border-b-2 transition-all cursor-pointer ${
                activeTab === 'production'
                  ? 'border-[#C46A3A] text-[#C46A3A] bg-[#22231C]'
                  : 'border-transparent text-[#7B8A4A] hover:text-[#F2E8D5]'
              }`}
            >
              Forja
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('faction_arsenal')}
              className={`flex-1 py-2 px-2 text-center border-b-2 transition-all cursor-pointer ${
                activeTab === 'faction_arsenal'
                  ? 'border-[#3B82F6] text-[#3B82F6] bg-[#22231C]'
                  : 'border-transparent text-[#7B8A4A] hover:text-[#F2E8D5]'
              }`}
            >
              Arsenal
            </button>
          </div>

          {/* Contenido Dinámico de la Pestaña Activa */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono">
            {/* -------------------------------------------------------------- */}
            {/* 1. PESTAÑA: TERRITORIO                                          */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'territory' && (
              <div className="space-y-2.5">
                <div className="p-2 bg-[#22231C] border border-[#46521F] rounded-[8px_2px_8px_2px]">
                  <div className="flex items-center justify-between text-xs font-black text-[#F2E8D5] mb-1">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#00FF66]" />
                      TEATRO ACTIVO: VENEZUELA
                    </span>
                    <span className="text-[#00FF66]">24 REGIONES</span>
                  </div>
                  <p className="text-[10px] text-[#7B8A4A] leading-relaxed">
                    Soberanía regional bajo protocolo Alice. Pintado dinámico por puntos de control.
                  </p>
                </div>

                {/* Lista de Provincias Clave */}
                <div className="space-y-1.5">
                  {[
                    { id: 'REG_VE_01', name: 'Caracas (Distrito Capital)', owner: 'IVS (Aliado)', tcp: 10000, bunker: 5, status: 'stable' },
                    { id: 'REG_VE_02', name: 'Zulia (Maracaibo)', owner: 'IVS (Aliado)', tcp: 8500, bunker: 4, status: 'stable' },
                    { id: 'REG_VE_03', name: 'Bolívar (Ciudad Guayana)', owner: 'CSO (Rival)', tcp: 4500, bunker: 3, status: 'under_siege' },
                    { id: 'REG_VE_11', name: 'Falcón (Paraguaná)', owner: 'Neutral', tcp: 2000, bunker: 2, status: 'under_siege' },
                  ].map((prov) => (
                    <div
                      key={prov.id}
                      onClick={() => onSelectRegion?.(prov.id)}
                      className="p-2 bg-[#2B2C24] hover:bg-[#383A2E] border border-[#7B8A4A] rounded-[6px_2px_6px_2px] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs font-black text-[#F2E8D5]">
                        <span className="truncate">{prov.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                            prov.status === 'under_siege' ? 'bg-red-900 text-red-200 animate-pulse' : 'bg-[#46521F] text-[#F2E8D5]'
                          }`}
                        >
                          {prov.status === 'under_siege' ? '¡ASEDIO!' : 'ESTABLE'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#7B8A4A] mt-1">
                        <span>Control: {prov.owner}</span>
                        <span className="text-[#00FF66]">{prov.tcp} TCP • Búnker Nv.{prov.bunker}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* 2. PESTAÑA: NODOS ESTRATÉGICOS                                 */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'strategic_nodes' && (
              <div className="space-y-2">
                <div className="text-[10px] text-[#7B8A4A] uppercase tracking-wider font-bold mb-1">
                  Puntos Estratégicos con Buff Hegemónico
                </div>

                {[
                  { name: 'Cuartel General Central Caracas', type: 'Capital Nacional', buff: '+15% EC, +10% Forja, -20% Arancel', status: 'Activo' },
                  { name: 'Canal del Lago de Maracaibo', type: 'Estrecho Marítimo', buff: 'Peaje 5.00% a flotas mercantes', status: 'Controlado' },
                  { name: 'Refinería CRP Amuay-Cardón', type: 'Complejo Energético', buff: '+25% Extracción de Combustible', status: 'Controlado' },
                  { name: 'Hidroeléctrica Guri (Bolívar)', type: 'Generador Estratégico', buff: '+30% Créditos Energéticos', status: 'Disputado' },
                  { name: 'Radar C4ISR Isla de Margarita', type: 'Estación de Alerta', buff: '+3 Saltos de Visión en Niebla', status: 'Enlace OK' },
                ].map((node, i) => (
                  <div key={i} className="p-2.5 bg-[#2B2C24] border border-[#7B8A4A] rounded-[8px_2px_8px_2px]">
                    <div className="flex items-center justify-between text-xs font-black text-[#F2E8D5]">
                      <span>{node.name}</span>
                      <span className="text-[9px] text-yellow-400 font-bold">{node.type}</span>
                    </div>
                    <div className="text-[10px] text-[#00FF66] font-bold mt-1">
                      {node.buff}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* 3. PESTAÑA: FORJA Y COLA DE CONSTRUCCIÓN                       */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'production' && (
              <div className="space-y-3">
                <div className="text-[10px] text-[#7B8A4A] uppercase tracking-wider font-bold">
                  Colas de Ensamblaje en Curso (Tiempos de Espera)
                </div>

                {/* Listado de Unidades en Cola */}
                <div className="space-y-2">
                  {queueItems.map((item) => {
                    const isReady = isProductionItemReady(item, new Date(now));
                    const remainingSeconds = Math.max(
                      0,
                      Math.round((new Date(item.readyAt).getTime() - now) / 1000)
                    );

                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 border rounded-[8px_2px_8px_2px] ${
                          item.isClaimed
                            ? 'bg-[#1E2019] border-[#2B2C24] opacity-50'
                            : isReady
                            ? 'bg-[#222E1A] border-[#00FF66]'
                            : 'bg-[#2B2C24] border-[#7B8A4A]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-black text-[#F2E8D5]">
                          <span className="uppercase">
                            {item.unitCode} (Tier {item.tier})
                          </span>
                          <span className="text-[9px] text-[#7B8A4A]">
                            Destino: {item.destination === 'faction' ? 'Facción' : 'Personal'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] font-mono text-[#F2E8D5]">
                            {item.isClaimed
                              ? 'ENTREGADO AL HANGAR'
                              : isReady
                              ? '¡ENSAMBLAJE COMPLETADO!'
                              : `Tiempo restante: ${remainingSeconds}s`}
                          </span>

                          {!item.isClaimed && isReady && (
                            <button
                              type="button"
                              onClick={() => handleClaimUnit(item.id)}
                              className="px-2.5 py-1 bg-[#00FF66] text-black font-black text-[10px] uppercase rounded-[4px_1px_4px_1px] hover:bg-[#33ff85] active:scale-95 cursor-pointer shadow-[2px_2px_0px_#000]"
                            >
                              Reclamar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Acciones de Forja Inmediata */}
                <div className="pt-2 border-t border-[#2B2C24] space-y-1.5">
                  <div className="text-[10px] font-black uppercase text-[#F2E8D5]">
                    Iniciar Nueva Fabricación:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartForge('tank', 1, 'user')}
                      className="p-1.5 bg-[#2B2C24] hover:bg-[#383A2E] border border-[#7B8A4A] rounded text-[10px] text-left font-bold text-[#F2E8D5] cursor-pointer"
                    >
                      Tanque T1 (3 min)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartForge('mech', 1, 'user')}
                      className="p-1.5 bg-[#2B2C24] hover:bg-[#383A2E] border border-[#7B8A4A] rounded text-[10px] text-left font-bold text-[#F2E8D5] cursor-pointer"
                    >
                      Mecanizada T1 (1 min)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartForge('medium_tank', 2, 'faction')}
                      className="p-1.5 bg-[#2B2C24] hover:bg-[#383A2E] border border-[#3B82F6] rounded text-[10px] text-left font-bold text-[#93C5FD] cursor-pointer col-span-2"
                    >
                      + Forjar Tanque Medio T2 para Facción (11 min)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* 4. PESTAÑA: ARSENAL DE FACCIÓN                                 */}
            {/* -------------------------------------------------------------- */}
            {activeTab === 'faction_arsenal' && (
              <div className="space-y-2.5">
                <div className="p-2 bg-[#1E2330] border border-[#3B82F6] rounded-[8px_2px_8px_2px]">
                  <div className="flex items-center justify-between text-xs font-black text-[#93C5FD] mb-1">
                    <span>ARSENAL COMÚN [{clanTag}]</span>
                    <span className="text-[9px] bg-[#3B82F6] text-white px-1.5 py-0.5 rounded">
                      Rango: {userRank.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-300">
                    Las tropas del clan se despliegan bajo tu mando en combate como tuyas.
                  </p>
                </div>

                <div className="space-y-1.5">
                  {factionStock.map((stock, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-[#2B2C24] border border-[#7B8A4A] rounded-[8px_2px_8px_2px] flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-black text-[#F2E8D5] uppercase">
                          {stock.unitCode} (Tier {stock.tier})
                        </div>
                        <div className="text-[10px] text-[#00FF66] font-bold">
                          {stock.stockQuantity} disponibles en reserva
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleBorrowFactionUnit(stock.unitCode, stock.tier)}
                        disabled={stock.stockQuantity <= 0}
                        className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-[4px_1px_4px_1px] shadow-[2px_2px_0px_#0A0B08] transition-all cursor-pointer ${
                          stock.stockQuantity > 0
                            ? 'bg-[#3B82F6] text-white hover:bg-[#2563EB] active:scale-95'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Comandar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

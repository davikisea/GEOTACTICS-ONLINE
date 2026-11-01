/**
 * ==============================================================================
 * VISTA DEL MERCADO LIBRE P2P GLOBAL ENTRE JUGADORES
 * ==============================================================================
 * Estilo visual: Skill retro-futurism (Atompunk, esquinas asimétricas, biseles metálicos,
 * sombras duras y paleta canónica #46521F, #7B8A4A, #C46A3A, #F2E8D5, #2B2C24).
 * Implementa la Tasa Municipal del 12% a quema y bandas de precio ±35% del PMM.
 */

import React, { useState } from 'react';
import {
  ShoppingBag,
  Coins,
  ArrowRight,
  Filter,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Scale,
  Flame,
  X,
  Hammer,
  Boxes,
  Cpu,
  UserCheck
} from 'lucide-react';
import {
  IndustrialEngine,
  IndustrialInventory,
  RefinedResourceType,
  P2PMarketListing,
  P2PPriceReference
} from '../../engine/industrialEngine';
import { audioManager } from '../../engine/audioManager';

interface P2PMarketplaceViewProps {
  currentUserId: string;
  currentUserName: string;
  userGold: number;
  onUpdateUserGold: (newGold: number) => void;
  inventory: IndustrialInventory;
  onUpdateInventory: (updated: IndustrialInventory) => void;
  onNavigateToIndustry?: () => void;
}

export const P2PMarketplaceView: React.FC<P2PMarketplaceViewProps> = ({
  currentUserId,
  currentUserName,
  userGold,
  onUpdateUserGold,
  inventory,
  onUpdateInventory,
  onNavigateToIndustry,
}) => {
  // Precios de referencia de mercado canónicos (PMM)
  const [priceReferences, setPriceReferences] = useState<Record<RefinedResourceType, P2PPriceReference>>({
    refined_steel: {
      resourceType: 'refined_steel',
      movingAveragePriceGold: 50,
      collarMinPriceGold: 32, // -35%
      collarMaxPriceGold: 68, // +35%
      volume24h: 1420,
    },
    refined_concrete: {
      resourceType: 'refined_concrete',
      movingAveragePriceGold: 30,
      collarMinPriceGold: 19,
      collarMaxPriceGold: 41,
      volume24h: 2150,
    },
    refined_microchip: {
      resourceType: 'refined_microchip',
      movingAveragePriceGold: 120,
      collarMinPriceGold: 78,
      collarMaxPriceGold: 162,
      volume24h: 680,
    },
  });

  // Lista activa de órdenes en el mercado (semilla canónica)
  const [listings, setListings] = useState<P2PMarketListing[]>([
    {
      id: 'list_seed_01',
      sellerId: 'user_hawk_99',
      sellerName: 'Comandante Hawk',
      resourceType: 'refined_steel',
      quantity: 20,
      pricePerUnitGold: 48,
      totalPriceGold: 960,
      taxDeductedGold: 115,
      netSellerRevenueGold: 845,
      status: 'active',
      createdAt: Date.now() - 3600000,
    },
    {
      id: 'list_seed_02',
      sellerId: 'user_stella_01',
      sellerName: 'Mayor Stella (Reserva)',
      resourceType: 'refined_concrete',
      quantity: 30,
      pricePerUnitGold: 28,
      totalPriceGold: 840,
      taxDeductedGold: 100,
      netSellerRevenueGold: 740,
      status: 'active',
      createdAt: Date.now() - 1800000,
    },
    {
      id: 'list_seed_03',
      sellerId: 'user_volkov_02',
      sellerName: 'Brigada Volkov',
      resourceType: 'refined_microchip',
      quantity: 10,
      pricePerUnitGold: 115,
      totalPriceGold: 1150,
      taxDeductedGold: 138,
      netSellerRevenueGold: 1012,
      status: 'active',
      createdAt: Date.now() - 7200000,
    },
  ]);

  // Filtros y Pestañas
  const [resourceFilter, setResourceFilter] = useState<'all' | RefinedResourceType>('all');
  const [viewTab, setViewTab] = useState<'market' | 'my_listings'>('market');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [feedbackAlert, setFeedbackAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Formulario de Publicación
  const [publishResource, setPublishResource] = useState<RefinedResourceType>('refined_steel');
  const [publishQuantity, setPublishQuantity] = useState<number>(10);
  const [publishPricePerUnit, setPublishPricePerUnit] = useState<number>(50);

  const activeRef = priceReferences[publishResource];
  const activeCollars = IndustrialEngine.calculatePriceCollars(activeRef.movingAveragePriceGold);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackAlert({ text, type });
    setTimeout(() => setFeedbackAlert(null), 3500);
  };

  // Acción: Publicar Orden en el Mercado
  const handlePublishListing = () => {
    const result = IndustrialEngine.createMarketListing(
      currentUserId,
      currentUserName,
      publishResource,
      publishQuantity,
      publishPricePerUnit,
      activeRef,
      inventory
    );

    if (!result.success || !result.listing || !result.updatedInventory) {
      audioManager.playSFX('combat_hit');
      showFeedback(result.errorMessage || 'Error al publicar venta.', 'error');
      return;
    }

    onUpdateInventory(result.updatedInventory);
    setListings([result.listing, ...listings]);
    setIsPublishModalOpen(false);
    audioManager.playSFX('button_click');
    showFeedback(
      `¡Orden publicada! ${publishQuantity} unidades en venta a ${publishPricePerUnit}G/u (-12% tasa al venderse).`
    );
  };

  // Acción: Cancelar Venta Propia
  const handleCancelListing = (listingId: string) => {
    const target = listings.find(l => l.id === listingId);
    if (!target || target.status !== 'active') return;

    // Devolver recursos de custodia al inventario
    const updatedInv: IndustrialInventory = {
      ...inventory,
      refinedSteel: target.resourceType === 'refined_steel' ? inventory.refinedSteel + target.quantity : inventory.refinedSteel,
      refinedConcrete: target.resourceType === 'refined_concrete' ? inventory.refinedConcrete + target.quantity : inventory.refinedConcrete,
      refinedMicrochip: target.resourceType === 'refined_microchip' ? inventory.refinedMicrochip + target.quantity : inventory.refinedMicrochip,
    };

    onUpdateInventory(updatedInv);
    setListings(listings.map(l => (l.id === listingId ? { ...l, status: 'cancelled' } : l)));
    audioManager.playSFX('button_click');
    showFeedback(`Orden cancelada. Los materiales han regresado a tu inventario.`);
  };

  // Acción: Comprar Orden P2P
  const handleBuyListing = (listing: P2PMarketListing) => {
    const result = IndustrialEngine.executeP2PPurchase(
      listing,
      currentUserId,
      userGold,
      inventory,
      0 // En demo local el vendedor no está conectado
    );

    if (!result.success || result.updatedBuyerGold === undefined || !result.updatedBuyerInventory) {
      audioManager.playSFX('combat_hit');
      showFeedback(result.errorMessage || 'Error en la compra.', 'error');
      return;
    }

    onUpdateUserGold(result.updatedBuyerGold);
    onUpdateInventory(result.updatedBuyerInventory);
    setListings(listings.map(l => (l.id === listing.id ? result.updatedListing! : l)));
    audioManager.playSFX('victory');
    showFeedback(
      `¡Compra completada con éxito! -${listing.totalPriceGold}G. 12% (${listing.taxDeductedGold}G) quemado por el tesoro.`
    );
  };

  // Acción: Barrido de Liquidez por Intendencia Militar (NPC Market Maker)
  const handleTriggerNPCMaker = () => {
    const sweepResult = IndustrialEngine.fulfillStaleP2POrders(listings, Date.now());
    if (sweepResult.fulfilledCount > 0) {
      setListings(sweepResult.updatedListings);
      audioManager.playSFX('victory');
      showFeedback(
        `¡Intendencia Militar del Estado Mayor absorbió ${sweepResult.fulfilledCount} órdenes estancadas (+${sweepResult.totalCreditsDisbursed}G liquidados a vendedores)!`
      );
    } else {
      audioManager.playSFX('button_click');
      showFeedback('No hay órdenes estancadas (>6h) que requieran absorción por la Intendencia.');
    }
  };

  const filteredListings = listings.filter(l => {
    if (viewTab === 'my_listings') {
      return l.sellerId === currentUserId;
    }
    if (l.status !== 'active') return false;
    if (resourceFilter !== 'all' && l.resourceType !== resourceFilter) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-[#2B2C24] text-[#F2E8D5] font-mono p-4 sm:p-6 overflow-y-auto select-none">
      {/* Cabecera Atompunk del Mercado Libre P2P */}
      <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[24px_6px_24px_6px] p-4 shadow-[6px_6px_0px_#2B2C24] mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-[8px_2px_8px_2px] bg-[#C46A3A] text-[#F2E8D5] font-black text-xs uppercase tracking-wider border border-[#2B2C24]">
              FASE 5 CALIBRADA
            </span>
            <h1 className="text-lg font-black tracking-wide text-[#F2E8D5] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#C46A3A]" />
              MERCADO LIBRE P2P (GLOBAL ORDER BOOK)
            </h1>
          </div>
          <p className="text-xs text-[#F2E8D5]/80 mt-1">
            Comercio entre jugadores con Tasa Municipal del 12% a quema, bandas dinámicas (±35% PMM) y Garantía de Liquidez NPC.
          </p>
        </div>

        {/* Saldo de Oro del Jugador y Botón de Publicar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#2B2C24] px-3 py-1.5 rounded-[12px_3px_12px_3px] border border-[#7B8A4A]">
            <Coins className="w-4 h-4 text-amber-300" />
            <span className="text-xs text-[#F2E8D5]">Oro Disponible:</span>
            <strong className="text-amber-300 font-bold">{userGold}G</strong>
          </div>

          <button
            onClick={() => setIsPublishModalOpen(true)}
            className="px-4 py-2 bg-[#C46A3A] hover:bg-[#b05c2e] text-[#F2E8D5] font-black text-xs uppercase tracking-wider rounded-[14px_4px_14px_4px] border-2 border-[#2B2C24] shadow-[4px_4px_0px_#2B2C24] flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Publicar Venta</span>
          </button>
        </div>
      </div>

      {/* Banner de Garantía de Liquidez: Banco Central de Intendencia Militar (NPC) */}
      <div className="bg-[#2B2C24] border-2 border-[#7B8A4A] rounded-[16px_4px_16px_4px] p-3 mb-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-[3px_3px_0px_#2B2C24]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#7B8A4A] shrink-0" />
          <div>
            <strong className="text-white">GARANTÍA DE LIQUIDEZ PERPETUA:</strong>{' '}
            <span className="text-[#F2E8D5]/80">
              El Banco Central de Intendencia Militar del Estado Mayor absorbe automáticamente órdenes &gt;6h en precio de banda.
            </span>
          </div>
        </div>
        <button
          onClick={handleTriggerNPCMaker}
          className="px-3 py-1 bg-[#46521F] hover:bg-[#3d481b] text-white font-bold text-[11px] rounded border border-[#7B8A4A] cursor-pointer"
        >
          Ejecutar Barrido NPC
        </button>
      </div>

      {/* Alerta de Feedback Temporal */}
      {feedbackAlert && (
        <div
          className={`p-3 rounded-[12px_3px_12px_3px] border-2 mb-4 text-xs font-bold flex items-center justify-between shadow-[4px_4px_0px_#2B2C24] animate-in fade-in duration-150 ${
            feedbackAlert.type === 'success'
              ? 'bg-[#46521F] border-[#7B8A4A] text-[#F2E8D5]'
              : 'bg-red-950 border-red-500 text-red-200'
          }`}
        >
          <span>{feedbackAlert.text}</span>
          <button onClick={() => setFeedbackAlert(null)} className="hover:opacity-75 cursor-pointer">✕</button>
        </div>
      )}

      {/* Bandas de Precio Promedio Móvil de Mercado (PMM) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {Object.values(priceReferences).map(ref => (
          <div
            key={ref.resourceType}
            className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[16px_4px_16px_4px] p-3 shadow-[3px_3px_0px_#2B2C24] text-xs flex justify-between items-center"
          >
            <div>
              <div className="font-bold text-[#F2E8D5] flex items-center gap-1">
                {ref.resourceType === 'refined_steel' && <Hammer className="w-3.5 h-3.5 text-slate-300" />}
                {ref.resourceType === 'refined_concrete' && <Boxes className="w-3.5 h-3.5 text-stone-300" />}
                {ref.resourceType === 'refined_microchip' && <Cpu className="w-3.5 h-3.5 text-cyan-300" />}
                <span>
                  {ref.resourceType === 'refined_steel'
                    ? 'Acero Militar'
                    : ref.resourceType === 'refined_concrete'
                    ? 'Hormigón Armado'
                    : 'Microchips'}
                </span>
              </div>
              <div className="text-[10px] text-[#F2E8D5]/70 mt-0.5">
                Volumen 24h: {ref.volume24h} u.
              </div>
            </div>

            <div className="text-right">
              <span className="text-amber-300 font-black text-sm">{ref.movingAveragePriceGold}G/u</span>
              <div className="text-[10px] text-[#7B8A4A] font-bold">
                Banda: {ref.collarMinPriceGold}G - {ref.collarMaxPriceGold}G
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Barra de Filtros y Navegación del Tablón */}
      <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[18px_4px_18px_4px] p-3 shadow-[4px_4px_0px_#2B2C24] mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Conmutador de Vistas */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewTab('market')}
            className={`px-3 py-1.5 rounded-[10px_3px_10px_3px] border font-bold transition-all cursor-pointer ${
              viewTab === 'market'
                ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                : 'bg-[#2B2C24] border-[#7B8A4A] text-[#F2E8D5]/70'
            }`}
          >
            Libro de Órdenes Global
          </button>
          <button
            onClick={() => setViewTab('my_listings')}
            className={`px-3 py-1.5 rounded-[10px_3px_10px_3px] border font-bold transition-all cursor-pointer ${
              viewTab === 'my_listings'
                ? 'bg-[#C46A3A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                : 'bg-[#2B2C24] border-[#7B8A4A] text-[#F2E8D5]/70'
            }`}
          >
            Mis Publicaciones ({listings.filter(l => l.sellerId === currentUserId).length})
          </button>
        </div>

        {/* Filtro por Tipo de Recurso */}
        {viewTab === 'market' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[#F2E8D5]/70 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#C46A3A]" /> Filtrar:
            </span>
            {(['all', 'refined_steel', 'refined_concrete', 'refined_microchip'] as const).map(res => (
              <button
                key={res}
                onClick={() => setResourceFilter(res)}
                className={`px-2.5 py-1 rounded-[8px_2px_8px_2px] border text-[11px] font-bold transition-all cursor-pointer ${
                  resourceFilter === res
                    ? 'bg-[#7B8A4A] border-[#2B2C24] text-[#F2E8D5] shadow-[2px_2px_0px_#2B2C24]'
                    : 'bg-[#2B2C24] border-[#7B8A4A]/50 text-[#F2E8D5]/70'
                }`}
              >
                {res === 'all'
                  ? 'Todos'
                  : res === 'refined_steel'
                  ? 'Acero'
                  : res === 'refined_concrete'
                  ? 'Hormigón'
                  : 'Chips'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tablón Principal de Órdenes */}
      <div className="bg-[#46521F] border-2 border-[#2B2C24] rounded-[18px_4px_18px_4px] p-4 shadow-[4px_4px_0px_#2B2C24] overflow-hidden">
        {filteredListings.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#F2E8D5]/60 bg-[#2B2C24] rounded-[12px_3px_12px_3px] border border-[#7B8A4A]/50">
            {viewTab === 'my_listings'
              ? 'No tienes órdenes de venta publicadas actualmente.'
              : 'No hay ofertas disponibles para el filtro seleccionado.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#7B8A4A] text-[#F2E8D5]/70 text-[11px] uppercase pb-2">
                  <th className="py-2 px-3">Recurso Militar</th>
                  <th className="py-2 px-3">Cantidad</th>
                  <th className="py-2 px-3">Precio / Unidad</th>
                  <th className="py-2 px-3">Total Bruto</th>
                  <th className="py-2 px-3">Vendedor</th>
                  <th className="py-2 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7B8A4A]/30">
                {filteredListings.map(listing => {
                  const isOwn = listing.sellerId === currentUserId;
                  const canAfford = userGold >= listing.totalPriceGold;

                  return (
                    <tr key={listing.id} className="hover:bg-[#2B2C24]/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        {listing.resourceType === 'refined_steel' && <Hammer className="w-4 h-4 text-slate-300" />}
                        {listing.resourceType === 'refined_concrete' && <Boxes className="w-4 h-4 text-stone-300" />}
                        {listing.resourceType === 'refined_microchip' && <Cpu className="w-4 h-4 text-cyan-300" />}
                        <span>
                          {listing.resourceType === 'refined_steel'
                            ? 'Vigas de Acero'
                            : listing.resourceType === 'refined_concrete'
                            ? 'Hormigón Armado'
                            : 'Microprocesadores'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-black text-sm text-[#F2E8D5]">
                        {listing.quantity} u.
                      </td>

                      <td className="py-3 px-3 text-amber-300 font-bold">
                        {listing.pricePerUnitGold}G / u
                      </td>

                      <td className="py-3 px-3 font-black text-white">
                        {listing.totalPriceGold}G
                      </td>

                      <td className="py-3 px-3 text-xs text-[#F2E8D5]/80">
                        {listing.sellerName} {isOwn && <span className="text-[#C46A3A] font-bold">(Tú)</span>}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {isOwn ? (
                          listing.status === 'active' ? (
                            <button
                              onClick={() => handleCancelListing(listing.id)}
                              className="px-3 py-1 bg-red-900/80 hover:bg-red-800 text-red-100 font-bold text-[11px] rounded border border-red-700 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 uppercase font-bold">{listing.status}</span>
                          )
                        ) : (
                          <button
                            onClick={() => handleBuyListing(listing)}
                            disabled={!canAfford}
                            className="px-3.5 py-1.5 bg-[#C46A3A] hover:bg-[#b05c2e] disabled:opacity-40 disabled:cursor-not-allowed text-[#F2E8D5] font-black text-xs rounded-[8px_2px_8px_2px] border border-[#2B2C24] shadow-[2px_2px_0px_#2B2C24] cursor-pointer transition-all"
                            title={canAfford ? 'Comprar lote' : 'Oro insuficiente'}
                          >
                            Comprar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PARA PUBLICAR NUEVA VENTA */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2C24]/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#46521F] border-2 border-[#2B2C24] rounded-[24px_6px_24px_6px] p-5 shadow-[10px_10px_0px_#2B2C24] font-mono text-[#F2E8D5] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#7B8A4A]">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#F2E8D5] flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#C46A3A]" />
                Publicar Orden de Venta P2P
              </h2>
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="text-xs text-[#F2E8D5]/70 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Recurso a Vender */}
            <div>
              <label className="text-xs font-bold block mb-1">Recurso a Vender:</label>
              <select
                value={publishResource}
                onChange={e => {
                  const res = e.target.value as RefinedResourceType;
                  setPublishResource(res);
                  setPublishPricePerUnit(priceReferences[res].movingAveragePriceGold);
                }}
                className="w-full bg-[#2B2C24] border border-[#7B8A4A] text-[#F2E8D5] p-2 rounded text-xs focus:outline-none"
              >
                <option value="refined_steel">Vigas de Acero Militar (Posees: {inventory.refinedSteel})</option>
                <option value="refined_concrete">Hormigón Armado (Posees: {inventory.refinedConcrete})</option>
                <option value="refined_microchip">Microprocesadores de Guía (Posees: {inventory.refinedMicrochip})</option>
              </select>
            </div>

            {/* Cantidad */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold">Cantidad de Unidades:</span>
                <span className="text-[#F2E8D5]/70">
                  Disponibles:{' '}
                  {publishResource === 'refined_steel'
                    ? inventory.refinedSteel
                    : publishResource === 'refined_concrete'
                    ? inventory.refinedConcrete
                    : inventory.refinedMicrochip}
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="500"
                value={publishQuantity}
                onChange={e => setPublishQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#2B2C24] border border-[#7B8A4A] text-[#F2E8D5] p-2 rounded text-xs focus:outline-none"
              />
            </div>

            {/* Precio Unitario y Bandas ±35% */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold">Precio por Unidad (Oro):</span>
                <span className="text-amber-300 font-bold">
                  Banda Permitida: {activeCollars.minPrice}G - {activeCollars.maxPrice}G
                </span>
              </div>
              <input
                type="number"
                min={activeCollars.minPrice}
                max={activeCollars.maxPrice}
                value={publishPricePerUnit}
                onChange={e => setPublishPricePerUnit(Number(e.target.value))}
                className="w-full bg-[#2B2C24] border border-[#7B8A4A] text-[#F2E8D5] p-2 rounded text-xs focus:outline-none"
              />
            </div>

            {/* Desglose de Liquidación con Tasa del 12% */}
            <div className="bg-[#2B2C24] p-3 rounded-[12px_3px_12px_3px] border border-[#7B8A4A] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#F2E8D5]/70">Ingreso Bruto de la Venta:</span>
                <strong className="text-white">{publishQuantity * publishPricePerUnit}G</strong>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Tasa Municipal (12% Quema Deflacionaria):</span>
                <span>-{Math.floor(publishQuantity * publishPricePerUnit * 0.12)}G</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#7B8A4A] font-black text-amber-300">
                <span>Ingreso Neto para tu Tesoro:</span>
                <span>
                  {publishQuantity * publishPricePerUnit - Math.floor(publishQuantity * publishPricePerUnit * 0.12)}G
                </span>
              </div>
            </div>

            {/* Botones del Modal */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#7B8A4A]">
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs font-bold text-[#F2E8D5]/70 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handlePublishListing}
                className="px-4 py-2 bg-[#C46A3A] hover:bg-[#b05c2e] text-[#F2E8D5] font-black text-xs uppercase tracking-wider rounded-[10px_3px_10px_3px] border border-[#2B2C24] shadow-[3px_3px_0px_#2B2C24] cursor-pointer"
              >
                Confirmar y Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

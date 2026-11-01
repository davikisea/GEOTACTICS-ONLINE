import React, { useState } from 'react';
import { Coins, Sparkles, Shield, Check, ShoppingBag, Eye, Tag, AlertCircle } from 'lucide-react';
import { COSMETIC_SHOP_CATALOG, CosmeticSkin, UnitSkinTarget } from '../../lib/shopData';

interface ShopCatalogProps {
  userGold: number;
  userGems: number;
  unlockedSkinIds: string[];
  equippedSkins: Record<string, string>;
  onPurchaseSuccess: (skin: CosmeticSkin, newGold: number, newGems: number) => void;
  onEquipSkin?: (unitTarget: string, skinId: string) => void;
}

export const ShopCatalog: React.FC<ShopCatalogProps> = ({
  userGold,
  userGems,
  unlockedSkinIds,
  equippedSkins,
  onPurchaseSuccess,
  onEquipSkin,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | UnitSkinTarget>('all');
  const [selectedPreviewSkin, setSelectedPreviewSkin] = useState<CosmeticSkin | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const filteredCatalog = COSMETIC_SHOP_CATALOG.filter(skin => {
    if (activeFilter === 'all') return true;
    return skin.unitTarget === activeFilter;
  });

  const handleBuy = (skin: CosmeticSkin) => {
    if (unlockedSkinIds.includes(skin.id)) {
      setNotification({ message: 'Ya posees este cosmético en tu inventario.', type: 'error' });
      return;
    }

    if (skin.currency === 'gold') {
      if (userGold < skin.price) {
        setNotification({
          message: `Oro insuficiente. Necesitas ${skin.price}G y tienes ${userGold}G.`,
          type: 'error',
        });
        return;
      }
      const newGold = userGold - skin.price;
      onPurchaseSuccess(skin, newGold, userGems);
      setNotification({ message: `¡Has adquirido "${skin.name}" con éxito!`, type: 'success' });
    } else {
      if (userGems < skin.price) {
        setNotification({
          message: `Gemas insuficientes. Necesitas ${skin.price} Gemas y tienes ${userGems} Gemas.`,
          type: 'error',
        });
        return;
      }
      const newGems = userGems - skin.price;
      onPurchaseSuccess(skin, userGold, newGems);
      setNotification({ message: `¡Has adquirido "${skin.name}" con éxito!`, type: 'success' });
    }

    setTimeout(() => setNotification(null), 3500);
  };

  const getRarityBadgeStyle = (rarity: CosmeticSkin['rarity']) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-purple-950 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]';
      case 'epic':
        return 'bg-blue-950 text-blue-300 border-blue-500/50';
      case 'rare':
        return 'bg-emerald-950 text-emerald-300 border-emerald-500/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-5 font-mono text-slate-100">
      {/* Barra de Fondos y Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              TIENDA TÁCTICA & ARSENAL DE COMBATE
              <span className="text-[9px] bg-amber-950/80 border border-amber-500/50 text-amber-300 px-2 py-0.5 rounded font-mono uppercase font-bold tracking-wider shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                ★ PROTOCOLO FAIR-PLAY TOURNAMENT-READY
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Estadísticas niveladas a Nivel 11 en Torneos Oficiales. En el Frente Clasificatorio, la inversión acelera tu versatilidad logística.
            </p>
          </div>
        </div>

        {/* Saldos del Jugador */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-amber-400 font-bold">
            <Coins className="w-4 h-4" />
            <span>{userGold.toLocaleString()}G</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-purple-400 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>{userGems.toLocaleString()} Gemas</span>
          </div>
        </div>
      </div>

      {/* Banner de Alto Valor: Command Pass V2 ($5.99 / Mes) */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-purple-950/40 border-2 border-amber-500/40 rounded-xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            🎖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                SUSCRIPCIÓN OFICIAL
              </span>
              <h4 className="text-white font-bold text-sm tracking-wide">COMMAND PASS DE TEMPORADA</h4>
            </div>
            <p className="text-slate-300 text-xs mt-0.5">
              1 Salvaguarda Táctica diaria (00:00 UTC) • Cola automática de apertura de cofres • 300 Gemas + 35,000G
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 block line-through">$9.99 USD</span>
            <span className="text-sm font-black text-amber-400 font-mono">$5.99 USD / Mes</span>
          </div>
          <button
            onClick={() => setNotification({ message: 'Conectando con pasarela segura Stripe Checkout ($5.99/mes)...', type: 'success' })}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
          >
            Suscribirse ($5.99)
          </button>
        </div>
      </div>

      {/* Mensaje de Notificación Flotante */}
      {notification && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-red-950/80 border-red-500/50 text-red-300'
          }`}
        >
          {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Selector de Categorías */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            activeFilter === 'all'
              ? 'bg-emerald-600 text-slate-950 font-bold'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
          }`}
        >
          Todos ({COSMETIC_SHOP_CATALOG.length})
        </button>
        <button
          onClick={() => setActiveFilter('tank_light')}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            activeFilter === 'tank_light'
              ? 'bg-emerald-600 text-slate-950 font-bold'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
          }`}
        >
          Blindados
        </button>
        <button
          onClick={() => setActiveFilter('infantry')}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            activeFilter === 'infantry'
              ? 'bg-emerald-600 text-slate-950 font-bold'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
          }`}
        >
          Infantería
        </button>
        <button
          onClick={() => setActiveFilter('artillery')}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            activeFilter === 'artillery'
              ? 'bg-emerald-600 text-slate-950 font-bold'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
          }`}
        >
          Artillería
        </button>
        <button
          onClick={() => setActiveFilter('b_copter')}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            activeFilter === 'b_copter'
              ? 'bg-emerald-600 text-slate-950 font-bold'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
          }`}
        >
          Aéreos
        </button>
        <button
          onClick={() => setActiveFilter('hq')}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            activeFilter === 'hq'
              ? 'bg-emerald-600 text-slate-950 font-bold'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
          }`}
        >
          Cuartel General
        </button>
      </div>

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCatalog.map(skin => {
          const isOwned = unlockedSkinIds.includes(skin.id);
          const isEquipped = equippedSkins[skin.unitTarget] === skin.id;

          return (
            <div
              key={skin.id}
              className={`bg-slate-900 border rounded-lg p-4 flex flex-col justify-between transition-all hover:border-slate-600 ${
                isEquipped ? 'ring-2 ring-emerald-500 border-emerald-500/60' : 'border-slate-800'
              }`}
            >
              <div className="space-y-3">
                {/* Header de la Tarjeta */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getRarityBadgeStyle(skin.rarity)}`}>
                    {skin.rarity}
                  </span>
                  <span className="text-[10px] text-slate-400">{skin.unitTargetLabel}</span>
                </div>

                {/* Vista Previa Visual del Chasis */}
                <div
                  className="h-28 rounded-lg border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden shadow-inner"
                  style={{
                    background: `radial-gradient(circle, ${skin.secondaryColor}40 0%, #090d16 80%)`,
                  }}
                >
                  {/* Icono / Silueta estilizada */}
                  <div
                    className="w-14 h-14 rounded-lg flex items-center justify-center border shadow-lg transform hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: skin.previewColor,
                      borderColor: skin.secondaryColor,
                      boxShadow: `0 0 15px ${skin.previewColor}50`,
                    }}
                  >
                    <Shield className="w-8 h-8 text-white" />
                  </div>

                  <span className="text-[10px] font-bold text-slate-300 mt-2 bg-slate-950/70 px-2 py-0.5 rounded">
                    {skin.badge}
                  </span>
                </div>

                {/* Título y Descripción */}
                <div>
                  <h4 className="font-bold text-sm text-white line-clamp-1">{skin.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {skin.description}
                  </p>
                </div>
              </div>

              {/* Botón de Compra o Equipar */}
              <div className="pt-4 border-t border-slate-800 mt-3 flex items-center justify-between gap-2">
                <div className="text-xs font-bold">
                  {isOwned ? (
                    <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                      <Check className="w-3.5 h-3.5" /> Adquirido
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 ${skin.currency === 'gold' ? 'text-amber-400' : 'text-purple-400'}`}>
                      {skin.currency === 'gold' ? <Coins className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {skin.price} {skin.currency === 'gold' ? 'G' : 'Gemas'}
                    </span>
                  )}
                </div>

                <div>
                  {isOwned ? (
                    <button
                      onClick={() => onEquipSkin?.(skin.unitTarget, skin.id)}
                      disabled={isEquipped}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                        isEquipped
                          ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-400 cursor-default'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer'
                      }`}
                    >
                      {isEquipped ? 'Equipado' : 'Equipar'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(skin)}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                        skin.currency === 'gold'
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                      }`}
                    >
                      Desbloquear
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

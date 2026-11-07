import React, { useState, useEffect } from 'react';
import { Coins, Sparkles, Shield, Check, ShoppingBag, Eye, Tag, AlertCircle } from 'lucide-react';
import { COSMETIC_SHOP_CATALOG, CosmeticSkin, UnitSkinTarget } from '@shared';
import { audioManager } from '@domains/game-feel';

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

  // Mapeo de atajos [1]-[6] para conmutación instantánea de categorías
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') {
        audioManager.playHoverTick();
        setActiveFilter('all');
      } else if (e.key === '2') {
        audioManager.playHoverTick();
        setActiveFilter('tank_light');
      } else if (e.key === '3') {
        audioManager.playHoverTick();
        setActiveFilter('infantry');
      } else if (e.key === '4') {
        audioManager.playHoverTick();
        setActiveFilter('artillery');
      } else if (e.key === '5') {
        audioManager.playHoverTick();
        setActiveFilter('b_copter');
      } else if (e.key === '6') {
        audioManager.playHoverTick();
        setActiveFilter('hq');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredCatalog = COSMETIC_SHOP_CATALOG.filter(skin => {
    if (activeFilter === 'all') return true;
    return skin.unitTarget === activeFilter;
  });

  const handleBuy = (skin: CosmeticSkin) => {
    if (unlockedSkinIds.includes(skin.id)) {
      audioManager.playSFX('button_click');
      setNotification({ message: 'Ya posees este camuflaje en tu arsenal.', type: 'error' });
      return;
    }

    if (skin.currency === 'gold') {
      if (userGold < skin.price) {
        audioManager.playSFX('button_click');
        setNotification({
          message: `Fondos insuficientes. Se requieren ${skin.price.toLocaleString()}G y dispones de ${userGold.toLocaleString()}G.`,
          type: 'error',
        });
        return;
      }
      const newGold = userGold - skin.price;
      onPurchaseSuccess(skin, newGold, userGems);
      audioManager.playSFX('super_co_power');
      audioManager.playGoldTick(12);
      setNotification({ message: `¡CAMUFLAJE "${skin.name.toUpperCase()}" INCORPORADO AL ARSENAL!`, type: 'success' });
    } else {
      if (userGems < skin.price) {
        audioManager.playSFX('button_click');
        setNotification({
          message: `Gemas insuficientes. Se requieren ${skin.price} Gemas y dispones de ${userGems} Gemas.`,
          type: 'error',
        });
        return;
      }
      const newGems = userGems - skin.price;
      onPurchaseSuccess(skin, userGold, newGems);
      audioManager.playSFX('super_co_power');
      audioManager.playGoldTick(12);
      setNotification({ message: `¡CAMUFLAJE "${skin.name.toUpperCase()}" INCORPORADO AL ARSENAL!`, type: 'success' });
    }

    setTimeout(() => setNotification(null), 3500);
  };

  const getRarityBadgeStyle = (rarity: CosmeticSkin['rarity']) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-purple-950 text-purple-200 border-2 border-purple-400 shadow-[2px_2px_0px_#0A0B08]';
      case 'epic':
        return 'bg-blue-950 text-blue-200 border-2 border-blue-400 shadow-[2px_2px_0px_#0A0B08]';
      case 'rare':
        return 'bg-emerald-950 text-emerald-200 border-2 border-emerald-400 shadow-[2px_2px_0px_#0A0B08]';
      default:
        return 'bg-[#181914] text-[#F2E8D5] border-2 border-[#7B8A4A]/50 shadow-[2px_2px_0px_#0A0B08]';
    }
  };

  return (
    <div className="space-y-5 font-mono text-[#F2E8D5] select-none">
      {/* Barra de Fondos y Filtros */}
      <div className="bg-[#2B2C24] border-2 border-[#0A0B08] rounded-[14px_4px_14px_4px] p-4 flex flex-wrap items-center justify-between gap-4 shadow-[4px_4px_0px_#0A0B08] ben-day-dark">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[8px_2px_8px_2px] bg-amber-500 border-2 border-[#0A0B08] flex items-center justify-center text-slate-950 shadow-[2px_2px_0px_#0A0B08]">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#F2E8D5] flex items-center gap-2 uppercase tracking-wide">
              TIENDA TÁCTICA & ARSENAL DE COMBATE
              <span className="text-[9px] bg-amber-400 text-slate-950 border border-[#0A0B08] px-2 py-0.5 rounded-[4px_1px_4px_1px] font-black tracking-wider shadow-[2px_2px_0px_#0A0B08]">
                ★ PROTOCOLO FAIR-PLAY COSTA
              </span>
            </h3>
            <p className="text-[11px] text-[#7B8A4A] mt-0.5 font-bold">
              Personalizaciones 100% cosméticas. Estadísticas idénticas y niveladas a Nivel 11 en torneos oficiales.
            </p>
          </div>
        </div>

        {/* Saldos del Jugador */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px_2px_8px_2px] bg-[#181914] border-2 border-[#0A0B08] text-amber-400 font-black shadow-[2px_2px_0px_#0A0B08] tabular-nums">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{userGold.toLocaleString()}G</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px_2px_8px_2px] bg-[#181914] border-2 border-[#0A0B08] text-purple-300 font-black shadow-[2px_2px_0px_#0A0B08] tabular-nums">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>{userGems.toLocaleString()} Gemas</span>
          </div>
        </div>
      </div>

      {/* Banner de Alto Valor: Command Pass V2 ($5.99 / Mes) */}
      <div className="bg-[#2B2C24] border-2 border-amber-500/80 rounded-[18px_4px_18px_4px] p-4 shadow-[6px_6px_0px_#0A0B08] flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-[10px_2px_10px_2px] bg-amber-400 border-2 border-[#0A0B08] flex items-center justify-center text-2xl shadow-[3px_3px_0px_#0A0B08] shrink-0">
            🎖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-amber-400 text-slate-950 font-black text-[10px] uppercase border border-[#0A0B08]">
                SUSCRIPCIÓN OFICIAL
              </span>
              <h4 className="text-[#F2E8D5] font-black text-sm uppercase tracking-wide">COMMAND PASS DE TEMPORADA</h4>
            </div>
            <p className="text-[#F2E8D5]/80 text-xs mt-0.5 font-bold">
              1 Salvaguarda Táctica diaria (00:00 UTC) • Cola automática de apertura de suministros • 300 Gemas + 35,000G
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-[#7B8A4A] block line-through">$9.99 USD</span>
            <span className="text-sm font-black text-amber-400 tabular-nums">$5.99 USD / Mes</span>
          </div>
          <button
            onClick={() => {
              audioManager.playSFX('button_click');
              setNotification({ message: 'Conectando con pasarela segura Stripe Checkout ($5.99/mes)...', type: 'success' });
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className="px-4 py-2 rounded-[10px_2px_10px_2px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            Suscribirse ($5.99)
          </button>
        </div>
      </div>

      {/* Mensaje de Notificación Flotante */}
      {notification && (
        <div
          className={`p-3 rounded-[10px_2px_10px_2px] border-2 text-xs font-black flex items-center gap-2 transition-all shadow-[4px_4px_0px_#0A0B08] ${
            notification.type === 'success'
              ? 'bg-[#46521F] border-[#7B8A4A] text-[#F2E8D5]'
              : 'bg-[#7F1D1D] border-[#EF4444] text-[#F2E8D5]'
          }`}
        >
          {notification.type === 'success' ? <Check className="w-4 h-4 text-emerald-300" /> : <AlertCircle className="w-4 h-4 text-amber-300" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Selector de Categorías con atajos numéricos */}
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-[#0A0B08] pb-2">
        {[
          { key: 'all', label: 'Todos', count: COSMETIC_SHOP_CATALOG.length, hotkey: '1' },
          { key: 'tank_light', label: 'Blindados', hotkey: '2' },
          { key: 'infantry', label: 'Infantería', hotkey: '3' },
          { key: 'artillery', label: 'Artillería', hotkey: '4' },
          { key: 'b_copter', label: 'Aéreos', hotkey: '5' },
          { key: 'hq', label: 'Cuartel General', hotkey: '6' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => {
              audioManager.playHoverTick();
              setActiveFilter(item.key as any);
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className={`px-3 py-1.5 rounded-[6px_2px_6px_2px] text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-2 border-[#0A0B08] flex items-center gap-1.5 ${
              activeFilter === item.key
                ? 'bg-[#46521F] text-[#F2E8D5] shadow-[3px_3px_0px_#0A0B08]'
                : 'bg-[#181914] text-[#7B8A4A] hover:text-[#F2E8D5] shadow-[1px_1px_0px_#0A0B08]'
            }`}
          >
            <span>{item.label}</span>
            {item.count !== undefined && <span className="text-[10px] opacity-80">({item.count})</span>}
            <span className="text-[9px] px-1 py-0.2 rounded bg-[#0A0B08] text-amber-300/80 font-mono">[{item.hotkey}]</span>
          </button>
        ))}
      </div>

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCatalog.map(skin => {
          const isOwned = unlockedSkinIds.includes(skin.id);
          const isEquipped = equippedSkins[skin.unitTarget] === skin.id;

          return (
            <div
              key={skin.id}
              className={`bg-[#2B2C24] border-2 rounded-[14px_4px_14px_4px] p-4 flex flex-col justify-between transition-all shadow-[4px_4px_0px_#0A0B08] ${
                isEquipped ? 'border-amber-400 bg-[#34352B]' : 'border-[#0A0B08]'
              }`}
            >
              <div className="space-y-3">
                {/* Header de la Tarjeta */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-[4px_1px_4px_1px] uppercase ${getRarityBadgeStyle(skin.rarity)}`}>
                    {skin.rarity}
                  </span>
                  <span className="text-[10px] font-bold text-[#7B8A4A] uppercase">{skin.unitTargetLabel}</span>
                </div>

                {/* Vista Previa Visual del Chasis */}
                <div
                  className="h-28 rounded-[10px_2px_10px_2px] border-2 border-[#0A0B08] flex flex-col items-center justify-center relative overflow-hidden shadow-inner"
                  style={{
                    background: `radial-gradient(circle, ${skin.secondaryColor}40 0%, #161712 85%)`,
                  }}
                >
                  {/* Icono / Silueta estilizada */}
                  <div
                    className="w-14 h-14 rounded-[10px_2px_10px_2px] flex items-center justify-center border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] transform hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: skin.previewColor,
                    }}
                  >
                    <Shield className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                  </div>

                  <span className="text-[10px] font-black text-[#F2E8D5] mt-2 bg-[#181914] px-2 py-0.5 rounded border border-[#7B8A4A]/50">
                    {skin.badge}
                  </span>
                </div>

                {/* Título y Descripción */}
                <div>
                  <h4 className="font-black text-sm text-[#F2E8D5] uppercase line-clamp-1">{skin.name}</h4>
                  <p className="text-[11px] text-[#7B8A4A] mt-1 line-clamp-2 leading-relaxed font-bold">
                    {skin.description}
                  </p>
                </div>
              </div>

              {/* Botón de Compra o Equipar */}
              <div className="pt-3.5 border-t border-[#7B8A4A]/30 mt-3 flex items-center justify-between gap-2">
                <div className="text-xs font-black tabular-nums">
                  {isOwned ? (
                    <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                      <Check className="w-3.5 h-3.5" /> Adquirido
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 ${skin.currency === 'gold' ? 'text-amber-400' : 'text-purple-300'}`}>
                      {skin.currency === 'gold' ? <Coins className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {skin.price.toLocaleString()} {skin.currency === 'gold' ? 'G' : 'Gemas'}
                    </span>
                  )}
                </div>

                <div>
                  {isOwned ? (
                    <button
                      onClick={() => {
                        audioManager.playSFX('unit_order');
                        onEquipSkin?.(skin.unitTarget, skin.id);
                      }}
                      onMouseEnter={() => audioManager.playHoverTick()}
                      disabled={isEquipped}
                      className={`px-3 py-1.5 rounded-[6px_2px_6px_2px] text-xs font-black uppercase tracking-wider transition-all border-2 border-[#0A0B08] ${
                        isEquipped
                          ? 'bg-[#46521F] text-amber-300 cursor-default shadow-none'
                          : 'bg-[#181914] hover:bg-[#34352C] text-[#F2E8D5] cursor-pointer shadow-[2px_2px_0px_#0A0B08] active:translate-x-0.5 active:translate-y-0.5'
                      }`}
                    >
                      {isEquipped ? 'Equipado' : 'Equipar'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(skin)}
                      onMouseEnter={() => audioManager.playHoverTick()}
                      className={`px-3.5 py-1.5 rounded-[6px_2px_6px_2px] text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-2 border-[#0A0B08] shadow-[3px_3px_0px_#0A0B08] active:translate-x-0.5 active:translate-y-0.5 ${
                        skin.currency === 'gold'
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                          : 'bg-purple-600 hover:bg-purple-500 text-white'
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

import React from 'react';
import {
  ShoppingBag,
  Factory,
  Palette,
  Scale,
  Shield,
  FileText,
  Swords,
  Zap,
  Radio,
  Wrench,
} from 'lucide-react';
import { audioManager } from '../../engine/audioManager';
import { LobbyBarkIntent } from '../../engine/barkEngine';

export type LobbyStationView =
  | 'shop'
  | 'armory'
  | 'industry'
  | 'marketplace'
  | 'clans'
  | 'docs'
  | 'qa';

export interface TacticalDockProps {
  activeStation?: LobbyStationView | null;
  resolvedLevel: number;
  resolvedClanTag: string;
  onNavigate: (view: LobbyStationView) => void;
  onOpenEditor?: () => void;
  onOpenBattleHQ: () => void;
  onQuickDeployBlitz: () => void;
  onInspectAlly: (allyName: string, sector: string) => void;
  onTransferSupplyToAlly: (allyName: string) => void;
  onCoordinateAlly: (allyName: string) => void;
  onOpenRecruitModal: () => void;
  onHoverIntent?: (intent: LobbyBarkIntent | null) => void;
}

export const TacticalDock: React.FC<TacticalDockProps> = ({
  activeStation = null,
  resolvedClanTag,
  onNavigate,
  onOpenEditor,
  onOpenBattleHQ,
  onQuickDeployBlitz,
  onInspectAlly,
  onTransferSupplyToAlly,
  onCoordinateAlly,
  onOpenRecruitModal,
  onHoverIntent,
}) => {
  const dockItems: {
    id: LobbyStationView;
    hotkey: string;
    label: string;
    icon: React.ReactNode;
    accentClass: string;
    intent: LobbyBarkIntent;
  }[] = [
    {
      id: 'shop',
      hotkey: '1',
      label: 'Tienda',
      icon: <ShoppingBag className="w-4 h-4 text-purple-400" />,
      accentClass: 'hover:border-purple-400',
      intent: 'hover_shop',
    },
    {
      id: 'industry',
      hotkey: '2',
      label: 'Industria',
      icon: <Factory className="w-4 h-4 text-[#C46A3A]" />,
      accentClass: 'hover:border-[#C46A3A]',
      intent: 'hover_industry',
    },
    {
      id: 'armory',
      hotkey: '3',
      label: 'Armería',
      icon: <Palette className="w-4 h-4 text-sky-400" />,
      accentClass: 'hover:border-sky-400',
      intent: 'hover_armory',
    },
    {
      id: 'marketplace',
      hotkey: '4',
      label: 'Bolsa P2P',
      icon: <Scale className="w-4 h-4 text-amber-400" />,
      accentClass: 'hover:border-amber-400',
      intent: 'hover_marketplace',
    },
    {
      id: 'clans',
      hotkey: '5',
      label: 'Alianza',
      icon: <Shield className="w-4 h-4 text-emerald-400" />,
      accentClass: 'hover:border-emerald-400',
      intent: 'hover_clans',
    },
    {
      id: 'docs',
      hotkey: '6',
      label: 'Doctrina',
      icon: <FileText className="w-4 h-4 text-[#F2E8D5]" />,
      accentClass: 'hover:border-[#F2E8D5]',
      intent: 'hover_docs',
    },
  ];

  return (
    <footer className="relative z-30 px-3 pt-1.5 pb-1 flex flex-col gap-1.5 max-w-full bg-[#1F201A] border-t-2 border-[#0A0B08] shadow-[0_-4px_0px_#0A0B08] ben-day-dark shrink-0">
      {/* FILA 1: DOCK TÁCTICO DE ESTACIONES + BOTÓN TITÁN DE COMBATE */}
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        {/* Botonera Ergonómica con Insignias de Hotkeys [1]-[6] */}
        <nav
          aria-label="Estaciones del Cuartel General"
          className="flex items-center gap-1.5 flex-1 overflow-x-auto py-0.5"
        >
          {dockItems.map((item) => {
            const isSelected = activeStation === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => {
                  audioManager.playHoverTick();
                  onHoverIntent?.(item.intent);
                }}
                onMouseLeave={() => onHoverIntent?.(null)}
                onClick={() => onNavigate(item.id)}
                className={`tactical-juice-btn relative px-3 py-1.5 flex flex-col items-center justify-center min-w-[76px] sm:min-w-[90px] border-2 ${
                  isSelected
                    ? 'bg-[#46521F] border-amber-400 text-[#F2E8D5] -translate-y-0.5'
                    : `bg-[#2B2C24] border-[#0A0B08] text-[#F2E8D5] ${item.accentClass}`
                }`}
                title={`Abrir estación ${item.label} [Tecla ${item.hotkey}]`}
              >
                {/* Insignia de Atajo de Teclado */}
                <span className="absolute top-1 right-1 px-1 rounded-[3px] bg-[#161712] border border-[#7B8A4A]/60 text-[9px] font-mono font-extrabold text-[#A9B87A] leading-tight">
                  {item.hotkey}
                </span>

                <div className="mb-0.5">{item.icon}</div>
                <span className="font-display font-extrabold text-[11px] uppercase tracking-wider leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}

          {onOpenEditor && (
            <button
              type="button"
              onMouseEnter={() => audioManager.playHoverTick()}
              onClick={() => {
                audioManager.playSFX('button_click');
                onOpenEditor();
              }}
              className="tactical-juice-btn relative px-2.5 py-1.5 hidden lg:flex flex-col items-center justify-center min-w-[78px] bg-[#161712] border-2 border-[#0A0B08] hover:border-[#C46A3A] text-[#F2E8D5]"
              title="Abrir Estudio de Cartografía y Editor Táctico [E]"
            >
              <span className="absolute top-1 right-1 px-1 rounded-[3px] bg-[#2B2C24] border border-[#7B8A4A]/60 text-[9px] font-mono font-extrabold text-[#A9B87A] leading-tight">
                E
              </span>
              <Wrench className="w-4 h-4 text-[#C46A3A] mb-0.5" />
              <span className="font-display font-extrabold text-[10px] uppercase tracking-wider leading-none">
                Editor
              </span>
            </button>
          )}
        </nav>

        {/* GRUPO DE ACCIÓN BÉLICA: DESPLIEGUE 1-CLIC + BOTÓN TITÁN 3D `¡ORDEN DE COMBATE!` */}
        <div className="flex items-center gap-2 shrink-0 pl-1">
          {/* Garantía Red-Teaming: Despliegue Blitz en 1 Clic [F] */}
          <button
            type="button"
            onMouseEnter={() => {
              audioManager.playHoverTick();
              onHoverIntent?.('hover_blitz');
            }}
            onMouseLeave={() => onHoverIntent?.(null)}
            onClick={onQuickDeployBlitz}
            className="tactical-juice-btn hidden md:flex items-center gap-1.5 px-3 py-2 bg-[#46521F] hover:bg-[#586827] border-2 border-[#0A0B08] text-[#F2E8D5]"
            title="Despliegue Inmediato en 1 Clic a Escaramuza Blitz (30s) [Tecla F]"
          >
            <Zap className="w-4 h-4 text-amber-300 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="font-display font-extrabold text-xs uppercase tracking-wider leading-none">
                BLITZ 1-CLIC
              </span>
              <span className="text-[9px] font-mono font-bold text-[#A9B87A] leading-none mt-0.5">
                ATAJO [F]
              </span>
            </div>
          </button>

          {/* BOTÓN TITÁNICO 3D CON SQUASH & STRETCH */}
          <button
            type="button"
            onMouseEnter={() => {
              audioManager.playHoverTick();
              onHoverIntent?.('hover_deploy');
            }}
            onMouseLeave={() => onHoverIntent?.(null)}
            onClick={() => {
              audioManager.playSFX('button_click');
              onOpenBattleHQ();
            }}
            className="tactical-btn-heavy px-5 py-2 flex items-center gap-3 group"
            title="Abrir Sala de Operaciones y Seleccionar Frente de Combate [SPACE]"
          >
            <div className="w-9 h-9 rounded-[8px_2px_8px_2px] bg-[#161712] border-2 border-[#0A0B08] flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform shadow-[2px_2px_0px_#0A0B08]">
              <Swords className="w-5 h-5 text-amber-300" />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-display font-extrabold uppercase tracking-wider text-[#F2E8D5] leading-none">
                  ¡ORDEN DE COMBATE!
                </span>
                <span className="px-1.5 py-0.5 rounded-[4px_1px_4px_1px] bg-[#0A0B08] text-amber-300 text-[9px] font-mono font-extrabold leading-none">
                  [SPACE]
                </span>
              </div>
              <span className="text-[10px] text-[#F2E8D5] uppercase font-mono font-bold tracking-widest opacity-95 mt-0.5">
                SALA DE OPERACIONES // C4ISR
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* FILA 2: BARRA SOCIAL COMPACTA "RADIO-NET // ENLACE TÁCTICO" (CONTRASTE WCAG AA) */}
      <div className="w-full flex items-center gap-2 pt-1 border-t border-[#7B8A4A]/40 max-w-7xl mx-auto overflow-x-auto pb-0.5">
        {/* Indicador de Frecuencia Encriptada (Único uso legítimo de #00FF66 en Footer) */}
        <div className="flex items-center gap-1.5 bg-[#161712] px-2.5 py-1 rounded-[6px_2px_6px_2px] border border-[#0A0B08] shrink-0">
          <Radio className="w-3.5 h-3.5 text-[#00FF66]" />
          <span className="text-[10px] font-mono font-extrabold text-[#00FF66] tracking-wider">
            RADIO-NET // ONLINE
          </span>
        </div>

        {/* ALIADO 1: Carlos (Nvl. 18) */}
        <div className="flex items-center gap-2 bg-[#2B2C24] border border-[#0A0B08] rounded-[8px_2px_8px_2px] px-2.5 py-0.5 shrink-0 shadow-[2px_2px_0px_#0A0B08]">
          <div className="w-5 h-5 rounded bg-[#46521F] border border-[#0A0B08] flex items-center justify-center text-[11px]">
            🎖
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-sans font-bold text-[#F2E8D5]">Carlos</span>
            <span className="text-[10px] font-mono font-bold text-[#A9B87A]">NVL.18</span>
          </div>
          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={() => onInspectAlly('Carlos', 'Sector Bravo')}
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-[#161712] border border-[#7B8A4A] hover:border-amber-400 text-[#F2E8D5] cursor-pointer transition-colors"
          >
            Inspeccionar
          </button>
        </div>

        {/* ALIADO 2: Ana (Nvl. 50) */}
        <div className="flex items-center gap-2 bg-[#2B2C24] border border-[#0A0B08] rounded-[8px_2px_8px_2px] px-2.5 py-0.5 shrink-0 shadow-[2px_2px_0px_#0A0B08]">
          <div className="w-5 h-5 rounded bg-[#46521F] border border-[#0A0B08] flex items-center justify-center text-[11px]">
            ⭐
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-sans font-bold text-[#F2E8D5]">Ana</span>
            <span className="text-[10px] font-mono font-bold text-amber-400">NVL.50</span>
          </div>
          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={() => onTransferSupplyToAlly('Ana')}
            className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-[#C46A3A] hover:bg-[#df7b48] text-[#F2E8D5] border border-[#0A0B08] cursor-pointer transition-colors"
          >
            Transferir (+25t)
          </button>
        </div>

        {/* ALIADO 3: Luis (Nvl. 53) */}
        <div className="flex items-center gap-2 bg-[#2B2C24] border border-[#0A0B08] rounded-[8px_2px_8px_2px] px-2.5 py-0.5 shrink-0 shadow-[2px_2px_0px_#0A0B08]">
          <div className="w-5 h-5 rounded bg-[#46521F] border border-[#0A0B08] flex items-center justify-center text-[11px]">
            🛡
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-sans font-bold text-[#F2E8D5]">Luis</span>
            <span className="text-[10px] font-mono font-bold text-sky-400">NVL.53</span>
          </div>
          <button
            type="button"
            onMouseEnter={() => audioManager.playHoverTick()}
            onClick={() => onCoordinateAlly('Luis')}
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px_1px_4px_1px] bg-[#161712] border border-[#7B8A4A] hover:border-amber-400 text-[#F2E8D5] cursor-pointer transition-colors"
          >
            Coordinar
          </button>
        </div>

        {/* BOTÓN RECLUTAR ALIADO */}
        <button
          type="button"
          onMouseEnter={() => audioManager.playHoverTick()}
          onClick={onOpenRecruitModal}
          className="text-[10px] font-mono font-extrabold px-3 py-0.5 rounded-[6px_2px_6px_2px] bg-[#161712] border border-dashed border-[#C46A3A] text-[#F2E8D5] hover:border-amber-400 shrink-0 cursor-pointer transition-colors"
          title={`Generar código de reclutamiento para ${resolvedClanTag}`}
        >
          + Reclutar Aliado
        </button>
      </div>
    </footer>
  );
};

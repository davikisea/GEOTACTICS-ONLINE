/**
 * ==============================================================================
 * MODAL DE EXPEDIENTE MILITAR DEL COMANDANTE (ESTÉTICA RETRO-FUTURISTA)
 * ==============================================================================
 * Skill: Retro-futurism (Esquinas asimétricas 40px 10px 40px 10px, biseles cromados,
 * CRT scanlines, paleta #46521F, #7B8A4A, #C46A3A, #F2E8D5, #2B2C24, tipografía
 * monoespaciada de terminal militar, sellos Pop-Art).
 * 
 * Funcionalidades:
 * - Nombre de Código y sufijo numérico inmutable #TAG.
 * - Bandera de Jurisdicción (ISO-3166-1 alpha-2 y Facciones PMC: TITAN, VALKYRIE, SHADOW, SOLARIS).
 * - Título Militar y Lema de Combate (Bio).
 * - Vitrina de Rendimiento Operativo: Winrate 1v1, Winrate 2v2 (Ajedrez Cruzado), ELO Máximo, Bond de Comandante.
 * - Medallas Condecoradas Destacadas (Pinned Badges).
 * - Selección de Marco de Avatar y Fondo de Expediente (100% Cosmético / 0% P2W).
 */

import React, { useState } from 'react';
import {
  X,
  Shield,
  Award,
  Flag,
  Crosshair,
  User,
  Sparkles,
  CheckCircle2,
  Lock,
  Flame,
  Radio,
  FileText,
  Palette
} from 'lucide-react';
import { UserProfileIdentity } from '../../engine/clanSystem';
import { audioManager } from '../../engine/audioManager';

interface CommanderProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfileIdentity;
  onUpdateProfile: (updated: UserProfileIdentity) => void;
  userGems: number;
  onUpdateUserGems: (gems: number) => void;
  onSignOut?: () => void;
}

const FACTION_FLAGS = [
  { code: 'PMC_TITAN', label: 'PMC Titán (Blindaje Industrial)', icon: '🛡️' },
  { code: 'PMC_VALKYRIE', label: 'PMC Valkiria (Dominio Aéreo)', icon: '🦅' },
  { code: 'PMC_SHADOW', label: 'PMC Sombra (Ciber-Guerra)', icon: '👁️' },
  { code: 'PMC_SOLARIS', label: 'PMC Solaris (Artillería Pesada)', icon: '⚡' },
  { code: 'ES', label: 'España', icon: '🇪🇸' },
  { code: 'US', label: 'Estados Unidos', icon: '🇺🇸' },
  { code: 'MX', label: 'México', icon: '🇲🇽' },
  { code: 'DE', label: 'Alemania', icon: '🇩🇪' },
  { code: 'JP', label: 'Japón', icon: '🇯🇵' },
  { code: 'KR', label: 'Corea del Sur', icon: '🇰🇷' },
  { code: 'BR', label: 'Brasil', icon: '🇧🇷' },
  { code: 'FR', label: 'Francia', icon: '🇫🇷' },
];

const MILITARY_TITLES = [
  'Recluta de Vanguardia',
  'Veterano de las Trincheras de Neón',
  'As de la Artillería Pesada',
  'Cerrajero de Búnkeres',
  'Estratega del Alto Mando',
  'Héroe del Ajedrez Cruzado 2v2',
  'Invicto del Frente Norte',
];

const AVATAR_FRAMES = [
  { id: 'frame_iron_standard', name: 'Bisel de Hierro Forjado', border: 'border-slate-500', glow: 'shadow-none' },
  { id: 'frame_cyber_neon', name: 'Resplandor Neón Retro', border: 'border-emerald-400', glow: 'shadow-[0_0_15px_rgba(52,211,153,0.5)]' },
  { id: 'frame_gold_laurel', name: 'Laurel Dorado de Estado Mayor', border: 'border-amber-400', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.6)]' },
];

export const CommanderProfileModal: React.FC<CommanderProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  userGems,
  onUpdateUserGems,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<'dossier' | 'customize' | 'medals'>('dossier');
  const [tempBio, setTempBio] = useState(profile.customBio);
  const [selectedFlag, setSelectedFlag] = useState(profile.countryCode);
  const [selectedTitle, setSelectedTitle] = useState(profile.militaryTitle);
  const [selectedFrame, setSelectedFrame] = useState(profile.activeAvatarFrameId);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Escuchar atajo ESC para cierre rápido
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        audioManager.play('menu_cancel');
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveCustomization = () => {
    audioManager.play('menu_select');
    const updated: UserProfileIdentity = {
      ...profile,
      customBio: tempBio,
      countryCode: selectedFlag,
      militaryTitle: selectedTitle,
      activeAvatarFrameId: selectedFrame,
    };
    onUpdateProfile(updated);
    setFeedback('¡EXPEDIENTE MILITAR ACTUALIZADO Y SINCRONIZADO CON EL ALTO MANDO!');
    setTimeout(() => setFeedback(null), 3500);
  };

  const currentFlagObj = FACTION_FLAGS.find(f => f.code === profile.countryCode) || FACTION_FLAGS[0];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          audioManager.play('menu_cancel');
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-3xl bg-[#2B2C24] border-4 border-[#46521F] rounded-[40px_10px_40px_10px] shadow-[12px_12px_0px_#0A0B08] text-[#F2E8D5] font-mono overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera Técnica Retro-Futurista */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#181914] border-b-2 border-[#46521F]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px_2px_10px_2px] bg-[#46521F] flex items-center justify-center text-lg border border-[#7B8A4A]">
              🪖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-[#C46A3A] uppercase">
                  DOCUMENTO CLASIFICADO • ESTADO MAYOR
                </span>
                <span className="text-[10px] bg-[#46521F] px-2 py-0.5 rounded text-[#F2E8D5] font-bold">
                  EXPEDIENTE CONFIDENCIAL
                </span>
              </div>
              <h2 className="text-lg font-black tracking-wider uppercase">
                {profile.displayName} <span className="text-[#7B8A4A]">{profile.tagId}</span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              audioManager.play('menu_cancel');
              onClose();
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className="h-8 px-2.5 rounded-[8px_2px_8px_2px] bg-[#3B3C34] hover:bg-[#C46A3A] border border-[#7B8A4A] flex items-center justify-center gap-1.5 text-[#F2E8D5] transition-colors cursor-pointer text-xs font-bold"
            title="Cerrar (ESC)"
          >
            <span className="text-[10px] text-amber-400/90 hidden sm:inline">[ESC]</span>
            <X size={16} />
          </button>
        </div>

        {/* Notificación de feedback */}
        {feedback && (
          <div className="bg-[#46521F] border-b-2 border-[#7B8A4A] px-6 py-2 text-center text-xs font-black text-[#F2E8D5] animate-pulse">
            ⭐ {feedback}
          </div>
        )}

        {/* Pestañas de Navegación del Expediente */}
        <div className="flex border-b-2 border-[#46521F] bg-[#22231C]">
          <button
            onClick={() => {
              audioManager.play('menu_select');
              setActiveTab('dossier');
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'dossier'
                ? 'bg-[#2B2C24] text-[#F2E8D5] border-b-4 border-[#C46A3A]'
                : 'text-[#7B8A4A] hover:bg-[#2B2C24]/50'
            }`}
          >
            <FileText size={14} /> Hoja de Servicio
          </button>
          <button
            onClick={() => {
              audioManager.play('menu_select');
              setActiveTab('customize');
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'customize'
                ? 'bg-[#2B2C24] text-[#F2E8D5] border-b-4 border-[#C46A3A]'
                : 'text-[#7B8A4A] hover:bg-[#2B2C24]/50'
            }`}
          >
            <Palette size={14} /> Personalizar Identidad
          </button>
          <button
            onClick={() => {
              audioManager.play('menu_select');
              setActiveTab('medals');
            }}
            onMouseEnter={() => audioManager.playHoverTick()}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'medals'
                ? 'bg-[#2B2C24] text-[#F2E8D5] border-b-4 border-[#C46A3A]'
                : 'text-[#7B8A4A] hover:bg-[#2B2C24]/50'
            }`}
          >
            <Award size={14} /> Vitrina de Honor
          </button>
        </div>

        {/* Contenido Dinámico */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'dossier' && (
            <div className="space-y-6">
              {/* Tarjeta de Identidad Superior */}
              <div className="p-4 bg-[#181914] border-2 border-[#46521F] rounded-[25px_5px_25px_5px] flex flex-col sm:flex-row items-center gap-5">
                <div className="relative">
                  <div
                    className={`w-20 h-20 rounded-[20px_5px_20px_5px] bg-[#2B2C24] border-4 flex items-center justify-center text-3xl ${
                      AVATAR_FRAMES.find(f => f.id === profile.activeAvatarFrameId)?.border || 'border-slate-500'
                    } ${AVATAR_FRAMES.find(f => f.id === profile.activeAvatarFrameId)?.glow || ''}`}
                  >
                    ⭐
                  </div>
                  <div className="absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded bg-[#46521F] text-[10px] font-black border border-[#7B8A4A]">
                    {currentFlagObj.icon}
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-base font-black uppercase text-[#F2E8D5]">{profile.displayName}</span>
                    <span className="text-xs text-[#7B8A4A] font-bold">{profile.tagId}</span>
                    <span className="text-[10px] bg-[#46521F]/80 text-[#F2E8D5] px-2 py-0.5 rounded font-black border border-[#7B8A4A]">
                      {currentFlagObj.label}
                    </span>
                  </div>
                  <div className="text-xs text-[#C46A3A] font-black uppercase tracking-wider">
                    {profile.militaryTitle}
                  </div>
                  <p className="text-xs text-[#7B8A4A] italic">
                    "{profile.customBio}"
                  </p>
                </div>

                <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l border-[#46521F] pt-3 sm:pt-0 sm:pl-4">
                  <span className="text-[10px] text-[#7B8A4A] uppercase font-bold block">Rating ELO Actual</span>
                  <span className="text-2xl font-black text-[#F2E8D5] tracking-tighter">
                    {profile.eloRating}
                  </span>
                  <span className="text-[10px] text-emerald-400 block font-bold">Rango de Leyenda</span>
                </div>
              </div>

              {/* Estadísticas Operativas de Combate */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#C46A3A] mb-3 flex items-center gap-2">
                  <Crosshair size={14} /> Telemetría de Combate y Rendimiento
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#181914] border border-[#46521F] rounded-[15px_4px_15px_4px] text-center">
                    <span className="text-[10px] text-[#7B8A4A] uppercase block font-bold">Winrate 1v1</span>
                    <span className="text-xl font-black text-[#F2E8D5]">{profile.winrate1v1}%</span>
                    <span className="text-[9px] text-[#7B8A4A] block">Duelos Singulares</span>
                  </div>

                  <div className="p-3 bg-[#181914] border-2 border-[#C46A3A]/70 rounded-[15px_4px_15px_4px] text-center bg-gradient-to-b from-[#C46A3A]/10 to-transparent">
                    <span className="text-[10px] text-[#C46A3A] uppercase block font-black">Winrate 2v2</span>
                    <span className="text-xl font-black text-amber-300">{profile.winrate2v2}%</span>
                    <span className="text-[9px] text-amber-200/70 block">Ajedrez Cruzado</span>
                  </div>

                  <div className="p-3 bg-[#181914] border border-[#46521F] rounded-[15px_4px_15px_4px] text-center">
                    <span className="text-[10px] text-[#7B8A4A] uppercase block font-bold">Comandante Insignia</span>
                    <span className="text-sm font-black text-[#F2E8D5] block truncate mt-1">Mayor Stella</span>
                    <span className="text-[9px] text-emerald-400 block font-bold">Vínculo Nv. {profile.commanderBondLevel}</span>
                  </div>

                  <div className="p-3 bg-[#181914] border border-[#46521F] rounded-[15px_4px_15px_4px] text-center">
                    <span className="text-[10px] text-[#7B8A4A] uppercase block font-bold">Licencias Cuartel</span>
                    <span className="text-xl font-black text-[#F2E8D5]">{profile.militaryFurloughsLeft} / 2</span>
                    <span className="text-[9px] text-[#7B8A4A] block">Disponibles este mes</span>
                  </div>
                </div>
              </div>

              {/* Medallas Condecoradas en Vitrina */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#C46A3A] mb-3 flex items-center gap-2">
                  <Award size={14} /> Condecoraciones Fijas de Mando
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#181914] border border-[#46521F] rounded-[15px_4px_15px_4px] flex items-center gap-3">
                    <span className="text-2xl">🎖️</span>
                    <div>
                      <div className="text-xs font-black text-[#F2E8D5]">Cruz del Buen Camarada</div>
                      <div className="text-[10px] text-[#7B8A4A]">Otorgada por rescatar a 3 aliados de embargos militares.</div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#181914] border border-[#46521F] rounded-[15px_4px_15px_4px] flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <div className="text-xs font-black text-[#F2E8D5]">As del Ajedrez Cruzado</div>
                      <div className="text-[10px] text-[#7B8A4A]">Más de 50 victorias cooperativas 2v2 en el clan.</div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#181914] border border-[#46521F] rounded-[15px_4px_15px_4px] flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <div className="text-xs font-black text-[#F2E8D5]">Veterano de Guerra</div>
                      <div className="text-[10px] text-[#7B8A4A]">Conquistó el sector Ciudadela Central en Guerra Territorial.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customize' && (
            <div className="space-y-6">
              {/* Lema de Combate (Bio) */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#C46A3A] block mb-2">
                  Lema de Combate / Directiva Personal (Máx 140 caracteres)
                </label>
                <textarea
                  value={tempBio}
                  onChange={e => setTempBio(e.target.value.substring(0, 140))}
                  rows={2}
                  className="w-full p-3 bg-[#181914] border-2 border-[#46521F] rounded-[15px_4px_15px_4px] text-sm text-[#F2E8D5] focus:outline-none focus:border-[#C46A3A]"
                  placeholder="Escribe tu doctrina bélica..."
                />
                <div className="text-right text-[10px] text-[#7B8A4A] mt-1 font-bold">
                  {tempBio.length} / 140 caracteres
                </div>
              </div>

              {/* Selección de Bandera / PMC */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#C46A3A] block mb-2">
                  Jurisdicción Militar / Bandera PMC
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FACTION_FLAGS.map(f => (
                    <button
                      key={f.code}
                      onClick={() => {
                        audioManager.play('menu_select');
                        setSelectedFlag(f.code);
                      }}
                      className={`p-2 rounded-[10px_2px_10px_2px] border text-left flex items-center gap-2 transition-all ${
                        selectedFlag === f.code
                          ? 'bg-[#46521F] border-[#C46A3A] text-[#F2E8D5]'
                          : 'bg-[#181914] border-[#46521F]/60 text-[#7B8A4A] hover:border-[#7B8A4A]'
                      }`}
                    >
                      <span className="text-lg">{f.icon}</span>
                      <span className="text-xs font-bold truncate">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Título Militar */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#C46A3A] block mb-2">
                  Título Honorífico de Servicio
                </label>
                <select
                  value={selectedTitle}
                  onChange={e => setSelectedTitle(e.target.value)}
                  className="w-full p-3 bg-[#181914] border-2 border-[#46521F] rounded-[15px_4px_15px_4px] text-xs font-bold text-[#F2E8D5] focus:outline-none focus:border-[#C46A3A]"
                >
                  {MILITARY_TITLES.map(title => (
                    <option key={title} value={title} className="bg-[#181914] text-[#F2E8D5]">
                      {title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marco de Avatar */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-[#C46A3A] block mb-2">
                  Marco de Retrato de Avatar
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {AVATAR_FRAMES.map(frame => (
                    <button
                      key={frame.id}
                      onClick={() => {
                        audioManager.play('menu_select');
                        setSelectedFrame(frame.id);
                      }}
                      className={`p-3 rounded-[15px_4px_15px_4px] border-2 text-center transition-all ${
                        selectedFrame === frame.id
                          ? 'bg-[#46521F] border-[#C46A3A] text-[#F2E8D5]'
                          : 'bg-[#181914] border-[#46521F]/60 text-[#7B8A4A] hover:border-[#7B8A4A]'
                      }`}
                    >
                      <div className={`w-12 h-12 mx-auto rounded-[12px_3px_12px_3px] border-2 ${frame.border} flex items-center justify-center text-xl mb-2`}>
                        ⭐
                      </div>
                      <span className="text-xs font-bold block">{frame.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón de Guardar */}
              <div className="pt-4 border-t border-[#46521F]">
                <button
                  onClick={handleSaveCustomization}
                  className="w-full py-3 bg-[#C46A3A] hover:bg-[#b05d32] text-[#F2E8D5] font-black uppercase tracking-widest rounded-[15px_4px_15px_4px] shadow-[6px_6px_0px_rgba(0,0,0,0.5)] border-2 border-[#F2E8D5]/20 flex items-center justify-center gap-2 transition-all active:translate-y-1"
                >
                  <CheckCircle2 size={16} /> Guardar Directivas de Expediente
                </button>
              </div>
            </div>
          )}

          {activeTab === 'medals' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#181914] border border-[#46521F] rounded-[20px_5px_20px_5px]">
                <h4 className="text-xs font-black uppercase text-[#C46A3A] mb-1">
                  Doctrina de Condecoraciones y Mérito Militar
                </h4>
                <p className="text-xs text-[#7B8A4A]">
                  Las medallas se obtienen exclusivamente mediante logros de combate, rescates fraternales y control territorial en la Guerra de Clanes. Cero pay-to-win.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-[#181914] border-2 border-amber-500/50 rounded-[15px_4px_15px_4px] flex items-center gap-3">
                  <div className="text-3xl">🏅</div>
                  <div>
                    <div className="text-xs font-black text-amber-300">Medalla de la Salvaguarda Táctica</div>
                    <div className="text-[10px] text-[#7B8A4A]">Alcanza 10 victorias consecutivas con multiplicador 2.0x Doble Botín.</div>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold mt-1 inline-block">
                      ¡COMPLETADO!
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#181914] border-2 border-emerald-500/50 rounded-[15px_4px_15px_4px] flex items-center gap-3">
                  <div className="text-3xl">🛡️</div>
                  <div>
                    <div className="text-xs font-black text-emerald-300">Cruz del Buen Camarada</div>
                    <div className="text-[10px] text-[#7B8A4A]">Saldó la fianza militar de un camarada bajo embargo.</div>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold mt-1 inline-block">
                      ¡COMPLETADO!
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#181914] border border-[#46521F] rounded-[15px_4px_15px_4px] flex items-center gap-3 opacity-60">
                  <div className="text-3xl">🔒</div>
                  <div>
                    <div className="text-xs font-black text-[#F2E8D5]">Gran Mariscal de los 7 Sectores</div>
                    <div className="text-[10px] text-[#7B8A4A]">Conquista los 7 sectores en una misma temporada de Guerra Territorial.</div>
                    <span className="text-[9px] text-[#7B8A4A] block mt-1">Progreso: [ 2 / 7 ] Sectores</span>
                  </div>
                </div>

                <div className="p-3 bg-[#181914] border border-[#46521F] rounded-[15px_4px_15px_4px] flex items-center gap-3 opacity-60">
                  <div className="text-3xl">🔒</div>
                  <div>
                    <div className="text-xs font-black text-[#F2E8D5]">Logística Fraternal de Acero</div>
                    <div className="text-[10px] text-[#7B8A4A]">Dona más de 500 cartas a tus camaradas de corporación militar.</div>
                    <span className="text-[9px] text-[#7B8A4A] block mt-1">Progreso: [ 42 / 500 ] Cartas</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Expediente */}
        <div className="p-4 bg-[#181914] border-t-2 border-[#46521F] flex items-center justify-between text-[10px] text-[#7B8A4A]">
          <div className="flex items-center gap-2">
            <span>ESTADO MAYOR • RED DE INTELIGENCIA DE COMANDO</span>
            <span className="text-emerald-400 font-bold hidden sm:inline">● PROTOCOLO CIFRADO ACTIVO</span>
          </div>
          {onSignOut && (
            <button
              type="button"
              onClick={() => {
                audioManager.playSFX('button_click');
                onClose();
                onSignOut();
              }}
              className="px-3 py-1 bg-red-950/80 hover:bg-red-800 text-red-200 border border-red-700/60 rounded text-xs font-mono font-bold cursor-pointer transition-colors"
            >
              Cerrar Sesión Militar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

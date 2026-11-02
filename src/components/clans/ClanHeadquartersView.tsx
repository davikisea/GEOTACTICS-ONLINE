/**
 * ==============================================================================
 * CUARTEL GENERAL CORPORATIVO, IDENTIDAD, GUERRA TERRITORIAL Y DONACIONES
 * ==============================================================================
 * Skill: Retro-futurism (Atompunk soviético/occidental, esquinas asimétricas,
 * biseles de acero, tipografía militar monoespaciada, paleta #46521F, #7B8A4A,
 * #C46A3A, #F2E8D5, #2B2C24, sombras duras y sellos Pop-Art).
 * 
 * Reglas Canónicas Implementadas:
 * 1. Bóveda Escalonada (Tier 1 a 3): según combatientes activos en el ciclo de guerra.
 * 2. Embargo por Deshonor: 50% al tesoro corporativo, 50% dividendos Top 3 (50/30/20).
 * 3. Rescate de Camarada (Comrade Rescue): un compañero paga la fianza (+150 XP).
 * 4. Licencias de Cuartel (Military Furlough): 2 días mensuales de gracia justificada.
 * 5. Guerra Territorial de Clanes: 7 Sectores Estratégicos con multiplicador 2.0x en 2v2.
 * 6. Logística Fraternal: Donación de cartas con recompensas instantáneas de Oro y XP.
 * 7. Proyectos del Alto Mando: Sumideros del tesoro (Sobrealimentación Industrial, Asedios).
 * 8. Protocolo de Salvaguarda Táctica: Seguro de racha proactivo (Multiplicador 1.0x a 2.0x).
 */

import React, { useState } from 'react';
import {
  Shield,
  Award,
  Users,
  Lock,
  Unlock,
  Coins,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Sparkles,
  Zap,
  Hammer,
  Clock,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  FileText,
  Volume2,
  MapPin,
  Send,
  Flag,
  Radio,
  Crosshair,
  UserCheck
} from 'lucide-react';
import {
  Clan,
  ClanMember,
  SafeguardInventory,
  CLAN_VAULT_TIERS,
  CANONICAL_TERRITORY_SECTORS,
  TerritorySector,
  ClanCardRequest,
  CLAN_PROJECTS,
  ClanEngine,
  VaultTier,
  CardRarity
} from '../../engine/clanSystem';
import { audioManager } from '../../engine/audioManager';

interface ClanHeadquartersViewProps {
  clan: Clan;
  onUpdateClan: (clan: Clan) => void;
  members: ClanMember[];
  onUpdateMembers: (members: ClanMember[]) => void;
  currentUserId: string;
  userGold: number;
  onUpdateUserGold: (gold: number) => void;
  userSteel: number;
  onUpdateUserSteel: (steel: number) => void;
  userChips: number;
  onUpdateUserChips: (chips: number) => void;
  safeguardInventory: SafeguardInventory;
  onUpdateSafeguardInventory: (inventory: SafeguardInventory) => void;
}

export const ClanHeadquartersView: React.FC<ClanHeadquartersViewProps> = ({
  clan,
  onUpdateClan,
  members,
  onUpdateMembers,
  currentUserId,
  userGold,
  onUpdateUserGold,
  userSteel,
  onUpdateUserSteel,
  userChips,
  onUpdateUserChips,
  safeguardInventory,
  onUpdateSafeguardInventory,
}) => {
  const [activeTab, setActiveTab] = useState<'vault' | 'territory' | 'donations' | 'treasury' | 'roster' | 'safeguard'>('vault');
  const [statusBanner, setStatusBanner] = useState<{ message: string; type: 'success' | 'alert' } | null>(null);
  const [showEmbargoModal, setShowEmbargoModal] = useState<boolean>(false);
  const [showRescueModal, setShowRescueModal] = useState<ClanMember | null>(null);

  // Estado local para Sectores de Guerra y Solicitudes de Donación
  const [sectors, setSectors] = useState<TerritorySector[]>(CANONICAL_TERRITORY_SECTORS);
  const [cardRequests, setCardRequests] = useState<ClanCardRequest[]>([
    {
      id: 'req_seed_01',
      clanId: clan.id,
      requesterId: 'u_slacker_01',
      requesterName: 'Teniente_Kai',
      cardId: 'c_vulcan',
      cardName: 'Batería Antiaérea Vulcan',
      rarity: 'common',
      amountRequested: 8,
      amountDonated: 5,
      isFulfilled: false,
      expiresAt: Date.now() + 6 * 3600000,
      createdAt: Date.now() - 2 * 3600000,
    },
    {
      id: 'req_seed_02',
      clanId: clan.id,
      requesterId: 'u_veteran_02',
      requesterName: 'Mayor_Vostok',
      cardId: 'c_howitzer',
      cardName: 'Obús Pesado de Asedio',
      rarity: 'rare',
      amountRequested: 2,
      amountDonated: 1,
      isFulfilled: false,
      expiresAt: Date.now() + 8 * 3600000,
      createdAt: Date.now() - 1 * 3600000,
    },
  ]);

  // Identificar usuario actual en la nómina
  const currentUserMember = members.find(m => m.userId === currentUserId) || members[0];
  const isUserEmbargoed = currentUserMember?.isEmbargoed;

  // Tier actual de la bóveda
  const currentTierData = CLAN_VAULT_TIERS[clan.tier];

  // Cálculo de racha y multiplicador
  const currentMultiplier = ClanEngine.calculateStreakMultiplier(safeguardInventory.currentStreak);

  // Mostrar notificación temporal
  const triggerNotification = (message: string, type: 'success' | 'alert' = 'success') => {
    setStatusBanner({ message, type });
    setTimeout(() => setStatusBanner(null), 5000);
  };

  // Acción: Reclamar Bóveda de Guerra
  const handleClaimVault = () => {
    if (isUserEmbargoed) {
      audioManager.play('menu_cancel');
      triggerNotification('¡ACCESO DENEGADO! Tu expediente militar se encuentra bajo EMBARGO POR DESHONOR.', 'alert');
      setShowEmbargoModal(true);
      return;
    }

    audioManager.play('victory_fanfare');
    onUpdateUserGold(userGold + currentTierData.creditsGold);
    onUpdateUserSteel(userSteel + currentTierData.refinedSteel);
    onUpdateUserChips(userChips + currentTierData.refinedMicrochips);

    triggerNotification(
      `¡Bóveda Militar reclamada con éxito! Recibiste: +${currentTierData.creditsGold}G, +${currentTierData.refinedSteel} Acero, +${currentTierData.refinedMicrochips} Chips y +${currentTierData.gems} Gemas.`,
      'success'
    );
  };

  // Acción: Pagar Fianza de Deshonor Individual
  const handlePayEmbargoFee = () => {
    const result = ClanEngine.payDishonorEmbargo(clan, currentUserMember, members, userGold, userSteel);
    if (!result.success) {
      audioManager.play('menu_cancel');
      triggerNotification(result.errorMessage || 'Error al saldar la fianza militar.', 'alert');
      return;
    }

    audioManager.play('menu_select');
    onUpdateClan(result.updatedClan!);
    onUpdateMembers(result.updatedMembersList!);
    onUpdateUserGold(result.updatedUserGold!);
    onUpdateUserSteel(result.updatedUserSteel!);
    setShowEmbargoModal(false);
    triggerNotification(result.broadcastMessage || 'Fianza de Deshonor saldada.', 'success');
  };

  // Acción: Rescatar a un Camarada Embargado
  const handleConfirmRescue = (targetMember: ClanMember) => {
    const result = ClanEngine.rescueComrade(clan, currentUserMember, targetMember, members, userGold, userSteel);
    if (!result.success) {
      audioManager.play('menu_cancel');
      triggerNotification(result.errorMessage || 'Error al ejecutar el rescate.', 'alert');
      return;
    }

    audioManager.play('victory_fanfare');
    onUpdateClan(result.updatedClan!);
    onUpdateMembers(result.updatedMembersList!);
    onUpdateUserGold(result.updatedSaviorGold!);
    onUpdateUserSteel(result.updatedSaviorSteel!);
    setShowRescueModal(null);
    triggerNotification(result.broadcastMessage || '¡Rescate ejecutado con honores militares!', 'success');
  };

  // Acción: Solicitar Licencia Táctica
  const handleRequestFurlough = () => {
    const result = ClanEngine.requestMilitaryFurlough(currentUserMember);
    if (!result.success) {
      audioManager.play('menu_cancel');
      triggerNotification(result.errorMessage || 'No fue posible otorgar la licencia.', 'alert');
      return;
    }

    audioManager.play('menu_select');
    const updated = members.map(m => m.userId === currentUserMember.userId ? result.updatedMember! : m);
    onUpdateMembers(updated);
    triggerNotification('¡Licencia Táctica Militar autorizada! Quedas protegido de embargos por las próximas 24 horas.', 'success');
  };

  // Acción: Donar Cartas a un Camarada
  const handleDonateCards = (req: ClanCardRequest) => {
    const result = ClanEngine.donateCards(req, currentUserMember, 1);
    if (!result.success) {
      audioManager.play('menu_cancel');
      triggerNotification(result.errorMessage || 'No se pudo donar.', 'alert');
      return;
    }

    audioManager.play('menu_select');
    onUpdateUserGold(userGold + (result.goldReward || 0));
    setCardRequests(prev => prev.map(r => r.id === req.id ? result.updatedRequest! : r));
    triggerNotification(
      `¡Plano donado con honor militar a ${req.requesterName}! Recompensa inmediata: +${result.goldReward}G y +${result.xpReward} XP.`,
      'success'
    );
  };

  // Acción: Crear Solicitud de Cartas
  const handleCreateCardRequest = (rarity: CardRarity) => {
    const result = ClanEngine.requestCardDonation(
      clan.id,
      currentUserMember,
      12, // Nivel de cuenta
      'c_panzer_iv',
      'Tanque Pesado Panzer IV',
      rarity,
      null
    );

    if (!result.success) {
      audioManager.play('menu_cancel');
      triggerNotification(result.errorMessage || 'No se pudo crear la solicitud.', 'alert');
      return;
    }

    audioManager.play('menu_select');
    setCardRequests(prev => [result.newRequest!, ...prev]);
    triggerNotification(`¡Línea de suministros activada! Solicitaste ${result.newRequest?.amountRequested} cartas de Tanque Pesado.`, 'success');
  };

  // Acción: Contribuir Tropas a un Sector de Guerra Territorial
  const handleDeployToSector = (sector: TerritorySector, is2v2: boolean) => {
    audioManager.play('turn_start');
    const result = ClanEngine.contributeTerritoryPoints(sector, clan.id, true, is2v2, sector.sectorId === clan.prioritySectorId);
    
    setSectors(prev => prev.map(s => s.sectorId === sector.sectorId ? result.sector : s));
    triggerNotification(
      `¡Victoria Táctica en ${sector.name}! Aportaste +${result.dpContributed} Puntos de Despliegue ${is2v2 ? '(🔥 ¡Bono 2.0x Ajedrez Cruzado!)' : ''}.`,
      'success'
    );
  };

  // Acción: Activar Proyecto del Alto Mando
  const handleActivateProject = (projectId: 'industrial_overcharge' | 'war_siege_funding') => {
    const result = ClanEngine.activateClanProject(clan, currentUserMember.role, projectId);
    if (!result.success) {
      audioManager.play('menu_cancel');
      triggerNotification(result.errorMessage || 'Error al autorizar proyecto.', 'alert');
      return;
    }

    audioManager.play('victory_fanfare');
    onUpdateClan(result.updatedClan!);
    triggerNotification(`¡Proyecto militar autorizado por el Alto Mando! Fondos deducidos de la Tesorería.`, 'success');
  };

  // Acción: Equipar / Desequipar Salvaguarda
  const handleToggleSafeguard = () => {
    if (!safeguardInventory.isEquipped && safeguardInventory.stock <= 0) {
      audioManager.play('menu_cancel');
      triggerNotification('No tienes Salvaguardas Tácticas en reserva. Forja una en el taller militar.', 'alert');
      return;
    }
    audioManager.play('menu_select');
    const updated = ClanEngine.toggleSafeguard(safeguardInventory);
    onUpdateSafeguardInventory(updated);
    triggerNotification(
      updated.isEquipped
        ? '¡Protocolo de Salvaguarda Táctica EQUIPADO! Tu próxima derrota no reiniciará la racha.'
        : 'Salvaguarda Táctica guardada en depósito militar.',
      'success'
    );
  };

  // Acción: Forjar Salvaguarda Táctica
  const handleCraftSafeguard = () => {
    const CRAFT_GOLD = 5000;
    const CRAFT_STEEL = 50;
    const CRAFT_CHIPS = 20;

    if (safeguardInventory.stock >= 3) {
      audioManager.play('menu_cancel');
      triggerNotification('Almacén de salvaguardas lleno (Máx 3 unidades).', 'alert');
      return;
    }
    if (userGold < CRAFT_GOLD || userSteel < CRAFT_STEEL || userChips < CRAFT_CHIPS) {
      audioManager.play('menu_cancel');
      triggerNotification('Recursos insuficientes para forjar la Salvaguarda (5,000G, 50 Acero, 20 Chips).', 'alert');
      return;
    }

    audioManager.play('menu_select');
    onUpdateUserGold(userGold - CRAFT_GOLD);
    onUpdateUserSteel(userSteel - CRAFT_STEEL);
    onUpdateUserChips(userChips - CRAFT_CHIPS);

    onUpdateSafeguardInventory({
      ...safeguardInventory,
      stock: safeguardInventory.stock + 1,
    });

    triggerNotification('¡Salvaguarda Táctica ensamblada con éxito en el taller militar!', 'success');
  };

  return (
    <div className="flex-1 bg-[#181914] text-[#F2E8D5] font-mono flex flex-col p-4 lg:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Banner de Notificación */}
      {statusBanner && (
        <div
          className={`mb-4 p-3 rounded-[15px_4px_15px_4px] border-2 flex items-center justify-between text-xs font-black shadow-[6px_6px_0px_#0A0B08] animate-in fade-in ${
            statusBanner.type === 'alert'
              ? 'bg-[#C46A3A]/20 border-[#C46A3A] text-[#F2E8D5]'
              : 'bg-[#46521F]/40 border-[#7B8A4A] text-[#F2E8D5]'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === 'alert' ? <AlertTriangle size={18} className="text-[#C46A3A]" /> : <CheckCircle2 size={18} className="text-emerald-400" />}
            <span>{statusBanner.message}</span>
          </div>
          <button onClick={() => setStatusBanner(null)} className="text-[#7B8A4A] hover:text-[#F2E8D5] cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Cabecera Principal del Cuartel General */}
      <div className="bg-[#2B2C24] border-4 border-[#46521F] rounded-[40px_10px_40px_10px] p-5 mb-6 shadow-[10px_10px_0px_#0A0B08]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[20px_5px_20px_5px] bg-[#181914] border-2 border-[#7B8A4A] flex items-center justify-center text-3xl shadow-[4px_4px_0px_#0A0B08]">
              {clan.emblemIcon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-[#46521F] text-[#F2E8D5] px-2 py-0.5 rounded font-black tracking-widest border border-[#7B8A4A]">
                  {clan.tag}
                </span>
                <span className="text-xs text-[#7B8A4A] font-bold">FUERZAS MILITARES DE VANGUARDIA</span>
              </div>
              <h1 className="text-2xl font-black uppercase tracking-wider text-[#F2E8D5] mt-1">
                {clan.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#7B8A4A] mt-1 font-bold">
                <span className="flex items-center gap-1">
                  <Users size={14} className="text-[#F2E8D5]" /> {members.length} / {clan.maxMembers} Miembros
                </span>
                <span className="flex items-center gap-1">
                  <Flame size={14} className="text-[#C46A3A]" /> {clan.warScore} Puntos Bélicos
                </span>
                <span className="flex items-center gap-1">
                  <Coins size={14} className="text-amber-400" /> Tesoro: {clan.treasuryGold.toLocaleString()}G | {clan.treasurySteel} Acero
                </span>
              </div>
            </div>
          </div>

          {/* Estado de Racha y Botón de Salvaguarda */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-[#46521F] pt-3 md:pt-0">
            <div className="text-right">
              <span className="text-[10px] text-[#7B8A4A] uppercase font-bold block">Racha de Victorias</span>
              <div className="flex items-center gap-1 justify-end">
                <Flame size={16} className="text-[#C46A3A] animate-pulse" />
                <span className="text-lg font-black text-[#F2E8D5]">{safeguardInventory.currentStreak} Victorias</span>
                <span className="text-xs bg-[#C46A3A] text-[#F2E8D5] px-1.5 py-0.2 rounded font-black ml-1">
                  {currentMultiplier}x Botín
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleSafeguard}
              onMouseEnter={() => audioManager.playHoverTick()}
              className={`px-3 py-2 rounded-[12px_3px_12px_3px] border-2 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[4px_4px_0px_#0A0B08] cursor-pointer ${
                safeguardInventory.isEquipped
                  ? 'bg-emerald-700 hover:bg-emerald-600 border-emerald-400 text-[#F2E8D5]'
                  : 'bg-[#3B3C34] hover:bg-[#46521F] border-[#7B8A4A] text-[#7B8A4A] hover:text-[#F2E8D5]'
              }`}
            >
              <Shield size={14} className={safeguardInventory.isEquipped ? 'text-emerald-300' : ''} />
              {safeguardInventory.isEquipped ? 'Seguro Activo' : 'Sin Seguro'}
            </button>
          </div>
        </div>
      </div>

      {/* Navegación por Pestañas del Cuartel (6 Pestañas) */}
      <div className="flex flex-wrap gap-2 border-b-2 border-[#46521F] pb-2 mb-6">
        <button
          onClick={() => {
            audioManager.play('menu_select');
            setActiveTab('vault');
          }}
          onMouseEnter={() => audioManager.playHoverTick()}
          className={`px-4 py-2 rounded-[12px_3px_12px_3px] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'vault'
              ? 'bg-[#46521F] text-[#F2E8D5] border-2 border-[#7B8A4A] shadow-[4px_4px_0px_#0A0B08]'
              : 'bg-[#2B2C24] text-[#7B8A4A] hover:text-[#F2E8D5] border border-[#46521F]'
          }`}
        >
          <Award size={14} /> Bóveda y Embargo
        </button>

        <button
          onClick={() => {
            audioManager.play('menu_select');
            setActiveTab('territory');
          }}
          onMouseEnter={() => audioManager.playHoverTick()}
          className={`px-4 py-2 rounded-[12px_3px_12px_3px] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'territory'
              ? 'bg-[#C46A3A] text-[#F2E8D5] border-2 border-[#F2E8D5]/30 shadow-[4px_4px_0px_#0A0B08]'
              : 'bg-[#2B2C24] text-[#7B8A4A] hover:text-[#F2E8D5] border border-[#46521F]'
          }`}
        >
          <MapPin size={14} /> Guerra Territorial (7 Sectores)
        </button>

        <button
          onClick={() => {
            audioManager.play('menu_select');
            setActiveTab('donations');
          }}
          onMouseEnter={() => audioManager.playHoverTick()}
          className={`px-4 py-2 rounded-[12px_3px_12px_3px] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'donations'
              ? 'bg-[#46521F] text-[#F2E8D5] border-2 border-[#7B8A4A] shadow-[4px_4px_0px_#0A0B08]'
              : 'bg-[#2B2C24] text-[#7B8A4A] hover:text-[#F2E8D5] border border-[#46521F]'
          }`}
        >
          <Send size={14} /> Logística y Donaciones
        </button>

        <button
          onClick={() => {
            audioManager.play('menu_select');
            setActiveTab('treasury');
          }}
          onMouseEnter={() => audioManager.playHoverTick()}
          className={`px-4 py-2 rounded-[12px_3px_12px_3px] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'treasury'
              ? 'bg-[#46521F] text-[#F2E8D5] border-2 border-[#7B8A4A] shadow-[4px_4px_0px_#0A0B08]'
              : 'bg-[#2B2C24] text-[#7B8A4A] hover:text-[#F2E8D5] border border-[#46521F]'
          }`}
        >
          <Coins size={14} /> Tesorería y Proyectos
        </button>

        <button
          onClick={() => {
            audioManager.play('menu_select');
            setActiveTab('roster');
          }}
          onMouseEnter={() => audioManager.playHoverTick()}
          className={`px-4 py-2 rounded-[12px_3px_12px_3px] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-[#46521F] text-[#F2E8D5] border-2 border-[#7B8A4A] shadow-[4px_4px_0px_#0A0B08]'
              : 'bg-[#2B2C24] text-[#7B8A4A] hover:text-[#F2E8D5] border border-[#46521F]'
          }`}
        >
          <Users size={14} /> Cuadro de Mando ({members.length})
        </button>

        <button
          onClick={() => {
            audioManager.play('menu_select');
            setActiveTab('safeguard');
          }}
          onMouseEnter={() => audioManager.playHoverTick()}
          className={`px-4 py-2 rounded-[12px_3px_12px_3px] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'safeguard'
              ? 'bg-[#46521F] text-[#F2E8D5] border-2 border-[#7B8A4A] shadow-[4px_4px_0px_#0A0B08]'
              : 'bg-[#2B2C24] text-[#7B8A4A] hover:text-[#F2E8D5] border border-[#46521F]'
          }`}
        >
          <Shield size={14} /> Taller de Salvaguarda
        </button>
      </div>

      {/* PESTAÑA 1: BÓVEDA ESCALONADA Y EMBARGO */}
      {activeTab === 'vault' && (
        <div className="space-y-6">
          {/* Alerta de Embargo por Deshonor si el usuario está afectado */}
          {isUserEmbargoed && (
            <div className="bg-[#C46A3A]/20 border-4 border-[#C46A3A] rounded-[30px_10px_30px_10px] p-5 shadow-[10px_10px_0px_#0A0B08] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[16px_4px_16px_4px] bg-[#C46A3A] flex items-center justify-center text-3xl text-[#F2E8D5]">
                  ⛓️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#C46A3A] text-[#F2E8D5] px-2 py-0.5 rounded font-black tracking-widest uppercase">
                      ¡EMBARGO POR DESHONOR!
                    </span>
                    <span className="text-xs text-[#F2E8D5] font-bold">0 Batallas registradas en 24h</span>
                  </div>
                  <p className="text-xs text-[#F2E8D5]/80 mt-1">
                    Tu acceso a la Bóveda Militar está encadenado. Salda tu fianza militar (1,500G + 30 Acero) o solicita una Licencia Táctica para rehabilitar tu estatus.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePayEmbargoFee}
                  className="px-4 py-3 bg-[#C46A3A] hover:bg-[#b05d32] text-[#F2E8D5] font-black text-xs uppercase tracking-widest rounded-[12px_3px_12px_3px] shadow-[4px_4px_0px_#0A0B08] border border-[#F2E8D5]/20"
                >
                  Pagar Fianza (1,500G)
                </button>
                <button
                  onClick={handleRequestFurlough}
                  className="px-3 py-3 bg-[#46521F] hover:bg-[#576627] text-[#F2E8D5] font-black text-xs uppercase tracking-widest rounded-[12px_3px_12px_3px] border border-[#7B8A4A]"
                >
                  Usar Licencia
                </button>
              </div>
            </div>
          )}

          {/* Tarjeta de la Bóveda Actual */}
          <div className="bg-[#2B2C24] border-4 border-[#46521F] rounded-[30px_10px_30px_10px] p-6 shadow-[10px_10px_0px_#0A0B08]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-2 border-[#46521F] pb-4 mb-4">
              <div>
                <span className="text-xs text-[#7B8A4A] font-bold uppercase tracking-wider block">Recompensa Militar del Ciclo</span>
                <h2 className="text-xl font-black uppercase text-[#F2E8D5]">
                  {currentTierData.label} (Tier {clan.tier === 'tier_3' ? '3' : clan.tier === 'tier_2' ? '2' : '1'})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#7B8A4A] font-bold">Combatientes Activos:</span>
                <span className="text-sm font-black bg-[#181914] px-3 py-1 rounded border border-[#7B8A4A] text-[#F2E8D5]">
                  {clan.activeMembersCount} / 8 Requeridos para T3
                </span>
              </div>
            </div>

            {/* Recompensas Desglosadas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3 bg-[#181914] border border-[#46521F] rounded-[15px_4px_15px_4px] text-center">
                <span className="text-[10px] text-[#7B8A4A] uppercase block font-bold">Créditos de Oro</span>
                <span className="text-lg font-black text-amber-400">+{currentTierData.creditsGold}G</span>
              </div>
              <div className="p-3 bg-[#181914] border border-[#46521F] rounded-[15px_4px_15px_4px] text-center">
                <span className="text-[10px] text-[#7B8A4A] uppercase block font-bold">Acero Refinado</span>
                <span className="text-lg font-black text-slate-300">+{currentTierData.refinedSteel} Vigas</span>
              </div>
              <div className="p-3 bg-[#181914] border border-[#46521F] rounded-[15px_4px_15px_4px] text-center">
                <span className="text-[10px] text-[#7B8A4A] uppercase block font-bold">Microchips de Tiro</span>
                <span className="text-lg font-black text-cyan-400">+{currentTierData.refinedMicrochips} Chips</span>
              </div>
              <div className="p-3 bg-[#181914] border border-[#46521F] rounded-[15px_4px_15px_4px] text-center">
                <span className="text-[10px] text-[#7B8A4A] uppercase block font-bold">Gemas de Mando</span>
                <span className="text-lg font-black text-emerald-400">+{currentTierData.gems} Gemas</span>
              </div>
            </div>

            <button
              onClick={handleClaimVault}
              className={`w-full py-4 rounded-[18px_5px_18px_5px] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 border-2 shadow-[6px_6px_0px_#0A0B08] transition-all ${
                isUserEmbargoed
                  ? 'bg-[#3B3C34] text-[#7B8A4A] border-[#46521F] cursor-not-allowed'
                  : 'bg-[#46521F] hover:bg-[#576627] text-[#F2E8D5] border-[#7B8A4A]'
              }`}
            >
              {isUserEmbargoed ? <Lock size={16} /> : <Unlock size={16} />}
              {isUserEmbargoed ? 'Bóveda Bajo Embargo Militar' : '¡Reclamar Suministros de la Bóveda!'}
            </button>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: GUERRA TERRITORIAL (7 SECTORES) */}
      {activeTab === 'territory' && (
        <div className="space-y-6">
          <div className="bg-[#2B2C24] border-4 border-[#C46A3A] rounded-[30px_10px_30px_10px] p-5 shadow-[10px_10px_0px_#0A0B08]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-xs bg-[#C46A3A] text-[#F2E8D5] px-2 py-0.5 rounded font-black tracking-widest uppercase">
                  TEATRO DE OPERACIONES MILITARES • CICLO DE 72 HORAS
                </span>
                <h2 className="text-lg font-black uppercase text-[#F2E8D5] mt-1">
                  Disputa Territorial por los 7 Sectores Estratégicos
                </h2>
                <p className="text-xs text-[#7B8A4A] mt-1">
                  Las victorias individuales aportan 100 DP. ¡Las victorias cooperativas 2v2 en pareja de clan aportan <strong className="text-amber-300">200 DP (Multiplicador 2.0x)</strong>!
                </p>
              </div>

              <div className="p-3 bg-[#181914] border border-[#7B8A4A] rounded-[15px_4px_15px_4px] text-center">
                <span className="text-[10px] text-[#7B8A4A] uppercase block font-bold">Tiempo Restante</span>
                <span className="text-base font-black text-amber-300">38h 42m</span>
              </div>
            </div>
          </div>

          {/* Grid de los 7 Sectores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.map(sec => {
              const myClanDp = sec.clanDeploymentPoints[clan.id] || 0;
              const isPriority = sec.sectorId === clan.prioritySectorId;

              return (
                <div
                  key={sec.sectorId}
                  className={`bg-[#2B2C24] border-2 rounded-[25px_6px_25px_6px] p-4 flex flex-col justify-between shadow-[6px_6px_0px_#0A0B08] ${
                    isPriority ? 'border-[#C46A3A]' : 'border-[#46521F]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-black bg-[#181914] px-2 py-0.5 rounded text-[#7B8A4A] border border-[#46521F]">
                        SECTOR 0{sec.sectorId}
                      </span>
                      {isPriority && (
                        <span className="text-[10px] bg-[#C46A3A] text-[#F2E8D5] px-2 py-0.5 rounded font-black">
                          ★ OBJETIVO PRIORITARIO (+25%)
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-black uppercase text-[#F2E8D5] mb-1">{sec.name}</h3>
                    <p className="text-xs text-[#7B8A4A] mb-3">{sec.description}</p>

                    <div className="space-y-1 mb-4">
                      <div className="flex justify-between text-[10px] text-[#7B8A4A] font-bold">
                        <span>Puntos de tu Clan: {myClanDp} DP</span>
                        <span>Total Sector: {sec.totalDeploymentPoints} DP</span>
                      </div>
                      <div className="w-full h-2 bg-[#181914] rounded-full overflow-hidden border border-[#46521F]">
                        <div
                          className="h-full bg-[#C46A3A]"
                          style={{ width: `${Math.min(100, Math.round((myClanDp / Math.max(1, sec.totalDeploymentPoints)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-[#46521F]">
                    <button
                      onClick={() => handleDeployToSector(sec, false)}
                      className="flex-1 py-2 bg-[#3B3C34] hover:bg-[#46521F] text-[#F2E8D5] text-[11px] font-black uppercase rounded-[10px_2px_10px_2px] border border-[#7B8A4A]"
                    >
                      Duelo 1v1 (+100)
                    </button>
                    <button
                      onClick={() => handleDeployToSector(sec, true)}
                      className="flex-1 py-2 bg-[#C46A3A] hover:bg-[#b05d32] text-[#F2E8D5] text-[11px] font-black uppercase rounded-[10px_2px_10px_2px] border border-[#F2E8D5]/20 shadow-[2px_2px_0px_#0A0B08]"
                    >
                      Dupla 2v2 (🔥 +200)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: LOGÍSTICA Y DONACIONES FRATERNALES */}
      {activeTab === 'donations' && (
        <div className="space-y-6">
          <div className="bg-[#2B2C24] border-4 border-[#46521F] rounded-[30px_10px_30px_10px] p-5 shadow-[10px_10px_0px_#0A0B08] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs bg-[#46521F] text-[#F2E8D5] px-2 py-0.5 rounded font-black tracking-widest uppercase border border-[#7B8A4A]">
                TERMINAL DE SUMINISTROS Y PLANOS MILITARES
              </span>
              <h2 className="text-lg font-black uppercase text-[#F2E8D5] mt-1">
                Solicitudes de Cartas Intraclán
              </h2>
              <p className="text-xs text-[#7B8A4A] mt-1">
                Dona planos sobrantes para ganar Créditos de Oro y Experiencia de Mando. Ventana de enfriamiento: 8 horas.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCreateCardRequest('common')}
                className="px-3 py-2 bg-[#3B3C34] hover:bg-[#46521F] text-[#F2E8D5] font-black text-xs uppercase rounded-[10px_2px_10px_2px] border border-[#7B8A4A]"
              >
                Pedir Común (8)
              </button>
              <button
                onClick={() => handleCreateCardRequest('rare')}
                className="px-3 py-2 bg-[#C46A3A] hover:bg-[#b05d32] text-[#F2E8D5] font-black text-xs uppercase rounded-[10px_2px_10px_2px] border border-[#F2E8D5]/20"
              >
                Pedir Rara (2)
              </button>
            </div>
          </div>

          {/* Solicitudes activas */}
          <div className="space-y-3">
            {cardRequests.map(req => {
              const isMine = req.requesterId === currentUserId;
              return (
                <div
                  key={req.id}
                  className="bg-[#2B2C24] border-2 border-[#46521F] rounded-[20px_5px_20px_5px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[4px_4px_0px_#0A0B08]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-[12px_3px_12px_3px] bg-[#181914] border-2 border-[#7B8A4A] flex items-center justify-center text-xl">
                      {req.rarity === 'rare' ? '🔷' : '📦'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#F2E8D5]">{req.requesterName}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${req.rarity === 'rare' ? 'bg-amber-600 text-[#F2E8D5]' : 'bg-slate-600 text-[#F2E8D5]'}`}>
                          {req.rarity}
                        </span>
                      </div>
                      <div className="text-sm font-black text-[#C46A3A]">{req.cardName}</div>
                      <div className="text-[10px] text-[#7B8A4A]">
                        Progreso: {req.amountDonated} / {req.amountRequested} planos recibidos
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-[#7B8A4A] block">Recompensa Donante:</span>
                      <span className="text-xs font-black text-amber-300">
                        +{req.rarity === 'rare' ? '150G + 25 XP' : '25G + 5 XP'}
                      </span>
                    </div>

                    {!isMine ? (
                      <button
                        onClick={() => handleDonateCards(req)}
                        disabled={req.isFulfilled}
                        className={`px-4 py-2 font-black text-xs uppercase rounded-[10px_2px_10px_2px] border ${
                          req.isFulfilled
                            ? 'bg-[#3B3C34] text-[#7B8A4A] border-[#46521F] cursor-not-allowed'
                            : 'bg-[#46521F] hover:bg-[#576627] text-[#F2E8D5] border-[#7B8A4A]'
                        }`}
                      >
                        {req.isFulfilled ? 'Completado' : 'Donar Plano'}
                      </button>
                    ) : (
                      <span className="text-xs text-[#7B8A4A] font-bold italic">Tu solicitud</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: TESORERÍA Y PROYECTOS DEL ALTO MANDO */}
      {activeTab === 'treasury' && (
        <div className="space-y-6">
          <div className="bg-[#2B2C24] border-4 border-[#46521F] rounded-[30px_10px_30px_10px] p-6 shadow-[10px_10px_0px_#0A0B08]">
            <h2 className="text-lg font-black uppercase text-[#F2E8D5] mb-2">
              Bóveda de Fondos Estratégicos del Clan
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-[#181914] border-2 border-amber-500/50 rounded-[18px_4px_18px_4px] text-center">
                <span className="text-xs text-[#7B8A4A] uppercase block font-bold">Oro del Tesoro</span>
                <span className="text-2xl font-black text-amber-400">{clan.treasuryGold.toLocaleString()}G</span>
              </div>
              <div className="p-4 bg-[#181914] border-2 border-slate-400/50 rounded-[18px_4px_18px_4px] text-center">
                <span className="text-xs text-[#7B8A4A] uppercase block font-bold">Acero Refinado</span>
                <span className="text-2xl font-black text-slate-200">{clan.treasurySteel} Vigas</span>
              </div>
              <div className="p-4 bg-[#181914] border-2 border-emerald-500/50 rounded-[18px_4px_18px_4px] text-center">
                <span className="text-xs text-[#7B8A4A] uppercase block font-bold">Gemas de Mando</span>
                <span className="text-2xl font-black text-emerald-400">{clan.treasuryGems || 0} Gemas</span>
              </div>
            </div>

            {/* Proyectos del Alto Mando */}
            <h3 className="text-sm font-black uppercase tracking-wider text-[#C46A3A] mb-3">
              Proyectos del Alto Mando (Sumideros de Tesorería)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.values(CLAN_PROJECTS).map(proj => (
                <div
                  key={proj.id}
                  className="p-4 bg-[#181914] border-2 border-[#46521F] rounded-[20px_5px_20px_5px] flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-sm font-black text-[#F2E8D5] mb-1">{proj.name}</h4>
                    <p className="text-xs text-[#7B8A4A] mb-3">{proj.description}</p>
                    <div className="text-xs font-bold text-amber-300 mb-4">
                      Coste: {proj.costGold.toLocaleString()}G + {proj.costSteel} Acero
                    </div>
                  </div>

                  <button
                    onClick={() => handleActivateProject(proj.id)}
                    className="w-full py-2.5 bg-[#46521F] hover:bg-[#576627] text-[#F2E8D5] font-black text-xs uppercase tracking-wider rounded-[10px_2px_10px_2px] border border-[#7B8A4A]"
                  >
                    Autorizar Proyecto (24h)
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 5: CUADRO DE MANDO (ROSTER) Y RESCATE DE CAMARADAS */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="bg-[#2B2C24] border-2 border-[#46521F] rounded-[20px_5px_20px_5px] p-4 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#F2E8D5]">
              Nómina Oficial del Regimiento Militar ({members.length} Comandantes)
            </span>
            <span className="text-xs text-[#7B8A4A] font-bold">
              Embargo: Parásitos con 0 batallas
            </span>
          </div>

          <div className="space-y-2">
            {members.map(member => {
              const isSelf = member.userId === currentUserId;
              return (
                <div
                  key={member.userId}
                  className={`p-4 rounded-[20px_5px_20px_5px] border-2 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
                    member.isEmbargoed
                      ? 'bg-[#C46A3A]/10 border-[#C46A3A]'
                      : 'bg-[#2B2C24] border-[#46521F]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px_2px_10px_2px] bg-[#181914] border border-[#7B8A4A] flex items-center justify-center text-lg">
                      {member.role === 'commander_in_chief' ? '⭐' : member.role === 'executive_officer' ? '🎖️' : member.role === 'field_officer' || member.role === 'officer' ? '⚔️' : '🪖'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#F2E8D5]">{member.userName}</span>
                        <span className="text-xs text-[#7B8A4A]">{member.tagId || '#0001'}</span>
                        <span className="text-[10px] bg-[#46521F] text-[#F2E8D5] px-1.5 py-0.2 rounded font-bold">
                          {member.role === 'commander_in_chief'
                            ? 'Coronel'
                            : member.role === 'executive_officer'
                            ? 'Mayor (XO)'
                            : member.role === 'field_officer' || member.role === 'officer'
                            ? 'Capitán'
                            : 'Soldado'}
                        </span>
                        {member.isEmbargoed && (
                          <span className="text-[9px] bg-[#C46A3A] text-[#F2E8D5] px-1.5 py-0.2 rounded font-black uppercase animate-pulse">
                            ¡EMBARGADO!
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#7B8A4A] mt-0.5">
                        Contribución: {member.contributionPoints} pts • Victorias Bélicas: {member.warBattlesCount}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {member.isEmbargoed && !isSelf && (
                      <button
                        onClick={() => handleConfirmRescue(member)}
                        className="px-3 py-1.5 bg-[#C46A3A] hover:bg-[#b05d32] text-[#F2E8D5] text-xs font-black uppercase rounded-[8px_2px_8px_2px] shadow-[3px_3px_0px_#0A0B08] border border-[#F2E8D5]/20 flex items-center gap-1.5"
                      >
                        <UserCheck size={14} /> Rescatar Camarada (1,500G)
                      </button>
                    )}

                    {member.isEmbargoed && isSelf && (
                      <button
                        onClick={handlePayEmbargoFee}
                        className="px-3 py-1.5 bg-[#C46A3A] text-[#F2E8D5] text-xs font-black uppercase rounded-[8px_2px_8px_2px]"
                      >
                        Pagar Fianza
                      </button>
                    )}

                    {!member.isEmbargoed && (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} /> En Servicio
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 6: TALLER DE SALVAGUARDA TÁCTICA */}
      {activeTab === 'safeguard' && (
        <div className="space-y-6">
          <div className="bg-[#2B2C24] border-4 border-[#46521F] rounded-[30px_10px_30px_10px] p-6 shadow-[10px_10px_0px_#0A0B08]">
            <h2 className="text-lg font-black uppercase text-[#F2E8D5] mb-2">
              Taller de Ensamblaje: Protocolo de Salvaguarda Táctica
            </h2>
            <p className="text-xs text-[#7B8A4A] mb-6">
              El seguro proactivo de racha se equipa antes del combate. Si ganas, la racha aumenta y el seguro se conserva. Si pierdes, la salvaguarda se sacrifica heroicamente blindando tu racha actual.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-[#181914] border-2 border-[#46521F] rounded-[18px_4px_18px_4px] text-center">
                <span className="text-xs text-[#7B8A4A] uppercase block font-bold">Reserva en Stock</span>
                <span className="text-2xl font-black text-[#F2E8D5]">{safeguardInventory.stock} / 3 Máx</span>
              </div>
              <div className="p-4 bg-[#181914] border-2 border-[#46521F] rounded-[18px_4px_18px_4px] text-center">
                <span className="text-xs text-[#7B8A4A] uppercase block font-bold">Estado Actual</span>
                <span className={`text-xl font-black ${safeguardInventory.isEquipped ? 'text-emerald-400' : 'text-[#7B8A4A]'}`}>
                  {safeguardInventory.isEquipped ? 'EQUIPADA' : 'EN DEPÓSITO'}
                </span>
              </div>
              <div className="p-4 bg-[#181914] border-2 border-[#46521F] rounded-[18px_4px_18px_4px] text-center">
                <span className="text-xs text-[#7B8A4A] uppercase block font-bold">Multiplicador Protegido</span>
                <span className="text-2xl font-black text-amber-300">{currentMultiplier}x</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleToggleSafeguard}
                className={`flex-1 py-3 rounded-[15px_4px_15px_4px] font-black text-xs uppercase tracking-wider border-2 shadow-[4px_4px_0px_#0A0B08] transition-all ${
                  safeguardInventory.isEquipped
                    ? 'bg-emerald-700 hover:bg-emerald-600 border-emerald-400 text-[#F2E8D5]'
                    : 'bg-[#3B3C34] hover:bg-[#46521F] border-[#7B8A4A] text-[#7B8A4A] hover:text-[#F2E8D5]'
                }`}
              >
                {safeguardInventory.isEquipped ? 'Desequipar Salvaguarda' : 'Equipar Salvaguarda'}
              </button>

              <button
                onClick={handleCraftSafeguard}
                className="flex-1 py-3 bg-[#C46A3A] hover:bg-[#b05d32] text-[#F2E8D5] font-black text-xs uppercase tracking-wider rounded-[15px_4px_15px_4px] shadow-[4px_4px_0px_#0A0B08] border border-[#F2E8D5]/20 flex items-center justify-center gap-2"
              >
                <Hammer size={16} /> Forjar Nueva Salvaguarda (5,000G + 50 Acero)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

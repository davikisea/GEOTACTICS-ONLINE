/**
 * ==============================================================================
 * MOTOR DE CORPORACIONES MILITARES (CLANES), IDENTIDAD Y GUERRA TERRITORIAL
 * ==============================================================================
 * Proyecto: Tactical Command: Wars of Legacy
 * Especificación Canónica: docs/PROPUESTA_REINGENIERIA_SOCIAL_Y_CLANES.md
 * Referencias: docs/03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md §4 & docs/02 §5
 * 
 * Reglas Canónicas Implementadas:
 * 1. Bóveda de Guerra Escalonada (Tier 1 a 3): según combatientes activos en el ciclo de 24h.
 * 2. Embargo por Deshonor Rebalanceado (Split 50% Tesorería / 50% Top 3: 50%/30%/20%).
 * 3. Protocolo de Rescate de Camarada (Comrade Rescue): fianza pagada por aliados, recompensas de XP y tributo de cartas.
 * 4. Licencias de Cuartel (Military Furlough): 2 días mensuales de gracia justificada.
 * 5. Logística Fraternal: Donaciones de cartas (8 Comunes / 2 Raras / Domingos de Épicas) con recompensas de Oro y XP.
 * 6. Transferencias P2P de Emergencia: Arancel fiscal del 4% canalizado a la tesorería corporativa.
 * 7. Guerra Territorial de Clanes: 7 Sectores Estratégicos disputados en ciclos de 72h con multiplicador 2.0x en 2v2.
 * 8. Proyectos del Alto Mando: Sumideros de tesorería para buffs colectivos (Sobrealimentación Industrial, Asedios).
 * 9. Protocolo de Salvaguarda Táctica: Seguro de racha proactivo (Multiplicador 1.0x hasta 2.0x Doble Botín).
 */

export type ClanRole = 
  | 'commander_in_chief' // Coronel / Comandante en Jefe (Fundador/Líder)
  | 'executive_officer'  // Mayor / Segundo al Mando (Co-Líder con permisos de gestión)
  | 'field_officer'      // Capitán / Oficial de Campo (Moderador/Reclutador)
  | 'officer'            // Alias de compatibilidad hacia atrás
  | 'cadet';             // Soldado / Cadete de Vanguardia (Miembro regular)
export type VaultTier = 'tier_1' | 'tier_2' | 'tier_3';
export type CardRarity = 'common' | 'rare' | 'epic';

export interface ActiveClanBuff {
  buffId: 'industrial_overcharge' | 'war_siege_funding';
  name: string;
  activatedAt: number;
  expiresAt: number;
  multiplier: number;
}

export interface Clan {
  id: string;
  name: string;
  tag: string; // e.g. [TITAN]
  emblemIcon: string;
  tier: VaultTier;
  treasuryGold: number;
  treasurySteel: number;
  treasuryGems?: number;
  warScore: number;
  activeMembersCount: number;
  maxMembers: number; // 30
  activeWarBuffs?: ActiveClanBuff[];
  clanBannerId?: string;
  prioritySectorId?: number;
}

export interface ClanMember {
  userId: string;
  userName: string;
  role: ClanRole;
  contributionPoints: number;
  warBattlesCount: number;
  isEmbargoed: boolean;
  embargoFeeGold: number;
  embargoFeeSteel: number;
  isImmuneNewRecruit: boolean;
  joinedAt: number;
  // Campos de Identidad y Gracia
  countryCode?: string; // ISO-3166-1 alpha-2 o facción PMC (ej: 'ES', 'PMC_TITAN')
  tagId?: string; // ej: '#8492'
  militaryTitle?: string;
  frameId?: string;
  lastRescueAt?: number;
  furloughsLeft?: number;
  isFurloughActive?: boolean;
}

export interface UserProfileIdentity {
  userId: string;
  displayName: string;
  tagId: string;
  countryCode: string;
  customBio: string;
  militaryTitle: string;
  activeAvatarFrameId: string;
  activeBannerId: string;
  activeLobbyVfxId: string;
  uiPaletteId: string;
  lastNicknameChangeAt?: number;
  militaryFurloughsLeft: number;
  lastEmbargoRescueAt?: number;
  pinnedMedals: (string | null)[];
  winrate1v1: number;
  winrate2v2: number;
  eloRating: number;
  favoriteCommanderId: string;
  commanderBondLevel: number;
}

export interface SafeguardInventory {
  isEquipped: boolean;
  stock: number; // Max 1 F2P / Max 3 Pass
  currentStreak: number;
  isCrafting: boolean;
  craftingCompletesAt?: number;
}

export interface VaultTierReward {
  tier: VaultTier;
  label: string;
  requiredActiveMembers: number;
  creditsGold: number;
  commonCards: number;
  rareCards: number;
  epicCards: number;
  refinedSteel: number;
  refinedMicrochips: number;
  gems: number;
}

export const CLAN_VAULT_TIERS: Record<VaultTier, VaultTierReward> = {
  tier_1: {
    tier: 'tier_1',
    label: 'Cofre Menor de Campaña',
    requiredActiveMembers: 1,
    creditsGold: 150,
    commonCards: 15,
    rareCards: 0,
    epicCards: 0,
    refinedSteel: 0,
    refinedMicrochips: 0,
    gems: 0,
  },
  tier_2: {
    tier: 'tier_2',
    label: 'Bóveda Militar Estándar',
    requiredActiveMembers: 4,
    creditsGold: 600,
    commonCards: 40,
    rareCards: 5,
    epicCards: 0,
    refinedSteel: 5,
    refinedMicrochips: 0,
    gems: 5,
  },
  tier_3: {
    tier: 'tier_3',
    label: '¡GRAN ARSENAL ESTRATÉGICO!',
    requiredActiveMembers: 8,
    creditsGold: 2500,
    commonCards: 100,
    rareCards: 15,
    epicCards: 3,
    refinedSteel: 25,
    refinedMicrochips: 10,
    gems: 20,
  },
};

// ------------------------------------------------------------------------------
// CATÁLOGO DE LOS 7 SECTORES ESTRATÉGICOS DE GUERRA TERRITORIAL
// ------------------------------------------------------------------------------
export interface TerritorySector {
  sectorId: number;
  name: string;
  description: string;
  strategicBuffType: string;
  controllingClanId?: string;
  controllingClanName?: string;
  controllingClanTag?: string;
  totalDeploymentPoints: number;
  clanDeploymentPoints: Record<string, number>; // clanId -> DP
}

export const CANONICAL_TERRITORY_SECTORS: TerritorySector[] = [
  {
    sectorId: 1,
    name: 'Base Aérea Águila Negra',
    description: '+10% probabilidad de cartas y planos aéreos en cofres.',
    strategicBuffType: 'buff_air_drop',
    totalDeploymentPoints: 1250,
    clanDeploymentPoints: {},
  },
  {
    sectorId: 2,
    name: 'Refinería Petroquímica',
    description: '+10% extracción pasiva de combustible industrial para miembros.',
    strategicBuffType: 'buff_fuel_extraction',
    totalDeploymentPoints: 2400,
    clanDeploymentPoints: {},
  },
  {
    sectorId: 3,
    name: 'Radar Maestro de Cota Cero',
    description: 'Telemetría de largo alcance: revela tácticas enemigas.',
    strategicBuffType: 'buff_early_intel',
    totalDeploymentPoints: 1800,
    clanDeploymentPoints: {},
  },
  {
    sectorId: 4,
    name: 'Ciudadela Central (Bastión Supremo)',
    description: 'Sector capital. Aporta +500G y 20 Vigas de Acero diarias al tesoro.',
    strategicBuffType: 'buff_capital_tribute',
    totalDeploymentPoints: 4500,
    clanDeploymentPoints: {},
  },
  {
    sectorId: 5,
    name: 'Centro de Ciber-Comando',
    description: '-5% costo de forja en el Complejo Industrial.',
    strategicBuffType: 'buff_forge_discount',
    totalDeploymentPoints: 1950,
    clanDeploymentPoints: {},
  },
  {
    sectorId: 6,
    name: 'Astillero Fluvial',
    description: 'Mayor asignación de planos navales y artillería costera.',
    strategicBuffType: 'buff_naval_supply',
    totalDeploymentPoints: 1600,
    clanDeploymentPoints: {},
  },
  {
    sectorId: 7,
    name: 'Depósito Ferroviario',
    description: 'Logística pesada sin impuestos para transferencias internas.',
    strategicBuffType: 'buff_free_rail_transport',
    totalDeploymentPoints: 2100,
    clanDeploymentPoints: {},
  },
];

// ------------------------------------------------------------------------------
// PROYECTOS DEL ALTO MANDO (SUMIDEROS DEL TESORO)
// ------------------------------------------------------------------------------
export interface ClanProject {
  id: 'industrial_overcharge' | 'war_siege_funding';
  name: string;
  description: string;
  costGold: number;
  costSteel: number;
  durationHours: number;
  benefitMultiplier: number;
}

export const CLAN_PROJECTS: Record<string, ClanProject> = {
  industrial_overcharge: {
    id: 'industrial_overcharge',
    name: 'Sobrealimentación Industrial',
    description: '+5% velocidad de extracción en el Complejo Industrial para todo el clan por 24 horas.',
    costGold: 15000,
    costSteel: 250,
    durationHours: 24,
    benefitMultiplier: 0.05,
  },
  war_siege_funding: {
    id: 'war_siege_funding',
    name: 'Financiamiento de Asedio Bélico',
    description: '+15% de Puntos de Despliegue en el sector disputado por 12 horas.',
    costGold: 25000,
    costSteel: 400,
    durationHours: 12,
    benefitMultiplier: 0.15,
  },
};

// ------------------------------------------------------------------------------
// SOLICITUDES Y DONACIONES DE CARTAS
// ------------------------------------------------------------------------------
export interface ClanCardRequest {
  id: string;
  clanId: string;
  requesterId: string;
  requesterName: string;
  cardId: string;
  cardName: string;
  rarity: CardRarity;
  amountRequested: number;
  amountDonated: number;
  isFulfilled: boolean;
  expiresAt: number;
  createdAt: number;
}

// ------------------------------------------------------------------------------
// MOTOR PRINCIPAL DE CLANES Y SISTEMAS SOCIALES
// ------------------------------------------------------------------------------
export class ClanEngine {
  public static readonly EMBARGO_FEE_GOLD = 1500;
  public static readonly EMBARGO_FEE_STEEL = 30;
  public static readonly EMBARGO_FEE_GEMS = 50;

  /**
   * Determina el Tier de la Bóveda del Clan según miembros activos en el ciclo bélico.
   */
  public static calculateVaultTier(activeMembersCount: number): VaultTier {
    if (activeMembersCount >= 8) return 'tier_3';
    if (activeMembersCount >= 4) return 'tier_2';
    return 'tier_1';
  }

  /**
   * Multiplicador de botín por racha invicta:
   * Multiplicador(Racha) = 1.0 + min(5, max(0, Racha - 2)) * 0.25
   */
  public static calculateStreakMultiplier(streak: number): number {
    if (streak <= 2) return 1.0;
    const bonusSteps = Math.min(5, Math.max(0, streak - 2));
    return Number((1.0 + bonusSteps * 0.25).toFixed(2));
  }

  /**
   * Auditoría de cierre de jornada:
   * Aplica embargo a 0 batallas a menos que:
   * - Sea Comandante en Jefe.
   * - Sea Recluta Inmune (< 4 días).
   * - Tenga Licencia Táctica (Furlough) activa.
   */
  public static auditDailyWarClosure(members: ClanMember[]): {
    updatedMembers: ClanMember[];
    embargoedCount: number;
    activeCount: number;
  } {
    let embargoedCount = 0;
    let activeCount = 0;

    const updatedMembers = members.map(m => {
      // Inmunidad para reclutas, jefes o con licencia activa
      if (m.isImmuneNewRecruit || m.role === 'commander_in_chief' || m.isFurloughActive) {
        if (m.warBattlesCount > 0) activeCount++;
        return {
          ...m,
          isFurloughActive: false, // Se consume la licencia del día
        };
      }

      if (m.warBattlesCount === 0) {
        embargoedCount++;
        return {
          ...m,
          isEmbargoed: true,
          embargoFeeGold: this.EMBARGO_FEE_GOLD,
          embargoFeeSteel: this.EMBARGO_FEE_STEEL,
        };
      } else {
        activeCount++;
        return {
          ...m,
          isEmbargoed: false,
        };
      }
    });

    return { updatedMembers, embargoedCount, activeCount };
  }

  /**
   * Pago individual de fianza de deshonor:
   * - 50% al tesoro corporativo.
   * - 50% repartido como dividendo al Top 3 (50%, 30%, 20%).
   */
  public static payDishonorEmbargo(
    clan: Clan,
    member: ClanMember,
    allMembers: ClanMember[],
    userGold: number,
    userSteel: number
  ): {
    success: boolean;
    updatedClan?: Clan;
    updatedMember?: ClanMember;
    updatedMembersList?: ClanMember[];
    updatedUserGold?: number;
    updatedUserSteel?: number;
    broadcastMessage?: string;
    errorMessage?: string;
  } {
    if (!member.isEmbargoed) {
      return { success: false, errorMessage: 'El comandante no se encuentra bajo embargo.' };
    }
    if (userGold < this.EMBARGO_FEE_GOLD) {
      return {
        success: false,
        errorMessage: `Oro insuficiente para pagar la fianza. Requiere ${this.EMBARGO_FEE_GOLD}G (Posees ${userGold}G).`,
      };
    }
    if (userSteel < this.EMBARGO_FEE_STEEL) {
      return {
        success: false,
        errorMessage: `Vigas de acero militar insuficientes. Requiere ${this.EMBARGO_FEE_STEEL} Acero (Posees ${userSteel}).`,
      };
    }

    const clanTreasuryGoldShare = Math.floor(this.EMBARGO_FEE_GOLD * 0.5); // 750G
    const clanTreasurySteelShare = Math.floor(this.EMBARGO_FEE_STEEL * 0.5); // 15 Acero

    const dividendGold = this.EMBARGO_FEE_GOLD - clanTreasuryGoldShare; // 750G
    const dividendSteel = this.EMBARGO_FEE_STEEL - clanTreasurySteelShare; // 15 Acero

    const eligibleMembers = allMembers
      .filter(m => m.userId !== member.userId)
      .sort((a, b) => b.contributionPoints - a.contributionPoints);

    const top1 = eligibleMembers[0];
    const top2 = eligibleMembers[1];
    const top3 = eligibleMembers[2];

    const top1BonusGold = Math.floor(dividendGold * 0.5); // 375G
    const top2BonusGold = Math.floor(dividendGold * 0.3); // 225G
    const top3BonusGold = dividendGold - top1BonusGold - top2BonusGold; // 150G

    const top1BonusSteel = Math.floor(dividendSteel * 0.5); // 7 Acero
    const top2BonusSteel = Math.floor(dividendSteel * 0.3); // 4 Acero
    const top3BonusSteel = dividendSteel - top1BonusSteel - top2BonusSteel; // 4 Acero

    const updatedMembersList = allMembers.map(m => {
      if (m.userId === member.userId) {
        return {
          ...m,
          isEmbargoed: false,
          embargoFeeGold: 0,
          embargoFeeSteel: 0,
        };
      }
      return m;
    });

    const updatedClan: Clan = {
      ...clan,
      treasuryGold: clan.treasuryGold + clanTreasuryGoldShare,
      treasurySteel: clan.treasurySteel + clanTreasurySteelShare,
    };

    const updatedMember: ClanMember = {
      ...member,
      isEmbargoed: false,
      embargoFeeGold: 0,
      embargoFeeSteel: 0,
    };

    const broadcastMessage = `¡ALERTA MILITAR! El comandante [${member.userName}] ha saldado su Fianza de Deshonor (1,500G + 30 Acero). +750G al tesoro corporativo y dividendos tributados a los 3 mejores soldados: ${top1?.userName || 'Top 1'} (+${top1BonusGold}G), ${top2?.userName || 'Top 2'} (+${top2BonusGold}G) y ${top3?.userName || 'Top 3'} (+${top3BonusGold}G).`;

    return {
      success: true,
      updatedClan,
      updatedMember,
      updatedMembersList,
      updatedUserGold: userGold - this.EMBARGO_FEE_GOLD,
      updatedUserSteel: userSteel - this.EMBARGO_FEE_STEEL,
      broadcastMessage,
    };
  }

  /**
   * Rescate de Camarada (Comrade Rescue):
   * Un aliado paga la fianza del miembro embargado.
   * - Salvador recibe +150 XP de mando y +1 medalla de honor.
   * - Reparto canónico 50% al tesoro y 50% al Top 3.
   * - Cooldown de 14 días para el usuario rescatado.
   */
  public static rescueComrade(
    clan: Clan,
    savior: ClanMember,
    embargoedMember: ClanMember,
    allMembers: ClanMember[],
    saviorGold: number,
    saviorSteel: number,
    now: number = Date.now()
  ): {
    success: boolean;
    updatedClan?: Clan;
    updatedSavior?: ClanMember;
    updatedEmbargoedMember?: ClanMember;
    updatedMembersList?: ClanMember[];
    updatedSaviorGold?: number;
    updatedSaviorSteel?: number;
    saviorXpEarned?: number;
    broadcastMessage?: string;
    errorMessage?: string;
  } {
    if (!embargoedMember.isEmbargoed) {
      return { success: false, errorMessage: 'El camarada no se encuentra bajo embargo militar.' };
    }
    if (savior.userId === embargoedMember.userId) {
      return { success: false, errorMessage: 'No puedes auto-rescatarte. Paga la fianza regular.' };
    }
    if (embargoedMember.lastRescueAt && now - embargoedMember.lastRescueAt < 14 * 86400000) {
      const daysLeft = Math.ceil((14 * 86400000 - (now - embargoedMember.lastRescueAt)) / 86400000);
      return {
        success: false,
        errorMessage: `Este camarada ya fue rescatado recientemente. Requiere esperar ${daysLeft} días más.`,
      };
    }
    if (saviorGold < this.EMBARGO_FEE_GOLD || saviorSteel < this.EMBARGO_FEE_STEEL) {
      return {
        success: false,
        errorMessage: `Fondos insuficientes para costear el rescate heroico (${this.EMBARGO_FEE_GOLD}G y ${this.EMBARGO_FEE_STEEL} Acero).`,
      };
    }

    const payResult = this.payDishonorEmbargo(clan, embargoedMember, allMembers, saviorGold, saviorSteel);
    if (!payResult.success) {
      return { success: false, errorMessage: payResult.errorMessage };
    }

    const updatedEmbargoedMember: ClanMember = {
      ...payResult.updatedMember!,
      lastRescueAt: now,
    };

    const updatedSavior: ClanMember = {
      ...savior,
      contributionPoints: savior.contributionPoints + 150,
    };

    const updatedMembersList = payResult.updatedMembersList!.map(m => {
      if (m.userId === updatedEmbargoedMember.userId) return updatedEmbargoedMember;
      if (m.userId === updatedSavior.userId) return updatedSavior;
      return m;
    });

    const broadcastMessage = `¡HEROÍSMO MILITAR! El comandante [${savior.userName}] ha ejecutado el PROTOCOLO DE RESCATE sobre [${embargoedMember.userName}], costeando íntegramente su fianza militar (+150 XP al salvador). ¡El honor de la corporación prevalece!`;

    return {
      success: true,
      updatedClan: payResult.updatedClan,
      updatedSavior,
      updatedEmbargoedMember,
      updatedMembersList,
      updatedSaviorGold: payResult.updatedUserGold,
      updatedSaviorSteel: payResult.updatedUserSteel,
      saviorXpEarned: 150,
      broadcastMessage,
    };
  }

  /**
   * Solicita una Licencia Táctica (Military Furlough):
   * Concede 24h de gracia justificada sin caer en embargo.
   */
  public static requestMilitaryFurlough(member: ClanMember): {
    success: boolean;
    updatedMember?: ClanMember;
    errorMessage?: string;
  } {
    const furloughs = member.furloughsLeft ?? 2;
    if (furloughs <= 0) {
      return { success: false, errorMessage: 'Has agotado tus 2 licencias tácticas mensuales.' };
    }
    if (member.isFurloughActive) {
      return { success: false, errorMessage: 'Ya tienes una licencia militar activa en este ciclo.' };
    }

    return {
      success: true,
      updatedMember: {
        ...member,
        furloughsLeft: furloughs - 1,
        isFurloughActive: true,
      },
    };
  }

  /**
   * Crear Solicitud de Donación de Cartas:
   * - Enfriamiento de 8 horas.
   * - Cuotas: 8 comunes, 2 raras, 1 épica (solo domingos).
   */
  public static requestCardDonation(
    clanId: string,
    requester: ClanMember,
    requesterAccountLevel: number,
    cardId: string,
    cardName: string,
    rarity: CardRarity,
    lastRequestAt: number | null,
    now: number = Date.now(),
    isSunday: boolean = new Date().getDay() === 0
  ): {
    success: boolean;
    newRequest?: ClanCardRequest;
    errorMessage?: string;
  } {
    if (requesterAccountLevel < 8) {
      return { success: false, errorMessage: 'Requieres Nivel de Mando 8 para solicitar suministros logísticos.' };
    }
    if (now - requester.joinedAt < 7 * 86400000) {
      return { success: false, errorMessage: 'Requieres al menos 7 días de permanencia en el clan para solicitar cartas.' };
    }
    if (lastRequestAt && now - lastRequestAt < 8 * 3600000) {
      const hoursLeft = Math.ceil((8 * 3600000 - (now - lastRequestAt)) / 3600000);
      return { success: false, errorMessage: `Línea de suministros en enfriamiento. Espera ${hoursLeft} horas.` };
    }

    let amount = 8;
    if (rarity === 'rare') amount = 2;
    if (rarity === 'epic') {
      if (!isSunday) {
        return { success: false, errorMessage: 'Las cartas épicas solo pueden solicitarse durante el Domingo de Suministros.' };
      }
      amount = 1;
    }

    const newRequest: ClanCardRequest = {
      id: `req_${now}_${Math.random().toString(36).substring(2, 6)}`,
      clanId,
      requesterId: requester.userId,
      requesterName: requester.userName,
      cardId,
      cardName,
      rarity,
      amountRequested: amount,
      amountDonated: 0,
      isFulfilled: false,
      expiresAt: now + 12 * 3600000,
      createdAt: now,
    };

    return { success: true, newRequest };
  }

  /**
   * Donar cartas a una solicitud activa:
   * Retribuye al donante con Oro y XP instantáneos.
   */
  public static donateCards(
    request: ClanCardRequest,
    donor: ClanMember,
    amount: number
  ): {
    success: boolean;
    updatedRequest?: ClanCardRequest;
    goldReward?: number;
    xpReward?: number;
    errorMessage?: string;
  } {
    if (request.requesterId === donor.userId) {
      return { success: false, errorMessage: 'No puedes donarte cartas a ti mismo.' };
    }
    if (request.isFulfilled) {
      return { success: false, errorMessage: 'Esta solicitud ya ha sido completada en su totalidad.' };
    }

    const remaining = request.amountRequested - request.amountDonated;
    const finalAmount = Math.min(amount, remaining);

    let goldRewardPerCard = 25;
    let xpRewardPerCard = 5;

    if (request.rarity === 'rare') {
      goldRewardPerCard = 150;
      xpRewardPerCard = 25;
    } else if (request.rarity === 'epic') {
      goldRewardPerCard = 500;
      xpRewardPerCard = 100;
    }

    const totalGoldReward = finalAmount * goldRewardPerCard;
    const totalXpReward = finalAmount * xpRewardPerCard;

    const updatedRequest: ClanCardRequest = {
      ...request,
      amountDonated: request.amountDonated + finalAmount,
      isFulfilled: request.amountDonated + finalAmount >= request.amountRequested,
    };

    return {
      success: true,
      updatedRequest,
      goldReward: totalGoldReward,
      xpReward: totalXpReward,
    };
  }

  /**
   * Contribuir Puntos de Despliegue (DP) a un Sector de Guerra Territorial:
   * 1v1 Victoria = 100 DP
   * 1v1 Derrota = 25 DP
   * 2v2 Victoria en Pareja de Clan = 200 DP (multiplicador 2.0x)
   * Sector Prioritario = +25% DP adicional
   */
  public static contributeTerritoryPoints(
    sector: TerritorySector,
    clanId: string,
    isVictory: boolean,
    isCoop2v2: boolean,
    isPrioritySector: boolean = false
  ): {
    sector: TerritorySector;
    dpContributed: number;
  } {
    let baseDp = isVictory ? (isCoop2v2 ? 200 : 100) : 25;
    if (isPrioritySector) {
      baseDp = Math.floor(baseDp * 1.25);
    }

    const currentClanDp = sector.clanDeploymentPoints[clanId] || 0;
    const updatedClanDp = currentClanDp + baseDp;

    const updatedSector: TerritorySector = {
      ...sector,
      totalDeploymentPoints: sector.totalDeploymentPoints + baseDp,
      clanDeploymentPoints: {
        ...sector.clanDeploymentPoints,
        [clanId]: updatedClanDp,
      },
    };

    return {
      sector: updatedSector,
      dpContributed: baseDp,
    };
  }

  /**
   * Activar Proyecto del Alto Mando (Sobrealimentación Industrial o Asedio Bélico):
   */
  public static activateClanProject(
    clan: Clan,
    memberRole: ClanRole,
    projectId: 'industrial_overcharge' | 'war_siege_funding',
    now: number = Date.now()
  ): {
    success: boolean;
    updatedClan?: Clan;
    errorMessage?: string;
  } {
    if (
      memberRole !== 'commander_in_chief' &&
      memberRole !== 'executive_officer' &&
      memberRole !== 'field_officer' &&
      memberRole !== 'officer'
    ) {
      return { success: false, errorMessage: 'Solo el Coronel u Oficiales de Estado Mayor pueden autorizar proyectos.' };
    }

    const project = CLAN_PROJECTS[projectId];
    if (!project) {
      return { success: false, errorMessage: 'Proyecto militar desconocido.' };
    }

    if (clan.treasuryGold < project.costGold) {
      return { success: false, errorMessage: `Oro insuficiente en el tesoro (${clan.treasuryGold}G / ${project.costGold}G).` };
    }
    if (clan.treasurySteel < project.costSteel) {
      return { success: false, errorMessage: `Acero insuficiente en el tesoro (${clan.treasurySteel} / ${project.costSteel} vigas).` };
    }

    const newBuff: ActiveClanBuff = {
      buffId: projectId,
      name: project.name,
      activatedAt: now,
      expiresAt: now + project.durationHours * 3600000,
      multiplier: project.benefitMultiplier,
    };

    const currentBuffs = (clan.activeWarBuffs || []).filter(b => b.expiresAt > now);

    const updatedClan: Clan = {
      ...clan,
      treasuryGold: clan.treasuryGold - project.costGold,
      treasurySteel: clan.treasurySteel - project.costSteel,
      activeWarBuffs: [...currentBuffs, newBuff],
    };

    return {
      success: true,
      updatedClan,
    };
  }

  /**
   * Conmuta el equipamiento del Protocolo de Salvaguarda Táctica antes de la partida.
   */
  public static toggleSafeguard(inventory: SafeguardInventory): SafeguardInventory {
    if (!inventory.isEquipped && inventory.stock <= 0) {
      return inventory;
    }
    return {
      ...inventory,
      isEquipped: !inventory.isEquipped,
    };
  }

  /**
   * Procesa el resultado de la partida considerando la Salvaguarda Táctica y actualiza la racha.
   */
  public static processMatchOutcome(
    inventory: SafeguardInventory,
    isVictory: boolean
  ): {
    updatedInventory: SafeguardInventory;
    wasSafeguardConsumed: boolean;
    streakDelta: number;
    multiplier: number;
    feedbackMessage: string;
  } {
    if (isVictory) {
      const nextStreak = inventory.currentStreak + 1;
      const multiplier = this.calculateStreakMultiplier(nextStreak);
      return {
        updatedInventory: {
          ...inventory,
          currentStreak: nextStreak,
        },
        wasSafeguardConsumed: false,
        streakDelta: +1,
        multiplier,
        feedbackMessage: `¡Victoria heroica! Racha aumentada a ${nextStreak} (Multiplicador ${multiplier}x). La Salvaguarda Táctica se conserva intacta.`,
      };
    } else {
      if (inventory.isEquipped && inventory.stock > 0) {
        const currentStreak = inventory.currentStreak;
        const multiplier = this.calculateStreakMultiplier(currentStreak);
        return {
          updatedInventory: {
            ...inventory,
            isEquipped: false,
            stock: inventory.stock - 1,
            currentStreak,
          },
          wasSafeguardConsumed: true,
          streakDelta: 0,
          multiplier,
          feedbackMessage: `¡Derrota militar! El Protocolo de Salvaguarda Táctica se sacrificó heroicamente: tu racha de ${currentStreak} victorias se mantiene blindada.`,
        };
      } else {
        return {
          updatedInventory: {
            ...inventory,
            isEquipped: false,
            currentStreak: 0,
          },
          wasSafeguardConsumed: false,
          streakDelta: -inventory.currentStreak,
          multiplier: 1.0,
          feedbackMessage: `Derrota en combate. Racha reiniciada a 0. Activa una Salvaguarda Táctica para proteger tus rachas.`,
        };
      }
    }
  }
}

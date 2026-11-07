/**
 * ==============================================================================
 * SUITE DE PRUEBAS UNITARIAS: CORPORACIONES MILITARES, BÓVEDA, IDENTIDAD Y GUERRA
 * ==============================================================================
 * Cobertura de especificaciones:
 * - docs/PROPUESTA_REINGENIERIA_SOCIAL_Y_CLANES.md
 * - docs/03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md §4 & docs/02 §5
 * - docs/04_MASTER_DATABASE_AND_SECURITY_SPEC.md §3.3
 */

import {
  ClanEngine,
  Clan,
  ClanMember,
  SafeguardInventory,
  CLAN_VAULT_TIERS,
  CANONICAL_TERRITORY_SECTORS,
  ClanCardRequest,
  TerritorySector
} from '@domains/world';

export interface ClanTestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

export function runClanTests(): {
  total: number;
  passed: number;
  failed: number;
  results: ClanTestResult[];
} {
  const results: ClanTestResult[] = [];

  const record = (name: string, fn: () => void) => {
    try {
      fn();
      results.push({ name, passed: true, message: 'Validación superada con éxito' });
    } catch (e: any) {
      results.push({ name, passed: false, message: e.message || String(e) });
    }
  };

  // 1. Escalafón de Bóveda Escalonada (Tier 1 a Tier 3)
  record('Bóveda Escalonada: Tier 1 (1-3 activos), Tier 2 (4-7 activos), Tier 3 (8+ activos)', () => {
    if (ClanEngine.calculateVaultTier(0) !== 'tier_1') throw new Error('0 activos debe dar tier_1');
    if (ClanEngine.calculateVaultTier(1) !== 'tier_1') throw new Error('1 activo debe dar tier_1');
    if (ClanEngine.calculateVaultTier(3) !== 'tier_1') throw new Error('3 activos debe dar tier_1');
    if (ClanEngine.calculateVaultTier(4) !== 'tier_2') throw new Error('4 activos debe dar tier_2');
    if (ClanEngine.calculateVaultTier(7) !== 'tier_2') throw new Error('7 activos debe dar tier_2');
    if (ClanEngine.calculateVaultTier(8) !== 'tier_3') throw new Error('8 activos debe dar tier_3');
    if (ClanEngine.calculateVaultTier(30) !== 'tier_3') throw new Error('30 activos debe dar tier_3');

    const t3 = CLAN_VAULT_TIERS['tier_3'];
    if (t3.creditsGold !== 2500 || t3.refinedSteel !== 25 || t3.gems !== 20 || t3.epicCards !== 3) {
      throw new Error(`Recompensas T3 no coinciden con la especificación: ${JSON.stringify(t3)}`);
    }
  });

  // 2. Multiplicadores de Racha Proactiva (1.0x hasta 2.0x Doble Botín)
  record('Multiplicador de Racha: Escala progresiva de 1.0x a 2.0x', () => {
    if (ClanEngine.calculateStreakMultiplier(0) !== 1.0) throw new Error('0 victorias debe ser 1.0x');
    if (ClanEngine.calculateStreakMultiplier(1) !== 1.0) throw new Error('1 victoria debe ser 1.0x');
    if (ClanEngine.calculateStreakMultiplier(2) !== 1.0) throw new Error('2 victorias debe ser 1.0x');
    if (ClanEngine.calculateStreakMultiplier(3) !== 1.25) throw new Error('3 victorias debe ser 1.25x');
    if (ClanEngine.calculateStreakMultiplier(4) !== 1.50) throw new Error('4 victorias debe ser 1.50x');
    if (ClanEngine.calculateStreakMultiplier(5) !== 1.75) throw new Error('5 victorias debe ser 1.75x');
    if (ClanEngine.calculateStreakMultiplier(6) !== 2.0) throw new Error('6 victorias debe ser 2.0x');
    if (ClanEngine.calculateStreakMultiplier(10) !== 2.0) throw new Error('10 victorias debe tener cap en 2.0x');
  });

  // 3. Auditoría Diaria de Guerra Anti-Parásitos y Licencia Táctica
  record('Auditoría Diaria: Embargo automático para 0 batallas con protección de Licencia Táctica', () => {
    const mockMembers: ClanMember[] = [
      {
        userId: 'm_chief',
        userName: 'Comandante en Jefe',
        role: 'commander_in_chief',
        contributionPoints: 1000,
        warBattlesCount: 0,
        isEmbargoed: false,
        embargoFeeGold: 0,
        embargoFeeSteel: 0,
        isImmuneNewRecruit: false,
        joinedAt: Date.now() - 30 * 86400000,
      },
      {
        userId: 'm_recruit',
        userName: 'Recluta Reciente',
        role: 'cadet',
        contributionPoints: 100,
        warBattlesCount: 0,
        isEmbargoed: false,
        embargoFeeGold: 0,
        embargoFeeSteel: 0,
        isImmuneNewRecruit: true,
        joinedAt: Date.now() - 1 * 86400000,
      },
      {
        userId: 'm_furlough',
        userName: 'Soldado con Licencia',
        role: 'cadet',
        contributionPoints: 400,
        warBattlesCount: 0,
        isEmbargoed: false,
        embargoFeeGold: 0,
        embargoFeeSteel: 0,
        isImmuneNewRecruit: false,
        joinedAt: Date.now() - 20 * 86400000,
        isFurloughActive: true,
      },
      {
        userId: 'm_parasite',
        userName: 'Soldado Ausente',
        role: 'cadet',
        contributionPoints: 200,
        warBattlesCount: 0,
        isEmbargoed: false,
        embargoFeeGold: 0,
        embargoFeeSteel: 0,
        isImmuneNewRecruit: false,
        joinedAt: Date.now() - 15 * 86400000,
        isFurloughActive: false,
      },
    ];

    const audit = ClanEngine.auditDailyWarClosure(mockMembers);
    if (audit.embargoedCount !== 1) {
      throw new Error(`Esperado 1 embargado (parásito), obtenido: ${audit.embargoedCount}`);
    }

    const chief = audit.updatedMembers.find(m => m.userId === 'm_chief')!;
    if (chief.isEmbargoed) throw new Error('El Comandante en Jefe no debe ser embargado');

    const recruit = audit.updatedMembers.find(m => m.userId === 'm_recruit')!;
    if (recruit.isEmbargoed) throw new Error('El recluta inmune no debe ser embargado');

    const furlough = audit.updatedMembers.find(m => m.userId === 'm_furlough')!;
    if (furlough.isEmbargoed) throw new Error('El soldado con licencia táctica activa no debe ser embargado');

    const parasite = audit.updatedMembers.find(m => m.userId === 'm_parasite')!;
    if (!parasite.isEmbargoed || parasite.embargoFeeGold !== 1500 || parasite.embargoFeeSteel !== 30) {
      throw new Error(`El soldado ausente debe estar embargado con fianza 1500G/30A`);
    }
  });

  // 4. Pago de Fianza de Deshonor y Reparto Aristocrático (50% Tesoro / 50% Top 3: 50/30/20)
  record('Fianza de Deshonor: 50% al tesoro y 50% dividendos Top 3 (50%, 30%, 20%)', () => {
    const clan: Clan = {
      id: 'clan_01',
      name: 'Fuerza Titán',
      tag: '[TITAN]',
      emblemIcon: '🛡️',
      tier: 'tier_2',
      treasuryGold: 10000,
      treasurySteel: 100,
      warScore: 5000,
      activeMembersCount: 5,
      maxMembers: 30,
    };

    const infractor: ClanMember = {
      userId: 'user_parasite',
      userName: 'Desertor Rehabilitado',
      role: 'cadet',
      contributionPoints: 100,
      warBattlesCount: 0,
      isEmbargoed: true,
      embargoFeeGold: 1500,
      embargoFeeSteel: 30,
      isImmuneNewRecruit: false,
      joinedAt: 0,
    };

    const allMembers: ClanMember[] = [
      { ...infractor },
      { userId: 'u_top1', userName: 'Héroe 1', role: 'officer', contributionPoints: 5000, warBattlesCount: 6, isEmbargoed: false, embargoFeeGold: 0, embargoFeeSteel: 0, isImmuneNewRecruit: false, joinedAt: 0 },
      { userId: 'u_top2', userName: 'Héroe 2', role: 'officer', contributionPoints: 3000, warBattlesCount: 4, isEmbargoed: false, embargoFeeGold: 0, embargoFeeSteel: 0, isImmuneNewRecruit: false, joinedAt: 0 },
      { userId: 'u_top3', userName: 'Héroe 3', role: 'cadet', contributionPoints: 2000, warBattlesCount: 3, isEmbargoed: false, embargoFeeGold: 0, embargoFeeSteel: 0, isImmuneNewRecruit: false, joinedAt: 0 },
    ];

    const result = ClanEngine.payDishonorEmbargo(clan, infractor, allMembers, 2000, 50);
    if (!result.success) throw new Error(`Fallo en el pago: ${result.errorMessage}`);

    if (result.updatedUserGold !== 500 || result.updatedUserSteel !== 20) {
      throw new Error(`Saldos incorrectos: Gold ${result.updatedUserGold}, Steel ${result.updatedUserSteel}`);
    }
    if (result.updatedClan?.treasuryGold !== 10750 || result.updatedClan?.treasurySteel !== 115) {
      throw new Error(`Tesoro no recibió el 50%`);
    }
  });

  // 5. Protocolo de Rescate de Camarada (Comrade Rescue)
  record('Rescate de Camarada: Aliado solvente rescata al infractor (+150 XP y cooldown de 14 días)', () => {
    const clan: Clan = {
      id: 'clan_01',
      name: 'Fuerza Titán',
      tag: '[TITAN]',
      emblemIcon: '🛡️',
      tier: 'tier_2',
      treasuryGold: 10000,
      treasurySteel: 100,
      warScore: 5000,
      activeMembersCount: 5,
      maxMembers: 30,
    };

    const savior: ClanMember = {
      userId: 'user_savior',
      userName: 'Capitán Protector',
      role: 'officer',
      contributionPoints: 4000,
      warBattlesCount: 5,
      isEmbargoed: false,
      embargoFeeGold: 0,
      embargoFeeSteel: 0,
      isImmuneNewRecruit: false,
      joinedAt: Date.now() - 30 * 86400000,
    };

    const embargoed: ClanMember = {
      userId: 'user_inneed',
      userName: 'Soldado Embargado',
      role: 'cadet',
      contributionPoints: 150,
      warBattlesCount: 0,
      isEmbargoed: true,
      embargoFeeGold: 1500,
      embargoFeeSteel: 30,
      isImmuneNewRecruit: false,
      joinedAt: Date.now() - 10 * 86400000,
    };

    const allMembers = [savior, embargoed];

    // Intento de rescate exitoso
    const rescue = ClanEngine.rescueComrade(clan, savior, embargoed, allMembers, 3000, 50);
    if (!rescue.success) throw new Error(`Rescate debió ser exitoso: ${rescue.errorMessage}`);

    if (rescue.updatedSaviorGold !== 1500 || rescue.updatedSaviorSteel !== 20) {
      throw new Error('Saldos del salvador no dedujeron la fianza');
    }
    if (rescue.saviorXpEarned !== 150) {
      throw new Error(`Salvador debió ganar 150 XP, obtuvo: ${rescue.saviorXpEarned}`);
    }
    if (rescue.updatedEmbargoedMember?.isEmbargoed !== false) {
      throw new Error('El miembro embargado debió quedar liberado');
    }

    // Intento de rescate repetido antes de 14 días debe ser rechazado
    const repeatRescue = ClanEngine.rescueComrade(clan, savior, rescue.updatedEmbargoedMember!, allMembers, 3000, 50);
    if (repeatRescue.success) {
      throw new Error('Rescate consecutivo debió fallar por cooldown de 14 días');
    }
  });

  // 6. Solicitud y Donación de Cartas Fraternal
  record('Logística Fraternal: Solicitud de cartas según rareza y recompensas al donante', () => {
    const member: ClanMember = {
      userId: 'u_requester',
      userName: 'Tanque_01',
      role: 'cadet',
      contributionPoints: 500,
      warBattlesCount: 2,
      isEmbargoed: false,
      embargoFeeGold: 0,
      embargoFeeSteel: 0,
      isImmuneNewRecruit: false,
      joinedAt: Date.now() - 10 * 86400000, // 10 días de antigüedad (> 7)
    };

    // Solicitud común (8 cartas)
    const reqCommon = ClanEngine.requestCardDonation('clan_01', member, 8, 'c_infantry', 'Infantería Pesada', 'common', null);
    if (!reqCommon.success || reqCommon.newRequest?.amountRequested !== 8) {
      throw new Error(`Solicitud común inválida: ${reqCommon.errorMessage}`);
    }

    // Solicitud épica un día que no es domingo debe fallar
    const reqEpicFail = ClanEngine.requestCardDonation('clan_01', member, 8, 'c_bomber', 'Bombardero B-2', 'epic', null, Date.now(), false);
    if (reqEpicFail.success) {
      throw new Error('Solicitud épica fuera de domingo debió fallar');
    }

    // Donación de cartas: 2 comunes
    const donor: ClanMember = {
      userId: 'u_donor',
      userName: 'Donante Generoso',
      role: 'officer',
      contributionPoints: 1200,
      warBattlesCount: 3,
      isEmbargoed: false,
      embargoFeeGold: 0,
      embargoFeeSteel: 0,
      isImmuneNewRecruit: false,
      joinedAt: Date.now() - 15 * 86400000,
    };

    const donateRes = ClanEngine.donateCards(reqCommon.newRequest!, donor, 2);
    if (!donateRes.success) throw new Error(`Donación falló: ${donateRes.errorMessage}`);
    if (donateRes.goldReward !== 50 || donateRes.xpReward !== 10) {
      throw new Error(`Recompensas esperadas: 50G y 10 XP. Obtenido: ${donateRes.goldReward}G / ${donateRes.xpReward} XP`);
    }
    if (donateRes.updatedRequest?.amountDonated !== 2) {
      throw new Error('Progreso de la solicitud incorrecto');
    }
  });

  // 7. Guerra Territorial: Puntos de Despliegue y Multiplicador 2v2 Cooperativo
  record('Guerra Territorial: Victoria en Pareja de Clan 2v2 aporta 200 DP (multiplicador 2.0x)', () => {
    const baseSector = { ...CANONICAL_TERRITORY_SECTORS[0] };

    // Victoria 1v1 solitaria
    const soloRes = ClanEngine.contributeTerritoryPoints(baseSector, 'clan_01', true, false, false);
    if (soloRes.dpContributed !== 100) {
      throw new Error(`Victoria 1v1 debió otorgar 100 DP, otorgó: ${soloRes.dpContributed}`);
    }

    // Victoria 2v2 en Pareja de Clan (Cross-Chess)
    const coopRes = ClanEngine.contributeTerritoryPoints(baseSector, 'clan_01', true, true, false);
    if (coopRes.dpContributed !== 200) {
      throw new Error(`Victoria 2v2 debió otorgar 200 DP (2.0x), otorgó: ${coopRes.dpContributed}`);
    }

    // Victoria 2v2 en Sector Prioritario (+25%)
    const priorityRes = ClanEngine.contributeTerritoryPoints(baseSector, 'clan_01', true, true, true);
    if (priorityRes.dpContributed !== 250) {
      throw new Error(`Victoria en sector prioritario debió ser 250 DP, otorgó: ${priorityRes.dpContributed}`);
    }
  });

  // 8. Proyectos del Alto Mando: Activación de Sumideros de Tesorería
  record('Proyectos del Alto Mando: Activación de Sobrealimentación Industrial consume fondos y activa buff', () => {
    const clan: Clan = {
      id: 'clan_01',
      name: 'Fuerza Titán',
      tag: '[TITAN]',
      emblemIcon: '🛡️',
      tier: 'tier_3',
      treasuryGold: 20000,
      treasurySteel: 500,
      warScore: 8000,
      activeMembersCount: 10,
      maxMembers: 30,
    };

    const activate = ClanEngine.activateClanProject(clan, 'commander_in_chief', 'industrial_overcharge');
    if (!activate.success) throw new Error(`Activación falló: ${activate.errorMessage}`);

    if (activate.updatedClan?.treasuryGold !== 5000 || activate.updatedClan?.treasurySteel !== 250) {
      throw new Error(`Deducción de fondos errónea: ${activate.updatedClan?.treasuryGold}G / ${activate.updatedClan?.treasurySteel} Steel`);
    }
    if (!activate.updatedClan?.activeWarBuffs || activate.updatedClan.activeWarBuffs.length !== 1) {
      throw new Error('Buff de clan no fue incorporado en activeWarBuffs');
    }

    // Comprobar jerarquía de 4 rangos: XO puede autorizar, pero un cadete es rechazado
    const activateXO = ClanEngine.activateClanProject(clan, 'executive_officer', 'industrial_overcharge');
    if (!activateXO.success) throw new Error('Mayor/XO debió poder autorizar el proyecto');

    const activateCadet = ClanEngine.activateClanProject(clan, 'cadet', 'industrial_overcharge');
    if (activateCadet.success) throw new Error('Un cadete no debe poder autorizar proyectos');
  });

  // 9. Salvaguarda Táctica: Conmutador de Equipamiento
  record('Salvaguarda Táctica: Equipar y Desequipar según inventario', () => {
    const emptyInv: SafeguardInventory = {
      isEquipped: false,
      stock: 0,
      currentStreak: 2,
      isCrafting: false,
    };

    const attempt = ClanEngine.toggleSafeguard(emptyInv);
    if (attempt.isEquipped) throw new Error('No debe permitir equipar con stock 0');

    const stockedInv: SafeguardInventory = { ...emptyInv, stock: 2 };
    const equipped = ClanEngine.toggleSafeguard(stockedInv);
    if (!equipped.isEquipped) throw new Error('Debe quedar equipada');

    const unequipped = ClanEngine.toggleSafeguard(equipped);
    if (unequipped.isEquipped) throw new Error('Debe desequipar');
  });

  // 10. Salvaguarda Táctica: Procesamiento de Victoria y Derrota con Salvaguarda
  record('Salvaguarda Táctica: Victoria preserva seguro; Derrota lo consume pero blinda racha', () => {
    const inv: SafeguardInventory = {
      isEquipped: true,
      stock: 2,
      currentStreak: 4,
      isCrafting: false,
    };

    // Victoria
    const victory = ClanEngine.processMatchOutcome(inv, true);
    if (victory.updatedInventory.currentStreak !== 5 || victory.updatedInventory.stock !== 2) {
      throw new Error('Racha o stock incorrectos tras victoria');
    }

    // Derrota
    const defeat = ClanEngine.processMatchOutcome(inv, false);
    if (defeat.updatedInventory.currentStreak !== 4 || defeat.updatedInventory.stock !== 1) {
      throw new Error('Derrota con salvaguarda debió proteger la racha en 4 y dejar stock en 1');
    }
  });

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return { total, passed, failed, results };
}
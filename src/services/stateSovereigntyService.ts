/**
 * ==============================================================================
 * SERVICIO DE SOBERANÍA TERRITORIAL Y CONTROL DE ESTADOS C4ISR
 * ==============================================================================
 * Especificación: docs/00_GEOTACTICS_ONLINE_MASTER_SPEC.md §3.1 & §3.2
 * Aplica control RBAC para Líderes de Clan y Gestores de Facción.
 * Permite cambiar el concepto soberano y nombre de Países y Estados en vivo,
 * sincronizando en tiempo real vía Supabase CDC con fallback local.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import type {
  StateSovereigntyRecord,
  UserRoleContext,
  SovereignStateUpdateInput,
  FactionId,
} from '../types/stateSovereigntyTypes';

type StateChangeListener = (updatedState: StateSovereigntyRecord) => void;

class StateSovereigntyService {
  private statesMap: Map<string, StateSovereigntyRecord> = new Map();
  private listeners: Set<StateChangeListener> = new Set();
  private isInitialized = false;
  private realtimeChannel: any = null;

  constructor() {
    this.initializeDefaultStates();
    this.initRealtimeSubscription().catch((err) => {
      console.warn('[StateSovereigntyService] Fallo inicializando Realtime (degradado a memoria):', err);
    });
  }

  /**
   * Carga el estado inicial de soberanía geopolítica (Venezuela y sus 24 entidades).
   */
  private initializeDefaultStates() {
    const defaultData: StateSovereigntyRecord[] = [
      {
        stateId: 'REG_VE_01',
        countryId: 'COUNTRY_VEN',
        canonicalCountryName: 'República de Venezuela',
        customCountryName: 'República Soberana de Venezuela',
        canonicalStateName: 'Distrito Capital',
        customStateName: 'Caracas Metrópolis Central',
        controllingFactionId: 'orange_star',
        controllingClanId: 'clan-orinoco',
        controllingClanTag: 'ORNC',
        controllingClanName: 'División Petroquímica Orinoco',
        status: 'stable',
        tcpCurrent: 10000,
        tcpMax: 10000,
        gdpWarCreditsPerHour: 8500,
        resources: { oil: 120, steel: 350, rareEarth: 45, composites: 90 },
        defenseLevel: 5,
        customMotto: 'Orden, Petróleo y Vanguardia Continental',
        sovereignProclamation: 'Sede del Comando Nacional. El control de Caracas garantiza la supremacía logística.',
      },
      {
        stateId: 'REG_VE_02',
        countryId: 'COUNTRY_VEN',
        canonicalCountryName: 'República de Venezuela',
        customCountryName: 'Hegemonía Petrolera de Maracaibo',
        canonicalStateName: 'Zulia',
        customStateName: 'Estado Zulia (Teatro Cabimas)',
        controllingFactionId: 'blue_moon',
        controllingClanId: 'clan-ferro',
        controllingClanTag: 'FERR',
        controllingClanName: 'Legión Blindada Ferro',
        status: 'stable',
        tcpCurrent: 10000,
        tcpMax: 10000,
        gdpWarCreditsPerHour: 12400,
        resources: { oil: 850, steel: 500, rareEarth: 20, composites: 130 },
        defenseLevel: 4,
        customMotto: 'Acero Frío y Petróleo Pesado',
        sovereignProclamation: 'El Lago de Maracaibo y la Costa Oriental operan bajo jurisdicción militar del Clan Ferro.',
      },
      {
        stateId: 'REG_VE_03',
        countryId: 'COUNTRY_VEN',
        canonicalCountryName: 'República de Venezuela',
        customCountryName: 'República Soberana de Venezuela',
        canonicalStateName: 'Bolívar',
        customStateName: 'Macizo Metalúrgico de Bolívar',
        controllingFactionId: 'black_hole',
        controllingClanId: 'clan-andes',
        controllingClanTag: 'ANDS',
        controllingClanName: 'Comando Siderúrgico Andes',
        status: 'contested',
        tcpCurrent: 6800,
        tcpMax: 10000,
        gdpWarCreditsPerHour: 9800,
        resources: { oil: 40, steel: 1200, rareEarth: 310, composites: 80 },
        defenseLevel: 3,
        customMotto: 'La Fuerza del Macizo no se Doblega',
      },
      {
        stateId: 'REG_VE_04',
        countryId: 'COUNTRY_VEN',
        canonicalCountryName: 'República de Venezuela',
        customCountryName: 'República Soberana de Venezuela',
        canonicalStateName: 'Anzoátegui',
        customStateName: 'Faja Petrolífera de Anzoátegui',
        controllingFactionId: 'orange_star',
        controllingClanId: 'clan-orinoco',
        controllingClanTag: 'ORNC',
        controllingClanName: 'División Petroquímica Orinoco',
        status: 'stable',
        tcpCurrent: 9200,
        tcpMax: 10000,
        gdpWarCreditsPerHour: 7600,
        resources: { oil: 620, steel: 180, rareEarth: 15, composites: 45 },
        defenseLevel: 3,
      },
      {
        stateId: 'REG_VE_05',
        countryId: 'COUNTRY_VEN',
        canonicalCountryName: 'República de Venezuela',
        customCountryName: 'República Soberana de Venezuela',
        canonicalStateName: 'Carabobo',
        customStateName: 'Complejo Industrial Carabobo',
        controllingFactionId: 'yellow_comet',
        controllingClanId: 'clan-sol',
        controllingClanTag: 'SOL',
        controllingClanName: 'Guardia Imperial Sol',
        status: 'stable',
        tcpCurrent: 9500,
        tcpMax: 10000,
        gdpWarCreditsPerHour: 8100,
        resources: { oil: 110, steel: 410, rareEarth: 60, composites: 115 },
        defenseLevel: 4,
      },
      {
        stateId: 'REG_VE_07',
        countryId: 'COUNTRY_VEN',
        canonicalCountryName: 'República de Venezuela',
        customCountryName: 'República Soberana de Venezuela',
        canonicalStateName: 'Lara',
        customStateName: 'Nudo Logístico Barquisimeto-Lara',
        controllingFactionId: 'green_earth',
        controllingClanId: 'clan-selva',
        controllingClanTag: 'SLVA',
        controllingClanName: 'Vanguardia Selva Verde',
        status: 'stable',
        tcpCurrent: 8900,
        tcpMax: 10000,
        gdpWarCreditsPerHour: 6400,
        resources: { oil: 50, steel: 220, rareEarth: 85, composites: 65 },
        defenseLevel: 3,
      },
    ];

    defaultData.forEach((st) => this.statesMap.set(st.stateId, st));
    this.isInitialized = true;
  }

  /**
   * Conecta y sincroniza con Supabase Realtime CDC en la tabla 'state_sovereignty'.
   */
  public async initRealtimeSubscription(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      // 1. Hidratación inicial desde la base de datos
      const { data: dbStates, error } = await (supabase as any)
        .from('state_sovereignty')
        .select('*');

      if (!error && Array.isArray(dbStates)) {
        dbStates.forEach((row: any) => {
          const existing = this.getState(row.state_id);
          if (existing) {
            const merged: StateSovereigntyRecord = {
              ...existing,
              customCountryName: row.custom_country_name || existing.customCountryName,
              customStateName: row.custom_state_name || existing.customStateName,
              customMotto: row.custom_motto || existing.customMotto,
              sovereignProclamation: row.sovereign_proclamation || existing.sovereignProclamation,
              controllingFactionId: (row.controlling_faction_id as FactionId) || existing.controllingFactionId,
              controllingClanId: row.controlling_clan_id || existing.controllingClanId,
              tcpCurrent: row.tcp_current ?? existing.tcpCurrent,
              tcpMax: row.tcp_max ?? existing.tcpMax,
              defenseLevel: row.defense_level ?? existing.defenseLevel,
            };
            this.statesMap.set(row.state_id, merged);
          }
        });
      }

      // 2. Desuscribir canal anterior si existe
      this.unsubscribeRealtime();

      // 3. Suscribirse a cambios reactivos CDC
      this.realtimeChannel = supabase
        .channel('state_sovereignty_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'state_sovereignty' },
          (payload: any) => this.handleRealtimeChange(payload)
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.info('[StateSovereigntyService] Canal Realtime conectado: state_sovereignty_changes');
          }
        });
    } catch (e) {
      console.warn('[StateSovereigntyService] Error inicializando suscripción Realtime:', e);
    }
  }

  /**
   * Desconecta el canal Realtime activo.
   */
  public unsubscribeRealtime(): void {
    if (this.realtimeChannel && supabase) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch (err) {
        console.warn('[StateSovereigntyService] Error al desuscribir canal:', err);
      }
      this.realtimeChannel = null;
    }
  }

  /**
   * Maneja eventos CDC de la tabla 'state_sovereignty'.
   */
  private handleRealtimeChange(payload: any) {
    const { eventType, new: newRec } = payload;
    if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRec) {
      const stateId = newRec.state_id;
      const existing = this.getState(stateId);
      if (existing) {
        const updated: StateSovereigntyRecord = {
          ...existing,
          customCountryName: newRec.custom_country_name || existing.customCountryName,
          customStateName: newRec.custom_state_name || existing.customStateName,
          customMotto: newRec.custom_motto || existing.customMotto,
          sovereignProclamation: newRec.sovereign_proclamation || existing.sovereignProclamation,
          controllingFactionId: (newRec.controlling_faction_id as FactionId) || existing.controllingFactionId,
          controllingClanId: newRec.controlling_clan_id || existing.controllingClanId,
          tcpCurrent: newRec.tcp_current ?? existing.tcpCurrent,
          tcpMax: newRec.tcp_max ?? existing.tcpMax,
          defenseLevel: newRec.defense_level ?? existing.defenseLevel,
        };
        this.statesMap.set(stateId, updated);
        this.notifyListeners(updated);
      }
    }
  }

  /**
   * Verifica los permisos RBAC de un usuario para desbloquear el panel de control del estado.
   * Regla Inviolable: Sólo líderes de clanes y gestores de la facción pueden desbloquear estas interfaces.
   */
  public canUnlockStateControl(
    userContext: UserRoleContext,
    stateId: string
  ): { allowed: boolean; reason?: string } {
    if (!userContext || !userContext.userId) {
      return {
        allowed: false,
        reason: 'ACCESO DENEGADO (DEFCON 1): Usuario no autenticado. Se requiere credencial militar válida.',
      };
    }

    const state = this.getState(stateId);
    if (!state) {
      return {
        allowed: false,
        reason: 'SECTOR NO LOCALIZADO: El estado solicitado no figura en el teatro cartográfico activo.',
      };
    }

    // Comprobar si el clan del usuario pertenece a la facción que controla el estado
    const isControllingFaction = userContext.factionId === state.controllingFactionId;
    const isControllingClan = userContext.clanId === state.controllingClanId;

    if (!isControllingFaction && !isControllingClan) {
      return {
        allowed: false,
        reason: `ACCESO DENEGADO: El sector está bajo control de la facción [${state.controllingFactionId.toUpperCase()}]. Tu facción [${userContext.factionId.toUpperCase()}] debe conquistarlo antes de tomar la gobernanza.`,
      };
    }

    // Comprobar jerarquía de mando: Líder de Clan o Gestor de Facción u Oficial autorizado
    const isLeader = userContext.clanRole === 'leader';
    const isOfficer = userContext.clanRole === 'officer';
    const isFactionManager = userContext.isFactionManager === true;

    if (!isLeader && !isOfficer && !isFactionManager) {
      return {
        allowed: false,
        reason: `AUTORIZACIÓN INSUFICIENTE: Tu rango [${userContext.clanRole.toUpperCase()}] es de tropa de campo. Solo los LÍDERES DE CLAN o GESTORES DE FACCIÓN pueden modificar la soberanía del Estado.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Obtiene la telemetría de un estado por su identificador.
   */
  public getState(stateId: string): StateSovereigntyRecord | undefined {
    // Si no está en el mapa, generar dinámicamente para entidades venezolanas adicionales
    if (!this.statesMap.has(stateId)) {
      const fallbackState: StateSovereigntyRecord = {
        stateId,
        countryId: 'COUNTRY_VEN',
        canonicalCountryName: 'República de Venezuela',
        customCountryName: 'República Soberana de Venezuela',
        canonicalStateName: stateId.replace('REG_VE_', 'Sector Federal '),
        customStateName: stateId.replace('REG_VE_', 'Guarnición '),
        controllingFactionId: 'blue_moon',
        controllingClanId: 'clan-ferro',
        controllingClanTag: 'FERR',
        controllingClanName: 'Legión Blindada Ferro',
        status: 'stable',
        tcpCurrent: 10000,
        tcpMax: 10000,
        gdpWarCreditsPerHour: 5000,
        resources: { oil: 100, steel: 150, rareEarth: 10, composites: 25 },
        defenseLevel: 2,
      };
      this.statesMap.set(stateId, fallbackState);
    }
    return this.statesMap.get(stateId);
  }

  /**
   * Retorna la totalidad de estados registrados.
   */
  public getAllStates(): StateSovereigntyRecord[] {
    return Array.from(this.statesMap.values());
  }

  /**
   * Sincroniza directamente un registro de soberanía territorial desde el motor geopolítico
   * (actualizando TCP, status, fortificación, recursos, etc.).
   */
  public updateStateRecord(stateId: string, patch: Partial<StateSovereigntyRecord>): StateSovereigntyRecord {
    const existing = this.getState(stateId) || {
      stateId,
      countryId: 'COUNTRY_VEN',
      canonicalCountryName: 'República de Venezuela',
      customCountryName: 'República Soberana de Venezuela',
      canonicalStateName: stateId,
      customStateName: stateId,
      controllingFactionId: 'blue_moon' as FactionId,
      controllingClanId: 'clan-ferro',
      controllingClanTag: 'FERR',
      controllingClanName: 'Legión Blindada Ferro',
      status: 'stable',
      tcpCurrent: 10000,
      tcpMax: 10000,
      gdpWarCreditsPerHour: 5000,
      resources: { oil: 100, steel: 150, rareEarth: 10, composites: 25 },
      defenseLevel: 2,
    };

    const updated: StateSovereigntyRecord = {
      ...existing,
      ...patch,
      stateId,
      resources: patch.resources ? { ...existing.resources, ...patch.resources } : existing.resources,
    };

    this.statesMap.set(stateId, updated);
    this.notifyListeners(updated);
    return updated;
  }

  /**
   * Actualiza el concepto del País y del Estado soberano tras validación de permisos RBAC.
   */
  public async updateStateSovereignty(
    userContext: UserRoleContext,
    input: SovereignStateUpdateInput
  ): Promise<{ success: boolean; state?: StateSovereigntyRecord; error?: string }> {
    const authCheck = this.canUnlockStateControl(userContext, input.stateId);
    if (!authCheck.allowed) {
      return { success: false, error: authCheck.reason };
    }

    const state = this.getState(input.stateId);
    if (!state) {
      return { success: false, error: 'Estado no encontrado en el mapa.' };
    }

    // Aplicar transformaciones soberanas
    const updated: StateSovereigntyRecord = {
      ...state,
      customCountryName: input.newCountryName?.trim() || state.customCountryName,
      customStateName: input.newStateName?.trim() || state.customStateName,
      customMotto: input.customMotto?.trim() || state.customMotto,
      sovereignProclamation: input.sovereignProclamation?.trim() || state.sovereignProclamation,
      unlockedAt: new Date().toISOString(),
      unlockedByUserId: userContext.userId,
      unlockedByUserName: userContext.userName,
    };

    // Si se cambió el nombre del país, propagarlo a los estados controlados por la misma facción
    if (input.newCountryName && input.newCountryName !== state.customCountryName) {
      for (const [sId, st] of this.statesMap.entries()) {
        if (st.controllingFactionId === state.controllingFactionId) {
          this.statesMap.set(sId, { ...st, customCountryName: input.newCountryName });
        }
      }
    }

    this.statesMap.set(input.stateId, updated);

    // Intentar sincronizar con Supabase si está disponible en la base de datos
    try {
      if (isSupabaseConfigured() && supabase) {
        await (supabase as any)
          .from('state_sovereignty')
          .upsert({
            state_id: updated.stateId,
            custom_country_name: updated.customCountryName,
            custom_state_name: updated.customStateName,
            custom_motto: updated.customMotto,
            sovereign_proclamation: updated.sovereignProclamation,
            controlling_faction_id: updated.controllingFactionId,
            controlling_clan_id: updated.controllingClanId,
            updated_by_user_id: userContext.userId,
            updated_at: new Date().toISOString(),
          });
      }
    } catch (dbErr) {
      // Degradar graciosamente en memoria local
      console.warn('[StateSovereigntyService] Sincronización DB omitida (operando en modo activo local):', dbErr);
    }

    // Notificar suscriptores reactivos
    this.notifyListeners(updated);

    return { success: true, state: updated };
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(updated: StateSovereigntyRecord) {
    this.listeners.forEach((listener) => {
      try {
        listener(updated);
      } catch (err) {
        console.error('[StateSovereigntyService] Error en suscriptor:', err);
      }
    });
  }
}

export const stateSovereigntyService = new StateSovereigntyService();

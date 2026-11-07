/**
 * ==============================================================================
 * TIPOS CANÓNICOS DE SOBERANÍA ESTATAL Y RBAC C4ISR
 * ==============================================================================
 * Especificación: docs/PROPUESTA_INGENIERIA_MAPA_METAPOLITICA_ALICE_CABIMAS.md
 * Rige la propiedad, el renombre de países/estados y la gobernanza territorial.
 * ==============================================================================
 */

export type FactionId =
  | 'orange_star'
  | 'blue_moon'
  | 'green_earth'
  | 'yellow_comet'
  | 'black_hole';

export type ClanRole = 'leader' | 'officer' | 'veteran' | 'recruit' | 'guest';

export interface UserRoleContext {
  userId: string;
  userName: string;
  clanId: string;
  clanTag: string;
  clanRole: ClanRole;
  factionId: FactionId;
  isFactionManager: boolean;
}

export interface StateResourceYield {
  oil: number;        // Barriles por ciclo
  steel: number;      // Toneladas de acero
  rareEarth: number;  // Minerales raros
  composites: number; // Blindaje compuesto
}

export interface StateSovereigntyRecord {
  stateId: string;                // ej: 'REG_VE_01', 'REG_VE_02'
  countryId: string;              // ej: 'COUNTRY_VEN'
  canonicalCountryName: string;   // ej: 'República de Venezuela'
  customCountryName: string;      // Nombre decretado por la facción hegemónica
  canonicalStateName: string;     // ej: 'Zulia', 'Caracas'
  customStateName: string;        // Nombre renombrado del estado
  controllingFactionId: FactionId;
  controllingClanId: string;
  controllingClanTag: string;
  controllingClanName: string;
  status: 'stable' | 'under_siege' | 'contested' | 'liberated';
  tcpCurrent: number;             // Puntos de control territorial actuales
  tcpMax: number;                 // Puntos de control máximos (10,000)
  gdpWarCreditsPerHour: number;   // PIB de guerra ($G/hr)
  resources: StateResourceYield;
  defenseLevel: number;           // 1-5 (Nivel de fortificación)
  customMotto?: string;           // Lema soberano de la facción
  sovereignProclamation?: string; // Manifiesto oficial publicado por los líderes
  unlockedAt?: string;
  unlockedByUserId?: string;
  unlockedByUserName?: string;
}

export interface SovereignStateUpdateInput {
  stateId: string;
  newCountryName?: string;
  newStateName?: string;
  customMotto?: string;
  sovereignProclamation?: string;
}

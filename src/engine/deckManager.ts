import { CANONICAL_UNIT_PRODUCTION_CATALOG, ProductionCatalogEntry } from './turnEconomy';

export interface DeckCard {
  unitCode: string;
  displayName: string;
  category: 'infantry' | 'vehicle' | 'indirect' | 'aircraft' | 'naval';
  facility: 'factory' | 'airport' | 'port';
  cost: number;
  isMandatory?: boolean;
}

export interface DeckTaxonomyValidation {
  isValid: boolean;
  errors: string[];
  totalCards: number;
  directGroundCount: number;
  antiAirCount: number;
  superHeavyCount: number;
  archetype: 'Rush' | 'AirControl' | 'Siege' | 'Amphibious' | 'Balanced';
}

export interface SupplyStatus {
  unitCount: number;
  freeThreshold: number; // 14 tropas
  excessUnits: number;
  upkeepRatePerUnit: number; // $200G
  totalUpkeepG: number;
  isOverCapacity: boolean;
}

// ----------------------------------------------------------------------------
// ARQUETIPOS CANÓNICOS PREDETERMINADOS (10 CARTAS CADA UNO)
// ----------------------------------------------------------------------------
export const PREDEFINED_DECKS: Record<string, { id: string; name: string; cards: string[] }> = {
  balanced: {
    id: 'deck_balanced',
    name: 'Doctrina Combinada (Estándar)',
    cards: [
      'infantry',    // Obligatoria 1
      'mech',        // Obligatoria 2
      'recon',       // Directa Terrestre 1
      'tank_light',  // Directa Terrestre 2
      'tank_medium', // Directa Terrestre 3
      'artillery',   // Indirecta
      'anti_air',    // Antiaéreo 1
      'b_copter',    // Aire Ligero
      'fighter',     // Antiaéreo / Caza 2
      'rocket',      // Asedio
    ],
  },
  rush: {
    id: 'deck_rush',
    name: 'Blitzkrieg Ligero (Rush)',
    cards: [
      'infantry',
      'mech',
      'recon',
      'tank_light',
      'tank_medium',
      'anti_air',
      'b_copter',
      't_copter',
      'apc',
      'artillery',
    ],
  },
  air_control: {
    id: 'deck_air_control',
    name: 'Supremacía Aérea',
    cards: [
      'infantry',
      'mech',
      'recon',
      'tank_light',
      'anti_air',
      'b_copter',
      'fighter',
      'bomber',     // Super-pesada 1
      't_copter',
      'artillery',
    ],
  },
  siege: {
    id: 'deck_siege',
    name: 'Fortaleza y Asedio (Tortuga)',
    cards: [
      'infantry',
      'mech',
      'tank_light',
      'tank_medium',
      'neotank',    // Super-pesada 1
      'artillery',
      'rocket',
      'missile',    // Antiaéreo
      'anti_air',
      'recon',
    ],
  },
};

export class DeckManager {
  public static readonly FREE_SUPPLY_CAP = 14;
  public static readonly UPKEEP_PER_EXCESS_UNIT = 200; // $200G por tropa arriba de 14

  /**
   * Valida estrictamente un mazo de 10 cartas según la taxonomía reglamentaria:
   * 1. Exactamente 10 cartas únicas.
   * 2. Ranura 1 obligatoria: infantry.
   * 3. Ranura 2 obligatoria: mech.
   * 4. Mínimo 2 unidades terrestres directas (recon, tank_light, tank_medium).
   * 5. Mínimo 1 unidad antiaérea (anti_air, missile, fighter).
   * 6. Máximo 2 unidades super-pesadas (neotank, bomber, battleship).
   */
  public static validateDeck(cardCodes: string[]): DeckTaxonomyValidation {
    const errors: string[] = [];

    // 1. Longitud exacta
    if (cardCodes.length !== 10) {
      errors.push(`El mazo debe contener exactamente 10 cartas (actual: ${cardCodes.length}).`);
    }

    // 2. Unicidad
    const uniqueCodes = new Set(cardCodes);
    if (uniqueCodes.size !== cardCodes.length) {
      errors.push('El mazo no puede contener cartas duplicadas.');
    }

    // 3. Ranuras obligatorias 1 y 2
    if (cardCodes[0] !== 'infantry') {
      errors.push('La Ranura 1 debe ser Infantería Ligera obligatoria (infantry).');
    }
    if (cardCodes[1] !== 'mech') {
      errors.push('La Ranura 2 debe ser Infantería Pesada obligatoria (mech).');
    }

    // Clasificación taxonómica
    let directGroundCount = 0;
    let antiAirCount = 0;
    let superHeavyCount = 0;

    for (const code of cardCodes) {
      if (['recon', 'tank_light', 'tank_medium'].includes(code)) {
        directGroundCount++;
      }
      if (['anti_air', 'missile', 'fighter'].includes(code)) {
        antiAirCount++;
      }
      if (['neotank', 'bomber', 'battleship'].includes(code)) {
        superHeavyCount++;
      }
    }

    // 4. Mínimo 2 directas terrestres
    if (directGroundCount < 2) {
      errors.push(`Requiere al menos 2 unidades terrestres directas (actual: ${directGroundCount}).`);
    }

    // 5. Mínimo 1 antiaéreo
    if (antiAirCount < 1) {
      errors.push(`Requiere al menos 1 unidad antiaérea (actual: ${antiAirCount}).`);
    }

    // 6. Máximo 2 super-pesadas
    if (superHeavyCount > 2) {
      errors.push(`No puede superar 2 unidades super-pesadas (actual: ${superHeavyCount}).`);
    }

    // Detección heurística de arquetipo
    let archetype: 'Rush' | 'AirControl' | 'Siege' | 'Amphibious' | 'Balanced' = 'Balanced';
    const airCount = cardCodes.filter(c => ['b_copter', 't_copter', 'fighter', 'bomber'].includes(c)).length;
    const indirectCount = cardCodes.filter(c => ['artillery', 'rocket', 'missile'].includes(c)).length;
    const navalCount = cardCodes.filter(c => ['lander', 'cruiser', 'sub', 'battleship'].includes(c)).length;

    if (airCount >= 3) archetype = 'AirControl';
    else if (indirectCount >= 3) archetype = 'Siege';
    else if (navalCount >= 2) archetype = 'Amphibious';
    else if (cardCodes.includes('recon') && cardCodes.includes('tank_light') && cardCodes.includes('b_copter')) archetype = 'Rush';

    return {
      isValid: errors.length === 0,
      errors,
      totalCards: cardCodes.length,
      directGroundCount,
      antiAirCount,
      superHeavyCount,
      archetype,
    };
  }

  /**
   * Calcula el estado de sostenimiento logístico (Soft Cap) de un ejército.
   * CERO bloqueos: el jugador puede fabricar tantas tropas como desee, pero si supera
   * las 14 unidades, se aplica un costo de suministro orgánico.
   */
  public static calculateSupplyStatus(currentUnitCount: number): SupplyStatus {
    const freeThreshold = this.FREE_SUPPLY_CAP;
    const excessUnits = Math.max(0, currentUnitCount - freeThreshold);
    const totalUpkeepG = excessUnits * this.UPKEEP_PER_EXCESS_UNIT;

    return {
      unitCount: currentUnitCount,
      freeThreshold,
      excessUnits,
      upkeepRatePerUnit: this.UPKEEP_PER_EXCESS_UNIT,
      totalUpkeepG,
      isOverCapacity: excessUnits > 0,
    };
  }

  /**
   * Filtra las unidades desplegables en una fábrica dada restringiendo ÚNICAMENTE
   * a las 10 cartas del mazo activo del jugador y compatibles con la instalación.
   * ¡SIN COOLDOWNS ARTIFICIALES! Libertad total si el jugador tiene los fondos ($G).
   */
  public static getDeployableUnitsForFacility(
    activeDeckCodes: string[],
    facilityType: 'factory' | 'airport' | 'port'
  ): DeckCard[] {
    const deployable: DeckCard[] = [];

    for (const code of activeDeckCodes) {
      const catalogEntry = CANONICAL_UNIT_PRODUCTION_CATALOG[code];
      if (catalogEntry && catalogEntry.facility === facilityType) {
        deployable.push({
          unitCode: code,
          displayName: catalogEntry.name,
          category: catalogEntry.category as any,
          facility: catalogEntry.facility,
          cost: catalogEntry.cost,
          isMandatory: code === 'infantry' || code === 'mech',
        });
      }
    }

    return deployable;
  }
}

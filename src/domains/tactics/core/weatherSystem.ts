import { MovementType, TerrainType } from '../types';
import { WeatherType } from './canonicalMovement';

export interface WeatherState {
  current: WeatherType;
  turnRemaining: number;
  intensity: number; // 1 to 5
}

export interface WeatherModifiers {
  visionModifier: number;
  movementCostModifier: number;
  indirectDamageModifier: number;
  fuelConsumptionMultiplier: number;
}

/**
 * Calculates standard gameplay modifiers applied by current weather conditions.
 */
export function getWeatherModifiers(weather: WeatherType, coId?: string): WeatherModifiers {
  const normCO = (coId || '').toLowerCase();

  // Olaf is immune to snow, Drake thrives in rain
  if (normCO === 'olaf' && weather === 'snow') {
    return {
      visionModifier: 0,
      movementCostModifier: 0,
      indirectDamageModifier: 1.0,
      fuelConsumptionMultiplier: 1.0,
    };
  }

  if (normCO === 'drake' && weather === 'rain') {
    return {
      visionModifier: 0,
      movementCostModifier: 0,
      indirectDamageModifier: 1.0,
      fuelConsumptionMultiplier: 1.0,
    };
  }

  switch (weather) {
    case 'rain':
      return {
        visionModifier: -1,
        movementCostModifier: 0,
        indirectDamageModifier: 1.0,
        fuelConsumptionMultiplier: 1.0,
      };

    case 'snow':
      return {
        visionModifier: 0,
        movementCostModifier: 1, // Terrain costs +1 for vehicular movement
        indirectDamageModifier: 1.0,
        fuelConsumptionMultiplier: 2.0, // Double fuel burn
      };

    case 'sandstorm':
      return {
        visionModifier: -1,
        movementCostModifier: 0,
        indirectDamageModifier: 0.7, // -30% indirect fire firepower
        fuelConsumptionMultiplier: 1.0,
      };

    case 'clear':
    default:
      return {
        visionModifier: 0,
        movementCostModifier: 0,
        indirectDamageModifier: 1.0,
        fuelConsumptionMultiplier: 1.0,
      };
  }
}

/**
 * Evaluates effective weather for a specific player's CO (canonical WarsWorld rule).
 * E.g., Olaf treats Snow as Clear, and treats Rain as Snow.
 * Drake treats Rain as Clear.
 */
export function getEffectiveWeatherForCO(weather: WeatherType, coId: string): WeatherType {
  const co = coId.toLowerCase();
  if (co === 'olaf') {
    if (weather === 'snow') return 'clear';
    if (weather === 'rain') return 'snow';
  }
  if (co === 'drake') {
    if (weather === 'rain') return 'clear';
  }
  return weather;
}

/**
 * Rolls random weather for a new match turn following canonical Advance Wars probability tables.
 */
export function rollTurnWeather(
  playerCount: number = 2,
  drakePresentCount: number = 0,
  enableSandstorms: boolean = true,
  forcedRoll?: number // For deterministic testing
): WeatherType {
  const baseChance = playerCount === 2 ? 4 : playerCount === 3 ? 3 : 2;
  const snowThreshold = baseChance;
  const rainThreshold = snowThreshold + (baseChance + drakePresentCount * 7);
  const sandstormThreshold = rainThreshold + (enableSandstorms ? baseChance : 0);

  const roll = forcedRoll !== undefined ? forcedRoll : Math.random() * 100;

  if (roll < snowThreshold) return 'snow';
  if (roll < rainThreshold) return 'rain';
  if (roll < sandstormThreshold) return 'sandstorm';
  return 'clear';
}

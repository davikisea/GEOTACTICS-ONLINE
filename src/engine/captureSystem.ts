/**
 * SISTEMA CANÓNICO DE CAPTURA DE SEDES Y PROPIEDADES
 * Especificación Advance Wars / WarsWorld / AWBW
 * 
 * Reglas:
 * 1. Toda propiedad neutral o enemiga posee 20 puntos de resistencia de captura.
 * 2. Solo las unidades a pie (Infantería y Mecanizados) pueden capturar sedes.
 * 3. En cada turno de captura, la resistencia se reduce en una cantidad equivalente a la salud (HP) actual de la unidad.
 * 4. Al llegar a 0 puntos, la sede se transfiere al comandante captor y los puntos se restablecen a 20.
 * 5. La captura del Cuartel General (HQ) enemigo otorga la victoria inmediata de la partida.
 */

import { TacticalUnit, TerrainTile, TerrainType } from '../types';

export const CAPTURABLE_PROPERTY_TYPES: TerrainType[] = [
  'city',
  'factory',
  'airport',
  'port',
  'hq',
  'commtower',
  'lab',
];

export interface CaptureExecutionResult {
  success: boolean;
  captured: boolean;
  isHqCaptured: boolean;
  damageInflictedToProperty: number;
  remainingCapturePoints: number;
  newOwnerId: string | null;
  message: string;
}

export class CaptureEngine {
  /**
   * Verifica si una unidad está capacitada para iniciar o continuar la captura de una loseta.
   */
  public static canCapture(unit: TacticalUnit, tile: TerrainTile): boolean {
    if (unit.hp <= 0) return false;

    // Solo tropas a pie
    const isFootSoldier = unit.unitCode === 'infantry' || unit.unitCode === 'mech';
    if (!isFootSoldier) return false;

    // Solo propiedades capturables
    if (!CAPTURABLE_PROPERTY_TYPES.includes(tile.type)) return false;

    // No se puede capturar una propiedad que ya es aliada
    if (tile.ownerId === unit.ownerId) return false;

    return true;
  }

  /**
   * Ejecuta un paso de captura de la propiedad por parte de la unidad.
   */
  public static executeCaptureStep(
    unit: TacticalUnit,
    tile: TerrainTile
  ): CaptureExecutionResult {
    if (!this.canCapture(unit, tile)) {
      return {
        success: false,
        captured: false,
        isHqCaptured: false,
        damageInflictedToProperty: 0,
        remainingCapturePoints: tile.captureHp ?? 20,
        newOwnerId: tile.ownerId || null,
        message: 'La unidad no puede capturar esta loseta.',
      };
    }

    const currentPoints = tile.captureHp ?? 20;
    const damage = Math.min(currentPoints, unit.hp);
    const remaining = currentPoints - damage;

    if (remaining <= 0) {
      // Captura completada con éxito
      const isHq = tile.type === 'hq';
      return {
        success: true,
        captured: true,
        isHqCaptured: isHq,
        damageInflictedToProperty: damage,
        remainingCapturePoints: 20, // Se resetea para futuras capturas
        newOwnerId: unit.ownerId,
        message: isHq
          ? `¡CUARTEL GENERAL CAPTURADO! El ejército ${unit.ownerId.toUpperCase()} se alza con la victoria.`
          : `¡${tile.type.toUpperCase()} capturada con éxito por ${unit.displayName}!`,
      };
    }

    // Captura en progreso
    return {
      success: true,
      captured: false,
      isHqCaptured: false,
      damageInflictedToProperty: damage,
      remainingCapturePoints: remaining,
      newOwnerId: tile.ownerId || null,
      message: `Captura en progreso: ${remaining}/20 puntos restantes.`,
    };
  }
}

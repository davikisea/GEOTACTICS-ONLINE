/**
 * Tactical Command: Wars of Legacy - Motor de Retroalimentación Háptica
 * Especificación: docs/orchestration/01_UI_AND_MOBILE_ERGONOMICS.md
 * Integración nativa con Web Vibration API
 */

export type HapticPattern =
  | 'selection'    // Selección ligera de celda o unidad
  | 'movement'     // Marcha confirmada hacia coordenadas
  | 'attack'       // Impacto balístico / inicio de combate
  | 'trap'         // Emboscada detectada en niebla de guerra
  | 'co_power'     // Activación de Superpoder CO / COP / SCOP
  | 'error';       // Orden inválida, terreno bloqueado o sin combustible

const HAPTIC_PROFILES: Record<HapticPattern, number | number[]> = {
  selection: 10,
  movement: 25,
  attack: [40, 30, 60],
  trap: [80, 50, 120, 50, 200],
  co_power: [100, 40, 100, 40, 250],
  error: [30, 20, 30],
};

/**
 * Dispara una secuencia de pulsaciones hápticas en dispositivos compatibles.
 * Maneja silenciosamente permisos no otorgados o entornos no táctiles (desktop).
 */
export const triggerHaptic = (pattern: HapticPattern): void => {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(HAPTIC_PROFILES[pattern]);
    } catch {
      // Ignorar de forma segura si la política de permisos del navegador lo restringe
    }
  }
};

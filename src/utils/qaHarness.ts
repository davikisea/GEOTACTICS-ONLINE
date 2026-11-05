/**
 * QA TEST HARNESS & TELEMETRY BRIDGE
 * Expone un objeto seguro en modo desarrollo para que Playwright y agentes E2E
 * puedan inspeccionar el estado del juego, capturar errores de JavaScript y disparar acciones.
 */

export interface QAGameSnapshot {
  isReady: boolean;
  activeScreen: string;
  turnNumber: number;
  activePlayer: string;
  phase: string;
  unitsCount: number;
  lastError: string | null;
  fps: number;
  canvasRendered: boolean;
  extra?: Record<string, unknown>;
}

declare global {
  interface Window {
    __TACTICAL_QA_BRIDGE__?: {
      getSnapshot: () => QAGameSnapshot;
      updateSnapshot: (partial: Partial<QAGameSnapshot>) => void;
      getConsoleErrors: () => string[];
      clearErrors: () => void;
      ping: () => string;
      launchCombat?: () => void;
      setMainNav?: (nav: string) => void;
    };
  }
}

const capturedErrors: string[] = [];

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const errText = `[UNCAUGHT] ${event.message} at ${event.filename || 'unknown'}:${event.lineno || 0}`;
    capturedErrors.push(errText);
    console.warn('[QA Bridge Interceptor]', errText);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const errText = `[UNHANDLED_PROMISE] ${String(event.reason)}`;
    capturedErrors.push(errText);
    console.warn('[QA Bridge Interceptor]', errText);
  });
}

let currentSnapshot: QAGameSnapshot = {
  isReady: false,
  activeScreen: 'boot',
  turnNumber: 1,
  activePlayer: 'OS',
  phase: 'INITIALIZING',
  unitsCount: 0,
  lastError: null,
  fps: 60,
  canvasRendered: false,
};

export function initQABridge() {
  if (typeof window === 'undefined') return;

  window.__TACTICAL_QA_BRIDGE__ = {
    getSnapshot: () => ({
      ...currentSnapshot,
      lastError: capturedErrors[capturedErrors.length - 1] || null,
      canvasRendered: Boolean(document.querySelector('canvas')),
    }),
    updateSnapshot: (partial: Partial<QAGameSnapshot>) => {
      currentSnapshot = { ...currentSnapshot, ...partial };
    },
    getConsoleErrors: () => [...capturedErrors],
    clearErrors: () => {
      capturedErrors.length = 0;
    },
    ping: () => 'PONG_TACTICAL_QA_ACTIVE',
  };
}

export function updateQASnapshot(partial: Partial<QAGameSnapshot>) {
  if (typeof window !== 'undefined' && window.__TACTICAL_QA_BRIDGE__) {
    window.__TACTICAL_QA_BRIDGE__.updateSnapshot(partial);
  }
}

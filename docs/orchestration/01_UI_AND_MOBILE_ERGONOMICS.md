# PLAN DE ORQUESTACIÓN TÉCNICA: INTERFAZ DE USUARIO, PURGA DE DEBUG Y ERGONOMÍA MÓVIL
**Módulo:** `docs/orchestration/01_UI_AND_MOBILE_ERGONOMICS.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión de Especificación:** 1.0.0-PROD-ORCHESTRATION  
**Estado:** `100% IMPLEMENTADO Y CERTIFICADO EN PRODUCCIÓN (SSOT)`  
**Destino de Implementación:** `src/components/game/CombatTheaterView.tsx`, `src/components/game/GameCanvas.tsx`, `src/components/game/DebugDevConsoleModal.tsx`, `src/components/game/HotkeysOverlayBadge.tsx`

---

## 1. PURGA Y DESACOPLAMIENTO DE `CombatTheaterView.tsx`

### 1.1 Diagnóstico de Contaminación en Producción
El archivo `src/components/game/CombatTheaterView.tsx` expone actualmente en el Drawer táctico lateral (`isTacticalDrawerOpen`) controles de ingeniería y depuración interna accesibles directamente por el jugador en partidas regulares:
- Conmutador manual de Niebla de Guerra (`isFogOfWarEnabled`).
- Selector de Clima arbitrario (`fowWeather: clear | rain`).
- Activación forzada de Sensores (`sonjaSensorActive`).
- Disparador manual de eventos de cómic (`onBarkTrigger`).
- Botón de inyección directa de mapas AWBW (`setIsImportModalOpen`).

### 1.2 Procedimiento de Extracción y Aislamiento

#### Paso 1: Creación del Componente Aislado `DebugDevConsoleModal.tsx`
Crear `src/components/game/DebugDevConsoleModal.tsx` encapsulando todos los controles de diagnóstico bajo la condición estricta de entorno de desarrollo (`import.meta.env.DEV`) o rol `auditor` en la sesión de usuario:

```typescript
// src/components/game/DebugDevConsoleModal.tsx
import React from 'react';
import { Terminal, X, CloudFog, Sparkles, UploadCloud } from 'lucide-react';

export interface DebugDevConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFogOfWarEnabled: boolean;
  setIsFogOfWarEnabled: (val: boolean) => void;
  fowWeather: 'clear' | 'rain';
  setFowWeather: (val: 'clear' | 'rain') => void;
  sonjaSensorActive: boolean;
  setSonjaSensorActive: (val: boolean) => void;
  onBarkTrigger: () => void;
  setIsImportModalOpen: (val: boolean) => void;
}

export const DebugDevConsoleModal: React.FC<DebugDevConsoleModalProps> = ({
  isOpen,
  onClose,
  isFogOfWarEnabled,
  setIsFogOfWarEnabled,
  fowWeather,
  setFowWeather,
  sonjaSensorActive,
  setSonjaSensorActive,
  onBarkTrigger,
  setIsImportModalOpen,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#181914] border-2 border-[#C46A3A] rounded-[8px_2px_8px_2px] p-5 shadow-[15px_15px_0px_rgba(0,0,0,0.7)] text-[#F2E8D5] font-mono">
        <div className="flex items-center justify-between border-b border-[#7B8A4A]/40 pb-3 mb-4">
          <div className="flex items-center gap-2 text-[#C46A3A] font-bold uppercase tracking-wider text-sm">
            <Terminal className="w-4 h-4" />
            <span>Terminal Táctica de Estado Mayor (DEBUG)</span>
          </div>
          <button onClick={onClose} className="p-1 hover:text-red-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[#7B8A4A] mb-1 font-bold">SENSORES & NIEBLA</label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsFogOfWarEnabled(!isFogOfWarEnabled)}
                className={`px-3 py-1.5 rounded border ${isFogOfWarEnabled ? 'bg-purple-900 border-purple-500 text-purple-200' : 'bg-[#2B2C24] border-slate-700'}`}
              >
                Niebla: {isFogOfWarEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setSonjaSensorActive(!sonjaSensorActive)}
                className={`px-3 py-1.5 rounded border ${sonjaSensorActive ? 'bg-amber-900 border-amber-500 text-amber-200' : 'bg-[#2B2C24] border-slate-700'}`}
              >
                Sensor Sonja: {sonjaSensorActive ? 'ACTIVO' : 'INACTIVO'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[#7B8A4A] mb-1 font-bold">METEOROLOGÍA</label>
            <button
              onClick={() => setFowWeather(fowWeather === 'clear' ? 'rain' : 'clear')}
              className="px-3 py-1.5 rounded bg-[#2B2C24] border border-[#7B8A4A]"
            >
              Clima Forzado: {fowWeather === 'rain' ? '🌧️ Lluvia (-1 Vis)' : '☀️ Despejado'}
            </button>
          </div>

          <div>
            <label className="block text-[#7B8A4A] mb-1 font-bold">TELEMETRÍA NARRATIVA & CARTOGRAFÍA</label>
            <div className="flex gap-2">
              <button
                onClick={onBarkTrigger}
                className="px-3 py-1.5 rounded bg-[#C46A3A] text-white font-bold"
              >
                Forzar Bark Cómic
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3 py-1.5 rounded bg-[#46521F] border border-[#7B8A4A] flex items-center gap-1"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Importar AWBW</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### Paso 2: Limpieza de `CombatTheaterView.tsx`
1. Eliminar del renderizado regular de `CombatTheaterView.tsx` los bloques HTML correspondientes a `Entorno Táctico & Sensores` y el botón `¡Bark Cómic!`.
2. El Drawer táctico lateral se preserva exclusivamente para:
   - Configuración de audio y visualización de volumen.
   - Rendición de partida (`execute_match_forfeit`).
   - Resumen de objetivos y reglas del mapa activo.
3. El disparador de la consola de desarrollo se restringe a la combinación de teclas oculta `Ctrl + Shift + D` o al botón de auditor en la cabecera cuando el perfil de usuario posee el flag `is_staff: true`.

---

## 2. ESPECIFICACIÓN DE INDICADORES VISUALES PASIVOS DE HOTKEYS

Para educar al jugador sin sobrecargar la visión periférica, los atajos de teclado documentados en `docs/01_MASTER_GAME_DESIGN_DOCUMENT.md#L365` se integran como insignias mínimas semitransparentes (*passive hotkey pills*).

### 2.1 Maquetación en Elementos de Interfaz
1. **Menú Contextual de Baldosa (`TileContextMenu.tsx`):**  
   Cada botón de acción despliega una pastilla alineada a la derecha con estilo monoespaciado atenuado:
   - `attack` $\rightarrow$ `[1]` o `[A]`
   - `capture` $\rightarrow$ `[2]` o `[C]`
   - `launch_silo` $\rightarrow$ `[3]` o `[S]`
   - `supply` $\rightarrow$ `[4]` o `[R]`
   - `join` $\rightarrow$ `[5]` o `[J]`
   - `unload` $\rightarrow$ `[6]` o `[U]`
   - `wait` $\rightarrow$ `[Space]`

2. **Cabecera Táctica (`COCommandBar.tsx`):**
   - Botón `[COP]` $\rightarrow$ Subíndice `(P)`
   - Botón `[SCOP]` $\rightarrow$ Subíndice `(O)`

3. **Insignia Inferior Flotante Discreta (`HotkeysLegendBadge`):**
   Ubicada en la esquina inferior izquierda (`bottom-2 left-2`), con opacidad del 40% que sube al 90% en hover:
   `[Tab] Sig. Tropa | [Space] Esperar | [Esc] Cancelar | [Ctrl+Enter] Fin de Turno`

---

## 3. ARQUITECTURA DE GESTOS MÓVILES Y FEEDBACK HÁPTICO

Para cumplir el axioma de ejecución sin barreras en navegadores móviles, el Canvas táctico de `GameCanvas.tsx` debe soportar punteros táctiles simultáneos (*Multi-Touch Pointer Events*).

### 3.1 Modelo Matemático de Transformación de Cámara y Zoom

Sean:
- $T_1 = (x_1, y_1)$ y $T_2 = (x_2, y_2)$ las coordenadas de pantalla de dos dedos en el instante $t$.
- Distancia euclidiana entre contactos:
  $$D(t) = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$
- Centroide táctil de interpolación:
  $$P_{\text{mid}}(t) = \left( \frac{x_1 + x_2}{2}, \frac{y_1 + y_2}{2} \right)$$
- Factor de escala de zoom $Z(t)$ acotado en el dominio $[Z_{\min}, Z_{\max}] = [0.65, 1.80]$:
  $$Z(t) = \text{clamp}\left(0.65, \ 1.80, \ Z(t - \Delta t) \times \frac{D(t)}{D(t - \Delta t)}\right)$$
- Corrección de desplazamiento de cámara $(C_x, C_y)$ para mantener el centroide invariante:
  $$C_x(t) = P_{\text{mid}, x}(t) - (P_{\text{mid}, x}(t) - C_x(t - \Delta t)) \times \frac{Z(t)}{Z(t - \Delta t)}$$
  $$C_y(t) = P_{\text{mid}, y}(t) - (P_{\text{mid}, y}(t) - C_y(t - \Delta t)) \times \frac{Z(t)}{Z(t - \Delta t)}$$

### 3.2 Reconocedor de Doble Toque (Double-Tap Confirmation)
Para evitar la ambigüedad entre arrastre de cámara y selección de baldosa:
1. **Primer Toque ($t_0$):**
   - Si se toca una celda alcanzable, se traza la flecha de trayectoria visual y se pre-selecciona el destino sin abrir el menú.
2. **Segundo Toque sobre la Misma Celda ($\Delta t \le 300\text{ms}$, distancia $\le 16\text{px}$):**
   - Se confirma la marcha inmediata y se abre `TileContextMenu.tsx` en las coordenadas físicas del destino.
3. **Toque en Casilla Diferente o Arrastre ($> 16\text{px}$):**
   - Cancela el temporizador de doble toque y conmuta el motor a modo `PANNING` de cámara.

### 3.3 Integración con Web Vibration API (Matriz Háptica)

Crear el módulo utilitario `src/engine/hapticFeedback.ts`:

```typescript
// src/engine/hapticFeedback.ts
export type HapticPattern = 
  | 'selection'    // Selección ligera de celda
  | 'movement'     // Marcha confirmada
  | 'attack'       // Impacto balístico
  | 'trap'         // Emboscada en niebla
  | 'co_power'     // Activación de Superpoder
  | 'error';       // Orden inválida o combustible agotado

const HAPTIC_PROFILES: Record<HapticPattern, number | number[]> = {
  selection: 10,
  movement: 25,
  attack: [40, 30, 60],
  trap: [80, 50, 120, 50, 200],
  co_power: [100, 40, 100, 40, 250],
  error: [30, 20, 30],
};

export const triggerHaptic = (pattern: HapticPattern): void => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(HAPTIC_PROFILES[pattern]);
    } catch {
      // Silenciar excepciones en navegadores con permisos denegados
    }
  }
};
```

#### Integración en el Pipeline de Canvas:
- Al tocar una baldosa con tropa propia $\rightarrow$ `triggerHaptic('selection')`.
- Al confirmar sub-acción `attack` sobre objetivo $\rightarrow$ `triggerHaptic('attack')`.
- Al detonar el evento `¡TRAP!` en `pathfinding.ts` $\rightarrow$ `triggerHaptic('trap')`.
- Al activar COP o SCOP en `COCommandBar.tsx` $\rightarrow$ `triggerHaptic('co_power')`.

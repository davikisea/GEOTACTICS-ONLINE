---
name: game-qa-playtester
description: Agente de Playtesting E2E y QA Multimodal. Ejecuta el juego real en Chromium con Playwright, captura screenshots en tiempo real, monitorea errores de consola, fallos de red y el estado del juego para diagnosticar y autoreparar crashes de forma autónoma.
---

# GAME QA PLAYTESTER - MANUAL OPERATIVO

Usa esta skill cada vez que el usuario pida:
- "Prueba el juego"
- "Haz un playtest E2E"
- "Revisa por qué crashea el juego o no carga"
- "Ejecuta las pruebas de interfaz y jugabilidad"
- "Verifica si el juego es jugable"

---

## 1. MISIÓN Y FILOSOFÍA DE QA

El rol de este evaluador no es solo verificar sintaxis estática, sino **experimentar el juego como un jugador real**:
1. Abrir el juego en un navegador real (`http://localhost:3000`).
2. Comprobar que no haya pantallas negras ni cuelgues silenciosos.
3. Capturar la pantalla en cada fase (Boot, Menús, Canvas táctico, Acciones de combate).
4. Correlacionar visualmente los fallos con los logs de runtime (`console.error`, `pageerror`, assets 404).
5. Localizar la causa raíz en el código fuente de React/Engine y **aplicar la corrección de forma autónoma**.

---

## 2. PROTOCOLO DE EJECUCIÓN (BUCLE AUTÓNOMO DE TESTEO)

### Paso A: Lanzar la Suite de Playtesting
Ejecuta mediante `run_command`:
```powershell
npm run test:qa
```
*(Nota: Playwright levantará automáticamente el servidor Vite en el puerto 3000 si no está corriendo).*

### Paso B: Extraer la Telemetría y Capturas Generadas
Inspecciona el resultado en:
- Reporte unificado: `test-results/qa-run-latest.json`
- Capturas de pantalla: `test-results/screenshots/`
  - `01_boot_screen.png` (Arranque y montaje de `#root`)
  - `02_after_play_click.png` (Navegación tras interacción)
  - `03_canvas_interaction.png` o `03_ui_state.png` (Estado del canvas y renderizado)

### Paso C: Matriz de Correlación y Diagnóstico
Cruza la información siguiendo estas reglas de diagnóstico:

| Síntoma Visual | Causa Probable en Datos | Acción de Reparación Inmediata |
| :--- | :--- | :--- |
| **Pantalla Blanca / Negra en Boot** | `fatalErrors` contiene un import roto, error en hook o fallo en `main.tsx` / `App.tsx`. | Inspeccionar el stack trace en `test-results/qa-run-latest.json`, editar el componente culpable y corregir el null check o import. |
| **Grid no dibuja casillas o unidades** | `networkFailures` muestra sprites con error 404 o el contexto 2D de canvas falló. | Verificar rutas en `src/engine/assetLoader.ts` o los catálogos en `src/engine/predefinedMaps.ts`. |
| **Clic no responde / Botón congelado** | El bridge reporta `phase` atascada o hay un overlay transparente interceptando clicks. | Revisar `z-index`, `pointer-events: none` o handlers `onClick` faltantes. |
| **Unhandled Promise Rejection** | Supabase o llamada async fallida sin catch. | Añadir bloques `try/catch` y estados de fallback visual. |

### Paso D: Reparar y Revalidar
1. Aplica el parche con `edit_file`.
2. Vuelve a ejecutar `npm run test:qa`.
3. Confirma que `fatalErrorsCount` se reduzca a `0` y que la captura muestre la interfaz interactiva.
4. Reporta al usuario un resumen conciso con las capturas analizadas y el código remediado.

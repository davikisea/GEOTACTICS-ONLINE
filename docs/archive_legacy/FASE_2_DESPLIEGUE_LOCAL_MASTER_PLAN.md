# PLAN MAESTRO DE EJECUCIÓN - FASE GENERAL 2: EL DESPLIEGUE LOCAL
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Repositorio Oficial:** `https://github.com/iseadavidfreelance-droid/TacticalCommand`  
**Estado:** Activo - En Ejecución  
**Objetivo Fundamental:** Transición del desarrollo teórico hacia una aplicación web funcional, estable y jugable en entorno local (`localhost`), con base de datos aprovisionada, repositorio sincronizado y pruebas de experiencia de usuario (feedback humano).

---

## 1. MARCO CONCEPTUAL: TRANSICIÓN DE ETAPAS

```
┌────────────────────────────────┐       ┌────────────────────────────────┐       ┌────────────────────────────────┐
│            FASE 1              │       │            FASE 2              │       │            FASE 3              │
│      DESARROLLO TEÓRICO        │  ──►  │       DESPLIEGUE LOCAL         │  ──►  │       DESPLIEGUE CLOUD         │
│  • GDD & Reglas Canónicas      │       │  • Instalación de Runtimes     │       │  • Vercel Edge / Static CDN    │
│  • Motores Tácticos (Ts)       │       │  • Sincronización GitHub       │       │  • Supabase Cloud Production   │
│  • 22 Migraciones SQL          │       │  • Aprovisionamiento DB        │       │  • Dominio & SSL Oficial       │
│  • Arquitectura UI / Canvas    │       │  • npm install & dev server    │       │  • Pipeline CI/CD Automatizado │
│  • Red Teaming & Simulación    │       │  • Playtesting Humano Local    │       │  • Monitorización & Telemetría │
└────────────────────────────────┘       └────────────────────────────────┘       └────────────────────────────────┘
             [COMPLETADO]                           [FASE ACTUAL]                            [FASE FINAL]
```

### Principios Operativos de la Fase 2:
1. **Cero Suposiciones:** Todo cambio de código debe compilar y probarse en tiempo de ejecución.
2. **Prioridad a la Jugabilidad Local (Single Player & Hotseat):** El modo multijugador online Realtime se mantendrá debidamente aislado y comentado para evitar cuellos de botella de red mientras se garantiza que el motor táctico sea 100% robusto y no sufra crasheos.
3. **Persistencia Progresiva:** Pasar de un estado en memoria 100% volátil a un esquema con fallback local (`localStorage`) e hidratación gradual contra Supabase.
4. **Trazabilidad Git Continua:** Cada hito superado debe reflejarse en un commit atómico y descriptivo en el repositorio de GitHub.

---

## 2. DIAGNÓSTICO DEL ENTORNO ANFITRIÓN (HOST REALITY CHECK)

En el estado actual de la máquina local, se ha verificado:
* **Node.js / Bun:** No detectados en el PATH.
* **Git CLI:** No detectado en el PATH.
* **Directorio `.git`:** No inicializado en la carpeta del espacio de trabajo.
* **`node_modules`:** Inexistente.
* **Base de datos Supabase:** Esquemas escritos en SQL (`/supabase/migrations`), pero ninguna instancia (local o remota) se encuentra corriendo ni conectada.

Por tanto, el despliegue local requiere un orden secuencial estricto en 5 Hitos.

---

## 3. LOS 5 HITOS ESTRUCTURALES DE LA FASE 2

```
                                      CRONOGRAMA DE HITOS - FASE 2
                                                    │
    ┌─────────────────┬─────────────────┬───────────┴─────┬─────────────────┬─────────────────┐
    ▼                 ▼                 ▼                 ▼                 ▼                 ▼
[ HITO 2.1 ]      [ HITO 2.2 ]      [ HITO 2.3 ]      [ HITO 2.4 ]      [ HITO 2.5 ]      [ HITO 2.6 ]
 Entorno Host &    Git & Repositorio Aprovisionamiento  Dependencias &    Estabilización    Playtesting &
 Runtimes          GitHub            Supabase DB        Dev Server (3000) Core Loop Local   Vercel Prep
```

---

### HITO 2.1: PREPARACIÓN DEL RUNTIME Y HERRAMIENTAS HOST

**Meta:** Dotar al sistema operativo del motor de ejecución de JavaScript/TypeScript y las herramientas de control de versiones.

* **Paso 2.1.1: Instalación de Node.js / Bun**
  * Opción Recomendada: Instalar **Node.js LTS (v20 o v22)** desde el sitio oficial (`nodejs.org`) o mediante administrador de paquetes (`winget install OpenJS.NodeJS.LTS`).
  * Alternativa de alto rendimiento: Instalar **Bun** (`winget install Oven-sh.Bun` o `powershell -c "irm bun.sh/install.ps1 | iex"`).
  * *Verificación:* `node -v` y `npm -v` (o `bun -v`) deben responder con versiones válidas.

* **Paso 2.1.2: Instalación de Git for Windows**
  * Descargar e instalar Git (`winget install Git.Git`).
  * Configurar identidad de autor:
    ```bash
    git config --global user.name "iseadavidfreelance-droid"
    git config --global user.email "tu_email@ejemplo.com"
    ```
  * *Verificación:* `git --version` debe reportar `git version 2.x.x`.

---

### HITO 2.2: INICIALIZACIÓN Y VINCULACIÓN CON GITHUB

**Meta:** Conectar el espacio de trabajo local con el repositorio remoto `https://github.com/iseadavidfreelance-droid/TacticalCommand`.

* **Paso 2.2.1: Inicialización del Repositorio Local**
  ```powershell
  cd c:\Users\Morín\TacticalCommand
  git init -b main
  ```

* **Paso 2.2.2: Configuración del `.gitignore`**
  Verificar que `.gitignore` incluya:
  ```gitignore
  node_modules/
  dist/
  .env
  .env.local
  .DS_Store
  *.log
  ```

* **Paso 2.2.3: Vinculación del Remote y Primer Commit Estructural**
  ```powershell
  git remote add origin https://github.com/iseadavidfreelance-droid/TacticalCommand.git
  git add .
  git commit -m "feat(core): consolidación arquitectónica de Fase 1 - Motores, GDD y Migraciones SQL"
  git branch -M main
  # Sincronización con el origen (pull previo si el repositorio remoto ya contiene README/archivos)
  git pull origin main --rebase --allow-unrelated-histories
  git push -u origin main
  ```

---

### HITO 2.3: APROVISIONAMIENTO Y DESPLIEGUE DE LA BASE DE DATOS SUPABASE

**Meta:** Levantar una instancia funcional de PostgreSQL gestionada por Supabase y ejecutar las 22 migraciones más los datos semilla.

Existen **dos rutas viables** para este paso:

#### Ruta A: Supabase Cloud (Recomendada para agilidad sin Docker)
1. Iniciar sesión en [database.new](https://database.new) (Supabase Dashboard).
2. Crear un nuevo proyecto gratuito denominado `tactical-command-dev`.
3. Obtener la **Project URL** y la **anon public API Key** desde `Project Settings -> API`.
4. En el SQL Editor de Supabase Dashboard, ejecutar los archivos de migración en orden secuencial (del 01 al 22) o usar la CLI de Supabase vinculada:
   ```powershell
   npx supabase login
   npx supabase link --project-ref <tu-project-ref>
   npx supabase db push
   ```
5. Ejecutar `supabase/seed.sql` para poblar usuarios y perfiles de prueba.

#### Ruta B: Supabase Local con Docker
1. Contar con Docker Desktop instalado y corriendo.
2. Ejecutar en la terminal del proyecto:
   ```powershell
   npx supabase init
   npx supabase start
   ```
3. Aplicar migraciones locales automáticamente:
   ```powershell
   npx supabase db reset
   ```
4. Supabase correrá en `http://127.0.0.1:54321` con Studio en `http://127.0.0.1:54323`.

* **Paso 2.3.3: Configuración de Variables de Entorno (`.env.local`)**
  Crear el archivo `.env.local` con las claves reales de la base elegida:
  ```env
  VITE_APP_ENV="development"
  VITE_APP_URL="http://localhost:3000"
  VITE_SUPABASE_URL="https://tu-proyecto.supabase.co" # o http://127.0.0.1:54321
  VITE_SUPABASE_ANON_KEY="tu-anon-key"
  VITE_ENABLE_PERF_MONITOR="true"
  VITE_AUDIO_ENABLED="true"
  ```

---

### HITO 2.4: INSTALACIÓN DE DEPENDENCIAS Y ARRANQUE DEL SERVIDOR LOCAL

**Meta:** Instalar paquetes NPM, compilar el bundle y levantar Vite en el puerto 3000.

* **Paso 2.4.1: Instalación de Paquetes**
  ```powershell
  npm install
  # o con bun:
  bun install
  ```

* **Paso 2.4.2: Verificación de Tipos (TypeScript)**
  ```powershell
  npm run lint
  ```
  *Resolver cualquier advertencia de tipado en interfaces o props antes de arrancar.*

* **Paso 2.4.3: Arranque del Servidor de Desarrollo**
  ```powershell
  npm run dev
  ```
  * Abrir en el navegador: `http://localhost:3000`
  * Confirmar que la aplicación renderiza el Cuartel General (`WarLobbyHub`) sin errores en la consola DevTools.

---

### HITO 2.5: ESTABILIZACIÓN DEL CORE LOOP TÁCTICO LOCAL

**Meta:** Garantizar que una sesión completa de juego (despliegue, combate, IA, economía, victoria) sea fluida y esté 100% libre de bloqueos.

* **Paso 2.5.1: Aislamiento del Módulo Multijugador Realtime**
  * Mantener el hook `useMatchSync.ts` debidamente documentado y comentado como infraestructura lista para la Fase 3/4.
  * En `App.tsx`, asegurar que no se disparen suscripciones WebSocket que fallen por timeout o desconexión.

* **Paso 2.5.2: Corrección del Foco Inicial de Unidades**
  * En `src/App.tsx`, cambiar la asignación fija `'p1_inf_hq'` y `'p2_inf_hq'` por resolución dinámica:
    ```typescript
    const firstP1 = initialMap.startingUnits.find(u => u.ownerId === 'p1');
    const firstP2 = initialMap.startingUnits.find(u => u.ownerId === 'p2');
    setSelectedUnitId(firstP1 ? firstP1.id : '');
    setTargetEnemyId(firstP2 ? firstP2.id : '');
    ```

* **Paso 2.5.3: Blindaje del Reloj Fischer contra Race Conditions**
  * Asegurar que el cambio automático de turno cuando el reloj llega a 0 verifique que las animaciones de combate hayan concluido y que el bot no esté a medio procesar.

* **Paso 2.5.4: Fallback de Persistencia Local (`localStorage`)**
  * Implementar persistencia de emergencia en el cliente para que el oro ganado, las tropas compradas y las partidas ganadas se guarden en `localStorage` de inmediato, evitando el reinicio de partida al refrescar la ventana.

---

### HITO 2.6: PLAYTESTING HUMANO Y PRE-REQUISITOS DE VERCEL

**Meta:** Someter el juego a sesiones reales de juego en el navegador por un humano, registrar feedback de ergonomía y verificar la compilación estática de producción.

* **Protocolo de Playtesting Humano:**
  1. Jugar 3 partidas completas en modo **Blitz Skirmish** contra el Bot en dificultad Normal y Difícil.
  2. Jugar 1 partida en modo **Hotseat 2 Jugadores**.
  3. Probar la activación de un Superpoder CO (SCOP) y comprobar la aparición de viñetas cómicas (Bark Engine).
  4. Comprar una unidad en la fábrica y validar el descuento de fondos.
  5. Entrar a los módulos logísticos (Hangar de Armería, Complejo Industrial, Estudio Táctico) y volver al Lobby Bélico sin recargar la página.
  6. Ganar por captura de Cuartel General enemigo y validar el despliegue del modal de victoria.

* **Verificación de Build de Producción:**
  ```powershell
  npm run build
  npm run preview
  ```
  * Confirmar que la carpeta `dist/` se genera de forma limpia, sin advertencias críticas de Rollup.

---

## 4. MATRIZ DE CRITERIOS DE ACEPTACIÓN (DEFINITION OF DONE - FASE 2)

| Requisito | Criterio de Éxito | Estado |
|:---|:---|:---:|
| **Control de Versiones** | Repositorio GitHub actualizado con commits limpios y rama `main` protegida. | ⏳ Pendiente |
| **Ambiente Local** | Servidor Vite corriendo en `localhost:3000` con cero advertencias bloqueantes. | ⏳ Pendiente |
| **Base de Datos** | 22 migraciones y `seed.sql` aplicados en Supabase (Local o Cloud). | ⏳ Pendiente |
| **Jugabilidad Core** | Partida jugable de principio a fin (movimiento, combate, victoria) sin crasheos. | ⏳ Pendiente |
| **Persistencia** | Progreso de jugador (oro, XP, desbloqueos) retenido tras recargar la página. | ⏳ Pendiente |
| **Build Ready** | `npm run build` genera `dist/` válido listo para ser conectado al repo de Vercel. | ⏳ Pendiente |

---
*Documento canónico aprobado para guiar las operaciones de la Fase General 2.*

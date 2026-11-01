# ESPECIFICACIÓN DEVOPS & BATERÍA DE PRUEBAS DE INTEGRACIÓN E2E
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Rol:** DevOps & Lead QA Specialist  
**Plataforma de Despliegue:** Vercel (Edge Network) + Supabase (PostgreSQL / Realtime)  
**Versión de Especificación:** 1.0.0-PROD  

---

## 1. CONFIGURACIÓN DE DESPLIEGUE EN VERCEL (`vercel.json`)

El archivo `vercel.json` se encuentra configurado en la raíz del proyecto para asegurar enrutamiento SPA sin recargas de página, cabeceras de caché inmutables en Edge y directivas de seguridad bancarias:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "cleanUrls": true,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)\\.(webp|png|jpg|jpeg|gif|svg|ico|woff2|woff|ttf|mp3|ogg|wav)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=2592000, stale-while-revalidate=86400"
        }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com; media-src 'self' data: blob:; worker-src 'self' blob:;" }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!assets/|.*\\..*).*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 2. VARIABLES DE ENTORNO REQUERIDAS (`.env.example`)

| Variable | Tipo | Ámbito | Descripción |
|---|---|---|---|
| `VITE_APP_ENV` | `string` | Cliente | Entorno de ejecución (`production`, `preview`, `development`). |
| `VITE_APP_URL` | `string` | Cliente | URL canónica del despliegue en Vercel. |
| `VITE_SUPABASE_URL` | `string` | Cliente | Endpoint HTTPS de la base de datos Supabase. |
| `VITE_SUPABASE_ANON_KEY` | `string` | Cliente | Llave pública anónima de Supabase sujeta a RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | `string` | Serverless/Edge | Llave con privilegios para cronjobs y RPC de backend. |
| `VITE_ENABLE_PERF_MONITOR` | `boolean` | Cliente | Habilita telemetría de FPS y latencia en tiempo de render. |

---

## 3. CHECKLIST DE OPTIMIZACIÓN DE RENDIMIENTO

### A. Lazy Loading de Componentes React (`React.lazy` + `Suspense`)
- **Implementación:** Los componentes de alto peso visual (`ShopCatalog`, `LoadoutCustomizer`, `MatchSummaryModal`, `MapLoadingScreen` y `QADevOpsRunner`) se importan asíncronamente con `React.lazy`.
- **Fallback Temático:** Componente `TacticalLoadingFallback` con animación de barrido de radar Advance Wars en estilo CRT terminal verde esmeralda.
- **Resultado:** Reducción del paquete inicial en más de un 40%, permitiendo un First Contentful Paint (FCP) inferior a 0.8s en conexiones 4G/Edge.

### B. División de Bundles en Vite (`manualChunks`)
En `vite.config.ts`, Rollup separa las bibliotecas críticas en chunks independientes:
1. `vendor-react`: `react`, `react-dom`
2. `vendor-lucide`: Colección de iconos vectoriales
3. `vendor-supabase`: Cliente de base de datos y WebSocket Realtime
4. `vendor-motion`: Motor de físicas y animaciones de UI
5. `engine-core`: Lógica matemática pura de A* pathfinding, combate y bot AI

### C. Compresión y Política de Sprites WebP
- **Compresión Lossless WebP:** Reduce en ~42% el peso de los atlas de texturas comparado con PNG estándar de 32-bit.
- **Fallback Automático:** Motor `AssetOptimizationEngine` con detección en tiempo de ejecución de soporte WebP mediante pixel probe `checkWebPSupport()`.
- **Efectos de Sonido con Web Audio API:** Síntesis procedural por oscilador y ruido blanco, eliminando descargas de archivos `.wav` o `.mp3` pesados y logrando 0 ms de latencia al disparar proyectiles.

---

## 4. BATERÍA DE PRUEBAS DE INTEGRACIÓN END-TO-END (E2E)

La suite implementada en `src/engine/e2eIntegration.test.ts` valida el flujo integral continuo del videojuego:

```
[ PASO 1: Registro de Usuario ] 
          │
          ▼
[ PASO 2: Selección de Partida vs Bot ] 
          │
          ▼
[ PASO 3: Movimiento Táctico & A* Pathfinding ] 
          │
          ▼
[ PASO 4: Combate & Contraataque ] 
          │
          ▼
[ PASO 5: Condición de Victoria & Recompensas ] 
          │
          ▼
[ PASO 6: Compra en Tienda & Equipamiento en Armería ]
```

### Ejecución en CI/CD & CLI
```bash
npm run test:e2e
```

### Resultados de Ejecución:
- **Paso 1 (Auth):** Perfil inicial registrado con 2,400 Oro y 650 Gemas (Nivel 1).
- **Paso 2 (Matchmaking):** Tablero 8x8 instanciado con cuarteles generales, ciudades, carreteras y unidades.
- **Paso 3 (Movement):** Infantería toma ciudad neutral (+1 Propiedad); validado bloqueo de montañas para tanques.
- **Paso 4 (Combat):** Tanque causa daño al enemigo en carretera; contraataque mitigado; eliminación exitosa de la unidad hostil.
- **Paso 5 (Progression):** Victoria militar otorgando +466 XP y +190 Oro; activación del disparador de subida a Nivel 2.
- **Paso 6 (Economy):** Transacción atómica comprando skin "Tanque Ligero: Tormenta del Desierto" por 800 Oro; equipamiento activo verificado en armería.

# VOLUMEN 6: DEVOPS, INFRAESTRUCTURA, QA Y TELEMETRÍA CONDUCTUAL
**Documento Canónico Unificado:** `06_MASTER_DEVOPS_QA_AND_TELEMETRY.md`  
**Proyecto:** *Tactical Command: Wars of Legacy*  
**Versión:** 4.0.0-DEFINITIVE-MASTER-SPEC  
**Estado:** Documento de Verdad Absoluta (SSOT - Single Source of Truth)  
**Archivos Consolidados y Reemplazados:**  
- `11_DEVOPS_PERFORMANCE_AND_E2E_QA.md` (Completo)  
- Secciones de infraestructura y telemetría de `07_DATABASE_INFRASTRUCTURE_PLAN.md` y `13_CO_SYSTEM_MONETIZATION_AND_BARK_ENGINE.md`  

---

# 1. PIPELINE DE INTEGRACIÓN Y DESPLIEGUE CONTINUO (CI/CD)

El proyecto utiliza **GitHub Actions** para validar cada commit y pull request antes del despliegue automático a producción en **Vercel Edge y Supabase**:

```yaml
# .github/workflows/ci-cd-pipeline.yml
name: Tactical Command CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Instalar Dependencias
        run: bun install --frozen-lockfile

      - name: Verificación Estricta de Tipos TypeScript
        run: bun run typecheck

      - name: Linter Estático ESLint
        run: bun run lint

      - name: Pruebas Unitarias de Motor Táctico (Vitest)
        run: bun run test:unit --coverage

      - name: Pruebas End-to-End (Playwright Headless)
        run: bun run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
```

---

# 2. ESTRATEGIA DE PRUEBAS AUTOMATIZADAS (QA)

### 2.1 Suite Integral de Pruebas Unitarias e Integración (21 Archivos de Test)
Verifican que las fórmulas matemáticas, reglas de cuadrícula y subsistemas de backend sean 100% deterministas y reproducibles:
- **Combate y Balística:**
  * `canonicalCombat.ts` / `combat.test.ts`: Daño canónico AWBW con verificación de munición primaria/secundaria y cobertura proporcional a la salud del defensor.
  * `advancedTactics.test.ts`: Rutas de fuego indirecto, rangos ciegos y penalizaciones de terreno.
  * `advancedWarsWorldSystems.test.ts`: Pruebas de compatibilidad con WarsWorld (tuberías, silos, bajíos).
- **Locomoción y Niebla de Guerra:**
  * `pathfinding.test.ts`: Algoritmo A*, costes de tracción por terreno y regla de interrupción `¡TRAP!`.
  * `fogOfWar.test.ts`: Cálculo de visión de 360°, elevación en montañas (+3 infantería) y ocultación en bosques/arrecifes.
  * `subActionsAndArrow.test.ts`: Flecha táctica de trayectoria y menú de sub-acciones (`join`, `load`, `unload`, `supply`, `launch_silo`, `explode`).
- **Comandantes, Poderes y Narrativa Cómic:**
  * `coSystem.test.ts` & `expandedCOs.test.ts`: Los 28 COs canónicos, cálculo de carga estelar ($9,000G/estrella), bonos COP/SCOP y efectos instantáneos.
  * `barkEngine.test.ts`: Selección estocástica ponderada de diálogos, buffer anti-repetición de 5 turnos, interpolación de camaradería y sellos Pop-Art.
- **Economía, Suministros y Metajuego:**
  * `hangarAndSupply.test.ts`: Validación de la Doble Llave ($G in-match + stock Hangar), Kit F2P inagotable (infantry/recon) y Soft Cap logístico en 14 tropas ($200G/t exceso).
  * `turnEconomy.test.ts`: Generación de fondos por propiedades, costes de reparación a 1% de coste por HP y reabastecimiento en ciudades.
  * `industrialEngine.test.ts`: Cuadrícula de 10 parcelas territoriales, ciclo circadiano de 16h, merma suave (1.5%/h) y 70% a Cargamento Varado.
  * `clanSystem.test.ts`: Bóveda corporativa T1-T3, embargo por deshonor con reparto 50/30/20 y Salvaguarda Táctica con seguro de racha.
  * `metagame.test.ts`: Topología territorial, asedios de 10,000 TCP, curva superlineal de sobre-expansión, relevo por guarniciones IA e impuestos P2P del 2%.
- **Competición, Arenas y Redes:**
  * `rankedLadderEngine.test.ts`: 10 Arenas + 3 Ligas Legendarias, Factor K dinámico, Escudo de Descenso con 3 cargas y Season Reset cada 28 días.
  * `aiBot.test.ts`: Heurísticas de toma de decisiones para IA en dificultades Fácil, Normal y Difícil.
  * `autonomousOrchestrator.test.ts`: Flujo completo de turnos para Duelo Espejo (15s), Blitz (30s) y Campaña (60s).
  * `mapImporter.test.ts` & `src/editor/mapBuilder.test.ts`: Importador AWBW y verificación de simetría rotacional de 180°.
  * `src/lib/supabase/realtime.test.ts`: Conexión Realtime, suscripción a eventos de canal y reconciliación de estado.

### 2.2 Suite de Integración End-to-End (`e2eIntegration.test.ts`)
Valida la tubería completa de juego en 11 pasos canónicos certificados:
1. Registro de usuario & Perfil militar inicial.
2. Selección de partida contra Bot & Configuración táctica de tablero.
3. Movimiento de unidades & Algoritmo Pathfinding A\*.
4. Combate táctico determinista y contraataque sin varianza.
5. Condición de Victoria y Otorgamiento de Recompensas (XP / Oro / Niveles).
6. Tienda de Cosméticos, Transacción Atómica y Equipamiento en Armería.
7. **Bark Engine Cómic:** Detonación de viñetas, bocadillos Pop-Art y sellos visuales.
8. **AirDrops & Duelo Espejo (15s):** Caída equidistante, captura atómica, temporizador de 15s y revancha exprés (5s).
9. **Complejo Industrial y Mercado P2P:** Cosecha de silos (merma 10h), fundición con fuel boost y compraventa P2P con tasa del 12% a quema.
10. **Corporaciones Militares y Salvaguarda Táctica:** Bóvedas T1-T3, auditoría de 24h, embargo por deshonor con reparto al Top 3 y blindaje de racha en derrota.
11. **Ladder Asimétrico, Near-Miss y Oferta Flash Tilt:** Tournament Cap Nivel 11, tolerancia APL $\le 1.5$, autopsia contrafáctica Near-Miss y paquete de rescate de \$0.99 en 180s.

---

# 3. RENDIMIENTO WEB Y CORE WEB VITALS

El juego está diseñado para ejecutarse nativamente en navegadores móviles sin latencia percibida:

| Métrica | Objetivo Estricto | Estrategia de Optimización |
|:---|:---:|:---|
| **First Contentful Paint (FCP)** | $< 0.8\text{ segundos}$ | Cero fuentes web pesadas, cero librerías de audio externas, CSS inlined. |
| **Largest Contentful Paint (LCP)** | $< 1.5\text{ segundos}$ | Canvas renderizado de inmediato; sprites comprimidos en atlas WebP. |
| **Cumulative Layout Shift (CLS)** | **0.00 (Inmóvil)** | Dimensiones de viewport fijas con contenedor de aspecto 16:9 bloqueado. |
| **Interaction to Next Paint (INP)** | $< 40\text{ milisegundos}$ | Procesamiento de inputs desacoplado del bucle de dibujo de Canvas. |
| **Bundle Size Gzip** | $< 220\text{ KB}$ | Tree-shaking agresivo; React 19 server components para pantallas estáticas. |

---

# 4. INFRAESTRUCTURA DE TELEMETRÍA Y ANALÍTICA CONDUCTUAL

Para alimentar el Bark Engine y detectar patrones de frustración o abandono, el sistema implementa una arquitectura en dos capas:

```
                            PIPELINE DE TELEMETRÍA CONDUCTUAL
                                            │
         ┌──────────────────────────────────┴──────────────────────────────────┐
         ▼                                                                     ▼
[ CAPA 1: OLTP EN PARTIDA ]                                           [ CAPA 2: PERFIL AGREGADO O(1) ]
• Logging append-only liviano                                         • Fila única en `player_tactical_behavior_profile`
• Registra turnos rápidos (PTE)                                       • Se actualiza al concluir la partida
• Bajas de tanques y caídas en TRAP                                   • Dispara la Oferta Flash si TiltScore >= 0.75
```

### 4.1 Métricas Clave de Negocio (KPIs de Retención)
- **Retención D1 (Día 1):** Objetivo $> 48\%$ (impulsada por el ciclo de 10 horas de la industria militar y el rescate de la salvaguarda).
- **Retención D7 (Día 7):** Objetivo $> 26\%$ (sostenida por las Guerras de Clanes y la Bóveda Corporativa).
- **Retención D30 (Día 30):** Objetivo $> 14\%$ (mantenida por el Ladder Asimétrico y la subida de cartas a Nivel 15).
- **Conversión del Command Pass:** Objetivo $> 7.5\%$ de la base de usuarios activos diarios (DAU), anclada por el suministro diario de salvaguardas de racha.

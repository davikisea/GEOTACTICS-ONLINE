# Master Checklist: Metajuego Territorial Soberano 100%

- [x] **Fase 1: Lienzo Vivo del Mapa Mundial y Consola Lateral de Metamando (Victoria 3 × Wplace)** <!-- id: 0 -->
  - [x] Montar `WorldMapCanvas` como lienzo interactivo principal a pantalla completa en `WarLobbyHub.tsx` (0% mock data) <!-- id: 1 -->
  - [x] Convertir `CommanderLivingVignette` (con Bark Engine) en viñeta cómic diegética flotante en el cuadrante izquierdo <!-- id: 2 -->
  - [x] Implementar la Consola Lateral Desplegable/Plegable en el borde derecho (`MetaCommandConsole`) con física de resorte (`cubic-bezier(0.34, 1.56, 0.64, 1)`) <!-- id: 3 -->
  - [x] Pestaña 1: Inspector del Sector & Asedio Risk (`SectorTacticalInspector`) con barras TCP y orden de asedio <!-- id: 4 -->
  - [x] Pestaña 2: Mando de Guarniciones IA & Rebalanceo (`GarrisonCommanderDock`) con inversión de EC <!-- id: 5 -->
  - [x] Pestaña 3: Hangar Táctico & Refuerzos (`ReinforcementLoadoutDock`) con visualización de contingente <!-- id: 6 -->
  - [x] Pestaña 4: Ticker Económico Wplace & Upkeep (`WplaceEconomyTicker`) <!-- id: 7 -->

- [x] **Fase 2: Persistencia Total del Hangar Físico y Patentes Tecnológicas** <!-- id: 8 -->
  - [x] Crear hook `useUserHangar.ts` conectado a `public.user_unit_hangar` y `public.user_patents` <!-- id: 9 -->
  - [x] Conectar `UnitHangarModal.tsx` con Supabase (eliminar arrays mock en memoria de unidades y patentes) <!-- id: 10 -->
  - [x] Persistir la forja de unidades T1-T5 y el desbloqueo de patentes permanentes con deducción de recursos reales <!-- id: 11 -->

- [x] **Fase 3: Mando de Guarnición IA y Rebalanceo en Base de Datos** <!-- id: 12 -->
  - [x] Conectar `GarrisonManagementDrawer.tsx` con `public.garrison_deployments` <!-- id: 13 -->
  - [x] Integrar `GarrisonAIEngine.calculateRebalance()` para deducción real de EC y subida de nivel de IA (1 a 5) en PostgreSQL <!-- id: 14 -->
  - [x] Sincronización del envejecimiento de 21 días reales para comandantes legendarios <!-- id: 15 -->

- [x] **Fase 4: Mercado Libre P2P con Canon del 2% y Conexión Supabase** <!-- id: 16 -->
  - [x] Refactorizar `P2PMarketplaceView.tsx` (eliminar tasa vieja del 12% y listas simuladas) <!-- id: 17 -->
  - [x] Conectar con `public.p2p_market_orders` y aplicar bandas VWAP Collar $\pm 25\%$ <!-- id: 18 -->
  - [x] Liquidación transaccional con split canónico del 2% (1% sink permanente + 1% regalía clan) vía RPC `execute_p2p_market_transaction` <!-- id: 19 -->

- [x] **Fase 5: Motor de Generación Continua por Minuto (Ticker Wplace & Upkeep)** <!-- id: 20 -->
  - [x] Implementar hook/servicio reactivo `useTerritoryEconomyTicker` <!-- id: 21 -->
  - [x] Acumular en vivo el `output_per_min` de nodos controlados (multiplicado 2.0x en capitales) <!-- id: 22 -->
  - [x] Aplicar periódicamente la deducción de upkeep energético y sobre-expansión $\Psi_{\text{Over}}$ <!-- id: 23 -->

- [x] **Fase 6: Inyección de Contexto Territorial al Combate Táctico (`App.tsx`)** <!-- id: 24 -->
  - [x] Al pulsar "Declarar Asedio" o "¡Batalla!", transferir a `App.tsx` el bioma de provincia (`base_terrain`), clima (`native_weather`) y nivel de IA de la guarnición <!-- id: 25 -->
  - [x] Vincular el botón de refuerzos en combate de `COCommandBar.tsx` con el contingente real del hangar del jugador <!-- id: 26 -->

- [x] **Fase 7: Verificación Integral, Pruebas y Compilación** <!-- id: 27 -->
  - [x] Ejecutar suite completa `npm run test:metagame` (30/30 pruebas deterministas pasaron) <!-- id: 28 -->
  - [x] Compilación de producción con Vite (`npx vite build` completada con éxito en 3.93s, 0 errores) <!-- id: 29 -->
  - [x] Documentar la arquitectura y resultados finales en `walkthrough.md` <!-- id: 30 -->

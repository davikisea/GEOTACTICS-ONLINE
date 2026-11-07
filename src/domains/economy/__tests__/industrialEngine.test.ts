/**
 * ==============================================================================
 * PRUEBAS UNITARIAS: MOTOR INDUSTRIAL MILITAR Y MERCADO P2P
 * ==============================================================================
 * Proyecto: Tactical Command: Wars of Legacy
 * Especificación Canónica: docs/02_MASTER_METAGAME_INDUSTRY_ECONOMY.md §2 & §3
 * Base de Datos: docs/04_MASTER_DATABASE_AND_SECURITY_SPEC.md §3.2 (harvest & execute_p2p)
 */

import {
  IndustrialEngine,
  IndustrialInventory,
  REFINING_RECIPES,
  P2PPriceReference,
  IndustrialPlot,
  StrandedCargo,
  CARD_UPGRADE_TABLE,
  PLOT_UNLOCK_TABLE
} from '@domains/economy';

describe('Motor del Complejo Industrial Militar & Mercado P2P', () => {
  const createMockInventory = (overrides?: Partial<IndustrialInventory>): IndustrialInventory => ({
    userId: 'user_test_01',
    rawIron: 500,
    rawStone: 400,
    rawRareEarth: 200,
    refinedSteel: 20,
    refinedConcrete: 15,
    refinedMicrochip: 10,
    campaignFuel: 3,
    specialization: 'none',
    lastHarvestAt: Date.now(),
    ...overrides,
  });

  describe('1. Extracción en Silos y Carcoma Logística (10 Horas)', () => {
    it('debe acumular materia prima linealmente durante las primeras 10 horas', () => {
      const now = Date.now();
      const fourHoursAgo = now - 4 * 3600 * 1000;
      const inv = createMockInventory({ lastHarvestAt: fourHoursAgo });

      const status = IndustrialEngine.calculateSiloStatus(inv, now);

      // 4 horas x 50 hierro/h = 200
      expect(status.accumulatedIron).toBe(200);
      // 4 horas x 40 piedra/h = 160
      expect(status.accumulatedStone).toBe(160);
      // 4 horas x 15 raras/h = 60
      expect(status.accumulatedRareEarth).toBe(60);

      expect(status.hasDecay).toBe(false);
      expect(status.decayLossPercentage).toBe(0);
      expect(status.isCapacityReached).toBe(false);
    });

    it('debe aplicar la carcoma logística (2.5% por hora extra) al superar las 10 horas de inactividad', () => {
      const now = Date.now();
      const fourteenHoursAgo = now - 14 * 3600 * 1000; // 4 horas de exceso
      const inv = createMockInventory({ lastHarvestAt: fourteenHoursAgo });

      const status = IndustrialEngine.calculateSiloStatus(inv, now);

      expect(status.hasDecay).toBe(true);
      expect(status.isCapacityReached).toBe(true);
      // 4 horas de exceso * 2.5% = 10% de merma
      expect(status.decayLossPercentage).toBe(10);

      // Base a las 10h: 500 hierro. Con 10% merma -> 450 hierro
      expect(status.accumulatedIron).toBe(450);
      // Base a las 10h: 400 piedra. Con 10% merma -> 360 piedra
      expect(status.accumulatedStone).toBe(360);
      // Base a las 10h: 150 raras. Con 10% merma -> 135 raras
      expect(status.accumulatedRareEarth).toBe(135);
    });

    it('debe transferir los recursos cosechados al inventario y reiniciar el ciclo', () => {
      const now = Date.now();
      const sixHoursAgo = now - 6 * 3600 * 1000;
      const inv = createMockInventory({ rawIron: 100, lastHarvestAt: sixHoursAgo });

      const result = IndustrialEngine.harvestSilos(inv, now);

      // 6h x 50 = 300 hierro cosechado + 100 previo = 400
      expect(result.harvestedIron).toBe(300);
      expect(result.updatedInventory.rawIron).toBe(400);
      expect(result.updatedInventory.lastHarvestAt).toBe(now);
    });
  });

  describe('2. Especializaciones Corporativas', () => {
    it('Consorcio Vulcano debe incrementar la extracción de hierro un 35% y reducir tierras raras un 15%', () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 3600 * 1000;
      const inv = createMockInventory({ specialization: 'vulcan', lastHarvestAt: twoHoursAgo });

      const status = IndustrialEngine.calculateSiloStatus(inv, now);

      // 2h x (50 * 1.35 = 67.5) = 135 hierro
      expect(status.accumulatedIron).toBe(135);
      // 2h x (15 * 0.85 = 12.75) = 25 tierras raras
      expect(status.accumulatedRareEarth).toBe(25);
    });

    it('Ingeniería Titán debe aumentar la capacidad de los silos en un 50%', () => {
      const inv = createMockInventory({ specialization: 'titan' });
      const status = IndustrialEngine.calculateSiloStatus(inv);

      // 500 * 1.5 = 750
      expect(status.maxIronCapacity).toBe(750);
      // 400 * 1.5 = 600
      expect(status.maxStoneCapacity).toBe(600);
      // 150 * 1.5 = 225
      expect(status.maxRareEarthCapacity).toBe(225);
    });
  });

  describe('3. Altos Hornos de Fundición y Aceleración con Combustible', () => {
    it('debe iniciar un trabajo de refinado de acero descontando 100 de hierro', () => {
      const now = Date.now();
      const inv = createMockInventory({ rawIron: 250 });

      const result = IndustrialEngine.startRefiningJob(inv, 'refined_steel', false, now);

      expect(result.success).toBe(true);
      expect(result.updatedInventory?.rawIron).toBe(150);
      expect(result.job?.outputRefinedAmount).toBe(10);
      // 240 minutos = 4 horas
      expect(result.job?.completesAt).toBe(now + 240 * 60 * 1000);
    });

    it('debe reducir el tiempo al 50% al sobrecargar con Combustible de Campaña', () => {
      const now = Date.now();
      const inv = createMockInventory({ rawIron: 200, campaignFuel: 2 });

      const result = IndustrialEngine.startRefiningJob(inv, 'refined_steel', true, now);

      expect(result.success).toBe(true);
      expect(result.updatedInventory?.campaignFuel).toBe(1);
      // Con combustible: 240 / 2 = 120 minutos
      expect(result.job?.completesAt).toBe(now + 120 * 60 * 1000);
    });

    it('debe impedir recolectar un trabajo antes de su tiempo de finalización', () => {
      const now = Date.now();
      const inv = createMockInventory();
      const jobResult = IndustrialEngine.startRefiningJob(inv, 'refined_concrete', false, now);

      const collectResult = IndustrialEngine.collectRefiningJob(inv, jobResult.job!, now + 1000); // Solo 1 seg después
      expect(collectResult.success).toBe(false);
      expect(collectResult.errorMessage).toContain('aún no ha finalizado');
    });

    it('debe recolectar con éxito los materiales procesados una vez transcurrido el tiempo', () => {
      const now = Date.now();
      const inv = createMockInventory({ refinedConcrete: 10 });
      const jobResult = IndustrialEngine.startRefiningJob(inv, 'refined_concrete', false, now);

      // Reclamar en el momento exacto de finalización
      const collectResult = IndustrialEngine.collectRefiningJob(
        inv,
        jobResult.job!,
        jobResult.job!.completesAt + 10
      );

      expect(collectResult.success).toBe(true);
      // 10 existentes + 15 del lote = 25
      expect(collectResult.updatedInventory?.refinedConcrete).toBe(25);
      expect(collectResult.updatedJob?.isCollected).toBe(true);
    });
  });

  describe('4. Mercado Libre P2P, Tasa de Quema del 12% y Bandas de Precio (±35%)', () => {
    const mockReference: P2PPriceReference = {
      resourceType: 'refined_steel',
      movingAveragePriceGold: 50,
      collarMinPriceGold: 32, // -35%
      collarMaxPriceGold: 68, // +35%
      volume24h: 1000,
    };

    it('debe calcular las bandas de precio dinámicas (±35% del PMM)', () => {
      const collars = IndustrialEngine.calculatePriceCollars(50);
      expect(collars.minPrice).toBe(32);
      expect(collars.maxPrice).toBe(68);
    });

    it('debe rechazar órdenes de venta con precio fuera de las bandas de mercado', () => {
      const inv = createMockInventory({ refinedSteel: 50 });

      // Intento con 100G (muy por encima de 68G)
      const highResult = IndustrialEngine.createMarketListing(
        'seller_01',
        'Vendedor',
        'refined_steel',
        10,
        100,
        mockReference,
        inv
      );
      expect(highResult.success).toBe(false);
      expect(highResult.errorMessage).toContain('Precio fuera de banda');

      // Intento con 10G (muy por debajo de 32G)
      const lowResult = IndustrialEngine.createMarketListing(
        'seller_01',
        'Vendedor',
        'refined_steel',
        10,
        10,
        mockReference,
        inv
      );
      expect(lowResult.success).toBe(false);
    });

    it('debe crear una orden válida en custodia descontando del inventario del vendedor', () => {
      const inv = createMockInventory({ refinedSteel: 50 });

      const result = IndustrialEngine.createMarketListing(
        'seller_01',
        'Mayor Stella',
        'refined_steel',
        20,
        50,
        mockReference,
        inv
      );

      expect(result.success).toBe(true);
      expect(result.updatedInventory?.refinedSteel).toBe(30); // 50 - 20 = 30
      // 20 * 50 = 1000G
      expect(result.listing?.totalPriceGold).toBe(1000);
      // Tasa 12% de 1000 = 120G
      expect(result.listing?.taxDeductedGold).toBe(120);
      // Neto vendedor 88% = 880G
      expect(result.listing?.netSellerRevenueGold).toBe(880);
    });

    it('debe ejecutar la compra atómica P2P: cobrar 100% al comprador, quemar 12% y pagar 88% al vendedor', () => {
      const sellerInv = createMockInventory({ refinedSteel: 50 });
      const listingResult = IndustrialEngine.createMarketListing(
        'seller_01',
        'Vendedor',
        'refined_steel',
        10,
        50,
        mockReference,
        sellerInv
      );

      const listing = listingResult.listing!;
      const buyerInv = createMockInventory({ refinedSteel: 0 });
      const buyerGold = 1000;
      const sellerGold = 500;

      const purchaseResult = IndustrialEngine.executeP2PPurchase(
        listing,
        'buyer_02',
        buyerGold,
        buyerInv,
        sellerGold
      );

      expect(purchaseResult.success).toBe(true);
      // Comprador paga 500G total (10 x 50G): 1000 - 500 = 500G
      expect(purchaseResult.updatedBuyerGold).toBe(500);
      // Comprador recibe los 10 de acero
      expect(purchaseResult.updatedBuyerInventory?.refinedSteel).toBe(10);
      // Vendedor recibe el 88% (440G) de 500G: 500 + 440 = 940G
      expect(purchaseResult.updatedSellerGold).toBe(940);
      // La tasa quemada fue de 60G (12% de 500G)
      expect(listing.taxDeductedGold).toBe(60);
      expect(purchaseResult.updatedListing?.status).toBe('sold');
    });
  });

  describe('5. Cuadrícula de Parcelas Territoriales y Ciclo Circadiano (12h + 4h Gracia)', () => {
    const mockPlots: IndustrialPlot[] = [
      { id: 'p1', userId: 'user_01', plotIndex: 1, enterpriseType: 'mine_iron', tier: 1, status: 'active' },
      { id: 'p2', userId: 'user_01', plotIndex: 2, enterpriseType: 'quarry_stone', tier: 1, status: 'active' },
      { id: 'p3', userId: 'user_01', plotIndex: 3, enterpriseType: 'drill_rare_earth', tier: 1, status: 'active' },
    ];

    it('debe acumular recursos con Bono de Eficiencia (+10% y +500G) si cosecha antes de 12 horas', () => {
      const now = Date.now();
      const sixHoursAgo = now - 6 * 3600 * 1000;

      const result = IndustrialEngine.calculateTerritoryStatus(mockPlots, sixHoursAgo, now);

      expect(result.elapsedHours).toBe(6);
      expect(result.isSaturated).toBe(false);
      expect(result.hasDecay).toBe(false);
      expect(result.efficiencyBonusApplied).toBe(true);
      expect(result.efficiencyBonusCredits).toBe(500);

      // Base: 6h x 60 hierro = 360. Con +10% eficiencia -> floor(360 * 1.10) = 396
      expect(result.accumulatedIron).toBe(396);
      // Base: 6h x 50 piedra = 300. Con +10% -> 330
      expect(result.accumulatedStone).toBe(330);
      // Base: 6h x 25 raras = 150. Con +10% -> 165
      expect(result.accumulatedRareEarth).toBe(165);
    });

    it('debe congelar la producción durante la Ventana de Gracia (horas 12 a 16) sin aplicar merma', () => {
      const now = Date.now();
      const fourteenHoursAgo = now - 14 * 3600 * 1000; // 14 horas: 12h base + 2h en gracia

      const result = IndustrialEngine.calculateTerritoryStatus(mockPlots, fourteenHoursAgo, now);

      expect(result.elapsedHours).toBe(14);
      expect(result.effectiveHours).toBe(12); // Producción congelada a las 12h
      expect(result.isSaturated).toBe(true);
      expect(result.hasDecay).toBe(false); // CERO pérdida en gracia
      expect(result.decayLossPercentage).toBe(0);
      expect(result.graceHoursRemaining).toBe(2); // Restan 2 horas de gracia

      // 12h x 60 = 720 hierro (sin merma)
      expect(result.accumulatedIron).toBe(720);
      // 12h x 50 = 600 piedra
      expect(result.accumulatedStone).toBe(600);
      // 12h x 25 = 300 raras
      expect(result.accumulatedRareEarth).toBe(300);
    });
  });

  describe('6. Merma Suavizada (-1.5%/h) y Salvamento de Cargamento Militar Varado (70%)', () => {
    const mockPlots: IndustrialPlot[] = [
      { id: 'p1', userId: 'user_01', plotIndex: 1, enterpriseType: 'mine_iron', tier: 1, status: 'active' },
      { id: 'p2', userId: 'user_01', plotIndex: 2, enterpriseType: 'quarry_stone', tier: 1, status: 'active' },
      { id: 'p3', userId: 'user_01', plotIndex: 3, enterpriseType: 'drill_rare_earth', tier: 1, status: 'active' },
    ];

    it('debe aplicar 1.5% de merma tras superar las 16 horas y derivar el 70% a cargamento varado', () => {
      const now = Date.now();
      const twentyHoursAgo = now - 20 * 3600 * 1000; // 20 horas: 4 horas de exceso sobre las 16h seguras

      const result = IndustrialEngine.calculateTerritoryStatus(mockPlots, twentyHoursAgo, now);

      expect(result.elapsedHours).toBe(20);
      expect(result.effectiveHours).toBe(12);
      expect(result.hasDecay).toBe(true);
      // 4 horas de exceso x 1.5% = 6% de merma
      expect(result.decayLossPercentage).toBe(6);

      // Base a las 12h: 720 hierro. Pérdida 6% = 43.2. Neto = floor(720 * 0.94) = 676
      expect(result.accumulatedIron).toBe(676);
      // De los ~43 perdidos, el 70% se va a varado: floor(720 * 0.06 * 0.70) = 30 hierro
      expect(result.strandedIron).toBe(30);

      // Base piedra: 600. Neto = floor(600 * 0.94) = 564. Varado = floor(600 * 0.06 * 0.70) = 25
      expect(result.accumulatedStone).toBe(564);
      expect(result.strandedStone).toBe(25);
    });

    it('debe recuperar el 100% del cargamento varado al ganar combate', () => {
      const inv = createMockInventory({ rawIron: 100 });
      const stranded: StrandedCargo = {
        userId: inv.userId,
        strandedIron: 50,
        strandedStone: 40,
        strandedRareEarth: 15,
        strandedFuel: 2,
      };

      const result = IndustrialEngine.recoverStrandedCargo(inv, stranded);

      expect(result.recoveredIron).toBe(50);
      expect(result.updatedInventory.rawIron).toBe(150); // 100 + 50
      expect(result.updatedInventory.campaignFuel).toBe(5); // 3 + 2
    });
  });

  describe('7. Cola de Refinado Multi-Batch (hasta 3 ciclos consecutivos)', () => {
    it('debe admitir hasta 3 tandas acumuladas consumiendo recursos y produciendo 3x en un solo encargo', () => {
      const now = Date.now();
      const inv = createMockInventory({ rawIron: 500, campaignFuel: 3 });

      // Iniciar 3 tandas aceleradas con combustible
      const result = IndustrialEngine.startRefiningJob(inv, 'refined_steel', true, now, 3);

      expect(result.success).toBe(true);
      expect(result.job?.batchCount).toBe(3);
      // 100 x 3 = 300 hierro consumido (500 - 300 = 200 restante)
      expect(result.updatedInventory?.rawIron).toBe(200);
      // 3 barriles de combustible consumidos
      expect(result.updatedInventory?.campaignFuel).toBe(0);
      // Output: 10 x 3 = 30 vigas
      expect(result.job?.outputRefinedAmount).toBe(30);
      // Duración: 240 / 2 = 120 mins x 3 = 360 mins (6 horas)
      expect(result.job?.completesAt).toBe(now + 360 * 60 * 1000);
    });
  });

  describe('8. Curva Calibrada de Cartas y Desbloqueo Territorial', () => {
    it('debe exigir exactamente los requerimientos del Cap de Torneo en Nivel 11 (20 microchips)', () => {
      const reqN11 = IndustrialEngine.getCardUpgradeRequirements(10); // Para subir a N11

      expect(reqN11).toBeDefined();
      expect(reqN11?.targetLevel).toBe(11);
      expect(reqN11?.isTournamentCap).toBe(true);
      expect(reqN11?.blueprints).toBe(1100);
      expect(reqN11?.credits).toBe(20000);
      expect(reqN11?.refinedSteel).toBe(120);
      expect(reqN11?.refinedConcrete).toBe(65);
      expect(reqN11?.refinedMicrochip).toBe(20); // Calibrado para eliminar el déficit
    });

    it('debe exigir materiales estratégicos en el Endgame Nivel 12', () => {
      const reqN12 = IndustrialEngine.getCardUpgradeRequirements(11); // Para subir a N12

      expect(reqN12).toBeDefined();
      expect(reqN12?.targetLevel).toBe(12);
      expect(reqN12?.isTournamentCap).toBe(false);
      expect(reqN12?.strategicMaterial?.name).toBe('Nano-Aleaciones');
      expect(reqN12?.strategicMaterial?.amount).toBe(10);
    });

    it('debe otorgar Parcela 3 gratuita en el tutorial de Nivel 2 y tarifar Parcela 4 en Nivel 4', () => {
      const p3 = IndustrialEngine.getPlotUnlockCost(3);
      expect(p3?.requiredAccountLevel).toBe(2);
      expect(p3?.costCredits).toBe(0);
      expect(p3?.isFreeTutorial).toBe(true);

      const p4 = IndustrialEngine.getPlotUnlockCost(4);
      expect(p4?.requiredAccountLevel).toBe(4);
      expect(p4?.costCredits).toBe(1000);
    });

    it('debe convertir comodines tácticos a planos en proporción 1:1', () => {
      const conv = IndustrialEngine.convertWildcardsToBlueprints(100, 35);
      expect(conv.success).toBe(true);
      expect(conv.blueprintsGranted).toBe(35);
      expect(conv.remainingWildcards).toBe(65);
    });
  });

  describe('9. Estabilizador de Liquidez: Banco Central de Intendencia Militar (NPC)', () => {
    it('debe absorber órdenes activas tras 6 horas de inactividad garantizando liquidez', () => {
      const now = Date.now();
      const staleOrders = [
        {
          id: 'order_stale_01',
          sellerId: 'user_01',
          sellerName: 'Vendedor',
          resourceType: 'refined_microchip' as const,
          quantity: 10,
          pricePerUnitGold: 120,
          totalPriceGold: 1200,
          taxDeductedGold: 144,
          netSellerRevenueGold: 1056,
          status: 'active' as const,
          createdAt: now - 7 * 3600 * 1000, // 7 horas (mayor a 6h)
        },
        {
          id: 'order_recent_02',
          sellerId: 'user_02',
          sellerName: 'Vendedor 2',
          resourceType: 'refined_steel' as const,
          quantity: 20,
          pricePerUnitGold: 50,
          totalPriceGold: 1000,
          taxDeductedGold: 120,
          netSellerRevenueGold: 880,
          status: 'active' as const,
          createdAt: now - 2 * 3600 * 1000, // 2 horas (reciente)
        },
      ];

      const result = IndustrialEngine.fulfillStaleP2POrders(staleOrders, now);

      expect(result.fulfilledCount).toBe(1);
      expect(result.totalCreditsDisbursed).toBe(1056);
      expect(result.updatedListings[0].status).toBe('sold');
      expect(result.updatedListings[1].status).toBe('active');
    });
  });
});
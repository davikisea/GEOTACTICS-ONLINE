export interface DocItem {
  id: string;
  filename: string;
  title: string;
  badge: string;
  summary: string;
  sections: {
    heading: string;
    content: string;
    codeSnippet?: {
      language: string;
      code: string;
    };
  }[];
}

export const GAME_DOCUMENTS: DocItem[] = [
  {
    id: '01_gdd',
    filename: 'docs/01_GAME_DESIGN_DOCUMENT.md',
    title: 'Game Design Document (GDD)',
    badge: 'Core Design',
    summary: 'Visión general, bucle de juego principal, matriz de unidades tácticas, modificadores de terreno y monetización ética.',
    sections: [
      {
        heading: '1. Resumen Ejecutivo y los Tres Pilares Fundacionales',
        content: `**Tactical Command: Wars of Legacy** es un TBS sobre cuadrícula ejecutado en navegador web que fusiona:
- **Pilar 1 (Advance Wars GBA):** Determinismo táctico total, cero azar (RNG = 0) en combate, estrellas defensivas proporcionales al HP, niebla de guerra estricta con emboscada TRAP y captura de 20 HP.
- **Pilar 2 (Progresión Asimétrica):** Mazo de 10 cartas disponible en fábricas con Libertad Orgánica (0 cooldowns), Soft Cap de suministros (14 tropas), escalado contenido (+2.0%/lvl) y Cap de Torneo forzoso en Nivel 11.
- **Pilar 3 (Bark Engine en Cómic):** Narrativa contextual estilo Hades 100% visual en viñetas de historieta (sin voces), con bocadillos dinámicos y sellos de onomatopeyas Pop-Art (¡BOOM!, ¡ALERT!, ¡CLUTCH!, ¡SINK!, ¡CRASH!).`
      },
      {
        heading: '2. Modos de Juego y Despliegue en Fábricas',
        content: `1. **Duelo Táctico Espejo (Mirror Duel):** Mapas 10x10 simétricos, 15s por turno estricto, economía acelerada 1.5x ($1500G/propiedad), bono de apertura $3000G, límite 12 turnos, revancha exprés 5s.
2. **Escaramuza Rápida (Blitz Skirmish):** Mapas 12x12 a 16x16, 30s por turno, economía acelerada x2 ($2000G/propiedad), libertad orgánica de fábrica, límite de 15 turnos.
3. **Campaña Táctica (Grand Campaign):** Mapas 24x24 a 32x32, 60s por turno, economía estándar ($1000G/propiedad), partidas de hasta 40 turnos.
4. **Mazo de 10 Cartas y Suministros:** 2 obligatorias (Infantería Ligera y Mecanizada) + 8 flexibles categorizadas (mín 2 directas, mín 1 antiaéreo, máx 2 super-pesadas). Sostenimiento logístico con Soft Cap en 14 tropas ($200G de mantenimiento por unidad excedente).`
      },
      {
        heading: '3. Terreno, Cobertura y Regla de Emboscada TRAP',
        content: `Cada estrella de terreno reduce el daño recibido proporcionalmente a los HP del defensor:
- **Llanura (1★):** Terreno neutro estándar (costo pie: 1, ruedas: 2, orugas: 1).
- **Bosque (2★):** Oculta unidades en Niebla. Si una tropa aliada intenta cruzar un bosque con enemigo oculto, se interrumpe el movimiento en seco (TRAP), pierde el turno y revela al rival.
- **Montaña (4★):** 40% reducción de daño. Otorga +3 casillas de visión a infantería. Infranqueable para ruedas y tanques.
- **Carretera (0★) y Río (0★):** Vías rápidas o cruces lentos sin cobertura defensiva.
- **Propiedades (Ciudades/Fábricas/HQ - 3★/4★):** Generan fondos y reparan +2 HP/turno descontando fondos (10% del valor de producción por HP).`
      },
      {
        heading: '4. Matriz de Combate, Catálogo de 16 Unidades, 28 COs y Sistemas Avanzados de WarsWorld',
        content: `Fórmula Oficial Advance Wars:
- attackFactor = floor(baseDamage * (attackModifier / 100) + luckModifier)  [attackModifier incluye +10% por torre de comunicación]
- defenseFactor = floor(200 - (defenseModifier + defenderTerrainStars * defenderHP)) / 100
- damagePercent = max(1, floor(attackFactor * (attackerHP / 10) * defenseFactor))
- Daño Infringido = min(defenderHP, max(1, floor(damagePercent / 10)))
- Catálogo de 16 Unidades: Infantería, Mech, Recon, APC, Tanque Ligero, Tanque Medio, Neotanque, Artillería, Lanzacohetes, Antiaéreo Vulcan, Misiles AA, B-Copter, T-Copter, Caza, Bombardero y Acorazado Naval.
- Logística de Combustible y Reglas Fatales de Crash / Sink:
  * Aeronaves consumen fuel por turno (Cazas/Bombarderos 5, Copters 2, Stealth 8, descuento Eagle -2). Al llegar a 0 fuel, ¡se estrellan en el aire y son destruidas (Crash)!
  * Submarinos sumergidos consumen 5 fuel/turno. Al llegar a 0 fuel, ¡se hunden fatalmente (Sink)!
- Reparación y Reabastecimiento con Tarifa Financiera en Propiedades:
  * Reabastecimiento gratuito de combustible y munición en instalaciones aliadas compatibles.
  * Reparación de +2 HP (+3 HP para Rachel) cobrando del tesoro el 10% del valor de producción por cada HP curado.
- Victoria por Toma de Cuartel General (HQ) y Transferencia Total:
  * Al capturar el HQ rival, todas las propiedades enemigas se transfieren al vencedor y las tropas enemigas se disuelven.
- Habilidades Especiales y Transporte Dual:
  * Black Bomb: Autodestrucción de 5 PV de daño en área radio 3.
  * Silos de Misiles: 3 PV de daño puro en diamante radio 2 activado por infantería.
  * Lander Dual: Capacidad de embarque para hasta 2 tanques pesados con desembarque selectivo individual.
  * Cruiser Dual: Capacidad para transportar hasta 2 helicópteros de combate.
- Mapeador Universal AWBW (+190 Baldosas):
  * Soporte nativo para costuras de tubería de 100 HP destructibles (pipeSeam), ríos, carreteras, arrecifes y torres de telecomunicaciones (+10% ataque c/u).`
  * Lander Dual: Capacidad de embarque para hasta 2 tanques pesados con desembarque selectivo individual.
  * Cruiser Dual: Capacidad para transportar hasta 2 helicópteros de combate.
- Mapeador Universal AWBW (+190 Baldosas):
  * Soporte nativo para costuras de tubería de 100 HP destructibles (pipeSeam), ríos, carreteras, arrecifes y torres de telecomunicaciones.`
      },
      {
        heading: '5. Sistema de Diseño Frontend: Skill Canónica retro-futurism',
        content: `Toda la interfaz del juego (HUD, barras de mando, modales de producción, armería, tienda y viñetas de cómic) sigue de manera estricta y vinculante la especificación de diseño de la skill **retro-futurism** (agents/skills/retro-futurism/skill.md):
- **Estética Atompunk / Space-Age 1950s:** Diseño limpio, optimista y brillante ("Clean, optimistic and shiny", no steampunk sucio).
- **Geometría Aerodinámica Asimétrica:** Sin rectángulos genéricos. Las tarjetas tácticas y modales aplican bordes asimétricos curvos (border-radius: 40px 10px 40px 10px) y remates en estrella atómica (starburst).
- **Paleta Cromática Oficial:**
  * Fondo base ultra-oscuro: #2B2C24
  * Superficies de tarjetas y modales: Oliva Oscuro (#46521F)
  * Biseles y acentos de control: Verde Apagado (#7B8A4A)
  * Acciones primarias y alertas de combate: Naranja Óxido (#C46A3A)
  * Texto y números de máxima legibilidad: Crema (#F2E8D5)
  * Biseles cromados reflectantes mediante gradientes lineales.
- **Sombras Duras y Dramáticas:** box-shadow: 15px 15px 0px rgba(0,0,0,0.5).
- **Tipografía:** Geometric sans-serif de mediados de siglo (Futura, Trebuchet MS).`,
        codeSnippet: {
          language: 'css',
          code: `.atompunk-tactical-card {
  background-color: #46521F; /* Dark Olive */
  border: 4px solid #7B8A4A; /* Muted Green */
  border-radius: 40px 10px 40px 10px; /* Aerodynamic corners */
  box-shadow: 15px 15px 0px rgba(0,0,0,0.5); /* Hard offset shadow */
  color: #F2E8D5; /* Cream */
  font-family: 'Futura', 'Trebuchet MS', sans-serif;
}`
        }
      },
      {
        heading: '6. Suministros Dinámicos (AirDrops) y Modo Duelo Espejo (15s)',
        content: `Mecánicas de alta intensidad implementadas al 100% en el motor, canvas y HUD:
- **AirDrops Equidistantes:** Caída de suministros en turnos 2 y 5 (o 3 y 7 en Campaña) en casillas con equidistancia Manhattan estricta (|D1 - D2| <= 1) entre los dos HQs.
  * Recompensas: 50% Fondos ($2,000G-$3,000G), 35% Baterías Super-CO (100% de carga) o 15% Gemas (15 gemas).
  * Reclamación Atómica: Cualquier unidad que ocupe la celda reclama el botín al instante con viñeta reactiva ¡AIRDROP!
  * Expiración: Se autodestruye tras 2 turnos sin capturar.
- **Duelo Táctico Espejo (15s):**
  * Límite de 15 segundos por turno con alerta sonora y visual en <= 5s.
  * Árbitro Anti-AFK: Cede el turno automáticamente al llegar a 0s.
  * Multiplicador 1.5x de economía ($1,500G/propiedad) y bono inicial de +$3,000G.
  * Mapa oficial simétrico de 10x10 (mirror_arena_10x10) con rotación 180°.
  * Revancha Exprés (5s): Botón post-combate con cuenta atrás que reinicia el combate al instante.`
      }
    ]
  },
  {
    id: '02_db',
    filename: 'docs/02_DATABASE_SCHEMA.md',
    title: 'Esquema de Base de Datos Supabase (PostgreSQL)',
    badge: 'Database & RLS',
    summary: 'Estructura DDL completa para profiles, units_catalog, active_matches, match_state, políticas RLS y RPCs de recompensa.',
    sections: [
      {
        heading: '1. Arquitectura de Tablas y Relaciones',
        content: `El esquema se apoya en tablas normalizadas y seguras en PostgreSQL / Supabase:
1. **profiles:** Cuenta global, nivel (1-100), XP, Créditos, Gemas, Trofeos, PTE (Promedio de Tiempo de Espera) y mazo de 10 cartas equipado.
2. **user_cards:** Colección de cartas, niveles de unidad (1-15 con escalado +2.5%/lvl) y cartas duplicadas acumuladas.
3. **user_chest_slots:** Gestión de las 4 ranuras de cofres (Madera 3h, Hierro 8h, Blindado 12h) con reloj de desbloqueo.
4. **clans & clan_members:** Sistema de Clanes, donaciones de cartas y Guerras de Clanes.
5. **active_matches & match_state:** Sesiones en curso con modos de juego (Blitz Skirmish, Grand Campaign, 2v2), temporizadores (30s/60s) y tablero serializado.
6. **chat_messages:** Chat Global (Menú), Chat de Clan, Chat de Alianza (2v2) y Mensajería DM en partida con Quick Chat y filtro de toxicidad.
7. **match_history & user_unlocks:** Historial inmutable y registro de propiedad de comandantes y skins cosméticas.`
      },
      {
        heading: '2. Script SQL Completo de Tablas (DDL)',
        content: 'Ejecuta estas sentencias en el SQL Editor de Supabase:',
        codeSnippet: {
          language: 'sql',
          code: `CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(32) NOT NULL UNIQUE,
    account_level INTEGER NOT NULL DEFAULT 1 CHECK (account_level >= 1 AND account_level <= 100),
    current_xp INTEGER NOT NULL DEFAULT 0,
    battle_credits INTEGER NOT NULL DEFAULT 500,
    command_gems INTEGER NOT NULL DEFAULT 50,
    elo_rating INTEGER NOT NULL DEFAULT 1200,
    equipped_loadout JSONB NOT NULL DEFAULT '["infantry", "mech", "recon", "tank_light", "artillery"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.active_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(8) UNIQUE NOT NULL,
    player1_id UUID NOT NULL REFERENCES public.profiles(id),
    player2_id UUID REFERENCES public.profiles(id),
    current_turn_player_id UUID REFERENCES public.profiles(id),
    status VARCHAR(24) NOT NULL DEFAULT 'waiting',
    turn_number INTEGER NOT NULL DEFAULT 1,
    turn_deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);`
        }
      },
      {
        heading: '3. Procedimiento Almacenado RPC: award_match_rewards',
        content: 'Función SQL con elevación de privilegios (SECURITY DEFINER) para prevenir manipulación del cliente:',
        codeSnippet: {
          language: 'sql',
          code: `CREATE OR REPLACE FUNCTION public.award_match_rewards(
    p_match_id UUID,
    p_winner_id UUID,
    p_end_reason VARCHAR(32),
    p_final_stats JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_match public.active_matches%ROWTYPE;
    v_is_p1_winner BOOLEAN;
    v_p1_xp INTEGER := 0;
    v_p1_credits INTEGER := 0;
BEGIN
    SELECT * INTO v_match FROM public.active_matches WHERE id = p_match_id FOR UPDATE;
    v_is_p1_winner := (p_winner_id = v_match.player1_id);

    IF v_is_p1_winner THEN
        v_p1_xp := FLOOR((150 + LEAST(v_match.turn_number, 30) * 12) * 2.2)::INTEGER;
        v_p1_credits := FLOOR((80 + LEAST(v_match.turn_number, 30) * 8) * 2.0)::INTEGER;
    ELSE
        v_p1_xp := FLOOR((100 + LEAST(v_match.turn_number, 30) * 8) * 0.85)::INTEGER;
        v_p1_credits := FLOOR((50 + LEAST(v_match.turn_number, 30) * 5) * 0.8)::INTEGER;
    END IF;

    UPDATE public.profiles
    SET current_xp = current_xp + v_p1_xp,
        battle_credits = battle_credits + v_p1_credits,
        total_victories = CASE WHEN v_is_p1_winner THEN total_victories + 1 ELSE total_victories END
    WHERE id = v_match.player1_id;

    UPDATE public.active_matches SET status = 'finished', winner_id = p_winner_id WHERE id = p_match_id;

    RETURN jsonb_build_object('success', true, 'p1_xp', v_p1_xp, 'p1_credits', v_p1_credits);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`
        }
      }
    ]
  },
  {
    id: '03_engine',
    filename: 'docs/03_GAME_ENGINE_ARCHITECTURE.md',
    title: 'Arquitectura del Motor de Juego & Pathfinding',
    badge: 'Engine & Client',
    summary: 'Máquina de estados de entrada táctica, implementación de TypeScript de A* con costes de terreno y optimizaciones para Vercel.',
    sections: [
      {
        heading: '1. Modelo de Estado Optimista y Reconciliación',
        content: `El cliente ejecuta la animación inmediatamente al confirmar movimiento y encola un \`sequenceId\`. Si la respuesta del servidor indica colisión o trampa en Niebla de Guerra, se ejecuta un rollback fluido a la posición original.`
      },
      {
        heading: '2. Algoritmo A* Pathfinding (TypeScript)',
        content: 'Calcula el coste acumulado respetando la locomoción de la unidad e impidiendo el paso a través de unidades enemigas:',
        codeSnippet: {
          language: 'typescript',
          code: `export class TacticalPathfindingEngine {
  public static getReachableTiles(
    unit: TacticalUnit,
    tiles: TerrainTile[][],
    unitsMap: Map<string, TacticalUnit>,
    gridWidth: number,
    gridHeight: number
  ): GridPosition[] {
    const reachable: GridPosition[] = [];
    const costMap: number[][] = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(Infinity));
    const queue: { x: number; y: number; costSoFar: number }[] = [{ x: unit.x, y: unit.y, costSoFar: 0 }];
    costMap[unit.y][unit.x] = 0;

    const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

    while (queue.length > 0) {
      queue.sort((a, b) => a.costSoFar - b.costSoFar);
      const current = queue.shift()!;

      for (const d of dirs) {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;

        const tile = tiles[ny][nx];
        const stepCost = TERRAIN_COSTS[tile.type]?.[unit.movementType] ?? Infinity;
        if (stepCost === Infinity) continue;

        const occupant = Array.from(unitsMap.values()).find(u => u.x === nx && u.y === ny);
        if (occupant && occupant.ownerId !== unit.ownerId) continue; // Bloqueo enemigo

        const totalCost = current.costSoFar + stepCost;
        if (totalCost <= unit.movementPoints && totalCost < costMap[ny][nx]) {
          costMap[ny][nx] = totalCost;
          queue.push({ x: nx, y: ny, costSoFar: totalCost });
          if (!occupant || (occupant.x === unit.x && occupant.y === unit.y)) {
            reachable.push({ x: nx, y: ny });
          }
        }
      }
    }
    return reachable;
  }
}`
        }
      },
      {
        heading: '3. Despliegue en Vercel y CDN de Sprites',
        content: `Estrategia híbrida: páginas de Lobby y Armory en React Server Components (RSC) para carga ultra-veloz, y Canvas de partida en Client Component a 60 FPS con un único atlas WebP de 380 KB servido con cabeceras de caché inmutable (\`Cache-Control: public, max-age=31536000, immutable\`).`
      }
    ]
  },
  {
    id: '04_net',
    filename: 'docs/04_NETWORKING_AND_BOTS.md',
    title: 'Redes Realtime, Protocolo y Bots de IA',
    badge: 'Networking & AI',
    summary: 'Protocolo de mensajes sobre Supabase Realtime, prevención de trampas y árbol de decisión heurístico para la IA del Bot.',
    sections: [
      {
        heading: '1. Sincronización Realtime, PTE y Anti-AFK',
        content: `Uso integral de Supabase Realtime y lógica competitiva:
- **Broadcast & Changes:** Animaciones de trayectorias en vivo, cursores y mutación atómica de \`match_state\`.
- **Matchmaking por Ritmo (PTE):** Empareja jugadores según su Promedio de Tiempo de Espera (Blitz $\le 15$s, Estándar 16-35s, Analítico 36-60s) en 3 fases progresivas.
- **Reloj Dinámico Anti-AFK:** Reduce el turno al 50% tras el primer turno inactivo, a 10s en el segundo, y decreta derrota por abandono (Forfeit) al tercer turno consecutivo.
- **Modo 2v2 & Capa Social:** Turnos cruzados (A1 -> B1 -> A2 -> B2) con pings tácticos en mapa, chat global, salas de clan y DMs con botón "Mute".`
      },
      {
        heading: '2. Heurística de Decisión del Bot (TypeScript)',
        content: 'El Bot evalúa casillas de captura prioritaria y targets militares aplicando scoring de amenaza:',
        codeSnippet: {
          language: 'typescript',
          code: `export class TacticalBotAI {
  public static evaluateUnitActions(
    botUnit: TacticalUnit,
    gameState: GameEngineState,
    difficulty: 'easy' | 'normal' | 'hard'
  ): TacticalEvaluationScore {
    let bestScore = -Infinity;
    let chosenAction: TacticalEvaluationScore = { action: 'WAIT', score: 0 };
    const reachable = TacticalPathfindingEngine.getReachableTiles({
      unit: botUnit,
      tiles: gameState.tiles,
      unitsMap: gameState.units,
      gridWidth: gameState.gridWidth,
      gridHeight: gameState.gridHeight,
    });

    // Prioridad 1: Capturar ciudades o HQ enemigo
    if (botUnit.unitCode === 'infantry' || botUnit.unitCode === 'mech') {
      for (const pos of reachable) {
        const tile = gameState.tiles[pos.y][pos.x];
        if ((tile.type === 'city' || tile.type === 'hq') && tile.ownerId !== botUnit.ownerId) {
          const captureScore = tile.type === 'hq' ? 5000 : 800;
          if (captureScore > bestScore) {
            bestScore = captureScore;
            chosenAction = { action: 'CAPTURE', unitId: botUnit.id, targetPosition: pos, score: captureScore };
          }
        }
      }
    }
    return chosenAction;
  }
}`
        }
      }
    ]
  },
  {
    id: '05_monetization',
    filename: 'docs/05_MONETIZATION_AND_PROGRESSION.md',
    title: 'Modelos de Progresión, Fórmulas & Stripe',
    badge: 'Economy & Stripe',
    summary: 'Curva matemática de XP (150 * N^1.85), tabla de niveles 1 a 20 y arquitectura de pagos Stripe con webhooks idempotentes.',
    sections: [
      {
        heading: '1. Fórmula Matemática de Experiencia',
        content: `**Curva de Nivel:**
XP_Requerido(N) = floor(150 * N^1.85)

- Nivel 1 -> 2: 150 XP
- Nivel 5: 2,813 XP (Otorga 25 Gemas de Mando + Skin Tanque Desértico)
- Nivel 10: 9,839 XP (Otorga 50 Gemas + Insignia Veterano)
- Nivel 20: 34,228 XP (Skin Legendario de Cuartel General Ártico)

**Cálculo por Partida:**
XP = floor((120 + (Ciudades * 45) + (Bajas * 35) + min(Turnos, 30) * 6) * Multiplicador)
- Victoria: x 2.2
- Derrota: x 0.85
- Abandono: x 0.0 (Penalización)`
      },
      {
        heading: '2. Webhook Idempotente con Stripe (Vercel Route)',
        content: 'Verificación de firma criptográfica y llamada a RPC en PostgreSQL:',
        codeSnippet: {
          language: 'typescript',
          code: `export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature')!;
  const rawBody = await req.text();
  const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const gems = parseInt(session.metadata?.gems_amount || '0', 10);

    // RPC idempotente en Supabase
    await supabaseAdmin.rpc('fulfill_order_gems', {
      p_user_id: userId,
      p_stripe_session_id: session.id,
      p_amount_cents: session.amount_total || 0,
      p_gems_amount: gems,
      p_product_sku: session.metadata?.product_sku
    });
  }
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}`
        }
      }
    ]
  },
  {
    id: '06_roadmap',
    filename: 'docs/06_PROJECT_ROADMAP.md',
    title: 'Plan de Rodaje y Sprints (Project Roadmap)',
    badge: 'Roadmap & Sprints',
    summary: 'Cronograma quincenal en 5 fases desde el MVP local hasta el despliegue global y monetización en Vercel.',
    sections: [
      {
        heading: '1. Cronograma de Fases Actualizado',
        content: `- **Fase 1 (COMPLETADA):** Núcleo Táctico Canónico & Rescate WarsWorld (Sprites 16-bit, A*, Daños, Niebla, AWBW, Economía, Comandantes y 45 tests QA).
- **Fase 2 (EN CURSO):** Inteligencia Artificial Táctica PvE (Bot autónomo con heurística Utility Score y 3 dificultades: Cadete, Comandante y General).
- **Fase 3 (SIGUIENTE):** Modos Duales (Blitz Skirmish 10-20 min vs Grand Campaign 40-60 min) y Mazo de 10 Cartas con Cooldowns de Fabricación.
- **Fase 4:** Backend Supabase & Progresión de Cofres (Auth, 4 slots de cofres, user_cards con duplicados y escalado +2.5%/lvl, Cap Nivel 11 de Torneo).
- **Fase 5:** Multijugador Realtime, Modo 2v2 & Capa Social (WebSockets, Matchmaking PTE, Anti-AFK, Chat global y DM en partida con Mute).
- **Fase 6:** Despliegue en Vercel, Monetización Stripe y Auditoría Final de Producción.`
      },
      {
        heading: '2. Criterios de Aceptación para Alpha & Beta',
        content: `1. **Latencia Máxima en Realtime:** Menor a 150 ms para la confirmación de turno entre clientes de Norteamérica y Europa.
2. **Cero Desincronización (Desync Free):** El estado del juego en PostgreSQL es la única fuente de verdad autoritativa.
3. **Escalabilidad de Costes:** Base de datos con soporte de scale-to-zero y caching estático de assets para operar con coste mínimo.`
      }
    ]
  },
  {
    id: '07_infra',
    filename: 'docs/07_DATABASE_INFRASTRUCTURE_PLAN.md',
    title: 'Infraestructura de Datos y RLS (Supabase + Vercel)',
    badge: 'Infra & Architecture',
    summary: 'Guía paso a paso de implementación: Diagrama de flujo Next.js/Supabase, DDL definitivo con constraints, RLS riguroso y triggers de nivel.',
    sections: [
      {
        heading: '1. Diagrama de Flujo de Datos Arquitectónico',
        content: `El flujo opera en 5 fases continuas:
1. **Auth & Handshake:** Supabase Auth emite JWT con el claim auth.uid().
2. **Lectura de Perfil y Catálogo:** Consultas con RLS activo para proteger divisas e inventario.
3. **Canal Realtime:** Suscripción dual (broadcast para cursores/animaciones en vivo, postgres_changes para match_state).
4. **Despacho de Turno:** Vercel Edge Function valida la jugada y aplica la mutación autoritativa en PostgreSQL.
5. **Liquidación:** RPC award_match_rewards calcula XP/créditos y activa el trigger trg_profile_xp_check.`
      },
      {
        heading: '2. DDL Definitivo y Tablas Normalizadas (SQL)',
        content: 'Sentencias de creación con restricciones CHECK e índices para profiles, units_catalog, active_matches y match_state:',
        codeSnippet: {
          language: 'sql',
          code: `CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(32) NOT NULL UNIQUE,
    account_level INTEGER NOT NULL DEFAULT 1 CHECK (account_level >= 1 AND account_level <= 100),
    current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
    battle_credits INTEGER NOT NULL DEFAULT 500 CHECK (battle_credits >= 0),
    command_gems INTEGER NOT NULL DEFAULT 50 CHECK (command_gems >= 0),
    elo_rating INTEGER NOT NULL DEFAULT 1200 CHECK (elo_rating >= 0),
    total_matches_played INTEGER NOT NULL DEFAULT 0,
    total_victories INTEGER NOT NULL DEFAULT 0,
    equipped_loadout JSONB NOT NULL DEFAULT '["infantry", "mech", "recon", "tank_light", "artillery"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.active_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(8) UNIQUE NOT NULL,
    player1_id UUID NOT NULL REFERENCES public.profiles(id),
    player2_id UUID REFERENCES public.profiles(id),
    current_turn_player_id UUID REFERENCES public.profiles(id),
    status VARCHAR(24) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished', 'abandoned')),
    turn_number INTEGER NOT NULL DEFAULT 1,
    turn_time_limit_sec INTEGER NOT NULL DEFAULT 120,
    turn_deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.match_state (
    match_id UUID PRIMARY KEY REFERENCES public.active_matches(id) ON DELETE CASCADE,
    grid_width INTEGER NOT NULL DEFAULT 16,
    grid_height INTEGER NOT NULL DEFAULT 16,
    tiles JSONB NOT NULL,
    units JSONB NOT NULL,
    properties JSONB NOT NULL,
    player_funds JSONB NOT NULL DEFAULT '{"player1": 1000, "player2": 1000}'::jsonb,
    last_action_seq INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);`
        }
      },
      {
        heading: '3. Políticas de Seguridad RLS en PostgreSQL',
        content: 'Garantiza aislamiento estricto y bloquea modificaciones no autorizadas en tablero y perfiles:',
        codeSnippet: {
          language: 'sql',
          code: `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_state ENABLE ROW LEVEL SECURITY;

-- Solo lectura de perfiles
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Solo el jugador con el turno activo puede modificar el match_state
CREATE POLICY "match_state_turn_write" ON public.match_state FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.active_matches m
        WHERE m.id = match_state.match_id
        AND m.current_turn_player_id = auth.uid()
        AND m.status = 'in_progress'
    )
);`
        }
      },
      {
        heading: '4. Trigger de Subida de Nivel y RPC de Recompensas',
        content: 'Cálculo de curva matemática 150 * N^1.85 y elevación de privilegios:',
        codeSnippet: {
          language: 'sql',
          code: `CREATE OR REPLACE FUNCTION public.calculate_required_xp(p_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN FLOOR(150 * POWER(p_level::DOUBLE PRECISION, 1.85))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.trg_process_level_up()
RETURNS TRIGGER AS $$
DECLARE
    v_xp_needed INTEGER;
    v_new_level INTEGER := NEW.account_level;
BEGIN
    v_xp_needed := public.calculate_required_xp(v_new_level);
    WHILE NEW.current_xp >= v_xp_needed AND v_new_level < 100 LOOP
        NEW.current_xp := NEW.current_xp - v_xp_needed;
        v_new_level := v_new_level + 1;
        NEW.battle_credits := NEW.battle_credits + (v_new_level * 100);
        IF (v_new_level % 5 = 0) THEN
            NEW.command_gems := NEW.command_gems + 25;
        END IF;
        v_xp_needed := public.calculate_required_xp(v_new_level);
    END LOOP;
    NEW.account_level := v_new_level;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`
        }
      }
    ]
  },
  {
    id: '08_systems_gdd',
    filename: 'docs/08_TACTICAL_AND_ECONOMIC_SYSTEMS_GDD.md',
    title: 'Sistemas Tácticos, Matriz de Daño y Economía GDD',
    badge: 'Combat & Economy',
    summary: 'Especificación canónica: Matriz de 12x12 unidades estilo Advance Wars, costes de terreno, curva XP y economía ética no P2W.',
    sections: [
      {
        heading: '1. Curva de Progresión y Recompensas',
        content: `**Curva de Nivel de Cuenta:**
XP_necesaria(N) = floor(150 * N^1.85)

**Cálculo de Recompensa de Partida:**
Puntaje = 120 + (Ciudades * 45) + (Bajas * 35) + min(Turnos, 30) * 6
Multiplicador = Victoria: 2.2 | Derrota: 0.85 | Abandono: 0.0
XP = floor(Puntaje * Multiplicador)
Oro (Gold) = floor((60 + (Ciudades * 20) + (Bajas * 15)) * Multiplicador)`
      },
      {
        heading: '2. Matriz Canónica de Efectividad de Combate',
        content: `Valores base de daño (Atacante a 10 HP contra Defensor a 0★ de defensa):
- **Infantería (1,000G):** 55% vs Infantería, 45% vs Mecanizado, 5% vs Tanque Ligero.
- **Mecanizados (3,000G):** 55% vs Tanque Ligero, 15% vs Tanque Mediano, 85% vs Recon.
- **Tanque Ligero (7,000G):** 75% vs Infantería, 55% vs Tanque Ligero, 15% vs Tanque Mediano.
- **Tanque Mediano (16,000G):** 105% vs Infantería, 85% vs Tanque Ligero, 55% vs Tanque Mediano.
- **Artillería (6,000G):** Rango 2-3 indirecto (no puede moverse y disparar en el mismo turno), 70% vs Tanque Ligero, 45% vs Tanque Mediano.
- **Antiaéreo (8,000G):** 105% vs Infantería, 105% vs B-Copter, 65% vs Caza.`
      },
      {
        heading: '3. Modificadores de Terreno (Defensa y Movimiento)',
        content: `- **Llanura (1★ - 10% def):** Costo pie 1, ruedas 2, orugas 1.
- **Bosque (2★ - 20% def):** Costo ruedas 3, orugas 2. Oculta tropas en Niebla de Guerra.
- **Montaña (4★ - 40% def):** Infranqueable para ruedas/orugas. Otorga +3 visión a infantería.
- **Carretera (0★ - 0% def):** Máxima velocidad (costo 1 para todos los terrestres).
- **Ciudad/Fábrica (3★ - 30% def):** Renta 1,000G y repara +2 HP por turno a unidades aliadas.`
      },
      {
        heading: '4. Economía Ética No Pay-to-Win',
        content: `- **Oro de Batalla (Gold):** Moneda blanda ganada únicamente jugando partidas y misiones. Se usa para desbloquear variantes de unidades y skins básicas.
- **Gemas de Mando (Gems):** Moneda premium comprada con dinero real (Stripe) o regalada en hitos de nivel. Se usa para el Pase de Batalla de 60 días y skins cosméticas.
- **Cero Pay-to-Win:** No se venden ventajas numéricas de daño, ni aceleradores de turno, ni cofres aleatorios (loot boxes).`
      }
    ]
  },
  {
    id: '09_frontend_ai',
    filename: 'docs/09_FRONTEND_ENGINE_AND_AI_ARCHITECTURE.md',
    title: 'Arquitectura Frontend, Redes Realtime e IA Bots',
    badge: 'Frontend & AI',
    summary: 'Desacoplamiento Canvas/React, A* Pathfinding heterogéneo, WebSocket Sync con Supabase y ejecución de IA en Web Workers.',
    sections: [
      {
        heading: '1. Desacoplamiento React vs Canvas Engine (60 FPS)',
        content: `Arquitectura de 2 capas:
- **Capa Declarativa (React 19 / Tailwind):** Gestiona menús, perfiles, HUD de recursos y el menú radial de órdenes.
- **Capa Imperativa (Canvas 2D / PixiJS):** Bucle desacoplado a 60 FPS con requestAnimationFrame, renderizado por 6 capas (fondo, rejilla A*, propiedades, unidades con Lerp, partículas y máscara de niebla de guerra).
- **Puente de Comunicación:** EventBridge desacoplado para emitir eventos de clics y selección sin re-renders en React.`
      },
      {
        heading: '2. Pathfinding A* con Costes Topográficos',
        content: 'Calcula casillas alcanzables considerando locomoción (pie, orugas, ruedas, aéreo, naval), bloqueo de enemigos y tránsito entre aliados:',
        codeSnippet: {
          language: 'typescript',
          code: `export class TacticalPathfindingEngine {
  public static getReachableTiles(options: { unit: TacticalUnit; tiles: TerrainTile[][]; unitsMap: Map<string, TacticalUnit>; gridWidth: number; gridHeight: number }) {
    const reachable = [];
    const costMap = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(Infinity));
    const openSet = [{ x: unit.x, y: unit.y, costSoFar: 0 }];
    costMap[unit.y][unit.x] = 0;
    const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.costSoFar - b.costSoFar);
      const curr = openSet.shift()!;
      for (const d of dirs) {
        const nx = curr.x + d.dx, ny = curr.y + d.dy;
        if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;
        const stepCost = TERRAIN_COSTS[tiles[ny][nx].type]?.[unit.movementType] ?? Infinity;
        if (stepCost === Infinity) continue;
        const occ = Array.from(unitsMap.values()).find(u => u.x === nx && u.y === ny);
        if (occ && occ.ownerId !== unit.ownerId) continue; // Bloqueo enemigo
        const total = curr.costSoFar + stepCost;
        if (total <= unit.movementPoints && total < costMap[ny][nx]) {
          costMap[ny][nx] = total;
          openSet.push({ x: nx, y: ny, costSoFar: total });
          if (!occ || (occ.x === unit.x && occ.y === unit.y)) reachable.push({ x: nx, y: ny });
        }
      }
    }
    return reachable;
  }
}`
        }
      },
      {
        heading: '3. Supabase Realtime & Antitrampas en Edge Functions',
        content: `Protocolo de sincronización híbrido:
- **Broadcast:** Transmite en vivo el cursor del rival y las trayectorias interpoladas sin costo de base de datos.
- **Postgres Changes:** Replicación segura del estado transaccional en match_state.
- **Validación Edge:** Endpoint /api/match/dispatch-action valida turno activo, pertenencia de la unidad, cinemática de ruta y fondos antes de confirmar mutaciones en PostgreSQL.`
      },
      {
        heading: '4. Arquitectura de IA en Web Workers ($0 Cost en Vercel)',
        content: `Para evitar sobrecostes de cómputo en Vercel y eliminar latencia (0 ms), el motor de IA corre en un Web Worker en segundo plano en el navegador del usuario:
- **Nivel Fácil:** Movimiento cercano y disparos sin ponderar cobertura.
- **Nivel Normal:** Función de utilidad que prioriza capturar ciudades (+1,500 pts) y HQ (+8,000 pts), concentrando daño en blindados enemigos.`
      }
    ]
  },
  {
    id: '10_sprints',
    filename: 'docs/10_DEFINITIVE_SPRINT_EXECUTION_PLAN.md',
    title: 'Plan de Sprints Definitivo (0% a 100% en Producción)',
    badge: 'Scrum & Sprints',
    summary: 'Plan quincenal de 6 Sprints atómicos: Repositorio & Auth, Canvas 60 FPS, Combate & Bot local, Realtime PvP, Meta-RPG y Deploy Vercel.',
    sections: [
      {
        heading: '1. Cronograma Maestro de 6 Sprints (12 Semanas)',
        content: `- **Sprint 1 (COMPLETADO):** Núcleo Táctico Canónico & Rescate WarsWorld (Sprites 16-bit, Canvas/Matriz 60 FPS, Combate canónico, A*, Niebla, AWBW, Economía y 6 COs con 45 tests QA).
- **Sprint 2 (EN CURSO):** Motor de Inteligencia Artificial Táctica PvE (TacticalBotAI con Utility Score y 3 dificultades: Cadete, Comandante y General).
- **Sprint 3 (SIGUIENTE):** Modos Duales (Escaramuza Rápida 10-20m vs Campaña Táctica 40-60m) y Mazo de 10 Cartas con Cooldowns y tope de 15 tropas.
- **Sprint 4:** Backend Supabase, Auth & Sistema de Cofres (4 ranuras, user_cards con duplicados y escalado +2.5%/lvl, Cap Nivel 11 de Torneo).
- **Sprint 5:** Multijugador Realtime, Matchmaking PTE, Modo 2v2 & Capa Social (WebSockets, Reloj Anti-AFK, turnos cruzados, Chat global y DM en partida con Mute).
- **Sprint 6:** Auditoría RLS, Optimización de Assets WebP en Vercel CDN, Stripe Checkout y Release 1.0 en Producción.`
      },
      {
        heading: '2. Definición de Hecho (DoD) Global',
        content: `1. Código 100% tipado en TypeScript sin supresiones any.
2. Cero vulnerabilidades en Supabase Security Advisor (RLS activo y auditado).
3. 60 FPS estables en el Canvas durante combate y desplazamientos en escritorio y móvil.
4. Despliegue automatizado con Vercel Edge Runtime y analíticas activas.`
      }
    ]
  },
  {
    id: '11_devops',
    filename: 'docs/11_DEVOPS_PERFORMANCE_AND_E2E_QA.md',
    title: 'Despliegue Vercel, Optimización de Rendimiento & QA E2E',
    badge: 'DevOps & QA',
    summary: 'Configuración de vercel.json, políticas de caché inmutable, compresión WebP, lazy loading de componentes y batería de tests E2E.',
    sections: [
      {
        heading: '1. Despliegue en Vercel Edge & Enrutamiento SPA',
        content: `El archivo vercel.json implementa:
- **Clean URLs & Framework Vite:** Detección nativa del build en dist/.
- **Reescritura SPA:** /((?!assets/).*) -> /index.html para evitar errores 404 en subrutas de navegación.
- **Cabeceras Inmutables:** Cache-Control: public, max-age=31536000, immutable para todos los bundles generados en /assets/*.
- **Seguridad Bancaria:** X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN y CSP configurada para Supabase.`
      },
      {
        heading: '2. Checklist de Rendimiento Frontend',
        content: `1. **Lazy Loading:** React.lazy + Suspense en ShopCatalog, LoadoutCustomizer, MatchSummaryModal y QADevOpsRunner.
2. **Chunk Splitting:** Rollup aísla vendor-react, vendor-lucide, vendor-supabase y engine-core en fragmentos independientes (<200KB).
3. **WebP Lossless:** Reducción de ~42% en la huella de memoria y tiempo de transferencia de atlas de sprites.
4. **Web Audio API:** Síntesis sonora procedural en vivo sin descargas de audio externas (0 ms latencia, 0 bytes transferidos).`
      },
      {
        heading: '3. Batería de Pruebas de Integración E2E (6 Fases)',
        content: `La suite e2eIntegration.test.ts valida en cadena ininterrumpida:
1. Registro de usuario & asignación de saldos iniciales (2,400 Oro / 650 Gemas / Nivel 1).
2. Selección de partida contra Bot con tablero táctico 8x8 y cuarteles generales.
3. Movimiento con costes de terreno A* y captura de ciudad neutral (+1 Propiedad).
4. Combate táctico respetando estrellas de cobertura, daño porcentual y contraataque directo.
5. Otorgamiento de recompensas (+466 XP, +190 Oro) y subida a Nivel 2.
6. Compra en tienda de skins y equipamiento en la armería.`
      }
    ]
  },
  {
    id: '12_metagame',
    filename: 'docs/12_EXTENDED_METAGAME_ARCHITECTURE.md',
    title: 'Arquitectura Holística del Metajuego Extendido',
    badge: 'Extended Metagame',
    summary: 'Especificación definitiva de conciliación: Modos duales (Blitz Skirmish vs Grand Campaign), Mazo de 10 Cartas con Cooldowns, Matchmaking por PTE, Modo 2v2, Escalado +2.5%/lvl y Cap Nivel 11.',
    sections: [
      {
        heading: '1. Matriz de Compatibilidad: Advance Wars vs Clash Royale',
        content: `Resolución de inconsistencias estructurales:
- **Mana Reactivo vs Fondos por Propiedades:** Fondos otorgados al inicio de turno según propiedades capturadas.
- **Ciclo Aleatorio de 4 Cartas vs Fábricas Fijas:** Despliegue asíncrono sin azar: las 10 cartas del mazo están disponibles en la fábrica, reguladas por Cooldowns de Fabricación y límite de 15 tropas simultáneas.
- **Partidas Cortas vs Partidas de Horas:** Modos duales independientes (Escaramuza Rápida de 10-20 min vs Campaña Táctica de 40-60 min).
- **Desbalance por Niveles (+10%) vs Tabla Táctica (10 HP max):** Escalado moderado de +2.5% por nivel en casual, y Cap Forzoso de Nivel 11 (Tournament Cap) en entornos competitivos.`
      },
      {
        heading: '2. Modos de Juego Principales',
        content: `1. **Escaramuza Rápida (Blitz Skirmish):**
- Duración: 10 - 20 minutos.
- Tamaño de Mapa: 12x12 a 16x16 casillas con bases próximas.
- Tiempo por Turno: 30 segundos máximo.
- Economía Acelerada: +100% fondos iniciales, $2,000G por propiedad/turno, cooldowns al 50%.
- Criterio de Victoria: 12-15 turnos límite; desempate por Valor Total de Tropas + Propiedades.

2. **Campaña Táctica (Grand Campaign):**
- Duración: 40 - 60 minutos.
- Tamaño de Mapa: 24x24 a 32x32 casillas con teatros terrestres, aéreos y navales.
- Tiempo por Turno: 60 segundos máximo.
- Economía Estándar: $1,000G por propiedad/turno, cooldowns estándar de 2-4 turnos.
- Criterio de Victoria: Captura de HQ o aniquilación (límite de 40 turnos).`
      },
      {
        heading: '3. El Mazo de 10 Cartas y Taxonomía',
        content: `Estructura estricta para evitar monotonía y garantizar jugabilidad:
- **Ranura 1 [Obligatoria]:** Infantería Ligera ($1,000 | Cooldown: 0t | Captura / Visión).
- **Ranura 2 [Obligatoria]:** Infantería Mecanizada ($3,000 | Cooldown: 0t | Captura / Antitanque).
- **8 Ranuras Flexibles:**
  - Mínimo 2 unidades terrestres directas (ej. Tanque Ligero, Recon).
  - Mínimo 1 unidad antiaérea (ej. Antiaéreo, Caza, Misiles).
  - Máximo 2 unidades super-pesadas (Neotanque, Bombardero, Acorazado).
- **Arquetipos de Mazo:** Rush Terrestre, Control Aéreo (Air Superiority), Anfibio/Naval y Asedio (Siege/Tortuga).`
      },
      {
        heading: '4. Matchmaking por Ritmo (PTE), Anti-AFK y Modo 2v2',
        content: `- **Fórmula PTE:** Promedio de segundos usados por turno en las últimas 10 partidas. Clasifica en: Blitz (<= 15s), Estándar (16-35s) y Analítico (36-60s).
- **Reloj Dinámico Anti-AFK:** Si no hay acciones en un turno, el siguiente se reduce al 50%; si repite, a 10s; al 3er turno consecutivo -> Derrota por Abandono (AFK Forfeit).
- **Modo 2v2 (Turnos Cruzados):** Secuencia A1 -> B1 -> A2 -> B2 estilo ajedrez, fondos individuales por jugador y herramienta de Pings Tácticos en mapa.
- **Capa Social:** Chat Global regional, Clanes, y Mensajes DM en partida con filtro anti-toxicidad y Botón de Pánico 'Mute'.`
      },
      {
        heading: '5. Progresión, Cofres y Cap Competitivo Nivel 11',
        content: `- **Ciclo de 4 Ranuras de Cofres:** Madera (3h / 18 gemas), Hierro (8h / 48 gemas) y Blindado (12h / 72 gemas) otorgando Oro y Duplicados.
- **Fórmula de Escalado:** Stat Final = Stat Base * (1 + (Nivel - 1) * 0.025). Una brecha de 3 niveles solo otorga 7.5% de ventaja.
- **Cap de Torneo:** En Ligas Clasificatorias y Torneos, todas las cartas se igualan forzosamente al Nivel 11, garantizando paridad competitiva absoluta.`
      },
      {
        heading: '6. Complejo Industrial, Merma 10h y Mercado Libre P2P',
        content: `**[ESTADO: 100% IMPLEMENTADO Y ACTIVO EN FRONTEND]**
- **Cadena de Extracción:** Hierro (50/h), Piedra (40/h), Raras (15/h) con tope de 10 horas.
- **Carcoma Logística:** Descuenta 2.5% por cada hora extra de abandono tras las 10h.
- **Altos Hornos de Refinado:** Acero (4h), Hormigón (2h), Microchips (8h) con opción de sobrecarga al 50% de tiempo mediante Combustible de Campaña.
- **Mercado P2P con Tasa del 12%:** Comercio libre entre jugadores con bandas de precio dinámicas (±35% PMM) y retención del 12% a quema deflacionaria.`
      },
      {
        heading: '7. Corporaciones Militares (Clanes), Bóveda T1-T3 y Salvaguarda Táctica',
        content: `**[ESTADO: 100% IMPLEMENTADO Y ACTIVO EN FRONTEND]**
- **Bóveda de Guerra Escalonada:** Tier 1 (1-3 activos: 150G), Tier 2 (4-7 activos: 600G + 5 acero), Tier 3 (8+ activos: 2,500G + 25 acero + 10 chips + 20 gemas).
- **Embargo por Deshonor:** 0 batallas en 24h = Parásito. Fianza: 1,500G + 30 acero. 50% al tesoro corporativo y 50% dividendos Top 3 (50%/30%/20%).
- **Protocolo de Salvaguarda Táctica:** Seguro de racha proactivo (racha +1 sin consumo en victoria; racha protegida y -1 unidad en derrota). Multiplicador 1.0x a 2.0x Doble Botín a 6+ victorias.`
      },
      {
        heading: '8. Ladder Asimétrico (N1-N15), Near-Miss y Oferta Flash Tilt ($0.99)',
        content: `**[ESTADO: 100% IMPLEMENTADO Y ACTIVO EN FRONTEND]**
- **Bifurcación Competitiva:** Cap forzoso a Nivel 11 en Torneos Esports vs Escalado real +2.0%/nivel en Ladder Diario (hasta N15).
- **Filtro de Emparejamiento por APL:** Tolerancia máxima |APL_P1 - APL_P2| <= 1.5 para erradicar disparidades injustas.
- **Diagnóstico Balístico Near-Miss:** Se activa ante derrotas donde el rival sobrevive con <= 2 HP, proyectando telemetría contrafáctica a Nivel 11.
- **Monetización Reactiva (Tilt):** Oferta flash en 180s por $0.99 (100 planos de la tropa derrotada + 30 vigas de acero) tras 2 derrotas o turnos precipitados.`
      }
    ]
  },
  {
    id: '13_co_bark',
    filename: 'docs/13_CO_SYSTEM_MONETIZATION_AND_BARK_ENGINE.md',
    title: 'Comandantes, Bark Engine en Cómic & Telemetría Cruzada',
    badge: 'Bark & Comic Engine',
    summary: 'Arquitectura del Bark Engine visual en viñetas de cómic (sin voces), telemetría cruzada profunda (tilt_index, paciencia, PTE), afinidad y Command Pass con reclamación retroactiva.',
    sections: [
      {
        heading: '1. Cadena Socrática y Decisiones Arquitectónicas',
        content: `Formulación de preguntas clave para expandir la estructura de datos:
- ¿Por qué los registros tradicionales no bastan? Se requiere detectar estados psicológicos (tilt, apego obsesivo a unidades, juego pasivo).
- ¿Cómo cruzar datos sin degradar el rendimiento? Capa OLTP append-only (match_detailed_telemetry) y lectura agregada en O(1) (player_tactical_behavior_profile).
- ¿Por qué estética cómic sin voces? Máxima ligereza web (FCP < 1.0s) y fuerza expresiva pop-art mediante bocadillos dinámicos y onomatopeyas visuales.`
      },
      {
        heading: '2. Arquitectura Visual de Cómic (Bocadillos y Onomatopeyas)',
        content: `**[ESTADO: 100% IMPLEMENTADO Y OPERATIVO EN FRONTEND]**
El Comandante proyecta viñetas de historieta interactivas sobre la UI (barkEngine.ts y ComicVignetteOverlay.tsx):
- **Bocadillos Dinámicos:** Speech (suave/doctrinal), Shout (dentado/alerta), Thought (nube analítica), Whisper (punteado/sigilo) y Radio (militar/cola de emparejamiento).
- **Sellos Pop-Art:** Insignias gráficas rotadas con textos onomatopéyicos (¡BOOM!, ¡RATATAT!, ¡TACTICAL!, ¡PANIC!, ¡CLUTCH!, ¡TRAP!, ¡AIRDROP!).
- **Interpolación de Vínculo:** Sustitución dinámica de {player_name} si el nivel de vínculo es >= 3; de lo contrario utiliza "Cadete".
- **Reactividad en Combate:** Detonación automática ante Superpoderes CO, emboscadas en niebla TRAP, destrucción de tanques pesados, caídas de AirDrop y Near-Miss.`
      },
      {
        heading: '3. Replanteamiento de Base de Datos y Telemetría Cruzada',
        content: `Estructura PostgreSQL ampliada para soportar el cruce de datos:
- player_tactical_behavior_profile: Métricas de ritmo, tilt_index (0-1), sesgos de rama militar, caída en emboscadas y rachas.
- match_detailed_telemetry: Histórico granular por partida (duración de turnos, HP mínimo de HQ, tropas perdidas).
- commander_bonding_progress: Vínculo bilateral y memoria compartida entre el jugador y cada Comandante.
- comic_cosmetics_catalog & user_comic_cosmetics: Estilos de bocadillo, sellos de texto y marcos de viñeta.`
      },
      {
        heading: '4. Command Pass y Reclamación Retroactiva',
        content: `Pase de batalla de 50 niveles dividido en Vía Gratuita y Vía Premium:
- Reclamación Retroactiva: El jugador puede progresar en la vía gratuita hasta el nivel 50. Si adquiere el pase premium en cualquier punto (ej. nivel 42), desbloquea de golpe todas las recompensas premium del nivel 1 al 42.
- Beneficios Funcionales y Cosméticos Éticos: Comandantes exclusivos de temporada (stats estándar con Cap Nivel 11), cosméticos de cómic y cola de apertura de cofres (cero Pay-to-Win).`
      }
    ]
  },
  {
    id: '14_roadmap',
    filename: 'docs/14_REALISTIC_PROJECT_ROADMAP_AND_STATUS.md',
    title: 'Auditoría de Realidad, Refutación & Roadmap Terrenal',
    badge: 'Roadmap & Status',
    summary: 'Diagnóstico forense objetivo: Refutación de la versión 0.6.0, determinación de la versión real v0.3.0-WARSWORLD-COMPLETED (~28.5% real) tras la integración completa de los 4 bloques de WarsWorld.',
    sections: [
      {
        heading: '1. Diagnóstico Forense y Estado Real del Desarrollo',
        content: `Auditoría integral cruzada de código y especificación:
- **Sprint 1 (Motor Táctico Canónico):** 100% Implementado (53 pruebas canónicas: combate determinista, A*, silos, niebla, fuel, clima y 28 COs).
- **Sprint 2 (IA PvE y Orquestador):** 100% Implementado (Árbol heurístico Cadete/Comandante/General en aiBot.ts).
- **Sprint 3 (Bark Engine Cómic & AirDrops/15s):** 100% Implementado (Viñetas Pop-Art sin audio, baliza equidistante y Duelo Espejo).
- **Sprint 4 (Tactical Studio Editor):** 100% Implementado como herramienta interna Dev (Map Builder 180° simétrico, Sprite Studio y CO Bark Studio).
- **Sprint 5 (Complejo Industrial & Mercado P2P):** 100% Implementado (Silos con merma de 10h, hornos de refinado y mercado con tasa del 12% a quema).
- **Sprint 6 (Corporaciones Militares & Salvaguarda):** 100% Implementado (Bóveda T1-T3, embargo a parásitos de 24h, reparto Top 3 y blindaje de racha).
- **Sprint 7 (Ladder Asimétrico, Near-Miss & Tilt):** 100% Implementado (Tournament Cap N11 vs Ladder N1-N15, filtro APL <= 1.5, autopsia Near-Miss y oferta flash en 180s por $0.99).
- **Estado Actual:** v0.8.5-PRODUCTION-READY-CORE (~87.5% del sistema global).`
      },
      {
        heading: '2. Hoja de Ruta Secuencial hacia Producción y Despliegue',
        content: `- **Sprint 8 (Fase Actual Prioritaria):** Estabilidad del sistema, preparación del arnés de pruebas para validación directa del usuario, conexión fluida con Supabase Realtime y validación de despliegue en Vercel.
- **Sprint 9:** Auditoría de rendimiento Core Web Vitals en móviles y hardening de políticas de seguridad RLS.
- **Fase de Post-Producción:** Optimización del Tactical Studio Editor integrando la arquitectura del proyecto 'texcel-studio' y sustitución integral de sprites por arte 100% original una vez que el sistema esté en producción y probado.`
      }
    ]
  }
];

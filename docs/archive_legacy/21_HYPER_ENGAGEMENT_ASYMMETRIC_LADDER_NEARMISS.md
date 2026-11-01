# ESCALADO ASIMÉTRICO DE LADDER Y REVELACIÓN "NEAR-MISS" POST-COMBATE
**Documento Técnico de Integración:** `21_HYPER_ENGAGEMENT_ASYMMETRIC_LADDER_NEARMISS.md`  
**Referencia de Propuesta:** `HYPER-07`  
**Versión:** 1.0.0-PROD-SPEC  
**Estado:** Especificación de Producción para Integración en Sistema de Ligas y Retención Competitiva  
**Pila Tecnológica:** TypeScript, PostgreSQL 15+, React 19 / Canvas Post-Match Diagnostic, Bark Engine.

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO CONDUCTUAL

El **Escalado Asimétrico de Ladder y Revelación Near-Miss** resuelve el mayor error de monetización del diseño original de *Tactical Command*: la imposición universal del Nivel 11 (Tournament Cap) en todas las modalidades competitivas, lo que privaba a los jugadores de cualquier incentivo para maximizar sus unidades al Nivel 15.

La nueva arquitectura establece una **bifurcación quirúrgica de los entornos competitivos**:
1. **Santuario Esports (Torneos Oficiales de Fin de Semana):** Se mantiene el Nivel 11 forzoso e igualado para preservar la legitimidad competitiva y satisfacer a los puristas tácticos de *Advance Wars*.
2. **Ladder Clasificatorio Central (Camino de Trofeos Diario):** Se habilita el escalado real de estadísticas a razón de un $+2.0\%$ por nivel hasta Nivel 15.
3. **Diagnóstico Post-Combate "Near-Miss" (Casi Acierto):** Tras sufrir una derrota ajustada en el Ladder, el sistema proyecta un desglose analítico en viñeta de cómic que demuestra matemáticamente cómo la unidad enemiga sobrevivió con un margen mínimo (e.g. 1 HP) gracias a su nivel de blindaje superior, ofreciéndole de inmediato un acceso directo al Hangar para mejorar su carta con acero y créditos.

Esta fórmula redirige el dolor de la derrota hacia el pensamiento contrafáctico (*Counterfactual Thinking*): el jugador no se siente intelectualmente inferior; se convence de que su estrategia fue brillante pero su equipo se quedó corto por una fracción mínima, encendiendo la obsesión por cosechar recursos en el metajuego.

```
                      FLUJO DEL LADDER ASIMÉTRICO Y NEAR-MISS
                                         │
         ┌───────────────────────────────┴───────────────────────────────┐
         ▼                                                               ▼
 [ TORNEO DE FIN DE SEMANA ]                             [ LADDER CENTRAL DIARIO ]
 • Cap Forzoso Nivel 11 (Esports)                        • Escalado Real: Nivel 1 a 15 (+2.0%/lvl)
 • Habilidad Táctica Pura                                • Requiere: Duplicados + Acero/Microchips
         │                                                               │
         │                                                               ▼
         │                                                    [ RESULTADO DE DERROTA ]
         │                                                               │
         │                                       ┌───────────────────────┴───────────────────────┐
         │                                       ▼                                               ▼
         │                            [ DIFERENCIA HOLGADA ]                          [ DERROTA AJUSTADA (< 2 HP) ]
         │                            • Análisis táctico estándar                     • ¡DISPARO PROTOCOLO NEAR-MISS!
         │                                                                                       │
         │                                                                                       ▼
         │                                                                     [ ANÁLISIS BARK ENGINE DIAGNÓSTICO ]
         │                                                                     • Gráfico comparativo de blindajes
         │                                                                     • "Su tanque resistió con 1 HP"
         │                                                                                       │
         │                                                                                       ▼
         │                                                                     [ ACCESO DIRECTO AL HANGAR (1 CLIC) ]
         │                                                                     • Requiere 15 Vigas de Acero
         │                                                                     • Botón al Mercado P2P si faltan recursos
```

---

## 2. ANÁLISIS DE CRUCE Y REFUTACIÓN DE LA DOCUMENTACIÓN EXISTENTE

### 2.1 Refutación de Supuestos en `01_GAME_DESIGN_DOCUMENT.md` y `05_MONETIZATION_AND_PROGRESSION.md`
- **Sección 1.1 de `01_GAME_DESIGN_DOCUMENT.md` (Pilar 2):** Establecía categóricamente que en *cualquier* enfrentamiento de liga, torneos y guerras de clanes, todas las cartas se igualaban al Nivel 11 para evitar el Pay-to-Win.
  - *Refutación:* Esta decisión anulaba por completo el propósito del metajuego de recolección de cartas más allá del Nivel 11. ¿Para qué gastar semanas produciendo acero o reuniendo 5,000 cartas duplicadas si en la liga no sirven de nada? La bifurcación rescata la monetización y la progresión sin destruir la integridad del juego competitivo oficial de fin de semana.
- **Sección 6.1 (Fórmulas de Combate):** Las fórmulas multiplicativas del daño se adaptan para incorporar el factor de nivel asimétrico de forma balanceada.

---

## 3. FORMULACIÓN MATEMÁTICA DEL ESCALADO Y ANÁLISIS NEAR-MISS

### 3.1 Curva de Escalado Estadístico Controlado (+2.0% por Nivel)
A diferencia del destructivo $+10\%$ por nivel de *Clash Royale*, el multiplicador de estadísticas en *Tactical Command* utiliza una curva suave que preserva la triangulación táctica:

$$\text{StatMultiplier}(\text{Nivel}) = 1.0 + (\text{Nivel} - 1) \times 0.020$$

| Nivel de Carta | Multiplicador Ataque / Defensa | Coste en Materiales Procesados | Entorno Válido |
|:---:|:---:|:---|:---|
| **Nivel 1** | $100.0\%$ (Base) | Inicial | Todos los modos |
| **Nivel 5** | $108.0\%$ ($+8\%$) | 10 Vigas de Acero + 400 Créditos | Ladder / Campaña |
| **Nivel 9** | $116.0\%$ ($+16\%$) | 50 Vigas de Acero + 4,000 Créditos | Ladder / Campaña |
| **Nivel 11** | **$120.0\%$ ($+20\%$)** | 120 Vigas de Acero + 15,000 Créditos | **Cap Estándar Torneo Esports** |
| **Nivel 13** | $124.0\%$ ($+24\%$) | 250 Acero + 40 Microchips | Ladder Diario |
| **Nivel 15 (Máx)** | **$128.0\%$ ($+28\%$)** | 600 Acero + 120 Microchips + 100k Créditos | Ladder Diario / Prestigio |

*Ventaja Máxima:* Un tanque Nivel 15 frente a un tanque Nivel 11 tiene únicamente una ventaja neta del $+6.6\%$ en el intercambio directo, lo que significa que una mala decisión táctica (e.g. atacar desde un río sin cobertura de estrellas) sigue costándole la vida a la unidad de mayor nivel.

### 3.2 Condición de Activación del Diagnóstico Near-Miss
El motor post-partida evalúa si el jugador derrotado califica para la secuencia de Near-Miss:

$$\text{IsNearMiss} = (\text{WinnerSurvivingHP}_{\min} \le 2) \land (\text{WinnerSurvivingUnitLevel} > \text{LoserUnitLevel})$$

---

## 4. PERSISTENCIA DE BASE DE DATOS Y LÓGICA RPC (SUPABASE DDL)

Para registrar las victorias ajustadas y dar soporte a la bifurcación de ligas, se añaden las siguientes estructuras a PostgreSQL:

```sql
-- ============================================================================
-- EXTENSIÓN PARA LADDER ASIMÉTRICO Y DIAGNÓSTICO NEAR-MISS
-- ============================================================================

-- 1. Modificar match_history para almacenar detalles de nivel y disparidad
ALTER TABLE public.match_history
ADD COLUMN IF NOT EXISTS is_tournament_cap_applied BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS p1_average_deck_level NUMERIC(4,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS p2_average_deck_level NUMERIC(4,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS near_miss_data JSONB DEFAULT NULL;

-- 2. Función RPC para calcular y registrar el diagnóstico Near-Miss tras la derrota
CREATE OR REPLACE FUNCTION public.process_post_match_near_miss(
    p_match_id UUID,
    p_loser_id UUID,
    p_winner_id UUID,
    p_target_unit_id VARCHAR(32),
    p_winner_surviving_hp INTEGER,
    p_winner_unit_level INTEGER,
    p_loser_unit_level INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_near_miss_payload JSONB;
    v_unit_display_name VARCHAR(64);
BEGIN
    -- Validar si califica para Near-Miss
    IF p_winner_surviving_hp <= 2 AND p_winner_unit_level > p_loser_unit_level THEN
        
        SELECT display_name INTO v_unit_display_name 
        FROM public.units_catalog 
        WHERE id = p_target_unit_id;

        v_near_miss_payload := jsonb_build_object(
            'is_near_miss', true,
            'unit_id', p_target_unit_id,
            'unit_name', v_unit_display_name,
            'surviving_hp', p_winner_surviving_hp,
            'winner_level', p_winner_unit_level,
            'loser_level', p_loser_unit_level,
            'damage_difference_hp', (p_winner_unit_level - p_loser_unit_level) * 0.20 * 10
        );

        -- Guardar en el historial
        UPDATE public.match_history 
        SET near_miss_data = v_near_miss_payload 
        WHERE match_id = p_match_id;

        RETURN v_near_miss_payload;
    END IF;

    RETURN jsonb_build_object('is_near_miss', false);
END;
$$;
```

---

## 5. EXPERIENCIA VISUAL: EL DIAGNÓSTICO EN PANTALLA POST-COMBATE

Al ocurrir una derrota con Near-Miss, la pantalla de resultados no muestra el frío cartel de derrota habitual. Se despliega una viñeta estilo autopsia táctica militar:

```
┌────────────────────────────────────────────────────────────────┐
│  🔍 ANÁLISIS DE TELEMETRÍA DEL ALTO MANDO: CASI-VICTORIA       │
│                                                                │
│  [TU TANQUE LIGERO (NIVEL 9)]   vs   [TANQUE RIVAL (NIVEL 12)] │
│  HP Final Defensor Rival:       [■□□□□□□□□□] (1 HP RESTANTE)   │
│                                                                │
│  ┌──────────────┐                                              │
│  │  [VIÑETA     │  /~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\ │
│  │   STELLA     │ |  ¡MALDITA SEA! Tuviste la estrategia      | │
│  │   ANALÍTICA  │ <  correcta, pero su blindaje de Nivel 12   | │
│  │   CON PLANO] │ |  absorbió el impacto con solo 1 HP.       | │
│  │              │  \___________________  ____________________/ │
│  └──────────────┘                      \/                      │
│                                                                │
│  INFORME DE BALÍSTICA:                                         │
│  Si tu Tanque Ligero hubiese estado a Nivel 11, este disparo   │
│  habría infligido +1.8 de daño, DESTRUYENDO la unidad rival.   │
│                                                                │
│  ESTADO DE RECURSOS PARA MEJORA A NIVEL 10:                   │
│  • Planos: [ 250 / 200 ] (¡COMPLETO!)                          │
│  • Vigas de Acero: [ 35 / 50 ] (Faltan 15 Vigas)               │
│                                                                │
│   [ 🏭 COMPRAR ACERO EN MERCADO P2P ]   [ 🔧 IR AL HANGAR ]    │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. REGLA DE EMPAREJAMIENTO CONTROLADO (MATCHMAKING CAP DISPARITY)

Para evitar que jugadores principiantes o F2P sean destruidos por ballenas con mazos de Nivel 15:
- El algoritmo de emparejamiento del Ladder Clasificatorio evalúa el **Nivel Promedio del Mazo (APL - Average Pool Level)**.
- **Restricción Estricta:** El sistema nunca empareja a dos jugadores con una diferencia de APL superior a **$\pm 1.5$ niveles**, a menos que el jugador de nivel menor esté en una racha de más de 4 victorias consecutivas (*Smurf Prevention*).

---

## 7. CONCLUSIÓN Y TAREAS DE IMPLEMENTACIÓN

La bifurcación del Ladder y el diagnóstico Near-Miss devuelven el propósito fundamental al metajuego industrial, motivando el perfeccionamiento continuo del ejército sin defraudar el estándar competitivo de los torneos profesionales.

- [ ] **Tarea DB-7:** Desplegar columnas `p1_average_deck_level`, `near_miss_data` y función RPC `process_post_match_near_miss`.
- [ ] **Tarea Matchmaking-1:** Ajustar el algoritmo de emparejamiento del Ladder para filtrar por $\text{APL} \le 1.5$.
- [ ] **Tarea UI-Diagnostic:** Implementar la pantalla modal de autopsia balística en React con barras de HP comparativas.
- [ ] **Tarea Navigation-1:** Conectar el botón de recomendación directa de compra de acero con la ruta del Mercado P2P.

# 🌌 PROPUESTA TÉCNICA Y ARQUITECTURA DE SISTEMAS: REINGENIERÍA DEL ECOSISTEMA SOCIAL, IDENTIDAD DE COMANDANTE Y ECONOMÍA CORPORATIVA

> **DOCUMENTO DE ESPECIFICACIÓN TÉCNICA (GDD / TDD - SISTEMAS SOCIALES Y METAGAME)**  
> **Proyecto:** *Tactical Command: Wars of Legacy*  
> **Comité de Arquitectura:** Concilio Multi-Agente Antigravity (`[AG-GamePsych]`, `[AG-EconArch]`, `[AG-TacticalDir]`, `[AG-DataEng]`, `[AG-FrontendUX]`)  
> **Fecha de Emisión:** Octubre 2026  
> **Estado:** 📋 `EN REVISIÓN - PENDIENTE DE APROBACIÓN POR EL LEAD DEVELOPER (GATEKEEPER ACTIVO)`  
> **Archivos de Referencia:** `docs/03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md`, `docs/02_MASTER_METAGAME_INDUSTRY_ECONOMY.md`, `src/engine/clanSystem.ts`, `src/components/clans/ClanHeadquartersView.tsx`, `src/components/lobby/WarLobbyHub.tsx`

---

## ÍNDICE GENERAL
1. [Acta de Sesión y Debate Multi-Agente (Rondas 1 a 3)](#1-acta-de-sesión-y-debate-multi-agente-rondas-1-a-3)
2. [Arquitectura del Sistema de Identidad, Perfiles de Comandante y Cosméticos](#2-arquitectura-del-sistema-de-identidad-perfiles-de-comandante-y-cosméticos)
3. [Reingeniería del Embargo por Deshonor y Tesorería Corporativa](#3-reingeniería-del-embargo-por-deshonor-y-tesorería-corporativa)
4. [Protocolo de Logística Fraternal: Donaciones y Comercio P2P Intraclán](#4-protocolo-de-logística-fraternal-donaciones-y-comercio-p2p-intraclán)
5. [Guerra Territorial de Clanes y Sinergia Cooperativa 2v2 (Ajedrez Cruzado)](#5-guerra-territorial-de-clanes-y-sinergia-cooperativa-2v2-ajedrez-cruzado)
6. [Matriz Maestra de Configuración y Parámetros Hot-Tunable (`social_config_params`)](#6-matriz-maestra-de-configuración-y-parámetros-hot-tunable-social_config_params)
7. [Blueprint de Base de Datos y Contratos RPC (PostgreSQL / Supabase)](#7-blueprint-de-base-de-datos-y-contratos-rpc-postgresql--supabase)
8. [Roadmap de Ingeniería e Integración por Fases](#8-roadmap-de-ingeniería-e-integración-por-fases)

---

# 1. ACTA DE SESIÓN Y DEBATE MULTI-AGENTE (RONDAS 1 A 3)

### Participantes del Concilio
- **`[AG-GamePsych]`**: Psicólogo de Videojuegos, Especialista en Retención, Dinámicas Comunitarias y Monetización Ética.
- **`[AG-EconArch]`**: Economista Cuantitativo de Macro-Sistemas, Balances Faucet/Sink y Control Anti-Exploit.
- **`[AG-TacticalDir]`**: Director de Diseño de Combate Táctico, Guerra Asíncrona y Metagame Competitivo.
- **`[AG-DataEng]`**: Arquitecto de Datos Supabase / PostgreSQL, Seguridad RLS y Transaccionalidad ACID.
- **`[AG-FrontendUX]`**: Diseñador de Sistemas UI/UX, Estética Retro-Futurista Industrial y Ergonomía Visual.

---

### Ronda 1: Diagnóstico de Deficiencias y Discrepancias Actuales

**`[AG-GamePsych]`**: Camaradas, la auditoría del módulo social revela una inconsistencia crítica. En nuestro juego, unirse a un clan hoy ofrece una recompensa pasiva, pero la penalización del *Embargo por Deshonor* (0 batallas en 24h = cofre encadenado con multa de 1,500G y 30 acero) se percibe como una bofetada hostil cuando el jugador tuvo un día difícil en el trabajo o emergencias personales. Si castigamos la inactividad sin válvulas de compasión comunitaria o licencias justificadas, generamos *churn* directo (deserción). Necesitamos transformar la vergüenza en una oportunidad de rescate colectivo (*Comrade Rescue*) y dotar a cada comandante de identidad visible: banderas, banners, vitrinas de combate y placas militares.

**`[AG-EconArch]`**: Coincido con la urgencia psicológica, pero vigilemos los números. En la documentación canónica (`03_MASTER_COMMANDERS_BARK_AND_SOCIAL.md`), la fianza del embargo se divide: $50\%$ a la Tesorería del Clan y $50\%$ repartido entre el Top 3 de guerreros ($25\% / 15\% / 10\%$). Sin embargo, en el código SQL histórico (`000012_clan_system_ddl.sql`), ¡el $100\%$ iba al Top 3 porque la tabla `clans` ni siquiera tenía columnas de tesorería! Aunque la migración reciente `000016` creó `treasury_gold` y `treasury_steel`, el motor carece de sumideros (*sinks*) para ese tesoro. Si el clan acumula oro y acero sin poder gastarlo en mejoras colectivas o asedios bélicos, generamos un pozo de riqueza estéril e hiperinflación corporativa.

**`[AG-TacticalDir]`**: El problema en el combate es aún más flagrante: hoy la "Guerra de Clanes" es una simple suma lineal de victorias individuales contra bots o rivales del Ladder diario. No hay un mapa territorial, no hay fricción estratégica inter-corporaciones y el modo 2v2 cooperativo (que es el modo más divertido y táctico que tenemos) está completamente desconectado de los clanes. Si dos miembros del mismo clan juegan juntos en 2v2, deben recibir un multiplicador de impacto territorial sustancial ($\ge 1.75\times$). Debemos crear un teatro de operaciones con 7 sectores estratégicos disputados asíncronamente en ciclos de 72 horas.

**`[AG-DataEng]`**: Desde la infraestructura de base de datos, tenemos riesgos de integridad severos:
1. Las donaciones de cartas no existen en RPC ni DDL. Si no implementamos transacciones atómicas con bloqueos `FOR UPDATE`, un jugador podría donar la misma carta 10 veces en paralelo vía peticiones asíncronas concurrentes.
2. Si permitimos transferencias P2P de recursos o cartas sin candados de antigüedad de cuenta ($\ge 7$ días) y nivel de cuartel ($\ge 8$), los jugadores crearán redes de bots/smurfs para alimentar cuentas principales.
3. El cambio de nombre actual en `profiles` no tiene cooldown ni reserva de identificador numérico (`#TAG`), lo que permitiría suplantar a comandantes legendarios o líderes de clanes rivales.

**`[AG-FrontendUX]`**: A nivel de interfaz, el cuartel actual (`ClanHeadquartersView.tsx`) carece de dramatismo retro-futurista. No hay una vitrina de perfil digna para presumir medallas, la pantalla de guerra no muestra el frente de batalla con estética de mapa topográfico militar, y el embargo por deshonor no tiene la opción interactiva de que un camarada pague tu fianza. Debemos aplicar las esquinas asimétricas (`40px 10px 40px 10px`), sellos Pop-Art cromados, efectos CRT y bocadillos de radio con la paleta canónica (`#2B2C24`, `#46521F`, `#C46A3A`, `#F2E8D5`).

---

### Ronda 2: Debate de Soluciones y Tensiones Técnicas

**`[AG-EconArch]` a `[AG-GamePsych]`**: ¿Cómo evitamos que la mecánica de "Rescate de Camarada" sea explotada por jugadores que se acostumbren a que el líder siempre les pague el cofre gratis?

**`[AG-GamePsych]`**: Introduciendo un límite y un beneficio recíproco. Un comandante solo puede ser rescatado **1 vez cada 14 días**. El camarada benefactor que paga la fianza recibe inmediatamente una medalla especial visible en su perfil (*"Cruz del Buen Camarada"*), $+100$ puntos de Experiencia de Mando y $+150$ Puntos de Mérito del Clan para canjear en la Intendencia. Además, el jugador rescatado no recibe el botín íntegro: el $25\%$ de las cartas del cofre se transfieren automáticamente como agradecimiento forzoso a su rescatador. De este modo, la transacción es un pacto de honor, no un subsidio pasivo.

**`[AG-TacticalDir]` a `[AG-DataEng]`**: Si implementamos el Mapa Territorial de 7 Sectores, ¿requiere esto que los servidores sincronicen simulaciones de combate en tiempo real entre clanes?

**`[AG-DataEng]`**: ¡Rotundamente no! Eso exigiría reescribir la arquitectura de red y dispararía el costo de WebSockets. El diseño debe basarse en **Puntos de Despliegue Táctico (DP - Deployment Points)**. Cuando un miembro del clan gana una partida en el Ladder 1v1 con su mazo configurado, aporta $100\text{ DP}$ al sector activo que su clan haya marcado como "Objetivo Prioritario de la Orden del Día". Si dos miembros del clan ganan en el modo 2v2 cooperativo en escuadrón, aportan $250\text{ DP}$ ($1.25\times$ por jugar juntos $+ 1.50\times$ bono táctico $= 1.875\times \approx 250\text{ DP}$). Al cabo de 72 horas, una función cron/RPC calcula la cuota de control porcentual de cada sector según los DP depositados por las corporaciones participantes.

**`[AG-FrontendUX]` a `[AG-EconArch]`**: ¿Qué sumideros propones para que el clan gaste el Acero y Oro del Tesoro acumulado?

**`[AG-EconArch]`**: Tres sumideros mayores calibrados:
1. **Sobrealimentación Industrial (+5% extracción por 24h para todos los miembros):** Cuesta $15,000\text{G} + 250\text{ Vigas de Acero}$ del Tesoro. Solo activable por el Coronel o Capitanes.
2. **Financiamiento de Asedio Bélico (+15% DP en el sector disputado por 12h):** Cuesta $25,000\text{G} + 400\text{ Vigas de Acero} + 100\text{ Microchips}$.
3. **Estandartes e Insignias Holográficas del Clan:** Cosméticos visuales de clan que cuestan entre $50,000\text{G}$ y $200,000\text{G}$ del Tesoro, actuando como sumideros de vanidad masivos para clanes veteranos.

---

### Ronda 3: Consenso y Veredicto Unánime

El concilio multi-agente llega a un **consenso vinculante del 100%** sobre los siguientes principios arquitectónicos:

1. **Identidad Blindada y Expresiva:** Separación estricta de `display_name` y un identificador inmutable de seguridad (`#TAG` numérico o alphanumeric). Cooldown de cambio de nombre de 30 días (primer cambio gratuito, subsecuentes $250$ gemas). Soporte total para banderas de país (ISO-3166-1 alpha-2) y bandera neutral PMC.
2. **Embargo por Deshonor Justo y Comunitario:** Restitución formal del split 50% Tesorería / 50% Top 3 (25%/15%/10%). Incorporación de "Rescate de Camarada" con recompensas de mérito y 2 días mensuales de Licencia Táctica por solicitud previa.
3. **Logística Fraternal con Seguridad Bancaria:** Donaciones de cartas en ventanas de 8 horas (máximo 8 comunes o 2 raras). Recompensas directas en Oro y XP para el donante. Transferencias P2P de emergencia con impuesto fiscal del 4% directo a la Tesorería del Clan. Candados anti-smurf: antigüedad $\ge 7$ días y cuenta $\ge \text{Nivel 8}$.
4. **Guerra Territorial Asíncrona con Enfoque 2v2:** Mapa de 7 sectores con temporadas de 72 horas. Multiplicador de $1.875\times$ a $2.0\times$ para duplas de clan en 2v2 Cross-Chess.
5. **Configuración Hot-Tunable y DDL/RPCs ACID:** Centralización de parámetros en tabla `social_config_params` y redacción de contratos PL/pgSQL transaccionales bajo `SECURITY DEFINER` con revocación de ejecución anónima.

---

# 2. ARQUITECTURA DEL SISTEMA DE IDENTIDAD, PERFILES DE COMANDANTE Y COSMÉTICOS

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   EXPEDIENTE MILITAR DEL COMANDANTE (ESTILO RETRO-FUTURISTA)           │
│                                                                                        │
│  ┌───────────────────────┐   COMANDANTE: VANGUARD_01 #8492  [ 🇪🇸 ESPAÑA / PMC ]        │
│  │  [ RETRATO VINTAGE:   │   Rango: Coronel de Brigada (Nivel de Cuenta: 28)           │
│  │    MAYOR STELLA       │   Clan: [TITAN] FORJA DE HIERRO (Rango: Capitán)            │
│  │    MARCO: TITANIO ORO │   Lema: "El acero no negocia con proyectiles."              │
│  │    VFX: RADAR PULSE ] │                                                             │
│  └───────────────────────┘   [ 🏷️ TÍTULO: VETERANO DE LAS TRINCHERAS DE NEÓN ]         │
│                                                                                        │
│  ┌─────────────────────────────────┐   ┌────────────────────────────────────────────┐  │
│  │  ESTADÍSTICAS OPERATIVAS        │   │  VITRINA DE CONDECORACIONES (MEDALLAS TOP) │  │
│  │  • ELO Máximo: 4,850 (Leyenda)  │   │  [🎖️ Héroe 2v2]  [🏅 Rescate Táctico]       │  │
│  │  • Winrate 1v1: 64.2% (842 p.)  │   │  [🏆 Campeón T3] [⚡ As de la Artillería]   │  │
│  │  • Winrate 2v2: 71.8% (310 p.)  │   │                                            │  │
│  │  • Comandante Favorito: Stella  │   │  [ 📌 PIN DESTACADO: TOP 10 GUERRA SECTOR 4]│  │
│  │    (Vínculo Bond: Nivel 8)      │   │                                            │  │
│  └─────────────────────────────────┘   └────────────────────────────────────────────┘  │
│                                                                                        │
│   PALETA DE INTERFAZ: [ OLIVA TÁCTICO & ÓXIDO ]     VFX ENTRADA LOBBY: [ 🚨 ALERTA KLAXON ] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Reglas del Nombre de Código (Nickname) e Identificador Único
Para erradicar la suplantación de identidad (*impersonation*) y preservar la reputación sin sacrificar la personalización del jugador:

1. **Estructura del Nombre:** Todo comandante tiene un nombre visible (`display_name`) y un sufijo hash criptográfico inmutable (`tag_id`, ej: `#4829`).
2. **Validación Sintáctica:**
   - Longitud: Entre 3 y 16 caracteres alfanuméricos más guiones bajos (`^[a-zA-Z0-9_]{3,16}$`).
   - Filtro de Blasfemia y Discurso de Odio: Validación mediante lista de expresiones bloqueadas.
3. **Política de Cooldown y Tarifas:**
   - **Primer Cambio:** Gratuito tras el tutorial.
   - **Cooldown Temporal:** 30 días continuos requeridos entre cada modificación.
   - **Tarifa de Mando:** $250$ Gemas de Mando por cada cambio subsiguiente.
   - Si el jugador posee el *Command Pass Premium*, el cooldown se reduce a **14 días**.

### 2.2 Banderas de Jurisdicción y Facciones Militares
- **Estándar Internacional:** Soporte nativo para los 249 códigos de país del estándar **ISO-3166-1 alpha-2** (ej: `US`, `ES`, `MX`, `KR`, `DE`, `BR`, `JP`).
- **Facciones Militares Ficticias (PMC):** Para jugadores que prefieren no afiliarse a una nación real o juegan con lore distópico:
  - `PMC_TITAN`: Vanguardia Industrial y Blindaje Pesado.
  - `PMC_VALKYRIE`: Dominio Aéreo y Reacción Rápida.
  - `PMC_SHADOW`: Guerra Cibernética, Niebla y Guerra Electrónica.
  - `PMC_SOLARIS`: Artillería de Plasma y Armamento de Rayos de Partículas.
- **Visualización en Pantalla:**
  - Mini-bandera de $24\times 16\text{px}$ adyacente al nombre en la barra de vida durante el combate.
  - Placa metálica nacional en la tarjeta de emparejamiento pre-batalla.
  - Prefijo en el chat global y canal corporativo.

### 2.3 Vitrina de Rendimiento Operativo (Showcase)
El expediente del comandante es público para miembros del clan y rivales tras la partida:
1. **Métricas Clave:**
   - Récord Histórico de Trofeos y Trofeos Actuales.
   - Número de Victorias Totales, Racha Máxima y Tasa de Victorias ($1\text{v}1$ y $2\text{v}2$).
   - Nivel de Vínculo (*Commander Bond*) del Comandante insignia (expresiones desbloqueadas, viñetas personalizadas).
2. **Pines y Condecoraciones Pinned:**
   - Tres ranuras (*slots*) frontales para medallas de mérito:
     - *Cruz de Hierro de Guerra:* Otorgada por $100+$ victorias en Asedios Territoriales.
     - *Medalla del Salvador:* Otorgada por ejecutar 5 o más "Rescates de Camarada" en el clan.
     - *As del Ajedrez Cruzado:* Otorgada por alcanzar un winrate $>65\%$ en 100 partidas 2v2.
     - *Insignia del Alto Voltaje:* Condecoración exclusiva de final de temporada competitiva.

### 2.4 Matriz de Cosméticos y Reglas de Monetización Ética
Todos los cosméticos son **100% estéticos**, sin alteración de daño, velocidad, combustible o alcance de tropas:

| Categoría Cosmética | Ejemplos de Items | Método de Obtención Principal | Exclusividad / Rotación |
| :--- | :--- | :--- | :--- |
| **Marcos de Avatar** | Titanio Forjado, Neón Cyber, Laurel Dorado, Grafito Militar | Pase de Batalla (Tier 30) / Logros de Liga | Permanente / Estacional |
| **Fondos de Expediente** | Búnker Subterráneo, Pista de Aterrizaje en Niebla, Torreta de Radar | Tienda Rotativa ($350 - 600\text{ Gemas}$) | Rotación Semanal |
| **Títulos Militares** | *"El Terror de los Mares"*, *"Cerrajero de Búnkeres"*, *"Invicto"* | Desafíos de Maestría de Unidad / 2v2 | Desbloqueo por Grind |
| **Efectos de Entrada Lobby** | Sirena de Combate, Descenso de Helicóptero, Chispas Industriales | Pase de Batalla Premium (Tier 50) | Exclusivo del Pase |
| **Paletas de Interfaz** | Monocromo Radar Ámbar, Óxido Estepario, Noche Ártica | Logro de Clan (Nivel 5) / Tienda ($200\text{G}$) | Permanente |

---

# 3. REINGENIERÍA DEL EMBARGO POR DESHONOR Y TESORERÍA CORPORATIVA

```
                  FLUJO REESTRUCTURADO DEL EMBARGO POR DESHONOR
                                        │
                         [ CIERRE DE JORNADA 00:00 UTC ]
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
         [ >= 1 BATALLA REGISTRADA ]              [ 0 BATALLAS REGISTRADAS ]
         • Acceso libre a la Bóveda               • Cofre bloqueado: ¡EMBARGO!
         • Condecoración de Servicio              • Chat emite: Alerta de Inacción
                                                           │
                                        ┌──────────────────┴──────────────────┐
                                        ▼                                     ▼
                            [ PAGO DIRECTO INDIVIDUAL ]             [ RESCATE DE CAMARADA ]
                            • 1,500G + 30 Acero (o 50 Gemas)        • Un aliado solvente paga fianza
                                        │                           • Camarada gana: XP + Medalla
                                        │                           • Rescatado cede 25% de cartas
                                        └──────────────────┬──────────────────┘
                                                           ▼
                                            [ REPARTO DE LA FIANZA ]
                                            • 50% al Tesoro del Clan
                                            • 25% al Top 1 del Clan
                                            • 15% al Top 2 del Clan
                                            • 10% al Top 3 del Clan
                                                           │
                                                           ▼
                                            [ GASTOS DEL TESORO DEL CLAN ]
                                            • Sobrealimentación Industrial (+5% vel.)
                                            • Asedio de Guerra Territorial (+15% DP)
                                            • Insignias y Estandartes Holográficos
```

### 3.1 Resolución de la Discrepancia Canónica SQL vs Documentación
En las versiones tempranas de la base de datos (`000012`), el 100% de la multa se transfería al Top 3 de guerreros debido a que la tabla `clans` no poseía columnas para custodiar fondos. Con la migración `000016` se agregaron los campos `treasury_gold` y `treasury_steel`.

**El nuevo contrato matemático definitivo establece:**
$$\text{Fianza Total} = 1,500\text{G} + 30\text{ Vigas de Acero} \quad (\text{o } 50\text{ Gemas de Mando})$$
$$\text{Cuota Tesoro del Clan} = 50\% \implies 750\text{G} + 15\text{ Vigas de Acero}$$
$$\text{Fondo Aristocrático de Honor (Top 3)} = 50\% \implies 750\text{G} + 15\text{ Vigas de Acero}$$
- **Top 1 Contribuyente:** Recibe el $50\%$ de este fondo $\implies 375\text{G} + 8\text{ Vigas de Acero}$ (redondeo ascendente de acero).
- **Top 2 Contribuyente:** Recibe el $30\%$ de este fondo $\implies 225\text{G} + 4\text{ Vigas de Acero}$.
- **Top 3 Contribuyente:** Recibe el $20\%$ de este fondo $\implies 150\text{G} + 3\text{ Vigas de Acero}$.

Si se pagó en Gemas ($50$ Gemas):
- $25$ Gemas ingresan a `treasury_gems` en `clans`.
- Top 1 recibe $13$ Gemas, Top 2 recibe $7$ Gemas, Top 3 recibe $5$ Gemas.

### 3.2 Protocolo de "Rescate de Camarada" (*Comrade Rescue*)
Para amortiguar la fricción de castigo y fortalecer lazos afectivos:
1. **Mecánica:** Si un comandante amanece bajo embargo, cualquier compañero del clan con rango igual o superior a Soldado Veterano puede hacer clic en **[ RESCATAR CAMARADA ]** dentro de la pestaña de miembros.
2. **Costo para el Benefactor:** Paga el monto de la fianza ($1,500\text{G} + 30\text{ Acero}$).
3. **Recompensas para el Benefactor:**
   - $+150$ Puntos de Experiencia de Mando inmediata.
   - $+1$ al contador de la medalla de perfil *"Buen Camarada"*.
   - El **$25\%$ de las cartas** del cofre del jugador rescatado se transfieren instantáneamente a la cuenta del benefactor.
4. **Restricción de Salvaguarda Anti-Abuso:**
   - Un jugador solo puede ser rescatado **1 vez cada 14 días**.
   - Nadie puede rescatar a un miembro cuya cuenta tenga menos de 7 días de permanencia en el clan.

### 3.3 Licencias de Cuartel y Gracia Militar (*Military Furlough*)
- Cada miembro del clan dispone de **2 Licencias Tácticas mensuales** en su panel de perfil.
- Si el jugador sabe que viajará o no podrá conectarse, activa la licencia con anterioridad.
- Durante el ciclo de 24 horas protegido:
  - No cae en *Embargo por Deshonor* aunque registre 0 batallas.
  - Recibe el cofre de Tier 1 estándar (no participa en la bonificación de Tier 2 o Tier 3 de la Bóveda).
  - El clan es notificado con el mensaje: *"El Comandante [Nombre] se encuentra en Comisión de Servicio Autorizada"*.

### 3.4 Árbol de Sumideros y Mejoras del Tesoro del Clan
El tesoro corporativo ya no es un acumulador pasivo; se drena en las siguientes directivas:

```
                            ÁRBOL DE PROYECTOS DEL ALTO MANDO
                                            │
        ┌───────────────────────────────────┼───────────────────────────────────┐
        ▼                                   ▼                                   ▼
 [ PROYECTO MANHATTAN ]              [ PROYECTO BLITZKRIEG ]             [ ESTANDARTE MAJESTUOSO ]
 +5% Velocidad de Extracción         +15% Puntos de Despliegue en        Marco dorado y emblema
 en Complejo Industrial (24h).      Guerra Territorial (12h).           holográfico para el clan.
 Coste: 15,000G + 250 Acero.        Coste: 25,000G + 400 Acero + 100 Chips. Coste: 100,000G + 1,000 Acero.
```

---

# 4. PROTOCOLO DE LOGÍSTICA FRATERNAL: DONACIONES Y COMERCIO P2P INTRACLÁN

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   TERMINAL DE SUMINISTROS Y LOGÍSTICA DE COMBATE                       │
│                                                                                        │
│  SOLICITUD ACTIVA: TENIENTE_KAI (Nivel 14)                                              │
│  "Camaradas, requiero planos para ensamblar mi batería Antiaérea Vulcan."              │
│  Progreso: [ ■■■■■■■□□□ ] ( 7 / 8 Planos Comunes )                                      │
│                                                                                        │
│  [ 📦 DONAR PLANO COMÚN (Tienes: 42) ]                                                  │
│  Recompensa inmediata para ti: +5 XP de Comandante  +  25 Créditos de Oro              │
│                                                                                        │
│  ────────────────────────────────────────────────────────────────────────────────────  │
│  VENTANA DE SOLICITUD: Enfriamiento de 8 Horas                                         │
│  • Comunes: Hasta 8 unidades por solicitud (Genera hasta 200G y 40 XP al clan)         │
│  • Raras: Hasta 2 unidades por solicitud (Genera hasta 300G y 50 XP al clan)           │
│  • Épicas: Bloqueadas de lunes a sábado. ¡DISPONIBLES EN EL "DOMINGO DE SUMINISTROS"!  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Matriz de Cuotas de Donación y Recompensas
El intercambio de cartas no empobrece al donante; lo incentiva convirtiendo cartas sobrantes en liquidez de oro y experiencia de cuenta:

| Rareza de Carta | Límite por Solicitud (Cada 8h) | Límite Máx. que 1 Jugador puede Donar a esa Solicitud | Recompensa al Donante por Carta | Costo en Planos para Donar |
| :--- | :--- | :--- | :--- | :--- |
| **Común** | 8 cartas | 2 cartas | $+25\text{G} \quad +5\text{ XP}$ | 1 Plano Común |
| **Rara** | 2 cartas | 1 carta | $+150\text{G} \quad +25\text{ XP}$ | 1 Plano Raro |
| **Épica (Solo Domingos)** | 1 carta | 1 carta | $+500\text{G} \quad +100\text{ XP}$ | 1 Plano Épico |
| **Legendaria** | **PROHIBIDA** | 0 cartas | N/A | Incompatible |

### 4.2 Transferencia de Emergencia P2P de Recursos Industriales
Para evitar que un miembro se quede bloqueado por falta de vigas de acero militar o microchips al subir una carta en un momento clave:
1. **Canal de Intercambio Directo:** Un miembro puede solicitar hasta $50\text{ Vigas de Acero}$ o $10\text{ Microchips}$ a otro miembro específico del clan.
2. **Arancel Fiscal de Guerra (Sink Tributario):**
   - El sistema retiene automáticamente un **$4\%$ del monto transferido** como tasa impositiva.
   - Este impuesto **no desaparece al vacío**: se ingresa de forma automática en la `treasury_steel` de la corporación.
   - Ejemplo: Juan envía $50$ vigas a Pedro $\implies$ Pedro recibe $48$ vigas; $2$ vigas van al Tesoro del Clan.

### 4.3 Protocolo Anti-Exploit, Anti-Botting y Anti-Smurf
Para garantizar que nadie configure cuentas secundarias para inflar cuentas principales:
1. **Antigüedad de Cuartel:** Ninguna cuenta con menos de **7 días ininterrumpidos en el clan** puede emitir solicitudes de donación ni recibir transferencias de recursos P2P.
2. **Requisito de Nivel Mínimo:** La cuenta debe haber alcanzado al menos el **Nivel de Cuenta 8** y completado 20 partidas clasificatorias.
3. **Tope Semanal de Valor de Donación:** Ningún jugador puede donar más de $5,000\text{G}$ en valor equivalente de cartas o recibir más de $150$ cartas comunes semanales. Al alcanzar el tope, la interfaz bloquea el botón con el mensaje: *"Límite Logístico Semanal del Estado Mayor Alcanzado"*.
4. **Huella de Hardware y Red (Detección de Colusión):** Si dos cuentas comparten la misma IP y token de dispositivo en Supabase Auth de forma recurrente, las transferencias directas entre ellas quedan inhibidas con un flag de auditoría interna.

---

# 5. GUERRA TERRITORIAL DE CLANES Y SINERGIA COOPERATIVA 2v2 (AJEDREZ CRUZADO)

```
                            TEATRO DE OPERACIONES MILITARES (7 SECTORES)
                                        
                                 [ SECTOR 1: BASE AÉREA ]
                                            │
                     ┌──────────────────────┼──────────────────────┐
                     ▼                                             ▼
          [ SECTOR 2: REFINERÍA ]                       [ SECTOR 3: RADAR MAESTRO ]
                     │                                             │
                     └──────────────────────┬──────────────────────┘
                                            ▼
                               [ SECTOR 4: CIUDADELA CENTRAL ]
                                    (¡DISPUTA MÁXIMA!)
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
         [ SECTOR 5: CIBER-COMANDO ]                    [ SECTOR 6: ASTILLERO ]
                     │                                             │
                     └──────────────────────┬──────────────────────┘
                                            ▼
                              [ SECTOR 7: DEPÓSITO FERROVIARIO ]
```

### 5.1 Los 7 Sectores Estratégicos del Frente
Cada sector confiere una ventaja táctica y recursos pasivos diarios al clan que posea la mayoría de control al cierre del ciclo de 72 horas:

1. **Sector 1 (Base Aérea "Águila Negra"):** Otorga $+10\%$ de probabilidad de que los drops de cofres contengan cartas aéreas y $+150\text{G}$ diarios a la Tesorería.
2. **Sector 2 (Refinería Petroquímica):** Incrementa la producción pasiva de combustible industrial en $+10\%$ para todos los miembros.
3. **Sector 3 (Radar Maestro de Cota Cero):** Revela en el Ladder el comandante rival antes de elegir el mazo en partidas de torneos.
4. **Sector 4 (Ciudadela Central - Bastión Supremo):** El núcleo del mapa. Otorga $+500\text{G} + 20\text{ Vigas de Acero}$ diarios a la Tesorería y la prestigiosa medalla holográfica de sector en el chat global.
5. **Sector 5 (Centro de Ciber-Guerra):** Otorga un $5\%$ de descuento en todos los costos de forja en el Complejo Industrial.
6. **Sector 6 (Astillero Fluvial):** Incrementa la recompensa de planos navales y de artillería en cofres de victoria.
7. **Sector 7 (Depósito Ferroviario):** Permite el transporte gratuito de suministros sin arancel entre miembros del clan.

### 5.2 Estructura del Ciclo de Guerra de 72 Horas
Cada guerra se divide en tres fases automáticas gobernadas por un cron de Supabase:
- **Fase 1: Reconocimiento y Orden del Día (Horas 0 a 12):** El Líder y los Oficiales del clan seleccionan dos sectores como **"Objetivos Prioritarios"**. Las victorias en estos sectores generarán un $+25\%$ adicional de DP.
- **Fase 2: Asedio Abierto (Horas 12 a 60):** Todos los miembros del clan juegan partidas 1v1 y 2v2 para canalizar Puntos de Despliegue hacia los sectores en disputa.
- **Fase 3: Consolidación y Conquista (Horas 60 a 72):** Se duplica la tensión. El sector central (Ciudadela) entra en estado de sobretensión (*Overdrive*), otorgando el doble de botín al clan que logre conquistarlo.
- **Cierre y Distribución (Hora 72):** Se audita la posesión de cada sector. Los miembros activos reciben el cofre de botín de guerra proporcional a su participación.

### 5.3 El Rol Clave del Modo 2v2: Ajedrez Cruzado
El modo cooperativo 2v2 (`src/components/lobby/WarLobbyHub.tsx`) se convierte en la herramienta reina de dominación territorial:

$$\text{DP Victoria Individual } (1\text{v}1) = 100\text{ Puntos de Despliegue}$$
$$\text{DP Derrota } (1\text{v}1) = 25\text{ Puntos de Despliegue (por esfuerzo bélico)}$$
$$\mathbf{\text{DP Victoria en Pareja de Clan } (2\text{v}2) = 100 \times 1.25\ (\text{bono escuadrón}) \times 1.50\ (\text{bono táctico 2v2}) = \mathbf{187.5} \approx \mathbf{200\text{ DP por comandante}}}$$

**Impacto Colectivo de una victoria 2v2:**  
Al ganar una partida dos miembros del mismo clan juntos en el modo Ajedrez Cruzado, inyectan un total combinado de **$400\text{ Puntos de Despliegue}$ directos** al sector disputado, cuatro veces el impacto de una victoria solitaria. Esto estimula la formación de parejas tácticas en Discord, la sincronización horaria de los miembros y la cohesión comunitaria orgánica.

---

# 6. MATRIZ MAESTRA DE CONFIGURACIÓN Y PARÁMETROS HOT-TUNABLE (`social_config_params`)

Para posibilitar cambios de balance en tiempo real sin requerir re-despliegues de código ni aprobaciones en tiendas móviles, todos los parámetros se gobiernan desde la tabla `social_config_params` en PostgreSQL:

```json
{
  "identity": {
    "nickname_change_cooldown_days": 30,
    "nickname_change_premium_cooldown_days": 14,
    "nickname_change_gem_cost": 250,
    "max_display_name_length": 16,
    "min_display_name_length": 3,
    "default_faction_flag": "PMC_TITAN"
  },
  "dishonor_embargo": {
    "fines": {
      "gold_cost": 1500,
      "steel_cost": 30,
      "gem_cost_alternative": 50
    },
    "split_distribution": {
      "treasury_percent": 0.50,
      "top1_dividend_percent": 0.25,
      "top2_dividend_percent": 0.15,
      "top3_dividend_percent": 0.10
    },
    "rescue_mechanic": {
      "cooldown_days_per_user": 14,
      "donor_xp_reward": 150,
      "donor_stolen_chest_cards_ratio": 0.25,
      "donor_clan_merit_reward": 150
    },
    "military_furlough": {
      "allowed_days_per_month": 2,
      "reward_tier_fallback": 1
    }
  },
  "donations_p2p": {
    "cooldown_hours": 8,
    "limits_per_cycle": {
      "common_cards": 8,
      "rare_cards": 2,
      "epic_cards_sunday_only": 1
    },
    "donor_rewards": {
      "common": { "gold": 25, "xp": 5 },
      "rare": { "gold": 150, "xp": 25 },
      "epic": { "gold": 500, "xp": 100 }
    },
    "p2p_emergency_transfer": {
      "tax_rate_to_treasury": 0.04,
      "max_steel_transfer": 50,
      "max_microchips_transfer": 10,
      "min_account_age_days": 7,
      "min_account_level": 8
    }
  },
  "territorial_war": {
    "cycle_duration_hours": 72,
    "total_sectors": 7,
    "points_per_match": {
      "solo_victory_dp": 100,
      "solo_defeat_dp": 25,
      "coop_2v2_clan_victory_multiplier": 2.00,
      "priority_target_bonus_multiplier": 1.25
    },
    "treasury_sinks": {
      "industrial_overcharge": {
        "gold_cost": 15000,
        "steel_cost": 250,
        "duration_hours": 24,
        "buff_extraction_pct": 5
      },
      "war_siege_funding": {
        "gold_cost": 25000,
        "steel_cost": 400,
        "microchips_cost": 100,
        "duration_hours": 12,
        "buff_dp_pct": 15
      }
    }
  }
}
```

---

# 7. BLUEPRINT DE BASE DE DATOS Y CONTRATOS RPC (POSTGRESQL / SUPABASE)

> [!IMPORTANT]
> Este esquema es el diseño transaccional exhaustivo preparado para la migración. Los RPCs utilizan `SECURITY DEFINER` y transacciones con bloqueos a nivel de fila (`FOR UPDATE`) para salvaguardar la integridad financiera de las cuentas.

### 7.1 DDL de Tablas Nuevas y Alteraciones Estructurales

```sql
-- ============================================================================
-- 1. EXTENSIÓN Y ACTUALIZACIÓN DE TABLAS DE IDENTIDAD Y CLANES
-- ============================================================================

-- Alteración de la tabla 'profiles' para soportar identidad retro-futurista
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS tag_id VARCHAR(6) DEFAULT LPAD(FLOOR(RANDOM()*10000)::TEXT, 4, '0'),
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(10) DEFAULT 'PMC_TITAN',
  ADD COLUMN IF NOT EXISTS custom_bio VARCHAR(140) DEFAULT 'Comandante en servicio activo.',
  ADD COLUMN IF NOT EXISTS military_title VARCHAR(50) DEFAULT 'Recluta de Vanguardia',
  ADD COLUMN IF NOT EXISTS active_avatar_frame_id VARCHAR(50) DEFAULT 'frame_iron_standard',
  ADD COLUMN IF NOT EXISTS active_banner_id VARCHAR(50) DEFAULT 'banner_bunker_mesh',
  ADD COLUMN IF NOT EXISTS active_lobby_vfx_id VARCHAR(50) DEFAULT 'vfx_standard_alert',
  ADD COLUMN IF NOT EXISTS ui_palette_id VARCHAR(50) DEFAULT 'palette_olive_retro',
  ADD COLUMN IF NOT EXISTS last_nickname_change_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS military_furloughs_left INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS last_furlough_reset_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_embargo_rescue_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_medals JSONB DEFAULT '["medal_recruit", null, null]'::jsonb;

-- Asegurar columnas de tesorería y configuración en 'clans'
ALTER TABLE clans
  ADD COLUMN IF NOT EXISTS treasury_gold BIGINT DEFAULT 0 CHECK (treasury_gold >= 0),
  ADD COLUMN IF NOT EXISTS treasury_steel BIGINT DEFAULT 0 CHECK (treasury_steel >= 0),
  ADD COLUMN IF NOT EXISTS treasury_gems BIGINT DEFAULT 0 CHECK (treasury_gems >= 0),
  ADD COLUMN IF NOT EXISTS active_war_buffs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS clan_banner_cosmetic_id VARCHAR(50) DEFAULT 'banner_clan_default';

-- ============================================================================
-- 2. CATÁLOGO DE COSMÉTICOS Y ADQUISICIONES DE USUARIO
-- ============================================================================

CREATE TABLE IF NOT EXISTS cosmetics_catalog (
  id VARCHAR(50) PRIMARY KEY,
  category VARCHAR(30) NOT NULL CHECK (category IN ('frame', 'banner', 'title', 'lobby_vfx', 'palette', 'clan_banner')),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  rarity VARCHAR(20) NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  price_gems INT DEFAULT 0,
  price_gold INT DEFAULT 0,
  is_pass_exclusive BOOLEAN DEFAULT FALSE,
  is_purchasable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_cosmetics (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  cosmetic_id VARCHAR(50) REFERENCES cosmetics_catalog(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, cosmetic_id)
);

-- ============================================================================
-- 3. LOGÍSTICA DE DONACIÓN DE CARTAS Y TRANSFERENCIAS P2P
-- ============================================================================

CREATE TABLE IF NOT EXISTS clan_card_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id VARCHAR(50) NOT NULL,
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic')),
  amount_requested INT NOT NULL,
  amount_donated INT NOT NULL DEFAULT 0,
  is_fulfilled BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clan_card_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES clan_card_requests(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL CHECK (amount > 0),
  gold_reward INT NOT NULL DEFAULT 0,
  xp_reward INT NOT NULL DEFAULT 0,
  donated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. GUERRA TERRITORIAL DE CLANES (7 SECTORES Y TEMPORADAS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS clan_war_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INT NOT NULL UNIQUE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clan_territory_sectors (
  sector_id INT PRIMARY KEY CHECK (sector_id BETWEEN 1 AND 7),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  strategic_buff_type VARCHAR(50) NOT NULL,
  current_controlling_clan_id UUID REFERENCES clans(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clan_war_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES clan_war_seasons(id) ON DELETE CASCADE,
  sector_id INT NOT NULL REFERENCES clan_territory_sectors(sector_id) ON DELETE CASCADE,
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deployment_points INT NOT NULL CHECK (deployment_points > 0),
  battle_type VARCHAR(20) NOT NULL CHECK (battle_type IN ('solo_1v1', 'coop_2v2')),
  deployed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en las tablas
ALTER TABLE cosmetics_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_card_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_card_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_war_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_territory_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_war_deployments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS de solo lectura pública y escritura reservada
CREATE POLICY "Public read cosmetics_catalog" ON cosmetics_catalog FOR SELECT USING (true);
CREATE POLICY "Users read own user_cosmetics" ON user_cosmetics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Clan members read clan_card_requests" ON clan_card_requests FOR SELECT USING (true);
CREATE POLICY "Clan members read clan_card_donations" ON clan_card_donations FOR SELECT USING (true);
CREATE POLICY "Public read clan_territory_sectors" ON clan_territory_sectors FOR SELECT USING (true);
CREATE POLICY "Public read clan_war_seasons" ON clan_war_seasons FOR SELECT USING (true);
CREATE POLICY "Public read clan_war_deployments" ON clan_war_deployments FOR SELECT USING (true);
```

---

### 7.2 Contratos Transaccionales PL/pgSQL (RPCs de Supabase)

#### RPC 1: `rpc_request_card_donation` (Solicitar Donación)
```sql
CREATE OR REPLACE FUNCTION rpc_request_card_donation(
  p_card_id VARCHAR(50),
  p_rarity VARCHAR(20)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clan_id UUID;
  v_joined_at TIMESTAMPTZ;
  v_account_level INT;
  v_last_request_at TIMESTAMPTZ;
  v_max_amount INT;
  v_new_request_id UUID;
BEGIN
  -- 1. Verificar identidad del solicitante
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  -- 2. Verificar membresía y antigüedad en el clan (>= 7 días)
  SELECT clan_id, joined_at INTO v_clan_id, v_joined_at
  FROM clan_members
  WHERE user_id = v_user_id;

  IF v_clan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No perteneces a ningún clan');
  END IF;

  IF v_joined_at > NOW() - INTERVAL '7 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requieres al menos 7 días de servicio en el clan');
  END IF;

  -- 3. Verificar nivel de cuenta (>= 8)
  SELECT level INTO v_account_level FROM profiles WHERE id = v_user_id;
  IF v_account_level < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requieres Nivel de Mando 8 para solicitar suministros');
  END IF;

  -- 4. Verificar enfriamiento de 8 horas desde la última solicitud
  SELECT MAX(created_at) INTO v_last_request_at
  FROM clan_card_requests
  WHERE requester_id = v_user_id;

  IF v_last_request_at IS NOT NULL AND v_last_request_at > NOW() - INTERVAL '8 hours' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Línea de suministros en enfriamiento. Espera 8 horas.');
  END IF;

  -- 5. Validar rareza y cupo
  IF p_rarity = 'common' THEN
    v_max_amount := 8;
  ELSIF p_rarity = 'rare' THEN
    v_max_amount := 2;
  ELSIF p_rarity = 'epic' THEN
    -- Validar si hoy es domingo (0 = domingo en EXTRACT(DOW))
    IF EXTRACT(DOW FROM NOW()) <> 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Las cartas épicas solo pueden solicitarse los domingos');
    END IF;
    v_max_amount := 1;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Rareza de carta inválida para donación');
  END IF;

  -- 6. Insertar solicitud con expiración de 12 horas
  INSERT INTO clan_card_requests (
    clan_id, requester_id, card_id, rarity, amount_requested, expires_at
  ) VALUES (
    v_clan_id, v_user_id, p_card_id, p_rarity, v_max_amount, NOW() + INTERVAL '12 hours'
  ) RETURNING id INTO v_new_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_new_request_id,
    'amount_requested', v_max_amount,
    'expires_at', NOW() + INTERVAL '12 hours'
  );
END;
$$;
```

#### RPC 2: `rpc_donate_cards` (Donar Cartas y Recibir Botín)
```sql
CREATE OR REPLACE FUNCTION rpc_donate_cards(
  p_request_id UUID,
  p_amount INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_donor_id UUID := auth.uid();
  v_req RECORD;
  v_gold_reward INT := 0;
  v_xp_reward INT := 0;
  v_cards_needed INT;
  v_donated_cards_count INT;
BEGIN
  IF v_donor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  -- Bloquear la fila de solicitud para evitar condiciones de carrera (Concurrency lock)
  SELECT * INTO v_req
  FROM clan_card_requests
  WHERE id = p_request_id AND is_fulfilled = FALSE AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'La solicitud ya expiró o fue completada');
  END IF;

  IF v_req.requester_id = v_donor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'No puedes donarte cartas a ti mismo');
  END IF;

  v_cards_needed := v_req.amount_requested - v_req.amount_donated;
  IF p_amount > v_cards_needed THEN
    p_amount := v_cards_needed;
  END IF;

  -- Validar donación máxima por miembro individual a la misma solicitud
  SELECT COALESCE(SUM(amount), 0) INTO v_donated_cards_count
  FROM clan_card_donations
  WHERE request_id = p_request_id AND donor_id = v_donor_id;

  IF (v_req.rarity = 'common' AND v_donated_cards_count + p_amount > 2) OR
     (v_req.rarity IN ('rare', 'epic') AND v_donated_cards_count + p_amount > 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Alcanzaste tu cupo máximo de donación para esta solicitud');
  END IF;

  -- Calcular recompensas
  IF v_req.rarity = 'common' THEN
    v_gold_reward := p_amount * 25;
    v_xp_reward := p_amount * 5;
  ELSIF v_req.rarity = 'rare' THEN
    v_gold_reward := p_amount * 150;
    v_xp_reward := p_amount * 25;
  ELSIF v_req.rarity = 'epic' THEN
    v_gold_reward := p_amount * 500;
    v_xp_reward := p_amount * 100;
  END IF;

  -- Registrar la donación
  INSERT INTO clan_card_donations (
    request_id, donor_id, amount, gold_reward, xp_reward
  ) VALUES (
    p_request_id, v_donor_id, p_amount, v_gold_reward, v_xp_reward
  );

  -- Actualizar progreso de la solicitud
  UPDATE clan_card_requests
  SET 
    amount_donated = amount_donated + p_amount,
    is_fulfilled = (amount_donated + p_amount >= amount_requested)
  WHERE id = p_request_id;

  -- Premiar al donante en oro y experiencia
  UPDATE profiles
  SET 
    gold = gold + v_gold_reward,
    experience = experience + v_xp_reward
  WHERE id = v_donor_id;

  -- Registrar en el libro mayor de auditoría
  INSERT INTO currency_ledger (profile_id, delta, currency, reason)
  VALUES (v_donor_id, v_gold_reward, 'gold', 'clan_card_donation_reward');

  RETURN jsonb_build_object(
    'success', true,
    'amount_donated', p_amount,
    'gold_reward', v_gold_reward,
    'xp_reward', v_xp_reward
  );
END;
$$;
```

#### RPC 3: `rpc_rescue_embargoed_comrade` (Rescate de Camarada Embargado)
```sql
CREATE OR REPLACE FUNCTION rpc_rescue_embargoed_comrade(
  p_embargoed_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_savior_id UUID := auth.uid();
  v_clan_id UUID;
  v_savior_gold BIGINT;
  v_savior_steel INT;
  v_last_rescue_at TIMESTAMPTZ;
  v_member_rec RECORD;
  v_gold_fine CONSTANT BIGINT := 1500;
  v_steel_fine CONSTANT INT := 30;
BEGIN
  IF v_savior_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  IF v_savior_id = p_embargoed_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'No puedes auto-rescatarte de tu propio embargo');
  END IF;

  -- 1. Verificar que ambos pertenecen al mismo clan
  SELECT clan_id INTO v_clan_id FROM clan_members WHERE user_id = v_savior_id;
  SELECT * INTO v_member_rec FROM clan_members WHERE user_id = p_embargoed_user_id AND clan_id = v_clan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'El miembro no pertenece a tu clan militar');
  END IF;

  -- 2. Verificar que el miembro objetivo esté efectivamente bajo embargo
  IF NOT v_member_rec.is_embargoed THEN
    RETURN jsonb_build_object('success', false, 'error', 'El camarada no se encuentra bajo embargo');
  END IF;

  -- 3. Verificar cooldown de rescate del usuario embargado (1 vez cada 14 días)
  SELECT last_embargo_rescue_at INTO v_last_rescue_at FROM profiles WHERE id = p_embargoed_user_id;
  IF v_last_rescue_at IS NOT NULL AND v_last_rescue_at > NOW() - INTERVAL '14 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este camarada ya recibió un rescate en los últimos 14 días');
  END IF;

  -- 4. Verificar fondos del salvador
  SELECT gold, steel_beams INTO v_savior_gold, v_savior_steel
  FROM profiles WHERE id = v_savior_id FOR UPDATE;

  IF v_savior_gold < v_gold_fine OR v_savior_steel < v_steel_fine THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fondos insuficientes para costear la fianza militar');
  END IF;

  -- 5. Descontar fianza al salvador
  UPDATE profiles
  SET 
    gold = gold - v_gold_fine,
    steel_beams = steel_beams - v_steel_fine,
    experience = experience + 150
  WHERE id = v_savior_id;

  -- 6. Liquidar Fianza: 50% al Tesoro del Clan (750G + 15 Acero)
  UPDATE clans
  SET 
    treasury_gold = treasury_gold + 750,
    treasury_steel = treasury_steel + 15
  WHERE id = v_clan_id;

  -- 7. Distribuir el 50% restante al Top 3 del clan
  -- (Top 1: 375G + 8 Acero, Top 2: 225G + 4 Acero, Top 3: 150G + 3 Acero)
  WITH ranked_warriors AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY war_victories DESC, donated_cards_weekly DESC) AS pos
    FROM clan_members
    WHERE clan_id = v_clan_id
    LIMIT 3
  )
  UPDATE profiles p
  SET 
    gold = p.gold + CASE WHEN rw.pos = 1 THEN 375 WHEN rw.pos = 2 THEN 225 ELSE 150 END,
    steel_beams = p.steel_beams + CASE WHEN rw.pos = 1 THEN 8 WHEN rw.pos = 2 THEN 4 ELSE 3 END
  FROM ranked_warriors rw
  WHERE p.id = rw.user_id;

  -- 8. Levantar embargo al camarada
  UPDATE clan_members
  SET is_embargoed = FALSE
  WHERE user_id = p_embargoed_user_id;

  UPDATE profiles
  SET last_embargo_rescue_at = NOW()
  WHERE id = p_embargoed_user_id;

  -- 9. Registrar eventos en el ledger
  INSERT INTO currency_ledger (profile_id, delta, currency, reason)
  VALUES (v_savior_id, -v_gold_fine, 'gold', 'rescue_comrade_fine_paid');

  RETURN jsonb_build_object(
    'success', true,
    'rescued_user_id', p_embargoed_user_id,
    'xp_earned_by_savior', 150,
    'treasury_gold_deposit', 750,
    'treasury_steel_deposit', 15
  );
END;
$$;
```

#### RPC 4: `rpc_contribute_territory_points` (Aporte Territorial en Guerra)
```sql
CREATE OR REPLACE FUNCTION rpc_contribute_territory_points(
  p_sector_id INT,
  p_is_coop_2v2 BOOLEAN,
  p_is_victory BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clan_id UUID;
  v_active_season_id UUID;
  v_dp_earned INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT clan_id INTO v_clan_id FROM clan_members WHERE user_id = v_user_id;
  IF v_clan_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No perteneces a ningún clan');
  END IF;

  -- Obtener temporada de guerra activa
  SELECT id INTO v_active_season_id
  FROM clan_war_seasons
  WHERE is_active = TRUE AND NOW() BETWEEN starts_at AND ends_at
  LIMIT 1;

  IF v_active_season_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hay un ciclo de guerra territorial activo en este momento');
  END IF;

  -- Calcular Puntos de Despliegue (DP)
  IF p_is_victory THEN
    IF p_is_coop_2v2 THEN
      v_dp_earned := 200; -- Multiplicador 2.0x por Cooperativo 2v2
    ELSE
      v_dp_earned := 100; -- Victoria regular 1v1
    END IF;
  ELSE
    v_dp_earned := 25; -- Esfuerzo bélico por derrota
  END IF;

  -- Registrar despliegue militar
  INSERT INTO clan_war_deployments (
    season_id, sector_id, clan_id, user_id, deployment_points, battle_type
  ) VALUES (
    v_active_season_id, p_sector_id, v_clan_id, v_user_id, v_dp_earned,
    CASE WHEN p_is_coop_2v2 THEN 'coop_2v2' ELSE 'solo_1v1' END
  );

  RETURN jsonb_build_object(
    'success', true,
    'season_id', v_active_season_id,
    'sector_id', p_sector_id,
    'dp_contributed', v_dp_earned,
    'coop_bonus_applied', p_is_coop_2v2
  );
END;
$$;
```

---

# 8. ROADMAP DE INGENIERÍA E INTEGRACIÓN POR FASES

Para ejecutar la transición de manera limpia, sin deuda técnica ni fallas en producción, se ha estructurado un cronograma de 5 fases secuenciales:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CRONOGRAMA DE IMPLEMENTACIÓN TÉCNICA                            │
│                                                                                        │
│  FASE 1: Identidad, Perfiles y Banderas ISO        [ SPRINT SOCIAL 1 - DÍAS 1-2 ]       │
│  • Migración DDL profiles, tags numéricos, catálogo de cosméticos y selección de UI.   │
│                                                                                        │
│  FASE 2: Tesorería del Clan y Embargo 50/50       [ SPRINT SOCIAL 2 - DÍAS 3-4 ]       │
│  • Restitución canónica del split, RPCs de Rescate y activación de Licencias Tácticas. │
│                                                                                        │
│  FASE 3: Logística Fraternal (Donaciones P2P)     [ SPRINT SOCIAL 3 - DÍAS 5-6 ]       │
│  • RPCs de donación, límites en ventanas de 8h, impuestos del 4% y candados anti-bot. │
│                                                                                        │
│  FASE 4: Guerra Territorial y Sinergia 2v2        [ SPRINT SOCIAL 4 - DÍAS 7-8 ]       │
│  • Mapa de 7 sectores, multiplicador 2v2 Cross-Chess y cálculo cíclico de control.    │
│                                                                                        │
│  FASE 5: Interfaz Retro-Futurista y Pulido Visual  [ SPRINT SOCIAL 5 - DÍAS 9-10 ]     │
│  • Componentes React de Expediente Militar, Sellos Pop-Art, CRT e integración de audio.│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Métricas de Éxito y Criterios de Aceptación (KPIs)
1. **Retención Social (D7 y D30):** Incremento del $+18\%$ en retención de usuarios que ingresan a un clan en sus primeros 3 días.
2. **Volumen de Cooperación 2v2:** Triplicar las partidas en pareja de clan gracias al multiplicador de DP en la Guerra Territorial.
3. **Erradicación del Churn por Embargo:** Disminución del $75\%$ de abandonos tras un día de inactividad, canalizados mediante las Licencias Tácticas y el Rescate de Camarada.
4. **Circulación de Tesorería:** El $80\%$ de los clanes activos deberán invertir fondos de su tesorería semanalmente en mejoras industriales o asedios bélicos.

---

> 🛑 **ESTADO DEL COMITÉ:** Documento técnico concluido en su totalidad. **A la espera de confirmación y `APPROVAL` por parte del Desarrollador Principal antes de modificar archivos de código fuente o ejecutar migraciones de base de datos.**

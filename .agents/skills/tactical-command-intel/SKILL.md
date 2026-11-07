---
name: tactical-command-intel
description: Directriz canónica de diseño, arquitectura UI/UX y motor de Game Feel para GEOTACTICS ONLINE (Tactical Command: Wars of Legacy). Fusiona la consola de mando táctico militar (C4ISR, blindaje, radares WebGL Zero-Raster) con la energía cinética de la novela gráfica bélica (Advance Wars meets Persona 5 / Hades), bocadillos dinámicos del Bark Engine (29 Comandantes + Stella IA), sellos pop-art de onomatopeyas, Almacén Físico de 16 Tropas (CERO cartas, 1-100 HP, Tiers T1-T5) y física táctil reactiva.
version: 5.0.0
date_added: "2026-11-07"
tags: [geotactics-online, tactical-command, advance-wars, comic-war-room, kinetic-pop-art, c4isr, game-feel, bark-engine, diegetic-ui, zero-cards]
---

# Tactical Command Intel: Kinetic Comic War-Room UI/UX Engine (v5.0 Canonical)

> *"La tensión estratégica de una sala de mando militar (C4ISR) fusionada con la contundencia cinética de la novela gráfica bélica: consolas de acero blindado, cartografía WebGL Zero-Raster, viñetas de cómic reactivas, bocadillos con tramas Ben-Day, sellos de onomatopeyas pop-art (Advance Wars meets Persona 5 / Hades), colores heráldicos de facción y una respuesta física táctil llena de Juice donde cada orden sacude el tablero."*

---

## 1. Manifiesto, Arquitectura de 4 Dominios y 7 Pilares Canónicos

Esta skill define el **estándar canónico absoluto de interfaz, interacción y experiencia de usuario (UI/UX)** para *GEOTACTICS: ONLINE (Wars of Legacy)*, sincronizado con `@docs/00_ARBOL_CANONICO_DE_SISTEMAS_Y_DESARROLLO.md` y `@docs/07_MASTER_UI_UX_WAR_ROOM.md`:

### 1.1. Los 7 Pilares Inmutables en la UI
1. **Pilar 1 — CERO CARTAS (Almacén Físico de 16 Tropas):** Queda terminantemente prohibido diseñar o nombrar "mazos de cartas", "sobres TCG" o "gacha". La UI representa un **Hangar Físico de Chasis Militares** (`src/domains/economy/components/UnitHangarModal.tsx`) con capacidad máxima de **16 tropas por jugador (4 slots de despliegue activo en Battlegroup + 12 en reserva)** y validación de Doble Llave (Chasis físico en hangar + Fondos tácticos `$G`).
2. **Pilar 2 — Escala Continua 1 a 100 HP Enteros:** Todo badge de salud en el Canvas (`src/domains/tactics/components/GameCanvas.tsx`), modales y tarjetas de hangar muestra integridad de `1` a `100 HP` (`HP: 100/100`), jamás la antigua escala `/10`.
3. **Pilar 3 — Derrota Inapelable por 0 Tropas:** El HUD y `src/shared/ui/MatchSummaryModal.tsx` telegrafían la aniquilación total (`0` tropas vivas = derrota inmediata) además de la captura de HQ.
4. **Pilar 4 — Patentes y Tiers T1 a T5 (+2% por Tier):** Los selectores de forja e insignias de unidad muestran Tiers `T1` a `T5` con progresión horizontal estricta de `+2%` por nivel (`T1: +0%`, `T2: +2%`, `T3: +4%`, `T4: +6%`, `T5: +8%` máx).
5. **Pilar 5 — Conquista de Capitales con Buff Regional (+5%):** Los inspectores territoriales (`src/domains/world/components/TerritoryInspectorModal.tsx`) destacan las capitales (`15,000 TCP`) y su Buff Regional de `+5%` en extracción/logística (+ bonos hegemónicos nacionales).
6. **Pilar 6 — Muerte Permanente de Chasis y 35% Chatarra (`tech_scrap`):** Las bajas reales muestran la liquidación del **35% en `tech_scrap`** en `src/domains/world/components/DualResourceHeader.tsx` y `MatchSummaryModal.tsx`.
7. **Pilar 7 — Human Handshake de 120s e IA de Guarnición (Niveles 1–5):** El modal de asedio (`src/domains/world/components/TerritorySiegeModal.tsx`) muestra el cronómetro DEFCON de **120 segundos** para relevo humano PvP antes de activar la IA de Guarnición (Niveles 1 a 5).
8. **Regla Financiera P2P en UI:** En `src/domains/economy/components/P2PMarketplaceView.tsx`, el desglose fiscal muestra siempre el **2% de impuesto total (1% quemado en Sink + 1% regalía al Clan dueño del Hub regional)** y el indicador visual de bandas **VWAP Collar ±25%**.

### 1.2. Ubicación Modular de Componentes UI por Dominio
* **`@domains/world` (`src/domains/world/components/`):** `WarLobbyHub.tsx`, `WarRoomModal.tsx`, `TacticalWorldMap.tsx`, `TacticalMapControls.tsx`, `TacticalDock.tsx`, `TacticalC4ISRBaseDiorama.tsx`, `TerritoryInspectorModal.tsx`, `TerritorySiegeModal.tsx`, `StateSovereignDeckModal.tsx`, `ClanHeadquartersView.tsx`, `ParadoxCommandDrawer.tsx`, `CommandHUD.tsx`, `DualResourceHeader.tsx`, `FactionBanner.tsx`.
* **`@domains/economy` (`src/domains/economy/components/`):** `UnitHangarModal.tsx`, `IndustrialComplexView.tsx` (10 parcelas por feudo), `P2PMarketplaceView.tsx`, `TacticalConstructionDrawer.tsx`, `LoadoutCustomizer.tsx`, `ShopCatalog.tsx`.
* **`@domains/tactics` (`src/domains/tactics/components/`):** `CombatTheaterView.tsx`, `GameCanvas.tsx`, `COCommandBar.tsx`, `ComicVignetteOverlay.tsx`, `PreBattleDeploymentModal.tsx`, `ProductionModal.tsx`, `ReinforcementRequestModal.tsx`, `TacticalStudioEditor.tsx`.
* **`@domains/game-feel` (`src/domains/game-feel/`):** `components/CommanderBarkWidget.tsx`, `components/CommanderLivingVignette.tsx`, `core/barkEngine.ts`, `core/audioManager.ts`, `core/hapticFeedback.ts`.
* **`@shared` (`src/shared/ui/` & `src/shared/auth/`):** `TacticalGhostBar.tsx`, `MatchSummaryModal.tsx`, `TacticalErrorBoundary.tsx`, `AuthTerminalModal.tsx`, `CommanderProfileModal.tsx`.

### 🚫 Anti-Patrones Terminantemente Prohibidos
* **NO es una Terminal Monocromática Muerta:** Prohibido forzar toda la interfaz a un verde Matrix `#00FF66` plano y austero. El juego tiene facciones coloridas, 29 comandantes con identidad propia y dinamismo gráfico.
* **NO es un SaaS Corporativo Aburrido:** Prohibidas las tarjetas simétricas blancas o gris neutro con `border-radius: 8px` y sombras difuminadas suaves (`box-shadow: 0 4px 6px rgba(0,0,0,0.1)`).
* **NO tiene Cartas ni Gacha:** Nunca uses léxico de "Mazo de 10 Cartas" ni diseñes sobres de cartas; usa **Bahías de Chasis Físico (T1–T5)** y **Almacén de 16 Tropas**.

---

## 2. Las 4 Capas de Diegesis de la Interfaz

Toda vista se estructura en 4 cuadrantes diegéticos para evitar sobrecarga cognitiva:

```
+---------------------------------------------------------------------------------------------------------+
| CAPA 4: NO-DIEGÉTICA (HUD de Esquinas)  | DualResourceHeader ($G / EC / Scrap), Reloj Fischer, Hotkeys  |
| CAPA 3: META (Cristal de Pantalla)      | Viñeta roja en daño crítico/DEFCON 1, resplandor dorado en SCOP|
| CAPA 2: ESPACIAL (Coordenadas de Acción)| Daño flotante (-24 HP en 1-100), rutas A*, marcas ¡TRAP!      |
| CAPA 1: DIEGÉTICA (Dentro del Mundo)    | Mapa WebGL Zero-Raster, diorama C4ISR, bahías del Hangar      |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Paleta Cromática: Base Blindada y Facciones Heráldicas

### 3.1. Núcleo Blindado (Chasis de Mando)
| Token | Hex | Rol en Interfaz |
| :--- | :--- | :--- |
| `--color-bunker-void` | `#161712` | Fondo de aplicación, fosos de pantalla y sombras de profundidad (`#0E100C` en WebGL). |
| `--color-armor-base` | `#2B2C24` | Fondo de paneles, módulos de chasis y consolas de mando. |
| `--color-military-olive`| `#46521F` | Cubiertas secundarias, acentos de blindaje y fronteras vectoriales. |
| `--color-metal-edge` | `#7B8A4A` | Biseles, cantos metálicos y uniones estructurales. |
| `--color-rust-alert` | `#C46A3A` | Botones de orden de combate, avisos DEFCON y daño balístico. |
| `--color-data-cream` | `#F2E8D5` | Tipografía principal, cifras tácticas, fondos de bocadillo y etiquetas. |

### 3.2. Facciones Canónicas (29 Comandantes en `src/domains/tactics/core/coSystem.ts`)
* **Orange Star (Ofensiva Directa + Mayor Stella C4ISR):** `--color-fac-orange: #E65100;` / `--color-fac-amber: #F59E0B;`
* **Blue Moon (Asedio & Ártico):** `--color-fac-blue: #1D4ED8;` / `--color-fac-ice: #93C5FD;`
* **Green Earth (Superioridad Aérea/Naval):** `--color-fac-green: #15803D;` / `--color-fac-nickel: #86EFAC;`
* **Yellow Comet (Tácticas Samurái & Élite):** `--color-fac-gold: #D97706;` / `--color-fac-sand: #FDE047;`
* **Black Hole (Tecnología Oscura & Asalto):** `--color-fac-void: #4C1D95;` / `--color-fac-crimson: #991B1B;`

---

## 4. Geometría Cinética: Bordes Afilados y Asimetría Cómic

### 4.1. Curvatura Asimétrica Táctica Canónica
```css
border-radius: 14px 4px 14px 4px;
border-radius: 40px 10px 40px 10px;
```

### 4.2. Chaflanes a 45° para Módulos Blindados
```css
clip-path: polygon(
  12px 0, calc(100% - 12px) 0,
  100% 12px, 100% calc(100% - 12px),
  calc(100% - 12px) 100%, 12px 100%,
  0 calc(100% - 12px), 0 12px
);
```

### 4.3. Sombras de Tinta Offset y Tramas Ben-Day
```css
box-shadow: 4px 4px 0px #0A0B08;
background-image: radial-gradient(#7B8A4A 15%, transparent 16%);
background-size: 8px 8px;
```

---

## 5. Motor de "Game Feel" & "Juice" Táctico

```css
:root {
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1);
}
```

### 5.1. Botones de Mando con Hundimiento Físico 3D y Squash & Stretch
Usa `.tactical-btn-heavy` con `border-bottom: 5px solid #5a1e05`, compresión en `:active` (`scale(1.04, 0.94)`) y feedback acústico inmediato vía `audioManager.playSFX('select')` + `triggerHaptic('selection')` desde `@domains/game-feel`.

### 5.2. Barras de Vida (1–100 HP) y TCP (`10,000`/`15,000`) con "Ghost Drain"
Reutiliza siempre `TacticalGhostBar` desde `@shared` (`src/shared/ui/TacticalGhostBar.tsx`) para que toda reducción de HP (escala 1–100) o drenaje de Puntos de Control Territorial (TCP) deje una estela blanca/crema amortiguada durante `450ms`.

---

## 6. Bark Engine Cómic y Bocadillos Reactivos (`@domains/game-feel`)

Implementado en `src/domains/game-feel/core/barkEngine.ts` y renderizado por `CommanderBarkWidget.tsx` y `ComicVignetteOverlay.tsx`:

1. **Morfologías de Bocadillo (`BubbleShape` / `BarkBalloonType`):**
   - `shout` (Grito de Combate / SCOP)
   - `radio` (Transmisión C4ISR con barrido CRT `#00FF66`)
   - `thought` (Táctica Interna)
   - `whisper` (Inteligencia Sigilosa con borde discontinuo)
   - `panic` (Alerta Crítica / Zona Buffer / Emboscada `¡TRAP!` con shake táctico)
   - `speech` (Comunicación estándar de Estado Mayor)
2. **Sellos Pop-Art (`OnomatopoeiaStamp`):** 13 sellos canónicos (`¡KABOOM!`, `¡TRAP!`, `¡ALERT!`, `¡CRUNCH!`, `¡BLAM!`, `¡WHOOSH!`, `¡KLANK!`, `¡ZAP!`, `¡SIREN!`, `¡VICTORY!`, `¡DEFEAT!`, `¡SUPPLY!`, `¡SCOP!`).
3. **Auto-Optimización Adaptativa (`BarkSelfOptimizationMetrics`):** La Mayor Stella (`stella`, CO #29) pondera dinámicamente la frecuencia de sus intervenciones según la telemetría de sesión del jugador.

---

## 7. Componente de Referencia Canónico: Bahía de Chasis Físico (Hangar 16 Tropas, 1–100 HP, T1–T5)

```tsx
import React from 'react';
import { audioManager, triggerHaptic } from '@domains/game-feel';

interface HangarChassisSlotProps {
  unitName: string;
  category: 'INFANTRY' | 'VEHICLE' | 'AIR' | 'NAVAL';
  tier: 1 | 2 | 3 | 4 | 5;
  deployCostG: number;
  hp: number; // Escala canónica 1..100 HP
  fuel: number;
  scrapRecoveryValue: number; // 35% tech_scrap en caso de baja
  icon: string;
  faction?: 'orange' | 'blue' | 'green' | 'yellow' | 'black';
  inActiveBattlegroup?: boolean; // 4 activos máx + 12 en reserva = 16 total
  onSelectChassis: () => void;
}

export const HangarChassisSlot: React.FC<HangarChassisSlotProps> = ({
  unitName,
  category,
  tier,
  deployCostG,
  hp,
  fuel,
  scrapRecoveryValue,
  icon,
  faction = 'orange',
  inActiveBattlegroup = false,
  onSelectChassis,
}) => {
  const tierBonusPct = (tier - 1) * 2; // +0%, +2%, +4%, +6%, +8% máx en T5
  const factionBorder = {
    orange: 'border-[#E65100] hover:shadow-[5px_5px_0px_#E65100]',
    blue: 'border-[#1D4ED8] hover:shadow-[5px_5px_0px_#1D4ED8]',
    green: 'border-[#15803D] hover:shadow-[5px_5px_0px_#15803D]',
    yellow: 'border-[#D97706] hover:shadow-[5px_5px_0px_#D97706]',
    black: 'border-[#4C1D95] hover:shadow-[5px_5px_0px_#4C1D95]',
  }[faction];

  const handleClick = () => {
    audioManager.playSFX('select');
    triggerHaptic('selection');
    onSelectChassis();
  };

  return (
    <div
      onClick={handleClick}
      className={`relative w-48 bg-[#2B2C24] border-2 ${factionBorder} rounded-[14px_4px_14px_4px] p-3 text-[#F2E8D5] shadow-[4px_4px_0px_#0A0B08] transition-all duration-150 cursor-pointer hover:-translate-y-1 select-none font-mono`}
    >
      <div className="flex items-center justify-between border-b border-[#7B8A4A]/40 pb-1.5 mb-2">
        <span className="text-[10px] font-bold text-[#7B8A4A] tracking-wider uppercase">
          {category} • T{tier} (+{tierBonusPct}%)
        </span>
        <span className="bg-[#161712] border border-[#7B8A4A] text-amber-300 font-black text-xs px-2 py-0.5 rounded-[4px_1px_4px_1px]">
          ${deployCostG.toLocaleString()}G
        </span>
      </div>

      <div className="relative h-20 bg-[#161712] rounded-[8px_2px_8px_2px] border border-[#7B8A4A]/50 flex items-center justify-center my-2 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#7B8A4A_10%,transparent_11%)] [background-size:6px_6px] opacity-25" />
        <span className="text-3xl filter drop-shadow-[2px_2px_0px_#000]">{icon}</span>
        {inActiveBattlegroup && (
          <span className="absolute top-1 left-1 bg-emerald-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
            VANGUARDIA (1/4)
          </span>
        )}
      </div>

      <h4 className="font-sans font-black text-xs uppercase tracking-wider text-[#F2E8D5] truncate mb-2">
        {unitName}
      </h4>

      <div className="grid grid-cols-2 gap-1 text-[10px] bg-[#1E1F18] p-1.5 rounded-[6px_2px_6px_2px] border border-[#7B8A4A]/30">
        <span>
          <strong className="text-emerald-400">HP:</strong> {hp}/100
        </span>
        <span>
          <strong className="text-amber-400">FUEL:</strong> {fuel}
        </span>
        <span className="col-span-2 text-[9px] text-stone-400">
          ♻️ Salvamento (35%): +{scrapRecoveryValue} Scrap
        </span>
      </div>
    </div>
  );
};
```

---

## 8. Integración Acústica y Háptica Canónica (`@domains/game-feel`)

Nunca crees instancias sueltas de `AudioContext` en los componentes. Importa siempre el motor centralizado:
```ts
import { audioManager, triggerHaptic } from '@domains/game-feel';

// Hover en elementos tácticos (<24ms con jitter anti-fatiga)
audioManager.playHoverTick();

// Acciones encadenadas con escalado semitonal
audioManager.playComboAction(comboStep);

// Odómetro de fondos ($G / EC)
audioManager.playGoldTick(tickIndex);

// Disparo de SFX del catálogo paramétrico + vibración háptica
audioManager.playSFX('co_power');
triggerHaptic('co_power');
```

---

## 9. Lista de Control de Calidad (Anti-Slop & Canonical Checklist)

* [ ] **¿Respeta los 7 Pilares Canónicos?** Cero menciones a cartas/gacha, salud siempre en `1–100 HP`, Tiers `T1–T5` (`+2%`/tier hasta `+8%`), hangar limitado a `16` tropas (`4` activas + `12` reserva), chatarra al `35%`, mercado P2P al `2%` (`1%` Sink + `1%` Clan, VWAP `±25%`) y Handshake de `120s`.
* [ ] **¿Importa desde los barriles de dominio?** Usa `@domains/world`, `@domains/tactics`, `@domains/economy`, `@domains/game-feel` y `@shared` (jamás rutas legacy `@/src/engine/*` o `@/src/components/*`).
* [ ] **¿Tiene carácter y respuesta física (Juice)?** Siluetas `rounded-[14px_4px_14px_4px]` o chaflanes a 45°, sombras sólidas `box-shadow: 4px 4px 0px #0A0B08`, resortes `--ease-spring`, `TacticalGhostBar` y audio procedural.

/**
 * Tactical Command: Wars of Legacy - Motor de Tutorial Guiado ("Bautismo de Fuego")
 * Especificación: docs/orchestration/04_CONTENT_AND_ONBOARDING_PIPELINE.md (Sección 1)
 * Máquina de estados determinista con restricción celda a celda.
 */

import { GridPosition, TacticalUnit, TerrainTile } from '../types';

export type TutorialStepId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'COMPLETE';

export interface TutorialStepDefinition {
  stepId: TutorialStepId;
  stepNumber: number;
  totalSteps: number;
  instructorName: string;
  dialogueText: string;
  authorizedCoord: GridPosition;
  mandatoryAction: 'SELECT_UNIT' | 'MOVE_TO_TILE' | 'SUB_CAPTURE' | 'PRODUCE_UNIT' | 'ATTACK_UNIT' | 'CAPTURE_HQ';
  targetEnemyCoord?: GridPosition;
  highlightCoordinates: GridPosition[];
}

export const TUTORIAL_MAP_DIMENSIONS = { width: 8, height: 4 };

/**
 * Genera la cuadrícula canónica del tutorial 8x4 (RFC Sección 1.2)
 */
export function createTutorialTiles(): TerrainTile[][] {
  // Matriz 8x4 según la especificación:
  // Fila 0: Plains, Plains, Plains, Forest, Forest, Plains, Plains, Plains
  // Fila 1: Plains, Mountain, Plains, Plains, Plains, Plains, Mountain, Plains
  // Fila 2: HQ1, Plains, City, Plains, Plains, Plains, Plains, HQ2
  // Fila 3: Plains, Plains, Plains, Forest, Forest, Plains, Plains, Plains
  const mapLayout: { type: TerrainTile['type']; ownerId: string | null }[][] = [
    [
      { type: 'plains', ownerId: null }, { type: 'plains', ownerId: null }, { type: 'plains', ownerId: null },
      { type: 'forest', ownerId: null }, { type: 'forest', ownerId: null }, { type: 'plains', ownerId: null },
      { type: 'plains', ownerId: null }, { type: 'plains', ownerId: null }
    ],
    [
      { type: 'plains', ownerId: null }, { type: 'mountain', ownerId: null }, { type: 'plains', ownerId: null },
      { type: 'plains', ownerId: null }, { type: 'plains', ownerId: null }, { type: 'plains', ownerId: null },
      { type: 'mountain', ownerId: null }, { type: 'plains', ownerId: null }
    ],
    [
      { type: 'hq', ownerId: 'p1' }, { type: 'plains', ownerId: null }, { type: 'city', ownerId: null },
      { type: 'plains', ownerId: null }, { type: 'plains', ownerId: null }, { type: 'plains', ownerId: null },
      { type: 'plains', ownerId: null }, { type: 'hq', ownerId: 'p2' }
    ],
    [
      { type: 'plains', ownerId: null }, { type: 'plains', ownerId: null }, { type: 'plains', ownerId: null },
      { type: 'forest', ownerId: null }, { type: 'forest', ownerId: null }, { type: 'plains', ownerId: null },
      { type: 'plains', ownerId: null }, { type: 'plains', ownerId: null }
    ]
  ];

  return mapLayout.map((row, y) =>
    row.map((cell, x) => ({
      x,
      y,
      type: cell.type,
      ownerId: cell.ownerId,
      defenseStars: cell.type === 'mountain' ? 4 : cell.type === 'forest' ? 2 : cell.type === 'city' || cell.type === 'hq' ? 3 : 1,
      captureHp: 20,
    }))
  );
}

/**
 * Genera el contingente de tropas inicial para la misión guiada
 */
export function createTutorialUnits(): TacticalUnit[] {
  return [
    {
      id: 'inf1',
      unitCode: 'infantry',
      displayName: 'Infantería Aliada',
      ownerId: 'p1',
      x: 1,
      y: 2,
      hp: 10,
      maxHp: 10,
      ammo: 9,
      fuel: 99,
      movementPoints: 3,
      movementType: 'foot',
      minRange: 1,
      maxRange: 1,
      visionRange: 3,
      baseAttack: 55,
      productionCost: 1000,
      hasMoved: false,
      hasActed: false,
      skinId: 'default',
    },
    {
      id: 'inf2',
      unitCode: 'infantry',
      displayName: 'Infantería Hostil',
      ownerId: 'p2',
      x: 5,
      y: 2,
      hp: 5, // Tropa enemiga debilitada para garantizar kill
      maxHp: 10,
      ammo: 9,
      fuel: 99,
      movementPoints: 3,
      movementType: 'foot',
      minRange: 1,
      maxRange: 1,
      visionRange: 3,
      baseAttack: 55,
      productionCost: 1000,
      hasMoved: false,
      hasActed: false,
      skinId: 'default',
    },
  ];
}

export const TUTORIAL_STEPS_FLOW: Record<TutorialStepId, TutorialStepDefinition> = {
  P1: {
    stepId: 'P1',
    stepNumber: 1,
    totalSteps: 7,
    instructorName: 'Mayor General Stella',
    dialogueText: '¡Atención, Cadete! Selecciona tu escuadrón de infantería en [1, 2] para iniciar el avance operacional.',
    authorizedCoord: { x: 1, y: 2 },
    mandatoryAction: 'SELECT_UNIT',
    highlightCoordinates: [{ x: 1, y: 2 }],
  },
  P2: {
    stepId: 'P2',
    stepNumber: 2,
    totalSteps: 7,
    instructorName: 'Mayor General Stella',
    dialogueText: 'Toma esa ciudad neutral en [2, 2]. Las ciudades controladas financian nuestra maquinaria de guerra con +$1,000G por turno.',
    authorizedCoord: { x: 2, y: 2 },
    mandatoryAction: 'MOVE_TO_TILE',
    highlightCoordinates: [{ x: 2, y: 2 }],
  },
  P3: {
    stepId: 'P3',
    stepNumber: 3,
    totalSteps: 7,
    instructorName: 'Mayor General Stella',
    dialogueText: 'Pulsa la orden "Capturar". Toda propiedad neutral o enemiga requiere 20 puntos de captura para caer en nuestro poder.',
    authorizedCoord: { x: 2, y: 2 },
    mandatoryAction: 'SUB_CAPTURE',
    highlightCoordinates: [{ x: 2, y: 2 }],
  },
  P4: {
    stepId: 'P4',
    stepNumber: 4,
    totalSteps: 7,
    instructorName: 'Mayor General Stella',
    dialogueText: 'Turno 2. Continúa la captura de la ciudad hasta reducir sus defensas a cero.',
    authorizedCoord: { x: 2, y: 2 },
    mandatoryAction: 'SUB_CAPTURE',
    highlightCoordinates: [{ x: 2, y: 2 }],
  },
  P5: {
    stepId: 'P5',
    stepNumber: 5,
    totalSteps: 7,
    instructorName: 'Mayor General Stella',
    dialogueText: '¡Ciudad capturada! Un escuadrón enemigo en [5, 2] custodia el camino. Despliega un Tanque Ligero desde la Base Aliada en [0, 2].',
    authorizedCoord: { x: 0, y: 2 },
    mandatoryAction: 'PRODUCE_UNIT',
    highlightCoordinates: [{ x: 0, y: 2 }],
  },
  P6: {
    stepId: 'P6',
    stepNumber: 6,
    totalSteps: 7,
    instructorName: 'Mayor General Stella',
    dialogueText: '¡Fuego a discreción! El cañón de 75mm pulverizará a la infantería enemiga sin piedad.',
    authorizedCoord: { x: 4, y: 2 },
    mandatoryAction: 'ATTACK_UNIT',
    targetEnemyCoord: { x: 5, y: 2 },
    highlightCoordinates: [{ x: 4, y: 2 }, { x: 5, y: 2 }],
  },
  P7: {
    stepId: 'P7',
    stepNumber: 7,
    totalSteps: 7,
    instructorName: 'Mayor General Stella',
    dialogueText: 'Camino despejado. Marcha hacia el Cuartel General enemigo en [7, 2] para forzar la rendición incondicional.',
    authorizedCoord: { x: 7, y: 2 },
    mandatoryAction: 'CAPTURE_HQ',
    highlightCoordinates: [{ x: 7, y: 2 }],
  },
  COMPLETE: {
    stepId: 'COMPLETE',
    stepNumber: 7,
    totalSteps: 7,
    instructorName: 'Mayor General Stella',
    dialogueText: '¡Misión cumplida, Comandante! Has dominado el Core Loop táctico. ¡Bienvenido a Tactical Command!',
    authorizedCoord: { x: 7, y: 2 },
    mandatoryAction: 'CAPTURE_HQ',
    highlightCoordinates: [],
  },
};

export class TutorialEngine {
  private currentStepId: TutorialStepId = 'P1';

  public getCurrentStep(): TutorialStepDefinition {
    return TUTORIAL_STEPS_FLOW[this.currentStepId];
  }

  public isCoordAuthorized(coord: GridPosition): boolean {
    if (this.currentStepId === 'COMPLETE') return true;
    const step = this.getCurrentStep();
    return step.authorizedCoord.x === coord.x && step.authorizedCoord.y === coord.y;
  }

  public validateAndAdvance(action: TutorialStepDefinition['mandatoryAction'], targetCoord?: GridPosition): boolean {
    const step = this.getCurrentStep();
    if (step.mandatoryAction !== action) {
      return false;
    }

    if (targetCoord && (targetCoord.x !== step.authorizedCoord.x || targetCoord.y !== step.authorizedCoord.y)) {
      return false;
    }

    // Avanzar de paso
    switch (this.currentStepId) {
      case 'P1': this.currentStepId = 'P2'; break;
      case 'P2': this.currentStepId = 'P3'; break;
      case 'P3': this.currentStepId = 'P4'; break;
      case 'P4': this.currentStepId = 'P5'; break;
      case 'P5': this.currentStepId = 'P6'; break;
      case 'P6': this.currentStepId = 'P7'; break;
      case 'P7': this.currentStepId = 'COMPLETE'; break;
    }

    return true;
  }

  public isComplete(): boolean {
    return this.currentStepId === 'COMPLETE';
  }

  public reset(): void {
    this.currentStepId = 'P1';
  }
}

/**
 * Tactical Command: Wars of Legacy - Motor de Gran Campaña Táctica (Acto I)
 * Especificación: docs/orchestration/04_CONTENT_AND_ONBOARDING_PIPELINE.md (Sección 3)
 * Misiones narrativas a escala extendida (24x24 a 32x32), niebla de guerra y doctrinas de IA.
 */

export interface CampaignMission {
  missionId: string;
  actNumber: number;
  chapterNumber: number;
  title: string;
  briefingDialogue: string;
  mapId: string;
  playerCO: string;
  enemyCO: string;
  fogOfWar: boolean;
  weatherPattern: 'clear' | 'dynamic' | 'snow' | 'sandstorm';
  primaryObjective: 'CAPTURE_HQ' | 'ROUT_ALL' | 'SURVIVE_TURNS' | 'ESCORT_UNIT';
  objectiveParams?: { targetTurns?: number; escortUnitId?: string };
  goldReward: number;
  xpReward: number;
  unlockedCompanions?: string[];
  aiDoctrine: 'aggressive_rush' | 'indirect_siege' | 'naval_attrition';
}

export const CAMPAIGN_ACT_I_MISSIONS: CampaignMission[] = [
  {
    missionId: 'act1_m01',
    actNumber: 1,
    chapterNumber: 1,
    title: 'Defensa de Puerto Esperanza',
    briefingDialogue:
      'Comandante Stella, las vanguardias de la Legión Negra lideradas por Flak han desembarcado en el sector sur. Resista 15 turnos hasta la llegada de los refuerzos navales.',
    mapId: 'campaign_coastal_defense_24x24',
    playerCO: 'stella',
    enemyCO: 'flak',
    fogOfWar: true,
    weatherPattern: 'clear',
    primaryObjective: 'SURVIVE_TURNS',
    objectiveParams: { targetTurns: 15 },
    goldReward: 3500,
    xpReward: 450,
    aiDoctrine: 'aggressive_rush',
  },
  {
    missionId: 'act1_m02',
    actNumber: 1,
    chapterNumber: 2,
    title: 'Brecha en el Estrecho de Hierro',
    briefingDialogue:
      'El enemigo ha fortificado el paso montañoso con baterías de misiles. Debemos quebrar sus defensas y tomar su Cuartel General para abrir la ruta continental.',
    mapId: 'campaign_iron_strait_28x28',
    playerCO: 'volkov',
    enemyCO: 'adder',
    fogOfWar: true,
    weatherPattern: 'dynamic',
    primaryObjective: 'CAPTURE_HQ',
    goldReward: 5000,
    xpReward: 600,
    unlockedCompanions: ['garrison'],
    aiDoctrine: 'indirect_siege',
  },
  {
    missionId: 'act1_m03',
    actNumber: 1,
    chapterNumber: 3,
    title: 'Asedio a la Fortaleza de Obsidiana',
    briefingDialogue:
      'Hawke comanda la guarnición central de la fortaleza. No hay escapatoria para el invasor: destruya la totalidad de las fuerzas enemigas en combate abierto.',
    mapId: 'campaign_obsidian_fortress_32x32',
    playerCO: 'bren',
    enemyCO: 'hawke',
    fogOfWar: true,
    weatherPattern: 'clear',
    primaryObjective: 'ROUT_ALL',
    goldReward: 8000,
    xpReward: 1000,
    aiDoctrine: 'naval_attrition',
  },
];

export interface CampaignProgress {
  completedMissionIds: string[];
  currentMissionId: string;
  totalCampaignStars: number;
}

export class CampaignEngine {
  private static STORAGE_KEY = 'tactical_campaign_progress';

  public static getProgress(): CampaignProgress {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fallback
    }

    return {
      completedMissionIds: [],
      currentMissionId: 'act1_m01',
      totalCampaignStars: 0,
    };
  }

  public static saveProgress(progress: CampaignProgress): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignorar fallo de almacenamiento
    }
  }

  public static completeMission(missionId: string, starsEarned: number = 3): CampaignProgress {
    const progress = this.getProgress();
    if (!progress.completedMissionIds.includes(missionId)) {
      progress.completedMissionIds.push(missionId);
      progress.totalCampaignStars += starsEarned;
    }

    // Calcular siguiente misión
    const currentIdx = CAMPAIGN_ACT_I_MISSIONS.findIndex(m => m.missionId === missionId);
    if (currentIdx >= 0 && currentIdx < CAMPAIGN_ACT_I_MISSIONS.length - 1) {
      progress.currentMissionId = CAMPAIGN_ACT_I_MISSIONS[currentIdx + 1].missionId;
    }

    this.saveProgress(progress);
    return progress;
  }

  public static getMission(missionId: string): CampaignMission | undefined {
    return CAMPAIGN_ACT_I_MISSIONS.find(m => m.missionId === missionId);
  }
}

export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type UnitSkinTarget = 'tank_light' | 'infantry' | 'artillery' | 'recon' | 'b_copter' | 'hq';

export interface CosmeticSkin {
  id: string;
  name: string;
  unitTarget: UnitSkinTarget;
  unitTargetLabel: string;
  rarity: CosmeticRarity;
  currency: 'battleCredits' | 'commandGems' | 'gold' | 'gems';
  price: number;
  description: string;
  previewColor: string;
  secondaryColor: string;
  badge: string;
}

export const COSMETIC_SHOP_CATALOG: CosmeticSkin[] = [
  {
    id: 'skin_tank_desert',
    name: 'Tanque Ligero: Tormenta del Desierto',
    unitTarget: 'tank_light',
    unitTargetLabel: 'Tanque Ligero',
    rarity: 'rare',
    currency: 'gold',
    price: 800,
    description: 'Camuflaje arenoso de alta resistencia térmica para operaciones en dunas y llanuras áridas.',
    previewColor: '#d97706', // Ámbar
    secondaryColor: '#f59e0b',
    badge: 'Camuflaje',
  },
  {
    id: 'skin_tank_cyber',
    name: 'Tanque Ligero: Neon Vanguard 2099',
    unitTarget: 'tank_light',
    unitTargetLabel: 'Tanque Ligero',
    rarity: 'legendary',
    currency: 'gems',
    price: 450,
    description: 'Blindaje de grafeno negro con líneas de neón cian luminosas y trazadores balísticos personalizados.',
    previewColor: '#06b6d4', // Cian
    secondaryColor: '#0f172a',
    badge: 'Animado',
  },
  {
    id: 'skin_infantry_urban',
    name: 'Infantería: Fuerzas Especiales Urbanas',
    unitTarget: 'infantry',
    unitTargetLabel: 'Infantería Ligera',
    rarity: 'common',
    currency: 'gold',
    price: 400,
    description: 'Uniformes tácticos de camuflaje digital en tonos grises para asalto a ciudades fortificadas.',
    previewColor: '#64748b', // Slate
    secondaryColor: '#94a3b8',
    badge: 'Fuerzas Especiales',
  },
  {
    id: 'skin_infantry_arctic',
    name: 'Infantería: Guardia Ártica',
    unitTarget: 'infantry',
    unitTargetLabel: 'Infantería Ligera',
    rarity: 'rare',
    currency: 'gold',
    price: 750,
    description: 'Capas térmicas blancas preparadas para resistir temperaturas bajo cero en frentes nevados.',
    previewColor: '#38bdf8', // Celeste
    secondaryColor: '#e0f2fe',
    badge: 'Ártico',
  },
  {
    id: 'skin_artillery_stealth',
    name: 'Artillería: Fantasma de Asedio',
    unitTarget: 'artillery',
    unitTargetLabel: 'Artillería',
    rarity: 'epic',
    currency: 'gems',
    price: 250,
    description: 'Recubrimiento mate antirreflectante para disparos de obús indirectos sin revelar posición.',
    previewColor: '#8b5cf6', // Púrpura
    secondaryColor: '#1e1b4b',
    badge: 'Sigilo',
  },
  {
    id: 'skin_recon_safari',
    name: 'Recon: Explorador de la Sabana',
    unitTarget: 'recon',
    unitTargetLabel: 'Recon',
    rarity: 'common',
    currency: 'gold',
    price: 350,
    description: 'Chasis todoterreno reforzado con llantas de barro y antena de comunicaciones de largo alcance.',
    previewColor: '#84cc16', // Lima
    secondaryColor: '#3f6212',
    badge: 'Explorador',
  },
  {
    id: 'skin_bcopter_blackops',
    name: 'B-Copter: Halcón Sombrío',
    unitTarget: 'b_copter',
    unitTargetLabel: 'Helicóptero de Ataque',
    rarity: 'epic',
    currency: 'gems',
    price: 300,
    description: 'Rotores silenciados y pintura de absorción radar para ataques aéreos relámpago.',
    previewColor: '#ef4444', // Rojo
    secondaryColor: '#450a0a',
    badge: 'Black Ops',
  },
  {
    id: 'skin_hq_fortress',
    name: 'Cuartel General: Ciudadela Blindada',
    unitTarget: 'hq',
    unitTargetLabel: 'Cuartel General (HQ)',
    rarity: 'legendary',
    currency: 'gems',
    price: 600,
    description: 'Diseño arquitectónico monumental con torres defensivas de radar y estandarte holográfico.',
    previewColor: '#a855f7', // Púrpura brillante
    secondaryColor: '#581c87',
    badge: 'Monumento',
  },
];

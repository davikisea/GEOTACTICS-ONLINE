/**
 * SISTEMA CANÓNICO DE COMANDANTES (COMMANDING OFFICERS - COs)
 * Especificación Advance Wars / WarsWorld / TacticalCommand
 * 
 * Reglas Oficiales:
 * 1. Medidor de Poder:
 *    - Cada estrella equivale a 9.000G de valor de combate.
 *    - Carga Defensiva (daño recibido): 100% del valor del daño (unitCost / 10 * damageHp).
 *    - Carga Ofensiva (daño infligido): 50% del valor del daño (targetCost / 10 * damageHp * 0.5).
 * 2. Poderes de CO (COP): Requieren llenar las estrellas del primer nivel.
 * 3. Superpoderes de CO (SCOP): Requieren llenar todas las estrellas del medidor.
 * 4. Activación: Consume la barra cargada y aplica efectos instantáneos (cura, fondos, bombardeo)
 *    y pasivas durante el resto del turno (+10% Firepower y +10% Defense universal en COP/SCOP).
 */

import { TacticalUnit, TerrainTile } from '../types';

export type COId =
  | 'adder'
  | 'andy'
  | 'colin'
  | 'drake'
  | 'eagle'
  | 'flak'
  | 'grimm'
  | 'grit'
  | 'hachi'
  | 'hawke'
  | 'jake'
  | 'javier'
  | 'jess'
  | 'jugger'
  | 'kanbei'
  | 'kindle'
  | 'koal'
  | 'lash'
  | 'max'
  | 'nell'
  | 'olaf'
  | 'rachel'
  | 'sami'
  | 'sasha'
  | 'sensei'
  | 'sonja'
  | 'sturm'
  | 'von_bolt';

export type COPowerType = 'cop' | 'scop';

export interface COPowerDefinition {
  name: string;
  stars: number;
  description: string;
  instantEffect?: (context: {
    player: 'p1' | 'p2';
    units: TacticalUnit[];
    tiles: TerrainTile[][];
    funds: number;
  }) => {
    updatedUnits?: TacticalUnit[];
    updatedTiles?: TerrainTile[][];
    updatedFunds?: number;
    logMessage: string;
  };
}

export interface CODefinition {
  id: COId;
  name: string;
  title: string;
  faction: 'orange-star' | 'blue-moon' | 'yellow-comet' | 'green-earth' | 'black-hole';
  portraitFull: string;
  portraitSmall: string;
  dayToDay: {
    description: string;
  };
  powers: {
    cop?: COPowerDefinition;
    scop: COPowerDefinition;
  };
}

export const STAR_CHARGE_VALUE = 9000;
export const DEFENSIVE_CHARGE_MULT = 1.0;
export const OFFENSIVE_CHARGE_MULT = 0.5;

export const CANONICAL_CO_REGISTRY: Record<COId, CODefinition> = {
  adder: {
    id: 'adder',
    name: 'Adder',
    title: 'Comandante Víbora',
    faction: 'black-hole',
    portraitFull: '/assets/CO/pixelated/adder-full.png',
    portraitSmall: '/assets/CO/pixelated/adder-small.png',
    dayToDay: {
      description: 'Líder astuto e implacable. Carga sus medidores de poder a una velocidad extrema debido a su bajo umbral estelar.',
    },
    powers: {
      cop: {
        name: 'Sideslip',
        stars: 2,
        description: 'Todas las unidades del ejército ganan +1 casilla de movimiento.',
      },
      scop: {
        name: 'Sidewinder',
        stars: 5,
        description: 'Todas las unidades aliadas ganan +2 casillas de movilidad y +20% de potencia ofensiva.',
      },
    },
  },

  andy: {
    id: 'andy',
    name: 'Andy',
    title: 'El Mecánico Genio',
    faction: 'orange-star',
    portraitFull: '/assets/CO/pixelated/andy-full.png',
    portraitSmall: '/assets/CO/pixelated/andy-small.png',
    dayToDay: {
      description: 'Especialista en mantenimiento. Sin debilidades ni penalizaciones en ningún terreno o unidad.',
    },
    powers: {
      cop: {
        name: 'Hyper Repair',
        stars: 3,
        description: 'Repara instantáneamente +2 HP a todas las unidades aliadas y otorga +10% de ataque y defensa.',
        instantEffect: ({ units, player }) => {
          const updatedUnits = units.map(u => u.ownerId === player ? { ...u, hp: Math.min(10, u.hp + 2) } : u);
          return {
            updatedUnits,
            logMessage: '¡Andy activó Hyper Repair! Todas las unidades aliadas han reparado +2 HP.',
          };
        },
      },
      scop: {
        name: 'Hyper Upgrade',
        stars: 6,
        description: 'Repara instantáneamente +5 HP a todas las unidades aliadas, otorga +1 de movimiento y +20% de ataque.',
        instantEffect: ({ units, player }) => {
          const updatedUnits = units.map(u => u.ownerId === player ? { ...u, hp: Math.min(10, u.hp + 5) } : u);
          return {
            updatedUnits,
            logMessage: '¡Andy desató Hyper Upgrade! +5 HP a todo el ejército y +1 casilla de movilidad general.',
          };
        },
      },
    },
  },

  colin: {
    id: 'colin',
    name: 'Colin',
    title: 'El Joven Magnate',
    faction: 'blue-moon',
    portraitFull: '/assets/CO/pixelated/colin-full.png',
    portraitSmall: '/assets/CO/pixelated/colin-small.png',
    dayToDay: {
      description: 'Descuento del 20% en costes de producción de todas las unidades. Sus unidades tienen -10% de ataque.',
    },
    powers: {
      cop: {
        name: 'Gold Rush',
        stars: 2,
        description: 'Multiplica los fondos actuales del tesoro por 1.5x (+50% de oro instantáneo).',
        instantEffect: ({ funds }) => {
          const newFunds = Math.floor(funds * 1.5);
          return {
            updatedFunds: newFunds,
            logMessage: `¡Colin activó Gold Rush! El tesoro se multiplicó 1.5x (+${newFunds - funds}G).`,
          };
        },
      },
      scop: {
        name: 'Power of Money',
        stars: 6,
        description: 'Todas las unidades aliadas ganan +1% de ataque por cada 300G en el tesoro.',
      },
    },
  },

  drake: {
    id: 'drake',
    name: 'Drake',
    title: 'Lobo de Mar',
    faction: 'green-earth',
    portraitFull: '/assets/CO/pixelated/drake-full.png',
    portraitSmall: '/assets/CO/pixelated/drake-small.png',
    dayToDay: {
      description: 'Navíos de guerra tienen +20% de defensa y +1 de movimiento. Inmune a penalizaciones de lluvia.',
    },
    powers: {
      cop: {
        name: 'Tsunami',
        stars: 4,
        description: 'Desata una ola gigante que causa 1 PV de daño a todos los enemigos y reduce su combustible a la mitad.',
        instantEffect: ({ units, player }) => {
          const updatedUnits = units.map(u => u.ownerId !== player ? { ...u, hp: Math.max(1, u.hp - 1), fuel: Math.floor(u.fuel / 2) } : u);
          return {
            updatedUnits,
            logMessage: '¡Drake desató Tsunami! 1 PV de daño a todo el ejército enemigo y -50% combustible.',
          };
        },
      },
      scop: {
        name: 'Typhoon',
        stars: 7,
        description: 'Causa 2 PV de daño a todos los enemigos, reduce su combustible a la mitad e invoca lluvia torrencial.',
        instantEffect: ({ units, player }) => {
          const updatedUnits = units.map(u => u.ownerId !== player ? { ...u, hp: Math.max(1, u.hp - 2), fuel: Math.floor(u.fuel / 2) } : u);
          return {
            updatedUnits,
            logMessage: '¡Drake desató Typhoon! 2 PV de daño a todos los enemigos e inundación por lluvia.',
          };
        },
      },
    },
  },

  eagle: {
    id: 'eagle',
    name: 'Eagle',
    title: 'As de la Aviación',
    faction: 'green-earth',
    portraitFull: '/assets/CO/pixelated/eagle-full.png',
    portraitSmall: '/assets/CO/pixelated/eagle-small.png',
    dayToDay: {
      description: 'Unidades aéreas tienen +20% de ataque y consumen 2 unidades menos de combustible al día.',
    },
    powers: {
      cop: {
        name: 'Lightning Drive',
        stars: 3,
        description: 'Reactiva todas las unidades aéreas que ya han actuado este turno para un segundo ataque.',
        instantEffect: ({ units, player }) => {
          const updatedUnits = units.map(u => (u.ownerId === player && u.movementType === 'air') ? { ...u, hasMoved: false, hasActed: false } : u);
          return {
            updatedUnits,
            logMessage: '¡Eagle activó Lightning Drive! Las unidades aéreas aliadas pueden moverse y atacar nuevamente.',
          };
        },
      },
      scop: {
        name: 'Lightning Strike',
        stars: 9,
        description: '¡REACTIVA A TODAS LAS UNIDADES NO-TRANSPORTE ALIADAS para realizar un segundo turno consecutivo!',
        instantEffect: ({ units, player }) => {
          const updatedUnits = units.map(u => u.ownerId === player ? { ...u, hasMoved: false, hasActed: false } : u);
          return {
            updatedUnits,
            logMessage: '¡Eagle desató Lightning Strike! ¡Todo el ejército aliado puede volver a moverse y atacar!',
          };
        },
      },
    },
  },

  flak: {
    id: 'flak',
    name: 'Flak',
    title: 'Comandante Brutal',
    faction: 'black-hole',
    portraitFull: '/assets/CO/pixelated/flak-full.png',
    portraitSmall: '/assets/CO/pixelated/flak-small.png',
    dayToDay: {
      description: 'Ataques erráticos e impredecibles. Sus unidades pueden infligir desde un -10% de daño hasta un +25% de daño extra por suerte.',
    },
    powers: {
      cop: {
        name: 'Brute Force',
        stars: 3,
        description: 'Aumenta el rango de impacto crítico aleatorio hasta un +50% de daño brutal.',
      },
      scop: {
        name: 'Barbaric Blow',
        stars: 6,
        description: 'Potencia masiva de impacto crítico aleatorio hasta un +90% de daño adicional por suerte.',
      },
    },
  },

  grimm: {
    id: 'grimm',
    name: 'Grimm',
    title: 'El Luchador Indomable',
    faction: 'yellow-comet',
    portraitFull: '/assets/CO/pixelated/grimm-full.png',
    portraitSmall: '/assets/CO/pixelated/grimm-small.png',
    dayToDay: {
      description: 'Ofensiva temeraria: todas las unidades aliadas tienen +30% de ataque, pero sufren -20% de defensa.',
    },
    powers: {
      cop: {
        name: 'Knuckleduster',
        stars: 3,
        description: 'Aumenta la potencia de ataque de todas las unidades al +50% de daño adicional.',
      },
      scop: {
        name: 'Haymaker',
        stars: 6,
        description: 'Ataque demoledor: todas las unidades aliadas combaten con un brutal +80% de daño.',
      },
    },
  },

  grit: {
    id: 'grit',
    name: 'Grit',
    title: 'Tirador de Élite a Distancia',
    faction: 'blue-moon',
    portraitFull: '/assets/CO/pixelated/grit-full.png',
    portraitSmall: '/assets/CO/pixelated/grit-small.png',
    dayToDay: {
      description: 'Artillería y misiles obtienen +1 de alcance y +20% de ataque. Tropas de combate directo tienen -20% de ataque.',
    },
    powers: {
      cop: {
        name: 'Snipe Attack',
        stars: 3,
        description: 'Unidades indirectas ganan +1 de alcance adicional (+2 total) y +30% de daño.',
      },
      scop: {
        name: 'Super Snipe',
        stars: 6,
        description: 'Unidades indirectas ganan +2 de alcance adicional (+3 total) y +30% de daño.',
      },
    },
  },

  hachi: {
    id: 'hachi',
    name: 'Hachi',
    title: 'Comerciante Legendario',
    faction: 'orange-star',
    portraitFull: '/assets/CO/pixelated/hachi-full.png',
    portraitSmall: '/assets/CO/pixelated/hachi-small.png',
    dayToDay: {
      description: 'Acceso a canales de suministros privilegiados: -10% de coste en todas las unidades militares.',
    },
    powers: {
      cop: {
        name: 'Barter',
        stars: 3,
        description: 'Reduce el coste de despliegue de todas las unidades en un -50% durante este turno.',
      },
      scop: {
        name: 'Merchant Union',
        stars: 5,
        description: 'Permite desplegar unidades terrestres desde CUALQUIER ciudad aliada, no solo desde fábricas.',
      },
    },
  },

  hawke: {
    id: 'hawke',
    name: 'Hawke',
    title: 'El Estratega Halcón',
    faction: 'black-hole',
    portraitFull: '/assets/CO/pixelated/hawke-full.png',
    portraitSmall: '/assets/CO/pixelated/hawke-small.png',
    dayToDay: {
      description: 'Disciplina militar absoluta: todas las unidades tienen +10% de ataque en cualquier circunstancia.',
    },
    powers: {
      cop: {
        name: 'Black Wave',
        stars: 5,
        description: 'Drena 1 PV de todas las unidades enemigas del mapa y regenera +1 HP a todas las unidades aliadas.',
        instantEffect: ({ units, player }) => {
          const updatedUnits = units.map(u => {
            if (u.ownerId === player) return { ...u, hp: Math.min(10, u.hp + 1) };
            return { ...u, hp: Math.max(1, u.hp - 1) };
          });
          return {
            updatedUnits,
            logMessage: '¡Hawke activó Black Wave! -1 HP a todos los enemigos y +1 HP a todos los aliados.',
          };
        },
      },
      scop: {
        name: 'Black Storm',
        stars: 9,
        description: 'Drena 2 PV de todas las unidades enemigas en el mapa y cura +2 HP a todas las aliadas.',
        instantEffect: ({ units, player }) => {
          const updatedUnits = units.map(u => {
            if (u.ownerId === player) return { ...u, hp: Math.min(10, u.hp + 2) };
            return { ...u, hp: Math.max(1, u.hp - 2) };
          });
          return {
            updatedUnits,
            logMessage: '¡Hawke desató Black Storm! -2 HP a todo enemigo y +2 HP de regeneración a todas las tropas aliadas.',
          };
        },
      },
    },
  },

  jake: {
    id: 'jake',
    name: 'Jake',
    title: 'Comandante Urbano',
    faction: 'orange-star',
    portraitFull: '/assets/CO/pixelated/jake-full.png',
    portraitSmall: '/assets/CO/pixelated/jake-small.png',
    dayToDay: {
      description: 'Especialista en llanuras: todas las unidades terrestres tienen +10% de ataque sobre terreno de llanuras.',
    },
    powers: {
      cop: {
        name: 'Beat Box',
        stars: 3,
        description: '+1 de movimiento para todos los vehículos blindados y +20% de daño en llanuras.',
      },
      scop: {
        name: 'Block Rock',
        stars: 6,
        description: '+2 casillas de movilidad para vehículos y un devastador +40% de ataque en llanuras.',
      },
    },
  },

  javier: {
    id: 'javier',
    name: 'Javier',
    title: 'El Caballero Blindado',
    faction: 'green-earth',
    portraitFull: '/assets/CO/pixelated/javier-full.png',
    portraitSmall: '/assets/CO/pixelated/javier-small.png',
    dayToDay: {
      description: 'Las torres de comunicación otorgan bonificación defensiva adicional (+10% def y +20% def vs fuego indirecto por torre).',
    },
    powers: {
      cop: {
        name: 'Tower Shield',
        stars: 3,
        description: 'Duplica el bono defensivo de las torres de comunicación capturadas (+20% def adicional por torre).',
      },
      scop: {
        name: 'Tower of Power',
        stars: 6,
        description: 'Triplica el bono defensivo de las torres (+30% def por torre) y añade +20% de ataque.',
      },
    },
  },

  jess: {
    id: 'jess',
    name: 'Jess',
    title: 'Especialista en Blindados',
    faction: 'green-earth',
    portraitFull: '/assets/CO/pixelated/jess-full.png',
    portraitSmall: '/assets/CO/pixelated/jess-small.png',
    dayToDay: {
      description: 'Vehículos terrestres tienen +10% de ataque y +1 de movimiento. Infantería, aeronaves y buques sufren -10% de ataque.',
    },
    powers: {
      cop: {
        name: 'Turbo Charge',
        stars: 3,
        description: 'Vehículos terrestres ganan +1 de movimiento, +20% de ataque y reabastecen combustible y munición al 100%.',
        instantEffect: ({ units, player }) => {
          const updatedUnits = units.map(u => (u.ownerId === player && (u.movementType === 'treads' || u.movementType === 'wheels')) ? { ...u, ammo: 9, fuel: 99 } : u);
          return {
            updatedUnits,
            logMessage: '¡Jess activó Turbo Charge! Vehículos terrestres reabastecidos al 100% con +1 de movilidad.',
          };
        },
      },
      scop: {
        name: 'Overdrive',
        stars: 6,
        description: 'Vehículos terrestres ganan +2 de movimiento, +40% de ataque y reabastecimiento instantáneo total.',
        instantEffect: ({ units, player }) => {
          const updatedUnits = units.map(u => (u.ownerId === player && (u.movementType === 'treads' || u.movementType === 'wheels')) ? { ...u, ammo: 9, fuel: 99 } : u);
          return {
            updatedUnits,
            logMessage: '¡Jess desató Overdrive! Vehículos terrestres con +2 de movilidad y +40% de fuego.',
          };
        },
      },
    },
  },

  jugger: {
    id: 'jugger',
    name: 'Jugger',
    title: 'Cyborg de Combate',
    faction: 'black-hole',
    portraitFull: '/assets/CO/pixelated/jugger-full.png',
    portraitSmall: '/assets/CO/pixelated/jugger-small.png',
    dayToDay: {
      description: 'Algoritmo caótico inestable: daño fluctuante entre -15% y +30% por suerte en cada ataque.',
    },
    powers: {
      cop: {
        name: 'Overclock',
        stars: 3,
        description: 'Sobrecarga de procesadores: aumenta la suerte aleatoria hasta un +55% de daño extra.',
      },
      scop: {
        name: 'Crush',
        stars: 7,
        description: 'Furia de aniquilación: probabilidad de golpes críticos catastróficos de hasta +95% de daño adicional.',
      },
    },
  },

  kanbei: {
    id: 'kanbei',
    name: 'Kanbei',
    title: 'El Emperador Samurai',
    faction: 'yellow-comet',
    portraitFull: '/assets/CO/pixelated/kanbei-full.png',
    portraitSmall: '/assets/CO/pixelated/kanbei-small.png',
    dayToDay: {
      description: 'Honor de samurai: todas las unidades aliadas tienen +20% de ataque y +20% de defensa de base, pero cuestan +20% más de producción.',
    },
    powers: {
      cop: {
        name: 'Morale Boost',
        stars: 4,
        description: 'Aumenta el ataque de todas las unidades al +40% y la defensa al +30%.',
      },
      scop: {
        name: 'Samurai Spirit',
        stars: 7,
        description: 'Ataque +40%, defensa +30% y DUPLICA el daño de todos los contraataques del ejército.',
      },
    },
  },

  kindle: {
    id: 'kindle',
    name: 'Kindle',
    title: 'La Baronesa Urbana',
    faction: 'black-hole',
    portraitFull: '/assets/CO/pixelated/kindle-full.png',
    portraitSmall: '/assets/CO/pixelated/kindle-small.png',
    dayToDay: {
      description: 'Lucha en entornos urbanos: unidades posicionadas en ciudades o cuarteles tienen +40% de ataque.',
    },
    powers: {
      cop: {
        name: 'Urban Blight',
        stars: 3,
        description: 'Causa 3 PV de daño instantáneo a todas las unidades enemigas que se encuentren en ciudades o propiedades.',
        instantEffect: ({ units, tiles, player }) => {
          const updatedUnits = units.map(u => {
            const tile = tiles[u.y]?.[u.x];
            const isCity = tile && ['city', 'factory', 'airport', 'port', 'hq', 'lab'].includes(tile.type);
            if (u.ownerId !== player && isCity) {
              return { ...u, hp: Math.max(1, u.hp - 3) };
            }
            return u;
          });
          return {
            updatedUnits,
            logMessage: '¡Kindle activó Urban Blight! 3 PV de daño a unidades enemigas guarnecidas en ciudades.',
          };
        },
      },
      scop: {
        name: 'High Society',
        stars: 6,
        description: 'Todas las unidades aliadas ganan +3% de ataque por cada propiedad en posesión del jugador.',
      },
    },
  },

  koal: {
    id: 'koal',
    name: 'Koal',
    title: 'Maestro del Asfalto',
    faction: 'black-hole',
    portraitFull: '/assets/CO/pixelated/koal-full.png',
    portraitSmall: '/assets/CO/pixelated/koal-small.png',
    dayToDay: {
      description: 'Guerra relámpago en carreteras: unidades en carreteras o puentes tienen +10% de ataque.',
    },
    powers: {
      cop: {
        name: 'Hungry March',
        stars: 3,
        description: '+1 de movimiento para todas las tropas y +20% de daño en carreteras.',
      },
      scop: {
        name: 'Trail of Woe',
        stars: 5,
        description: '+2 casillas de movilidad general y +30% de ataque sobre carreteras y puentes.',
      },
    },
  },

  lash: {
    id: 'lash',
    name: 'Lash',
    title: 'La Pequeña Genio Táctica',
    faction: 'black-hole',
    portraitFull: '/assets/CO/pixelated/lash-full.png',
    portraitSmall: '/assets/CO/pixelated/lash-small.png',
    dayToDay: {
      description: 'Aprovechamiento del terreno: gana +10% de ataque por cada estrella de cobertura del terreno en que se ubica la unidad.',
    },
    powers: {
      cop: {
        name: 'Terrain Tactics',
        stars: 4,
        description: 'El coste de movimiento de todas las unidades se reduce a 1 en cualquier tipo de terreno franqueable.',
      },
      scop: {
        name: 'Prime Tactics',
        stars: 7,
        description: 'Duplica las estrellas de defensa de todas las casillas y reduce a 1 el coste de movimiento universal.',
      },
    },
  },

  max: {
    id: 'max',
    name: 'Max',
    title: 'Fuerza Bruta Acorazada',
    faction: 'orange-star',
    portraitFull: '/assets/CO/pixelated/max-full.png',
    portraitSmall: '/assets/CO/pixelated/max-small.png',
    dayToDay: {
      description: 'Unidades de combate directo blindadas tienen +20% de ataque. Unidades indirectas sufren -10% de ataque y -1 rango de alcance.',
    },
    powers: {
      cop: {
        name: 'Max Force',
        stars: 3,
        description: 'Unidades de combate directo no-infantería ganan +1 de movilidad y +20% de potencia ofensiva.',
      },
      scop: {
        name: 'Max Blast',
        stars: 6,
        description: 'Unidades directas blindadas ganan +2 de movilidad y +40% de ataque brutal (+60% total).',
      },
    },
  },

  nell: {
    id: 'nell',
    name: 'Nell',
    title: 'La Dama de la Fortuna',
    faction: 'orange-star',
    portraitFull: '/assets/CO/pixelated/nell-full.png',
    portraitSmall: '/assets/CO/pixelated/nell-small.png',
    dayToDay: {
      description: 'Bendecida por la suerte: sus unidades infligen entre 0 y +15% de daño extra aleatorio.',
    },
    powers: {
      cop: {
        name: 'Lucky Star',
        stars: 3,
        description: 'Aumenta el margen de impacto crítico por suerte hasta un +60% de daño extra.',
      },
      scop: {
        name: 'Lady Luck',
        stars: 6,
        description: '¡La suerte suprema! Posibilidad de infligir hasta un demoledor +100% de daño crítico.',
      },
    },
  },

  olaf: {
    id: 'olaf',
    name: 'Olaf',
    title: 'El Señor del Invierno',
    faction: 'blue-moon',
    portraitFull: '/assets/CO/pixelated/olaf-full.png',
    portraitSmall: '/assets/CO/pixelated/olaf-small.png',
    dayToDay: {
      description: 'Inmune a penalizaciones de nieve (se mueve como si fuera clima despejado). En lluvia se ralentiza como en nieve.',
    },
    powers: {
      cop: {
        name: 'Blizzard',
        stars: 3,
        description: 'Desata una tormenta de nieve durante 1 turno que ralentiza a todos los enemigos y duplica su gasto de combustible.',
      },
      scop: {
        name: 'Winter Fury',
        stars: 7,
        description: 'Desata una ventisca ártica masiva: causa 2 PV de daño a todos los enemigos e impone nieve extrema.',
        instantEffect: ({ units, player }) => {
          const updatedUnits = units.map(u => u.ownerId !== player ? { ...u, hp: Math.max(1, u.hp - 2) } : u);
          return {
            updatedUnits,
            logMessage: '¡Olaf desató Winter Fury! 2 PV de daño gélido a todo enemigo y nieve ártica.',
          };
        },
      },
    },
  },

  rachel: {
    id: 'rachel',
    name: 'Rachel',
    title: 'Comandante de Artillería Estratégica',
    faction: 'orange-star',
    portraitFull: '/assets/CO/pixelated/rachel-full.png',
    portraitSmall: '/assets/CO/pixelated/rachel-small.png',
    dayToDay: {
      description: 'Tasa de reparación acelerada: unidades en propiedades aliadas reparan +1 HP adicional (total +3 HP por turno).',
    },
    powers: {
      cop: {
        name: 'Lucky Lass',
        stars: 3,
        description: 'Aumenta la suerte del ejército con críticos de hasta +40% de daño.',
      },
      scop: {
        name: 'Covering Fire',
        stars: 6,
        description: 'Lanza 3 misiles balísticos automáticos contra las 3 mayores concentraciones de unidades enemigas (3 PV de daño por misil).',
        instantEffect: ({ units, player }) => {
          // Damages up to 3 highest HP enemy units by 3 HP
          const enemies = units.filter(u => u.ownerId !== player && u.hp > 1).sort((a, b) => b.hp - a.hp).slice(0, 3);
          const targetIds = new Set(enemies.map(e => e.id));
          const updatedUnits = units.map(u => targetIds.has(u.id) ? { ...u, hp: Math.max(1, u.hp - 3) } : u);
          return {
            updatedUnits,
            logMessage: '¡Rachel desató Covering Fire! 3 misiles balísticos impactaron las líneas enemigas (-3 HP).',
          };
        },
      },
    },
  },

  sami: {
    id: 'sami',
    name: 'Sami',
    title: 'Comando de Fuerzas Especiales',
    faction: 'orange-star',
    portraitFull: '/assets/CO/pixelated/sami-full.png',
    portraitSmall: '/assets/CO/pixelated/sami-small.png',
    dayToDay: {
      description: 'Tropas a pie (Infantería y Mecanizados) tienen +30% de ataque y capturan a tasa acelerada de 1.5x.',
    },
    powers: {
      cop: {
        name: 'Double Time',
        stars: 3,
        description: 'Infantería y Mecanizados obtienen +1 casilla de movilidad y +20% de potencia de fuego adicional (+50% total).',
      },
      scop: {
        name: 'Victory March',
        stars: 8,
        description: 'Infantería y Mecanizados ganan +2 de movimiento, +50% de ataque y CAPTURA INSTANTÁNEA (20 HP) en 1 turno.',
      },
    },
  },

  sasha: {
    id: 'sasha',
    name: 'Sasha',
    title: 'La Heredera Diplomática',
    faction: 'blue-moon',
    portraitFull: '/assets/CO/pixelated/sasha-full.png',
    portraitSmall: '/assets/CO/pixelated/sasha-small.png',
    dayToDay: {
      description: 'Diplomacia financiera: genera +100G adicionales por cada propiedad capturada en cada turno.',
    },
    powers: {
      cop: {
        name: 'Market Crash',
        stars: 2,
        description: 'Reduce el medidor de poder del oponente en proporción directa a los fondos almacenados en tu tesoro.',
      },
      scop: {
        name: 'War Bonds',
        stars: 6,
        description: 'Obtienes fondos directos del 50% de todo el valor de daño infligido a unidades enemigas este turno.',
      },
    },
  },

  sensei: {
    id: 'sensei',
    name: 'Sensei',
    title: 'Comandante Paracaidista',
    faction: 'yellow-comet',
    portraitFull: '/assets/CO/pixelated/sensei-full.png',
    portraitSmall: '/assets/CO/pixelated/sensei-small.png',
    dayToDay: {
      description: 'Helicópteros tienen +50% de ataque. Infantería +40% de ataque. Vehículos y barcos sufren -10% de ataque.',
    },
    powers: {
      cop: {
        name: 'Copter Command',
        stars: 2,
        description: 'Helicópteros ganan +1 de movimiento y engendra paracaidistas (Infantería 9 HP) en todas las ciudades aliadas desocupadas.',
      },
      scop: {
        name: 'Airborne Assault',
        stars: 6,
        description: 'Helicópteros ganan +2 de movimiento y despliega unidades mecanizadas (Mech 9 HP) en todas las ciudades aliadas vacías.',
      },
    },
  },

  sonja: {
    id: 'sonja',
    name: 'Sonja',
    title: 'Estratega Silenciosa',
    faction: 'yellow-comet',
    portraitFull: '/assets/CO/pixelated/sonja-full.png',
    portraitSmall: '/assets/CO/pixelated/sonja-small.png',
    dayToDay: {
      description: 'Todas las unidades tienen +1 casilla de visión en niebla de guerra. Oculta el HP exacto de sus unidades al rival y sus contraataques infligen +50% de daño extra.',
    },
    powers: {
      cop: {
        name: 'Enhanced Vision',
        stars: 3,
        description: 'Visión aumentada en +1 adicional (+2 total) y revela bosques y arrecifes sin necesidad de adyacencia.',
      },
      scop: {
        name: 'Counter Break',
        stars: 5,
        description: 'Contraataque anticipado: sus unidades contraatacan antes de recibir el impacto del ataque enemigo.',
      },
    },
  },

  sturm: {
    id: 'sturm',
    name: 'Sturm',
    title: 'Comandante Supremo de Black Hole',
    faction: 'black-hole',
    portraitFull: '/assets/CO/pixelated/sturm-full.png',
    portraitSmall: '/assets/CO/pixelated/sturm-small.png',
    dayToDay: {
      description: 'Movimiento perfecto: todas las unidades terrestres se desplazan con coste de 1 en cualquier terreno. +20% de ataque y +20% de defensa universal.',
    },
    powers: {
      scop: {
        name: 'Meteor Strike',
        stars: 10,
        description: 'Invoca un meteoro colosal desde el espacio que impacta un área 3x3 causando 8 PV de daño masivo a todas las unidades enemigas atrapadas.',
        instantEffect: ({ units, player }) => {
          // Impacts enemy units with 8 HP damage (minimum 1 HP survival)
          const updatedUnits = units.map(u => u.ownerId !== player ? { ...u, hp: Math.max(1, u.hp - 8) } : u);
          return {
            updatedUnits,
            logMessage: '¡Sturm invocó METEOR STRIKE! Un cataclismo espacial infligió 8 PV de daño a las tropas enemigas.',
          };
        },
      },
    },
  },

  von_bolt: {
    id: 'von_bolt',
    name: 'Von Bolt',
    title: 'El Comandante Inmortal',
    faction: 'black-hole',
    portraitFull: '/assets/CO/pixelated/vonbolt-full.png',
    portraitSmall: '/assets/CO/pixelated/vonbolt-small.png',
    dayToDay: {
      description: 'Tecnología biomecánica: todas las unidades tienen +10% de ataque y +10% de defensa permanentemente.',
    },
    powers: {
      scop: {
        name: 'Ex Machina',
        stars: 10,
        description: 'Dispara una onda electromagnética devastadora que causa 3 PV de daño a todos los enemigos y paraliza sus unidades impidiendo su acción en el siguiente turno.',
        instantEffect: ({ units, player }) => {
          const updatedUnits = units.map(u => u.ownerId !== player ? { ...u, hp: Math.max(1, u.hp - 3), hasActed: true, hasMoved: true } : u);
          return {
            updatedUnits,
            logMessage: '¡Von Bolt activó EX MACHINA! 3 PV de daño y parálisis total electromagnética.',
          };
        },
      },
    },
  },
};

export interface PlayerCOState {
  coId: COId;
  powerMeter: number;
  activePower: COPowerType | null;
}

export class COEngine {
  public static getCO(coId: COId): CODefinition {
    return CANONICAL_CO_REGISTRY[coId] ?? CANONICAL_CO_REGISTRY.andy;
  }

  public static getPowerChargeThreshold(coId: COId, powerType: COPowerType): number {
    const co = this.getCO(coId);
    const power = co.powers[powerType];
    if (!power) return Infinity;
    return power.stars * STAR_CHARGE_VALUE;
  }

  public static canActivatePower(state: PlayerCOState, powerType: COPowerType): boolean {
    if (state.activePower !== null) return false;
    const threshold = this.getPowerChargeThreshold(state.coId, powerType);
    return state.powerMeter >= threshold;
  }

  public static calculateCombatCharge(
    damageDealtHp: number,
    targetUnitCost: number,
    damageReceivedHp: number,
    ownUnitCost: number
  ): number {
    const defensiveCharge = (ownUnitCost / 10) * damageReceivedHp * DEFENSIVE_CHARGE_MULT;
    const offensiveCharge = (targetUnitCost / 10) * damageDealtHp * OFFENSIVE_CHARGE_MULT;
    return Math.floor(defensiveCharge + offensiveCharge);
  }

  public static activatePower(
    state: PlayerCOState,
    powerType: COPowerType,
    context: {
      player: 'p1' | 'p2';
      units: TacticalUnit[];
      tiles: TerrainTile[][];
      funds: number;
    }
  ): {
    updatedState: PlayerCOState;
    updatedUnits?: TacticalUnit[];
    updatedTiles?: TerrainTile[][];
    updatedFunds?: number;
    logMessage: string;
  } {
    const co = this.getCO(state.coId);
    const power = co.powers[powerType];
    if (!power) {
      return {
        updatedState: state,
        updatedUnits: context.units,
        updatedTiles: context.tiles,
        updatedFunds: context.funds,
        logMessage: 'Poder no disponible para este comandante.',
      };
    }

    const updatedState: PlayerCOState = {
      ...state,
      powerMeter: 0,
      activePower: powerType,
    };

    let updatedUnits = context.units;
    let updatedTiles = context.tiles;
    let updatedFunds = context.funds;
    let message = `¡${co.name} activó ${power.name}!`;

    if (power.instantEffect) {
      const effectRes = power.instantEffect({
        player: context.player,
        units: context.units,
        tiles: context.tiles,
        funds: context.funds,
      });
      if (effectRes.updatedUnits) updatedUnits = effectRes.updatedUnits;
      if (effectRes.updatedTiles) updatedTiles = effectRes.updatedTiles;
      if (effectRes.updatedFunds !== undefined) updatedFunds = effectRes.updatedFunds;
      if (effectRes.logMessage) message = effectRes.logMessage;
    }

    return {
      updatedState,
      updatedUnits,
      updatedTiles,
      updatedFunds,
      logMessage: message,
    };
  }

  public static expirePowerOnTurnEnd(state: PlayerCOState): PlayerCOState {
    if (state.activePower === null) return state;
    return {
      ...state,
      activePower: null,
    };
  }

  public static getCombatModifiers(
    attacker: TacticalUnit,
    defender: TacticalUnit,
    attackerCo: PlayerCOState,
    defenderCo: PlayerCOState,
    attackerFunds: number = 0
  ): {
    attackerModifier: number;
    defenderModifier: number;
  } {
    let attackMod = 100;
    let defMod = 100;

    const isAttackerIndirect = attacker.minRange > 1 || attacker.maxRange > 1;
    const isAttackerFoot = attacker.unitCode === 'infantry' || attacker.unitCode === 'mech';
    const isAttackerAir = attacker.movementType === 'air';

    // Universal COP/SCOP buffs (+10% Firepower, +10% Defense)
    if (attackerCo.activePower === 'cop' || attackerCo.activePower === 'scop') {
      attackMod += 10;
      defMod += 10;
    }
    if (defenderCo.activePower === 'cop' || defenderCo.activePower === 'scop') {
      defMod += 10;
    }

    // Specific Day-to-Day and Power modifiers for attacker
    switch (attackerCo.coId) {
      case 'andy':
        if (attackerCo.activePower === 'scop') attackMod += 20;
        break;

      case 'sami':
        if (isAttackerFoot) {
          attackMod += 30;
          if (attackerCo.activePower === 'cop') attackMod += 20;
          if (attackerCo.activePower === 'scop') attackMod += 50;
        } else if (!isAttackerIndirect) {
          attackMod -= 10;
        }
        break;

      case 'max':
        if (!isAttackerIndirect && !isAttackerFoot) {
          attackMod += 20;
          if (attackerCo.activePower === 'cop') attackMod += 20;
          if (attackerCo.activePower === 'scop') attackMod += 40;
        } else if (isAttackerIndirect) {
          attackMod -= 10;
        }
        break;

      case 'colin':
        attackMod -= 10;
        if (attackerCo.activePower === 'scop') {
          attackMod += Math.floor(attackerFunds / 300);
        }
        break;

      case 'grit':
        if (isAttackerIndirect) {
          attackMod += 20;
          if (attackerCo.activePower === 'cop' || attackerCo.activePower === 'scop') attackMod += 30;
        } else if (!isAttackerFoot) {
          attackMod -= 20;
        }
        break;

      case 'eagle':
        if (isAttackerAir) {
          attackMod += 20;
        }
        break;

      case 'grimm':
        attackMod += 30;
        defMod -= 20;
        if (attackerCo.activePower === 'cop') attackMod += 50;
        if (attackerCo.activePower === 'scop') attackMod += 80;
        break;

      case 'kanbei':
        attackMod += 20;
        defMod += 20;
        if (attackerCo.activePower === 'cop') attackMod += 20;
        if (attackerCo.activePower === 'scop') attackMod += 20;
        break;

      case 'hawke':
        attackMod += 10;
        break;

      case 'sturm':
        attackMod += 20;
        defMod += 20;
        break;

      case 'von_bolt':
        attackMod += 10;
        defMod += 10;
        break;

      case 'sensei':
        if (isAttackerAir) attackMod += 50;
        if (isAttackerFoot) attackMod += 40;
        break;
    }

    return {
      attackerModifier: Math.max(10, attackMod),
      defenderModifier: Math.max(10, defMod),
    };
  }

  public static getMovementBonus(coState: PlayerCOState, unitCode: string, minRange: number): number {
    let bonus = 0;
    const isFoot = unitCode === 'infantry' || unitCode === 'mech';
    const isDirect = minRange === 1;

    if (coState.coId === 'adder') {
      if (coState.activePower === 'cop') bonus += 1;
      if (coState.activePower === 'scop') bonus += 2;
    }

    if (coState.coId === 'andy' && coState.activePower === 'scop') {
      bonus += 1;
    }

    if (coState.coId === 'sami') {
      if (isFoot) {
        if (coState.activePower === 'cop') bonus += 1;
        if (coState.activePower === 'scop') bonus += 2;
      }
    }

    if (coState.coId === 'max') {
      if (isDirect && !isFoot) {
        if (coState.activePower === 'cop') bonus += 1;
        if (coState.activePower === 'scop') bonus += 2;
      }
    }

    return bonus;
  }

  public static getRangeBonus(coState: PlayerCOState, minRange: number, maxRange: number): { minBonus: number; maxBonus: number } {
    const isIndirect = minRange > 1 || maxRange > 1;
    let maxBonus = 0;
    let minBonus = 0;

    if (coState.coId === 'grit' && isIndirect) {
      maxBonus += 1;
      if (coState.activePower === 'cop') maxBonus += 1;
      if (coState.activePower === 'scop') maxBonus += 2;
    }

    if (coState.coId === 'max' && isIndirect) {
      maxBonus -= 1;
    }

    return { minBonus, maxBonus };
  }

  public static getProductionCostModifier(coId: COId, baseCost: number): number {
    if (coId === 'colin') {
      return Math.floor(baseCost * 0.8);
    }
    if (coId === 'hachi') {
      return Math.floor(baseCost * 0.9);
    }
    if (coId === 'kanbei') {
      return Math.floor(baseCost * 1.2);
    }
    return baseCost;
  }

  public static getCapturePoints(
    coState: PlayerCOState,
    soldierHp: number
  ): number {
    if (coState.coId === 'sami') {
      if (coState.activePower === 'scop') {
        return 20;
      }
      return Math.floor(soldierHp * 1.5);
    }
    return soldierHp;
  }
}

export const ALL_CANONICAL_CO_IDS: COId[] = Object.keys(CANONICAL_CO_REGISTRY) as COId[];

const CO_LEGACY_ALIAS_MAP: Record<string, COId> = {
  stella: 'sami',
  volkov: 'grit',
  vance: 'max',
  vonbolt: 'von_bolt',
  'von-bolt': 'von_bolt',
};

/**
 * Normaliza cualquier identificador de comandante (incluyendo alias de lore) a un COId canónico válido
 * de los 28 oficiales con arte en smoothFull, evitando errores 404 por IDs huérfanos.
 */
export function resolveCanonicalCOId(rawId?: string | null): COId {
  if (!rawId) return 'andy';
  const normalized = rawId.trim().toLowerCase();
  if (normalized in CANONICAL_CO_REGISTRY) {
    return normalized as COId;
  }
  if (normalized in CO_LEGACY_ALIAS_MAP) {
    return CO_LEGACY_ALIAS_MAP[normalized];
  }
  return 'andy';
}

/**
 * Devuelve la ruta pública garantizada del arte Full Body en /assets/CO/smoothFull/Awds-[slug].webp
 * para cualquiera de los 28 comandantes del registro canónico.
 */
export function getCOFullBodyUrl(coId?: string | null): string {
  const canonicalId = resolveCanonicalCOId(coId);
  const fileSlug = canonicalId === 'von_bolt' ? 'von-bolt' : canonicalId;
  return `/assets/CO/smoothFull/Awds-${fileSlug}.webp`;
}

export const CO_FACTION_META: Record<
  CODefinition['faction'],
  {
    label: string;
    shortCode: string;
    primaryHex: string;
    accentHex: string;
    badgeBgClass: string;
    borderClass: string;
  }
> = {
  'orange-star': {
    label: 'Orange Star',
    shortCode: 'OS // VANGUARDIA',
    primaryHex: '#E65100',
    accentHex: '#F59E0B',
    badgeBgClass: 'bg-[#E65100] text-[#F2E8D5]',
    borderClass: 'border-[#E65100]',
  },
  'blue-moon': {
    label: 'Blue Moon',
    shortCode: 'BM // FRENTE ÁRTICO',
    primaryHex: '#1D4ED8',
    accentHex: '#93C5FD',
    badgeBgClass: 'bg-[#1D4ED8] text-[#F2E8D5]',
    borderClass: 'border-[#1D4ED8]',
  },
  'green-earth': {
    label: 'Green Earth',
    shortCode: 'GE // ESCUADRÓN AÉREO-NAVAL',
    primaryHex: '#15803D',
    accentHex: '#86EFAC',
    badgeBgClass: 'bg-[#15803D] text-[#F2E8D5]',
    borderClass: 'border-[#15803D]',
  },
  'yellow-comet': {
    label: 'Yellow Comet',
    shortCode: 'YC // GUARDIA IMPERIAL',
    primaryHex: '#D97706',
    accentHex: '#FDE047',
    badgeBgClass: 'bg-[#D97706] text-[#0A0B08]',
    borderClass: 'border-[#D97706]',
  },
  'black-hole': {
    label: 'Black Hole',
    shortCode: 'BH // DIVISIÓN SOMBRA',
    primaryHex: '#4C1D95',
    accentHex: '#EF4444',
    badgeBgClass: 'bg-[#4C1D95] text-[#F2E8D5]',
    borderClass: 'border-[#4C1D95]',
  },
};


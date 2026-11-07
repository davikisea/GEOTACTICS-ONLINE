/**
 * ==============================================================================
 * GENERADOR DE RED VIAL URBANA Y CIUDADES REALES (C4ISR VECTOR PIPELINE)
 * ==============================================================================
 * Genera theatre_cities.json y theatre_urban_roads.json con precisión geográfica real
 * para el umbral de Zoom Operacional x10 de GEOTACTICS: ONLINE.
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';

const PUBLIC_MAP_DIR = path.resolve('public/map');
if (!fs.existsSync(PUBLIC_MAP_DIR)) {
  fs.mkdirSync(PUBLIC_MAP_DIR, { recursive: true });
}

// ----------------------------------------------------------------------------
// 1. GENERACIÓN DE CIUDADES OFICIALES DE LA REGIÓN (theatre_cities.json)
// ----------------------------------------------------------------------------
const CITIES_DATA = [
  {
    id: 'CITY_CARACAS',
    name: 'Caracas',
    stateId: 'REG_VE_01',
    stateName: 'Distrito Capital',
    coordinates: [-66.9036, 10.4806],
    type: 'national_capital',
    importance: 'capital',
    population: 2950000,
    factionId: 'orange_star',
    strategicRole: 'Centro de Mando Nacional y Banco Central',
  },
  {
    id: 'CITY_CABIMAS',
    name: 'Cabimas',
    stateId: 'REG_VE_02',
    stateName: 'Zulia',
    coordinates: [-71.4539, 10.3994],
    type: 'petroleum_metropolis',
    importance: 'major',
    population: 320000,
    factionId: 'blue_moon',
    strategicRole: 'Epicentro Petrolero Génesis • Terminal La Salina',
  },
  {
    id: 'CITY_MARACAIBO',
    name: 'Maracaibo',
    stateId: 'REG_VE_02',
    stateName: 'Zulia',
    coordinates: [-71.6406, 10.6544],
    type: 'port_metropolis',
    importance: 'major',
    population: 1650000,
    factionId: 'blue_moon',
    strategicRole: 'Puerto Occidental y Estrecho de Maracaibo',
  },
  {
    id: 'CITY_CIUDAD_OJEDA',
    name: 'Ciudad Ojeda',
    stateId: 'REG_VE_02',
    stateName: 'Zulia',
    coordinates: [-71.3087, 10.2078],
    type: 'industrial_hub',
    importance: 'secondary',
    population: 180000,
    factionId: 'blue_moon',
    strategicRole: 'Complejo de Servicios Petroleros Costa Oriental',
  },
  {
    id: 'CITY_VALENCIA',
    name: 'Valencia',
    stateId: 'REG_VE_05',
    stateName: 'Carabobo',
    coordinates: [-68.0077, 10.1620],
    type: 'industrial_hub',
    importance: 'major',
    population: 1550000,
    factionId: 'yellow_comet',
    strategicRole: 'Complejo Industrial Metalmecánico y Ensamblaje',
  },
  {
    id: 'CITY_BARQUISIMETO',
    name: 'Barquisimeto',
    stateId: 'REG_VE_07',
    stateName: 'Lara',
    coordinates: [-69.3228, 10.0647],
    type: 'logistics_hub',
    importance: 'major',
    population: 1100000,
    factionId: 'green_earth',
    strategicRole: 'Nudo Logístico Ferroviario y Vial Centro-Occidente',
  },
  {
    id: 'CITY_MARACAY',
    name: 'Maracay',
    stateId: 'REG_VE_08',
    stateName: 'Aragua',
    coordinates: [-67.5958, 10.2469],
    type: 'military_citadel',
    importance: 'major',
    population: 950000,
    factionId: 'orange_star',
    strategicRole: 'Base Aérea El Libertador y Arsenal Central',
  },
  {
    id: 'CITY_PUERTO_LA_CRUZ',
    name: 'Puerto La Cruz / Barcelona',
    stateId: 'REG_VE_04',
    stateName: 'Anzoátegui',
    coordinates: [-64.6344, 10.2189],
    type: 'refinery_port',
    importance: 'major',
    population: 850000,
    factionId: 'orange_star',
    strategicRole: 'Refinería El Chaure y Terminal Petrolero de Oriente',
  },
  {
    id: 'CITY_CIUDAD_GUAYANA',
    name: 'Ciudad Guayana (Puerto Ordaz)',
    stateId: 'REG_VE_03',
    stateName: 'Bolívar',
    coordinates: [-62.7118, 8.3077],
    type: 'heavy_metallurgy',
    importance: 'major',
    population: 900000,
    factionId: 'black_hole',
    strategicRole: 'Siderúrgica SIDOR, Bauxita y Represa de Guri',
  },
  {
    id: 'CITY_SAN_CRISTOBAL',
    name: 'San Cristóbal',
    stateId: 'REG_VE_10',
    stateName: 'Táchira',
    coordinates: [-72.2250, 7.7669],
    type: 'border_fortress',
    importance: 'major',
    population: 480000,
    factionId: 'black_hole',
    strategicRole: 'Fortaleza Andina y Frontera Occidental',
  },
  {
    id: 'CITY_MERIDA',
    name: 'Mérida',
    stateId: 'REG_VE_15',
    stateName: 'Mérida',
    coordinates: [-71.1450, 8.5983],
    type: 'mountain_citadel',
    importance: 'secondary',
    population: 310000,
    factionId: 'black_hole',
    strategicRole: 'Red de Telecomunicaciones y Bastión de Altura',
  },
  {
    id: 'CITY_CORO',
    name: 'Coro (Punto Fijo / Paraguaná)',
    stateId: 'REG_VE_09',
    stateName: 'Falcón',
    coordinates: [-69.6734, 11.4045],
    type: 'refining_complex',
    importance: 'secondary',
    population: 340000,
    factionId: 'yellow_comet',
    strategicRole: 'Complejo Refinador de Amuay y Cardón',
  },
  {
    id: 'CITY_MATURIN',
    name: 'Maturín',
    stateId: 'REG_VE_12',
    stateName: 'Monagas',
    coordinates: [-63.1767, 9.7456],
    type: 'petroleum_basin',
    importance: 'secondary',
    population: 520000,
    factionId: 'orange_star',
    strategicRole: 'Cuenca Gasífera y Petrolera del Furrial',
  },
  {
    id: 'CITY_BARINAS',
    name: 'Barinas',
    stateId: 'REG_VE_14',
    stateName: 'Barinas',
    coordinates: [-70.2075, 8.6226],
    type: 'agricultural_plains',
    importance: 'secondary',
    population: 400000,
    factionId: 'green_earth',
    strategicRole: 'Granero de Campaña y Corredor Llanero',
  },
  {
    id: 'CITY_LA_GUAIRA',
    name: 'La Guaira',
    stateId: 'REG_VE_24',
    stateName: 'La Guaira',
    coordinates: [-66.9322, 10.6017],
    type: 'strategic_port',
    importance: 'secondary',
    population: 360000,
    factionId: 'orange_star',
    strategicRole: 'Puerto Internacional y Aeropuerto de Maiquetía',
  },
];

const citiesGeoJson = {
  type: 'FeatureCollection',
  features: CITIES_DATA.map((city) => ({
    type: 'Feature',
    id: city.id,
    properties: {
      id: city.id,
      name: city.name,
      stateId: city.stateId,
      stateName: city.stateName,
      type: city.type,
      importance: city.importance,
      population: city.population,
      factionId: city.factionId,
      strategicRole: city.strategicRole,
    },
    geometry: {
      type: 'Point',
      coordinates: city.coordinates,
    },
  })),
};

const citiesPath = path.join(PUBLIC_MAP_DIR, 'theatre_cities.json');
fs.writeFileSync(citiesPath, JSON.stringify(citiesGeoJson, null, 2), 'utf8');
console.log(`✓ theatre_cities.json generado: ${CITIES_DATA.length} ciudades registradas.`);

// ----------------------------------------------------------------------------
// 2. GENERACIÓN DE RED VIAL URBANA FIEL A LA GEOGRAFÍA (theatre_urban_roads.json)
// ----------------------------------------------------------------------------
// Trazado de avenidas principales y secundarias exactas de Cabimas, Maracaibo, Caracas, Valencia y Barquisimeto
const URBAN_ROADS_FEATURES = [
  // ==========================================================================
  // CABIMAS (Epicentro Génesis - Costa Oriental del Lago, Zulia)
  // ==========================================================================
  {
    id: 'road-cab-intercomunal-1',
    name: 'Avenida Intercomunal Cabimas',
    city: 'Cabimas',
    highway: 'primary',
    lanes: 4,
    speedLimit: 60,
    coordinates: [
      [-71.465, 10.420],
      [-71.460, 10.405],
      [-71.454, 10.395],
      [-71.448, 10.380],
      [-71.439, 10.360],
      [-71.428, 10.335],
      [-71.390, 10.270],
    ],
  },
  {
    id: 'road-cab-av32',
    name: 'Avenida 32 Cabimas',
    city: 'Cabimas',
    highway: 'primary',
    lanes: 4,
    speedLimit: 50,
    coordinates: [
      [-71.450, 10.425],
      [-71.445, 10.408],
      [-71.438, 10.390],
      [-71.430, 10.370],
      [-71.420, 10.345],
    ],
  },
  {
    id: 'road-cab-carretera-h',
    name: 'Carretera H (Eje Este-Oeste)',
    city: 'Cabimas',
    highway: 'primary',
    lanes: 4,
    speedLimit: 60,
    coordinates: [
      [-71.460, 10.395],
      [-71.448, 10.396],
      [-71.438, 10.396],
      [-71.415, 10.397],
      [-71.370, 10.398],
      [-71.320, 10.400], // Conexión a Lara-Zulia
    ],
  },
  {
    id: 'road-cab-carretera-j',
    name: 'Carretera J Cabimas',
    city: 'Cabimas',
    highway: 'secondary',
    lanes: 2,
    speedLimit: 45,
    coordinates: [
      [-71.456, 10.382],
      [-71.446, 10.382],
      [-71.434, 10.383],
      [-71.410, 10.384],
    ],
  },
  {
    id: 'road-cab-carretera-k',
    name: 'Carretera K (Acceso Barroso)',
    city: 'Cabimas',
    highway: 'primary',
    lanes: 4,
    speedLimit: 50,
    coordinates: [
      [-71.451, 10.370],
      [-71.440, 10.370],
      [-71.425, 10.370],
      [-71.405, 10.371],
      [-71.365, 10.373],
    ],
  },
  {
    id: 'road-cab-av-miraflores',
    name: 'Avenida Miraflores Cabimas',
    city: 'Cabimas',
    highway: 'secondary',
    lanes: 2,
    speedLimit: 40,
    coordinates: [
      [-71.462, 10.402],
      [-71.455, 10.401],
      [-71.448, 10.400],
      [-71.442, 10.398],
    ],
  },
  {
    id: 'road-cab-av-andres-bello',
    name: 'Avenida Andrés Bello Cabimas',
    city: 'Cabimas',
    highway: 'secondary',
    lanes: 2,
    speedLimit: 45,
    coordinates: [
      [-71.468, 10.415],
      [-71.463, 10.400],
      [-71.458, 10.385],
    ],
  },

  // ==========================================================================
  // MARACAIBO (Capital del Zulia y Costa Occidental)
  // ==========================================================================
  {
    id: 'road-mcbo-av-bella-vista',
    name: 'Avenida 4 (Bella Vista)',
    city: 'Maracaibo',
    highway: 'primary',
    lanes: 4,
    speedLimit: 50,
    coordinates: [
      [-71.605, 10.635],
      [-71.608, 10.650],
      [-71.611, 10.665],
      [-71.614, 10.680],
      [-71.617, 10.695],
    ],
  },
  {
    id: 'road-mcbo-av-delicias',
    name: 'Avenida 15 (Las Delicias)',
    city: 'Maracaibo',
    highway: 'primary',
    lanes: 4,
    speedLimit: 50,
    coordinates: [
      [-71.618, 10.632],
      [-71.621, 10.650],
      [-71.624, 10.670],
      [-71.627, 10.690],
      [-71.630, 10.710],
    ],
  },
  {
    id: 'road-mcbo-av-la-limpia',
    name: 'Avenida La Limpia',
    city: 'Maracaibo',
    highway: 'primary',
    lanes: 4,
    speedLimit: 55,
    coordinates: [
      [-71.625, 10.638],
      [-71.642, 10.650],
      [-71.660, 10.662],
      [-71.678, 10.674],
      [-71.695, 10.685], // Hacia La Concepción
    ],
  },
  {
    id: 'road-mcbo-circunvalacion-2',
    name: 'Avenida Circunvalación 2 (C2)',
    city: 'Maracaibo',
    highway: 'primary',
    lanes: 6,
    speedLimit: 70,
    coordinates: [
      [-71.650, 10.605],
      [-71.658, 10.630],
      [-71.652, 10.660],
      [-71.640, 10.685],
      [-71.620, 10.705],
    ],
  },
  {
    id: 'road-mcbo-av-el-milagro',
    name: 'Avenida El Milagro (Costanera)',
    city: 'Maracaibo',
    highway: 'primary',
    lanes: 4,
    speedLimit: 60,
    coordinates: [
      [-71.600, 10.630],
      [-71.597, 10.650],
      [-71.595, 10.670],
      [-71.592, 10.690],
      [-71.585, 10.710],
    ],
  },
  {
    id: 'road-mcbo-av-5-de-julio',
    name: 'Calle 77 (Avenida 5 de Julio)',
    city: 'Maracaibo',
    highway: 'secondary',
    lanes: 4,
    speedLimit: 45,
    coordinates: [
      [-71.595, 10.665],
      [-71.610, 10.665],
      [-71.625, 10.665],
      [-71.640, 10.665],
    ],
  },

  // ==========================================================================
  // CARACAS (Distrito Capital y Área Metropolitana)
  // ==========================================================================
  {
    id: 'road-ccs-av-fco-miranda',
    name: 'Avenida Francisco de Miranda',
    city: 'Caracas',
    highway: 'primary',
    lanes: 6,
    speedLimit: 50,
    coordinates: [
      [-66.885, 10.490],
      [-66.865, 10.492],
      [-66.845, 10.494],
      [-66.825, 10.496],
      [-66.805, 10.498], // Hacia Petare
    ],
  },
  {
    id: 'road-ccs-av-libertador',
    name: 'Avenida Libertador (Trinchera)',
    city: 'Caracas',
    highway: 'primary',
    lanes: 6,
    speedLimit: 60,
    coordinates: [
      [-66.900, 10.500],
      [-66.885, 10.497],
      [-66.870, 10.495],
      [-66.855, 10.493],
    ],
  },
  {
    id: 'road-ccs-av-baralt',
    name: 'Avenida Baralt (Centro)',
    city: 'Caracas',
    highway: 'secondary',
    lanes: 4,
    speedLimit: 40,
    coordinates: [
      [-66.918, 10.515],
      [-66.917, 10.505],
      [-66.916, 10.495],
    ],
  },
  {
    id: 'road-ccs-av-urdaneta',
    name: 'Avenida Urdaneta',
    city: 'Caracas',
    highway: 'secondary',
    lanes: 4,
    speedLimit: 40,
    coordinates: [
      [-66.920, 10.508],
      [-66.910, 10.508],
      [-66.900, 10.508],
      [-66.890, 10.508],
    ],
  },
  {
    id: 'road-ccs-av-bolivar',
    name: 'Avenida Bolívar Caracas',
    city: 'Caracas',
    highway: 'primary',
    lanes: 6,
    speedLimit: 50,
    coordinates: [
      [-66.918, 10.500],
      [-66.908, 10.499],
      [-66.898, 10.498],
    ],
  },
  {
    id: 'road-ccs-cota-mil',
    name: 'Avenida Boyacá (Cota Mil)',
    city: 'Caracas',
    highway: 'primary',
    lanes: 4,
    speedLimit: 70,
    coordinates: [
      [-66.920, 10.520],
      [-66.895, 10.518],
      [-66.870, 10.515],
      [-66.845, 10.513],
      [-66.820, 10.510],
    ],
  },

  // ==========================================================================
  // VALENCIA (Carabobo)
  // ==========================================================================
  {
    id: 'road-val-av-bolivar-norte',
    name: 'Avenida Bolívar Norte Valencia',
    city: 'Valencia',
    highway: 'primary',
    lanes: 4,
    speedLimit: 50,
    coordinates: [
      [-68.005, 10.180],
      [-68.006, 10.200],
      [-68.008, 10.220],
      [-68.010, 10.240],
    ],
  },
  {
    id: 'road-val-av-cedeno',
    name: 'Avenida Cedeño',
    city: 'Valencia',
    highway: 'secondary',
    lanes: 4,
    speedLimit: 45,
    coordinates: [
      [-68.020, 10.190],
      [-68.006, 10.190],
      [-67.995, 10.190],
    ],
  },
  {
    id: 'road-val-av-lara',
    name: 'Avenida Lara Valencia',
    city: 'Valencia',
    highway: 'primary',
    lanes: 4,
    speedLimit: 45,
    coordinates: [
      [-68.015, 10.175],
      [-68.000, 10.175],
      [-67.985, 10.175],
    ],
  },

  // ==========================================================================
  // BARQUISIMETO (Lara)
  // ==========================================================================
  {
    id: 'road-barq-av-venezuela',
    name: 'Avenida Venezuela Barquisimeto',
    city: 'Barquisimeto',
    highway: 'primary',
    lanes: 6,
    speedLimit: 55,
    coordinates: [
      [-69.345, 10.070],
      [-69.325, 10.070],
      [-69.305, 10.070],
      [-69.285, 10.070],
    ],
  },
  {
    id: 'road-barq-av-libertador',
    name: 'Avenida Libertador Barquisimeto',
    city: 'Barquisimeto',
    highway: 'primary',
    lanes: 4,
    speedLimit: 50,
    coordinates: [
      [-69.350, 10.080],
      [-69.330, 10.080],
      [-69.310, 10.080],
    ],
  },
  {
    id: 'road-barq-av-vargas',
    name: 'Avenida Vargas',
    city: 'Barquisimeto',
    highway: 'secondary',
    lanes: 4,
    speedLimit: 40,
    coordinates: [
      [-69.318, 10.060],
      [-69.318, 10.075],
      [-69.318, 10.090],
    ],
  },
];

const urbanRoadsGeoJson = {
  type: 'FeatureCollection',
  features: URBAN_ROADS_FEATURES.map((r) => ({
    type: 'Feature',
    id: r.id,
    properties: {
      id: r.id,
      name: r.name,
      city: r.city,
      highway: r.highway,
      lanes: r.lanes,
      speedLimit: r.speedLimit,
    },
    geometry: {
      type: 'LineString',
      coordinates: r.coordinates,
    },
  })),
};

const urbanRoadsPath = path.join(PUBLIC_MAP_DIR, 'theatre_urban_roads.json');
fs.writeFileSync(urbanRoadsPath, JSON.stringify(urbanRoadsGeoJson, null, 2), 'utf8');
console.log(`✓ theatre_urban_roads.json generado: ${URBAN_ROADS_FEATURES.length} avenidas y calles principales registradas.`);

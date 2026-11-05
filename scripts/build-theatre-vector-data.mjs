import fs from 'fs';
import path from 'path';

const PUBLIC_MAP_DIR = path.resolve('public/map');
if (!fs.existsSync(PUBLIC_MAP_DIR)) {
  fs.mkdirSync(PUBLIC_MAP_DIR, { recursive: true });
}

// Mapeo canónico exacto a politicalAliceEngine
const STATE_NAME_TO_REGION_ID = {
  'Distrito Capital': 'REG_VE_01',
  'Zulia': 'REG_VE_02',
  'Bolívar': 'REG_VE_03',
  'Anzoátegui': 'REG_VE_04',
  'Carabobo': 'REG_VE_05',
  'Miranda': 'REG_VE_06',
  'Lara': 'REG_VE_07',
  'Aragua': 'REG_VE_08',
  'Falcón': 'REG_VE_09',
  'Táchira': 'REG_VE_10',
  'Sucre': 'REG_VE_11',
  'Monagas': 'REG_VE_12',
  'Portuguesa': 'REG_VE_13',
  'Barinas': 'REG_VE_14',
  'Mérida': 'REG_VE_15',
  'Trujillo': 'REG_VE_16',
  'Guárico': 'REG_VE_17',
  'Yaracuy': 'REG_VE_18',
  'Apure': 'REG_VE_19',
  'Nueva Esparta': 'REG_VE_20',
  'Cojedes': 'REG_VE_21',
  'Delta Amacuro': 'REG_VE_22',
  'Amazonas': 'REG_VE_23',
  'La Guaira': 'REG_VE_24',
  'Vargas': 'REG_VE_24',
  'Dependencias Federales': 'BUF_MARITIME_CARIBE',
};

async function buildRegions() {
  console.log('1. Descargando fronteras oficiales simplificadas (geoBoundaries)...');
  const url = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/VEN/ADM1/geoBoundaries-VEN-ADM1_simplified.geojson';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al descargar geoBoundaries: ' + res.status);
  const data = await res.json();

  const features = data.features.map((feat, index) => {
    const rawName = feat.properties.shapeName?.trim();
    const regionId = STATE_NAME_TO_REGION_ID[rawName] || `REG_VE_EXTRA_${index}`;

    return {
      type: 'Feature',
      id: regionId,
      properties: {
        id: regionId,
        name: rawName,
        shapeISO: feat.properties.shapeISO || '',
        isCapital: regionId === 'REG_VE_01',
      },
      geometry: feat.geometry,
    };
  });

  const geoJson = {
    type: 'FeatureCollection',
    features,
  };

  const outputPath = path.join(PUBLIC_MAP_DIR, 'theatre_regions.json');
  fs.writeFileSync(outputPath, JSON.stringify(geoJson), 'utf-8');
  console.log(`✓ Regiones guardadas en ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
}

async function buildRoads() {
  console.log('2. Consultando red vial troncal de Venezuela (OpenStreetMap Overpass)...');
  const query = `[out:json][timeout:60];
(
  way["highway"="motorway"](0.5,-73.5,12.5,-59.5);
  way["highway"="trunk"](0.5,-73.5,12.5,-59.5);
);
out geom;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'GeotacticsTacticalCommand/1.0',
    },
    body: 'data=' + encodeURIComponent(query),
  });

  if (!res.ok) throw new Error('Error de Overpass: ' + res.status);
  const osmData = await res.json();
  console.log(`Elementos OSM recibidos: ${osmData.elements?.length || 0}`);

  const features = [];
  for (const el of osmData.elements || []) {
    if (el.type === 'way' && el.geometry && el.geometry.length >= 2) {
      const coords = el.geometry.map(pt => [
        Number(pt.lon.toFixed(5)),
        Number(pt.lat.toFixed(5)),
      ]);
      features.push({
        type: 'Feature',
        id: `road_${el.id}`,
        properties: {
          id: el.id,
          name: el.tags?.name || el.tags?.ref || 'Carretera Troncal',
          ref: el.tags?.ref || '',
          highway: el.tags?.highway || 'trunk',
          lanes: el.tags?.lanes ? Number(el.tags.lanes) : 2,
        },
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
      });
    }
  }

  const roadsGeoJson = {
    type: 'FeatureCollection',
    features,
  };

  const outputPath = path.join(PUBLIC_MAP_DIR, 'theatre_roads.json');
  fs.writeFileSync(outputPath, JSON.stringify(roadsGeoJson), 'utf-8');
  console.log(`✓ Carreteras guardadas en ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB, ${features.length} segmentos)`);
}

async function main() {
  await buildRegions();
  await buildRoads();
  console.log('¡Pipeline de cartografía vectorial completado con éxito!');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});

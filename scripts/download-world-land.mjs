import fs from 'fs';
import path from 'path';

async function main() {
  const url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';
  console.log('Downloading world land polygons...');
  const res = await fetch(url);
  const data = await res.json();
  const outPath = path.resolve('public/map/world_land.json');
  fs.writeFileSync(outPath, JSON.stringify(data));
  console.log(`Saved world land to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);

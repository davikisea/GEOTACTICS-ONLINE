const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const seedPath = path.join(__dirname, '..', 'supabase', 'seed.sql');
const outputPath = path.join(__dirname, '..', 'supabase', 'CONSOLIDATED_FULL_DATABASE_DEPLOY.sql');

const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`Consolidando ${files.length} migraciones en ${outputPath}...`);

let consolidated = `-- ==============================================================================
-- GEOTACTICS ONLINE - CONSOLIDATED DATABASE DEPLOYMENT SCRIPT
-- Combina las ${files.length} migraciones canónicas + seed inicial en un solo bloque ejecutable.
-- Generado automáticamente: ${new Date().toISOString()}
-- ==============================================================================

`;

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  consolidated += `\n-- >>> INICIO MIGRACIÓN: ${file} <<<\n`;
  consolidated += content;
  consolidated += `\n-- >>> FIN MIGRACIÓN: ${file} <<<\n\n`;
}

if (fs.existsSync(seedPath)) {
  const seedContent = fs.readFileSync(seedPath, 'utf8');
  consolidated += `\n-- >>> INICIO SEED DATA: seed.sql <<<\n`;
  consolidated += seedContent;
  consolidated += `\n-- >>> FIN SEED DATA: seed.sql <<<\n`;
}

fs.writeFileSync(outputPath, consolidated, 'utf8');
console.log(`Despliegue consolidado generado con éxito (${(consolidated.length / 1024).toFixed(1)} kB, ${files.length} migraciones + seed).`);

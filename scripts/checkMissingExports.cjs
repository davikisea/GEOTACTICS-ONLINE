const fs = require('fs');
const path = require('path');

const tacticsIndex = fs.readFileSync('src/domains/tactics/index.ts', 'utf8');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]@domains\/tactics['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const symbols = match[1].split(',').map(s => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim()).filter(Boolean);
    symbols.forEach(sym => {
      // Check if sym is in tacticsIndex
      const regex = new RegExp(`\\b${sym}\\b`);
      if (!regex.test(tacticsIndex)) {
        console.log(`MISSING IN TACTICS: ${sym} (imported in ${filePath})`);
      }
    });
  }
}

fs.readdirSync('src/domains/tactics/__tests__').forEach(f => {
  if (f.endsWith('.ts')) checkFile(path.join('src/domains/tactics/__tests__', f));
});
console.log('Tactics check finished');

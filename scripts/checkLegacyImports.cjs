const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = [
  ...walk('src/domains'),
  ...walk('src/shared'),
  path.join('src', 'App.tsx'),
  path.join('src', 'main.tsx')
];

// Check if import resolves to legacy root folders
const legacyRoots = ['src/engine', 'src/components', 'src/services', 'src/hooks', 'src/types', 'src/utils', 'src/lib', 'src/editor'];

let found = 0;
files.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const match = line.match(/from\s+['"]([^'"]+)['"]/);
    if (match) {
      const importPath = match[1];
      if (importPath.startsWith('@/src/')) {
        const root = importPath.replace('@/', '');
        if (legacyRoots.some(r => root.startsWith(r))) {
          console.log(`LEGACY: ${f}:${idx + 1}: ${line.trim()}`);
          found++;
        }
      } else if (importPath.startsWith('.')) {
        const abs = path.normalize(path.join(path.dirname(f), importPath)).replace(/\\/g, '/');
        if (legacyRoots.some(r => abs.startsWith(r))) {
          console.log(`LEGACY RELATIVE: ${f}:${idx + 1}: ${line.trim()}`);
          found++;
        }
      }
    }
  });
});

console.log(`Verified legacy imports remaining in modern codebase: ${found}`);

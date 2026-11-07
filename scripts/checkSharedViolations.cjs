const fs = require('fs');
const path = require('path');
function walk(dir) {
  let res = [];
  if (!fs.existsSync(dir)) return res;
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) res = res.concat(walk(p));
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) res.push(p);
  });
  return res;
}
walk('src/shared').forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let lines = c.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('@domains/')) {
      console.log(`DOMAIN IMPORT IN SHARED: ${f}:${idx + 1}: ${l.trim()}`);
    }
  });
});

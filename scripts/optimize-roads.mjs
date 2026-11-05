import fs from 'fs';
import path from 'path';

// Douglas-Peucker simplification in pure JS
function getSqDist(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return dx * dx + dy * dy;
}

function getSqSegDist(p, p1, p2) {
  let x = p1[0], y = p1[1];
  let dx = p2[0] - x, dy = p2[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2[0];
      y = p2[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

function simplifyRadialDist(points, sqTolerance) {
  let prevPoint = points[0];
  const newPoints = [prevPoint];
  let point;
  for (let i = 1, len = points.length; i < len; i++) {
    point = points[i];
    if (getSqDist(point, prevPoint) > sqTolerance) {
      newPoints.push(point);
      prevPoint = point;
    }
  }
  if (prevPoint !== point) newPoints.push(point);
  return newPoints;
}

function simplifyDPStep(points, first, last, sqTolerance, simplified) {
  let maxSqDist = sqTolerance;
  let index;
  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDist(points[i], points[first], points[last]);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }
  if (maxSqDist > sqTolerance) {
    if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
}

function simplify(points, tolerance = 0.001) {
  if (points.length <= 2) return points;
  const sqTolerance = tolerance * tolerance;
  const pts = simplifyRadialDist(points, sqTolerance);
  if (pts.length <= 2) return pts;
  const simplified = [pts[0]];
  simplifyDPStep(pts, 0, pts.length - 1, sqTolerance, simplified);
  simplified.push(pts[pts.length - 1]);
  return simplified;
}

const rawPath = path.resolve('public/map/theatre_roads.json');
const roadsData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

console.log('Original features:', roadsData.features.length);
let totalPtsBefore = 0;
let totalPtsAfter = 0;

const simplifiedFeatures = [];
for (const feat of roadsData.features) {
  if (!feat.geometry || !feat.geometry.coordinates) continue;
  totalPtsBefore += feat.geometry.coordinates.length;
  // Tolerance of ~0.0015 degrees (~150 meters, perfect for strategic zoom)
  const simplifiedCoords = simplify(feat.geometry.coordinates, 0.0015);
  totalPtsAfter += simplifiedCoords.length;

  if (simplifiedCoords.length >= 2) {
    feat.geometry.coordinates = simplifiedCoords.map(pt => [
      Number(pt[0].toFixed(4)),
      Number(pt[1].toFixed(4))
    ]);
    simplifiedFeatures.push(feat);
  }
}

console.log(`Puntos antes: ${totalPtsBefore} -> Puntos después: ${totalPtsAfter} (-${Math.round((1 - totalPtsAfter / totalPtsBefore) * 100)}%)`);

roadsData.features = simplifiedFeatures;
fs.writeFileSync(rawPath, JSON.stringify(roadsData));
console.log(`Nuevo tamaño de theatre_roads.json: ${(fs.statSync(rawPath).size / 1024).toFixed(1)} KB`);

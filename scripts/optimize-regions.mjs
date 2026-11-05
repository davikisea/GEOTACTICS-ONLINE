import fs from 'fs';
import path from 'path';

// Douglas-Peucker simplification for polygons
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

function simplify(points, tolerance = 0.005) {
  if (points.length <= 4) return points;
  const sqTolerance = tolerance * tolerance;
  const pts = simplifyRadialDist(points, sqTolerance);
  if (pts.length <= 4) return pts;
  const simplified = [pts[0]];
  simplifyDPStep(pts, 0, pts.length - 1, sqTolerance, simplified);
  simplified.push(pts[pts.length - 1]);
  return simplified;
}

function simplifyRing(ring, tolerance = 0.004) {
  const isClosed = ring.length > 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const simplified = simplify(ring, tolerance);
  if (isClosed && simplified.length >= 3) {
    simplified[simplified.length - 1] = [simplified[0][0], simplified[0][1]];
  }
  return simplified.map(pt => [Number(pt[0].toFixed(4)), Number(pt[1].toFixed(4))]);
}

const regPath = path.resolve('public/map/theatre_regions.json');
const regData = JSON.parse(fs.readFileSync(regPath, 'utf8'));

for (const feat of regData.features) {
  if (!feat.geometry) continue;
  if (feat.geometry.type === 'Polygon') {
    feat.geometry.coordinates = feat.geometry.coordinates.map(ring => simplifyRing(ring));
  } else if (feat.geometry.type === 'MultiPolygon') {
    feat.geometry.coordinates = feat.geometry.coordinates.map(poly => poly.map(ring => simplifyRing(ring)));
  }
}

fs.writeFileSync(regPath, JSON.stringify(regData));
console.log(`theatre_regions.json optimizado: ${(fs.statSync(regPath).size / 1024).toFixed(1)} KB`);

import {
  intersection,
  union,
  type MultiPolygon,
  type Pair,
  type Polygon,
} from 'polygon-clipping';
import type {
  DungeonLayerStyle,
  HatchVariant,
  Point,
} from '@/map-studio/domain/document/types';
import { boundsOfGeometry, pointInPolygon, type WallSegment } from './compile';

export interface HatchPattern {
  segments: Array<{ a: Point; b: Point }>;
  dots: Point[];
}

interface BoundaryEdge {
  a: Point;
  b: Point;
  index: number;
}

const EMPTY_PATTERN: HatchPattern = { segments: [], dots: [] };

function pointInMultiPolygon(point: Point, polygons: MultiPolygon): boolean {
  for (const polygon of polygons) {
    const [outer, ...holes] = polygon;
    if (!outer || !pointInPolygon(point, outer)) continue;
    if (holes.some((hole) => pointInPolygon(point, hole))) continue;
    return true;
  }
  return false;
}

function segmentIntersectionT(
  a: Point,
  b: Point,
  c: Pair,
  d: Pair,
): number | null {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const ex = d[0] - c[0];
  const ey = d[1] - c[1];
  const denominator = dx * ey - dy * ex;
  if (Math.abs(denominator) < 1e-9) return null;
  const t = ((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / denominator;
  const u = ((c[0] - a[0]) * dy - (c[1] - a[1]) * dx) / denominator;
  if (t < -1e-7 || t > 1 + 1e-7 || u < -1e-7 || u > 1 + 1e-7) return null;
  return Math.max(0, Math.min(1, t));
}

function clipSegment(
  a: Point,
  b: Point,
  polygons: MultiPolygon,
): Array<{ a: Point; b: Point }> {
  const result: Array<{ a: Point; b: Point }> = [];
  for (const polygon of polygons) {
    const cuts = [0, 1];
    for (const ring of polygon) {
      for (let index = 0; index + 1 < ring.length; index += 1) {
        const t = segmentIntersectionT(a, b, ring[index], ring[index + 1]);
        if (t !== null) cuts.push(t);
      }
    }
    cuts.sort((left, right) => left - right);
    for (let index = 0; index + 1 < cuts.length; index += 1) {
      const start = cuts[index];
      const end = cuts[index + 1];
      if (end - start < 1e-7) continue;
      const middle = (start + end) / 2;
      const point: Point = [
        a[0] + (b[0] - a[0]) * middle,
        a[1] + (b[1] - a[1]) * middle,
      ];
      if (!pointInMultiPolygon(point, [polygon])) continue;
      result.push({
        a: [a[0] + (b[0] - a[0]) * start, a[1] + (b[1] - a[1]) * start],
        b: [a[0] + (b[0] - a[0]) * end, a[1] + (b[1] - a[1]) * end],
      });
    }
  }
  return result;
}

function segmentTouchesPolygon(
  a: Point,
  b: Point,
  polygons: MultiPolygon,
): boolean {
  if (pointInMultiPolygon(a, polygons) || pointInMultiPolygon(b, polygons)) {
    return true;
  }
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (let index = 0; index + 1 < ring.length; index += 1) {
        if (segmentIntersectionT(a, b, ring[index], ring[index + 1]) !== null) {
          return true;
        }
      }
    }
  }
  return false;
}

function pointBoundaryDistance(point: Point, polygons: MultiPolygon): number {
  let closest = Infinity;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (let index = 0; index + 1 < ring.length; index += 1) {
        const [ax, ay] = ring[index];
        const [bx, by] = ring[index + 1];
        const dx = bx - ax;
        const dy = by - ay;
        const lengthSquared = dx * dx + dy * dy;
        const t =
          lengthSquared === 0
            ? 0
            : Math.max(
                0,
                Math.min(
                  1,
                  ((point[0] - ax) * dx + (point[1] - ay) * dy) / lengthSquared,
                ),
              );
        closest = Math.min(
          closest,
          Math.hypot(point[0] - (ax + dx * t), point[1] - (ay + dy * t)),
        );
      }
    }
  }
  return closest;
}

function random(seed: number, index: number): number {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function noise(seed: number, index: number): number {
  return random(seed, index) - 0.5;
}

function boundaryEdges(polygons: MultiPolygon): BoundaryEdge[] {
  const edges: BoundaryEdge[] = [];
  let index = 0;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (let point = 0; point + 1 < ring.length; point += 1) {
        const a = ring[point];
        const b = ring[point + 1];
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-6) continue;
        edges.push({ a: [a[0], a[1]], b: [b[0], b[1]], index });
        index += 1;
      }
    }
  }
  return edges;
}

function outwardNormal(
  edge: BoundaryEdge,
  polygons: MultiPolygon,
  probe: number,
): Point | null {
  const dx = edge.b[0] - edge.a[0];
  const dy = edge.b[1] - edge.a[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const middle: Point = [
    (edge.a[0] + edge.b[0]) / 2,
    (edge.a[1] + edge.b[1]) / 2,
  ];
  const plusInside = pointInMultiPolygon(
    [middle[0] + nx * probe, middle[1] + ny * probe],
    polygons,
  );
  const minusInside = pointInMultiPolygon(
    [middle[0] - nx * probe, middle[1] - ny * probe],
    polygons,
  );
  if (plusInside === minusInside) return null;
  return plusInside ? [-nx, -ny] : [nx, ny];
}

function strokeAngle(
  variant: HatchVariant,
  tangentAngle: number,
  seed: number,
): number {
  const jitter = noise(seed, 3) * 0.8;
  if (variant === 'cross') {
    return (
      tangentAngle + (seed % 2 === 0 ? Math.PI / 4 : -Math.PI / 4) + jitter
    );
  }
  if (variant === 'horizontal') return jitter;
  if (variant === 'vertical') return Math.PI / 2 + jitter;
  if (variant === 'brick') return tangentAngle + jitter;
  return tangentAngle + (seed % 3 === 0 ? Math.PI / 2 : 0) + jitter;
}

function sampleOuterBand(
  hatching: DungeonLayerStyle['hatching'],
  polygons: MultiPolygon,
  visit: (center: Point, angle: number, seed: number) => void,
): void {
  const size = Math.max(0.05, hatching.size);
  const band = Math.max(0.05, size * 1.55);
  const edges = boundaryEdges(polygons);
  for (const edge of edges) {
    const dx = edge.b[0] - edge.a[0];
    const dy = edge.b[1] - edge.a[1];
    const length = Math.hypot(dx, dy) || 1;
    const tangent: Point = [dx / length, dy / length];
    const tangentAngle = Math.atan2(dy, dx);
    const normal = outwardNormal(edge, polygons, Math.max(0.005, size * 0.2));
    if (!normal) continue;
    const alongCount = Math.max(1, Math.ceil(length / (size * 0.55)));
    const depthCount = 2;
    for (let along = 0; along < alongCount; along += 1) {
      for (let depth = 0; depth < depthCount; depth += 1) {
        const seed = edge.index * 97 + along * 13 + depth * 7 + 1;
        const t = (along + random(seed, 0) * 0.85) / Math.max(1, alongCount);
        const offset = Math.max(
          size * 0.18,
          ((depth + random(seed, 1) * 0.9) / depthCount) * band,
        );
        const center: Point = [
          edge.a[0] +
            dx * t +
            normal[0] * offset +
            tangent[0] * noise(seed, 2) * size * 0.35,
          edge.a[1] +
            dy * t +
            normal[1] * offset +
            tangent[1] * noise(seed, 2) * size * 0.35,
        ];
        if (pointInMultiPolygon(center, polygons)) continue;
        visit(center, strokeAngle(hatching.variant, tangentAngle, seed), seed);
      }
    }
  }
}

export function createHatchPattern(
  hatching: DungeonLayerStyle['hatching'],
  polygons: MultiPolygon,
): HatchPattern {
  if (!hatching.visible || polygons.length === 0) return EMPTY_PATTERN;
  const size = Math.max(0.05, hatching.size);
  if (hatching.variant === 'dots') {
    const dots: Point[] = [];
    const clearance = Math.max(0.015, hatching.width * 1.8);
    sampleOuterBand(hatching, polygons, (center) => {
      if (pointBoundaryDistance(center, polygons) > clearance) {
        dots.push(center);
      }
    });
    return { segments: [], dots };
  }
  const segments: Array<{ a: Point; b: Point }> = [];
  sampleOuterBand(hatching, polygons, (center, angle, seed) => {
    const length = size * (0.45 + random(seed, 4) * 0.55);
    const half = length / 2;
    const a: Point = [
      center[0] - Math.cos(angle) * half,
      center[1] - Math.sin(angle) * half,
    ];
    const b: Point = [
      center[0] + Math.cos(angle) * half,
      center[1] + Math.sin(angle) * half,
    ];
    if (segmentTouchesPolygon(a, b, polygons)) return;
    segments.push({ a, b });
  });
  return { segments, dots: [] };
}

export function createFloorGrid(
  polygons: MultiPolygon,
  spacing = 1,
): Array<{ a: Point; b: Point }> {
  const bounds = boundsOfGeometry(polygons);
  if (!bounds) return [];
  const step = Math.max(0.05, spacing);
  const segments: Array<{ a: Point; b: Point }> = [];
  const minX = Math.ceil(bounds.minX / step) * step;
  const minY = Math.ceil(bounds.minY / step) * step;
  for (let x = minX; x <= bounds.maxX + step * 0.5; x += step) {
    segments.push(
      ...clipSegment(
        [x, bounds.minY - step],
        [x, bounds.maxY + step],
        polygons,
      ),
    );
  }
  for (let y = minY; y <= bounds.maxY + step * 0.5; y += step) {
    segments.push(
      ...clipSegment(
        [bounds.minX - step, y],
        [bounds.maxX + step, y],
        polygons,
      ),
    );
  }
  return segments;
}

export function createShadingGeometry(
  shading: DungeonLayerStyle['shading'],
  polygons: MultiPolygon,
  wallSegments: WallSegment[],
): MultiPolygon {
  if (!shading.visible || shading.size <= 0 || polygons.length === 0) return [];
  const size = Math.max(0.001, shading.size);
  const amplitude = [0, 0.08, 0.18, 0.32][shading.roughness] * size;
  const bands: Polygon[] = [];
  wallSegments.forEach((segment, index) => {
    const [ax, ay] = segment.a;
    const [bx, by] = segment.b;
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);
    if (length < 1e-6) return;
    const nx = -dy / length;
    const ny = dx / length;
    const middle: Point = [(ax + bx) / 2, (ay + by) / 2];
    const probe = Math.max(0.005, size * 0.5);
    let sign = 0;
    if (
      pointInMultiPolygon(
        [middle[0] + nx * probe, middle[1] + ny * probe],
        polygons,
      )
    ) {
      sign = 1;
    } else if (
      pointInMultiPolygon(
        [middle[0] - nx * probe, middle[1] - ny * probe],
        polygons,
      )
    ) {
      sign = -1;
    }
    if (sign === 0) return;
    const seed = index + 1;
    const offsetA = size + noise(seed, 0) * amplitude * 2;
    const offsetB = size + noise(seed, 1) * amplitude * 2;
    const insetA: Point = [ax + nx * sign * offsetA, ay + ny * sign * offsetA];
    const insetB: Point = [bx + nx * sign * offsetB, by + ny * sign * offsetB];
    bands.push([[[ax, ay], [bx, by], insetB, insetA, [ax, ay]]]);
  });
  if (bands.length === 0) return [];
  let merged: MultiPolygon;
  try {
    merged = bands.length === 1 ? bands : union(bands[0], ...bands.slice(1));
  } catch {
    merged = bands;
  }
  try {
    return intersection(polygons, merged);
  } catch {
    return [];
  }
}

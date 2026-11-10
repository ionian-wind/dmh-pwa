import {
  intersection,
  union,
  type MultiPolygon,
  type Pair,
  type Polygon,
} from 'polygon-clipping';
import type {
  DungeonLayerStyle,
  Point,
} from '@/map-studio/domain/document/types';
import { boundsOfGeometry, pointInPolygon, type WallSegment } from './compile';

export interface HatchPattern {
  segments: Array<{ a: Point; b: Point }>;
  dots: Point[];
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

function hatchLines(
  angle: number,
  spacing: number,
  polygons: MultiPolygon,
): Array<{ a: Point; b: Point }> {
  const bounds = boundsOfGeometry(polygons);
  if (!bounds) return [];
  const { minX, minY, maxX, maxY } = bounds;
  const center: Point = [(minX + maxX) / 2, (minY + maxY) / 2];
  const direction: Point = [Math.cos(angle), Math.sin(angle)];
  const normal: Point = [-direction[1], direction[0]];
  const corners: Point[] = [
    [minX, minY],
    [maxX, minY],
    [minX, maxY],
    [maxX, maxY],
  ];
  const projections = corners.map(
    ([x, y]) => (x - center[0]) * normal[0] + (y - center[1]) * normal[1],
  );
  const minProjection = Math.min(...projections);
  const maxProjection = Math.max(...projections);
  const reach = Math.hypot(maxX - minX, maxY - minY) + spacing * 2;
  const result: Array<{ a: Point; b: Point }> = [];
  for (
    let offset = minProjection;
    offset <= maxProjection + spacing * 0.5;
    offset += spacing
  ) {
    const origin: Point = [
      center[0] + normal[0] * offset,
      center[1] + normal[1] * offset,
    ];
    const a: Point = [
      origin[0] - direction[0] * reach,
      origin[1] - direction[1] * reach,
    ];
    const b: Point = [
      origin[0] + direction[0] * reach,
      origin[1] + direction[1] * reach,
    ];
    result.push(...clipSegment(a, b, polygons));
  }
  return result;
}

function hatchDots(spacing: number, polygons: MultiPolygon): Point[] {
  const bounds = boundsOfGeometry(polygons);
  if (!bounds) return [];
  const dots: Point[] = [];
  let row = 0;
  for (let y = bounds.minY; y <= bounds.maxY; y += spacing) {
    const offset = row % 2 === 0 ? 0 : spacing / 2;
    for (let x = bounds.minX + offset; x <= bounds.maxX; x += spacing) {
      const point: Point = [x, y];
      if (pointInMultiPolygon(point, polygons)) dots.push(point);
    }
    row += 1;
  }
  return dots;
}

function brickLines(
  spacing: number,
  polygons: MultiPolygon,
): Array<{ a: Point; b: Point }> {
  const bounds = boundsOfGeometry(polygons);
  if (!bounds) return [];
  const result = hatchLines(0, spacing, polygons);
  let row = 0;
  for (let y = bounds.minY; y <= bounds.maxY; y += spacing) {
    const offset = row % 2 === 0 ? 0 : spacing;
    for (
      let x = bounds.minX + offset;
      x <= bounds.maxX + spacing * 0.5;
      x += spacing * 2
    ) {
      result.push(...clipSegment([x, y], [x, y + spacing], polygons));
    }
    row += 1;
  }
  return result;
}

export function createHatchPattern(
  hatching: DungeonLayerStyle['hatching'],
  polygons: MultiPolygon,
): HatchPattern {
  if (!hatching.visible || polygons.length === 0) return EMPTY_PATTERN;
  const spacing = Math.max(0.02, hatching.size);
  if (hatching.variant === 'dots') {
    return { segments: [], dots: hatchDots(spacing, polygons) };
  }
  if (hatching.variant === 'cross') {
    return {
      segments: [
        ...hatchLines(Math.PI / 4, spacing, polygons),
        ...hatchLines(-Math.PI / 4, spacing, polygons),
      ],
      dots: [],
    };
  }
  if (hatching.variant === 'horizontal') {
    return { segments: hatchLines(0, spacing, polygons), dots: [] };
  }
  if (hatching.variant === 'vertical') {
    return { segments: hatchLines(Math.PI / 2, spacing, polygons), dots: [] };
  }
  if (hatching.variant === 'brick') {
    return { segments: brickLines(spacing, polygons), dots: [] };
  }
  return { segments: hatchLines(Math.PI / 4, spacing, polygons), dots: [] };
}

function noise(seed: number, index: number): number {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value) - 0.5;
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

import {
  difference,
  union,
  type MultiPolygon,
  type Pair,
  type Polygon,
} from 'polygon-clipping';
import type {
  DungeonLayer,
  DungeonShape,
  Point,
} from '@/map-studio/domain/document/types';

export interface WallSegment {
  a: Point;
  b: Point;
}

export interface DungeonLayerGeometry {
  polygons: MultiPolygon;
  wallSegments: WallSegment[];
}

function roundedRectangleRing(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): Pair[] {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  if (r === 0) {
    return [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
      [x, y],
    ];
  }
  const segments = 6;
  const points: Pair[] = [];
  const corners: Array<[number, number, number]> = [
    [x + width - r, y + r, -Math.PI / 2],
    [x + width - r, y + height - r, 0],
    [x + r, y + height - r, Math.PI / 2],
    [x + r, y + r, Math.PI],
  ];
  for (const [cx, cy, start] of corners) {
    for (let index = 0; index <= segments; index += 1) {
      const angle = start + (index / segments) * (Math.PI / 2);
      points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }
  }
  points.push(points[0]);
  return points;
}

export function shapeToPolygon(shape: DungeonShape): Polygon | null {
  const data = shape.shape;
  if (data.kind === 'rectangle') {
    if (data.width <= 0 || data.height <= 0) return null;
    return [
      roundedRectangleRing(
        data.x,
        data.y,
        data.width,
        data.height,
        data.cornerRadius,
      ),
    ];
  }
  if (data.kind === 'circle') {
    if (data.radius <= 0) return null;
    const segments = 64;
    const ring: Pair[] = [];
    for (let index = 0; index < segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      ring.push([
        data.cx + Math.cos(angle) * data.radius,
        data.cy + Math.sin(angle) * data.radius,
      ]);
    }
    ring.push(ring[0]);
    return [ring];
  }
  if (data.kind === 'polygon') {
    if (data.points.length < 3) return null;
    const ring = data.points.map(([x, y]) => [x, y] as Pair);
    ring.push([...ring[0]] as Pair);
    return [ring];
  }
  return null;
}

function ringSegments(ring: Pair[]): WallSegment[] {
  const segments: WallSegment[] = [];
  for (let index = 0; index + 1 < ring.length; index += 1) {
    const a = ring[index];
    const b = ring[index + 1];
    if (a[0] === b[0] && a[1] === b[1]) continue;
    segments.push({ a: [a[0], a[1]], b: [b[0], b[1]] });
  }
  return segments;
}

export function compileDungeonLayer(layer: DungeonLayer): DungeonLayerGeometry {
  let polygons: MultiPolygon = [];
  for (const shape of layer.shapes) {
    const polygon = shapeToPolygon(shape);
    if (!polygon) continue;
    if (shape.operation === 'subtract' && polygons.length === 0) continue;
    try {
      polygons =
        shape.operation === 'subtract'
          ? difference(polygons, polygon)
          : union(polygons.length > 0 ? polygons : [], polygon);
    } catch {
      // Keep the previous geometry if a boolean operation fails.
    }
  }
  const wallSegments = polygons.flatMap((polygon) =>
    polygon.flatMap((ring) => ringSegments(ring)),
  );
  return { polygons, wallSegments };
}

export function boundsOfGeometry(geometry: MultiPolygon): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polygon of geometry) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

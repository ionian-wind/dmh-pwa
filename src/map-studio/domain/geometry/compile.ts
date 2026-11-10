import {
  difference,
  union,
  type MultiPolygon,
  type Pair,
  type Polygon,
} from 'polygon-clipping';
import { circleShapeRing } from '@/map-studio/domain/geometry/circle';
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

function hashValue(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100000;
}

function hashNoise(seed: number, index: number): number {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function densifyRing(ring: Pair[], maxStep = 0.5): Pair[] {
  if (ring.length < 2) return ring;
  const result: Pair[] = [ring[0]];
  for (let index = 0; index + 1 < ring.length; index += 1) {
    const a = ring[index];
    const b = ring[index + 1];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(length / maxStep));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return result;
}

function roughRing(ring: Pair[], level: number, seed: number): Pair[] {
  if (level <= 0 || ring.length < 4) return ring;
  ring = densifyRing(ring);
  const amplitude = [0, 0.035, 0.075, 0.14][level] ?? 0;
  const closed =
    ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1];
  const points = closed ? ring.slice(0, -1) : ring;
  const result: Pair[] = points.map(([x, y], index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const dx = next[0] - previous[0];
    const dy = next[1] - previous[1];
    const length = Math.hypot(dx, dy) || 1;
    const offset = (hashNoise(seed, index) - 0.5) * 2 * amplitude;
    return [x - (dy / length) * offset, y + (dx / length) * offset];
  });
  if (closed) result.push([...result[0]] as Pair);
  return result;
}

function expandPath(points: Point[], radius: number, closed: boolean): Polygon {
  const left: Pair[] = [];
  const right: Pair[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next[0] - previous[0];
    const dy = next[1] - previous[1];
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    left.push([points[index][0] + nx * radius, points[index][1] + ny * radius]);
    right.push([
      points[index][0] - nx * radius,
      points[index][1] - ny * radius,
    ]);
  }
  if (closed) {
    left.push([...left[0]] as Pair);
    return [left];
  }
  const ring: Pair[] = [...left, ...[...right].reverse(), [...left[0]] as Pair];
  return [ring];
}

export function shapeToPolygon(shape: DungeonShape): Polygon | null {
  const data = shape.shape;
  const seed = shape.seed ?? hashValue(shape.id);
  const finish = (polygon: Polygon, level: number): Polygon =>
    polygon.map((ring) => roughRing(ring, level, seed));
  if (data.kind === 'rectangle') {
    if (data.width <= 0 || data.height <= 0) return null;
    return finish(
      [
        roundedRectangleRing(
          data.x,
          data.y,
          data.width,
          data.height,
          data.cornerRadius,
        ),
      ],
      data.rough,
    );
  }
  if (data.kind === 'circle') {
    if (data.radius <= 0) return null;
    return finish(
      [
        circleShapeRing(
          data.cx,
          data.cy,
          data.radius,
          data.sides ?? 1,
          data.drawTo ?? 'point',
        ),
      ],
      data.rough,
    );
  }
  if (data.kind === 'path') {
    if (data.points.length < 2 || data.radius <= 0) return null;
    return finish(
      expandPath(data.points, data.radius, data.closed),
      data.rough,
    );
  }
  if (data.kind === 'wall') {
    return null;
  }
  if (data.kind === 'polygon') {
    if (data.points.length < 3) return null;
    const ring = data.points.map(([x, y]) => [x, y] as Pair);
    ring.push([...ring[0]] as Pair);
    return finish([ring], data.rough);
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
  const extraWalls: WallSegment[] = [];
  for (const shape of layer.shapes) {
    if (shape.shape.kind === 'wall') {
      for (let index = 0; index + 1 < shape.shape.points.length; index += 1) {
        extraWalls.push({
          a: shape.shape.points[index],
          b: shape.shape.points[index + 1],
        });
      }
      continue;
    }
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
  const wallSegments = [
    ...polygons.flatMap((polygon) =>
      polygon.flatMap((ring) => ringSegments(ring)),
    ),
    ...extraWalls,
  ];
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

export function pointInPolygon(point: Point, polygon: Pair[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi || 1e-9) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

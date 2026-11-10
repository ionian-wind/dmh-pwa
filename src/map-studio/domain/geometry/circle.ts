import type { Pair } from 'polygon-clipping';

export type CircleDrawTo = 'point' | 'edge';

export function circleRing(
  cx: number,
  cy: number,
  radius: number,
  segments = 64,
): Pair[] {
  const ring: Pair[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    ring.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  ring.push(ring[0]);
  return ring;
}

export function regularPolygonRing(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  drawTo: CircleDrawTo = 'point',
): Pair[] {
  const count = Math.max(3, Math.round(sides));
  const step = (Math.PI * 2) / count;
  const start = -Math.PI / 2 + (drawTo === 'edge' ? step / 2 : 0);
  const ring: Pair[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = start + index * step;
    ring.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  ring.push(ring[0]);
  return ring;
}

export function circleShapeRing(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  drawTo: CircleDrawTo = 'point',
): Pair[] {
  return sides >= 3
    ? regularPolygonRing(cx, cy, radius, sides, drawTo)
    : circleRing(cx, cy, radius);
}

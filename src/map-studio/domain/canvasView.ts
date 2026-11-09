import type { StudioMap } from '@/map-studio/domain/document/types';
import { shapeToPolygon } from '@/map-studio/domain/geometry/compile';
import { objectBounds, type Bounds } from '@/map-studio/domain/objects';

export interface WorldRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export function visibleWorldRect(
  viewport: Viewport,
  width: number,
  height: number,
): WorldRect {
  const zoom = viewport.zoom || 1;
  return {
    left: (0 - viewport.x) / zoom,
    top: (0 - viewport.y) / zoom,
    right: (width - viewport.x) / zoom,
    bottom: (height - viewport.y) / zoom,
  };
}

export function shapeBounds(
  shape: Parameters<typeof shapeToPolygon>[0],
): Bounds | null {
  const polygon = shapeToPolygon(shape);
  if (!polygon?.[0]) return null;
  const xs = polygon[0].map(([x]) => x);
  const ys = polygon[0].map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}

export function contentBounds(map: StudioMap | null): Bounds {
  const empty = { x: 0, y: 0, width: 1, height: 1 };
  if (!map) return empty;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const include = (bounds: Bounds) => {
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  };
  for (const layer of map.layers) {
    if (!layer.visible) continue;
    if (layer.type === 'dungeon') {
      for (const shape of layer.shapes) {
        const bounds = shapeBounds(shape);
        if (bounds) include(bounds);
      }
    } else if (layer.type === 'images') {
      for (const object of layer.objects) {
        if (!object.visible) continue;
        include(objectBounds(object));
      }
    }
  }
  if (!Number.isFinite(minX)) return empty;
  return {
    x: minX - 0.5,
    y: minY - 0.5,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
  };
}

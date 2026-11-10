import { compileDungeonLayer } from '@/map-studio/domain/geometry/compile';
import type { StudioMap } from '@/map-studio/domain/document/types';

export interface UvttPortal {
  position: { x: number; y: number };
  bounds: Array<{ x: number; y: number }>;
  rotation: number;
  closed: boolean;
  freestanding: boolean;
}

export interface UvttDocument {
  format: number;
  resolution: {
    map_origin: { x: number; y: number };
    map_size: { x: number; y: number };
    pixels_per_grid: number;
  };
  line_of_sight: Array<Array<{ x: number; y: number }>>;
  objects_line_of_sight: Array<Array<{ x: number; y: number }>>;
  portals: UvttPortal[];
  environment: {
    baked_lighting: boolean;
    ambient_light: { r: number; g: number; b: number; a: number };
  };
  image: string;
  lights: unknown[];
}

export function buildUvtt(map: StudioMap, imageBase64: string): UvttDocument {
  const lineOfSight: Array<Array<{ x: number; y: number }>> = [];
  for (const layer of map.layers) {
    if (layer.type !== 'dungeon' || !layer.visible) continue;
    const compiled = compileDungeonLayer(layer);
    for (const segment of compiled.wallSegments) {
      lineOfSight.push([
        { x: segment.a[0], y: segment.a[1] },
        { x: segment.b[0], y: segment.b[1] },
      ]);
    }
  }
  const portals: UvttPortal[] = [];
  for (const layer of map.layers) {
    if (layer.type !== 'images' || !layer.visible) continue;
    for (const object of layer.objects) {
      if (object.type !== 'door' || !object.visible) continue;
      portals.push({
        position: {
          x: (object.a[0] + object.b[0]) / 2,
          y: (object.a[1] + object.b[1]) / 2,
        },
        bounds: [
          { x: object.a[0], y: object.a[1] },
          { x: object.b[0], y: object.b[1] },
        ],
        rotation: Math.atan2(
          object.b[1] - object.a[1],
          object.b[0] - object.a[0],
        ),
        closed: true,
        freestanding: false,
      });
    }
  }
  return {
    format: 0.3,
    resolution: {
      map_origin: { x: 0, y: 0 },
      map_size: { x: map.width, y: map.height },
      pixels_per_grid: 70,
    },
    line_of_sight: lineOfSight,
    objects_line_of_sight: [],
    portals,
    environment: {
      baked_lighting: true,
      ambient_light: { r: 0, g: 0, b: 0, a: 1 },
    },
    image: imageBase64,
    lights: [],
  };
}

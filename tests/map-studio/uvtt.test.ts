import { describe, expect, it } from 'vitest';
import { buildUvtt } from '@/map-studio/domain/export/uvtt';
import {
  createMap,
  createProject,
} from '@/map-studio/domain/document/factories';
import { createDoorObject } from '@/map-studio/domain/objects';

describe('map studio UVTT export', () => {
  it('exports visibility walls, door portals and the baked image', () => {
    const map = createMap(createProject().id);
    const dungeon = map.layers.find((layer) => layer.type === 'dungeon')!;
    if (dungeon.type !== 'dungeon') throw new Error('missing dungeon');
    dungeon.shapes.push({
      id: 'room',
      operation: 'add',
      shape: {
        kind: 'rectangle',
        x: 0,
        y: 0,
        width: 4,
        height: 4,
        cornerRadius: 0,
        rough: 0,
        smooth: false,
      },
    });
    const images = map.layers.find((layer) => layer.type === 'images')!;
    if (images.type !== 'images') throw new Error('missing images');
    images.objects.push(createDoorObject([1, 0], [2, 0], 0));
    const uvtt = buildUvtt(map, 'BASE64');
    expect(uvtt.format).toBe(0.3);
    expect(uvtt.image).toBe('BASE64');
    expect(uvtt.resolution.pixels_per_grid).toBe(70);
    expect(uvtt.line_of_sight.length).toBeGreaterThanOrEqual(4);
    expect(uvtt.portals).toHaveLength(1);
    expect(uvtt.portals[0]).toMatchObject({
      position: { x: 1.5, y: 0 },
      bounds: [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
      closed: true,
      freestanding: false,
    });
  });

  it('ignores hidden layers and hidden doors', () => {
    const map = createMap(createProject().id);
    for (const layer of map.layers) layer.visible = false;
    const uvtt = buildUvtt(map, '');
    expect(uvtt.line_of_sight).toEqual([]);
    expect(uvtt.portals).toEqual([]);

    const visibleMap = createMap(createProject().id);
    const images = visibleMap.layers.find((layer) => layer.type === 'images')!;
    if (images.type !== 'images') throw new Error('missing images');
    const door = createDoorObject([0, 0], [1, 0], 0);
    door.visible = false;
    images.objects.push(door);
    expect(buildUvtt(visibleMap, '').portals).toEqual([]);
  });
});

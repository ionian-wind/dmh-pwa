import { describe, expect, it } from 'vitest';
import {
  contentBounds,
  shapeBounds,
  visibleWorldRect,
} from '@/map-studio/domain/canvasView';
import {
  createMap,
  createProject,
} from '@/map-studio/domain/document/factories';
import { createTextObject } from '@/map-studio/domain/objects';
import type {
  DungeonShape,
  StudioMap,
} from '@/map-studio/domain/document/types';

function rectangle(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): DungeonShape {
  return {
    id,
    operation: 'add',
    shape: {
      kind: 'rectangle',
      x,
      y,
      width,
      height,
      cornerRadius: 0,
      rough: 0,
      smooth: false,
    },
  };
}

describe('map studio canvas view', () => {
  it('maps the viewport to the visible world rect', () => {
    expect(visibleWorldRect({ x: 0, y: 0, zoom: 1 }, 100, 50)).toEqual({
      left: 0,
      top: 0,
      right: 100,
      bottom: 50,
    });
    expect(visibleWorldRect({ x: -200, y: -100, zoom: 2 }, 100, 50)).toEqual({
      left: 100,
      top: 50,
      right: 150,
      bottom: 75,
    });
    expect(visibleWorldRect({ x: 10, y: 20, zoom: 0 }, 100, 50)).toEqual({
      left: -10,
      top: -20,
      right: 90,
      bottom: 30,
    });
  });

  it('returns null for unbounded wall shapes', () => {
    expect(
      shapeBounds({
        id: 'wall',
        operation: 'add',
        shape: {
          kind: 'wall',
          points: [
            [0, 0],
            [1, 1],
          ],
          width: 0.1,
          dash: false,
          dashSize: 0.4,
          rough: 0,
          smooth: false,
        },
      }),
    ).toBeNull();
  });

  it('computes polygon bounds for dungeon shapes', () => {
    expect(shapeBounds(rectangle('shape', 2, 3, 4, 5))).toEqual({
      x: 2,
      y: 3,
      width: 4,
      height: 5,
    });
  });

  it('includes dungeon shapes and objects in content bounds', () => {
    const map = createMap(createProject().id);
    expect(contentBounds(null)).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    expect(contentBounds(map)).toEqual({ x: 0, y: 0, width: 1, height: 1 });

    const dungeon = map.layers.find((layer) => layer.type === 'dungeon')!;
    if (dungeon.type !== 'dungeon') throw new Error('missing dungeon');
    dungeon.shapes.push(rectangle('shape', 10, 20, 4, 6));
    expect(contentBounds(map)).toEqual({
      x: 9.5,
      y: 19.5,
      width: 5,
      height: 7,
    });

    const images = map.layers.find((layer) => layer.type === 'images')!;
    if (images.type !== 'images') throw new Error('missing images');
    images.objects.push(createTextObject('far', [40, 50], 0));
    const bounds = contentBounds(map);
    expect(bounds.x).toBe(9.5);
    expect(bounds.y).toBe(19.5);
    expect(bounds.x + bounds.width).toBeGreaterThan(43);
    expect(bounds.y + bounds.height).toBeGreaterThan(50);
  });

  it('ignores shapes that do not produce bounds', () => {
    const map = createMap(createProject().id);
    const dungeon = map.layers.find((layer) => layer.type === 'dungeon')!;
    if (dungeon.type !== 'dungeon') throw new Error('missing dungeon');
    dungeon.shapes.push({
      id: 'wall',
      operation: 'add',
      shape: {
        kind: 'wall',
        points: [
          [0, 0],
          [1, 1],
        ],
        width: 0.1,
        dash: false,
        dashSize: 0.4,
        rough: 0,
        smooth: false,
      },
    });
    expect(contentBounds(map)).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it('ignores hidden layers and objects', () => {
    const map: StudioMap = createMap(createProject().id);
    const dungeon = map.layers.find((layer) => layer.type === 'dungeon')!;
    if (dungeon.type !== 'dungeon') throw new Error('missing dungeon');
    dungeon.shapes.push(rectangle('shape', 10, 20, 4, 6));
    dungeon.visible = false;
    const images = map.layers.find((layer) => layer.type === 'images')!;
    if (images.type !== 'images') throw new Error('missing images');
    const hidden = createTextObject('hidden', [40, 50], 0);
    hidden.visible = false;
    images.objects.push(hidden);
    expect(contentBounds(map)).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });
});

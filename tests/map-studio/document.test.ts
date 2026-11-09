import { describe, expect, it } from 'vitest';
import {
  createMap,
  createProject,
} from '@/map-studio/domain/document/factories';
import {
  normalizeMap,
  normalizeProject,
} from '@/map-studio/domain/document/normalize';

describe('map studio document model', () => {
  it('creates a map with one background, dungeon and images layer', () => {
    const project = createProject({ name: 'Test' });
    const map = createMap(project.id);

    expect(map.projectId).toBe(project.id);
    expect(
      map.layers.filter((layer) => layer.type === 'background'),
    ).toHaveLength(1);
    expect(map.layers.filter((layer) => layer.type === 'dungeon')).toHaveLength(
      1,
    );
    expect(map.layers.filter((layer) => layer.type === 'images')).toHaveLength(
      1,
    );
    expect(map.background.id).toBe(
      map.layers.find((layer) => layer.type === 'background')?.id,
    );
  });

  it('normalizes malformed maps and drops invalid shapes', () => {
    const map = normalizeMap({
      id: 'm1',
      projectId: 'p1',
      name: 'Broken',
      width: -1,
      height: 12,
      grid: { type: 'nonsense', width: -2 },
      layers: [
        {
          id: 'd1',
          type: 'dungeon',
          name: '',
          order: 2,
          shapes: [
            {
              id: 's1',
              operation: 'add',
              shape: { kind: 'rectangle', x: 1, y: 2, width: 3, height: 4 },
            },
            {
              id: 's2',
              operation: 'add',
              shape: { kind: 'rectangle', x: 1, y: 2, width: 0, height: 4 },
            },
            { id: 's3', shape: { kind: 'unknown' } },
          ],
        },
        null,
      ],
      settings: { snapDivision: 99 },
    });

    expect(map.id).toBe('m1');
    expect(map.width).toBe(1);
    expect(map.height).toBe(12);
    expect(map.grid.type).toBe('square');
    expect(map.settings.snapDivision).toBe(9);
    const dungeon = map.layers.find((layer) => layer.type === 'dungeon');
    expect(dungeon && 'shapes' in dungeon ? dungeon.shapes : []).toHaveLength(
      1,
    );
    expect(map.layers.some((layer) => layer.type === 'background')).toBe(true);
  });

  it('normalizes projects and export defaults', () => {
    const project = normalizeProject({
      id: 'p1',
      name: 'Project',
      mapOrder: ['a', 3, 'b'],
      settings: { exportDefaults: { pixelsPerCell: 140 } },
      locationId: 'l1',
    });

    expect(project.id).toBe('p1');
    expect(project.mapOrder).toEqual(['a', 'b']);
    expect(project.settings.exportDefaults.pixelsPerCell).toBe(140);
    expect(project.settings.exportDefaults.format).toBe('png');
    expect(project.locationId).toBe('l1');
  });
});

describe('map studio normalization edge cases', () => {
  it('falls back for undefined and partial documents', () => {
    const fallback = normalizeMap(undefined, 'p1');
    expect(fallback.projectId).toBe('p1');
    expect(fallback.layers.some((layer) => layer.type === 'background')).toBe(
      true,
    );

    const partial = normalizeMap({
      layers: [
        { type: 'background', style: undefined },
        { type: 'images', objects: 'nope' },
        { type: 'dungeon', style: undefined },
        { type: 'unknown' },
      ],
    });
    expect(partial.layers).toHaveLength(3);
    const background = partial.layers.find(
      (layer) => layer.type === 'background',
    );
    expect(background).toBeTruthy();
    const images = partial.layers.find((layer) => layer.type === 'images');
    expect(images && 'objects' in images ? images.objects : null).toEqual([]);
    const dungeon = partial.layers.find((layer) => layer.type === 'dungeon');
    expect(
      dungeon && 'style' in dungeon ? dungeon.style.walls.width : 0,
    ).toBeGreaterThan(0);
  });

  it('normalizes layer flags, orders, shapes and invalid values', () => {
    const map = normalizeMap({
      grid: null,
      settings: { snapDivision: -4 },
      layers: [
        {
          id: 'b',
          type: 'background',
          visible: 'yes',
          locked: 1,
          opacity: 4,
          blendMode: 'unknown',
          parentId: 7,
          order: 'x',
          style: { color: 3, opacity: -1, isometric: 'yes' },
        },
        {
          id: 'd',
          type: 'dungeon',
          visible: false,
          locked: true,
          opacity: -2,
          order: 2,
          style: {
            floor: { visible: false, color: 122 },
            walls: {
              visible: false,
              color: 122,
              width: -1,
              blocksLight: false,
              dash: true,
            },
            grid: { visible: false, color: 122, width: -1 },
          },
          shapes: [
            {
              id: 's',
              operation: 'subtract',
              seed: '4',
              shape: {
                kind: 'rectangle',
                x: '1',
                y: null,
                width: 2,
                height: 3,
                cornerRadius: -1,
                rough: 9,
                smooth: true,
              },
            },
          ],
        },
      ],
    });
    const background = map.layers.find((layer) => layer.type === 'background');
    expect(background?.visible).toBe(true);
    expect(background?.locked).toBe(false);
    expect(background?.opacity).toBe(1);
    expect(background?.blendMode).toBe('normal');
    expect(background?.parentId).toBeNull();
    expect(map.layers.find((layer) => layer.type === 'dungeon')?.opacity).toBe(
      0,
    );
    const dungeon = map.layers.find((layer) => layer.type === 'dungeon');
    const shapes = dungeon && 'shapes' in dungeon ? dungeon.shapes : [];
    expect(shapes[0]).toMatchObject({
      operation: 'subtract',
      seed: 4,
      shape: { x: 1, y: 0, cornerRadius: 0, rough: 0, smooth: true },
    });
    expect(map.grid.radius).toBeUndefined();
    expect(map.settings.snapDivision).toBe(1);
  });

  it('handles malformed and missing projects', () => {
    expect(normalizeProject(undefined).name).toBe('Untitled map');
    const project = normalizeProject({
      id: 4,
      name: '',
      description: 4,
      mapOrder: 'nope',
      locationId: 4,
      settings: {
        exportDefaults: { format: 'jpg', pixelsPerCell: 0, filename: 4 },
      },
      createdAt: 'x',
    });
    expect(project.id).toBeTruthy();
    expect(project.name).toBe('Untitled map');
    expect(project.description).toBe('');
    expect(project.mapOrder).toEqual([]);
    expect(project.locationId).toBeNull();
    expect(project.settings.exportDefaults.format).toBe('jpg');
    expect(project.settings.exportDefaults.pixelsPerCell).toBe(0);
    expect(project.settings.exportDefaults.filename).toBe(4);
  });
});

describe('map studio normalization defaults', () => {
  it('normalizes every grid variant and numeric fallback', () => {
    for (const type of ['hex', 'dot', 'none'] as const) {
      const map = normalizeMap({
        grid: {
          type,
          color: '#fff',
          width: 2,
          radius: 3,
          cellDiameter: 2,
          offsetX: 1,
          offsetY: -1,
        },
      });
      expect(map.grid.type).toBe(type);
      expect(map.grid.radius).toBe(3);
      expect(map.grid.cellDiameter).toBe(2);
    }
    const fallback = normalizeMap({ grid: { cellDiameter: 0 } });
    expect(fallback.grid.cellDiameter).toBe(0.01);
  });

  it('normalizes circle and polygon shapes', () => {
    const map = normalizeMap({
      layers: [
        {
          type: 'dungeon',
          shapes: [
            { shape: { kind: 'circle', cx: 1, cy: 2, radius: 3 } },
            {
              shape: {
                kind: 'polygon',
                points: [
                  [0, 0],
                  [1, 0],
                  [1, 1],
                ],
                rough: 3,
                smooth: true,
              },
            },
            { shape: { kind: 'circle', radius: 0 } },
            { shape: { kind: 'polygon', points: [[0, 0]] } },
          ],
        },
      ],
    });
    const dungeon = map.layers.find((layer) => layer.type === 'dungeon');
    const shapes = dungeon && 'shapes' in dungeon ? dungeon.shapes : [];
    expect(shapes).toHaveLength(2);
    expect(shapes[1]).toMatchObject({
      shape: { kind: 'polygon', rough: 3, smooth: true },
    });
  });

  it('normalizes partial project settings without defaults', () => {
    const project = normalizeProject({ settings: undefined });
    expect(project.settings.exportDefaults.format).toBe('png');
    expect(project.settings.theme).toBeUndefined();
  });
});

describe('map studio path/wall normalization', () => {
  it('normalizes path and wall shapes and rejects too few points', () => {
    const map = normalizeMap({
      layers: [
        {
          type: 'dungeon',
          shapes: [
            {
              shape: {
                kind: 'path',
                points: [
                  [0, 0],
                  [1, 1],
                ],
                radius: 0.5,
              },
            },
            {
              shape: {
                kind: 'wall',
                points: [
                  [0, 0],
                  [1, 1],
                ],
                width: 0.1,
              },
            },
            { shape: { kind: 'path', points: [[0, 0]], radius: 1 } },
            { shape: { kind: 'wall', points: [[0, 0]], width: 1 } },
          ],
        },
      ],
    });
    const dungeon = map.layers.find((layer) => layer.type === 'dungeon');
    const shapes = dungeon && 'shapes' in dungeon ? dungeon.shapes : [];
    expect(shapes.map((shape) => shape.shape.kind)).toEqual(['path', 'wall']);
  });
});

describe('map studio object normalization', () => {
  it('normalizes text, doors and stairs and drops invalid objects', () => {
    const map = normalizeMap({
      layers: [
        {
          type: 'images',
          objects: [
            { type: 'text', text: 'Hall', transform: { x: 1, y: 2 } },
            { type: 'door', a: [0, 0], b: [1, 0] },
            {
              type: 'stairs',
              points: [
                [0, 0],
                [1, 0],
                [1, 1],
              ],
            },
            { type: 'text', text: '' },
            { type: 'door' },
            { type: 'stairs', points: [[0, 0]] },
            { type: 'unknown' },
          ],
        },
      ],
    });
    const images = map.layers.find((layer) => layer.type === 'images');
    expect(images && 'objects' in images ? images.objects : []).toHaveLength(3);
  });
});

describe('map studio object variants', () => {
  it('preserves object fields and drops malformed objects', () => {
    const map = normalizeMap({
      layers: [
        {
          type: 'images',
          objects: [
            {
              type: 'text',
              text: 'Right',
              align: 'right',
              fontFamily: 'Arial',
              fontSize: 1,
              color: '#000',
              transform: {
                x: 1,
                y: 2,
                width: 3,
                height: 4,
                rotation: 1,
                flipX: true,
                flipY: true,
              },
            },
            { type: 'door', a: [0, 0], b: [2, 0], variant: 1 },
            {
              type: 'stairs',
              points: [
                [0, 0],
                [1, 0],
                [1, 2],
              ],
              stepsPerCell: 5,
            },
          ],
        },
      ],
    });
    const images = map.layers.find((layer) => layer.type === 'images');
    const objects = images && 'objects' in images ? images.objects : [];
    expect(objects[0]).toMatchObject({ type: 'text', align: 'right' });
    expect(objects[1]).toMatchObject({ type: 'door', variant: 1 });
    expect(objects[2]).toMatchObject({ type: 'stairs', stepsPerCell: 5 });
  });
});

describe('map studio image normalization', () => {
  it('keeps valid image objects and drops empty sources', () => {
    const map = normalizeMap({
      layers: [
        {
          type: 'images',
          objects: [
            {
              type: 'image',
              src: 'data:image/png;base64,abc',
              transform: { x: 1, y: 1, width: 2, height: 2 },
            },
            { type: 'image', src: '' },
          ],
        },
      ],
    });
    const images = map.layers.find((layer) => layer.type === 'images');
    expect(images && 'objects' in images ? images.objects : []).toHaveLength(1);
  });
});

describe('map studio folders', () => {
  it('normalizes folder layers', () => {
    const map = normalizeMap({
      layers: [
        { type: 'folder', name: 'Level', expanded: false, order: 2 },
        { type: 'folder', name: 'Open', order: 3 },
      ],
    });
    const folders = map.layers.filter((layer) => layer.type === 'folder');
    expect(folders).toHaveLength(2);
    expect(folders[0].type === 'folder' && folders[0].expanded).toBe(false);
    expect(folders[1].type === 'folder' && folders[1].expanded).toBe(true);
  });
});

describe('map studio folder factory', () => {
  it('creates folder defaults and overrides', async () => {
    const { createFolderLayer } =
      await import('@/map-studio/domain/document/factories');
    expect(createFolderLayer()).toMatchObject({
      type: 'folder',
      expanded: true,
    });
    expect(createFolderLayer({ expanded: false, name: 'X' })).toMatchObject({
      expanded: false,
      name: 'X',
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  boundsOfGeometry,
  compileDungeonLayer,
  shapeToPolygon,
} from '@/map-studio/domain/geometry/compile';
import { createDungeonLayer } from '@/map-studio/domain/document/factories';
import type {
  CircleShape,
  DungeonShape,
  PolygonShape,
} from '@/map-studio/domain/document/types';

function rectangle(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  operation: 'add' | 'subtract' = 'add',
): DungeonShape {
  return {
    id,
    operation,
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

describe('map studio geometry', () => {
  it('merges adjacent rooms and removes the shared wall', () => {
    const layer = createDungeonLayer({
      shapes: [rectangle('a', 0, 0, 1, 1), rectangle('b', 1, 0, 1, 1)],
    });
    const compiled = compileDungeonLayer(layer);
    expect(compiled.polygons).toHaveLength(1);
    expect(compiled.wallSegments).toHaveLength(4);
    expect(boundsOfGeometry(compiled.polygons)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 2,
      maxY: 1,
    });
  });

  it('keeps separate rooms and merges overlapping rooms', () => {
    const separate = compileDungeonLayer(
      createDungeonLayer({
        shapes: [rectangle('a', 0, 0, 1, 1), rectangle('b', 3, 0, 1, 1)],
      }),
    );
    expect(separate.polygons).toHaveLength(2);

    const overlap = compileDungeonLayer(
      createDungeonLayer({
        shapes: [rectangle('a', 0, 0, 2, 2), rectangle('b', 1, 1, 2, 2)],
      }),
    );
    expect(overlap.polygons).toHaveLength(1);
    expect(boundsOfGeometry(overlap.polygons)).toMatchObject({
      minX: 0,
      minY: 0,
      maxX: 3,
      maxY: 3,
    });
  });

  it('subtracts cutouts and later adds restore area', () => {
    const cut = compileDungeonLayer(
      createDungeonLayer({
        shapes: [
          rectangle('room', 0, 0, 4, 4),
          rectangle('hole', 1, 1, 2, 2, 'subtract'),
        ],
      }),
    );
    expect(cut.polygons).toHaveLength(1);
    expect(cut.polygons[0]).toHaveLength(2);
    expect(cut.wallSegments).toHaveLength(8);

    const restored = compileDungeonLayer(
      createDungeonLayer({
        shapes: [
          rectangle('room', 0, 0, 4, 4),
          rectangle('hole', 1, 1, 2, 2, 'subtract'),
          rectangle('patch', 1, 1, 2, 2),
        ],
      }),
    );
    expect(restored.polygons[0]).toHaveLength(1);
  });

  it('ignores subtract when there is no geometry and invalid shapes', () => {
    const compiled = compileDungeonLayer(
      createDungeonLayer({
        shapes: [
          rectangle('empty', 0, 0, 1, 1, 'subtract'),
          {
            id: 'zero',
            operation: 'add',
            shape: {
              kind: 'rectangle',
              x: 0,
              y: 0,
              width: 0,
              height: 1,
              cornerRadius: 0,
              rough: 0,
              smooth: false,
            },
          },
        ],
      }),
    );
    expect(compiled.polygons).toEqual([]);
    expect(compiled.wallSegments).toEqual([]);
  });

  it('converts circles and polygons', () => {
    const circle: CircleShape = {
      id: 'c',
      operation: 'add',
      shape: {
        kind: 'circle',
        cx: 2,
        cy: 2,
        radius: 1,
        rough: 0,
        smooth: false,
      },
    };
    const polygon: PolygonShape = {
      id: 'p',
      operation: 'add',
      shape: {
        kind: 'polygon',
        points: [
          [0, 0],
          [2, 0],
          [2, 2],
        ],
        rough: 0,
        smooth: false,
      },
    };
    expect(shapeToPolygon(circle)?.[0]?.length).toBeGreaterThan(10);
    expect(shapeToPolygon(polygon)?.[0]).toHaveLength(4);
  });

  it('samples rounded rectangles', () => {
    const rounded: DungeonShape = {
      id: 'r',
      operation: 'add',
      shape: {
        kind: 'rectangle',
        x: 0,
        y: 0,
        width: 4,
        height: 4,
        cornerRadius: 1,
        rough: 0,
        smooth: false,
      },
    };
    const ring = shapeToPolygon(rounded)?.[0] ?? [];
    expect(ring.length).toBeGreaterThan(8);
  });
});

describe('map studio geometry edge branches', () => {
  it('clamps oversized corner radii and handles invalid shapes', () => {
    const clamped: DungeonShape = {
      id: 'r',
      operation: 'add',
      shape: {
        kind: 'rectangle',
        x: 0,
        y: 0,
        width: 2,
        height: 2,
        cornerRadius: 99,
        rough: 0,
        smooth: false,
      },
    };
    expect(shapeToPolygon(clamped)?.[0]?.length).toBeGreaterThan(8);
    expect(
      shapeToPolygon({
        id: 'c',
        operation: 'add',
        shape: {
          kind: 'circle',
          cx: 0,
          cy: 0,
          radius: 0,
          rough: 0,
          smooth: false,
        },
      }),
    ).toBeNull();
    expect(
      shapeToPolygon({
        id: 'p',
        operation: 'add',
        shape: { kind: 'polygon', points: [[0, 0]], rough: 0, smooth: false },
      }),
    ).toBeNull();
    expect(
      shapeToPolygon({
        id: 'x',
        operation: 'add',
        shape: { kind: 'other' },
      } as any),
    ).toBeNull();
  });

  it('returns null bounds for empty geometry', () => {
    expect(boundsOfGeometry([])).toBeNull();
  });
});

describe('map studio path, wall and roughness', () => {
  it('expands paths and keeps wall annotations out of floor geometry', () => {
    const path: DungeonShape = {
      id: 'path',
      operation: 'add',
      shape: {
        kind: 'path',
        points: [
          [0, 0],
          [3, 0],
        ],
        radius: 0.5,
        closed: false,
        rough: 0,
        smooth: false,
      },
    };
    const wall: DungeonShape = {
      id: 'wall',
      operation: 'add',
      shape: {
        kind: 'wall',
        points: [
          [0, 2],
          [2, 2],
          [2, 4],
        ],
        width: 0.1,
        dash: false,
        rough: 0,
        smooth: false,
      },
    };
    const compiled = compileDungeonLayer(
      createDungeonLayer({ shapes: [path, wall] }),
    );
    expect(compiled.polygons).toHaveLength(1);
    expect(compiled.wallSegments.length).toBeGreaterThanOrEqual(6);
  });

  it('applies deterministic roughness', () => {
    const shape: DungeonShape = {
      id: 'rough',
      operation: 'add',
      seed: 42,
      shape: {
        kind: 'rectangle',
        x: 0,
        y: 0,
        width: 4,
        height: 3,
        cornerRadius: 0,
        rough: 3,
        smooth: false,
      },
    };
    const first = shapeToPolygon(shape);
    const second = shapeToPolygon({ ...shape });
    expect(first).toEqual(second);
    expect(first?.[0]?.length).toBeGreaterThan(4);
  });
});

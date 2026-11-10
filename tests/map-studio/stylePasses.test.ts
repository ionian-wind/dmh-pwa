import { describe, expect, it } from 'vitest';
import type { MultiPolygon } from 'polygon-clipping';
import {
  createHatchPattern,
  createShadingGeometry,
} from '@/map-studio/domain/geometry/stylePasses';
import {
  compileDungeonLayer,
  pointInPolygon,
} from '@/map-studio/domain/geometry/compile';
import { createDungeonLayer } from '@/map-studio/domain/document/factories';
import type {
  DungeonLayerStyle,
  Point,
} from '@/map-studio/domain/document/types';

const square: MultiPolygon = [
  [
    [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [0, 0],
    ],
  ],
];

const squareWithHole: MultiPolygon = [
  [
    [
      [0, 0],
      [6, 0],
      [6, 6],
      [0, 6],
      [0, 0],
    ],
    [
      [2, 2],
      [4, 2],
      [4, 4],
      [2, 4],
      [2, 2],
    ],
  ],
];

function style(
  overrides: Partial<DungeonLayerStyle['hatching']> = {},
): DungeonLayerStyle['hatching'] {
  return {
    visible: true,
    variant: 'diagonal',
    size: 0.5,
    color: '#000000',
    width: 0.01,
    ...overrides,
  };
}

function midpoint(segment: { a: Point; b: Point }): Point {
  return [(segment.a[0] + segment.b[0]) / 2, (segment.a[1] + segment.b[1]) / 2];
}

describe('dungeon style passes', () => {
  it('clips diagonal hatch lines to the floor geometry', () => {
    const pattern = createHatchPattern(style(), square);
    expect(pattern.segments.length).toBeGreaterThan(4);
    for (const segment of pattern.segments) {
      expect(pointInPolygon(midpoint(segment), square[0][0])).toBe(true);
      expect(segment.a[0]).toBeGreaterThanOrEqual(0);
      expect(segment.a[0]).toBeLessThanOrEqual(4);
      expect(segment.b[1]).toBeGreaterThanOrEqual(0);
      expect(segment.b[1]).toBeLessThanOrEqual(4);
    }
  });

  it('supports cross, horizontal, vertical, dots and brick variants', () => {
    const diagonal = createHatchPattern(style(), square).segments.length;
    const cross = createHatchPattern(style({ variant: 'cross' }), square);
    expect(cross.segments.length).toBeGreaterThan(diagonal);
    const horizontal = createHatchPattern(
      style({ variant: 'horizontal' }),
      square,
    );
    expect(horizontal.segments.length).toBeGreaterThan(0);
    expect(
      horizontal.segments.every(
        (segment) => Math.abs(segment.a[1] - segment.b[1]) < 1e-7,
      ),
    ).toBe(true);
    const vertical = createHatchPattern(style({ variant: 'vertical' }), square);
    expect(vertical.segments.length).toBeGreaterThan(0);
    expect(
      vertical.segments.every(
        (segment) => Math.abs(segment.a[0] - segment.b[0]) < 1e-7,
      ),
    ).toBe(true);
    const dots = createHatchPattern(style({ variant: 'dots' }), square);
    expect(dots.segments).toHaveLength(0);
    expect(dots.dots.length).toBeGreaterThan(0);
    expect(
      dots.dots.every((point) => pointInPolygon(point, square[0][0])),
    ).toBe(true);
    const brick = createHatchPattern(style({ variant: 'brick' }), square);
    expect(brick.segments.length).toBeGreaterThan(horizontal.segments.length);
  });

  it('excludes holes and hidden hatching', () => {
    const dots = createHatchPattern(style({ variant: 'dots' }), squareWithHole);
    expect(dots.dots.length).toBeGreaterThan(0);
    for (const point of dots.dots) {
      expect(pointInPolygon(point, squareWithHole[0][0])).toBe(true);
      expect(pointInPolygon(point, squareWithHole[0][1])).toBe(false);
    }
    expect(
      createHatchPattern(style({ visible: false }), square).segments,
    ).toHaveLength(0);
    expect(createHatchPattern(style(), [])).toEqual({
      segments: [],
      dots: [],
    });
  });

  it('handles empty geometry bounds for every hatch variant', () => {
    const emptyRings: MultiPolygon = [[[]]];
    expect(
      createHatchPattern(style({ variant: 'diagonal' }), emptyRings).segments,
    ).toEqual([]);
    expect(
      createHatchPattern(style({ variant: 'dots' }), emptyRings).dots,
    ).toEqual([]);
    expect(
      createHatchPattern(style({ variant: 'brick' }), emptyRings).segments,
    ).toEqual([]);
  });

  it('builds clipped inner shading from wall segments', () => {
    const layer = createDungeonLayer({
      shapes: [
        {
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
        },
      ],
    });
    const compiled = compileDungeonLayer(layer);
    const shading = createShadingGeometry(
      {
        visible: true,
        size: 0.3,
        roughness: 1,
        color: '#000000',
        opacity: 0.3,
      },
      compiled.polygons,
      compiled.wallSegments,
    );
    expect(shading.length).toBeGreaterThan(0);
    expect(
      shading.some((polygon) => pointInPolygon([0.1, 2], polygon[0])),
    ).toBe(true);
    expect(
      createShadingGeometry(
        {
          visible: false,
          size: 0.3,
          roughness: 0,
          color: '#000000',
          opacity: 0.3,
        },
        compiled.polygons,
        compiled.wallSegments,
      ),
    ).toEqual([]);
  });

  it('ignores degenerate shading and empty geometry', () => {
    expect(
      createShadingGeometry(
        {
          visible: true,
          size: 0,
          roughness: 0,
          color: '#000000',
          opacity: 0.3,
        },
        square,
        [],
      ),
    ).toEqual([]);
    expect(
      createShadingGeometry(
        {
          visible: true,
          size: 0.2,
          roughness: 0,
          color: '#000000',
          opacity: 0.3,
        },
        [],
        [],
      ),
    ).toEqual([]);
  });
});

describe('dungeon shading edge cases', () => {
  const shading = {
    visible: true,
    size: 0.2,
    roughness: 0 as const,
    color: '#000000',
    opacity: 0.3,
  };

  it('ignores degenerate, outside and one-sided segments', () => {
    expect(
      createShadingGeometry(shading, square, [{ a: [1, 1], b: [1, 1] }]),
    ).toEqual([]);
    expect(
      createShadingGeometry(shading, square, [{ a: [10, 10], b: [11, 10] }]),
    ).toEqual([]);
    const oneSided = createShadingGeometry(shading, square, [
      { a: [4, 4], b: [4, 0] },
    ]);
    expect(oneSided.length).toBeGreaterThan(0);
    const oneBand = createShadingGeometry(shading, square, [
      { a: [0, 0], b: [4, 0] },
    ]);
    expect(oneBand.length).toBeGreaterThan(0);
  });
});

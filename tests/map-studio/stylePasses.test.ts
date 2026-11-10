import { describe, expect, it } from 'vitest';
import type { MultiPolygon } from 'polygon-clipping';
import {
  createFloorGrid,
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

function samples(segment: { a: Point; b: Point }, count = 10): Point[] {
  return Array.from({ length: count + 1 }, (_, index) => {
    const t = index / count;
    return [
      segment.a[0] + (segment.b[0] - segment.a[0]) * t,
      segment.a[1] + (segment.b[1] - segment.a[1]) * t,
    ];
  });
}

function insideFloor(point: Point, polygon: MultiPolygon[0]): boolean {
  const [outer, ...holes] = polygon;
  return (
    pointInPolygon(point, outer) &&
    !holes.some((hole) => pointInPolygon(point, hole))
  );
}

describe('dungeon style passes', () => {
  it('places short diagonal hatch strokes outside the floor', () => {
    const pattern = createHatchPattern(style(), square);
    expect(pattern.segments.length).toBeGreaterThan(4);
    for (const segment of pattern.segments) {
      const point = midpoint(segment);
      expect(insideFloor(point, square[0])).toBe(false);
      expect(point[0]).toBeGreaterThanOrEqual(-2);
      expect(point[0]).toBeLessThanOrEqual(6);
      expect(point[1]).toBeGreaterThanOrEqual(-2);
      expect(point[1]).toBeLessThanOrEqual(6);
      expect(
        Math.hypot(segment.b[0] - segment.a[0], segment.b[1] - segment.a[1]),
      ).toBeLessThan(style().size);
      for (const point of samples(segment)) {
        expect(insideFloor(point, square[0])).toBe(false);
      }
    }
  });

  it('supports preset-driven cross, horizontal, vertical, dots and brick variants', () => {
    for (const variant of [
      'diagonal',
      'cross',
      'horizontal',
      'vertical',
      'brick',
    ] as const) {
      const pattern = createHatchPattern(style({ variant }), square);
      expect(pattern.segments.length).toBeGreaterThan(0);
      for (const segment of pattern.segments) {
        for (const point of samples(segment)) {
          expect(insideFloor(point, square[0])).toBe(false);
        }
      }
    }
    const dots = createHatchPattern(style({ variant: 'dots' }), square);
    expect(dots.segments).toHaveLength(0);
    expect(dots.dots.length).toBeGreaterThan(0);
    expect(dots.dots.every((point) => !insideFloor(point, square[0]))).toBe(
      true,
    );
  });

  it('places hatching outside holes and skips hidden or empty hatching', () => {
    const pattern = createHatchPattern(style(), squareWithHole);
    expect(pattern.segments.length).toBeGreaterThan(4);
    for (const segment of pattern.segments) {
      expect(insideFloor(midpoint(segment), squareWithHole[0])).toBe(false);
    }
    const dots = createHatchPattern(style({ variant: 'dots' }), squareWithHole);
    expect(dots.dots.length).toBeGreaterThan(0);
    for (const point of dots.dots) {
      expect(insideFloor(point, squareWithHole[0])).toBe(false);
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
    for (const variant of ['diagonal', 'dots', 'brick'] as const) {
      const pattern = createHatchPattern(style({ variant }), emptyRings);
      expect(pattern.segments).toEqual([]);
      expect(pattern.dots).toEqual([]);
    }
  });

  it('clips the inner floor grid to the floor geometry', () => {
    const segments = createFloorGrid(square);
    expect(segments.length).toBeGreaterThanOrEqual(8);
    for (const segment of segments) {
      expect(insideFloor(midpoint(segment), square[0])).toBe(true);
    }
    const withHole = createFloorGrid(squareWithHole);
    expect(withHole.length).toBeGreaterThan(0);
    for (const segment of withHole) {
      expect(insideFloor(midpoint(segment), squareWithHole[0])).toBe(true);
    }
    expect(createFloorGrid([])).toEqual([]);
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

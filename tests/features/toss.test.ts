import { describe, expect, it } from 'vitest';
import {
  computeTossRelease,
  trimTossSamples,
  type TossSample,
} from '@/features/dice-roller/renderer/toss';

function samples(points: Array<[number, number]>, step = 16): TossSample[] {
  return points.map(([x, z], index) => ({
    point: { x, z },
    time: index * step,
  }));
}

describe('toss release', () => {
  it('drops when the cursor has not moved', () => {
    expect(computeTossRelease([], 100)).toEqual({
      vx: 0,
      vz: 0,
      speed: 0,
      spin: 0,
    });
    expect(
      computeTossRelease(
        samples([
          [0, 0],
          [0, 0],
        ]),
        32,
      ),
    ).toMatchObject({ vx: 0, vz: 0, speed: 0, spin: 0 });
  });

  it('uses the latest cursor direction and speed', () => {
    const release = computeTossRelease(
      samples(
        [
          [0, 0],
          [0.5, 0],
          [1, 0],
        ],
        20,
      ),
      40,
    );
    expect(release.vx).toBeGreaterThan(0);
    expect(release.vz).toBeCloseTo(0, 5);
    expect(release.speed).toBeGreaterThan(0);
    expect(release.spin).toBeGreaterThan(0);
  });

  it('drops when the cursor stopped before release', () => {
    expect(
      computeTossRelease(
        samples([
          [0, 0],
          [1, 0],
        ]),
        500,
      ),
    ).toMatchObject({ vx: 0, vz: 0, speed: 0, spin: 0 });
  });

  it('clamps very fast releases', () => {
    const release = computeTossRelease(
      samples(
        [
          [0, 0],
          [100, 0],
        ],
        10,
      ),
      20,
      5,
    );
    expect(release.speed).toBeLessThanOrEqual(5);
    expect(release.spin).toBeLessThanOrEqual(0.45);
  });

  it('trims samples outside the movement window', () => {
    const list = samples(
      [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      100,
    );
    trimTossSamples(list, 250, 150);
    expect(list).toHaveLength(2);
  });
});

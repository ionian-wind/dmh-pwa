import { describe, expect, it } from 'vitest';
import { RapierDiceWorld } from '@/features/dice-roller/renderer/RapierDiceWorld';

describe('RapierDiceWorld', () => {
  it('creates, steps, transforms and removes bodies', async () => {
    const world = new RapierDiceWorld();
    await world.init();
    expect(world.ready).toBe(true);

    const points = new Float32Array([
      -0.1, -0.1, -0.1, 0.1, -0.1, -0.1, -0.1, 0.1, -0.1, 0.1, 0.1, -0.1, -0.1,
      -0.1, 0.1, 0.1, -0.1, 0.1, -0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
    ]);
    const body = world.add('a', points, { x: 0, y: 3, z: 0 });
    expect(body).not.toBeNull();
    expect(world.active).toBe(true);

    for (let index = 0; index < 240; index += 1) {
      world.step(1 / 60);
    }
    const transform = world.transform('a');
    expect(transform).toBeDefined();
    expect(transform!.position.y).toBeLessThan(3);
    expect(Number.isFinite(transform!.rotation.w)).toBe(true);

    world.remove('a');
    expect(world.transform('a')).toBeUndefined();
    expect(world.active).toBe(false);
    world.dispose();
  });

  it('replaces an existing body with the same id', async () => {
    const world = new RapierDiceWorld();
    await world.init();
    const points = new Float32Array([
      -0.1, -0.1, -0.1, 0.1, -0.1, -0.1, 0, 0.1, 0,
    ]);
    expect(world.add('a', points, { x: 0, y: 2, z: 0 })).not.toBeNull();
    expect(world.add('a', points, { x: 1, y: 2, z: 0 })).not.toBeNull();
    expect(world.transform('a')?.position.x).toBeCloseTo(1, 3);
    world.clear();
    expect(world.transform('a')).toBeUndefined();
    world.dispose();
  });

  it('handles a 30-die pool and clears it', async () => {
    const world = new RapierDiceWorld();
    await world.init();
    const points = new Float32Array([
      -0.12, -0.12, -0.12, 0.12, -0.12, -0.12, -0.12, 0.12, -0.12, 0.12, 0.12,
      -0.12, -0.12, -0.12, 0.12, 0.12, -0.12, 0.12, -0.12, 0.12, 0.12, 0.12,
      0.12, 0.12,
    ]);
    for (let index = 0; index < 30; index += 1) {
      expect(
        world.add(`die-${index}`, points, {
          x: (index % 6) - 3,
          y: 2 + Math.floor(index / 6) * 0.4,
          z: (index % 5) - 2,
        }),
      ).not.toBeNull();
    }
    expect(world.transform('die-29')).toBeDefined();
    for (let index = 0; index < 30; index += 1) world.step(1 / 60);
    expect(world.active).toBe(true);
    world.clear();
    expect(world.transform('die-0')).toBeUndefined();
    world.dispose();
  });
});

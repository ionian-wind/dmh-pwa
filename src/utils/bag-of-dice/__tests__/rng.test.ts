import { describe, expect, it } from 'vitest';
import { createRollEngine } from '../engine/engine';
import { createEmptyRepositories } from '../engine/repositories';
import { sequenceRng } from '../engine/rng';

const engine = createRollEngine();
const repositories = createEmptyRepositories();

describe('deterministic RNG', () => {
  it('produces identical results for the same sequence', async () => {
    const first = await engine.roll('4d6!kh2', {
      repositories,
      rng: sequenceRng([0.9, 0.5, 0.1, 0.7, 0.2]),
    });
    const second = await engine.roll('4d6!kh2', {
      repositories,
      rng: sequenceRng([0.9, 0.5, 0.1, 0.7, 0.2]),
    });
    expect(first).toEqual(second);
  });

  it('records replay state and can rewind it', async () => {
    const rng = sequenceRng([0.1, 0.2, 0.3]);
    const first = await engine.roll('2d6', { repositories, rng });
    expect(first.status).toBe('complete');
    if (first.status !== 'complete') return;
    expect(first.result.replay?.rngStateAfter).toBeDefined();

    const before = first.result.replay?.rngStateBefore;
    rng.restore(before);
    const second = await engine.roll('2d6', { repositories, rng });
    expect(second.status).toBe('complete');
    if (second.status !== 'complete') return;
    expect(second.result.total).toBe(first.result.total);
  });

  it('rejects invalid RNG output', async () => {
    const outcome = await engine.roll('1d6', {
      repositories,
      rng: { next: () => 2 },
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('RNG_FAILURE');
    }
  });

  it('never falls back to Math.random', async () => {
    const outcome = await engine.roll('1d6', {
      repositories,
      rng: {
        next() {
          throw new Error('no rng');
        },
      },
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('RNG_FAILURE');
    }
  });
});

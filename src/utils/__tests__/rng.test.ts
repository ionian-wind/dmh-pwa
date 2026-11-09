import { describe, expect, it, vi } from 'vitest';
import {
  captureRngState,
  cryptoRng,
  finishRngState,
  nextRandom,
  pickWeighted,
  pickWeightedBigIntIndex,
  pickWeightedIndex,
  randomInt,
  restoreRngState,
  RngError,
  rollDie,
  sampleWeighted,
  sequenceRng,
} from '@/utils/rng';
import { sequenceRng as bagSequenceRng } from '@/utils/bag-of-dice';

describe('shared RNG library', () => {
  it('replays deterministic sequences and snapshots', () => {
    const rng = sequenceRng([0, 0.5, 0.999]);
    expect(rollDie(rng, 6)).toBe(1);
    expect(rollDie(rng, 6)).toBe(4);
    expect(rng.draws).toBe(2);
    expect(rng.remaining()).toBe(1);
    const state = rng.snapshot();
    expect(rollDie(rng, 6)).toBe(6);
    rng.restore(state);
    expect(rollDie(rng, 6)).toBe(6);
    expect(() => rng.restore(null)).toThrow(/invalid/);
    expect(() => rng.restore({ index: -1 })).toThrow(/invalid/);
    expect(() => sequenceRng([])).toThrow(/at least one/);
  });

  it('is the same implementation used by bag-of-dice', () => {
    expect(bagSequenceRng).toBe(sequenceRng);
  });

  it('validates draws and reports RngError', () => {
    const throwing = {
      next: () => {
        throw new Error('boom');
      },
    };
    expect(() => nextRandom(throwing)).toThrow(RngError);
    expect(() => nextRandom(sequenceRng([1]))).toThrow(/outside/);
    expect(() => nextRandom(sequenceRng([Number.NaN]))).toThrow(RngError);

    const rng = cryptoRng();
    for (let index = 0; index < 10; index += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('rolls integers and random indexes', () => {
    const rng = sequenceRng([0, 0.5, 0.999]);
    expect(rollDie(rng, 6)).toBe(1);
    expect(rollDie(rng, 6)).toBe(4);
    const indexes = sequenceRng([0, 0.999]);
    expect(randomInt(indexes, 3)).toBe(0);
    expect(randomInt(indexes, 3)).toBe(2);
  });

  it('selects numeric and bigint weights', () => {
    const numeric = sequenceRng([0, 0.3, 0.75, 0.999]);
    const weights = [1, 1, 2];
    expect(pickWeightedIndex(weights, numeric)).toBe(0);
    expect(pickWeightedIndex(weights, numeric)).toBe(1);
    expect(pickWeightedIndex(weights, numeric)).toBe(2);
    expect(pickWeightedIndex(weights, numeric)).toBe(2);
    expect(pickWeightedIndex([], numeric)).toBe(-1);
    expect(pickWeightedIndex([0, -1], numeric)).toBe(-1);

    const bigint = sequenceRng([0, 0.3, 0.75]);
    expect(pickWeightedBigIntIndex([1n, 1n, 2n], bigint)).toBe(0);
    expect(pickWeightedBigIntIndex([1n, 1n, 2n], bigint)).toBe(1);
    expect(pickWeightedBigIntIndex([1n, 1n, 2n], bigint)).toBe(2);
    expect(pickWeightedBigIntIndex([0n], bigint)).toBe(-1);
  });

  it('selects and samples weighted items', () => {
    const items = [
      { id: 'a', weight: 1 },
      { id: 'b', weight: 3 },
    ];
    const rng = sequenceRng([0.1, 0.9]);
    expect(pickWeighted(items, (item) => item.weight, rng)?.id).toBe('a');
    expect(pickWeighted(items, (item) => item.weight, rng)?.id).toBe('b');
    expect(
      sampleWeighted(items, (item) => item.weight, 2, sequenceRng([0, 0.9])),
    ).toEqual([items[0], items[1]]);
    expect(sampleWeighted(items, (item) => item.weight, 0, rng)).toEqual([]);
    expect(sampleWeighted([], () => 0, 1, rng)).toEqual([]);
    expect(pickWeighted([], () => 0, rng)).toBeUndefined();
  });

  it('captures, finishes and restores replay state', () => {
    const rng = sequenceRng([0.1, 0.2]);
    const before = captureRngState(rng);
    rng.next();
    const after = finishRngState(rng, before);
    expect(after.rngStateBefore).toEqual({ index: 0 });
    expect(after.rngStateAfter).toEqual({ index: 1 });
    restoreRngState(rng, before.rngStateBefore);
    expect(rng.draws).toBe(0);

    expect(captureRngState({ next: () => 0.5 })).toEqual({});
    expect(finishRngState({ next: () => 0.5 }, before)).toBe(before);
    expect(() => restoreRngState({ next: () => 0.5 }, {})).toThrow(
      /does not support/,
    );
  });

  it('throws when crypto is unavailable', () => {
    const original = globalThis.crypto;
    vi.stubGlobal('crypto', undefined);
    expect(() => cryptoRng().next()).toThrow(RngError);
    vi.stubGlobal('crypto', original);
  });
});

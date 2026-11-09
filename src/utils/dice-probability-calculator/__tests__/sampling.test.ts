import { describe, expect, it } from 'vitest';
import { Die } from '../die';
import { sampleDie, sampleOutcomes } from '../sampling';
import { sequenceRng } from '@/utils/rng';

describe('probability calculator sampling', () => {
  it('samples a uniform die deterministically', () => {
    const die = Die.uniform(4);
    const rng = sequenceRng([0.1, 0.3, 0.75, 0.99]);
    expect(sampleDie(die, rng)).toBe(1);
    expect(sampleDie(die, rng)).toBe(2);
    expect(sampleDie(die, rng)).toBe(3);
    expect(sampleDie(die, rng)).toBe(4);
  });

  it('respects weighted faces', () => {
    const die = Die.fromFaces([1, 1, 2]);
    const rng = sequenceRng([0.1, 0.9]);
    expect(sampleDie(die, rng)).toBe(1);
    expect(sampleDie(die, rng)).toBe(2);
  });

  it('samples outcomes with replacement and handles empty input', () => {
    const outcomes = [
      { value: 10, weight: 1n },
      { value: 20, weight: 3n },
    ];
    expect(sampleOutcomes(outcomes, 3, sequenceRng([0.1, 0.9, 0.5]))).toEqual([
      10, 20, 20,
    ]);
    expect(sampleOutcomes([], 3, sequenceRng([0.5]))).toEqual([]);
    expect(sampleOutcomes(outcomes, 0, sequenceRng([0.5]))).toEqual([]);
    expect(
      sampleOutcomes([{ value: 1, weight: 0n }], 2, sequenceRng([0.5])),
    ).toEqual([]);
    expect(sampleDie(Die.empty(), sequenceRng([0.5]))).toBeUndefined();
  });
});

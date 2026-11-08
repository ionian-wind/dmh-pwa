import { describe, expect, it } from 'vitest';
import { Die, enumerateRolls } from '../die';

describe('Die branches', () => {
  it('creates and inspects distributions', () => {
    const die = Die.uniform(3);
    expect(die.totalWeight).toBe(3n);
    expect(die.minFace).toBe(1);
    expect(die.maxFace).toBe(3);
    expect(die.collectionSize).toBe(1);
    expect(Die.empty().isEmpty).toBe(true);
    expect(Die.empty().minFace).toBe(0);
    expect(Die.empty().maxFace).toBe(0);
    expect(Die.constant(5).minFace).toBe(5);
    expect(() => Die.uniform(0)).toThrow('positive number of sides');
    expect(() => Die.uniform(2.5)).toThrow('positive number of sides');
  });

  it('combines dice with every operator', () => {
    const die = Die.uniform(2);
    expect(die.add(1).maxFace).toBe(3);
    expect(die.sub(1).minFace).toBe(0);
    expect(die.mul(2).maxFace).toBe(4);
    expect(die.div(2).maxFace).toBe(1);
    expect(die.pow(2).maxFace).toBe(4);
    expect(() => die.div(0)).toThrow('Division by zero');
    expect(() => die.pow(-1)).toThrow('non-negative integer');
    expect(() => die.pow(1.5)).toThrow('non-negative integer');
    expect(die.compare(2, '=').maxFace).toBe(1);
    expect(die.compare(1, '!=').maxFace).toBe(1);
    expect(die.compare(2, '<').maxFace).toBe(1);
    expect(die.compare(1, '>').maxFace).toBe(1);
    expect(die.compare(1, '<=').maxFace).toBe(1);
    expect(die.compare(1, '>=').maxFace).toBe(1);
    expect(die.logicalAnd(1).maxFace).toBe(1);
    expect(die.logicalOr(0).maxFace).toBe(1);
    expect(die.logicalNot().minFace).toBe(0);
  });

  it('selects order statistics and rejects invalid positions', () => {
    const die = Die.uniform(2);
    expect(die.select([1], 'highest first').maxFace).toBe(2);
    expect(die.select([1], 'lowest first').minFace).toBe(1);
    expect(die.select([0], 'lowest first').maxFace).toBe(0);
    expect(die.select([3], 'lowest first').maxFace).toBe(0);
    expect(() => die.select([1.5], 'lowest first')).toThrow(
      'position selector must be an integer',
    );
    expect(Die.empty().select([1], 'lowest first').isEmpty).toBe(true);
    const pool = die.roll(3, 'lowest first');
    expect(pool.select([1, 2], 'lowest first').totalWeight).toBeGreaterThan(0n);
  });

  it('validates roll counts and enumeration edges', () => {
    const die = Die.uniform(2);
    expect(() => die.roll(-1, 'lowest first')).toThrow(
      'A die count must be a non-negative integer',
    );
    expect(() => die.roll(1.5, 'lowest first')).toThrow(
      'A die count must be a non-negative integer',
    );
    expect(die.roll(0, 'lowest first').maxFace).toBe(0);
    expect(enumerateRolls(die, 0, 'lowest first')).toEqual([
      { values: [], weight: 1n },
    ]);
    expect(enumerateRolls(Die.empty(), 1, 'lowest first')).toEqual([]);
  });
});

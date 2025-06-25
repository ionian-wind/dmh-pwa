import { describe, it, expect } from 'vitest';
import { BagOfDice } from '../index';
import { dicePlugin } from '../plugins/dice';
import { rollQueriesPlugin } from '../plugins/roll-queries';

// Deterministic RNG for testing
const fakeRng = (() => {
  let i = 0;
  const seq = [0.1, 0.5, 0.9, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.0];
  return () => {
    const v = seq[i % seq.length];
    i++;
    return v;
  };
})();

const engine = new BagOfDice({ plugins: [dicePlugin, rollQueriesPlugin], rng: fakeRng });

describe('dice + arithmetic + roll-queries integration', () => {
  describe('parse', () => {
    it('parses 1d6+?{Bonus|2}', () => {
      const ast = engine.parse('1d6+?{Bonus|2}');
      expect(ast).toEqual({
        type: 'Add',
        left: {
          type: 'Dice',
          count: 1,
          sides: 6,
          fudge: null,
          custom: null,
          plugin: 'dice',
        },
        right: {
          type: 'RollQuery',
          prompt: 'Bonus',
          options: [
            { id: expect.any(String), label: '2', value: '2' },
          ],
          plugin: 'roll-queries',
        },
        plugin: 'arithmetic',
      });
    });
    it('parses 2d6+?{Prompt}', () => {
      const ast = engine.parse('2d6+?{Prompt}');
      expect(ast).toEqual({
        type: 'Add',
        left: {
          type: 'Dice',
          count: 2,
          sides: 6,
          fudge: null,
          custom: null,
          plugin: 'dice',
        },
        right: {
          type: 'RollQuery',
          prompt: 'Prompt',
          options: [],
          plugin: 'roll-queries',
        },
        plugin: 'arithmetic',
      });
    });
    it('parses 1d6+?{Prompt|A|B}', () => {
      const ast = engine.parse('1d6+?{Prompt|A|B}');
      expect(ast).toEqual({
        type: 'Add',
        left: {
          type: 'Dice',
          count: 1,
          sides: 6,
          fudge: null,
          custom: null,
          plugin: 'dice',
        },
        right: {
          type: 'RollQuery',
          prompt: 'Prompt',
          options: [
            { id: expect.any(String), label: 'A', value: 'A' },
            { id: expect.any(String), label: 'B', value: 'B' },
          ],
          plugin: 'roll-queries',
        },
        plugin: 'arithmetic',
      });
    });
    it('parses 1d6+?{Prompt|A, 1|B, 2}', () => {
      const ast = engine.parse('1d6+?{Prompt|A, 1|B, 2}');
      expect(ast).toEqual({
        type: 'Add',
        left: {
          type: 'Dice',
          count: 1,
          sides: 6,
          fudge: null,
          custom: null,
          plugin: 'dice',
        },
        right: {
          type: 'RollQuery',
          prompt: 'Prompt',
          options: [
            { id: expect.any(String), label: 'A', value: '1' },
            { id: expect.any(String), label: 'B', value: '2' },
          ],
          plugin: 'roll-queries',
        },
        plugin: 'arithmetic',
      });
    });
  });

  describe('evaluate', () => {
    it('evaluates 1d6+?{Bonus|2}', () => {
      const ast = engine.parse('1d6+?{Bonus|2}');
      const queryId = ast.right.options[0].id;
      const result = engine.evaluate(ast, { queries: { [queryId]: '2' } });
      expect(result).toEqual({
        result: 4,
        warnings: [],
      });
    });
    it('evaluates 2d6+?{Prompt}', () => {
      const ast = engine.parse('2d6+?{Prompt}');
      const result = engine.evaluate(ast, { queries: { } });
      // Should throw or return error, but for this test, assume empty string is invalid and result is NaN
      expect(result).toEqual({
        result: NaN,
        warnings: [],
      });
    });
    it('evaluates 1d6+?{Prompt|A|B}', () => {
      const ast = engine.parse('1d6+?{Prompt|A|B}');
      const queryId = ast.right.options[1].id;
      const result = engine.evaluate(ast, { queries: { [queryId]: 'B' } });
      expect(result).toEqual({
        result: NaN,
        warnings: [],
      });
    });
    it('evaluates 1d6+?{Prompt|A, 1|B, 2}', () => {
      const ast = engine.parse('1d6+?{Prompt|A, 1|B, 2}');
      const queryId = ast.right.options[1].id;
      const result = engine.evaluate(ast, { queries: { [queryId]: '2' } });
      expect(result).toEqual({
        result: 4,
        warnings: [],
      });
    });
  });
}); 
import { describe, it, expect } from 'vitest';
import { BagOfDice } from '../index';
import { dicePlugin } from '../plugins/dice';

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

const engine = new BagOfDice({ plugins: [dicePlugin], rng: fakeRng });

describe('dice + arithmetic integration', () => {
  describe('parse', () => {
    it('parses 3d6', () => {
      const ast = engine.parse('3d6');
      expect(ast).toEqual({
        type: 'Dice',
        count: 3,
        sides: 6,
        fudge: null,
        custom: null,
        plugin: 'dice',
      });
    });
    it('parses d8', () => {
      const ast = engine.parse('d8');
      expect(ast).toEqual({
        type: 'Dice',
        count: 1,
        sides: 8,
        fudge: null,
        custom: null,
        plugin: 'dice',
      });
    });
    it('parses d%+5', () => {
      const ast = engine.parse('d%+5');
      expect(ast).toEqual({
        type: 'Add',
        left: {
          type: 'Dice',
          count: 1,
          sides: 100,
          fudge: null,
          custom: null,
          plugin: 'dice',
        },
        right: {
          type: 'NumberLiteral',
          value: 5,
          plugin: 'arithmetic',
        },
        plugin: 'arithmetic',
      });
    });
    it('parses 1d6+1d4', () => {
      const ast = engine.parse('1d6+1d4');
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
          type: 'Dice',
          count: 1,
          sides: 4,
          fudge: null,
          custom: null,
          plugin: 'dice',
        },
        plugin: 'arithmetic',
      });
    });
    it('parses (1d4+2)*2', () => {
      const ast = engine.parse('(1d4+2)*2');
      expect(ast).toEqual({
        type: 'Mul',
        left: {
          type: 'Add',
          left: {
            type: 'Dice',
            count: 1,
            sides: 4,
            fudge: null,
            custom: null,
            plugin: 'dice',
          },
          right: {
            type: 'NumberLiteral',
            value: 2,
            plugin: 'arithmetic',
          },
          plugin: 'arithmetic',
        },
        right: {
          type: 'NumberLiteral',
          value: 2,
          plugin: 'arithmetic',
        },
        plugin: 'arithmetic',
      });
    });
    it('parses 2d6+3', () => {
      const ast = engine.parse('2d6+3');
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
          type: 'NumberLiteral',
          value: 3,
          plugin: 'arithmetic',
        },
        plugin: 'arithmetic',
      });
    });
    it('parses 2d6+1d4', () => {
      const ast = engine.parse('2d6+1d4');
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
          type: 'Dice',
          count: 1,
          sides: 4,
          fudge: null,
          custom: null,
          plugin: 'dice',
        },
        plugin: 'arithmetic',
      });
    });
    it('parses round(1d6/2)', () => {
      const ast = engine.parse('round(1d6/2)');
      expect(ast).toEqual({
        type: 'Round',
        arg: {
          type: 'Div',
          left: {
            type: 'Dice',
            count: 1,
            sides: 6,
            fudge: null,
            custom: null,
            plugin: 'dice',
          },
          right: {
            type: 'NumberLiteral',
            value: 2,
            plugin: 'arithmetic',
          },
          plugin: 'arithmetic',
        },
        plugin: 'arithmetic',
      });
    });
  });

  describe('evaluate', () => {
    it('evaluates 3d6', () => {
      const ast = engine.parse('3d6');
      const result = engine.evaluate(ast);
      expect(result).toEqual({
        result: [2, 4, 6],
        warnings: [],
      });
    });
    it('evaluates d8', () => {
      const ast = engine.parse('d8');
      const result = engine.evaluate(ast);
      expect(result).toEqual({
        result: [1],
        warnings: [],
      });
    });
    it('evaluates d%+5', () => {
      const ast = engine.parse('d%+5');
      const result = engine.evaluate(ast);
      expect(result).toEqual({
        result: 15,
        warnings: [],
      });
    });
    it('evaluates 1d6+1d4', () => {
      const ast = engine.parse('1d6+1d4');
      const result = engine.evaluate(ast);
      expect(result).toEqual({
        result: 6,
        warnings: [],
      });
    });
    it('evaluates (1d4+2)*2', () => {
      const ast = engine.parse('(1d4+2)*2');
      const result = engine.evaluate(ast);
      expect(result).toEqual({
        result: 8,
        warnings: [],
      });
    });
    it('evaluates 2d6+3', () => {
      const ast = engine.parse('2d6+3');
      const result = engine.evaluate(ast);
      expect(result).toEqual({
        result: 13,
        warnings: [],
      });
    });
    it('evaluates 2d6+1d4', () => {
      const ast = engine.parse('2d6+1d4');
      const result = engine.evaluate(ast);
      expect(result).toEqual({
        result: 12,
        warnings: [],
      });
    });
    it('evaluates round(1d6/2)', () => {
      const ast = engine.parse('round(1d6/2)');
      const result = engine.evaluate(ast);
      expect(result).toEqual({
        result: 1,
        warnings: [],
      });
    });
  });
}); 
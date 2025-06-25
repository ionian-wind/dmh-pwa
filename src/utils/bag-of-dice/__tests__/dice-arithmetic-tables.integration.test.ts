import { describe, it, expect } from 'vitest';
import { BagOfDice } from '../index';
import { dicePlugin } from '../plugins/dice';
import { tablesPlugin } from '../plugins/tables';

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

const engine = new BagOfDice({ plugins: [dicePlugin, tablesPlugin], rng: fakeRng });
const tables = {
  loot: ['Sword', 'Shield', 'Potion'],
  treasure: ['Gold', 'Gem', 'Scroll'],
};

describe('dice + arithmetic + tables integration', () => {
  describe('parse', () => {
    it('parses 1t[loot]', () => {
      const ast = engine.parse('1t[loot]');
      expect(ast).toEqual({
        type: 'TableRoll',
        count: 1,
        table: 'loot',
        plugin: 'tables',
      });
    });
    it('parses 2t[treasure]+3', () => {
      const ast = engine.parse('2t[treasure]+3');
      expect(ast).toEqual({
        type: 'Add',
        left: {
          type: 'TableRoll',
          count: 2,
          table: 'treasure',
          plugin: 'tables',
        },
        right: {
          type: 'NumberLiteral',
          value: 3,
          plugin: 'arithmetic',
        },
        plugin: 'arithmetic',
      });
    });
    it('parses 1d6+1t[loot]', () => {
      const ast = engine.parse('1d6+1t[loot]');
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
          type: 'TableRoll',
          count: 1,
          table: 'loot',
          plugin: 'tables',
        },
        plugin: 'arithmetic',
      });
    });
    it('parses 1t[loot]+2d6', () => {
      const ast = engine.parse('1t[loot]+2d6');
      expect(ast).toEqual({
        type: 'Add',
        left: {
          type: 'TableRoll',
          count: 1,
          table: 'loot',
          plugin: 'tables',
        },
        right: {
          type: 'Dice',
          count: 2,
          sides: 6,
          fudge: null,
          custom: null,
          plugin: 'dice',
        },
        plugin: 'arithmetic',
      });
    });
    it('parses (1t[loot]+2)*2', () => {
      const ast = engine.parse('(1t[loot]+2)*2');
      expect(ast).toEqual({
        type: 'Mul',
        left: {
          type: 'Add',
          left: {
            type: 'TableRoll',
            count: 1,
            table: 'loot',
            plugin: 'tables',
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
  });

  describe('evaluate', () => {
    it('evaluates 1t[loot]', () => {
      const ast = engine.parse('1t[loot]');
      const result = engine.evaluate(ast, { tables });
      expect(result).toEqual({
        result: 'Sword',
        warnings: [],
      });
    });
    it('evaluates 2t[treasure]+3', () => {
      const ast = engine.parse('2t[treasure]+3');
      const result = engine.evaluate(ast, { tables });
      expect(result).toEqual({
        result: 'GoldGem3',
        warnings: [],
      });
    });
    it('evaluates 1d6+1t[loot]', () => {
      const ast = engine.parse('1d6+1t[loot]');
      const result = engine.evaluate(ast, { tables });
      expect(result).toEqual({
        result: '2Sword',
        warnings: [],
      });
    });
    it('evaluates 1t[loot]+2d6', () => {
      const ast = engine.parse('1t[loot]+2d6');
      const result = engine.evaluate(ast, { tables });
      expect(result).toEqual({
        result: 'Sword10',
        warnings: [],
      });
    });
    it('evaluates (1t[loot]+2)*2', () => {
      const ast = engine.parse('(1t[loot]+2)*2');
      const result = engine.evaluate(ast, { tables });
      expect(result).toEqual({
        result: NaN,
        warnings: [],
      });
    });
  });
}); 
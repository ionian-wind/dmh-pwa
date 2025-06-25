import { describe, it, expect } from 'vitest';
import { BagOfDice } from '../index';
import { dicePlugin } from '../plugins/dice';
import { tablesPlugin } from '../plugins/tables';
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

const engine = new BagOfDice({ plugins: [dicePlugin, tablesPlugin, rollQueriesPlugin], rng: fakeRng });
const tables = {
  loot: ['Sword', 'Shield', 'Potion'],
  treasure: ['Gold', 'Gem', 'Scroll'],
};

describe('dice + arithmetic + roll-queries + tables integration', () => {
  describe('parse', () => {
    it('parses 1t[loot]+?{Bonus|2}', () => {
      const ast = engine.parse('1t[loot]+?{Bonus|2}');
      expect(ast).toEqual({
        type: 'Add',
        left: {
          type: 'TableRoll',
          count: 1,
          table: 'loot',
          plugin: 'tables',
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
    it('parses 2d6+?{Prompt}+1t[loot]', () => {
      const ast = engine.parse('2d6+?{Prompt}+1t[loot]');
      expect(ast).toEqual({
        type: 'Add',
        left: {
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
    it('parses 1d6+?{Prompt|A|B}+1t[treasure]', () => {
      const ast = engine.parse('1d6+?{Prompt|A|B}+1t[treasure]');
      expect(ast).toEqual({
        type: 'Add',
        left: {
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
        },
        right: {
          type: 'TableRoll',
          count: 1,
          table: 'treasure',
          plugin: 'tables',
        },
        plugin: 'arithmetic',
      });
    });
    it('parses (1t[loot]+?{Prompt|A, 1|B, 2})*2', () => {
      const ast = engine.parse('(1t[loot]+?{Prompt|A, 1|B, 2})*2');
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
            type: 'RollQuery',
            prompt: 'Prompt',
            options: [
              { id: expect.any(String), label: 'A', value: '1' },
              { id: expect.any(String), label: 'B', value: '2' },
            ],
            plugin: 'roll-queries',
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
    it('evaluates 1t[loot]+?{Bonus|2}', () => {
      const ast = engine.parse('1t[loot]+?{Bonus|2}');
      const queryId = ast.right.options[0].id;
      const result = engine.evaluate(ast, { tables, queries: { [queryId]: '2' } });
      expect(result).toEqual({
        result: 'Sword2',
        warnings: [],
      });
    });
    it('evaluates 2d6+?{Prompt}+1t[loot]', () => {
      const ast = engine.parse('2d6+?{Prompt}+1t[loot]');
      const result = engine.evaluate(ast, { tables, queries: {} });
      expect(result).toEqual({
        result: NaN,
        warnings: [],
      });
    });
    it('evaluates 1d6+?{Prompt|A|B}+1t[treasure]', () => {
      const ast = engine.parse('1d6+?{Prompt|A|B}+1t[treasure]');
      const queryId = ast.left.right.options[1].id;
      const result = engine.evaluate(ast, { tables, queries: { [queryId]: 'B' } });
      expect(result).toEqual({
        result: NaN,
        warnings: [],
      });
    });
    it('evaluates (1t[loot]+?{Prompt|A, 1|B, 2})*2', () => {
      const ast = engine.parse('(1t[loot]+?{Prompt|A, 1|B, 2})*2');
      const queryId = ast.left.right.options[1].id;
      const result = engine.evaluate(ast, { tables, queries: { [queryId]: '2' } });
      expect(result).toEqual({
        result: NaN,
        warnings: [],
      });
    });
  });
}); 
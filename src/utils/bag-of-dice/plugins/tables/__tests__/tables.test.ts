import { describe, it, expect, beforeEach } from 'vitest';
import { parseTableExpression } from '../parser';
import { cstToAst } from '../../../utils/cstAstConverter';
import { tableCstToAstHandlers } from '../converters';
import { evaluateTableRoll, TableEntry } from '../evaluator';
import { extractTables } from '../extract';

const fakeRng = (() => {
  let i = 0;
  const seq = [0.7, 0.2, 0.9, 0.4, 0.1, 0.5, 0.8, 0.3, 0.6, 0.0];
  return {
    next: () => {
      const v = seq[i % seq.length];
      i++;
      return v;
    },
    reset: () => { i = 0; }
  };
})();

describe('Tables Plugin', () => {
  describe('parsing', () => {
    function parseAndAst(expr: string) {
      const cst = parseTableExpression(expr);
      return cstToAst(cst, tableCstToAstHandlers);
    }

    it('parses 1t[loot]', () => {
      const ast = parseAndAst('1t[loot]');
      expect(ast).toEqual({
        type: 'TableRoll',
        count: 1,
        table: 'loot',
        plugin: 'tables',
      });
    });

    it('parses t[loot]', () => {
      const ast = parseAndAst('t[loot]');
      expect(ast).toEqual({
        type: 'TableRoll',
        count: null,
        table: 'loot',
        plugin: 'tables',
      });
    });

    it('parses 2t[magic_items]', () => {
      const ast = parseAndAst('2t[magic_items]');
      expect(ast).toEqual({
        type: 'TableRoll',
        count: 2,
        table: 'magic_items',
        plugin: 'tables',
      });
    });

    it('parses with whitespace', () => {
      const ast = parseAndAst('  3t[table_name]  ');
      expect(ast).toEqual({
        type: 'TableRoll',
        count: 3,
        table: 'table_name',
        plugin: 'tables',
      });
    });
  });

  describe('evaluation', () => {
    beforeEach(() => { fakeRng.reset(); });

    it('evaluates a simple table', () => {
      const ast = { type: 'TableRoll' as const, count: 1, table: 'loot', plugin: 'tables' as const };
      const tableData = { loot: ['Sword', 'Shield', 'Potion'] };
      const result = evaluateTableRoll(ast, fakeRng.next, tableData);
      expect(result.results.length).toBe(1);
      expect(['Potion']).toContain(result.results[0]); // 0.7*3 = 2.1 → index 2
    });

    it('evaluates a weighted table', () => {
      const ast = { type: 'TableRoll' as const, count: 1, table: 'loot', plugin: 'tables' as const };
      const tableData = { loot: [
        { value: 'Sword', weight: 1 },
        { value: 'Shield', weight: 1 },
        { value: 'Potion', weight: 2 },
      ] };
      const result = evaluateTableRoll(ast, fakeRng.next, tableData);
      expect(result.results[0]).toBe('Potion');
    });

    it('evaluates a percent table', () => {
      fakeRng.reset();
      const ast = { type: 'TableRoll' as const, count: 1, table: 'loot', plugin: 'tables' as const };
      const tableData = { loot: [
        { value: 'Sword', percent: 50 },
        { value: 'Shield', percent: 30 },
        { value: 'Potion', percent: 20 },
      ] };
      const result = evaluateTableRoll(ast, fakeRng.next, tableData);
      expect(result.results[0]).toBe('Shield'); // 0.2*100 = 20, falls in Shield (50-80)
    });

    it('throws if percent and weight are mixed', () => {
      const ast = { type: 'TableRoll' as const, count: 1, table: 'loot', plugin: 'tables' as const };
      const tableData = { loot: [
        { value: 'Sword', percent: 50 },
        { value: 'Shield', weight: 1 },
      ] };
      expect(() => evaluateTableRoll(ast, fakeRng.next, tableData)).toThrow(/cannot mix percent and weight/);
    });

    it('throws if percent table does not sum to 100', () => {
      const ast = { type: 'TableRoll' as const, count: 1, table: 'loot', plugin: 'tables' as const };
      const tableData = { loot: [
        { value: 'Sword', percent: 40 },
        { value: 'Shield', percent: 30 },
      ] };
      expect(() => evaluateTableRoll(ast, fakeRng.next, tableData)).toThrow(/must sum to 100/);
    });

    it('throws if table is missing or empty', () => {
      const ast = { type: 'TableRoll' as const, count: 1, table: 'missing', plugin: 'tables' as const };
      expect(() => evaluateTableRoll(ast, fakeRng.next, {})).toThrow(/not found/);
      expect(() => evaluateTableRoll(ast, fakeRng.next, { missing: [] })).toThrow(/not found/);
    });
  });

  describe('extract', () => {
    it('extracts all table names from AST', () => {
      const ast = {
        type: 'Group',
        items: [
          { type: 'TableRoll', count: 2, table: 'loot', plugin: 'tables' },
          { type: 'TableRoll', count: 1, table: 'magic_items', plugin: 'tables' },
        ],
        plugin: 'tables',
      };
      const result = extractTables(ast);
      expect(result.length).toBe(2);
      expect(result).toContain('loot');
      expect(result).toContain('magic_items');
    });
  });
}); 
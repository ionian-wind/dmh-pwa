import { describe, it, expect } from 'vitest';
import { parseRollQueryExpression } from '../parser';
import { cstToAst } from '../../../utils/cstAstConverter';
import { rollQueriesCstToAstHandlers } from '../converters';
import { rollQueriesPlugin } from '../index';
import { evaluateRollQuery } from '../evaluator';
import { extractQuery } from '../extract';

describe('Roll Queries Plugin', () => {
  describe('parse', () => {
    function parseAndAst(expr: string) {
      const cst = parseRollQueryExpression(expr);
      return cstToAst(cst, rollQueriesCstToAstHandlers);
    }
    it('parses simple prompt', () => {
      const ast = parseAndAst('?{Bonus}');
      expect(ast).toEqual({
        type: 'RollQuery',
        prompt: 'Bonus',
        options: [],
        plugin: 'roll-queries',
      });
    });
    it('parses prompt with default', () => {
      const ast = parseAndAst('?{Bonus|0}');
      expect(ast.type).toBe('RollQuery');
      expect(ast.prompt).toBe('Bonus');
      expect(ast.options.length).toBe(1);
      expect(ast.options[0].label).toBe('0');
      expect(ast.options[0].value).toBe('0');
      expect(typeof ast.options[0].id).toBe('string');
      expect(ast.plugin).toBe('roll-queries');
    });
    it('parses prompt with options (pipe)', () => {
      const ast = parseAndAst('?{Weapon|Sword|Axe}');
      expect(ast.type).toBe('RollQuery');
      expect(ast.prompt).toBe('Weapon');
      expect(ast.options.length).toBe(2);
      expect(ast.options[0].label).toBe('Sword');
      expect(ast.options[0].value).toBe('Sword');
      expect(typeof ast.options[0].id).toBe('string');
      expect(ast.options[1].label).toBe('Axe');
      expect(ast.options[1].value).toBe('Axe');
      expect(typeof ast.options[1].id).toBe('string');
      expect(ast.plugin).toBe('roll-queries');
    });
    it('parses prompt with labeled options (comma)', () => {
      const ast = parseAndAst('?{Attack or Damage|Attack, 1d20+5|Damage, 1d8+3}');
      expect(ast.type).toBe('RollQuery');
      expect(ast.prompt).toBe('Attack or Damage');
      expect(ast.options.length).toBe(2);
      expect(ast.options[0].label).toBe('Attack');
      expect(ast.options[0].value).toBe('1d20+5');
      expect(typeof ast.options[0].id).toBe('string');
      expect(ast.options[1].label).toBe('Damage');
      expect(ast.options[1].value).toBe('1d8+3');
      expect(typeof ast.options[1].id).toBe('string');
      expect(ast.plugin).toBe('roll-queries');
    });
    it('parses prompt with escaped pipe and comma', () => {
      const ast = parseAndAst('?{Prompt|Option\\|A|Option\\,B}');
      expect(ast.type).toBe('RollQuery');
      expect(ast.prompt).toBe('Prompt');
      expect(ast.options.length).toBe(2);
      expect(ast.options[0].label).toBe('Option|A');
      expect(ast.options[0].value).toBe('Option|A');
      expect(typeof ast.options[0].id).toBe('string');
      expect(ast.options[1].label).toBe('Option,B');
      expect(ast.options[1].value).toBe('Option,B');
      expect(typeof ast.options[1].id).toBe('string');
      expect(ast.plugin).toBe('roll-queries');
    });
    it('parses prompt with expressions as values', () => {
      const ast = parseAndAst('?{Loot|Gold, 2d6*10|Magic Item, 1t[magic-items]}');
      expect(ast.type).toBe('RollQuery');
      expect(ast.prompt).toBe('Loot');
      expect(ast.options.length).toBe(2);
      expect(ast.options[0].label).toBe('Gold');
      expect(ast.options[0].value).toBe('2d6*10');
      expect(typeof ast.options[0].id).toBe('string');
      expect(ast.options[1].label).toBe('Magic Item');
      expect(ast.options[1].value).toBe('1t[magic-items]');
      expect(typeof ast.options[1].id).toBe('string');
      expect(ast.plugin).toBe('roll-queries');
    });
  });

  describe('extract', () => {
    function parseAndAst(expr: string) {
      const cst = parseRollQueryExpression(expr);
      return cstToAst(cst, rollQueriesCstToAstHandlers);
    }
    it('extract > extracts queries from AST', () => {
      const ast = parseAndAst('?{A|1|2}');
      const queries = extractQuery(ast);
      expect(queries.length).toBe(1);
      expect(queries[0].prompt).toBe('A');
      expect(typeof queries[0].options[0].id).toBe('string');
      expect(typeof queries[0].options[1].id).toBe('string');
    });
  });

  describe('evaluate', () => {
    function parseAndAst(expr: string) {
      const cst = parseRollQueryExpression(expr);
      return cstToAst(cst, rollQueriesCstToAstHandlers);
    }

    it('returns user input if provided (by id)', () => {
      const ast = parseAndAst('?{Weapon|Sword|Axe}');
      const id = ast.options[1].id; // Axe
      const val = evaluateRollQuery(ast, id);
      expect(val).toBe('Axe');
    });
    it('throws if no input and multiple options', () => {
      const ast = parseAndAst('?{Weapon|Sword|Axe}');
      expect(() => evaluateRollQuery(ast)).toThrow('No user input provided for roll query with multiple options');
    });
    it('throws if raw input provided for multiple options', () => {
      const ast = parseAndAst('?{Weapon|Sword|Axe}');
      expect(() => evaluateRollQuery(ast, 'Axe')).toThrow('Invalid user input for roll query with multiple options: must provide option id');
    });
    it('returns default if no input', () => {
      const ast = parseAndAst('?{Bonus|0}');
      const val = evaluateRollQuery(ast);
      expect(val).toBe('0');
    });
    it('returns default if input provided for single option', () => {
      const ast = parseAndAst('?{Bonus|0}');
      const val = evaluateRollQuery(ast, 'ignored');
      expect(val).toBe('0');
    });
    it('returns raw input if no options', () => {
      const ast = parseAndAst('?{Prompt}');
      const val = evaluateRollQuery(ast, 'raw');
      expect(val).toBe('raw');
    });
    it('throws if no input for open-ended query', () => {
      const ast = parseAndAst('?{Prompt}');
      expect(() => evaluateRollQuery(ast)).toThrow('No user input provided for open-ended roll query');
    });
    it('throws if empty input for open-ended query', () => {
      const ast = parseAndAst('?{Prompt}');
      expect(() => evaluateRollQuery(ast, '')).toThrow('No user input provided for open-ended roll query');
    });
    it('throws on invalid node', () => {
      expect(() => evaluateRollQuery({}, 'foo')).toThrow('Invalid node: not a RollQuery');
    });
  });
}); 
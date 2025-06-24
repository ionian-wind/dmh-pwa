import { describe, it, expect, beforeAll } from 'vitest';
import { DiceRollerCore } from '../core';
import { macrosPlugin } from '../plugins/macros';
import { dicePlugin } from '../plugins/dice/dicePlugin';
import { inlineRollsPlugin } from '../plugins/inline-rolls';
import { rollReferencesPlugin } from '../plugins/roll-references';

describe('Dice Roller Integrations', () => {
  beforeAll(async () => {
    // Clear plugins before tests
    (DiceRollerCore as any).plugins.length = 0;
    
    // Register dice and macros plugins
    DiceRollerCore.registerPlugin(dicePlugin);
    DiceRollerCore.registerPlugin(macrosPlugin);
    DiceRollerCore.registerPlugin(inlineRollsPlugin);
    DiceRollerCore.registerPlugin(rollReferencesPlugin);
  });

  describe('Dice and Macros', () => {
    it('should handle nested macro evaluation', async () => {
      const context = {
        macroMap: {
          'a': { type: 'dice', count: 1, sides: 6, modifiers: [] },
          'b': { type: 'macro', name: 'a' },
        },
      } as any;
      const ast = DiceRollerCore.parseInput('1d20 + #b');
      const result = DiceRollerCore.evaluate(ast, context);
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeLessThanOrEqual(26);
    });
  });

  describe('Inline Rolls', () => {
    it('should parse and evaluate a simple inline roll in an expression', () => {
      const ast = DiceRollerCore.parseInput('1 + [[2+3]]');
      const result = DiceRollerCore.evaluate(ast, {});
      expect(result.total).toBe(6); // 1 + 5
    });
  
    it('should evaluate nested inline rolls', () => {
      const ast = DiceRollerCore.parseInput('1 + [[2 + [[3+4]]]]');
      const result = DiceRollerCore.evaluate(ast, {});
      expect(result.total).toBe(1 + (2 + (3 + 4))); // 1 + 9 = 10
    });
  
    it('should allow $[[N]] to reference inline roll results', () => {
      // Simulate: [[2+3]] + $[[0]]
      // $[[0]] should reference the result of the first inline roll (5)
      const ast = DiceRollerCore.parseInput('[[2+3]] + $[[0]]');
      const result = DiceRollerCore.evaluate(ast, {});
      expect(result.total).toBe(10); // 5 + 5
    });
  
    it('should throw for $[[N]] referencing non-existent inline roll', () => {
      const ast = DiceRollerCore.parseInput('$[[99]]');
      expect(() => DiceRollerCore.evaluate(ast, {})).toThrow("Referenced roll '99' not found");
    });
  });

  describe('Dice and Math', () => {
    it('should evaluate complex arithmetic', () => {
      const ast = DiceRollerCore.parseInput('2 * 3 + 4 / 2');
      const result = DiceRollerCore.evaluate(ast, {});
      expect(result.total).toBe(8);
    });

    it('should evaluate exponentiation', () => {
      const ast = DiceRollerCore.parseInput('2**3');
      const result = DiceRollerCore.evaluate(ast, {});
      expect(result.total).toBe(8);
    });

    it('should evaluate exponentiation with other operators', () => {
      const ast = DiceRollerCore.parseInput('2**3 + 1');
      const result = DiceRollerCore.evaluate(ast, {});
      expect(result.total).toBe(9);
    });

    it('should evaluate math functions', () => {
      const ast = DiceRollerCore.parseInput('floor(2.9) + ceil(2.1) + round(2.5) + abs(-5)');
      const result = DiceRollerCore.evaluate(ast, {});
      expect(result.total).toBe(2 + 3 + 3 + 5);
    });
  });
}); 
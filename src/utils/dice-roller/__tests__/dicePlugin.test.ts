// Jest test file for dice plugin
// @jest-environment node

import { describe, it, expect } from 'vitest';
import { parseDiceAst, evaluateDiceNode, dicePlugin } from '../plugins/dice/dicePlugin';
import type { DiceAstNode } from '../plugins/dice/types';

describe('Dice Plugin', () => {
  describe('Parsing', () => {
    it('should parse a simple dice expression', () => {
      const ast = parseDiceAst('2d6');
      expect(ast).toEqual({
        type: 'dice',
        count: 2,
        sides: 6,
        modifiers: []
      });
    });

    it('should parse dice with modifiers', () => {
      const ast = parseDiceAst('4d6kh3');
      expect(ast).toEqual({
        type: 'dice',
        count: 4,
        sides: 6,
        modifiers: [{ type: 'kh', value: '3' }]
      });
    });

    it('should parse arithmetic expressions', () => {
      const ast = parseDiceAst('2d6+3');
      expect(ast).toEqual({
        type: 'arithmetic',
        op: '+',
        left: {
          type: 'dice',
          count: 2,
          sides: 6,
          modifiers: []
        },
        right: {
          type: 'number',
          value: 3
        }
      });
    });

    it('should parse complex expressions', () => {
      const ast = parseDiceAst('(2d6+3)*2');
      expect(ast).toEqual({
        type: 'arithmetic',
        op: '*',
        left: {
          type: 'arithmetic',
          op: '+',
          left: {
            type: 'dice',
            count: 2,
            sides: 6,
            modifiers: []
          },
          right: {
            type: 'number',
            value: 3
          }
        },
        right: {
          type: 'number',
          value: 2
        }
      });
    });
  });

  describe('Evaluation', () => {
    it('should evaluate a simple dice expression', () => {
      const ast = parseDiceAst('2d6');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.rolls).toHaveLength(2);
      expect(result.rolls.every(roll => roll >= 1 && roll <= 6)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeLessThanOrEqual(12);
      expect(result.warnings).toEqual([]);
    });

    it('should evaluate a number-only expression', () => {
      const ast = parseDiceAst('5');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.rolls).toEqual([]);
      expect(result.total).toBe(5);
      expect(result.warnings).toEqual([]);
    });

    it('should evaluate arithmetic expressions', () => {
      const ast = parseDiceAst('2d6+3');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.rolls).toHaveLength(2);
      expect(result.total).toBeGreaterThanOrEqual(5); // 2+3
      expect(result.total).toBeLessThanOrEqual(15); // 12+3
    });

    it('should evaluate complex arithmetic', () => {
      const ast = parseDiceAst('(2d6+3)*2');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.rolls).toHaveLength(2);
      expect(result.total).toBeGreaterThanOrEqual(10); // (2+3)*2
      expect(result.total).toBeLessThanOrEqual(30); // (12+3)*2
    });
  });

  describe('Dice Modifiers', () => {
    it('should apply keep highest modifier', () => {
      const ast = parseDiceAst('4d6kh3');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.rolls).toHaveLength(3); // Should keep only 3 dice
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeLessThanOrEqual(18);
    });

    it('should apply keep lowest modifier', () => {
      const ast = parseDiceAst('4d6kl2');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.rolls).toHaveLength(2); // Should keep only 2 dice
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeLessThanOrEqual(12);
    });

    it('should apply drop highest modifier', () => {
      const ast = parseDiceAst('4d6dh1');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.rolls).toHaveLength(3); // Should drop 1 die
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeLessThanOrEqual(18);
    });

    it('should apply drop lowest modifier', () => {
      const ast = parseDiceAst('4d6dl1');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.rolls).toHaveLength(3); // Should drop 1 die
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeLessThanOrEqual(18);
    });

    it('should apply explosion modifier', () => {
      const ast = parseDiceAst('1d6!');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.rolls.length).toBeGreaterThanOrEqual(1);
      expect(result.total).toBeGreaterThanOrEqual(1);
      // If we rolled a 6, we should have more than 1 roll
      if (result.rolls.includes(6)) {
        expect(result.rolls.length).toBeGreaterThan(1);
      }
    });

    it('should apply minimum modifier', () => {
      const ast = parseDiceAst('3d6mi3');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.rolls).toHaveLength(3);
      expect(result.rolls.every(roll => roll >= 3)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(9); // 3*3
    });

    it('should apply maximum modifier', () => {
      const ast = parseDiceAst('3d6ma4');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.rolls).toHaveLength(3);
      expect(result.rolls.every(roll => roll <= 4)).toBe(true);
      expect(result.total).toBeLessThanOrEqual(12); // 3*4
    });

    it('should apply sorting modifiers', () => {
      const ast = parseDiceAst('4d6sa');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.rolls).toHaveLength(4);
      // Check if sorted ascending
      for (let i = 1; i < result.rolls.length; i++) {
        expect(result.rolls[i]).toBeGreaterThanOrEqual(result.rolls[i - 1]);
      }
    });
  });

  describe('Math Functions', () => {
    it('should evaluate floor function', () => {
      const ast = parseDiceAst('floor(3.7)');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.total).toBe(3);
    });

    it('should evaluate ceil function', () => {
      const ast = parseDiceAst('ceil(3.2)');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.total).toBe(4);
    });

    it('should evaluate round function', () => {
      const ast = parseDiceAst('round(3.5)');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.total).toBe(4);
    });

    it('should evaluate abs function', () => {
      const ast = parseDiceAst('abs(-5)');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.total).toBe(5);
    });

    it('should evaluate min function', () => {
      const ast = parseDiceAst('min(5, 3, 7)');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.total).toBe(3);
    });

    it('should evaluate max function', () => {
      const ast = parseDiceAst('max(5, 3, 7)');
      const result = evaluateDiceNode(ast, {});
      
      expect(result.total).toBe(7);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for division by zero', () => {
      const ast = parseDiceAst('5/0');
      expect(() => evaluateDiceNode(ast, {})).toThrow('Division by zero');
    });

    it('should throw error for modulo by zero', () => {
      const ast = parseDiceAst('5%0');
      expect(() => evaluateDiceNode(ast, {})).toThrow('Modulo by zero');
    });

    it('should throw error for invalid dice count', () => {
      const ast = parseDiceAst('0d6');
      expect(() => evaluateDiceNode(ast, {})).toThrow('Dice count must be positive');
    });

    it('should throw error for invalid dice sides', () => {
      const ast = parseDiceAst('2d0');
      expect(() => evaluateDiceNode(ast, {})).toThrow('Dice sides must be positive');
    });
  });

  describe('Plugin Interface', () => {
    it('should have correct plugin structure', () => {
      expect(dicePlugin.name).toBe('dice');
      expect(typeof dicePlugin.parse).toBe('function');
      expect(typeof dicePlugin.evaluate).toBe('function');
      expect(typeof dicePlugin.register).toBe('function');
    });

    it('should parse through plugin interface', () => {
      const ast = dicePlugin.parse?.('2d6');
      expect(ast?.type).toBe('dice');
      expect((ast as any)?.count).toBe(2);
      expect((ast as any)?.sides).toBe(6);
    });

    it('should evaluate through plugin interface', () => {
      const ast = dicePlugin.parse?.('2d6');
      const result = dicePlugin.evaluate?.(ast!, {});
      
      expect(result?.total).toBeGreaterThanOrEqual(2);
      expect(result?.total).toBeLessThanOrEqual(12);
      expect(Array.isArray(result?.rolls)).toBe(true);
    });
  });
}); 
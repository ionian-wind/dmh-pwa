// Jest test file for dice plugin
// @jest-environment node

import { describe, it, expect, vi, type Mock } from 'vitest';
import { parseDiceAst, evaluateDiceNode, dicePlugin } from '../dicePlugin';
import type {
  ASTNode,
  EvaluationContext,
  EvaluationResult,
} from '../../../core';
import { evaluate } from '../../../core';

// Mock the core evaluate function
vi.mock('../../../core', () => ({
  evaluate: vi.fn(
    (ast: ASTNode, context: EvaluationContext): EvaluationResult => {
      if (ast.type === 'number') {
        return {
          total: (ast as any).value,
          rolls: [],
          warnings: [],
          details: {},
        };
      }
      // Fallback for other types
      return { total: 0, rolls: [], warnings: [], details: {} };
    },
  ),
}));

describe('Advanced Dice Features', () => {
  it('should parse dice with labels', () => {
    const ast = parseDiceAst('2d6[fire]');
    expect(ast).toEqual({
      type: 'dice',
      count: 2,
      sides: 6,
      modifiers: [],
      label: 'fire',
    });
  });

  it('should parse custom dice', () => {
    const ast = parseDiceAst('d[1,2,3,5,8]');
    expect(ast).toEqual({
      type: 'custom-dice',
      count: 1,
      sides: [1, 2, 3, 5, 8],
      modifiers: [],
    });
  });

  it('should parse grouped rolls', () => {
    const ast = parseDiceAst('{1d6, 2d8+1, 1d4-1}');
    expect(ast.type).toBe('grouped-roll');
    expect((ast as any).expressions).toHaveLength(3);
  });

  it('should evaluate dice with labels', () => {
    const ast = parseDiceAst('2d6[fire]');
    const result = evaluateDiceNode(ast, {});

    expect(result.rolls).toHaveLength(2);
    expect(result.rolls!.every((roll: number) => roll >= 1 && roll <= 6)).toBe(
      true,
    );
    expect((result.details as any).label).toBe('fire');
  });

  it('should evaluate custom dice', () => {
    const ast = parseDiceAst('2d[1,2,3,5,8]');
    const result = evaluateDiceNode(ast, {});

    expect(result.rolls).toHaveLength(2);
    expect(
      result.rolls!.every((roll: number) => [1, 2, 3, 5, 8].includes(roll)),
    ).toBe(true);
    expect((result.details as any).sides).toEqual([1, 2, 3, 5, 8]);
  });

  it('should evaluate grouped rolls', () => {
    // This test now requires mocking the core 'evaluate' for child expressions
    const ast = parseDiceAst('{1d6, 1d4}');
    (evaluate as Mock).mockImplementation((node: ASTNode) => {
      if (node.type === 'dice' && node.sides === 6)
        return { total: 4, rolls: [4], warnings: [] };
      if (node.type === 'dice' && node.sides === 4)
        return { total: 3, rolls: [3], warnings: [] };
      return { total: 0, rolls: [], warnings: [] };
    });

    const result = dicePlugin.evaluate!(ast, {});
    expect(result!.total).toBe(7); // 4 + 3
    expect(result!.rolls).toEqual([4, 3]);
  });

  it('should apply modifiers to grouped rolls', () => {
    const ast = parseDiceAst('{1d6, 1d4}kh1');
    (evaluate as Mock).mockImplementation((node: ASTNode) => {
      if (node.type === 'dice' && node.sides === 6)
        return { total: 4, rolls: [4], warnings: [] };
      if (node.type === 'dice' && node.sides === 4)
        return { total: 3, rolls: [3], warnings: [] };
      return { total: 0, rolls: [], warnings: [] };
    });

    const result = dicePlugin.evaluate!(ast, {});
    expect(result!.total).toBe(4); // Keep highest of [4, 3]
  });

  it('should throw error for empty custom dice', () => {
    const ast = parseDiceAst('d[]');
    expect(() => evaluateDiceNode(ast, {})).toThrow(
      'Custom dice must have at least one side',
    );
  });

  it('should evaluate complex arithmetic', () => {
    const ast = parseDiceAst('2 * 3 + 4 / 2');
    const result = evaluateDiceNode(ast, {});
    expect(result.total).toBe(8); // 2 * 3 + 4 / 2 = 6 + 2 = 8
  });

  it('should evaluate exponentiation', () => {
    const ast = parseDiceAst('2**3');
    const result = evaluateDiceNode(ast, {});
    expect(result.total).toBe(8); // 2^3 = 8
  });

  it('should evaluate exponentiation with other operators', () => {
    const ast = parseDiceAst('2**3 + 1');
    const result = evaluateDiceNode(ast, {});
    expect(result.total).toBe(9); // 2^3 + 1 = 8 + 1 = 9
  });

  it('should parse basic Fudge dice', () => {
    const ast = parseDiceAst('dF');
    expect(ast).toEqual({
      type: 'fudge-dice',
      count: 1,
      variant: 'basic',
      modifiers: [],
    });
  });

  it('should parse Fudge dice variants', () => {
    const ast1 = parseDiceAst('dF.1');
    expect(ast1).toEqual({
      type: 'fudge-dice',
      count: 1,
      variant: '1',
      modifiers: [],
    });

    const ast2 = parseDiceAst('dF.2');
    expect(ast2).toEqual({
      type: 'fudge-dice',
      count: 1,
      variant: '2',
      modifiers: [],
    });

    const ast3 = parseDiceAst('dF.3');
    expect(ast3).toEqual({
      type: 'fudge-dice',
      count: 1,
      variant: '3',
      modifiers: [],
    });
  });

  it('should evaluate basic Fudge dice', () => {
    const ast = parseDiceAst('4dF');
    const result = evaluateDiceNode(ast, {});

    expect(result.rolls).toHaveLength(4);
    expect(result.rolls!.every((roll: number) => roll >= -1 && roll <= 1)).toBe(
      true,
    );
    expect((result.details as any).variant).toBe('basic');
  });

  it('should evaluate Fudge dice variants', () => {
    const ast1 = parseDiceAst('dF.1');
    const result1 = evaluateDiceNode(ast1, {});
    expect(result1.rolls).toHaveLength(1);
    expect(result1.rolls![0]).toBeGreaterThanOrEqual(-1);
    expect(result1.rolls![0]).toBeLessThanOrEqual(0);
    expect((result1.details as any).variant).toBe('1');

    const ast3 = parseDiceAst('dF.3');
    const result3 = evaluateDiceNode(ast3, {});
    expect(result3.rolls).toHaveLength(1);
    expect(result3.rolls![0]).toBeGreaterThanOrEqual(-1);
    expect(result3.rolls![0]).toBeLessThanOrEqual(1);
    expect((result3.details as any).variant).toBe('3');
  });

  it('should parse custom drop/keep syntax', () => {
    const ast1 = parseDiceAst('4d6k>3');
    expect(ast1).toEqual({
      type: 'dice',
      count: 4,
      sides: 6,
      modifiers: [{ type: 'k>', value: '3' }],
    });

    const ast2 = parseDiceAst('4d6k<4');
    expect(ast2).toEqual({
      type: 'dice',
      count: 4,
      sides: 6,
      modifiers: [{ type: 'k<', value: '4' }],
    });
  });

  it('should evaluate custom drop/keep syntax', () => {
    const ast1 = parseDiceAst('4d6k>3');
    const result1 = evaluateDiceNode(ast1, {});

    // Should only keep dice above 3
    expect(result1.rolls!.every((roll: number) => roll > 3)).toBe(true);
    expect((result1.details as any).modifiers).toContain('k>');

    const ast2 = parseDiceAst('4d6k<4');
    const result2 = evaluateDiceNode(ast2, {});

    // Should only keep dice below 4
    expect(result2.rolls!.every((roll: number) => roll < 4)).toBe(true);
    expect((result2.details as any).modifiers).toContain('k<');
  });

  it('should handle custom drop/keep with other modifiers', () => {
    const ast = parseDiceAst('4d6k>3sd');
    const result = evaluateDiceNode(ast, {});

    // Should keep dice above 3 and sort descending
    expect(result.rolls!.every((roll: number) => roll > 3)).toBe(true);
    expect(result.rolls).toEqual([...result.rolls!].sort((a, b) => b - a));
    expect((result.details as any).modifiers).toContain('k>');
    expect((result.details as any).modifiers).toContain('sd');
  });

  it('should parse and evaluate roll once modifier', () => {
    const ast = parseDiceAst('{1d6, 1d8}o');
    if (ast.type !== 'grouped-roll') throw new Error('Expected grouped-roll');
    expect(ast.modifiers.some((m: any) => m.type === 'o')).toBe(true);
    const result = evaluateDiceNode(ast, {});
    expect(result.details?.rollOnce).toBe(true);
    expect(result.rolls!.length).toBe(2);
  });

  it('should parse advanced reroll modifiers', () => {
    const ast1 = parseDiceAst('4d6r<3');
    if (ast1.type !== 'dice') throw new Error('Expected dice');
    expect(ast1.modifiers[0]).toMatchObject({
      type: 'r',
      value: '3',
      operator: '<',
    });
    const ast2 = parseDiceAst('4d6r>5');
    if (ast2.type !== 'dice') throw new Error('Expected dice');
    expect(ast2.modifiers[0]).toMatchObject({
      type: 'r',
      value: '5',
      operator: '>',
    });
    const ast3 = parseDiceAst('4d6r!=1');
    if (ast3.type !== 'dice') throw new Error('Expected dice');
    expect(ast3.modifiers[0]).toMatchObject({
      type: 'r',
      value: '1',
      operator: '!=',
    });
  });

  it('should evaluate advanced reroll modifiers', () => {
    const ast = parseDiceAst('10d6r<3');
    const result = evaluateDiceNode(ast, {});
    // All rolls should be >= 3
    expect(result.rolls!.every((roll: number) => roll >= 3)).toBe(true);
    expect((result.details as any).modifiers).toContain('r');
  });
});

describe('Exhaustive (e) dice pool operator', () => {
  it('should count all 6s exhaustively in 5d6=6e', () => {
    const ast = parseDiceAst('5d6=6e');
    const result = evaluateDiceNode(ast, {});
    expect(Array.isArray(result.rolls)).toBe(true);
    expect(result.rolls!.length).toBe(1);
    expect(typeof result.rolls![0]).toBe('number');
    expect(result.details?.exhaustive).toBeDefined();
    expect(result.details?.exhaustive.totalSuccesses).toBeGreaterThanOrEqual(0);
  });

  it('should count all >4s exhaustively in 5d6>4e', () => {
    const ast = parseDiceAst('5d6>4e');
    const result = evaluateDiceNode(ast, {});
    expect(Array.isArray(result.rolls)).toBe(true);
    expect(result.rolls!.length).toBe(1);
    expect(typeof result.rolls![0]).toBe('number');
    expect(result.details?.exhaustive).toBeDefined();
    expect(result.details?.exhaustive.totalSuccesses).toBeGreaterThanOrEqual(0);
  });

  it('should return 0 if no dice meet the condition', () => {
    // Use a condition that can't be met, e.g. 5d6>6e
    const ast = parseDiceAst('5d6>6e');
    const result = evaluateDiceNode(ast, {});
    expect(result.rolls![0]).toBe(0);
    expect(result.details?.exhaustive.totalSuccesses).toBe(0);
  });

  it('should reroll all dice if all meet the condition', () => {
    // Use 1d1=1e (always rolls 1, always meets =1, should hit the limit)
    const ast = parseDiceAst('1d1=1e');
    const result = evaluateDiceNode(ast, {});
    expect(result.details?.exhaustive.cycles).toBeGreaterThanOrEqual(99);
    expect(
      result.warnings!.some((w) => w.includes('Exhaustive reroll limit')),
    ).toBe(true);
  });

  it('should include details.exhaustive in the result', () => {
    const ast = parseDiceAst('3d6=6e');
    const result = evaluateDiceNode(ast, {});
    expect(result.details?.exhaustive).toBeDefined();
    if (result.details?.exhaustive) {
      expect(typeof result.details?.exhaustive.totalSuccesses).toBe('number');
    }
    expect(typeof result.details?.exhaustive.cycles).toBe('number');
  });
});

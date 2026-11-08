import { describe, expect, it, vi } from 'vitest';
import {
  parseDiceAst,
  evaluateDiceNode,
  dicePlugin,
} from '@/utils/dice-roller/plugins/dice/dicePlugin';
import {
  traverseAST,
  findNodesByType,
  mathFunctions,
  validateInteger,
  validatePositiveInteger,
  validateRange,
  countSuccesses,
  keepHighest,
  keepLowest,
  dropHighest,
  dropLowest,
} from '@/utils/dice-roller/lib/utils';
import type { ASTNode } from '@/utils/dice-roller/lib/types';

describe('dice plugin coverage', () => {
  it.each([
    '1',
    'd6',
    '2d6',
    '4d6kh3',
    '4d6kl2',
    '4d6dh1',
    '4d6dl1',
    '4d6k>3',
    '4d6k<4',
    '1d6!',
    '1d6!!',
    '4d6r1',
    '4d6ro1',
    '4d6r<2',
    '4d6r>5',
    '4d6mi2',
    '4d6ma5',
    '4d6sa',
    '4d6sd',
    '4d6cs',
    '4d6cf',
    '4d6[fire]',
    'd[1,2,3]',
    '2d[1,2,3]kh1',
    '{1d6,2d8+1,1d4-1}',
    '{1d6,2d8}kh1',
    '{1d6,2d8}kl1',
    'dF',
    '4dF',
    'dF.1',
    'dF.2',
    'dF.3',
    '1+2-3*4/5%6**2',
    '(1+2)*3',
    '-(1+2)',
    '2**3**2',
    'floor(3.7)',
    'max(1,2)',
    '1t[loot]',
    '1d6[fire]kh3',
  ])('parses and evaluates %s', (expression) => {
    const ast = parseDiceAst(expression);
    expect(ast).toBeTruthy();
    expect(() => evaluateDiceNode(ast, {})).not.toThrow();
  });

  it('parses inline rolls and macros without evaluating them here', () => {
    expect(parseDiceAst('[[1d6]]')).toBeTruthy();
    expect(parseDiceAst('#attack')).toBeTruthy();
  });

  it('handles invalid dice expressions', () => {
    expect(() => parseDiceAst('')).toThrow();
    expect(() => evaluateDiceNode(parseDiceAst('d[]'), {})).toThrow();
    expect(() => parseDiceAst('@str')).toThrow();
    expect(dicePlugin.name).toBe('dice');
  });

  it('finds nested AST nodes and uses math helpers', () => {
    const ast: ASTNode = {
      type: 'arithmetic',
      op: '+',
      left: { type: 'dice', count: 1, sides: 6, modifiers: [] },
      right: {
        type: 'grouped-roll',
        expressions: [{ type: 'number', value: 2 }],
      },
    };
    const seen: ASTNode[] = [];
    traverseAST(ast, (node) => seen.push(node));
    expect(seen.length).toBeGreaterThan(3);
    expect(findNodesByType(ast, 'dice')).toHaveLength(1);
    expect(mathFunctions.floor(1.9)).toBe(1);
    expect(mathFunctions.ceil(1.1)).toBe(2);
    expect(mathFunctions.round(1.5)).toBe(2);
    expect(mathFunctions.abs(-2)).toBe(2);
    expect(mathFunctions.min(3, 1, 2)).toBe(1);
    expect(mathFunctions.max(3, 1, 2)).toBe(3);
  });

  it('validates values and applies array modifiers', () => {
    expect(validateInteger('4', 'count')).toBe(4);
    expect(() => validateInteger('x', 'count')).toThrow(
      'count must be a valid integer',
    );
    expect(validatePositiveInteger('4', 'count')).toBe(4);
    expect(() => validatePositiveInteger('0', 'count')).toThrow(
      'count must be a positive integer',
    );
    expect(validateRange(4, 1, 6, 'value')).toBe(4);
    expect(() => validateRange(9, 1, 6, 'value')).toThrow(
      'value must be between 1 and 6',
    );
    expect(countSuccesses([1, 3, 5], 3, '>')).toBe(1);
    expect(countSuccesses([1, 3, 5], 3, '<')).toBe(1);
    expect(countSuccesses([1, 3, 5], 3, '>=')).toBe(2);
    expect(countSuccesses([1, 3, 5], 3, '<=')).toBe(2);
    expect(countSuccesses([1, 3, 5], 3, '=')).toBe(1);
    expect(countSuccesses([1, 3, 5], 3, '!=')).toBe(2);
    expect(keepHighest([1, 5, 3], 2)).toEqual([5, 3]);
    expect(keepLowest([1, 5, 3], 2)).toEqual([1, 3]);
    expect(dropHighest([1, 5, 3], 1)).toEqual([3, 1]);
    expect(dropLowest([1, 5, 3], 1)).toEqual([3, 5]);
  });

  it('evaluates deterministic modifier results', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(evaluateDiceNode(parseDiceAst('2d6kh1'), {}).rolls).toHaveLength(1);
    expect(evaluateDiceNode(parseDiceAst('2d6kl1'), {}).rolls).toHaveLength(1);
    expect(evaluateDiceNode(parseDiceAst('2d6dh1'), {}).rolls).toHaveLength(1);
    expect(evaluateDiceNode(parseDiceAst('2d6dl1'), {}).rolls).toHaveLength(1);
    vi.restoreAllMocks();
  });
});

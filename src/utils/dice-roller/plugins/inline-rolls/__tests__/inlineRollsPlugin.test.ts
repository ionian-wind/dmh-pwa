import { describe, it, expect, vi, type Mock } from 'vitest';
import {
  parseInlineRollAst,
  extractInlineRolls,
  evaluateInlineRollNode,
  assignInlineRollIndices,
  inlineRollsPlugin,
} from '../index';
import type {
  ASTNode,
  EvaluationContext,
  EvaluationResult,
} from '../../../core';

// Mock the core module
vi.mock('../../../core', () => ({
  parseInput: vi.fn(),
  evaluate: vi.fn(),
}));

import { parseInput, evaluate } from '../../../core';

// --- Parsing ---
describe('Inline Rolls Plugin > Parsing', () => {
  it('should parse a simple inline roll', () => {
    const result = parseInlineRollAst('[[1d20+5]]');
    expect(result).toEqual({ type: 'inline-roll', expression: '1d20+5' });
  });

  it('should parse an inline roll with spaces', () => {
    const result = parseInlineRollAst('[[ 2d6 + 3 ]]');
    expect(result).toEqual({ type: 'inline-roll', expression: '2d6 + 3' });
  });

  it('should throw on invalid inline roll syntax', () => {
    expect(() => parseInlineRollAst('[1d20+5]')).toThrow(
      'Invalid inline roll syntax',
    );
    expect(() => parseInlineRollAst('[[1d20+5]')).toThrow(
      'Invalid inline roll syntax',
    );
  });

  it('should have a parse method', () => {
    expect(inlineRollsPlugin.parse).toBeDefined();
  });
});

// --- Extraction ---
describe('Inline Rolls Plugin > Extraction', () => {
  it('should extract inline rolls from AST', () => {
    const ast = { type: 'inline-roll', expression: '1d20+5' };
    const rolls = extractInlineRolls(ast);
    expect(rolls).toEqual([{ type: 'inline-roll', expression: '1d20+5' }]);
  });

  it('should extract multiple inline rolls from complex AST', () => {
    const ast = {
      type: 'arithmetic',
      op: '+',
      left: { type: 'inline-roll', expression: '1d20+5' },
      right: { type: 'inline-roll', expression: '2d6+3' },
    };
    const rolls = extractInlineRolls(ast);
    expect(rolls).toEqual([
      { type: 'inline-roll', expression: '1d20+5' },
      { type: 'inline-roll', expression: '2d6+3' },
    ]);
  });

  it('should return empty array for AST without inline rolls', () => {
    const ast = { type: 'number', value: 5 };
    const rolls = extractInlineRolls(ast);
    expect(rolls).toEqual([]);
  });
});

// --- Evaluation ---
describe('Inline Rolls Plugin > Evaluation', () => {
  it('should evaluate an inline roll node', () => {
    const node = { type: 'inline-roll', expression: '5', index: 0 };
    const context: EvaluationContext = { rolls: {} };

    (parseInput as Mock).mockReturnValue({ type: 'number', value: 5 });
    (evaluate as Mock).mockReturnValue({
      total: 5,
      rolls: [],
      warnings: [],
      details: {},
    });

    const result = evaluateInlineRollNode(node, context);

    expect(parseInput).toHaveBeenCalledWith('5');
    expect(evaluate).toHaveBeenCalledWith(
      { type: 'number', value: 5 },
      context,
    );
    expect(result.total).toBe(5);
    expect(context.rolls?.[0]).toBe(5);
  });

  it('should throw for non-inline-roll node', () => {
    const node = { type: 'number', value: 5 };
    const context = {} as any;
    expect(() => evaluateInlineRollNode(node, context)).toThrow(
      'Expected inline roll node',
    );
  });

  it('should throw for missing index', () => {
    const node = { type: 'inline-roll', expression: '1d20+5' };
    const context = {} as any;
    expect(() => evaluateInlineRollNode(node, context)).toThrow(
      'Inline roll node missing index',
    );
  });
});

// --- Indexing ---
describe('Inline Rolls Plugin > Indexing', () => {
  it('should assign indices to inline rolls in order', () => {
    const ast = {
      type: 'arithmetic',
      op: '+',
      left: { type: 'inline-roll', expression: '1d20' },
      right: {
        type: 'arithmetic',
        op: '*',
        left: { type: 'inline-roll', expression: '2d6' },
        right: { type: 'number', value: 2 },
      },
    };
    assignInlineRollIndices(ast);
    expect((ast.left as any).index).toBe(0);
    expect((ast.right.left as any).index).toBe(1);
  });
});

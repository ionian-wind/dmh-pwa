import { describe, it, expect, vi } from 'vitest';
import { extractMacros, evaluateMacroNode, macrosPlugin } from '../index';
import type { ASTNode, EvaluationContext } from '../../../lib/types';

// Mock the core evaluate function
vi.mock('../../../core', () => ({
  evaluate: vi.fn((ast: ASTNode, context: EvaluationContext) => {
    if (ast.type === 'number') {
      return { total: (ast as any).value, rolls: [], warnings: [], details: {} };
    }
    return { total: 0, rolls: [], warnings: [], details: {} };
  }),
}));

import { evaluate } from '../../../core';

// --- Parsing ---
describe('Macros Plugin > Parsing', () => {
  it('should not have a parse method', () => {
    expect(macrosPlugin.parse).toBeUndefined();
  });
});

// --- Extraction ---
describe('Macros Plugin > Extraction', () => {
  it('should extract macro names from AST', () => {
    const ast = { type: 'macro', name: 'attack' };
    const macros = extractMacros(ast);
    expect(macros).toEqual([{ name: 'attack' }]);
  });

  it('should extract multiple macros from complex AST', () => {
    const ast = {
      type: 'arithmetic',
      op: '+',
      left: { type: 'macro', name: 'attack' },
      right: { type: 'macro', name: 'damage' }
    };
    const macros = extractMacros(ast);
    expect(macros).toEqual([{ name: 'attack' }, { name: 'damage' }]);
  });

  it('should extract macros from nested structures', () => {
    const ast = {
      type: 'function',
      name: 'floor',
      args: [
        { type: 'macro', name: 'attack' },
        { type: 'macro', name: 'damage' }
      ]
    };
    const macros = extractMacros(ast);
    expect(macros).toEqual([{ name: 'attack' }, { name: 'damage' }]);
  });

  it('should return empty array for AST without macros', () => {
    const ast = { type: 'number', value: 5 };
    const macros = extractMacros(ast);
    expect(macros).toEqual([]);
  });
});

// --- Evaluation ---
describe('Macros Plugin > Evaluation', () => {
  it('should evaluate a macro call by expanding it', async () => {
    const node = { type: 'macro', name: 'attack' };
    const macroAst = { type: 'number', value: 15 };
    const context = { 
      macroMap: { 
        attack: macroAst
      } 
    } as any;
    
    await evaluateMacroNode(node, context);

    // Check that core 'evaluate' was called with the expanded AST
    expect(evaluate).toHaveBeenCalledWith(macroAst, expect.objectContaining({
      nestingLevel: 1
    }));
  });

  it('should throw error for missing macro', () => {
    const context = { macroMap: {} } as any;
    const node: ASTNode = { type: 'macro', name: 'missing' };
    expect(() => evaluateMacroNode(node, context)).toThrow("Macro 'missing' not found");
  });

  it('should throw error for recursion limit exceeded', () => {
    const context = {
      macroMap: { 'a': { type: 'macro', name: 'a' } },
      maxNesting: 5,
      nestingLevel: 6,
    } as any;
    const node: ASTNode = { type: 'macro', name: 'a' };
    expect(() => evaluateMacroNode(node, context)).toThrow('Macro recursion limit exceeded (5 levels)');
  });

  it('should throw error for non-macro node', () => {
    const context = { macroMap: {} } as any;
    const node: ASTNode = { type: 'dice', count: 1, sides: 6, modifiers: [] };
    expect(() => evaluateMacroNode(node, context)).toThrow('Expected macro node');
  });
}); 
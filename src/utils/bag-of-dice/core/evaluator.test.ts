import { evaluateAST } from './evaluator';
import { ParserPlugin, ASTNode, ParserContext } from './parser';

describe('evaluateAST', () => {
  // Mock plugin for number literals
  const arithmeticPlugin: ParserPlugin = {
    name: 'arithmetic',
    nodeTypes: ['NumberLiteral'],
    evaluate: (node) => node.type === 'NumberLiteral' ? node.value : undefined,
  };
  // Mock plugin for dice
  const dicePlugin: ParserPlugin = {
    name: 'dice',
    nodeTypes: ['DiceRoll'],
    evaluate: (node) => node.type === 'DiceRoll' ? 4 : undefined,
  };
  // Mock plugin for warnings
  const warnPlugin: ParserPlugin = {
    name: 'warn',
    nodeTypes: ['WarnNode'],
    evaluate: (node, ctx) => {
      ctx.addWarning?.('TestWarning', 'Warn from evaluator', node);
      return 42;
    },
  };

  it('delegates to arithmetic plugin for number literal', () => {
    const ast: ASTNode = { type: 'NumberLiteral', value: 5, plugin: 'arithmetic' };
    const ctx: ParserContext = {
      plugins: [arithmeticPlugin],
      errors: [],
      warnings: [],
      evaluate: (ast) => arithmeticPlugin.evaluate!(ast, ctx, {}),
    };
    const result = evaluateAST(ast, ctx);
    expect(result.value).toBe(5);
    expect(result.warnings).toEqual([]);
  });

  it('delegates to dice plugin for dice node', () => {
    const ast: ASTNode = { type: 'DiceRoll', sides: 6, plugin: 'dice' };
    const ctx: ParserContext = {
      plugins: [dicePlugin],
      errors: [],
      warnings: [],
      evaluate: (ast) => dicePlugin.evaluate!(ast, ctx, {}),
    };
    const result = evaluateAST(ast, ctx);
    expect(result.value).toBe(4);
    expect(result.warnings).toEqual([]);
  });

  it('collects warnings from plugin', () => {
    const ast: ASTNode = { type: 'WarnNode', plugin: 'warn' };
    const ctx: ParserContext = {
      plugins: [warnPlugin],
      errors: [],
      warnings: [],
      evaluate: (ast) => warnPlugin.evaluate!(ast, ctx, {}),
      addWarning: (type, message, node) => ctx.warnings.push({ type, message, node }),
    };
    const result = evaluateAST(ast, ctx);
    expect(result.value).toBe(42);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0].type).toBe('TestWarning');
  });

  it('propagates errors from plugin', () => {
    const errorPlugin: ParserPlugin = {
      name: 'error',
      nodeTypes: ['ErrorNode'],
      evaluate: () => { throw new Error('Eval error'); },
    };
    const ast: ASTNode = { type: 'ErrorNode', plugin: 'error' };
    const ctx: ParserContext = {
      plugins: [errorPlugin],
      errors: [],
      warnings: [],
      evaluate: (ast) => errorPlugin.evaluate!(ast, ctx, {}),
    };
    expect(() => evaluateAST(ast, ctx)).toThrow('Eval error');
    expect(ctx.errors.length).toBeGreaterThanOrEqual(1);
  });
}); 
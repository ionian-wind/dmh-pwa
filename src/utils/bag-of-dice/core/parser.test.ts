import { Parser, ParserPlugin, ASTNode } from './parser';
import { Token } from './tokenizer';

describe('Parser', () => {
  // Mock arithmetic plugin for numbers
  const arithmeticPlugin: ParserPlugin = {
    name: 'arithmetic',
    nodeTypes: ['NumberLiteral', 'BinaryOp'],
    canParse: (tokens, pos) => tokens[pos]?.type === 'Number',
    parse: (tokens, pos) => {
      if (tokens[pos]?.type === 'Number') {
        return {
          node: { type: 'NumberLiteral', value: tokens[pos].value, plugin: 'arithmetic' },
          next: pos + 1,
        };
      }
      return null;
    },
    evaluate: (node) => {
      if (node.type === 'NumberLiteral') return node.value;
      return undefined;
    },
  };

  // Mock dice plugin for D token
  const dicePlugin: ParserPlugin = {
    name: 'dice',
    nodeTypes: ['DiceRoll'],
    canParse: (tokens, pos) => tokens[pos]?.type === 'D',
    parse: (tokens, pos) => {
      if (tokens[pos]?.type === 'D') {
        return {
          node: { type: 'DiceRoll', sides: 6, plugin: 'dice' },
          next: pos + 1,
        };
      }
      return null;
    },
    evaluate: () => 4, // always return 4 for test
  };

  it('delegates to arithmetic plugin for number', () => {
    const tokens: Token[] = [
      { type: 'Number', value: 7, plugin: 'arithmetic', start: 0, end: 1 },
    ];
    const parser = new Parser(tokens, { plugins: [arithmeticPlugin], errors: [], warnings: [] });
    const ast = parser.parsePrimary ? parser.parsePrimary() : parser.parseExpression();
    expect(ast).toEqual({ type: 'NumberLiteral', value: 7, plugin: 'arithmetic' });
  });

  it('delegates to dice plugin', () => {
    const tokens: Token[] = [
      { type: 'D', value: 'd6', plugin: 'dice', start: 0, end: 2 },
    ];
    const parser = new Parser(tokens, { plugins: [dicePlugin, arithmeticPlugin], errors: [], warnings: [] });
    const ast = parser.parsePrimary ? parser.parsePrimary() : parser.parseExpression();
    expect(ast).toEqual({ type: 'DiceRoll', sides: 6, plugin: 'dice' });
  });

  it('collects warnings from plugin', () => {
    const warnPlugin: ParserPlugin = {
      name: 'warn',
      nodeTypes: ['WarnNode'],
      canParse: (tokens, pos) => tokens[pos]?.type === 'Warn',
      parse: (tokens, pos, ctx) => {
        ctx.addWarning?.('TestWarning', 'This is a warning', { type: 'WarnNode', plugin: 'warn' });
        return { node: { type: 'WarnNode', plugin: 'warn' }, next: pos + 1 };
      },
    };
    const tokens: Token[] = [
      { type: 'Warn', value: '!', plugin: 'warn', start: 0, end: 1 },
    ];
    const parser = new Parser(tokens, { plugins: [warnPlugin, arithmeticPlugin], errors: [], warnings: [] });
    const ast = parser.parsePrimary ? parser.parsePrimary() : parser.parseExpression();
    expect(ast).toEqual({ type: 'WarnNode', plugin: 'warn' });
    expect(parser.ctx.warnings.length).toBe(1);
    expect(parser.ctx.warnings[0].type).toBe('TestWarning');
  });

  it('evaluates AST using plugin evaluate', () => {
    const tokens: Token[] = [
      { type: 'D', value: 'd6', plugin: 'dice', start: 0, end: 2 },
    ];
    const parser = new Parser(tokens, { plugins: [dicePlugin, arithmeticPlugin], errors: [], warnings: [] });
    const ast = parser.parsePrimary ? parser.parsePrimary() : parser.parseExpression();
    const result = parser.ctx.evaluate?.(ast, {});
    expect(result).toBe(4);
  });
}); 
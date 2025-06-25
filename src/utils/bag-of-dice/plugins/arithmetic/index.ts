import { BasePlugin } from '../base';
import { allArithmeticTokens, NumberLiteral, LParen, Plus, Minus, Mult, Div, Mod, Pow, Floor, Ceil, Round, Abs } from './tokens';
import { arithmeticCstToAstHandlers } from './converters';
import { evaluateArithmeticAST } from './evaluator';
import { ArithmeticParser } from './parser';

class ArithmeticPlugin extends BasePlugin {
  public readonly tokens = allArithmeticTokens;
  public readonly topRule = 'expression';

  constructor() {
    super('arithmetic');
  }

  getCstToAst() {
    return arithmeticCstToAstHandlers;
  }

  canParseToken(token: any, parser: any): boolean {
    const types = [NumberLiteral, LParen, Plus, Minus, Mult, Div, Mod, Pow, Floor, Ceil, Round, Abs];
    const result = types.includes(token.tokenType);
    // Debug log for token claiming
    console.log('[arithmeticPlugin.canParseToken]', {
      tokenName: token.tokenType?.name,
      tokenType: token.tokenType,
      expectedTypes: types.map(t => t.name),
      result
    });
    return result;
  }

  parseTopRule(parser: any, coreFallback: () => any): any {
    const arithParser = new ArithmeticParser();
    arithParser.input = parser.input;
    const cst = arithParser.expression();
    parser.input = arithParser.input;
    return { cst, parser: arithParser };
  }

  evaluator(node: any, ...args: any[]): any {
    return evaluateArithmeticAST(node, ...args);
  }
}

export const arithmeticPlugin = new ArithmeticPlugin(); 
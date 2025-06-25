import { BasePlugin } from '../base';
import { allDiceTokens, D, DPercent, DF, NumberLiteral, LCurly } from './tokens';
import { DiceParser } from './parser';
import { diceCstToAstHandlers } from './converters';
import { evaluateDiceAst } from './evaluator';
import { extractDice } from './extract';

class DicePlugin extends BasePlugin {
  public readonly tokens = allDiceTokens;
  public readonly topRule = 'diceExpression';

  constructor() {
    super('dice');
  }

  getCstToAst() {
    return diceCstToAstHandlers;
  }

  canParseToken(token: any, parser: any): boolean {
    const types = [D, DPercent, DF, LCurly, NumberLiteral];
    return types.includes(token.tokenType);
  }

  parseTopRule(parser: any, coreFallback: () => any): any {
    const diceParser = new DiceParser();
    diceParser.input = parser.input;
    const cst = diceParser.diceExpression();
    parser.input = diceParser.input;
    return { cst, parser: diceParser };
  }

  evaluator(node: any, ...args: any[]): any {
    return evaluateDiceAst(node, ...args);
  }

  extract(ast: any): Record<string, any> {
    return extractDice(ast);
  }
}

export const dicePlugin = new DicePlugin(); 
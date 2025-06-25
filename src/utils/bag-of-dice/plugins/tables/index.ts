import { BasePlugin } from '../base';
import { allTableTokens } from './tokens';
import { tableCstToAstHandlers } from './converters';
import { evaluateTableRoll } from './evaluator';
import { TableParser } from './parser';
import { extractTables } from './extract';

class TablesPlugin extends BasePlugin {
  public readonly tokens = allTableTokens;
  public readonly topRule = 'tableRoll';

  constructor() {
    super('tables');
  }

  getCstToAst() {
    return tableCstToAstHandlers;
  }

  canParseToken(token: any, parser: any): boolean {
    return allTableTokens.includes(token.tokenType);
  }

  parseTopRule(parser: any, coreFallback: () => any): any {
    const tblParser = new TableParser();
    tblParser.input = parser.input;
    const cst = tblParser.tableRoll();
    parser.input = tblParser.input;
    return { cst, parser: tblParser };
  }

  evaluator(node: any, ...args: any[]): any {
    const rng = (args && args[0]) ? args[0] : Math.random;
    const rest = args ? args.slice(1) : [];
    return evaluateTableRoll(node, rng, ...rest);
  }

  extract(ast: any): Record<string, any> {
    return extractTables(ast);
  }
}

export const tablesPlugin = new TablesPlugin(); 
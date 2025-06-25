import { BasePlugin } from '../base';
import { allRollQueryTokens } from './tokens';
import { rollQueriesCstToAstHandlers } from './converters';
import { evaluateRollQuery } from './evaluator';
import { RollQueryParser } from './parser';
// import { extractRollQueries } from './extract'; // Not present

class RollQueriesPlugin extends BasePlugin {
  public readonly tokens = allRollQueryTokens;
  public readonly topRule = 'rollQuery';

  constructor() {
    super('roll-queries');
  }

  getCstToAst() {
    return rollQueriesCstToAstHandlers;
  }

  canParseToken(token: any, parser: any): boolean {
    return allRollQueryTokens.includes(token.tokenType);
  }

  parseTopRule(parser: any, coreFallback: () => any): any {
    const rqParser = new RollQueryParser();
    rqParser.input = parser.input;
    const cst = rqParser.rollQuery();
    parser.input = rqParser.input;
    return { cst, parser: rqParser };
  }

  evaluator(node: any, ...args: any[]): any {
    return evaluateRollQuery(node, ...args);
  }

  extract(ast: any): Record<string, any> {
    // Traverse AST and collect all RollQuery nodes
    const queries: any[] = [];
    function visit(node: any) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'RollQuery') queries.push(node);
      for (const key in node) {
        if (Object.prototype.hasOwnProperty.call(node, key)) {
          const child = node[key];
          if (Array.isArray(child)) child.forEach(visit);
          else if (typeof child === 'object') visit(child);
        }
      }
    }
    visit(ast);
    return { queries };
  }
}

export const rollQueriesPlugin = new RollQueriesPlugin(); 
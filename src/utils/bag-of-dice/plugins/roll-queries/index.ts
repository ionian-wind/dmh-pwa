import { BasePlugin } from '../base';
import type { TokenDef } from '../../core/tokenizer';
import type { ParserPlugin, ParserContext } from '../../core/parser';
import { evaluateRollQuery } from './evaluator';
import { RollQueryNode } from './converters';
import { extractQuery } from './extract';

// Roll-query token definitions for the new tokenizer
export const rollQueryTokenDefs: TokenDef[] = [
  { name: 'QueryStart', pattern: /\?\{/y, plugin: 'roll-queries', priority: 10 },
  { name: 'QueryPipe', pattern: /\|/y, plugin: 'roll-queries', priority: 5 },
  { name: 'QueryComma', pattern: /,/y, plugin: 'roll-queries', priority: 5 },
  { name: 'QueryEscapedChar', pattern: /\\[|,}]/y, plugin: 'roll-queries', priority: 10 },
  { name: 'QueryText', pattern: /([^\\|,}}]|\\(?![|,}]))+/y, plugin: 'roll-queries', priority: 5 },
  { name: 'QueryRCurly', pattern: /\}/y, plugin: 'roll-queries', priority: 5 },
  { name: 'QueryWhiteSpace', pattern: /[ \t\n\r]+/y, plugin: 'roll-queries', priority: 1, value: () => null },
];

// Minimal parser for roll queries (demo: only parses ?{Prompt|Option1|Option2})
function parseRollQuery(tokens: any[], pos: number, ctx: ParserContext): { node: RollQueryNode; next: number } | null {
  // Parse ?{Prompt|Option1|Option2}
  if (tokens[pos]?.type === 'QueryStart') {
    let i = pos + 1;
    // Find closing RCurly
    let end = i;
    while (end < tokens.length && tokens[end].type !== 'QueryRCurly') end++;
    if (end >= tokens.length) return null;
    // For demo, treat everything between as prompt/options text
    const prompt = tokens[i]?.value || '';
    const options = [];
    for (let j = i + 1; j < end; j++) {
      if (tokens[j].type === 'QueryPipe' && tokens[j + 1]?.type === 'QueryText') {
        options.push({ label: tokens[j + 1].value, value: tokens[j + 1].value, id: String(j) });
      }
    }
    return {
      node: { type: 'RollQuery', prompt, options, plugin: 'roll-queries' },
      next: end + 1,
    };
  }
  return null;
}

class RollQueriesPlugin extends BasePlugin implements ParserPlugin {
  public readonly name = 'roll-queries';
  public readonly tokens = rollQueryTokenDefs;
  public readonly nodeTypes = ['RollQuery'];

  constructor() {
    super('roll-queries');
  }

  canParse(tokens: any[], pos: number, ctx: ParserContext): boolean {
    return tokens[pos]?.plugin === 'roll-queries';
  }

  parse(tokens: any[], pos: number, ctx: ParserContext): { node: RollQueryNode; next: number } | null {
    return parseRollQuery(tokens, pos, ctx);
  }

  evaluate(node: any, ctx: ParserContext, options: any): any {
    return evaluateRollQuery(node, options?.userInput);
  }

  extract(ast: any): Record<string, any> {
    return { queries: extractQuery(ast) };
  }
}

export const rollQueriesPlugin = new RollQueriesPlugin(); 
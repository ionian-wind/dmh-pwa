import { BasePlugin } from '../base';
import type { TokenDef } from '../../core/tokenizer';
import type { ParserPlugin, ParserContext } from '../../core/parser';
import { evaluateTableRoll } from './evaluator';
import { TableRollNode } from './converters';
import { extractTables } from './extract';

// Table token definitions for the new tokenizer
export const tableTokenDefs: TokenDef[] = [
  { name: 'TableNumber', pattern: /\d+/y, plugin: 'tables', priority: 5, value: m => parseInt(m[0], 10) },
  { name: 'TableRollStart', pattern: /t\[/y, plugin: 'tables', priority: 10 },
  { name: 'TableIdentifier', pattern: /[a-zA-Z_][a-zA-Z0-9_-]*/y, plugin: 'tables', priority: 5 },
  { name: 'TableRBracket', pattern: /\]/y, plugin: 'tables', priority: 5 },
  { name: 'TableWhiteSpace', pattern: /[ \t\n\r]+/y, plugin: 'tables', priority: 1, value: () => null },
];

// Minimal parser for table rolls (demo: only parses Nt[table] and t[table])
function parseTableRoll(tokens: any[], pos: number, ctx: ParserContext): { node: TableRollNode; next: number } | null {
  // Parse Nt[table]
  if (tokens[pos]?.type === 'TableNumber' && tokens[pos + 1]?.type === 'TableRollStart' && tokens[pos + 2]?.type === 'TableIdentifier' && tokens[pos + 3]?.type === 'TableRBracket') {
    return {
      node: { type: 'TableRoll', count: tokens[pos].value, table: tokens[pos + 2].value, plugin: 'tables' },
      next: pos + 4,
    };
  }
  // Parse t[table]
  if (tokens[pos]?.type === 'TableRollStart' && tokens[pos + 1]?.type === 'TableIdentifier' && tokens[pos + 2]?.type === 'TableRBracket') {
    return {
      node: { type: 'TableRoll', count: null, table: tokens[pos + 1].value, plugin: 'tables' },
      next: pos + 3,
    };
  }
  return null;
}

class TablesPlugin extends BasePlugin implements ParserPlugin {
  public readonly name = 'tables';
  public readonly tokens = tableTokenDefs;
  public readonly nodeTypes = ['TableRoll'];

  constructor() {
    super('tables');
  }

  canParse(tokens: any[], pos: number, ctx: ParserContext): boolean {
    return tokens[pos]?.plugin === 'tables';
  }

  parse(tokens: any[], pos: number, ctx: ParserContext): { node: TableRollNode; next: number } | null {
    return parseTableRoll(tokens, pos, ctx);
  }

  evaluate(node: any, ctx: ParserContext, options: any): any {
    return evaluateTableRoll(node, options?.rng || Math.random, options?.tables || {});
  }

  extract(ast: any): Record<string, any> {
    return { tables: extractTables(ast) };
  }
}

export const tablesPlugin = new TablesPlugin(); 
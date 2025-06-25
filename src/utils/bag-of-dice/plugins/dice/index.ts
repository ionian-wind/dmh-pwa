import { BasePlugin } from '../base';
import type { TokenDef } from '../../core/tokenizer';
import type { ParserPlugin, ParserContext } from '../../core/parser';
import { evaluateDiceAst } from './evaluator';
import { DiceAST, ModifierAST } from './converters';
import { extractDice } from './extract';

// Dice token definitions for the new tokenizer
export const diceTokenDefs: TokenDef[] = [
  { name: 'Kh', pattern: /kh\d+/y, plugin: 'dice', priority: 10 },
  { name: 'Kl', pattern: /kl\d+/y, plugin: 'dice', priority: 10 },
  { name: 'Dh', pattern: /dh\d+/y, plugin: 'dice', priority: 10 },
  { name: 'Dl', pattern: /dl\d+/y, plugin: 'dice', priority: 10 },
  { name: 'Reroll', pattern: /r(o)?(a)?([<>=]?)(\d+)/y, plugin: 'dice', priority: 10 },
  { name: 'Explode', pattern: /!!|!p|!([<>=]?\d+)?/y, plugin: 'dice', priority: 10 },
  { name: 'Mi', pattern: /mi\d+/y, plugin: 'dice', priority: 10 },
  { name: 'Ma', pattern: /ma\d+/y, plugin: 'dice', priority: 10 },
  { name: 'Success', pattern: />\d+/y, plugin: 'dice', priority: 10 },
  { name: 'Failure', pattern: /<\d+/y, plugin: 'dice', priority: 10 },
  { name: 'Equal', pattern: /=\d+/y, plugin: 'dice', priority: 10 },
  { name: 'Cs', pattern: /cs[><=]+\d*/y, plugin: 'dice', priority: 10 },
  { name: 'Cf', pattern: /cf[><=]+\d*/y, plugin: 'dice', priority: 10 },
  { name: 'Kgt', pattern: /k>\d+/y, plugin: 'dice', priority: 10 },
  { name: 'Klt', pattern: /k<\d+/y, plugin: 'dice', priority: 10 },
  { name: 'Sa', pattern: /sa/y, plugin: 'dice', priority: 10 },
  { name: 'Sd', pattern: /sd/y, plugin: 'dice', priority: 10 },
  { name: 'S', pattern: /s/y, plugin: 'dice', priority: 10 },
  { name: 'F', pattern: /f/y, plugin: 'dice', priority: 10 },
  { name: 'M', pattern: /m/y, plugin: 'dice', priority: 10 },
  { name: 'E', pattern: /e/y, plugin: 'dice', priority: 10 },
  { name: 'O', pattern: /o/y, plugin: 'dice', priority: 10 },
  { name: 'DPercent', pattern: /d%/y, plugin: 'dice', priority: 10 },
  { name: 'DF', pattern: /dF(\.[123])?/y, plugin: 'dice', priority: 10 },
  { name: 'D', pattern: /d/y, plugin: 'dice', priority: 10 },
  // Dice-specific number pattern - only match numbers that are followed by 'd'
  { name: 'DiceNumber', pattern: /-?\d+(?=d)/y, plugin: 'dice', priority: 5, value: m => parseInt(m[0], 10) },
  { name: 'DiceIdentifier', pattern: /[a-zA-Z_][a-zA-Z0-9_]*/y, plugin: 'dice', priority: 5 },
  { name: 'LBracket', pattern: /\[/y, plugin: 'dice', priority: 5 },
  { name: 'RBracket', pattern: /\]/y, plugin: 'dice', priority: 5 },
  { name: 'LCurly', pattern: /\{/y, plugin: 'dice', priority: 5 },
  { name: 'RCurly', pattern: /\}/y, plugin: 'dice', priority: 5 },
  { name: 'Comma', pattern: /,/y, plugin: 'dice', priority: 5 },
  { name: 'WhiteSpace', pattern: /\s+/y, plugin: 'dice', priority: 1, value: () => null },
];

// Minimal parser for dice expressions (demo: only parses NdX)
function parseDice(tokens: any[], pos: number, ctx: ParserContext): { node: DiceAST; next: number } | null {
  // Parse NdX (e.g., 2d6)
  if (tokens[pos]?.type === 'DiceNumber' && tokens[pos + 1]?.type === 'D' && tokens[pos + 2]?.type === 'ArithmeticNumberLiteral') {
    return {
      node: { 
        type: 'Dice', 
        count: typeof tokens[pos].value === 'string' ? parseInt(tokens[pos].value, 10) : tokens[pos].value, 
        sides: typeof tokens[pos + 2].value === 'string' ? parseInt(tokens[pos + 2].value, 10) : tokens[pos + 2].value, 
        fudge: null, 
        custom: null, 
        plugin: 'dice' 
      },
      next: pos + 3,
    };
  }
  // Parse dX (e.g., d6)
  if (tokens[pos]?.type === 'D' && tokens[pos + 1]?.type === 'ArithmeticNumberLiteral') {
    return {
      node: { 
        type: 'Dice', 
        count: 1, 
        sides: typeof tokens[pos + 1].value === 'string' ? parseInt(tokens[pos + 1].value, 10) : tokens[pos + 1].value, 
        fudge: null, 
        custom: null, 
        plugin: 'dice' 
      },
      next: pos + 2,
    };
  }
  // Parse d% (d100)
  if (tokens[pos]?.type === 'DPercent') {
    return {
      node: { type: 'Dice', count: 1, sides: 100, fudge: null, custom: null, plugin: 'dice' },
      next: pos + 1,
    };
  }
  // Parse Nd% (e.g., 2d%)
  if (tokens[pos]?.type === 'DiceNumber' && tokens[pos + 1]?.type === 'DPercent') {
    return {
      node: { 
        type: 'Dice', 
        count: typeof tokens[pos].value === 'string' ? parseInt(tokens[pos].value, 10) : tokens[pos].value, 
        sides: 100, 
        fudge: null, 
        custom: null, 
        plugin: 'dice' 
      },
      next: pos + 2,
    };
  }
  // Parse dF (Fudge dice)
  if (tokens[pos]?.type === 'DF') {
    return {
      node: { type: 'Dice', count: 1, sides: null, fudge: 0, custom: null, plugin: 'dice' },
      next: pos + 1,
    };
  }
  // Parse NdF (e.g., 4dF)
  if (tokens[pos]?.type === 'DiceNumber' && tokens[pos + 1]?.type === 'DF') {
    return {
      node: { 
        type: 'Dice', 
        count: typeof tokens[pos].value === 'string' ? parseInt(tokens[pos].value, 10) : tokens[pos].value, 
        sides: null, 
        fudge: 0, 
        custom: null, 
        plugin: 'dice' 
      },
      next: pos + 2,
    };
  }
  return null;
}

class DicePlugin extends BasePlugin implements ParserPlugin {
  public readonly name = 'dice';
  public readonly tokens = diceTokenDefs;
  public readonly nodeTypes = ['Dice', 'Group'];

  constructor() {
    super('dice');
  }

  canParse(tokens: any[], pos: number, ctx: ParserContext): boolean {
    // Only claim dice-specific tokens, not shared ones like parentheses
    const token = tokens[pos];
    if (!token) return false;
    
    // Claim dice-specific tokens
    const diceTokens = ['D', 'DPercent', 'DF', 'DiceNumber', 'Kh', 'Kl', 'Dh', 'Dl', 'Reroll', 'Explode', 'Mi', 'Ma', 'Success', 'Failure', 'Equal', 'Cs', 'Cf', 'Kgt', 'Klt', 'Sa', 'Sd', 'S', 'F', 'M', 'E', 'O'];
    return diceTokens.includes(token.type);
  }

  parse(tokens: any[], pos: number, ctx: ParserContext): { node: DiceAST; next: number } | null {
    return parseDice(tokens, pos, ctx);
  }

  evaluate(node: any, ctx: ParserContext, options: any): any {
    return evaluateDiceAst(node, options?.rng || Math.random);
  }

  extract(ast: any): Record<string, any> {
    return { dice: extractDice(ast) };
  }
}

export const dicePlugin = new DicePlugin(); 
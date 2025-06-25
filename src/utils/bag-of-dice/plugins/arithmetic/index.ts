import { BasePlugin } from '../base';
import type { TokenDef } from '../../core/tokenizer';
import type { ASTNode, ParserPlugin, ParserContext } from '../../core/parser';
import { evaluateArithmeticAST } from './evaluator';

// Arithmetic token definitions for the new tokenizer
export const arithmeticTokenDefs: TokenDef[] = [
  { name: 'ArithmeticNumberLiteral', pattern: /-?\d+(?:\.\d+)?/y, plugin: 'arithmetic', priority: 3, value: m => parseFloat(m[0]) },
  { name: 'ArithmeticPlus', pattern: /\+/y, plugin: 'arithmetic', priority: 3 },
  { name: 'ArithmeticMinus', pattern: /-/y, plugin: 'arithmetic', priority: 3 },
  { name: 'ArithmeticMult', pattern: /\*/y, plugin: 'arithmetic', priority: 3 },
  { name: 'ArithmeticDiv', pattern: /\//y, plugin: 'arithmetic', priority: 3 },
  { name: 'ArithmeticMod', pattern: /%/y, plugin: 'arithmetic', priority: 3 },
  { name: 'ArithmeticPow', pattern: /\*\*/y, plugin: 'arithmetic', priority: 3 },
  { name: 'ArithmeticFloor', pattern: /floor/y, plugin: 'arithmetic', priority: 3 },
  { name: 'ArithmeticCeil', pattern: /ceil/y, plugin: 'arithmetic', priority: 3 },
  { name: 'ArithmeticRound', pattern: /round/y, plugin: 'arithmetic', priority: 3 },
  { name: 'ArithmeticAbs', pattern: /abs/y, plugin: 'arithmetic', priority: 3 },
  { name: 'LParen', pattern: /\(/y, plugin: 'arithmetic', priority: 3 },
  { name: 'RParen', pattern: /\)/y, plugin: 'arithmetic', priority: 3 },
  { name: 'WhiteSpace', pattern: /\s+/y, plugin: 'arithmetic', priority: 1, value: () => null },
];

// AST node types for arithmetic (compatible with new core)
export type ArithmeticAST =
  | { type: 'Add' | 'Sub' | 'Mul' | 'Div' | 'Mod' | 'Pow'; left: ArithmeticAST; right: ArithmeticAST; plugin: 'arithmetic' }
  | { type: 'UnaryPlus' | 'UnaryMinus'; value: ArithmeticAST; plugin: 'arithmetic' }
  | { type: 'Floor' | 'Ceil' | 'Round' | 'Abs'; arg: ArithmeticAST; plugin: 'arithmetic' }
  | { type: 'NumberLiteral'; value: number; plugin: 'arithmetic' };

class ArithmeticPlugin extends BasePlugin implements ParserPlugin {
  public readonly name = 'arithmetic';
  public readonly tokens = arithmeticTokenDefs;
  public readonly nodeTypes = ['NumberLiteral', 'Add', 'Sub', 'Mul', 'Div', 'Mod', 'Pow', 'UnaryPlus', 'UnaryMinus', 'Floor', 'Ceil', 'Round', 'Abs'];

  constructor() {
    super('arithmetic');
  }

  canParse(tokens: any[], pos: number, ctx: ParserContext): boolean {
    // Only claim arithmetic-specific tokens
    const token = tokens[pos];
    if (!token) return false;
    
    // Claim arithmetic-specific tokens
    const arithmeticTokens = ['ArithmeticNumberLiteral', 'ArithmeticPlus', 'ArithmeticMinus', 'ArithmeticMult', 'ArithmeticDiv', 'ArithmeticMod', 'ArithmeticPow', 'ArithmeticFloor', 'ArithmeticCeil', 'ArithmeticRound', 'ArithmeticAbs'];
    return arithmeticTokens.includes(token.type);
  }

  parse(tokens: any[], pos: number, ctx: ParserContext): { node: ArithmeticAST; next: number } | null {
    // Handle arithmetic-specific tokens that the core parser doesn't handle
    const token = tokens[pos];
    if (!token) return null;

    // Handle number literals
    if (token.type === 'ArithmeticNumberLiteral') {
      const value = typeof token.value === 'string' ? parseFloat(token.value) : token.value;
      return {
        node: { type: 'NumberLiteral', value, plugin: 'arithmetic' },
        next: pos + 1,
      };
    }

    // Handle function calls (floor, ceil, round, abs)
    if (token.type === 'ArithmeticFloor' || token.type === 'ArithmeticCeil' || token.type === 'ArithmeticRound' || token.type === 'ArithmeticAbs') {
      // Check for opening parenthesis
      if (tokens[pos + 1]?.type !== 'LParen') {
        return null; // Not a function call
      }

      // Find closing parenthesis and parse the argument
      let parenCount = 1;
      let argEnd = pos + 2;
      while (argEnd < tokens.length && parenCount > 0) {
        if (tokens[argEnd]?.type === 'LParen') parenCount++;
        if (tokens[argEnd]?.type === 'RParen') parenCount--;
        argEnd++;
      }

      if (parenCount !== 0) {
        return null; // Unmatched parentheses
      }

      // Parse the argument using the core parser
      const argTokens = tokens.slice(pos + 2, argEnd - 1);
      const argNode = ctx.evaluate ? ctx.evaluate({ type: 'expression', tokens: argTokens }, {}) : null;

      const nodeType = token.type.replace('Arithmetic', '') as 'Floor' | 'Ceil' | 'Round' | 'Abs';
      return {
        node: { type: nodeType, arg: argNode, plugin: 'arithmetic' },
        next: argEnd,
      };
    }

    return null;
  }

  evaluate(node: any, ctx: ParserContext, options: any): any {
    // Handle the new node types that the parser creates
    if (node.type === 'Add' || node.type === 'Sub' || node.type === 'Mul' || node.type === 'Div' || node.type === 'Mod' || node.type === 'Pow') {
      const left = ctx.evaluate?.(node.left, options) || 0;
      const right = ctx.evaluate?.(node.right, options) || 0;
      
      switch (node.type) {
        case 'Add': return left + right;
        case 'Sub': return left - right;
        case 'Mul': return left * right;
        case 'Div': return right !== 0 ? left / right : 0;
        case 'Mod': return right !== 0 ? left % right : 0;
        case 'Pow': return Math.pow(left, right);
        default: return 0;
      }
    }
    
    if (node.type === 'NumberLiteral') {
      return node.value;
    }

    // Handle function calls
    if (node.type === 'Floor' || node.type === 'Ceil' || node.type === 'Round' || node.type === 'Abs') {
      const arg = ctx.evaluate?.(node.arg, options) || 0;
      
      switch (node.type) {
        case 'Floor': return Math.floor(arg);
        case 'Ceil': return Math.ceil(arg);
        case 'Round': return Math.round(arg);
        case 'Abs': return Math.abs(arg);
        default: return arg;
      }
    }
    
    // Fallback to the existing evaluator for other node types
    return evaluateArithmeticAST(node as ArithmeticAST, options?.rng || Math.random);
  }
}

export const arithmeticPlugin = new ArithmeticPlugin(); 
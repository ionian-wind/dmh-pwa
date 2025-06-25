import type { Token } from './tokenizer';

// AST Node Types
export type ASTNode =
  | { type: 'NumberLiteral'; value: number; plugin: string }
  | { type: 'BinaryOp'; op: string; left: ASTNode; right: ASTNode; plugin: string }
  | { type: 'Paren'; expr: ASTNode; plugin: string }
  | { type: string; [key: string]: any };

/**
 * Error and Warning Types
 */
export type DiceEngineErrorType =
  | 'SyntaxError'
  | 'ValidationError'
  | 'MissingDataError'
  | 'NestingLimitError';

export interface DiceEngineError {
  type: DiceEngineErrorType;
  message: string;
  location?: { start: number; end: number };
  node?: ASTNode;
}

export interface DiceEngineWarning {
  type: string;
  message: string;
  node?: ASTNode;
}

/**
 * Plugin API for parser integration and evaluation:
 *
 * - canParse(tokens, pos, ctx): boolean -- should return true if the plugin claims the token at pos
 * - parse(tokens, pos, ctx): { node, next } | null -- parse and return AST node, or null if not handled
 * - nodeTypes: string[] -- list of AST node types this plugin handles (for extraction/evaluation)
 * - extractQueries(node, ctx): any[] -- extract roll queries from AST node (optional)
 * - extractTables(node, ctx): any[] -- extract table references from AST node (optional)
 * - extractRolls(node, ctx): any[] -- extract roll result references from AST node (optional)
 * - evaluate(node, ctx, options): any -- evaluate AST node (optional)
 */
export interface ParserPlugin {
  name: string;
  canParse?: (tokens: Token[], pos: number, ctx: ParserContext) => boolean;
  parse?: (tokens: Token[], pos: number, ctx: ParserContext) => { node: ASTNode; next: number } | null;
  nodeTypes?: string[];
  extractQueries?: (node: ASTNode, ctx: ParserContext) => any[];
  extractTables?: (node: ASTNode, ctx: ParserContext) => any[];
  extractRolls?: (node: ASTNode, ctx: ParserContext) => any[];
  evaluate?: (node: ASTNode, ctx: ParserContext, options: any) => any;
}

export interface ParserContext {
  plugins: ParserPlugin[];
  // Extraction coordination
  extractQueries?: (ast: ASTNode) => any[];
  extractTables?: (ast: ASTNode) => any[];
  extractRolls?: (ast: ASTNode) => any[];
  // Evaluation coordination
  evaluate?: (ast: ASTNode, options: any) => any;
  // Error and warning collection
  errors: DiceEngineError[];
  warnings: DiceEngineWarning[];
  // Utility for plugin registration
  registerPlugin?: (plugin: ParserPlugin) => void;
  // Utility for error/warning reporting
  throwError?: (type: DiceEngineErrorType, message: string, node?: ASTNode, location?: { start: number; end: number }) => never;
  addWarning?: (type: string, message: string, node?: ASTNode) => void;
}

export class Parser {
  tokens: Token[];
  pos: number;
  ctx: ParserContext;

  constructor(tokens: Token[], ctx?: Partial<ParserContext>) {
    this.tokens = tokens;
    this.pos = 0;
    // Initialize context with error/warning arrays and utilities
    this.ctx = {
      plugins: ctx?.plugins || [],
      errors: ctx?.errors || [],
      warnings: ctx?.warnings || [],
      ...ctx,
    };
    // Bind extraction and evaluation coordination
    this.ctx.extractQueries = (ast: ASTNode) => this.extract(ast, 'extractQueries');
    this.ctx.extractTables = (ast: ASTNode) => this.extract(ast, 'extractTables');
    this.ctx.extractRolls = (ast: ASTNode) => this.extract(ast, 'extractRolls');
    this.ctx.evaluate = (ast: ASTNode, options: any) => this.evaluate(ast, options);
    // Plugin registration utility
    this.ctx.registerPlugin = (plugin: ParserPlugin) => {
      this.ctx.plugins.push(plugin);
    };
    // Error/warning reporting utilities
    this.ctx.throwError = (type, message, node, location) => {
      const err: DiceEngineError = { type, message, node, location };
      this.ctx.errors.push(err);
      throw Object.assign(new Error(message), err);
    };
    this.ctx.addWarning = (type, message, node) => {
      this.ctx.warnings.push({ type, message, node });
    };
  }

  // Extraction coordination: walk AST and delegate to plugins
  extract(ast: ASTNode, method: 'extractQueries' | 'extractTables' | 'extractRolls'): any[] {
    let results: any[] = [];
    for (const plugin of this.ctx.plugins) {
      if (plugin.nodeTypes && plugin[method]) {
        if (plugin.nodeTypes.includes(ast.type)) {
          results = results.concat(plugin[method]!(ast, this.ctx));
        }
      }
    }
    // Recursively extract from children
    for (const key in ast) {
      const value = (ast as any)[key];
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v && typeof v === 'object' && v.type) {
            results = results.concat(this.extract(v, method));
          }
        }
      } else if (value && typeof value === 'object' && value.type) {
        results = results.concat(this.extract(value, method));
      }
    }
    return results;
  }

  // Evaluation coordination: delegate to plugin or fallback to arithmetic
  evaluate(ast: ASTNode, options: any): any {
    for (const plugin of this.ctx.plugins) {
      if (plugin.nodeTypes && plugin.evaluate && plugin.nodeTypes.includes(ast.type)) {
        return plugin.evaluate(ast, this.ctx, options);
      }
    }
    this.ctx.throwError?.('SyntaxError', `No plugin can evaluate node type: ${ast.type}`, ast);
  }

  // Entry point: parse an expression (arithmetic + plugins)
  parseExpression(): ASTNode {
    return this.parseAddition();
  }

  // Parse addition/subtraction
  parseAddition(): ASTNode {
    let node = this.parseMultiplication();
    while (this.match('ArithmeticPlus') || this.match('ArithmeticMinus')) {
      const op = this.advance().type;
      const right = this.parseMultiplication();
      const nodeType = op === 'ArithmeticPlus' ? 'Add' : 'Sub';
      node = { type: nodeType, left: node, right, plugin: 'arithmetic' };
    }
    return node;
  }

  // Parse multiplication/division/modulus
  parseMultiplication(): ASTNode {
    let node = this.parsePower();
    while (this.match('ArithmeticMult') || this.match('ArithmeticDiv') || this.match('ArithmeticMod')) {
      const op = this.advance().type;
      const right = this.parsePower();
      let nodeType = 'Mod';
      if (op === 'ArithmeticMult') nodeType = 'Mul';
      else if (op === 'ArithmeticDiv') nodeType = 'Div';
      node = { type: nodeType, left: node, right, plugin: 'arithmetic' };
    }
    return node;
  }

  // Parse exponentiation
  parsePower(): ASTNode {
    let node = this.parseUnary();
    while (this.match('ArithmeticPow')) {
      this.advance(); // consume **
      const right = this.parseUnary();
      node = { type: 'Pow', left: node, right, plugin: 'arithmetic' };
    }
    return node;
  }

  // Parse unary expressions
  parseUnary(): ASTNode {
    if (this.match('ArithmeticPlus') || this.match('ArithmeticMinus')) {
      const op = this.advance().type;
      const value = this.parseUnary();
      const nodeType = op === 'ArithmeticPlus' ? 'UnaryPlus' : 'UnaryMinus';
      return { type: nodeType, value, plugin: 'arithmetic' };
    }
    return this.parsePrimary();
  }

  // Parse primary expressions (numbers, parentheses, function calls)
  parsePrimary(): ASTNode {
    const token = this.peek();
    if (!token) {
      return null as any;
    }

    // Check if any plugin can handle this token
    for (const plugin of this.ctx.plugins) {
      if (plugin.canParse && plugin.canParse(this.tokens, this.pos, this.ctx)) {
        if (plugin.parse) {
          const result = plugin.parse(this.tokens, this.pos, this.ctx);
          if (result) {
            this.pos = result.next;
            return result.node;
          }
        }
      }
    }

    // Handle arithmetic-specific tokens
    if (token.type === 'ArithmeticNumberLiteral') {
      this.advance();
      const value = parseFloat(token.value);
      return { type: 'NumberLiteral', value, plugin: token.plugin };
    }

    if (token.type === 'LParen') {
      this.advance(); // consume (
      const expr = this.parseExpression();
      if (!this.match('RParen')) {
        throw new Error('Expected closing parenthesis');
      }
      this.advance(); // consume )
      return expr;
    }

    throw new Error(`Unexpected token: ${this.peek()?.type}`);
  }

  // Helpers
  match(type: string): boolean {
    return this.peek()?.type === type;
  }
  expect(type: string) {
    if (!this.match(type)) throw new Error(`Expected token ${type}, got ${this.peek()?.type}`);
  }
  consume(): Token {
    return this.tokens[this.pos++];
  }
  peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  advance(): Token {
    return this.tokens[this.pos++];
  }
} 
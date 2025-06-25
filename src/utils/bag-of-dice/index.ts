// Bag of Dice Parser - Core Entry Point
// Source of truth: dice_notation.md, requirements_for_proposal.md, dice_notation_proposal_2.md

import { createTokenizer, type Token } from './core/tokenizer';
import { Parser, type ParserPlugin, type ParserContext } from './core/parser';
import { evaluateAST } from './core/evaluator';
import { arithmeticPlugin } from './plugins/arithmetic';

// Debug log utility
export function debugLog(...args: any[]) {
  if (process.env.BAG_OF_DICE_DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[BagOfDice]', ...args);
  }
}

export interface IPlugin extends ParserPlugin {
  tokens: Array<{
    name: string;
    pattern: RegExp;
    priority?: number;
  }>;
  extract?: (ast: any) => Record<string, any[]>;
}

export interface BagOfDiceOptions {
  plugins?: IPlugin[];
  rng?: () => number;
}

export class BagOfDice {
  private _plugins: IPlugin[];
  private rng: () => number;

  constructor(options: BagOfDiceOptions = {}) {
    // Always include arithmetic plugin as default, then add user plugins
    this._plugins = [
      ...(options.plugins ?? []).filter(({ name }) => 
        name !== arithmeticPlugin.name
      ),
       arithmeticPlugin,
    ];
    this.rng = options.rng ?? (() => Math.random());
  }

  get plugins(): IPlugin[] {
    return this._plugins;
  }

  parse(text: string, strict: boolean = true): any {
    try {
      // Create tokenizer with all plugin tokens, handling conflicts
      const allTokenDefs = this._plugins.flatMap(p => 
        p.tokens.map(t => ({
          name: t.name,
          pattern: t.pattern,
          plugin: p.name,
          priority: t.priority || 0
        }))
      );
      
      // Sort by priority (higher priority first) to handle conflicts
      allTokenDefs.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      
      const tokenize = createTokenizer(allTokenDefs);
      const tokens = tokenize(text);

      debugLog('Tokens:', tokens);

      // Create parser context
      const ctx: ParserContext = {
        plugins: this._plugins,
        errors: [],
        warnings: [],
      };

      // Create parser and parse
      const parser = new Parser(tokens, ctx);
      const ast = parser.parseExpression();

      debugLog('AST:', ast);

      if (strict && ctx.errors.length > 0) {
        throw new Error('Failed to parse expression: ' + ctx.errors[0].message);
      }

      return ast;
    } catch (error) {
      if (strict) {
        throw error;
      }
      // In non-strict mode, return null on error
      return null;
    }
  }

  evaluate(ast: any, context: any = {}): { result: any; warnings: string[] } {
    const ctx: ParserContext = {
      plugins: this._plugins,
      errors: [],
      warnings: [],
    };

    const options = {
      rng: context.rng || this.rng,
      tables: context.tables || {},
      queries: context.queries || {},
      rolls: context.rolls || {},
    };

    // Set up the evaluate function in context to delegate to plugins
    ctx.evaluate = (node: any, opts: any) => {
      for (const plugin of this._plugins) {
        if (plugin.nodeTypes && plugin.evaluate && plugin.nodeTypes.includes(node.type)) {
          return plugin.evaluate(node, ctx, opts);
        }
      }
      // If no plugin can evaluate, throw an error
      throw new Error(`No plugin can evaluate node type: ${node.type}`);
    };

    const result = evaluateAST(ast, ctx, options);
    return {
      result: result.value,
      warnings: result.warnings.map(w => w.message),
    };
  }

  extract(ast: any): Record<string, any[]> {
    const extracted: Record<string, any[]> = {};
    
    for (const plugin of this._plugins) {
      if (plugin.extract) {
        const data = plugin.extract(ast);
        for (const [key, values] of Object.entries(data)) {
          if (!extracted[key]) {
            extracted[key] = [];
          }
          extracted[key].push(...values);
        }
      }
    }

    return extracted;
  }
}

// Export plugins for convenience
export { arithmeticPlugin } from './plugins/arithmetic';
export { dicePlugin } from './plugins/dice';
export { tablesPlugin } from './plugins/tables';
export { rollQueriesPlugin } from './plugins/roll-queries'; 
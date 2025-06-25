// Bag of Dice Parser - Core Entry Point
// Source of truth: dice_notation.md, requirements_for_proposal.md, dice_notation_proposal_2.md

import { createToken, Lexer, CstParser } from 'chevrotain';
import { IPlugin } from './types';
import { cstToAst } from './utils/cstAstConverter';
import { debugTrace } from './utils/debug';
import { arithmeticPlugin } from './plugins/arithmetic';

// Debug log utility
export function debugLog(...args: any[]) {
  if (process.env.BAG_OF_DICE_DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[BagOfDice]', ...args);
  }
}

// Core interfaces
export interface BagOfDicePlugin {
  name: string;
  // Called to extend Chevrotain token vocabulary and parser rules
  extendSyntax?(tokens: any[], parser: CstParser): void;
  // Called to parse plugin-specific nodes from CST/AST
  parseNode?(cstNode: any, context: any): any;
  // Called to evaluate plugin-specific AST nodes
  evaluateNode?(astNode: any, context: any): any;
  // Extraction utilities
  extractQueries?(ast: any): any[];
  extractMacros?(ast: any): string[];
  extractTables?(ast: any): string[];
  extractRolls?(ast: any): string[];
}

export interface BagOfDiceOptions {
  plugins: IPlugin[];
  rng?: () => number;
}

export class BagOfDice {
  private _plugins: IPlugin[];
  private _rng: (...args: unknown[]) => number;

  constructor(options?: BagOfDiceOptions) {
    this._plugins = options?.plugins ?? [];
    this._rng = options?.rng || Math.random;
    debugLog('BagOfDice initialized with plugins:', this.plugins.map(p => p.name));
  }

  get plugins(): IPlugin[] {
    return this._plugins.filter(p => p.name !== 'arithmetic').concat(arithmeticPlugin);
  }

  rng(...args: unknown[]): number {
    return this._rng(...args);
  }

  parse(text: string, strict: boolean = true): any {
    debugLog('Parsing text:', text);
    const allPlugins = this.plugins;
    // If only one plugin is loaded, delegate directly to its parseTopRule
    if (allPlugins.length === 1 && allPlugins[0].parseTopRule) {
      // Tokenize using the plugin's tokens
      const lexer = new Lexer(allPlugins[0].tokens);
      const lexResult = lexer.tokenize(text);
      // Create a minimal parser context with input tokens
      const parserContext: any = { input: lexResult.tokens, strict };
      // Call the plugin's parseTopRule directly, expecting { cst, parser }
      const { cst, parser } = allPlugins[0].parseTopRule(parserContext, () => {
        if (strict) {
          throw new Error('No plugin claimed token and no core fallback implemented.');
        } else {
          const token = parserContext.input[0];
          parserContext.input = parserContext.input.slice(1);
          return null;
        }
      });
      // Check for syntax errors in plugin parser
      if (parser && parser.errors && parser.errors.length > 0 && strict) {
        throw new Error('Parsing errors detected: ' + parser.errors[0].message);
      }
      const allHandlers = allPlugins[0].getCstToAst ? allPlugins[0].getCstToAst() : {};
      const ast = cstToAst(cst, allHandlers);
      return ast;
    }
    // Token merging and sorting (as before)
    const allTokens: any[] = [];
    const tokenSet = new Set<string>();
    const addToken = (token: any) => {
      if (token && !tokenSet.has(token.name)) {
        tokenSet.add(token.name);
        allTokens.push(token);
      }
    };
    const allKeywordTokens = allPlugins.flatMap((p: IPlugin) => p.tokens.filter((t: any) => t.PATTERN.source.match(/^[a-zA-Z]/) && t.name !== 'Identifier'));
    allKeywordTokens.sort((a: any, b: any) => b.PATTERN.source.length - a.PATTERN.source.length);
    const identifierTokens = allPlugins.flatMap((p: IPlugin) => p.tokens.filter((t: any) => t.name === 'Identifier'));
    const otherTokens = allPlugins.flatMap((p: IPlugin) => p.tokens.filter((t: any) => !allKeywordTokens.includes(t) && !identifierTokens.includes(t)));
    allKeywordTokens.forEach(addToken);
    identifierTokens.forEach(addToken);
    otherTokens.forEach(addToken);
    const lexer = new Lexer(allTokens);
    const lexResult = lexer.tokenize(text);
    const parser = new BagOfDiceParser(allPlugins, strict);
    parser.input = lexResult.tokens;
    const cst = parser.expression();
    if (parser.errors.length > 0) {
      if (strict) {
        throw new Error('Parsing errors detected: ' + parser.errors[0].message);
      }
      // else: skip errors, try to return best-effort AST
    }
    const allHandlers = allPlugins.reduce((acc: any, p: IPlugin) => ({ ...acc, ...(p.getCstToAst ? p.getCstToAst() : {}) }), {});
    const ast = cstToAst(cst, allHandlers);
    return ast;
  }

  extract(ast: any): Record<string, any> {
    const extractedData: Record<string, any> = {};
    for (const plugin of this.plugins) {
      if (plugin.extract) {
        const data = plugin.extract(ast);
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            if (!extractedData[key]) {
              extractedData[key] = [];
            }
            extractedData[key].push(...data[key]);
          }
        }
      }
    }
    return extractedData;
  }

  evaluate(ast: any, context: any = {}) {
    debugLog('Evaluating AST:', ast);
    const warnings: string[] = [];
    const plugins = this.plugins;
    const pluginMap = Object.fromEntries(plugins.map(p => [p.name, p]));
    const rng = context.rng || this._rng;
    const tableData = context.tables || {};
    const rollQueryInputs = context.queries || {};
    const rollResults = context.rolls || {};
    // Helper: recursively evaluate AST nodes
    function evalNode(node: any): any {
      if (!node || typeof node !== 'object') return node;
      const pluginName = node.plugin;
      const plugin = pluginMap[pluginName];
      if (!plugin || typeof plugin.evaluator !== 'function') {
        throw new Error(`No evaluator found for plugin: ${pluginName}`);
      }
      // Roll Queries: expand using user input
      if (pluginName === 'roll-queries') {
        // Use node.id or prompt as key for user input
        let userInput: string | undefined = undefined;
        // Try id first (for multi-option), then prompt
        if (node.options && node.options.length > 1) {
          // Find the id in user input map
          userInput = rollQueryInputs[node.id] || rollQueryInputs[node.prompt];
        } else if (node.options && node.options.length === 1) {
          // Single option: treat as default
          userInput = rollQueryInputs[node.id] || rollQueryInputs[node.prompt];
        } else {
          userInput = rollQueryInputs[node.id] || rollQueryInputs[node.prompt];
        }
        try {
          return plugin.evaluator(node, userInput);
        } catch (e: any) {
          throw new Error(`Roll query error: ${e.message}`);
        }
      }
      // Table Rolls: pass table data
      if (pluginName === 'tables') {
        try {
          return plugin.evaluator(node, rng, tableData);
        } catch (e: any) {
          throw new Error(`Table roll error: ${e.message}`);
        }
      }
      // Dice: pass RNG (and cache if needed)
      if (pluginName === 'dice') {
        try {
          return plugin.evaluator(node, rng);
        } catch (e: any) {
          throw new Error(`Dice error: ${e.message}`);
        }
      }
      // Arithmetic: fallback
      if (pluginName === 'arithmetic') {
        try {
          return plugin.evaluator(node, rng);
        } catch (e: any) {
          throw new Error(`Arithmetic error: ${e.message}`);
        }
      }
      // Unknown plugin
      throw new Error(`Unknown plugin for evaluation: ${pluginName}`);
    }
    // Evaluate the AST
    let result: any;
    try {
      result = evalNode(ast);
    } catch (e: any) {
      throw e;
    }
    return { result, warnings };
  }
}

// --- Core Parser ---
class BagOfDiceParser extends CstParser {
  [key: string]: any;
  strict: boolean;
  constructor(plugins: IPlugin[], strict: boolean) {
    // Token merging and sorting (as before)
    const allTokens: any[] = [];
    const tokenSet = new Set<string>();
    const addToken = (token: any) => {
      if (token && !tokenSet.has(token.name)) {
        tokenSet.add(token.name);
        allTokens.push(token);
      }
    };
    const allKeywordTokens = plugins.flatMap(p => p.tokens.filter(t => t.PATTERN.source.match(/^[a-zA-Z]/) && t.name !== 'Identifier'));
    allKeywordTokens.sort((a, b) => b.PATTERN.source.length - a.PATTERN.source.length);
    const identifierTokens = plugins.flatMap(p => p.tokens.filter(t => t.name === 'Identifier'));
    const otherTokens = plugins.flatMap(p => p.tokens.filter(t => !allKeywordTokens.includes(t) && !identifierTokens.includes(t)));
    allKeywordTokens.forEach(addToken);
    identifierTokens.forEach(addToken);
    otherTokens.forEach(addToken);
    super(allTokens);
    this.strict = strict;
    const $ = this;

    // Top-level expression rule delegates to the last plugin's topRule (arithmetic by default)
    const lastPlugin = plugins[plugins.length - 1];
    let topRuleName = lastPlugin.topRule || 'atomicExpression';
    // If the topRule is 'expression', delegate directly to the plugin's parseTopRule
    if (topRuleName === 'expression' && lastPlugin.parseTopRule) {
      $.RULE('expression', function () {
        // Use the plugin's parseTopRule to parse the top-level expression
        return lastPlugin.parseTopRule!($, () => {
          if ($.strict) {
            throw new Error('No plugin claimed token and no core fallback implemented.');
          } else {
            const token = $.LA(1);
            $.CONSUME(token.tokenType);
            return null;
          }
        });
      });
    } else {
      $.RULE('expression', function () {
        // Call the plugin's topRule, or fallback to atomicExpression
        return $[topRuleName]();
      });
    }

    $.RULE('atomicExpression', () => {
      const token = $.LA(1);
      for (const plugin of plugins) {
        if (plugin.canParseToken && plugin.parseTopRule && plugin.canParseToken(token, $)) {
          // Pass a coreFallback function for plugin to delegate back to core
          return plugin.parseTopRule($, () => {
            // Core fallback: could be number, parenthesis, etc. For now, throw error or return null if not strict
            if (this.strict) {
              throw new Error('No plugin claimed token and no core fallback implemented.');
            } else {
              // Return null for this part of the AST
              $.CONSUME(token.tokenType); // consume the token to move forward
              return null;
            }
          });
        }
      }
      // If no plugin claims the token, handle as core (number, parenthesis, etc.) or throw error
      if (this.strict) {
        throw new Error('No plugin claimed token and no core fallback implemented.');
      } else {
        $.CONSUME(token.tokenType); // consume the token to move forward
        return null;
      }
    });
    $.RULE('parenthesisExpression', () => {
      // This is a minimal grouping rule, if needed by the core
      // If grouping is handled by a plugin, this can be removed too
      // Remove LParen/RParen if not defined in core tokens
      // This rule is a placeholder for grouping
    });
    $.RULE('functionCall', () => {
      // Remove functionCall rule entirely
    });
    this.performSelfAnalysis();
  }
} 
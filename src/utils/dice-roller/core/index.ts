// Core entry point for dice-roller engine
import type {
  ASTNode,
  EvaluationContext,
  DiceRollerPlugin,
  EvaluationResult,
} from '../lib/types';
import { SyntaxError, ValidationError, MissingDataError } from '../lib/types';
import { traverseAST } from '../lib/utils';
import { assignInlineRollIndices } from '../plugins/inline-rolls';
import { debug } from '../../debug';

// Plugin registry
const plugins: DiceRollerPlugin[] = [];

export function registerPlugin(plugin: DiceRollerPlugin) {
  plugins.push(plugin);
  plugin.register?.(DiceRollerCore);
}

// Multi-step evaluation pipeline

// Step 1: Parse input to AST
export function parseInput(input: string): ASTNode {
  // Try each plugin's parse function
  for (const plugin of plugins) {
    if (plugin.parse) {
      try {
        const ast = plugin.parse(input);
        // Assign inline roll indices after parsing
        assignInlineRollIndices(ast);
        return ast;
      } catch (error) {
        // Continue to next plugin if this one fails
        continue;
      }
    }
  }

  // If no plugin can parse, throw syntax error
  throw new SyntaxError(`Unable to parse input: ${input}`);
}

// Step 2: Extract queries, macros, tables, and rolls
export function extractQueries(ast: ASTNode): any[] {
  return plugins.flatMap((p) =>
    p.extractQueries ? p.extractQueries(ast) : [],
  );
}

export function extractMacros(ast: ASTNode): any[] {
  return plugins.flatMap((p) => (p.extractMacros ? p.extractMacros(ast) : []));
}

export function extractTables(ast: ASTNode): any[] {
  return plugins.flatMap((p) => (p.extractTables ? p.extractTables(ast) : []));
}

export function extractRolls(ast: ASTNode): any[] {
  return plugins.flatMap((p) => (p.extractRolls ? p.extractRolls(ast) : []));
}

export function extractFormatting(ast: ASTNode): any[] {
  return plugins.flatMap((p) =>
    p.extractFormatting ? p.extractFormatting(ast) : [],
  );
}

// Step 3: Evaluate AST with context
export function evaluate(
  ast: ASTNode,
  context: EvaluationContext,
): EvaluationResult {
  // DEBUG LOGGING
  function debugLog(...args: any[]) {
    if (typeof window === 'undefined') {
      debug('[core]', ...args);
    }
  }

  debugLog(
    'evaluate called with:',
    JSON.stringify(ast),
    JSON.stringify(context),
  );
  const warnings: string[] = context.warnings || [];

  if (typeof window === 'undefined') {
    debug('[core] evaluate called with node:', JSON.stringify(ast));
  }

  try {
    // Find the appropriate plugin to evaluate this node
    for (const plugin of plugins) {
      debugLog(`Trying plugin '${plugin.name}' for node type: ${ast.type}`);
      if (plugin.evaluate) {
        try {
          const result = plugin.evaluate(ast, { ...context, warnings });
          if (result) {
            debugLog(
              `Plugin '${plugin.name}' handled node type: ${ast.type}, result:`,
              JSON.stringify(result),
            );
            return {
              total: result.total || 0,
              rolls: result.rolls || [],
              warnings: [...warnings, ...(result.warnings || [])],
              details: result.details !== undefined ? result.details : {},
            };
          }
        } catch (err) {
          debugLog(
            `Plugin '${plugin.name}' threw error for node type: ${ast.type}:`,
            err,
          );
          // Continue to next plugin if this one fails
          continue;
        }
      }
    }

    debugLog('No plugin handled node type:', ast.type);
    throw new SyntaxError('Unable to evaluate node type: ' + ast.type);
  } catch (err) {
    debugLog('evaluate threw error:', err);
    if (
      err instanceof SyntaxError ||
      err instanceof ValidationError ||
      err instanceof MissingDataError
    ) {
      throw err;
    }
    throw new SyntaxError(`Evaluation failed: ${(err as Error).message}`);
  }
}

// Complete workflow function
export function processDiceExpression(
  input: string,
  context: EvaluationContext = {},
): EvaluationResult {
  try {
    // Step 1: Parse
    const ast = parseInput(input);

    // Step 2: Extract (for UI preparation)
    const queries = extractQueries(ast);
    const macros = extractMacros(ast);
    const tables = extractTables(ast);
    const rolls = extractRolls(ast);
    const formatting = extractFormatting(ast);

    // Step 3: Evaluate
    const result = evaluate(ast, context);

    return {
      ...result,
      details: {
        ...result.details,
        queries,
        macros,
        tables,
        rolls,
        formatting,
      },
    };
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      error instanceof ValidationError ||
      error instanceof MissingDataError
    ) {
      throw error;
    }
    throw new SyntaxError(`Processing failed: ${(error as Error).message}`);
  }
}

// Core object for plugin registration
export const DiceRollerCore = {
  registerPlugin,
  parseInput,
  evaluate,
  extractQueries,
  extractMacros,
  extractTables,
  extractRolls,
  extractFormatting,
  processDiceExpression,
  plugins,
};

// Re-export types for convenience
export type { ASTNode, EvaluationContext, DiceRollerPlugin, EvaluationResult };
export { SyntaxError, ValidationError, MissingDataError };

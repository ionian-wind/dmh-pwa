// Macros Plugin Entry
// Modular dice roller plugin for macro parsing, extraction, and evaluation
import type { DiceRollerPlugin, ASTNode, EvaluationContext, EvaluationResult } from '../../core';
import type { MacroAstNode, MacroExtractionResult } from './types';
import { debug } from '../../../debug';
import { evaluate } from '../../core';

// --- Parsing ---
// REMOVE parseMacroAst and do not export a parse function
// Macros are parsed as part of the main dice parser via the Macro token

// --- Extraction ---
export function extractMacros(ast: ASTNode): MacroExtractionResult[] {
  const macros: MacroExtractionResult[] = [];
  
  function traverse(node: any): void {
    if (!node || typeof node !== 'object') return;
    
    // Check if this is a macro node
    if (node.type === 'macro' && node.name) {
      macros.push({ name: node.name });
    }
    
    // Recursively traverse all properties
    for (const key in node) {
      if (node[key] && typeof node[key] === 'object') {
        if (Array.isArray(node[key])) {
          // Handle arrays
          node[key].forEach((item: any) => traverse(item));
        } else {
          // Handle objects
          traverse(node[key]);
        }
      }
    }
  }
  
  traverse(ast);
  debug('macrosPlugin', 'Extracted macros:', macros);
  return macros;
}

// --- Evaluation ---
export function evaluateMacroNode(node: ASTNode, context: EvaluationContext): EvaluationResult {
  debug('evaluateMacroNode called with:', JSON.stringify(node), JSON.stringify(context));
  if (node.type !== 'macro') {
    debug('Not a macro node:', node);
    throw new Error('Expected macro node');
  }
  const macroName = (node as any).name;
  const macroMap = (context as any).macroMap || {};
  const nestingLevel = (context as any).nestingLevel || 0;
  const maxNesting = (context as any).maxNesting || 99;
  debug('Evaluating macro:', { macroName, nestingLevel, maxNesting });
  if (nestingLevel >= maxNesting) {
    debug('Macro recursion limit exceeded');
    throw new Error(`Macro recursion limit exceeded (${maxNesting} levels)`);
  }
  const macroAst = macroMap[macroName];
  if (!macroAst) {
    debug('Macro not found:', macroName);
    throw new Error(`Macro '${macroName}' not found`);
  }
  const newContext = { ...context, nestingLevel: nestingLevel + 1 };
  debug('Expanding macro:', { macroName, nestingLevel: nestingLevel + 1 });
  const result = evaluate(macroAst, newContext);
  debug('Macro expansion result:', result);
  if (
    result &&
    typeof result === 'object' &&
    'type' in result &&
    typeof (result as any).type === 'string' &&
    !('total' in result)
  ) {
    debug('Result of macro expansion is still AST, recursively evaluating:', result);
    return evaluate(result as any, newContext);
  }
  // Add warning and details for macro expansion
  const warnings = [
    ...(result.warnings || []),
    `Macro '${macroName}' expanded (nesting level: ${nestingLevel + 1})`
  ];
  const details = {
    ...(result.details || {}),
    macro: macroName,
    nestingLevel: nestingLevel + 1
  };
  const finalResult = { ...result, warnings, details };
  debug('Returning macro evaluation result:', finalResult);
  return finalResult;
}

// --- Plugin Registration ---
export const macrosPlugin: DiceRollerPlugin = {
  name: 'macros',
  // No parse function
  evaluate(node, context) {
    debug('plugin evaluate called with:', node, context);
    if (node.type === 'macro') {
      const result = evaluateMacroNode(node, context);
      debug('plugin evaluate returning:', result);
      return result;
    }
    debug('plugin evaluate returning undefined for node:', node);
    // Return undefined for other node types so the core can try other plugins
    return undefined;
  },
  register() {
    // Register plugin with core system
  },
  extractMacros(ast: any): string[] {
    if (!ast) return [];
    debug('macrosPlugin', 'extractMacros AST:', JSON.stringify(ast));
    // Support both { type: 'macro', name } and { type: 'macro-call', macro }
    if (ast.type === 'macro') {
      return [ast.name];
    }
    if (ast.type === 'macro-call') {
      return [ast.macro];
    }
    let found: string[] = [];
    for (const key in ast) {
      if (typeof ast[key] === 'object' && ast[key] !== null) {
        found = found.concat(macrosPlugin.extractMacros?.(ast[key]) || []);
      }
    }
    return found;
  },
  evaluateMacro(ast: any, context: any) {
    debug('macrosPlugin', 'evaluateMacro called:', JSON.stringify(ast));
    return evaluateMacroNode(ast, context);
  },
};

/**
 * Macros Plugin
 * - extractMacros: returns an array of macro names from the AST
 * - evaluateMacro: evaluates macro nodes with recursion and context
 */ 
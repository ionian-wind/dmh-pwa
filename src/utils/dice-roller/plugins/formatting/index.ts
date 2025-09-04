// Formatting plugin
// Modular dice roller plugin for formatting/markup parsing, extraction, and evaluation
import type {
  DiceRollerPlugin,
  ASTNode,
  EvaluationContext,
  EvaluationResult,
} from '../../core';
import { debugLog } from '../../lib/utils';

// Formatting AST node type
interface FormattingNode {
  type: 'formatting';
  markup: string;
}

// --- Parsing ---
export function parseFormattingAst(input: string): ASTNode {
  // Support %NEWLINE% and other markup
  const match = input.match(/^%(\w+)%$/);
  if (match) {
    const markup = match[1];
    debugLog('formattingPlugin', 'Parsed formatting markup:', { markup });
    return { type: 'formatting', markup } as ASTNode;
  }
  debugLog('formattingPlugin', 'Failed to parse formatting markup:', input);
  throw new Error('Invalid formatting markup syntax');
}

// --- Extraction ---
export function extractFormatting(ast: ASTNode): string[] {
  const formatting: string[] = [];
  function traverse(node: any): void {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'formatting' && node.markup) {
      formatting.push(node.markup);
    }
    for (const key in node) {
      if (node[key] && typeof node[key] === 'object') {
        if (Array.isArray(node[key])) {
          node[key].forEach((item: any) => traverse(item));
        } else {
          traverse(node[key]);
        }
      }
    }
  }
  traverse(ast);
  debugLog('formattingPlugin', 'Extracted formatting:', formatting);
  return formatting;
}

// --- Evaluation ---
export function evaluateFormattingNode(
  node: ASTNode,
  context: EvaluationContext,
): EvaluationResult {
  if (node.type !== 'formatting') {
    throw new Error('Expected formatting node');
  }
  const markup = (node as any).markup;
  debugLog('formattingPlugin', 'Evaluating formatting:', { markup });
  let value = '';
  switch (markup.toUpperCase()) {
    case 'NEWLINE':
      value = '\n';
      break;
    default:
      throw new Error(`Unknown formatting markup: %${markup}%`);
  }
  return {
    total: 0,
    rolls: [],
    warnings: [],
    details: { markup, value },
  };
}

// --- Plugin Registration ---
export const formattingPlugin: DiceRollerPlugin = {
  name: 'formatting',
  parse: parseFormattingAst,
  evaluate: evaluateFormattingNode,
  register() {
    // Register plugin with core system
  },
  extractFormatting(ast: any) {
    return extractFormatting(ast);
  },
  evaluateFormatting(node: any, context: any) {
    debugLog(
      'formattingPlugin',
      'evaluateFormatting called:',
      JSON.stringify(node),
    );
    return evaluateFormattingNode(node, context);
  },
};

/**
 * Formatting Plugin
 * - extractFormatting: returns an array of formatting markups from the AST
 * - evaluateFormatting: evaluates formatting nodes by substituting markup tokens
 */

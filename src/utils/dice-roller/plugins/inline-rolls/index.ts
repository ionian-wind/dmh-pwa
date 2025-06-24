// Inline Rolls plugin
// Modular dice roller plugin for inline roll parsing, extraction, and evaluation
import type { DiceRollerPlugin, ASTNode, EvaluationContext, EvaluationResult } from '../../core';
import { debugLog } from '../../lib/utils';
import { parseInput, evaluate } from '../../core';

// Inline roll AST node type
export interface InlineRollNode {
  type: 'inline-roll';
  expression: string; // The dice/math expression inside [[...]]
  index?: number;     // The index of this inline roll in the parent expression
}

// --- Parsing ---
export function parseInlineRollAst(input: string): ASTNode {
  // Parse [[...]] syntax
  const match = input.match(/^\[\[(.+)\]\]$/s);
  if (!match) {
    debugLog('inlineRollsPlugin', 'Failed to parse inline roll:', input);
    throw new Error('Invalid inline roll syntax');
  }
  const expression = match[1].trim();
  const result: InlineRollNode = { type: 'inline-roll', expression };
  debugLog('inlineRollsPlugin', 'Parsed inline roll:', result);
  return result as ASTNode;
}

// --- Extraction ---
export function extractInlineRolls(ast: ASTNode): InlineRollNode[] {
  const rolls: InlineRollNode[] = [];
  function traverse(node: any): void {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'inline-roll' && node.expression) {
      rolls.push(node as InlineRollNode);
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
  debugLog('inlineRollsPlugin', 'Extracted inline rolls:', rolls);
  return rolls;
}

// Helper: assign indices to inline rolls in the AST (in order of appearance)
export function assignInlineRollIndices(ast: any, counter = { i: 0 }): void {
  if (!ast || typeof ast !== 'object') return;
  if (ast.type === 'inline-roll') {
    ast.index = counter.i++;
  }
  for (const key in ast) {
    if (ast[key] && typeof ast[key] === 'object') {
      if (Array.isArray(ast[key])) {
        ast[key].forEach((item: any) => assignInlineRollIndices(item, counter));
      } else {
        assignInlineRollIndices(ast[key], counter);
      }
    }
  }
}

// --- Evaluation ---
export function evaluateInlineRollNode(node: ASTNode, context: EvaluationContext): EvaluationResult {
  if (node.type !== 'inline-roll') {
    throw new Error('Expected inline roll node');
  }
  const inlineNode = node as InlineRollNode;
  if (typeof inlineNode.index !== 'number') {
    throw new Error('Inline roll node missing index');
  }
  // Evaluate the inner expression recursively using the core parser/evaluator
  const innerAst = parseInput(inlineNode.expression);
  // Evaluate with the same context, but do not pass rolls yet (to avoid recursion)
  const result = evaluate(innerAst, context);
  // Store the result in the context's rolls map by index
  if (!context.rolls) context.rolls = {};
  context.rolls[inlineNode.index] = result.total;
  return result;
}

// --- Plugin Registration ---
export const inlineRollsPlugin: DiceRollerPlugin = {
  name: 'inline-rolls',
  parse: parseInlineRollAst,
  evaluate: evaluateInlineRollNode,
  register() {
    // Register plugin with core system
  },
  extractRolls(ast: any) {
    return extractInlineRolls(ast);
  },
  evaluateRollReference(node: any, context: any) {
    debugLog('inlineRollsPlugin', 'evaluateInlineRoll called:', JSON.stringify(node));
    return evaluateInlineRollNode(node, context);
  },
}; 
// Roll References plugin
// Modular dice roller plugin for roll reference parsing, extraction, and evaluation
import type { DiceRollerPlugin, ASTNode, EvaluationContext, EvaluationResult } from '../../core';
import { debugLog } from '../../lib/utils';

// Roll reference AST node type
interface RollReferenceNode {
  type: 'roll-reference';
  ref: string;
}

// --- Parsing ---
export function parseRollReferenceAst(input: string): ASTNode {
  // Support $[[0]] and $[roll:XYZ] syntax
  // $[[N]] can refer to inline roll results
  let match = input.match(/^\$\[\[(\d+)\]\]$/);
  if (match) {
    const ref = match[1];
    debugLog('rollReferencesPlugin', 'Parsed roll reference (inline):', { ref });
    return { type: 'roll-reference', ref } as ASTNode;
  }
  match = input.match(/^\$\[roll:([a-zA-Z0-9_-]+)\]$/);
  if (match) {
    const ref = match[1];
    debugLog('rollReferencesPlugin', 'Parsed roll reference (named):', { ref });
    return { type: 'roll-reference', ref } as ASTNode;
  }
  debugLog('rollReferencesPlugin', 'Failed to parse roll reference:', input);
  throw new Error('Invalid roll reference syntax');
}

// --- Extraction ---
export function extractRollReferences(ast: ASTNode): string[] {
  const refs: string[] = [];
  function traverse(node: any): void {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'roll-reference' && node.ref) {
      refs.push(node.ref);
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
  debugLog('rollReferencesPlugin', 'Extracted roll references:', refs);
  return refs;
}

// --- Evaluation ---
export function evaluateRollReferenceNode(node: ASTNode, context: EvaluationContext): EvaluationResult {
  if (node.type !== 'roll-reference') {
    throw new Error('Expected roll reference node');
  }
  const ref = (node as any).ref;
  const rolls = (context as any).rolls || {};
  debugLog('rollReferencesPlugin', 'Evaluating roll reference:', { ref, rolls });
  if (!(ref in rolls)) {
    throw new Error(`Referenced roll '${ref}' not found`);
  }
  const value = rolls[ref];
  debugLog('rollReferencesPlugin', 'Roll reference value:', { ref, value });
  return {
    total: typeof value === 'number' ? value : 0,
    rolls: Array.isArray(value) ? value : [],
    warnings: [],
    details: { ref, value }
  };
}

// --- Plugin Registration ---
export const rollReferencesPlugin: DiceRollerPlugin = {
  name: 'roll-references',
  parse: parseRollReferenceAst,
  evaluate: evaluateRollReferenceNode,
  register() {
    // Register plugin with core system
  },
  extractRolls(ast: any) {
    return extractRollReferences(ast);
  },
  evaluateRollReference(node: any, context: any) {
    debugLog('rollReferencesPlugin', 'evaluateRollReference called:', JSON.stringify(node));
    return evaluateRollReferenceNode(node, context);
  },
};

/**
 * Roll References Plugin
 * - extractRolls: returns an array of roll reference IDs from the AST
 * - evaluateRollReference: evaluates roll reference nodes by substituting referenced results
 */ 
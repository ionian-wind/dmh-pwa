// Roll Queries plugin
// Modular dice roller plugin for roll query parsing, extraction, and evaluation
import type { DiceRollerPlugin, ASTNode, EvaluationContext, EvaluationResult } from '../../core';
import { debugLog } from '../../lib/utils';

// Roll query AST node type
interface RollQueryNode {
  type: 'roll-query';
  prompt: string;
  default?: string;
  options?: Array<{ label: string; value: string }>;
}

// Roll query extraction result type
interface RollQueryExtractionResult {
  prompt: string;
  default?: string;
  options?: Array<{ label: string; value: string }>;
}

// --- Parsing ---
export function parseRollQueryAst(input: string): ASTNode {
  // Parse roll query syntax: ?{Prompt|Default} or ?{Prompt|Option1,Option2} or ?{Prompt|Label1,Value1|Label2,Value2}
  // Examples: ?{Bonus|0}, ?{Weapon|Sword,Axe}, ?{Attack or Damage|Attack,1d20+5|Damage,1d8+3}
  const match = input.match(/^\?\{([^}]*)\}$/);
  if (!match) {
    debugLog('rollQueriesPlugin', 'Failed to parse roll query:', input);
    throw new Error('Invalid roll query syntax');
  }
  
  const content = match[1];
  if (content.trim() === '') {
    throw new Error('Roll query must have at least a prompt');
  }
  const parts = content.split('|');
  
  const prompt = parts[0].trim();
  let defaultVal: string | undefined;
  let options: Array<{ label: string; value: string }> | undefined;
  
  if (parts.length === 2) {
    // Simple case: ?{Prompt|Default}
    const secondPart = parts[1].trim();
    if (secondPart.includes(',')) {
      // Options case: ?{Prompt|Option1,Option2}
      options = secondPart.split(',').map(opt => ({ label: opt.trim(), value: opt.trim() }));
    } else {
      // Default case: ?{Prompt|Default}
      defaultVal = secondPart;
    }
  } else if (parts.length > 2) {
    // Complex case: ?{Prompt|Label1,Value1|Label2,Value2}
    options = parts.slice(1).map(part => {
      const [label, value] = part.split(',').map(s => s.trim());
      return { label: label || value, value: value || label };
    });
  }
  
  const result: RollQueryNode = { type: 'roll-query', prompt };
  if (defaultVal) result.default = defaultVal;
  if (options) result.options = options;
  
  debugLog('rollQueriesPlugin', 'Parsed roll query:', result);
  return result as ASTNode;
}

// --- Extraction ---
export function extractRollQueries(ast: ASTNode): RollQueryExtractionResult[] {
  const queries: RollQueryExtractionResult[] = [];
  
  function traverse(node: any): void {
    if (!node || typeof node !== 'object') return;
    
    // Check if this is a roll query node
    if (node.type === 'roll-query' && node.prompt) {
      const query: RollQueryExtractionResult = { prompt: node.prompt };
      if (node.default !== undefined) query.default = node.default;
      if (node.options) query.options = node.options;
      queries.push(query);
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
  debugLog('rollQueriesPlugin', 'Extracted roll queries:', queries);
  return queries;
}

// --- Evaluation ---
export function evaluateRollQueryNode(node: ASTNode, context: EvaluationContext): EvaluationResult {
  if (node.type !== 'roll-query') {
    throw new Error('Expected roll query node');
  }
  
  const queryNode = node as RollQueryNode;
  const userInput = (context as any).userInput || {};
  const queryId = queryNode.prompt; // Use prompt as query ID for now
  const nestingLevel = (context as any).nestingLevel || 0;
  const maxNesting = (context as any).maxNesting || 99;
  
  debugLog('rollQueriesPlugin', 'Evaluating roll query:', { queryNode, userInput, nestingLevel, maxNesting });
  
  // Check recursion/nesting limit
  if (nestingLevel >= maxNesting) {
    debugLog('rollQueriesPlugin', `Roll query recursion limit exceeded (${maxNesting} levels)`);
    throw new Error(`Roll query recursion limit exceeded (${maxNesting} levels)`);
  }
  
  // Determine value to use: user input or default
  let userValue;
  if (queryId in userInput) {
    userValue = userInput[queryId];
    debugLog('rollQueriesPlugin', 'Using user input for query:', { queryId, userValue });
  } else if (queryNode.default !== undefined) {
    userValue = queryNode.default;
    debugLog('rollQueriesPlugin', 'Using default value for query:', { queryId, userValue });
  } else {
    debugLog('rollQueriesPlugin', 'User input not provided and no default for query:', { queryId });
    throw new Error(`User input not provided for query: ${queryId}`);
  }
  
  // Validate user input against options if provided
  if (queryNode.options) {
    const validValues = queryNode.options.map(opt => opt.value);
    if (!validValues.includes(userValue)) {
      throw new Error(`Invalid option '${userValue}' for query '${queryId}'. Valid options: ${validValues.join(', ')}`);
    }
  }
  
  // Try to parse as number, fallback to string
  let result: number;
  if (typeof userValue === 'number') {
    result = userValue;
  } else if (typeof userValue === 'string') {
    const parsed = parseFloat(userValue);
    result = isNaN(parsed) ? 0 : parsed;
  } else {
    result = 0;
  }
  
  debugLog('rollQueriesPlugin', 'Roll query result:', { queryId, userValue, result });
  
  return {
    total: result,
    rolls: [],
    warnings: [],
    details: { query: queryId, userValue, result, nestingLevel: nestingLevel + 1 }
  };
}

// --- Plugin Registration ---
export const rollQueriesPlugin: DiceRollerPlugin = {
  name: 'roll-queries',
  parse: parseRollQueryAst,
  evaluate: evaluateRollQueryNode,
  register() {
    // Register plugin with core system
  },
  extractQueries(ast: any) {
    return extractRollQueries(ast);
  },
  evaluateRollQuery(node: any, context: any) {
    debugLog('rollQueriesPlugin', 'evaluateRollQuery called:', JSON.stringify(node));
    return evaluateRollQueryNode(node, context);
  },
};

/**
 * Roll Queries Plugin
 * - extractQueries: returns an array of roll query schemas from the AST
 * - evaluateRollQuery: evaluates roll query nodes by substituting user input
 */ 
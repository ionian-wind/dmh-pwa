// Tables Plugin Entry
// Modular dice roller plugin for table parsing, extraction, and evaluation
import type { DiceRollerPlugin, ASTNode, EvaluationContext, EvaluationResult } from '../../core';
import type { TableAstNode, TableExtractionResult } from './types';
import { debugLog } from '../../lib/utils';
import { debug } from '../../../debug';

// --- Parsing ---
export function parseTableAst(input: string): ASTNode {
  // Parse table roll syntax: Nt[table-name]
  // Example: 2t[loot-table]
  const match = input.match(/^(\d+)?t\[([a-zA-Z0-9_-]+)\]$/);
  if (match) {
    const count = match[1] ? parseInt(match[1], 10) : 1;
    const name = match[2];
    debugLog('tablesPlugin', 'Parsed table roll:', { count, name });
    return { type: 'table', name, count } as ASTNode;
  }
  debugLog('tablesPlugin', 'Failed to parse table roll:', input);
  throw new Error('Invalid table roll syntax');
}

// --- Extraction ---
export function extractTables(ast: ASTNode): TableExtractionResult[] {
  const tables: TableExtractionResult[] = [];
  function traverse(node: any): void {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'table' && node.name) {
      tables.push({ name: node.name, count: node.count || 1 });
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
  debugLog('tablesPlugin', 'Extracted tables:', tables);
  return tables;
}

// --- Evaluation ---
export function evaluateTableNode(node: ASTNode, context: EvaluationContext): EvaluationResult {
  if (node.type !== 'table') {
    throw new Error('Expected table node');
  }
  const tableName = (node as any).name;
  const count = (node as any).count;
  const tableMap = (context as any).tableMap || {};
  const table = tableMap[tableName];
  debugLog('tablesPlugin', 'Evaluating table:', { tableName, count, table });
  if (!Array.isArray(table) || table.length === 0) {
    debugLog('tablesPlugin', `Table '${tableName}' not found or empty`, { table });
    throw new Error(`Table '${tableName}' not found or empty`);
  }
  if (typeof count !== 'number' || count < 1 || !Number.isInteger(count)) {
    debugLog('tablesPlugin', `Invalid roll count: ${count}`);
    throw new Error(`Invalid roll count for table '${tableName}': ${count}`);
  }

  // Build weighted pool: each entry appears as many times as its weight (default 1)
  let weightedPool: any[] = [];
  if (table.some(entry => typeof entry === 'object' && entry.weight)) {
    table.forEach(entry => {
      if (typeof entry === 'object' && entry.weight && entry.value !== undefined) {
        for (let i = 0; i < entry.weight; i++) weightedPool.push(entry.value);
      }
    });
    debugLog('tablesPlugin', 'Weighted pool (object entries):', weightedPool);
  } else {
    // Classic: repeated entries are naturally weighted
    weightedPool = table.filter(entry => typeof entry === 'string' || typeof entry === 'number');
    debugLog('tablesPlugin', 'Weighted pool (classic):', weightedPool);
  }
  if (weightedPool.length === 0) {
    debugLog('tablesPlugin', `Weighted pool is empty for table '${tableName}'`);
    throw new Error(`Table '${tableName}' has no valid entries`);
  }

  // Roll count times on the weighted pool
  const results: any[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * weightedPool.length);
    results.push(weightedPool[idx]);
  }
  debugLog('tablesPlugin', 'Table roll results:', results);
  return {
    total: 0,
    rolls: results as any[],
    warnings: [],
    details: { table: tableName, count, results, weightedPoolSize: weightedPool.length }
  };
}

// --- Plugin Registration ---
export const tablesPlugin: DiceRollerPlugin = {
  name: 'tables',
  parse: parseTableAst,
  evaluate: evaluateTableNode,
  register() {
    // Register plugin with core system
  },
  extractTables(ast: any): string[] {
    if (!ast) return [];
    debug('[tablesPlugin] extractTables AST:', JSON.stringify(ast));
    if (ast.type === 'table') {
      return [ast.name];
    }
    if (ast.type === 'table-roll') {
      return [ast.table];
    }
    let found: string[] = [];
    for (const key in ast) {
      if (typeof ast[key] === 'object' && ast[key] !== null) {
        found = found.concat(tablesPlugin.extractTables(ast[key]));
      }
    }
    return found;
  },
  evaluateTable(ast: any, context: any) {
    debug('[tablesPlugin] evaluateTable called:', JSON.stringify(ast));
    throw new Error('Table evaluation not implemented');
  },
};

// Documentation
/**
 * Tables Plugin
 * - extractTables: returns an array of table names from the AST
 * - evaluateTable: throws (not implemented)
 */ 
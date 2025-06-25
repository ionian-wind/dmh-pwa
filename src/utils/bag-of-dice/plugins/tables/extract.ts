import { TableRollNode } from './converters';

export function extractTables(ast: any): string[] {
  const tables: string[] = [];
  function visit(node: any) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'TableRoll' && node.table) {
      tables.push(node.table);
    }
    for (const key in node) {
      if (node.hasOwnProperty(key)) {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(visit);
        } else if (typeof child === 'object') {
          visit(child);
        }
      }
    }
  }
  visit(ast);
  return tables;
} 
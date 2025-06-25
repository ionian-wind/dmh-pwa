import { RollQueryNode } from './converters';

export function extractQuery(ast: any): RollQueryNode[] {
  const queries: RollQueryNode[] = [];
  function visit(node: any) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'RollQuery') queries.push(node);
    for (const key in node) {
      if (Object.prototype.hasOwnProperty.call(node, key)) {
        const child = node[key];
        if (Array.isArray(child)) child.forEach(visit);
        else if (typeof child === 'object') visit(child);
      }
    }
  }
  visit(ast);
  return queries;
} 
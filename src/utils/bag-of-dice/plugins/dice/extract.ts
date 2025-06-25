import { DiceAST } from './converters';

export function extractDice(ast: any): DiceAST[] {
  const diceNodes: DiceAST[] = [];
  function visit(node: any) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Dice' || node.type === 'Group') {
      diceNodes.push(node);
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
  return diceNodes;
} 
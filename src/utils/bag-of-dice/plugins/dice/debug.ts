import { parseDiceExpression } from './parser';
import { diceCstToAstHandlers } from './converters';
import { evaluateDiceAst } from './evaluator';
import { cstToAst } from '../../utils/cstAstConverter';

function debugDice(expr: string) {
  try {
    const cst = parseDiceExpression(expr);
    console.log('CST:', JSON.stringify(cst, null, 2));
    const ast = cstToAst(cst, diceCstToAstHandlers);
    console.log('AST:', JSON.stringify(ast, null, 2));
    const result = evaluateDiceAst(ast, Math.random);
    console.log('Result:', result);
  } catch (e) {
    console.error('Error:', e);
  }
}

// Try various expressions
const tests = [
  '3d6',
  'd8',
  'd%',
  '2dF.3',
  '2d[1,2,3,5,8]',
  '(2)d6',
  '2d(6)',
  '{1d6,2d8}',
];

tests.forEach(expr => {
  console.log(`\n--- ${expr} ---`);
  debugDice(expr);
}); 
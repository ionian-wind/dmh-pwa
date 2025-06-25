import { parseArithmeticExpression } from './parser';
import { cstToAst } from '../../utils/cstAstConverter';
import { arithmeticCstToAstHandlers } from './converters';
import { evaluateArithmeticAST } from './evaluator';

const expressions = [
  '1+2',
  '5-3',
  '2*3',
  '8/2',
  '7%4',
  '2**3',
  '2+3*4',
  '(2+3)*4',
  'floor(2.9)',
  'ceil(2.1)',
  'round(2.5)',
  'abs(-5)',
  '-5',
  '+5',
  '-(2+3)'
];

for (const expr of expressions) {
  try {
    console.log('---');
    console.log('Expression:', expr);
    const cst = parseArithmeticExpression(expr);
    const ast = cstToAst(cst, arithmeticCstToAstHandlers);
    console.log('AST:', JSON.stringify(ast, null, 2));
    const result = evaluateArithmeticAST(ast);
    console.log('Result:', result);
  } catch (e) {
    console.error('Error:', e);
  }
} 
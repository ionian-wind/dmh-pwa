import { ArithmeticAST } from './parser';
import { debugLog } from '../../index';

export function evaluateArithmeticAST(ast: ArithmeticAST, rng: () => number = Math.random, ...args: any[]): number {
  debugLog('Evaluating AST node:', ast);
  switch (ast.type) {
    case 'Add':
      return evaluateArithmeticAST(ast.left, rng, ...args) + evaluateArithmeticAST(ast.right, rng, ...args);
    case 'Sub':
      return evaluateArithmeticAST(ast.left, rng, ...args) - evaluateArithmeticAST(ast.right, rng, ...args);
    case 'Mul':
      return evaluateArithmeticAST(ast.left, rng, ...args) * evaluateArithmeticAST(ast.right, rng, ...args);
    case 'Div': {
      const divisor = evaluateArithmeticAST(ast.right, rng, ...args);
      if (divisor === 0) throw new Error('Division by zero');
      return evaluateArithmeticAST(ast.left, rng, ...args) / divisor;
    }
    case 'Mod': {
      const divisor = evaluateArithmeticAST(ast.right, rng, ...args);
      if (divisor === 0) throw new Error('Division by zero');
      return evaluateArithmeticAST(ast.left, rng, ...args) % divisor;
    }
    case 'Pow':
      return Math.pow(evaluateArithmeticAST(ast.left, rng, ...args), evaluateArithmeticAST(ast.right, rng, ...args));
    case 'UnaryPlus':
      return +evaluateArithmeticAST(ast.value, rng, ...args);
    case 'UnaryMinus':
      return -evaluateArithmeticAST(ast.value, rng, ...args);
    case 'Floor':
      return Math.floor(evaluateArithmeticAST(ast.arg, rng, ...args));
    case 'Ceil':
      return Math.ceil(evaluateArithmeticAST(ast.arg, rng, ...args));
    case 'Round':
      return Math.round(evaluateArithmeticAST(ast.arg, rng, ...args));
    case 'Abs':
      return Math.abs(evaluateArithmeticAST(ast.arg, rng, ...args));
    case 'NumberLiteral':
      return ast.value;
    default:
      throw new Error('Unknown AST node type: ' + (ast as any).type);
  }
} 
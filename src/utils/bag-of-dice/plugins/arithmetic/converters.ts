import { ArithmeticAST } from './parser';
import { CstToAstHandlerMap, AstToCstHandlerMap } from '../../utils/cstAstConverter';

// Helper to extract a single child node from Chevrotain CST
function singleChild(cstNode: any, key: string) {
  return cstNode.children[key]?.[0];
}
// Helper to extract all child nodes from Chevrotain CST
function allChildren(cstNode: any, key: string) {
  return cstNode.children[key] || [];
}

// CST to AST handlers for arithmetic plugin
export const arithmeticCstToAstHandlers: CstToAstHandlerMap = {
  // Entry point: expression
  entry: (cst, helpers) => helpers(singleChild(cst, 'expression'), arithmeticCstToAstHandlers),
  expression: (cst, helpers) => helpers(singleChild(cst, 'additionExpression'), arithmeticCstToAstHandlers),
  additionExpression: (cst, helpers) => {
    let value = helpers(singleChild(cst, 'multiplicationExpression'), arithmeticCstToAstHandlers);
    const pluses = allChildren(cst, 'Plus');
    const minuses = allChildren(cst, 'Minus');
    const multiplications = allChildren(cst, 'multiplicationExpression').slice(1);
    let idx = 0;
    for (const token of pluses) {
      value = { type: 'Add', left: value, right: helpers(multiplications[idx++], arithmeticCstToAstHandlers), plugin: 'arithmetic' };
    }
    for (const token of minuses) {
      value = { type: 'Sub', left: value, right: helpers(multiplications[idx++], arithmeticCstToAstHandlers), plugin: 'arithmetic' };
    }
    return value;
  },
  multiplicationExpression: (cst, helpers) => {
    let value = helpers(singleChild(cst, 'exponentExpression'), arithmeticCstToAstHandlers);
    const mults = allChildren(cst, 'Mult');
    const divs = allChildren(cst, 'Div');
    const mods = allChildren(cst, 'Mod');
    const exponents = allChildren(cst, 'exponentExpression').slice(1);
    let idx = 0;
    for (const token of mults) {
      value = { type: 'Mul', left: value, right: helpers(exponents[idx++], arithmeticCstToAstHandlers), plugin: 'arithmetic' };
    }
    for (const token of divs) {
      value = { type: 'Div', left: value, right: helpers(exponents[idx++], arithmeticCstToAstHandlers), plugin: 'arithmetic' };
    }
    for (const token of mods) {
      value = { type: 'Mod', left: value, right: helpers(exponents[idx++], arithmeticCstToAstHandlers), plugin: 'arithmetic' };
    }
    return value;
  },
  exponentExpression: (cst, helpers) => {
    let value = helpers(singleChild(cst, 'unaryExpression'), arithmeticCstToAstHandlers);
    const pows = allChildren(cst, 'Pow');
    const unaries = allChildren(cst, 'unaryExpression').slice(1);
    let idx = 0;
    for (const token of pows) {
      value = { type: 'Pow', left: value, right: helpers(unaries[idx++], arithmeticCstToAstHandlers), plugin: 'arithmetic' };
    }
    return value;
  },
  unaryExpression: (cst, helpers) => {
    if (cst.children.Plus) {
      return { type: 'UnaryPlus', value: helpers(singleChild(cst, 'unaryExpression'), arithmeticCstToAstHandlers), plugin: 'arithmetic' };
    }
    if (cst.children.Minus) {
      return { type: 'UnaryMinus', value: helpers(singleChild(cst, 'unaryExpression'), arithmeticCstToAstHandlers), plugin: 'arithmetic' };
    }
    if (cst.children.functionExpression) {
      return helpers(singleChild(cst, 'functionExpression'), arithmeticCstToAstHandlers);
    }
    return helpers(singleChild(cst, 'atomicExpression'), arithmeticCstToAstHandlers);
  },
  functionExpression: (cst, helpers) => {
    if (cst.children.Floor) {
      return { type: 'Floor', arg: helpers(singleChild(cst, 'expression'), arithmeticCstToAstHandlers), plugin: 'arithmetic' };
    }
    if (cst.children.Ceil) {
      return { type: 'Ceil', arg: helpers(singleChild(cst, 'expression'), arithmeticCstToAstHandlers), plugin: 'arithmetic' };
    }
    if (cst.children.Round) {
      return { type: 'Round', arg: helpers(singleChild(cst, 'expression'), arithmeticCstToAstHandlers), plugin: 'arithmetic' };
    }
    if (cst.children.Abs) {
      return { type: 'Abs', arg: helpers(singleChild(cst, 'expression'), arithmeticCstToAstHandlers), plugin: 'arithmetic' };
    }
    throw new Error('Unknown functionExpression CST');
  },
  atomicExpression: (cst, helpers) => {
    if (cst.children.NumberLiteral) {
      const num = cst.children.NumberLiteral[0].image;
      return { type: 'NumberLiteral', value: parseFloat(num), plugin: 'arithmetic' };
    }
    // Parenthesized expression
    return helpers(singleChild(cst, 'expression'), arithmeticCstToAstHandlers);
  },
};

// AST to CST handlers for arithmetic plugin (stub, not implemented)
export const arithmeticAstToCstHandlers: AstToCstHandlerMap = {
  // TODO: Implement if needed
}; 
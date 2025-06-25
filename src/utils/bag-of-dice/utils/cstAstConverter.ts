/**
 * Universal CST <-> AST converter utility for Bag of Dice plugins.
 *
 * Usage example:
 *
 * import { cstToAst, astToCst, CstToAstHandlerMap, AstToCstHandlerMap } from './cstAstConverter';
 * import { arithmeticCstToAstHandlers, arithmeticAstToCstHandlers } from '../plugins/arithmetic/converters';
 *
 * const ast = cstToAst(cst, arithmeticCstToAstHandlers);
 * const cst = astToCst(ast, arithmeticAstToCstHandlers);
 */

/**
 * Handler map for CST to AST conversion.
 * Each plugin should provide a map from CST node type to handler function.
 */
export type CstToAstHandlerMap = {
  [nodeType: string]: (cstNode: any, helpers: typeof cstToAst) => any;
};

/**
 * Handler map for AST to CST conversion.
 * Each plugin should provide a map from AST node type to handler function.
 */
export type AstToCstHandlerMap = {
  [nodeType: string]: (astNode: any, helpers: typeof astToCst) => any;
};

/**
 * Convert a CST to an AST using the provided handler map.
 * @param cst The CST node to convert.
 * @param handlers The handler map for CST node types.
 * @returns The converted AST node.
 */
export function cstToAst(cst: any, handlers: CstToAstHandlerMap): any {
  if (!cst || typeof cst !== 'object') return cst;
  const type = cst.type || cst.name; // Chevrotain CST: name, custom: type
  const handler = handlers[type];
  if (!handler) throw new Error(`No CST-to-AST handler for node type: ${type}`);
  return handler(cst, cstToAst);
}

/**
 * Convert an AST to a CST using the provided handler map.
 * @param ast The AST node to convert.
 * @param handlers The handler map for AST node types.
 * @returns The converted CST node.
 */
export function astToCst(ast: any, handlers: AstToCstHandlerMap): any {
  if (!ast || typeof ast !== 'object') return ast;
  const type = ast.type;
  const handler = handlers[type];
  if (!handler) throw new Error(`No AST-to-CST handler for node type: ${type}`);
  return handler(ast, astToCst);
} 
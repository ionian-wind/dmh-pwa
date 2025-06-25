import type { ASTNode, ParserContext } from './parser';

/**
 * Evaluator for the dice engine AST.
 *
 * @param ast - The AST to evaluate
 * @param ctx - The parser context (with plugins, errors, warnings, etc.)
 * @param options - Evaluation options (RNG, tables, roll results, user input, etc.)
 * @returns The evaluation result (value, warnings, etc.)
 */
export function evaluateAST(
  ast: ASTNode,
  ctx: ParserContext,
  options: any = {}
): { value: any; warnings: any[] } {
  // Use the context's evaluate function, which delegates to plugins
  let value: any;
  try {
    value = ctx.evaluate?.(ast, options);
  } catch (err: any) {
    ctx.errors.push(err);
    throw err;
  }
  return {
    value,
    warnings: ctx.warnings,
  };
} 
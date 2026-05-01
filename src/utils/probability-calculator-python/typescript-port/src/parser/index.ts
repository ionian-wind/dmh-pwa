import {
  CLexer,
  parserInstance,
  parse,
  parseAndExec,
  allTokens,
  EvalResult,
} from './parser';
export {
  CLexer,
  parserInstance,
  parse,
  parseAndExec,
  allTokens,
  EvalResult,
} from './parser';

export const build_lex_yacc = () => [CLexer, parserInstance];
export const do_yacc = (to_parse: string, lexer: any, parser: any) => {
  try {
    parserInstance.input = lexer.tokenize(to_parse).tokens;
    parserInstance.program();
    return { cst: parserInstance.cstNode, errors: parserInstance.errors };
  } catch (e: any) {
    return { cst: null, errors: [e.message] };
  }
};
export const do_resolve = (yaccResult: any) => '';
export const do_lex = (to_parse: string, lexer: any) =>
  lexer.tokenize(to_parse);

export function safe_exec(
  r: string,
  global_vars: Record<string, unknown> = {},
) {
  return parseAndExec(r);
}

export function compile_anydice(to_parse: string) {
  return parseAndExec(to_parse);
}

export function unsafe_exec(
  r: string,
  global_vars: Record<string, unknown> = {},
) {
  return parseAndExec(r);
}

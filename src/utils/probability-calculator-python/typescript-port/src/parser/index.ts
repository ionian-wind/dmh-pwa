import { CParser } from './parser';
import { CLexer } from './lexer';

export interface Node {
  // Placeholder for AST node
  type: string;
  value?: unknown;
  children?: Node[];
}

export function build_lex_yacc(debug = false): [CLexer, CParser] {
  const lexer = CLexer;
  const parser = new CParser();
  return [lexer, parser];
}

export function do_lex(to_parse: string, lexer: typeof CLexer, verbose_lex = false): unknown[] {
  return [];
}

export function do_yacc(to_parse: string, lexer: typeof CLexer, parser: CParser, verbose_yacc = false): Node | null {
  return null;
}

export function do_resolve(yacc_ret: Node | null, verbose_parseed_python = false, flags?: unknown): string {
  return '';
}

export function compile_anydice(to_parse: string, flags?: unknown): string {
  return '';
}

export function safe_exec(r: string, global_vars?: Record<string, unknown>): unknown[] {
  return [];
}

export function unsafe_exec(r: string, global_vars?: Record<string, unknown>): unknown[] {
  return [];
}
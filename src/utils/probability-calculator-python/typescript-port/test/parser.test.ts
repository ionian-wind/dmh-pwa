import { describe, it, expect, beforeEach } from 'vitest';
import { parse_and_exec, build_lex_yacc, compile_anydice, safe_exec, Settings } from '../src/parser/index';
import { RV, settings_set, settings_reset, roll, Seq, output as print_output } from '../src/index';

describe('parser', () => {
  beforeEach(() => {
    settings_reset();
  });

  it('should build lexer and parser', () => {
    const [lexer, parser] = build_lex_yacc();
    expect(lexer).toBeDefined();
    expect(parser).toBeDefined();
  });
});
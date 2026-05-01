import { describe, it, expect, beforeEach } from 'vitest';
import {
  build_lex_yacc,
  do_yacc,
  do_resolve,
  do_resolve as resolve,
  safe_exec,
} from '../src/parser/index';
import { settings_set, settings_reset, RV, Seq, roll } from '../src/index';

function check(x: unknown, expected: unknown): boolean {
  if (x instanceof RV && expected instanceof RV) {
    return (
      x.vals.join(',') === expected.vals.join(',') &&
      x.probs.join(',') === expected.probs.join(',')
    );
  }
  if (x instanceof Seq && expected instanceof Seq) {
    return x.seq.join(',') === expected.seq.join(',');
  }
  return x === expected;
}

describe('parser', () => {
  beforeEach(() => {
    settings_reset();
    settings_set('RV_IGNORE_ZERO_PROBS', true);
  });

  describe('basic parsing', () => {
    it('should build lexer and parser', () => {
      const [lexer] = build_lex_yacc();
      expect(lexer).toBeDefined();
    });

    it('should parse simple output', () => {
      const [lexer] = build_lex_yacc();
      const result = do_yacc('output 1', lexer, null as any);
      expect(result.cst).toBeDefined();
      expect(result.errors.length).toBe(0);
    });

    it('should parse variable assignment', () => {
      const [lexer] = build_lex_yacc();
      const result = do_yacc('A:1', lexer, null as any);
      expect(result.cst).toBeDefined();
    });

    it('should parse sequence', () => {
      const [lexer] = build_lex_yacc();
      const result = do_yacc('output{1,2,3}', lexer, null as any);
      expect(result.cst).toBeDefined();
    });

    it('should parse addition', () => {
      const [lexer] = build_lex_yacc();
      const result = do_yacc('output 1+1', lexer, null as any);
      expect(result.cst).toBeDefined();
    });

    it('should parse dice notation', () => {
      const [lexer] = build_lex_yacc();
      const result = do_yacc('output 1d4+1', lexer, null as any);
      expect(result.cst).toBeDefined();
    });

    it('should parse parentheses', () => {
      const [lexer] = build_lex_yacc();
      const result = do_yacc('output (1+1)', lexer, null as any);
      expect(result.cst).toBeDefined();
    });

    it('should parse multiplication', () => {
      const [lexer] = build_lex_yacc();
      const result = do_yacc('output 2*3', lexer, null as any);
      expect(result.cst).toBeDefined();
    });

    it('should parse empty sequence', () => {
      const [lexer] = build_lex_yacc();
      const result = do_yacc('output{}', lexer, null as any);
      expect(result.cst).toBeDefined();
    });

    it('should resolve to JavaScript', () => {
      const [lexer] = build_lex_yacc();
      const result = do_yacc('output 1', lexer, null as any);
      const js = resolve(result);
      expect(js).toContain('all_outputs');
    });

    it('should resolve addition', () => {
      const [lexer] = build_lex_yacc();
      const result = do_yacc('output 1+1', lexer, null as any);
      const js = resolve(result);
      expect(js).toBeTruthy();
    });

    it('should resolve variable assignment', () => {
      const [lexer] = build_lex_yacc();
      const result = do_yacc('A:1', lexer, null as any);
      const js = resolve(result);
      expect(js).toContain('const');
    });
  });

  describe('execution', () => {
    it('should execute code and collect outputs', () => {
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc('output 1', lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });
      expect(outputs).toHaveLength(1);
      expect(outputs[0]).toBe(1);
    });

    it('should execute dice roll', () => {
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc('output 1d4', lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });
      expect(outputs).toHaveLength(1);
      const rv = outputs[0] as RV;
      expect(rv.vals).toBeDefined();
    });
  });

  describe('AND/OR operations', () => {
    const bv = [0, 1];
    const testCases = [
      { code: 'output ((1d4-1) | (1d2-1))', expected: new RV(bv, [125, 875]) },
      { code: 'output {2}&(1d2-1)', expected: new RV(bv, [1, 1]) },
      { code: 'output {2,-2}&(1d2-1)', expected: new RV(bv, [1, 0]) },
      { code: 'output {2}&{2,-1}', expected: 1 },
      { code: 'output {2,-2}&{2,-2}', expected: 0 },
      { code: 'output {1,2,3}&1', expected: 1 },
      { code: 'output 1d2&1d2', expected: new RV(bv, [0, 1]) },
      { code: 'output {1}&1d2', expected: new RV(bv, [0, 1]) },
      { code: 'output 1d2&{1}', expected: new RV(bv, [0, 1]) },
    ];

    testCases.forEach(({ code, expected }, i) => {
      it(`should handle AND/OR case ${i + 1}: ${code}`, () => {
        const outputs: unknown[] = [];
        const [lexer] = build_lex_yacc();
        const result = do_yacc(code, lexer, null as any);
        const js = resolve(result);
        safe_exec(js, {
          output: (...args: unknown[]) => outputs.push(args[0]),
        });
        expect(outputs).toHaveLength(1);
        const actual = outputs[0];
        expect(check(actual, expected)).toBe(true);
      });
    });

    it('should handle dice with modifier', () => {
      const code = 'output d-1\noutput d+1\nA: 3d6\noutput d#A';
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc(code, lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });
      expect(outputs).toHaveLength(3);
    });

    it('should handle @ operator', () => {
      const code = 'output 2 * 2 @ 2d2';
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc(code, lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });
      expect(outputs).toHaveLength(1);
    });
  });

  describe('loops and conditionals', () => {
    it('should handle loops and if/else', () => {
      const code = `
loop P over {1..3} {
  output P
  if P = 1 { output 100 }
}
P: 1
if P = 1 { output 200 } else { output 300 }
`;
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc(code, lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });
      expect(outputs.length).toBeGreaterThan(0);
    });
  });

  describe('function calls', () => {
    it('should call functions', () => {
      const code = 'function: a { result: 1 }\noutput [a]';
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc(code, lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });
      expect(outputs).toHaveLength(1);
    });

    it('should call functions with parameters', () => {
      const code = 'function: add A:n B:n { result: A + B }\noutput [add 1 2]';
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc(code, lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });
      expect(outputs).toHaveLength(1);
      expect(outputs[0]).toBe(3);
    });
  });

  describe('sequences and ranges', () => {
    it('should handle sequence creation', () => {
      const code = 'output {1, 2, 3}';
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc(code, lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });
      expect(outputs).toHaveLength(1);
      const seq = outputs[0] as Seq;
      expect(seq.seq).toEqual([1, 2, 3]);
    });

    it('should handle range', () => {
      const code = 'output {1..3}';
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc(code, lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });
      expect(outputs).toHaveLength(1);
    });
  });

  describe('builtins', () => {
    it('should handle sort', () => {
      const code = 'output [sort {3, 1, 2}]';
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc(code, lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });
      expect(outputs).toHaveLength(1);
    });

    it('should handle highest', () => {
      const code = 'output [highest 1 of 2d6]';
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc(code, lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });
      expect(outputs).toHaveLength(1);
      const rv = outputs[0] as RV;
      expect(rv.vals).toBeDefined();
    });

    it('should handle lowest', () => {
      const code = 'output [lowest 1 of 2d6]';
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc(code, lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });
      expect(outputs).toHaveLength(1);
      const rv = outputs[0] as RV;
      expect(rv.vals).toBeDefined();
    });

    it('should handle absolute', () => {
      const code = 'output [absolute -5]';
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc(code, lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });
      expect(outputs).toHaveLength(1);
      expect(outputs[0]).toBe(5);
    });
  });

  describe('complex programs', () => {
    it('should handle complex AnyDice code', () => {
      const code = `
A: 2d6
output 1d6 + 1d6
`;
      const outputs: unknown[] = [];
      const [lexer] = build_lex_yacc();
      const result = do_yacc(code, lexer, null as any);
      const js = resolve(result);
      safe_exec(js, { output: (...args: unknown[]) => outputs.push(args[0]) });

      expect(outputs).toHaveLength(1);
    });
  });
});

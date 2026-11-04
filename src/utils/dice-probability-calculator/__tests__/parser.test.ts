import { describe, expect, it } from 'vitest';
import { DiceSyntaxError, parse } from '../index';

describe('dice probability calculator parser', () => {
  it('parses output expressions with dice and arithmetic', () => {
    const program = parse('output 2d6 + 3');
    expect(program.statements).toHaveLength(1);
    const statement = program.statements[0];
    expect(statement.kind).toBe('output');
    if (statement.kind !== 'output') return;

    expect(statement.value).toMatchObject({
      kind: 'binary',
      operator: '+',
      left: {
        kind: 'dice',
        count: { kind: 'number', value: 2 },
        faces: { kind: 'number', value: 6 },
      },
      right: { kind: 'number', value: 3 },
    });
  });

  it('ignores backslash comments', () => {
    const program = parse('\\ a comment \\ output 1');
    expect(program.statements).toHaveLength(1);
    expect(program.statements[0].kind).toBe('output');
  });

  it('parses function signatures with typed parameters', () => {
    const program = parse(`
      function: balanced RANK:n from FIVE:s {
        result: RANK @ FIVE
      }
    `);
    const statement = program.statements[0];
    expect(statement.kind).toBe('function');
    if (statement.kind !== 'function') return;
    expect(statement.signature).toEqual([
      { kind: 'word', value: 'balanced' },
      { kind: 'param', name: 'RANK', type: 'n' },
      { kind: 'word', value: 'from' },
      { kind: 'param', name: 'FIVE', type: 's' },
    ]);
  });

  it('parses sequence literals with ranges and repetitions', () => {
    const program = parse('output {1..3, 4:2, {5, 6}}');
    const statement = program.statements[0];
    expect(statement.kind).toBe('output');
    if (statement.kind !== 'output') return;
    expect(statement.value).toMatchObject({
      kind: 'sequence',
      elements: [
        { value: { kind: 'number', value: 1 }, rangeEnd: { value: 3 } },
        { value: { kind: 'number', value: 4 }, repeat: { value: 2 } },
        { value: { kind: 'sequence' } },
      ],
    });
  });

  it('parses loops, conditionals and else-if chains', () => {
    const program = parse(`
      A: 1
      loop P over {1..3} {
        if P = 1 { output 1 }
        else if P = 2 { output 2 }
        else { output 3 }
      }
    `);

    expect(program.statements.map((statement) => statement.kind)).toEqual([
      'assignment',
      'loop',
    ]);
    const loop = program.statements[1];
    if (loop.kind !== 'loop') return;
    const conditional = loop.body[0];
    expect(conditional.kind).toBe('if');
    if (conditional.kind !== 'if') return;
    expect(conditional.branches).toHaveLength(2);
    expect(conditional.elseBody).toHaveLength(1);
  });

  it('parses set directives with string and numeric values', () => {
    const program = parse(`
      set "position order" to "lowest first"
      set "explode depth" to 2
    `);
    expect(program.statements).toEqual([
      {
        kind: 'set',
        name: 'position order',
        value: 'lowest first',
      },
      {
        kind: 'set',
        name: 'explode depth',
        value: { kind: 'number', value: 2 },
      },
    ]);
  });

  it('reports syntax error locations for editor markers', () => {
    try {
      parse('output 1 +');
      throw new Error('Expected parse to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(DiceSyntaxError);
      const syntaxError = error as DiceSyntaxError;
      expect(syntaxError.line).toBe(1);
      expect(syntaxError.column).toBeGreaterThan(0);
      expect(syntaxError.endColumn).toBeGreaterThan(syntaxError.column);
      expect(syntaxError.code).toBe('unexpected-end-of-input');
      expect(syntaxError.expected).toContain('NumberLiteral');
      expect(syntaxError.message).not.toContain('-->');
    }
  });

  it('reports unexpected tokens with the expected token type', () => {
    try {
      parse('output {1 2}');
      throw new Error('Expected parse to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(DiceSyntaxError);
      const syntaxError = error as DiceSyntaxError;
      expect(syntaxError.code).toBe('unexpected-token');
      expect(syntaxError.found).toBe('2');
      expect(syntaxError.expected).toContain('RCurly');
      expect(syntaxError.line).toBe(1);
      expect(syntaxError.column).toBe(11);
      expect(syntaxError.message).toContain('Expected }');
    }
  });

  it('reports redundant input against the end of input', () => {
    try {
      parse('output 1\nrrewr');
      throw new Error('Expected parse to fail');
    } catch (error) {
      const syntaxError = error as DiceSyntaxError;
      expect(syntaxError.code).toBe('unexpected-token');
      expect(syntaxError.found).toBe('rrewr');
      expect(syntaxError.expected).toEqual(['EOF']);
      expect(syntaxError.line).toBe(2);
      expect(syntaxError.column).toBe(1);
    }
  });

  it('reports unexpected characters from the lexer', () => {
    try {
      parse('output "x');
      throw new Error('Expected parse to fail');
    } catch (error) {
      const syntaxError = error as DiceSyntaxError;
      expect(syntaxError.code).toBe('unexpected-character');
      expect(syntaxError.found).toBe('"');
      expect(syntaxError.line).toBe(1);
      expect(syntaxError.column).toBe(8);
      expect(syntaxError.message).not.toContain('skipped');
    }
  });

  it('reports a range of malformed inputs', () => {
    for (const script of [
      '@',
      '1 @',
      'output 1 +',
      'output {1 2}',
      'output 1\nrrewr',
      'output )',
    ]) {
      expect(() => parse(script)).toThrow(DiceSyntaxError);
    }
  });

  it('builds unary, access and ranged sequence expressions', () => {
    for (const script of [
      'loop I over {1..2} { output I }',
      'output -1',
      'output # {1,2}',
      'output 1 @ {1,2}',
      'output {1..2, 3}',
      'output d{1..3}',
    ]) {
      expect(parse(script).statements.length).toBeGreaterThan(0);
    }
  });

  it('parses function call items in source order', () => {
    const program = parse('output [highest 1 of 2d6]');
    const statement = program.statements[0];
    if (statement.kind !== 'output') throw new Error('expected output');
    expect(statement.value).toMatchObject({
      kind: 'call',
      items: [
        { kind: 'word', value: 'highest' },
        { kind: 'expression', value: { kind: 'number', value: 1 } },
        { kind: 'word', value: 'of' },
        { kind: 'expression', value: { kind: 'dice' } },
      ],
    });
  });
});

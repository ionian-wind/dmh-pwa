import { describe, expect, it } from 'vitest';
import { parseCst } from '../parser';
import { buildProgram } from '../toAst';

type CstNode = { children?: Record<string, any>; [key: string]: any };

/** Wrap a `dice` rule context in every binary precedence level above it. */
function wrapExpression(diceNode: CstNode): CstNode {
  let node = diceNode;
  for (let level = 0; level < 7; level++) {
    node = { operand: [node] };
  }
  return node;
}

function expressionProgram(diceNode: CstNode) {
  return {
    statement: [
      {
        outputStatement: [
          {
            value: [{ logicalOr: [wrapExpression(diceNode)] }],
          },
        ],
      },
    ],
  };
}

function findToken(
  node: CstNode | undefined,
  predicate: (token: { image?: string }) => boolean,
): any {
  if (!node || typeof node !== 'object' || !node.children) return undefined;
  for (const value of Object.values(node.children)) {
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      if (predicate(item)) return item;
      const found = findToken(item, predicate);
      if (found) return found;
    }
  }
  return undefined;
}

function stripLocations(node: CstNode | undefined): void {
  if (!node || typeof node !== 'object' || !node.children) return;
  for (const value of Object.values(node.children)) {
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      delete item.location;
      delete item.startOffset;
      stripLocations(item);
    }
  }
}

describe('toAst branch gaps', () => {
  it('handles empty programs, blocks and child collections', () => {
    expect(buildProgram({})).toEqual({ statements: [] });

    expect(
      buildProgram({
        children: {
          nested: { children: {} },
          nothing: null,
          zero: 0,
          text: 'ignored',
        },
      }),
    ).toEqual({ statements: [] });

    const emptyBlock = parseCst('function: f { } output [f]');
    expect(buildProgram(emptyBlock).statements).toHaveLength(2);
  });

  it('rejects unsupported statements', () => {
    expect(() => buildProgram({ statement: [{}] })).toThrow(
      'Unsupported statement',
    );
  });

  it('builds signatures containing only parameters', () => {
    const program = buildProgram(parseCst('function: N:n { result: N }'));
    const statement = program.statements[0];
    expect(statement.kind).toBe('function');
    if (statement.kind !== 'function') return;
    expect(statement.signature).toEqual([
      { kind: 'param', name: 'N', type: 'n' },
    ]);
  });

  it('rejects unknown parameter types', () => {
    expect(() =>
      buildProgram(parseCst('function: f X:foo { result: X }')),
    ).toThrow('Unknown parameter type "foo"');
  });

  it('rejects expressions without operands and unknown operators', () => {
    expect(() =>
      buildProgram({
        statement: [
          {
            outputStatement: [{ value: [{ logicalOr: [{}] }] }],
          },
        ],
      }),
    ).toThrow('Expression has no operands');

    const cst = parseCst('output 1 + 2');
    const plus = findToken(cst, (token) => token.image === '+');
    expect(plus).toBeDefined();
    plus.image = '?';
    expect(() => buildProgram(cst)).toThrow('Unknown operator ?');
  });

  it('builds unary nodes with nested and missing operands', () => {
    const nested = buildProgram(
      expressionProgram({
        count: [
          {
            Minus: [{ image: '-' }],
            term: [{ term: [{ number: [{ image: '2' }] }] }],
          },
        ],
      }),
    );
    const statement = nested.statements[0];
    expect(statement.kind).toBe('output');
    if (statement.kind !== 'output') return;
    expect(statement.value).toMatchObject({
      kind: 'unary',
      operator: '-',
      operand: { kind: 'number', value: 2 },
    });

    expect(() =>
      buildProgram(
        expressionProgram({
          count: [{ Minus: [{ image: '-' }] }],
        }),
      ),
    ).toThrow('Unary operator without operand');
  });

  it('rejects unsupported terms', () => {
    expect(() =>
      buildProgram(
        expressionProgram({
          count: [{ term: [{}] }],
        }),
      ),
    ).toThrow('Unsupported term');
  });

  it('builds calls that contain only expressions', () => {
    const program = buildProgram(parseCst('output [1]'));
    const statement = program.statements[0];
    expect(statement.kind).toBe('output');
    if (statement.kind !== 'output') return;
    expect(statement.value).toEqual({
      kind: 'call',
      items: [{ kind: 'expression', value: { kind: 'number', value: 1 } }],
    });
  });

  it('falls back to zero offsets when source locations are unavailable', () => {
    const cst = parseCst('output [highest 1 of 2d6]');
    stripLocations(cst);
    const program = buildProgram(cst);
    expect(program.statements[0].kind).toBe('output');
  });
});

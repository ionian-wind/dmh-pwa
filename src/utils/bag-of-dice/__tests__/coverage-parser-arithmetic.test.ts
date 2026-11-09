import { describe, expect, it } from 'vitest';
import type {
  AstNode,
  BinaryOpNode,
  DiceNode,
  EvalContext,
  FunctionCallNode,
  UnaryOpNode,
} from '../engine/contracts';
import { createRollEngine } from '../engine/engine';
import { RollFailure } from '../engine/errors';
import { resolveLimits } from '../engine/limits';
import { cstSpan, parseExpression, tokenSpan } from '../engine/parser';
import {
  createArithmeticPlugin,
  numberValue,
} from '../engine/plugins/arithmetic';
import { createEmptyRepositories } from '../engine/repositories';
import { sequenceRng } from '../engine/rng';

const engine = createRollEngine();
const repositories = createEmptyRepositories();

async function roll(
  expression: string,
  draws: number[] = [0.5],
  extra: Record<string, unknown> = {},
): Promise<number> {
  const outcome = await engine.roll(expression, {
    repositories,
    rng: sequenceRng(draws),
    ...extra,
  });
  if (outcome.status !== 'complete') {
    throw new Error(`expected complete, got ${outcome.status}`);
  }
  return outcome.result.total;
}

async function errorCode(
  expression: string,
  extra: Record<string, unknown> = {},
): Promise<string | undefined> {
  const outcome = await engine.roll(expression, {
    repositories,
    rng: sequenceRng([0.5]),
    ...extra,
  });
  expect(outcome.status).toBe('error');
  return outcome.status === 'error' ? outcome.errors[0]?.code : undefined;
}

function literal(value: number): AstNode {
  return {
    type: 'NumberLiteral',
    value,
    plugin: 'arithmetic',
    span: { start: 0, end: 1 },
  } as AstNode;
}

function diceNode(): DiceNode {
  return {
    type: 'Dice',
    plugin: 'dice',
    span: { start: 0, end: 3 },
    count: literal(1),
    sides: literal(6),
    modifiers: [],
  };
}

function arithmeticContext(evaluate: EvalContext['evaluate']): EvalContext {
  return {
    rng: sequenceRng([0.5]),
    cache: new Map(),
    limits: resolveLimits(),
    warnings: [],
    options: { repositories: createEmptyRepositories() },
    nextGroupId: () => 'g1',
    evaluate,
  };
}

describe('parser branch coverage', () => {
  it('handles an empty grouped roll', () => {
    const result = parseExpression('{}');
    expect(result.errors).toEqual([]);
    expect(result.ast).toMatchObject({
      type: 'GroupedRoll',
      rolls: [],
      modifiers: [],
    });
  });

  it('keeps trailing message text unless it is disabled', () => {
    const tolerated = parseExpression('1 hello there');
    expect(tolerated.errors).toEqual([]);
    expect(tolerated.ast).toMatchObject({
      type: 'NumberLiteral',
      value: 1,
    });
    expect(tolerated.trailingText).toBe('hello there');

    const strict = parseExpression('1 hello', { allowTrailingText: false });
    expect(strict.errors.length).toBeGreaterThan(0);
    expect(strict.errors[0].code).toBe('PARSE_UNEXPECTED_TOKEN');
    expect(strict.trailingText).toBeUndefined();
  });

  it('parses every comparison operator and bang target form', () => {
    const comparisons: Array<[string, string]> = [
      ['1d6=2', '='],
      ['1d6==2', '='],
      ['1d6!=2', '!='],
      ['1d6>2', '>'],
      ['1d6>=2', '>='],
      ['1d6<2', '<'],
      ['1d6<=2', '<='],
    ];
    for (const [expression, op] of comparisons) {
      const result = parseExpression(expression);
      expect(result.errors, expression).toEqual([]);
      expect(
        (
          result.ast as unknown as {
            modifiers: Array<{ compare?: { op: string } }>;
          }
        ).modifiers[0].compare?.op,
        expression,
      ).toBe(op);
    }

    const bangTarget = parseExpression('1d6!5');
    expect(
      (bangTarget.ast as unknown as { modifiers: Array<{ compare?: unknown }> })
        .modifiers[0].compare,
    ).toEqual({ op: '=', value: 5 });

    const compound = parseExpression('1d6!!>=4');
    expect(
      (compound.ast as unknown as { modifiers: Array<{ name: string }> })
        .modifiers[0].name,
    ).toBe('!!');

    const penetrating = parseExpression('1d6!p');
    expect(
      (penetrating.ast as unknown as { modifiers: Array<{ name: string }> })
        .modifiers[0].name,
    ).toBe('!p');
  });

  it('parses drop shorthand, argument-less modifiers and signed faces', () => {
    const dropped = parseExpression('2d6d1');
    expect(
      (
        dropped.ast as unknown as {
          modifiers: Array<{ name: string; argument?: number }>;
        }
      ).modifiers[0],
    ).toMatchObject({ name: 'd', argument: 1 });

    const bare = parseExpression('2d6mi');
    expect(
      (
        bare.ast as unknown as {
          modifiers: Array<{ name: string; argument?: number }>;
        }
      ).modifiers[0],
    ).toMatchObject({ name: 'mi' });
    expect(
      (bare.ast as unknown as { modifiers: Array<{ argument?: number }> })
        .modifiers[0].argument,
    ).toBeUndefined();

    const positive = parseExpression('d+3');
    expect(positive.errors).toEqual([]);
    expect(positive.ast).toMatchObject({
      type: 'Dice',
      sides: { type: 'UnaryOp', op: '+' },
    });

    const negative = parseExpression('d-2');
    expect(negative.errors).toEqual([]);
    expect(negative.ast).toMatchObject({
      type: 'Dice',
      sides: { type: 'UnaryOp', op: '-' },
    });
  });

  it('parses percent and Fudge variants', () => {
    const percent = parseExpression('d%');
    expect(percent.ast).toMatchObject({
      type: 'Dice',
      sides: { type: 'NumberLiteral', value: 100 },
    });

    const fudge = parseExpression('dF.2');
    expect(fudge.ast).toMatchObject({
      type: 'Dice',
      fudge: true,
      fudgeVariant: 2,
    });
  });

  it('reports mismatched and no-viable-alternative recoveries', () => {
    for (const expression of ['(1', '1 +', '{1,', '1d6!>']) {
      const result = parseExpression(expression);
      expect(result.errors.length, expression).toBeGreaterThan(0);
      expect(result.errors[0].code, expression).toMatch(/^PARSE_/);
      expect(result.errors[0].span?.start, expression).toBeGreaterThanOrEqual(
        0,
      );
    }
  });

  it('bounds large lexer error lists', () => {
    const result = parseExpression('` ` `', { maxRecovery: 1 });
    expect(result.errors).toHaveLength(2);
    expect(result.errors.at(-1)?.code).toBe('PARSE_RECOVERY_LIMIT');
  });

  it('derives spans from CST children and token pairs', () => {
    const tokens = parseExpression('1+2').tokens;
    expect(cstSpan(undefined)).toEqual({ start: 0, end: 0 });
    expect(cstSpan({ ignored: 'text' })).toEqual({ start: 0, end: 0 });
    expect(
      cstSpan({
        first: tokens[0],
        nested: [[tokens[2]]],
      }),
    ).toEqual({
      start: tokens[0].startOffset,
      end: tokens[2].endOffset! + 1,
    });

    expect(tokenSpan(tokens[0])).toEqual({
      start: tokens[0].startOffset,
      end: tokens[0].endOffset! + 1,
    });
    expect(tokenSpan(tokens[0], tokens[2])).toEqual({
      start: tokens[0].startOffset,
      end: tokens[2].endOffset! + 1,
    });
  });
});

describe('arithmetic plugin branch coverage', () => {
  it('returns null for nodes it does not own', () => {
    const plugin = createArithmeticPlugin();
    expect(
      plugin.evaluate(
        { type: 'Dice', plugin: 'dice', span: { start: 0, end: 1 } },
        arithmeticContext(() => ({ value: 1, records: [], segments: [] })),
      ),
    ).toBeNull();
  });

  it('evaluates unary nodes without optional child data', () => {
    const plugin = createArithmeticPlugin();
    const node: UnaryOpNode = {
      type: 'UnaryOp',
      op: '-',
      operand: literal(2),
      plugin: 'arithmetic',
      span: { start: 0, end: 2 },
    };
    const result = plugin.evaluate(
      node,
      arithmeticContext(() => ({ value: 2, records: [], segments: [] })),
    );
    expect(result?.value).toBe(-2);
    expect(result?.arithmetic).toHaveLength(1);
    expect(result?.groups).toBeUndefined();
    expect(result?.tables).toBeUndefined();
  });

  it('carries groups and tables through unary nodes', () => {
    const plugin = createArithmeticPlugin();
    const node: UnaryOpNode = {
      type: 'UnaryOp',
      op: '+',
      operand: diceNode(),
      plugin: 'arithmetic',
      span: { start: 0, end: 2 },
    };
    const result = plugin.evaluate(
      node,
      arithmeticContext(() => ({
        value: 2,
        records: [],
        segments: [],
        groups: [
          {
            id: 'g1',
            kind: 'dice',
            dice: [],
            total: 2,
            modifiers: [],
          },
        ],
        tables: [{ table: 'loot', index: 0, value: '2', weight: 1, depth: 0 }],
      })),
    );
    expect(result?.groups).toHaveLength(1);
    expect(result?.tables).toHaveLength(1);
  });

  it('evaluates binary nodes without optional child data', () => {
    const plugin = createArithmeticPlugin();
    const node: BinaryOpNode = {
      type: 'BinaryOp',
      op: '+',
      left: literal(1),
      right: literal(2),
      plugin: 'arithmetic',
      span: { start: 0, end: 3 },
    };
    const result = plugin.evaluate(
      node,
      arithmeticContext(() => ({ value: 2, records: [], segments: [] })),
    );
    expect(result?.value).toBe(4);
    expect(result?.arithmetic).toHaveLength(1);
    expect(result?.groups).toBeUndefined();
    expect(result?.tables).toBeUndefined();
  });

  it('merges groups and tables from both binary operands', () => {
    const plugin = createArithmeticPlugin();
    const node: BinaryOpNode = {
      type: 'BinaryOp',
      op: '*',
      left: diceNode(),
      right: diceNode(),
      plugin: 'arithmetic',
      span: { start: 0, end: 3 },
    };
    const result = plugin.evaluate(
      node,
      arithmeticContext(() => ({
        value: 2,
        records: [],
        segments: [],
        groups: [{ id: 'g1', kind: 'dice', dice: [], total: 2, modifiers: [] }],
        tables: [{ table: 'loot', index: 0, value: '2', weight: 1, depth: 0 }],
      })),
    );
    expect(result?.groups).toHaveLength(2);
    expect(result?.tables).toHaveLength(2);
  });

  it('rejects unknown binary operators', () => {
    const plugin = createArithmeticPlugin();
    const node = {
      type: 'BinaryOp',
      op: '^',
      left: literal(1),
      right: literal(2),
      plugin: 'arithmetic',
      span: { start: 0, end: 3 },
    } as unknown as BinaryOpNode;
    expect(() =>
      plugin.evaluate(
        node,
        arithmeticContext(() => ({ value: 2, records: [], segments: [] })),
      ),
    ).toThrow(RollFailure);
  });

  it('evaluates variadic functions without optional child data', () => {
    const plugin = createArithmeticPlugin();
    const node: FunctionCallNode = {
      type: 'FunctionCall',
      name: 'min',
      args: [literal(1), literal(2)],
      plugin: 'arithmetic',
      span: { start: 0, end: 8 },
    };
    const result = plugin.evaluate(
      node,
      arithmeticContext(() => ({ value: 2, records: [], segments: [] })),
    );
    expect(result?.value).toBe(2);
    expect(result?.arithmetic).toHaveLength(1);
    expect(result?.groups).toBeUndefined();
    expect(result?.tables).toBeUndefined();
  });

  it('carries groups and tables from variadic arguments', () => {
    const plugin = createArithmeticPlugin();
    const node: FunctionCallNode = {
      type: 'FunctionCall',
      name: 'max',
      args: [diceNode(), diceNode()],
      plugin: 'arithmetic',
      span: { start: 0, end: 8 },
    };
    const result = plugin.evaluate(
      node,
      arithmeticContext(() => ({
        value: 2,
        records: [],
        segments: [],
        groups: [{ id: 'g1', kind: 'dice', dice: [], total: 2, modifiers: [] }],
        tables: [{ table: 'loot', index: 0, value: '2', weight: 1, depth: 0 }],
      })),
    );
    expect(result?.groups).toHaveLength(2);
    expect(result?.tables).toHaveLength(2);
  });

  it('carries groups and tables through single-argument functions', () => {
    const plugin = createArithmeticPlugin();
    const node: FunctionCallNode = {
      type: 'FunctionCall',
      name: 'floor',
      args: [literal(2.5)],
      plugin: 'arithmetic',
      span: { start: 0, end: 9 },
    };
    const withCollections = plugin.evaluate(
      node,
      arithmeticContext(() => ({
        value: 2.5,
        records: [],
        segments: [],
        groups: [
          { id: 'g1', kind: 'dice', dice: [], total: 2.5, modifiers: [] },
        ],
        tables: [
          { table: 'loot', index: 0, value: '2.5', weight: 1, depth: 0 },
        ],
      })),
    );
    expect(withCollections?.value).toBe(2);
    expect(withCollections?.groups).toHaveLength(1);
    expect(withCollections?.tables).toHaveLength(1);

    const bare = plugin.evaluate(
      node,
      arithmeticContext(() => ({ value: 2.5, records: [], segments: [] })),
    );
    expect(bare?.groups).toBeUndefined();
    expect(bare?.tables).toBeUndefined();
  });

  it('folds array values as well as scalars', () => {
    expect(numberValue(3)).toBe(3);
    expect(numberValue([1, 2, 3])).toBe(6);
    expect(numberValue([])).toBe(0);
  });
});

describe('arithmetic evaluation edge cases', () => {
  it('rejects non-finite arithmetic results', async () => {
    expect(await errorCode('10**999')).toBe('MATH_NON_FINITE');
    expect(await errorCode('(-1)**0.5')).toBe('MATH_NON_FINITE');
  });

  it('validates variadic and unary function arity', async () => {
    expect(await errorCode('min()')).toBe('MATH_INVALID_ARITY');
    expect(await errorCode('max()')).toBe('MATH_INVALID_ARITY');
    expect(await errorCode('floor(1,2)')).toBe('MATH_INVALID_ARITY');
  });

  it('carries dice and table results through unary and binary operators', async () => {
    const tables = {
      async get(name: string) {
        return name === 'loot'
          ? { name, entries: [{ weight: 1, value: '2' }] }
          : undefined;
      },
    };
    const extra = {
      repositories: { ...createEmptyRepositories(), tables },
    };
    expect(await roll('-(1d6)', [0.5], extra)).toBe(-4);
    expect(await roll('-t[loot]', [0.5], extra)).toBe(-2);
    expect(await roll('1 + 1d6', [0.5])).toBe(5);
    expect(await roll('t[loot] + 1', [0.5], extra)).toBe(3);
  });

  it('carries collections through variadic and single-argument functions', async () => {
    const tables = {
      async get(name: string) {
        return name === 'loot'
          ? { name, entries: [{ weight: 1, value: '2' }] }
          : undefined;
      },
    };
    const extra = {
      repositories: { ...createEmptyRepositories(), tables },
    };
    expect(await roll('min(1d6, 2)', [0.5])).toBe(2);
    expect(await roll('max(t[loot], 1)', [0.5], extra)).toBe(2);
    expect(await roll('floor(t[loot])', [0.5], extra)).toBe(2);
  });
});

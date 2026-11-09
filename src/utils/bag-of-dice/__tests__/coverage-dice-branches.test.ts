import { describe, expect, it } from 'vitest';
import type {
  AstNode,
  DiceNode,
  EvalContext,
  GroupedRollNode,
  RollResult,
  TableDefinition,
} from '../engine/contracts';
import { createRollEngine } from '../engine/engine';
import { RollFailure } from '../engine/errors';
import { resolveLimits } from '../engine/limits';
import { createDicePlugin } from '../engine/plugins/dice';
import {
  createEmptyRepositories,
  createStaticRepositories,
} from '../engine/repositories';
import { sequenceRng } from '../engine/rng';

const engine = createRollEngine();
const repositories = createEmptyRepositories();

async function roll(
  expression: string,
  draws: number[] = [0.5],
  extra: Record<string, unknown> = {},
): Promise<RollResult> {
  const outcome = await engine.roll(expression, {
    repositories,
    rng: sequenceRng(draws),
    ...extra,
  });
  if (outcome.status !== 'complete') {
    throw new Error(`expected complete, got ${outcome.status}`);
  }
  return outcome.result;
}

async function errorCode(
  expression: string,
  draws: number[] = [0.5],
  extra: Record<string, unknown> = {},
): Promise<string | undefined> {
  const outcome = await engine.roll(expression, {
    repositories,
    rng: sequenceRng(draws),
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

function diceNode(overrides: Partial<DiceNode> = {}): DiceNode {
  return {
    type: 'Dice',
    plugin: 'dice',
    span: { start: 0, end: 4 },
    count: literal(1),
    sides: literal(6),
    modifiers: [],
    ...overrides,
  };
}

function pluginContext(overrides: Partial<EvalContext> = {}): EvalContext {
  return {
    rng: sequenceRng([0.5]),
    cache: new Map(),
    limits: resolveLimits(),
    warnings: [],
    options: { repositories: createEmptyRepositories() },
    nextGroupId: () => 'g1',
    evaluate: (node) => ({
      value: (node as { value?: number }).value ?? 1,
      records: [],
      segments: [],
    }),
    ...overrides,
  };
}

describe('dice plugin branch coverage', () => {
  it('returns null for AST nodes it does not own', () => {
    const plugin = createDicePlugin();
    expect(plugin.evaluate(literal(1), pluginContext())).toBeNull();
  });

  it('rejects empty and non-finite custom faces', async () => {
    expect(await errorCode('d[]')).toBe('VALIDATION_INVALID_DICE');
    expect(await errorCode('d[1,nope]')).toBe('VALIDATION_INVALID_DICE');
  });

  it('covers every Fudge variant and rejects a negative hand-built variant', async () => {
    for (const variant of ['', '.0', '.1', '.2', '.3'] as const) {
      const result = await roll(`dF${variant}`, [0.9]);
      expect(Number.isFinite(result.total)).toBe(true);
    }

    const plugin = createDicePlugin();
    expect(() =>
      plugin.evaluate(
        diceNode({ fudge: true, fudgeVariant: -1, sides: literal(3) }),
        pluginContext(),
      ),
    ).toThrow(RollFailure);
  });

  it('uses the default clamp amounts when mi/ma omit arguments', async () => {
    expect((await roll('2d6mi', [0, 0.2])).total).toBe(3);
    expect((await roll('2d6ma', [0.9, 0.2])).total).toBe(2);
  });

  it('applies repeated keep/drop clauses after earlier drops', async () => {
    const result = await roll('3d6kh1dh1', [0.1, 0.9, 0.5]);
    expect(result.total).toBe(0);
    expect(
      result.breakdown.groups[0].dice.filter((die) => die.kept),
    ).toHaveLength(0);

    expect((await roll('3d6kh2kl1', [0.1, 0.9, 0.5])).total).toBe(4);
  });

  it('propagates labels to exploded dice and supports all explosion forms', async () => {
    const exploding = await roll('1d6![fire]', [0.9, 0.1]);
    const group = exploding.breakdown.groups[0];
    expect(group.dice).toHaveLength(2);
    expect(group.dice[1]).toMatchObject({ label: 'fire', exploded: true });

    const compound = await roll('1d6!!', [0.9, 0.5]);
    expect(compound.breakdown.groups[0].dice[0].compounded).toBe(true);

    const penetrating = await roll('1d6!p', [0.9, 0.5]);
    expect(penetrating.breakdown.groups[0].dice[1]).toMatchObject({
      penetrating: true,
      value: 3,
    });
  });

  it('stops rerolls at the explosion budget', async () => {
    const result = await roll('1d6r1', [0, 0, 0], {
      maxExplosionRolls: 2,
    });
    expect(
      result.warnings.some((warning) => warning.code === 'LIMIT_EXPLOSION'),
    ).toBe(true);
  });

  it('handles every comparison operator', async () => {
    for (const expression of [
      '1d6=4',
      '1d6!=4',
      '1d6>4',
      '1d6>=4',
      '1d6<4',
      '1d6<=4',
    ]) {
      const result = await roll(expression, [0.5]);
      expect(Number.isFinite(result.total)).toBe(true);
    }
  });

  it('covers plain match, targeted match and sorted modifiers', async () => {
    const matched = await roll('4d6m2', [0.2, 0.2, 0.8, 0.8]);
    expect(matched.total).toBe(14);
    expect(
      matched.breakdown.segments.some(
        (segment) =>
          segment.kind === 'modifier' &&
          segment.modifier === 'm' &&
          segment.result === 2,
      ),
    ).toBe(true);

    const targeted = await roll('4d6mt2>3', [0.9, 0.9, 0.1, 0.1]);
    expect(targeted.total).toBe(1);

    for (const [expression, expected] of [
      ['3d6s', 1],
      ['3d6sa', 11],
      ['3d6sd', 11],
    ] as const) {
      const result = await roll(expression, [0.1, 0.9, 0.5]);
      expect(result.total, expression).toBe(expected);
    }
  });

  it('honours critical failure clauses', async () => {
    const result = await roll('4d6cf1', [0, 0.2, 0.6, 0.9]);
    expect(result.breakdown.groups[0].critical).toBe(1);
  });

  it('counts exhaustive successes without an explicit compare point', async () => {
    const result = await roll('2d6e', [0.9, 0.9, 0.1]);
    expect(result.breakdown.groups[0].success).toBeGreaterThanOrEqual(2);
  });

  it('warns when exhaustive successes hit the budget', async () => {
    const result = await roll('2d6e', [0.9, 0.9, 0.9], {
      maxExplosionRolls: 0,
    });
    expect(
      result.warnings.some((warning) => warning.code === 'LIMIT_EXPLOSION'),
    ).toBe(true);
  });

  it('renders custom and fudge dice notation with labels', async () => {
    const custom = await roll('2d[1,2,3][odd]', [0.9, 0.1]);
    expect(custom.breakdown.groups[0]).toMatchObject({
      kind: 'custom',
      labels: ['odd'],
    });
    expect(custom.breakdown.segments[0].text).toContain('d[1,2,3]');

    const fudge = await roll('2dF.2', [0, 0.9]);
    expect(fudge.breakdown.segments[0].text).toContain('dF.2');
  });
});

describe('grouped roll branch coverage', () => {
  it('handles an empty group', async () => {
    const result = await roll('{}');
    expect(result.total).toBe(0);
    expect(result.breakdown.groups[0].kind).toBe('group');
  });

  it('labels grouped results and sorts a single member', async () => {
    const labelled = await roll('{1d6,2d6}[tag]', [0.1, 0.9, 0.5]);
    expect(labelled.breakdown.groups.at(-1)?.labels).toEqual(['tag']);

    const sorted = await roll('{3d6}sd', [0.1, 0.9, 0.5]);
    expect(
      sorted.breakdown.groups.at(-1)?.dice.map((die) => die.value),
    ).toEqual([6, 4, 1]);
  });

  it('applies group-level keep and drop modifiers across member totals', async () => {
    const expressions: Array<[string, number]> = [
      ['{2d6,1d6}kh', 8],
      ['{2d6,1d6}k', 8],
      ['{2d6,1d6}kl', 4],
      ['{2d6,1d6}dh', 4],
      ['{2d6,1d6}dl', 8],
      ['{2d6,1d6}d', 8],
    ];
    for (const [expression, total] of expressions) {
      expect((await roll(expression, [0.5, 0.5, 0.5])).total, expression).toBe(
        total,
      );
    }
  });

  it('ignores keep/match/sort modifiers that need a single member', async () => {
    for (const expression of ['{2d6,1d6}mt', '{2d6,1d6}sd']) {
      const result = await roll(expression, [0.5, 0.5, 0.5]);
      expect(result.total).toBe(12);
    }
  });

  it('applies match modifiers to a single grouped member', async () => {
    const plain = await roll('{2d6}mt', [0.9, 0.9]);
    expect(plain.total).toBe(1);

    const withArgument = await roll('{2d6}mt2', [0.9, 0.9]);
    expect(withArgument.total).toBe(1);
  });

  it('counts compare modifiers for single and multiple members', async () => {
    const single = await roll('{2d6}>3', [0.9, 0.9]);
    expect(single.total).toBe(2);

    const multiple = await roll('{2d6,2d6}>3', [0.9, 0.9, 0.5, 0.5]);
    expect(multiple.total).toBe(2);

    const failures = await roll('{2d6}f<3', [0, 0.2]);
    expect(failures.breakdown.groups.at(-1)?.failure).toBe(2);

    const groupFailures = await roll('{2d6,2d6}f<3', [0, 0.2, 0.9, 0.9]);
    expect(groupFailures.breakdown.groups.at(-1)?.failure).toBe(1);

    const criticals = await roll('{2d6}cs=6', [0.9, 0.9]);
    expect(criticals.breakdown.groups.at(-1)?.critical).toBe(2);

    const groupCriticals = await roll('{2d6,2d6}cf=3', [0, 0.2, 0.9, 0.9]);
    expect(groupCriticals.breakdown.groups.at(-1)?.critical).toBe(1);
  });

  it('finds dice through function arguments inside grouped rolls', async () => {
    const result = await roll('{floor(1d6)}', [0.9]);
    expect(result.total).toBe(6);
  });

  it('accepts table rolls as grouped members', async () => {
    const loot: TableDefinition = {
      name: 'loot',
      entries: [{ weight: 1, value: '5' }],
    };
    const result = await roll('{t[loot]}', [0.5], {
      repositories: {
        ...createStaticRepositories({}),
        tables: {
          async get() {
            return loot;
          },
        },
      },
    });
    expect(
      result.breakdown.groups.some((group) => group.kind === 'table'),
    ).toBe(true);
    expect(result.breakdown.groups.at(-1)?.kind).toBe('group');
  });

  it('covers optional result fields for a hand-built grouped node', () => {
    const grouped: GroupedRollNode = {
      type: 'GroupedRoll',
      plugin: 'dice',
      span: { start: 0, end: 4 },
      rolls: [diceNode()],
      modifiers: [],
      label: 'hand',
    };
    const context = pluginContext({
      evaluate: () => ({
        value: 2,
        records: [
          {
            groupId: 'inner',
            sides: 6,
            value: 2,
            kept: true,
            dropped: false,
            index: 0,
          },
        ],
        segments: [],
      }),
    });
    const result = createDicePlugin().evaluate(grouped, context);
    expect(result?.value).toBe(2);
    expect(result?.groups?.[0].labels).toEqual(['hand']);
  });
});

import { describe, expect, it } from 'vitest';
import {
  createArithmeticPlugin,
  createEmptyRepositories,
  createRollEngine,
  createSnapshot,
  createStaticRepositories,
  evaluateAst,
  parseExpression,
  sequenceRng,
  type DicePlugin,
  type RollResult,
  type TableDefinition,
} from '../index';
import { rollError } from '../engine/errors';

const engine = createRollEngine();

async function roll(
  expression: string,
  options: Parameters<typeof engine.roll>[1] = {
    repositories: createEmptyRepositories(),
  },
  draws: number[] = [0.5],
): Promise<RollResult> {
  const outcome = await engine.roll(expression, {
    ...options,
    rng: options.rng ?? sequenceRng(draws),
  });
  if (outcome.status !== 'complete') {
    throw new Error(
      `expected complete for "${expression}", got ${outcome.status}`,
    );
  }
  return outcome.result;
}

describe('comma-separated modifier clauses', () => {
  it('parses multiple clauses and records them in order', () => {
    const parsed = parseExpression('4d6r<2,ro1,mi2');
    expect(parsed.errors).toEqual([]);
    expect(
      (
        parsed.ast as unknown as { modifiers: Array<{ name: string }> }
      ).modifiers.map((modifier) => modifier.name),
    ).toEqual(['r', 'ro', 'mi']);
  });

  it('evaluates comma-separated reroll clauses', async () => {
    const result = await roll('2d6r1,ro2', undefined, [0, 0.5, 0.9]);
    expect(result.breakdown.groups[0].dice).toHaveLength(2);
  });
});

describe('inline tables and references', () => {
  const tables = {
    async get(name: string): Promise<TableDefinition | undefined> {
      return name === 'loot'
        ? { name, entries: [{ weight: 1, value: '7' }] }
        : undefined;
    },
  };

  it('preloads tables referenced inside inline rolls', async () => {
    const result = await roll('[[t[loot]]] + 1', {
      repositories: { ...createEmptyRepositories(), tables },
    });
    expect(result.total).toBe(8);
  });

  it('reports forward inline references as missing data', async () => {
    const outcome = await engine.roll('[[$[[1]] + 1]]', {
      repositories: createEmptyRepositories(),
      rng: sequenceRng([0.5]),
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('MISSING_DATA');
    }
  });
});

describe('table entry fallback', () => {
  it('uses text fallback for entries that are not numeric or rolls', async () => {
    const result = await roll('t[text]', {
      repositories: {
        ...createEmptyRepositories(),
        tables: {
          async get() {
            return {
              name: 'text',
              entries: [{ weight: 1, value: 'A sword' }],
            };
          },
        },
      },
    });
    expect(result.total).toBe(0);
    expect(
      result.breakdown.segments.some(
        (segment) =>
          segment.kind === 'table' && segment.text.includes('A sword'),
      ),
    ).toBe(true);
  });
});

describe('query child merging', () => {
  it('deduplicates identical child prompts under different parents', async () => {
    const expression = '?{Parent A|?{Child|3}} + ?{Parent B|?{Child|3}}';
    const extraction = await engine.extract(expression, {
      repositories: createEmptyRepositories(),
    });
    expect(
      extraction.queries.filter((query) => query.prompt === 'Child'),
    ).toHaveLength(1);
    expect(
      await roll(expression, {
        repositories: createEmptyRepositories(),
        queryAnswers: { 'Parent A': '1', 'Parent B': '2', Child: '3' },
      }),
    ).toMatchObject({ total: 3 });
  });
});

describe('custom dice edges', () => {
  it('supports duplicate, zero and negative custom faces', async () => {
    const result = await roll('3d[0,-1,2]', undefined, [0, 0.34, 0.99]);
    expect(result.breakdown.groups[0].dice.map((die) => die.value)).toEqual([
      0, -1, 2,
    ]);
    expect((await roll('3d[1,1,1]')).total).toBe(3);
  });

  it('rejects empty custom faces', async () => {
    const outcome = await engine.roll('d[]', {
      repositories: createEmptyRepositories(),
      rng: sequenceRng([0.5]),
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('VALIDATION_INVALID_DICE');
    }
  });
});

describe('group modifier ordering', () => {
  it('applies keep before success counting', async () => {
    const result = await roll(
      '{2d6,2d6}kh1>3',
      undefined,
      [0.9, 0.9, 0.1, 0.1],
    );
    expect(result.breakdown.groups.at(-1)?.success).toBe(1);
  });

  it('applies single-member group modifiers to individual dice', async () => {
    const result = await roll('{4d6}kh2>3', undefined, [0.9, 0.9, 0.1, 0.1]);
    expect(result.breakdown.groups.at(-1)?.success).toBe(2);
  });
});

describe('plugin validation hook', () => {
  it('runs plugin validate() before evaluation', () => {
    const validator: DicePlugin = {
      name: 'validator',
      tokens: [],
      evaluate: () => null,
      validate: (node) =>
        node.type === 'NumberLiteral'
          ? [
              rollError('VALIDATION_INVALID_MODIFIER', 'rejected', {
                pass: 'validate',
              }),
            ]
          : [],
    };
    const parsed = parseExpression('1');
    expect(parsed.ast).toBeDefined();
    expect(() =>
      evaluateAst(parsed.ast!, {
        rng: sequenceRng([0.5]),
        options: { repositories: createEmptyRepositories() },
        plugins: [createArithmeticPlugin(), validator],
      }),
    ).toThrow('rejected');
  });
});

describe('replay and snapshots', () => {
  it('records seed-only RNGs', async () => {
    const seedRng = { next: () => 0.5, seed: 'seed-1' };
    const result = await roll('2d6', {
      repositories: createEmptyRepositories(),
      rng: seedRng,
    });
    expect(result.replay).toEqual({ seed: 'seed-1' });
  });

  it('omits non-serializable replay state from snapshots', async () => {
    const result = await roll('1d6');
    result.replay = { rngStateBefore: () => 1, seed: 'x' };
    const snapshot = createSnapshot(result, 1);
    expect(snapshot.replay).toEqual({ seed: 'x' });
    expect(
      (snapshot.replay as Record<string, unknown>).rngStateBefore,
    ).toBeUndefined();
  });
});

describe('fixture-driven metadata completeness', () => {
  const cases: Array<{
    name: string;
    expression: string;
    options?: Parameters<typeof engine.roll>[1];
    draws?: number[];
    expectGroups?: boolean;
  }> = [
    { name: 'number', expression: '42' },
    { name: 'unary', expression: '-2' },
    { name: 'binary', expression: '2+3*4' },
    { name: 'function', expression: 'floor(2.8)' },
    { name: 'dice', expression: '2d6', draws: [0.1, 0.9], expectGroups: true },
    { name: 'fudge', expression: '2dF', draws: [0.1, 0.9], expectGroups: true },
    {
      name: 'custom',
      expression: 'd[1,2,3]',
      draws: [0.5],
      expectGroups: true,
    },
    {
      name: 'computed',
      expression: '(1+1)d6',
      draws: [0.1, 0.9],
      expectGroups: true,
    },
    {
      name: 'group',
      expression: '{1d6,1d8}',
      draws: [0.1, 0.2],
      expectGroups: true,
    },
    {
      name: 'table',
      expression: 't[loot]',
      options: {
        repositories: {
          ...createEmptyRepositories(),
          tables: {
            async get() {
              return { name: 'loot', entries: [{ weight: 1, value: '2' }] };
            },
          },
        },
      },
      draws: [0.5],
      expectGroups: true,
    },
    {
      name: 'macro',
      expression: '#m',
      options: {
        repositories: createStaticRepositories({ macros: { m: '1d4' } }),
      },
      draws: [0.5],
      expectGroups: true,
    },
    {
      name: 'query',
      expression: '1 + ?{Q|2}',
      options: {
        repositories: createEmptyRepositories(),
        queryAnswers: { Q: '2' },
      },
    },
    {
      name: 'inline',
      expression: '[[1d4]] + 1',
      draws: [0.5],
      expectGroups: true,
    },
    {
      name: 'label',
      expression: '1d6[fire]',
      draws: [0.5],
      expectGroups: true,
    },
    {
      name: 'trailing',
      expression: '1d6 Roll for Initiative',
      draws: [0.5],
      expectGroups: true,
    },
  ];

  it.each(cases)(
    '$name',
    async ({ expression, options, draws, expectGroups }) => {
      const result = await roll(expression, options, draws);
      expect(result.schemaVersion).toBe(1);
      expect(result.breakdown.segments.length).toBeGreaterThan(0);
      expect(result.process.raw).toBe(expression);
      expect(result.process.passes.map((pass) => pass.name)).toEqual(
        expect.arrayContaining([
          'expand',
          'queries',
          'inline',
          'parse',
          'evaluate',
        ]),
      );
      expect(Array.isArray(result.process.expansions)).toBe(true);
      expect(Array.isArray(result.process.queries)).toBe(true);
      expect(Array.isArray(result.process.inlineRolls)).toBe(true);
      expect(Array.isArray(result.process.arithmetic)).toBe(true);
      if (expectGroups) {
        expect(result.breakdown.groups.length).toBeGreaterThan(0);
      }
    },
  );
});

describe('roll-once syntax', () => {
  it('treats bare `o` as text rather than a modifier', async () => {
    const parsed = parseExpression('1d6o');
    expect(parsed.errors).toEqual([]);
    expect(
      (parsed.ast as unknown as { modifiers?: unknown[] }).modifiers ?? [],
    ).toHaveLength(0);
    const result = await roll('1d6o', undefined, [0.5]);
    expect(
      result.breakdown.segments.some((segment) => segment.text === 'o'),
    ).toBe(true);
  });

  it('rerolls once with `ro` and stops after a single reroll', async () => {
    const result = await roll('1d6ro1', undefined, [0, 0, 0.99]);
    const die = result.breakdown.groups[0].dice[0];
    expect(die.value).toBe(1);
    expect(die.rerolled).toBe(true);
  });
});

describe('grouped-roll modifier goldens', () => {
  it('keeps the highest sub-roll total', async () => {
    const result = await roll('{1d6,1d8}kh1', undefined, [0, 0.9]);
    expect(result.total).toBe(8);
  });

  it('drops the lowest sub-roll total', async () => {
    const result = await roll('{1d6,1d8}dl1', undefined, [0, 0.9]);
    expect(result.total).toBe(8);
  });

  it('counts successes across sub-roll totals', async () => {
    const result = await roll('{1d6,1d8}>4', undefined, [0.9, 0.9]);
    expect(result.total).toBe(2);
  });

  it('subtracts failures from grouped successes', async () => {
    const result = await roll('{1d6,1d8}>4f>7', undefined, [0.9, 0.9]);
    expect(result.total).toBe(1);
    expect(result.breakdown.groups.at(-1)?.failure).toBe(1);
  });

  it('applies success checks per die for a single sub-roll', async () => {
    const result = await roll('{3d6}>3', undefined, [0.9, 0.9, 0.1]);
    expect(result.total).toBe(2);
  });

  it('applies keep/drop per die for a single sub-roll', async () => {
    const result = await roll('{4d6}kh2', undefined, [0.9, 0.1, 0.9, 0.1]);
    expect(result.total).toBe(12);
  });
});

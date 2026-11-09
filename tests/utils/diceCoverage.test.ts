import { describe, expect, it } from 'vitest';
import {
  createArithmeticPlugin,
  createDicePlugin,
  createEmptyRepositories,
  createRollEngine,
  createStaticRepositories,
  evaluateAst,
  parseExpression,
  sequenceRng,
  type EngineOptions,
  type RollResult,
  type TableRepository,
} from '@/utils/bag-of-dice';

const engine = createRollEngine();

const tables: TableRepository = {
  async get(name) {
    return name === 'loot'
      ? {
          name,
          entries: [{ weight: 1, value: 'gold' }],
        }
      : undefined;
  },
};

async function roll(
  expression: string,
  options: Partial<EngineOptions> = {},
  draws: number[] = [0.5],
): Promise<RollResult> {
  const outcome = await engine.roll(expression, {
    repositories: {
      ...createEmptyRepositories(),
      ...(options.repositories ?? {}),
      tables,
    },
    rng: sequenceRng(draws),
    ...options,
  });
  if (outcome.status !== 'complete') {
    throw new Error(
      `expected complete for "${expression}", got ${outcome.status}`,
    );
  }
  return outcome.result;
}

describe('dice engine coverage', () => {
  it.each([
    '1',
    'd6',
    '2d6',
    '4d6kh3',
    '4d6kl2',
    '4d6dh1',
    '4d6dl1',
    '4d6k>3',
    '4d6k<4',
    '1d6!',
    '1d6!!',
    '4d6r1',
    '4d6ro1',
    '4d6r<2',
    '4d6r>5',
    '4d6mi2',
    '4d6ma5',
    '4d6sa',
    '4d6sd',
    '4d6cs',
    '4d6cf',
    '4d6[fire]',
    'd[1,2,3]',
    '2d[1,2,3]kh1',
    '{1d6,2d8+1,1d4-1}',
    '{1d6,2d8}kh1',
    '{1d6,2d8}kl1',
    'dF',
    '4dF',
    'dF.1',
    'dF.2',
    'dF.3',
    '1+2-3*4/5%6**2',
    '(1+2)*3',
    '-(1+2)',
    '2**3**2',
    'floor(3.7)',
    'max(1,2)',
    '1t[loot]',
    '1d6[fire]kh3',
  ])('parses and evaluates %s', async (expression) => {
    const result = await roll(expression);
    expect(Number.isFinite(result.total)).toBe(true);
  });

  it('parses inline rolls and expands macros', async () => {
    const inline = await roll('[[1d6]]');
    expect(inline.process.inlineRolls).toHaveLength(1);

    const repositories = createStaticRepositories({
      macros: { attack: '1d6' },
    });
    const macro = await roll('#attack', { repositories });
    expect(macro.process.expansions[0]).toMatchObject({
      kind: 'macro',
      name: 'attack',
    });
  });

  it('reports invalid dice and syntax', async () => {
    expect(parseExpression('').errors.length).toBeGreaterThan(0);
    expect(parseExpression('@str').errors.length).toBeGreaterThan(0);

    const custom = parseExpression('d[]');
    expect(custom.errors).toEqual([]);
    expect(() =>
      evaluateAst(custom.ast!, {
        rng: sequenceRng([0.5]),
        options: { repositories: createEmptyRepositories() },
        plugins: [createArithmeticPlugin(), createDicePlugin()],
      }),
    ).toThrow();
    expect(createDicePlugin().name).toBe('dice');
  });

  it('exposes dice metadata for keep/drop and traces', async () => {
    const result = await roll('2d6kh1', {}, [0.1, 0.9]);
    const dice = result.breakdown.groups[0].dice;
    expect(dice.filter((die) => die.kept)).toHaveLength(1);
    expect(dice.filter((die) => die.dropped)).toHaveLength(1);
    expect(result.process.arithmetic.length).toBeGreaterThan(0);
  });

  it('supports min/max arithmetic functions', async () => {
    expect((await roll('min(3, 1, 2)')).total).toBe(1);
    expect((await roll('max(3, 1, 2)')).total).toBe(3);
  });
});

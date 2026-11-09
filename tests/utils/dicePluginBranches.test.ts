import { describe, expect, it } from 'vitest';
import {
  createEmptyRepositories,
  createRollEngine,
  createStaticRepositories,
  sequenceRng,
  type EngineOptions,
  type EngineOutcome,
  type RollResult,
} from '@/utils/bag-of-dice';

const engine = createRollEngine();

async function outcome(
  expression: string,
  options: Partial<EngineOptions> = {},
  draws: number[] = [0.5],
): Promise<EngineOutcome> {
  return engine.roll(expression, {
    repositories: createEmptyRepositories(),
    rng: sequenceRng(draws),
    ...options,
  });
}

async function roll(
  expression: string,
  options: Partial<EngineOptions> = {},
  draws: number[] = [0.5],
): Promise<RollResult> {
  const result = await outcome(expression, options, draws);
  if (result.status !== 'complete') {
    throw new Error(
      `expected complete for "${expression}", got ${result.status}`,
    );
  }
  return result.result;
}

describe('dice engine branches', () => {
  it('applies reroll comparison operators', async () => {
    for (const operator of ['>', '<', '>=', '<=', '=', '!=']) {
      const result = await roll(`2d6r${operator}2`, {}, [0.1, 0.9, 0.3]);
      expect(result.breakdown.groups[0].dice).toHaveLength(2);
    }
  });

  it('warns and stops at the reroll limit', async () => {
    const result = await roll('2d6r1', { maxExplosionRolls: 1 }, [0, 0, 0]);
    expect(
      result.warnings.some((warning) => warning.code === 'LIMIT_EXPLOSION'),
    ).toBe(true);
  });

  it('applies reroll-once modifiers', async () => {
    const result = await roll('2d6ro1', {}, [0, 0.5, 0.9]);
    expect(result.breakdown.groups[0].dice).toHaveLength(2);
    expect(result.breakdown.groups[0].dice[0].rerolled).toBe(true);
  });

  it('applies explosion and penetration variants', async () => {
    for (const expression of [
      '2d6!',
      '2d6!>3',
      '2d6!<2',
      '2d6!3',
      '2d6!!',
      '2d6!p',
    ]) {
      const result = await roll(expression, {}, [0.9, 0.5, 0.1, 0.9]);
      expect(result.breakdown.groups[0].dice.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('applies success, failure, critical and matching modifiers', async () => {
    const expressions = [
      '4d6s>3',
      '4d6f<3',
      '4d6cs=6',
      '4d6cf=1',
      '4d6mt',
      '4d6m',
      '2d6o',
    ];
    for (const expression of expressions) {
      const result = await roll(expression, {}, [0.9, 0.1, 0.5, 0.3]);
      expect(typeof result.total).toBe('number');
    }
  });

  it('handles exhaustive successes with and without a target', async () => {
    const withTarget = await roll('2d6e>3', {}, [0.9, 0.9, 0.9, 0.1]);
    expect(withTarget.breakdown.groups[0].success).toBeGreaterThanOrEqual(2);

    const withoutTarget = await roll('2d6e', { maxExplosionRolls: 1 }, [0, 0]);
    expect(
      withoutTarget.warnings.some(
        (warning) => warning.code === 'LIMIT_EXPLOSION',
      ),
    ).toBe(true);
  });

  it('handles unary, arithmetic, group and error nodes', async () => {
    expect((await roll('+2')).total).toBe(2);

    const division = await outcome('2/0');
    expect(division.status).toBe('error');
    if (division.status === 'error') {
      expect(division.errors[0].code).toBe('MATH_DIVIDE_BY_ZERO');
    }
    const modulo = await outcome('2%0');
    expect(modulo.status).toBe('error');

    const group = await roll('{1d6,2d6}', {}, [0.5, 0.5, 0.5]);
    expect(group.total).toBe(12);

    const unknown = await outcome('nope(1)');
    expect(unknown.status).toBe('error');
    if (unknown.status === 'error') {
      expect(unknown.errors[0].code).toBe('MATH_UNKNOWN_FUNCTION');
    }

    const table = await outcome('t[loot]');
    expect(table.status).toBe('error');
    if (table.status === 'error') {
      expect(table.errors[0].code).toBe('TABLE_MISSING');
    }
  });

  it('rejects invalid custom and fudge dice counts', async () => {
    for (const expression of ['0d[1]', '0dF']) {
      const result = await outcome(expression);
      expect(result.status, expression).toBe('error');
      if (result.status === 'error') {
        expect(result.errors[0].code).toBe('VALIDATION_INVALID_DICE');
      }
    }
  });

  it('delegates macros and inline rolls', async () => {
    const macro = await roll(
      '#attack',
      { repositories: createStaticRepositories({ macros: { attack: '1d6' } }) },
      [0.5],
    );
    expect(macro.process.expansions).toHaveLength(1);

    const inline = await roll('[[1d6]]', {}, [0.5]);
    expect(inline.process.inlineRolls).toHaveLength(1);
  });
});

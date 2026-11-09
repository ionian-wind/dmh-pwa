import { describe, expect, it } from 'vitest';
import { createRollEngine } from '../engine/engine';
import { createEmptyRepositories } from '../engine/repositories';
import { sequenceRng } from '../engine/rng';
import type { EngineOutcome, RollResult } from '../engine/contracts';

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

async function errorOf(
  expression: string,
  draws: number[] = [0.5],
): Promise<EngineOutcome> {
  return engine.roll(expression, {
    repositories,
    rng: sequenceRng(draws),
  });
}

describe('arithmetic engine', () => {
  it('evaluates precedence and parentheses', async () => {
    expect((await roll('5+7*2')).total).toBe(19);
    expect((await roll('(5+7)*2')).total).toBe(24);
    expect((await roll('2**3**2')).total).toBe(512);
    expect((await roll('-2+5')).total).toBe(3);
  });

  it('evaluates math functions', async () => {
    expect((await roll('floor(2.9)')).total).toBe(2);
    expect((await roll('ceil(2.1)')).total).toBe(3);
    expect((await roll('round(2.5)')).total).toBe(3);
    expect((await roll('abs(-4)')).total).toBe(4);
  });

  it('records an arithmetic trace and render segments', async () => {
    const result = await roll('1+2*3');
    expect(result.process.arithmetic.length).toBeGreaterThan(0);
    expect(
      result.breakdown.segments.some((segment) => segment.kind === 'math'),
    ).toBe(true);
  });

  it('fails division and modulus by zero', async () => {
    const division = await errorOf('1/0');
    expect(division.status).toBe('error');
    if (division.status === 'error') {
      expect(division.errors[0].code).toBe('MATH_DIVIDE_BY_ZERO');
    }
    const modulus = await errorOf('4%0');
    expect(modulus.status).toBe('error');
  });

  it('rejects unknown functions', async () => {
    const outcome = await errorOf('explode(2)');
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('MATH_UNKNOWN_FUNCTION');
    }
  });
});

describe('dice pool', () => {
  it('rolls dice with a deterministic sequence', async () => {
    const result = await roll('2d6', [0, 0.5]);
    expect(result.total).toBe(5);
    expect(result.breakdown.groups[0].dice.map((die) => die.value)).toEqual([
      1, 4,
    ]);
  });

  it('supports d%, custom and fudge dice', async () => {
    expect((await roll('d%', [0.5])).total).toBe(51);
    expect((await roll('d[1,2,3]', [0.9])).total).toBe(3);
    expect((await roll('dF', [0])).total).toBe(-1);
    expect((await roll('dF.1', [0.9])).total).toBe(1);
  });

  it('supports computed dice and rounds computed values', async () => {
    const result = await roll('(1+1)d(2+4)', [0, 0.5]);
    expect(result.total).toBe(5);
    expect((await roll('(1.5)d6', [0.5, 0.5])).total).toBe(8);
  });

  it('applies keep and drop modifiers', async () => {
    expect((await roll('3d6kh1', [0.1, 0.9, 0.5])).total).toBe(6);
    expect((await roll('3d6kl1', [0.1, 0.9, 0.5])).total).toBe(1);
    expect((await roll('3d6dh1', [0.1, 0.9, 0.5])).total).toBe(5);
    expect((await roll('3d6dl1', [0.1, 0.9, 0.5])).total).toBe(10);
  });

  it('rerolls and explodes', async () => {
    expect((await roll('2d6r1', [0, 0.5, 0.9])).total).toBe(10);
    expect((await roll('2d6ro1', [0, 0.5, 0.9])).total).toBe(10);
    expect((await roll('2d6!', [0.9, 0.5, 0.1])).total).toBe(11);
    expect((await roll('2d6!!', [0.9, 0.5, 0.1])).total).toBe(11);
    expect((await roll('2d6!p', [0.9, 0.5, 0.1])).total).toBe(11);
  });

  it('applies min/max clamps', async () => {
    expect((await roll('2d6mi3', [0, 0.2])).total).toBe(6);
    expect((await roll('2d6ma2', [0.9, 0.2])).total).toBe(4);
  });

  it('counts successes, failures and criticals', async () => {
    const successes = await roll('4d6>3', [0, 0.2, 0.6, 0.9]);
    expect(successes.total).toBe(2);
    expect(successes.breakdown.groups[0].success).toBe(2);

    const critical = await roll('4d6cs6', [0.9, 0.1, 0.2, 0.3]);
    expect(critical.breakdown.groups[0].critical).toBe(1);
  });

  it('matches and sorts without changing the total', async () => {
    const matched = await roll('4d6mt', [0.2, 0.2, 0.8, 0.8]);
    expect(matched.total).toBe(2);
    const sorted = await roll('3d6sd', [0, 0.5, 0.9]);
    expect(sorted.breakdown.groups[0].dice.map((die) => die.value)).toEqual([
      6, 4, 1,
    ]);
    expect(sorted.total).toBe(11);
  });

  it('records labels in group metadata', async () => {
    const result = await roll('2d6[fire]', [0.5, 0.5]);
    expect(result.breakdown.groups[0].labels).toEqual(['fire']);
    expect(result.breakdown.groups[0].dice[0].label).toBe('fire');
  });

  it('rejects invalid dice values', async () => {
    for (const expression of ['0d6', '2d0', '2d-6', '2d6.5']) {
      const outcome = await errorOf(expression);
      expect(outcome.status, expression).toBe('error');
      if (outcome.status === 'error') {
        expect(outcome.errors[0].code).toBe('VALIDATION_INVALID_DICE');
      }
    }
  });
});

describe('grouped rolls', () => {
  it('sums comma-separated sub-rolls', async () => {
    const result = await roll('{2d6, 1d8}', [0.1, 0.2, 0.3]);
    expect(result.total).toBe(6);
    expect(result.breakdown.groups.map((group) => group.kind)).toContain(
      'group',
    );
  });

  it('counts group successes with compare modifiers', async () => {
    const result = await roll('{2d6, 1d8}>4', [0.9, 0.9, 0.9]);
    expect(result.total).toBe(2);
    expect(result.breakdown.groups.at(-1)?.success).toBe(2);
  });
});

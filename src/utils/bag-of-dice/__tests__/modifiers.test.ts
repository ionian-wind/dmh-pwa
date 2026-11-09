import { describe, expect, it } from 'vitest';
import { createRollEngine } from '../engine/engine';
import { createEmptyRepositories } from '../engine/repositories';
import { sequenceRng } from '../engine/rng';
import type { RollResult } from '../engine/contracts';

const engine = createRollEngine();
const repositories = createEmptyRepositories();

async function roll(expression: string, draws: number[]): Promise<RollResult> {
  const outcome = await engine.roll(expression, {
    repositories,
    rng: sequenceRng(draws),
  });
  if (outcome.status !== 'complete') {
    throw new Error(`expected complete, got ${outcome.status}`);
  }
  return outcome.result;
}

describe('modifier interactions', () => {
  it('chains reroll + explode + keep + success', async () => {
    const result = await roll('4d6r1!kh2>3', [0.1, 0.9, 0.5, 0.2, 0.5, 0.1]);
    expect(result.total).toBe(2);
    const group = result.breakdown.groups[0];
    expect(group.dice.filter((die) => die.kept)).toHaveLength(2);
    expect(group.dice.some((die) => die.rerolled)).toBe(true);
    expect(group.dice.some((die) => die.exploded)).toBe(true);
  });

  it('records rerolled, compounded and penetrating flags', async () => {
    const rerolled = await roll('2d6r1', [0, 0.5, 0.9]);
    expect(rerolled.breakdown.groups[0].dice[0]).toMatchObject({
      rerolled: true,
      originalValue: 1,
      value: 6,
    });

    const compounded = await roll('2d6!!', [0.9, 0.5, 0.1]);
    expect(
      compounded.breakdown.groups[0].dice.some((die) => die.compounded),
    ).toBe(true);

    const penetrating = await roll('2d6!p', [0.9, 0.5, 0.1]);
    expect(
      penetrating.breakdown.groups[0].dice.some((die) => die.penetrating),
    ).toBe(true);
  });

  it('counts failures and explicit successes', async () => {
    const failures = await roll('4d6f<3', [0, 0.2, 0.6, 0.9]);
    expect(failures.breakdown.groups[0].failure).toBe(2);

    const successes = await roll('4d6s>3', [0, 0.2, 0.6, 0.9]);
    expect(successes.total).toBe(2);
  });

  it('supports nested grouped rolls', async () => {
    const result = await roll('{{2d6},1d8}', [0.1, 0.9, 0.5]);
    expect(
      result.breakdown.groups.filter((group) => group.kind === 'group'),
    ).toHaveLength(2);
  });

  it('validates custom dice faces and fudge variants', async () => {
    const outcome = await engine.roll('dF.9', {
      repositories,
      rng: sequenceRng([0.5]),
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('VALIDATION_INVALID_DICE');
    }
  });
});

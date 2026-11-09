/**
 * Ported from `ttg-club/dice-roller-parser` (MIT) `test/rollerTest.test.ts`.
 *
 * Russian-language operator tests and the Discord renderer tests are
 * intentionally not ported: syntax localization and chat/Discord formatting are
 * outside this engine's scope.
 */
import { describe, expect, it } from 'vitest';
import { createRollEngine } from '../engine/engine';
import { createEmptyRepositories } from '../engine/repositories';
import { cryptoRng, sequenceRng } from '../engine/rng';
import type { RollResult } from '../engine/contracts';

const engine = createRollEngine();
const repositories = createEmptyRepositories();

async function roll(
  expression: string,
  draws: number[] = [0],
): Promise<RollResult> {
  const outcome = await engine.roll(expression, {
    repositories,
    rng: sequenceRng(draws),
  });
  if (outcome.status !== 'complete') {
    const errors = outcome.status === 'error' ? outcome.errors : outcome;
    throw new Error(
      `expected complete for "${expression}": ${JSON.stringify(errors)}`,
    );
  }
  return outcome.result;
}

async function rollValue(
  expression: string,
  draws: number[] = [0],
): Promise<number> {
  return (await roll(expression, draws)).total;
}

// `new DiceRoller(() => 0)` in the reference suite.
const referenceRolls: Array<[string, number]> = [
  ['d20+5', 1 + 5],
  ['3d6+2', 3 + 2],
  ['2d6+5 + d8', 2 + 5 + 1],
  ['1d20+5', 1 + 5],
  ['1d20+5 Roll for Initiative', 1 + 5],
  ['1d20+5 \\ +5 Roll for Initiative', 1 + 5],
  ['2d20+5[Fire Damage] + 3d6+5[Ice Damage]', 2 + 5 + 3 + 5],
  ['2d10+2d6[crit]+5 Critical Hit!', 2 + 2 + 5],
  ['[[2d6]]d5', 2],
  ['5+3', 5 + 3],
  ['3d6!', 3],
  ['3d6!>4', 3],
  ['3d6!3', 3],
  ['10d6!', 10],
  ['5d6!!', 5],
  ['{5d6!!}>8', 0],
  ['5d6!p', 5],
  ['8d100k4', 4],
  ['8d100d3', 5],
  ['8d100dh3', 5],
  ['8d100kl3', 3],
  ['3d6>3', 0],
  ['10d6<4', 10],
  ['3d6>3f1', -3],
  ['3d6<3f1', 0],
  ['10d6<4f>5', 10],
  ['{3d6+1}<3', 3],
  ['2d8r8', 2],
  ['2d8ro1r3r5r7', 2],
  ['2d8ro<2', 2],
  ['4dF', -4],
  ['4dF+1', -3],
  ['{4d6+3d8}kh1', 1],
  ['{4d6,3d8}kh1', 4],
  ['4d6kh1<4', 1],
  ['4d6kh3>4', 0],
  ['4d6>4kh3', 0],
  ['4d6<4kh3', 3],
  ['4d6mt', 1],
  ['4d6mt3', 1],
  ['4d6mt5', 0],
  ['4d6mt3>2', 0],
  ['4d6mt4<2', 1],
  ['floor(7/2)', 3],
  ['ceil(7/2)', 4],
  ['round(7/3)', 2],
  ['round(8/3)', 3],
  ['abs(7)', 7],
  ['abs(-7)', 7],
  ['floor( 5 / 2d6 ) + ceil( (3d6 + 7d2) / 4 ) - 2d6', 3],
  ['16 % 3', 1],
  ['3 ** 2', 9],
];

const testFixedRolls: Array<[string, number, number[]]> = [
  ['1d6!!', 14, [0.84, 0.84, 0.17]],
  ['4d6!!', 24, [0.84, 0.67, 0.5, 0.17, 0.84, 0]],
  ['4d6dl1', 15, [0.84, 0.67, 0.5, 0.17]],
  ['4d6>4', 2, [0.84, 0.17, 0.5, 0.34]],
  ['4d6<2', 1, [0.84, 0.17, 0.5, 0.34]],
  ['3d6>3f1', -3, [0, 0, 0]],
  ['3d6>3f1', 2, [0.84, 0.17, 0.5]],
  ['4d6<2f>4', -1, [0.84, 0.17, 0.5, 0.34]],
  ['4d6', 15, [0.84, 0.17, 0.5, 0.34]],
  // Upstream originally expected 4 (commit 6db9c7a); a later formatting commit
  // changed it to 5 without a semantic change. 4 is correct for the supplied
  // draws: 2 + 1 + 1.
  ['{3d6>4 + 3d4>3, 2d8>7}', 4, [0.84, 0.17, 0.5, 0.76, 0, 0.49, 0.5, 0.86]],
  ['{2d6!}>5', 3, [0.17, 0.84, 0.84, 0.67]],
];

const testSortRolls: Array<[string, number[], number[]]> = [
  ['5d6sd', [6, 5, 4, 2, 1], [0.67, 0.5, 0.17, 0.84, 0]],
  ['5d6sa', [1, 2, 4, 5, 6], [0.67, 0.5, 0.17, 0.84, 0]],
  ['4d6s', [1, 3, 4, 6], [0.84, 0, 0.5, 0.34]],
];

describe('reference roller values', () => {
  for (const [expression, expected] of referenceRolls) {
    it(expression, async () => {
      expect(await rollValue(expression)).toBe(expected);
    });
  }
});

describe('reference fixed-RNG rolls', () => {
  for (const [expression, expected, draws] of testFixedRolls) {
    it(`${expression} (${draws.join(',')})`, async () => {
      expect(await rollValue(expression, draws)).toBe(expected);
    });
  }
});

describe('reference sort ordering', () => {
  for (const [expression, expected, draws] of testSortRolls) {
    it(expression, async () => {
      const result = await roll(expression, draws);
      const group = result.breakdown.groups[0];
      expect(group.dice.map((die) => die.value)).toStrictEqual(expected);
    });
  }
});

describe('reference die bounds', () => {
  it('d6 never produces values below 1 or above 6', async () => {
    const outcome = await engine.roll('1d6', {
      repositories,
      rng: cryptoRng(),
    });
    expect(outcome.status).toBe('complete');
    if (outcome.status !== 'complete') return;
    const dice = outcome.result.breakdown.groups[0].dice;
    for (const die of dice) {
      expect(die.value).toBeGreaterThanOrEqual(1);
      expect(die.value).toBeLessThanOrEqual(6);
    }
  });
});

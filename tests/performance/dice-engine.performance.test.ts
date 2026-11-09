import { describe, expect, it } from 'vitest';
import {
  createEmptyRepositories,
  createRollEngine,
  createSnapshot,
  parseExpression,
  type RollResult,
} from '../../src/utils/bag-of-dice';

/**
 * Regression guards, not micro-benchmarks.
 *
 * Budgets are deliberately ~10x the local runtime so slow CI machines do not
 * flap. Tighten them only after collecting several CI runs.
 */
const BUDGETS = {
  parseMixed: 1_000,
  arithmetic: 1_500,
  keepHighest: 750,
  grouped: 1_000,
  snapshotRoundTrip: 250,
} as const;

const MIXED_EXPRESSIONS = [
  '1d20+5',
  '4d6kh3',
  '2d20kh1',
  '3d6>4',
  '{4d6,3d8}kh1',
  '1d6ro1',
  '2d6!',
  '1d6[fire]+2',
  'floor(3d8/2)',
  '?{Bonus|2}+1d20',
  '[[1d6]]+1',
  't[loot]',
];

const engine = createRollEngine();

function rng(): { next: () => number } {
  let index = 0;
  const values = [0.1, 0.3, 0.5, 0.7, 0.9];
  return { next: () => values[index++ % values.length] };
}

function now(): number {
  return performance.now();
}

async function rollAll(
  expression: string,
  iterations: number,
): Promise<number> {
  const started = now();
  for (let index = 0; index < iterations; index += 1) {
    const outcome = await engine.roll(expression, {
      repositories: createEmptyRepositories(),
      rng: rng(),
    });
    if (outcome.status !== 'complete') {
      throw new Error(`benchmark roll failed: ${outcome.status}`);
    }
  }
  return now() - started;
}

describe('dice engine performance', () => {
  it('parses mixed expressions within budget', () => {
    const iterations = 1_000;
    const started = now();
    for (let index = 0; index < iterations; index += 1) {
      parseExpression(MIXED_EXPRESSIONS[index % MIXED_EXPRESSIONS.length]);
    }
    const elapsed = now() - started;
    console.log(
      `[perf] parse mixed: ${iterations} ops in ${elapsed.toFixed(1)}ms`,
    );
    expect(elapsed).toBeLessThan(BUDGETS.parseMixed);
  });

  it('evaluates arithmetic within budget', async () => {
    const iterations = 2_000;
    const elapsed = await rollAll('2+3*4', iterations);
    console.log(
      `[perf] arithmetic: ${iterations} rolls in ${elapsed.toFixed(1)}ms`,
    );
    expect(elapsed).toBeLessThan(BUDGETS.arithmetic);
  });

  it('evaluates keep-highest pools within budget', async () => {
    const iterations = 1_000;
    const elapsed = await rollAll('4d6kh3', iterations);
    console.log(
      `[perf] 4d6kh3: ${iterations} rolls in ${elapsed.toFixed(1)}ms`,
    );
    expect(elapsed).toBeLessThan(BUDGETS.keepHighest);
  });

  it('evaluates grouped rolls within budget', async () => {
    const iterations = 1_000;
    const elapsed = await rollAll('{4d6,3d8}kh1>10', iterations);
    console.log(`[perf] group: ${iterations} rolls in ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(BUDGETS.grouped);
  });

  it('round-trips snapshots within budget', async () => {
    const iterations = 500;
    const outcome = await engine.roll('4d6kh3+2', {
      repositories: createEmptyRepositories(),
      rng: rng(),
    });
    if (outcome.status !== 'complete') throw new Error('benchmark roll failed');
    const result: RollResult = outcome.result;

    const started = now();
    for (let index = 0; index < iterations; index += 1) {
      createSnapshot(result, index);
    }
    const elapsed = now() - started;
    console.log(
      `[perf] snapshot: ${iterations} ops in ${elapsed.toFixed(1)}ms`,
    );
    expect(elapsed).toBeLessThan(BUDGETS.snapshotRoundTrip);
  });
});

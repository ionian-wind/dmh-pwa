import { describe, expect, it } from 'vitest';
import { createRollEngine } from '../engine/engine';
import { createEmptyRepositories } from '../engine/repositories';
import { sequenceRng } from '../engine/rng';
import type { RollResult } from '../engine/contracts';

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

describe('inline rolls', () => {
  it('evaluates an inline roll and keeps the raw source', async () => {
    const result = await roll('[[1d6]]', [0.5]);
    expect(result.total).toBe(4);
    expect(result.process.inlineRolls).toHaveLength(1);
    expect(result.process.inlineRolls[0]).toMatchObject({
      index: 0,
      source: '1d6',
      computedResult: 4,
    });
  });

  it('evaluates nested inline rolls innermost-first', async () => {
    const result = await roll('[[1+[[1+1]]]]');
    expect(result.total).toBe(3);
    expect(result.process.inlineRolls.map((record) => record.index)).toEqual([
      0, 1,
    ]);
  });

  it('preserves labels inside inline rolls', async () => {
    const result = await roll('[[2d6[fire]]]', [0.5, 0.5]);
    expect(result.breakdown.groups[0].labels).toEqual(['fire']);
  });

  it('resolves $[[n]] references from recorded values without re-rolling', async () => {
    const result = await roll('[[2d6]] + $[[0]]', [0.5, 0.5]);
    expect(result.total).toBe(16);
    expect(result.process.inlineRolls[0].computedResult).toBe(8);
  });

  it('reports missing references', async () => {
    const outcome = await engine.roll('1 + $[[5]]', {
      repositories,
      rng: sequenceRng([0.5]),
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('MISSING_DATA');
    }
  });

  it('enforces the inline depth limit', async () => {
    const outcome = await engine.roll('[[[[1]]]]', {
      repositories,
      rng: sequenceRng([0.5]),
      maxInlineDepth: 1,
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('INLINE_DEPTH');
    }
  });
});

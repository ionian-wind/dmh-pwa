import { describe, expect, it } from 'vitest';
import { createRollEngine } from '../engine/engine';
import { createEmptyRepositories } from '../engine/repositories';
import { sequenceRng } from '../engine/rng';
import type { RollResult } from '../engine/contracts';

const engine = createRollEngine();
const repositories = createEmptyRepositories();

async function roll(
  expression: string,
  queryAnswers: Record<string, string> = {},
  draws = [0.5],
): Promise<RollResult> {
  const outcome = await engine.roll(expression, {
    repositories,
    rng: sequenceRng(draws),
    queryAnswers,
  });
  if (outcome.status !== 'complete') {
    throw new Error(`expected complete, got ${outcome.status}`);
  }
  return outcome.result;
}

describe('roll queries', () => {
  it('extracts prompts without rolling', async () => {
    const extraction = await engine.extract('1 + ?{Bonus}', {
      repositories,
    });
    expect(extraction.errors).toEqual([]);
    expect(extraction.queries).toHaveLength(1);
    expect(extraction.queries[0]).toMatchObject({
      prompt: 'Bonus',
      required: true,
    });
    expect(extraction.passes.map((pass) => pass.name)).toEqual(['expand']);
  });

  it('returns needs-input for unanswered required queries', async () => {
    const outcome = await engine.roll('1 + ?{Bonus}', {
      repositories,
      rng: sequenceRng([0.5]),
    });
    expect(outcome.status).toBe('needs-input');
    if (outcome.status === 'needs-input') {
      expect(outcome.extraction.queries[0].prompt).toBe('Bonus');
    }
  });

  it('accepts answers by id and by prompt text', async () => {
    const byPrompt = await roll('1 + ?{Bonus}', { Bonus: '2' });
    expect(byPrompt.total).toBe(3);

    const extraction = await engine.extract('1 + ?{Bonus}', { repositories });
    const id = extraction.queries[0].id;
    const byId = await roll('1 + ?{Bonus}', { [id]: '4' });
    expect(byId.total).toBe(5);
  });

  it('uses defaults and option values', async () => {
    expect((await roll('1 + ?{Bonus|2}')).total).toBe(3);
    expect((await roll('?{Bonus|1|2}', { Bonus: '2' })).total).toBe(2);
    expect((await roll('?{Color|Red,1|Blue,2}', { Color: 'Blue' })).total).toBe(
      2,
    );
  });

  it('deduplicates repeated prompts', async () => {
    const extraction = await engine.extract('?{Bonus}+?{Bonus}', {
      repositories,
    });
    expect(extraction.queries).toHaveLength(1);
    expect((await roll('?{Bonus}+?{Bonus}', { Bonus: '2' })).total).toBe(4);
  });

  it('extracts and resolves nested queries', async () => {
    const extraction = await engine.extract('?{Outer|?{Inner|3}}', {
      repositories,
    });
    expect(extraction.queries).toHaveLength(2);
    expect(extraction.queries.some((query) => query.prompt === 'Inner')).toBe(
      true,
    );
    expect((await roll('?{Outer|?{Inner|3}}')).total).toBe(3);
    expect((await roll('?{Outer|?{Inner|3}}', { Outer: '5' })).total).toBe(5);
  });

  it('rejects invalid option answers', async () => {
    const outcome = await engine.roll('?{Bonus|1|2}', {
      repositories,
      rng: sequenceRng([0.5]),
      queryAnswers: { Bonus: '7' },
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('QUERY_INVALID_ANSWER');
    }
  });

  it('warns about extra answers without failing', async () => {
    const result = await roll('1 + ?{Bonus|1}', {
      Bonus: '1',
      Unknown: 'x',
    });
    expect(result.total).toBe(2);
    expect(
      result.warnings.some((warning) => warning.code === 'QUERY_EXTRA_ANSWER'),
    ).toBe(true);
  });

  it('records query answers in process metadata', async () => {
    const result = await roll('1 + ?{Bonus}', { Bonus: '2' });
    expect(result.process.queries[0]).toMatchObject({
      prompt: 'Bonus',
      answer: '2',
    });
  });
});

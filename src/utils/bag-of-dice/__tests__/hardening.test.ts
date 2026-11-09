import { describe, expect, it } from 'vitest';
import { createRollEngine } from '../engine/engine';
import { createEmptyRepositories } from '../engine/repositories';
import { sequenceRng } from '../engine/rng';
import { createStaticRepositories } from '../engine/repositories';
import type { RollResult } from '../engine/contracts';

const engine = createRollEngine();
const repositories = createEmptyRepositories();

async function roll(
  expression: string,
  draws: number[] = [0.5],
): Promise<RollResult> {
  const outcome = await engine.roll(expression, {
    repositories,
    rng: sequenceRng(draws),
  });
  if (outcome.status !== 'complete') {
    throw new Error(`expected complete, got ${outcome.status}`);
  }
  return outcome.result;
}

describe('limits and safety', () => {
  it('enforces the output size limit', async () => {
    const outcome = await engine.roll('1+1+1+1+1', {
      repositories,
      rng: sequenceRng([0.5]),
      maxOutputLength: 2,
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('LIMIT_OUTPUT');
    }
  });

  it('enforces the pass time limit', async () => {
    const repositoriesSlow = createStaticRepositories({});
    const slow = {
      ...repositoriesSlow,
      macros: {
        async get(name: string) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return name === 'slow'
            ? { name, command: '1', source: 'user' as const }
            : undefined;
        },
      },
    };
    const outcome = await engine.roll('#slow', {
      repositories: slow,
      rng: sequenceRng([0.5]),
      maxPassTimeMs: 1,
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('LIMIT_TIME');
    }
  });

  it('fails macro bombs at the expansion depth limit', async () => {
    const macros: Record<string, string> = {};
    for (let index = 0; index < 20; index += 1) {
      macros[`m${index}`] = `#m${index + 1}`;
    }
    macros.m20 = '1';
    const outcome = await engine.roll('#m0', {
      repositories: createStaticRepositories({ macros }),
      rng: sequenceRng([0.5]),
      maxExpansionDepth: 5,
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('EXPANSION_DEPTH');
    }
  });

  it('handles a large pool within a broad budget', async () => {
    const started = performance.now();
    const result = await roll(
      '100d6',
      Array.from({ length: 100 }, () => 0.5),
    );
    const elapsed = performance.now() - started;
    expect(result.breakdown.groups[0].dice).toHaveLength(100);
    expect(elapsed).toBeLessThan(500);
  });

  it('keeps error codes localization-ready', async () => {
    const outcome = await engine.roll('2d0', {
      repositories,
      rng: sequenceRng([0.5]),
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toMatch(/^[A-Z_]+$/);
      expect(outcome.errors[0].message).toMatch(/^[\x20-\x7E]+$/);
    }
  });

  it('preserves labels as text without evaluating markup', async () => {
    const result = await roll('1d6[fire & ice]', [0.5]);
    expect(result.breakdown.groups[0].labels).toEqual(['fire & ice']);
  });
});

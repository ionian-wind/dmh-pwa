import { describe, expect, it } from 'vitest';
import { createRollEngine } from '../engine/engine';
import {
  CompositeMacroRepository,
  createEmptyRepositories,
  createStaticRepositories,
} from '../engine/repositories';
import { sequenceRng } from '../engine/rng';
import type {
  EngineOptions,
  RollResult,
  TableRepository,
} from '../engine/contracts';

const engine = createRollEngine();

async function roll(
  expression: string,
  extra: Partial<EngineOptions> = {},
  draws: number[] = [0.5],
): Promise<RollResult> {
  const outcome = await engine.roll(expression, {
    repositories: createEmptyRepositories(),
    rng: sequenceRng(draws),
    ...extra,
  });
  if (outcome.status !== 'complete') {
    throw new Error(`expected complete, got ${outcome.status}`);
  }
  return outcome.result;
}

describe('composite macro repository', () => {
  it('resolves in order and reports shadowed definitions', async () => {
    const user = {
      async get(name: string) {
        return name === 'attack'
          ? { name, command: '10', source: 'user' as const }
          : undefined;
      },
    };
    const pack = {
      async get(name: string) {
        return name === 'attack'
          ? { name, command: '20', source: 'pack' as const }
          : undefined;
      },
    };
    const composite = new CompositeMacroRepository([user, pack]);
    const resolved = await composite.resolve('attack');
    expect(resolved.definition?.command).toBe('10');
    expect(resolved.shadowed).toHaveLength(1);
  });

  it('memoizes expansion lookups per call', async () => {
    let calls = 0;
    const macros = {
      async get(name: string) {
        calls += 1;
        return name === 'bonus'
          ? { name, command: '2', source: 'user' as const }
          : undefined;
      },
    };
    const result = await roll('#bonus + #bonus + #bonus', {
      repositories: createStaticRepositories({}),
      macroSource: macros,
    });
    expect(result.total).toBe(6);
    expect(calls).toBe(1);
  });
});

describe('query edge cases', () => {
  it('decodes HTML entities in prompts', async () => {
    const extraction = await engine.extract('1 + ?{A &amp; B|1}', {
      repositories: createEmptyRepositories(),
    });
    expect(extraction.queries[0].prompt).toBe('A & B');
    expect((await roll('1 + ?{A &amp; B|1}')).total).toBe(2);
  });

  it('evaluates inline rolls in query defaults', async () => {
    const result = await roll('1 + ?{Bonus|[[1+1]]}');
    expect(result.total).toBe(3);
  });

  it('does not touch external data while extracting', async () => {
    let tableCalls = 0;
    const tables: TableRepository = {
      async get() {
        tableCalls += 1;
        return undefined;
      },
    };
    await engine.extract('1 + ?{Bonus}', {
      repositories: { ...createEmptyRepositories(), tables },
    });
    expect(tableCalls).toBe(0);
  });
});

describe('remaining modifier behavior', () => {
  it('rejects grouped rolls without dice', async () => {
    const outcome = await engine.roll('{1,2}', {
      repositories: createEmptyRepositories(),
      rng: sequenceRng([0.5]),
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('VALIDATION_INVALID_MODIFIER');
    }
  });

  it('supports exhaustive successes', async () => {
    const result = await roll('2d6e>3', {}, [0.9, 0.9, 0.9, 0.1]);
    expect(result.breakdown.groups[0].success).toBeGreaterThanOrEqual(2);
  });

  it('warns and stops at the explosion limit', async () => {
    const result = await roll(
      '1d6!',
      { maxExplosionRolls: 1 },
      [0.9, 0.9, 0.9],
    );
    expect(
      result.warnings.some((warning) => warning.code === 'LIMIT_EXPLOSION'),
    ).toBe(true);
  });
});

describe('acceptance contract', () => {
  it('has no chat or UI dependency in the engine', async () => {
    const source = await import('node:fs/promises');
    const files = await source.readdir('src/utils/bag-of-dice/engine', {
      recursive: true,
    });
    for (const file of files) {
      if (!file.endsWith('.ts')) continue;
      const contents = await source.readFile(
        `src/utils/bag-of-dice/engine/${file}`,
        'utf8',
      );
      expect(contents).not.toMatch(/from ['"]vue['"]/);
      expect(contents).not.toMatch(/from ['"]pinia['"]/);
      expect(contents).not.toMatch(/src\/chat/);
    }
  });

  it('exposes a stable schema version', async () => {
    const { ENGINE_SCHEMA_VERSION } = await import('../engine/snapshot');
    expect(ENGINE_SCHEMA_VERSION).toBe(1);
    expect((await roll('1')).schemaVersion).toBe(1);
  });
});

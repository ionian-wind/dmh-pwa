import { describe, expect, it } from 'vitest';
import { createRollEngine } from '../engine/engine';
import { createEmptyRepositories } from '../engine/repositories';
import { sequenceRng } from '../engine/rng';
import type {
  RollResult,
  TableDefinition,
  TableRepository,
} from '../engine/contracts';

const engine = createRollEngine();

function tableRepository(
  tables: Record<string, TableDefinition>,
): TableRepository {
  return {
    async get(name) {
      return tables[name.toLowerCase()];
    },
  };
}

async function rollWith(
  expression: string,
  tables: Record<string, TableDefinition>,
  draws: number[],
  extra: Record<string, unknown> = {},
): Promise<RollResult> {
  const outcome = await engine.roll(expression, {
    repositories: {
      ...createEmptyRepositories(),
      tables: tableRepository(tables),
    },
    rng: sequenceRng(draws),
    ...extra,
  });
  if (outcome.status !== 'complete') {
    throw new Error(`expected complete, got ${outcome.status}`);
  }
  return outcome.result;
}

const loot: TableDefinition = {
  name: 'loot',
  entries: [
    { weight: 1, value: '10' },
    { weight: 1, value: '20' },
  ],
};

describe('table plugin', () => {
  it('selects entries with one RNG draw', async () => {
    const first = await rollWith('t[loot]', { loot }, [0.1]);
    expect(first.total).toBe(10);
    expect(first.process.tables[0]).toMatchObject({
      table: 'loot',
      index: 0,
      value: '10',
    });

    const second = await rollWith('t[loot]', { loot }, [0.9]);
    expect(second.total).toBe(20);
  });

  it('rolls a table multiple times', async () => {
    const result = await rollWith('2t[loot]', { loot }, [0.1, 0.9]);
    expect(result.total).toBe(30);
    expect(result.process.tables).toHaveLength(2);
  });

  it('supports percentage weights', async () => {
    const percentage: TableDefinition = {
      name: 'pct',
      entries: [
        { weight: 50, value: '1' },
        { weight: 50, value: '2' },
      ],
    };
    expect((await rollWith('t[pct]', { pct: percentage }, [0.1])).total).toBe(
      1,
    );
    expect((await rollWith('t[pct]', { pct: percentage }, [0.9])).total).toBe(
      2,
    );
  });

  it('evaluates inline entry rolls', async () => {
    const inline: TableDefinition = {
      name: 'inline',
      entries: [{ weight: 1, value: 'dmg', inlineRoll: '1d6' }],
    };
    const result = await rollWith('t[inline]', { inline }, [0.1, 0.5]);
    expect(result.total).toBe(4);
  });

  it('reports missing tables', async () => {
    const outcome = await engine.roll('t[missing]', {
      repositories: createEmptyRepositories(),
      rng: sequenceRng([0.5]),
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('TABLE_MISSING');
    }
  });

  it('downgrades missing tables with noerror', async () => {
    const result = await rollWith('&{noerror} t[missing]', {}, [0.5]);
    expect(result.total).toBe(0);
    expect(
      result.warnings.some((warning) => warning.code === 'TABLE_MISSING'),
    ).toBe(true);
  });

  it('detects table cycles', async () => {
    const tables = {
      a: { name: 'a', entries: [{ weight: 1, value: 't[b]' }] },
      b: { name: 'b', entries: [{ weight: 1, value: 't[a]' }] },
    };
    const outcome = await engine.roll('t[a]', {
      repositories: {
        ...createEmptyRepositories(),
        tables: tableRepository(tables),
      },
      rng: sequenceRng([0.5]),
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('TABLE_CYCLE');
    }
  });

  it('enforces table depth limits', async () => {
    const tables = {
      outer: { name: 'outer', entries: [{ weight: 1, value: 't[inner]' }] },
      inner: { name: 'inner', entries: [{ weight: 1, value: '7' }] },
    };
    const outcome = await engine.roll('t[outer]', {
      repositories: {
        ...createEmptyRepositories(),
        tables: tableRepository(tables),
      },
      rng: sequenceRng([0.5]),
      maxTableDepth: 0,
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('TABLE_DEPTH');
    }
  });

  it('evaluates nested tables', async () => {
    const tables = {
      outer: { name: 'outer', entries: [{ weight: 1, value: 't[inner]' }] },
      inner: { name: 'inner', entries: [{ weight: 1, value: '7' }] },
    };
    const result = await rollWith('t[outer]', tables, [0.5, 0.5]);
    expect(result.total).toBe(7);
  });
});

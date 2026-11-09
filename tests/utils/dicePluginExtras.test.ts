import { describe, expect, it } from 'vitest';
import {
  createDicePlugin,
  createEmptyRepositories,
  createPluginRegistry,
  createRollEngine,
  createStaticRepositories,
  sequenceRng,
  type EngineOptions,
  type EngineOutcome,
  type RollResult,
  type TableDefinition,
  type TableRepository,
} from '@/utils/bag-of-dice';

const engine = createRollEngine();

function tableRepository(
  tables: Record<string, TableDefinition>,
): TableRepository {
  return {
    async get(name) {
      return tables[name];
    },
  };
}

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

describe('table engine coverage', () => {
  const loot: TableDefinition = {
    name: 'loot',
    entries: [
      { weight: 2, value: 'gold' },
      { weight: 1, value: 'gem' },
    ],
  };

  it('selects classic and weighted table entries', async () => {
    const repositories = {
      tables: tableRepository({ loot }),
    };
    const weighted = await roll('2t[loot]', { repositories }, [0.1, 0.9]);
    expect(weighted.process.tables).toHaveLength(2);
    expect(weighted.process.tables[0].value).toBe('gold');

    const numeric = await roll(
      't[numbers]',
      {
        repositories: {
          tables: tableRepository({
            numbers: {
              name: 'numbers',
              entries: [{ weight: 1, value: '7' }],
            },
          }),
        },
      },
      [0.5],
    );
    expect(numeric.total).toBe(7);
  });

  it('reports missing, empty and invalid table rolls', async () => {
    const missing = await outcome('t[missing]');
    expect(missing.status).toBe('error');
    if (missing.status === 'error') {
      expect(missing.errors[0].code).toBe('TABLE_MISSING');
    }

    const empty = await outcome('t[empty]', {
      repositories: {
        tables: tableRepository({
          empty: { name: 'empty', entries: [] },
        }),
      },
    });
    expect(empty.status).toBe('error');
    if (empty.status === 'error') {
      expect(empty.errors[0].code).toBe('TABLE_MISSING');
    }

    const invalidCount = await outcome('0t[loot]', {
      repositories: { tables: tableRepository({ loot }) },
    });
    expect(invalidCount.status).toBe('error');
    if (invalidCount.status === 'error') {
      expect(invalidCount.errors[0].code).toBe('VALIDATION_INVALID_MODIFIER');
    }
  });

  it('validates table syntax', async () => {
    const invalid = await outcome('invalid');
    expect(invalid.status).toBe('error');
  });
});

describe('macro engine coverage', () => {
  it('expands nested macros and records provenance', async () => {
    const repositories = createStaticRepositories({
      macros: {
        outer: '#inner',
        inner: '1+4',
      },
    });
    const result = await roll('#outer', { repositories });
    expect(result.total).toBe(5);
    expect(result.process.expansions.map((record) => record.name)).toEqual([
      'inner',
      'outer',
    ]);
  });

  it('guards missing macros and recursion', async () => {
    const missing = await outcome('#missing');
    expect(missing.status).toBe('error');
    if (missing.status === 'error') {
      expect(missing.errors[0].code).toBe('MISSING_DATA');
    }

    const cyclic = await outcome('#a', {
      repositories: createStaticRepositories({
        macros: { a: '#b', b: '#a' },
      }),
    });
    expect(cyclic.status).toBe('error');
    if (cyclic.status === 'error') {
      expect(cyclic.errors[0].code).toBe('EXPANSION_CYCLE');
    }
  });
});

describe('plugin registry coverage', () => {
  it('rejects duplicate plugin names', () => {
    expect(() =>
      createPluginRegistry([createDicePlugin(), createDicePlugin()]),
    ).toThrow(/duplicate plugin name/);
  });

  it('provides a stable dice plugin name', () => {
    expect(createDicePlugin().name).toBe('dice');
  });
});

import { describe, expect, it } from 'vitest';
import type {
  EngineOptions,
  InlineRollRecord,
  Repositories,
  RollResult,
  TableRepository,
} from '../engine/contracts';
import { createRollEngine } from '../engine/engine';
import { RollFailure } from '../engine/errors';
import { expandRollText } from '../engine/expansion';
import { processInlineRolls, replaceReferences } from '../engine/inline';
import { resolveLimits } from '../engine/limits';
import {
  createEmptyRepositories,
  createStaticRepositories,
} from '../engine/repositories';
import { sequenceRng } from '../engine/rng';

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

function withoutTables(): Repositories {
  const { tables: _tables, ...rest } = createEmptyRepositories();
  return rest;
}

describe('engine branch coverage', () => {
  it('extracts without repositories and with optional expansion inputs', async () => {
    const bare = await engine.extract('1 + 1', {} as EngineOptions);
    expect(bare.errors).toEqual([]);
    expect(bare.expanded).toBe('1 + 1');

    const macros = createStaticRepositories({ macros: { bonus: '2' } });
    const controller = new AbortController();
    const optional = await engine.extract('#bonus', {
      repositories: repositories,
      macroSource: macros.macros,
      signal: controller.signal,
    });
    expect(optional.errors).toEqual([]);
    expect(optional.expanded).toBe('2');
  });

  it('turns repository failures during extraction into structured errors', async () => {
    const extraction = await engine.extract('#broken', {
      repositories: {
        ...createEmptyRepositories(),
        macros: {
          async get() {
            throw new Error('database offline');
          },
        },
      },
    });
    expect(extraction.expanded).toBe('#broken');
    expect(extraction.errors[0]).toMatchObject({ code: 'INTERNAL' });
    expect(extraction.errors[0].message).toContain('database offline');
  });

  it('rolls with the default repositories and RNG', async () => {
    const outcome = await engine.roll('1', {} as EngineOptions);
    expect(outcome.status).toBe('complete');
    if (outcome.status === 'complete') {
      expect(outcome.result.total).toBe(1);
    }
  });

  it('carries a signal through inline evaluation and metadata', async () => {
    const controller = new AbortController();
    const result = await roll('[[1d6]]', [0.5], {
      signal: controller.signal,
    });
    expect(result.total).toBe(4);
    expect(result.process.inlineRolls[0]).toMatchObject({
      source: '1d6',
      computedResult: 4,
    });
    expect(result.process.inlineRolls[0].groups).toHaveLength(1);
    expect(result.process.inlineRolls[0].segments?.length).toBeGreaterThan(0);
    expect(result.process.inlineRolls[0].arithmetic?.length).toBeGreaterThan(0);
  });

  it('cancels before rolling when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const outcome = await engine.roll('1d6', {
      repositories,
      rng: sequenceRng([0.5]),
      signal: controller.signal,
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('CANCELLED');
    }
  });

  it('reuses preloaded tables and handles a missing table repository', async () => {
    const tables: TableRepository = {
      async get(name) {
        return { name, entries: [{ weight: 1, value: '2' }] };
      },
    };
    const reused = await roll('t[loot] + t[loot]', [0.5, 0.5], {
      repositories: { ...createEmptyRepositories(), tables },
    });
    expect(reused.total).toBe(4);

    const missing = await roll('&{noerror} t[loot]', [0.5], {
      repositories: withoutTables(),
    });
    expect(missing.total).toBe(0);
    expect(
      missing.warnings.some((warning) => warning.code === 'TABLE_MISSING'),
    ).toBe(true);
  });

  it('reports table repository failures as missing tables', async () => {
    const outcome = await engine.roll('t[broken]', {
      repositories: {
        ...createEmptyRepositories(),
        tables: {
          async get() {
            throw new Error('table store failed');
          },
        },
      },
      rng: sequenceRng([0.5]),
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('TABLE_MISSING');
    }
  });

  it('ignores invalid inline table expressions during preload', async () => {
    const outcome = await engine.roll('t[broken]', {
      repositories: {
        ...createEmptyRepositories(),
        tables: {
          async get(name) {
            return {
              name,
              entries: [{ weight: 1, value: 'plain', inlineRoll: '1 +' }],
            };
          },
        },
      },
      rng: sequenceRng([0.5]),
    });
    expect(outcome.status).toBe('error');
  });
});

describe('expansion branch coverage', () => {
  it('resolves default limits and cache when called directly', async () => {
    const output = await expandRollText('1', {
      repositories: createEmptyRepositories(),
    });
    expect(output.text).toBe('1');
    expect(output.passes[0]).toMatchObject({ name: 'expand', input: '1' });
  });

  it('accepts an explicit cache and limits', async () => {
    const cache = new Map<string, unknown>();
    const output = await expandRollText('#bonus', {
      repositories: createStaticRepositories({ macros: { bonus: '2' } }),
      cache,
      limits: resolveLimits(),
    });
    expect(output.text).toBe('2');
    expect(cache.size).toBeGreaterThan(0);
  });

  it('only treats #name as a macro at a word boundary', async () => {
    const repositories = createStaticRepositories({ macros: { bonus: '2' } });
    const spaced = await expandRollText(' #bonus', { repositories });
    expect(spaced.text).toBe(' 2');

    const embedded = await expandRollText('x#bonus', { repositories });
    expect(embedded.text).toBe('x#bonus');
    expect(embedded.records).toEqual([]);
  });

  it('enforces output limits during and after expansion', async () => {
    await expect(
      expandRollText('#bonus', {
        repositories: createStaticRepositories({ macros: { bonus: '12345' } }),
        limits: resolveLimits({ maxOutputLength: 2 }),
      }),
    ).rejects.toMatchObject({ errors: [{ code: 'LIMIT_OUTPUT' }] });

    await expect(
      expandRollText('12345', {
        repositories: createEmptyRepositories(),
        limits: resolveLimits({ maxOutputLength: 2 }),
      }),
    ).rejects.toMatchObject({ errors: [{ code: 'LIMIT_OUTPUT' }] });
  });

  it('cancels expansion when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      expandRollText('1', {
        repositories: createEmptyRepositories(),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ errors: [{ code: 'CANCELLED' }] });
  });

  it('downgrades missing abilities with noerror', async () => {
    const output = await expandRollText('&{noerror} %{Alice|Missing}', {
      repositories: createEmptyRepositories(),
    });
    expect(
      output.warnings.some((warning) => warning.code === 'MISSING_DATA'),
    ).toBe(true);
  });

  it('resolves pipe-less ability and attribute references', async () => {
    const abilities = await expandRollText('%{Fireball}', {
      repositories: createStaticRepositories({
        abilities: { 'Fireball|Fireball': '2' },
      }),
    });
    expect(abilities.text).toBe('2');

    const attributes = await expandRollText('@{HP}', {
      repositories: createStaticRepositories({
        attributes: { 'HP|HP': 7 },
      }),
    });
    expect(attributes.text).toBe('7');
  });

  it('passes row ids and handles attributes without values or maxima', async () => {
    const seen: Array<{ max?: boolean; rowIndex?: number; rowId?: string }> =
      [];
    const withRow = await expandRollText('@{selected|HP|row-1}', {
      repositories: {
        ...createEmptyRepositories(),
        attributes: {
          async get(_character, _attribute, options) {
            seen.push({
              ...(options?.max ? { max: true } : {}),
              ...(options?.rowIndex !== undefined
                ? { rowIndex: options.rowIndex }
                : {}),
              ...(options?.rowId ? { rowId: options.rowId } : {}),
            });
            return { value: 5 };
          },
        },
      },
    });
    expect(withRow.text).toBe('5');
    expect(seen[0]).toEqual({ rowId: 'row-1' });

    const maxFallback = await expandRollText('@{selected|HP|max}', {
      repositories: {
        ...createEmptyRepositories(),
        attributes: {
          async get() {
            return { value: 5 };
          },
        },
      },
    });
    expect(maxFallback.text).toBe('5');

    const noValue = await expandRollText('&{noerror} @{selected|HP}', {
      repositories: {
        ...createEmptyRepositories(),
        attributes: {
          async get() {
            return { value: undefined as never };
          },
        },
      },
    });
    expect(
      noValue.warnings.some((warning) => warning.code === 'MISSING_DATA'),
    ).toBe(true);
  });
});

describe('inline branch coverage', () => {
  it('leaves text without inline rolls untouched using default limits', async () => {
    const output = await processInlineRolls('plain text', {
      evaluate: async () => ({ value: 1 }),
    });
    expect(output.text).toBe('plain text');
    expect(output.records).toEqual([]);
    expect(output.passes[0]).toMatchObject({ name: 'inline' });
  });

  it('uses explicit limits and copies optional evaluation metadata', async () => {
    const output = await processInlineRolls('[[roll]]', {
      limits: resolveLimits(),
      evaluate: async () => ({
        value: [1, 2],
        warnings: [{ code: 'W', message: 'warning', pass: 'test' }],
        groups: [{ id: 'g1', kind: 'dice', dice: [], total: 3, modifiers: [] }],
        segments: [{ kind: 'math', text: '3', result: 3 }],
        arithmetic: [{ expression: '1 + 2', result: 3, nodeType: 'BinaryOp' }],
      }),
    });
    expect(output.text).toBe('3');
    expect(output.records[0]).toMatchObject({
      rawResult: [1, 2],
      computedResult: 3,
      groups: [{ id: 'g1' }],
    });
    expect(output.warnings).toHaveLength(1);
  });

  it('defaults warnings for evaluations without metadata', async () => {
    const output = await processInlineRolls('[[1]]', {
      evaluate: async () => ({ value: 2 }),
    });
    expect(output.records[0]).toMatchObject({
      source: '1',
      rawResult: 2,
      computedResult: 2,
      warnings: [],
    });
  });

  it('enforces the inline output limit', async () => {
    await expect(
      processInlineRolls('[[1]]', {
        limits: resolveLimits({ maxOutputLength: 0 }),
        evaluate: async () => ({ value: 123 }),
      }),
    ).rejects.toMatchObject({ errors: [{ code: 'LIMIT_OUTPUT' }] });
  });

  it('ignores unclosed inline syntax', async () => {
    let calls = 0;
    const evaluate = async () => {
      calls += 1;
      return { value: 1 };
    };
    for (const text of ['[[1', '[[[[1', '[[1[abc]]']) {
      const output = await processInlineRolls(text, { evaluate });
      expect(output.text, text).toBe(text);
      expect(output.records, text).toEqual([]);
    }
    expect(calls).toBe(0);
  });

  it('cancels before and after evaluation', async () => {
    const before = new AbortController();
    before.abort();
    await expect(
      processInlineRolls('[[1]]', {
        signal: before.signal,
        evaluate: async () => ({ value: 1 }),
      }),
    ).rejects.toMatchObject({ errors: [{ code: 'CANCELLED' }] });

    const during = new AbortController();
    await expect(
      processInlineRolls('[[1]]', {
        signal: during.signal,
        evaluate: async () => {
          during.abort();
          return { value: 1 };
        },
      }),
    ).rejects.toMatchObject({ errors: [{ code: 'CANCELLED' }] });
  });

  it('replaces present references and leaves missing ones alone when allowed', () => {
    expect(replaceReferences('$[[0]] $[[1.computed]]', [], false)).toBe(
      '$[[0]] $[[1.computed]]',
    );

    const records: InlineRollRecord[] = [
      {
        index: 0,
        source: 'a',
        rawResult: 5,
        computedResult: undefined,
        warnings: [],
      },
      {
        index: 1,
        source: 'b',
        rawResult: 5,
        computedResult: 0,
        warnings: [],
      },
    ];
    expect(replaceReferences('$[[0]] $[[1.computed]]', records, true)).toBe(
      '5 0',
    );
  });

  it('fails on missing references when requested', () => {
    expect(() => replaceReferences('$[[3]]', [], true)).toThrow(RollFailure);
  });
});

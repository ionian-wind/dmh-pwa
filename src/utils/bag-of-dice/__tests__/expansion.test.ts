import { describe, expect, it } from 'vitest';
import { createRollEngine } from '../engine/engine';
import { createEmptyRepositories } from '../engine/repositories';
import { sequenceRng } from '../engine/rng';
import type {
  AttributeRepository,
  MacroRepository,
  Repositories,
  RollResult,
} from '../engine/contracts';

const engine = createRollEngine();

function macroRepository(
  entries: Record<
    string,
    { command: string; source: 'user' | 'pack' | 'import' | 'builtin' }
  >,
): MacroRepository {
  return {
    async get(name) {
      const found = entries[name.toLowerCase()];
      return found
        ? { name, command: found.command, source: found.source }
        : undefined;
    },
  };
}

async function rollWith(
  expression: string,
  repositories: Partial<Repositories>,
  draws = [0.5],
  extra: Record<string, unknown> = {},
): Promise<RollResult> {
  const outcome = await engine.roll(expression, {
    repositories: { ...createEmptyRepositories(), ...repositories },
    rng: sequenceRng(draws),
    ...extra,
  });
  if (outcome.status !== 'complete') {
    throw new Error(`expected complete, got ${outcome.status}`);
  }
  return outcome.result;
}

describe('macro expansion', () => {
  it('expands macros case-insensitively', async () => {
    const repositories = {
      macros: macroRepository({
        attack: { command: '1d20+3', source: 'user' },
      }),
    };
    const result = await rollWith('#ATTACK', repositories, [0.5]);
    expect(result.total).toBe(14);
    expect(result.process.expansions[0]).toMatchObject({
      kind: 'macro',
      name: 'ATTACK',
      value: '1d20+3',
      source: 'user',
    });
  });

  it('expands nested macros and detects cycles', async () => {
    const nested = macroRepository({
      a: { command: '#b', source: 'user' },
      b: { command: '2+3', source: 'user' },
    });
    expect((await rollWith('#a', { macros: nested })).total).toBe(5);

    const cyclic = macroRepository({
      a: { command: '#b', source: 'user' },
      b: { command: '#a', source: 'user' },
    });
    const outcome = await engine.roll('#a', {
      repositories: { ...createEmptyRepositories(), macros: cyclic },
      rng: sequenceRng([0.5]),
    });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') {
      expect(outcome.errors[0].code).toBe('EXPANSION_CYCLE');
    }
  });

  it('resolves macro precedence and warns about shadowing', async () => {
    const user = macroRepository({
      attack: { command: '10', source: 'user' },
    });
    const pack = macroRepository({
      attack: { command: '20', source: 'pack' },
    });
    const result = await rollWith('#attack', { macros: pack }, [0.5], {
      macroSource: [user, pack],
    });
    expect(result.total).toBe(10);
    expect(
      result.warnings.some((warning) => warning.code === 'macro-shadowed'),
    ).toBe(true);
  });

  it('downgrades missing macros with &{noerror}', async () => {
    const repositories = { macros: macroRepository({}) };
    const extraction = await engine.extract('&{noerror} #missing', {
      repositories: { ...createEmptyRepositories(), ...repositories },
    });
    expect(extraction.errors).toEqual([]);
    expect(extraction.expanded).toBe(' ');
    expect(
      extraction.warnings.some((warning) => warning.code === 'MISSING_DATA'),
    ).toBe(true);
  });
});

describe('abilities and attributes', () => {
  it('resolves abilities', async () => {
    const repositories = {
      abilities: {
        async get(character: string, ability: string) {
          return character === 'Alice' && ability === 'Fireball'
            ? { character, name: ability, command: '8d6' }
            : undefined;
        },
      },
    };
    const result = await rollWith(
      '%{Alice|Fireball}',
      repositories,
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    );
    expect(result.total).toBe(32);
  });

  it('passes repeating row options to the repository', async () => {
    const seen: Array<{ rowIndex?: number; rowId?: string }> = [];
    const attributes = {
      async get(
        _character: string,
        _attribute: string,
        options?: { rowIndex?: number; rowId?: string },
      ) {
        seen.push({
          ...(options?.rowIndex !== undefined
            ? { rowIndex: options.rowIndex }
            : {}),
          ...(options?.rowId ? { rowId: options.rowId } : {}),
        });
        return { value: 3 };
      },
    };
    expect(
      (await rollWith('@{selected|repeating_section_$0_field}', { attributes }))
        .total,
    ).toBe(3);
    expect(seen[0]).toEqual({ rowIndex: 0 });
  });

  it('resolves selected/target attributes without assuming a token model', async () => {
    const seen: Array<{ character: string; attribute: string; max?: boolean }> =
      [];
    const attributes: AttributeRepository = {
      async get(character, attribute, options) {
        seen.push({ character, attribute, max: options?.max });
        if (attribute === 'HP') {
          return { value: 12, max: 20 };
        }
        return { value: 15 };
      },
    };
    const repositories = { attributes };
    const selected = await rollWith('@{selected|HP}', repositories);
    expect(selected.total).toBe(12);
    const max = await rollWith('@{selected|HP|max}', repositories);
    expect(max.total).toBe(20);
    expect(seen[0]).toMatchObject({ character: 'selected', attribute: 'HP' });
    expect(seen[1]?.max).toBe(true);
    expect(await rollWith('@{target|AC}', repositories)).toMatchObject({
      total: 15,
    });
  });
});

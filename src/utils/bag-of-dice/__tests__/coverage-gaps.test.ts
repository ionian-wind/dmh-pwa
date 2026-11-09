import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  AstNode,
  DicePlugin,
  EvalContext,
  RollResult,
  RollSegment,
} from '../engine/contracts';
import {
  RollFailure,
  fail,
  isRollError,
  rollError,
  rollWarning,
  toRollError,
} from '../engine/errors';
import { collectSegments, evaluateAst } from '../engine/evaluator';
import {
  defineFixtures,
  fixtureByName,
  summarizeFixtures,
} from '../engine/fixtures';
import { resolveLimits } from '../engine/limits';
import {
  PluginRegistryError,
  assertPlugin,
  createPluginRegistry,
  registrationErrors,
} from '../engine/plugin-registry';
import { createArithmeticPlugin } from '../engine/plugins/arithmetic';
import { createDicePlugin } from '../engine/plugins/dice';
import {
  CompositeMacroRepository,
  createEmptyRepositories,
  createStaticRepositories,
} from '../engine/repositories';
import {
  captureRngState,
  finishRngState,
  restoreRngState,
  sequenceRng,
} from '../engine/rng';
import { createSnapshot, parseSnapshot } from '../engine/snapshot';
import { render2d, renderText, segmentText } from '../engine/text';
import {
  create2dVisualizer,
  create3dVisualizer,
  createTextVisualizer,
  type DiceBoxHost,
} from '../engine/visualize';

function result(overrides: Partial<RollResult> = {}): RollResult {
  return {
    schemaVersion: 1,
    total: 4,
    breakdown: {
      segments: [],
      groups: [],
      rawTotal: 4,
      finalTotal: 4,
    },
    process: {
      raw: '4',
      expanded: '4',
      passes: [],
      expansions: [],
      queries: [],
      inlineRolls: [],
      arithmetic: [],
      tables: [],
    },
    warnings: [],
    ...overrides,
  };
}

function context(): EvalContext {
  return {
    rng: sequenceRng([0.5]),
    cache: new Map(),
    limits: resolveLimits(),
    warnings: [],
    options: { repositories: createEmptyRepositories() },
    nextGroupId: () => 'g1',
    evaluate: () => {
      throw new Error('not initialized');
    },
  };
}

describe('error helper gaps', () => {
  it('recognizes roll errors and wraps failures', () => {
    expect(isRollError(rollError('INTERNAL', 'boom'))).toBe(true);
    expect(isRollError({ code: 'X' })).toBe(false);
    expect(isRollError(null)).toBe(false);
    const failure = new RollFailure([rollError('INTERNAL', 'boom')]);
    expect(toRollError(failure).message).toBe('boom');
    expect(() => fail('INTERNAL', 'nope')).toThrow(RollFailure);
    expect(rollError('INTERNAL', 'caused', { cause: 'x' }).cause).toBe('x');
    expect(rollWarning('X', 'warning').pass).toBe('unknown');
  });
});

describe('evaluator gap coverage', () => {
  it('wraps plugin exceptions and supports nested evaluation', () => {
    const throwing: DicePlugin = {
      name: 'throwing',
      tokens: [],
      evaluate() {
        throw new Error('plugin boom');
      },
    };
    const ast: AstNode = {
      type: 'X',
      plugin: 'throwing',
      span: { start: 0, end: 1 },
    };
    expect(() =>
      evaluateAst(ast, {
        rng: sequenceRng([0.5]),
        options: { repositories: createEmptyRepositories() },
        plugins: [throwing],
      }),
    ).toThrow('plugin boom');

    const output = evaluateAst(
      {
        type: 'NumberLiteral',
        value: 1,
        plugin: 'arithmetic',
        span: { start: 0, end: 1 },
      } as AstNode,
      {
        rng: sequenceRng([0.5]),
        options: { repositories: createEmptyRepositories() },
        plugins: [createArithmeticPlugin()],
      },
    );
    expect(() => output.context.evaluateText?.('1 +')).toThrow();
    expect(collectSegments({ value: 1, records: [], segments: [] })).toEqual(
      [],
    );
  });
});

describe('fixture gap coverage', () => {
  it('rejects empty and unknown fixture names', () => {
    expect(() => defineFixtures([{ name: ' ', expression: '1' }])).toThrow(
      /must not be empty/,
    );
    expect(() => fixtureByName([{ name: 'a', expression: '1' }], 'b')).toThrow(
      /unknown fixture/,
    );
    expect(
      summarizeFixtures([
        { name: 'a', expression: '1' },
        { name: 'b', expression: '2', error: 'PARSE' },
      ]),
    ).toEqual({ total: 2, positives: 1, negatives: 1 });
  });
});

describe('plugin registry gap coverage', () => {
  it('validates plugins and CST rule conflicts', () => {
    expect(() =>
      createPluginRegistry([{ name: ' ', tokens: [], evaluate: () => null }]),
    ).toThrow(PluginRegistryError);

    const first: DicePlugin = {
      name: 'first',
      tokens: [],
      cstToAst: {
        Shared: () => ({
          type: 'X',
          plugin: 'first',
          span: { start: 0, end: 0 },
        }),
      },
      evaluate: () => null,
    };
    const second: DicePlugin = {
      name: 'second',
      tokens: [],
      cstToAst: {
        Shared: () => ({
          type: 'X',
          plugin: 'second',
          span: { start: 0, end: 0 },
        }),
      },
      evaluate: () => null,
    };
    expect(() => createPluginRegistry([first, second])).toThrow(/CST rule/);
  });

  it('parses and dispatches through plugins', () => {
    const preferred: DicePlugin = {
      name: 'preferred',
      tokens: [],
      evaluate: (node) =>
        node.type === 'X' ? { value: 2, records: [], segments: [] } : null,
    };
    const fallback: DicePlugin = {
      name: 'fallback',
      tokens: [],
      evaluate: (node) =>
        node.type === 'X' ? { value: 1, records: [], segments: [] } : null,
    };
    const registry = createPluginRegistry([preferred, fallback]);
    expect(registry.parse('1+1').errors).toEqual([]);
    expect(registry.tokens.NumberLiteral).toBeDefined();
    expect(registry.cstRules.size).toBe(0);

    expect(
      registry.evaluate(
        { type: 'X', plugin: 'fallback', span: { start: 0, end: 1 } },
        context(),
      ).value,
    ).toBe(1);
    expect(
      registry.evaluate(
        { type: 'X', plugin: 'missing', span: { start: 0, end: 1 } },
        context(),
      ).value,
    ).toBe(2);
    expect(() =>
      registry.evaluate(
        { type: 'Y', plugin: 'preferred', span: { start: 0, end: 1 } },
        context(),
      ),
    ).toThrow(/no plugin handled/);
  });

  it('asserts plugins and reports registration errors', () => {
    expect(() =>
      assertPlugin({ name: '', tokens: [], evaluate: () => null }),
    ).toThrow();
    expect(() =>
      assertPlugin({
        name: 'x',
        tokens: undefined as never,
        evaluate: () => null,
      }),
    ).toThrow(/token array/);
    expect(() =>
      assertPlugin({ name: 'x', tokens: [], evaluate: undefined as never }),
    ).toThrow(/evaluate/);

    const errors = registrationErrors({
      name: 'x',
      tokens: [{} as never],
      evaluate: undefined as never,
    });
    expect(errors.length).toBeGreaterThanOrEqual(2);
    expect(
      registrationErrors({ name: 'x', tokens: [], evaluate: () => null }),
    ).toEqual([]);
  });
});

describe('repository gap coverage', () => {
  it('returns undefined from empty repositories', async () => {
    const repositories = createEmptyRepositories();
    expect(await repositories.abilities.get('a', 'b')).toBeUndefined();
    expect(await repositories.attributes.get('a', 'b')).toBeUndefined();
    expect(await repositories.macros.get('a')).toBeUndefined();
    expect(await repositories.tables?.get('a')).toBeUndefined();
  });

  it('handles missing maps, tables and composite misses', async () => {
    const repositories = createStaticRepositories({});
    expect(await repositories.macros.get('missing')).toBeUndefined();
    expect(await repositories.abilities.get('a', 'b')).toBeUndefined();
    expect(await repositories.attributes.get('a', 'b')).toBeUndefined();

    const composite = new CompositeMacroRepository([
      {
        async get() {
          return undefined;
        },
      },
    ]);
    expect(await composite.get('missing')).toBeUndefined();
    expect(await composite.resolve('missing')).toEqual({ shadowed: [] });
  });
});

describe('rng gap coverage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('validates sequence construction and snapshots', () => {
    expect(() => sequenceRng([])).toThrow(/at least one value/);
    const rng = sequenceRng([0.25]);
    expect(rng.remaining()).toBe(1);
    expect(() => rng.restore(null)).toThrow(/invalid/);
    expect(() => rng.restore({ index: -1 })).toThrow(/invalid/);
    expect(() => restoreRngState({ next: () => 0.5 }, {})).toThrow(
      /does not support/,
    );
  });

  it('handles RNGs without snapshots and missing crypto', () => {
    const plain = { next: () => 0.5 };
    expect(captureRngState(plain)).toEqual({});
    expect(finishRngState(plain, { rngStateBefore: 1 })).toEqual({
      rngStateBefore: 1,
    });
  });
});

describe('snapshot gap coverage', () => {
  it('rejects malformed and incompatible snapshots', () => {
    expect(parseSnapshot('{')).toEqual({ ok: false, reason: 'invalid-json' });
    expect(parseSnapshot(null)).toEqual({ ok: false, reason: 'incompatible' });
    expect(parseSnapshot({ schemaVersion: 1 })).toEqual({
      ok: false,
      reason: 'incompatible',
    });
  });

  it('falls back when structured cloning is unavailable', () => {
    const original = globalThis.structuredClone;
    vi.stubGlobal('structuredClone', () => {
      throw new Error('nope');
    });
    const snapshot = createSnapshot({
      ...result(),
      replay: { seed: 'x', rngStateBefore: () => 1 },
    } as RollResult);
    expect(snapshot.replay?.seed).toBe('x');
    vi.stubGlobal('structuredClone', original);
  });
});

describe('text and visualizer gap coverage', () => {
  const segments: RollSegment[] = [
    { kind: 'dice', text: '2d6', groupIds: ['g1'], result: 7 },
    { kind: 'modifier', text: 'kh1' },
    { kind: 'math', text: '7' },
    { kind: 'label', text: 'fire' },
    { kind: 'table', text: 'loot: gold', table: 'loot', result: 1 },
    { kind: 'text', text: 'tail' },
    { kind: 'unknown' as never, text: 'ignored' },
  ];

  it('renders every segment kind and 2D metadata', () => {
    expect(segments.map(segmentText)).toEqual([
      '2d6',
      'kh1',
      '7',
      '[fire]',
      'loot: gold',
      'tail',
      '',
    ]);
    const roll = result({
      total: 3.5,
      breakdown: {
        segments,
        groups: [
          {
            id: 'g1',
            kind: 'dice',
            dice: [
              { groupId: 'g1', sides: 6, value: 4, kept: true, dropped: false },
              { groupId: 'g1', sides: 6, value: 2, kept: false, dropped: true },
            ],
            total: 4,
            modifiers: [],
            labels: ['fire'],
          },
        ],
        rawTotal: 6,
        finalTotal: 3.5,
      },
    });
    expect(renderText(roll)).toContain('3.5');
    expect(render2d(roll)[0]).toContain('(fire)');
    expect(render2d(roll)[0]).toContain('~~2~~');
  });

  it('handles visualizer fallbacks and empty groups', async () => {
    const text = createTextVisualizer();
    expect(text.canRender(result())).toBe(true);
    await text.render(result(), { element: null });
    text.dispose();

    const twoD = create2dVisualizer();
    expect(twoD.canRender(result())).toBe(false);
    await twoD.render(result(), { element: null });
    twoD.dispose();

    const threeD = create3dVisualizer();
    expect(threeD.canRender(result())).toBe(false);
    const calls: Array<number[]> = [];
    await threeD.render(
      result({
        breakdown: {
          segments: [],
          groups: [
            {
              id: 'table',
              kind: 'table',
              dice: [],
              total: 0,
              modifiers: [],
            },
            {
              id: 'empty',
              kind: 'dice',
              dice: [],
              total: 0,
              modifiers: [],
            },
          ],
          rawTotal: 0,
          finalTotal: 0,
        },
      }),
      {
        element: {},
        rollRecorded: async (_notation: string, values: number[]) => {
          calls.push(values);
        },
      } as DiceBoxHost,
    );
    expect(calls).toEqual([]);
    threeD.dispose();
  });
});

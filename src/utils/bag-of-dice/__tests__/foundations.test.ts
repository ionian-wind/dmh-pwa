import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMITS, resolveLimits } from '../engine/limits';
import {
  rollError,
  rollWarning,
  RollFailure,
  toRollErrors,
} from '../engine/errors';
import { cryptoRng, nextRandom, rollDie, sequenceRng } from '../engine/rng';
import {
  defineFixtures,
  fixtureByName,
  summarizeFixtures,
} from '../engine/fixtures';
import { createStaticRepositories } from '../engine/repositories';

describe('limit defaults', () => {
  it('exposes the documented defaults', () => {
    expect(DEFAULT_LIMITS).toMatchObject({
      maxExpansionDepth: 99,
      maxQueryDepth: 99,
      maxInlineDepth: 99,
      maxExplosionRolls: 99,
      maxTableDepth: 16,
      maxOutputLength: 256 * 1024,
      maxPassTimeMs: 1000,
      maxParserRecovery: 10,
    });
  });

  it('merges overrides and rejects invalid values', () => {
    const limits = resolveLimits({
      maxExpansionDepth: 5,
      maxExplosionRolls: Number.NaN,
      maxParserRecovery: -2,
    });
    expect(limits.maxExpansionDepth).toBe(5);
    expect(limits.maxExplosionRolls).toBe(DEFAULT_LIMITS.maxExplosionRolls);
    expect(limits.maxParserRecovery).toBe(DEFAULT_LIMITS.maxParserRecovery);
  });
});

describe('error helpers', () => {
  it('builds typed errors with localization parameters', () => {
    const error = rollError('PARSE_UNKNOWN_TOKEN', 'bad token', {
      pass: 'parse',
      plugin: 'lexer',
      span: { start: 1, end: 2 },
      params: { token: '?' },
    });
    expect(error).toMatchObject({
      code: 'PARSE_UNKNOWN_TOKEN',
      pass: 'parse',
      plugin: 'lexer',
      span: { start: 1, end: 2 },
      params: { token: '?' },
    });
    expect(error.message).not.toMatch(/[À-ÿ]/);
  });

  it('builds warnings without a cause field', () => {
    const warning = rollWarning('macro-shadowed', 'shadowed', {
      pass: 'expand',
    });
    expect(warning).toMatchObject({ code: 'macro-shadowed', pass: 'expand' });
    expect('cause' in warning).toBe(false);
  });

  it('unwraps RollFailure and wraps unknown errors', () => {
    const failure = new RollFailure(
      rollError('MISSING_DATA', 'missing', { pass: 'expand' }),
    );
    expect(toRollErrors(failure)[0].code).toBe('MISSING_DATA');
    expect(toRollErrors(new Error('boom'))[0].code).toBe('INTERNAL');
  });
});

describe('deterministic RNG', () => {
  it('replays a sequence and snapshots state', () => {
    const rng = sequenceRng([0, 0.5, 0.999]);
    expect(rollDie(rng, 6)).toBe(1);
    expect(rollDie(rng, 6)).toBe(4);
    const state = rng.snapshot();
    expect(rollDie(rng, 6)).toBe(6);
    rng.restore(state);
    expect(rollDie(rng, 6)).toBe(6);
    expect(rng.draws).toBe(3);
  });

  it('validates draws outside [0,1)', () => {
    expect(() => nextRandom(sequenceRng([1]))).toThrow(RollFailure);
    expect(() => nextRandom(sequenceRng([Number.NaN]))).toThrow(RollFailure);
    const bad = { next: () => -0.1 };
    expect(() => nextRandom(bad)).toThrow(/outside/);
  });

  it('produces values in range with crypto', () => {
    const rng = cryptoRng();
    for (let index = 0; index < 20; index += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('fixtures', () => {
  const fixtures = defineFixtures([
    { name: 'math', expression: '1+1', total: 2 },
    { name: 'dice', expression: '1d6' },
  ]);

  it('loads fixtures by name and summarizes them', () => {
    expect(fixtureByName(fixtures, 'math').total).toBe(2);
    expect(summarizeFixtures(fixtures)).toEqual({
      total: 2,
      positives: 2,
      negatives: 0,
    });
  });

  it('rejects duplicate fixture names', () => {
    expect(() =>
      defineFixtures([
        { name: 'dup', expression: '1' },
        { name: 'dup', expression: '2' },
      ]),
    ).toThrow(/duplicate/);
  });
});

describe('repositories', () => {
  it('looks up data case-insensitively', async () => {
    const repositories = createStaticRepositories({
      macros: { Attack: '1d20+3' },
      abilities: { 'Alice|Fireball': '8d6' },
      attributes: { 'Alice|HP': 12 },
    });
    expect(await repositories.macros.get('attack')).toMatchObject({
      command: '1d20+3',
    });
    expect(await repositories.abilities.get('alice', 'fireball')).toMatchObject(
      { command: '8d6' },
    );
    expect(await repositories.attributes.get('ALICE', 'hp')).toEqual({
      value: 12,
    });
  });
});

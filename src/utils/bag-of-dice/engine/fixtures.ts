/**
 * Tiny fixture helpers shared by the engine's golden tests. Fixtures are plain
 * data so they can be imported from JSON or TypeScript without a filesystem
 * dependency in browser builds.
 */

export interface ExpressionFixture {
  /** Unique, human-readable fixture name. */
  name: string;
  /** Roll expression under test. */
  expression: string;
  /** Optional query answers needed before evaluation. */
  queryAnswers?: Record<string, string>;
  /** Expected final total. */
  total?: number;
  /** Expected number of dice groups. */
  groups?: number;
  /** Expected dialect/error code for negative fixtures. */
  error?: string;
  /** Free-form expectation used by individual suites. */
  notes?: string;
}

export function defineFixtures<T extends { name: string }>(
  fixtures: readonly T[],
): readonly T[] {
  const seen = new Set<string>();
  for (const fixture of fixtures) {
    if (!fixture.name.trim()) {
      throw new Error('fixture name must not be empty');
    }
    if (seen.has(fixture.name)) {
      throw new Error(`duplicate fixture name: ${fixture.name}`);
    }
    seen.add(fixture.name);
  }
  return fixtures;
}

export function fixtureByName<T extends { name: string }>(
  fixtures: readonly T[],
  name: string,
): T {
  const fixture = fixtures.find((candidate) => candidate.name === name);
  if (!fixture) {
    throw new Error(`unknown fixture: ${name}`);
  }
  return fixture;
}

export function summarizeFixtures(fixtures: readonly ExpressionFixture[]): {
  total: number;
  positives: number;
  negatives: number;
} {
  return {
    total: fixtures.length,
    positives: fixtures.filter((fixture) => !fixture.error).length,
    negatives: fixtures.filter((fixture) => Boolean(fixture.error)).length,
  };
}

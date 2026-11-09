import { describe, expect, it } from 'vitest';
import { createRollEngine } from '../engine/engine';
import { createEmptyRepositories } from '../engine/repositories';
import { sequenceRng } from '../engine/rng';
import {
  createSnapshot,
  parseSnapshot,
  renderSnapshotFallback,
  serializeSnapshot,
} from '../engine/snapshot';
import { render2d, renderText } from '../engine/text';
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

describe('process metadata', () => {
  it('records every pass and roll record kind', async () => {
    const result = await roll('2d6!kh1[fire]', [0.9, 0.5, 0.1]);
    expect(result.schemaVersion).toBe(1);
    expect(result.process.passes.map((pass) => pass.name)).toEqual([
      'expand',
      'queries',
      'inline',
      'parse',
      'evaluate',
    ]);
    expect(result.process.expansions).toEqual([]);
    expect(result.process.queries).toEqual([]);
    expect(result.process.inlineRolls).toEqual([]);
    expect(result.process.arithmetic.length).toBeGreaterThan(0);
    expect(result.breakdown.groups[0].modifierOrder).toEqual(['!', 'kh']);
    expect(result.breakdown.groups[0].dice.some((die) => die.exploded)).toBe(
      true,
    );
    expect(result.breakdown.groups[0].dice.some((die) => die.dropped)).toBe(
      true,
    );
  });

  it('keeps inline roll groups in the final breakdown', async () => {
    const result = await roll('[[1d6[inline]]] + 2', [0.5]);
    expect(result.breakdown.groups[0].labels).toEqual(['inline']);
    expect(result.process.inlineRolls[0].groups).toHaveLength(1);
  });
});

describe('snapshots', () => {
  it('round-trips through the persistable form', async () => {
    const result = await roll('2d6+3', [0.5, 0.5]);
    const snapshot = createSnapshot(result, 123);
    const serialized = serializeSnapshot(snapshot);
    const parsed = parseSnapshot(serialized);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.snapshot.total).toBe(result.total);
      expect(parsed.snapshot.createdAt).toBe(123);
      expect(parsed.snapshot.process.raw).toBe('2d6+3');
    }
  });

  it('rejects unknown schema versions with a fallback', () => {
    const parsed = parseSnapshot({ schemaVersion: 99, total: 1 });
    expect(parsed).toEqual({ ok: false, reason: 'unknown-version' });
    expect(renderSnapshotFallback()).toMatch(/newer version/);
  });

  it('renders from a snapshot without re-rolling', async () => {
    const result = await roll('3d6kh1', [0.1, 0.9, 0.5]);
    const snapshot = createSnapshot(result);
    const text = renderText(snapshot);
    expect(text).toContain(String(snapshot.total));
    expect(render2d(snapshot)[0]).toContain('[~~1~~, 6, ~~4~~]');
  });
});

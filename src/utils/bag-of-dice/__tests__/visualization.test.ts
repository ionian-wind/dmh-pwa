import { describe, expect, it } from 'vitest';
import { createRollEngine } from '../engine/engine';
import { createEmptyRepositories } from '../engine/repositories';
import { sequenceRng } from '../engine/rng';
import {
  create2dVisualizer,
  create3dVisualizer,
  createTextVisualizer,
  type DiceBoxHost,
} from '../engine/visualize';
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

describe('visualization adapters', () => {
  it('renders accessible text and 2D breakdowns', async () => {
    const result = await roll('2d6+1', [0.5, 0.5]);
    const element = { textContent: '' };
    await createTextVisualizer().render(result, { element });
    expect(element.textContent).toContain('= 9');

    const twoD = { textContent: '' };
    await create2dVisualizer().render(result, { element: twoD });
    expect(twoD.textContent).toContain('g1');
    expect(twoD.textContent).toContain('8');
  });

  it('animates recorded values without consuming RNG', async () => {
    const result = await roll('3d6', [0.1, 0.5, 0.9]);
    const calls: Array<{ notation: string; values: number[] }> = [];
    const host: DiceBoxHost = {
      element: {},
      rollRecorded: async (notation, values) => {
        calls.push({ notation, values });
      },
    };
    await create3dVisualizer().render(result, host);
    expect(calls).toHaveLength(1);
    expect(calls[0].values).toEqual([1, 4, 6]);
  });

  it('falls back without calling the 3D host when disabled', async () => {
    const result = await roll('2d6', [0.5, 0.5]);
    let called = false;
    const host: DiceBoxHost = {
      element: {},
      reducedMotion: true,
      rollRecorded: async () => {
        called = true;
      },
    };
    await create3dVisualizer().render(result, host);
    expect(called).toBe(false);

    const noWebgl: DiceBoxHost = {
      element: {},
      webglAvailable: false,
      rollRecorded: async () => {
        called = true;
      },
    };
    await create3dVisualizer().render(result, noWebgl);
    expect(called).toBe(false);
  });

  it('does not mutate the result', async () => {
    const result = await roll('2d6', [0.5, 0.5]);
    const before = JSON.stringify(result);
    const host: DiceBoxHost = {
      element: {},
      rollRecorded: async () => undefined,
    };
    await create3dVisualizer().render(result, host);
    expect(JSON.stringify(result)).toBe(before);
  });
});

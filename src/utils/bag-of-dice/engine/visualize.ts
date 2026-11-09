import type { RollResult, RollVisualizer, VisualizerHost } from './contracts';
import { render2d, renderText } from './text';

export interface TextHost extends Omit<VisualizerHost, 'element'> {
  element?: { textContent?: string } | null;
}

export function createTextVisualizer(): RollVisualizer {
  return {
    canRender: () => true,
    async render(result, host) {
      const target = (host as TextHost).element;
      if (target) target.textContent = renderText(result);
    },
    dispose() {
      /* no resources */
    },
  };
}

export function create2dVisualizer(): RollVisualizer {
  return {
    canRender: (result) => result.breakdown.groups.length > 0,
    async render(result, host) {
      const target = (host as TextHost).element;
      if (target) target.textContent = render2d(result).join('\n');
    },
    dispose() {
      /* no resources */
    },
  };
}

/**
 * Host hook for `@3d-dice/dice-box`. The adapter only animates recorded values;
 * it never asks the dice-box to choose results.
 */
export interface DiceBoxHost extends VisualizerHost {
  rollRecorded?: (notation: string, values: number[]) => Promise<void>;
}

export function create3dVisualizer(): RollVisualizer {
  return {
    canRender: (result) =>
      result.breakdown.groups.some(
        (group) =>
          group.kind === 'dice' ||
          group.kind === 'fudge' ||
          group.kind === 'custom',
      ),
    async render(result, host) {
      const target = host as DiceBoxHost;
      if (
        host.reducedMotion ||
        host.webglAvailable === false ||
        typeof target.rollRecorded !== 'function'
      ) {
        return;
      }
      for (const group of result.breakdown.groups) {
        if (
          group.kind !== 'dice' &&
          group.kind !== 'fudge' &&
          group.kind !== 'custom'
        ) {
          continue;
        }
        const values = group.dice.map((die) => die.value);
        if (values.length === 0) continue;
        await target.rollRecorded(`${values.length}d6`, values);
      }
    },
    dispose() {
      /* host owns the dice-box instance */
    },
  };
}

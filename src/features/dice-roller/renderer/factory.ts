import type { DiceRenderer } from './DiceRenderer';
import { supportsWebGL } from './DiceRenderer';
import { DiceBoxRenderer } from './DiceBoxRenderer';
import { ThreeDiceRenderer } from './ThreeDiceRenderer';

export { supportsWebGL };

export interface RendererFactoryOptions {
  /** Force a renderer, primarily for tests and debugging. */
  kind?: 'three' | 'dicebox';
}

/**
 * Feature-gated factory. The whole `src/features/dice-roller` tree is only
 * loaded when `VITE_FEATURE_DICE_ROLLER` is enabled.
 */
export function createDiceRenderer(
  options: RendererFactoryOptions = {},
): DiceRenderer {
  const kind = options.kind ?? (supportsWebGL() ? 'three' : 'dicebox');
  return kind === 'three' ? new ThreeDiceRenderer() : new DiceBoxRenderer();
}

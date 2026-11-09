/**
 * Shared renderer contract.
 *
 * The tray renderer runs natural physics and reports the face that lands up.
 * `value` is only a hint for reduced-motion/static rendering and fallbacks; the
 * settled result is returned by `getResults()`.
 */

export type DieKind =
  'd2' | 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export interface DiceVisual {
  /** Stable id used for scene/physics bookkeeping. */
  id: string;
  /** Dice sides from the engine result. */
  sides: number;
  /** Optional value hint for reduced motion/static rendering. */
  value?: number;
  /** Optional notation for adapters that only understand notation. */
  notation?: string;
  /** Optional display label, never interpreted by the renderer. */
  label?: string;
}

export interface DiceResult {
  /** Id of the visual the result belongs to. */
  id: string;
  sides: number;
  /** Value read from the die after physics settled. */
  value: number;
}

export interface DiceRendererOptions {
  /** Public asset root, for example `/dmh-pwa/assets/dice-box/`. */
  assetPath: string;
  /** Theme directory name. Defaults to `default-extras`. */
  theme?: string;
  /** Skip tumbling and place dice on their target faces. */
  reducedMotion?: boolean;
  /** Hard cap on simultaneously rendered dice. */
  maxDice?: number;
  /** Pixel ratio cap; defaults to 2. */
  maxPixelRatio?: number;
}

export interface DiceRenderer {
  readonly kind: 'three' | 'dicebox' | 'none';
  init(container: HTMLElement, options: DiceRendererOptions): Promise<void>;
  add(dice: readonly DiceVisual[]): void;
  replace(dice: readonly DiceVisual[]): void;
  clear(): void;
  /** Results of the last settled throw, read from the visible top faces. */
  getResults(): DiceResult[];
  resize(width: number, height: number): void;
  dispose(): void;
}

export function notationForVisual(visual: DiceVisual): string {
  return visual.notation ?? `1d${visual.sides}`;
}

/** True when a WebGL context can be created in this environment. */
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (context && 'getExtension' in context) {
      (context as WebGLRenderingContext)
        .getExtension('WEBGL_lose_context')
        ?.loseContext();
    }
    return Boolean(context);
  } catch {
    return false;
  }
}

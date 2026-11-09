import DiceBox from '@3d-dice/dice-box';
import type {
  DiceRenderer,
  DiceRendererOptions,
  DiceResult,
  DiceVisual,
} from './DiceRenderer';
import { notationForVisual } from './DiceRenderer';

interface DiceBoxLike {
  init: () => Promise<void>;
  add: (notation: string) => void;
  clear: () => void;
}

/**
 * Temporary adapter around `@3d-dice/dice-box`.
 *
 * DiceBox chooses its own faces; this adapter cannot force engine values. It is
 * only a fallback for browsers without WebGL and is removed once the
 * Three/Rapier renderer reaches parity.
 */
export class DiceBoxRenderer implements DiceRenderer {
  readonly kind = 'dicebox' as const;
  private box: DiceBoxLike | null = null;
  private container: HTMLElement | null = null;

  async init(
    container: HTMLElement,
    options: DiceRendererOptions,
  ): Promise<void> {
    this.container = container;
    if (!container.id) container.id = `dice-roller-surface-${Date.now()}`;
    const theme = options.theme ?? 'default-extras';
    const box = new DiceBox({
      container: `#${container.id}`,
      assetPath: options.assetPath,
      theme,
      preloadThemes: [theme],
      offscreen: false,
    }) as unknown as DiceBoxLike;
    await box.init();
    this.box = box;
  }

  add(dice: readonly DiceVisual[]): void {
    if (!this.box) return;
    for (const visual of dice) {
      const notation =
        visual.sides === 100 ? '2d10' : notationForVisual(visual);
      this.box.add(notation);
    }
  }

  replace(dice: readonly DiceVisual[]): void {
    this.clear();
    this.add(dice);
  }

  clear(): void {
    this.box?.clear();
  }

  getResults(): DiceResult[] {
    // DiceBox owns its physics/result callback; the temporary fallback does
    // not expose those values through this adapter yet.
    return [];
  }

  pick(): DiceResult | null {
    return null;
  }

  beginDrag(): boolean {
    return false;
  }

  dragTo(): void {}

  endDrag(): void {}

  resize(): void {
    // DiceBox stops rendering after dice settle; resizing would clear the
    // settled scene. The Three renderer owns real resize handling.
  }

  dispose(): void {
    this.box?.clear();
    this.box = null;
    this.container = null;
  }
}

export class NoopDiceRenderer implements DiceRenderer {
  readonly kind = 'none' as const;
  async init(): Promise<void> {}
  add(): void {}
  replace(): void {}
  clear(): void {}
  getResults(): DiceResult[] {
    return [];
  }
  pick(): DiceResult | null {
    return null;
  }
  beginDrag(): boolean {
    return false;
  }
  dragTo(): void {}
  endDrag(): void {}
  resize(): void {}
  dispose(): void {}
}

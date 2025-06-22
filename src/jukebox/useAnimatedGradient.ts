import { computed, Ref } from 'vue';

/**
 * useAnimatedGradient composable
 * @param enabled - Ref or getter for whether the animation is enabled
 * @param paletteGetter - Function returning an array of color strings (or undefined)
 * @returns Computed style object with --custom-gradient
 */
export function useAnimatedGradient(
  enabled: Ref<boolean> | (() => boolean),
  paletteGetter?: () => string[] | undefined
) {
  return computed(() => {
    const isEnabled = typeof enabled === 'function' ? enabled() : enabled.value;
    const palette = paletteGetter ? paletteGetter() : undefined;
    if (!isEnabled) return {};

    let gradient = '';
    if (palette && palette.length > 0) {
      // Use palette for gradient
      const colors = palette.map(color => `${color}73`); // add alpha
      const stops = colors.map((color, i) => {
        const pct = (i / (colors.length - 1)) * 100;
        return `${color} ${pct}%`;
      }).join(', ');
      gradient = `linear-gradient(45deg, ${stops})`;
    } else {
      // Default gradient (from JukeboxPlayer)
      gradient = `linear-gradient(45deg,
        rgba(79, 70, 229, 0.15) 0%,
        rgba(147, 51, 234, 0.15) 25%,
        rgba(236, 72, 153, 0.15) 50%,
        rgba(59, 130, 246, 0.15) 75%,
        rgba(34, 197, 94, 0.15) 100%
      )`;
    }
    return { '--custom-gradient': gradient };
  });
} 
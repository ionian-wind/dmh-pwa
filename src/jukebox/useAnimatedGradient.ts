import { computed, Ref } from 'vue';

type Rgb = [r: number, g: number, b: number];

const parseHexColor = (color: string): Rgb | null => {
  const hex = color.trim().replace(/^#/, '');
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;

  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((part) => part + part)
          .join('')
      : hex;

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

const relativeLuminance = ([r, g, b]: Rgb): number => {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrastRatio = (first: number, second: number): number => {
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Picks a dark or light control colour with the best worst-case contrast
 * against every colour in the animated gradient palette.
 */
export function getGradientContrastColor(palette?: string[]): string {
  const colors = (palette ?? [])
    .map(parseHexColor)
    .filter((color): color is Rgb => color !== null);

  if (colors.length === 0) return '#111827';

  const candidates = ['#111827', '#ffffff'];
  const scores = candidates.map((candidate) => {
    const luminance = relativeLuminance(parseHexColor(candidate) as Rgb);
    return Math.min(
      ...colors.map((color) =>
        contrastRatio(luminance, relativeLuminance(color)),
      ),
    );
  });

  return scores[0] >= scores[1] ? candidates[0] : candidates[1];
}

/**
 * useAnimatedGradient composable
 * @param enabled - Ref or getter for whether the animation is enabled
 * @param paletteGetter - Function returning an array of color strings (or undefined)
 * @returns Computed style object with --custom-gradient
 */
export function useAnimatedGradient(
  enabled: Ref<boolean> | (() => boolean),
  paletteGetter?: () => string[] | undefined,
) {
  return computed(() => {
    const isEnabled = typeof enabled === 'function' ? enabled() : enabled.value;
    const palette = paletteGetter ? paletteGetter() : undefined;
    if (!isEnabled) return {};

    let gradient = '';
    if (palette && palette.length > 0) {
      // Use palette for gradient
      const withAlpha = (color: string, alpha = 'a6') => {
        if (/^#[0-9a-f]{6}$/i.test(color)) return `${color}${alpha}`;
        if (/^#[0-9a-f]{3}$/i.test(color)) {
          const expanded = color
            .slice(1)
            .split('')
            .map((part) => part + part)
            .join('');
          return `#${expanded}${alpha}`;
        }
        return color;
      };
      const colors = palette.map((color) => withAlpha(color));
      const positions = [
        [15, 28],
        [85, 22],
        [32, 72],
        [78, 68],
        [50, 50],
        [65, 35],
      ];

      // Layered radial blobs create a fluid "morph" surface; the CSS animation
      // moves and rescales the background to make the blobs flow into one
      // another instead of sweeping a single linear gradient.
      const blobs = colors.map(
        (color, index) =>
          `radial-gradient(circle at ${positions[index % positions.length][0]}% ${
            positions[index % positions.length][1]
          }%, ${color} 0%, transparent 55%)`,
      );
      gradient = `${blobs.join(', ')}, linear-gradient(120deg, ${withAlpha(
        palette[0],
        '40',
      )} 0%, ${withAlpha(palette[palette.length - 1], '40')} 100%)`;
    } else {
      // Default gradient (from JukeboxPlayer)
      gradient = `radial-gradient(circle at 18% 26%, rgba(79, 70, 229, 0.45) 0%, transparent 62%),
        radial-gradient(circle at 82% 20%, rgba(147, 51, 234, 0.4) 0%, transparent 60%),
        radial-gradient(circle at 26% 82%, rgba(236, 72, 153, 0.35) 0%, transparent 62%),
        radial-gradient(circle at 78% 76%, rgba(59, 130, 246, 0.35) 0%, transparent 60%),
        linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%)`;
    }
    return { '--custom-gradient': gradient };
  });
}

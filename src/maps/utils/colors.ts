export type RgbColor = [number, number, number];

export function parseHexColor(color: string): RgbColor | null {
  const value = color.trim().replace(/^#/, '');
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return null;
  const full =
    value.length === 3
      ? value
          .split('')
          .map((part) => part + part)
          .join('')
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export function contrastTextColor(color: string): string {
  const rgb = parseHexColor(color);
  if (!rgb) return '#111827';
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
}

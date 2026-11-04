import { icon as fontAwesomeIcon } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { RPG_ICON_PATHS } from './rpgIconPaths';

const MARKER_HEIGHT = 32;
const MARKER_WIDTH = 23;
const ICON_CENTER_X = 11.5;
const ICON_CENTER_Y = 10;
const ICON_BOX_WIDTH = 11;
const ICON_BOX_HEIGHT = 9;
const RPG_UNITS_PER_EM = 1024;
const RPG_ASCENT = 960;
const RPG_DESCENT = -64;

const PIN_PATH =
  'M22 11c0 1.42-.226 2.585-.677 3.496l-7.465 15.117c-.218.43-.543.77-.974 1.016-.43.246-.892.37-1.384.37-.492 0-.954-.124-1.384-.37-.43-.248-.75-.587-.954-1.017L1.677 14.496C1.227 13.586 1 12.42 1 11c0-2.76 1.025-5.117 3.076-7.07C6.126 1.977 8.602 1 11.5 1c2.898 0 5.373.977 7.424 2.93C20.974 5.883 22 8.24 22 11z';

export interface MapMarkerSvgOptions {
  height?: number;
  fill?: string;
  stroke?: string;
  iconColor?: string;
  iconTransform?: string;
}

interface MarkerGlyph {
  width: number;
  height: number;
  path: string;
  fontBased: boolean;
}

const markerCache = new Map<string, string>();

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function kebabToPascal(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join('');
}

function resolveFontAwesome(name: string): MarkerGlyph | null {
  const iconName = name.replace(/^fa-/, '');
  const definition =
    (fas as Record<string, unknown>)[`fa${kebabToPascal(iconName)}`] ??
    (fas as Record<string, unknown>)[iconName];
  if (!definition) return null;

  const resolved = fontAwesomeIcon(definition as never);
  const [width, height, , , rawPath] = resolved.icon;
  const path = Array.isArray(rawPath) ? rawPath.join(' ') : rawPath;
  if (!path) return null;
  return { width, height, path, fontBased: false };
}

function resolveRpg(name: string): MarkerGlyph | null {
  const iconName = name.replace(/^ra-/, '');
  const definition = RPG_ICON_PATHS[iconName];
  if (!definition) return null;
  return {
    width: definition.width,
    height: RPG_UNITS_PER_EM,
    path: definition.path,
    fontBased: true,
  };
}

function resolveGlyph(icon: string | null | undefined): MarkerGlyph | null {
  const value = icon?.trim();
  if (!value) return null;

  const separator = value.indexOf(':');
  const prefix = separator >= 0 ? value.slice(0, separator) : '';
  const name = separator >= 0 ? value.slice(separator + 1) : value;

  if (prefix.startsWith('fa') || value.startsWith('fa-')) {
    return resolveFontAwesome(name);
  }
  return resolveRpg(name);
}

function glyphMarkup(
  glyph: MarkerGlyph,
  color: string,
  iconTransform: string,
): string {
  const scale = glyph.fontBased
    ? Math.min(ICON_BOX_WIDTH / glyph.width, ICON_BOX_HEIGHT / RPG_UNITS_PER_EM)
    : Math.min(ICON_BOX_WIDTH / glyph.width, ICON_BOX_HEIGHT / glyph.height);

  const transform = glyph.fontBased
    ? `translate(${ICON_CENTER_X} ${ICON_CENTER_Y}) ${iconTransform} scale(${scale} ${-scale}) translate(${-glyph.width / 2} ${-(RPG_ASCENT + RPG_DESCENT) / 2})`
    : `translate(${ICON_CENTER_X} ${ICON_CENTER_Y}) ${iconTransform} scale(${scale}) translate(${-glyph.width / 2} ${-glyph.height / 2})`;

  return `<path d="${escapeXml(glyph.path)}" fill="${escapeXml(color)}" transform="${escapeXml(transform)}"/>`;
}

/**
 * Build a scalable map marker SVG. Supports both `fa-solid:*` Font Awesome
 * icons and `ra-*` RPG Awesome icons.
 */
export function createMapMarkerSvg(
  icon: string | null | undefined,
  options: MapMarkerSvgOptions = {},
): string {
  const height = options.height ?? 42;
  const width = Math.round((MARKER_WIDTH / MARKER_HEIGHT) * height);
  const fill = options.fill ?? '#4182c3';
  const stroke = options.stroke ?? '#fff';
  const iconColor = options.iconColor ?? '#fff';
  const glyph = resolveGlyph(icon);

  const cacheKey = [
    icon ?? '',
    height,
    fill,
    stroke,
    iconColor,
    options.iconTransform ?? '',
  ].join('|');
  const cached = markerCache.get(cacheKey);
  if (cached) return cached;

  const glyphSvg = glyph
    ? glyphMarkup(glyph, iconColor, options.iconTransform ?? '')
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${MARKER_WIDTH} ${MARKER_HEIGHT}"><path d="${PIN_PATH}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width=".6"/><g fill="none" fill-rule="evenodd">${glyphSvg}</g></svg>`;
  markerCache.set(cacheKey, svg);
  return svg;
}

export function createMapMarkerDataUri(
  icon: string | null | undefined,
  options: MapMarkerSvgOptions = {},
): string {
  return `data:image/svg+xml,${encodeURIComponent(
    createMapMarkerSvg(icon, options),
  )}`;
}

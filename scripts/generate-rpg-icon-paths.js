import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(
  path.join(root, 'node_modules/rpg-awesome/css/rpg-awesome.css'),
  'utf8',
);
const svg = fs.readFileSync(
  path.join(root, 'node_modules/rpg-awesome/fonts/rpgawesome-webfont.svg'),
  'utf8',
);

const cssIcons = new Map();
for (const match of css.matchAll(/\.ra-([a-z0-9-]+):before\s*\{\s*content:\s*"([^"]+)"/g)) {
  const [, name, char] = match;
  cssIcons.set(name, char.codePointAt(0));
}

const defaultWidth = Number(
  svg.match(/<font[^>]*horiz-adv-x="([0-9]+)"/)?.[1] ?? 1024,
);
const glyphs = new Map();
for (const match of svg.matchAll(/<glyph\b[^>]*\/?>(?:<\/glyph>)?/gi)) {
  const tag = match[0];
  const unicode = tag.match(/unicode="&#x([0-9a-f]+);"/i)?.[1];
  const name = tag.match(/glyph-name="([^"]+)"/)?.[1];
  const width = tag.match(/horiz-adv-x="([0-9]+)"/)?.[1];
  const d = tag.match(/\bd="([^"]*)"/)?.[1];
  if (!unicode || !name || !d) continue;
  glyphs.set(Number.parseInt(unicode, 16), {
    name,
    width: width ? Number(width) : defaultWidth,
    path: d,
  });
}

const entries = [];
for (const [name, code] of [...cssIcons].sort(([a], [b]) => a.localeCompare(b))) {
  const glyph = glyphs.get(code);
  if (!glyph?.path) continue;
  entries.push([name, { width: glyph.width, path: glyph.path }]);
}

const output = `// Generated from rpg-awesome by scripts/generate-rpg-icon-paths.js.\n// Do not edit manually.\n\nexport interface RpgIconPath {\n  width: number;\n  path: string;\n}\n\nexport const RPG_ICON_PATHS: Record<string, RpgIconPath> = {\n${entries
  .map(
    ([name, { width, path: d }]) =>
      `  '${name}': {\n    width: ${width},\n    path: ${JSON.stringify(d)},\n  },`,
  )
  .join('\n')}\n};\n`;

fs.writeFileSync(path.join(root, 'src/maps/rpgIconPaths.ts'), output);
console.log(`Wrote ${entries.length} RPG Awesome icon paths.`);

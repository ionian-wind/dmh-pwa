import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../public/assets/icons');
const OUT_FILE = path.join(__dirname, '../public/assets/icons/icons-list.json');

function toPascalCase(str) {
  return str
    .replace(/(^|[-_\s])(\w)/g, (_, __, c) => c ? c.toUpperCase() : '')
    .replace(/[^a-zA-Z0-9]/g, '') + 'Icon';
}

function collectIcons(dir) {
  const icons = [];
  const subdirs = fs.readdirSync(dir);
  for (const sub of subdirs) {
    const subPath = path.join(dir, sub);
    if (fs.statSync(subPath).isDirectory()) {
      const files = fs.readdirSync(subPath).filter(f => f.endsWith('.svg'));
      for (const file of files) {
        const baseName = path.basename(file, '.svg');
        const name = toPascalCase(baseName);
        const publicPath = `/assets/icons/${sub}/${file}`;
        icons.push({ name, publicPath });
      }
    }
  }
  return icons;
}

const icons = collectIcons(SRC_DIR);
fs.writeFileSync(OUT_FILE, JSON.stringify(icons, null, 2), 'utf8');
console.log(`Wrote ${icons.length} icon paths to ${OUT_FILE}`); 
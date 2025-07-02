import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../public/assets/icons');
const OUT_DIR = path.join(__dirname, '../src/components/common/icons');

function toPascalCase(str) {
  return str
    .replace(/(^|[-_\s])(\w)/g, (_, __, c) => c ? c.toUpperCase() : '')
    .replace(/[^a-zA-Z0-9]/g, '') + 'Icon';
}

function svgToVueComponent(svgContent, componentName) {
  // Remove width/height attributes from <svg>
  svgContent = svgContent.replace(/(<svg[^>]*)(width|height)="[^"]*"/g, '$1');
  // Remove any existing xmlns attribute
  svgContent = svgContent.replace(/(<svg[^>]*)\s+xmlns="[^"]*"/i, '$1');
  // Add Vue props to <svg> and ensure a single xmlns
  svgContent = svgContent.replace(
    /<svg([^>]*)>/,
    '<svg$1 :width="size" :height="size" :style="{ color }" xmlns="http://www.w3.org/2000/svg">'
  );
  // Only replace hardcoded fill/stroke colors (not currentColor)
  svgContent = svgContent.replace(/fill="#([^"]*)"/g, 'fill="currentColor"');
  svgContent = svgContent.replace(/stroke="#([^"]*)"/g, 'stroke="currentColor"');

  return `
<script setup lang="ts">
defineProps({
  size: { type: [Number, String], default: 24 },
  color: { type: String, default: 'currentColor' },
});
</script>

<template>
${svgContent}
</template>
`;
}

function processDir(dir) {
  const subdirs = fs.readdirSync(dir);
  let count = 0;
  for (const sub of subdirs) {
    const subPath = path.join(dir, sub);
    if (fs.statSync(subPath).isDirectory()) {
      const files = fs.readdirSync(subPath).filter(f => f.endsWith('.svg'));
      for (const file of files) {
        const svgPath = path.join(subPath, file);
        const svgContent = fs.readFileSync(svgPath, 'utf8');
        const baseName = path.basename(file, '.svg');
        const componentName = toPascalCase(baseName);
        const vueContent = svgToVueComponent(svgContent, componentName);
        const outFile = path.join(OUT_DIR, `${componentName}.vue`);
        fs.writeFileSync(outFile, vueContent, 'utf8');
        count++;
      }
    }
  }
  return count;
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const total = processDir(SRC_DIR);
console.log(`Generated ${total} Vue icon components in ${OUT_DIR}`); 
 
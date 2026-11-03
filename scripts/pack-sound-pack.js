import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSoundPackArchive } from './sound-pack-archive.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const PACK_DIR = path.join(rootDir, 'sound-packs');
const OUTPUT_DIR = path.join(rootDir, 'dist', 'sound-packs');

function getPacks() {
  if (!fs.existsSync(PACK_DIR)) {
    console.log('No sound-packs directory found');
    return [];
  }
  return fs
    .readdirSync(PACK_DIR)
    .filter((file) => fs.statSync(path.join(PACK_DIR, file)).isDirectory());
}

async function packSoundPack(packName) {
  const packPath = path.join(PACK_DIR, packName);
  const outputPath = path.join(OUTPUT_DIR, `${packName}.spk`);

  if (!fs.existsSync(path.join(packPath, 'pack.json'))) {
    console.log(`Skipping ${packName}: no pack.json found`);
    return;
  }

  try {
    const result = await writeSoundPackArchive(packPath, outputPath);
    console.log(`Packed: ${packName}.spk (${result.bytes} bytes)`);
  } catch (error) {
    console.error(`Failed to pack ${packName}:`, error);
  }
}

async function main() {
  const packs = getPacks();
  console.log(`Found ${packs.length} sound pack(s) to pack`);
  for (const pack of packs) {
    await packSoundPack(pack);
  }
  console.log('Done!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

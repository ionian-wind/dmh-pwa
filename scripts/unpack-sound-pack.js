import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unpackSoundPackArchive } from './sound-pack-archive.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const INPUT_DIR = path.join(rootDir, 'sound-packs', 'incoming');
const OUTPUT_DIR = path.join(rootDir, 'sound-packs');

async function unpackSoundPack(fileName) {
  const inputPath = path.join(INPUT_DIR, fileName);
  const packName = fileName.replace(/\.spk$/, '');
  const outputPath = path.join(OUTPUT_DIR, packName);

  const files = await unpackSoundPackArchive(inputPath, outputPath);
  console.log(`Unpacked: ${fileName} to ${packName}/ (${files.length} files)`);
}

async function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    fs.mkdirSync(INPUT_DIR, { recursive: true });
    console.log(`Created incoming directory: ${INPUT_DIR}`);
    console.log('Place .spk files in this directory and run the script again');
    return;
  }

  const files = fs
    .readdirSync(INPUT_DIR)
    .filter((file) => file.endsWith('.spk'));
  console.log(`Found ${files.length} file(s) to unpack`);
  for (const file of files) {
    await unpackSoundPack(file);
  }
  console.log('Done!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

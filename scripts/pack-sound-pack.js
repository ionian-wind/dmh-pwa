import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSoundPackArchive } from './sound-pack-archive.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const PACK_DIR = path.join(rootDir, 'sound-packs');
const OUTPUT_DIR = path.join(rootDir, 'dist', 'sound-packs');

function getDefaultPacks() {
  if (!fs.existsSync(PACK_DIR)) return [];
  return fs
    .readdirSync(PACK_DIR)
    .filter((file) => fs.statSync(path.join(PACK_DIR, file)).isDirectory())
    .map((name) => ({
      packDir: path.join(PACK_DIR, name),
      outputFile: path.join(OUTPUT_DIR, `${name}.spk`),
    }));
}

function getArgumentPacks(args) {
  return args.map((arg) => {
    const packDir = path.resolve(process.cwd(), arg);
    return {
      packDir,
      outputFile: path.join(
        path.dirname(packDir),
        `${path.basename(packDir)}.spk`,
      ),
    };
  });
}

async function packSoundPack({ packDir, outputFile }) {
  if (!fs.existsSync(path.join(packDir, 'pack.json'))) {
    console.log(`Skipping ${packDir}: no pack.json found`);
    return;
  }

  const result = await writeSoundPackArchive(packDir, outputFile);
  console.log(`Packed: ${result.outputPath} (${result.bytes} bytes)`);
}

async function main() {
  const args = process.argv.slice(2);
  const packs = args.length ? getArgumentPacks(args) : getDefaultPacks();

  if (packs.length === 0) {
    console.log(
      'No package directories found. Pass one or more directories, for example:',
    );
    console.log('  npm run pack:sound -- content/sample-ambient-pack');
    return;
  }

  console.log(`Found ${packs.length} sound package(s) to pack`);
  for (const pack of packs) {
    await packSoundPack(pack);
  }
  console.log('Done!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

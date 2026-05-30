import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const PACK_DIR = path.join(rootDir, 'sound-packs');
const OUTPUT_DIR = path.join(rootDir, 'dist', 'sound-packs');

function getPacks(): string[] {
  if (!fs.existsSync(PACK_DIR)) {
    console.log('No sound-packs directory found');
    return [];
  }
  return fs.readdirSync(PACK_DIR).filter(f => 
    fs.statSync(path.join(PACK_DIR, f)).isDirectory()
  );
}

async function packSoundPack(packName: string): Promise<void> {
  const packPath = path.join(PACK_DIR, packName);
  const outputPath = path.join(OUTPUT_DIR, `${packName}.spk`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const packJsonPath = path.join(packPath, 'pack.json');
  if (!fs.existsSync(packJsonPath)) {
    console.log(`Skipping ${packName}: no pack.json found`);
    return;
  }

  const zip = new JSZip();
  
  function addDirectoryToZip(dirPath: string, zipFolder: JSZip) {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const newFolder = zipFolder.folder(item);
        addDirectoryToZip(fullPath, newFolder!);
      } else {
        const data = fs.readFileSync(fullPath);
        zipFolder.file(item, data);
      }
    }
  }

  addDirectoryToZip(packPath, zip);

  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outputPath, content);
  
  console.log(`Packed: ${packName}.spk (${content.length} bytes)`);
}

async function main() {
  const packs = getPacks();
  console.log(`Found ${packs.length} sound pack(s) to pack`);

  for (const pack of packs) {
    await packSoundPack(pack);
  }

  console.log('Done!');
}

main().catch(console.error);
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const INPUT_DIR = path.join(rootDir, 'sound-packs', 'incoming');
const OUTPUT_DIR = path.join(rootDir, 'sound-packs');

async function unpackSoundPack(fileName: string): Promise<void> {
  const inputPath = path.join(INPUT_DIR, fileName);
  const packName = fileName.replace('.spk', '');
  const outputPath = path.join(OUTPUT_DIR, packName);

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const data = fs.readFileSync(inputPath);
  const zip = await JSZip.loadAsync(data);

  function extractZip(zipItem: JSZip, outputDir: string) {
    zipItem.forEach((relativePath, zipEntry) => {
      const fullPath = path.join(outputDir, relativePath);
      if (zipEntry.dir) {
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
      } else {
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        zipEntry.async('nodebuffer').then(content => {
          fs.writeFileSync(fullPath, content);
        });
      }
    });
  }

  extractZip(zip, outputPath);
  console.log(`Unpacked: ${fileName} to ${packName}/`);
}

async function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    fs.mkdirSync(INPUT_DIR, { recursive: true });
    console.log(`Created incoming directory: ${INPUT_DIR}`);
    console.log('Place .spk files in this directory and run the script again');
    return;
  }

  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.spk'));
  console.log(`Found ${files.length} file(s) to unpack`);

  for (const file of files) {
    await unpackSoundPack(file);
  }

  console.log('Done!');
}

main().catch(console.error);
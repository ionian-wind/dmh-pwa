import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

async function collectEntries(dir, prefix = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push({ relativePath, absolutePath, isDirectory: true });
      result.push(...(await collectEntries(absolutePath, relativePath)));
    } else {
      result.push({ relativePath, absolutePath, isDirectory: false });
    }
  }
  return result;
}

async function assertPackDirectory(packDir) {
  const stat = await fs.stat(packDir).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(`Sound pack directory not found: ${packDir}`);
  }
  await fs.access(path.join(packDir, 'pack.json')).catch(() => {
    throw new Error(`Missing pack.json in ${packDir}`);
  });
}

export async function createSoundPackBuffer(packDir) {
  await assertPackDirectory(packDir);
  const zip = new JSZip();
  for (const entry of await collectEntries(packDir)) {
    if (entry.isDirectory) {
      zip.folder(entry.relativePath);
    } else {
      zip.file(entry.relativePath, await fs.readFile(entry.absolutePath));
    }
  }
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}

export async function writeSoundPackArchive(packDir, outputFile) {
  const buffer = await createSoundPackBuffer(packDir);
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, buffer);
  return { outputPath: outputFile, bytes: buffer.length };
}

export async function unpackSoundPackArchive(input, outputDir) {
  const buffer = Buffer.isBuffer(input) ? input : await fs.readFile(input);
  const zip = await JSZip.loadAsync(buffer);
  const root = path.resolve(outputDir);
  const written = [];

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const destination = path.resolve(root, entry.name);
    if (destination !== root && !destination.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Unsafe path in sound pack: ${entry.name}`);
    }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, await entry.async('nodebuffer'));
    written.push(destination);
  }

  return written;
}

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import {
  createSoundPackBuffer,
  unpackSoundPackArchive,
  writeSoundPackArchive,
} from '../../scripts/sound-pack-archive.js';

let root: string;

async function makePack(name = 'demo') {
  const packDir = path.join(root, name);
  await mkdir(path.join(packDir, 'layers'), { recursive: true });
  await mkdir(path.join(packDir, 'docs'), { recursive: true });
  await writeFile(
    path.join(packDir, 'pack.json'),
    JSON.stringify({ id: name, name }),
  );
  await writeFile(path.join(packDir, 'layers', 'rain.mp3'), 'rain');
  await writeFile(path.join(packDir, 'docs', 'notes.txt'), 'notes');
  return packDir;
}

describe('sound pack archive helpers', () => {
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'dmh-sound-pack-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('packs a directory recursively', async () => {
    const packDir = await makePack();
    const buffer = await createSoundPackBuffer(packDir);

    const zip = await JSZip.loadAsync(buffer);
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([
        'pack.json',
        'layers/',
        'layers/rain.mp3',
        'docs/',
        'docs/notes.txt',
      ]),
    );
    expect(await zip.file('pack.json')?.async('string')).toContain(
      '"id":"demo"',
    );
  });

  it('writes an archive and unpacks it into a new directory', async () => {
    const packDir = await makePack();
    const archive = path.join(root, 'out', 'demo.spk');
    const result = await writeSoundPackArchive(packDir, archive);
    expect(result.bytes).toBeGreaterThan(0);
    await expect(readFile(archive)).resolves.toBeInstanceOf(Buffer);

    const outputDir = path.join(root, 'unpacked');
    const files = await unpackSoundPackArchive(archive, outputDir);
    expect(files).toHaveLength(3);
    await expect(
      readFile(path.join(outputDir, 'layers', 'rain.mp3'), 'utf8'),
    ).resolves.toBe('rain');
    await expect(
      readFile(path.join(outputDir, 'docs', 'notes.txt'), 'utf8'),
    ).resolves.toBe('notes');
    await expect(
      readFile(path.join(outputDir, 'pack.json'), 'utf8'),
    ).resolves.toContain('"id":"demo"');
  });

  it('unpacks from a buffer', async () => {
    const packDir = await makePack();
    const buffer = await createSoundPackBuffer(packDir);
    const outputDir = path.join(root, 'buffer-unpacked');
    const files = await unpackSoundPackArchive(buffer, outputDir);

    expect(files).toHaveLength(3);
    expect(files.every((file) => file.startsWith(outputDir))).toBe(true);
  });

  it('rejects directories without pack.json', async () => {
    const packDir = path.join(root, 'missing');
    await mkdir(packDir, { recursive: true });
    await expect(createSoundPackBuffer(packDir)).rejects.toThrow(
      'Missing pack.json',
    );
    await expect(
      createSoundPackBuffer(path.join(root, 'nope')),
    ).rejects.toThrow('Sound pack directory not found');
  });

  it('rejects invalid archives', async () => {
    const invalid = path.join(root, 'invalid.spk');
    await writeFile(invalid, 'not a zip');
    await expect(
      unpackSoundPackArchive(invalid, path.join(root, 'invalid-out')),
    ).rejects.toThrow();
  });
});

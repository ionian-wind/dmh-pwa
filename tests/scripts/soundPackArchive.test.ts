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
    JSON.stringify({
      id: name,
      name,
      scenes: [
        {
          id: 'scene',
          name: 'Scene',
          intensity: 50,
          ambiences: [],
          oneShotIds: [],
          musicPresets: [],
        },
      ],
    }),
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
    const manifest = JSON.parse(
      (await zip.file('pack.json')?.async('string')) ?? '{}',
    );
    expect(manifest.name).toBe('demo');
    expect(manifest.id).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.id).not.toBe('demo');
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
    const manifest = JSON.parse(
      await readFile(path.join(outputDir, 'pack.json'), 'utf8'),
    );
    expect(manifest.id).toMatch(/^[a-f0-9]{64}$/);
  });

  it('unpacks from a buffer', async () => {
    const packDir = await makePack();
    const buffer = await createSoundPackBuffer(packDir);
    const outputDir = path.join(root, 'buffer-unpacked');
    const files = await unpackSoundPackArchive(buffer, outputDir);

    expect(files).toHaveLength(3);
    expect(files.every((file) => file.startsWith(outputDir))).toBe(true);
  });

  async function makeModernPack(name, ids) {
    const packDir = path.join(root, name);
    await mkdir(path.join(packDir, 'ambiences'), { recursive: true });
    await mkdir(path.join(packDir, 'one-shots'), { recursive: true });
    await mkdir(path.join(packDir, 'scenes', ids.scene, 'music'), {
      recursive: true,
    });
    await writeFile(path.join(packDir, 'ambiences', 'rain.mp3'), 'rain');
    await writeFile(path.join(packDir, 'one-shots', 'thunder.mp3'), 'boom');
    await writeFile(
      path.join(packDir, 'scenes', ids.scene, 'music', 'theme.mp3'),
      'theme',
    );
    await writeFile(
      path.join(packDir, 'pack.json'),
      JSON.stringify({
        version: '2.0',
        id: ids.package,
        name: 'Hashed pack',
        description: '',
        category: 'fantasy',
        ambiences: [
          {
            id: ids.ambience,
            name: 'Rain',
            icon: 'fa-solid:cloud-rain',
            category: 'Weather',
            defaultVolume: 40,
            loop: true,
            variations: [
              {
                id: ids.variation,
                name: 'Light',
                samples: ['ambiences/rain.mp3'],
              },
            ],
          },
        ],
        oneShots: [
          {
            id: ids.oneShot,
            name: 'Thunder',
            icon: 'fa-solid:cloud-bolt',
            file: 'one-shots/thunder.mp3',
            category: 'weather',
            volume: 80,
          },
        ],
        scenes: [
          {
            id: ids.scene,
            name: 'Tavern',
            intensity: 50,
            ambiences: [
              {
                ambienceId: ids.ambience,
                variationId: ids.variation,
                volume: 40,
              },
            ],
            oneShotIds: [ids.oneShot],
            musicPresets: [
              {
                id: ids.preset,
                name: 'Explore',
                files: [`scenes/${ids.scene}/music/theme.mp3`],
              },
            ],
          },
        ],
      }),
    );
    return packDir;
  }

  it('hashes entity content, excludes ids and rewrites references', async () => {
    const first = await makeModernPack('one', {
      package: 'demo-one',
      ambience: 'rain',
      variation: 'light',
      oneShot: 'thunder',
      scene: 'tavern',
      preset: 'explore',
    });
    const second = await makeModernPack('two', {
      package: 'demo-two',
      ambience: 'rain-2',
      variation: 'light',
      oneShot: 'thunder-2',
      scene: 'tavern-2',
      preset: 'explore',
    });

    const firstZip = await JSZip.loadAsync(await createSoundPackBuffer(first));
    const secondZip = await JSZip.loadAsync(
      await createSoundPackBuffer(second),
    );
    const firstManifest = JSON.parse(
      (await firstZip.file('pack.json')?.async('string')) ?? '{}',
    );
    const secondManifest = JSON.parse(
      (await secondZip.file('pack.json')?.async('string')) ?? '{}',
    );

    expect(firstManifest.id).toBe(secondManifest.id);
    expect(firstManifest.ambiences[0].id).toBe(secondManifest.ambiences[0].id);
    expect(firstManifest.oneShots[0].id).toBe(secondManifest.oneShots[0].id);
    expect(firstManifest.scenes[0].id).toBe(secondManifest.scenes[0].id);

    const scene = firstManifest.scenes[0];
    expect(scene.ambiences[0].ambienceId).toBe(firstManifest.ambiences[0].id);
    expect(scene.oneShotIds[0]).toBe(firstManifest.oneShots[0].id);
    expect(firstManifest.ambiences[0].variations[0].samples[0]).toMatch(
      /^ambiences\/[a-f0-9]{64}\.mp3$/,
    );
    expect(firstManifest.oneShots[0].file).toMatch(
      /^one-shots\/[a-f0-9]{64}\.mp3$/,
    );
    const outputMusic = scene.musicPresets[0].files[0];
    expect(outputMusic).toMatch(
      new RegExp(`^scenes/${scene.id}/music/[a-f0-9]{64}\\.mp3$`),
    );
    expect(firstZip.file(outputMusic)).toBeTruthy();
    expect(firstZip.file('scenes/tavern/music/theme.mp3')).toBeFalsy();
  });

  it('changes entity and package hashes when file content changes', async () => {
    const packDir = await makeModernPack('change', {
      package: 'demo',
      ambience: 'rain',
      variation: 'light',
      oneShot: 'thunder',
      scene: 'tavern',
      preset: 'explore',
    });
    const before = JSON.parse(
      (await (await JSZip.loadAsync(await createSoundPackBuffer(packDir)))
        .file('pack.json')
        ?.async('string')) ?? '{}',
    );
    await writeFile(path.join(packDir, 'ambiences', 'rain.mp3'), 'different');
    const after = JSON.parse(
      (await (await JSZip.loadAsync(await createSoundPackBuffer(packDir)))
        .file('pack.json')
        ?.async('string')) ?? '{}',
    );

    expect(after.ambiences[0].id).not.toBe(before.ambiences[0].id);
    expect(after.scenes[0].id).not.toBe(before.scenes[0].id);
    expect(after.id).not.toBe(before.id);
  });

  it('supports ambience-only, one-shot-only and scene-only packs', async () => {
    const onlyAmbience = path.join(root, 'only-ambience');
    await mkdir(path.join(onlyAmbience, 'ambiences'), { recursive: true });
    await writeFile(path.join(onlyAmbience, 'ambiences', 'rain.mp3'), 'rain');
    await writeFile(
      path.join(onlyAmbience, 'pack.json'),
      JSON.stringify({
        version: '2.0',
        id: 'ambience-pack',
        name: 'Ambience only',
        description: '',
        category: 'fantasy',
        ambiences: [
          {
            id: 'rain',
            name: 'Rain',
            icon: 'fa-solid:cloud-rain',
            defaultVolume: 40,
            loop: true,
            variations: [
              {
                id: 'default',
                name: 'Default',
                samples: ['ambiences/rain.mp3'],
              },
            ],
          },
        ],
      }),
    );
    const ambienceManifest = JSON.parse(
      (await (await JSZip.loadAsync(await createSoundPackBuffer(onlyAmbience)))
        .file('pack.json')
        ?.async('string')) ?? '{}',
    );
    expect(ambienceManifest.ambiences[0].id).toMatch(/^[a-f0-9]{64}$/);
    expect(ambienceManifest.oneShots).toBeUndefined();
    expect(ambienceManifest.scenes).toBeUndefined();

    const onlyOneShot = path.join(root, 'only-one-shot');
    await mkdir(path.join(onlyOneShot, 'one-shots'), { recursive: true });
    await writeFile(path.join(onlyOneShot, 'one-shots', 'bell.mp3'), 'bell');
    await writeFile(
      path.join(onlyOneShot, 'pack.json'),
      JSON.stringify({
        version: '2.0',
        id: 'one-shot-pack',
        name: 'One-shot only',
        description: '',
        category: 'fantasy',
        oneShots: [
          {
            id: 'bell',
            name: 'Bell',
            icon: 'fa-solid:bell',
            file: 'one-shots/bell.mp3',
            category: 'environmental',
            volume: 70,
          },
        ],
      }),
    );
    const oneShotManifest = JSON.parse(
      (await (await JSZip.loadAsync(await createSoundPackBuffer(onlyOneShot)))
        .file('pack.json')
        ?.async('string')) ?? '{}',
    );
    expect(oneShotManifest.oneShots[0].id).toMatch(/^[a-f0-9]{64}$/);
    expect(oneShotManifest.ambiences).toBeUndefined();
    expect(oneShotManifest.scenes).toBeUndefined();

    const onlyScene = path.join(root, 'only-scene');
    await mkdir(path.join(onlyScene, 'scenes', 'tavern', 'music'), {
      recursive: true,
    });
    await writeFile(
      path.join(onlyScene, 'scenes', 'tavern', 'music', 'theme.mp3'),
      'theme',
    );
    await writeFile(
      path.join(onlyScene, 'pack.json'),
      JSON.stringify({
        version: '2.0',
        id: 'scene-pack',
        name: 'Scene only',
        description: '',
        category: 'fantasy',
        scenes: [
          {
            id: 'tavern',
            name: 'Tavern',
            intensity: 50,
            ambiences: [],
            oneShotIds: [],
            musicPresets: [
              {
                id: 'explore',
                name: 'Explore',
                files: ['scenes/tavern/music/theme.mp3'],
              },
            ],
          },
        ],
      }),
    );
    const sceneManifest = JSON.parse(
      (await (await JSZip.loadAsync(await createSoundPackBuffer(onlyScene)))
        .file('pack.json')
        ?.async('string')) ?? '{}',
    );
    expect(sceneManifest.scenes[0].id).toMatch(/^[a-f0-9]{64}$/);
    expect(sceneManifest.ambiences).toBeUndefined();
    expect(sceneManifest.oneShots).toBeUndefined();
  });

  it('rejects ambiences missing a global variation sample', async () => {
    const packDir = path.join(root, 'variation-gap');
    await mkdir(path.join(packDir, 'ambiences'), { recursive: true });
    await writeFile(path.join(packDir, 'ambiences', 'rain-light.mp3'), 'light');
    await writeFile(path.join(packDir, 'ambiences', 'wind.mp3'), 'wind');
    await writeFile(
      path.join(packDir, 'pack.json'),
      JSON.stringify({
        version: '2.0',
        id: 'variation-gap',
        name: 'Variation gap',
        description: '',
        category: 'fantasy',
        ambiences: [
          {
            id: 'rain',
            name: 'Rain',
            icon: 'fa-solid:cloud-rain',
            defaultVolume: 40,
            loop: true,
            variations: [
              {
                id: 'light',
                name: 'Light',
                samples: ['ambiences/rain-light.mp3'],
              },
            ],
          },
          {
            id: 'wind',
            name: 'Wind',
            icon: 'fa-solid:wind',
            defaultVolume: 30,
            loop: true,
            variations: [
              {
                id: 'default',
                name: 'Default',
                samples: ['ambiences/wind.mp3'],
              },
            ],
          },
        ],
      }),
    );

    await expect(createSoundPackBuffer(packDir)).rejects.toThrow(
      'Each ambience must have at least one sample for every variation',
    );
  });

  it('rejects a package with no ambiences, one-shots or scenes', async () => {
    const empty = path.join(root, 'empty');
    await mkdir(empty, { recursive: true });
    await writeFile(
      path.join(empty, 'pack.json'),
      JSON.stringify({
        version: '2.0',
        id: 'empty',
        name: 'Empty',
        description: '',
        category: 'fantasy',
      }),
    );

    await expect(createSoundPackBuffer(empty)).rejects.toThrow(
      'Sound pack cannot be empty',
    );
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

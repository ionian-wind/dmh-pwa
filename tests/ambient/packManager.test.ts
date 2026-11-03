import { beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import type { SoundPackManifest } from '@/ambient-sound/types';

const legacyManifest: SoundPackManifest = {
  version: '1',
  id: 'pack-1',
  name: 'Rainy Tavern',
  description: 'Test pack',
  category: 'fantasy',
  defaultIntensity: 60,
  layers: [
    {
      id: 'rain',
      name: 'Rain',
      icon: '🌧',
      file: 'rain.mp3',
      defaultVolume: 50,
      loop: true,
    },
  ],
  oneShots: [
    {
      id: 'thunder',
      name: 'Thunder',
      icon: '⛈',
      file: 'thunder.mp3',
      category: 'weather',
      volume: 80,
    },
  ],
  moodStates: [
    {
      state: 'explore',
      name: 'Explore',
      icon: '🔍',
      musicFile: 'explore.mp3',
    },
  ],
};

const modernManifest: SoundPackManifest = {
  version: '2',
  id: 'pack-2',
  name: 'Forest',
  description: 'Modern pack',
  category: 'fantasy',
  defaultIntensity: 50,
  ambiences: [
    {
      id: 'wind',
      name: 'Wind',
      icon: 'ra-wind',
      defaultVolume: 40,
      loop: true,
      variations: [
        { id: 'soft', name: 'Soft', samples: ['ambiences/wind.mp3'] },
      ],
    },
  ],
  oneShots: [
    {
      id: 'bell',
      name: 'Bell',
      icon: 'ra-bell',
      file: 'one-shots/bell.mp3',
      category: 'environmental',
      volume: 70,
    },
  ],
  scenes: [
    {
      id: 'grove',
      name: 'Grove',
      icon: 'ra-tree',
      intensity: 55,
      ambiences: [{ ambienceId: 'wind', variationId: 'soft', volume: 40 }],
      oneShotIds: ['bell'],
      music: { files: ['scenes/grove/music/theme.mp3'], loop: true },
    },
  ],
};

async function packFile(customManifest: any = legacyManifest) {
  const zip = new JSZip();
  zip.file('pack.json', JSON.stringify(customManifest));
  zip.file('layers/rain.mp3', new Blob(['rain']));
  zip.file('sfx/thunder.mp3', new Blob(['thunder']));
  zip.file('music/explore.mp3', new Blob(['music']));
  zip.file('ambiences/wind.mp3', new Blob(['wind']));
  zip.file('one-shots/bell.mp3', new Blob(['bell']));
  zip.file('scenes/grove/music/theme.mp3', new Blob(['theme']));
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'pack.spk');
}

async function clearAmbientDb() {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('dmh-ambient-sound');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

async function load() {
  vi.resetModules();
  return import('@/ambient-sound/utils/packManager');
}

describe('ambient pack manager', () => {
  beforeEach(async () => {
    await clearAmbientDb();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:pack-audio'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('normalizes legacy packs and reads canonical audio paths', async () => {
    const manager = await load();
    const result = await manager.importSoundPack(await packFile());

    expect(result.id).toBe('pack-1');
    expect(result.ambiences).toHaveLength(1);
    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0].id).toBe('mood-explore');
    expect(result.scenes[0].music.files).toEqual([
      'scenes/mood-explore/music/explore.mp3',
    ]);

    const blobs = await manager.getPackAudioBlobs('pack-1');
    expect(Object.keys(blobs)).toEqual([
      'ambiences/rain.mp3',
      'one-shots/thunder.mp3',
      'scenes/mood-explore/music/explore.mp3',
    ]);

    await expect(
      manager.getPackBlobUrl('pack-1', 'ambiences/rain.mp3'),
    ).resolves.toBe('blob:pack-audio');
    await expect(
      manager.getPackBlobUrl('pack-1', 'missing.mp3'),
    ).rejects.toThrow('Audio file not found');
    await expect(manager.getPackAudioBlobs('missing')).resolves.toEqual({});
    await expect(manager.getPack('pack-1')).resolves.toMatchObject({
      id: 'pack-1',
      name: 'Rainy Tavern',
    });
    await expect(manager.getPack('missing')).resolves.toBeNull();

    await manager.deletePack('pack-1');
    expect(await manager.packExists('pack-1')).toBe(false);
  });

  it('imports modern scenes and keeps audio paths', async () => {
    const manager = await load();
    const result = await manager.importSoundPack(
      await packFile(modernManifest),
    );
    expect(result.scenes[0]).toMatchObject({
      id: 'grove',
      oneShotIds: ['bell'],
    });
    const blobs = await manager.getPackAudioBlobs('pack-2');
    expect(Object.keys(blobs)).toEqual([
      'ambiences/wind.mp3',
      'one-shots/bell.mp3',
      'scenes/grove/music/theme.mp3',
    ]);
  });

  it('updates an existing pack and sorts packs by name', async () => {
    const manager = await load();
    await manager.importSoundPack(await packFile());
    await manager.importSoundPack(
      await packFile({ ...legacyManifest, name: 'Updated pack' }),
    );
    await manager.importSoundPack(
      await packFile({ ...legacyManifest, id: 'pack-2', name: 'Alpha pack' }),
    );

    expect((await manager.getStoredPacks()).map((pack) => pack.name)).toEqual([
      'Alpha pack',
      'Updated pack',
    ]);
  });

  it('updates the manifest without replacing audio', async () => {
    const manager = await load();
    await manager.importSoundPack(await packFile(modernManifest));
    const updated = await manager.updatePackManifest('pack-2', {
      ...modernManifest,
      name: 'Updated forest',
    });
    expect(updated.name).toBe('Updated forest');
    const blobs = await manager.getPackAudioBlobs('pack-2');
    expect(Object.keys(blobs)).toContain('ambiences/wind.mp3');
  });

  it('rejects invalid archives and missing fields', async () => {
    const manager = await load();
    const emptyZip = new JSZip();
    const emptyFile = new File(
      [await emptyZip.generateAsync({ type: 'blob' })],
      'empty.spk',
    );
    await expect(manager.importSoundPack(emptyFile)).rejects.toThrow(
      'missing pack.json',
    );
    await expect(
      manager.importSoundPack(await packFile({ id: 'no-name' })),
    ).rejects.toThrow('missing required fields');
  });

  it('saves, exports and downloads packs', async () => {
    const manager = await load();
    await manager.saveSoundPack(modernManifest, new Map());
    await manager.saveSoundPack(
      { ...modernManifest, name: 'Updated' },
      new Map(),
    );

    const blob = await manager.exportSoundPack('pack-2');
    expect(blob).toBeInstanceOf(Blob);
    await expect(manager.exportSoundPack('missing')).rejects.toThrow(
      'Pack not found',
    );

    await manager.exportSoundPackAsFile('pack-2');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    await expect(manager.exportSoundPackAsFile('missing')).rejects.toThrow(
      'Pack not found',
    );

    manager.revokeObjectURL('blob:test');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});

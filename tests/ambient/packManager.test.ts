import { beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import type { SoundPackManifest } from '@/ambient-sound/types';

const manifest: SoundPackManifest = {
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
  weatherSystems: [
    {
      id: 'storm',
      name: 'Storm',
      icon: '⛈',
      file: 'storm.mp3',
      affectsLayers: ['rain'],
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

async function packFile(customManifest: any = manifest) {
  const zip = new JSZip();
  zip.file('pack.json', JSON.stringify(customManifest));
  zip.file('layers/rain.mp3', new Blob(['rain']));
  zip.file('sfx/thunder.mp3', new Blob(['thunder']));
  zip.file('music/explore.mp3', new Blob(['music']));
  zip.file('weather/storm.mp3', new Blob(['storm']));
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

  it('imports, lists, reads and deletes sound packs', async () => {
    const manager = await load();
    const result = await manager.importSoundPack(await packFile());

    expect(result).toEqual(manifest);
    expect(await manager.packExists('pack-1')).toBe(true);
    await expect(manager.getStoredPacks()).resolves.toEqual([manifest]);
    const blobs = await manager.getPackAudioBlobs('pack-1');
    expect(Object.keys(blobs)).toEqual([
      'layers/rain.mp3',
      'sfx/thunder.mp3',
      'music/explore.mp3',
      'weather/storm.mp3',
    ]);

    await expect(
      manager.getPackBlobUrl('pack-1', 'layers/rain.mp3'),
    ).resolves.toBe('blob:pack-audio');
    await expect(
      manager.getPackBlobUrl('pack-1', 'missing.mp3'),
    ).rejects.toThrow('Audio file not found');
    await expect(manager.getPackAudioBlobs('missing')).resolves.toEqual({});

    await manager.deletePack('pack-1');
    expect(await manager.packExists('pack-1')).toBe(false);
  });

  it('updates an existing pack and sorts packs by name', async () => {
    const manager = await load();
    await manager.importSoundPack(await packFile());
    const updated = { ...manifest, name: 'Updated pack' };
    await manager.importSoundPack(await packFile(updated));

    const other = { ...manifest, id: 'pack-2', name: 'Alpha pack' };
    await manager.importSoundPack(await packFile(other));

    expect((await manager.getStoredPacks()).map((pack) => pack.name)).toEqual([
      'Alpha pack',
      'Updated pack',
    ]);
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
    await manager.saveSoundPack(manifest, new Map());
    await manager.saveSoundPack({ ...manifest, name: 'Updated' }, new Map());

    const blob = await manager.exportSoundPack('pack-1');
    expect(blob).toBeInstanceOf(Blob);
    await expect(manager.exportSoundPack('missing')).rejects.toThrow(
      'Pack not found',
    );

    await manager.exportSoundPackAsFile('pack-1');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    await expect(manager.exportSoundPackAsFile('missing')).rejects.toThrow(
      'Pack not found',
    );

    manager.revokeObjectURL('blob:test');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});

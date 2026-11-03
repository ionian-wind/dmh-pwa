import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const mocks = vi.hoisted(() => ({
  packManager: {
    getStoredPacks: vi.fn(),
    getPackAudioBlobs: vi.fn(),
    importSoundPack: vi.fn(),
    deletePack: vi.fn(),
    updatePackManifest: vi.fn(),
  },
  audioEngine: {
    loadLayer: vi.fn(),
    loadOneShot: vi.fn(),
    loadMusic: vi.fn(),
    setMasterVolume: vi.fn(),
    stopAll: vi.fn(),
    stopLayer: vi.fn(),
    playLayer: vi.fn(),
    setLayerVolume: vi.fn(),
    playMusic: vi.fn(),
    pauseAll: vi.fn(),
    setMusicVolume: vi.fn(),
    playOneShot: vi.fn(),
    stopMusic: vi.fn(),
    setMusicEndHandler: vi.fn(),
  },
}));

vi.mock('@/ambient-sound/utils/packManager', () => mocks.packManager);
vi.mock('@/ambient-sound/utils/audioEngine', () => ({
  audioEngine: mocks.audioEngine,
}));

import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import { normalizeSoundPack } from '@/ambient-sound/utils/packData';
import type { SceneDef, SoundPackManifest } from '@/ambient-sound/types';

const manifest: SoundPackManifest = {
  version: '2.0',
  id: 'forest',
  name: 'Forest',
  description: '',
  category: 'fantasy',
  defaultIntensity: 60,
  ambiences: [
    {
      id: 'rain',
      name: 'Rain',
      icon: 'ra-rain',
      category: 'Weather',
      defaultVolume: 40,
      loop: true,
      variations: [
        { id: 'light', name: 'Light', samples: ['ambiences/light.mp3'] },
        { id: 'heavy', name: 'Heavy', samples: ['ambiences/heavy.mp3'] },
      ],
    },
    {
      id: 'wind',
      name: 'Wind',
      icon: 'ra-wind',
      category: 'Weather',
      defaultVolume: 30,
      loop: true,
      variations: [
        { id: 'default', name: 'Default', samples: ['ambiences/wind.mp3'] },
      ],
    },
  ],
  oneShots: [
    {
      id: 'thunder',
      name: 'Thunder',
      icon: 'ra-bell',
      file: 'one-shots/thunder.mp3',
      category: 'weather',
      volume: 80,
    },
  ],
  scenes: [
    {
      id: 'tavern',
      name: 'Tavern',
      icon: 'ra-beer',
      intensity: 70,
      ambiences: [{ ambienceId: 'rain', variationId: 'light', volume: 40 }],
      oneShotIds: ['thunder'],
      musicPresets: [
        {
          id: 'explore',
          name: 'Explore',
          files: ['scenes/tavern/music/theme.mp3'],
        },
        {
          id: 'combat',
          name: 'Combat',
          files: [
            'scenes/tavern/music/combat.mp3',
            'scenes/tavern/music/combat-2.mp3',
          ],
        },
      ],
    },
  ],
};

const pack = normalizeSoundPack(manifest);

const blobs = {
  'ambiences/light.mp3': new Blob(['light'], { type: 'light' }),
  'ambiences/heavy.mp3': new Blob(['heavy'], { type: 'heavy' }),
  'ambiences/wind.mp3': new Blob(['wind'], { type: 'wind' }),
  'one-shots/thunder.mp3': new Blob(['thunder'], { type: 'thunder' }),
  'scenes/tavern/music/theme.mp3': new Blob(['theme'], { type: 'theme' }),
  'scenes/tavern/music/combat.mp3': new Blob(['combat'], { type: 'combat' }),
  'scenes/tavern/music/combat-2.mp3': new Blob(['combat2'], {
    type: 'combat2',
  }),
};

function createStore() {
  setActivePinia(createPinia());
  return useAmbientSoundStore();
}

describe('ambient sound store', () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks.packManager)) fn.mockReset();
    for (const fn of Object.values(mocks.audioEngine)) fn.mockReset();
    mocks.packManager.getStoredPacks.mockResolvedValue([pack]);
    mocks.packManager.getPackAudioBlobs.mockResolvedValue(blobs);
    mocks.packManager.updatePackManifest.mockImplementation(
      async (_id: string, updated: SoundPackManifest) =>
        normalizeSoundPack(updated),
    );
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob: Blob) => `blob:${blob.type}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    localStorage.clear();
  });

  it('loads packages into scenes and the global gallery', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    expect(store.storedPacks).toHaveLength(1);
    expect(store.allScenes).toHaveLength(1);
    expect(store.galleryAmbiences).toHaveLength(2);
    expect(store.galleryOneShots).toHaveLength(1);
    expect(store.selectedPack).toBeNull();
    expect(mocks.audioEngine.loadOneShot).not.toHaveBeenCalled();
  });

  it('plays a scene with its own music and ambience config', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    await store.playScene('forest', 'tavern');

    expect(store.isPlaying).toBe(true);
    expect(store.activeScene?.scene.id).toBe('tavern');
    expect(store.intensity).toBe(70);
    expect(mocks.audioEngine.loadOneShot).toHaveBeenCalledWith(
      'oneShot:forest:thunder',
      'blob:thunder',
      ['mp3'],
    );
    expect(mocks.audioEngine.loadLayer).toHaveBeenCalledWith(
      'forest:rain',
      'blob:light',
      true,
      ['mp3'],
    );
    expect(mocks.audioEngine.playLayer).toHaveBeenCalledWith(
      'forest:rain',
      0.4,
    );
    expect(mocks.audioEngine.loadMusic).toHaveBeenCalledWith(
      'forest::tavern::explore',
      'blob:theme',
      false,
      ['mp3'],
      false,
    );
    expect(store.activeMusicPresetId).toBe('explore');
    expect(mocks.audioEngine.playMusic).toHaveBeenCalledWith(0.7);

    store.pause();
    expect(store.isPlaying).toBe(false);
    expect(mocks.audioEngine.pauseAll).toHaveBeenCalled();

    store.play();
    expect(store.isPlaying).toBe(true);
    store.stop();
    expect(store.activeScene).toBeNull();
    expect(mocks.audioEngine.stopAll).toHaveBeenCalled();
  });

  it('switches scene music presets and queues another variant on end', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    await store.playScene('forest', 'tavern');

    expect(store.activeMusicPresetId).toBe('explore');
    const endHandler = mocks.audioEngine.setMusicEndHandler.mock.calls[0][0];

    endHandler();
    expect(mocks.audioEngine.loadMusic).toHaveBeenLastCalledWith(
      'forest::tavern::explore',
      'blob:theme',
      false,
      ['mp3'],
      true,
    );

    store.setMusicPreset('combat');
    expect(store.activeMusicPresetId).toBe('combat');
    expect(store.musicEnabled).toBe(true);
    expect(mocks.audioEngine.loadMusic).toHaveBeenLastCalledWith(
      'forest::tavern::combat',
      'blob:combat',
      false,
      ['mp3'],
      true,
    );

    store.setMusicPreset(null);
    expect(store.activeMusicPresetId).toBeNull();
    expect(store.musicEnabled).toBe(false);
    expect(mocks.audioEngine.stopMusic).toHaveBeenCalledWith(false);
  });

  it('toggles and changes ambience independently', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    await store.toggleAmbience('forest', 'rain');
    expect(store.activeLayers.get('forest:rain')).toMatchObject({
      variationId: 'light',
      volume: 0.4,
    });
    expect(mocks.audioEngine.loadLayer).toHaveBeenLastCalledWith(
      'forest:rain',
      'blob:light',
      true,
      ['mp3'],
    );

    await store.setAmbienceVariation('forest', 'rain', 'heavy');
    expect(mocks.audioEngine.stopLayer).toHaveBeenCalledWith('forest:rain');
    expect(mocks.audioEngine.loadLayer).toHaveBeenLastCalledWith(
      'forest:rain',
      'blob:heavy',
      true,
      ['mp3'],
    );

    store.setAmbienceVolume('forest', 'rain', 0.2);
    expect(store.activeLayers.get('forest:rain')?.volume).toBe(0.2);
    expect(mocks.audioEngine.setLayerVolume).toHaveBeenCalledWith(
      'forest:rain',
      0.2,
    );

    await store.toggleAmbience('forest', 'rain');
    expect(store.activeLayers.has('forest:rain')).toBe(false);
  });

  it('plays multiple ambience tracks together and toggles them globally', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    await store.toggleAmbience('forest', 'rain');
    await store.toggleAmbience('forest', 'wind');

    expect(store.activeLayers.size).toBe(2);
    expect(store.isPlaying).toBe(true);
    expect(store.activeScene).toBeNull();
    expect(mocks.audioEngine.playLayer).toHaveBeenCalledWith(
      'forest:wind',
      0.3,
    );

    store.togglePlayPause();
    expect(store.isPlaying).toBe(false);
    store.togglePlayPause();
    expect(store.isPlaying).toBe(true);
    expect(mocks.audioEngine.playLayer).toHaveBeenCalledWith(
      'forest:rain',
      0.4,
    );
  });

  it('plays one-shots independently of ambient volume and transport', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    store.setMasterVolume(0);
    store.pause();

    await store.playOneShot('forest', 'thunder');

    expect(mocks.audioEngine.playOneShot).toHaveBeenCalledWith(
      'oneShot:forest:thunder',
      0.8,
    );
    expect(store.isPlaying).toBe(false);
  });

  it('handles selection, transport toggles, music and previews', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    store.selectPack('forest');
    expect(store.selectedPack?.id).toBe('forest');
    store.selectPack('forest');
    expect(store.selectedPack).toBeNull();

    await store.playScene('forest', 'tavern');
    store.togglePlayPause();
    expect(store.isPlaying).toBe(false);
    store.togglePlayPause();
    expect(store.isPlaying).toBe(true);

    store.setIntensity(120);
    expect(store.intensity).toBe(100);
    expect(mocks.audioEngine.setMusicVolume).toHaveBeenCalledWith(1);

    store.setMusicEnabled(false);
    expect(mocks.audioEngine.stopMusic).toHaveBeenCalledWith(false);
    store.toggleMusic();
    expect(store.musicEnabled).toBe(true);
    expect(mocks.audioEngine.loadMusic).toHaveBeenCalled();

    await store.previewAmbience('forest', 'rain', 'heavy');
    expect(mocks.audioEngine.loadLayer).toHaveBeenLastCalledWith(
      'preview:forest:rain',
      'blob:heavy',
      true,
      ['mp3'],
    );
    store.stopPreview();
    expect(mocks.audioEngine.stopLayer).toHaveBeenCalledWith(
      'preview:forest:rain',
      false,
    );
  });

  it('guards idle, missing and repeated operations', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    store.play();
    await store.toggleAmbience('missing', 'rain');
    await store.toggleAmbience('forest', 'missing');
    await store.setAmbienceVariation('forest', 'missing', 'default');
    await store.setAmbienceVariation('forest', 'rain', 'heavy');
    await store.saveScene('missing', {
      ...manifest.scenes![0],
      id: 'missing',
    });
    await store.deleteScene('missing', 'missing');

    store.setMusicPreset('explore');
    expect(store.musicEnabled).toBe(true);
    store.setMusicEnabled(true);
    store.toggleMusic();
    expect(store.musicEnabled).toBe(false);

    await store.playScene('forest', 'tavern');
    await store.selectScene('forest', 'tavern');
    expect(mocks.audioEngine.stopAll).toHaveBeenCalled();
  });

  it('imports and deletes packages while cleaning links and playback', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    await store.playScene('forest', 'tavern');
    store.addSceneLink('forest', 'tavern', 'encounter', 'enc-1');

    mocks.packManager.getStoredPacks.mockResolvedValueOnce([]);
    await store.deletePack('forest');

    expect(mocks.audioEngine.stopAll).toHaveBeenCalled();
    expect(store.storedPacks).toEqual([]);
    expect(store.linksForEntity('encounter', 'enc-1')).toEqual([]);

    mocks.packManager.importSoundPack.mockResolvedValue(pack);
    mocks.packManager.getStoredPacks.mockResolvedValue([pack]);
    await store.importPack(new File(['pack'], 'forest.spk'));
    expect(mocks.packManager.importSoundPack).toHaveBeenCalled();
    expect(store.selectedPackId).toBe('forest');
  });

  it('creates, updates and deletes scenes and links', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    const scene: SceneDef = {
      ...manifest.scenes![0],
      id: 'shop',
      name: 'Shop',
      musicPresets: [],
    };
    await store.saveScene('forest', scene);
    expect(mocks.packManager.updatePackManifest).toHaveBeenCalled();
    expect(store.storedPacks[0].scenes.map((entry) => entry.id)).toContain(
      'shop',
    );

    store.addSceneLink('forest', 'shop', 'location', 'loc-1');
    expect(store.linksForEntity('location', 'loc-1')).toEqual([
      { packageId: 'forest', sceneId: 'shop' },
    ]);

    store.removeSceneLink(store.linksForScene('forest', 'shop')[0].id);
    expect(store.linksForEntity('location', 'loc-1')).toEqual([]);

    await store.deleteScene('forest', 'shop');
    expect(store.storedPacks[0].scenes.map((entry) => entry.id)).not.toContain(
      'shop',
    );
  });
});

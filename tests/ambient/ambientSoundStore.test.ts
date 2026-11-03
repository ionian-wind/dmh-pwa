import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const mocks = vi.hoisted(() => ({
  packManager: {
    getStoredPacks: vi.fn(),
    getPackAudioBlobs: vi.fn(),
    importSoundPack: vi.fn(),
    deletePack: vi.fn(),
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
    transitionToMusic: vi.fn(),
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
import type { SoundPackManifest } from '@/ambient-sound/types';

const manifest: SoundPackManifest = {
  version: '1',
  id: 'pack-1',
  name: 'Campaign',
  description: '',
  category: 'fantasy',
  defaultIntensity: 65,
  layers: [
    {
      id: 'rain',
      name: 'Rain',
      icon: 'ra-rain',
      category: 'Weather',
      defaultVolume: 40,
      loop: true,
      variations: [
        {
          id: 'light',
          name: 'Light rain',
          samples: ['light.mp3', 'light-2.mp3'],
        },
        { id: 'heavy', name: 'Heavy rain', samples: ['heavy.mp3'] },
      ],
    },
  ],
  oneShots: [
    {
      id: 'thunder',
      name: 'Thunder',
      icon: 'ra-bell',
      file: 'thunder.mp3',
      category: 'weather',
      volume: 80,
    },
  ],
  moodStates: [
    {
      state: 'explore',
      name: 'Explore',
      icon: 'ra-horn-call',
      mode: 'continual',
      musicFiles: ['explore.mp3'],
    },
    {
      state: 'combat',
      name: 'Combat',
      icon: 'ra-swords',
      mode: 'continual',
      musicFiles: ['combat.mp3', 'combat-2.mp3'],
    },
    {
      state: 'victory',
      name: 'Victory',
      icon: 'ra-trophy',
      mode: 'temporary',
      musicFile: 'victory.mp3',
    },
    {
      state: 'rest',
      name: 'Rest',
      icon: 'ra-campfire',
      mode: 'continual',
      musicFiles: ['rest.mp3'],
    },
  ],
};

const blobs = {
  'layers/light.mp3': new Blob(['light'], { type: 'light' }),
  'layers/light-2.mp3': new Blob(['light2'], { type: 'light2' }),
  'layers/heavy.mp3': new Blob(['heavy'], { type: 'heavy' }),
  'sfx/thunder.mp3': new Blob(['thunder'], { type: 'thunder' }),
  'music/explore.mp3': new Blob(['explore'], { type: 'explore' }),
  'music/combat.mp3': new Blob(['combat'], { type: 'combat' }),
  'music/combat-2.mp3': new Blob(['combat2'], { type: 'combat2' }),
  'music/victory.mp3': new Blob(['victory'], { type: 'victory' }),
  'music/rest.mp3': new Blob(['rest'], { type: 'rest' }),
};

function createStore() {
  setActivePinia(createPinia());
  return useAmbientSoundStore();
}

describe('ambient sound store', () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks.packManager)) fn.mockReset();
    for (const fn of Object.values(mocks.audioEngine)) fn.mockReset();
    mocks.packManager.getStoredPacks.mockResolvedValue([manifest]);
    mocks.packManager.getPackAudioBlobs.mockResolvedValue(blobs);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob: Blob) => `blob:${blob.type}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  it('loads stored packs and prepares layer/music samples', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    expect(store.storedPacks).toEqual([manifest]);

    await store.loadPack(manifest);
    expect(store.loading).toBe(false);
    expect(store.currentPack).toEqual(manifest);
    expect(store.intensity).toBe(65);
    expect(store.currentMoodState).toBe('explore');
    expect(store.layerVariationSelections.get('rain')).toBe('light');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(9);
    expect(mocks.audioEngine.setMasterVolume).toHaveBeenCalledWith(0.8);
    expect(mocks.audioEngine.loadLayer).not.toHaveBeenCalled();
    expect(mocks.audioEngine.loadMusic).not.toHaveBeenCalled();

    await store.loadPack(manifest);
    expect(mocks.packManager.getPackAudioBlobs).toHaveBeenCalledTimes(1);
  });

  it('imports, deletes and unloads packs', async () => {
    const store = createStore();
    const file = new File(['pack'], 'pack.spk');
    mocks.packManager.importSoundPack.mockResolvedValue(manifest);

    await store.importPack(file);
    expect(mocks.packManager.importSoundPack).toHaveBeenCalledWith(file);
    expect(store.currentPack).toEqual(manifest);

    mocks.packManager.getStoredPacks.mockResolvedValue([]);
    await store.deletePack('pack-1');
    expect(mocks.packManager.deletePack).toHaveBeenCalledWith('pack-1');
    expect(store.currentPack).toBeNull();
    expect(mocks.audioEngine.stopAll).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(9);
  });

  it('toggles layers, variations, volume and playback', async () => {
    const store = createStore();
    await store.loadPack(manifest);
    store.play();
    expect(mocks.audioEngine.loadMusic).toHaveBeenCalledWith(
      'explore',
      'blob:explore',
      true,
    );
    expect(mocks.audioEngine.playMusic).toHaveBeenCalledWith(0.65);

    store.toggleLayer('rain');
    expect(store.activeLayers.get('rain')).toMatchObject({
      variationId: 'light',
      sampleIndex: 0,
      volume: 0.4,
    });
    expect(mocks.audioEngine.loadLayer).toHaveBeenCalledWith(
      'rain',
      'blob:light',
      true,
    );
    expect(mocks.audioEngine.playLayer).toHaveBeenCalledWith('rain', 0.4);

    store.setLayerVariation('rain', 'heavy');
    expect(store.activeLayers.get('rain')?.variationId).toBe('heavy');
    expect(mocks.audioEngine.stopLayer).toHaveBeenCalledWith('rain');
    expect(mocks.audioEngine.loadLayer).toHaveBeenCalledWith(
      'rain',
      'blob:heavy',
      true,
    );

    store.setLayerVolume('rain', 0.2);
    expect(store.activeLayers.get('rain')?.volume).toBe(0.2);
    expect(mocks.audioEngine.setLayerVolume).toHaveBeenCalledWith('rain', 0.2);

    store.toggleLayer('rain');
    expect(store.activeLayers.has('rain')).toBe(false);
    store.toggleLayer('missing');

    store.pause();
    expect(store.isPlaying).toBe(false);
    expect(mocks.audioEngine.pauseAll).toHaveBeenCalled();
    store.togglePlayPause();
    expect(store.isPlaying).toBe(true);
  });

  it('switches continual moods, keeps same mood running and randomizes music', async () => {
    const store = createStore();
    await store.loadPack(manifest);
    store.play();
    mocks.audioEngine.transitionToMusic.mockClear();

    store.setMoodState('combat');
    expect(store.currentMoodState).toBe('combat');
    expect(mocks.audioEngine.transitionToMusic).toHaveBeenCalledWith(
      'combat',
      'blob:combat',
      0.65,
      true,
    );

    mocks.audioEngine.transitionToMusic.mockClear();
    store.setMoodState('combat');
    expect(mocks.audioEngine.transitionToMusic).not.toHaveBeenCalled();

    vi.mocked(Math.random).mockReturnValue(0.99);
    store.setMoodState('rest');
    store.setMoodState('combat');
    expect(mocks.audioEngine.transitionToMusic).toHaveBeenLastCalledWith(
      'combat',
      'blob:combat2',
      0.65,
      true,
    );

    store.setIntensity(120);
    expect(store.intensity).toBe(100);
    expect(mocks.audioEngine.setMusicVolume).toHaveBeenCalledWith(1);
    store.setIntensity(-10);
    expect(store.intensity).toBe(0);

    store.setMasterVolume(200);
    expect(store.masterVolume).toBe(100);
    expect(mocks.audioEngine.setMasterVolume).toHaveBeenCalledWith(1);
    store.setMasterVolume(-5);
    expect(store.masterVolume).toBe(0);
  });

  it('reverts temporary moods after their music ends', async () => {
    const store = createStore();
    await store.loadPack(manifest);
    store.play();
    store.setMoodState('victory');

    expect(store.currentMoodState).toBe('victory');
    expect(store.previousMoodState).toBe('explore');
    expect(store.temporaryMusicActive).toBe(true);
    expect(mocks.audioEngine.transitionToMusic).toHaveBeenLastCalledWith(
      'victory',
      'blob:victory',
      0.65,
      false,
    );

    const endHandler = mocks.audioEngine.setMusicEndHandler.mock.calls[0][0];
    endHandler();
    expect(store.currentMoodState).toBe('explore');
    expect(store.previousMoodState).toBeNull();
    expect(store.temporaryMusicActive).toBe(false);
    expect(mocks.audioEngine.transitionToMusic).toHaveBeenLastCalledWith(
      'explore',
      'blob:explore',
      0.65,
      true,
    );
  });

  it('toggles ambient music independently of playback', async () => {
    const store = createStore();
    expect(store.musicEnabled).toBe(true);
    await store.loadPack(manifest);
    store.play();
    expect(mocks.audioEngine.playMusic).toHaveBeenCalled();

    mocks.audioEngine.playMusic.mockClear();
    store.setMusicEnabled(false);
    expect(store.musicEnabled).toBe(false);
    expect(mocks.audioEngine.stopMusic).toHaveBeenCalledWith(false);

    store.setMoodState('combat');
    expect(mocks.audioEngine.transitionToMusic).not.toHaveBeenCalled();

    store.play();
    expect(mocks.audioEngine.playMusic).not.toHaveBeenCalled();

    store.setMusicEnabled(true);
    expect(mocks.audioEngine.loadMusic).toHaveBeenCalledWith(
      'explore',
      'blob:explore',
      true,
    );
    expect(mocks.audioEngine.playMusic).toHaveBeenCalledWith(0.65);

    store.toggleMusic();
    expect(store.musicEnabled).toBe(false);
    expect(mocks.audioEngine.stopMusic).toHaveBeenCalledTimes(2);
  });

  it('plays one-shots and ignores actions without a pack', () => {
    const empty = createStore();
    empty.toggleLayer('rain');
    empty.play();
    empty.setMoodState('combat');
    empty.playOneShot('thunder');
    expect(empty.hasActiveLayers).toBe(false);
    expect(mocks.audioEngine.playLayer).not.toHaveBeenCalled();

    const store = createStore();
    return store.loadPack(manifest).then(() => {
      store.playOneShot('thunder');
      expect(mocks.audioEngine.playOneShot).toHaveBeenCalledWith(
        'thunder',
        0.8,
      );
      store.playOneShot('missing');
    });
  });
});

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
    loadWeather: vi.fn(),
    setMasterVolume: vi.fn(),
    stopAll: vi.fn(),
    stopLayer: vi.fn(),
    playLayer: vi.fn(),
    setLayerVolume: vi.fn(),
    playMusic: vi.fn(),
    playWeather: vi.fn(),
    pauseAll: vi.fn(),
    transitionToMusic: vi.fn(),
    setMusicVolume: vi.fn(),
    stopWeather: vi.fn(),
    playOneShot: vi.fn(),
    stopMusic: vi.fn(),
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
      icon: '',
      file: 'rain.mp3',
      defaultVolume: 40,
      loop: true,
    },
  ],
  oneShots: [
    {
      id: 'thunder',
      name: 'Thunder',
      icon: '',
      file: 'thunder.mp3',
      category: 'weather',
      volume: 80,
    },
  ],
  weatherSystems: [
    {
      id: 'storm',
      name: 'Storm',
      icon: '',
      file: 'storm.mp3',
      affectsLayers: ['rain'],
    },
  ],
  moodStates: [
    {
      state: 'explore',
      name: 'Explore',
      icon: '',
      musicFile: 'explore.mp3',
    },
    {
      state: 'combat',
      name: 'Combat',
      icon: '',
      musicFile: 'combat.mp3',
    },
  ],
};

const audioBlobs = {
  'layers/rain.mp3': new Blob(['rain']),
  'sfx/thunder.mp3': new Blob(['thunder']),
  'music/explore.mp3': new Blob(['explore']),
  'music/combat.mp3': new Blob(['combat']),
  'weather/storm.mp3': new Blob(['storm']),
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
    mocks.packManager.getPackAudioBlobs.mockResolvedValue(audioBlobs);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob: Blob) => `blob:${(blob as any).type || 'audio'}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('loads stored packs and a full pack into the audio engine', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    expect(store.storedPacks).toEqual([manifest]);

    await store.loadPack(manifest);
    expect(store.loading).toBe(false);
    expect(store.currentPack).toEqual(manifest);
    expect(store.intensity).toBe(65);
    expect(store.currentMoodState).toBe('explore');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(4);
    expect(mocks.audioEngine.loadLayer).toHaveBeenCalledWith(
      'rain',
      expect.stringContaining('blob:'),
    );
    expect(mocks.audioEngine.loadOneShot).toHaveBeenCalledWith(
      'thunder',
      expect.any(String),
    );
    expect(mocks.audioEngine.loadMusic).toHaveBeenCalledWith(
      'explore',
      expect.any(String),
    );
    expect(mocks.audioEngine.loadWeather).toHaveBeenCalledWith(
      'storm',
      expect.any(String),
    );
    expect(mocks.audioEngine.setMasterVolume).toHaveBeenCalledWith(0.8);

    await store.loadPack(manifest);
    expect(mocks.packManager.getPackAudioBlobs).toHaveBeenCalledTimes(1);
  });

  it('imports packs and reloads the stored list', async () => {
    const store = createStore();
    const file = new File(['pack'], 'pack.spk');
    mocks.packManager.importSoundPack.mockResolvedValue(manifest);

    await store.importPack(file);

    expect(mocks.packManager.importSoundPack).toHaveBeenCalledWith(file);
    expect(store.currentPack).toEqual(manifest);
    expect(store.loading).toBe(false);
  });

  it('deletes and unloads packs', async () => {
    const store = createStore();
    await store.loadPack(manifest);
    mocks.packManager.getStoredPacks.mockResolvedValue([]);

    await store.deletePack('pack-1');

    expect(mocks.packManager.deletePack).toHaveBeenCalledWith('pack-1');
    expect(store.currentPack).toBeNull();
    expect(store.storedPacks).toEqual([]);
    expect(mocks.audioEngine.stopAll).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(4);
  });

  it('toggles layers, volume and playback', async () => {
    const store = createStore();
    await store.loadPack(manifest);
    store.play();
    expect(mocks.audioEngine.playMusic).toHaveBeenCalledWith(0.65);

    store.toggleLayer('rain');
    expect(store.activeLayers.get('rain')).toMatchObject({ volume: 0.4 });
    expect(mocks.audioEngine.playLayer).toHaveBeenCalledWith('rain', 0.4);

    store.setLayerVolume('rain', 0.2);
    expect(store.activeLayers.get('rain')?.volume).toBe(0.2);
    expect(mocks.audioEngine.setLayerVolume).toHaveBeenCalledWith('rain', 0.2);

    store.toggleLayer('rain');
    expect(store.activeLayers.has('rain')).toBe(false);
    expect(mocks.audioEngine.stopLayer).toHaveBeenCalledWith('rain');

    store.toggleLayer('missing');
    store.toggleLayer('rain');
    store.pause();
    expect(store.isPlaying).toBe(false);
    expect(mocks.audioEngine.pauseAll).toHaveBeenCalled();
    store.togglePlayPause();
    expect(store.isPlaying).toBe(true);
  });

  it('changes mood and intensity with loaded and lazy audio URLs', async () => {
    const store = createStore();
    await store.loadPack(manifest);
    store.play();
    store.setMoodState('explore');
    expect(mocks.audioEngine.transitionToMusic).toHaveBeenCalledWith(
      'explore',
      expect.any(String),
      0.65,
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

    store.setMoodState('combat');
    await Promise.resolve();
    await Promise.resolve();
    expect(mocks.audioEngine.transitionToMusic).toHaveBeenCalledWith(
      'combat',
      expect.any(String),
      0,
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
    await Promise.resolve();
    expect(mocks.audioEngine.transitionToMusic).not.toHaveBeenCalled();

    store.play();
    expect(mocks.audioEngine.playMusic).not.toHaveBeenCalled();

    store.setMusicEnabled(true);
    expect(mocks.audioEngine.playMusic).toHaveBeenCalledWith(0.65);

    store.toggleMusic();
    expect(store.musicEnabled).toBe(false);
    expect(mocks.audioEngine.stopMusic).toHaveBeenCalledTimes(2);
  });

  it('controls weather and one-shots', async () => {
    const store = createStore();
    await store.loadPack(manifest);
    const weather = manifest.weatherSystems![0];

    store.toggleWeather(weather);
    expect(store.weatherActive).toEqual(weather);
    store.play();
    expect(mocks.audioEngine.playWeather).toHaveBeenCalledWith(0.5);

    store.toggleWeather(weather);
    expect(store.weatherActive).toBeNull();
    expect(mocks.audioEngine.stopWeather).toHaveBeenCalled();

    store.playOneShot('thunder');
    expect(mocks.audioEngine.playOneShot).toHaveBeenCalledWith('thunder', 0.8);
    store.playOneShot('missing');
  });

  it('ignores actions without a loaded pack', () => {
    const store = createStore();
    store.toggleLayer('rain');
    store.play();
    store.setMoodState('combat');
    store.toggleWeather(manifest.weatherSystems![0]);
    store.playOneShot('thunder');
    expect(store.hasActiveLayers).toBe(false);
    expect(mocks.audioEngine.playLayer).not.toHaveBeenCalled();
  });
});

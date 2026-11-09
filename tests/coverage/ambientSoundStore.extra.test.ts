import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    setMoodVolume: vi.fn(),
    setAmbienceVolume: vi.fn(),
    setOneShotVolume: vi.fn(),
    stopAll: vi.fn(),
    stopLayer: vi.fn(),
    playLayer: vi.fn(),
    setLayerVolume: vi.fn(),
    playMusic: vi.fn(),
    pauseAll: vi.fn(),
    setMusicVolume: vi.fn(),
    playOneShot: vi.fn(),
    getOneShotProgress: vi.fn(),
    getMusicProgress: vi.fn(),
    stopMusic: vi.fn(),
    setMusicEndHandler: vi.fn(),
    setMusicNearEndHandler: vi.fn(),
    setOneShotEndHandler: vi.fn(),
  },
}));

vi.mock('@/ambient-sound/utils/packManager', () => mocks.packManager);
vi.mock('@/ambient-sound/utils/audioEngine', () => ({
  audioEngine: mocks.audioEngine,
}));

import {
  resetPlaybackCoordinator,
  setJukeboxPauseHandler,
} from '@/utils/playbackCoordinator';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import { normalizeSoundPack } from '@/ambient-sound/utils/packData';
import type { SoundPackManifest } from '@/ambient-sound/types';

const forestManifest: SoundPackManifest = {
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
        {
          id: 'light',
          name: 'Light',
          samples: ['ambiences/light.mp3', 'ambiences/light-2.mp3'],
        },
        {
          id: 'heavy',
          name: 'Heavy',
          samples: ['ambiences/heavy.mp3'],
        },
      ],
    },
  ],
  oneShots: [
    {
      id: 'thunder',
      name: 'Thunder',
      icon: 'ra-bell',
      samples: ['one-shots/thunder.mp3'],
      category: 'weather',
      volume: 80,
    },
  ],
  scenes: [
    {
      id: 'tavern',
      name: 'Tavern',
      intensity: 70,
      ambiences: [{ ambienceId: 'rain', variationId: 'light', volume: 40 }],
      musicPresets: [
        {
          id: 'explore',
          name: 'Explore',
          files: ['scenes/tavern/music/theme.mp3'],
        },
        {
          id: 'combat',
          name: 'Combat',
          files: ['scenes/tavern/music/combat.mp3'],
        },
        {
          id: 'victory',
          name: 'Victory',
          files: ['scenes/tavern/music/victory.mp3'],
          mode: 'temporary',
        },
      ],
    },
  ],
};

const extraManifest: SoundPackManifest = {
  version: '2.0',
  id: 'extra',
  name: 'Extra',
  description: '',
  category: 'fantasy',
  defaultIntensity: 50,
  ambiences: [
    {
      id: 'plain',
      name: 'Plain',
      icon: 'ra-x',
      category: 'Other',
      loop: true,
      variations: [
        { id: 'default', name: 'Default', samples: ['ambiences/plain.mp3'] },
      ],
    },
    {
      id: 'norain',
      name: 'No rain',
      icon: 'ra-x',
      category: 'Other',
      loop: true,
      variations: [
        { id: 'default', name: 'Default', samples: ['ambiences/norain.mp3'] },
      ],
    },
    {
      id: 'nopreset',
      name: 'No preset',
      icon: 'ra-x',
      category: 'Other',
      loop: true,
      variations: [],
    },
  ],
  oneShots: [
    {
      id: 'ghost',
      name: 'Ghost',
      icon: 'ra-bell',
      samples: ['one-shots/ghost.mp3'],
      category: 'other',
      volume: 50,
    },
  ],
  scenes: [
    {
      id: 'empty',
      name: 'Empty',
      intensity: 50,
      ambiences: [{ ambienceId: 'nope', variationId: 'x', volume: 50 }],
      musicPresets: [],
    },
    {
      id: 'silentscene',
      name: 'Silent scene',
      intensity: 50,
      ambiences: [],
      musicPresets: [
        {
          id: 'lost',
          name: 'Lost',
          files: ['scenes/silentscene/music/gone.mp3'],
        },
      ],
    },
    {
      id: 'grotto',
      name: 'Grotto',
      intensity: 50,
      ambiences: [],
      musicPresets: [
        {
          id: 'calm',
          name: 'Calm',
          files: ['scenes/grotto/music/calm.mp3'],
        },
      ],
    },
    {
      id: 'tempo',
      name: 'Tempo',
      intensity: 50,
      ambiences: [],
      musicPresets: [
        {
          id: 'tense',
          name: 'Tense',
          files: ['scenes/tempo/music/tense.mp3'],
          mode: 'temporary',
        },
        {
          id: 'calm2',
          name: 'Calm 2',
          files: ['scenes/tempo/music/calm2.mp3'],
          mode: 'temporary',
        },
      ],
    },
  ],
};

const forest = normalizeSoundPack(forestManifest);
const extra = normalizeSoundPack(extraManifest);

const blobs: Record<string, Blob> = {
  'ambiences/light.mp3': new Blob(['light']),
  'ambiences/light-2.mp3': new Blob(['light2']),
  'ambiences/heavy.mp3': new Blob(['heavy']),
  'ambiences/plain.mp3': new Blob(['plain']),
  'one-shots/thunder.mp3': new Blob(['thunder']),
  'scenes/tavern/music/theme.mp3': new Blob(['theme']),
  'scenes/tavern/music/combat.mp3': new Blob(['combat']),
  'scenes/tavern/music/victory.mp3': new Blob(['victory']),
  'scenes/grotto/music/calm.mp3': new Blob(['calm']),
  'scenes/tempo/music/tense.mp3': new Blob(['tense']),
  'scenes/tempo/music/calm2.mp3': new Blob(['calm2']),
};

// Deliberately missing: ambiences/norain.mp3, one-shots/ghost.mp3 and
// scenes/silentscene/music/gone.mp3.
const extraBlobs: Record<string, Blob> = { ...blobs };

function createStore() {
  setActivePinia(createPinia());
  return useAmbientSoundStore();
}

function currentEndHandler() {
  return mocks.audioEngine.setMusicEndHandler.mock.calls.at(-1)?.[0];
}

describe('ambient sound store additional branches', () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks.packManager)) fn.mockReset();
    for (const fn of Object.values(mocks.audioEngine)) fn.mockReset();
    mocks.packManager.getStoredPacks.mockResolvedValue([forest, extra]);
    mocks.packManager.getPackAudioBlobs.mockImplementation(
      async (id: string) => (id === 'extra' ? extraBlobs : blobs),
    );
    mocks.packManager.deletePack.mockResolvedValue(undefined);
    mocks.packManager.importSoundPack.mockResolvedValue(extra);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob: Blob) => `blob:${blob.type}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    (localStorage.getItem as any).mockReturnValue(null);
    (localStorage.setItem as any).mockClear();
  });

  afterEach(() => {
    resetPlaybackCoordinator();
    vi.restoreAllMocks();
    (localStorage.getItem as any).mockReset();
    (localStorage.setItem as any).mockReset();
  });

  it('loads stored scene links and drops obsolete module links', async () => {
    const rawLinks = [
      {
        id: 'keep',
        packageId: 'forest',
        sceneId: 'tavern',
        entityType: 'location',
        entityId: 'loc-1',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'drop',
        packageId: 'forest',
        sceneId: 'tavern',
        entityType: 'module',
        entityId: 'mod-1',
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    (localStorage.getItem as any).mockReturnValue(JSON.stringify(rawLinks));

    const store = createStore();

    expect(store.sceneLinks).toHaveLength(1);
    expect(store.sceneLinks[0].id).toBe('keep');
    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('returns null when the active scene key no longer exists', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    store.activeSceneKey = 'forest::missing';
    expect(store.activeScene).toBeNull();
  });

  it('skips missing audio blobs and one-shot samples while loading a pack', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    await store.playScene('extra', 'silentscene');

    // Missing ambience, one-shot and music blobs are skipped without throwing.
    expect(mocks.audioEngine.loadOneShot).not.toHaveBeenCalledWith(
      'oneShot:extra:ghost',
      expect.anything(),
      expect.anything(),
    );
    expect(mocks.audioEngine.loadMusic).not.toHaveBeenCalled();
    expect(store.isPlaying).toBe(true);
  });

  it('ignores invalid variations and missing sample urls', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    await store.toggleAmbience('extra', 'nopreset');
    await store.toggleAmbience('extra', 'norain');

    expect(store.activeLayers.has('extra:nopreset')).toBe(false);
    expect(store.activeLayers.has('extra:norain')).toBe(false);
  });

  it('falls back to a default volume when an ambience has no default', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    await store.toggleAmbience('extra', 'plain');
    expect(store.activeLayers.get('extra:plain')?.volume).toBe(0.5);

    await store.previewAmbience('extra', 'plain');
    expect(mocks.audioEngine.playLayer).toHaveBeenLastCalledWith(
      'preview:extra:plain',
      0.5,
    );
  });

  it('returns early from the music-end handler when nothing is active', async () => {
    const store = createStore();
    const handler = currentEndHandler();

    expect(handler).toBeTypeOf('function');
    handler();

    expect(store.isPlaying).toBe(false);
    expect(mocks.audioEngine.stopMusic).not.toHaveBeenCalled();
  });

  it('does not restart an active scene unless playback was paused', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    await store.playScene('forest', 'tavern');
    await store.playScene('forest', 'tavern');
    expect(store.isPlaying).toBe(true);

    store.pause();
    await store.playScene('forest', 'tavern');
    expect(store.isPlaying).toBe(true);
  });

  it('handles scenes without presets or with missing ambience references', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    await store.playScene('extra', 'empty');

    expect(store.activeMusicPresetId).toBeNull();
    expect(store.musicEnabled).toBe(false);
    expect(store.activeLayers.size).toBe(0);
    expect(mocks.audioEngine.stopMusic).toHaveBeenCalledWith(false);
  });

  it('handles music presets that are missing from the active scene', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    await store.playScene('forest', 'tavern');

    store.activeMusicPresetId = 'missing';
    store.setMusicEnabled(true);

    expect(mocks.audioEngine.stopMusic).toHaveBeenCalledWith(false);
  });

  it('switches music inside the same scene and from another active scene', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    await store.playScene('forest', 'tavern');
    await store.playSceneMusic('forest', 'tavern', 'explore');
    expect(store.activeMusicPresetId).toBe('explore');

    mocks.audioEngine.stopAll.mockClear();
    await store.playSceneMusic('extra', 'grotto', 'calm');

    expect(store.activeSceneKey).toBe('extra::grotto');
    expect(store.activeMusicPresetId).toBe('calm');
    expect(mocks.audioEngine.stopAll).toHaveBeenCalled();
  });

  it('ignores sample selection for layers whose pack vanished', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    store.activeLayers.set('ghost:rain', {
      layerId: 'rain',
      variationId: 'heavy',
      sampleIndex: 0,
      volume: 0.5,
      isPlaying: true,
    });
    await store.selectAmbienceSample('ghost', 'rain', 'light', 0);

    expect(store.activeLayers.has('ghost:rain')).toBe(true);
  });

  it('skips retuning layers that already use the variation or lost their pack', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    await store.toggleAmbience('forest', 'rain');
    await store.retuneAmbienceVariation('light');
    expect(store.activeLayers.get('forest:rain')?.variationId).toBe('light');

    store.activeLayers.set('ghost:rain', {
      layerId: 'rain',
      variationId: 'light',
      sampleIndex: 0,
      volume: 0.5,
      isPlaying: true,
    });
    await store.retuneAmbienceVariation('heavy');
    expect(store.activeLayers.get('ghost:rain')?.variationId).toBe('light');
  });

  it('ignores variation changes for layers whose pack vanished', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    store.activeLayers.set('ghost:rain', {
      layerId: 'rain',
      variationId: 'light',
      sampleIndex: 0,
      volume: 0.5,
      isPlaying: true,
    });
    await store.setAmbienceVariation('ghost', 'rain', 'heavy');

    expect(store.activeLayers.get('ghost:rain')?.variationId).toBe('light');
  });

  it('only updates music volume while playing and with music enabled', async () => {
    const store = createStore();

    store.setIntensity(80);
    expect(mocks.audioEngine.setMusicVolume).not.toHaveBeenCalled();

    await store.loadStoredPacks();
    await store.playScene('forest', 'tavern');
    store.setMusicPreset(null);
    mocks.audioEngine.setMusicVolume.mockClear();
    store.setIntensity(80);
    expect(mocks.audioEngine.setMusicVolume).not.toHaveBeenCalled();
  });

  it('keeps the scene active when music is still configured', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    await store.playScene('forest', 'tavern');
    expect(store.activeLayers.size).toBe(1);

    await store.toggleAmbience('forest', 'rain');

    expect(store.activeLayers.size).toBe(0);
    expect(store.isPlaying).toBe(true);
    expect(store.activeSceneKey).toBe('forest::tavern');
  });

  it('restores the first preset when music is enabled without one', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    await store.selectAmbienceSample('forest', 'rain', 'light', 0, 'tavern');
    expect(store.activeMusicPresetId).toBeNull();

    store.setMusicEnabled(true);

    expect(store.activeMusicPresetId).toBe('explore');
    expect(mocks.audioEngine.loadMusic).toHaveBeenCalledWith(
      'forest::tavern::explore',
      'blob:',
      false,
      ['mp3'],
      true,
    );
  });

  it('handles enabling music on a scene without presets', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    await store.selectAmbienceSample('extra', 'plain', 'default', 0, 'empty');
    expect(store.activeSceneKey).toBe('extra::empty');

    store.setMusicEnabled(true);

    expect(store.activeMusicPresetId).toBeNull();
  });

  it('tracks whether a temporary preset has a previous non-temporary one', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    await store.playScene('forest', 'tavern');
    store.setMusicPreset('victory');
    expect(store.activeMusicPresetId).toBe('victory');

    await store.playScene('extra', 'tempo');
    expect(store.activeMusicPresetId).toBe('tense');
    store.setMusicPreset('calm2');
    expect(store.activeMusicPresetId).toBe('calm2');

    // Switching from no preset clears the previous temporary preset pointer.
    store.setMusicPreset(null);
    store.setMusicPreset('calm2');
    expect(store.activeMusicPresetId).toBe('calm2');
  });

  it('reports missing one-shots as not playing', () => {
    const store = createStore();
    expect(store.isOneShotPlaying('forest', 'missing')).toBe(false);
    expect(store.oneShotPlayCount('forest', 'missing')).toBe(0);
  });

  it('replaces an existing preview and ignores unavailable previews', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    await store.previewAmbience('forest', 'rain', 'light');
    await store.previewAmbience('forest', 'rain', 'heavy');
    expect(mocks.audioEngine.stopLayer).toHaveBeenCalledWith(
      'preview:forest:rain',
      false,
    );

    await store.previewAmbience('extra', 'nopreset');
    await store.previewAmbience('extra', 'norain');

    store.stopPreview();
    expect(mocks.audioEngine.stopLayer).toHaveBeenCalledWith(
      'preview:forest:rain',
      false,
    );
  });

  it('stops previews that were never started', () => {
    const store = createStore();
    store.stopPreview();
    expect(mocks.audioEngine.stopLayer).not.toHaveBeenCalled();
  });

  it('clears a selected pack that is no longer stored', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    store.selectPack('extra');

    mocks.packManager.getStoredPacks.mockResolvedValueOnce([forest]);
    await store.loadStoredPacks();

    expect(store.selectedPackId).toBeNull();
  });

  it('clears only the deleted pack audio and leaves another active scene alone', async () => {
    const store = createStore();
    await store.loadStoredPacks();

    await store.playScene('forest', 'tavern');
    await store.playScene('extra', 'grotto');
    expect(store.activeSceneKey).toBe('extra::grotto');

    mocks.audioEngine.stopAll.mockClear();
    await store.deletePack('forest');

    expect(store.activeSceneKey).toBe('extra::grotto');
    expect(mocks.audioEngine.stopAll).not.toHaveBeenCalled();
    expect(mocks.packManager.deletePack).toHaveBeenCalledWith('forest');
  });

  it('plays scenes without pausing the jukebox through optional handlers', async () => {
    const pauseJukebox = vi.fn();
    setJukeboxPauseHandler(pauseJukebox);
    const store = createStore();
    await store.loadStoredPacks();

    await store.playScene('extra', 'grotto');

    expect(pauseJukebox).toHaveBeenCalled();
  });

  it('fades temporary scene music when no previous preset exists', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    await store.playScene('extra', 'tempo');
    expect(store.activeMusicPresetId).toBe('tense');

    const handler = currentEndHandler();
    handler();

    expect(store.activeMusicPresetId).toBeNull();
    expect(store.musicEnabled).toBe(false);
    expect(store.isPlaying).toBe(false);
    expect(mocks.audioEngine.stopMusic).toHaveBeenCalledWith(true);
  });

  it('restarts the same temporary preset without marking itself as previous', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    await store.playScene('forest', 'tavern');

    store.setMusicPreset('victory');
    expect(store.activeMusicPresetId).toBe('victory');
    store.setMusicEnabled(false);
    expect(store.activeMusicPresetId).toBe('victory');

    store.setMusicPreset('victory');

    expect(store.activeMusicPresetId).toBe('victory');
    expect(store.musicEnabled).toBe(true);
  });

  it('ignores end events for one-shots that are not tracked', () => {
    const store = createStore();
    const handler =
      mocks.audioEngine.setOneShotEndHandler.mock.calls.at(-1)?.[0];

    handler('oneShot:missing:sound');
    expect(store.isOneShotPlaying('missing', 'sound')).toBe(false);
  });

  it('resolves a previous temporary preset against the scene presets', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    await store.playScene('forest', 'tavern');

    store.setMusicPreset('victory');
    const handler = currentEndHandler();
    handler();

    expect(store.activeMusicPresetId).toBe('explore');
    expect(mocks.audioEngine.loadMusic).toHaveBeenLastCalledWith(
      'forest::tavern::explore',
      'blob:',
      false,
      ['mp3'],
      true,
    );
  });

  it('falls back when the previous temporary preset no longer exists', async () => {
    const store = createStore();
    await store.loadStoredPacks();
    const scene = forest.scenes[0];
    const originalPresets = scene.musicPresets;

    try {
      await store.playScene('forest', 'tavern');
      store.setMusicPreset('victory');

      // Remove the preset that was recorded as the previous one.
      scene.musicPresets = originalPresets.filter(
        (preset) => preset.id !== 'explore',
      );

      const handler = currentEndHandler();
      handler();

      expect(store.activeMusicPresetId).toBeNull();
      expect(store.musicEnabled).toBe(false);
      expect(mocks.audioEngine.stopMusic).toHaveBeenCalledWith(true);
    } finally {
      scene.musicPresets = originalPresets;
    }
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  allScenes: [] as any[],
  activeSceneKey: 'pack-1::scene-1',
  activeScene: null as any,
  activeLayers: new Map<string, any>(),
  activeMusicPresetId: 'explore' as string | null,
  musicEnabled: true,
  isPlaying: true,
  intensity: 55,
  togglePlayPause: vi.fn(),
  playScene: vi.fn(),
  setMusicPreset: vi.fn(),
  playOneShot: vi.fn(),
  isOneShotPlaying: vi.fn(() => false),
  toggleAmbience: vi.fn(),
  setAmbienceVariation: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import ScenePlayerDialog from '@/ambient-sound/components/ScenePlayerDialog.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

describe('ScenePlayerDialog', () => {
  beforeEach(() => {
    for (const fn of [
      storeMock.togglePlayPause,
      storeMock.playScene,
      storeMock.setMusicPreset,
      storeMock.playOneShot,
      storeMock.isOneShotPlaying,
      storeMock.toggleAmbience,
      storeMock.setAmbienceVariation,
    ]) {
      fn.mockReset();
    }
    storeMock.activeMusicPresetId = 'explore';
    storeMock.musicEnabled = true;
    storeMock.isPlaying = true;
    storeMock.isOneShotPlaying.mockReturnValue(false);
    storeMock.activeLayers = new Map([
      ['pack-1:rain', { variationId: 'light', volume: 0.4 }],
    ]);
    storeMock.allScenes = [
      {
        pack: {
          id: 'pack-1',
          name: 'Forest',
          ambiences: [
            {
              id: 'rain',
              name: 'Rain',
              icon: '🌧️',
              category: 'Weather',
              defaultVolume: 40,
              loop: true,
              variations: [
                { id: 'light', name: 'Light', samples: ['a.mp3'] },
                { id: 'heavy', name: 'Heavy', samples: ['b.mp3'] },
              ],
            },
          ],
          oneShots: [
            {
              id: 'thunder',
              name: 'Thunder',
              icon: '⛈️',
              category: 'weather',
              file: 't.mp3',
              volume: 80,
            },
          ],
        },
        scene: {
          id: 'scene-1',
          name: 'Tavern Evening',
          icon: '🍺',
          ambiences: [{ ambienceId: 'rain', variationId: 'light', volume: 40 }],
          oneShotIds: ['thunder'],
          musicPresets: [
            { id: 'explore', name: 'Explore', files: ['e.mp3'] },
            { id: 'combat', name: 'Combat', files: ['c.mp3'] },
          ],
        },
      },
    ];
    storeMock.activeScene = storeMock.allScenes[0];
  });

  it('shows scene music presets and controls global playback', async () => {
    const wrapper = mount(ScenePlayerDialog, {
      props: { isOpen: true, packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs: quasarStubs },
    });

    expect(wrapper.text()).toContain('Tavern Evening');
    expect(wrapper.text()).toContain('Off');
    expect(wrapper.text()).toContain('Explore');
    expect(wrapper.text()).toContain('Combat');

    const pause = wrapper.find('button[aria-label="Pause"]');
    await pause.trigger('click');
    expect(storeMock.togglePlayPause).toHaveBeenCalled();

    const off = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Off');
    await off!.trigger('click');
    expect(storeMock.setMusicPreset).toHaveBeenCalledWith(null);

    const combat = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Combat');
    await combat!.trigger('click');
    expect(storeMock.setMusicPreset).toHaveBeenCalledWith('combat');
    wrapper.unmount();
  });

  it('opens an inactive scene without starting playback', async () => {
    storeMock.activeSceneKey = 'other::scene';
    storeMock.isPlaying = false;
    const wrapper = mount(ScenePlayerDialog, {
      props: { isOpen: true, packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs: quasarStubs },
    });

    expect(storeMock.playScene).not.toHaveBeenCalled();

    await wrapper.find('button[aria-label="Play"]').trigger('click');
    expect(storeMock.playScene).toHaveBeenCalledWith('pack-1', 'scene-1');
    wrapper.unmount();
  });

  it('renders nothing for a missing scene', () => {
    storeMock.allScenes = [];
    const missing = mount(ScenePlayerDialog, {
      props: { isOpen: true, packId: 'pack-1', sceneId: 'missing' },
      global: { stubs: quasarStubs },
    });
    expect(missing.find('.scene-player-card').exists()).toBe(false);
    missing.unmount();
  });

  it('supports stopping the active variant and starting an inactive one', async () => {
    const wrapper = mount(ScenePlayerDialog, {
      props: { isOpen: true, packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs: quasarStubs },
    });

    const light = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Light');
    await light!.trigger('click');
    expect(storeMock.toggleAmbience).toHaveBeenCalledWith('pack-1', 'rain');

    storeMock.activeLayers = new Map();
    const heavy = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Heavy');
    await heavy!.trigger('click');
    expect(storeMock.toggleAmbience).toHaveBeenLastCalledWith(
      'pack-1',
      'rain',
      'heavy',
    );
    wrapper.unmount();
  });

  it('shows empty ambience and one-shot states', async () => {
    const emptyScene = {
      ...storeMock.allScenes[0],
      scene: {
        ...storeMock.allScenes[0].scene,
        ambiences: [],
        oneShotIds: [],
        musicPresets: [],
      },
    };
    storeMock.allScenes = [emptyScene];
    storeMock.activeScene = emptyScene;
    storeMock.musicEnabled = false;
    storeMock.activeMusicPresetId = null;

    const wrapper = mount(ScenePlayerDialog, {
      props: { isOpen: true, packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs: quasarStubs },
    });
    expect(wrapper.text()).toContain('No ambiences in this scene');
    expect(wrapper.text()).toContain('Off');

    const oneShotsTab = wrapper
      .findAll('button')
      .find((button) => button.text() === 'One-shots');
    await oneShotsTab!.trigger('click');
    expect(wrapper.text()).toContain('No one-shots in this scene');
    wrapper.unmount();
  });

  it('switches ambience variants and plays one-shots', async () => {
    const wrapper = mount(ScenePlayerDialog, {
      props: { isOpen: true, packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs: quasarStubs },
    });

    const heavy = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Heavy');
    await heavy!.trigger('click');
    expect(storeMock.setAmbienceVariation).toHaveBeenCalledWith(
      'pack-1',
      'rain',
      'heavy',
    );

    const oneShotsTab = wrapper
      .findAll('button')
      .find((button) => button.text() === 'One-shots');
    await oneShotsTab!.trigger('click');
    const thunder = wrapper
      .findAll('.one-shot-card')
      .find((card) => card.text().includes('Thunder'));
    await thunder!.trigger('click');
    expect(storeMock.playOneShot).toHaveBeenCalledWith('pack-1', 'thunder');
    wrapper.unmount();
  });

  it('highlights one-shot cards while they are playing', async () => {
    storeMock.isOneShotPlaying.mockReturnValue(true);
    const wrapper = mount(ScenePlayerDialog, {
      props: { isOpen: true, packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs: quasarStubs },
    });

    const oneShotsTab = wrapper
      .findAll('button')
      .find((button) => button.text() === 'One-shots');
    await oneShotsTab!.trigger('click');
    const thunder = wrapper
      .findAll('.one-shot-card')
      .find((card) => card.text().includes('Thunder'));
    expect(thunder!.classes()).toContain('is-playing');
    wrapper.unmount();
  });
});

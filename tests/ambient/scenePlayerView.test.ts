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
  hasActiveLayers: true,
  intensity: 55,
  playScene: vi.fn(),
  setMusicPreset: vi.fn(),
  playOneShot: vi.fn(),
  isOneShotPlaying: vi.fn(() => false),
  oneShotProgress: vi.fn(() => 0),
  musicProgress: vi.fn(() => 0),
  toggleAmbience: vi.fn(),
  setAmbienceVariation: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import ScenePlayerView from '@/ambient-sound/components/ScenePlayerView.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

describe('ScenePlayerView', () => {
  beforeEach(() => {
    for (const fn of [
      storeMock.playScene,
      storeMock.setMusicPreset,
      storeMock.playOneShot,
      storeMock.isOneShotPlaying,
      storeMock.oneShotProgress,
      storeMock.musicProgress,
      storeMock.toggleAmbience,
      storeMock.setAmbienceVariation,
    ]) {
      fn.mockReset();
    }
    storeMock.activeMusicPresetId = 'explore';
    storeMock.musicEnabled = true;
    storeMock.isPlaying = true;
    storeMock.hasActiveLayers = true;
    storeMock.activeSceneKey = 'pack-1::scene-1';
    storeMock.isOneShotPlaying.mockReturnValue(false);
    storeMock.oneShotProgress.mockReturnValue(0);
    storeMock.musicProgress.mockReturnValue(0);
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
              icon: 'fa-solid:cloud-rain',
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
              icon: 'fa-solid:cloud-bolt',
              category: 'weather',
              file: 't.mp3',
              volume: 80,
            },
          ],
        },
        scene: {
          id: 'scene-1',
          name: 'Tavern Evening',
          ambiences: [{ ambienceId: 'rain', variationId: 'light', volume: 40 }],
          oneShotIds: ['thunder'],
          musicPresets: [
            { id: 'explore', name: 'Explore', files: ['e.mp3'] },
            { id: 'combat', name: 'Combat', files: ['c.mp3'] },
            {
              id: 'victory',
              name: 'Victory',
              files: ['v.mp3'],
              mode: 'temporary',
            },
          ],
        },
      },
    ];
    storeMock.activeScene = storeMock.allScenes[0];
  });

  it('emits back from the header button', async () => {
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs: quasarStubs },
    });

    const back = wrapper.find('button[aria-label="Back"]');
    expect(back.exists()).toBe(true);
    await back.trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
    wrapper.unmount();
  });

  it('shows mood knobs and switches the active preset', async () => {
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs: quasarStubs },
    });

    expect(wrapper.text()).toContain('Tavern Evening');
    expect(wrapper.text()).toContain('Off');
    expect(wrapper.text()).toContain('Explore');
    expect(wrapper.text()).toContain('Combat');
    expect(
      wrapper.find('.scene-player-view button[aria-label="Play"]').exists(),
    ).toBe(false);

    const knob = (label: string) =>
      wrapper.findAll('.mood-knob').find((entry) => entry.text() === label);
    await knob('Off')!.find('.mood-knob-control').trigger('click');
    expect(storeMock.setMusicPreset).toHaveBeenCalledWith(null);

    await knob('Combat')!.find('.mood-knob-control').trigger('click');
    expect(storeMock.setMusicPreset).toHaveBeenCalledWith('combat');
    wrapper.unmount();
  });

  it('does not start playback on open and starts from a mood knob', async () => {
    storeMock.activeScene = null;
    storeMock.activeLayers = new Map();
    storeMock.hasActiveLayers = false;
    storeMock.activeSceneKey = 'other::scene';
    storeMock.isPlaying = false;
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs: quasarStubs },
    });

    expect(storeMock.playScene).not.toHaveBeenCalled();

    const explore = wrapper
      .findAll('.mood-knob')
      .find((entry) => entry.text() === 'Explore');
    await explore!.find('.mood-knob-control').trigger('click');
    expect(storeMock.playScene).toHaveBeenCalledWith('pack-1', 'scene-1');
    expect(storeMock.setMusicPreset).toHaveBeenCalledWith('explore');
    wrapper.unmount();
  });

  it('disables scene music and ambience controls while playback is paused', async () => {
    storeMock.isPlaying = false;
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs: quasarStubs },
    });

    const knob = (label: string) =>
      wrapper.findAll('.mood-knob').find((entry) => entry.text() === label);
    expect(
      knob('Off')!.find('.mood-knob-control').attributes('disabled'),
    ).toBeDefined();
    expect(
      knob('Explore')!.find('.mood-knob-control').attributes('disabled'),
    ).toBeDefined();
    const light = wrapper
      .findAll('button')
      .find((entry) => entry.text() === 'Light');
    expect(light!.attributes('disabled')).toBeDefined();

    const oneShotsTab = wrapper
      .findAll('button')
      .find((entry) => entry.text() === 'One-shots');
    await oneShotsTab!.trigger('click');
    const thunder = wrapper
      .findAll('.one-shot-control')
      .find((card) => card.text().includes('Thunder'));
    expect(thunder!.attributes('disabled')).toBeUndefined();
    await thunder!.find('.one-shot-knob').trigger('click');
    expect(storeMock.playOneShot).toHaveBeenCalledWith('pack-1', 'thunder');
    wrapper.unmount();
  });

  it('shows an empty state for a missing scene', () => {
    storeMock.allScenes = [];
    const missing = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'missing' },
      global: { stubs: quasarStubs },
    });
    expect(missing.find('.scene-player-card').exists()).toBe(false);
    expect(missing.text()).toContain('No scenes yet');
    expect(missing.find('button[aria-label="Back"]').exists()).toBe(true);
    missing.unmount();
  });

  it('supports stopping the active variant and starting an inactive one', async () => {
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
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

    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
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
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
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
      .findAll('.one-shot-control')
      .find((card) => card.text().includes('Thunder'));
    await thunder!.find('.one-shot-knob').trigger('click');
    expect(storeMock.playOneShot).toHaveBeenCalledWith('pack-1', 'thunder');
    wrapper.unmount();
  });

  it('highlights one-shot cards while they are playing', async () => {
    storeMock.isOneShotPlaying.mockReturnValue(true);
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs: quasarStubs },
    });

    const oneShotsTab = wrapper
      .findAll('button')
      .find((button) => button.text() === 'One-shots');
    await oneShotsTab!.trigger('click');
    const thunder = wrapper
      .findAll('.one-shot-control')
      .find((card) => card.text().includes('Thunder'));
    expect(thunder!.classes()).toContain('is-playing');
    wrapper.unmount();
  });
});

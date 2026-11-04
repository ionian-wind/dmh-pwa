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
  masterVolume: 50,
  moodVolume: 100,
  ambienceVolume: 100,
  oneShotVolume: 100,
  togglePlayPause: vi.fn(),
  setMasterVolume: vi.fn(),
  setMoodVolume: vi.fn(),
  setAmbienceVolume: vi.fn(),
  setOneShotVolume: vi.fn(),
  playScene: vi.fn(),
  playSceneMusic: vi.fn(),
  setMusicPreset: vi.fn(),
  playOneShot: vi.fn(),
  isOneShotPlaying: vi.fn(() => false),
  oneShotPlayCount: vi.fn(() => 0),
  oneShotProgress: vi.fn(() => 0),
  musicProgress: vi.fn(() => 0),
  toggleAmbience: vi.fn(),
  setAmbienceVariation: vi.fn(),
  selectAmbienceSample: vi.fn(),
  retuneAmbienceVariation: vi.fn(),
  linksForScene: vi.fn(() => []),
  addSceneLink: vi.fn(),
  removeSceneLink: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import ScenePlayerView from '@/ambient-sound/components/ScenePlayerView.vue';
import { EntityTabsStub } from '../helpers/entityTabsStub';
import { quasarStubs } from '../helpers/quasar-stubs';

const stubs = { ...quasarStubs, EntityTabs: EntityTabsStub };

describe('ScenePlayerView', () => {
  beforeEach(() => {
    for (const fn of [
      storeMock.togglePlayPause,
      storeMock.setMasterVolume,
      storeMock.setMoodVolume,
      storeMock.setAmbienceVolume,
      storeMock.setOneShotVolume,
      storeMock.playScene,
      storeMock.playSceneMusic,
      storeMock.setMusicPreset,
      storeMock.playOneShot,
      storeMock.isOneShotPlaying,
      storeMock.oneShotPlayCount,
      storeMock.oneShotProgress,
      storeMock.musicProgress,
      storeMock.toggleAmbience,
      storeMock.setAmbienceVariation,
      storeMock.selectAmbienceSample,
      storeMock.retuneAmbienceVariation,
      storeMock.linksForScene,
      storeMock.addSceneLink,
      storeMock.removeSceneLink,
    ]) {
      fn.mockReset();
    }
    storeMock.activeMusicPresetId = 'explore';
    storeMock.musicEnabled = true;
    storeMock.isPlaying = true;
    storeMock.hasActiveLayers = true;
    storeMock.masterVolume = 50;
    storeMock.moodVolume = 100;
    storeMock.ambienceVolume = 100;
    storeMock.oneShotVolume = 100;
    storeMock.activeSceneKey = 'pack-1::scene-1';
    storeMock.isOneShotPlaying.mockReturnValue(false);
    storeMock.oneShotPlayCount.mockReturnValue(0);
    storeMock.oneShotProgress.mockReturnValue(0);
    storeMock.musicProgress.mockReturnValue(0);
    storeMock.linksForScene.mockReturnValue([]);
    storeMock.activeLayers = new Map([
      ['pack-1:rain', { variationId: 'light', sampleIndex: 0, volume: 0.4 }],
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
              samples: ['t.mp3'],
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
      global: { stubs },
    });

    const back = wrapper.find('button[aria-label="Back"]');
    expect(back.exists()).toBe(true);
    await back.trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
    wrapper.unmount();
  });

  it('places transport and volume in the title line', async () => {
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
    });

    const header = wrapper.find('.scene-view-header');
    const pause = header.find('button[aria-label="Pause"]');
    expect(pause.exists()).toBe(true);
    await pause.trigger('click');
    expect(storeMock.togglePlayPause).toHaveBeenCalled();

    await header.find('.volume-button').trigger('click');
    expect(wrapper.find('.volume-dialog-card').exists()).toBe(true);
    expect(wrapper.find('.intensity-slider').attributes('disable')).toBe(
      'false',
    );
    wrapper.unmount();
  });

  it('disables the header play button when no mood or ambience is active', () => {
    storeMock.activeScene = null;
    storeMock.hasActiveLayers = false;
    storeMock.isPlaying = true;
    storeMock.musicEnabled = false;
    storeMock.activeMusicPresetId = null;
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
    });

    const play = wrapper.find('.scene-view-header button[aria-label="Play"]');
    expect(play.attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('keeps the header play button enabled while active content is paused', () => {
    storeMock.activeScene = storeMock.allScenes[0];
    storeMock.hasActiveLayers = false;
    storeMock.isPlaying = false;
    storeMock.musicEnabled = true;
    storeMock.activeMusicPresetId = 'explore';
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
    });

    expect(
      wrapper
        .find('.scene-view-header button[aria-label="Play"]')
        .attributes('disabled'),
    ).toBeUndefined();
    expect(wrapper.find('.intensity-slider').attributes('disable')).toBe(
      'true',
    );
    wrapper.unmount();
  });

  it('shows the scene title and mood buttons', async () => {
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('Tavern Evening');
    expect(wrapper.text()).not.toContain('Forest');
    expect(wrapper.text()).toContain('Off');
    expect(wrapper.text()).toContain('Explore');
    expect(wrapper.text()).toContain('Combat');
    expect(
      wrapper.find('.scene-player-view button[aria-label="Play"]').exists(),
    ).toBe(false);

    const toggle = wrapper.findComponent(quasarStubs.QBtnToggle);
    expect(toggle.exists()).toBe(true);
    const options = toggle.props('options');
    expect(options).toHaveLength(4);
    expect(options[0]).toMatchObject({ value: null, label: 'Off' });
    expect(options[3]).toMatchObject({
      value: 'victory',
      slot: 'mood-temporary-0',
    });

    const knob = (label: string) =>
      wrapper.findAll('.mood-button').find((entry) => entry.text() === label);
    await knob('Off')!.trigger('click');
    expect(storeMock.setMusicPreset).toHaveBeenCalledWith(null);

    await knob('Combat')!.trigger('click');
    expect(storeMock.setMusicPreset).toHaveBeenCalledWith('combat');
    wrapper.unmount();
  });

  it('does not start playback on open and starts from a mood button', async () => {
    storeMock.activeScene = null;
    storeMock.activeLayers = new Map();
    storeMock.hasActiveLayers = false;
    storeMock.activeSceneKey = 'other::scene';
    storeMock.isPlaying = false;
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
    });

    expect(storeMock.playScene).not.toHaveBeenCalled();

    const explore = wrapper
      .findAll('.mood-button')
      .find((entry) => entry.text() === 'Explore');
    await explore!.trigger('click');
    expect(storeMock.playSceneMusic).toHaveBeenCalledWith(
      'pack-1',
      'scene-1',
      'explore',
    );
    expect(storeMock.playScene).not.toHaveBeenCalled();
    expect(storeMock.setMusicPreset).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('disables scene music and ambience controls while playback is paused', async () => {
    storeMock.isPlaying = false;
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
    });

    const knob = (label: string) =>
      wrapper.findAll('.mood-button').find((entry) => entry.text() === label);
    expect(knob('Off')!.attributes('disabled')).toBeDefined();
    expect(knob('Explore')!.attributes('disabled')).toBeDefined();
    const rainCard = wrapper
      .findAll('[data-stub="QCard"]')
      .find((card) => card.text().includes('Rain'));
    expect(rainCard!.findAll('button')[0].attributes('disabled')).toBeDefined();

    const oneShotsTab = wrapper
      .findAll('button')
      .find((entry) => entry.text() === 'One-shots');
    await oneShotsTab!.trigger('click');
    const thunder = wrapper
      .findAll('.one-shot-control')
      .find((card) => card.text().includes('Thunder'));
    expect(thunder!.attributes('disabled')).toBeUndefined();
    await thunder!.trigger('click');
    expect(storeMock.playOneShot).toHaveBeenCalledWith('pack-1', 'thunder');
    wrapper.unmount();
  });

  it('shows an empty state for a missing scene', () => {
    storeMock.allScenes = [];
    const missing = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'missing' },
      global: { stubs },
    });
    expect(missing.find('.scene-player-card').exists()).toBe(false);
    expect(missing.text()).toContain('No scenes yet');
    expect(missing.find('button[aria-label="Back"]').exists()).toBe(true);
    missing.unmount();
  });

  it('selects samples from the filtered variation', async () => {
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
    });

    const rainCard = () =>
      wrapper
        .findAll('[data-stub="QCard"]')
        .find((card) => card.text().includes('Rain'));
    expect(
      rainCard()!
        .findAll('button')
        .map((button) => button.text()),
    ).toEqual(['I']);

    await rainCard()!.findAll('button')[0].trigger('click');
    expect(storeMock.selectAmbienceSample).toHaveBeenCalledWith(
      'pack-1',
      'rain',
      'light',
      0,
      'scene-1',
    );

    wrapper
      .findComponent(quasarStubs.QSelect)
      .vm.$emit('update:modelValue', 'heavy');
    await wrapper.vm.$nextTick();
    expect(
      rainCard()!
        .findAll('button')
        .map((button) => button.text()),
    ).toEqual(['I']);
    await rainCard()!.findAll('button')[0].trigger('click');
    expect(storeMock.retuneAmbienceVariation).toHaveBeenCalledWith(
      'heavy',
      'pack-1',
    );
    expect(storeMock.selectAmbienceSample).toHaveBeenLastCalledWith(
      'pack-1',
      'rain',
      'heavy',
      0,
      'scene-1',
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
      global: { stubs },
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

  it('switches ambience variation and plays one-shots', async () => {
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
    });

    wrapper
      .findComponent(quasarStubs.QSelect)
      .vm.$emit('update:modelValue', 'heavy');
    await wrapper.vm.$nextTick();
    const rain = wrapper
      .findAll('[data-stub="QCard"]')
      .find((card) => card.text().includes('Rain'));
    await rain!.findAll('button')[0].trigger('click');
    expect(storeMock.selectAmbienceSample).toHaveBeenCalledWith(
      'pack-1',
      'rain',
      'heavy',
      0,
      'scene-1',
    );

    const oneShotsTab = wrapper
      .findAll('button')
      .find((button) => button.text() === 'One-shots');
    await oneShotsTab!.trigger('click');
    const thunder = wrapper
      .findAll('.one-shot-control')
      .find((card) => card.text().includes('Thunder'));
    await thunder!.trigger('click');
    expect(storeMock.playOneShot).toHaveBeenCalledWith('pack-1', 'thunder');
    wrapper.unmount();
  });

  it('highlights one-shot cards while they are playing', async () => {
    storeMock.isOneShotPlaying.mockReturnValue(true);
    const wrapper = mount(ScenePlayerView, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
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

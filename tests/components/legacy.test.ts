import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import JukeboxPlayerLegacy from '@/jukebox/components/_JukeboxPlayer.vue';
import PopoverPanelDemo from '@/components/common/PopoverPanelDemo.vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { JukeboxRepeatMode, useConfigStore } from '@/utils/configStore';

describe('legacy jukebox player', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    const player = useJukeboxPlayerStore();
    player.isPlaying = false;
    player.currentTrack = null;
  });

  it('renders artwork, track info and playback controls', () => {
    const player = useJukeboxPlayerStore();
    player.currentTrack = {
      id: 't1',
      title: 'Song',
      artist: 'Artist',
      fileId: 'f1',
      playlistIds: [],
      picture: 'https://example.com/art.png',
    } as any;

    const wrapper = mount(JukeboxPlayerLegacy, {
      props: { showArtwork: true },
    });

    expect(wrapper.text()).toContain('Song');
    expect(wrapper.text()).toContain('Artist');
    expect(wrapper.find('.track-artwork').attributes('style')).toContain(
      'https://example.com/art.png',
    );
    expect(wrapper.findAll('button').length).toBeGreaterThan(3);
    wrapper.unmount();
  });

  it('adds the animated background class while playing', async () => {
    const player = useJukeboxPlayerStore();
    player.isPlaying = true;
    player.currentTrack = {
      id: 't1',
      title: 'Song',
      palette: ['#112233', '#445566'],
      color: '#112233',
      fileId: 'f1',
      playlistIds: [],
    } as any;

    const wrapper = mount(JukeboxPlayerLegacy, {
      props: { animatedBackground: true },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).toContain('with-animated-bg');
    expect(wrapper.attributes('style')).toContain('--custom-gradient');
    wrapper.unmount();
  });

  it('handles volume hover, wheel and mute controls', async () => {
    const player = useJukeboxPlayerStore();
    player.setVolume(0.5);

    const wrapper = mount(JukeboxPlayerLegacy);
    const volumeControl = wrapper.find('.volume-control');
    await volumeControl.trigger('mouseenter');
    expect(wrapper.find('.volume-slider-container').isVisible()).toBe(true);

    await volumeControl.trigger('wheel', { deltaY: 100 });
    expect(player.volume).toBeCloseTo(0.4, 5);

    await volumeControl.trigger('mouseleave');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.volume-slider-container').exists()).toBe(true);

    await wrapper.find('.volume-button').trigger('click');
    expect(player.volume).toBe(0);
    await wrapper.find('.volume-button').trigger('click');
    expect(player.volume).toBeGreaterThan(0);

    wrapper.unmount();
  });

  it('toggles time display and forwards playback and seek actions', async () => {
    const player = useJukeboxPlayerStore();
    player.currentTrack = {
      id: 't1',
      title: 'Song',
      fileId: 'f1',
      playlistIds: [],
    } as any;
    player.duration = 100;
    player.currentTime = 10;
    player.queue = [player.currentTrack];
    player.queueIndex = 0;
    useConfigStore().jukeboxRepeatMode = JukeboxRepeatMode.list;
    const playNext = vi.spyOn(player, 'playNext');
    const playPrev = vi.spyOn(player, 'playPrev');
    const togglePlay = vi.spyOn(player, 'togglePlay');
    const seek = vi.spyOn(player, 'seek');

    const wrapper = mount(JukeboxPlayerLegacy);
    expect(wrapper.find('.time-current').text()).toBe('0:10');

    await wrapper.find('.time-current').trigger('click');
    expect(wrapper.find('.time-current').text()).toContain('-');

    await wrapper.find('.prev-track').trigger('click');
    await wrapper.find('.play-pause').trigger('click');
    await wrapper.find('.next-track').trigger('click');
    expect(playPrev).toHaveBeenCalled();
    expect(togglePlay).toHaveBeenCalled();
    expect(playNext).toHaveBeenCalled();

    wrapper.findComponent({ name: 'RangeSlider' }).vm.$emit(
      'update:modelValue',
      25,
    );
    expect(seek).toHaveBeenCalledWith(25);
    wrapper.unmount();
  });
});

describe('PopoverPanelDemo', () => {
  it('renders the demo sections and toggles a popover trigger', async () => {
    const wrapper = mount(PopoverPanelDemo);
    expect(wrapper.find('.popover-demo').exists()).toBe(true);
    expect(wrapper.text()).toContain('Popover');

    const trigger = wrapper.find('.hover-trigger');
    expect(trigger.exists()).toBe(true);
    await trigger.trigger('mouseenter');
    wrapper.unmount();
  });
});

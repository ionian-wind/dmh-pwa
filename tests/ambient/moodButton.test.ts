import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  isPlaying: true,
  musicProgress: vi.fn(() => 0),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import MoodButton from '@/ambient-sound/components/MoodButton.vue';
import ProgressButton from '@/components/common/ProgressButton.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

describe('MoodButton', () => {
  beforeEach(() => {
    storeMock.isPlaying = true;
    storeMock.musicProgress.mockReset();
    storeMock.musicProgress.mockReturnValue(0);
  });

  it('renders a regular button for Off and continual moods', async () => {
    const wrapper = mount(MoodButton, {
      props: { label: 'Combat', active: true },
      global: { stubs: quasarStubs },
    });

    const button = wrapper.find('.mood-button');
    expect(button.text()).toBe('Combat');
    expect(button.attributes('size')).toBe('lg');
    expect(button.attributes('aria-pressed')).toBe('true');
    expect(wrapper.findComponent(ProgressButton).exists()).toBe(false);

    await button.trigger('click');
    expect(wrapper.emitted('select')).toHaveLength(1);
    wrapper.unmount();
  });

  it('does not emit when disabled', async () => {
    const wrapper = mount(MoodButton, {
      props: { label: 'Off', disabled: true },
      global: { stubs: quasarStubs },
    });

    const button = wrapper.find('.mood-button');
    expect(button.attributes('disabled')).toBeDefined();
    await button.trigger('click');
    expect(wrapper.emitted('select')).toBeUndefined();
    wrapper.unmount();
  });

  it('uses the progress button for temporary moods', () => {
    const wrapper = mount(MoodButton, {
      props: { label: 'Victory', trackProgress: true },
      global: { stubs: quasarStubs },
    });

    const progress = wrapper.findComponent(ProgressButton);
    expect(progress.exists()).toBe(true);
    expect(progress.props('state')).toBe('none');
    expect(progress.props('percent')).toBe(0);
    expect(progress.attributes('size')).toBe('lg');
    expect(progress.text()).toContain('Victory');
    wrapper.unmount();
  });

  it('tracks temporary mood progress while active', async () => {
    let rafCallback: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafCallback = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    storeMock.musicProgress.mockReturnValue(0.5);

    const wrapper = mount(MoodButton, {
      props: { label: 'Victory', active: true, trackProgress: true },
      global: { stubs: quasarStubs },
    });

    expect(wrapper.findComponent(ProgressButton).props('state')).toBe(
      'playing',
    );
    expect(rafCallback).toBeTruthy();
    rafCallback!();
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent(ProgressButton).props('percent')).toBe(50);
    wrapper.unmount();
    vi.unstubAllGlobals();
  });

  it('does not show progress while paused', () => {
    storeMock.isPlaying = false;
    const wrapper = mount(MoodButton, {
      props: { label: 'Victory', active: true, trackProgress: true },
      global: { stubs: quasarStubs },
    });

    expect(wrapper.findComponent(ProgressButton).props('state')).toBe('none');
    wrapper.unmount();
  });
});

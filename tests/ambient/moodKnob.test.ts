import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  isPlaying: true,
  musicProgress: vi.fn(() => 0),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import MoodKnob from '@/ambient-sound/components/MoodKnob.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

describe('MoodKnob', () => {
  beforeEach(() => {
    storeMock.isPlaying = true;
    storeMock.musicProgress.mockReset();
    storeMock.musicProgress.mockReturnValue(0);
  });

  it('labels the knob and emits select on click', async () => {
    const wrapper = mount(MoodKnob, {
      props: { label: 'Combat' },
      global: { stubs: quasarStubs },
    });

    expect(wrapper.find('.mood-knob-label').text()).toBe('Combat');
    expect(wrapper.find('.mood-knob-control').attributes('aria-readonly')).toBe(
      'true',
    );
    await wrapper.find('.mood-knob-control').trigger('click');
    expect(wrapper.emitted('select')).toHaveLength(1);
    wrapper.unmount();
  });

  it('tracks temporary preset progress while active', async () => {
    let rafCallback: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafCallback = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    storeMock.musicProgress.mockReturnValue(0.5);

    const wrapper = mount(MoodKnob, {
      props: {
        label: 'Victory',
        active: true,
        trackProgress: true,
      },
      global: { stubs: quasarStubs },
    });

    expect(rafCallback).toBeTruthy();
    rafCallback!();
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: 'QKnob' }).props('modelValue')).toBe(
      50,
    );
    wrapper.unmount();
    vi.unstubAllGlobals();
  });

  it('does not track progress for continual presets or when disabled', () => {
    const wrapper = mount(MoodKnob, {
      props: { label: 'Explore', active: true },
      global: { stubs: quasarStubs },
    });

    expect(wrapper.findComponent({ name: 'QKnob' }).props('modelValue')).toBe(
      0,
    );
    expect(wrapper.find('.mood-knob-control').attributes('disabled')).toBe(
      undefined,
    );
    wrapper.unmount();

    const disabled = mount(MoodKnob, {
      props: { label: 'Combat', disabled: true },
      global: { stubs: quasarStubs },
    });
    expect(
      disabled.find('.mood-knob-control').attributes('disabled'),
    ).toBeDefined();
    disabled.unmount();
  });
});

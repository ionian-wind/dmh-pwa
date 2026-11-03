import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  isOneShotPlaying: vi.fn(() => false),
  oneShotProgress: vi.fn(() => 0),
  playOneShot: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import OneShotControl from '@/ambient-sound/components/OneShotControl.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

const thunder = {
  id: 'thunder',
  name: 'Thunder',
  icon: 'fa-solid:cloud-bolt',
  file: 'one-shots/thunder.mp3',
  category: 'weather' as const,
  volume: 80,
};

describe('OneShotControl', () => {
  beforeEach(() => {
    storeMock.isOneShotPlaying.mockReset();
    storeMock.isOneShotPlaying.mockReturnValue(false);
    storeMock.oneShotProgress.mockReset();
    storeMock.oneShotProgress.mockReturnValue(0);
    storeMock.playOneShot.mockReset();
  });

  it('renders the one-shot icon in the knob slot and plays on click', async () => {
    const wrapper = mount(OneShotControl, {
      props: { packId: 'pack-1', oneShot: thunder },
      global: { stubs: quasarStubs },
    });

    const knob = wrapper.find('.one-shot-knob');
    expect(knob.exists()).toBe(true);
    expect(knob.find('i').classes()).toContain('fa-cloud-bolt');

    await knob.trigger('click');
    expect(storeMock.playOneShot).toHaveBeenCalledWith('pack-1', 'thunder');
    wrapper.unmount();
  });

  it('falls back to timers when requestAnimationFrame is unavailable', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', undefined);
    vi.stubGlobal('cancelAnimationFrame', undefined);
    storeMock.isOneShotPlaying.mockReturnValue(true);
    storeMock.oneShotProgress.mockReturnValue(0.5);

    const wrapper = mount(OneShotControl, {
      props: { packId: 'pack-1', oneShot: thunder },
      global: { stubs: quasarStubs },
    });

    vi.advanceTimersByTime(100);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'QKnob' }).props('modelValue')).toBe(
      50,
    );

    wrapper.unmount();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows one-shot progress on the knob', async () => {
    let rafCallback: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafCallback = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    storeMock.isOneShotPlaying.mockReturnValue(true);
    storeMock.oneShotProgress.mockReturnValue(0.4);

    const wrapper = mount(OneShotControl, {
      props: { packId: 'pack-1', oneShot: thunder },
      global: { stubs: quasarStubs },
    });

    expect(rafCallback).toBeTruthy();
    rafCallback!();
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: 'QKnob' }).props('modelValue')).toBe(
      40,
    );
    wrapper.unmount();
    vi.unstubAllGlobals();
  });
});

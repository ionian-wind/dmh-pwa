import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  isOneShotPlaying: vi.fn(() => false),
  oneShotPlayCount: vi.fn(() => 0),
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
    storeMock.oneShotPlayCount.mockReset();
    storeMock.oneShotPlayCount.mockReturnValue(0);
    storeMock.oneShotProgress.mockReset();
    storeMock.oneShotProgress.mockReturnValue(0);
    storeMock.playOneShot.mockReset();
  });

  it('wraps the knob and label in a button and plays on click', async () => {
    const wrapper = mount(OneShotControl, {
      props: { packId: 'pack-1', oneShot: thunder },
      global: { stubs: quasarStubs },
    });

    const button = wrapper.find('.one-shot-control');
    expect(wrapper.findComponent(quasarStubs.QBtn).exists()).toBe(true);
    expect(button.element.tagName).toBe('BUTTON');
    expect(button.text()).toContain('Thunder');
    expect(button.find('.one-shot-knob').exists()).toBe(true);

    const knob = wrapper.find('.one-shot-knob');
    expect(knob.exists()).toBe(true);
    expect(knob.attributes('aria-readonly')).toBe('true');
    expect(knob.attributes('min')).toBe('0');
    expect(knob.attributes('max')).toBe('100');
    expect(knob.attributes('instant-feedback')).toBeDefined();
    expect(knob.attributes('no-pointer-events')).toBeDefined();
    expect(knob.find('i').classes()).toContain('fa-cloud-bolt');

    await button.trigger('click');
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

  it('shows a count when the same one-shot overlaps', () => {
    storeMock.isOneShotPlaying.mockReturnValue(true);
    storeMock.oneShotPlayCount.mockReturnValue(2);
    const wrapper = mount(OneShotControl, {
      props: { packId: 'pack-1', oneShot: thunder },
      global: { stubs: quasarStubs },
    });

    expect(wrapper.find('.one-shot-count').text()).toBe('×2');
    wrapper.unmount();
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

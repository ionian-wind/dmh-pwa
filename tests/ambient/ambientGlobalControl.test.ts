import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  activeScene: {
    pack: { id: 'pack-1', name: 'Forest' },
    scene: { id: 'scene-1', name: 'Tavern', icon: '🍺' },
  } as any,
  hasActiveLayers: true,
  activeLayers: new Map([['pack-1:rain', {}]]),
  masterVolume: 50,
  isPlaying: true,
  musicEnabled: true,
  intensity: 75,
  togglePlayPause: vi.fn(),
  setIntensity: vi.fn(),
  setMasterVolume: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import AmbientGlobalControl from '@/ambient-sound/components/AmbientGlobalControl.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

describe('AmbientGlobalControl', () => {
  beforeEach(() => {
    storeMock.activeScene = {
      pack: { id: 'pack-1', name: 'Forest' },
      scene: { id: 'scene-1', name: 'Tavern', icon: '🍺' },
    };
    storeMock.hasActiveLayers = true;
    storeMock.activeLayers = new Map([['pack-1:rain', {}]]);
    storeMock.masterVolume = 50;
    storeMock.isPlaying = true;
    storeMock.musicEnabled = true;
    storeMock.intensity = 75;
    for (const fn of [
      storeMock.togglePlayPause,
      storeMock.setIntensity,
      storeMock.setMasterVolume,
    ]) {
      fn.mockReset();
    }
  });

  it('uses the player layout for scene info and transport controls', async () => {
    const wrapper = mount(AmbientGlobalControl, {
      global: { stubs: quasarStubs },
    });

    expect(wrapper.text()).toContain('Tavern');
    expect(wrapper.text()).toContain('Forest');
    expect(wrapper.text()).not.toContain('Now playing');
    expect(wrapper.find('.ambient-artwork').exists()).toBe(false);
    expect(wrapper.find('.ambient-player-header').exists()).toBe(true);
    expect(wrapper.find('.ambient-player-controls').exists()).toBe(true);

    const pause = wrapper.find('button[aria-label="Pause"]');
    expect(pause.attributes('disabled')).toBeUndefined();
    await pause.trigger('click');
    expect(storeMock.togglePlayPause).toHaveBeenCalled();

    expect(wrapper.find('button[aria-label="Stop"]').exists()).toBe(false);

    expect(wrapper.find('button[aria-label="Turn music off"]').exists()).toBe(
      false,
    );
    wrapper.unmount();
  });

  it('adjusts intensity from the progress-bar slot', async () => {
    const wrapper = mount(AmbientGlobalControl, {
      global: { stubs: quasarStubs },
    });

    const sliders = wrapper.findAllComponents(quasarStubs.QSlider);
    expect(sliders).toHaveLength(2);
    expect(sliders[0].attributes('step')).toBe('0.25');
    expect(sliders[0].attributes('snap')).toBeDefined();
    expect(sliders[0].attributes('aria-label')).toBeTruthy();
    sliders[0].vm.$emit('update:modelValue', 0.75);
    expect(storeMock.setIntensity).toHaveBeenCalledWith(75);
    expect(wrapper.find('.intensity-value').text()).toBe('75%');
    wrapper.unmount();
  });

  it('adjusts master volume by wheel, slider and mute state', async () => {
    const wrapper = mount(AmbientGlobalControl, {
      global: { stubs: quasarStubs },
    });

    await wrapper.find('.volume-button').trigger('wheel', { deltaY: 100 });
    expect(storeMock.setMasterVolume).toHaveBeenCalledWith(40);

    const volumeSlider = wrapper.findAllComponents(quasarStubs.QSlider)[1];
    volumeSlider.vm.$emit('update:modelValue', 0.25);
    expect(storeMock.setMasterVolume).toHaveBeenCalledWith(25);

    storeMock.masterVolume = 0;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.volume-button').exists()).toBe(true);
    wrapper.unmount();
  });

  it('disables transport when nothing is active', () => {
    storeMock.activeScene = null;
    storeMock.hasActiveLayers = false;
    storeMock.activeLayers = new Map();
    storeMock.isPlaying = false;
    const wrapper = mount(AmbientGlobalControl, {
      global: { stubs: quasarStubs },
    });

    expect(
      wrapper.find('button[aria-label="Play"]').attributes('disabled'),
    ).toBeDefined();
    wrapper.unmount();
  });

  it('shows an ambient mix when no scene is selected', () => {
    storeMock.activeScene = null;
    storeMock.hasActiveLayers = true;
    const wrapper = mount(AmbientGlobalControl, {
      global: { stubs: quasarStubs },
    });
    expect(wrapper.text()).toContain('Ambient mix');
    expect(wrapper.text()).toContain('1 ambiences');
    wrapper.unmount();
  });
});

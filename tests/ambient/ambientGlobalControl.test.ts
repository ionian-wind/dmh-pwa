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
  intensity: 55,
  toggleMusic: vi.fn(),
  togglePlayPause: vi.fn(),
  stop: vi.fn(),
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
    storeMock.masterVolume = 50;
    storeMock.isPlaying = true;
    storeMock.musicEnabled = true;
    for (const fn of [
      storeMock.toggleMusic,
      storeMock.togglePlayPause,
      storeMock.stop,
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
    expect(wrapper.find('.ambient-player-header').exists()).toBe(true);
    expect(wrapper.find('.ambient-player-controls').exists()).toBe(true);

    await wrapper.find('button[aria-label="Pause"]').trigger('click');
    expect(storeMock.togglePlayPause).toHaveBeenCalled();

    await wrapper.find('button[aria-label="Stop"]').trigger('click');
    expect(storeMock.stop).toHaveBeenCalled();

    await wrapper.find('button[aria-label="Turn music off"]').trigger('click');
    expect(storeMock.toggleMusic).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('adjusts master volume by wheel, slider and mute state', async () => {
    const wrapper = mount(AmbientGlobalControl, {
      global: { stubs: quasarStubs },
    });

    await wrapper.find('.volume-button').trigger('wheel', { deltaY: 100 });
    expect(storeMock.setMasterVolume).toHaveBeenCalledWith(40);

    wrapper
      .findComponent(quasarStubs.QSlider)
      .vm.$emit('update:modelValue', 0.25);
    expect(storeMock.setMasterVolume).toHaveBeenCalledWith(25);

    storeMock.masterVolume = 0;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.volume-button').exists()).toBe(true);
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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  activeScene: { pack: { id: 'pack-1' }, scene: { id: 'scene-1' } } as any,
  hasActiveLayers: false,
  masterVolume: 50,
  isPlaying: true,
  intensity: 75,
  togglePlayPause: vi.fn(),
  setIntensity: vi.fn(),
  setMasterVolume: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import AmbientControls from '@/ambient-sound/components/AmbientControls.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

describe('AmbientControls', () => {
  beforeEach(() => {
    storeMock.activeScene = {
      pack: { id: 'pack-1' },
      scene: { id: 'scene-1' },
    };
    storeMock.hasActiveLayers = false;
    storeMock.masterVolume = 50;
    storeMock.isPlaying = true;
    storeMock.intensity = 75;
    for (const fn of [
      storeMock.togglePlayPause,
      storeMock.setIntensity,
      storeMock.setMasterVolume,
    ]) {
      fn.mockReset();
    }
  });

  it('toggles playback and disables transport when nothing is active', async () => {
    const wrapper = mount(AmbientControls, {
      global: { stubs: quasarStubs },
    });

    const pause = wrapper.find('button[aria-label="Pause"]');
    expect(pause.attributes('disabled')).toBeUndefined();
    await pause.trigger('click');
    expect(storeMock.togglePlayPause).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('disables transport when nothing is active', () => {
    storeMock.activeScene = null;
    storeMock.isPlaying = false;
    const wrapper = mount(AmbientControls, {
      global: { stubs: quasarStubs },
    });

    expect(
      wrapper.find('button[aria-label="Play"]').attributes('disabled'),
    ).toBeDefined();
    wrapper.unmount();
  });

  it('adjusts intensity in five steps', () => {
    const wrapper = mount(AmbientControls, {
      global: { stubs: quasarStubs },
    });

    const sliders = wrapper.findAllComponents(quasarStubs.QSlider);
    expect(sliders).toHaveLength(2);
    expect(sliders[0].attributes('step')).toBe('0.25');
    expect(sliders[0].attributes('snap')).toBeDefined();
    sliders[0].vm.$emit('update:modelValue', 0.75);
    expect(storeMock.setIntensity).toHaveBeenCalledWith(75);
    wrapper.unmount();
  });

  it('adjusts master volume by wheel and slider', async () => {
    const wrapper = mount(AmbientControls, {
      global: { stubs: quasarStubs },
    });

    await wrapper.find('.volume-button').trigger('wheel', { deltaY: 100 });
    expect(storeMock.setMasterVolume).toHaveBeenCalledWith(40);

    wrapper
      .findAllComponents(quasarStubs.QSlider)[1]
      .vm.$emit('update:modelValue', 0.25);
    expect(storeMock.setMasterVolume).toHaveBeenCalledWith(25);
    wrapper.unmount();
  });
});

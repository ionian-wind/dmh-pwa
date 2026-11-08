import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  activeScene: { pack: { id: 'pack-1' }, scene: { id: 'scene-1' } } as any,
  hasActiveLayers: false,
  intensity: 75,
  setIntensity: vi.fn(),
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
    storeMock.intensity = 75;
    storeMock.setIntensity.mockReset();
  });

  it('adjusts intensity in five steps', () => {
    const wrapper = mount(AmbientControls, {
      global: { stubs: quasarStubs },
    });

    const sliders = wrapper.findAllComponents(quasarStubs.QSlider);
    expect(sliders).toHaveLength(1);
    expect(sliders[0].attributes('step')).toBe('0.25');
    expect(sliders[0].attributes('snap')).toBeDefined();
    sliders[0].vm.$emit('update:modelValue', 0.75);
    expect(storeMock.setIntensity).toHaveBeenCalledWith(75);
    wrapper.unmount();
  });

  it('disables the intensity slider when requested', () => {
    const wrapper = mount(AmbientControls, {
      props: { disabled: true },
      global: { stubs: quasarStubs },
    });

    expect(
      wrapper.findComponent(quasarStubs.QSlider).attributes('disable'),
    ).toBe('true');
    wrapper.unmount();
  });
});

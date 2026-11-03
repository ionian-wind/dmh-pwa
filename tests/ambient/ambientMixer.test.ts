import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  currentPack: null as any,
  isPlaying: false,
  activeLayers: new Map<string, any>(),
  layerVariationSelections: new Map<string, string>(),
  toggleLayer: vi.fn(),
  setLayerVariation: vi.fn(),
  setLayerVolume: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import AmbientMixer from '@/ambient-sound/components/AmbientMixer.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

describe('AmbientMixer', () => {
  beforeEach(() => {
    storeMock.currentPack = {
      layers: [
        {
          id: 'rain',
          name: 'Rain',
          icon: '🌧',
          category: 'Weather',
          defaultVolume: 50,
          variations: [
            { id: 'light', name: 'Light rain', samples: ['light.mp3'] },
            { id: 'heavy', name: 'Heavy rain', samples: ['heavy.mp3'] },
          ],
        },
      ],
    };
    storeMock.layerVariationSelections = new Map([['rain', 'light']]);
    storeMock.activeLayers = new Map([
      [
        'rain',
        {
          layerId: 'rain',
          variationId: 'light',
          sampleIndex: 0,
          volume: 0.5,
          isPlaying: true,
        },
      ],
    ]);
    storeMock.setLayerVariation.mockClear();
  });

  it('uses a contrast slider colour and wires layer controls', async () => {
    const wrapper = mount(AmbientMixer);
    const card = wrapper.find('.layer-card');

    expect(card.classes()).toContain('active');
    const slider = wrapper.findComponent(quasarStubs.QSlider);
    expect(slider.exists()).toBe(true);
    expect(slider.attributes('color')).toBe('white');

    expect(wrapper.find('.section-header button').exists()).toBe(false);

    expect(wrapper.text()).toContain('Weather');
    await card.trigger('click');
    expect(storeMock.toggleLayer).toHaveBeenCalledWith('rain', 'light');

    const variationSelect = wrapper.findComponent(quasarStubs.QSelect);
    expect(variationSelect.exists()).toBe(true);
    variationSelect.vm.$emit('update:modelValue', 'heavy');
    expect(storeMock.setLayerVariation).toHaveBeenCalledWith('rain', 'heavy');

    slider.vm.$emit('update:modelValue', 0.25);
    expect(storeMock.setLayerVolume).toHaveBeenCalledWith('rain', 0.25);

    await wrapper.find('.layer-volume').trigger('wheel', { deltaY: 100 });
    expect(storeMock.setLayerVolume).toHaveBeenCalledWith('rain', 0.4);
    wrapper.unmount();
  });

  it('renders the inactive and empty states', () => {
    storeMock.activeLayers = new Map();
    storeMock.isPlaying = false;
    const inactive = mount(AmbientMixer);
    expect(inactive.find('.layer-inactive').text()).toBe('Off');
    inactive.unmount();

    storeMock.currentPack = { layers: [] };
    const empty = mount(AmbientMixer);
    expect(empty.text()).toContain('No ambient layers available');
    empty.unmount();
  });
});

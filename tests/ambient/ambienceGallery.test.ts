import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  selectedPackId: null as string | null,
  galleryAmbiences: [] as any[],
  allScenes: [] as any[],
  activeLayers: new Map<string, any>(),
  toggleAmbience: vi.fn(),
  setAmbienceVariation: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import AmbienceGallery from '@/ambient-sound/components/AmbienceGallery.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

const pack = { id: 'pack-1', name: 'Forest' };
const ambience = (id: string, name: string, category: string) => ({
  id,
  name,
  icon: 'fa-solid:cloud-rain',
  category,
  defaultVolume: 40,
  loop: true,
  variations: [{ id: 'default', name: 'Default', samples: [`${id}.mp3`] }],
});

describe('AmbienceGallery', () => {
  beforeEach(() => {
    storeMock.selectedPackId = null;
    storeMock.activeLayers = new Map();
    storeMock.galleryAmbiences = [
      {
        packageId: 'pack-1',
        pack,
        ambience: ambience('rain', 'Rain', 'Weather'),
      },
      {
        packageId: 'pack-1',
        pack,
        ambience: ambience('wind', 'Wind', 'Weather'),
      },
      {
        packageId: 'pack-1',
        pack,
        ambience: ambience('fire', 'Fire', 'Interior'),
      },
    ];
    storeMock.allScenes = [{ pack, scene: { id: 'scene-1', ambiences: [] } }];
    storeMock.toggleAmbience.mockReset();
    storeMock.setAmbienceVariation.mockReset();
  });

  it('groups ambiences by category with titles and separators', () => {
    const wrapper = mount(AmbienceGallery, {
      global: { stubs: quasarStubs },
    });

    expect(wrapper.find('.category-select').exists()).toBe(false);
    expect(wrapper.findAll('.entity-group')).toHaveLength(2);
    expect(wrapper.findAll('[data-stub="QSeparator"]')).toHaveLength(2);
    expect(wrapper.text()).toContain('Weather');
    expect(wrapper.text()).toContain('Interior');
    expect(wrapper.text()).not.toContain('Forest');
    expect(wrapper.text()).not.toContain('scenes');
    wrapper.unmount();
  });

  it('plays an ambience from its row', async () => {
    const wrapper = mount(AmbienceGallery, {
      global: { stubs: quasarStubs },
    });

    const rain = wrapper
      .findAll('[data-stub="QCard"]')
      .find((card) => card.text().includes('Rain'));
    const variation = rain!
      .findAll('button')
      .find((button) => button.text() === 'Default');
    await variation!.trigger('click');
    expect(storeMock.toggleAmbience).toHaveBeenCalledWith(
      'pack-1',
      'rain',
      'default',
    );
    wrapper.unmount();
  });

  it('shows an empty state', () => {
    storeMock.galleryAmbiences = [];
    storeMock.selectedPackId = 'pack-1';
    const wrapper = mount(AmbienceGallery, {
      global: { stubs: quasarStubs },
    });

    expect(wrapper.text()).toContain('No ambiences');
    wrapper.unmount();
  });
});

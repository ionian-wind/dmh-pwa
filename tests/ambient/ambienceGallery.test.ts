import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  selectedPackId: null as string | null,
  galleryAmbiences: [] as any[],
  allScenes: [] as any[],
  activeLayers: new Map<string, any>(),
  toggleAmbience: vi.fn(),
  setAmbienceVariation: vi.fn(),
  selectAmbienceSample: vi.fn(),
  retuneAmbienceVariation: vi.fn(),
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
  variations: [
    {
      id: 'default',
      name: 'Default',
      samples: [`${id}-default-1.mp3`, `${id}-default-2.mp3`],
    },
  ],
});

describe('AmbienceGallery', () => {
  beforeEach(() => {
    storeMock.selectedPackId = null;
    storeMock.activeLayers = new Map();
    storeMock.galleryAmbiences = [
      {
        packageId: 'pack-1',
        pack,
        ambience: {
          ...ambience('rain', 'Rain', 'Weather'),
          variations: [
            {
              id: 'light',
              name: 'Light rain',
              samples: ['rain-light-1.mp3', 'rain-light-2.mp3'],
            },
            {
              id: 'heavy',
              name: 'Heavy rain',
              samples: ['rain-heavy-1.mp3'],
            },
          ],
        },
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
    for (const fn of [
      storeMock.toggleAmbience,
      storeMock.setAmbienceVariation,
      storeMock.selectAmbienceSample,
      storeMock.retuneAmbienceVariation,
    ]) {
      fn.mockReset();
    }
  });

  it('shows the first global variation and filters ambiences by samples', async () => {
    const wrapper = mount(AmbienceGallery, {
      global: { stubs: quasarStubs },
    });

    const select = wrapper.findComponent(quasarStubs.QSelect);
    expect(select.exists()).toBe(true);
    expect(select.props('modelValue')).toBe('default');
    expect(select.props('options')).toEqual([
      { label: 'Default', value: 'default' },
      { label: 'Light rain', value: 'light' },
      { label: 'Heavy rain', value: 'heavy' },
    ]);

    expect(wrapper.text()).toContain('Weather');
    expect(wrapper.text()).toContain('Interior');
    expect(
      wrapper
        .findAll('[data-stub="QCard"]')
        .some((card) => card.text().includes('Rain')),
    ).toBe(false);
    expect(wrapper.findAll('.entity-group')).toHaveLength(2);

    select.vm.$emit('update:modelValue', 'light');
    await wrapper.vm.$nextTick();

    const cards = wrapper.findAll('[data-stub="QCard"]');
    expect(cards).toHaveLength(1);
    expect(cards[0].text()).toContain('Rain');
    expect(wrapper.text()).not.toContain('Wind');
    expect(wrapper.findAll('.entity-group')).toHaveLength(1);
    expect(storeMock.retuneAmbienceVariation).toHaveBeenCalledWith('light');
    wrapper.unmount();
  });

  it('plays an enumerated sample from its row', async () => {
    const wrapper = mount(AmbienceGallery, {
      global: { stubs: quasarStubs },
    });

    const select = wrapper.findComponent(quasarStubs.QSelect);
    select.vm.$emit('update:modelValue', 'light');
    await wrapper.vm.$nextTick();

    const rain = wrapper
      .findAll('[data-stub="QCard"]')
      .find((card) => card.text().includes('Rain'));
    expect(rain!.text()).not.toContain('.mp3');
    const samples = rain!.findAll('button');
    expect(samples.map((button) => button.text())).toEqual(['I', 'II']);

    await samples[1].trigger('click');
    expect(storeMock.selectAmbienceSample).toHaveBeenCalledWith(
      'pack-1',
      'rain',
      'light',
      1,
    );
    wrapper.unmount();
  });

  it('shows the selected sample as active', async () => {
    storeMock.activeLayers = new Map([
      ['pack-1:rain', { variationId: 'light', sampleIndex: 1 }],
    ]);
    const wrapper = mount(AmbienceGallery, {
      global: { stubs: quasarStubs },
    });

    wrapper
      .findComponent(quasarStubs.QSelect)
      .vm.$emit('update:modelValue', 'light');
    await wrapper.vm.$nextTick();

    const rain = wrapper
      .findAll('[data-stub="QCard"]')
      .find((card) => card.text().includes('Rain'));
    expect(rain!.classes()).toContain('is-active');
    expect(rain!.findAll('button')[1].classes()).toContain('sample-active');
    wrapper.unmount();
  });

  it('shows an empty state', () => {
    storeMock.galleryAmbiences = [];
    storeMock.selectedPackId = 'pack-1';
    const wrapper = mount(AmbienceGallery, {
      global: { stubs: quasarStubs },
    });

    expect(wrapper.text()).toContain('No ambiences');
    expect(wrapper.find('.variation-select').exists()).toBe(false);
    wrapper.unmount();
  });
});

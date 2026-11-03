import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  selectedPackId: null as string | null,
  galleryOneShots: [] as any[],
  allScenes: [] as any[],
  isOneShotPlaying: vi.fn(() => false),
  oneShotProgress: vi.fn(() => 0),
  playOneShot: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import OneShotGallery from '@/ambient-sound/components/OneShotGallery.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

const pack = { id: 'pack-1', name: 'Forest' };
const thunder = {
  id: 'thunder',
  name: 'Thunder',
  icon: '⛈️',
  category: 'weather',
  file: 'thunder.mp3',
  volume: 80,
};
const sword = {
  id: 'sword',
  name: 'Sword',
  icon: '⚔️',
  category: 'combat',
  file: 'sword.mp3',
  volume: 70,
};

describe('OneShotGallery', () => {
  beforeEach(() => {
    storeMock.isOneShotPlaying.mockReset();
    storeMock.isOneShotPlaying.mockReturnValue(false);
    storeMock.oneShotProgress.mockReset();
    storeMock.oneShotProgress.mockReturnValue(0);
    storeMock.playOneShot.mockReset();
    storeMock.selectedPackId = null;
    storeMock.galleryOneShots = [
      { packageId: 'pack-1', pack, oneShot: thunder },
      { packageId: 'pack-1', pack, oneShot: sword },
    ];
    storeMock.allScenes = [
      {
        pack,
        scene: { id: 'scene-1', oneShotIds: ['thunder'] },
      },
    ];
  });

  it('plays a one-shot by clicking its card', async () => {
    const wrapper = mount(OneShotGallery, {
      global: { stubs: quasarStubs },
    });

    const cards = wrapper.findAll('.one-shot-control');
    expect(cards).toHaveLength(2);
    expect(cards[0].find('.one-shot-knob').exists()).toBe(true);

    await cards[0].find('.one-shot-knob').trigger('click');
    expect(storeMock.playOneShot).toHaveBeenCalledWith('pack-1', 'thunder');
    wrapper.unmount();
  });

  it('highlights cards while their one-shot is playing', () => {
    storeMock.isOneShotPlaying.mockImplementation(
      (_packId: string, oneShotId: string) => oneShotId === 'thunder',
    );
    const wrapper = mount(OneShotGallery, {
      global: { stubs: quasarStubs },
    });

    const cards = wrapper.findAll('.one-shot-control');
    expect(cards[0].classes()).toContain('is-playing');
    expect(cards[1].classes()).not.toContain('is-playing');
    wrapper.unmount();
  });

  it('filters by category and shows an empty state', async () => {
    const wrapper = mount(OneShotGallery, {
      global: { stubs: quasarStubs },
    });

    await wrapper.find('select').setValue('combat');
    expect(wrapper.findAll('.one-shot-control')).toHaveLength(1);
    expect(wrapper.text()).toContain('Sword');

    storeMock.galleryOneShots = [];
    storeMock.selectedPackId = 'pack-1';
    const empty = mount(OneShotGallery, {
      global: { stubs: quasarStubs },
    });
    expect(empty.text()).toContain('No one-shots');
    empty.unmount();
    wrapper.unmount();
  });
});

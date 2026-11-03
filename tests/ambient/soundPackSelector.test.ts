import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  storedPacks: [] as any[],
  currentPack: null as any,
  loadPack: vi.fn(),
  unloadPack: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import SoundPackSelector from '@/ambient-sound/components/SoundPackSelector.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

const pack = {
  id: 'p1',
  name: 'Fantasy Pack',
  category: 'fantasy',
};

describe('SoundPackSelector package management', () => {
  beforeEach(() => {
    storeMock.storedPacks = [pack];
    storeMock.currentPack = null;
    storeMock.loadPack.mockReset();
    storeMock.unloadPack.mockReset();
  });

  it('lists stored packs and loads the selected pack', async () => {
    const wrapper = mount(SoundPackSelector);
    const select = wrapper.findComponent(quasarStubs.QSelect);

    expect(select.props('options')).toEqual([
      expect.objectContaining({ label: 'Fantasy Pack', value: 'p1' }),
    ]);

    select.vm.$emit('update:modelValue', 'p1');
    await wrapper.vm.$nextTick();
    expect(storeMock.loadPack).toHaveBeenCalledWith(pack);
    wrapper.unmount();
  });

  it('unloads the current pack through the close button', async () => {
    storeMock.currentPack = pack;
    const wrapper = mount(SoundPackSelector);

    await wrapper.find('button[aria-label="Close"]').trigger('click');
    expect(storeMock.unloadPack).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('shows a localized fallback when no packs are stored', () => {
    storeMock.storedPacks = [];
    const wrapper = mount(SoundPackSelector);

    expect(wrapper.findComponent(quasarStubs.QSelect).props('options')).toEqual(
      [expect.objectContaining({ label: 'No packs available' })],
    );
    expect(wrapper.find('button[aria-label="Close"]').exists()).toBe(false);
    wrapper.unmount();
  });
});

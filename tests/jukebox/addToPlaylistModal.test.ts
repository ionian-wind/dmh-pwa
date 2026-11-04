import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import AddToPlaylistModal from '@/jukebox/components/AddToPlaylistModal.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

const mocks = vi.hoisted(() => ({
  store: {
    items: null as any,
    create: vi.fn().mockResolvedValue({ id: 'p2' }),
    update: vi.fn().mockResolvedValue(undefined),
  },
  player: { actualiseQueue: vi.fn() },
}));

vi.mock('@/jukebox/stores', async () => {
  const { ref } = await import('vue');
  mocks.store.items = ref([
    {
      id: 'p1',
      name: 'Mix',
      trackIds: [],
      sortOrder: 2,
      createdAt: 1,
      updatedAt: 1,
    },
  ]);
  return {
    useJukeboxPlaylistsStore: () => ({
      items: mocks.store.items,
      create: mocks.store.create,
      update: mocks.store.update,
    }),
  };
});
vi.mock('@/jukebox/playerStore', () => ({
  useJukeboxPlayerStore: () => mocks.player,
}));

describe('AddToPlaylistModal', () => {
  it('creates a playlist, toggles membership and resets on close', async () => {
    const wrapper = mount(AddToPlaylistModal, {
      props: {
        modelValue: true,
        track: { id: 't1', title: 'Track' } as any,
      },
    });
    const input = wrapper.findComponent(quasarStubs.QInput);
    input.vm.$emit('update:modelValue', 'New mix');
    await nextTick();
    const create = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Create');
    await create!.trigger('click');
    await nextTick();
    expect(mocks.store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New mix',
        trackIds: ['t1'],
        sortOrder: 3,
      }),
    );
    expect(mocks.player.actualiseQueue).toHaveBeenCalled();

    const toggle = wrapper.findComponent(ToggleSwitch);
    toggle.vm.$emit('update:modelValue', true);
    expect(mocks.store.update).toHaveBeenCalledWith('p1', {
      trackIds: ['t1'],
    });
    toggle.vm.$emit('update:modelValue', false);
    expect(mocks.store.update).toHaveBeenCalledWith('p1', { trackIds: [] });

    await wrapper.setProps({ modelValue: false });
    await nextTick();
    expect(wrapper.findComponent(quasarStubs.QInput).props('modelValue')).toBe(
      '',
    );
    wrapper.unmount();
  });

  it('handles missing tracks and modal close events', async () => {
    const wrapper = mount(AddToPlaylistModal, {
      props: { modelValue: true, track: null },
    });
    const vm = wrapper.vm as any;
    await vm.togglePlaylist({ id: 'p1', trackIds: [] }, true);
    await vm.createPlaylistAndAdd();
    expect(mocks.store.update).not.toHaveBeenCalled();
    expect(mocks.store.create).not.toHaveBeenCalled();

    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    wrapper.findComponent(BaseModal).vm.$emit('update:isOpen', false);
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([false]);
    wrapper.unmount();
  });
});

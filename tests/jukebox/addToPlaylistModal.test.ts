import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import AddToPlaylistModal from '@/jukebox/components/AddToPlaylistModal.vue';
import BaseModal from '@/components/common/BaseModal.vue';

const mocks = vi.hoisted(() => ({
  store: {
    items: null as any,
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
      trackIds: ['t1'],
      sortOrder: 2,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'p2',
      name: 'Other',
      trackIds: [],
      sortOrder: 3,
      createdAt: 1,
      updatedAt: 1,
    },
  ]);
  return {
    useJukeboxPlaylistsStore: () => ({
      items: mocks.store.items,
      update: mocks.store.update,
    }),
  };
});
vi.mock('@/jukebox/playerStore', () => ({
  useJukeboxPlayerStore: () => mocks.player,
}));

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: {
    kind: String,
    modelValue: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue'],
  setup() {
    return () => h('div', { class: 'entities-linking-stub' });
  },
});

function mountModal(track: any = { id: 't1', title: 'Track' }) {
  return mount(AddToPlaylistModal, {
    props: { modelValue: true, track },
    global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
  });
}

describe('AddToPlaylistModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store.items.value[0].trackIds = ['t1'];
    mocks.store.items.value[1].trackIds = [];
  });

  it('uses playlist entity linking and syncs track membership', async () => {
    const wrapper = mountModal();
    const linking = wrapper.findComponent(EntitiesLinkingStub);

    expect(linking.props()).toMatchObject({
      kind: 'playlist',
      modelValue: [{ kind: 'playlist', id: 'p1' }],
    });

    linking.vm.$emit('update:modelValue', [
      { kind: 'playlist', id: 'p1' },
      { kind: 'playlist', id: 'p2' },
    ]);
    await flushPromises();
    expect(mocks.store.update).toHaveBeenCalledWith('p2', {
      trackIds: ['t1'],
    });
    expect(mocks.player.actualiseQueue).toHaveBeenCalled();

    wrapper
      .findComponent(EntitiesLinkingStub)
      .vm.$emit('update:modelValue', []);
    await flushPromises();
    expect(mocks.store.update).toHaveBeenCalledWith('p1', {
      trackIds: [],
    });
    wrapper.unmount();
  });

  it('does nothing without a track and forwards close events', async () => {
    const wrapper = mountModal(null);
    const linking = wrapper.findComponent(EntitiesLinkingStub);
    expect(linking.props('modelValue')).toEqual([]);

    linking.vm.$emit('update:modelValue', [{ kind: 'playlist', id: 'p1' }]);
    await flushPromises();
    expect(mocks.store.update).not.toHaveBeenCalled();

    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    wrapper.findComponent(BaseModal).vm.$emit('update:isOpen', false);
    expect(wrapper.emitted('update:modelValue')).toEqual([[false], [false]]);
    wrapper.unmount();
  });
});

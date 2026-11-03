import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import VueDraggable from 'vuedraggable';

import PlaylistList from '@/jukebox/components/PlaylistList.vue';
import { useJukeboxPlaylistsStore } from '@/jukebox/stores';
import { useConfigStore } from '@/utils/configStore';

const EditorStub = defineComponent({
  name: 'PlaylistEditor',
  props: { modelValue: Boolean, playlist: Object },
  emits: ['update:modelValue', 'delete'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        {
          class: 'playlist-editor-stub',
          'data-open': String(props.modelValue),
          'data-playlist': (props.playlist as any)?.id,
        },
        [
          h('button', {
            class: 'editor-delete',
            onClick: () => emit('delete'),
          }),
        ],
      );
  },
});

function mountList() {
  return mount(PlaylistList, {
    global: { stubs: { PlaylistEditor: EditorStub } },
  });
}

function seed() {
  const store = useJukeboxPlaylistsStore();
  store.items.value = [
    {
      id: 'p1',
      name: 'Second',
      trackIds: [],
      moduleIds: [],
      sortOrder: 2,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'p2',
      name: 'First',
      trackIds: [],
      moduleIds: [],
      sortOrder: 1,
      createdAt: 1,
      updatedAt: 1,
    },
  ] as any;
  return store;
}

describe('PlaylistList drag-and-drop and selection', () => {
  beforeEach(() => {
    useConfigStore().jukeboxActivePlaylistId = null;
  });

  it('orders playlists by sortOrder and persists drag reordering', async () => {
    const store = seed();
    const update = vi
      .spyOn(store, 'update')
      .mockResolvedValue(undefined as any);
    const wrapper = mountList();
    await flushPromises();

    const items = wrapper.findAll('.playlist-item');
    expect(items.map((item) => item.text())).toEqual([
      expect.stringContaining('First'),
      expect.stringContaining('Second'),
    ]);

    const draggable = wrapper.findComponent(VueDraggable);
    expect(draggable.exists()).toBe(true);
    draggable.vm.$emit('update:modelValue', [
      store.items.value[0],
      store.items.value[1],
    ]);
    await nextTick();
    draggable.vm.$emit('end', { newIndex: 1, oldIndex: 0 });
    await flushPromises();

    expect(update).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ sortOrder: 0 }),
    );
    expect(update).toHaveBeenCalledWith(
      'p2',
      expect.objectContaining({ sortOrder: 1 }),
    );
    wrapper.unmount();
  });

  it('ignores drop events that do not move an item', async () => {
    const store = seed();
    const update = vi
      .spyOn(store, 'update')
      .mockResolvedValue(undefined as any);
    const wrapper = mountList();
    await flushPromises();

    wrapper
      .findComponent(VueDraggable)
      .vm.$emit('end', { newIndex: 1, oldIndex: 1 });
    await flushPromises();

    expect(update).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('selects playlists and clears selection with All Tracks', async () => {
    seed();
    const config = useConfigStore();
    const wrapper = mountList();
    await flushPromises();

    const items = wrapper.findAll('.playlist-item');
    await items[0].trigger('click');
    expect(config.jukeboxActivePlaylistId).toBe('p2');

    const allTracks = wrapper
      .findAll('[data-stub="QItem"]')
      .find((item) => item.text().includes('All Tracks'));
    expect(allTracks).toBeTruthy();
    await allTracks!.trigger('click');
    expect(config.jukeboxActivePlaylistId).toBeNull();
    wrapper.unmount();
  });

  it('opens edit/create dialogs and removes playlists', async () => {
    const store = seed();
    const remove = vi.spyOn(store, 'remove').mockResolvedValue(undefined);
    const wrapper = mountList();
    await flushPromises();

    const first = wrapper.findAll('.playlist-item')[0];
    await first.findAll('button')[0].trigger('click');
    await nextTick();
    expect(wrapper.findComponent(EditorStub).props()).toMatchObject({
      modelValue: true,
      playlist: expect.objectContaining({ id: 'p2' }),
    });

    await first.findAll('button')[1].trigger('click');
    await flushPromises();
    expect(remove).toHaveBeenCalledWith('p2');

    const create = wrapper
      .findAll('[data-stub="QItem"]')
      .find((item) => item.text().includes('New playlist'));
    expect(create).toBeTruthy();
    await create!.trigger('click');
    await nextTick();
    expect(wrapper.findComponent(EditorStub).props('playlist')).toBeNull();
    wrapper.unmount();
  });

  it('removes the edited playlist through the editor delete action', async () => {
    const store = seed();
    const remove = vi.spyOn(store, 'remove').mockResolvedValue(undefined);
    const wrapper = mountList();
    await flushPromises();

    await wrapper
      .findAll('.playlist-item')[1]
      .findAll('button')[0]
      .trigger('click');
    await nextTick();
    expect(wrapper.findComponent(EditorStub).props('playlist')).toMatchObject({
      id: 'p1',
    });

    await wrapper.find('.editor-delete').trigger('click');
    await flushPromises();

    expect(remove).toHaveBeenCalledWith('p1');
    expect(wrapper.findComponent(EditorStub).props('modelValue')).toBe(false);
    wrapper.unmount();
  });
});

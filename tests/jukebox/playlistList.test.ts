import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import SortableList from '@/components/common/SortableList.vue';

import PlaylistList from '@/jukebox/components/PlaylistList.vue';
import { useJukeboxPlaylistsStore } from '@/jukebox/stores';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useConfigStore } from '@/utils/configStore';
import { useJukeboxEditMode } from '@/jukebox/composables/useJukeboxEditMode';
import { useJukeboxBulkSelection } from '@/jukebox/composables/useJukeboxBulkSelection';

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

function dispatchPointerDown(element: Element, shiftKey: boolean) {
  element.dispatchEvent(
    new MouseEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      shiftKey,
    }),
  );
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
    useJukeboxBulkSelection().clearSelection();
    useConfigStore().jukeboxActivePlaylistId = null;
    useJukeboxEditMode().value = true;
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

    const draggable = wrapper.findComponent(SortableList);
    expect(draggable.exists()).toBe(true);
    expect(draggable.props('handle')).toBe('.playlist-drag-handle');
    expect(wrapper.findAll('.playlist-drag-handle')).toHaveLength(2);
    expect(wrapper.findAll('.playlist-bulk-select')).toHaveLength(2);
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
      .findComponent(SortableList)
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

    const handle = wrapper.findAll('.playlist-drag-handle')[0];
    await handle.trigger('click');
    expect(config.jukeboxActivePlaylistId).toBeNull();

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

  it('clears selected and active playlist when it is removed', async () => {
    const store = seed();
    const config = useConfigStore();
    vi.spyOn(store, 'remove').mockResolvedValue(undefined);
    const wrapper = mountList();
    await flushPromises();

    await wrapper.findAll('.playlist-item')[0].trigger('click');
    expect(config.jukeboxActivePlaylistId).toBe('p2');
    await wrapper
      .findAll('.playlist-item')[0]
      .findAll('button')[1]
      .trigger('click');
    await flushPromises();
    expect(config.jukeboxActivePlaylistId).toBeNull();
    wrapper.unmount();
  });

  it('clears an active playlist that is not currently selected', async () => {
    const store = seed();
    const config = useConfigStore();
    vi.spyOn(store, 'remove').mockResolvedValue(undefined);
    const wrapper = mountList();
    await flushPromises();

    config.jukeboxActivePlaylistId = 'p1';
    await (wrapper.vm as any).removePlaylist('p1');
    expect(config.jukeboxActivePlaylistId).toBeNull();
    wrapper.unmount();
  });

  it('keeps a selected playlist that is missing from the filtered list', async () => {
    seed();
    const wrapper = mountList();
    await flushPromises();
    const vm = wrapper.vm as any;
    vm.updateSortedPlaylists([{ id: 'p2', name: 'First', sortOrder: 1 }], 'p1');
    expect(vm.sortedPlaylists.map((playlist: any) => playlist.id)).toEqual([
      'p2',
      'p1',
    ]);
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

  it('hides drag handles in view mode but keeps the create action', async () => {
    seed();
    useJukeboxEditMode().value = false;
    const wrapper = mountList();
    await flushPromises();

    expect(wrapper.findAll('.playlist-drag-handle')).toHaveLength(0);
    expect(wrapper.findAll('.playlist-bulk-select')).toHaveLength(0);
    expect(wrapper.find('.playlist-list-container').classes()).not.toContain(
      'is-edit-mode',
    );
    expect(wrapper.text()).toContain('New playlist');

    await wrapper.find('.jukebox-edit-mode').trigger('click');
    await flushPromises();
    expect(useJukeboxEditMode().value).toBe(true);
    expect(wrapper.findAll('.playlist-drag-handle')).toHaveLength(2);
    expect(wrapper.findAll('.playlist-bulk-select')).toHaveLength(2);
    expect(wrapper.find('.playlist-list-container').classes()).toContain(
      'is-edit-mode',
    );
    wrapper.unmount();
  });

  it('selects a range of playlists with shift-click', async () => {
    seed();
    const bulk = useJukeboxBulkSelection();
    const wrapper = mountList();
    await flushPromises();

    expect(bulk.playlistOrder.value).toEqual(['p2', 'p1']);
    const checkboxes = wrapper.findAll(
      '.playlist-bulk-select input[type="checkbox"]',
    );
    dispatchPointerDown(checkboxes[0].element, false);
    await checkboxes[0].trigger('click');
    await checkboxes[0].trigger('change');
    dispatchPointerDown(checkboxes[1].element, true);
    await checkboxes[1].trigger('click');
    await checkboxes[1].trigger('change');

    expect([...bulk.selectedPlaylistIds.value]).toEqual(['p2', 'p1']);
    wrapper.unmount();
  });

  it('marks the All Tracks row and playlists containing the active track', async () => {
    const store = seed();
    store.items.value[0].trackIds = ['t1'];
    const player = useJukeboxPlayerStore();
    player.currentTrack = { id: 't1', fileId: 'f1', title: 'Active' } as any;

    const wrapper = mountList();
    await flushPromises();

    expect(wrapper.find('.playlist-all-tracks').classes()).toContain(
      'has-active-track',
    );
    const rows = wrapper.findAll('.playlist-item');
    const containing = rows.find((row) => row.text().includes('Second'));
    const other = rows.find((row) => row.text().includes('First'));
    expect(containing?.classes()).toContain('has-active-track');
    expect(other?.classes()).not.toContain('has-active-track');
    wrapper.unmount();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

import JukeboxView from '@/jukebox/JukeboxView.vue';
import type { JukeboxTrack } from '@/jukebox/types';
import { useConfigStore } from '@/utils/configStore';
import { useJukeboxEditMode } from '@/jukebox/composables/useJukeboxEditMode';
import { useJukeboxBulkSelection } from '@/jukebox/composables/useJukeboxBulkSelection';
import { useJukeboxImporting } from '@/jukebox/composables/useJukeboxImporting';

const mocks = vi.hoisted(() => ({
  tracks: {
    items: { value: [] as any[] },
    load: vi.fn().mockResolvedValue(undefined),
    create: vi.fn(),
    remove: vi.fn().mockResolvedValue(undefined),
  },
  playlists: {
    items: { value: [] as any[] },
    load: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
  picture: { clearCache: vi.fn() },
  importStoredFile: vi.fn(),
  deleteFileIfUnreferenced: vi.fn().mockResolvedValue(undefined),
  pickFiles: vi.fn(),
  pickDirectory: vi.fn(),
  getPickedFileFromDataTransferItem: vi.fn(),
  extractTrackMetadata: vi.fn(),
  createWaveformSvg: vi.fn(),
  actualiseQueue: vi.fn(),
  removeTrackFromQueue: vi.fn().mockResolvedValue(undefined),
  playTrackFromPlaylist: vi.fn(),
  queueTrackNext: vi.fn(),
  queueTrackLast: vi.fn(),
  togglePlay: vi.fn(),
  resortQueue: vi.fn(),
  trackIsActive: vi.fn(() => false),
}));

vi.mock('@/jukebox/stores', () => ({
  useJukeboxTracksStore: () => mocks.tracks,
  useJukeboxPlaylistsStore: () => mocks.playlists,
  usePictureUrlCacheStore: () => mocks.picture,
}));

vi.mock('@/utils/files/fileStorage', () => ({
  importStoredFile: mocks.importStoredFile,
}));

vi.mock('@/utils/files/fileReferences', () => ({
  deleteFileIfUnreferenced: mocks.deleteFileIfUnreferenced,
}));

vi.mock('@/utils/files', () => ({
  pickFiles: mocks.pickFiles,
  pickDirectory: mocks.pickDirectory,
  getPickedFileFromDataTransferItem: mocks.getPickedFileFromDataTransferItem,
}));

vi.mock('@/utils/files/FileSystemUtils', () => ({
  extractTrackMetadata: mocks.extractTrackMetadata,
}));

vi.mock('@/jukebox/utils/waveform', () => ({
  createWaveformSvg: mocks.createWaveformSvg,
}));

vi.mock('@/jukebox/playerStore', () => ({
  useJukeboxPlayerStore: () => ({
    isPlaying: false,
    actualiseQueue: mocks.actualiseQueue,
    removeTrackFromQueue: mocks.removeTrackFromQueue,
    playTrackFromPlaylist: mocks.playTrackFromPlaylist,
    queueTrackNext: mocks.queueTrackNext,
    queueTrackLast: mocks.queueTrackLast,
    togglePlay: mocks.togglePlay,
    resortQueue: mocks.resortQueue,
    trackIsActive: mocks.trackIsActive,
  }),
}));

vi.mock('@/dialogs', () => ({
  confirm: vi.fn().mockResolvedValue(true),
  alert: vi.fn(),
}));

const BaseListViewStub = defineComponent({
  name: 'BaseListView',
  props: {
    items: Array,
    cardProps: Function,
    draggable: Boolean,
    dragHandle: String,
    leftHeaderButtons: Array,
    headerButtons: Array,
    createLoading: Boolean,
  },
  emits: ['create', 'sort'],
  setup(props, { slots }) {
    return () =>
      h('div', { 'data-stub': 'BaseListView' }, [
        ...(props.headerButtons ?? []).map((button: any) =>
          h(
            'button',
            {
              class: 'stub-header-button',
              onClick: button.event,
            },
            button.title,
          ),
        ),
        slots.default?.(),
      ]);
  },
});

const BulkLinkingStub = defineComponent({
  name: 'BulkLinkingModal',
  props: {
    modelValue: Boolean,
    title: String,
    kind: String,
    links: Array,
  },
  emits: ['update:modelValue', 'submit'],
  setup() {
    return () => h('div', { 'data-stub': 'BulkLinkingModal' });
  },
});

const AddToPlaylistStub = defineComponent({
  name: 'AddToPlaylistModal',
  props: { modelValue: Boolean, track: Object },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        {
          'data-stub': 'AddToPlaylistModal',
          'data-open': String(props.modelValue),
          'data-track': props.track?.id,
        },
        [
          h('button', {
            class: 'close-add-to-playlist',
            onClick: () => emit('update:modelValue', false),
          }),
        ],
      );
  },
});

const mounted: any[] = [];

async function mountView() {
  const wrapper = mount(JukeboxView, {
    global: {
      stubs: {
        BaseListView: BaseListViewStub,
        AddToPlaylistModal: AddToPlaylistStub,
        BulkLinkingModal: BulkLinkingStub,
        JukeboxPlayer: true,
        TrackCard: true,
      },
    },
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, list: wrapper.findComponent(BaseListViewStub) };
}

function audioFile(name = 'song.mp3') {
  return new File(['audio'], name, { type: 'audio/mp3' });
}

function dragEvent(type: string, dataTransfer: any) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  return event as DragEvent;
}

describe('JukeboxView', () => {
  afterEach(() => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount();
  });

  beforeEach(() => {
    useJukeboxBulkSelection().clearSelection();
    useJukeboxImporting().value = false;
    mocks.tracks.items.value = [];
    mocks.playlists.items.value = [];
    mocks.tracks.create.mockReset();
    mocks.tracks.create.mockImplementation(async (data: any) => {
      const created = {
        id: `track-${mocks.tracks.items.value.length + 1}`,
        ...data,
      };
      mocks.tracks.items.value.push(created);
      return created;
    });
    mocks.playlists.getById.mockImplementation((id: string) =>
      mocks.playlists.items.value.find((item) => item.id === id),
    );
    mocks.importStoredFile.mockImplementation(async (file: File) => ({
      file: {
        id: `${file.name}-${file.lastModified}-${file.size}`,
      },
      created: true,
    }));
    mocks.pickFiles.mockResolvedValue([]);
    mocks.pickDirectory.mockResolvedValue([]);
    mocks.getPickedFileFromDataTransferItem.mockResolvedValue(null);
    mocks.deleteFileIfUnreferenced.mockResolvedValue(undefined);
    mocks.extractTrackMetadata.mockResolvedValue({
      title: 'Song',
      artist: 'Artist',
      duration: 42,
      color: '#ffffff',
      palette: ['#ffffff'],
    });
    mocks.trackIsActive.mockReturnValue(false);
    mocks.createWaveformSvg.mockResolvedValue('<svg data-waveform="test"/>');
    vi.clearAllMocks();
  });

  it('imports picked files and appends them to the selected playlist', async () => {
    const config = useConfigStore();
    mocks.playlists.items.value = [{ id: 'p1', trackIds: ['old'] }];
    config.jukeboxActivePlaylistId = 'p1';
    mocks.pickFiles.mockResolvedValue([
      { file: audioFile(), source: { kind: 'blob', blob: audioFile() } },
    ]);

    const { list } = await mountView();
    list.vm.$emit('create');
    await flushPromises();

    expect(mocks.importStoredFile).toHaveBeenCalled();
    expect(mocks.extractTrackMetadata).toHaveBeenCalled();
    expect(mocks.createWaveformSvg).toHaveBeenCalledWith(expect.any(File));
    expect(mocks.tracks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Song',
        artist: 'Artist',
        waveform: '<svg data-waveform="test"/>',
      }),
    );
    expect(mocks.playlists.update).toHaveBeenCalledWith('p1', {
      trackIds: ['old', 'track-1'],
    });
    expect(mocks.actualiseQueue).toHaveBeenCalled();
  });

  it('imports an audio folder from the header action', async () => {
    mocks.pickDirectory.mockResolvedValue([
      { file: audioFile(), source: { kind: 'blob', blob: audioFile() } },
    ]);

    const { wrapper } = await mountView();
    const folderButton = wrapper
      .findAll('.stub-header-button')
      .find((button) => button.text() === 'jukebox.addFolder');

    expect(folderButton).toBeTruthy();
    await folderButton!.trigger('click');
    await flushPromises();

    expect(mocks.pickDirectory).toHaveBeenCalledWith(
      expect.objectContaining({ recursive: true }),
    );
    expect(mocks.importStoredFile).toHaveBeenCalled();
  });

  it('stores a null waveform when waveform generation fails', async () => {
    mocks.createWaveformSvg.mockRejectedValueOnce(new Error('decode failed'));
    mocks.pickFiles.mockResolvedValue([
      { file: audioFile(), source: { kind: 'blob', blob: audioFile() } },
    ]);

    const { list } = await mountView();
    list.vm.$emit('create');
    await flushPromises();

    expect(mocks.tracks.create).toHaveBeenCalledWith(
      expect.objectContaining({ waveform: null }),
    );
  });

  it('skips file extraction when the same file already has a track', async () => {
    const existing = {
      id: 'track-existing',
      fileId: 'song.mp3-0-5',
      title: 'Existing',
    };
    mocks.tracks.items.value = [existing];
    const file = audioFile();
    Object.defineProperty(file, 'lastModified', { value: 0 });
    Object.defineProperty(file, 'size', { value: 5 });
    mocks.pickFiles.mockResolvedValue([
      { file, source: { kind: 'blob', blob: file } },
    ]);

    const { list } = await mountView();
    list.vm.$emit('create');
    await flushPromises();

    expect(mocks.extractTrackMetadata).not.toHaveBeenCalled();
    expect(mocks.extractTrackMetadata).not.toHaveBeenCalled();
    expect(mocks.tracks.create).not.toHaveBeenCalled();
  });

  it('handles card actions, queue actions and removal', async () => {
    const track = {
      id: 't1',
      fileId: 'f1',
      title: 'Song',
      playlistIds: [],
    } as JukeboxTrack;
    Object.assign(track, {});
    mocks.tracks.items.value = [track];
    mocks.playlists.items.value = [
      { id: 'p1', trackIds: ['t1'] },
      { id: 'p2', trackIds: [] },
    ];
    const config = useConfigStore();
    config.jukeboxActivePlaylistId = 'p1';

    const { wrapper, list } = await mountView();
    const card = (list.props('cardProps') as any)(track);

    card.onAddToPlaylist();
    await nextTick();
    expect(wrapper.findComponent(AddToPlaylistStub).props()).toMatchObject({
      modelValue: true,
      track,
    });

    card.onPlay();
    expect(mocks.playTrackFromPlaylist).toHaveBeenCalledWith(track);

    mocks.trackIsActive.mockReturnValue(true);
    card.onPlay();
    expect(mocks.togglePlay).toHaveBeenCalled();

    card.onPlayNext();
    card.onPlayLast();
    expect(mocks.queueTrackNext).toHaveBeenCalledWith(track);
    expect(mocks.queueTrackLast).toHaveBeenCalledWith(track);

    await card.onRemove();
    expect(mocks.removeTrackFromQueue).toHaveBeenCalledWith(track);
    expect(mocks.playlists.update).toHaveBeenCalledWith('p1', {
      trackIds: [],
    });
    expect(mocks.tracks.remove).toHaveBeenCalledWith('t1');
    expect(mocks.deleteFileIfUnreferenced).toHaveBeenCalledWith('f1');
  });

  it('keeps files shared by other tracks when removing a track', async () => {
    const first = { id: 't1', fileId: 'shared', title: 'One' } as JukeboxTrack;
    const second = { id: 't2', fileId: 'shared', title: 'Two' } as JukeboxTrack;
    mocks.tracks.items.value = [first, second];
    const { list } = await mountView();

    const card = (list.props('cardProps') as any)(first);
    await card.onRemove();
    expect(mocks.deleteFileIfUnreferenced).toHaveBeenCalledWith('shared');
  });

  it('sorts tracks in the selected playlist', async () => {
    const one = { id: 't1', title: 'One' } as JukeboxTrack;
    const two = { id: 't2', title: 'Two' } as JukeboxTrack;
    mocks.tracks.items.value = [one, two];
    mocks.playlists.items.value = [{ id: 'p1', trackIds: ['t1', 't2'] }];
    const config = useConfigStore();
    config.jukeboxActivePlaylistId = 'p1';

    const { list } = await mountView();
    expect(list.props('dragHandle')).toBe('.track-drag-handle');
    list.vm.$emit('sort', [two, one]);
    await flushPromises();

    expect(mocks.playlists.update).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ trackIds: ['t2', 't1'] }),
    );
    expect(mocks.resortQueue).toHaveBeenCalledWith('p1');
  });

  it('shows the drop zone and imports dropped audio files', async () => {
    const file = audioFile();
    const handle = { kind: 'file', getFile: vi.fn() };
    mocks.getPickedFileFromDataTransferItem.mockResolvedValue({
      file,
      source: { kind: 'handle', handle },
    });

    const { wrapper } = await mountView();
    document.dispatchEvent(
      dragEvent('dragenter', { types: ['Files'], items: [] }),
    );
    await nextTick();
    expect(wrapper.find('.drop-zone-active').exists()).toBe(true);

    document.dispatchEvent(
      dragEvent('dragover', { types: ['Files'], dropEffect: 'none' }),
    );
    document.dispatchEvent(
      dragEvent('dragleave', { types: ['Files'], items: [] }),
    );
    await nextTick();
    expect(wrapper.find('.drop-zone-active').exists()).toBe(false);

    document.dispatchEvent(
      dragEvent('drop', {
        items: [
          {
            kind: 'file',
            getAsFileSystemHandle: vi.fn(),
            getAsFile: vi.fn(),
          },
        ],
      }),
    );
    await flushPromises();

    expect(mocks.getPickedFileFromDataTransferItem).toHaveBeenCalled();
    expect(mocks.tracks.create).toHaveBeenCalled();
  });

  it('closes the add-to-playlist modal and ignores non-file drags', async () => {
    const { wrapper } = await mountView();

    wrapper
      .findComponent(AddToPlaylistStub)
      .vm.$emit('update:modelValue', false);
    expect(wrapper.findComponent(AddToPlaylistStub).props('modelValue')).toBe(
      false,
    );

    document.dispatchEvent(
      dragEvent('dragenter', { types: ['text/plain'], items: [] }),
    );
    document.dispatchEvent(dragEvent('dragover', { types: ['text/plain'] }));
    document.dispatchEvent(
      dragEvent('dragleave', { types: ['text/plain'], items: [] }),
    );
    await nextTick();
    expect(wrapper.find('.drop-zone-active').exists()).toBe(false);
    wrapper.unmount();
  });

  it('ignores sorts without an existing selected playlist', async () => {
    const { list } = await mountView();

    list.vm.$emit('sort', [{ id: 't1' }]);
    await flushPromises();
    expect(mocks.playlists.update).not.toHaveBeenCalled();

    const config = useConfigStore();
    config.jukeboxActivePlaylistId = 'missing';
    await nextTick();
    list.vm.$emit('sort', [{ id: 't1' }]);
    await flushPromises();
    expect(mocks.playlists.update).not.toHaveBeenCalled();
  });

  it('handles dropdowns without data and extension-based audio files', async () => {
    const file = new File(['audio'], 'song.mp3', { type: '' });
    mocks.getPickedFileFromDataTransferItem.mockResolvedValue({
      file,
      source: { kind: 'blob', blob: file },
    });

    const { wrapper } = await mountView();
    document.dispatchEvent(dragEvent('drop', {}));
    await flushPromises();

    document.dispatchEvent(
      dragEvent('drop', {
        items: [{ kind: 'file', getAsFile: () => file }],
      }),
    );
    await flushPromises();

    expect(mocks.tracks.create).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('uses the file name when metadata has no title', async () => {
    mocks.extractTrackMetadata.mockResolvedValue({});
    mocks.pickFiles.mockResolvedValue([
      {
        file: audioFile('untitled.mp3'),
        source: { kind: 'blob', blob: audioFile() },
      },
    ]);

    const { list } = await mountView();
    list.vm.$emit('create');
    await flushPromises();

    expect(mocks.importStoredFile).toHaveBeenCalled();
    expect(mocks.tracks.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'untitled' }),
    );
  });

  it('guards concurrent imports and handles picker errors', async () => {
    let resolvePick: (value: any[]) => void = () => {};
    mocks.pickFiles.mockReturnValue(
      new Promise((resolve) => {
        resolvePick = resolve;
      }),
    );

    const { list } = await mountView();
    list.vm.$emit('create');
    list.vm.$emit('create');
    expect(mocks.pickFiles).toHaveBeenCalledTimes(1);

    document.dispatchEvent(dragEvent('drop', {}));
    await nextTick();

    resolvePick([]);
    await flushPromises();

    mocks.pickFiles.mockRejectedValue(new Error('picker failed'));
    list.vm.$emit('create');
    await flushPromises();

    mocks.pickFiles.mockRejectedValue(
      new DOMException('cancelled', 'AbortError'),
    );
    list.vm.$emit('create');
    await flushPromises();
  });

  it('handles dropped-file and deletion errors without crashing', async () => {
    mocks.getPickedFileFromDataTransferItem.mockRejectedValue(
      new Error('bad drop'),
    );
    const { wrapper, list } = await mountView();

    document.dispatchEvent(
      dragEvent('drop', {
        items: [{ kind: 'file', getAsFile: () => audioFile() }],
      }),
    );
    await flushPromises();

    const track = {
      id: 't1',
      fileId: 'f1',
      title: '',
      playlistIds: [],
    } as JukeboxTrack;
    mocks.tracks.items.value = [track];
    mocks.deleteFileIfUnreferenced.mockRejectedValue(new Error('file gone'));
    const card = (list.props('cardProps') as any)(track);
    await card.onRemove();
    expect(mocks.tracks.remove).toHaveBeenCalledWith('t1');

    wrapper.unmount();
  });

  it('handles selected playlists that reference deleted tracks', async () => {
    mocks.tracks.items.value = [];
    mocks.playlists.items.value = [{ id: 'p1', trackIds: ['missing'] }];
    const config = useConfigStore();
    config.jukeboxActivePlaylistId = 'p1';

    const { wrapper } = await mountView();
    expect(wrapper.findComponent(BaseListViewStub).props('items')).toEqual([]);
    wrapper.unmount();
  });

  it('handles dropped blobs, skips non-audio files and cleans up listeners', async () => {
    const file = audioFile();
    const text = new File(['text'], 'notes.txt', { type: 'text/plain' });
    mocks.getPickedFileFromDataTransferItem
      .mockResolvedValueOnce({
        file,
        source: { kind: 'blob', blob: file },
      })
      .mockResolvedValueOnce({
        file: text,
        source: { kind: 'blob', blob: text },
      });

    const { wrapper } = await mountView();
    document.dispatchEvent(
      dragEvent('drop', {
        items: [
          {
            kind: 'file',
            getAsFile: () => file,
          },
          {
            kind: 'file',
            getAsFile: () =>
              new File(['text'], 'notes.txt', { type: 'text/plain' }),
          },
          { kind: 'string' },
        ],
      }),
    );
    await flushPromises();

    expect(mocks.tracks.create).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    document.dispatchEvent(
      dragEvent('dragenter', { types: ['Files'], items: [] }),
    );
    expect(wrapper.find('.drop-zone-active').exists()).toBe(false);
  });

  it('enables dragging and removal only in edit mode', async () => {
    const track = { id: 't1', title: 'One' } as JukeboxTrack;
    mocks.tracks.items.value = [track];
    mocks.playlists.items.value = [{ id: 'p1', trackIds: ['t1'] }];
    useConfigStore().jukeboxActivePlaylistId = 'p1';

    const { list } = await mountView();
    expect(list.props('draggable')).toBe(false);
    expect((list.props('cardProps') as any)(track).showRemove).toBe(false);
    expect((list.props('cardProps') as any)(track).selectable).toBe(false);

    useJukeboxEditMode().value = true;
    await nextTick();
    expect(list.props('draggable')).toBe(true);
    expect((list.props('cardProps') as any)(track).showRemove).toBe(true);
    expect((list.props('cardProps') as any)(track).selectable).toBe(true);
  });

  it('shows bulk selection for all tracks without enabling sorting', async () => {
    const track = { id: 't1', title: 'One' } as JukeboxTrack;
    mocks.tracks.items.value = [track];
    useConfigStore().jukeboxActivePlaylistId = null;

    const { list } = await mountView();

    useJukeboxEditMode().value = true;
    await nextTick();

    expect(list.props('draggable')).toBe(false);
    expect((list.props('cardProps') as any)(track)).toEqual(
      expect.objectContaining({ selectable: true, showRemove: true }),
    );
  });

  it('shows bulk actions only in edit mode with a selection', async () => {
    const bulk = useJukeboxBulkSelection();
    const track = { id: 't1', title: 'One' } as JukeboxTrack;
    mocks.tracks.items.value = [track];

    const { list } = await mountView();
    expect(list.props('leftHeaderButtons')).toEqual([]);

    useJukeboxEditMode().value = true;
    await nextTick();
    expect(list.props('leftHeaderButtons')).toEqual([]);

    bulk.toggleTrack('t1', true);
    await nextTick();
    expect(
      (list.props('leftHeaderButtons') as any[]).map((button) => button.title),
    ).toEqual(['common.edit', 'common.delete']);

    useJukeboxEditMode().value = false;
    await nextTick();
    expect(list.props('leftHeaderButtons')).toEqual([]);
    expect(bulk.selectedTrackIds.value.size).toBe(0);
  });

  it('deletes selected tracks in bulk', async () => {
    const bulk = useJukeboxBulkSelection();
    const track = {
      id: 't1',
      fileId: 'f1',
      title: 'One',
      playlistIds: [],
    } as JukeboxTrack;
    mocks.tracks.items.value = [track];
    mocks.playlists.items.value = [
      { id: 'p1', name: 'Set', trackIds: ['t1'], moduleIds: [] },
    ];

    const { list } = await mountView();
    useJukeboxEditMode().value = true;
    bulk.toggleTrack('t1', true);
    await nextTick();

    const [, deleteButton] = list.props('leftHeaderButtons') as any[];
    await deleteButton.event(new Event('click'));
    await flushPromises();

    expect(mocks.tracks.remove).toHaveBeenCalledWith('t1');
    expect(mocks.playlists.update).toHaveBeenCalledWith('p1', {
      trackIds: [],
    });
    expect(bulk.selectedTrackIds.value.size).toBe(0);
  });

  it('deletes selected playlists in bulk and clears the active playlist', async () => {
    const bulk = useJukeboxBulkSelection();
    const config = useConfigStore();
    config.jukeboxActivePlaylistId = 'p1';
    mocks.playlists.items.value = [
      { id: 'p1', name: 'Set', trackIds: [], moduleIds: [] },
    ];

    const { list } = await mountView();
    useJukeboxEditMode().value = true;
    bulk.togglePlaylist('p1', true);
    await nextTick();

    const [, deleteButton] = list.props('leftHeaderButtons') as any[];
    await deleteButton.event(new Event('click'));
    await flushPromises();

    expect(mocks.playlists.remove).toHaveBeenCalledWith('p1');
    expect(config.jukeboxActivePlaylistId).toBeNull();
    expect(bulk.selectedPlaylistIds.value.size).toBe(0);
  });

  it('applies bulk playlist links to selected tracks', async () => {
    const bulk = useJukeboxBulkSelection();
    const track = {
      id: 't1',
      fileId: 'f1',
      title: 'One',
      playlistIds: [],
    } as JukeboxTrack;
    mocks.tracks.items.value = [track];
    mocks.playlists.items.value = [
      { id: 'p1', name: 'One', trackIds: ['t1'], moduleIds: [] },
      { id: 'p2', name: 'Two', trackIds: [], moduleIds: [] },
    ];

    const { wrapper, list } = await mountView();
    useJukeboxEditMode().value = true;
    bulk.toggleTrack('t1', true);
    await nextTick();

    const [editButton] = list.props('leftHeaderButtons') as any[];
    await editButton.event(new Event('click'));
    await nextTick();

    const modal = wrapper.findAllComponents(BulkLinkingStub)[0];
    expect(modal.props()).toMatchObject({
      modelValue: true,
      kind: 'playlist',
      links: [{ kind: 'playlist', id: 'p1' }],
    });

    modal.vm.$emit('submit', [{ kind: 'playlist', id: 'p2' }]);
    await flushPromises();

    expect(mocks.playlists.update).toHaveBeenCalledWith('p1', {
      trackIds: [],
    });
    expect(mocks.playlists.update).toHaveBeenCalledWith('p2', {
      trackIds: ['t1'],
    });
    expect(bulk.selectedTrackIds.value.size).toBe(0);
  });

  it('applies bulk module links to selected playlists', async () => {
    const bulk = useJukeboxBulkSelection();
    mocks.playlists.items.value = [
      { id: 'p1', name: 'One', trackIds: [], moduleIds: ['m1'] },
      { id: 'p2', name: 'Two', trackIds: [], moduleIds: ['m2'] },
    ];

    const { wrapper, list } = await mountView();
    useJukeboxEditMode().value = true;
    bulk.togglePlaylist('p1', true);
    bulk.togglePlaylist('p2', true);
    await nextTick();

    const [editButton] = list.props('leftHeaderButtons') as any[];
    await editButton.event(new Event('click'));
    await nextTick();

    const modal = wrapper.findAllComponents(BulkLinkingStub)[1];
    expect(modal.props()).toMatchObject({
      modelValue: true,
      kind: 'module',
      links: [
        { kind: 'module', id: 'm1' },
        { kind: 'module', id: 'm2' },
      ],
    });

    modal.vm.$emit('submit', [{ kind: 'module', id: 'm3' }]);
    await flushPromises();

    expect(mocks.playlists.update).toHaveBeenCalledWith('p1', {
      moduleIds: ['m3'],
    });
    expect(mocks.playlists.update).toHaveBeenCalledWith('p2', {
      moduleIds: ['m3'],
    });
    expect(bulk.selectedPlaylistIds.value.size).toBe(0);
  });

  it('selects every visible track from the bulk panel', async () => {
    const bulk = useJukeboxBulkSelection();
    const one = { id: 't1', title: 'One' } as JukeboxTrack;
    const two = { id: 't2', title: 'Two' } as JukeboxTrack;
    mocks.tracks.items.value = [one, two];

    const { wrapper } = await mountView();
    useJukeboxEditMode().value = true;
    bulk.toggleTrack('t1', true);
    await nextTick();

    expect(wrapper.find('.jukebox-bulk-panel').exists()).toBe(true);
    expect(wrapper.find('.select-all-link').exists()).toBe(true);
    await wrapper.find('.select-all-link').trigger('click');
    await nextTick();

    expect([...bulk.selectedTrackIds.value].sort()).toEqual(['t1', 't2']);
    expect(wrapper.find('.select-all-link').exists()).toBe(false);
    expect(wrapper.find('.cancel-selection-link').exists()).toBe(true);

    await wrapper.find('.cancel-selection-link').trigger('click');
    await nextTick();
    expect(bulk.selectedTrackIds.value.size).toBe(0);
    expect(wrapper.find('.jukebox-bulk-panel').exists()).toBe(false);
  });

  it('disables the add action while files are importing', async () => {
    let resolvePick: (value: any[]) => void = () => {};
    mocks.pickFiles.mockReturnValue(
      new Promise((resolve) => {
        resolvePick = resolve;
      }),
    );

    const { list } = await mountView();
    expect(list.props('createLoading')).toBe(false);

    list.vm.$emit('create');
    await nextTick();
    expect(list.props('createLoading')).toBe(true);
    expect(useJukeboxImporting().value).toBe(true);

    resolvePick([]);
    await flushPromises();
    expect(list.props('createLoading')).toBe(false);
    expect(useJukeboxImporting().value).toBe(false);
  });
});

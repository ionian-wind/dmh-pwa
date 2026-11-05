import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

import JukeboxView from '@/jukebox/JukeboxView.vue';
import type { JukeboxTrack } from '@/jukebox/types';
import { useConfigStore } from '@/utils/configStore';

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
  },
  files: { load: vi.fn().mockResolvedValue(undefined) },
  picture: { clearCache: vi.fn() },
  getJukeboxFile: vi.fn(),
  putJukeboxFile: vi.fn().mockResolvedValue(undefined),
  deleteJukeboxFile: vi.fn().mockResolvedValue(undefined),
  pickAudioFiles: vi.fn(),
  getFile: vi.fn(),
  getAsFileSystemHandle: vi.fn(),
  extractTrackMetadata: vi.fn(),
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
  useJukeboxFilesStore: () => mocks.files,
  usePictureUrlCacheStore: () => mocks.picture,
  getJukeboxFile: mocks.getJukeboxFile,
  putJukeboxFile: mocks.putJukeboxFile,
  deleteJukeboxFile: mocks.deleteJukeboxFile,
}));

vi.mock('@/utils/files', () => ({
  fileHandler: {
    pickAudioFiles: mocks.pickAudioFiles,
    getFile: mocks.getFile,
    getAsFileSystemHandle: mocks.getAsFileSystemHandle,
    extractTrackMetadata: mocks.extractTrackMetadata,
  },
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
  },
  emits: ['create', 'sort'],
  setup(_, { slots }) {
    return () => h('div', { 'data-stub': 'BaseListView' }, slots.default?.());
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
    mocks.getJukeboxFile.mockResolvedValue(undefined);
    mocks.pickAudioFiles.mockResolvedValue([]);
    mocks.deleteJukeboxFile.mockResolvedValue(undefined);
    mocks.getFile.mockResolvedValue(audioFile());
    mocks.getAsFileSystemHandle.mockResolvedValue(null);
    mocks.extractTrackMetadata.mockResolvedValue({
      title: 'Song',
      artist: 'Artist',
      duration: 42,
      color: '#ffffff',
      palette: ['#ffffff'],
    });
    mocks.trackIsActive.mockReturnValue(false);
    vi.clearAllMocks();
  });

  it('imports picked files and appends them to the selected playlist', async () => {
    const config = useConfigStore();
    mocks.playlists.items.value = [{ id: 'p1', trackIds: ['old'] }];
    config.jukeboxActivePlaylistId = 'p1';
    mocks.pickAudioFiles.mockResolvedValue([
      { file: audioFile(), source: { kind: 'blob', blob: audioFile() } },
    ]);

    const { list } = await mountView();
    list.vm.$emit('create');
    await flushPromises();

    expect(mocks.putJukeboxFile).toHaveBeenCalled();
    expect(mocks.extractTrackMetadata).toHaveBeenCalled();
    expect(mocks.tracks.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Song', artist: 'Artist' }),
    );
    expect(mocks.playlists.update).toHaveBeenCalledWith('p1', {
      trackIds: ['old', 'track-1'],
    });
    expect(mocks.actualiseQueue).toHaveBeenCalled();
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
    mocks.getJukeboxFile.mockResolvedValue({ id: existing.fileId });
    mocks.pickAudioFiles.mockResolvedValue([
      { file, source: { kind: 'blob', blob: file } },
    ]);

    const { list } = await mountView();
    list.vm.$emit('create');
    await flushPromises();

    expect(mocks.putJukeboxFile).not.toHaveBeenCalled();
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
    expect(mocks.deleteJukeboxFile).toHaveBeenCalledWith('f1');
  });

  it('keeps files shared by other tracks when removing a track', async () => {
    const first = { id: 't1', fileId: 'shared', title: 'One' } as JukeboxTrack;
    const second = { id: 't2', fileId: 'shared', title: 'Two' } as JukeboxTrack;
    mocks.tracks.items.value = [first, second];
    const { list } = await mountView();

    const card = (list.props('cardProps') as any)(first);
    await card.onRemove();
    expect(mocks.deleteJukeboxFile).not.toHaveBeenCalled();
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
    mocks.getAsFileSystemHandle.mockResolvedValue(handle);
    mocks.getFile.mockResolvedValue(file);

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

    expect(mocks.getFile).toHaveBeenCalledWith({ kind: 'handle', handle });
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
    mocks.getAsFileSystemHandle.mockResolvedValue(null);

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

  it('uses the file name when metadata has no title and keeps file dates', async () => {
    mocks.getJukeboxFile.mockResolvedValue({ id: 'existing', createdAt: 123 });
    mocks.extractTrackMetadata.mockResolvedValue({});
    mocks.pickAudioFiles.mockResolvedValue([
      {
        file: audioFile('untitled.mp3'),
        source: { kind: 'blob', blob: audioFile() },
      },
    ]);

    const { list } = await mountView();
    list.vm.$emit('create');
    await flushPromises();

    expect(mocks.putJukeboxFile).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: 123 }),
    );
    expect(mocks.tracks.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'untitled' }),
    );
  });

  it('guards concurrent imports and handles picker errors', async () => {
    let resolvePick: (value: any[]) => void = () => {};
    mocks.pickAudioFiles.mockReturnValue(
      new Promise((resolve) => {
        resolvePick = resolve;
      }),
    );

    const { list } = await mountView();
    list.vm.$emit('create');
    list.vm.$emit('create');
    expect(mocks.pickAudioFiles).toHaveBeenCalledTimes(1);

    document.dispatchEvent(dragEvent('drop', {}));
    await nextTick();

    resolvePick([]);
    await flushPromises();

    mocks.pickAudioFiles.mockRejectedValue(new Error('picker failed'));
    list.vm.$emit('create');
    await flushPromises();

    mocks.pickAudioFiles.mockRejectedValue(
      new DOMException('cancelled', 'AbortError'),
    );
    list.vm.$emit('create');
    await flushPromises();
  });

  it('handles dropped-file and deletion errors without crashing', async () => {
    mocks.getAsFileSystemHandle.mockRejectedValue(new Error('bad drop'));
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
    mocks.deleteJukeboxFile.mockRejectedValue(new Error('file gone'));
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
    mocks.getAsFileSystemHandle.mockResolvedValue(null);

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
});

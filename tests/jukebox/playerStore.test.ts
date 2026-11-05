import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { JukeboxRepeatMode, useConfigStore } from '@/utils/configStore';
import { Notify } from 'quasar';
import i18n from '@/i18n';

const mocks = vi.hoisted(() => ({
  howls: [] as any[],
  getJukeboxFile: vi.fn(),
  getFile: vi.fn(),
  pictureUrl: vi.fn(() => 'blob:artwork'),
  tracks: {
    items: { value: [] as any[] },
    getById: vi.fn(),
    load: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  },
  playlists: {
    items: { value: [] as any[] },
    getById: vi.fn(),
    load: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('howler', () => {
  class MockHowl {
    options: any;
    volumeValue: number;
    seekValue = 0;
    unloaded = false;
    offCalled = false;
    fadeCalls: Array<[number, number, number]> = [];

    constructor(options: any) {
      this.options = options;
      this.volumeValue = options.volume ?? 1;
      mocks.howls.push(this);
    }

    play() {
      this.options.onplay?.();
      return 1;
    }
    pause() {
      this.options.onpause?.();
    }
    stop() {}
    unload() {
      this.unloaded = true;
    }
    seek(value?: number) {
      if (value === undefined) return this.seekValue;
      this.seekValue = value;
      this.options.onseek?.();
      return this;
    }
    duration() {
      return 120;
    }
    volume(value?: number) {
      if (value === undefined) return this.volumeValue;
      this.volumeValue = value;
      return this;
    }
    fade(from: number, to: number, duration: number) {
      this.fadeCalls.push([from, to, duration]);
      this.volumeValue = to;
      return this;
    }
    off() {
      this.offCalled = true;
      return this;
    }
  }

  return {
    Howl: MockHowl,
    Howler: {
      volume: vi.fn(),
      codecs: vi.fn(() => true),
    },
  };
});

vi.mock('@/utils/files', () => ({
  fileHandler: { getFile: mocks.getFile },
}));

vi.mock('@/jukebox/stores', () => ({
  getJukeboxFile: mocks.getJukeboxFile,
  useJukeboxTracksStore: () => mocks.tracks,
  useJukeboxPlaylistsStore: () => mocks.playlists,
  usePictureUrlCacheStore: () => ({ getPictureUrl: mocks.pictureUrl }),
}));

import {
  resetPlaybackCoordinator,
  setAmbientPauseHandler,
} from '@/utils/playbackCoordinator';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';

function track(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    fileId: `file-${id}`,
    title: id,
    playlistIds: [],
    ...overrides,
  };
}

describe('jukebox player store', () => {
  it('disables playback without a current track or queue', () => {
    setActivePinia(createPinia());
    const player = useJukeboxPlayerStore();
    expect(player.canPlay).toBe(false);
    expect(player.hasNextTrack).toBe(false);
    expect(player.hasPrevTrack).toBe(false);
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    mocks.howls.length = 0;
    vi.clearAllMocks();
    mocks.getJukeboxFile.mockResolvedValue({
      source: { kind: 'blob', blob: new Blob() },
    });
    mocks.getFile.mockResolvedValue(
      new File(['audio'], 'song.mp3', { type: 'audio/mp3' }),
    );
    mocks.tracks.items.value = [];
    mocks.playlists.items.value = [];
    mocks.tracks.getById.mockImplementation((id: string) =>
      mocks.tracks.items.value.find((item) => item.id === id),
    );
    mocks.playlists.getById.mockImplementation((id: string) =>
      mocks.playlists.items.value.find((item) => item.id === id),
    );
    (URL as any).createObjectURL = vi.fn(() => 'blob:audio');
  });

  afterEach(() => {
    resetPlaybackCoordinator();
    delete (navigator as any).mediaSession;
    vi.unstubAllGlobals();
  });

  it('pauses ambient playback when a track starts', async () => {
    const pauseAmbient = vi.fn();
    setAmbientPauseHandler(pauseAmbient);
    const player = useJukeboxPlayerStore();
    const song = track('one');
    mocks.tracks.items.value = [song];
    player.queue = [song];
    player.queueIndex = 0;

    await player.playTrackFromPlaylist(song);

    expect(pauseAmbient).toHaveBeenCalled();
    resetPlaybackCoordinator();
  });

  it('plays, pauses, seeks, changes volume and config toggles', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const song = track('one');
    mocks.tracks.items.value = [song];
    player.queue = [song];
    player.queueIndex = 0;

    await player.playTrackFromPlaylist(song);
    expect(player.currentTrack).toEqual(song);
    expect(player.isPlaying).toBe(true);
    expect(player.duration).toBe(120);
    expect(config.jukeboxLastTrackId).toBe('one');
    expect(config.jukeboxLastPlaylistId).toBeNull();
    expect(mocks.howls).toHaveLength(1);

    player.seek(30);
    expect(player.currentTime).toBe(30);

    player.togglePlay();
    expect(player.isPlaying).toBe(false);
    player.togglePlay();
    expect(player.isPlaying).toBe(true);

    player.setVolume(0.4);
    expect(config.jukeboxLastVolume).toBe(0.4);
    player.toggleMute();
    expect(player.volume).toBe(0);
    player.toggleMute();
    expect(player.volume).toBe(0.4);

    config.jukeboxShuffle = false;
    player.toggleShuffle();
    expect(config.jukeboxShuffle).toBe(true);

    config.jukeboxRepeatMode = JukeboxRepeatMode.off;
    player.cycleRepeatMode();
    expect(config.jukeboxRepeatMode).toBe(JukeboxRepeatMode.list);
    player.cycleRepeatMode();
    expect(config.jukeboxRepeatMode).toBe(JukeboxRepeatMode.track);
    player.cycleRepeatMode();
    expect(config.jukeboxRepeatMode).toBe(JukeboxRepeatMode.off);
  });

  it('advances, wraps and rewinds the queue', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];

    await player.playTrackFromPlaylist(one);
    await player.playNext();
    expect(player.currentTrack?.id).toBe('two');
    expect(player.queueIndex).toBe(1);

    player.seek(6);
    await player.playPrev();
    expect(player.currentTime).toBe(0);
    expect(player.currentTrack?.id).toBe('two');
    await player.playPrev();
    expect(player.currentTrack?.id).toBe('one');

    config.jukeboxRepeatMode = JukeboxRepeatMode.off;
    await player.playNext();
    expect(player.currentTrack?.id).toBe('two');
    await player.playNext();
    expect(player.currentTrack?.id).toBe('two');
    expect(player.isPlaying).toBe(false);

    config.jukeboxRepeatMode = JukeboxRepeatMode.list;
    await player.playNext();
    expect(player.currentTrack?.id).toBe('one');
  });

  it('builds the queue from the active playlist and handles shuffle', () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const two = track('two', { disabled: true });
    const three = track('three');
    mocks.tracks.items.value = [one, two, three];

    const playlist = { id: 'p1', trackIds: ['one', 'two'] };
    mocks.playlists.items.value = [playlist];
    config.jukeboxActivePlaylistId = 'p1';
    config.jukeboxShuffle = false;
    player.actualiseQueue();
    expect(player.queue.map((item) => item.id)).toEqual(['one']);

    config.jukeboxActivePlaylistId = null;
    player.actualiseQueue();
    expect(player.queue.map((item) => item.id)).toEqual(['one', 'three']);

    config.jukeboxShuffle = true;
    player.actualiseQueue();
    expect(player.queue).toHaveLength(2);
  });

  it('binds the queue to the current track playlist when browsing changes', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    mocks.playlists.items.value = [
      { id: 'p1', trackIds: ['one', 'two'] },
      { id: 'p2', trackIds: [] },
    ];

    config.jukeboxActivePlaylistId = 'p1';
    player.actualiseQueue();
    await player.playTrackFromPlaylist(one);
    expect(player.isPlaying).toBe(true);
    expect(player.queue.map((item) => item.id)).toEqual(['one', 'two']);

    // Browsing an empty playlist must not steal the playback controls.
    config.jukeboxActivePlaylistId = 'p2';
    player.actualiseQueue();

    expect(player.currentTrack?.id).toBe('one');
    expect(player.isPlaying).toBe(true);
    expect(player.queue.map((item) => item.id)).toEqual(['one', 'two']);

    await player.playNext();
    expect(player.currentTrack?.id).toBe('two');
  });

  it('keeps the queue on the playing track playlist when browsing changes', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    mocks.playlists.items.value = [
      { id: 'p1', trackIds: ['one', 'two'] },
      { id: 'p2', trackIds: [] },
    ];
    config.jukeboxActivePlaylistId = 'p1';
    config.jukeboxLastTrackId = 'one';

    await player.init();
    expect(player.currentTrack?.id).toBe('one');
    expect(player.queue.map((item) => item.id)).toEqual(['one', 'two']);

    config.jukeboxActivePlaylistId = 'p2';
    await nextTick();

    expect(player.queue.map((item) => item.id)).toEqual(['one', 'two']);
    expect(player.currentTrack?.id).toBe('one');
  });

  it('uses all tracks when the current track has no playlist', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const orphan = track('orphan');
    mocks.tracks.items.value = [one, orphan];
    mocks.playlists.items.value = [{ id: 'p1', trackIds: ['one'] }];

    config.jukeboxActivePlaylistId = 'p1';
    player.actualiseQueue();
    await player.playTrackFromPlaylist(orphan);

    expect(player.currentTrack?.id).toBe('orphan');
    expect(player.queue.map((item) => item.id)).toEqual(['one', 'orphan']);
  });

  it('removes tracks from the queue and stops playback', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];
    player.queueIndex = 0;
    await player.playTrackFromPlaylist(one);

    await player.removeTrackFromQueue(two);
    expect(player.queue.map((item) => item.id)).toEqual(['one']);

    await player.removeTrackFromQueue(one);
    expect(player.currentTrack).toBeNull();

    await player.playTrackFromPlaylist(two);
    player.stop();
    expect(player.currentTrack).toBeNull();
    expect(player.isPlaying).toBe(false);
    expect(player.currentTime).toBe(0);
  });

  it('restores the last track during init without starting playback', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    config.jukeboxLastTrackId = 'one';
    config.jukeboxLastTrackProgress = 15;
    config.jukeboxLastVolume = 0.5;

    await player.init();

    expect(mocks.tracks.load).toHaveBeenCalled();
    expect(mocks.playlists.load).toHaveBeenCalled();
    expect(player.currentTrack?.id).toBe('one');
    expect(player.isPlaying).toBe(false);
    mocks.howls[0]?.options.onload?.();
    expect(mocks.howls[0]?.seekValue).toBe(15);
  });

  it('cross-fades when smooth track changes are enabled', async () => {
    vi.useFakeTimers();
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    config.jukeboxSmoothTrackChange = true;
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];
    player.queueIndex = 0;

    await player.playTrackFromPlaylist(one);
    const firstHowl = mocks.howls[0];

    await player.playTrackFromPlaylist(two);
    const secondHowl = mocks.howls[1];

    expect(firstHowl.offCalled).toBe(true);
    expect(firstHowl.fadeCalls[0]).toEqual([1, 0, 1200]);
    expect(secondHowl.options.volume).toBe(0);
    expect(secondHowl.volumeValue).toBe(1);

    vi.advanceTimersByTime(1300);
    expect(firstHowl.unloaded).toBe(true);
    vi.useRealTimers();
  });

  it('wires media session handlers and metadata', async () => {
    const handlers: Record<string, Function> = {};
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: {
        setActionHandler: vi.fn((name: string, handler: Function) => {
          handlers[name] = handler;
        }),
        metadata: null,
      },
    });
    vi.stubGlobal(
      'MediaMetadata',
      class {
        constructor(public data: any) {}
      },
    );

    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one', { picture: 'https://example.com/art.png' });
    mocks.tracks.items.value = [one];
    config.jukeboxLastTrackId = 'one';

    await player.init();
    await player.playTrackFromPlaylist(one);

    expect(handlers.play).toBeTypeOf('function');
    expect(handlers.pause).toBeTypeOf('function');
    expect(handlers.previoustrack).toBeTypeOf('function');
    expect(handlers.nexttrack).toBeTypeOf('function');
    expect(navigator.mediaSession.metadata).toBeTruthy();

    handlers.pause();
    expect(player.isPlaying).toBe(false);
    await handlers.play();
    expect(player.isPlaying).toBe(true);

    delete (navigator as any).mediaSession;
    vi.unstubAllGlobals();
  });

  it('skips playback when the file record is missing', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    player.queue = [one];
    mocks.getJukeboxFile.mockResolvedValue(undefined);

    await player.playTrackFromPlaylist(one);

    expect(player.currentTrack).toBeNull();
    expect(mocks.howls).toHaveLength(0);
  });

  it('disables tracks whose underlying file disappeared', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];
    mocks.getFile.mockRejectedValueOnce(
      Object.assign(new Error('missing'), { name: 'NotFoundError' }),
    );
    mocks.tracks.update.mockImplementationOnce(
      async (id: string, changes: Record<string, any>) => {
        const target = mocks.tracks.items.value.find((item) => item.id === id);
        if (target) Object.assign(target, changes);
      },
    );

    await player.playTrackFromPlaylist(one);
    await nextTick();

    expect(mocks.tracks.update).toHaveBeenCalledWith('one', {
      disabled: true,
    });
    expect(Notify.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: i18n.global.t('jukebox.trackNotAvailable'),
      }),
    );
    expect(player.currentTrack?.id).toBe('two');
  });

  it('handles Howler callbacks for pause, seek, load errors and missing tracks', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    player.queue = [one];
    await player.playTrackFromPlaylist(one);

    const howl = mocks.howls[0];
    howl.options.onpause();
    expect(player.isPlaying).toBe(false);
    howl.options.onseek();
    expect(player.currentTime).toBe(0);
    howl.options.onloaderror(1, new Error('decode'));
    howl.options.onplayerror(
      1,
      Object.assign(new Error('missing'), { name: 'NotFoundError' }),
    );
    await vi.waitFor(() => {
      expect(mocks.tracks.update).toHaveBeenCalledWith('one', {
        disabled: true,
      });
    });
  });

  it('checks file handle permissions in every state', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    player.queue = [one];

    const granted = {
      queryPermission: vi.fn().mockResolvedValue('granted'),
      requestPermission: vi.fn(),
    };
    mocks.getJukeboxFile.mockResolvedValueOnce({
      source: { kind: 'handle', handle: granted },
    });
    await player.playTrackFromPlaylist(one);
    expect(player.isPlaying).toBe(true);

    const requested = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };
    mocks.getJukeboxFile.mockResolvedValueOnce({
      source: { kind: 'handle', handle: requested },
    });
    await player.playTrackFromPlaylist(one);
    expect(requested.requestPermission).toHaveBeenCalled();

    const denied = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('denied'),
    };
    mocks.getJukeboxFile.mockResolvedValueOnce({
      source: { kind: 'handle', handle: denied },
    });
    await player.playTrackFromPlaylist(one);

    const throwing = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockRejectedValue(new Error('nope')),
    };
    mocks.getJukeboxFile.mockResolvedValueOnce({
      source: { kind: 'handle', handle: throwing },
    });
    await expect(player.playTrackFromPlaylist(one)).resolves.toBeUndefined();
  });

  it('handles file names without extensions and missing playback', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    player.queue = [one];
    mocks.getFile.mockResolvedValueOnce(new File(['audio'], 'song'));

    await player.playTrackFromPlaylist(one);
    expect(player.isPlaying).toBe(true);

    const empty = useJukeboxPlayerStore();
    empty.togglePlay();
    empty.pause();
    expect(empty.isPlaying).toBe(false);
  });

  it('restores nothing when the last track is missing', async () => {
    const config = useConfigStore();
    config.jukeboxLastTrackId = null;
    const player = useJukeboxPlayerStore();
    await player.init();
    expect(player.currentTrack).toBeNull();

    config.jukeboxLastTrackId = 'missing';
    const missing = useJukeboxPlayerStore();
    mocks.tracks.items.value = [];
    await missing.init();
    expect(missing.currentTrack).toBeNull();
  });

  it('handles repeat-track next, previous at the start and queue resorting', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];
    player.queueIndex = 0;
    await player.playTrackFromPlaylist(one);
    await player.playPrev();
    expect(player.currentTrack?.id).toBe('one');

    config.jukeboxRepeatMode = JukeboxRepeatMode.track;
    await player.playNext();
    expect(player.currentTrack?.id).toBe('one');

    player.queuePlaylistId = 'p1';
    player.resortQueue('other');
    player.resortQueue('p1');
    expect(player.queue.length).toBe(2);
  });

  it('clears queue playlist bindings for missing playlists', async () => {
    const config = useConfigStore();
    const player = useJukeboxPlayerStore();
    config.jukeboxActivePlaylistId = 'missing';
    await nextTick();
    await nextTick();
    expect(player.currentTrack).toBeNull();
    expect(player.queue).toEqual([]);
  });

  it('handles queue-only playback and queue mutations', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one];
    expect(player.canPlay).toBe(true);
    expect(player.hasPrevTrack).toBe(false);

    player.queueTrackNext(two);
    expect(player.queue.map((item) => item.id)).toEqual(['one', 'two']);
    player.queueTrackLast(two);
    expect(player.queue.map((item) => item.id)).toContain('two');
  });

  it('handles a missing howl instance and paused state', async () => {
    const empty = useJukeboxPlayerStore();
    empty.togglePlay();
    empty.pause();
    expect(empty.isPlaying).toBe(false);
  });

  it('builds metadata without optional artwork and handles media handlers', async () => {
    const handlers: Record<string, Function> = {};
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: {
        setActionHandler: vi.fn((name: string, handler: Function) => {
          handlers[name] = handler;
        }),
        metadata: null,
      },
    });
    vi.stubGlobal(
      'MediaMetadata',
      class {
        constructor(public data: any) {}
      },
    );
    const player = useJukeboxPlayerStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    await player.init();
    await player.playTrackFromPlaylist(one);
    expect(navigator.mediaSession.metadata).toBeTruthy();
    handlers.play();
    handlers.pause();
    handlers.previoustrack();
    handlers.nexttrack();
    delete (navigator as any).mediaSession;
    vi.unstubAllGlobals();
  });

  it('clears queue bindings when the active playlist disappears', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    mocks.playlists.items.value = [{ id: 'p1', trackIds: ['one'] }];
    config.jukeboxActivePlaylistId = 'p1';
    player.actualiseQueue();
    expect(player.queue.map((item) => item.id)).toEqual(['one']);

    mocks.playlists.items.value = [];
    config.jukeboxActivePlaylistId = 'missing';
    await nextTick();
    await nextTick();
    expect(player.currentTrack).toBeNull();
  });

  it('uses Blob artwork metadata for media session', async () => {
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: { setActionHandler: vi.fn(), metadata: null },
    });
    vi.stubGlobal(
      'MediaMetadata',
      class {
        constructor(public data: any) {}
      },
    );
    const player = useJukeboxPlayerStore();
    const one = track('one', {
      picture: new Blob(['art'], { type: 'image/png' }),
    });
    mocks.tracks.items.value = [one];
    await player.playTrackFromPlaylist(one);
    expect(navigator.mediaSession.metadata).toBeTruthy();
    delete (navigator as any).mediaSession;
    vi.unstubAllGlobals();
  });

  it('skips forward over tracks whose files are missing', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const two = track('two');
    const three = track('three');
    const four = track('four');
    mocks.tracks.items.value = [one, two, three, four];
    player.queue = [one, two, three, four];
    mocks.getJukeboxFile.mockImplementation(async (id: string) =>
      id === 'file-two'
        ? undefined
        : { source: { kind: 'blob', blob: new Blob() } },
    );

    await player.playTrackFromPlaylist(one);
    await player.playNext();

    expect(player.currentTrack?.id).toBe('three');
    expect(player.queueIndex).toBe(2);
    expect(player.hasNextTrack).toBe(true);
    expect(mocks.tracks.update).toHaveBeenCalledWith('two', {
      disabled: true,
    });
    expect(Notify.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: i18n.global.t('jukebox.trackNotAvailable'),
      }),
    );
  });

  it('skips backward over tracks whose files are missing', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const two = track('two');
    const three = track('three');
    mocks.tracks.items.value = [one, two, three];
    player.queue = [one, two, three];
    mocks.getJukeboxFile.mockImplementation(async (id: string) =>
      id === 'file-two'
        ? undefined
        : { source: { kind: 'blob', blob: new Blob() } },
    );

    await player.playTrackFromPlaylist(three);
    await player.playPrev();

    expect(player.currentTrack?.id).toBe('one');
    expect(player.queueIndex).toBe(0);
    expect(mocks.tracks.update).toHaveBeenCalledWith('two', {
      disabled: true,
    });
  });

  it('reaches the disabled end state when the last track is unavailable', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];
    mocks.getJukeboxFile.mockImplementation(async (id: string) =>
      id === 'file-two'
        ? undefined
        : { source: { kind: 'blob', blob: new Blob() } },
    );

    await player.playTrackFromPlaylist(one);
    config.jukeboxRepeatMode = JukeboxRepeatMode.off;
    await player.playNext();

    expect(player.currentTrack?.id).toBe('one');
    expect(player.queueIndex).toBe(1);
    expect(player.hasNextTrack).toBe(false);
    expect(player.isPlaying).toBe(false);
    expect(mocks.tracks.update).toHaveBeenCalledWith('two', {
      disabled: true,
    });
  });

  it('persists the playback playlist with the last track', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    mocks.playlists.items.value = [
      { id: 'p1', trackIds: ['one'] },
      { id: 'p2', trackIds: ['two'] },
    ];
    config.jukeboxActivePlaylistId = 'p1';

    await player.playTrackFromPlaylist(one);

    expect(player.queuePlaylistId).toBe('p1');
    expect(config.jukeboxLastPlaylistId).toBe('p1');
    expect(player.queue.map((item) => item.id)).toEqual(['one']);
  });

  it('restores the saved playback playlist instead of the browsed playlist', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    mocks.playlists.items.value = [
      { id: 'p1', trackIds: ['one', 'two'] },
      { id: 'p2', trackIds: ['two', 'one'] },
    ];
    config.jukeboxLastTrackId = 'one';
    config.jukeboxLastPlaylistId = 'p1';
    config.jukeboxActivePlaylistId = 'p2';

    await player.init();

    expect(player.queuePlaylistId).toBe('p1');
    expect(player.queue.map((item) => item.id)).toEqual(['one', 'two']);
  });

  it('restores the all-tracks context when no playlist was saved', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    mocks.playlists.items.value = [{ id: 'p1', trackIds: ['one'] }];
    config.jukeboxLastTrackId = 'one';
    config.jukeboxLastPlaylistId = null;
    config.jukeboxActivePlaylistId = 'p1';

    await player.init();

    expect(player.queuePlaylistId).toBeNull();
    expect(player.queue.map((item) => item.id)).toEqual(['one', 'two']);
  });

  it('keeps the current track when clicking an already disabled track', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const two = track('two', { disabled: true });
    mocks.tracks.items.value = [one, two];

    await player.playTrackFromPlaylist(one);
    const howlCount = mocks.howls.length;

    await player.playTrackFromPlaylist(two);

    expect(player.currentTrack?.id).toBe('one');
    expect(player.isPlaying).toBe(true);
    expect(mocks.howls).toHaveLength(howlCount);
    expect(mocks.tracks.update).not.toHaveBeenCalled();
    expect(Notify.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: i18n.global.t('jukebox.trackNotAvailable'),
      }),
    );
  });

  it('keeps All Tracks as the playback context for a track in a playlist', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    mocks.playlists.items.value = [{ id: 'p1', trackIds: ['one'] }];
    config.jukeboxActivePlaylistId = null;

    await player.playTrackFromPlaylist(one);

    expect(player.queuePlaylistId).toBeNull();
    expect(config.jukeboxLastPlaylistId).toBeNull();
    expect(player.queue.map((item) => item.id)).toEqual(['one', 'two']);
  });
});

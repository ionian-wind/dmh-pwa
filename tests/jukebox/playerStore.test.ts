import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { JukeboxRepeatMode, useConfigStore } from '@/utils/configStore';

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
    delete (navigator as any).mediaSession;
    vi.unstubAllGlobals();
  });

  it('plays, pauses, seeks, changes volume and config toggles', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const song = track('one');
    player.queue = [song];
    player.queueIndex = 0;

    await player.playTrackFromPlaylist(song);
    expect(player.currentTrack).toEqual(song);
    expect(player.isPlaying).toBe(true);
    expect(player.duration).toBe(120);
    expect(config.jukeboxLastTrackId).toBe('one');
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

  it('keeps the current track when the active playlist becomes empty', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    mocks.playlists.items.value = [
      { id: 'p1', trackIds: ['one'] },
      { id: 'p2', trackIds: [] },
    ];

    config.jukeboxActivePlaylistId = 'p1';
    player.actualiseQueue();
    await player.playTrackFromPlaylist(one);
    expect(player.isPlaying).toBe(true);

    config.jukeboxActivePlaylistId = 'p2';
    player.actualiseQueue();

    expect(player.currentTrack?.id).toBe('one');
    expect(player.isPlaying).toBe(true);
    expect(player.queue).toEqual([]);
    expect(player.hasNextTrack).toBe(false);
  });

  it('removes tracks from the queue and stops playback', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const two = track('two');
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
    player.queue = [one, two];
    mocks.getFile.mockRejectedValueOnce(
      Object.assign(new Error('missing'), { name: 'NotFoundError' }),
    );

    await player.playTrackFromPlaylist(one);

    expect(mocks.tracks.update).toHaveBeenCalledWith('one', {
      disabled: true,
    });
    expect(player.currentTrack).toBeNull();
  });

  it('handles Howler callbacks for pause, seek, load errors and missing tracks', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
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
});

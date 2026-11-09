import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { JukeboxRepeatMode, useConfigStore } from '@/utils/configStore';

const mocks = vi.hoisted(() => ({
  howls: [] as any[],
  getStoredFile: vi.fn(),
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
    durationValue = 120;
    playResult: number | undefined = 1;
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
      return this.playResult;
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
      return this.durationValue;
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

vi.mock('@/utils/files', async () => {
  const { verifySourcePermission } = await vi.importActual<any>(
    '@/utils/files/access',
  );
  return {
    getFileFromSource: mocks.getFile,
    verifySourcePermission,
    createObjectUrlHandle: (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      return {
        url,
        revoke: () => URL.revokeObjectURL(url),
      };
    },
  };
});

vi.mock('@/utils/files/fileStorage', () => ({
  getStoredFile: mocks.getStoredFile,
}));

vi.mock('@/jukebox/stores', () => ({
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

function installMediaSession() {
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
  return handlers;
}

describe('jukebox player store additional branches', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mocks.howls.length = 0;
    vi.clearAllMocks();
    mocks.pictureUrl.mockReturnValue('blob:artwork');
    mocks.getStoredFile.mockResolvedValue({
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
    (URL as any).revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    resetPlaybackCoordinator();
    delete (navigator as any).mediaSession;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('enables playback from a selected track with an empty queue', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    await player.playTrackFromPlaylist(one);

    player.queue = [];
    expect(player.canPlay).toBe(true);
    player.seek(3);
    expect(player.currentTime).toBe(3);
  });

  it('does not duplicate the disabled update for an unavailable disabled track', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    player.queue = [one];
    mocks.getStoredFile.mockImplementation(async () => {
      one.disabled = true;
      return undefined;
    });

    await player.playTrackFromPlaylist(one);

    expect(mocks.tracks.update).not.toHaveBeenCalledWith('one', {
      disabled: true,
    });
  });

  it('handles media actions without a selected track and ignores same-id updates', async () => {
    const handlers = installMediaSession();
    const player = useJukeboxPlayerStore();
    await player.init();

    expect(handlers.play()).toBeNull();

    const one = track('one');
    mocks.tracks.items.value = [one];
    await player.playTrackFromPlaylist(one);
    await nextTick();

    // Replacing the object without changing its id must not rebuild metadata.
    player.currentTrack = { ...one };
    await nextTick();
    expect(navigator.mediaSession.metadata).toBeTruthy();
  });

  it('builds artwork metadata for string, blob and other picture values', async () => {
    installMediaSession();
    const player = useJukeboxPlayerStore();
    const one = track('one', { picture: 'art.png' });
    mocks.tracks.items.value = [one];

    mocks.pictureUrl.mockReturnValueOnce('');
    await player.playTrackFromPlaylist(one);
    await nextTick();
    expect(navigator.mediaSession.metadata).toBeTruthy();

    // Non-Blob object artwork falls back to the jpeg type.
    const two = track('two', { picture: { nested: true } });
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];
    await player.playTrackFromPlaylist(two);
    await nextTick();
    expect(navigator.mediaSession.metadata).toBeTruthy();

    // A Blob without a MIME type also falls back to jpeg.
    const three = track('three', { picture: new Blob(['art']) });
    mocks.tracks.items.value = [one, two, three];
    player.queue = [one, two, three];
    await player.playTrackFromPlaylist(three);
    await nextTick();
    expect(navigator.mediaSession.metadata).toBeTruthy();
  });

  it('clears stale queue playlist ids when tracks change', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    await player.init();
    player.queuePlaylistId = 'ghost';
    await nextTick();

    mocks.tracks.items.value = [one, track('two')];
    await nextTick();

    expect(player.queuePlaylistId).toBeNull();
  });

  it('follows active playlist changes without a current track', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    mocks.playlists.items.value = [{ id: 'p1', trackIds: ['one'] }];
    await player.init();

    config.jukeboxActivePlaylistId = 'missing';
    await nextTick();
    expect(config.jukeboxActivePlaylistId).toBeNull();

    config.jukeboxActivePlaylistId = 'p1';
    await nextTick();
    expect(player.queuePlaylistId).toBe('p1');

    config.jukeboxActivePlaylistId = null;
    await nextTick();
    expect(player.queuePlaylistId).toBeNull();
  });

  it('queues tracks into an empty queue and at the end', () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const two = track('two');
    const three = track('three');

    player.queue = [];
    player.queueIndex = 0;
    player.queueTrackNext(one);
    expect(player.queue.map((item) => item.id)).toEqual(['one']);

    player.queueTrackLast(two);
    expect(player.queue.map((item) => item.id)).toEqual(['one', 'two']);

    player.queueIndex = 0;
    player.queueTrackLast(three);
    expect(player.queue.map((item) => item.id)).toEqual([
      'one',
      'two',
      'three',
    ]);
  });

  it('derives the audio format from a file name without a MIME type', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    player.queue = [one];
    mocks.getFile.mockResolvedValueOnce(new File(['audio'], 'song.ogg'));

    await player.playTrackFromPlaylist(one);

    expect(mocks.howls[0].options.format).toEqual(['ogg']);
  });

  it('reads seek and duration defensively inside Howler callbacks', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    player.queue = [one];

    await player.playTrackFromPlaylist(one);
    const howl = mocks.howls[0];

    howl.durationValue = 0;
    howl.options.onplay();
    expect(player.duration).toBe(0);

    howl.options.onload();
    expect(player.duration).toBe(0);

    howl.seek = () => 0 as any;
    howl.options.onseek();
    expect(player.currentTime).toBe(0);
  });

  it('ignores play errors that are not missing files', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    player.queue = [one];
    await player.playTrackFromPlaylist(one);

    mocks.tracks.update.mockClear();
    await mocks.howls[0].options.onplayerror(1, new Error('other'));
    await nextTick();

    expect(mocks.tracks.update).not.toHaveBeenCalled();
    expect(player.currentTrack?.id).toBe('one');
  });

  it('returns false when a playlist has no playable track', async () => {
    const player = useJukeboxPlayerStore();
    mocks.tracks.items.value = [track('one', { disabled: true })];
    mocks.playlists.items.value = [{ id: 'p1', trackIds: ['one'] }];

    await expect(player.playPlaylist('p1')).resolves.toBe(false);
  });

  it('wraps the fallback candidates when the repeat list mode is active', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];
    config.jukeboxRepeatMode = JukeboxRepeatMode.list;
    mocks.getStoredFile.mockImplementation(async (id: string) =>
      id === 'file-one'
        ? undefined
        : { source: { kind: 'blob', blob: new Blob() } },
    );

    await player.playTrackFromPlaylist(one);

    expect(player.currentTrack?.id).toBe('two');
  });

  it('pauses active playback without toggling', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    player.queue = [one];
    await player.playTrackFromPlaylist(one);
    expect(player.isPlaying).toBe(true);

    player.pause();
    expect(player.isPlaying).toBe(false);
  });

  it('skips disabled candidates while advancing', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const two = track('two', { disabled: true });
    const three = track('three');
    mocks.tracks.items.value = [one, two, three];
    player.queue = [one, two, three];
    await player.playTrackFromPlaylist(one);

    // Inject a disabled entry after the queue was built.
    player.queue = [one, two, three];
    player.queueIndex = 0;
    await player.playNext();

    expect(player.currentTrack?.id).toBe('three');
  });

  it('stops previous navigation at the beginning when nothing before is playable', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];
    mocks.getStoredFile.mockImplementation(async (id: string) =>
      id === 'file-one'
        ? undefined
        : { source: { kind: 'blob', blob: new Blob() } },
    );

    await player.playTrackFromPlaylist(two);
    await player.playPrev();

    expect(player.queueIndex).toBe(0);
    expect(player.currentTrack?.id).toBe('two');
  });

  it('falls through when repeat-track playback fails', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    player.queue = [one];
    await player.playTrackFromPlaylist(one);
    config.jukeboxRepeatMode = JukeboxRepeatMode.track;
    mocks.getStoredFile.mockResolvedValue(undefined);

    await player.playNext();

    expect(player.isPlaying).toBe(false);
  });

  it('reaches the end of the queue while repeat list is active', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];
    await player.playTrackFromPlaylist(one);
    config.jukeboxRepeatMode = JukeboxRepeatMode.list;
    mocks.getStoredFile.mockResolvedValue(undefined);

    await player.playNext();

    expect(player.isPlaying).toBe(false);
  });

  it('stops cleanly without an active howl', () => {
    const player = useJukeboxPlayerStore();
    player.stop();
    expect(player.currentTrack).toBeNull();
    expect(player.isPlaying).toBe(false);
  });

  it('removes the current track without resuming when playback was paused', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];
    await player.playTrackFromPlaylist(one);
    player.pause();

    await player.removeTrackFromQueue(one);

    expect(player.currentTrack).toBeNull();
    expect(player.isPlaying).toBe(false);
  });

  it('reports whether the current track is active in a playlist context', async () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];
    await player.playTrackFromPlaylist(one);
    config.jukeboxActivePlaylistId = 'p1';

    expect(player.trackIsActive(two, 'p1')).toBe(false);
    expect(player.trackIsActive(one, null)).toBe(false);
    expect(player.trackIsActive(one, 'p1')).toBe(true);
  });

  it('ignores anchors that are not part of the selected playlist', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    mocks.playlists.items.value = [{ id: 'p1', trackIds: ['one'] }];

    player.queuePlaylistId = 'p1';
    player.actualiseQueue('two');

    expect(player.queue.map((item) => item.id)).toEqual(['one']);
    expect(player.queueIndex).toBe(0);
  });

  it('ignores volume updates that do not change the volume', () => {
    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    player.setVolume(1);
    player.setVolume(1);

    expect(config.jukeboxLastVolume).toBe(1);
  });

  it('unmutes to a safe default when the last volume was zero', async () => {
    const config = useConfigStore();
    config.jukeboxLastVolume = 0;
    const player = useJukeboxPlayerStore();
    await player.init();

    expect(player.volume).toBe(0);
    player.toggleMute();
    expect(player.volume).toBe(0.5);
  });

  it('advances to the next track from the pre-end progress timer', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const player = useJukeboxPlayerStore();
    const config = useConfigStore();
    config.jukeboxSmoothTrackChange = true;
    config.jukeboxRepeatMode = JukeboxRepeatMode.off;
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];
    player.queueIndex = 0;
    await player.playTrackFromPlaylist(one);

    const howl = mocks.howls[0];
    howl.seekValue = 119; // One second remaining.
    frames.at(-1)?.(0);

    // The next track preparation is still pending, so ending the current
    // track must not advance the queue a second time.
    mocks.getStoredFile.mockReturnValue(new Promise(() => {}));
    await nextTick();
    howl.options.onend();

    expect(mocks.howls).toHaveLength(1);

    // After transition starts, a non-numeric seek must not throw.
    const seek = howl.seek;
    howl.seek = () => 'invalid' as any;
    frames.at(-1)?.(0);
    howl.seek = seek;
  });

  it('seeks when a howl exists and leaves state untouched otherwise', async () => {
    const player = useJukeboxPlayerStore();
    player.seek(10);
    expect(player.currentTime).toBe(0);

    const one = track('one');
    mocks.tracks.items.value = [one];
    player.queue = [one];
    await player.playTrackFromPlaylist(one);
    player.seek(10);
    expect(player.currentTime).toBe(10);
  });

  it('notifies ambient when smooth switching starts', async () => {
    const pauseAmbient = vi.fn();
    setAmbientPauseHandler(pauseAmbient);
    const player = useJukeboxPlayerStore();
    const one = track('one');
    mocks.tracks.items.value = [one];
    player.queue = [one];
    await player.playTrackFromPlaylist(one);
    expect(pauseAmbient).toHaveBeenCalled();
  });

  it('advances the queue when the current track ends naturally', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const two = track('two');
    mocks.tracks.items.value = [one, two];
    player.queue = [one, two];
    await player.playTrackFromPlaylist(one);

    mocks.howls[0].options.onend();

    await vi.waitFor(() => {
      expect(player.currentTrack?.id).toBe('two');
    });
  });

  it('plays a track that is no longer present in the stored track list', async () => {
    const player = useJukeboxPlayerStore();
    const one = track('one');
    const orphan = track('orphan');
    mocks.tracks.items.value = [one];

    await player.playTrackFromPlaylist(orphan);

    expect(player.currentTrack?.id).toBe('orphan');
    expect(player.queue.map((item) => item.id)).toEqual(['one']);
    expect(player.queueIndex).toBe(0);
  });
});

import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { JukeboxTrack } from './types';
import {
  getJukeboxFile,
  useJukeboxPlaylistsStore,
  useJukeboxTracksStore,
  usePictureUrlCacheStore,
} from './stores';
import { JukeboxRepeatMode, useConfigStore } from '@/utils/configStore';
import { fileHandler } from '@/utils/files';
import { debug, debugError, debugWarn } from '@/utils/debug';
import { rng } from '@/utils/random';
import { Howl, Howler } from 'howler';
import {
  pauseAmbientForJukebox,
  setJukeboxPauseHandler,
} from '@/utils/playbackCoordinator';

const SMOOTH_TRACK_FADE_MS = 1200;

// Helper to handle file permissions
const verifyFilePermission = async (
  handle: FileSystemFileHandle,
  mode: 'read' | 'readwrite' = 'read',
) => {
  // @ts-ignore
  const query = await handle.queryPermission({ mode });
  if (query === 'granted') return true;
  try {
    // @ts-ignore
    const request = await handle.requestPermission({ mode });
    return request === 'granted';
  } catch {
    return false;
  }
};

const isFileSystemFileHandle = (obj: any): obj is FileSystemFileHandle =>
  obj &&
  typeof obj === 'object' &&
  typeof obj.getFile === 'function' &&
  typeof obj.name === 'string';

export const useJukeboxPlayerStore = defineStore('jukeboxPlayer', () => {
  let howl: Howl | null = null;
  const configStore = useConfigStore();

  // Other Stores
  const tracksStore = useJukeboxTracksStore();
  const playlistsStore = useJukeboxPlaylistsStore();
  const pictureUrlCacheStore = usePictureUrlCacheStore();

  // Core State
  const currentTrack = ref<JukeboxTrack | null>(null);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const volume = ref<number>(1);
  const lastVolume = ref(1);

  // Queue State
  const queue = ref<JukeboxTrack[]>([]);
  const queueIndex = ref(0);
  // Playlist that owns the current playback queue. `null` means all tracks.
  const queuePlaylistId = ref<string | null>(
    configStore.jukeboxActivePlaylistId ?? null,
  );
  // Keeps queue rebuilds anchored to a track that is being started while the
  // async audio preparation is still in progress.
  let queueAnchorTrackId: string | null = null;

  // Guards the automatic pre-end crossfade from being triggered twice.
  let transitionInProgress = false;

  // --- Shuffle/Repeat/History State ---
  const hasPrevTrack = computed(() => {
    const currentIndex = queueIndex.value;

    // If no current track or history is empty, there's no previous track
    if (!currentTrack.value || queue.value.length === 0) {
      return false;
    }

    // Check if current track is in the queue and not the first one
    // Not first track, or else = check if track has been playing for at least 5 seconds
    return currentIndex > 0 || currentTime.value >= 5;
  });

  const canPlay = computed(() => {
    // If a track is selected, always enable
    if (currentTrack.value) {
      return true;
    }
    // If no track selected, check if there are tracks in the queue to play
    if (queue.value.length > 0) {
      return true;
    }
    // If no tracks available in queue, disable
    return false;
  });

  const hasNextTrack = computed(() => {
    // If no current track or queue is empty, there's no next track
    if (!currentTrack.value || queue.value.length === 0) {
      return false;
    }

    // Check if current track is in the queue and not the last one
    const currentIndex = queueIndex.value;

    return (
      configStore.jukeboxRepeatMode === JukeboxRepeatMode.list ||
      currentIndex < queue.value.length - 1
    );
  });

  // --- Core Methods ---
  async function init() {
    debug('🎵 JukeboxPlayer: Initializing global player store (Howler)');
    // Log all Howler-supported codecs
    const codecs = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'opus', 'webm', 'flac'];
    const codecSupport: Record<string, boolean> = {};
    codecs.forEach((codec) => {
      codecSupport[codec] = Howler.codecs(codec);
    });
    debug('🎵 JukeboxPlayer: Codec support:', codecSupport);
    // Howler doesn't need to watch for an audio element, so we move this logic to init
    await Promise.all([tracksStore.load(), playlistsStore.load()]);

    const vol = configStore.jukeboxLastVolume;
    Howler.volume(vol);
    volume.value = vol;
    lastVolume.value = vol;
    setupMediaSession();
    await restoreLastTrack();
    watchPlaylist();
  }

  // --START -- MEDIA SESSION
  function setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () =>
        currentTrack.value ? playTrack(currentTrack.value) : null,
      );
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () =>
        playPrev(),
      );
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    } else {
      debug('🎵 JukeboxPlayer: Media Session API not available');
    }
  }

  function updateMediaMetadata() {
    if ('mediaSession' in navigator && currentTrack.value) {
      debug(
        '🎵 JukeboxPlayer: Updating Media Session metadata for track:',
        currentTrack.value.title,
      );

      const artwork = [];
      if (currentTrack.value.picture) {
        const src = pictureUrlCacheStore.getPictureUrl(
          currentTrack.value.picture,
        );
        if (src) {
          artwork.push({
            src,
            sizes: '512x512',
            type:
              typeof currentTrack.value.picture === 'string'
                ? 'image/jpeg'
                : currentTrack.value.picture instanceof Blob
                  ? currentTrack.value.picture.type || 'image/jpeg'
                  : 'image/jpeg',
          });
        }
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.value.title,
        artist: currentTrack.value.artist,
        album: "Owlbear's DMH", // TODO: set album name
        artwork: artwork,
      });
    }
  }

  watch(currentTrack, (newTrack, oldTrack) => {
    if (newTrack?.id !== oldTrack?.id) {
      updateMediaMetadata();
    }
  });

  function resolvePlaylistIdForTrack(
    track: JukeboxTrack,
    preferredPlaylistId: string | null = null,
  ): string | null {
    if (preferredPlaylistId) {
      const preferred = playlistsStore.getById(preferredPlaylistId);
      if (preferred?.trackIds.includes(track.id)) return preferredPlaylistId;
    }

    const containing = playlistsStore.items.value.find((playlist) =>
      playlist.trackIds.includes(track.id),
    );
    return containing?.id ?? null;
  }

  async function restoreLastTrack() {
    debug('🎵 JukeboxPlayer: Attempting to restore last track');
    debug(
      '🎵 JukeboxPlayer: Config lastTrackId:',
      configStore.jukeboxLastTrackId,
    );
    debug(
      '🎵 JukeboxPlayer: Config lastTrackProgress:',
      configStore.jukeboxLastTrackProgress,
    );
    debug(
      '🎵 JukeboxPlayer: Config lastVolume:',
      configStore.jukeboxLastVolume,
    );

    const lastTrackId = configStore.jukeboxLastTrackId;

    if (!lastTrackId) {
      debug('🎵 JukeboxPlayer: No lastTrackId in config, skipping restoration');
      return;
    }

    const lastTrack = tracksStore.getById(lastTrackId);
    if (!lastTrack) {
      debug('🎵 JukeboxPlayer: Last track not found in available tracks');
      return;
    }

    queuePlaylistId.value = resolvePlaylistIdForTrack(
      lastTrack,
      configStore.jukeboxActivePlaylistId,
    );
    queueAnchorTrackId = lastTrack.id;
    actualiseQueue();

    try {
      if (
        await prepareAudioFile(lastTrack, configStore.jukeboxLastTrackProgress)
      ) {
        debug('🎵 JukeboxPlayer: Restored last track with Howler');
      }
    } finally {
      queueAnchorTrackId = null;
    }
  }

  const getPlaylistTracks = (shuffleOutput: boolean): JukeboxTrack[] => {
    const currentPlaylistId = queuePlaylistId.value;
    const playlist = currentPlaylistId
      ? playlistsStore.getById(currentPlaylistId)
      : null;
    const tracks = (
      playlist
        ? (playlist.trackIds
            .map((trackId) => tracksStore.getById(trackId))
            .filter(Boolean) as JukeboxTrack[])
        : tracksStore.items.value
    ).filter((t) => !t.disabled);

    return shuffleOutput ? tracks.toSorted(() => 0.5 - rng()) : tracks;
  };

  function watchPlaylist() {
    const queueSignature = () => {
      const playlistId = queuePlaylistId.value;
      const playlist = playlistId ? playlistsStore.getById(playlistId) : null;
      return JSON.stringify({
        playlistId,
        trackIds: playlist?.trackIds ?? null,
        tracks: tracksStore.items.value.map((track) => [
          track.id,
          track.disabled ?? false,
        ]),
      });
    };

    watch(
      queueSignature,
      () => {
        if (
          queuePlaylistId.value &&
          !playlistsStore.getById(queuePlaylistId.value)
        ) {
          queuePlaylistId.value = null;
        }
        actualiseQueue();
      },
      { immediate: true },
    );

    // Changing the browsed playlist must not rebuild the queue while a track is
    // playing. The controls stay bound to the current track's playlist.
    watch(
      () => configStore.jukeboxActivePlaylistId,
      (newPlaylistId) => {
        if (currentTrack.value) return;
        if (newPlaylistId && !playlistsStore.getById(newPlaylistId)) {
          configStore.jukeboxActivePlaylistId = null;
          return;
        }
        queuePlaylistId.value = newPlaylistId ?? null;
        actualiseQueue();
      },
    );
  }
  // -- END -- MEDIA SESSION

  // --- Queue Methods ---
  function addToQueue(tracks: JukeboxTrack[], next?: boolean) {
    if (tracks.length > 0) {
      if (next) {
        queue.value = queue.value.toSpliced(queueIndex.value + 1, 0, ...tracks);
      } else {
        queue.value.push(...tracks);
      }
    }
  }

  function removeFromQueue(tracks: JukeboxTrack[]) {
    const currentQueue = queue.value;
    for (const track of tracks) {
      let index = currentQueue.indexOf(track);
      while (index >= 0) {
        currentQueue.splice(index, 1);

        if (index <= queueIndex.value) {
          queueIndex.value -= 1;
        }

        index = currentQueue.indexOf(track);
      }
    }

    queue.value = currentQueue;
  }

  /**
   * Places a track after the current one or at the end of the queue without
   * starting playback. An existing occurrence is moved instead of duplicated.
   */
  function queueTrack(track: JukeboxTrack, position: 'next' | 'last') {
    const currentId = queue.value.at(queueIndex.value)?.id;
    if (currentId === track.id) return;

    const withoutTrack = queue.value.filter(({ id }) => id !== track.id);
    const currentIndex = currentId
      ? withoutTrack.findIndex(({ id }) => id === currentId)
      : -1;
    const insertIndex =
      position === 'next'
        ? currentIndex >= 0
          ? currentIndex + 1
          : 0
        : withoutTrack.length;

    const nextQueue = withoutTrack.toSpliced(insertIndex, 0, track);
    queue.value = nextQueue;
    queueIndex.value = currentId
      ? nextQueue.findIndex(({ id }) => id === currentId)
      : Math.min(queueIndex.value, Math.max(nextQueue.length - 1, 0));
  }

  function queueTrackNext(track: JukeboxTrack) {
    queueTrack(track, 'next');
  }

  function queueTrackLast(track: JukeboxTrack) {
    queueTrack(track, 'last');
  }

  // --- Playback Methods ---

  const prepareAudioFile = async (
    track: JukeboxTrack,
    seekTo: number = 0,
    smooth = false,
  ): Promise<boolean> => {
    const fileRecord = await getJukeboxFile(track.fileId);
    if (!fileRecord || !fileRecord.source) {
      return false;
    }
    if (fileRecord.source.kind === 'handle') {
      const hasPerm = await verifyFilePermission(
        fileRecord.source.handle,
        'read',
      );
      if (!hasPerm) {
        return false;
      }
    }
    let file: File;
    try {
      file = await fileHandler.getFile(fileRecord.source);
    } catch (err) {
      if (err instanceof Error && err.name === 'NotFoundError') {
        debug('🎵 JukeboxPlayer: File not found, disabling track');
        await tracksStore.update(track.id, { disabled: true });
        return false;
      }
      throw err;
    }
    const src = URL.createObjectURL(file);
    // Determine format from file.type or file.name
    let format: string | undefined;
    if (file.type) {
      format = file.type.split('/').pop();
    } else if (file.name && file.name.includes('.')) {
      format = file.name.split('.').pop();
    }
    if (howl) {
      const previousHowl = howl;
      if (smooth) {
        // Detach callbacks so the outgoing sound cannot advance the queue.
        previousHowl.off();
        previousHowl.fade(
          previousHowl.volume() as number,
          0,
          SMOOTH_TRACK_FADE_MS,
        );
        setTimeout(() => {
          try {
            previousHowl.unload();
          } catch {
            // The sound may already have been unloaded.
          }
        }, SMOOTH_TRACK_FADE_MS + 50);
      } else {
        previousHowl.unload();
      }
      howl = null;
    }
    howl = new Howl({
      src: [src],
      html5: true,
      volume: smooth ? 0 : volume.value,
      format: format ? [format] : undefined,
      onplay: () => {
        pauseAmbientForJukebox();
        isPlaying.value = true;
        duration.value = howl?.duration() || 0;
        startProgressTimer();
        if (smooth) {
          howl?.fade(0, volume.value, SMOOTH_TRACK_FADE_MS);
        }
        debug('🎵 JukeboxPlayer: Howler play event');
      },
      onpause: () => {
        isPlaying.value = false;
        stopProgressTimer();
        debug('🎵 JukeboxPlayer: Howler pause event');
      },
      onend: () => {
        stopProgressTimer();
        if (transitionInProgress) return;
        debug('🎵 JukeboxPlayer: Howler ended event, playing next');
        playNext();
      },
      onseek: () => {
        currentTime.value = (howl?.seek() as number) || 0;
      },
      onload: () => {
        duration.value = howl?.duration() || 0;
        debug('🎵 JukeboxPlayer: Howler loaded, duration:', duration.value);
        if (seekTo > 0 && howl) {
          howl.seek(seekTo);
          currentTime.value = seekTo;
        }
      },
      onloaderror: (_id: number, err: unknown) => {
        debugError('🎵 JukeboxPlayer: Howler load error', err);
      },
      onplayerror: async (_id: number, err: unknown) => {
        debugError('🎵 JukeboxPlayer: Howler play error', err);
        if (err instanceof Error && err.name === 'NotFoundError') {
          debug('🎵 JukeboxPlayer: File not found, disabling track');
          await tracksStore.update(track.id, { disabled: true });
          isPlaying.value = false;
          await playNext();
        }
      },
    });
    transitionInProgress = false;
    currentTrack.value = track;
    return true;
  };

  function resetDuration() {
    configStore.jukeboxLastTrackProgress = 0;
    currentTime.value = 0;
    if (howl) {
      howl.seek(0);
    }
    debug('🎵 JukeboxPlayer: Resetting progress');
  }

  async function playTrack(track: JukeboxTrack) {
    const previousTrackId = currentTrack.value?.id;
    const smooth =
      previousTrackId !== undefined &&
      previousTrackId !== track.id &&
      configStore.jukeboxSmoothTrackChange;

    const prepared = await prepareAudioFile(track, 0, smooth);
    if (!prepared) {
      transitionInProgress = false;
      return;
    }

    configStore.jukeboxLastTrackId = track.id;
    const isNewTrack = previousTrackId !== track.id;
    if (isNewTrack) {
      debug('🎵 JukeboxPlayer: New track');
      resetDuration();
    }
    try {
      howl?.play();
      debug('🎵 JukeboxPlayer: Track playback started successfully (Howler)');
    } catch (error) {
      debugError('🎵 JukeboxPlayer: Playback failed (Howler).', error);
      isPlaying.value = false;
    }
  }

  async function playTrackFromPlaylist(track: JukeboxTrack) {
    queuePlaylistId.value = resolvePlaylistIdForTrack(
      track,
      configStore.jukeboxActivePlaylistId,
    );
    queueAnchorTrackId = track.id;
    actualiseQueue(track.id);

    try {
      await playTrack(track);
    } finally {
      queueAnchorTrackId = null;
    }

    const index = queue.value.findIndex(({ id }) => id === track.id);
    queueIndex.value = index >= 0 ? index : 0;
  }

  async function togglePlay() {
    debug(
      '🎵 JukeboxPlayer: Toggle play called, current state:',
      isPlaying.value,
    );

    if (!howl) {
      debugWarn('🎵 JukeboxPlayer: No Howler instance available');
      return;
    }

    if (isPlaying.value) {
      debug('🎵 JukeboxPlayer: Pausing playback (Howler)');
      howl.pause();
      isPlaying.value = false;
    } else {
      debug('🎵 JukeboxPlayer: Resuming playback (Howler)');
      howl.play();
    }
  }

  function pause() {
    if (!isPlaying.value) return;
    howl?.pause();
    isPlaying.value = false;
  }

  async function playPrev() {
    if (!hasPrevTrack.value) {
      return;
    }

    if (currentTime.value >= 5) {
      resetDuration();
      return;
    }

    queueIndex.value -= 1;
    const prevTrack = queue.value.at(queueIndex.value);
    if (prevTrack) await playTrack(prevTrack);
  }

  async function playNext() {
    const repeatMode = configStore.jukeboxRepeatMode;

    if (repeatMode === JukeboxRepeatMode.track) {
      // Replay the current track from the beginning
      if (currentTrack.value) {
        await playTrack(currentTrack.value);
        return;
      }
    }

    if (!hasNextTrack.value) {
      isPlaying.value = false;
      resetDuration();
      return;
    }

    if (queueIndex.value === queue.value.length - 1) {
      if (repeatMode === JukeboxRepeatMode.list) {
        // Wrap around instead of appending the playlist again; the latter
        // grows the queue without bound during long sessions.
        queueIndex.value = -1;
      }
    }
    queueIndex.value += 1;

    const nextTrack = queue.value.at(queueIndex.value);
    if (nextTrack) await playTrack(nextTrack);
  }

  function stop() {
    debug('🎵 JukeboxPlayer: Stopping playback (Howler)');
    if (howl) {
      howl.stop();
      howl.unload();
      howl = null;
    }
    stopProgressTimer();
    transitionInProgress = false;
    isPlaying.value = false;
    currentTrack.value = null;
    currentTime.value = 0;
    configStore.jukeboxLastTrackId = null;
    configStore.jukeboxLastTrackProgress = 0;
  }

  // --- Shuffle/Repeat/History Methods ---
  function toggleShuffle() {
    configStore.jukeboxShuffle = !configStore.jukeboxShuffle;

    actualiseQueue();
  }

  function cycleRepeatMode() {
    const repeatMode = configStore.jukeboxRepeatMode;

    if (repeatMode === JukeboxRepeatMode.off) {
      configStore.jukeboxRepeatMode = JukeboxRepeatMode.list;
    } else if (repeatMode === JukeboxRepeatMode.list) {
      configStore.jukeboxRepeatMode = JukeboxRepeatMode.track;
    } else {
      configStore.jukeboxRepeatMode = JukeboxRepeatMode.off;
    }
  }

  // --- Watch for active playlist changes to update queue context ---

  /**
   * Remove a track from the queue and handle play state/history.
   * Returns true if the track was in the queue and removed, false otherwise.
   */
  async function removeTrackFromQueue(track: JukeboxTrack) {
    const wasPlaying = isPlaying.value;
    const isCurrentTrack = currentTrack.value?.id === track.id;

    removeFromQueue([track]);

    if (isCurrentTrack) {
      stop();
      if (wasPlaying) {
        await playNext();
      }
    }
  }

  /**
   * Returns true if the given track is the currently active track in the current playlist context.
   * @param track The track to check
   * @param selectedPlaylistId The selected playlist id (from JukeboxView)
   */
  function trackIsActive(
    track: JukeboxTrack,
    selectedPlaylistId: string | null,
  ): boolean {
    return Boolean(
      currentTrack.value &&
      currentTrack.value.id === track.id &&
      configStore.jukeboxActivePlaylistId === selectedPlaylistId,
    );
  }

  function actualiseQueue(anchorTrackId?: string) {
    const resolvedAnchorId =
      anchorTrackId ?? queueAnchorTrackId ?? currentTrack.value?.id ?? null;

    if (
      !resolvedAnchorId &&
      queuePlaylistId.value !== (configStore.jukeboxActivePlaylistId ?? null)
    ) {
      queuePlaylistId.value = configStore.jukeboxActivePlaylistId ?? null;
    }

    const anchorTrack = resolvedAnchorId
      ? tracksStore.getById(resolvedAnchorId)
      : null;
    const shuffle = configStore.jukeboxShuffle;
    const tracks = getPlaylistTracks(shuffle);

    queue.value = [];
    queueIndex.value = 0;

    if (tracks.length > 0) {
      if (shuffle) {
        if (anchorTrack) {
          addToQueue([anchorTrack]);
        }

        addToQueue(
          tracks.filter(({ id }) => id !== (anchorTrack ? anchorTrack.id : '')),
        );
      } else {
        addToQueue(tracks);
      }

      const anchorIndex = anchorTrack
        ? queue.value.findIndex(({ id }) => id === anchorTrack.id)
        : 0;
      queueIndex.value = anchorIndex >= 0 ? anchorIndex : 0;
    } else {
      // An empty playlist must not clear the track that is currently playing.
      // The queue becomes empty, so next/previous are disabled, but the player
      // keeps showing and playing the existing track.
      queueIndex.value = -1;
    }
  }

  function resortQueue(selectedPlaylistId: string) {
    if (
      queuePlaylistId.value === selectedPlaylistId &&
      !configStore.jukeboxShuffle &&
      currentTrack.value
    ) {
      actualiseQueue();
    }
  }

  // --- Volume Methods ---
  function setVolume(newVolume: number) {
    if (volume.value !== newVolume) {
      debug('🎵 JukeboxPlayer: Setting volume to:', newVolume);
      volume.value = newVolume;
      if (newVolume > 0) {
        lastVolume.value = newVolume;
      }
      Howler.volume(newVolume);
      configStore.jukeboxLastVolume = newVolume;
      debug('🎵 JukeboxPlayer: Volume saved to config');
    }
  }

  function toggleMute() {
    debug(
      '🎵 JukeboxPlayer: Toggle mute called, current volume:',
      volume.value,
    );
    if (volume.value > 0) {
      setVolume(0);
      debug('🎵 JukeboxPlayer: Muted');
    } else {
      const newVolume = lastVolume.value > 0 ? lastVolume.value : 0.5;
      setVolume(newVolume);
      debug('🎵 JukeboxPlayer: Unmuted to:', newVolume);
    }
  }

  let progressTimer: number | null = null;

  function startProgressTimer() {
    stopProgressTimer();
    if (howl && isPlaying.value) {
      const update = () => {
        if (howl && isPlaying.value) {
          currentTime.value =
            typeof howl.seek() === 'number' ? (howl.seek() as number) : 0;

          const remaining = duration.value - currentTime.value;
          if (
            !transitionInProgress &&
            configStore.jukeboxSmoothTrackChange &&
            configStore.jukeboxRepeatMode !== JukeboxRepeatMode.track &&
            duration.value > SMOOTH_TRACK_FADE_MS / 1000 &&
            remaining > 0 &&
            remaining <= SMOOTH_TRACK_FADE_MS / 1000 &&
            hasNextTrack.value
          ) {
            // Start the next track early so it can cross-fade with this one.
            transitionInProgress = true;
            playNext();
          }

          progressTimer = requestAnimationFrame(update);
        }
      };
      progressTimer = requestAnimationFrame(update);
    }
  }

  function stopProgressTimer() {
    if (progressTimer !== null) {
      cancelAnimationFrame(progressTimer);
      progressTimer = null;
    }
  }

  setJukeboxPauseHandler(pause);

  return {
    // State
    currentTrack,
    isPlaying,
    queue,
    queueIndex,

    // Getters
    hasPrevTrack,
    canPlay,
    hasNextTrack,

    currentTime,
    duration,

    shuffle: computed(() => configStore.jukeboxShuffle),
    repeatMode: computed(() => configStore.jukeboxRepeatMode),

    volume,

    // Methods
    init,
    actualiseQueue,
    resortQueue,
    removeTrackFromQueue,
    queueTrackNext,
    queueTrackLast,

    playPrev,
    playTrackFromPlaylist,
    togglePlay,
    pause,
    playNext,
    stop,

    seek: (newTime: number) => {
      if (howl) {
        howl.seek(newTime);
        currentTime.value = newTime;
      }
    },
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    trackIsActive,
  };
}, {
  // Playback state contains current tracks, queues and artwork Blobs that are
  // not JSON-serializable; cross-tab sharing corrupts them.
  share: { enable: false },
});

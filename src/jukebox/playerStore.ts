import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { JukeboxTrack } from './types';
import {
  getJukeboxFile,
  useJukeboxPlaylistsStore,
  useJukeboxTracksStore,
} from './stores';
import { JukeboxRepeatMode, useConfigStore } from '@/utils/configStore';
import { getFileFromHandle } from '@/jukebox/FileSystemUtils';
import { debug, debugError, debugWarn } from '@/utils/debug';
import { rng } from '@/utils/random';
import { Howl, Howler } from 'howler';

// Helper to handle file permissions
const verifyFilePermission = async (
  handle: FileSystemFileHandle,
  mode: 'read' | 'readwrite' = 'read',
) => {
  // @ts-ignore
  const query = await handle.queryPermission({ mode });
  // @ts-ignore
  const request = await handle.requestPermission({ mode });

  return query === 'granted' || request === 'granted';
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
      if (
        currentTrack.value.picture &&
        typeof currentTrack.value.picture === 'string'
      ) {
        artwork.push({
          src: currentTrack.value.picture,
          sizes: '512x512',
          type: 'image/jpeg',
        });
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

    if (
      await prepareAudioFile(lastTrack, configStore.jukeboxLastTrackProgress)
    ) {
      debug('🎵 JukeboxPlayer: Restored last track with Howler');
    }
  }

  const getPlaylistTracks = (shuffleOutput: boolean): JukeboxTrack[] => {
    const currentPlaylistId = configStore.jukeboxActivePlaylistId;
    const playlist = currentPlaylistId
      ? playlistsStore.getById(currentPlaylistId)
      : null;
    const tracks = playlist
      ? (playlist.trackIds
          .map((trackId) => tracksStore.getById(trackId))
          .filter(Boolean) as JukeboxTrack[])
      : tracksStore.items.value;

    return shuffleOutput ? tracks.toSorted(() => 0.5 - rng()) : tracks;
  };

  function watchPlaylist() {
    watch(
      () => configStore.$state.jukeboxActivePlaylistId,
      (newPlaylistId) => {
        if (newPlaylistId) {
          const activePlaylist = playlistsStore.getById(newPlaylistId);
          if (!activePlaylist) {
            configStore.jukeboxActivePlaylistId = null;
            return;
          }
        }

        actualiseQueue();
      },
      { immediate: true },
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

  // --- Playback Methods ---

  const prepareAudioFile = async (
    track: JukeboxTrack,
    seekTo: number = 0,
  ): Promise<boolean> => {
    const fileRecord = await getJukeboxFile(track.fileId);
    if (!fileRecord || !isFileSystemFileHandle(fileRecord.handle)) {
      return false;
    }
    const hasPerm = await verifyFilePermission(fileRecord.handle, 'read');
    if (!hasPerm) {
      return false;
    }
    const file = await getFileFromHandle(fileRecord.handle);
    const src = URL.createObjectURL(file);
    // Determine format from file.type or file.name
    let format: string | undefined;
    if (file.type) {
      format = file.type.split('/').pop();
    } else if (file.name && file.name.includes('.')) {
      format = file.name.split('.').pop();
    }
    if (howl) {
      howl.unload();
      howl = null;
    }
    howl = new Howl({
      src: [src],
      html5: true,
      volume: volume.value,
      format: format ? [format] : undefined,
      onplay: () => {
        isPlaying.value = true;
        duration.value = howl?.duration() || 0;
        startProgressTimer();
        debug('🎵 JukeboxPlayer: Howler play event');
      },
      onpause: () => {
        isPlaying.value = false;
        stopProgressTimer();
        debug('🎵 JukeboxPlayer: Howler pause event');
      },
      onend: () => {
        stopProgressTimer();
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
      onloaderror: (id: number, err: unknown) => {
        debugError('🎵 JukeboxPlayer: Howler load error', err);
      },
      onplayerror: (id: number, err: unknown) => {
        debugError('🎵 JukeboxPlayer: Howler play error', err);
      },
    });
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
    if (await prepareAudioFile(track)) {
      configStore.jukeboxLastTrackId = track.id;
      const isNewTrack = currentTrack.value?.id !== track.id;
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
  }

  async function playTrackFromPlaylist(track: JukeboxTrack) {
    queueIndex.value = queue.value.findIndex(({ id }) => id === track.id);

    await playTrack(track);
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
      return;
    }

    if (queueIndex.value === queue.value.length - 1) {
      if (repeatMode === JukeboxRepeatMode.list) {
        addToQueue(getPlaylistTracks(configStore.jukeboxShuffle));
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
    removeFromQueue([track]);
    const played = isPlaying.value;

    stop();

    if (played) {
      await playNext();
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

  function actualiseQueue() {
    const shuffle = configStore.jukeboxShuffle;
    const tracks = getPlaylistTracks(shuffle);

    queue.value = [];
    queueIndex.value = 0;

    if (tracks.length > 0) {
      if (shuffle) {
        if (currentTrack.value) {
          addToQueue([currentTrack.value]);
        }

        addToQueue(
          tracks.filter(
            ({ id }) =>
              id !== (currentTrack.value ? currentTrack.value.id : ''),
          ),
        );
      } else {
        addToQueue(tracks);
      }

      queueIndex.value = currentTrack.value
        ? queue.value.findIndex(({ id }) => id === currentTrack.value!.id)
        : 0;
    } else {
      currentTrack.value = null;
    }
  }

  function resortQueue(selectedPlaylistId: string) {
    if (
      configStore.jukeboxActivePlaylistId === selectedPlaylistId &&
      !configStore.jukeboxShuffle &&
      currentTrack.value
    ) {
      actualiseQueue();
    }
  }

  // --- Volume Methods ---
  function setVolume(newVolume: number) {
    debug('🎵 JukeboxPlayer: Setting volume to:', newVolume);
    volume.value = newVolume;
    if (newVolume > 0) {
      lastVolume.value = newVolume;
    }
    Howler.volume(newVolume);
    configStore.jukeboxLastVolume = newVolume;
    debug('🎵 JukeboxPlayer: Volume saved to config');
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

  return {
    // State
    currentTrack,
    isPlaying,

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
    resortQueue,
    removeTrackFromQueue,

    playPrev,
    playTrackFromPlaylist,
    togglePlay,
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
});

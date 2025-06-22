import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { JukeboxTrack } from './types';
import { useJukeboxTracksStore, getJukeboxFile } from './stores';
import { useConfigStore } from '@/utils/configStore';
import { getFileFromHandle } from '@/jukebox/FileSystemUtils';

// Helper from the original JukeboxPlayer.vue to handle file permissions
async function verifyFilePermission(handle: FileSystemFileHandle, mode: 'read' | 'readwrite' = 'read') {
  // @ts-ignore
  if ((await handle.queryPermission({ mode })) === 'granted') {
    return true;
  }
  // @ts-ignore
  if ((await handle.requestPermission({ mode })) === 'granted') {
    return true;
  }
  console.error('Jukebox: File permission not granted.');
  return false;
}

function isFileSystemFileHandle(obj: any): obj is FileSystemFileHandle {
  return obj && typeof obj === 'object' && typeof obj.getFile === 'function' && typeof obj.name === 'string';
}

export const useJukeboxPlayerStore = defineStore('jukeboxPlayer', () => {
  const audioEl = ref<HTMLAudioElement | null>(null);

  // Core State
  const currentTrack = ref<JukeboxTrack | null>(null);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const volume = ref(1);
  const lastVolume = ref(1);

  // Queue State
  const queue = ref<JukeboxTrack[]>([]);
  const currentQueueId = ref<string | null>(null);

  // Other Stores
  const tracksStore = useJukeboxTracksStore();
  const configStore = useConfigStore();

  const currentTrackIndex = computed(() => {
    if (!currentTrack.value) return -1;
    return queue.value.findIndex(t => t.id === currentTrack.value?.id);
  });
  
  const hasNextTrack = computed(() => {
    // If no current track or queue is empty, there's no next track
    if (!currentTrack.value || queue.value.length === 0) {
      return false;
    }
    
    // Check if current track is in the queue and not the last one
    const currentIndex = currentTrackIndex.value;
    return currentIndex > -1 && currentIndex < queue.value.length - 1;
  });
  
  const isReady = computed(() => {
    return audioEl.value !== null && tracksStore.items.value.length > 0;
  });

  // --- Core Methods ---

  function init(element: HTMLAudioElement) {
    console.log('🎵 JukeboxPlayer: Initializing global player store');
    
    if (audioEl.value) {
      console.log('🎵 JukeboxPlayer: Already initialized, skipping');
      return;
    }
    
    audioEl.value = element;
    console.log('🎵 JukeboxPlayer: Audio element set up');
    
    // Load volume from config
    volume.value = configStore.lastVolume;
    lastVolume.value = configStore.lastVolume;
    audioEl.value.volume = volume.value;
    console.log('🎵 JukeboxPlayer: Volume restored from config:', volume.value);

    audioEl.value.addEventListener('play', () => { 
      isPlaying.value = true; 
      console.log('🎵 JukeboxPlayer: Play event triggered');
    });
    audioEl.value.addEventListener('pause', () => { 
      isPlaying.value = false; 
      console.log('🎵 JukeboxPlayer: Pause event triggered');
    });
    audioEl.value.addEventListener('ended', () => {
      console.log('🎵 JukeboxPlayer: Track ended, playing next');
      playNext();
    });
    audioEl.value.addEventListener('timeupdate', onTimeUpdate);
    audioEl.value.addEventListener('loadedmetadata', onLoadedMetadata);

    console.log('🎵 JukeboxPlayer: Audio event listeners attached');

    setupMediaSession();

    // Restore last played track if available
    restoreLastTrack();
  }

  function setupMediaSession() {
    if ('mediaSession' in navigator) {
      console.log('🎵 JukeboxPlayer: Setting up Media Session API');

      navigator.mediaSession.setActionHandler('play', () => { 
        console.log('🎵 JukeboxPlayer: Media Session "play" triggered');
        togglePlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('🎵 JukeboxPlayer: Media Session "pause" triggered');
        togglePlay();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('🎵 JukeboxPlayer: Media Session "previoustrack" triggered');
        playPrev();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        console.log('🎵 JukeboxPlayer: Media Session "nexttrack" triggered');
        playNext();
      });
    } else {
      console.log('🎵 JukeboxPlayer: Media Session API not available');
    }
  }

  function updateMediaMetadata() {
    if ('mediaSession' in navigator && currentTrack.value) {
      console.log('🎵 JukeboxPlayer: Updating Media Session metadata for track:', currentTrack.value.title);
      
      const artwork = [];
      if (currentTrack.value.picture && typeof currentTrack.value.picture === 'string') {
        artwork.push({ src: currentTrack.value.picture, sizes: '512x512', type: 'image/jpeg' });
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.value.title,
        artist: currentTrack.value.artist,
        album: 'DMH PWA Jukebox',
        artwork: artwork
      });
    }
  }

  watch(currentTrack, (newTrack, oldTrack) => {
    if (newTrack?.id !== oldTrack?.id) {
      updateMediaMetadata();
    }
  });

  async function restoreLastTrack() {
    console.log('🎵 JukeboxPlayer: Attempting to restore last track');
    console.log('🎵 JukeboxPlayer: Config lastTrackId:', configStore.lastTrackId);
    console.log('🎵 JukeboxPlayer: Config lastTrackProgress:', configStore.lastTrackProgress);
    console.log('🎵 JukeboxPlayer: Config lastVolume:', configStore.lastVolume);
    
    if (!configStore.lastTrackId) {
      console.log('🎵 JukeboxPlayer: No lastTrackId in config, skipping restoration');
      return;
    }

    const lastTrack = tracksStore.items.value.find(t => t.id === configStore.lastTrackId);
    if (!lastTrack) {
      console.log('🎵 JukeboxPlayer: Last track not found in available tracks');
      return;
    }

    console.log('🎵 JukeboxPlayer: Found last track:', lastTrack.title);
    currentTrack.value = lastTrack;
    
    const savedProgress = configStore.lastTrackProgress;
    if (savedProgress > 0) {
      console.log('🎵 JukeboxPlayer: Restoring progress:', savedProgress);
      currentTime.value = savedProgress;
    }

    // Load the audio file and set the position
    const fileRecord = await getJukeboxFile(lastTrack.fileId);
    if (!fileRecord || !isFileSystemFileHandle(fileRecord.handle)) {
      console.warn('🎵 JukeboxPlayer: Could not find file record for restored track:', lastTrack.title);
      return;
    }

    const hasPerm = await verifyFilePermission(fileRecord.handle, 'read');
    if (!hasPerm) {
      console.warn('🎵 JukeboxPlayer: No permission to access file for restored track:', lastTrack.title);
      return;
    }

    const file = await getFileFromHandle(fileRecord.handle);
    if (audioEl.value) {
      console.log('🎵 JukeboxPlayer: Loading audio file for restoration');
      audioEl.value.src = URL.createObjectURL(file);
      
      // Set the time after the audio is loaded
      audioEl.value.addEventListener('loadedmetadata', () => {
        if (audioEl.value && savedProgress > 0 && savedProgress < audioEl.value.duration) {
          audioEl.value.currentTime = savedProgress;
          currentTime.value = savedProgress;
          console.log('🎵 JukeboxPlayer: Successfully restored track with progress');
        } else {
          console.log('🎵 JukeboxPlayer: Track restored without progress (progress:', savedProgress, 'duration:', audioEl.value?.duration);
        }
      }, { once: true });
    }
  }

  function onTimeUpdate() {
    if (audioEl.value) {
      currentTime.value = audioEl.value.currentTime;
      if (currentTrack.value) {
        configStore.lastTrackProgress = audioEl.value.currentTime;
      }
    }
  }

  function onLoadedMetadata() {
    if (audioEl.value) {
      duration.value = audioEl.value.duration;
      console.log('🎵 JukeboxPlayer: Track metadata loaded, duration:', duration.value);
    }
  }

  // --- Playback Methods ---

  async function playTrack(track: JukeboxTrack) {
    console.log('🎵 JukeboxPlayer: Playing track:', track.title);
    
    if (!audioEl.value) {
      console.warn('🎵 JukeboxPlayer: No audio element available');
      return;
    }

    const isNewTrack = currentTrack.value?.id !== track.id;
    currentTrack.value = track;
    configStore.lastTrackId = track.id;
    console.log('🎵 JukeboxPlayer: Current track updated, saving to config');

    const fileRecord = await getJukeboxFile(track.fileId);
    if (!fileRecord || !isFileSystemFileHandle(fileRecord.handle)) {
      console.error('🎵 JukeboxPlayer: Could not find file record for track:', track.title);
      return;
    }

    const hasPerm = await verifyFilePermission(fileRecord.handle, 'read');
    if (!hasPerm) {
      console.error('🎵 JukeboxPlayer: No permission to access file for track:', track.title);
      return;
    }

    const file = await getFileFromHandle(fileRecord.handle);
    URL.revokeObjectURL(audioEl.value.src); // Clean up previous object URL
    audioEl.value.src = URL.createObjectURL(file);
    
    if (isNewTrack) {
      configStore.lastTrackProgress = 0;
      currentTime.value = 0;
      console.log('🎵 JukeboxPlayer: New track, resetting progress');
    }
    
    try {
      await audioEl.value.play();
      console.log('🎵 JukeboxPlayer: Track playback started successfully');
    } catch (error) {
      console.error("🎵 JukeboxPlayer: Playback failed.", error);
      isPlaying.value = false;
    }
  }

  function togglePlay() {
    console.log('🎵 JukeboxPlayer: Toggle play called, current state:', isPlaying.value);
    
    if (!audioEl.value) {
      console.warn('🎵 JukeboxPlayer: No audio element available');
      return;
    }

    if (!currentTrack.value) {
      if (queue.value.length > 0) {
        console.log('🎵 JukeboxPlayer: No current track, playing first in queue');
        playTrack(queue.value[0]);
      } else {
        console.log('🎵 JukeboxPlayer: No current track and empty queue');
      }
      return;
    }

    if (!audioEl.value.src && currentTrack.value) {
      console.log('🎵 JukeboxPlayer: No audio source, loading current track');
      playTrack(currentTrack.value);
      return;
    }

    if (isPlaying.value) {
      audioEl.value.pause();
      console.log('🎵 JukeboxPlayer: Pausing playback');
    } else {
      audioEl.value.play();
      console.log('🎵 JukeboxPlayer: Resuming playback');
    }
  }
  
  function playNext() {
    console.log('🎵 JukeboxPlayer: Play next called, current index:', currentTrackIndex.value);
    if (hasNextTrack.value) {
      const nextTrack = queue.value[currentTrackIndex.value + 1];
      console.log('🎵 JukeboxPlayer: Playing next track:', nextTrack.title);
      playTrack(nextTrack);
    } else {
      console.log('🎵 JukeboxPlayer: Reached end of queue, stopping playback');
      isPlaying.value = false;
    }
  }

  function playPrev() {
    console.log('🎵 JukeboxPlayer: Play prev called, current index:', currentTrackIndex.value);
    if (currentTrackIndex.value > 0) {
      const prevTrack = queue.value[currentTrackIndex.value - 1];
      console.log('🎵 JukeboxPlayer: Playing previous track:', prevTrack.title);
      playTrack(prevTrack);
    } else if (currentTrackIndex.value === 0 && audioEl.value) {
      console.log('🎵 JukeboxPlayer: At first track, restarting from beginning');
      audioEl.value.currentTime = 0;
      currentTime.value = 0;
      configStore.lastTrackProgress = 0;
    } else if (currentTrackIndex.value === -1 && audioEl.value) {
      // No track in queue, reset progress
      console.log('🎵 JukeboxPlayer: No track in queue, resetting progress');
      audioEl.value.currentTime = 0;
      currentTime.value = 0;
      configStore.lastTrackProgress = 0;
    }
  }

  function seek(newTime: number) {
    console.log('🎵 JukeboxPlayer: Seeking to:', newTime);
    if (audioEl.value) {
      audioEl.value.currentTime = newTime;
    }
  }

  // --- Volume Methods ---

  function setVolume(newVolume: number) {
    console.log('🎵 JukeboxPlayer: Setting volume to:', newVolume);
    volume.value = newVolume;
    if (newVolume > 0) {
      lastVolume.value = newVolume;
    }
    if (audioEl.value) {
      audioEl.value.volume = newVolume;
    }
    configStore.lastVolume = newVolume;
    console.log('🎵 JukeboxPlayer: Volume saved to config');
  }

  function toggleMute() {
    console.log('🎵 JukeboxPlayer: Toggle mute called, current volume:', volume.value);
    if (volume.value > 0) {
      setVolume(0);
      console.log('🎵 JukeboxPlayer: Muted');
    } else {
      const newVolume = lastVolume.value > 0 ? lastVolume.value : 0.5;
      setVolume(newVolume);
      console.log('🎵 JukeboxPlayer: Unmuted to:', newVolume);
    }
  }
  
  // --- Queue Methods ---
  function setQueue(tracks: JukeboxTrack[], queueId: string | null) {
    console.log('🎵 JukeboxPlayer: Setting queue, tracks:', tracks.length, 'queueId:', queueId);
    queue.value = tracks;
    currentQueueId.value = queueId;
    // Always update the config to reflect the playlist from which the current queue was started
    configStore.activePlaylistId = queueId;
    console.log('🎵 JukeboxPlayer: Updated config.activePlaylistId to:', queueId);
  }

  function stop() {
    console.log('🎵 JukeboxPlayer: Stopping playback');
    if (audioEl.value) {
      audioEl.value.pause();
      audioEl.value.src = '';
    }
    isPlaying.value = false;
    currentTrack.value = null;
    currentTime.value = 0;
    configStore.lastTrackId = null;
    configStore.lastTrackProgress = 0;
  }

  return {
    // State
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    
    // Getters
    currentQueueId: computed(() => currentQueueId.value),
    hasNextTrack,
    isReady,
    queue: computed(() => queue.value),
    
    // Methods
    init,
    restoreLastTrack,
    playTrack,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleMute,
    setQueue,
    stop,
  };
}); 
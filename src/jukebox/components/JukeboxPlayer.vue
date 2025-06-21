<template>
  <div class="jukebox-player">
    <div class="track-info-top">
      <div class="title">{{ currentTrack?.title || 'No track selected' }}</div>
      <div class="artist">{{ currentTrack?.artist || '&nbsp;' }}</div>
    </div>
    <div class="player-controls-bottom">
      <div class="controls">
        <button @click="playPrev" :disabled="!currentTrack"><i class="si si-step-backward"></i></button>
        <button @click="togglePlay"><i :class="isPlaying ? 'si si-pause' : 'si si-play'"></i></button>
        <button @click="playNext" :disabled="!currentTrack"><i class="si si-step-forward"></i></button>
      </div>
      <div class="progress-bar">
        <span>{{ formatTime(currentTime) }}</span>
        <RangeSlider
          :model-value="currentTime"
          :max="duration || 1"
          :disabled="!currentTrack"
          @update:modelValue="handleSeek"
        />
        <span>{{ formatTime(duration) }}</span>
      </div>
      <div
        class="volume-control"
        @mouseenter="showVolumeSlider"
        @mouseleave="startHideTimer"
        @wheel.prevent="handleWheel"
      >
        <button @click="toggleMute" class="volume-button">
          <i v-if="volume > 0" class="si si-volume-up"></i>
          <i v-else class="si si-volume-mute"></i>
        </button>
        <div
          v-show="isVolumeSliderVisible"
          class="volume-slider-container"
          @mouseenter="cancelHideTimer"
          @mouseleave="startHideTimer"
        >
          <RangeSlider
            vertical
            :model-value="volume"
            :max="1"
            :step="0.01"
            @update:modelValue="handleVolumeChange"
          />
        </div>
      </div>
    </div>
    
    <audio ref="audioRef" @timeupdate="onTimeUpdate" @ended="playNext" @loadedmetadata="onLoadedMetadata"></audio>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, readonly } from 'vue';
import type { JukeboxTrack } from '@/jukebox/types';
import RangeSlider from '@/components/common/RangeSlider.vue';
import { getJukeboxFile } from '@/jukebox/stores';
import { useJukeboxTracksStore } from '@/jukebox/stores';
import { getFileFromHandle } from '@/jukebox/FileSystemUtils';
import { useConfigStore } from '@/utils/configStore';

const props = defineProps<{
  tracks?: JukeboxTrack[];
  playlistId?: string | null;
}>();

const emit = defineEmits<{
  trackChange: [track: JukeboxTrack | null];
}>();

const configStore = useConfigStore();
const tracksStore = useJukeboxTracksStore();

// Audio element
const audioRef = ref<HTMLAudioElement | null>(null);

// Player State
const currentTrack = ref<JukeboxTrack | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(configStore.lastVolume);
const lastVolume = ref(configStore.lastVolume);

// Volume slider state
const isVolumeSliderVisible = ref(false);
let volumeHideTimer: number | null = null;

// Computed properties - use provided tracks or fall back to store
const availableTracks = computed(() => {
  if (props.tracks) {
    return props.tracks;
  }
  return tracksStore.items.value;
});

// File permission helper
async function verifyFilePermission(handle: FileSystemFileHandle, mode: 'read' | 'readwrite' = 'read') {
  // @ts-ignore
  if ((await handle.queryPermission({ mode })) === 'granted') {
    return true;
  }
  // @ts-ignore
  if ((await handle.requestPermission({ mode })) === 'granted') {
    return true;
  }
  return false;
}

function isFileSystemFileHandle(obj: any): obj is FileSystemFileHandle {
  return obj && typeof obj === 'object' && typeof obj.getFile === 'function' && typeof obj.name === 'string';
}

// Player functions
async function playTrack(track: JukeboxTrack) {
  if (!audioRef.value) return;

  const isNewTrack = currentTrack.value?.id !== track.id;
  currentTrack.value = track;
  configStore.lastTrackId = track.id;
  
  const fileRecord = await getJukeboxFile(track.fileId);
  if (!fileRecord || !isFileSystemFileHandle(fileRecord.handle)) return;

  const handle = fileRecord.handle;
  const hasPerm = await verifyFilePermission(handle, 'read');
  if (!hasPerm) return;

  const file = await getFileFromHandle(handle);
  audioRef.value.src = URL.createObjectURL(file);
  
  // Only reset progress when selecting a different track
  if (isNewTrack) {
    configStore.lastTrackProgress = 0;
    currentTime.value = 0;
  }
  
  audioRef.value.play();
  emit('trackChange', track);
}

function togglePlay() {
  if (!audioRef.value) return;

  // If no track is selected, play the first one in the list.
  if (!currentTrack.value) {
    if (availableTracks.value.length > 0) {
      playTrack(availableTracks.value[0]);
    }
    return;
  }

  // If we have a current track but no audio source, load it first
  if (!audioRef.value.src && currentTrack.value) {
    playTrack(currentTrack.value);
    return;
  }

  // If a track is selected, toggle play/pause.
  if (isPlaying.value) {
    audioRef.value.pause();
  } else {
    audioRef.value.play();
  }
}

function findCurrentTrackIndex(): number {
  if (!currentTrack.value) return -1;
  return availableTracks.value.findIndex(t => t.id === currentTrack.value?.id);
}

function playNext() {
  const currentIndex = findCurrentTrackIndex();
  if (currentIndex > -1 && currentIndex < availableTracks.value.length - 1) {
    playTrack(availableTracks.value[currentIndex + 1]);
  }
}

function playPrev() {
  const currentIndex = findCurrentTrackIndex();
  if (currentIndex > 0) {
    playTrack(availableTracks.value[currentIndex - 1]);
  } else if (currentIndex === 0) {
    // If we're at the first track, stop playback and reset progress
    if (audioRef.value) {
      audioRef.value.pause();
      audioRef.value.currentTime = 0;
      currentTime.value = 0;
      isPlaying.value = false;
      configStore.lastTrackProgress = 0;
    }
  }
}

function handleSeek(newTime: number) {
  if (audioRef.value) {
    audioRef.value.currentTime = newTime;
    currentTime.value = newTime;
  }
}

function onTimeUpdate() {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime;
    isPlaying.value = !audioRef.value.paused;
    
    // Save progress to config store
    if (currentTrack.value) {
      configStore.lastTrackProgress = audioRef.value.currentTime;
    }
  }
}

function onLoadedMetadata() {
  if (audioRef.value) {
    duration.value = audioRef.value.duration;
  }
}

function handleVolumeChange(newVolume: number) {
  volume.value = newVolume;
  if (newVolume > 0) {
    lastVolume.value = newVolume;
  }
  if (audioRef.value) {
    audioRef.value.volume = newVolume;
  }
  configStore.lastVolume = newVolume;
}

function toggleMute() {
  if (volume.value > 0) {
    lastVolume.value = volume.value;
    handleVolumeChange(0);
  } else {
    handleVolumeChange(lastVolume.value > 0 ? lastVolume.value : 1);
  }
}

function setupAudioEvents() {
  audioRef.value = new Audio();
  audioRef.value.addEventListener('play', () => { isPlaying.value = true; });
  audioRef.value.addEventListener('pause', () => { isPlaying.value = false; });
  audioRef.value.addEventListener('timeupdate', () => { currentTime.value = audioRef.value?.currentTime || 0; });
  audioRef.value.addEventListener('loadedmetadata', () => { duration.value = audioRef.value?.duration || 0; });
  audioRef.value.addEventListener('ended', playNext);
}

// Volume slider functions
function showVolumeSlider() {
  cancelHideTimer();
  isVolumeSliderVisible.value = true;
}

function startHideTimer() {
  volumeHideTimer = window.setTimeout(() => {
    isVolumeSliderVisible.value = false;
  }, 300);
}

function cancelHideTimer() {
  if (volumeHideTimer) {
    clearTimeout(volumeHideTimer);
    volumeHideTimer = null;
  }
}

function handleWheel(event: WheelEvent) {
  const newVolume = Math.min(1, Math.max(0, volume.value - event.deltaY * 0.001));
  handleVolumeChange(newVolume);
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

// Public methods for external control
function playTrackById(trackId: string) {
  const track = availableTracks.value.find(t => t.id === trackId);
  if (track) {
    playTrack(track);
  }
}

function setCurrentTrack(track: JukeboxTrack | null) {
  currentTrack.value = track;
  emit('trackChange', track);
}

async function restoreTrack(track: JukeboxTrack, savedProgress: number = 0) {
  console.log('JukeboxPlayer: Restoring track:', track.title, 'with progress:', savedProgress);
  currentTrack.value = track;
  emit('trackChange', track);
  
  if (savedProgress > 0) {
    currentTime.value = savedProgress;
    
    // Load the audio file and set the position
    const fileRecord = await getJukeboxFile(track.fileId);
    if (fileRecord && isFileSystemFileHandle(fileRecord.handle)) {
      const handle = fileRecord.handle;
      const hasPerm = await verifyFilePermission(handle, 'read');
      if (hasPerm) {
        const file = await getFileFromHandle(handle);
        audioRef.value!.src = URL.createObjectURL(file);
        
        // Set the time after the audio is loaded
        audioRef.value!.addEventListener('loadedmetadata', () => {
          if (audioRef.value && savedProgress < audioRef.value.duration) {
            audioRef.value.currentTime = savedProgress;
            currentTime.value = savedProgress;
            console.log('JukeboxPlayer: Successfully restored track with progress');
          }
        }, { once: true });
      } else {
        console.warn('JukeboxPlayer: No permission to access file for track:', track.title);
      }
    } else {
      console.warn('JukeboxPlayer: Could not find file record for track:', track.title);
    }
  } else {
    console.log('JukeboxPlayer: Restored track without progress');
  }
}

// Initialize player
onMounted(async () => {
  // Load tracks store if not already loaded
  if (!tracksStore.isLoaded.value) {
    await tracksStore.load();
  }
  
  // Restore volume from config store
  volume.value = configStore.lastVolume;
  lastVolume.value = configStore.lastVolume;
  
  setupAudioEvents();
  
  if (audioRef.value) {
    audioRef.value.volume = volume.value;
  }
  
  // Restore last played track if available
  if (configStore.lastTrackId) {
    const lastTrack = availableTracks.value.find(t => t.id === configStore.lastTrackId);
    if (lastTrack) {
      console.log('JukeboxPlayer: Found last track to restore:', lastTrack.title);
      currentTrack.value = lastTrack;
      emit('trackChange', lastTrack);
      
      // Restore progress position
      const savedProgress = configStore.lastTrackProgress;
      if (savedProgress > 0) {
        console.log('JukeboxPlayer: Restoring progress:', savedProgress);
        currentTime.value = savedProgress;
        
        // Load the audio file and set the position
        const fileRecord = await getJukeboxFile(lastTrack.fileId);
        if (fileRecord && isFileSystemFileHandle(fileRecord.handle)) {
          const handle = fileRecord.handle;
          const hasPerm = await verifyFilePermission(handle, 'read');
          if (hasPerm) {
            const file = await getFileFromHandle(handle);
            audioRef.value!.src = URL.createObjectURL(file);
            
            // Set the time after the audio is loaded
            audioRef.value!.addEventListener('loadedmetadata', () => {
              if (audioRef.value && savedProgress < audioRef.value.duration) {
                audioRef.value.currentTime = savedProgress;
                currentTime.value = savedProgress;
                console.log('JukeboxPlayer: Successfully restored track with progress');
              }
            }, { once: true });
          } else {
            console.warn('JukeboxPlayer: No permission to access file for restored track:', lastTrack.title);
          }
        } else {
          console.warn('JukeboxPlayer: Could not find file record for restored track:', lastTrack.title);
        }
      } else {
        console.log('JukeboxPlayer: Restored track without progress');
      }
    } else {
      console.log('JukeboxPlayer: Last track not found in available tracks');
    }
  }
});

// Expose public methods
defineExpose({
  playTrack,
  playTrackById,
  setCurrentTrack,
  restoreTrack,
  togglePlay,
  playNext,
  playPrev,
  currentTrack: readonly(currentTrack),
  isPlaying: readonly(isPlaying),
});
</script>

<style scoped>
.jukebox-player {
  display: flex;
  flex-direction: column;
  padding: 1em;
  background: #f5f5f5;
  border-top: 1px solid #ddd;
}
.track-info-top {
  text-align: center;
  min-height: 3.5em; /* Reserve space */
}
.track-info-top .title {
  font-weight: bold;
}
.track-info-top .artist {
  font-size: 0.9em;
  color: #666;
}
.player-controls-bottom {
  display: grid;
  grid-template-areas: "controls progress volume";
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1em;
}
.controls {
  grid-area: controls;
  display: flex;
  justify-content: center;
  gap: 1em;
}
.progress-bar {
  grid-area: progress;
  display: flex;
  align-items: center;
  gap: 1em;
}
.volume-control {
  grid-area: volume;
  position: relative;
  display: flex;
  justify-content: center;
}
.volume-slider-container {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 1rem 0.5rem;
  border-radius: 8px;
  box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
  height: 120px;
}
.controls button, .volume-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #333;
  transition: color 0.2s;
}
.controls button:hover, .volume-button:hover {
  color: var(--primary-color, #4f46e5);
}
.controls button:disabled {
  color: #ccc;
  cursor: not-allowed;
}
.controls button:disabled:hover {
  color: #ccc;
}
</style> 
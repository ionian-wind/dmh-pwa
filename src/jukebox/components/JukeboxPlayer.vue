<script setup lang="ts">
import { ref, computed, defineProps, onBeforeUnmount, watch, onMounted } from 'vue';
import RangeSlider from '@/components/common/RangeSlider.vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { usePictureUrlCacheStore, useJukeboxTracksStore, useJukeboxPlaylistsStore, useJukeboxFilesStore } from '@/jukebox/stores';
import { useConfigStore } from '@/utils/configStore';
import Button from '@/components/common/Button.vue';
import { useAnimatedGradient } from '@/jukebox/useAnimatedGradient';
import type { JukeboxTrack } from '@/jukebox/types';

const props = defineProps<{ 
  animatedBackground?: boolean;
  showArtwork?: boolean;
}>();
const playerStore = useJukeboxPlayerStore();
const pictureUrlCacheStore = usePictureUrlCacheStore();
const configStore = useConfigStore();

// Get store instances for loading
const tracksStore = useJukeboxTracksStore();
const playlistsStore = useJukeboxPlaylistsStore();
const filesStore = useJukeboxFilesStore();

// Loading state
const storesLoaded = ref(false);

onMounted(async () => {
  console.log('🎵 JukeboxPlayer: Component mounted, ensuring stores are loaded...');
  
  // Check if stores are already loaded, if not, load them
  if (!tracksStore.items.value || tracksStore.items.value.length === 0) {
    console.log('🎵 JukeboxPlayer: Stores not loaded, loading now...');
    await Promise.all([
      tracksStore.load(),
      playlistsStore.load(),
      filesStore.load()
    ]);
  }
  
  // Wait for player to be ready (audio element initialized)
  if (!playerStore.isReady) {
    console.log('🎵 JukeboxPlayer: Waiting for player to be ready...');
    // Wait a bit for the GlobalAudioPlayer to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Set up queue context if not already set (for popover usage)
  if (!playerStore.currentQueueId && tracksStore.items.value.length > 0) {
    console.log('🎵 JukeboxPlayer: Setting up default queue context for popover...');
    
    // Use the activePlaylistId from config (reflects the playlist from which current track is playing)
    if (configStore.activePlaylistId) {
      const activePlaylist = playlistsStore.items.value.find(p => p.id === configStore.activePlaylistId);
      if (activePlaylist) {
        const playlistTracks = activePlaylist.trackIds
          .map(trackId => tracksStore.items.value.find(t => t.id === trackId))
          .filter((track): track is JukeboxTrack => track !== undefined);
        playerStore.setQueue(playlistTracks, configStore.activePlaylistId);
        console.log('🎵 JukeboxPlayer: Set queue from active playlist:', playlistTracks.length, 'tracks');
      }
    } else {
      // Otherwise, use all tracks as the queue
      const allTracks = tracksStore.items.value;
      playerStore.setQueue(allTracks, null);
      console.log('🎵 JukeboxPlayer: Set queue from all tracks:', allTracks.length, 'tracks');
    }
  }
  
  storesLoaded.value = true;
  console.log('🎵 JukeboxPlayer: Stores ready, player should work correctly');
});

// Watch for player readiness in case it becomes ready after mount
watch(() => playerStore.isReady, (isReady) => {
  if (isReady && !storesLoaded.value) {
    console.log('🎵 JukeboxPlayer: Player became ready, enabling controls');
    storesLoaded.value = true;
  }
});

// Watch for active playlist changes to update queue context
watch(() => configStore.activePlaylistId, (newPlaylistId) => {
  if (storesLoaded.value && tracksStore.items.value.length > 0) {
    console.log('🎵 JukeboxPlayer: Active playlist changed, updating queue...');
    
    if (newPlaylistId) {
      const activePlaylist = playlistsStore.items.value.find(p => p.id === newPlaylistId);
      if (activePlaylist) {
        const playlistTracks = activePlaylist.trackIds
          .map(trackId => tracksStore.items.value.find(t => t.id === trackId))
          .filter((track): track is JukeboxTrack => track !== undefined);
        playerStore.setQueue(playlistTracks, newPlaylistId);
        console.log('🎵 JukeboxPlayer: Updated queue from playlist:', playlistTracks.length, 'tracks');
      }
    } else {
      // No active playlist, use all tracks
      const allTracks = tracksStore.items.value;
      playerStore.setQueue(allTracks, null);
      console.log('🎵 JukeboxPlayer: Updated queue from all tracks:', allTracks.length, 'tracks');
    }
  }
});

const showAnimatedBg = computed(() => !!props.animatedBackground && playerStore.isPlaying);

// Use the new composable for the gradient style
const gradientStyle = useAnimatedGradient(showAnimatedBg, () => playerStore.currentTrack?.palette);

// Use the shared store for picture handling
const { getPictureStyle } = pictureUrlCacheStore;

// Create computed property for picture style
const pictureStyle = computed(() => {
  return getPictureStyle(playerStore.currentTrack?.picture);
});

// Clean up created URLs on component unmount
onBeforeUnmount(() => {
  pictureUrlCacheStore.clearCache();
});

// Volume slider state is UI-specific, so it stays here.
const isVolumeSliderVisible = ref(false);
let volumeHideTimer: number | null = null;

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
  const newVolume = Math.min(1, Math.max(0, playerStore.volume - event.deltaY * 0.001));
  playerStore.setVolume(newVolume);
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

const isPlayDisabled = computed(() => {
  // If a track is selected, always enable
  if (playerStore.currentTrack) {
    return false;
  }
  
  // If no track selected, check if there are tracks in the queue to play
  if (playerStore.queue.length > 0) {
    return false;
  }
  
  // If no tracks available in queue, disable
  return true;
});
</script>

<template>
  <div class="jukebox-player" :class="{ 'with-animated-bg': showAnimatedBg }" :style="gradientStyle">
    <div v-if="!storesLoaded" class="jukebox-player-loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading player...</div>
    </div>
    <div v-else class="jukebox-player-content">
      <!-- Track Artwork -->
      <div v-if="showArtwork" class="track-artwork-container">
        <div v-if="playerStore.currentTrack?.picture" :style="pictureStyle" class="track-artwork"></div>
        <div v-else class="track-artwork track-artwork-placeholder">
          <i class="si si-music-note"></i>
        </div>
      </div>
      
      <div class="track-info-top">
        <div class="title">{{ playerStore.currentTrack?.title || 'No track selected' }}</div>
        <div class="artist">{{ playerStore.currentTrack?.artist || '&nbsp;' }}</div>
      </div>
      <div class="player-controls-bottom">
        <div class="controls">
          <Button variant="light" @click="playerStore.playPrev()" :disabled="!playerStore.hasPrevTrack"><i class="si si-step-backward"></i></Button>
          <Button variant="light" @click="playerStore.togglePlay()" :disabled="isPlayDisabled" class="play-pause"><i :class="playerStore.isPlaying ? 'si si-pause' : 'si si-play'"></i></Button>
          <Button variant="light" @click="playerStore.playNext()" :disabled="!playerStore.currentTrack || !playerStore.hasNextTrack"><i class="si si-step-forward"></i></Button>
        </div>
        <div class="progress-bar">
          <span>{{ formatTime(playerStore.currentTime) }}</span>
          <RangeSlider
            :model-value="playerStore.currentTime"
            :max="playerStore.duration || 1"
            :disabled="!playerStore.currentTrack"
            @update:modelValue="playerStore.seek($event)"
          />
          <span>{{ formatTime(playerStore.duration) }}</span>
        </div>
        <div
          class="volume-control"
          @mouseenter="showVolumeSlider"
          @mouseleave="startHideTimer"
          @wheel.prevent="handleWheel"
        >
          <Button variant="light" @click="playerStore.toggleMute()" class="volume-button">
            <i v-if="playerStore.volume > 0" class="si si-volume-up"></i>
            <i v-else class="si si-volume-mute"></i>
          </Button>
          <div
            v-show="isVolumeSliderVisible"
            class="volume-slider-container"
            @mouseenter="cancelHideTimer"
            @mouseleave="startHideTimer"
          >
            <RangeSlider
              :model-value="playerStore.volume"
              :max="1"
              :step="0.01"
              @update:modelValue="playerStore.setVolume($event)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.jukebox-player {
  display: flex;
  flex-direction: column;
  min-width: 600px;
}

.jukebox-player-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 200px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4f46e5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.loading-text {
  color: #666;
  font-size: 0.9rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive adjustments for popover context */
@media (max-width: 768px) {
  .jukebox-player {
    min-width: 400px;
  }
  
  .track-artwork {
    width: 150px;
    height: 150px;
    max-width: 300px;
    max-height: 300px;
  }
}

@media (max-width: 480px) {
  .jukebox-player {
    min-width: 300px;
  }
  
  .track-artwork {
    width: 120px;
    height: 120px;
    max-width: 200px;
    max-height: 200px;
  }
  
  .player-controls-bottom {
    grid-template-areas: 
      "controls"
      "progress"
      "volume";
    grid-template-columns: 1fr;
    gap: 0.5em;
  }
}

.jukebox-player.with-animated-bg::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--custom-gradient, linear-gradient(45deg,
    rgba(79, 70, 229, 0.15) 0%,
    rgba(147, 51, 234, 0.15) 25%,
    rgba(236, 72, 153, 0.15) 50%,
    rgba(59, 130, 246, 0.15) 75%,
    rgba(34, 197, 94, 0.15) 100%
  ));
  background-size: 400% 400%;
  animation: gradientShift 8s ease infinite;
  pointer-events: none;
}
@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.track-artwork-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}
.track-artwork {
  width: 200px;
  height: 200px;
  max-width: 400px;
  max-height: 400px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.track-artwork-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 3rem;
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
  bottom: 80%;
  left: calc(-100% - 5px);
  transform: translateX(-50%);
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  width: 150px;
}
.controls button, .volume-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #333;
  transition: all 0.2s ease-in-out;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  min-height: 2.5rem;
}
.controls button:hover:not(:disabled), .volume-button:hover:not(:disabled) {
  background: none;
  transform: scale(1.1);
}
.controls button:active:not(:disabled), .volume-button:active:not(:disabled) {
  transform: scale(0.95);
}
.controls button:disabled, .volume-button:disabled {
  color: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}
.controls button:disabled:hover, .volume-button:disabled:hover {
  transform: none;
}

/* Special styling for play/pause button */
.controls button.play-pause {
  font-size: 1.8rem;
  min-width: 3rem;
  min-height: 3rem;
}


.controls button.play-pause:hover:not(:disabled) {
  transform: scale(1.15);
}

.controls button.play-pause:active:not(:disabled) {
  transform: scale(0.9);
}
</style> 

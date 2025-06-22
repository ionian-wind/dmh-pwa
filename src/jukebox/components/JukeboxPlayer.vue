<template>
  <div class="jukebox-player" :class="{ 'with-animated-bg': showAnimatedBg }" :style="gradientStyle">
    <div class="jukebox-player-content">
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
          <Button variant="light" @click="playerStore.playPrev()" :disabled="!playerStore.currentTrack"><i class="si si-step-backward"></i></Button>
          <Button variant="light" @click="playerStore.togglePlay()"><i :class="playerStore.isPlaying ? 'si si-pause' : 'si si-play'"></i></Button>
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

<script setup lang="ts">
import { ref, computed, defineProps, onBeforeUnmount, watch } from 'vue';
import RangeSlider from '@/components/common/RangeSlider.vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import Button from '@/components/common/Button.vue';
import { useAnimatedGradient } from '@/jukebox/useAnimatedGradient';

const props = defineProps<{ 
  animatedBackground?: boolean;
  showArtwork?: boolean;
}>();
const playerStore = useJukeboxPlayerStore();

const showAnimatedBg = computed(() => !!props.animatedBackground && playerStore.isPlaying);

// Use the new composable for the gradient style
const gradientStyle = useAnimatedGradient(showAnimatedBg, () => playerStore.currentTrack?.palette);

// Track artwork handling
const createdUrls = ref<string[]>([]);
const pictureUrlCache = ref<Map<string, string>>(new Map());

// Memoize the picture style to prevent URL recreation on every render
const pictureStyle = computed(() => {
  if (!playerStore.currentTrack?.picture) {
    return { backgroundImage: '' };
  }
  
  const picture = playerStore.currentTrack.picture;
  let url = '';
  
  if (typeof picture === 'string') {
    url = picture;
  } else {
    // Create a unique key for this blob based on its content
    const blobKey = `${picture.size}-${picture.type}`;
    
    // Check if we already have a URL for this blob
    if (pictureUrlCache.value.has(blobKey)) {
      url = pictureUrlCache.value.get(blobKey)!;
    } else {
      // Create new URL and cache it
      url = URL.createObjectURL(picture);
      pictureUrlCache.value.set(blobKey, url);
      createdUrls.value.push(url);
    }
  }
  
  return { backgroundImage: `url(${url})` };
});

// Clean up created URLs on component unmount
onBeforeUnmount(() => {
  createdUrls.value.forEach(url => URL.revokeObjectURL(url));
  createdUrls.value = [];
  pictureUrlCache.value.clear();
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
</script>

<style scoped>
.jukebox-player {
  display: flex;
  flex-direction: column;
  min-width: 600px;
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
  transition: color 0.2s;
}
.controls button:hover, .volume-button:hover {
  color: var(--primary-color, #4f46e5);
}
</style> 

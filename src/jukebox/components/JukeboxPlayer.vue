<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watchEffect} from 'vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { usePictureUrlCacheStore} from '@/jukebox/stores';
import {useAnimatedGradient} from '@/jukebox/useAnimatedGradient';
import {formatTime} from "@/jukebox/utils";

import RangeSlider from '@/components/common/RangeSlider.vue';
import Button from '@/components/form/Button.vue';

// Tabler icons
import { 
  IconMusic as IconMusicNote, 
  IconPlayerSkipBack, 
  IconPlayerPlay, 
  IconPlayerPause, 
  IconPlayerSkipForward, 
  IconArrowsShuffle as IconShuffle, 
  IconRepeat, 
  IconRepeatOnce, 
  IconVolume, 
  IconVolumeOff 
} from '@tabler/icons-vue';

const props = defineProps<{ 
  animatedBackground?: boolean;
  showArtwork?: boolean;
}>();
const pictureUrlCacheStore = usePictureUrlCacheStore();

const playerStore = useJukeboxPlayerStore();

const showAnimatedBg = computed(() => !!props.animatedBackground && playerStore.isPlaying);

// Use the new composable for the gradient style
const gradientStyle = useAnimatedGradient(
  () => !!props.animatedBackground && playerStore.isPlaying,
  () => {
    const track = playerStore.currentTrack;
    if (track?.palette && track.palette.length > 0) {
      return track.palette;
    } else if (track?.color) {
      // Use a simple palette based on the single color
      // Approach: create a gradient with the color at different stops and alpha
      // Example: [color, color with more alpha, ...]
      // We'll use the color at 0% and 100%, and a lighter version at 50%
      // For simplicity, just repeat the color
      return [track.color, track.color, track.color];
    }
    return undefined;
  }
);

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

// Theming logic: update CSS variables for JukeboxPlayer based on track color
const defaultTheme = {
  '--jp-color-primary': 'var(--color-primary)',
  '--jp-color-background-soft': 'var(--color-background)',
  '--jp-color-primary-dark': 'var(--color-primary-dark)',
  '--jp-color-primary-light': 'var(--color-text-light)',
  '--jp-color-background': 'var(--color-background)',
  '--jp-color-text': 'var(--color-text)',
};

function getContrastColor(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  // Parse r, g, b
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Return dark for light colors, light for dark colors
  return luminance > 0.6 ? '#1e1e2e' : '#fff';
}

function setJukeboxTheme(color?: string) {
  const el = document.querySelector('.jukebox-player') as HTMLElement | null;
  if (!el) return;
  if (color) {
    const contrast = getContrastColor(color);
    el.style.setProperty('--track-color', contrast + 'cc');
    el.style.setProperty('--track-fill-color', getContrastColor(contrast));

    el.style.setProperty('--jp-color-primary', contrast + 'cc');
    el.style.setProperty('--jp-color-primary-dark', contrast);
    el.style.setProperty('--jp-color-primary-light', contrast + 'cc');
    el.style.setProperty('--jp-color-text', '#333');
  } else {
    Object.entries(defaultTheme).forEach(([key, value]) => {
      el.style.setProperty(key, value);
    });
  }
}

watchEffect(() => {
  const color = playerStore.currentTrack?.color;
  setTimeout(() => setJukeboxTheme(color), 0); // next tick to ensure DOM is ready
});

const showRemainingTime = ref(false);
function toggleTimeDisplay() {
  showRemainingTime.value = !showRemainingTime.value;
}
</script>

<template>
  <div class="jukebox-player" :class="{ 'with-animated-bg': showAnimatedBg }" :style="gradientStyle">
    <div class="jukebox-player-content">
      <div class="track-info-row">
        <!-- Track Artwork -->
        <div v-if="showArtwork" class="track-artwork-container">
          <div v-if="playerStore.currentTrack?.picture" :style="pictureStyle" class="track-artwork"></div>
          <div v-else class="track-artwork track-artwork-placeholder">
            <IconMusicNote width="80" height="80" />
          </div>
        </div>
        <!-- Track Info -->
        <div class="track-info-top">
          <div class="title">{{ playerStore.currentTrack?.title || 'No track selected' }}</div>
          <div class="artist">{{ playerStore.currentTrack?.artist || '&nbsp;' }}</div>
        </div>
      </div>
      <div class="player-controls-bottom">
        <div class="controls">
          <Button variant="light" @click="playerStore.playPrev()" :disabled="!playerStore.hasPrevTrack" class="prev-track">
            <IconPlayerSkipBack />
          </Button>
          <Button variant="light" @click="playerStore.togglePlay()" :disabled="!playerStore.canPlay" class="play-pause">
            <IconPlayerPause v-if="playerStore.isPlaying" />
            <IconPlayerPlay v-else />
          </Button>
          <Button variant="light" @click="playerStore.playNext()" :disabled="!playerStore.currentTrack || !playerStore.hasNextTrack" class="next-track">
            <IconPlayerSkipForward />
          </Button>
        </div>
        <div class="progress-bar">
          <span class="progress-bar-time time-current" @click="toggleTimeDisplay">
            <template v-if="!showRemainingTime">
              {{ formatTime(playerStore.currentTime) }}
            </template>
            <template v-else>
              -{{ formatTime((playerStore.duration || 0) - playerStore.currentTime) }}
            </template>
          </span>
          <RangeSlider
            :model-value="playerStore.currentTime"
            :max="playerStore.duration || 1"
            :disabled="!playerStore.currentTrack"
            @update:modelValue="playerStore.seek($event)"
          />
          <span class="progress-bar-time time-duration">{{ formatTime(playerStore.duration) }}</span>
        </div>
        <div class="playback-options">
          <Button
            variant="light"
            :class="{ active: playerStore.shuffle }"
            @click="playerStore.toggleShuffle"
            title="Shuffle"
          >
            <IconShuffle />
          </Button>
          <Button
            variant="light"
            :class="{ active: playerStore.repeatMode === 'list' || playerStore.repeatMode === 'track' }"
            @click="playerStore.cycleRepeatMode"
            title="Repeat"
          >
            <template v-if="playerStore.repeatMode === 'off'">
              <IconRepeat />
            </template>
            <template v-else-if="playerStore.repeatMode === 'list'">
              <IconRepeat />
            </template>
            <template v-else>
              <IconRepeatOnce />
            </template>
          </Button>
        </div>
        <div
          class="volume-control"
          @mouseenter="showVolumeSlider"
          @mouseleave="startHideTimer"
          @wheel.prevent="handleWheel"
        >
          <Button variant="light" @click="playerStore.toggleMute()" class="volume-button">
            <template v-if="playerStore.volume > 0">
              <IconVolume />
            </template>
            <template v-else>
              <IconVolumeOff />
            </template>
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
  position: relative;
}

.jukebox-player-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 200px;
}

.jukebox-player-content {
  padding: 1rem;
  color: var(--jp-color-text);
}

/* Responsive adjustments for popover context */
@media (max-width: 768px) {
  .jukebox-player,
  .jukebox-player-content {
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 300px !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
  }

  .track-info-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  .track-artwork-container {
    order: 2;
    margin-bottom: 0;
    margin-left: 0.5rem;
    display: flex;
    align-items: center;
  }
  .track-info-top {
    order: 1;
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
  }
  .track-artwork {
    width: 72px !important;
    height: 72px !important;
    max-width: 80px !important;
    max-height: 80px !important;
  }
  .player-controls-bottom {
    display: grid !important;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 0.2em !important;
    width: 100% !important;
    align-items: stretch !important;
  }
  .progress-bar {
    grid-column: 1 / 4;
    grid-row: 1;
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 0.5em !important;
    width: 100% !important;
    margin-bottom: 0.3em !important;
  }
  .controls {
    grid-column: 1;
    grid-row: 2;
    flex: 1 1 0 !important;
    justify-content: center !important;
    min-width: 0 !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
  }
  .playback-options {
    grid-column: 2;
    grid-row: 2;
    flex: 1 1 0 !important;
    justify-content: center !important;
    min-width: 0 !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
  }
  .volume-control {
    grid-column: 3;
    grid-row: 2;
    flex: 1 1 0 !important;
    justify-content: center !important;
    min-width: 0 !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
  }
  .controls button, .volume-button, .playback-options button {
    font-size: 1rem !important;
    min-width: 2rem !important;
    min-height: 2rem !important;
    padding: 0.2rem !important;
  }
  .controls button.play-pause {
    font-size: 1.1rem !important;
    min-width: 2.2rem !important;
    min-height: 2.2rem !important;
  }
  .progress-bar-time.time-current {
    font-size: 0.95em !important;
    text-align: left !important;
    min-width: 2.5em;
    margin-bottom: 0 !important;
  }
  .progress-bar-time.time-duration {
    font-size: 0.95em !important;
    text-align: right !important;
    min-width: 2.5em;
    margin-top: 0 !important;
  }
  .progress-bar .range-slider {
    width: 100% !important;
    min-width: 0 !important;
    margin: 0.1em 0 !important;
    display: block !important;
  }
}

@media (max-width: 480px) { 
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
      "playback-options"
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
  border-radius: inherit;
}

.jukebox-player.with-animated-bg > * {
  position: relative;
  z-index: 1;
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
  box-shadow: var(--shadow-md);
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
  color: var(--jp-color-primary);
}
.track-info-top .artist {
  font-size: 0.9em;
  color: var(--jp-color-primary-light);
}
.player-controls-bottom {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1em;
  width: 100%;
}
.player-controls-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1em;
  width: auto;
}
.controls, .playback-options, .volume-control {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.progress-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1 1 0;
  min-width: 0;
  gap: 0.5em;
}
.progress-bar-time.time-current {
  text-align: left;
  min-width: 2.5em;
}
.progress-bar-time.time-duration {
  text-align: right;
  min-width: 2.5em;
}
.progress-bar .range-slider {
  flex: 1 1 0;
  min-width: 0;
  margin: 0 0.2em;
  display: block;
}
.playback-options .active {
  color: var(--jp-color-text);
  background: var(--jp-color-primary-light);
}
.volume-control {
  position: relative;
  display: flex;
  justify-content: center;
}
.volume-slider-container {
  position: absolute;
  bottom: 80%;
  left: calc(-100% - 5px);
  transform: translateX(-50%);
  background: var(--jp-color-background);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  box-shadow: var(--shadow-md);
  width: 150px;
}
.controls button, .volume-button, .playback-options button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  min-height: 2.5rem;
}

.controls button, .volume-button {
  color: var(--jp-color-primary);
}

.controls button:hover:not(:disabled), .volume-button:hover:not(:disabled), .playback-options button:hover:not(:disabled) {
  background: none;
  transform: scale(1.1);
}
.controls button:active:not(:disabled), .volume-button:active:not(:disabled), .playback-options button:active:not(:disabled) {
  transform: scale(0.95);
}
.controls button:disabled, .volume-button:disabled, .playback-options button:disabled {
  color: var(--jp-color-primary-light);
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}
.controls button:disabled:hover, .volume-button:disabled:hover, .playback-options button:disabled:hover {
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

.progress-bar-time.time-current {
  cursor: pointer;
}

/* --- JukeboxPlayer Desktop (Regular) View Fixes --- */
.player-controls-bottom {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1em;
  width: 100%;
}
.progress-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1 1 0;
  min-width: 0;
  gap: 0.5em;
}
.controls, .playback-options, .volume-control {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.progress-bar-time.time-current {
  text-align: left;
  min-width: 2.5em;
}
.progress-bar-time.time-duration {
  text-align: right;
  min-width: 2.5em;
}
.progress-bar .range-slider {
  flex: 1 1 0;
  min-width: 0;
  margin: 0 0.2em;
  display: block;
}
/* --- END JukeboxPlayer Desktop (Regular) View Fixes --- */
</style> 

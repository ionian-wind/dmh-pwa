<template>
  <div class="jukebox-player" :class="{ 'with-animated-bg': showAnimatedBg }">
    <div class="jukebox-player-content">
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
import { ref, computed, defineProps } from 'vue';
import RangeSlider from '@/components/common/RangeSlider.vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import Button from '@/components/common/Button.vue';

const props = defineProps<{ animatedBackground?: boolean }>();
const playerStore = useJukeboxPlayerStore();

const showAnimatedBg = computed(() => !!props.animatedBackground && playerStore.isPlaying);

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
.jukebox-player.with-animated-bg::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg,
    rgba(79, 70, 229, 0.15) 0%,
    rgba(147, 51, 234, 0.15) 25%,
    rgba(236, 72, 153, 0.15) 50%,
    rgba(59, 130, 246, 0.15) 75%,
    rgba(34, 197, 94, 0.15) 100%
  );
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
.jukebox-player-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
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
.controls button:disabled {
  color: #ccc;
  cursor: not-allowed;
}
.controls button:disabled:hover {
  color: #ccc;
}
</style> 
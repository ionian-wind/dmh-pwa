<template>
  <div class="jukebox-player">
    <div class="track-info-top">
      <div class="title">{{ track?.title || 'No track selected' }}</div>
      <div class="artist">{{ track?.artist || '&nbsp;' }}</div>
    </div>
    <div class="player-controls-bottom">
      <div class="controls">
        <button @click="onPrev" :disabled="!track"><i class="si si-step-backward"></i></button>
        <button @click="onTogglePlay"><i :class="isPlaying ? 'si si-pause' : 'si si-play'"></i></button>
        <button @click="onNext" :disabled="!track"><i class="si si-step-forward"></i></button>
      </div>
      <div class="progress-bar">
        <span>{{ formatTime(currentTime) }}</span>
        <RangeSlider
          :model-value="currentTime"
          :max="duration || 1"
          :disabled="!track"
          @update:modelValue="onSeek"
        />
        <span>{{ formatTime(duration) }}</span>
      </div>
      <div
        class="volume-control"
        @mouseenter="showVolumeSlider"
        @mouseleave="startHideTimer"
        @wheel.prevent="handleWheel"
      >
        <button @click="onToggleMute" class="volume-button">
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
            @update:modelValue="onVolumeChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { JukeboxTrack } from '@/jukebox/types';
import RangeSlider from '@/components/common/RangeSlider.vue';

const props = defineProps<{
  track: JukeboxTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}>();

const emit = defineEmits(['togglePlay', 'next', 'prev', 'seek', 'volumechange', 'togglemute']);

const isVolumeSliderVisible = ref(false);
let volumeHideTimer: number | null = null;

function onPrev() { if (props.track) emit('prev'); }
function onNext() { if (props.track) emit('next'); }
function onTogglePlay() { emit('togglePlay'); }
function onSeek(value: number) { if (props.track) emit('seek', value); }
function onVolumeChange(value: number) { emit('volumechange', value); }
function onToggleMute() { emit('togglemute'); }

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
  const newVolume = Math.min(1, Math.max(0, props.volume - event.deltaY * 0.001));
  onVolumeChange(newVolume);
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
  padding: 1em;
  background: #f5f5f5;
  border-top: 1px solid #ddd;
  margin-bottom: 1em;
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
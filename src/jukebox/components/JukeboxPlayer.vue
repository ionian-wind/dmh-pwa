<template>
  <div class="jukebox-player">
    <div class="track-info-top">
      <div class="title">{{ track?.title || 'No track selected' }}</div>
      <div class="artist">{{ track?.artist || '' }}</div>
    </div>
    <div class="player-controls-bottom">
      <div class="controls">
        <button @click="onPrev">&laquo;</button>
        <button @click="onTogglePlay">{{ isPlaying ? '❚❚' : '►' }}</button>
        <button @click="onNext">&raquo;</button>
      </div>
      <div class="progress-bar">
        <span>{{ formatTime(currentTime) }}</span>
        <input
          type="range"
          :value="currentTime"
          :max="duration"
          @input="onSeek"
          class="slider"
        />
        <span>{{ formatTime(duration) }}</span>
      </div>
      <div class="volume-control">
        <button 
          @click="onToggleMute" 
          class="volume-button"
          @mouseenter="showVolumeSlider"
          @mouseleave="startHideTimer"
        >
          <span v-if="volume > 0.5">🔊</span>
          <span v-else-if="volume > 0">🔉</span>
          <span v-else>🔇</span>
        </button>
        <div 
          v-show="isVolumeSliderVisible" 
          class="volume-slider-container"
          @mouseenter="cancelHideTimer"
          @mouseleave="startHideTimer"
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="volume"
            @input="onVolumeChange"
            class="slider vertical"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref } from 'vue';
import type { JukeboxTrack } from '../types';

defineProps<{
  track: JukeboxTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}>();

const emit = defineEmits(['toggle-play', 'next', 'prev', 'seek', 'volumechange', 'togglemute']);

const isVolumeSliderVisible = ref(false);
const hideVolumeTimeout = ref<number | null>(null);

function showVolumeSlider() {
  cancelHideTimer();
  isVolumeSliderVisible.value = true;
}

function startHideTimer() {
  hideVolumeTimeout.value = window.setTimeout(() => {
    isVolumeSliderVisible.value = false;
  }, 200); // 200ms delay before hiding
}

function cancelHideTimer() {
  if (hideVolumeTimeout.value) {
    clearTimeout(hideVolumeTimeout.value);
    hideVolumeTimeout.value = null;
  }
}

function onTogglePlay() {
  emit('toggle-play');
}
function onNext() {
  emit('next');
}
function onPrev() {
  emit('prev');
}
function onSeek(event: Event) {
  emit('seek', parseFloat((event.target as HTMLInputElement).value));
}

function onToggleMute() {
  emit('togglemute');
}

function onVolumeChange(event: Event) {
  emit('volumechange', parseFloat((event.target as HTMLInputElement).value));
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}
</script>

<style scoped>
.jukebox-player {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 120px;
  padding: 1em;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  margin-bottom: 1rem;
}
.track-info-top {
  text-align: center;
  min-height: 2.5em; /* Reserve space to prevent layout shifts */
}
.track-info-top .title {
  font-weight: bold;
}
.track-info-top .artist {
  font-size: 0.9em;
  color: #666;
  min-height: 2em; /* Ensure space is reserved even if artist is not present */
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
.slider {
  flex-grow: 1;
}
.volume-control {
  grid-area: volume;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}
.volume-slider-container {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: #e0e0e0;
  padding: 1rem 0.5rem;
  border-radius: 8px;
  box-shadow: 0 -1px 4px rgba(0,0,0,0.1);
}
.slider.vertical {
  -webkit-appearance: slider-vertical;
  writing-mode: bt-lr; /* Fix for Firefox */
  width: 8px;
  height: 100px;
}
.volume-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0;
  line-height: 1;
}
</style> 
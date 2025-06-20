<template>
  <div class="jukebox-player">
    <div class="track-display">
      <div class="artwork" :style="{ backgroundImage: `url(${track?.picture})` }"></div>
      <div class="info">
        <div class="title">{{ track?.title || 'No track selected' }}</div>
        <div class="artist">{{ track?.artist || '' }}</div>
      </div>
    </div>
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
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import type { JukeboxTrack } from '../types';

defineProps<{
  track: JukeboxTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}>();

const emit = defineEmits(['toggle-play', 'next', 'prev', 'seek']);

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

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}
</script>

<style scoped>
.jukebox-player {
  display: grid;
  grid-template-areas:
    "display controls progress";
  grid-template-columns: 1fr 1fr 2fr;
  align-items: center;
  padding: 1em;
  background: #f5f5f5;
  border-radius: 8px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
}
.track-display {
  grid-area: display;
  display: flex;
  align-items: center;
}
.artwork {
  width: 60px;
  height: 60px;
  background-size: cover;
  background-color: #e0e0e0;
  border-radius: 4px;
  margin-right: 1em;
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
</style> 
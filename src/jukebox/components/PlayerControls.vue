<template>
  <div class="player-controls">
    <Button @click="$emit('prev')" variant="light" title="Previous"><span aria-label="Previous">⏮️</span></Button>
    <Button v-if="!isPlaying" @click="$emit('play')" variant="light" title="Play"><span aria-label="Play">▶️</span></Button>
    <Button v-else @click="$emit('pause')" variant="light" title="Pause"><span aria-label="Pause">⏸️</span></Button>
    <Button @click="$emit('next')" variant="light" title="Next"><span aria-label="Next">⏭️</span></Button>
    <Button :class="{ active: shuffle }" @click="$emit('toggle-shuffle')" variant="light" title="Shuffle"><span aria-label="Shuffle">🔀</span></Button>
    <Button :class="{ active: repeat !== 'off' }" @click="$emit('toggle-repeat')" variant="light" title="Repeat"><span aria-label="Repeat">🔁</span><span v-if="repeat === 'one'" class="repeat-one">1</span></Button>
    <div class="seek-bar">
      <input
        type="range"
        min="0"
        :max="duration"
        step="0.1"
        :value="currentTime"
        @input="onSeek"
      />
      <span>{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
    </div>
    <audio ref="audio" @error="$emit('audio-error', $event)" />
  </div>
</template>
<script setup lang="ts">
import Button from '../../components/common/Button.vue'
import { computed } from 'vue'
const props = defineProps<{ isPlaying: boolean; currentTime: number; duration: number; shuffle: boolean; repeat: string }>()
const emit = defineEmits(['seek', 'play', 'pause', 'next', 'prev', 'toggle-shuffle', 'toggle-repeat', 'audio-error'])
function onSeek(e: Event) {
  emit('seek', parseFloat((e.target as HTMLInputElement).value))
}
const repeatLabel = computed(() => {
  if (props.repeat === 'one') return 'One'
  if (props.repeat === 'all') return 'All'
  return 'Off'
})
function formatTime(sec: number) {
  if (!isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>
<style scoped>
.player-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 1rem 0;
  align-items: center;
  flex-wrap: wrap;
}
.seek-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 200px;
}
.seek-bar input[type="range"] {
  flex: 1;
  accent-color: var(--primary-color, #007bff);
}
.active {
  background: var(--jukebox-accent, #007bff);
  color: #fff;
}
.repeat-one {
  font-size: 0.8em;
  margin-left: 0.1em;
  vertical-align: super;
}
</style> 
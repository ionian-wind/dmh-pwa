<template>
  <ul class="track-list">
    <li
      v-for="(track, idx) in tracks"
      :key="track.name + idx"
      :class="{ current: track === current }"
      draggable="true"
      @dragstart="onDragStart(idx)"
      @dragover.prevent
      @drop="onDrop(idx)"
      @click="$emit('select', track)"
    >
      <span class="drag-handle">☰</span>
      {{ track.name }}
      <button class="remove-btn" @click.stop="$emit('remove', track)">✕</button>
    </li>
  </ul>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const props = defineProps<{ tracks: any[]; current: any }>()
const emit = defineEmits(['select', 'remove', 'reorder'])
let dragIndex = ref<number | null>(null)
function onDragStart(idx: number) {
  dragIndex.value = idx
}
function onDrop(idx: number) {
  if (dragIndex.value === null || dragIndex.value === idx) return
  const newOrder = props.tracks.slice()
  const [moved] = newOrder.splice(dragIndex.value, 1)
  newOrder.splice(idx, 0, moved)
  emit('reorder', newOrder)
  dragIndex.value = null
}
</script>
<style scoped>
.track-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  background: var(--card-bg, #f8f9fa);
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.track-list li {
  padding: 0.75rem 1rem;
  cursor: grab;
  border-bottom: 1px solid #eee;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.track-list li:last-child {
  border-bottom: none;
}
.track-list li.current {
  background: var(--jukebox-accent, #007bff);
  color: #fff;
  font-weight: bold;
}
.track-list li:hover {
  background: #e9ecef;
}
.drag-handle {
  cursor: grab;
  margin-right: 0.5rem;
  font-size: 1.2em;
  opacity: 0.5;
}
.remove-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #888;
  font-size: 1.1em;
  cursor: pointer;
  transition: color 0.2s;
}
.remove-btn:hover {
  color: #d00;
}
</style> 
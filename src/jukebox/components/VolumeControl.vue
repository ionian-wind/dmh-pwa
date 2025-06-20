<template>
  <div class="volume-control">
    <label>
      Volume
      <input type="range" min="0" max="1" step="0.01" :value="volume" @input="onInput" />
    </label>
  </div>
</template>
<script setup lang="ts">
const props = defineProps<{ volume: number }>()
const emit = defineEmits(['change'])
function onInput(e: Event) {
  emit('change', parseFloat((e.target as HTMLInputElement).value))
}
</script>
<style scoped>
.volume-control {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1rem 0;
}
input[type="range"] {
  margin-left: 0.5rem;
  accent-color: var(--primary-color, #007bff);
}
</style> 
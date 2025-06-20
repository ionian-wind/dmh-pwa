<template>
  <div class="artwork-display">
    <img v-if="artwork" :src="artwork" alt="Artwork" />
    <div v-else class="artwork-placeholder">No Artwork</div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ artwork: string | null }>()
</script>
<style scoped>
.artwork-display {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  background: var(--card-bg, #f8f9fa);
  border-radius: 1rem;
  margin: 1rem 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.artwork-display img {
  max-width: 160px;
  max-height: 160px;
  border-radius: 0.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.artwork-placeholder {
  color: #aaa;
  font-size: 1.2rem;
}
</style> 
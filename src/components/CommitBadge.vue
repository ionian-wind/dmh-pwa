<template>
  <div class="commit-badge">
    {{ commitId }}
  </div>
</template>

<script setup lang="ts">
const commitId = import.meta.env.VITE_COMMIT_SHA || 'dev';
</script>

<style scoped>
.commit-badge {
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 99999;
  padding: 2px 6px;
  border-top-right-radius: var(--border-radius);
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.7);
  font-family: monospace;
  font-size: 10px;
  line-height: 1.2;
  pointer-events: none;
  user-select: none;
}
</style>

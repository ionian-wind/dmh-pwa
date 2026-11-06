<script setup lang="ts">
defineProps<{
  backgroundColor?: string;
}>();
</script>

<template>
  <div
    class="entity-content-surface"
    :style="backgroundColor ? { backgroundColor } : undefined"
  >
    <slot />
  </div>
</template>

<style scoped>
.entity-content-surface {
  min-height: 100%;
  padding: 1rem;
  border-radius: var(--border-radius);
}
</style>

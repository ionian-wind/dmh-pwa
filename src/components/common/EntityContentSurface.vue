<template>
  <div class="entity-content-surface">
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

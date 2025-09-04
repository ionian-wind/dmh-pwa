<template>
  <span class="tag-chip">
    <slot />
    <button v-if="removable" class="remove-tag" @click="$emit('remove')">
      <slot name="icon"
        ><svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" /></svg
      ></slot>
    </button>
  </span>
</template>

<script setup lang="ts">
defineProps({ removable: Boolean });
</script>

<style scoped>
.tag-chip {
  display: inline-flex;
  align-items: center;
  background: var(--color-background-soft);
  color: var(--color-primary);
  border-radius: 16px;
  padding: 0.2em 0.75em 0.2em 0.5em;
  font-size: 0.95em;
  margin-left: 0.5em;
  border: 1px solid var(--color-primary);
  gap: 0.25em;
}
.remove-tag {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0 0.2em;
  font-size: 1em;
  display: flex;
  align-items: center;
}
.remove-tag:hover {
  color: var(--color-danger);
}
</style>

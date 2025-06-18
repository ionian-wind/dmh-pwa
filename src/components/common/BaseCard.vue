<template>
  <div class="base-card">
    <div v-if="$slots.header" class="base-card-header">
      <slot name="header" />
    </div>
    <div class="base-card-content">
      <slot />
    </div>
    <div v-if="$slots.actions || showView || showEdit || showDelete" class="base-card-actions">
      <div class="base-card-actions-left">
        <slot name="actions" />
      </div>
      <div class="base-card-actions-right">
        <Button v-if="showView" variant="link" size="small" @click="$emit('view')">View Details</Button>
        <Button v-if="showEdit" variant="primary" size="small" @click="$emit('edit')" title="Edit">✏️</Button>
        <Button v-if="showDelete" variant="danger" size="small" @click="$emit('delete')" title="Delete">🗑️</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from './Button.vue';

const props = defineProps({
  showView: { type: Boolean, default: false },
  showEdit: { type: Boolean, default: false },
  showDelete: { type: Boolean, default: false },
});

const emit = defineEmits(['view', 'edit', 'delete']);
</script>

<style scoped>
.base-card {
  background: var(--color-background, #fff);
  border: 1px solid var(--color-border, #ddd);
  border-radius: var(--border-radius, 8px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.06);
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.2s;
}
.base-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.10);
}
.base-card-header {
  padding: 1rem 1rem 0.5rem 1rem;
  border-bottom: 1px solid var(--color-border, #eee);
}
.base-card-content {
  padding: 1rem;
}
.base-card-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border, #eee);
  background: var(--color-background, #fff);
}
.base-card-actions-left {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.base-card-actions-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-left: auto;
}
</style> 
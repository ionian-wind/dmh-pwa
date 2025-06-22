<template>
  <div class="view-header">
    <div class="view-header-content">
      <Button v-if="showCreate" @click="$emit('create')" :title="createTitle">
        <i class="si si-plus"></i>
      </Button>

      <div v-if="showSearch || $slots.default" class="search-input-wrapper">
        <input
          v-if="showSearch"
          :value="searchQuery"
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          type="text"
          :placeholder="searchPlaceholder"
          class="search-input"
        >
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/common/Button.vue';

defineProps({
  showCreate: {
    type: Boolean,
    default: false,
  },
  createTitle: {
    type: String,
    default: 'Create',
  },
  showSearch: {
    type: Boolean,
    default: false,
  },
  searchQuery: {
    type: String,
    default: '',
  },
  searchPlaceholder: {
    type: String,
    default: 'Search...'
  }
});

defineEmits(['create', 'update:searchQuery']);
</script>

<style scoped>
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 1rem;
  background: var(--color-background);
  color: var(--color-text);
}
</style>

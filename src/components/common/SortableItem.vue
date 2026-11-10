<script setup lang="ts" generic="T extends Record<string, any>">
import { useTemplateRef } from 'vue';
import { makeSortableItem } from '@vue-dnd-kit/core';

const props = defineProps<{
  item: T;
  itemKey: string;
  index: number;
  handle?: string;
  disabled?: boolean;
}>();

const itemRef = useTemplateRef<HTMLElement>('item');

const { isDragging, isPlaceholder } = makeSortableItem(itemRef, {
  id: () => props.item[props.itemKey],
  item: () => props.item,
  handle: () => props.handle,
  disabled: () => props.disabled,
});
</script>

<template>
  <div
    ref="item"
    class="sortable-item"
    :class="{
      'sortable-item--dragging': isDragging,
      'sortable-item--placeholder': isPlaceholder,
    }"
  >
    <slot />
  </div>
</template>

<style scoped>
.sortable-item {
  width: 100%;
}

.sortable-item--dragging {
  opacity: 0.6;
}

.sortable-item--placeholder {
  opacity: 0.35;
}
</style>

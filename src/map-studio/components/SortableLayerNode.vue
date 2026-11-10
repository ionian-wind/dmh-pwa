<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { makeSortableItem, type FlatNode } from '@vue-dnd-kit/core';
import type { LayerTreeNode } from '@/map-studio/domain/layerTree';

const props = defineProps<{
  node: FlatNode<LayerTreeNode>;
  indent: number;
  disabled?: boolean;
}>();

const rowRef = useTemplateRef<HTMLElement>('row');

const { isDragging, isPlaceholder } = makeSortableItem(rowRef, {
  id: () => props.node.key,
  item: () => props.node.item,
  disabled: () => !!props.disabled,
});
</script>

<template>
  <div
    ref="row"
    class="sortable-layer-node"
    :class="{
      'sortable-layer-node--dragging': isDragging,
      'sortable-layer-node--placeholder': isPlaceholder,
    }"
    :style="{ marginInlineStart: `${node.depth * indent}px` }"
  >
    <slot />
  </div>
</template>

<style scoped>
.sortable-layer-node {
  position: relative;
}

.sortable-layer-node--dragging {
  opacity: 0.5;
}

.sortable-layer-node--placeholder {
  opacity: 0.35;
}
</style>

<script setup lang="ts" generic="T extends Record<string, any>">
import { computed, ref } from 'vue';
import { useDraggable } from '@vue-dnd-kit/core';

const props = defineProps<{
  item: T;
  index: number;
  source: T[];
  itemKey: string;
  groups: string[];
  handle?: string;
  disabled?: boolean;
}>();

const didDrag = ref(false);

const { elementRef, handleDragStart, isDragging } = useDraggable({
  groups: props.groups,
  disabled: props.disabled,
  data: computed(() => ({
    source: props.source,
    index: props.index,
    item: props.item,
  })),
  events: {
    onStart: () => {
      didDrag.value = false;
    },
    onMove: () => {
      didDrag.value = true;
    },
    onEnd: () => {
      didDrag.value = false;
    },
  },
});

function onPointerDown(event: PointerEvent) {
  if (props.disabled) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest('button, a, input, textarea, select, [data-no-drag]')) {
    return;
  }
  if (props.handle && !target?.closest(props.handle)) return;

  window.addEventListener(
    'pointerup',
    () => {
      window.setTimeout(() => {
        didDrag.value = false;
      }, 0);
    },
    { once: true },
  );
  handleDragStart(event);
}

function onClickCapture(event: MouseEvent) {
  if (!didDrag.value) return;
  event.preventDefault();
  event.stopPropagation();
}
</script>

<template>
  <div
    ref="elementRef"
    class="sortable-item"
    :class="{ 'sortable-item--dragging': isDragging }"
    @pointerdown.capture="onPointerDown"
    @click.capture="onClickCapture"
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
</style>

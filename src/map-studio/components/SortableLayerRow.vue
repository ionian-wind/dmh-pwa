<script setup lang="ts">
import { ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { useDraggable, useDroppable } from '@vue-dnd-kit/core';
import type { IDnDStore } from '@vue-dnd-kit/core';
import type { StudioLayer } from '@/map-studio/domain/document/types';
import {
  resolveLayerDropMode,
  type LayerDropPayload,
  type LayerDropPlacement,
} from '@/map-studio/domain/layers';

const props = defineProps<{
  layer: StudioLayer;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'drop', payload: LayerDropPayload): void;
}>();

const GROUP = 'map-studio-layers';
const didDrag = ref(false);
const overMode = ref<LayerDropPlacement | null>(null);

const {
  elementRef: dragRef,
  handleDragStart,
  isDragging,
} = useDraggable({
  id: props.layer.id,
  groups: [GROUP],
  disabled: !!props.disabled,
  data: { layerId: props.layer.id },
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

const { elementRef: dropRef, isOvered } = useDroppable({
  groups: [GROUP],
  disabled: !!props.disabled,
  events: {
    onHover: (store) => {
      overMode.value = modeFor(store);
    },
    onLeave: () => {
      overMode.value = null;
    },
    onDrop: (store) => {
      const dragged = [...store.draggingElements.value.values()][0];
      const layerId = dragged?.data?.layerId as string | undefined;
      const placement = modeFor(store);
      overMode.value = null;
      if (!layerId || layerId === props.layer.id || !placement) return;
      emit('drop', { layerId, targetId: props.layer.id, placement });
    },
  },
});

const setRefs = (element: Element | ComponentPublicInstance | null) => {
  const node = element instanceof HTMLElement ? element : null;
  dragRef.value = node;
  dropRef.value = node;
};

function modeFor(store: IDnDStore): LayerDropPlacement | null {
  const element = dropRef.value;
  const point = store.pointerPosition.current.value;
  if (!element || !point) return null;
  const rect = element.getBoundingClientRect();
  return resolveLayerDropMode(
    props.layer.type === 'folder',
    { top: rect.top, height: rect.height },
    point.y,
  );
}

function onPointerDown(event: PointerEvent): void {
  if (props.disabled) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest('button, a, input, textarea, select, [data-no-drag]')) {
    return;
  }
  handleDragStart(event);
}

function onClickCapture(event: MouseEvent): void {
  if (!didDrag.value) return;
  event.preventDefault();
  event.stopPropagation();
}
</script>

<template>
  <div
    :ref="setRefs"
    class="sortable-layer-row"
    :class="{
      'sortable-layer-row--dragging': isDragging,
      'sortable-layer-row--over': isOvered,
      'sortable-layer-row--before': overMode === 'before',
      'sortable-layer-row--after': overMode === 'after',
      'sortable-layer-row--inside': overMode === 'inside',
    }"
    @pointerdown.capture="onPointerDown"
    @click.capture="onClickCapture"
  >
    <slot />
  </div>
</template>

<style scoped>
.sortable-layer-row {
  position: relative;
}

.sortable-layer-row--dragging {
  opacity: 0.45;
}

.sortable-layer-row--over:not(.sortable-layer-row--before):not(
    .sortable-layer-row--after
  )::after {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  box-shadow: inset 0 0 0 2px var(--q-primary);
  content: '';
  pointer-events: none;
}

.sortable-layer-row--before::before,
.sortable-layer-row--after::before {
  position: absolute;
  right: 0;
  left: 0;
  height: 2px;
  border-radius: 2px;
  background: var(--q-primary);
  content: '';
  pointer-events: none;
}

.sortable-layer-row--before::before {
  top: -1px;
}

.sortable-layer-row--after::before {
  bottom: -1px;
}

.sortable-layer-row--inside::after {
  background: color-mix(in srgb, var(--q-primary) 16%, transparent);
  box-shadow: inset 0 0 0 2px var(--q-primary);
}
</style>

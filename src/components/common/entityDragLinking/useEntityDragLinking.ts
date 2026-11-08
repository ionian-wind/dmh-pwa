import { computed, ref } from 'vue';
import type { EntityDragData, EntityLinkKind } from './registry';

const draggedEntity = ref<EntityDragData | null>(null);
const dialogSource = ref<EntityDragData | null>(null);
const dialogTargetKind = ref<EntityLinkKind | null>(null);

export function useEntityDragLinking() {
  const isDragging = computed(() => draggedEntity.value !== null);
  const isDialogOpen = computed(
    () => !!dialogSource.value && !!dialogTargetKind.value,
  );

  function startDrag(entity: EntityDragData) {
    draggedEntity.value = entity;
    dialogSource.value = null;
    dialogTargetKind.value = null;
  }

  function endDrag() {
    draggedEntity.value = null;
  }

  function cancelDrop() {
    draggedEntity.value = null;
  }

  function dropOnKind(kind: EntityLinkKind) {
    if (!draggedEntity.value) return;
    dialogSource.value = draggedEntity.value;
    dialogTargetKind.value = kind;
    draggedEntity.value = null;
  }

  function closeDialog() {
    dialogSource.value = null;
    dialogTargetKind.value = null;
  }

  return {
    draggedEntity,
    dialogSource,
    dialogTargetKind,
    isDragging,
    isDialogOpen,
    startDrag,
    endDrag,
    cancelDrop,
    dropOnKind,
    closeDialog,
  };
}

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getEntityKindOption } from '@/maps/utils/entityRefs';
import {
  ENTITY_LINK_ICONS,
  ENTITY_LINK_TARGETS,
  type EntityLinkKind,
} from './registry';
import { useEntityDragLinking } from './useEntityDragLinking';
import EntityDragLinkDialog from './EntityDragLinkDialog.vue';

const { t } = useI18n();
const {
  draggedEntity,
  dialogSource,
  dialogTargetKind,
  isDragging,
  cancelDrop,
  dropOnKind,
  closeDialog,
} = useEntityDragLinking();

const hoveredKind = ref<EntityLinkKind | null>(null);

const targetKinds = computed(() =>
  draggedEntity.value ? ENTITY_LINK_TARGETS[draggedEntity.value.kind] : [],
);

function labelFor(kind: EntityLinkKind) {
  return t(getEntityKindOption(kind)?.labelKey ?? 'common.linkedEntities');
}

function drop(kind: EntityLinkKind) {
  hoveredKind.value = null;
  dropOnKind(kind);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isDragging"
      class="entity-drag-overlay"
      @dragover.prevent
      @drop.prevent="cancelDrop"
    >
      <div class="entity-drag-drop-grid">
        <div
          v-for="kind in targetKinds"
          :key="kind"
          class="entity-drag-drop-card"
          role="button"
          :aria-label="labelFor(kind)"
          @dragenter.prevent.stop="hoveredKind = kind"
          @dragover.prevent.stop="hoveredKind = kind"
          @dragleave.self="hoveredKind = null"
          @drop.prevent.stop="drop(kind)"
        >
          <QCard
            class="entity-drag-drop-card-inner"
            :class="{ 'entity-drag-drop-card--hovered': hoveredKind === kind }"
          >
            <component :is="ENTITY_LINK_ICONS[kind]" :size="56" />
            <span>{{ labelFor(kind) }}</span>
          </QCard>
        </div>
      </div>
    </div>
  </Teleport>

  <EntityDragLinkDialog
    v-if="dialogSource && dialogTargetKind"
    :source="dialogSource"
    :kind="dialogTargetKind"
    @close="closeDialog"
  />
</template>

<style scoped>
.entity-drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 2400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(4px);
}

.entity-drag-drop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 20px;
  width: min(900px, 100%);
  max-height: 80vh;
  overflow: auto;
}

.entity-drag-drop-card {
  min-height: 150px;
  cursor: copy;
}

.entity-drag-drop-card-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  min-height: 150px;
  padding: 24px;
  color: var(--color-text);
  text-align: center;
  border: 2px solid transparent;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
}

.entity-drag-drop-card--hovered {
  border-color: var(--q-primary);
  transform: scale(1.03);
}
</style>

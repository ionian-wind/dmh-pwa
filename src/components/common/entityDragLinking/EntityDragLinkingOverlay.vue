<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
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

watch(
  isDragging,
  (active) => {
    document.documentElement.classList.toggle('entity-drag-active', active);
    document.body.classList.toggle('entity-drag-active', active);
    if (!active) hoveredKind.value = null;
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  document.documentElement.classList.remove('entity-drag-active');
  document.body.classList.remove('entity-drag-active');
});

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
      @dragover.prevent="hoveredKind = null"
      @drop.prevent="cancelDrop"
    >
      <div class="entity-drag-overlay-content">
        <div class="entity-drag-overlay-title">
          {{
            t('common.linkEntityTo', {
              type: draggedEntity ? labelFor(draggedEntity.kind) : '',
            })
          }}
        </div>
        <div class="entity-drag-drop-grid">
          <div
            v-for="kind in targetKinds"
            :key="kind"
            class="entity-drag-drop-card"
            role="button"
            :aria-label="labelFor(kind)"
            @dragenter.prevent.stop="hoveredKind = kind"
            @dragover.prevent.stop="hoveredKind = kind"
            @drop.prevent.stop="drop(kind)"
          >
            <QCard
              class="entity-drag-drop-card-inner"
              :class="{
                'entity-drag-drop-card--hovered': hoveredKind === kind,
              }"
            >
              <component :is="ENTITY_LINK_ICONS[kind]" :size="64" />
              <span>{{ labelFor(kind) }}</span>
            </QCard>
          </div>
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
  overflow-x: hidden;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(4px);
  scrollbar-width: none;
}

.entity-drag-overlay::-webkit-scrollbar {
  display: none;
}

.entity-drag-overlay-content {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 100%;
  padding: 24px;
}

.entity-drag-overlay-title {
  color: #1f2937;
  font-size: 1.35rem;
  font-weight: 600;
  text-align: center;
}

.entity-drag-drop-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  width: min(900px, 100%);
}

.entity-drag-drop-card {
  flex: 0 0 210px;
  height: 180px;
  cursor: copy;
}

.entity-drag-drop-card-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-sizing: border-box;
  height: 100%;
  padding: 32px;
  color: var(--color-text);
  text-align: center;
  border: 2px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.entity-drag-drop-card--hovered {
  border-color: var(--q-primary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}
</style>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed, ref, useSlots, Fragment, Comment, type PropType } from 'vue';
import {
  IconEye,
  IconPencil,
  IconTrash,
  IconCopy,
  IconGripVertical,
} from '@tabler/icons-vue';
import {
  ENTITY_LINK_ICONS,
  type EntityDragData,
} from './entityDragLinking/registry';
import { useEntityDragLinking } from './entityDragLinking/useEntityDragLinking';

const { t } = useI18n();

const props = defineProps({
  showView: { type: Boolean, default: false },
  showEdit: { type: Boolean, default: false },
  showDelete: { type: Boolean, default: false },
  showCopy: { type: Boolean, default: false },
  title: { type: String, default: '' },
  dragEntity: {
    type: Object as PropType<EntityDragData | null>,
    default: null,
  },
});

const emit = defineEmits(['view', 'edit', 'delete', 'copy']);

const slots = useSlots();
const { startDrag, endDrag } = useEntityDragLinking();
const dragGhost = ref<HTMLElement | null>(null);
const isDraggingEntity = ref(false);
const dragIcon = computed(() =>
  props.dragEntity ? ENTITY_LINK_ICONS[props.dragEntity.kind] : null,
);

function onDragStart(event: DragEvent) {
  if (!props.dragEntity || !event.dataTransfer) return;

  isDraggingEntity.value = true;
  startDrag(props.dragEntity);
  event.dataTransfer.effectAllowed = 'link';
  event.dataTransfer.setData(
    'application/x-dmh-entity',
    JSON.stringify(props.dragEntity),
  );
  if (dragGhost.value) {
    event.dataTransfer.setDragImage(dragGhost.value, 16, 16);
  }
}

function onDragEnd() {
  isDraggingEntity.value = false;
  endDrag();
}

function isVNodeContent(vnode: any): boolean {
  if (vnode.type === Comment) return false;
  if (typeof vnode.children === 'string') {
    return vnode.children.trim().length > 0;
  }
  if (vnode.type === Fragment && Array.isArray(vnode.children)) {
    return vnode.children.some(isVNodeContent);
  }
  // For other nodes (elements/components), treat as content
  return true;
}

const hasContent = computed(() => {
  const vnodes = slots.default ? slots.default() : [];
  return vnodes.some(isVNodeContent);
});
</script>

<template>
  <QCard class="base-card" :class="{ 'is-dragging-entity': isDraggingEntity }">
    <QCardSection
      v-if="$slots.header || title"
      class="base-card-header row items-center no-wrap"
      @click="$emit('view')"
      style="cursor: pointer"
    >
      <div class="col">
        <h5 v-if="title">{{ title }}</h5>
        <slot name="header" />
      </div>
      <div
        v-if="dragEntity"
        class="entity-drag-handle"
        draggable="true"
        :title="t('common.dragToLink')"
        :aria-label="t('common.dragToLink')"
        @click.stop
        @mousedown.stop
        @dragstart.stop="onDragStart"
        @dragend.stop="onDragEnd"
      >
        <IconGripVertical :size="18" />
      </div>
    </QCardSection>
    <QCardSection v-if="hasContent" class="base-card-content q-pt-none">
      <slot />
    </QCardSection>

    <QCardActions
      v-if="
        $slots.actions ||
        props.showView ||
        props.showEdit ||
        props.showDelete ||
        props.showCopy
      "
      class="base-card-actions"
      align="between"
    >
      <QSeparator />

      <QBtnGroup flat v-if="$slots.actions" class="base-card-actions-left">
        <slot name="actions" />
      </QBtnGroup>

      <QSpace
        v-if="
          $slots.actions &&
          (props.showView ||
            props.showEdit ||
            props.showDelete ||
            props.showCopy)
        "
      />

      <QBtnGroup
        flat
        v-if="
          props.showView || props.showEdit || props.showDelete || props.showCopy
        "
      >
        <QBtn
          flat
          v-if="props.showView"
          color="standard"
          size="small"
          @click="$emit('view')"
          :title="t('common.view')"
        >
          <IconEye />
        </QBtn>
        <QBtn
          flat
          v-if="props.showEdit"
          color="positive"
          size="small"
          @click="$emit('edit')"
          :title="t('common.edit')"
        >
          <IconPencil />
        </QBtn>
        <QBtn
          flat
          v-if="props.showCopy"
          color="primary"
          size="small"
          @click="$emit('copy')"
          :title="t('common.copy')"
        >
          <IconCopy />
        </QBtn>
        <QBtn
          flat
          v-if="props.showDelete"
          color="negative"
          size="small"
          @click="$emit('delete')"
          :title="t('common.delete')"
        >
          <IconTrash />
        </QBtn>
      </QBtnGroup>
    </QCardActions>

    <div
      v-if="dragEntity && dragIcon"
      ref="dragGhost"
      class="entity-drag-ghost"
    >
      <QCard
        class="entity-drag-ghost-card row items-center no-wrap q-pa-sm q-gutter-sm"
      >
        <component :is="dragIcon" :size="24" />
        <span class="ellipsis">{{ dragEntity.title }}</span>
      </QCard>
    </div>
  </QCard>
</template>

<style scoped>
.base-card {
  position: relative;
  --card-actions-height: 52px;
  transition:
    padding-bottom 0.15s ease 0.15s,
    margin-bottom 0.15s ease 0.15s;
}

.base-card:hover,
.base-card:focus-within {
  z-index: 5;
  padding-bottom: var(--card-actions-height);
  margin-bottom: calc(-1 * var(--card-actions-height));
  transition-delay: 0s, 0s;
}

.base-card.is-dragging-entity {
  opacity: 0.35;
}

.entity-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  color: var(--color-text-light);
  cursor: grab;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.base-card:hover .entity-drag-handle,
.base-card:focus-within .entity-drag-handle {
  opacity: 1;
  pointer-events: auto;
}

@media (hover: none) {
  .entity-drag-handle {
    opacity: 1;
    pointer-events: auto;
  }
}

.entity-drag-handle:active {
  cursor: grabbing;
}

.entity-drag-ghost {
  position: fixed;
  top: -10000px;
  left: -10000px;
  pointer-events: none;
}

.entity-drag-ghost-card {
  max-width: 260px;
  color: var(--color-text);
}

.base-card :deep(.base-card-actions) {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--color-background) 35%
  );
  transition: opacity 0.15s ease;
  transition-delay: 0s;
}

.base-card:hover :deep(.base-card-actions),
.base-card:focus-within :deep(.base-card-actions) {
  opacity: 1;
  pointer-events: auto;
  transition-delay: 0.15s;
}

@media (hover: none) {
  .base-card:hover,
  .base-card:focus-within {
    padding-bottom: 0;
    margin-bottom: 0;
  }

  .base-card :deep(.base-card-actions) {
    position: static;
    opacity: 1;
    pointer-events: auto;
  }
}
</style>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import {
  computed,
  onBeforeUnmount,
  ref,
  useSlots,
  watch,
  Fragment,
  Comment,
  type PropType,
} from 'vue';
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
import { nextFloatLayerZIndex } from './entityDragLinking/floatLayer';

const { t } = useI18n();

const props = defineProps({
  showView: { type: Boolean, default: false },
  showEdit: { type: Boolean, default: false },
  showDelete: { type: Boolean, default: false },
  showCopy: { type: Boolean, default: false },
  hoverExpand: { type: Boolean, default: true },
  title: { type: String, default: '' },
  dragEntity: {
    type: Object as PropType<EntityDragData | null>,
    default: null,
  },
});

const emit = defineEmits(['view', 'edit', 'delete', 'copy']);

const slots = useSlots();
const { startDrag, endDrag } = useEntityDragLinking();
const cardShell = ref<HTMLElement | null>(null);
const isFloating = ref(false);
const isExpanded = ref(false);
const isShadowed = ref(false);
const reservedHeight = ref<number | null>(null);
const floatZIndex = ref(0);
const isHovering = ref(false);
let floatEndTimer: ReturnType<typeof setTimeout> | null = null;
let expansionFrame: number | ReturnType<typeof setTimeout> | null = null;

const shellStyle = computed(() => {
  if (!isFloating.value) return undefined;
  return {
    ...(reservedHeight.value !== null
      ? { height: `${reservedHeight.value}px` }
      : {}),
    zIndex: String(floatZIndex.value),
  };
});

const cardFloatStyle = computed(() =>
  isFloating.value
    ? { position: 'absolute', top: '0', right: '0', left: '0' }
    : undefined,
);

function clearFloatTimer() {
  if (floatEndTimer) {
    clearTimeout(floatEndTimer);
    floatEndTimer = null;
  }
}

function clearExpansionFrame() {
  if (expansionFrame === null) return;
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(expansionFrame as number);
  } else {
    clearTimeout(expansionFrame as ReturnType<typeof setTimeout>);
  }
  expansionFrame = null;
}

function expandOnNextFrame() {
  clearExpansionFrame();
  const expand = () => {
    expansionFrame = null;
    if (isFloating.value) isExpanded.value = true;
  };
  if (typeof requestAnimationFrame === 'function') {
    expansionFrame = requestAnimationFrame(expand);
  } else {
    expansionFrame = setTimeout(expand, 0);
  }
}

function beginFloat() {
  if (!props.hoverExpand) return;
  // Every newly hovered card must paint above all cards that are still
  // animating out from an earlier hover.
  floatZIndex.value = nextFloatLayerZIndex();
  isShadowed.value = true;

  if (!cardShell.value) return;
  if (isFloating.value) {
    expandOnNextFrame();
    return;
  }

  // Measure before any expansion is applied, then float immediately and start
  // the height/panel animation on the next frame.
  reservedHeight.value = cardShell.value.getBoundingClientRect().height;
  isFloating.value = true;
  expandOnNextFrame();
}

function scheduleEndFloat() {
  if (!isFloating.value) return;
  clearFloatTimer();
  floatEndTimer = setTimeout(() => {
    isFloating.value = false;
    isExpanded.value = false;
    isShadowed.value = false;
    reservedHeight.value = null;
    floatEndTimer = null;
  }, 330);
}

function onMouseEnter() {
  if (!props.hoverExpand) return;
  isHovering.value = true;
  clearFloatTimer();
  beginFloat();
}

function onMouseLeave() {
  if (!props.hoverExpand) return;
  isHovering.value = false;
  if (cardShell.value?.contains(document.activeElement)) return;
  isExpanded.value = false;
  isShadowed.value = false;
  scheduleEndFloat();
}

function onFocusIn() {
  if (!props.hoverExpand) return;
  clearFloatTimer();
  beginFloat();
}

function onFocusOut(event: FocusEvent) {
  if (!props.hoverExpand) return;
  const next = event.relatedTarget as Node | null;
  if (next && cardShell.value?.contains(next)) return;
  if (isHovering.value) return;
  isExpanded.value = false;
  isShadowed.value = false;
  scheduleEndFloat();
}

onBeforeUnmount(() => {
  clearFloatTimer();
  clearExpansionFrame();
});

watch(
  () => props.hoverExpand,
  (enabled) => {
    if (enabled) return;
    clearFloatTimer();
    clearExpansionFrame();
    isFloating.value = false;
    isExpanded.value = false;
    isShadowed.value = false;
    reservedHeight.value = null;
  },
);

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
  <div
    ref="cardShell"
    class="base-card-shell"
    :class="{ 'is-floating': isFloating, 'is-expanded': isExpanded }"
    :style="shellStyle"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <QCard
      class="base-card"
      :style="cardFloatStyle"
      :class="{
        'is-dragging-entity': isDraggingEntity,
        'shadow-5': isShadowed,
      }"
    >
      <QCardSection
        v-if="$slots.media || $slots.header || title"
        class="base-card-header row items-center no-wrap"
        @click="$emit('view')"
        style="cursor: pointer"
      >
        <div v-if="$slots.media" class="base-card-media">
          <slot name="media" />
        </div>
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
            props.showView ||
            props.showEdit ||
            props.showDelete ||
            props.showCopy
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
            color="standard"
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
  </div>
</template>

<style scoped>
.base-card-shell {
  position: relative;
}

.base-card-media {
  display: flex;
  flex: 0 0 auto;
  margin-right: 12px;
}

.base-card-shell.is-floating > .base-card {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
}

.base-card {
  position: relative;
  --card-actions-height: 52px;
  transition:
    padding-bottom 0.15s ease,
    margin-bottom 0.15s ease,
    box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.base-card-shell.is-expanded > .base-card {
  padding-bottom: var(--card-actions-height);
  margin-bottom: calc(-1 * var(--card-actions-height));
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

.base-card-shell.is-expanded .entity-drag-handle {
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
    var(--color-card-background) 35%
  );
  border-radius: 0 0 var(--border-radius-sm) var(--border-radius-sm);
  transition: opacity 0.15s ease;
}

.base-card-shell.is-expanded :deep(.base-card-actions) {
  opacity: 1;
  pointer-events: auto;
}

@media (hover: none) {
  .base-card-shell.is-expanded > .base-card {
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

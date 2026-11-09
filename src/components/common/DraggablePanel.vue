<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useFloatingLayer } from '@/composables/useFloatingLayer';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    minWidth?: string;
  }>(),
  { minWidth: '248px' },
);
const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();

const { zIndex, bringToFront } = useFloatingLayer();
const anchor = ref<HTMLDivElement | null>(null);
const anchorStyle = ref({ left: '0px', top: '0px' });
let positioned = false;
let userMoved = false;
let layoutObserver: ResizeObserver | undefined;
let layoutTimer: ReturnType<typeof setTimeout> | undefined;
const observed = new WeakSet<Element>();

function observeLayout() {
  if (!layoutObserver) return;
  for (const element of [
    document.querySelector('.q-drawer'),
    document.getElementById('main_menu'),
  ]) {
    if (element && !observed.has(element)) {
      layoutObserver.observe(element);
      observed.add(element);
    }
  }
}
let drag: {
  startX: number;
  startY: number;
  left: number;
  top: number;
} | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function placePanel() {
  const mainMenu = document.getElementById('main_menu');
  const measured = mainMenu?.getBoundingClientRect().right ?? -1;
  const drawerRight =
    document.querySelector('.q-drawer')?.getBoundingClientRect().right ?? 300;
  // The navigation rail can report a transient width while it animates open.
  // Keep panels clear of the expanded drawer regardless.
  const right = Math.max(measured, drawerRight, 300);
  anchorStyle.value = {
    left: `${clamp(right + 12, 0, Math.max(0, window.innerWidth - 360))}px`,
    top: `${Math.max(0, window.innerHeight - 16)}px`,
  };
  positioned = true;
}

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, a, input, textarea, select, .q-btn, .q-tab, [role="button"], [role="tab"]',
    ),
  );
}

function onHeaderPointerDown(event: PointerEvent) {
  if (event.button !== 0 || isInteractive(event.target)) return;
  bringToFront();
  drag = {
    startX: event.clientX,
    startY: event.clientY,
    left: Number.parseFloat(anchorStyle.value.left),
    top: Number.parseFloat(anchorStyle.value.top),
  };
  window.addEventListener('pointermove', onHeaderPointerMove);
  window.addEventListener('pointerup', stopHeaderDrag, { once: true });
}

function onHeaderPointerMove(event: PointerEvent) {
  if (!drag) return;
  userMoved = true;
  const nextLeft = clamp(
    drag.left + event.clientX - drag.startX,
    0,
    Math.max(0, window.innerWidth - 24),
  );
  const nextTop = clamp(
    drag.top + event.clientY - drag.startY,
    24,
    window.innerHeight,
  );
  anchorStyle.value = { left: `${nextLeft}px`, top: `${nextTop}px` };
}

function stopHeaderDrag() {
  drag = null;
  window.removeEventListener('pointermove', onHeaderPointerMove);
}

function onWindowResize() {
  if (!positioned || !userMoved) placePanel();
  const left = Number.parseFloat(anchorStyle.value.left);
  const top = Number.parseFloat(anchorStyle.value.top);
  anchorStyle.value = {
    left: `${clamp(left, 0, Math.max(0, window.innerWidth - 24))}px`,
    top: `${clamp(top, 24, window.innerHeight)}px`,
  };
}

watch(
  () => props.modelValue,
  (value) => {
    if (!value) return;
    bringToFront();
    if (!positioned) void nextTick(placePanel);
    void nextTick(observeLayout);
    if (layoutTimer) clearTimeout(layoutTimer);
    // The navigation drawer animates open after the panel appears; settle the
    // position once more after it has finished unless the user dragged.
    layoutTimer = setTimeout(() => {
      if (!userMoved) placePanel();
    }, 350);
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener('resize', onWindowResize);
  if (typeof ResizeObserver !== 'undefined') {
    layoutObserver = new ResizeObserver(() => {
      if (!props.modelValue) return;
      if (!userMoved) placePanel();
    });
    void nextTick(observeLayout);
    setTimeout(observeLayout, 200);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  layoutObserver?.disconnect();
  if (layoutTimer) clearTimeout(layoutTimer);
  stopHeaderDrag();
});
</script>

<template>
  <Teleport to="body">
    <div
      ref="anchor"
      class="floating-panel-anchor"
      :style="{ ...anchorStyle, zIndex }"
    >
      <QCard
        v-show="modelValue"
        class="floating-panel"
        :style="{ minWidth }"
        @pointerdown="bringToFront"
        @focusin="bringToFront"
      >
        <div class="floating-panel-header" @pointerdown="onHeaderPointerDown">
          <slot name="header" />
        </div>
        <slot />
      </QCard>
    </div>
  </Teleport>
</template>

<style scoped>
.floating-panel-anchor {
  position: fixed;
  width: 0;
  height: 0;
  pointer-events: none;
}

.floating-panel {
  position: absolute;
  left: 0;
  bottom: 0;
  pointer-events: auto;
  max-height: calc(100vh - 24px);
  overflow: auto;
}

.floating-panel-header {
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.floating-panel-header:active {
  cursor: grabbing;
}
</style>

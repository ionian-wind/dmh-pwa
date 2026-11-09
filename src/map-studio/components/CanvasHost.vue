<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { PixiStudioRenderer } from '@/map-studio/renderer/PixiStudioRenderer';
import type {
  Point,
  StudioMap,
  StudioTool,
  ToolSettings,
} from '@/map-studio/domain/document/types';

const props = defineProps<{
  map: StudioMap;
  tool: StudioTool;
  settings: ToolSettings;
}>();

const emit = defineEmits<{
  (
    event: 'rectangle',
    rect: { x: number; y: number; width: number; height: number },
  ): void;
  (event: 'ready', renderer: PixiStudioRenderer): void;
}>();

const host = ref<HTMLDivElement | null>(null);
const renderer = ref<PixiStudioRenderer | null>(null);
let drag:
  | {
      kind: 'pan';
      startX: number;
      startY: number;
      viewport: { x: number; y: number; zoom: number };
    }
  | { kind: 'rectangle'; start: Point }
  | null = null;
let resizeObserver: ResizeObserver | undefined;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function snap(value: number): number {
  if (!props.settings.snap) return value;
  const division = Math.max(1, props.settings.division);
  return Math.round(value * division) / division;
}

function localPoint(event: PointerEvent | WheelEvent): [number, number] {
  const rect = host.value?.getBoundingClientRect();
  return [event.clientX - (rect?.left ?? 0), event.clientY - (rect?.top ?? 0)];
}

function onPointerDown(event: PointerEvent): void {
  if (!renderer.value || !host.value) return;
  const [sx, sy] = localPoint(event);
  const shouldPan = props.tool === 'pan' || event.button === 1;
  host.value.setPointerCapture?.(event.pointerId);
  if (shouldPan) {
    drag = {
      kind: 'pan',
      startX: sx,
      startY: sy,
      viewport: renderer.value.getViewport(),
    };
    return;
  }
  if (event.button !== 0 || props.tool !== 'rectangle') return;
  drag = {
    kind: 'rectangle',
    start: renderer.value.screenToWorld(sx, sy),
  };
}

function onPointerMove(event: PointerEvent): void {
  if (!renderer.value || !drag) return;
  const [sx, sy] = localPoint(event);
  if (drag.kind === 'pan') {
    renderer.value.setViewport({
      ...drag.viewport,
      x: drag.viewport.x + sx - drag.startX,
      y: drag.viewport.y + sy - drag.startY,
    });
    return;
  }
  const current = renderer.value.screenToWorld(sx, sy);
  const x1 = snap(Math.min(drag.start[0], current[0]));
  const y1 = snap(Math.min(drag.start[1], current[1]));
  const x2 = snap(Math.max(drag.start[0], current[0]));
  const y2 = snap(Math.max(drag.start[1], current[1]));
  renderer.value.setPreview({
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
  });
}

function onPointerUp(event: PointerEvent): void {
  if (!renderer.value || !drag) return;
  const [sx, sy] = localPoint(event);
  if (drag.kind === 'rectangle') {
    const current = renderer.value.screenToWorld(sx, sy);
    const x1 = snap(Math.min(drag.start[0], current[0]));
    const y1 = snap(Math.min(drag.start[1], current[1]));
    const x2 = snap(Math.max(drag.start[0], current[0]));
    const y2 = snap(Math.max(drag.start[1], current[1]));
    renderer.value.setPreview(null);
    if (x2 - x1 >= 1 / 8 && y2 - y1 >= 1 / 8) {
      emit('rectangle', {
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1,
      });
    }
  }
  drag = null;
}

function onWheel(event: WheelEvent): void {
  if (!renderer.value) return;
  event.preventDefault();
  const [sx, sy] = localPoint(event);
  const viewport = renderer.value.getViewport();
  const nextZoom = clamp(
    viewport.zoom * Math.exp(-event.deltaY * 0.0015),
    0.05,
    8,
  );
  const ratio = nextZoom / viewport.zoom;
  renderer.value.setViewport({
    zoom: nextZoom,
    x: sx - (sx - viewport.x) * ratio,
    y: sy - (sy - viewport.y) * ratio,
  });
}

function onContextMenu(event: MouseEvent): void {
  event.preventDefault();
}

onMounted(async () => {
  if (!host.value) return;
  const instance = new PixiStudioRenderer();
  await instance.init(host.value);
  instance.setMap(props.map);
  instance.fit();
  renderer.value = instance;
  emit('ready', instance);
  resizeObserver = new ResizeObserver(() => {
    if (!host.value || !renderer.value) return;
    renderer.value.resize(host.value.clientWidth, host.value.clientHeight);
  });
  resizeObserver.observe(host.value);
  host.value.addEventListener('wheel', onWheel, { passive: false });
});

watch(
  () => props.map,
  (map) => renderer.value?.setMap(map),
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  host.value?.removeEventListener('wheel', onWheel);
  renderer.value?.destroy();
  renderer.value = null;
});
</script>

<template>
  <div
    ref="host"
    class="studio-canvas"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @contextmenu="onContextMenu"
  />
</template>

<style scoped>
.studio-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  touch-action: none;
  cursor: crosshair;
}
</style>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { PixiStudioRenderer } from '@/map-studio/renderer/PixiStudioRenderer';
import { hitTestObject, objectBounds } from '@/map-studio/domain/objects';
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
  selectedObjectId?: string | null;
}>();

const emit = defineEmits<{
  (
    event: 'rectangle',
    rect: { x: number; y: number; width: number; height: number },
  ): void;
  (event: 'circle', circle: { cx: number; cy: number; radius: number }): void;
  (event: 'polygon', points: Array<[number, number]>): void;
  (event: 'path', points: Array<[number, number]>): void;
  (event: 'wall', points: Array<[number, number]>): void;
  (event: 'text', point: [number, number]): void;
  (event: 'door', points: [number, number][]): void;
  (event: 'stairs', points: [number, number][]): void;
  (event: 'select', id: string | null): void;
  (event: 'moveObject', delta: { dx: number; dy: number }): void;
  (event: 'editText', id: string): void;
  (event: 'ready', renderer: PixiStudioRenderer): void;
}>();

const host = ref<HTMLDivElement | null>(null);
const renderer = ref<PixiStudioRenderer | null>(null);
const polygonPoints = ref<Point[]>([]);
let drag:
  | {
      kind: 'pan';
      startX: number;
      startY: number;
      viewport: { x: number; y: number; zoom: number };
    }
  | { kind: 'rectangle'; start: Point }
  | { kind: 'circle'; center: Point }
  | { kind: 'object'; id: string; start: Point }
  | null = null;
const doorPoints = ref<Point[]>([]);
const stairPoints = ref<Point[]>([]);
let resizeObserver: ResizeObserver | undefined;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function snap(value: number): number {
  if (!props.settings.snap) return value;
  const division = Math.max(1, props.settings.division);
  return Math.round(value * division) / division;
}

function localPoint(
  event: PointerEvent | WheelEvent | MouseEvent,
): [number, number] {
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
  if (event.button !== 0) return;
  if (props.tool === 'object') {
    const point = renderer.value.screenToWorld(sx, sy);
    const object = hitTestObject(
      props.map.layers
        .filter((layer) => layer.type === 'images' && layer.visible)
        .flatMap((layer) => (layer.type === 'images' ? layer.objects : [])),
      point,
    );
    emit('select', object?.id ?? null);
    if (object) {
      drag = { kind: 'object', id: object.id, start: point };
    }
    return;
  }
  if (props.tool === 'text') {
    const point = renderer.value.screenToWorld(sx, sy);
    emit('text', [snap(point[0]), snap(point[1])]);
    return;
  }
  if (props.tool === 'door' || props.tool === 'stairs') {
    const point = renderer.value.screenToWorld(sx, sy);
    const target = props.tool === 'door' ? doorPoints : stairPoints;
    target.value = [...target.value, [snap(point[0]), snap(point[1])]];
    if (props.tool === 'door' && target.value.length === 2) {
      emit(
        'door',
        target.value.map(([x, y]) => [x, y]),
      );
      target.value = [];
      renderer.value.setPreview(null);
    } else if (props.tool === 'stairs' && target.value.length === 3) {
      emit(
        'stairs',
        target.value.map(([x, y]) => [x, y]),
      );
      target.value = [];
      renderer.value.setPreview(null);
    }
    return;
  }
  if (['polygon', 'path', 'wall'].includes(props.tool)) {
    const point = renderer.value.screenToWorld(sx, sy);
    polygonPoints.value = [
      ...polygonPoints.value,
      [snap(point[0]), snap(point[1])],
    ];
    renderer.value.setPreview({
      kind: 'polygon',
      points: polygonPoints.value,
    });
    return;
  }
  if (props.tool === 'circle') {
    drag = { kind: 'circle', center: renderer.value.screenToWorld(sx, sy) };
    return;
  }
  if (props.tool !== 'rectangle') return;
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
  if (drag.kind === 'object') return;
  if (props.tool === 'door' && doorPoints.value.length === 1) {
    const current = renderer.value.screenToWorld(sx, sy);
    renderer.value.setPreview({
      kind: 'polygon',
      points: [doorPoints.value[0], [snap(current[0]), snap(current[1])]],
    });
    return;
  }
  if (props.tool === 'stairs' && stairPoints.value.length > 0) {
    const current = renderer.value.screenToWorld(sx, sy);
    renderer.value.setPreview({
      kind: 'polygon',
      points: [...stairPoints.value, [snap(current[0]), snap(current[1])]],
    });
    return;
  }
  if (drag.kind === 'circle') {
    renderer.value.setPreview({
      kind: 'circle',
      cx: drag.center[0],
      cy: drag.center[1],
      radius: Math.hypot(
        current[0] - drag.center[0],
        current[1] - drag.center[1],
      ),
    });
    return;
  }
  const x1 = snap(Math.min(drag.start[0], current[0]));
  const y1 = snap(Math.min(drag.start[1], current[1]));
  const x2 = snap(Math.max(drag.start[0], current[0]));
  const y2 = snap(Math.max(drag.start[1], current[1]));
  renderer.value.setPreview({
    kind: 'rectangle',
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
  });
}

function onPointerMovePolygon(event: PointerEvent): void {
  if (
    !renderer.value ||
    !['polygon', 'path', 'wall'].includes(props.tool) ||
    drag
  )
    return;
  if (polygonPoints.value.length === 0) return;
  const [sx, sy] = localPoint(event);
  const current = renderer.value.screenToWorld(sx, sy);
  renderer.value.setPreview({
    kind: 'polygon',
    points: [...polygonPoints.value, [snap(current[0]), snap(current[1])]],
  });
}

function onPointerUp(event: PointerEvent): void {
  if (!renderer.value || !drag) return;
  const [sx, sy] = localPoint(event);
  if (drag.kind === 'object') {
    const current = renderer.value.screenToWorld(sx, sy);
    const dx = snap(current[0]) - snap(drag.start[0]);
    const dy = snap(current[1]) - snap(drag.start[1]);
    if (dx !== 0 || dy !== 0) emit('moveObject', { dx, dy });
    drag = null;
    return;
  }
  if (drag.kind === 'circle') {
    const current = renderer.value.screenToWorld(sx, sy);
    const radius = Math.hypot(
      current[0] - drag.center[0],
      current[1] - drag.center[1],
    );
    renderer.value.setPreview(null);
    if (radius >= 1 / 8) {
      emit('circle', {
        cx: drag.center[0],
        cy: drag.center[1],
        radius,
      });
    }
    drag = null;
    return;
  }
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

function finishPolygon(): void {
  if (!renderer.value) return;
  const points = polygonPoints.value.map(
    ([x, y]) => [x, y] as [number, number],
  );
  polygonPoints.value = [];
  renderer.value.setPreview(null);
  if (props.tool === 'path' && points.length >= 2) emit('path', points);
  else if (props.tool === 'wall' && points.length >= 2) emit('wall', points);
  else if (points.length >= 3) emit('polygon', points);
}

function onDoubleClick(event: MouseEvent): void {
  if (['polygon', 'path', 'wall'].includes(props.tool)) {
    finishPolygon();
    return;
  }
  if (props.tool === 'object' && renderer.value) {
    const [sx, sy] = localPoint(event);
    const point = renderer.value.screenToWorld(sx, sy);
    const object = hitTestObject(
      props.map.layers
        .filter((layer) => layer.type === 'images' && layer.visible)
        .flatMap((layer) => (layer.type === 'images' ? layer.objects : [])),
      point,
    );
    if (object?.type === 'text') emit('editText', object.id);
  }
}

function cancelGesture(): void {
  drag = null;
  polygonPoints.value = [];
  doorPoints.value = [];
  stairPoints.value = [];
  renderer.value?.setPreview(null);
}

watch(
  () => props.tool,
  () => cancelGesture(),
);

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') cancelGesture();
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
  updateSelection();
  renderer.value = instance;
  emit('ready', instance);
  resizeObserver = new ResizeObserver(() => {
    if (!host.value || !renderer.value) return;
    renderer.value.resize(host.value.clientWidth, host.value.clientHeight);
  });
  resizeObserver.observe(host.value);
  host.value.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);
});

watch(
  () => props.map,
  (map) => {
    renderer.value?.setMap(map);
    updateSelection();
  },
);

function updateSelection(): void {
  const object = props.map.layers
    .filter((layer) => layer.type === 'images')
    .flatMap((layer) => (layer.type === 'images' ? layer.objects : []))
    .find((entry) => entry.id === props.selectedObjectId);
  renderer.value?.setSelection(object ? objectBounds(object) : null);
}

watch(() => props.selectedObjectId, updateSelection);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  host.value?.removeEventListener('wheel', onWheel);
  window.removeEventListener('keydown', onKeyDown);
  renderer.value?.destroy();
  renderer.value = null;
});
</script>

<template>
  <div
    ref="host"
    class="studio-canvas"
    @pointerdown="onPointerDown"
    @pointermove="
      onPointerMove($event);
      onPointerMovePolygon($event);
    "
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @dblclick="onDoubleClick"
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

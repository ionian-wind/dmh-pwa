<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { PixiStudioRenderer } from '@/map-studio/renderer/PixiStudioRenderer';
import { circleShapeRing } from '@/map-studio/domain/geometry/circle';
import {
  hitTestObject,
  objectBounds,
  unionBounds,
} from '@/map-studio/domain/objects';
import {
  pointInPolygon,
  shapeToPolygon,
} from '@/map-studio/domain/geometry/compile';
import type {
  Point,
  StudioMap,
  StudioObject,
  DungeonShape,
  StudioTool,
  ToolSettings,
  Roughness,
} from '@/map-studio/domain/document/types';

const { t } = useI18n();
const radiusLabel = ref<{ x: number; y: number; text: string } | null>(null);
const groupButton = ref<{ x: number; y: number; grouped: boolean } | null>(
  null,
);
const geometrySelection = ref<Point[]>([]);
const geometryMenu = ref<{ x: number; y: number } | null>(null);
const pastePreview = ref<{
  polygons: Point[][];
  center: Point;
  offset: Point;
  scale: number;
  rotation: number;
} | null>(null);

const props = defineProps<{
  map: StudioMap;
  tool: StudioTool;
  settings: ToolSettings;
  selectedObjectId?: string | null;
  selectedShape?: DungeonShape | null;
  selectedObjectIds?: string[];
  highlightedLayerId?: string | null;
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
  (event: 'selectShape', id: string | null): void;
  (event: 'selectMany', ids: string[]): void;
  (event: 'toggleSelect', id: string): void;
  (event: 'groupSelection'): void;
  (
    event: 'doorEndpointLive',
    payload: { id: string; endpoint: 'a' | 'b'; point: Point },
  ): void;
  (event: 'selectRegion', points: Point[]): void;
  (event: 'copyGeometry', points: Point[]): void;
  (event: 'cutGeometry', points: Point[]): void;
  (event: 'deleteGeometry', points: Point[]): void;
  (event: 'commitPaste', polygons: Point[][]): void;
  (event: 'cancelPaste'): void;
  (
    event: 'contextMenu',
    payload: { x: number; y: number; objectId: string | null; paste: boolean },
  ): void;
  (event: 'moveObject', delta: { dx: number; dy: number }): void;
  (event: 'beginObjectDrag'): void;
  (event: 'moveObjectLive', delta: { dx: number; dy: number }): void;
  (event: 'endObjectDrag'): void;
  (event: 'editText', id: string): void;
  (event: 'image', point: [number, number]): void;
  (
    event: 'resizeObject',
    size: { x: number; y: number; width: number; height: number },
  ): void;
  (event: 'rotateObject', rotation: number): void;
  (event: 'rotateSelection', delta: number): void;
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
  | {
      kind: 'polygon-freehand';
      points: Point[];
      lastScreen: Point;
      path?: boolean;
      wall?: boolean;
    }
  | { kind: 'rough'; shape: DungeonShape; startScreen: Point }
  | {
      kind: 'door-endpoint';
      id: string;
      endpoint: 'a' | 'b';
      start: Point;
    }
  | { kind: 'paste-move'; last: Point }
  | {
      kind: 'paste-resize';
      center: Point;
      startDistance: number;
      startScale: number;
    }
  | {
      kind: 'paste-rotate';
      center: Point;
      startAngle: number;
      startRotation: number;
    }
  | {
      kind: 'object';
      id: string;
      start: Point;
      last: Point;
      editTextId?: string;
    }
  | { kind: 'marquee'; start: Point }
  | {
      kind: 'resize';
      start: Point;
      last: Point;
      corner: 'nw' | 'ne' | 'sw' | 'se';
      bounds: { x: number; y: number; width: number; height: number };
    }
  | {
      kind: 'rotate';
      center: Point;
      startAngle: number;
      rotation: number;
      multi: boolean;
    }
  | null = null;
const doorPoints = ref<Point[]>([]);
const stairPoints = ref<Point[]>([]);
let resizeObserver: ResizeObserver | undefined;
let spacePressed = false;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function snap(value: number): number {
  if (
    !props.settings.snap ||
    (props.tool === 'path' && props.settings.smooth)
  ) {
    return value;
  }
  const division = Math.max(1, props.settings.division);
  return Math.round(value * division) / division;
}

function selectedObjects(): StudioObject[] {
  const ids = new Set(
    props.selectedObjectIds?.length
      ? props.selectedObjectIds
      : props.selectedObjectId
        ? [props.selectedObjectId]
        : [],
  );
  return props.map.layers
    .filter((layer) => layer.type === 'images')
    .flatMap((layer) => (layer.type === 'images' ? layer.objects : []))
    .filter((object) => ids.has(object.id));
}

function localPoint(
  event: PointerEvent | WheelEvent | MouseEvent,
): [number, number] {
  const rect = host.value?.getBoundingClientRect();
  return [event.clientX - (rect?.left ?? 0), event.clientY - (rect?.top ?? 0)];
}

function roughLevel(distance: number): Roughness {
  return distance < 24 ? 1 : distance < 80 ? 2 : 3;
}

function roughPreview(shape: DungeonShape, level: Roughness): void {
  if (shape.shape.kind === 'wall') {
    renderer.value?.setPreview({ kind: 'line', points: shape.shape.points });
    return;
  }
  const preview = shapeToPolygon({
    ...shape,
    shape: { ...shape.shape, rough: level },
  } as DungeonShape);
  if (preview?.[0]) {
    renderer.value?.setPreview({
      kind: 'polygon',
      points: preview[0].map(([x, y]) => [x, y] as Point),
    });
  }
}

function beginRough(shape: DungeonShape, sx: number, sy: number): boolean {
  if (!props.settings.roughMode) return false;
  props.settings.rough = 1;
  drag = { kind: 'rough', shape, startScreen: [sx, sy] };
  roughPreview(shape, 1);
  return true;
}

function roughShapeId(): string {
  return `rough-preview-${Date.now()}`;
}

function commitShape(shape: DungeonShape): void {
  const data = shape.shape;
  if (data.kind === 'rectangle') {
    emit('rectangle', {
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
    });
  } else if (data.kind === 'circle') {
    emit('circle', { cx: data.cx, cy: data.cy, radius: data.radius });
  } else if (data.kind === 'polygon') {
    emit(
      'polygon',
      data.points.map(([x, y]) => [x, y] as [number, number]),
    );
  } else if (data.kind === 'path') {
    emit(
      'path',
      data.points.map(([x, y]) => [x, y] as [number, number]),
    );
  } else if (data.kind === 'wall') {
    emit(
      'wall',
      data.points.map(([x, y]) => [x, y] as [number, number]),
    );
  }
}

function transformPastePolygons(): Point[][] {
  const preview = pastePreview.value;
  if (!preview) return [];
  const cos = Math.cos(preview.rotation);
  const sin = Math.sin(preview.rotation);
  return preview.polygons.map((polygon) =>
    polygon.map(([x, y]) => {
      const dx = (x - preview.center[0]) * preview.scale;
      const dy = (y - preview.center[1]) * preview.scale;
      return [
        preview.center[0] + dx * cos - dy * sin + preview.offset[0],
        preview.center[1] + dx * sin + dy * cos + preview.offset[1],
      ] as Point;
    }),
  );
}

function pasteBounds(): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  const polygons = transformPastePolygons();
  const points = polygons.flat();
  if (!points.length) return null;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(0.2, Math.max(...xs) - minX),
    height: Math.max(0.2, Math.max(...ys) - minY),
  };
}

function renderPastePreview(): void {
  if (!renderer.value || !pastePreview.value) return;
  renderer.value.setPreview({
    kind: 'polygons',
    polygons: transformPastePolygons(),
  });
  renderer.value.setSelection(pasteBounds());
}

function clearPastePreview(emitCancel = false): void {
  pastePreview.value = null;
  renderer.value?.setPreview(null);
  renderer.value?.setSelection(null);
  if (emitCancel) emit('cancelPaste');
}

function startGeometryPaste(polygons: Point[][]): void {
  if (!polygons.length) return;
  const points = polygons.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  pastePreview.value = {
    polygons: polygons.map((polygon) =>
      polygon.map(([x, y]) => [x, y] as Point),
    ),
    center: [
      (Math.min(...xs) + Math.max(...xs)) / 2,
      (Math.min(...ys) + Math.max(...ys)) / 2,
    ],
    offset: [0.5, 0.5],
    scale: 1,
    rotation: 0,
  };
  renderPastePreview();
}

function handlePastePointerDown(sx: number, sy: number): void {
  const bounds = pasteBounds();
  if (!renderer.value || !bounds) return;
  const vp = renderer.value.getViewport();
  const toScreen = (x: number, y: number): [number, number] => [
    x * 70 * vp.zoom + vp.x,
    y * 70 * vp.zoom + vp.y,
  ];
  const center: Point = [
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  ];
  const [rx, ry] = toScreen(
    center[0],
    bounds.y - Math.max(6, 8 / vp.zoom) / 70,
  );
  if (Math.hypot(sx - rx, sy - ry) < 20) {
    drag = {
      kind: 'paste-rotate',
      center,
      startAngle: Math.atan2(
        renderer.value.screenToWorld(sx, sy)[1] - center[1],
        renderer.value.screenToWorld(sx, sy)[0] - center[0],
      ),
      startRotation: pastePreview.value?.rotation ?? 0,
    };
    return;
  }
  const corners = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ];
  for (const corner of corners) {
    const [hx, hy] = toScreen(corner[0], corner[1]);
    if (Math.hypot(sx - hx, sy - hy) < 16) {
      const point = renderer.value.screenToWorld(sx, sy);
      drag = {
        kind: 'paste-resize',
        center,
        startDistance: Math.max(
          0.001,
          Math.hypot(point[0] - center[0], point[1] - center[1]),
        ),
        startScale: pastePreview.value?.scale ?? 1,
      };
      return;
    }
  }
  const point = renderer.value.screenToWorld(sx, sy);
  if (
    point[0] >= bounds.x &&
    point[0] <= bounds.x + bounds.width &&
    point[1] >= bounds.y &&
    point[1] <= bounds.y + bounds.height
  ) {
    drag = { kind: 'paste-move', last: point };
  }
}

function onPointerDown(event: PointerEvent): void {
  if (!renderer.value || !host.value || drag?.kind === 'rough') return;
  const [sx, sy] = localPoint(event);
  const shouldPan = props.tool === 'pan' || event.button === 1 || spacePressed;
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
  if (pastePreview.value) {
    handlePastePointerDown(sx, sy);
    return;
  }
  if (props.tool === 'object') {
    const point = renderer.value.screenToWorld(sx, sy);
    const selection = selectedObjects();
    const selected = selection[0];
    const bounds = unionBounds(selection);
    if (selected && bounds) {
      const multi = selection.length > 1;
      const vp = renderer.value.getViewport();
      const toScreen = (x: number, y: number): [number, number] => [
        x * 70 * vp.zoom + vp.x,
        y * 70 * vp.zoom + vp.y,
      ];
      if (selected.type === 'door') {
        for (const endpoint of ['a', 'b'] as const) {
          const [hx, hy] = toScreen(
            selected[endpoint][0],
            selected[endpoint][1],
          );
          if (Math.hypot(sx - hx, sy - hy) < 16) {
            drag = {
              kind: 'door-endpoint',
              id: selected.id,
              endpoint,
              start: point,
            };
            emit('beginObjectDrag');
            return;
          }
        }
      }
      const corners: Array<{
        corner: 'nw' | 'ne' | 'sw' | 'se';
        x: number;
        y: number;
      }> = [
        { corner: 'nw', x: bounds.x, y: bounds.y },
        { corner: 'ne', x: bounds.x + bounds.width, y: bounds.y },
        { corner: 'sw', x: bounds.x, y: bounds.y + bounds.height },
        {
          corner: 'se',
          x: bounds.x + bounds.width,
          y: bounds.y + bounds.height,
        },
      ];
      for (const corner of multi ||
      selected.type === 'text' ||
      selected.type === 'image'
        ? corners
        : []) {
        const [hx, hy] = toScreen(corner.x, corner.y);
        if (Math.hypot(sx - hx, sy - hy) < 16) {
          drag = {
            kind: 'resize',
            start: point,
            last: point,
            corner: corner.corner,
            bounds: {
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
            },
          };
          emit('beginObjectDrag');
          return;
        }
      }
      const handleWorld = Math.max(6, 8 / vp.zoom);
      const [rx, ry] = toScreen(
        bounds.x + bounds.width / 2,
        bounds.y - (handleWorld * 2) / 70,
      );
      if (Math.hypot(sx - rx, sy - ry) < 20) {
        const center: Point = [
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
        ];
        drag = {
          kind: 'rotate',
          center,
          startAngle: Math.atan2(point[1] - center[1], point[0] - center[0]),
          rotation: multi ? 0 : selected.transform.rotation,
          multi,
        };
        emit('beginObjectDrag');
        return;
      }
    }
    const object = hitTestObject(
      props.map.layers
        .filter(
          (layer) => layer.type === 'images' && layer.visible && !layer.locked,
        )
        .flatMap((layer) => (layer.type === 'images' ? layer.objects : [])),
      point,
    );
    const selectedIds = props.selectedObjectIds ?? [];
    if (object && event.shiftKey) {
      emit('toggleSelect', object.id);
      return;
    }
    if (object && selectedIds.includes(object.id)) {
      drag = {
        kind: 'object',
        id: object.id,
        start: point,
        last: point,
        ...(object.type === 'text' ? { editTextId: object.id } : {}),
      };
      emit('beginObjectDrag');
      return;
    }
    emit('select', object?.id ?? null);
    if (!object) {
      let shapeId: string | null = null;
      for (const layer of [...props.map.layers].reverse()) {
        if (layer.type !== 'dungeon' || !layer.visible || layer.locked)
          continue;
        for (const shape of [...layer.shapes].reverse()) {
          const polygon = shapeToPolygon(shape);
          if (polygon?.[0] && pointInPolygon(point, polygon[0])) {
            shapeId = shape.id;
            break;
          }
        }
        if (shapeId) break;
      }
      emit('selectShape', shapeId);
      if (!shapeId) drag = { kind: 'marquee', start: point };
    }
    if (object) {
      drag = { kind: 'object', id: object.id, start: point, last: point };
      emit('beginObjectDrag');
    }
    return;
  }
  if (props.tool === 'text' || props.tool === 'image') {
    const point = renderer.value.screenToWorld(sx, sy);
    const target: [number, number] = [snap(point[0]), snap(point[1])];
    if (props.tool === 'text') emit('text', target);
    else emit('image', target);
    return;
  }
  if (props.tool === 'door' || props.tool === 'stairs') {
    const point = renderer.value.screenToWorld(sx, sy);
    const target = props.tool === 'door' ? doorPoints : stairPoints;
    target.value = [...target.value, [snap(point[0]), snap(point[1])]];
    renderer.value.setPreview({
      kind: 'line',
      points: target.value,
    });
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
  if (['select', 'polygon', 'path', 'wall'].includes(props.tool)) {
    const point = renderer.value.screenToWorld(sx, sy);
    if (props.tool === 'polygon' && polygonPoints.value.length >= 3) {
      const vp = renderer.value.getViewport();
      const first = polygonPoints.value[0];
      const fx = first[0] * 70 * vp.zoom + vp.x;
      const fy = first[1] * 70 * vp.zoom + vp.y;
      if (Math.hypot(sx - fx, sy - fy) < 14) {
        finishPolygon();
        return;
      }
    }
    if (
      (props.tool === 'polygon' ||
        props.tool === 'path' ||
        props.tool === 'wall' ||
        props.tool === 'select') &&
      !props.settings.snap
    ) {
      const freehand: Point[] = [[point[0], point[1]]];
      drag = {
        kind: 'polygon-freehand',
        points: freehand,
        lastScreen: [sx, sy],
        path: props.tool === 'path',
        wall: props.tool === 'wall',
      };
      renderer.value.setPreview(
        props.tool === 'path' || props.tool === 'wall'
          ? { kind: 'line', points: freehand }
          : { kind: 'polygon', points: freehand },
      );
      return;
    }
    polygonPoints.value = [
      ...polygonPoints.value,
      [snap(point[0]), snap(point[1])],
    ];
    renderer.value.setPreview(
      props.tool === 'path' || props.tool === 'wall'
        ? { kind: 'line', points: polygonPoints.value }
        : { kind: 'polygon', points: polygonPoints.value },
    );
    return;
  }
  if (props.tool === 'circle') {
    const point = renderer.value.screenToWorld(sx, sy);
    drag = {
      kind: 'circle',
      center: [snap(point[0]), snap(point[1])],
    };
    radiusLabel.value = null;
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
    updateSelection();
    return;
  }
  if (drag.kind === 'paste-move' && pastePreview.value) {
    const current = renderer.value.screenToWorld(sx, sy);
    pastePreview.value.offset = [
      pastePreview.value.offset[0] + current[0] - drag.last[0],
      pastePreview.value.offset[1] + current[1] - drag.last[1],
    ];
    drag.last = current;
    renderPastePreview();
    return;
  }
  if (drag.kind === 'paste-resize' && pastePreview.value) {
    const current = renderer.value.screenToWorld(sx, sy);
    const distance = Math.max(
      0.001,
      Math.hypot(current[0] - drag.center[0], current[1] - drag.center[1]),
    );
    pastePreview.value.scale = clamp(
      drag.startScale * (distance / drag.startDistance),
      0.1,
      10,
    );
    renderPastePreview();
    return;
  }
  if (drag.kind === 'paste-rotate' && pastePreview.value) {
    const current = renderer.value.screenToWorld(sx, sy);
    const angle = Math.atan2(
      current[1] - drag.center[1],
      current[0] - drag.center[0],
    );
    pastePreview.value.rotation = drag.startRotation + angle - drag.startAngle;
    renderPastePreview();
    return;
  }
  if (drag.kind === 'rough') {
    const level = roughLevel(
      Math.hypot(sx - drag.startScreen[0], sy - drag.startScreen[1]),
    );
    props.settings.rough = level;
    roughPreview(drag.shape, level);
    return;
  }
  if (drag.kind === 'polygon-freehand') {
    if (Math.hypot(sx - drag.lastScreen[0], sy - drag.lastScreen[1]) < 4) {
      return;
    }
    const point = renderer.value.screenToWorld(sx, sy);
    drag.points.push([point[0], point[1]]);
    drag.lastScreen = [sx, sy];
    renderer.value.setPreview(
      drag.path || drag.wall
        ? { kind: 'line', points: drag.points }
        : { kind: 'polygon', points: drag.points },
    );
    return;
  }
  const current = renderer.value.screenToWorld(sx, sy);
  if (drag.kind === 'door-endpoint') {
    emit('doorEndpointLive', {
      id: drag.id,
      endpoint: drag.endpoint,
      point: [snap(current[0]), snap(current[1])],
    });
    return;
  }
  if (drag.kind === 'resize') {
    const current = renderer.value.screenToWorld(sx, sy);
    const dx = current[0] - drag.start[0];
    const dy = current[1] - drag.start[1];
    const b = drag.bounds;
    let x = b.x;
    let y = b.y;
    let width = b.width;
    let height = b.height;
    if (drag.corner.includes('e')) width = b.width + dx;
    if (drag.corner.includes('s')) height = b.height + dy;
    if (drag.corner.includes('w')) {
      width = b.width - dx;
      x = b.x + dx;
    }
    if (drag.corner.includes('n')) {
      height = b.height - dy;
      y = b.y + dy;
    }
    width = Math.max(0.2, width);
    height = Math.max(0.2, height);
    if (width === 0.2) x = Math.min(x, b.x + b.width - 0.2);
    if (height === 0.2) y = Math.min(y, b.y + b.height - 0.2);
    emit('resizeObject', { x, y, width, height });
    return;
  }
  if (drag.kind === 'rotate') {
    const current = renderer.value.screenToWorld(sx, sy);
    const angle = Math.atan2(
      current[1] - drag.center[1],
      current[0] - drag.center[0],
    );
    if (drag.multi) {
      emit('rotateSelection', angle - drag.startAngle);
    } else {
      emit('rotateObject', drag.rotation + angle - drag.startAngle);
    }
    return;
  }
  if (drag.kind === 'marquee') {
    const current = renderer.value.screenToWorld(sx, sy);
    const x1 = Math.min(drag.start[0], current[0]);
    const y1 = Math.min(drag.start[1], current[1]);
    renderer.value.setPreview({
      kind: 'rectangle',
      x: x1,
      y: y1,
      width: Math.abs(current[0] - drag.start[0]),
      height: Math.abs(current[1] - drag.start[1]),
    });
    return;
  }
  if (drag.kind === 'object') {
    const current = renderer.value.screenToWorld(sx, sy);
    emit('moveObjectLive', {
      dx: current[0] - drag.last[0],
      dy: current[1] - drag.last[1],
    });
    drag.last = current;
    return;
  }
  if (props.tool === 'door' && doorPoints.value.length === 1) {
    const current = renderer.value.screenToWorld(sx, sy);
    renderer.value.setPreview({
      kind: 'line',
      points: [doorPoints.value[0], [snap(current[0]), snap(current[1])]],
    });
    return;
  }
  if (props.tool === 'stairs' && stairPoints.value.length > 0) {
    const current = renderer.value.screenToWorld(sx, sy);
    renderer.value.setPreview({
      kind: 'line',
      points: [...stairPoints.value, [snap(current[0]), snap(current[1])]],
    });
    return;
  }
  if (drag.kind === 'circle') {
    const endpoint: Point = [snap(current[0]), snap(current[1])];
    const radius = Math.hypot(
      endpoint[0] - drag.center[0],
      endpoint[1] - drag.center[1],
    );
    const sides = Math.max(1, Math.round(props.settings.sides ?? 1));
    if (sides >= 3) {
      renderer.value.setPreview({
        kind: 'polygon',
        points: circleShapeRing(
          drag.center[0],
          drag.center[1],
          radius,
          sides,
          props.settings.drawTo ?? 'point',
        ),
      });
    } else {
      renderer.value.setPreview({
        kind: 'circle',
        cx: drag.center[0],
        cy: drag.center[1],
        radius,
      });
    }
    radiusLabel.value = {
      x: sx + 14,
      y: sy - 14,
      text: t('mapStudio.radiusCells', { radius: radius.toFixed(1) }),
    };
    return;
  }
  if (drag.kind !== 'rectangle') return;
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
    cornerRadius: props.settings.cornerRadius,
  });
}

function onPointerMovePolygon(event: PointerEvent): void {
  if (
    !renderer.value ||
    !['select', 'polygon', 'path', 'wall'].includes(props.tool) ||
    drag
  )
    return;
  if (polygonPoints.value.length === 0) return;
  const [sx, sy] = localPoint(event);
  const current = renderer.value.screenToWorld(sx, sy);
  const previewPoints = [
    ...polygonPoints.value,
    [snap(current[0]), snap(current[1])] as Point,
  ];
  renderer.value.setPreview(
    props.tool === 'path' || props.tool === 'wall'
      ? { kind: 'line', points: previewPoints }
      : { kind: 'polygon', points: previewPoints },
  );
}

function onPointerUp(event: PointerEvent): void {
  if (!renderer.value || !drag) return;
  const [sx, sy] = localPoint(event);
  if (
    drag.kind === 'paste-move' ||
    drag.kind === 'paste-resize' ||
    drag.kind === 'paste-rotate'
  ) {
    drag = null;
    return;
  }
  if (drag.kind === 'rough') {
    const level = roughLevel(
      Math.hypot(sx - drag.startScreen[0], sy - drag.startScreen[1]),
    );
    props.settings.rough = level;
    commitShape(drag.shape);
    renderer.value.setPreview(null);
    drag = null;
    return;
  }
  if (drag.kind === 'polygon-freehand') {
    const current = renderer.value.screenToWorld(sx, sy);
    drag.points.push([current[0], current[1]]);
    const points = drag.points.map(([x, y]) => [x, y] as [number, number]);
    const minimum = drag.path || drag.wall ? 2 : 3;
    if (points.length >= minimum) {
      const shape = {
        id: roughShapeId(),
        operation: 'add',
        shape: drag.path
          ? {
              kind: 'path',
              points,
              radius: props.settings.pathRadius,
              closed: false,
              rough: 0,
              smooth: props.settings.smooth,
            }
          : drag.wall
            ? {
                kind: 'wall',
                points,
                width: props.settings.wallWidth,
                dash: props.settings.wallDash,
                dashSize: props.settings.wallDashSize,
                rough: 0,
                smooth: props.settings.smooth,
              }
            : {
                kind: 'polygon',
                points,
                rough: 0,
                smooth: props.settings.smooth,
              },
      } as DungeonShape;
      if (beginRough(shape, sx, sy)) return;
      renderer.value.setPreview(null);
      commitShape(shape);
    } else {
      renderer.value.setPreview(null);
    }
    drag = null;
    return;
  }
  if (drag.kind === 'marquee') {
    const current = renderer.value.screenToWorld(sx, sy);
    const x1 = Math.min(drag.start[0], current[0]);
    const y1 = Math.min(drag.start[1], current[1]);
    const x2 = Math.max(drag.start[0], current[0]);
    const y2 = Math.max(drag.start[1], current[1]);
    const ids = props.map.layers
      .filter(
        (layer) => layer.type === 'images' && layer.visible && !layer.locked,
      )
      .flatMap((layer) => (layer.type === 'images' ? layer.objects : []))
      .filter((object) => {
        if (!object.visible) return false;
        const b = objectBounds(object);
        return (
          b.x >= x1 && b.y >= y1 && b.x + b.width <= x2 && b.y + b.height <= y2
        );
      })
      .map((object) => object.id);
    renderer.value.setPreview(null);
    emit('selectMany', ids);
    drag = null;
    return;
  }
  if (
    drag.kind === 'object' ||
    drag.kind === 'resize' ||
    drag.kind === 'rotate' ||
    drag.kind === 'door-endpoint'
  ) {
    const clickEdit =
      drag.kind === 'object' &&
      drag.editTextId &&
      Math.hypot(drag.last[0] - drag.start[0], drag.last[1] - drag.start[1]) <
        0.08;
    const editTextId = drag.kind === 'object' ? drag.editTextId : undefined;
    emit('endObjectDrag');
    drag = null;
    if (clickEdit && editTextId) emit('editText', editTextId);
    return;
  }
  if (drag.kind === 'circle') {
    const current = renderer.value.screenToWorld(sx, sy);
    const endpoint: Point = [snap(current[0]), snap(current[1])];
    const radius = Math.hypot(
      endpoint[0] - drag.center[0],
      endpoint[1] - drag.center[1],
    );
    renderer.value.setPreview(null);
    radiusLabel.value = null;
    if (radius >= 1 / 8) {
      const shape: DungeonShape = {
        id: roughShapeId(),
        operation: 'add',
        shape: {
          kind: 'circle',
          cx: drag.center[0],
          cy: drag.center[1],
          radius,
          sides: Math.max(1, Math.round(props.settings.sides ?? 1)),
          drawTo: props.settings.drawTo ?? 'point',
          rough: 0,
          smooth: false,
        },
      };
      if (beginRough(shape, sx, sy)) return;
      commitShape(shape);
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
      const shape: DungeonShape = {
        id: roughShapeId(),
        operation: 'add',
        shape: {
          kind: 'rectangle',
          x: x1,
          y: y1,
          width: x2 - x1,
          height: y2 - y1,
          cornerRadius: props.settings.cornerRadius,
          rough: 0,
          smooth: false,
        },
      };
      if (beginRough(shape, sx, sy)) return;
      commitShape(shape);
    }
  }
  drag = null;
}

function clearGeometrySelection(): void {
  geometrySelection.value = [];
  geometryMenu.value = null;
  renderer.value?.setGeometrySelection(null);
}

function finishPolygon(): void {
  if (!renderer.value) return;
  const points = polygonPoints.value.map(
    ([x, y]) => [x, y] as [number, number],
  );
  polygonPoints.value = [];
  renderer.value.setPreview(null);
  if (props.tool === 'select' && points.length >= 3) {
    geometrySelection.value = points;
    renderer.value.setGeometrySelection(points);
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const vp = renderer.value.getViewport();
    geometryMenu.value = {
      x: ((Math.min(...xs) + Math.max(...xs)) / 2) * 70 * vp.zoom + vp.x,
      y: Math.min(...ys) * 70 * vp.zoom + vp.y - 34,
    };
    emit('selectRegion', points);
    return;
  }
  if (props.tool === 'path' && points.length >= 2) {
    const shape: DungeonShape = {
      id: roughShapeId(),
      operation: 'add',
      shape: {
        kind: 'path',
        points,
        radius: props.settings.pathRadius,
        closed: false,
        rough: 0,
        smooth: props.settings.smooth,
      },
    };
    const last = points.at(-1) ?? [0, 0];
    const vp = renderer.value.getViewport();
    if (
      beginRough(
        shape,
        last[0] * 70 * vp.zoom + vp.x,
        last[1] * 70 * vp.zoom + vp.y,
      )
    ) {
      return;
    }
    commitShape(shape);
  } else if (props.tool === 'wall' && points.length >= 2) {
    const shape: DungeonShape = {
      id: roughShapeId(),
      operation: 'add',
      shape: {
        kind: 'wall',
        points,
        width: props.settings.wallWidth,
        dash: props.settings.wallDash,
        dashSize: props.settings.wallDashSize,
        rough: 0,
        smooth: props.settings.smooth,
      },
    };
    const last = points.at(-1) ?? [0, 0];
    const vp = renderer.value.getViewport();
    if (
      beginRough(
        shape,
        last[0] * 70 * vp.zoom + vp.x,
        last[1] * 70 * vp.zoom + vp.y,
      )
    ) {
      return;
    }
    commitShape(shape);
  } else if (points.length >= 3) {
    const shape: DungeonShape = {
      id: roughShapeId(),
      operation: 'add',
      shape: {
        kind: 'polygon',
        points: points.map(([x, y]) => [x, y] as [number, number]),
        rough: 0,
        smooth: props.settings.smooth,
      },
    };
    const last = points.at(-1) ?? [0, 0];
    const vp = renderer.value.getViewport();
    if (
      beginRough(
        shape,
        last[0] * 70 * vp.zoom + vp.x,
        last[1] * 70 * vp.zoom + vp.y,
      )
    ) {
      return;
    }
    commitShape(shape);
  }
}

function onDoubleClick(event: MouseEvent): void {
  if (['select', 'polygon', 'path', 'wall'].includes(props.tool)) {
    finishPolygon();
    return;
  }
  if (props.tool === 'object' && renderer.value) {
    const [sx, sy] = localPoint(event);
    const point = renderer.value.screenToWorld(sx, sy);
    const object = hitTestObject(
      props.map.layers
        .filter(
          (layer) => layer.type === 'images' && layer.visible && !layer.locked,
        )
        .flatMap((layer) => (layer.type === 'images' ? layer.objects : [])),
      point,
    );
    if (object?.type === 'text') emit('editText', object.id);
  }
}

function cancelGesture(): void {
  drag = null;
  polygonPoints.value = [];
  clearGeometrySelection();
  doorPoints.value = [];
  stairPoints.value = [];
  renderer.value?.setPreview(null);
}

watch(
  () => props.tool,
  () => cancelGesture(),
);

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    !!target.closest('input, textarea, select, [contenteditable="true"]')
  );
}

function zoomAtCenter(factor: number): void {
  if (!renderer.value || !host.value) return;
  const viewport = renderer.value.getViewport();
  const nextZoom = clamp(viewport.zoom * factor, 0.05, 8);
  const cx = (host.value.clientWidth || 1) / 2;
  const cy = (host.value.clientHeight || 1) / 2;
  const ratio = nextZoom / viewport.zoom;
  renderer.value.setViewport({
    zoom: nextZoom,
    x: cx - (cx - viewport.x) * ratio,
    y: cy - (cy - viewport.y) * ratio,
  });
}

function onKeyDown(event: KeyboardEvent): void {
  if (isEditableTarget(event.target)) return;
  if (pastePreview.value) {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmPaste();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelPaste();
      return;
    }
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const step = event.shiftKey ? 1 : 0.1;
      pastePreview.value.offset = [
        pastePreview.value.offset[0] +
          (event.key === 'ArrowLeft'
            ? -step
            : event.key === 'ArrowRight'
              ? step
              : 0),
        pastePreview.value.offset[1] +
          (event.key === 'ArrowUp'
            ? -step
            : event.key === 'ArrowDown'
              ? step
              : 0),
      ];
      renderPastePreview();
      return;
    }
  }
  if (event.code === 'Space' && !isEditableTarget(event.target)) {
    event.preventDefault();
    spacePressed = true;
    return;
  }
  if (isEditableTarget(event.target)) return;
  if (event.key === '=' || event.key === '+') {
    event.preventDefault();
    zoomAtCenter(1.25);
    return;
  }
  if (event.key === '-' || event.key === '_') {
    event.preventDefault();
    zoomAtCenter(1 / 1.25);
    return;
  }
  if (event.key === 'Escape') {
    cancelGesture();
    return;
  }
  if (props.tool === 'polygon' && polygonPoints.value.length > 0) {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishPolygon();
      return;
    }
    if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      polygonPoints.value = polygonPoints.value.slice(0, -1);
      renderer.value?.setPreview(
        polygonPoints.value.length
          ? { kind: 'polygon', points: polygonPoints.value }
          : null,
      );
    }
  }
}

function onKeyUp(event: KeyboardEvent): void {
  if (event.code === 'Space') spacePressed = false;
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
  updateSelection();
}

function onContextMenu(event: MouseEvent): void {
  event.preventDefault();
  if (!renderer.value) return;
  const [sx, sy] = localPoint(event);
  if (pastePreview.value) {
    emit('contextMenu', { x: sx, y: sy, objectId: null, paste: true });
    return;
  }
  const point = renderer.value.screenToWorld(sx, sy);
  const object = hitTestObject(
    props.map.layers
      .filter(
        (layer) => layer.type === 'images' && layer.visible && !layer.locked,
      )
      .flatMap((layer) => (layer.type === 'images' ? layer.objects : [])),
    point,
  );
  emit('contextMenu', {
    x: sx,
    y: sy,
    objectId: object?.id ?? null,
    paste: false,
  });
}

function flipPaste(axis: 'x' | 'y'): void {
  const preview = pastePreview.value;
  if (!preview) return;
  preview.polygons = preview.polygons.map((polygon) =>
    polygon.map(
      ([x, y]) =>
        [
          axis === 'x' ? preview.center[0] * 2 - x : x,
          axis === 'y' ? preview.center[1] * 2 - y : y,
        ] as Point,
    ),
  );
  renderPastePreview();
}

function confirmPaste(): void {
  if (!pastePreview.value) return;
  const polygons = transformPastePolygons();
  clearPastePreview();
  emit('commitPaste', polygons);
}

function cancelPaste(): void {
  if (pastePreview.value) clearPastePreview(true);
}

onMounted(async () => {
  if (!host.value) return;
  const instance = new PixiStudioRenderer();
  await instance.init(host.value);
  instance.setMap(props.map);
  instance.fit();
  updateSelection();
  updateLayerHighlight();
  renderer.value = instance;
  emit('ready', instance);
  resizeObserver = new ResizeObserver(() => {
    if (!host.value || !renderer.value) return;
    renderer.value.resize(host.value.clientWidth, host.value.clientHeight);
  });
  resizeObserver.observe(host.value);
  host.value.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
});

watch(
  () => props.map,
  (map) => {
    renderer.value?.setMap(map);
    updateSelection();
  },
);

function updateLayerHighlight(): void {
  if (!renderer.value) return;
  const layer = props.map.layers.find(
    (entry) => entry.id === props.highlightedLayerId,
  );
  if (!layer) {
    renderer.value.setLayerHighlight(null, null);
    return;
  }
  if (layer.type === 'dungeon') {
    renderer.value.setLayerHighlight(layer, null);
  } else if (layer.type === 'images') {
    renderer.value.setLayerHighlight(
      null,
      layer.objects.filter((object) => object.visible).map(objectBounds),
    );
  } else {
    renderer.value.setLayerHighlight(null, null);
  }
}

function updateSelection(): void {
  renderer.value?.setShapeSelection(props.selectedShape ?? null);
  const objects = selectedObjects();
  const bounds = unionBounds(objects);
  const doorEndpoints =
    objects.length === 1 && objects[0].type === 'door'
      ? [objects[0].a, objects[0].b]
      : [];
  renderer.value?.setSelection(bounds, doorEndpoints);
  if (objects.length > 1 && bounds && renderer.value) {
    const vp = renderer.value.getViewport();
    const groupId = objects[0].groupId ?? null;
    groupButton.value = {
      x: (bounds.x + bounds.width / 2) * 70 * vp.zoom + vp.x,
      y: bounds.y * 70 * vp.zoom + vp.y - 34,
      grouped:
        !!groupId && objects.every((object) => object.groupId === groupId),
    };
  } else {
    groupButton.value = null;
  }
}

watch(
  () => props.tool,
  (tool) => {
    if (tool !== 'select') clearGeometrySelection();
  },
);
watch(() => props.selectedObjectId, updateSelection);
watch(() => props.selectedObjectIds, updateSelection, { deep: true });
watch(() => props.selectedShape, updateSelection);
watch(() => props.highlightedLayerId, updateLayerHighlight);
watch(
  () => props.map,
  () => updateLayerHighlight(),
);

defineExpose({
  clearGeometrySelection,
  startGeometryPaste,
  flipPaste,
  confirmPaste,
  cancelPaste,
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  host.value?.removeEventListener('wheel', onWheel);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
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
  >
    <div
      v-if="radiusLabel"
      class="studio-radius-label"
      :style="{ left: `${radiusLabel.x}px`, top: `${radiusLabel.y}px` }"
    >
      {{ radiusLabel.text }}
    </div>
    <div
      v-if="geometryMenu"
      class="studio-geometry-menu"
      :style="{ left: `${geometryMenu.x}px`, top: `${geometryMenu.y}px` }"
      @pointerdown.stop
    >
      <button
        type="button"
        @click="
          emit('copyGeometry', geometrySelection);
          geometryMenu = null;
        "
      >
        {{ t('common.copy') }}
      </button>
      <button
        type="button"
        @click="
          emit('cutGeometry', geometrySelection);
          clearGeometrySelection();
        "
      >
        {{ t('common.cut') }}
      </button>
      <button
        type="button"
        @click="
          emit('deleteGeometry', geometrySelection);
          clearGeometrySelection();
        "
      >
        {{ t('common.delete') }}
      </button>
    </div>
    <button
      v-if="groupButton"
      type="button"
      class="studio-group-tooltip"
      :style="{
        left: `${groupButton.x}px`,
        top: `${groupButton.y}px`,
      }"
      @pointerdown.stop
      @click.stop="emit('groupSelection')"
    >
      {{ groupButton.grouped ? t('mapStudio.ungroup') : t('mapStudio.group') }}
    </button>
  </div>
</template>

<style scoped>
.studio-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  touch-action: none;
  cursor: crosshair;
}
.studio-group-tooltip {
  position: absolute;
  z-index: 3;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: var(--q-primary);
  border: 0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 20%);
  transform: translateX(-50%);
}
.studio-geometry-menu {
  position: absolute;
  z-index: 4;
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: 5px;
  box-shadow: 0 4px 14px rgb(0 0 0 / 18%);
  transform: translateX(-50%);
}
.studio-geometry-menu button {
  padding: 4px 8px;
  font: inherit;
  font-size: 11px;
  color: inherit;
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: 3px;
}
.studio-geometry-menu button:hover {
  background: var(--color-selected-surface);
}
.studio-radius-label {
  position: absolute;
  z-index: 2;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text);
  pointer-events: none;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
}
</style>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Notify } from 'quasar';
import CanvasHost from '@/map-studio/components/CanvasHost.vue';
import StudioHeader from '@/map-studio/components/StudioHeader.vue';
import StudioPresetsPanel from '@/map-studio/components/StudioPresetsPanel.vue';
import StudioLayersPanel from '@/map-studio/components/StudioLayersPanel.vue';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import { useMapStudioAutosave } from '@/map-studio/composables/useMapStudioAutosave';
import { useStudioHotkeys } from '@/map-studio/composables/useStudioHotkeys';
import {
  applyStudioImageToLocation,
  listStudioLocationOptions,
} from '@/map-studio/integration/location';
import type { PixiStudioRenderer } from '@/map-studio/renderer/PixiStudioRenderer';
import type { Point, StudioObject } from '@/map-studio/domain/document/types';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useMapStudioStore();
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__mapStudioStore = store;
}
const renderer = ref<PixiStudioRenderer | null>(null);
function onRendererReady(instance: PixiStudioRenderer): void {
  renderer.value = instance;
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__mapStudioRenderer =
      instance;
  }
}
const creating = ref(false);
const hasMaps = __FEATURE_MAPS__;
const applyOpen = ref(false);
const applying = ref(false);
const locationOptions = ref<Array<{ id: string; name: string }>>([]);
const targetLocationId = ref<string | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);
const pendingImage = ref<{ src: string; width: number; height: number } | null>(
  null,
);
const clipboard = ref<StudioObject[]>([]);
const contextMenu = ref<{ x: number; y: number } | null>(null);
const geometryRegion = ref<Point[] | null>(null);
const canvasHost = ref<InstanceType<typeof CanvasHost> | null>(null);
useMapStudioAutosave(store);
useStudioHotkeys({
  save: () => void store.save(),
  undo: () => store.undo(),
  redo: () => store.redo(),
  setTool: (tool) => store.setTool(tool),
  deleteSelection: () => store.removeSelectedObject(),
  getTool: () => store.tool,
  adjustSides: (delta) => setCircleSides(store.toolSettings.sides + delta),
  setSides: setCircleSides,
  cycleRough: () => {
    store.toolSettings.roughMode = !store.toolSettings.roughMode;
  },
  toggleMode: () => {
    store.toolSettings.mode =
      store.toolSettings.mode === 'erase' ? 'draw' : 'erase';
  },
  toggleSnap: () => {
    store.toolSettings.snap = !store.toolSettings.snap;
  },
  setDivision: (division) => {
    if ([1, 2, 3, 4, 6, 8, 9].includes(division)) {
      store.toolSettings.division = division;
    }
  },
  adjustRadius: (delta) => {
    const step = 1 / Math.max(1, store.toolSettings.division);
    store.toolSettings.pathRadius = Math.max(
      0.05,
      Number((store.toolSettings.pathRadius + delta * step).toFixed(3)),
    );
  },
  cutSelection: () => {
    if (geometryRegion.value) {
      store.cutGeometrySelection(geometryRegion.value);
      geometryRegion.value = null;
      canvasHost.value?.clearGeometrySelection();
    } else {
      clipboard.value = store.copySelectedObjects();
      store.removeSelectedObjects();
    }
  },
  copySelection: () => {
    if (geometryRegion.value) {
      store.copyGeometrySelection(geometryRegion.value);
    } else {
      clipboard.value = store.copySelectedObjects();
    }
  },
  pasteSelection: () => {
    if (store.geometryClipboard.length) store.pasteGeometryClipboard();
    else if (clipboard.value.length) store.pasteObjects(clipboard.value);
  },
  groupSelection: () => store.toggleGroupSelection(),
  nudgeSelection: (dx, dy) => store.nudgeSelectedObjects(dx, dy),
  sendToBack: () => store.reorderSelectedToEdge('back'),
  bringToFront: () => store.reorderSelectedToEdge('front'),
  hasObjectSelection: () => store.selectedObjectIds.length > 0,
});

const map = computed(() => store.map);
const selectedObject = computed(() => store.selectedObject);
const toolbar = computed(() => [
  { id: 'pan' as const, icon: 'tabler-hand-stop', label: t('mapStudio.pan') },
  {
    id: 'rectangle' as const,
    icon: 'tabler-square',
    label: t('mapStudio.rectangle'),
  },
  {
    id: 'circle' as const,
    icon: 'tabler-circle',
    label: t('mapStudio.circle'),
  },
  {
    id: 'polygon' as const,
    icon: 'tabler-polygon',
    label: t('mapStudio.polygon'),
  },
  {
    id: 'path' as const,
    icon: 'tabler-route',
    label: t('mapStudio.path'),
  },
  {
    id: 'wall' as const,
    icon: 'tabler-line',
    label: t('mapStudio.wall'),
  },
  {
    id: 'object' as const,
    icon: 'tabler-pointer',
    label: t('mapStudio.object'),
  },
  {
    id: 'text' as const,
    icon: 'tabler-text-size',
    label: t('mapStudio.text'),
  },
  {
    id: 'door' as const,
    icon: 'tabler-door',
    label: t('mapStudio.door'),
  },
  {
    id: 'stairs' as const,
    icon: 'tabler-stairs',
    label: t('mapStudio.stairs'),
  },
  {
    id: 'image' as const,
    icon: 'tabler-photo',
    label: t('mapStudio.image'),
  },
  {
    id: 'select' as const,
    icon: 'tabler-lasso-polygon',
    label: t('mapStudio.select'),
  },
]);
const divisions = [1, 2, 3, 4, 6, 8, 9].map((value) => ({
  label: `1/${value}`,
  value,
}));
const drawToOptions = computed(() => [
  { label: t('mapStudio.point'), value: 'point' },
  { label: t('mapStudio.edge'), value: 'edge' },
]);
const fontOptions = [
  'Georgia, serif',
  'Arial, sans-serif',
  'Courier New, monospace',
  'Times New Roman, serif',
  'Verdana, sans-serif',
  'Trebuchet MS, sans-serif',
];
const editingTextId = ref<string | null>(null);
const textDraft = ref('');
const textEditWasNew = ref(false);
const textEditorInput = ref<HTMLInputElement | null>(null);

const textEditorStyle = computed(() => {
  const id = editingTextId.value;
  if (!id || !renderer.value || !map.value) return {};
  const object = store.imagesLayer?.objects.find((entry) => entry.id === id);
  if (!object || object.type !== 'text') return {};
  const vp = renderer.value.getViewport();
  return {
    left: `${object.transform.x * 70 * vp.zoom + vp.x}px`,
    top: `${object.transform.y * 70 * vp.zoom + vp.y}px`,
    minWidth: `${Math.max(120, object.transform.width * 70 * vp.zoom)}px`,
    fontSize: `${Math.max(10, object.fontSize * 70 * vp.zoom)}px`,
    fontFamily: object.fontFamily,
    color: object.color,
    textAlign: object.align,
  };
});

function startTextEdit(id: string, isNew = false): void {
  const object = store.imagesLayer?.objects.find((entry) => entry.id === id);
  if (!object || object.type !== 'text') return;
  editingTextId.value = id;
  textDraft.value = object.text;
  textEditWasNew.value = isNew;
  void nextTick(() => {
    textEditorInput.value?.focus();
    textEditorInput.value?.select();
  });
}

function commitTextEdit(): void {
  const id = editingTextId.value;
  if (!id) return;
  const value = textDraft.value;
  const object = store.imagesLayer?.objects.find((entry) => entry.id === id);
  editingTextId.value = null;
  if (!object || object.type !== 'text') return;
  if (!value.trim()) {
    if (textEditWasNew.value) {
      store.selectObject(id);
      store.removeSelectedObject();
    }
    return;
  }
  if (value !== object.text) store.updateObject(id, { text: value });
}

function cancelTextEdit(): void {
  const id = editingTextId.value;
  if (!id) return;
  if (textEditWasNew.value) {
    store.selectObject(id);
    store.removeSelectedObject();
  }
  editingTextId.value = null;
}

function setCircleSides(value: number | string | null | undefined): void {
  store.toolSettings.sides = Math.max(
    1,
    Math.min(12, Math.round(Number(value) || 1)),
  );
}

onMounted(async () => {
  creating.value = true;
  try {
    await store.loadLibrary();
    await store.openProject(
      String(route.params.projectId ?? ''),
      route.params.mapId ? String(route.params.mapId) : undefined,
    );
  } finally {
    creating.value = false;
  }
});

function addRectangle(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): void {
  store.addRectangle(rect);
}

function resizeSelected(size: {
  x: number;
  y: number;
  width: number;
  height: number;
}): void {
  if (store.selectedObjectIds.length > 1) {
    store.resizeSelectedObjectsLive(size);
    return;
  }
  const object = selectedObject.value;
  if (!object || (object.type !== 'text' && object.type !== 'image')) return;
  store.patchSelectedObjectLive({
    transform: { ...object.transform, ...size },
  });
}

function rotateSelected(rotation: number): void {
  if (selectedObject.value) store.rotateSelectedObject(rotation);
}

function rotateSelection(delta: number): void {
  store.rotateSelectedObjectsLive(delta);
}

function editText(id: string): void {
  startTextEdit(id);
}

function onSelectRegion(points: Point[]): void {
  geometryRegion.value = points;
}

function copyGeometry(points: Point[]): void {
  store.copyGeometrySelection(points);
}

function cutGeometry(points: Point[]): void {
  store.cutGeometrySelection(points);
  geometryRegion.value = null;
}

function deleteGeometry(points: Point[]): void {
  store.cutGeometrySelection(points);
  geometryRegion.value = null;
}

function showContextMenu(payload: {
  x: number;
  y: number;
  objectId: string | null;
}): void {
  if (payload.objectId) {
    const selected = store.selectedObjectIds;
    const keepSelection =
      selected.includes(payload.objectId) &&
      (selected.length === 1 || !!store.selectedGroupId);
    if (!keepSelection) store.selectObject(payload.objectId);
  }
  contextMenu.value = { x: payload.x, y: payload.y };
}

function contextAction(action: string): void {
  contextMenu.value = null;
  if (action === 'duplicate') store.duplicateSelectedObjects();
  else if (action === 'front') store.reorderSelectedToEdge('front');
  else if (action === 'back') store.reorderSelectedToEdge('back');
  else if (action === 'flip-x') store.flipSelectedObjects('x');
  else if (action === 'flip-y') store.flipSelectedObjects('y');
  else if (action === 'delete') store.removeSelectedObjects();
}

function chooseImage(): void {
  imageInput.value?.click();
}

function onImageSelected(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const src = String(reader.result);
    const image = new Image();
    image.onload = () => {
      const max = 4;
      const scale = Math.min(max / image.width, max / image.height, 0.08);
      pendingImage.value = {
        src,
        width: image.width * scale,
        height: image.height * scale,
      };
      store.setTool('image');
    };
    image.src = src;
  };
  reader.readAsDataURL(file);
  (event.target as HTMLInputElement).value = '';
}

function addImage(point: [number, number]): void {
  if (!pendingImage.value) {
    chooseImage();
    return;
  }
  store.addImage(
    pendingImage.value.src,
    point,
    pendingImage.value.width,
    pendingImage.value.height,
  );
  pendingImage.value = null;
  store.setTool('object');
}

function addText(point: [number, number]): void {
  const id = store.addTextObject(point);
  if (id) window.setTimeout(() => startTextEdit(id, true), 0);
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportMap(
  format: 'png' | 'webp' | 'jpg' = 'png',
): Promise<void> {
  if (!renderer.value || !map.value) return;
  const mime = {
    png: 'image/png',
    webp: 'image/webp',
    jpg: 'image/jpeg',
  }[format];
  const blob = await renderer.value.exportImage(70, mime);
  download(blob, `${map.value.name || 'map'}.${format}`);
}

async function exportPdf(): Promise<void> {
  if (!renderer.value || !map.value) return;
  const blob = await renderer.value.exportImage(70, 'image/png');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const width = map.value.width * 70;
  const height = map.value.height * 70;
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height],
  });
  pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
  download(pdf.output('blob'), `${map.value.name || 'map'}.pdf`);
}

async function openApplyDialog(): Promise<void> {
  locationOptions.value = await listStudioLocationOptions();
  targetLocationId.value = locationOptions.value[0]?.id ?? null;
  applyOpen.value = true;
}

async function applyToLocation(): Promise<void> {
  if (!renderer.value || !map.value || !targetLocationId.value) return;
  applying.value = true;
  try {
    const blob = await renderer.value.exportImage(70);
    const applied = await applyStudioImageToLocation(
      targetLocationId.value,
      blob,
      `${map.value.name || 'map'}.png`,
    );
    if (applied) {
      Notify.create({ type: 'positive', message: t('mapStudio.applied') });
      applyOpen.value = false;
    } else {
      Notify.create({ type: 'negative', message: t('mapStudio.applyFailed') });
    }
  } finally {
    applying.value = false;
  }
}
</script>

<template>
  <div class="map-studio-view">
    <StudioHeader
      :name="map?.name ?? ''"
      :autosave="store.autosave"
      :dirty="store.dirty"
      :can-undo="store.canUndo"
      :can-redo="store.canRedo"
      :has-maps="hasMaps"
      @back="router.push('/map-studio')"
      @undo="store.undo()"
      @redo="store.redo()"
      @save="store.save()"
      @apply="openApplyDialog"
      @export="exportMap"
      @export-pdf="exportPdf"
    />

    <div v-if="creating" class="studio-loading">
      <QSpinner color="primary" size="42px" />
    </div>

    <div v-else-if="!map" class="studio-loading">
      <p>{{ t('mapStudio.notFound') }}</p>
      <QBtn
        color="primary"
        no-caps
        :label="t('mapStudio.backToLibrary')"
        @click="router.push('/map-studio')"
      />
    </div>

    <template v-else>
      <div class="studio-toolbar">
        <QBtn
          flat
          dense
          class="studio-tool"
          icon="tabler-photo-plus"
          :title="t('mapStudio.addImage')"
          @click="chooseImage"
        />
        <QBtn
          v-for="entry in toolbar"
          :key="entry.id"
          flat
          dense
          class="studio-tool"
          :class="{ 'studio-tool--active': store.tool === entry.id }"
          :icon="entry.icon"
          :aria-label="entry.label"
          :title="entry.label"
          @click="store.setTool(entry.id)"
        />
        <QSeparator vertical class="q-mx-sm" />
        <QToggle
          v-model="store.toolSettings.snap"
          dense
          :label="t('mapStudio.snap')"
        />
        <QBtn
          flat
          dense
          no-caps
          :icon="
            store.toolSettings.mode === 'erase'
              ? 'tabler-eraser'
              : 'tabler-pencil'
          "
          :label="
            store.toolSettings.mode === 'erase'
              ? t('mapStudio.erase')
              : t('mapStudio.draw')
          "
          @click="
            store.toolSettings.mode =
              store.toolSettings.mode === 'erase' ? 'draw' : 'erase'
          "
        />
        <QSelect
          v-model="store.toolSettings.division"
          dense
          outlined
          emit-value
          map-options
          :options="divisions"
          :label="t('mapStudio.division')"
          class="studio-division"
        />
        <QToggle
          v-model="store.toolSettings.roughMode"
          dense
          :label="t('mapStudio.rough')"
        />
        <QToggle
          v-if="
            store.tool === 'polygon' ||
            store.tool === 'path' ||
            store.tool === 'wall'
          "
          v-model="store.toolSettings.smooth"
          dense
          :label="t('mapStudio.smooth')"
        />
        <template v-if="store.tool === 'wall'">
          <QInput
            v-model.number="store.toolSettings.wallWidth"
            dense
            outlined
            type="number"
            min="0.01"
            step="0.01"
            :label="t('mapStudio.width')"
            class="studio-sides-input"
          />
          <QToggle
            v-model="store.toolSettings.wallDash"
            dense
            :label="t('mapStudio.dash')"
          />
          <QInput
            v-if="store.toolSettings.wallDash"
            v-model.number="store.toolSettings.wallDashSize"
            dense
            outlined
            type="number"
            min="0.05"
            step="0.05"
            :label="t('mapStudio.dashSize')"
            class="studio-sides-input"
          />
        </template>
        <template v-if="store.tool === 'text'">
          <QSelect
            v-model="store.toolSettings.text.fontFamily"
            dense
            outlined
            :options="fontOptions"
            :label="t('mapStudio.font')"
            class="studio-text-font"
          />
          <QInput
            v-model.number="store.toolSettings.text.fontSize"
            dense
            outlined
            type="number"
            min="0.05"
            step="0.01"
            :label="t('mapStudio.fontSize')"
            class="studio-sides-input"
          />
          <input
            type="color"
            :value="store.toolSettings.text.color"
            :aria-label="t('mapStudio.colour')"
            @input="
              store.toolSettings.text.color = (
                $event.target as HTMLInputElement
              ).value
            "
          />
          <QBtnGroup flat>
            <QBtn
              v-for="alignment in ['left', 'center', 'right'] as const"
              :key="alignment"
              flat
              dense
              round
              :icon="`tabler-align-${alignment}`"
              :class="{
                'studio-tool--active':
                  store.toolSettings.text.align === alignment,
              }"
              :aria-label="t(`mapStudio.${alignment}`)"
              @click="store.toolSettings.text.align = alignment"
            />
          </QBtnGroup>
          <QToggle
            v-model="store.toolSettings.text.shadow.enabled"
            dense
            :label="t('mapStudio.dropShadow')"
          />
          <template v-if="store.toolSettings.text.shadow.enabled">
            <input
              type="color"
              :value="store.toolSettings.text.shadow.color"
              :aria-label="t('mapStudio.shadowColor')"
              @input="
                store.toolSettings.text.shadow.color = (
                  $event.target as HTMLInputElement
                ).value
              "
            />
            <QInput
              v-model.number="store.toolSettings.text.shadow.offsetX"
              dense
              outlined
              type="number"
              step="0.01"
              :label="t('mapStudio.offsetX')"
              class="studio-sides-input"
            />
            <QInput
              v-model.number="store.toolSettings.text.shadow.offsetY"
              dense
              outlined
              type="number"
              step="0.01"
              :label="t('mapStudio.offsetY')"
              class="studio-sides-input"
            />
            <QInput
              v-model.number="store.toolSettings.text.shadow.opacity"
              dense
              outlined
              type="number"
              min="0"
              max="1"
              step="0.05"
              :label="t('mapStudio.opacity')"
              class="studio-sides-input"
            />
          </template>
        </template>
        <QInput
          v-if="store.tool === 'path'"
          v-model.number="store.toolSettings.pathRadius"
          dense
          outlined
          type="number"
          :label="t('mapStudio.radius')"
          class="studio-division"
        />
        <QInput
          v-if="store.tool === 'rectangle'"
          v-model.number="store.toolSettings.cornerRadius"
          dense
          outlined
          type="number"
          :label="t('mapStudio.cornerRadius')"
          class="studio-division"
        />
        <template v-if="store.tool === 'circle'">
          <QSlider
            :model-value="store.toolSettings.sides"
            :min="1"
            :max="12"
            :step="1"
            dense
            class="studio-sides-slider"
            @update:model-value="setCircleSides"
          />
          <QInput
            :model-value="store.toolSettings.sides"
            dense
            outlined
            type="number"
            min="1"
            max="12"
            :label="t('mapStudio.sides')"
            class="studio-sides-input"
            @update:model-value="setCircleSides"
          />
          <QSelect
            v-model="store.toolSettings.drawTo"
            dense
            outlined
            emit-value
            map-options
            :options="drawToOptions"
            :label="t('mapStudio.drawTo')"
            class="studio-division"
          />
        </template>
      </div>

      <div class="studio-body">
        <CanvasHost
          ref="canvasHost"
          :map="map"
          :tool="store.tool"
          :settings="store.toolSettings"
          :selected-object-id="store.selectedObjectId"
          :selected-object-ids="store.selectedObjectIds"
          :selected-shape="store.selectedShape"
          @rectangle="addRectangle"
          @circle="store.addCircle"
          @polygon="store.addPolygon"
          @path="store.addPath"
          @wall="store.addWall"
          @text="addText"
          @door="([a, b]) => store.addDoor(a, b)"
          @stairs="store.addStairs"
          @select="store.selectObject"
          @selectMany="store.selectObjects"
          @toggleSelect="store.toggleObjectSelection"
          @groupSelection="store.toggleGroupSelection"
          @selectRegion="onSelectRegion"
          @copyGeometry="copyGeometry"
          @cutGeometry="cutGeometry"
          @deleteGeometry="deleteGeometry"
          @contextMenu="showContextMenu"
          @pointerdown="contextMenu = null"
          @selectShape="store.selectShape"
          @beginObjectDrag="store.beginObjectDrag"
          @moveObjectLive="store.moveSelectedObjectLive($event.dx, $event.dy)"
          @endObjectDrag="store.endObjectDrag"
          @editText="editText"
          @image="addImage"
          @resizeObject="resizeSelected"
          @rotateObject="rotateSelected"
          @rotateSelection="rotateSelection"
          @ready="onRendererReady"
        />
        <input
          v-if="editingTextId"
          ref="textEditorInput"
          v-model="textDraft"
          class="studio-text-editor"
          :style="textEditorStyle"
          @keydown.enter.prevent="commitTextEdit"
          @keydown.esc.prevent="cancelTextEdit"
          @blur="commitTextEdit"
        />
        <div
          v-if="contextMenu"
          class="studio-context-menu"
          :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
          @pointerdown.stop
        >
          <button type="button" @click="contextAction('duplicate')">
            <QIcon name="tabler-copy" size="16px" />
            <span>{{ t('mapStudio.duplicate') }}</span>
          </button>
          <button type="button" @click="contextAction('front')">
            <QIcon name="tabler-arrow-up" size="16px" />
            <span>{{ t('mapStudio.bringToFront') }}</span>
          </button>
          <button type="button" @click="contextAction('back')">
            <QIcon name="tabler-arrow-down" size="16px" />
            <span>{{ t('mapStudio.sendToBack') }}</span>
          </button>
          <button type="button" @click="contextAction('flip-x')">
            <QIcon name="tabler-flip-horizontal" size="16px" />
            <span>{{ t('mapStudio.flipHorizontal') }}</span>
          </button>
          <button type="button" @click="contextAction('flip-y')">
            <QIcon name="tabler-flip-vertical" size="16px" />
            <span>{{ t('mapStudio.flipVertical') }}</span>
          </button>
          <button type="button" @click="contextAction('delete')">
            <QIcon name="tabler-trash" size="16px" />
            <span>{{ t('common.delete') }}</span>
          </button>
        </div>

        <StudioPresetsPanel />

        <StudioLayersPanel />
      </div>
    </template>

    <input
      ref="imageInput"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="onImageSelected"
    />

    <QDialog v-model="applyOpen" persistent>
      <QCard class="q-pa-md" style="min-width: 360px">
        <div class="text-subtitle1 q-mb-md">
          {{ t('mapStudio.applyToLocation') }}
        </div>
        <QSelect
          v-model="targetLocationId"
          outlined
          dense
          emit-value
          map-options
          :options="locationOptions"
          :label="t('mapStudio.location')"
        />
        <div class="row justify-end q-gutter-sm q-mt-md">
          <QBtn
            flat
            no-caps
            :label="t('common.cancel')"
            @click="applyOpen = false"
          />
          <QBtn
            color="primary"
            no-caps
            :loading="applying"
            :disable="!targetLocationId"
            :label="t('mapStudio.apply')"
            @click="applyToLocation"
          />
        </div>
      </QCard>
    </QDialog>
  </div>
</template>

<style scoped>
.map-studio-view {
  position: fixed;
  inset: 0;
  z-index: 2500;
  display: flex;
  flex-direction: column;
  color: var(--color-text);
  background: var(--color-background);
}
.studio-body {
  position: relative;
  flex: 1;
  overflow: hidden;
}
.studio-loading {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
}
.studio-toolbar {
  position: absolute;
  bottom: 16px;
  left: 50%;
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  justify-content: center;
  max-width: calc(100% - 24px);
  padding: 6px 10px;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgb(0 0 0 / 18%);
  transform: translateX(-50%);
}
.studio-tool--active {
  color: var(--q-primary);
  background: var(--color-selected-surface);
}
.studio-division {
  width: 96px;
}
.studio-sides-slider {
  width: 90px;
}
.studio-sides-input {
  width: 76px;
}
.studio-text-font {
  width: 150px;
}
.studio-context-menu {
  position: absolute;
  z-index: 8;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  padding: 4px;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 20%);
}
.studio-context-menu button {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: 4px;
}
.studio-context-menu button:hover {
  background: var(--color-selected-surface);
}
.studio-text-editor {
  position: absolute;
  z-index: 5;
  padding: 1px 3px;
  outline: 2px solid var(--q-primary);
  background: color-mix(in srgb, var(--color-background) 85%, transparent);
  border: 0;
  border-radius: 2px;
}
.hidden-input {
  display: none;
}
</style>

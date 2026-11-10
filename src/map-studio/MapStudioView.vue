<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Notify } from 'quasar';
import CanvasHost from '@/map-studio/components/CanvasHost.vue';
import StudioHeader from '@/map-studio/components/StudioHeader.vue';
import StudioPresetsPanel from '@/map-studio/components/StudioPresetsPanel.vue';
import StudioLayersPanel from '@/map-studio/components/StudioLayersPanel.vue';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import { prompt } from '@/dialogs';
import { useMapStudioAutosave } from '@/map-studio/composables/useMapStudioAutosave';
import { useStudioHotkeys } from '@/map-studio/composables/useStudioHotkeys';
import {
  applyStudioImageToLocation,
  listStudioLocationOptions,
} from '@/map-studio/integration/location';
import type { PixiStudioRenderer } from '@/map-studio/renderer/PixiStudioRenderer';

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
useMapStudioAutosave(store);
useStudioHotkeys({
  save: () => void store.save(),
  undo: () => store.undo(),
  redo: () => store.redo(),
  setTool: (tool) => store.setTool(tool),
  deleteSelection: () => store.removeSelectedObject(),
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
]);
const divisions = [1, 2, 3, 4, 6, 8, 9].map((value) => ({
  label: `1/${value}`,
  value,
}));
const roughnessOptions = [0, 1, 2, 3].map((value) => ({
  label: String(value),
  value,
}));

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

async function editText(id: string): Promise<void> {
  const object = store.imagesLayer?.objects.find((entry) => entry.id === id);
  if (!object || object.type !== 'text') return;
  const text = await prompt(t('mapStudio.textPrompt'), {
    modelValue: object.text,
  });
  if (text !== null) store.updateObject(id, { text });
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

async function addText(point: [number, number]): Promise<void> {
  const text = await prompt(t('mapStudio.textPrompt'), { modelValue: '' });
  if (text) store.addText(text, point);
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
        <QSelect
          v-model="store.toolSettings.rough"
          dense
          outlined
          emit-value
          map-options
          :options="roughnessOptions"
          :label="t('mapStudio.rough')"
          class="studio-division"
        />
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
      </div>

      <div class="studio-body">
        <CanvasHost
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
  gap: 4px;
  align-items: center;
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
.hidden-input {
  display: none;
}
</style>

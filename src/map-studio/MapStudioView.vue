<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Notify } from 'quasar';
import { DUNGEON_PRESETS } from '@/map-studio/domain/presets';
import CanvasHost from '@/map-studio/components/CanvasHost.vue';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import { confirm, prompt } from '@/dialogs';
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
const renderer = ref<PixiStudioRenderer | null>(null);
const creating = ref(false);
const hasMaps = __FEATURE_MAPS__;
const applyOpen = ref(false);
const applying = ref(false);
const locationOptions = ref<Array<{ id: string; name: string }>>([]);
const targetLocationId = ref<string | null>(null);
useMapStudioAutosave(store);
useStudioHotkeys({
  save: () => void store.save(),
  undo: () => store.undo(),
  redo: () => store.redo(),
  setTool: (tool) => store.setTool(tool),
  deleteSelection: () => store.removeSelectedObject(),
});

const map = computed(() => store.map);
const layers = computed(() => map.value?.layers ?? []);
const activeLayer = computed(() => store.activeLayer);
const selectedObject = computed(() => store.selectedObject);
const presets = DUNGEON_PRESETS;
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

async function renameLayer(): Promise<void> {
  if (!activeLayer.value) return;
  const name = await prompt(t('mapStudio.layerName'), {
    modelValue: activeLayer.value.name,
  });
  if (name) store.renameLayer(activeLayer.value.id, name);
}

async function deleteLayer(): Promise<void> {
  if (!activeLayer.value) return;
  if (
    !(await confirm(
      t('common.confirmDelete', { title: activeLayer.value.name }),
    ))
  )
    return;
  store.removeLayer(activeLayer.value.id);
}

function setFloorColor(event: Event): void {
  if (!activeLayer.value) return;
  const color = (event.target as HTMLInputElement).value;
  store.setLayerStyle(activeLayer.value.id, {
    ...activeLayer.value.style,
    floor: { ...activeLayer.value.style.floor, color },
  });
}

function setWallColor(event: Event): void {
  if (!activeLayer.value) return;
  const color = (event.target as HTMLInputElement).value;
  store.setLayerStyle(activeLayer.value.id, {
    ...activeLayer.value.style,
    walls: { ...activeLayer.value.style.walls, color },
  });
}

function setWallWidth(event: Event): void {
  if (!activeLayer.value) return;
  const width = Math.max(
    0.01,
    Number((event.target as HTMLInputElement).value),
  );
  store.setLayerStyle(activeLayer.value.id, {
    ...activeLayer.value.style,
    walls: { ...activeLayer.value.style.walls, width },
  });
}

function toggleLayerGrid(): void {
  if (!activeLayer.value) return;
  store.setLayerStyle(activeLayer.value.id, {
    ...activeLayer.value.style,
    grid: {
      ...activeLayer.value.style.grid,
      visible: !activeLayer.value.style.grid.visible,
    },
  });
}

function updateSelected(patch: Record<string, unknown>): void {
  if (selectedObject.value) store.updateObject(selectedObject.value.id, patch);
}

function updateSelectedTransform(key: string, value: number): void {
  const object = selectedObject.value;
  if (!object || object.type === 'door' || object.type === 'stairs') return;
  store.updateObject(object.id, {
    transform: { ...object.transform, [key]: value },
  });
}

async function editText(id: string): Promise<void> {
  const object = store.imagesLayer?.objects.find((entry) => entry.id === id);
  if (!object || object.type !== 'text') return;
  const text = await prompt(t('mapStudio.textPrompt'), {
    modelValue: object.text,
  });
  if (text !== null) store.updateObject(id, { text });
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
    <header class="studio-header">
      <div class="row items-center q-gutter-sm">
        <QBtn
          flat
          dense
          round
          icon="tabler-arrow-left"
          :aria-label="t('mapStudio.backToLibrary')"
          @click="router.push('/map-studio')"
        />
        <span class="text-subtitle1 text-weight-medium">
          {{ map?.name ?? t('mapStudio.title') }}
        </span>
        <QBadge
          v-if="store.autosave === 'saving'"
          color="grey-7"
          :label="t('mapStudio.saving')"
        />
        <QBadge
          v-else-if="store.dirty"
          color="orange-7"
          :label="t('mapStudio.unsaved')"
        />
        <QBadge
          v-else-if="store.autosave === 'saved'"
          color="green-7"
          :label="t('mapStudio.saved')"
        />
      </div>
      <div class="row items-center q-gutter-xs">
        <QBtn
          flat
          dense
          round
          icon="tabler-undo"
          :disable="!store.canUndo"
          :aria-label="t('mapStudio.undo')"
          @click="store.undo()"
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-redo"
          :disable="!store.canRedo"
          :aria-label="t('mapStudio.redo')"
          @click="store.redo()"
        />
        <QBtn
          flat
          no-caps
          icon="tabler-device-floppy"
          :label="t('mapStudio.save')"
          @click="store.save()"
        />
        <QBtn
          v-if="hasMaps"
          flat
          no-caps
          icon="tabler-map-pin"
          :label="t('mapStudio.applyToLocation')"
          @click="openApplyDialog"
        />
        <QBtn
          color="primary"
          no-caps
          icon="tabler-download"
          :label="t('mapStudio.export')"
          @click="exportMap('png')"
        >
          <QMenu>
            <QList>
              <QItem clickable @click="exportMap('png')"
                ><QItemSection>PNG</QItemSection></QItem
              >
              <QItem clickable @click="exportMap('webp')"
                ><QItemSection>WebP</QItemSection></QItem
              >
              <QItem clickable @click="exportMap('jpg')"
                ><QItemSection>JPG</QItemSection></QItem
              >
              <QItem clickable @click="exportPdf"
                ><QItemSection>PDF</QItemSection></QItem
              >
            </QList>
          </QMenu>
        </QBtn>
      </div>
    </header>

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
          @rectangle="addRectangle"
          @circle="store.addCircle"
          @polygon="store.addPolygon"
          @path="store.addPath"
          @wall="store.addWall"
          @text="addText"
          @door="([a, b]) => store.addDoor(a, b)"
          @stairs="store.addStairs"
          @select="store.selectObject"
          @moveObject="store.moveSelectedObject($event.dx, $event.dy)"
          @editText="editText"
          @ready="renderer = $event"
        />

        <aside class="studio-presets">
          <div class="studio-layers-title">
            {{ t('mapStudio.presets.title') }}
          </div>
          <div
            v-for="preset in presets"
            :key="preset.id"
            class="studio-preset-row"
          >
            <span
              class="studio-preset-swatch"
              :style="{
                background: preset.style.floor.color,
                borderColor: preset.style.walls.color,
              }"
            />
            <span class="studio-layer-name">{{ t(preset.nameKey) }}</span>
            <QBtn
              flat
              dense
              round
              icon="tabler-check"
              :disable="!activeLayer"
              :title="t('mapStudio.presets.apply')"
              @click="
                activeLayer && store.applyPreset(activeLayer.id, preset.id)
              "
            />
            <QBtn
              flat
              dense
              round
              icon="tabler-plus"
              :title="t('mapStudio.addLayer')"
              @click="store.addDungeonLayer(preset.id)"
            />
          </div>
        </aside>

        <aside class="studio-layers">
          <div class="studio-layers-title row items-center justify-between">
            <span>{{ t('mapStudio.layers') }}</span>
            <span class="row q-gutter-xs">
              <QBtn
                flat
                dense
                round
                icon="tabler-plus"
                :title="t('mapStudio.addLayer')"
                @click="store.addDungeonLayer('classic-hatching')"
              />
              <QBtn
                flat
                dense
                round
                icon="tabler-arrow-up"
                :title="t('mapStudio.moveUp')"
                @click="
                  store.activeLayerId &&
                  store.moveLayer(store.activeLayerId, -1)
                "
              />
              <QBtn
                flat
                dense
                round
                icon="tabler-arrow-down"
                :title="t('mapStudio.moveDown')"
                @click="
                  store.activeLayerId && store.moveLayer(store.activeLayerId, 1)
                "
              />
            </span>
          </div>
          <div
            v-for="layer in layers"
            :key="layer.id"
            class="studio-layer-row"
            :class="{
              'studio-layer-row--active':
                store.activeLayerId === layer.id && layer.type === 'dungeon',
            }"
            @click="layer.type === 'dungeon' && store.setActiveLayer(layer.id)"
          >
            <QIcon
              :name="
                layer.type === 'background'
                  ? 'tabler-photo'
                  : layer.type === 'images'
                    ? 'tabler-photo-plus'
                    : 'tabler-square'
              "
              size="18px"
            />
            <span class="studio-layer-name">{{ layer.name }}</span>
            <QBtn
              flat
              dense
              round
              :icon="layer.visible ? 'tabler-eye' : 'tabler-eye-off'"
              :aria-label="t('mapStudio.toggleVisibility')"
              @click.stop="store.toggleLayerVisibility(layer.id)"
            />
            <QBtn
              flat
              dense
              round
              :icon="layer.locked ? 'tabler-lock' : 'tabler-lock-open'"
              :aria-label="t('mapStudio.toggleLock')"
              @click.stop="store.toggleLayerLock(layer.id)"
            />
          </div>

          <template v-if="selectedObject">
            <QSeparator class="q-my-sm" />
            <div class="row items-center justify-between q-mb-xs">
              <span class="text-caption text-weight-medium">{{
                t('mapStudio.objectSettings')
              }}</span>
              <span class="row q-gutter-xs">
                <QBtn
                  flat
                  dense
                  round
                  icon="tabler-copy"
                  :title="t('mapStudio.duplicate')"
                  @click="store.duplicateObject(selectedObject.id)"
                />
                <QBtn
                  flat
                  dense
                  round
                  icon="tabler-arrow-up"
                  :title="t('mapStudio.bringForward')"
                  @click="store.reorderObject(selectedObject.id, 1)"
                />
                <QBtn
                  flat
                  dense
                  round
                  icon="tabler-arrow-down"
                  :title="t('mapStudio.sendBackward')"
                  @click="store.reorderObject(selectedObject.id, -1)"
                />
                <QBtn
                  flat
                  dense
                  round
                  icon="tabler-trash"
                  :title="t('common.delete')"
                  @click="store.removeSelectedObject()"
                />
              </span>
            </div>
            <label v-if="selectedObject.type === 'text'" class="studio-field">
              <span>{{ t('mapStudio.text') }}</span>
              <input
                class="studio-text-input"
                :value="selectedObject.text"
                @change="
                  updateSelected({
                    text: ($event.target as HTMLInputElement).value,
                  })
                "
              />
            </label>
            <label v-if="selectedObject.type === 'text'" class="studio-field">
              <span>X / Y</span>
              <input
                class="studio-number"
                type="number"
                step="0.1"
                :value="selectedObject.transform.x"
                @input="
                  updateSelectedTransform(
                    'x',
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
              />
              <input
                class="studio-number"
                type="number"
                step="0.1"
                :value="selectedObject.transform.y"
                @input="
                  updateSelectedTransform(
                    'y',
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
              />
            </label>
            <label v-if="selectedObject.type === 'text'" class="studio-field">
              <span>{{ t('mapStudio.fontSize') }}</span>
              <input
                class="studio-number"
                type="number"
                min="0.05"
                step="0.01"
                :value="selectedObject.fontSize"
                @input="
                  updateSelected({
                    fontSize: Number(($event.target as HTMLInputElement).value),
                  })
                "
              />
              <input
                type="color"
                :value="selectedObject.color"
                @input="
                  updateSelected({
                    color: ($event.target as HTMLInputElement).value,
                  })
                "
              />
            </label>
            <label v-if="selectedObject.type === 'door'" class="studio-field">
              <span>{{ t('mapStudio.variant') }}</span>
              <select
                :value="selectedObject.variant"
                @change="
                  updateSelected({
                    variant: Number(($event.target as HTMLSelectElement).value),
                  })
                "
              >
                <option :value="0">1</option>
                <option :value="1">2</option>
              </select>
            </label>
            <label v-if="selectedObject.type === 'stairs'" class="studio-field">
              <span>{{ t('mapStudio.steps') }}</span>
              <input
                class="studio-number"
                type="number"
                min="1"
                step="1"
                :value="selectedObject.stepsPerCell"
                @input="
                  updateSelected({
                    stepsPerCell: Number(
                      ($event.target as HTMLInputElement).value,
                    ),
                  })
                "
              />
            </label>
            <label class="studio-field">
              <span>{{ t('mapStudio.opacity') }}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                :value="selectedObject.opacity"
                @input="
                  updateSelected({
                    opacity: Number(($event.target as HTMLInputElement).value),
                  })
                "
              />
            </label>
            <label v-if="selectedObject.type === 'text'" class="studio-field">
              <span>{{ t('mapStudio.rotation') }}</span>
              <input
                class="studio-number"
                type="number"
                step="0.1"
                :value="selectedObject.transform.rotation"
                @input="
                  updateSelectedTransform(
                    'rotation',
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
              />
            </label>
          </template>

          <template v-else-if="activeLayer">
            <QSeparator class="q-my-sm" />
            <div class="row items-center justify-between q-mb-xs">
              <span class="text-caption text-weight-medium">{{
                t('mapStudio.layerSettings')
              }}</span>
              <span class="row q-gutter-xs">
                <QBtn
                  flat
                  dense
                  round
                  icon="tabler-pencil"
                  :title="t('mapStudio.rename')"
                  @click="renameLayer"
                />
                <QBtn
                  flat
                  dense
                  round
                  icon="tabler-trash"
                  :title="t('mapStudio.deleteLayer')"
                  @click="deleteLayer"
                />
              </span>
            </div>
            <label class="studio-field">
              <span>{{ t('mapStudio.opacity') }}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                :value="activeLayer.opacity"
                @input="
                  store.setLayerOpacity(
                    activeLayer.id,
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
              />
            </label>
            <label class="studio-field">
              <span>{{ t('mapStudio.floor') }}</span>
              <input
                type="color"
                :value="activeLayer.style.floor.color"
                @input="setFloorColor"
              />
            </label>
            <label class="studio-field">
              <span>{{ t('mapStudio.walls') }}</span>
              <input
                type="color"
                :value="activeLayer.style.walls.color"
                @input="setWallColor"
              />
              <input
                class="studio-number"
                type="number"
                min="0.01"
                step="0.01"
                :value="activeLayer.style.walls.width"
                @input="setWallWidth"
              />
            </label>
            <label class="studio-field studio-field--check">
              <input
                type="checkbox"
                :checked="activeLayer.style.grid.visible"
                @change="toggleLayerGrid"
              />
              <span>{{ t('mapStudio.showLayerGrid') }}</span>
            </label>
          </template>
        </aside>
      </div>
    </template>

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
.studio-header {
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 12px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border-light);
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
.studio-layers {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  width: 240px;
  max-height: calc(100% - 90px);
  padding: 8px;
  overflow: auto;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgb(0 0 0 / 12%);
}
.studio-layers-title {
  padding: 4px 6px 8px;
  font-weight: 600;
}
.studio-layer-row {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: pointer;
}
.studio-layer-row--active {
  background: var(--color-selected-surface);
}
.studio-layer-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.studio-presets {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  width: 214px;
  padding: 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgb(0 0 0 / 12%);
}
.studio-preset-row {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 2px 4px;
  border-radius: 6px;
}
.studio-preset-swatch {
  width: 20px;
  height: 20px;
  border: 2px solid;
  border-radius: 4px;
}
.studio-field {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  font-size: 12px;
}
.studio-field input[type='color'] {
  width: 28px;
  height: 24px;
  padding: 0;
  border: 0;
}
.studio-field input[type='range'] {
  width: 96px;
}
.studio-field--check {
  justify-content: flex-start;
}
.studio-number {
  width: 52px;
}
.studio-text-input {
  width: 120px;
}
</style>

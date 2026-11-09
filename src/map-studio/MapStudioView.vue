<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import CanvasHost from '@/map-studio/components/CanvasHost.vue';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import { useMapStudioAutosave } from '@/map-studio/composables/useMapStudioAutosave';
import type { PixiStudioRenderer } from '@/map-studio/renderer/PixiStudioRenderer';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useMapStudioStore();
const renderer = ref<PixiStudioRenderer | null>(null);
const creating = ref(false);
useMapStudioAutosave(store);

const map = computed(() => store.map);
const layers = computed(() => map.value?.layers ?? []);
const toolbar = computed(() => [
  { id: 'pan' as const, icon: 'tabler-hand-stop', label: t('mapStudio.pan') },
  {
    id: 'rectangle' as const,
    icon: 'tabler-square',
    label: t('mapStudio.rectangle'),
  },
]);
const divisions = [1, 2, 3, 4, 6, 8, 9].map((value) => ({
  label: `1/${value}`,
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

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportMap(): Promise<void> {
  if (!renderer.value || !map.value) return;
  const blob = await renderer.value.exportImage(70);
  download(blob, `${map.value.name || 'map'}.png`);
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
          color="primary"
          no-caps
          icon="tabler-download"
          :label="t('mapStudio.export')"
          @click="exportMap"
        />
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
      </div>

      <div class="studio-body">
        <CanvasHost
          :map="map"
          :tool="store.tool"
          :settings="store.toolSettings"
          @rectangle="addRectangle"
          @ready="renderer = $event"
        />

        <aside class="studio-layers">
          <div class="studio-layers-title">{{ t('mapStudio.layers') }}</div>
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
        </aside>
      </div>
    </template>
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
</style>

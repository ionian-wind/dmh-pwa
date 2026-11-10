<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { confirm, prompt } from '@/dialogs';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';

const { t } = useI18n();
const store = useMapStudioStore();
const activeLayer = computed(() => store.activeLayer);
const folders = computed(() =>
  (store.map?.layers ?? []).filter((layer) => layer.type === 'folder'),
);

async function renameLayer(): Promise<void> {
  const layer = activeLayer.value;
  if (!layer) return;
  const name = await prompt(t('mapStudio.layerName'), {
    modelValue: layer.name,
  });
  if (name) store.renameLayer(layer.id, name);
}

async function deleteLayer(): Promise<void> {
  const layer = activeLayer.value;
  if (!layer) return;
  if (!(await confirm(t('common.confirmDelete', { title: layer.name })))) {
    return;
  }
  store.removeLayer(layer.id);
}

function setFloorColor(event: Event): void {
  const layer = activeLayer.value;
  if (!layer) return;
  const color = (event.target as HTMLInputElement).value;
  store.setLayerStyle(layer.id, {
    ...layer.style,
    floor: { ...layer.style.floor, color },
  });
}

function setWallColor(event: Event): void {
  const layer = activeLayer.value;
  if (!layer) return;
  const color = (event.target as HTMLInputElement).value;
  store.setLayerStyle(layer.id, {
    ...layer.style,
    walls: { ...layer.style.walls, color },
  });
}

function setWallWidth(event: Event): void {
  const layer = activeLayer.value;
  if (!layer) return;
  const width = Math.max(
    0.01,
    Number((event.target as HTMLInputElement).value),
  );
  store.setLayerStyle(layer.id, {
    ...layer.style,
    walls: { ...layer.style.walls, width },
  });
}

function toggleLayerGrid(): void {
  const layer = activeLayer.value;
  if (!layer) return;
  store.setLayerStyle(layer.id, {
    ...layer.style,
    grid: { ...layer.style.grid, visible: !layer.style.grid.visible },
  });
}

function setParent(event: Event): void {
  const layer = activeLayer.value;
  if (!layer) return;
  store.setLayerParent(
    layer.id,
    (event.target as HTMLSelectElement).value || null,
  );
}
</script>

<template>
  <template v-if="activeLayer">
    <label v-if="folders.length" class="studio-field">
      <span>{{ t('mapStudio.folder') }}</span>
      <select :value="activeLayer.parentId ?? ''" @change="setParent">
        <option value="">{{ t('mapStudio.noFolder') }}</option>
        <option v-for="folder in folders" :key="folder.id" :value="folder.id">
          {{ folder.name }}
        </option>
      </select>
    </label>

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
</template>

<style scoped>
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

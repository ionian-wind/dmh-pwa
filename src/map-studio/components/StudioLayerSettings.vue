<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { confirm, prompt } from '@/dialogs';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import type { StudioLayer } from '@/map-studio/domain/document/types';

const { t } = useI18n();
const store = useMapStudioStore();
const layer = computed<StudioLayer | null>(() => store.settingsLayer);
const folders = computed<StudioLayer[]>(() =>
  (store.map?.layers ?? []).filter(
    (entry: StudioLayer) => entry.type === 'folder',
  ),
);

const canDelete = computed(
  () => layer.value?.type === 'dungeon' || layer.value?.type === 'folder',
);

async function renameLayer(): Promise<void> {
  const current = layer.value;
  if (!current) return;
  const name = await prompt(t('mapStudio.layerName'), {
    modelValue: current.name,
  });
  if (name) store.renameLayer(current.id, name);
}

async function deleteLayer(): Promise<void> {
  const current = layer.value;
  if (!current || !canDelete.value) return;
  if (!(await confirm(t('common.confirmDelete', { title: current.name })))) {
    return;
  }
  store.removeLayer(current.id);
}

function setFloorColor(event: Event): void {
  const current = layer.value;
  if (current?.type !== 'dungeon') return;
  const color = (event.target as HTMLInputElement).value;
  store.setLayerStyle(current.id, {
    ...current.style,
    floor: { ...current.style.floor, color },
  });
}

function setWallColor(event: Event): void {
  const current = layer.value;
  if (current?.type !== 'dungeon') return;
  const color = (event.target as HTMLInputElement).value;
  store.setLayerStyle(current.id, {
    ...current.style,
    walls: { ...current.style.walls, color },
  });
}

function setWallWidth(event: Event): void {
  const current = layer.value;
  if (current?.type !== 'dungeon') return;
  const width = Math.max(
    0.01,
    Number((event.target as HTMLInputElement).value),
  );
  store.setLayerStyle(current.id, {
    ...current.style,
    walls: { ...current.style.walls, width },
  });
}

function setWallGridColor(event: Event): void {
  const current = layer.value;
  if (current?.type !== 'dungeon') return;
  const color = (event.target as HTMLInputElement).value;
  store.setLayerStyle(current.id, {
    ...current.style,
    grid: { ...current.style.grid, color },
  });
}

function setWallGridWidth(event: Event): void {
  const current = layer.value;
  if (current?.type !== 'dungeon') return;
  const width = Math.max(0.5, Number((event.target as HTMLInputElement).value));
  store.setLayerStyle(current.id, {
    ...current.style,
    grid: { ...current.style.grid, width },
  });
}

function toggleLayerGrid(): void {
  const current = layer.value;
  if (current?.type !== 'dungeon') return;
  store.setLayerStyle(current.id, {
    ...current.style,
    grid: { ...current.style.grid, visible: !current.style.grid.visible },
  });
}

function toggleBlocksLight(): void {
  const current = layer.value;
  if (current?.type !== 'dungeon') return;
  store.setLayerStyle(current.id, {
    ...current.style,
    walls: {
      ...current.style.walls,
      blocksLight: !current.style.walls.blocksLight,
    },
  });
}

function setParent(event: Event): void {
  const current = layer.value;
  if (!current) return;
  store.setLayerParent(
    current.id,
    (event.target as HTMLSelectElement).value || null,
  );
}
</script>

<template>
  <template v-if="layer">
    <label
      v-if="layer.type === 'dungeon' && folders.length"
      class="studio-field"
    >
      <span>{{ t('mapStudio.folder') }}</span>
      <select :value="layer.parentId ?? ''" @change="setParent">
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
          v-if="canDelete"
          flat
          dense
          round
          icon="tabler-trash"
          :title="t('mapStudio.deleteLayer')"
          @click="deleteLayer"
        />
      </span>
    </div>
    <div class="studio-layer-name-line">{{ layer.name }}</div>

    <label class="studio-field">
      <span>{{ t('mapStudio.opacity') }}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="layer.opacity"
        @input="
          layer.type === 'background'
            ? store.setBackgroundOpacity(
                Number(($event.target as HTMLInputElement).value),
              )
            : store.setLayerOpacity(
                layer.id,
                Number(($event.target as HTMLInputElement).value),
              )
        "
      />
    </label>
    <label class="studio-field">
      <span>{{ t('mapStudio.blendMode') }}</span>
      <select
        :value="layer.blendMode"
        @change="
          store.setLayerBlendMode(
            layer.id,
            ($event.target as HTMLSelectElement)
              .value as typeof layer.blendMode,
          )
        "
      >
        <option value="normal">Normal</option>
        <option value="add">Add</option>
        <option value="multiply">Multiply</option>
        <option value="screen">Screen</option>
      </select>
    </label>

    <template v-if="layer.type === 'dungeon'">
      <label class="studio-field">
        <span>{{ t('mapStudio.floor') }}</span>
        <input
          type="color"
          :value="layer.style.floor.color"
          @input="setFloorColor"
        />
      </label>
      <label class="studio-field">
        <span>{{ t('mapStudio.walls') }}</span>
        <input
          type="color"
          :value="layer.style.walls.color"
          @input="setWallColor"
        />
        <input
          class="studio-number"
          type="number"
          min="0.01"
          step="0.01"
          :value="layer.style.walls.width"
          @input="setWallWidth"
        />
      </label>
      <label class="studio-field studio-field--check">
        <input
          type="checkbox"
          :checked="layer.style.walls.blocksLight"
          @change="toggleBlocksLight"
        />
        <span>{{ t('mapStudio.blocksLight') }}</span>
      </label>
      <label class="studio-field studio-field--check">
        <input
          type="checkbox"
          :checked="layer.style.grid.visible"
          @change="toggleLayerGrid"
        />
        <span>{{ t('mapStudio.showLayerGrid') }}</span>
      </label>
      <label class="studio-field">
        <span>{{ t('mapStudio.gridColour') }}</span>
        <input
          type="color"
          :value="layer.style.grid.color"
          @input="setWallGridColor"
        />
      </label>
      <label class="studio-field">
        <span>{{ t('mapStudio.gridWidth') }}</span>
        <input
          class="studio-number"
          type="number"
          min="0.5"
          step="0.5"
          :value="layer.style.grid.width"
          @input="setWallGridWidth"
        />
      </label>
    </template>

    <template v-if="layer.type === 'background'">
      <label class="studio-field">
        <span>{{ t('mapStudio.colour') }}</span>
        <input
          type="color"
          :value="store.map!.background.style.color"
          @input="
            store.setBackgroundColor(($event.target as HTMLInputElement).value)
          "
        />
      </label>
      <label class="studio-field">
        <span>{{ t('mapStudio.gridColour') }}</span>
        <input
          type="color"
          :value="store.map!.grid.color"
          @input="store.setGridColor(($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="studio-field">
        <span>{{ t('mapStudio.gridWidth') }}</span>
        <input
          class="studio-number"
          type="number"
          min="0.5"
          step="0.5"
          :value="store.map!.grid.width"
          @input="
            store.setGridWidth(
              Number(($event.target as HTMLInputElement).value),
            )
          "
        />
      </label>
    </template>

    <div v-if="layer.type === 'images'" class="studio-layer-summary">
      {{
        t('mapStudio.objectsCount', {
          count: store.imagesLayer?.objects.length ?? 0,
        })
      }}
    </div>
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
.studio-layer-name-line {
  padding: 2px 6px 6px;
  font-size: 11px;
  opacity: 0.7;
}
.studio-layer-summary {
  padding: 6px;
  font-size: 11px;
  opacity: 0.7;
}
</style>

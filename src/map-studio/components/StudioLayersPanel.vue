<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import LayerTree from '@/map-studio/components/LayerTree.vue';
import StudioLayerSettings from '@/map-studio/components/StudioLayerSettings.vue';
import StudioObjectSettings from '@/map-studio/components/StudioObjectSettings.vue';
import { confirm, prompt } from '@/dialogs';
import type { StudioLayer } from '@/map-studio/domain/document/types';

const { t } = useI18n();
const store = useMapStudioStore();
const layers = computed(() => store.map?.layers ?? []);

function onLayerReorder(payload: {
  layers: StudioLayer[];
  expandedFolderId: string | null;
}): void {
  store.setLayerStructure(payload.layers, payload.expandedFolderId);
}

function toggleFolder(id: string): void {
  store.toggleFolder(id);
}

function canDeleteLayer(layer: StudioLayer): boolean {
  return layer.type === 'dungeon' || layer.type === 'folder';
}

async function renameLayer(layer: StudioLayer): Promise<void> {
  const name = await prompt(t('mapStudio.layerName'), {
    modelValue: layer.name,
  });
  if (name) store.renameLayer(layer.id, name);
}

async function deleteLayer(layer: StudioLayer): Promise<void> {
  if (!canDeleteLayer(layer)) return;
  if (!(await confirm(t('common.confirmDelete', { title: layer.name })))) {
    return;
  }
  store.removeLayer(layer.id);
}
</script>

<template>
  <aside class="studio-layers">
    <div class="studio-layers-title row items-center justify-between">
      <span>{{ t('mapStudio.layers') }}</span>
      <span class="row q-gutter-xs">
        <QBtn
          flat
          dense
          round
          icon="tabler-folder-plus"
          :title="t('mapStudio.addFolder')"
          :aria-label="t('mapStudio.addFolder')"
          @click="store.addFolder()"
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-plus"
          :title="t('mapStudio.addLayer')"
          :aria-label="t('mapStudio.addLayer')"
          @click="store.addDungeonLayer('classic-hatching')"
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-arrow-up"
          :title="t('mapStudio.moveUp')"
          @click="
            store.activeLayerId && store.moveLayer(store.activeLayerId, -1)
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

    <div class="studio-layer-list">
      <LayerTree :layers="layers" @reorder="onLayerReorder">
        <template #row="{ layer }">
          <div
            class="studio-layer-row"
            :class="{
              'studio-layer-row--active':
                store.activeLayerId === layer.id && layer.type === 'dungeon',
            }"
            @click="layer.type === 'dungeon' && store.setActiveLayer(layer.id)"
          >
            <QBtn
              v-if="layer.type === 'folder'"
              flat
              dense
              round
              :icon="
                layer.expanded ? 'tabler-chevron-down' : 'tabler-chevron-right'
              "
              :aria-label="t('mapStudio.toggleFolder')"
              @pointerdown.stop
              @click.stop="toggleFolder(layer.id)"
            />
            <QIcon
              :name="
                layer.type === 'background'
                  ? 'tabler-photo'
                  : layer.type === 'images'
                    ? 'tabler-photo-plus'
                    : layer.type === 'folder'
                      ? 'tabler-folder'
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
              @pointerdown.stop
              @click.stop="store.toggleLayerVisibility(layer.id)"
            />
            <QBtn
              flat
              dense
              round
              :icon="layer.locked ? 'tabler-lock' : 'tabler-lock-open'"
              :aria-label="t('mapStudio.toggleLock')"
              @pointerdown.stop
              @click.stop="store.toggleLayerLock(layer.id)"
            />
            <QBtn
              flat
              dense
              round
              icon="tabler-dots"
              :aria-label="t('mapStudio.layerSettings')"
              @pointerdown.stop
              @click.stop
            >
              <QMenu>
                <QList dense>
                  <QItem clickable @click="renameLayer(layer)">
                    <QItemSection side>
                      <QIcon name="tabler-pencil" size="16px" />
                    </QItemSection>
                    <QItemSection>{{ t('mapStudio.rename') }}</QItemSection>
                  </QItem>
                  <QItem
                    v-if="layer.parentId"
                    clickable
                    @click="store.setLayerParent(layer.id, null)"
                  >
                    <QItemSection side>
                      <QIcon name="tabler-corner-up-left" size="16px" />
                    </QItemSection>
                    <QItemSection>{{ t('mapStudio.moveToRoot') }}</QItemSection>
                  </QItem>
                  <QItem
                    v-if="canDeleteLayer(layer)"
                    clickable
                    @click="deleteLayer(layer)"
                  >
                    <QItemSection side>
                      <QIcon name="tabler-trash" size="16px" />
                    </QItemSection>
                    <QItemSection>{{ t('common.delete') }}</QItemSection>
                  </QItem>
                </QList>
              </QMenu>
            </QBtn>
          </div>
        </template>
      </LayerTree>
    </div>

    <div class="studio-layer-settings">
      <StudioObjectSettings v-if="store.selectedObject" />
      <StudioLayerSettings v-else />
    </div>
  </aside>
</template>

<style scoped>
.studio-layers {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  width: 300px;
  max-height: min(72vh, calc(100% - 90px));
  padding: 8px;
  overflow: hidden;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgb(0 0 0 / 12%);
}

.studio-layer-list {
  flex: 1 1 auto;
  min-height: 60px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.studio-layer-settings {
  flex: 0 0 auto;
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

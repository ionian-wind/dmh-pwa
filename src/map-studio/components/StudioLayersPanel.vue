<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import LayerTree from '@/map-studio/components/LayerTree.vue';
import StudioLayerSettings from '@/map-studio/components/StudioLayerSettings.vue';
import StudioObjectSettings from '@/map-studio/components/StudioObjectSettings.vue';
import StudioObjectBatchSettings from '@/map-studio/components/StudioObjectBatchSettings.vue';
import { confirm, prompt } from '@/dialogs';
import type { StudioLayer } from '@/map-studio/domain/document/types';

const { t } = useI18n();
const store = useMapStudioStore();
const layers = computed(() => store.map?.layers ?? []);
const panelRef = useTemplateRef<HTMLElement>('panel');
const panelHeight = ref<number | null>(null);
let resizeStartY = 0;
let resizeStartHeight = 0;
const multiSelected = computed(() => store.selectedLayerIds.length > 1);
const allSelectedLocked = computed(() => {
  const ids = new Set(store.selectedLayerIds);
  const selected = (store.map?.layers ?? []).filter((layer) =>
    ids.has(layer.id),
  );
  return selected.length > 0 && selected.every((layer) => layer.locked);
});

function onLayerClick(layer: StudioLayer, event: MouseEvent): void {
  if (event.shiftKey) {
    store.selectLayerRange(layer.id);
    return;
  }
  if (event.ctrlKey || event.metaKey) {
    store.toggleLayerSelection(layer.id);
    return;
  }
  store.setSettingsLayer(layer.id);
  if (layer.type === 'folder') toggleFolder(layer.id);
}

function startResize(event: PointerEvent): void {
  if (!panelRef.value) return;
  event.preventDefault();
  resizeStartY = event.clientY;
  resizeStartHeight = panelRef.value.clientHeight;
  window.addEventListener('pointermove', onResizeMove);
  window.addEventListener('pointerup', stopResize, { once: true });
}

function onResizeMove(event: PointerEvent): void {
  panelHeight.value = Math.max(
    240,
    Math.min(
      window.innerHeight - 100,
      resizeStartHeight + event.clientY - resizeStartY,
    ),
  );
}

function stopResize(): void {
  window.removeEventListener('pointermove', onResizeMove);
}

async function bulkDelete(): Promise<void> {
  if (!multiSelected.value) return;
  if (
    !(await confirm(
      t('common.confirmDelete', {
        title: `${store.selectedLayerIds.length} layers`,
      }),
    ))
  )
    return;
  store.bulkRemoveLayers();
}

onBeforeUnmount(stopResize);

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
  <aside
    ref="panel"
    class="studio-layers"
    :style="panelHeight ? { height: `${panelHeight}px` } : undefined"
  >
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
            store.settingsLayerId && store.moveLayer(store.settingsLayerId, 1)
          "
        />
        <QBtn
          flat
          dense
          round
          icon="tabler-arrow-down"
          :title="t('mapStudio.moveDown')"
          @click="
            store.settingsLayerId && store.moveLayer(store.settingsLayerId, -1)
          "
        />
      </span>
    </div>

    <div v-if="multiSelected" class="studio-layer-bulk">
      <span class="studio-layer-bulk-label">
        {{
          t('mapStudio.layersSelected', {
            count: store.selectedLayerIds.length,
          })
        }}
      </span>
      <QBtn
        flat
        dense
        round
        icon="tabler-copy"
        :title="t('mapStudio.duplicate')"
        @click="store.bulkDuplicateLayers()"
      />
      <QBtn
        flat
        dense
        round
        icon="tabler-folder-plus"
        :title="t('mapStudio.groupIntoFolder')"
        @click="store.bulkGroupIntoFolder()"
      />
      <QBtn
        flat
        dense
        round
        :icon="allSelectedLocked ? 'tabler-lock' : 'tabler-lock-open'"
        :title="t('mapStudio.toggleLock')"
        @click="store.bulkToggleLayerLock()"
      />
      <QBtn
        flat
        dense
        round
        icon="tabler-trash"
        :title="t('common.delete')"
        @click="bulkDelete"
      />
    </div>

    <div class="studio-layer-list">
      <LayerTree :layers="layers" @reorder="onLayerReorder">
        <template #row="{ layer }">
          <div
            class="studio-layer-row"
            :class="{
              'studio-layer-row--selected': store.selectedLayerIds.includes(
                layer.id,
              ),
              'studio-layer-row--active': store.settingsLayerId === layer.id,
            }"
            @click="onLayerClick(layer, $event)"
          >
            <QIcon
              :name="
                layer.type === 'background'
                  ? 'tabler-photo'
                  : layer.type === 'images'
                    ? 'tabler-photo-plus'
                    : layer.type === 'folder'
                      ? layer.expanded
                        ? 'tabler-folder-open'
                        : 'tabler-folder'
                      : 'tabler-square'
              "
              size="18px"
            />
            <span
              class="studio-layer-name"
              @dblclick.stop="renameLayer(layer)"
              >{{ layer.name }}</span
            >
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
                  <QItem clickable @click="store.duplicateLayer(layer.id)">
                    <QItemSection side>
                      <QIcon name="tabler-copy" size="16px" />
                    </QItemSection>
                    <QItemSection>{{ t('mapStudio.duplicate') }}</QItemSection>
                  </QItem>
                  <QItem
                    clickable
                    @click="store.reorderLayerToEdge(layer.id, 'front')"
                  >
                    <QItemSection side>
                      <QIcon name="tabler-arrow-up" size="16px" />
                    </QItemSection>
                    <QItemSection>{{
                      t('mapStudio.bringToFront')
                    }}</QItemSection>
                  </QItem>
                  <QItem
                    clickable
                    @click="store.reorderLayerToEdge(layer.id, 'back')"
                  >
                    <QItemSection side>
                      <QIcon name="tabler-arrow-down" size="16px" />
                    </QItemSection>
                    <QItemSection>{{ t('mapStudio.sendToBack') }}</QItemSection>
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
      <StudioObjectBatchSettings v-if="store.selectedObjectIds.length > 1" />
      <StudioObjectSettings v-else-if="store.selectedObject" />
      <StudioLayerSettings v-else />
    </div>
    <div class="studio-layers-resize" @pointerdown="startResize" />
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

.studio-layer-row--selected {
  background: color-mix(in srgb, var(--q-primary) 12%, transparent);
}
.studio-layer-row--active {
  background: var(--color-selected-surface);
}
.studio-layer-bulk {
  display: flex;
  gap: 2px;
  align-items: center;
  padding: 2px 4px 6px;
  border-top: 1px solid var(--color-border-light);
}
.studio-layer-bulk-label {
  flex: 1;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.studio-layers-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 6px;
  cursor: ns-resize;
}

.studio-layer-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { prompt } from '@/dialogs';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';
import type { Point } from '@/map-studio/domain/document/types';

const emit = defineEmits<{
  (event: 'paste', polygons: Point[][]): void;
}>();

const { t } = useI18n();
const store = useMapStudioStore();

const canSave = computed(() => store.geometryClipboard.length > 0);

function thumbnailPoints(polygons: Point[][]): string {
  const points = polygons.flat();
  if (!points.length) return '';
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(0.001, Math.max(...xs) - minX);
  const height = Math.max(0.001, Math.max(...ys) - minY);
  const scale = 36 / Math.max(width, height);
  return polygons
    .flatMap((polygon) =>
      polygon.map(
        ([x, y]) => `${(x - minX) * scale + 2},${(y - minY) * scale + 2}`,
      ),
    )
    .join(' ');
}

async function saveClipboard(): Promise<void> {
  if (!canSave.value) return;
  const name = await prompt(t('mapStudio.clipboardName'), {
    modelValue: `Clipboard ${store.geometryClips.length + 1}`,
  });
  if (name !== null) store.saveGeometryClipboard(name);
}

function pasteClip(id: string): void {
  const polygons = store.loadGeometryClipboard(id);
  if (polygons?.length) emit('paste', polygons);
}

function deleteClip(id: string): void {
  store.removeGeometryClip(id);
}
</script>

<template>
  <aside class="studio-clipboard">
    <div class="studio-clipboard-title">
      <span>{{ t('mapStudio.clipboard') }}</span>
      <QBtn
        flat
        dense
        round
        icon="tabler-clipboard-plus"
        :disable="!canSave"
        :title="t('mapStudio.saveClipboard')"
        :aria-label="t('mapStudio.saveClipboard')"
        @click="saveClipboard"
      />
    </div>
    <div v-if="store.geometryClips.length" class="studio-clipboard-list">
      <div
        v-for="clip in store.geometryClips"
        :key="clip.id"
        class="studio-clipboard-row"
        @click="pasteClip(clip.id)"
      >
        <svg class="studio-clipboard-thumb" viewBox="0 0 40 40">
          <polygon
            :points="thumbnailPoints(clip.polygons)"
            fill="currentColor"
            fill-opacity="0.18"
            stroke="currentColor"
            stroke-width="1"
          />
        </svg>
        <span class="studio-clipboard-name">{{ clip.name }}</span>
        <QBtn
          flat
          dense
          round
          icon="tabler-trash"
          :aria-label="t('common.delete')"
          @pointerdown.stop
          @click.stop="deleteClip(clip.id)"
        />
      </div>
    </div>
    <div v-else class="studio-clipboard-empty">
      {{ t('mapStudio.emptyClipboard') }}
    </div>
  </aside>
</template>

<style scoped>
.studio-clipboard {
  position: absolute;
  top: 264px;
  left: 12px;
  z-index: 3;
  width: 214px;
  max-height: 240px;
  padding: 8px;
  overflow-y: auto;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgb(0 0 0 / 12%);
}
.studio-clipboard-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px 8px;
  font-weight: 600;
}
.studio-clipboard-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.studio-clipboard-row {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 4px 6px;
  cursor: pointer;
  border-radius: 6px;
}
.studio-clipboard-row:hover {
  background: var(--color-selected-surface);
}
.studio-clipboard-thumb {
  flex: none;
  width: 32px;
  height: 32px;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: 4px;
}
.studio-clipboard-name {
  flex: 1;
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.studio-clipboard-empty {
  padding: 4px 6px 8px;
  font-size: 11px;
  opacity: 0.65;
}
</style>

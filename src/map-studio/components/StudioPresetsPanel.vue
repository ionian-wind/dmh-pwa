<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { DUNGEON_PRESETS } from '@/map-studio/domain/presets';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';

const { t } = useI18n();
const store = useMapStudioStore();
const activeLayer = computed(() => store.activeLayer);
const presets = DUNGEON_PRESETS;
</script>

<template>
  <aside class="studio-presets">
    <div class="studio-presets-title">
      {{ t('mapStudio.presets.title') }}
    </div>
    <div v-for="preset in presets" :key="preset.id" class="studio-preset-row">
      <span
        class="studio-preset-swatch"
        :style="{
          background: preset.style.floor.color,
          borderColor: preset.style.walls.color,
        }"
      />
      <span class="studio-preset-name">{{ t(preset.nameKey) }}</span>
      <QBtn
        flat
        dense
        round
        icon="tabler-check"
        :disable="!activeLayer"
        :title="t('mapStudio.presets.apply')"
        @click="activeLayer && store.applyPreset(activeLayer.id, preset.id)"
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
</template>

<style scoped>
.studio-presets {
  width: 100%;
  padding: 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgb(0 0 0 / 12%);
}

.studio-presets-title {
  padding: 4px 6px 8px;
  font-weight: 600;
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

.studio-preset-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

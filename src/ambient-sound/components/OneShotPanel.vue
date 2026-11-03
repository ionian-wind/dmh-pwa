<template>
  <div class="one-shot-panel">
    <div class="section-header">
      <span class="text-subtitle1 text-weight-medium">
        {{ $t('ambientSoundPage.oneShots') }}
      </span>
    </div>

    <TabGroup
      v-model="activeTab"
      :tabs="sfxTabs"
      size="sm"
      align="justify"
      class="q-mb-md"
    />

    <div v-if="filteredSfx.length" class="sfx-grid">
      <QBtn
        v-for="sfx in filteredSfx"
        :key="sfx.id"
        class="sfx-button"
        :icon="sfx.icon"
        :label="sfx.name"
        stack
        flat
        @click="playSfx(sfx)"
      />
    </div>

    <div v-else class="no-sfx">
      {{ $t('ambientSoundPage.noSfx') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import TabGroup from '@/components/common/TabGroup.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { OneShotDef } from '@/ambient-sound/types';

const store = useAmbientSoundStore();
const activeTab = ref('all');

const sfxTabs = [
  { id: 'all', label: 'ambientSoundPage.all' },
  { id: 'combat', label: 'ambientSoundPage.combat' },
  { id: 'exploration', label: 'ambientSoundPage.exploration' },
  { id: 'environmental', label: 'ambientSoundPage.environmental' },
  { id: 'weather', label: 'ambientSoundPage.weather' },
];

const filteredSfx = computed(() => {
  if (!store.currentPack?.oneShots) return [];

  if (activeTab.value === 'all') {
    return store.currentPack.oneShots;
  }

  return store.currentPack.oneShots.filter(
    (s) => s.category === activeTab.value,
  );
});

function playSfx(sfx: OneShotDef) {
  store.playOneShot(sfx.id);
}
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sfx-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}

.sfx-button {
  padding: 8px;
  border-radius: 8px;
  background: var(--color-background-soft);
  font-size: 11px;
}

.sfx-button:hover {
  background: var(--color-background-mute);
}

.sfx-button:active {
  transform: scale(0.95);
}

.sfx-button :deep(.QBtn__content) {
  flex-direction: column;
  gap: 4px;
}

.sfx-button :deep(.q-icon) {
  font-size: 20px;
}

.no-sfx {
  text-align: center;
  color: var(--color-text-light);
  padding: 1.5rem;
}
</style>

<template>
  <div class="one-shot-panel">
    <div class="section-header">
      <span class="section-label">{{ $t('ambientSoundPage.oneShots') }}</span>
    </div>

    <QTabs v-model="activeTab" dense class="sfx-tabs" align="left">
      <QTab name="all" :label="$t('ambientSoundPage.all')" />
      <QTab name="combat" :label="$t('ambientSoundPage.combat')" />
      <QTab name="exploration" :label="$t('ambientSoundPage.exploration')" />
      <QTab
        name="environmental"
        :label="$t('ambientSoundPage.environmental')"
      />
      <QTab name="weather" :label="$t('ambientSoundPage.weather')" />
    </QTabs>

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
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { OneShotDef } from '@/ambient-sound/types';

const store = useAmbientSoundStore();
const activeTab = ref('all');

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
.one-shot-panel {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.sfx-tabs {
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
  background: #f5f5f5;
  font-size: 11px;
}

.sfx-button:hover {
  background: #e8e8e8;
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
  color: #999;
  padding: 24px;
}
</style>

<template>
  <div v-if="store.currentPack?.weatherSystems?.length" class="weather-panel">
    <div class="section-label">{{ $t('ambientSoundPage.weather') }}</div>

    <div class="weather-buttons">
      <QBtn
        v-for="weather in store.currentPack.weatherSystems"
        :key="weather.id"
        :class="{ active: store.weatherActive?.id === weather.id }"
        :icon="weather.icon"
        :label="weather.name"
        :outline="store.weatherActive?.id !== weather.id"
        @click="store.toggleWeather(weather)"
      />
      <QBtn
        v-if="store.weatherActive"
        flat
        dense
        icon="close"
        @click="store.toggleWeather(null)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const store = useAmbientSoundStore();
</script>

<style scoped>
.weather-panel {
  margin-bottom: 16px;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
}

.weather-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.weather-buttons .QBtn.active {
  background: var(--q-primary);
  color: white;
}
</style>

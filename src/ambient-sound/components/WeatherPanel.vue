<template>
  <div v-if="store.currentPack?.weatherSystems?.length" class="weather-panel">
    <div class="text-subtitle1 text-weight-medium q-mb-sm">
      {{ $t('ambientSoundPage.weather') }}
    </div>

    <div class="weather-buttons">
      <QBtn
        v-for="weather in store.currentPack.weatherSystems"
        :key="weather.id"
        :color="store.weatherActive?.id === weather.id ? 'primary' : 'grey-7'"
        :icon="weather.icon"
        :label="weather.name"
        :outline="store.weatherActive?.id !== weather.id"
        @click="store.toggleWeather(weather)"
      />
      <QBtn
        v-if="store.weatherActive"
        flat
        dense
        :title="$t('common.close')"
        :aria-label="$t('common.close')"
        @click="store.toggleWeather(null)"
      >
        <IconX :size="18" />
      </QBtn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconX } from '@tabler/icons-vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const store = useAmbientSoundStore();
</script>

<style scoped>
.weather-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

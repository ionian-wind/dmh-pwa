<template>
  <div class="intensity-slider">
    <div class="slider-header">
      <span class="text-subtitle1 text-weight-medium">
        {{ $t('ambientSoundPage.intensity') }}
      </span>
      <span class="intensity-value">{{ store.intensity }}%</span>
    </div>
    <QSlider
      v-model="intensity"
      :min="0"
      :max="100"
      :step="1"
      color="primary"
      @update:model-value="handleIntensityChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const store = useAmbientSoundStore();

const intensity = computed({
  get: () => store.intensity,
  set: (value: number) => store.setIntensity(value),
});

function handleIntensityChange(value: number | null) {
  if (value !== null) store.setIntensity(value);
}
</script>

<style scoped>
.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.intensity-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
}
</style>

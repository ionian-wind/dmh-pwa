<template>
  <div class="ambient-controls">
    <QToolbar class="q-pa-none intensity-bar">
      <div class="intensity-label text-caption text-grey-7">
        {{ t('ambientSoundPage.intensity') }}
      </div>
      <div
        class="intensity-slider"
        @mouseenter="isIntensityHovered = true"
        @mouseleave="isIntensityHovered = false"
      >
        <QSlider
          :model-value="store.intensity / 100"
          :min="0"
          :max="1"
          :step="0.25"
          snap
          :markers="true"
          :color="isIntensityHovered ? 'info' : 'primary'"
          :track-size="isIntensityHovered ? '10px' : '5px'"
          :aria-label="t('ambientSoundPage.intensity')"
          @update:model-value="
            (value: number | null) =>
              value !== null && store.setIntensity(Math.round(value * 100))
          "
        />
      </div>
    </QToolbar>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const { t } = useI18n();
const store = useAmbientSoundStore();
const isIntensityHovered = ref(false);
</script>

<style scoped>
.ambient-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.intensity-bar {
  width: 100%;
  max-width: 420px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.intensity-slider {
  flex: 1 1 auto;
}

.intensity-slider :deep(.q-slider__markers) {
  color: var(--color-text-light);
  opacity: 0.9;
}

.intensity-label {
  min-width: 68px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>

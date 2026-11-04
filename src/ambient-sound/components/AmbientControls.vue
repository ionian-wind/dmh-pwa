<template>
  <QToolbar class="q-pa-none">
    <div
      class="intensity-label text-caption text-uppercase text-grey-7 q-mr-md"
    >
      {{ t('ambientSoundPage.intensity') }}
    </div>
    <div class="col row justify-center">
      <QSlider
        :model-value="store.intensity / 100"
        :min="0"
        :max="1"
        :step="0.25"
        snap
        :markers="true"
        :color="isIntensityHovered ? 'info' : 'primary'"
        :track-size="isIntensityHovered ? '10px' : '5px'"
        :disable="disabled"
        class="intensity-slider"
        :aria-label="t('ambientSoundPage.intensity')"
        @mouseenter="isIntensityHovered = true"
        @mouseleave="isIntensityHovered = false"
        @update:model-value="
          (value: number | null) =>
            value !== null && store.setIntensity(Math.round(value * 100))
        "
      />
    </div>
  </QToolbar>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const { t } = useI18n();
const store = useAmbientSoundStore();
defineProps<{ disabled?: boolean }>();
const isIntensityHovered = ref(false);
</script>

<style scoped>
.intensity-slider {
  max-width: 680px;
}

.intensity-slider :deep(.q-slider__markers) {
  color: var(--color-text-light);
  opacity: 0.9;
}
</style>

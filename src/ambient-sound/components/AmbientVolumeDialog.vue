<template>
  <QDialog
    v-if="modelValue"
    :model-value="modelValue"
    class="ambient-volume-dialog"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <QCard class="volume-dialog-card">
      <QCardSection class="row items-center justify-between q-pb-none">
        <div class="text-h6">
          {{ t('ambientSoundPage.volumeControls') }}
        </div>
        <QBtn
          flat
          dense
          round
          :aria-label="t('common.close')"
          @click="emit('update:modelValue', false)"
        >
          <QIcon name="tabler-x" size="20px" />
        </QBtn>
      </QCardSection>

      <QCardSection class="column q-gutter-md">
        <div
          v-for="row in rows"
          :key="row.key"
          class="volume-row"
          @wheel.prevent="onWheel(row, $event)"
        >
          <div class="row items-center justify-between q-mb-xs">
            <span class="text-body2">{{ row.label }}</span>
            <span class="volume-value">{{ row.value }}%</span>
          </div>
          <QSlider
            :model-value="row.value / 100"
            :min="0"
            :max="1"
            :step="0.01"
            :markers="false"
            color="primary"
            :aria-label="row.label"
            @update:model-value="
              (value: number | null) => value !== null && row.set(value * 100)
            "
          />
        </div>
      </QCardSection>

      <QCardActions align="right">
        <QBtn
          flat
          :label="t('common.close')"
          @click="emit('update:modelValue', false)"
        />
      </QCardActions>
    </QCard>
  </QDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

defineProps<{ modelValue: boolean }>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const { t } = useI18n();
const store = useAmbientSoundStore();

function onWheel(
  row: { value: number; set: (value: number) => void },
  event: WheelEvent,
) {
  if (event.deltaY === 0) return;
  const step = event.deltaY < 0 ? 5 : -5;
  row.set(row.value + step);
}

const rows = computed(() => [
  {
    key: 'master',
    label: t('ambientSoundPage.masterVolume'),
    value: store.masterVolume,
    set: store.setMasterVolume,
  },
  {
    key: 'mood',
    label: t('ambientSoundPage.moodVolume'),
    value: store.moodVolume,
    set: store.setMoodVolume,
  },
  {
    key: 'ambience',
    label: t('ambientSoundPage.ambienceVolume'),
    value: store.ambienceVolume,
    set: store.setAmbienceVolume,
  },
  {
    key: 'oneShot',
    label: t('ambientSoundPage.oneShotVolume'),
    value: store.oneShotVolume,
    set: store.setOneShotVolume,
  },
]);
</script>

<style scoped>
.volume-dialog-card {
  width: min(92vw, 420px);
}

.volume-value {
  font-size: 0.75rem;
  color: var(--color-text-light);
  font-variant-numeric: tabular-nums;
}
</style>

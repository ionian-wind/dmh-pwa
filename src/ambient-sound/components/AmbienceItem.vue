<template>
  <QCard flat bordered :class="{ 'is-active': activeVariationId !== null }">
    <QCardSection class="row items-center q-gutter-sm">
      <AmbientIcon :icon="ambience.icon" :size="24" />
      <div class="col text-subtitle2 text-weight-medium">
        {{ ambience.name }}
      </div>
      <QBtnGroup flat>
        <QBtn
          v-for="(sample, index) in samples"
          :key="`${variationId}:${sample}:${index}`"
          :class="{ 'sample-active': isActiveSample(index) }"
          :outline="!isActiveSample(index)"
          :disable="disabled"
          :label="romanNumeral(index + 1)"
          size="sm"
          @click="emit('select-sample', variationId, index)"
        />
      </QBtnGroup>
    </QCardSection>
  </QCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import { findVariation } from '@/ambient-sound/utils/packData';
import type { LayerDef } from '@/ambient-sound/types';

const props = withDefaults(
  defineProps<{
    ambience: LayerDef;
    variationId: string;
    activeVariationId?: string | null;
    activeSampleIndex?: number | null;
    disabled?: boolean;
  }>(),
  {
    activeVariationId: null,
    activeSampleIndex: null,
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: 'select-sample', variationId: string, sampleIndex: number): void;
}>();

const ROMAN_NUMERALS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
];

const samples = computed(
  () => findVariation(props.ambience, props.variationId)?.samples ?? [],
);

function romanNumeral(value: number): string {
  return ROMAN_NUMERALS[value - 1] ?? String(value);
}

function isActiveSample(index: number): boolean {
  return (
    props.activeVariationId === props.variationId &&
    props.activeSampleIndex === index
  );
}
</script>

<style scoped>
.is-active {
  border-color: var(--color-accent);
  background: var(--color-background-soft);
}

.sample-active {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}
</style>

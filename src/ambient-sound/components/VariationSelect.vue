<template>
  <QSelect
    class="variation-select"
    :model-value="modelValue"
    :options="selectOptions"
    emit-value
    map-options
    dense
    outlined
    :label="t('ambientSoundPage.variation')"
    :aria-label="t('ambientSoundPage.variation')"
    @update:model-value="
      (value) => typeof value === 'string' && emit('update:modelValue', value)
    "
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AmbienceVariationOption } from '@/ambient-sound/utils/packData';

const props = defineProps<{
  modelValue: string;
  options: AmbienceVariationOption[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const { t } = useI18n();

const selectOptions = computed(() =>
  props.options.map(({ id, name }) => ({ label: name, value: id })),
);
</script>

<style scoped>
.variation-select {
  max-width: 340px;
}
</style>

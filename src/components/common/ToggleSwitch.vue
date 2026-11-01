<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
const { t, te } = useI18n();

interface Props {
  modelValue: boolean;
  disabled?: boolean;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  label: '',
});

const displayLabel = computed(() =>
  props.label && te(props.label) ? t(props.label) : props.label,
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();
</script>

<template>
  <QToggle
    :model-value="props.modelValue"
    :disable="props.disabled"
    :label="displayLabel"
    @update:model-value="(val) => emit('update:modelValue', val)"
  />
</template>

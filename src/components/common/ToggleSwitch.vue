<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

interface Props {
  modelValue: boolean;
  disabled?: boolean;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  label: '',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();
</script>

<template>
  <QToggle
    v-model="props.modelValue"
    :disable="props.disabled"
    :label="t(props.label)"
    @update:model-value="(val) => emit('update:modelValue', val)"
  />
</template>

<template>
  <div class="sheet-number-input">
    <QInput
      v-if="!readonly"
      :label="label"
      v-model.number="localValue"
      :placeholder="placeholder"
      type="number"
      :outlined="outlined"
      :dense="dense"
      :readonly="readonly"
      :min="min"
      :max="max"
      :step="step"
    />
    <div v-else class="readonly-value">
      {{ localValue }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  label?: string;
  value?: number;
  placeholder?: string;
  outlined?: boolean;
  dense?: boolean;
  readonly?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  value: 0,
  placeholder: '',
  outlined: true,
  dense: false,
  readonly: false,
  min: undefined,
  max: undefined,
  step: 1,
});

const emit = defineEmits<{
  (e: 'update:value', value: number): void;
}>();

const localValue = ref(props.value || 0);

// Watch for changes to the value prop and update localValue
watch(
  () => props.value,
  (newValue) => {
    localValue.value = newValue || 0;
  },
);

// Watch for changes to localValue and emit update event
watch(localValue, (newValue) => {
  emit('update:value', newValue);
});
</script>

<style scoped>
.sheet-number-input {
  width: 100%;
}
.readonly-value {
  padding: 8px 0;
  min-height: 32px;
  word-break: break-word;
}
</style>

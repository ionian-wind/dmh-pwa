<template>
  <div class="sheet-text-input">
    <QInput
      v-if="!readonly"
      :label="label"
      v-model="localValue"
      :placeholder="placeholder"
      :outlined="outlined"
      :dense="dense"
      :readonly="readonly"
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
  value?: string;
  placeholder?: string;
  outlined?: boolean;
  dense?: boolean;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  value: '',
  placeholder: '',
  outlined: true,
  dense: false,
  readonly: false,
});

const emit = defineEmits<{
  (e: 'update:value', value: string): void;
}>();

const localValue = ref(props.value || '');

// Watch for changes to the value prop and update localValue
watch(
  () => props.value,
  (newValue) => {
    localValue.value = newValue || '';
  },
);

// Watch for changes to localValue and emit update event
watch(localValue, (newValue) => {
  emit('update:value', newValue);
});
</script>

<style scoped>
.sheet-text-input {
  width: 100%;
}
.readonly-value {
  padding: 8px 0;
  min-height: 32px;
  word-break: break-word;
}
</style>

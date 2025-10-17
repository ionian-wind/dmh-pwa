<template>
  <div class="sheet-select-input">
    <QSelect
      v-if="!readonly"
      :label="label"
      v-model="localValue"
      :options="options"
      :placeholder="placeholder"
      :outlined="outlined"
      :dense="dense"
      :readonly="readonly"
      :emit-value="emitValue"
      :map-options="mapOptions"
    />
    <div v-else class="readonly-value">
      {{ displayValue }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

interface Option {
  label: string;
  value: any;
}

interface Props {
  label?: string;
  value?: any;
  options?: Option[] | string[];
  placeholder?: string;
  outlined?: boolean;
  dense?: boolean;
  readonly?: boolean;
  emitValue?: boolean;
  mapOptions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  value: '',
  options: () => [],
  placeholder: '',
  outlined: true,
  dense: false,
  readonly: false,
  emitValue: false,
  mapOptions: false,
});

const emit = defineEmits<{
  (e: 'update:value', value: any): void;
}>();

const localValue = ref(props.value);

// Watch for changes to the value prop and update localValue
watch(
  () => props.value,
  (newValue) => {
    localValue.value = newValue;
  },
);

// Watch for changes to localValue and emit update event
watch(localValue, (newValue) => {
  emit('update:value', newValue);
});

// Determine the display value for readonly mode
const displayValue = computed(() => {
  if (Array.isArray(props.options) && props.options.length > 0) {
    // If options is an array of objects
    if (typeof props.options[0] === 'object' && props.options[0] !== null) {
      const option = (props.options as Option[]).find((opt) =>
        props.emitValue || props.mapOptions
          ? opt.value === localValue.value
          : opt === localValue.value,
      );
      return option ? (option as Option).label : localValue.value;
    } else {
      // If options is an array of strings
      return localValue.value;
    }
  }
  return localValue.value;
});
</script>

<style scoped>
.sheet-select-input {
  width: 100%;
}
.readonly-value {
  padding: 8px 0;
  min-height: 32px;
  word-break: break-word;
}
</style>

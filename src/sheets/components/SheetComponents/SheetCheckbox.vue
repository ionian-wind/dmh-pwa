<template>
  <div class="sheet-checkbox">
    <QCheckbox
      v-if="!readonly"
      v-model="localValue"
      :label="label"
      :readonly="readonly"
      :dense="dense"
    />
    <div v-else class="readonly-value">
      <QIcon :name="localValue ? 'check_box' : 'check_box_outline_blank'" />
      <span class="q-ml-sm">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  label?: string;
  value?: boolean;
  readonly?: boolean;
  dense?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  value: false,
  readonly: false,
  dense: false,
});

const emit = defineEmits<{
  (e: 'update:value', value: boolean): void;
}>();

const localValue = ref(props.value || false);

// Watch for changes to the value prop and update localValue
watch(
  () => props.value,
  (newValue) => {
    localValue.value = newValue || false;
  },
);

// Watch for changes to localValue and emit update event
watch(localValue, (newValue) => {
  emit('update:value', newValue);
});
</script>

<style scoped>
.sheet-checkbox {
  width: 100%;
}

.readonly-value {
  display: flex;
  align-items: center;
  padding: 8px 0;
}
</style>

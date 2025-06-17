<script setup lang="ts">
import { useModuleStore } from '@/stores/modules';

const props = withDefaults(defineProps<{
  modelValue: string | null;
  placeholder?: string;
}>(), {
  modelValue: null,
  placeholder: 'No Module'
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

const moduleStore = useModuleStore();

const updateValue = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  const value = select.value === '' ? null : select.value;
  emit('update:modelValue', value);
};
</script>

<template>
  <select
    :value="props.modelValue"
    @input="updateValue"
    class="module-selector"
  >
    <option value="">{{ placeholder || 'No Module' }}</option>
    <option
      v-for="module in moduleStore.modules"
      :key="module.id"
      :value="module.id"
    >
      {{ module.name }}
    </option>
  </select>
</template>

<style scoped>
.module-selector {
  min-width: 200px;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  font-size: var(--font-size-base);
}

.module-selector:focus {
  outline: none;
  border-color: var(--color-primary);
}
</style> 

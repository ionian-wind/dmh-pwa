<script setup lang="ts">
import { useModuleStore } from '@/stores/modules';
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: string[];
  placeholder?: string;
}>(), {
  modelValue: () => [],
  placeholder: 'No Modules'
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const moduleStore = useModuleStore();

const updateValue = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  const selected = Array.from(select.selectedOptions).map(opt => opt.value).filter(v => v);
  emit('update:modelValue', selected);
};

const moduleOptions = computed(() => [
  { id: 'none', name: 'No Module', value: 'none' },
  ...moduleStore.items.map(module => ({
    id: module.id,
    name: module.name,
    value: module.id
  }))
]);
</script>

<template>
  <select
    multiple
    :value="props.modelValue"
    @change="updateValue"
    class="module-multiselect"
  >
    <option
      v-for="option in moduleOptions"
      :key="option.value"
      :value="option.value"
    >
      {{ option.name }}
    </option>
  </select>
</template>

<style scoped>
.module-multiselect {
  min-width: 200px;
  min-height: 3em;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  font-size: var(--font-size-base);
}

.module-multiselect:focus {
  outline: none;
  border-color: var(--color-primary);
}
</style> 
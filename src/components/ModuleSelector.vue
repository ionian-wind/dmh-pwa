<script setup lang="ts">
import { useModuleStore } from '@/stores/modules';
import { computed, onMounted } from 'vue';

const moduleStore = useModuleStore();

onMounted(async () => {
  await moduleStore.load();
});

const props = withDefaults(defineProps<{
  modelValue: string | null;
  placeholder?: string;
  allowAnyModule?: boolean;
}>(), {
  modelValue: null,
  placeholder: 'No Module',
  allowAnyModule: false
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

const updateValue = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  const value = select.value === '' ? null : select.value;
  emit('update:modelValue', value);
};

const moduleOptions = computed(() => {
  const options = [];
  if (props.allowAnyModule) {
    options.push({ id: 'any', name: 'Any Module', value: 'any' });
  }
  options.push({ id: 'none', name: 'No Module', value: 'none' });
  options.push(...moduleStore.items.map(module => ({
    id: module.id,
    name: module.name,
    value: module.id
  })));
  return options;
});
</script>

<template>
  <select
    :value="props.modelValue"
    @input="updateValue"
    class="module-selector"
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

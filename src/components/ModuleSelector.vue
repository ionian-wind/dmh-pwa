<script setup lang="ts">
import { useModuleStore } from '@/stores/modules';
import { computed, onMounted } from 'vue';

const moduleStore = useModuleStore();

onMounted(async () => {
  await moduleStore.load();
});

const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    placeholder?: string;
    allowAnyModule?: boolean;
  }>(),
  {
    modelValue: null,
    placeholder: 'No Module',
    allowAnyModule: false,
  },
);

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
  options.push(
    ...moduleStore.items.map((module) => ({
      id: module.id,
      name: module.name,
      value: module.id,
    })),
  );
  return options;
});
</script>

<template>
  <QSelect
    :model-value="props.modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :options="
      moduleOptions.map((opt) => ({ label: opt.name, value: opt.value }))
    "
    :label="props.placeholder"
    emit-value
    map-options
    dense
    outlined
    class="module-selector"
  />
</template>

<script setup lang="ts">
import { useModuleStore } from '@/stores/modules';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const moduleStore = useModuleStore();
onMounted(async () => {
  await moduleStore.load();
});
const props = withDefaults(
  defineProps<{
    modelValue: string[];
    placeholder?: string;
  }>(),
  {
    modelValue: () => [],
    placeholder: 'common.noModules',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const updateValue = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  const selected = Array.from(select.selectedOptions)
    .map((opt) => opt.value)
    .filter((v) => v);
  emit('update:modelValue', selected);
};

const moduleOptions = computed(() => [
  { id: 'none', name: t('common.noModule'), value: 'none' },
  ...moduleStore.items.map((module) => ({
    id: module.id,
    name: module.name,
    value: module.id,
  })),
]);
</script>

<template>
  <QSelect
    :model-value="props.modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :options="
      moduleOptions.map((opt) => ({ label: opt.name, value: opt.value }))
    "
    multiple
    emit-value
    map-options
    use-chips
    dense
    outlined
    class="module-multiselect"
    :label="t(props.placeholder)"
  />
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

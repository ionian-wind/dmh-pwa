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

const moduleOptions = computed(() => [
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
    emit-value
    map-options
    dense
    outlined
    :label="t(props.placeholder)"
    multiple
    use-chips
  />
</template>

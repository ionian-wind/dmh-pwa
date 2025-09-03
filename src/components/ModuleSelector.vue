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
    modelValue: string | null;
    placeholder?: string;
    allowAnyModule?: boolean;
  }>(),
  {
    modelValue: null,
    placeholder: 'common.noModule',
    allowAnyModule: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

const moduleOptions = computed(() => {
  const options = [];
  if (props.allowAnyModule) {
    options.push({ id: 'any', name: t('common.anyModule'), value: 'any' });
  }
  options.push({ id: 'none', name: t('common.noModule'), value: 'none' });
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
    emit-value
    map-options
    outlined
    :label="t(props.placeholder)"
  />
</template>

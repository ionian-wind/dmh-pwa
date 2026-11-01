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
    allowNone?: boolean;
  }>(),
  {
    modelValue: null,
    placeholder: 'common.noModule',
    allowAnyModule: false,
    allowNone: true,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

const moduleOptions = computed(() => {
  const options: Array<{ id: string; name: string; value: string | null }> = [];
  if (props.allowAnyModule) {
    options.push({ id: 'any', name: t('common.anyModule'), value: 'any' });
  }
  if (props.allowNone) {
    options.push({ id: 'none', name: t('common.noModule'), value: null });
  }
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

<template>
  <QTabs v-model="activeTab" dense>
    <QTab
      v-for="tab in tabs"
      :key="tab.id"
      :name="tab.id"
      :label="tab.label"
      :disable="tab.disabled"
      @click="emit('tab-click', tab)"
    />
  </QTabs>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface EntityTab {
  id: string;
  label: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    tabs: EntityTab[];
    modelValue?: string;
  }>(),
  { modelValue: '' },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'tab-click', tab: EntityTab): void;
}>();

const activeTab = computed({
  get: () => props.modelValue || props.tabs[0]?.id || '',
  set: (value: string) => {
    if (value !== props.modelValue) emit('update:modelValue', value);
  },
});
</script>

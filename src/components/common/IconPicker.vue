<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    icons: readonly string[];
    collection: string;
    searchPlaceholder?: string;
    noIconLabel?: string;
  }>(),
  {
    searchPlaceholder: 'Search icons',
    noIconLabel: 'No icon',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const search = ref('');

const selectedIcon = computed(() => {
  const value = props.modelValue?.trim() ?? '';
  if (!value) return '';
  const separator = value.indexOf(':');
  return separator >= 0 ? value.slice(separator + 1) : value;
});

const filteredIcons = computed(() => {
  const value = search.value.trim().toLowerCase();
  if (!value) return props.icons;
  return props.icons.filter((icon) => icon.toLowerCase().includes(value));
});

function select(icon: string) {
  emit(
    'update:modelValue',
    icon ? (props.collection ? `${props.collection}:${icon}` : icon) : '',
  );
}
</script>

<template>
  <div class="icon-picker">
    <QInput
      v-model="search"
      class="icon-picker-search"
      :placeholder="searchPlaceholder"
      dense
      outlined
      clearable
    />

    <div class="icon-picker-grid">
      <button
        type="button"
        class="icon-picker-option icon-picker-none"
        :class="{ 'is-selected': !selectedIcon }"
        data-icon="none"
        :title="noIconLabel"
        @click="select('')"
      >
        <span aria-hidden="true">∅</span>
      </button>
      <button
        v-for="icon in filteredIcons"
        :key="icon"
        type="button"
        class="icon-picker-option"
        :class="{ 'is-selected': selectedIcon === icon }"
        :data-icon="icon"
        :title="icon"
        @click="select(icon)"
      >
        <i :class="[collection, icon]" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.icon-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
  gap: 0.35rem;
  max-height: 220px;
  overflow: auto;
  padding: 0.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
}

.icon-picker-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  font-size: 1.15rem;
}

.icon-picker-option:hover,
.icon-picker-option.is-selected {
  border-color: var(--color-primary);
  background: var(--color-info-light);
  color: var(--color-primary);
}
</style>

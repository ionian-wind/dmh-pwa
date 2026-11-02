<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
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
    <QBtn
      flat
      class="icon-picker-trigger"
      :title="selectedIcon || noIconLabel"
      :aria-label="selectedIcon || noIconLabel"
    >
      <i
        v-if="selectedIcon"
        :class="[collection, selectedIcon]"
        aria-hidden="true"
      ></i>
      <span v-else aria-hidden="true">∅</span>

      <QMenu class="icon-picker-menu">
        <div class="icon-picker-panel">
          <QInput
            v-model="search"
            class="icon-picker-search"
            :placeholder="searchPlaceholder"
            dense
            outlined
            clearable
          />

          <div class="icon-picker-content">
            <div class="icon-picker-palette">
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

            <div class="icon-picker-preview">
              <div class="icon-picker-preview-icon">
                <i
                  v-if="selectedIcon"
                  :class="[collection, selectedIcon]"
                  aria-hidden="true"
                ></i>
                <span v-else aria-hidden="true">∅</span>
              </div>
              <span class="icon-picker-preview-name">
                {{ selectedIcon || noIconLabel }}
              </span>
            </div>
          </div>
        </div>
      </QMenu>
    </QBtn>
  </div>
</template>

<style scoped>
.icon-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.icon-picker-trigger {
  width: 48px;
  min-height: 40px;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  font-size: 1.2rem;
}

.icon-picker-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: min(560px, 90vw);
  padding: 0.75rem;
}

.icon-picker-content {
  display: flex;
  gap: 0.75rem;
  min-height: 240px;
}

.icon-picker-palette {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
  align-content: start;
  gap: 0.45rem;
  max-height: 320px;
  overflow: auto;
  padding: 0.35rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
}

.icon-picker-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  font-size: 1.6rem;
}

.icon-picker-option:hover,
.icon-picker-option.is-selected {
  border-color: var(--color-primary);
  background: var(--color-info-light);
  color: var(--color-primary);
}

.icon-picker-preview {
  display: flex;
  flex: 0 0 120px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  background: var(--color-background-soft);
}

.icon-picker-preview-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  font-size: 4rem;
  color: var(--color-primary);
}

.icon-picker-preview-name {
  max-width: 100%;
  overflow: hidden;
  color: var(--color-text-light);
  font-size: 0.75rem;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

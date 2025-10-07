<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MAP_MARKER_ICONS, markerIconClass } from '../icons';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const { t } = useI18n();
const search = ref('');

const filteredIcons = computed(() => {
  const value = search.value.trim().toLowerCase();
  if (!value) return MAP_MARKER_ICONS;
  return MAP_MARKER_ICONS.filter((icon) => icon.includes(value));
});

function select(icon: string) {
  emit('update:modelValue', icon);
}
</script>

<template>
  <div class="map-icon-picker">
    <QInput
      v-model="search"
      class="map-icon-search"
      :placeholder="t('maps.searchIcons')"
      dense
      outlined
      clearable
    />

    <div class="map-icon-grid">
      <button
        type="button"
        class="map-icon-option map-icon-none"
        :class="{ 'is-selected': !markerIconClass(modelValue) }"
        data-icon="none"
        :title="t('maps.noIcon')"
        @click="select('')"
      >
        <span aria-hidden="true">∅</span>
      </button>
      <button
        v-for="icon in filteredIcons"
        :key="icon"
        type="button"
        class="map-icon-option"
        :class="{ 'is-selected': markerIconClass(modelValue) === icon }"
        :data-icon="icon"
        :title="icon"
        @click="select(icon)"
      >
        <i :class="['ra', icon]" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.map-icon-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.map-icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
  gap: 0.35rem;
  max-height: 220px;
  overflow: auto;
  padding: 0.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
}

.map-icon-option {
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

.map-icon-option:hover,
.map-icon-option.is-selected {
  border-color: var(--color-primary);
  background: var(--color-info-light);
  color: var(--color-primary);
}
</style>

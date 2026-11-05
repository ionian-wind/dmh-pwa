<template>
  <div class="tag-insert-popup crepe-popup" :style="popupStyle" @mousedown.stop>
    <div class="tag-insert-header">
      {{ t('tagSelector.selectTag') }}
    </div>
    <ul class="tag-insert-list">
      <li
        v-for="(tag, idx) in filteredTags"
        :key="tag"
        :class="['tag-insert-item', { selected: idx === selectedIdx }]"
        @click="selectTag(tag)"
        @mouseenter="selectedIdx = idx"
      >
        <span class="tag-insert-title">#{{ tag }}</span>
      </li>
      <li
        v-if="canCreate"
        :class="[
          'tag-insert-item',
          { selected: selectedIdx === filteredTags.length },
        ]"
        @click="createTag"
        @mouseenter="selectedIdx = filteredTags.length"
      >
        <span class="tag-insert-title">
          {{ t('tagSelector.createTag', { tag: `#${query}` }) }}
        </span>
      </li>
      <li
        v-if="filteredTags.length === 0 && !canCreate"
        class="tag-insert-empty"
      >
        {{ t('tagSelector.noTags') }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { StyleValue } from 'vue';

const props = defineProps<{
  tags: string[];
  query: string;
  position: { top: number; left: number };
  onSelect: (tag: string) => void;
  onCreate: (tag: string) => void;
  onClose: () => void;
}>();

const { t } = useI18n();
const selectedIdx = ref(0);

const filteredTags = computed(() => {
  const query = props.query.toLowerCase();
  return [...new Set(props.tags)]
    .filter((tag) => tag.toLowerCase().includes(query))
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.toLowerCase().startsWith(query) ? 0 : 1;
      return aStarts - bStarts || a.localeCompare(b);
    });
});

const canCreate = computed(
  () => !!props.query.trim() && !props.tags.includes(props.query),
);

const popupStyle = computed<StyleValue>(() => ({
  position: 'absolute',
  top: `${props.position.top}px`,
  left: `${props.position.left}px`,
  zIndex: 1000,
  minWidth: '220px',
}));

function selectTag(tag: string) {
  props.onSelect(tag);
  props.onClose();
}

function createTag() {
  if (!canCreate.value) return;
  props.onCreate(props.query);
  props.onClose();
}

function selectCurrent() {
  if (selectedIdx.value < filteredTags.value.length) {
    selectTag(filteredTags.value[selectedIdx.value]);
  } else if (canCreate.value) {
    createTag();
  }
}

function moveSelection(delta: number) {
  const total = filteredTags.value.length + (canCreate.value ? 1 : 0);
  if (total === 0) return;
  selectedIdx.value = (selectedIdx.value + delta + total) % total;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    moveSelection(1);
    event.preventDefault();
    event.stopPropagation();
  } else if (event.key === 'ArrowUp') {
    moveSelection(-1);
    event.preventDefault();
    event.stopPropagation();
  } else if (event.key === 'Enter') {
    selectCurrent();
    event.preventDefault();
    event.stopPropagation();
  } else if (event.key === 'Escape') {
    props.onClose();
    event.preventDefault();
    event.stopPropagation();
  }
}

function onClickOutside(event: MouseEvent) {
  if (!(event.target as HTMLElement).closest('.tag-insert-popup')) {
    props.onClose();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown, true);
  window.addEventListener('mousedown', onClickOutside);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, true);
  window.removeEventListener('mousedown', onClickOutside);
});

watch(
  () => props.query,
  () => {
    selectedIdx.value = 0;
  },
);
</script>

<style scoped>
.tag-insert-popup {
  background: var(--crepe-popup-bg, #fff);
  border: 1px solid var(--crepe-popup-border, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  padding: 8px 0;
  font-family: inherit;
}

.tag-insert-header {
  padding: 8px 16px 4px;
  color: var(--crepe-popup-header, #333);
  font-size: 14px;
  font-weight: 600;
}

.tag-insert-list {
  max-height: 240px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.tag-insert-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.tag-insert-item.selected,
.tag-insert-item:hover {
  background: var(--crepe-popup-hover, #f5f5f5);
}

.tag-insert-title {
  flex: 1;
  font-size: 15px;
}

.tag-insert-empty {
  padding: 8px 16px;
  color: #aaa;
  font-style: italic;
}
</style>

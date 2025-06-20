<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { cropTitle } from '@/utils/cropTitle';

interface MentionItem {
  id: string;
  kind: string;
  title: string;
}

const props = defineProps<{
  items: MentionItem[];
  show: boolean;
  anchorEl: HTMLElement | null;
}>();

const emit = defineEmits<{
  (e: 'select', item: MentionItem): void;
  (e: 'close'): void;
}>();

const filter = ref('');
const activeIndex = ref(0);
const popupRef = ref<HTMLElement | null>(null);

const filteredItems = computed(() => {
  const f = filter.value.trim().toLowerCase();
  let result = props.items;
  if (f) {
    result = result.filter(item => item.title.toLowerCase().includes(f));
  }
  return result.slice(0, 10);
});

function handleKeydown(e: KeyboardEvent) {
  if (!props.show) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % filteredItems.value.length;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex.value = (activeIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length;
  } else if (e.key === 'Enter') {
    if (filteredItems.value[activeIndex.value]) {
      emit('select', filteredItems.value[activeIndex.value]);
    }
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!props.show) return;
  if (popupRef.value && !popupRef.value.contains(e.target as Node)) {
    e.preventDefault();
    emit('close');
  }
}

watch(() => props.show, (show) => {
  if (show) {
    document.addEventListener('mousedown', handleClickOutside);
    nextTick(() => {
      if (popupRef.value) popupRef.value.focus();
    });
  } else {
    document.removeEventListener('mousedown', handleClickOutside);
    filter.value = '';
    activeIndex.value = 0;
  }
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

const popupStyle = computed<Record<string, string>>(() => {
  if (!props.anchorEl) {
    return {
      display: 'none',
      position: 'absolute',
      top: '0px',
      left: '0px',
      minWidth: '0px',
      zIndex: '9999',
    };
  }
  const rect = props.anchorEl.getBoundingClientRect();
  return {
    display: 'block',
    position: 'absolute',
    top: `${rect.bottom + window.scrollY}px`,
    left: `${rect.left + window.scrollX}px`,
    minWidth: `${rect.width}px`,
    zIndex: '9999',
  };
});
</script>

<template>
  <div v-if="show" :style="popupStyle" class="mention-suggestion-popup" ref="popupRef" tabindex="-1">
    <input
      v-model="filter"
      class="mention-suggestion-filter"
      type="text"
      placeholder="Type to filter..."
      @keydown.stop="handleKeydown"
    />
    <ul class="mention-suggestion-list">
      <li
        v-for="(item, idx) in filteredItems"
        :key="item.kind + ':' + item.id"
        :class="{ active: idx === activeIndex }"
        @click.stop="emit('select', item)"
      >
        <span class="mention-kind">{{ item.kind }}</span>
        <span class="mention-title">{{ cropTitle(item.title) }}</span>
      </li>
      <li v-if="filteredItems.length === 0" class="mention-suggestion-empty">No results</li>
    </ul>
  </div>
</template>

<style scoped>
.mention-suggestion-popup {
  background: var(--color-background, #fff);
  border: 1px solid var(--color-border, #ccc);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  padding: 0.5em 0.5em 0.25em 0.5em;
  min-width: 220px;
  max-width: 350px;
  max-height: 320px;
  overflow-y: auto;
  font-size: 1em;
}
.mention-suggestion-filter {
  width: 100%;
  margin-bottom: 0.25em;
  padding: 0.25em 0.5em;
  border-radius: 4px;
  border: 1px solid var(--color-border, #ccc);
  font-size: 1em;
}
.mention-suggestion-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.mention-suggestion-list li {
  padding: 0.25em 0.5em;
  cursor: pointer;
  display: flex;
  gap: 0.5em;
  align-items: center;
  border-radius: 4px;
}
.mention-suggestion-list li.active {
  background: var(--color-primary, #2196f3);
  color: #fff;
}
.mention-kind {
  font-size: 0.9em;
  color: var(--color-text-light, #888);
  min-width: 60px;
  text-transform: capitalize;
}
.mention-title {
  font-weight: 500;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mention-suggestion-empty {
  color: var(--color-text-light, #aaa);
  font-style: italic;
  text-align: center;
  padding: 0.5em 0;
}
</style> 
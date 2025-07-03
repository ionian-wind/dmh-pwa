<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { cropTitle } from '@/utils/cropTitle';
import PopoverPanel from './PopoverPanel.vue';
// @ts-expect-error: no types for textarea-caret
import textCursorHelper from 'text-cursor-helper';
import { autoPlacement } from '@floating-ui/vue';

interface MentionItem {
  id: string;
  kind: string;
  title: string;
}

const props = defineProps<{
  items: MentionItem[];
  show: boolean;
  anchorEl: HTMLElement | null;
  currentEntityType?: string;
  currentEntityId?: string;
}>();

const emit = defineEmits<{
  (e: 'select', item: MentionItem): void;
  (e: 'close'): void;
}>();

const filter = ref('');
const activeIndex = ref(0);
const filterInputRef = ref<HTMLInputElement | null>(null);
const caretVirtualEl = ref<any>(null);

watch(() => props.anchorEl, (val) => {
  if (val) {
    caretVirtualEl.value = {
      getBoundingClientRect: () => val.getBoundingClientRect(),
    };
  }
});

const filteredItems = computed(() => {
  const f = filter.value.trim().toLowerCase();
  let items = props.items;

  if (f) {
    items = items.filter(item => item.title.toLowerCase().includes(f));
  }

  return items.slice(0, 10);
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

watch(() => props.show, (show) => {
  if (show) {
    nextTick(() => {
      filterInputRef.value?.focus();
    });
  } else {
    filter.value = '';
    activeIndex.value = 0;
  }
});
</script>

<template>
  <PopoverPanel
    :is-open="show"
    :trigger-el="caretVirtualEl"
    disable-internal-trigger
    :auto-placement="true"
    @close="emit('close')"
  >
    <div class="mention-suggestion-popup" @keydown="handleKeydown">
      <input
        ref="filterInputRef"
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
  </PopoverPanel>
</template>

<style scoped>
.mention-suggestion-popup {
  padding: 0.5em 0.5em 0.25em 0.5em;
  min-width: 220px;
  max-width: 350px;
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
  max-height: 250px;
  overflow-y: auto;
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
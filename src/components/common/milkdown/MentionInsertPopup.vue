<template>
  <div
    class="mention-insert-popup crepe-popup"
    :style="popupStyle"
    tabindex="0"
    @keydown.esc="onClose"
    @mousedown.stop
  >
    <input
      ref="searchInput"
      v-model="search"
      class="mention-insert-search"
      type="text"
      :placeholder="t('mentions.searchPlaceholder', { kind: kindLabel })"
      @keydown.down.prevent="moveSelection(1)"
      @keydown.up.prevent="moveSelection(-1)"
      @keydown.enter.prevent="selectCurrentMention"
      @keydown.esc.prevent="onClose"
      autofocus
    />
    <div class="mention-insert-header">{{ t('mentions.selectToMention', { kind: kindLabel }) }}</div>
    <ul class="mention-insert-list">
      <li
        v-for="(mention, idx) in filteredMentions"
        :key="mention.id"
        :class="['mention-insert-item', { selected: idx === selectedIdx }]"
        @click="selectMention(mention)"
        @mouseenter="selectedIdx = idx"
      >
        <span class="mention-insert-title">{{ mention.title || mention.name }}</span>
        <span v-if="mention.id" class="mention-insert-id">({{ mention.id }})</span>
      </li>
      <li v-if="filteredMentions.length === 0" class="mention-insert-empty">{{ t('mentions.noResults') }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import type { StyleValue } from 'vue';

const props = defineProps<{
  kind: string;
  mentions: any[];
  position: { top: number; left: number };
  onSelect: (mention: any) => void;
  onClose: () => void;
}>();

const { t } = useI18n();
const selectedIdx = ref(0);
const search = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

const kindLabel = computed(() => {
  switch (props.kind) {
    case 'note': return t('notes.title');
    case 'module': return t('modules.title');
    case 'party': return t('parties.title');
    case 'monster': return t('monsters.title');
    case 'encounter': return t('encounters.title');
    default: return props.kind;
  }
});

const popupStyle = computed<StyleValue>(() => ({
  position: 'absolute',
  top: `${props.position.top}px`,
  left: `${props.position.left}px`,
  zIndex: 1000,
  minWidth: '220px',
}));

const filteredMentions = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return props.mentions;
  return props.mentions.filter((m) => {
    const label = (m.title || m.name || '').toLowerCase();
    const id = (m.id || '').toLowerCase();
    return label.includes(q) || id.includes(q);
  });
});

function selectMention(mention: any) {
  props.onSelect(mention);
  props.onClose();
}

function selectCurrentMention() {
  if (filteredMentions.value.length > 0) {
    selectMention(filteredMentions.value[selectedIdx.value]);
  }
}

function moveSelection(delta: number) {
  const len = filteredMentions.value.length;
  if (len === 0) return;
  selectedIdx.value = (selectedIdx.value + delta + len) % len;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    moveSelection(1);
    e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    moveSelection(-1);
    e.preventDefault();
  } else if (e.key === 'Enter') {
    selectCurrentMention();
    e.preventDefault();
  } else if (e.key === 'Escape') {
    props.onClose();
    e.preventDefault();
  }
}

function onClickOutside(event: MouseEvent) {
  if (!(event.target as HTMLElement).closest('.mention-insert-popup')) {
    props.onClose();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('mousedown', onClickOutside);
  nextTick(() => {
    if (searchInput.value) searchInput.value.focus();
  });
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('mousedown', onClickOutside);
});

watch(filteredMentions, (newMentions) => {
  if (selectedIdx.value >= newMentions.length) {
    selectedIdx.value = 0;
  }
});

watch(search, () => {
  selectedIdx.value = 0;
});
</script>

<style scoped>
.mention-insert-popup {
  background: var(--crepe-popup-bg, #fff);
  border: 1px solid var(--crepe-popup-border, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  padding: 8px 0;
  font-family: inherit;
}
.mention-insert-header {
  font-weight: 600;
  padding: 8px 16px 4px 16px;
  color: var(--crepe-popup-header, #333);
  font-size: 14px;
}
.mention-insert-search {
  width: 90%;
  margin: 8px 5%;
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  font-size: 15px;
  margin-bottom: 6px;
  outline: none;
}
.mention-insert-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 240px;
  overflow-y: auto;
}
.mention-insert-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background 0.15s;
}
.mention-insert-item.selected,
.mention-insert-item:hover {
  background: var(--crepe-popup-hover, #f5f5f5);
}
.mention-insert-title {
  flex: 1;
  font-size: 15px;
}
.mention-insert-id {
  color: #aaa;
  font-size: 12px;
  margin-left: 8px;
}
.mention-insert-empty {
  padding: 8px 16px;
  color: #aaa;
  font-style: italic;
}
</style> 
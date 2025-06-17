<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import Button from '@/components/common/Button.vue';

const props = defineProps<{
  position: { top: number; left: number };
  text: string;
  cursorPosition: number;
}>();

const emit = defineEmits<{
  (e: 'select', suggestion: string): void;
  (e: 'cancel'): void;
}>();

const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();

const selectedIndex = ref(-1);

const currentLink = computed(() => {
  const text = props.text;
  const cursorPos = props.cursorPosition;
  const beforeCursor = text.slice(0, cursorPos);
  const linkMatch = beforeCursor.match(/\[\[([^:]*):?([^\]]*)$/);

  if (!linkMatch) return null;

  const [, type, search] = linkMatch;
  return { type, search };
});

const suggestions = computed(() => {
  if (!currentLink.value) return [];

  const { type, search } = currentLink.value;
  const searchLower = search.toLowerCase();

  switch (type) {
    case 'note':
      return noteStore.filteredNotes
        .filter(note => note.title.toLowerCase().includes(searchLower))
        .map(note => ({
          id: note.id,
          title: note.title,
          type: 'Note'
        }));
    case 'module':
      return moduleStore.modules
        .filter(module => module.name.toLowerCase().includes(searchLower))
        .map(module => ({
          id: module.id,
          title: module.name,
          type: 'Module'
        }));
    case 'party':
      return partyStore.filteredParties
        .filter(party => party.name.toLowerCase().includes(searchLower))
        .map(party => ({
          id: party.id,
          title: party.name,
          type: 'Party'
        }));
    case 'monster':
      return monsterStore.filteredMonsters
        .filter(monster => monster.name.toLowerCase().includes(searchLower))
        .map(monster => ({
          id: monster.id,
          title: monster.name,
          type: 'Monster'
        }));
    case 'encounter':
      return encounterStore.filteredEncounters
        .filter(encounter => encounter.name.toLowerCase().includes(searchLower))
        .map(encounter => ({
          id: encounter.id,
          title: encounter.name,
          type: 'Encounter'
        }));
    default:
      return [];
  }
});

const selectSuggestion = (suggestion: { id: string; type: string }) => {
  const link = `[[${suggestion.type.toLowerCase()}:${suggestion.id}]]`;
  emit('select', link);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!suggestions.value.length) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length;
      break;
    case 'ArrowUp':
      event.preventDefault();
      selectedIndex.value = selectedIndex.value <= 0 
        ? suggestions.value.length - 1 
        : selectedIndex.value - 1;
      break;
    case 'Enter':
      event.preventDefault();
      if (selectedIndex.value >= 0) {
        selectSuggestion(suggestions.value[selectedIndex.value]);
      }
      break;
    case 'Escape':
      event.preventDefault();
      emit('cancel');
      break;
  }
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.entity-autosuggest')) {
    emit('cancel');
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="suggestions.length > 0"
      class="entity-autosuggest"
      :style="{
        top: `${position.top}px`,
        left: `${position.left}px`
      }"
    >
      <div class="entity-autosuggest__list">
        <button
          v-for="(suggestion, index) in suggestions"
          :key="suggestion.id"
          class="entity-autosuggest__item"
          :class="{ 'entity-autosuggest__item--selected': index === selectedIndex }"
          @click="selectSuggestion(suggestion)"
        >
          <span class="entity-autosuggest__item-title">{{ suggestion.title }}</span>
          <span class="entity-autosuggest__item-type">{{ suggestion.type }}</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.entity-autosuggest {
  position: fixed;
  z-index: 1000;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md);
  min-width: 200px;
  max-width: 400px;
  max-height: 300px;
  overflow-y: auto;
}

.entity-autosuggest__list {
  display: flex;
  flex-direction: column;
}

.entity-autosuggest__item {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.entity-autosuggest__item:hover,
.entity-autosuggest__item--selected {
  background-color: var(--color-background-soft);
}

.entity-autosuggest__item-title {
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.entity-autosuggest__item-type {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}
</style> 

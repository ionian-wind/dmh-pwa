<template>
  <div class="view-container" style="display: flex; flex-direction: row; gap: 2rem; align-items: flex-start;">
    <div style="flex: 2 1 0; min-width: 0;">
      <div v-if="loading" class="loading-state">Loading...</div>
      <NotFoundView v-else-if="notFound" />
      <BaseEntityView
        v-else
        :entity="character"
        entity-name="Character"
        list-route="/characters"
        :on-delete="handleDelete"
        :on-edit="editCharacter"
        :is-editing="showEditor"
        :title="characterTitle"
        :not-found="notFound"
      >
        <!-- Character Content -->
        <div v-if="character" class="character-sheet">
          <!-- Notes -->
          <section v-if="character.notes" class="sheet-section notes">
            <h2>Notes</h2>
            <div class="notes-content">
              <p>{{ character.notes }}</p>
            </div>
          </section>
        </div>

        <!-- Editor Modal -->
        <template #editor>
          <CharacterEditor
            :isOpen="showEditor"
            :character="character"
            @submit="handleSave"
            @cancel="closeEditor"
          />
        </template>
      </BaseEntityView>
    </div>
    <aside v-if="!notFound && !loading" style="flex: 1 1 250px; min-width: 200px; max-width: 320px; display: flex; flex-direction: column; gap: 2rem;">
      <Mentions title="Mentions" :entities="mentionedEntities" />
      <Mentions title="Mentioned In" :entities="mentionedInEntities" />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useCharacterStore } from '@/stores/characters';
import CharacterEditor from '@/components/CharacterEditor.vue';
import type { PlayerCharacter } from '@/types';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import Mentions from '@/components/common/Mentions.vue';
import { useMentionsStore } from '@/utils/storage';
import NotFoundView from './NotFoundView.vue';

const route = useRoute();
const characterStore = useCharacterStore();
const showEditor = ref(false);

const mentionsStore = useMentionsStore();

const isLoaded = computed(() => characterStore.isLoaded);
const character = computed(() => characterStore.getById(route.params.id as string));
const loading = computed(() => !isLoaded.value);
const notFound = computed(() => isLoaded.value && !character.value);

function editCharacter() {
  showEditor.value = true;
}

function handleDelete() {
  if (!character.value) return Promise.resolve();
  characterStore.remove(character.value.id);
  return Promise.resolve();
}

function handleSave(updated: PlayerCharacter) {
  if (character.value) {
    characterStore.update(character.value.id, updated);
    characterStore.getById(character.value.id);
  }
  showEditor.value = false;
}

function closeEditor() {
  showEditor.value = false;
}

// Computed properties for BaseEntityView
const characterTitle = computed(() => character.value?.name || '');

const mentionedEntities = computed(() => {
  if (!character.value) return [];
  return mentionsStore.getLinks({ kind: 'character', id: character.value.id });
});
const mentionedInEntities = computed(() => {
  if (!character.value) return [];
  return mentionsStore.getBacklinks({ kind: 'character', id: character.value.id });
});

onMounted(async () => {
  characterStore.load();
});
</script>

<style scoped>
.character-sheet {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
}

.sheet-section {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
}

.sheet-section h2 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
  font-size: 1.3rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.sheet-section h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1.1rem;
}

/* Basic Information */
.info-grid {
  display: grid;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item label {
  font-weight: 500;
  color: var(--color-text);
}

.info-item span {
  color: var(--color-text-light);
}

/* Notes */
.notes-content {
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
  

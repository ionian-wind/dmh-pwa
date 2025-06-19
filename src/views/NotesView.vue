<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import NoteEditor from '@/components/NoteEditor.vue';
import NoteCard from '@/components/NoteCard.vue';
import Button from '@/components/common/Button.vue';
import type { Note } from '@/types';

const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();

const showEditor = ref(false);
const editingNote = ref<Note>({
  id: '',
  title: '',
  content: '',
  typeId: null,
  tags: [],
  moduleId: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  parentId: undefined,
  metadata: undefined
});
const notes = ref<Note[]>([]);
const searchQuery = ref('');

const route = useRoute();
const router = useRouter();

const tagFilter = ref<string | null>(null);

// Watch for query param changes
watch(
  () => route.query.tag,
  (newTag) => {
    tagFilter.value = typeof newTag === 'string' ? newTag : null;
  },
  { immediate: true }
);

const filteredNotes = computed(() => {
  let notes = noteStore.filteredNotes;
  if (tagFilter.value) {
    notes = notes.filter(note => note.tags.includes(tagFilter.value!));
  }
  return notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchesSearch;
  });
});

onMounted(async () => {
  await Promise.all([
    noteStore.loadNotes(),
    moduleStore.loadModules(),
    partyStore.loadParties(),
    monsterStore.loadMonsters()
  ]);
  notes.value = noteStore.notes;
});

const addNote = () => {
  editingNote.value = {
    id: '',
    title: '',
    content: '',
    typeId: null,
    tags: [],
    moduleId: moduleStore.currentModuleFilter === 'any' || moduleStore.currentModuleFilter === 'none' ? null : (moduleStore.currentModuleFilter as string),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    parentId: undefined,
    metadata: undefined
  };
  showEditor.value = true;
};

const saveNote = async (note: Note) => {
  if (editingNote.value.id) {
    await noteStore.updateNote(note.id, note);
  } else {
    await noteStore.createNote(note);
  }
  notes.value = noteStore.notes;
  showEditor.value = false;
  editingNote.value = {
    id: '',
    title: '',
    content: '',
    typeId: null,
    tags: [],
    moduleId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    parentId: undefined,
    metadata: undefined
  };
};

const cancelEdit = () => {
  showEditor.value = false;
  editingNote.value = {
    id: '',
    title: '',
    content: '',
    typeId: null,
    tags: [],
    moduleId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    parentId: undefined,
    metadata: undefined
  };
};

const handleDelete = async (note: Note) => {
  if (confirm(`Are you sure you want to delete the note "${note.title}"?`)) {
    await noteStore.deleteNote(note.id);
    notes.value = noteStore.notes;
  }
};

function handleTagClick(tag: string) {
  router.push({ path: '/notes', query: { tag: encodeURIComponent(tag) } });
}

</script>

<template>
  <div class="view-list">
    <div class="view-header notes-header-row">
      <Button @click="addNote">+</Button>
      <div class="search-input-wrapper">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search notes..."
          class="search-input"
        >
        <span v-if="tagFilter" class="tag-chip">
          #{{ tagFilter }}
          <button class="remove-tag" @click="router.push({ path: '/notes' })" title="Remove tag filter">&times;</button>
        </span>
      </div>
    </div>

    <div v-if="filteredNotes.length === 0" class="view-empty">
      <p>No notes found.</p>
      <p v-if="!['any', 'none', null].includes(moduleStore.currentModuleFilter)">Try changing the module filter or create a new note.</p>
    </div>

    <div v-else class="notes-container">
      <div class="view-grid">
        <NoteCard
          v-for="note in filteredNotes"
          :key="note.id"
          :note="note"
          :module-name="note.moduleId ? moduleStore.modules.find(m => m.id === note.moduleId)?.name : undefined"
          @view="note => $router.push(`/notes/${note.id}`)"
          @edit="note => { editingNote = note as Note; showEditor = true; }"
          @delete="handleDelete"
          @tag-click="handleTagClick"
        />
      </div>
    </div>

    <NoteEditor
      v-if="showEditor"
      :note="editingNote"
      :is-open="showEditor"
      @submit="saveNote"
      @cancel="cancelEdit"
    />
  </div>
</template>

<style scoped>
.notes-header-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 1rem;
  background: var(--color-background);
  color: var(--color-text);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  background: var(--color-background-soft);
  color: var(--color-primary);
  border-radius: 16px;
  padding: 0.2em 0.75em 0.2em 0.5em;
  font-size: 0.95em;
  margin-left: 0.5em;
  border: 1px solid var(--color-primary);
  gap: 0.25em;
}

.remove-tag {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 1.1em;
  margin-left: 0.25em;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.remove-tag:hover {
  color: var(--color-danger, #c00);
}
</style> 

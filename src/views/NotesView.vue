<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
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

const filteredNotes = computed(() => {
  return noteStore.filteredNotes.filter(note => {
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

</script>

<template>
  <div class="view-list">
    <div class="view-header">
      <Button @click="addNote">+</Button>
    </div>

    <div v-if="filteredNotes.length === 0" class="view-empty">
      <p>No notes found.</p>
      <p v-if="!['any', 'none', null].includes(moduleStore.currentModuleFilter)">Try changing the module filter or create a new note.</p>
    </div>

    <div v-else class="notes-container">
      <div class="notes-filters">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search notes..."
            class="search-input"
          >
        </div>
      </div>

      <div class="view-grid">
        <NoteCard
          v-for="note in filteredNotes"
          :key="note.id"
          :note="note"
          :module-name="note.moduleId ? moduleStore.modules.find(m => m.id === note.moduleId)?.name : undefined"
          @view="note => $router.push(`/notes/${note.id}`)"
          @edit="note => { editingNote = note as Note; showEditor = true; }"
          @delete="handleDelete"
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
.notes-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.search-box {
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
</style> 

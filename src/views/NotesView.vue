<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import NoteEditor from '@/components/NoteEditor.vue';
import type { Note } from '@/types';

const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();

const showEditor = ref(false);
const editingNote = ref<Partial<Note> | null>(null);
const notes = ref<Note[]>([]);
const searchQuery = ref('');

const filteredNotes = computed(() => {
  return notes.value.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    const matchesModule = !moduleStore.currentModuleId || note.moduleId === moduleStore.currentModuleId;
    
    return matchesSearch && matchesModule;
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
    title: '',
    content: '',
    moduleId: moduleStore.currentModuleId,
    tags: []
  };
  showEditor.value = true;
};

const saveNote = async (note: Note) => {
  if (editingNote.value?.id) {
    await noteStore.updateNote(note.id, note);
  } else {
    await noteStore.createNote(note);
  }
  notes.value = noteStore.notes;
  showEditor.value = false;
  editingNote.value = null;
};

const cancelEdit = () => {
  showEditor.value = false;
  editingNote.value = null;
};

const handleDelete = async (note: Note) => {
  if (confirm(`Are you sure you want to delete the note "${note.title}"?`)) {
    await noteStore.deleteNote(note.id);
    notes.value = noteStore.notes;
  }
};

</script>

<template>
  <div class="notes-view">
    <div class="header">
      <h1>Notes</h1>
      <button @click="addNote" class="add-btn">
        Create Note
      </button>
    </div>

    <div v-if="filteredNotes.length === 0" class="empty-state">
      <p>No notes found.</p>
      <p v-if="moduleStore.currentModuleId">Try changing the module filter or create a new note.</p>
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

      <div class="notes-grid">
        <div
          v-for="note in filteredNotes"
          :key="note.id"
          class="note-card"
        >
          <div class="note-card-header">
            <h3>{{ note.title }}</h3>
            <button
              class="delete-btn"
              @click="handleDelete(note)"
              title="Delete note"
            >
              ×
            </button>
          </div>

          <div class="note-card-content">
            <p>{{ note.content }}</p>
          </div>

          <div class="note-card-footer">
            <span v-if="note.moduleId" class="module-badge">
              {{ moduleStore.modules.find(m => m.id === note.moduleId)?.name }}
            </span>
            <div class="tags">
              <span
                v-for="tag in note.tags"
                :key="tag"
                class="tag"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <router-link
            :to="`/notes/${note.id}`"
            class="view-link"
          >
            View Details
          </router-link>
        </div>
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
.notes-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 {
  margin: 0;
  color: var(--color-text);
}

.add-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  color: var(--color-text-light);
}

.notes-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

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

.module-filter {
  min-width: 200px;
}

.module-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 1rem;
  background: var(--color-background);
  color: var(--color-text);
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

.note-card {
  background: var(--color-background);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
}

.note-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.note-card-header h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.2rem;
}

.delete-btn {
  background: none;
  border: none;
  color: var(--color-text-light);
  font-size: 1.5rem;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  transition: color 0.2s;
}

.delete-btn:hover {
  color: var(--color-danger);
}

.note-card-content {
  color: var(--color-text);
  line-height: 1.5;
  flex: 1;
}

.note-card-content p {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.module-badge {
  background: var(--color-background-soft);
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius);
  font-size: 0.9rem;
  color: var(--color-text);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: var(--color-background-soft);
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius);
  font-size: 0.9rem;
  color: var(--color-text);
}

.view-link {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: var(--color-background-soft);
  color: var(--color-text);
  text-decoration: none;
  border-radius: var(--border-radius);
  text-align: center;
  transition: background-color 0.2s;
}

.view-link:hover {
  background: var(--color-background-mute);
}
</style> 

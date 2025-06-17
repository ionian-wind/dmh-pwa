<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import type { Note } from '@/types';
import NoteEditor from '@/components/NoteEditor.vue';
import { parseMarkdown } from '@/utils/markdownParser';

const route = useRoute();
const router = useRouter();
const noteStore = useNoteStore();
const moduleStore = useModuleStore();

const note = ref<Note | null>(null);
const isEditing = ref(false);
const parsedContent = ref('');

onMounted(async () => {
  const noteId = route.params.id as string;
  await Promise.all([
    noteStore.loadNotes(),
    moduleStore.loadModules()
  ]);
  
  note.value = noteStore.getNoteById(noteId);
  if (!note.value) {
    router.push('/notes');
  } else {
    parsedContent.value = parseMarkdown(note.value.content);
  }
});

const handleEdit = () => {
  isEditing.value = true;
};

const handleDelete = async () => {
  if (!note.value) return;
  
  if (confirm(`Are you sure you want to delete the note "${note.value.title}"?`)) {
    await noteStore.deleteNote(note.value.id);
    router.push('/notes');
  }
};

const handleSubmit = async (editedNote: Note) => {
  if (!note.value) return;
  
  await noteStore.updateNote(note.value.id, editedNote);
  note.value = editedNote;
  parsedContent.value = parseMarkdown(editedNote.content);
  isEditing.value = false;
};

const handleCancel = () => {
  isEditing.value = false;
};
</script>

<template>
  <div class="note-view">
    <div v-if="note" class="note-content">
      <div class="note-header">
        <div class="note-title">
          <h1>{{ note.title }}</h1>
          <div class="note-meta">
            <span v-if="note.moduleId" class="module-badge">
              {{ moduleStore.getModuleName(note.moduleId) }}
            </span>
            <span v-if="note.tags?.length" class="tags">
              <span v-for="tag in note.tags" :key="tag" class="tag">
                {{ tag }}
              </span>
            </span>
          </div>
        </div>
        <div class="note-actions">
          <button class="edit-btn" @click="handleEdit">
            Edit
          </button>
          <button class="delete-btn" @click="handleDelete">
            Delete
          </button>
        </div>
      </div>

      <div class="note-body markdown-content" v-html="parsedContent"></div>
    </div>

    <NoteEditor
      v-if="isEditing"
      :note="note"
      :is-open="isEditing"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
.note-view {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.note-content {
  background: var(--color-background);
  border-radius: var(--border-radius);
  padding: 2rem;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.note-title h1 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
}

.note-meta {
  display: flex;
  gap: 1rem;
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
  gap: 0.5rem;
}

.tag {
  background: var(--color-background-soft);
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius);
  font-size: 0.9rem;
  color: var(--color-text);
}

.note-actions {
  display: flex;
  gap: 1rem;
}

.edit-btn,
.delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.edit-btn {
  background: var(--color-primary);
  color: white;
}

.delete-btn {
  background: var(--color-danger);
  color: white;
}

.edit-btn:hover {
  background: var(--color-primary-dark);
}

.delete-btn:hover {
  background: var(--color-danger-dark);
}

.note-body {
  color: var(--color-text);
  line-height: 1.6;
}

.markdown-content {
  font-family: var(--font-family);
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 1.5em 0 0.5em;
  color: var(--color-text);
}

.markdown-content :deep(p) {
  margin: 1em 0;
}

.markdown-content :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 1em 0;
  padding-left: 2em;
}

.markdown-content :deep(li) {
  margin: 0.5em 0;
}

.markdown-content :deep(blockquote) {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 4px solid var(--color-primary);
  background: var(--color-background-soft);
}

.markdown-content :deep(code) {
  font-family: monospace;
  background: var(--color-background-soft);
  padding: 0.2em 0.4em;
  border-radius: var(--border-radius);
}

.markdown-content :deep(pre) {
  background: var(--color-background-soft);
  padding: 1em;
  border-radius: var(--border-radius);
  overflow-x: auto;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid var(--color-border);
  padding: 0.5em;
  text-align: left;
}

.markdown-content :deep(th) {
  background: var(--color-background-soft);
}

.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.markdown-content :deep(.internal-link) {
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
  padding: 0.25em 0.5em;
  border-radius: var(--border-radius);
  background: var(--color-background-soft);
  color: var(--color-text);
  text-decoration: none;
}

.markdown-content :deep(.internal-link:hover) {
  background: var(--color-background-mute);
  text-decoration: none;
}

.markdown-content :deep(.note-link) {
  border-left: 3px solid var(--color-primary);
}

.markdown-content :deep(.module-link) {
  border-left: 3px solid var(--color-success);
}

.markdown-content :deep(.party-link) {
  border-left: 3px solid var(--color-warning);
}

.markdown-content :deep(.monster-link) {
  border-left: 3px solid var(--color-danger);
}

.markdown-content :deep(.encounter-link) {
  border-left: 3px solid var(--color-info);
}
</style>

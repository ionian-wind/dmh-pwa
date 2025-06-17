<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import type { Note } from '@/types';
import NoteEditor from '@/components/NoteEditor.vue';
import { parseMarkdown } from '@/utils/markdownParser';
import BaseEntityView from '@/components/common/BaseEntityView.vue';

const route = useRoute();
const noteStore = useNoteStore();
const moduleStore = useModuleStore();

const note = ref<Note | null>(null);
const isEditing = ref(false);
const parsedContent = ref('');
const notFound = ref(false);

onMounted(async () => {
  const noteId = route.params.id as string;
  await Promise.all([
    noteStore.loadNotes(),
    moduleStore.loadModules()
  ]);
  
  note.value = noteStore.getNoteById(noteId);
  if (note.value) {
    parsedContent.value = parseMarkdown(note.value.content);
  } else {
    notFound.value = true;
  }
});

const handleEdit = () => {
  isEditing.value = true;
};

const handleDelete = async () => {
  if (!note.value) return;
  await noteStore.deleteNote(note.value.id);
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

// Computed properties for BaseEntityView
const noteTitle = computed(() => note.value?.title || '');
const noteSubtitle = computed(() => {
  if (!note.value) return '';
  
  const parts = [];
  if (note.value.moduleId) {
    parts.push(moduleStore.getModuleName(note.value.moduleId));
  }
  if (note.value.tags?.length) {
    parts.push(note.value.tags.join(', '));
  }
  return parts.join(' • ');
});
</script>

<template>
  <div class="note-view-container">
    <BaseEntityView
      :entity="note"
      entity-name="Note"
      list-route="/notes"
      :on-delete="handleDelete"
      :on-edit="handleEdit"
      :is-editing="isEditing"
      :title="noteTitle"
      :subtitle="noteSubtitle"
      :not-found="notFound"
    >
      <!-- Note Content -->
      <div v-if="note" class="note-body markdown-content" v-html="parsedContent"></div>

      <!-- Editor Modal -->
      <template #editor>
        <NoteEditor
          v-if="isEditing"
          :note="note"
          :is-open="isEditing"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </template>
    </BaseEntityView>
  </div>
</template>

<style scoped>
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

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 1em 0;
  padding-left: 2em;
}

.markdown-content :deep(li) {
  margin: 0.5em 0;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid var(--color-primary);
  padding-left: 1em;
  margin: 1em 0;
  color: var(--color-text-light);
}

.markdown-content :deep(code) {
  background: var(--color-background-soft);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
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
</style>

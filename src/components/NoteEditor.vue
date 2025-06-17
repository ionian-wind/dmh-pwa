<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import type { Note } from '@/types';
import ModuleSelector from './ModuleSelector.vue';
import TagSelector from './TagSelector.vue';
import EntityAutosuggest from './EntityAutosuggest.vue';
import NoteTypeSelector from './NoteTypeSelector.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import Button from '@/components/common/Button.vue';

const props = defineProps<{
  note: Note | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', note: Note): void;
  (e: 'cancel'): void;
}>();

const showAutosuggest = ref(false);
const autosuggestPosition = ref({ top: 0, left: 0 });
const cursorPosition = ref(0);

const editedNote = ref<Note>({
  createdAt: 0,
  updatedAt: 0,
  id: "",
  title: '',
  content: '',
  tags: [],
  moduleId: null,
  typeId: null
});

watch(() => props.note, (newNote) => {
  if (newNote) {
    editedNote.value = { 
      ...newNote,
      moduleId: newNote.moduleId ?? null,
      typeId: newNote.typeId ?? null
    };
  } else {
    editedNote.value = {
      createdAt: 0,
      updatedAt: 0,
      id: "",
      title: '',
      content: '',
      tags: [],
      moduleId: null,
      typeId: null
    };
  }
}, { immediate: true });

const handleContentInput = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement;
  cursorPosition.value = textarea.selectionStart;
  const text = textarea.value;
  const textBeforeCursor = text.substring(0, cursorPosition.value);
  const linkMatch = textBeforeCursor.match(/\[\[([^:]*):?([^\]]*)$/);

  if (linkMatch) {
    const rect = textarea.getBoundingClientRect();
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];
    const lineNumber = lines.length - 1;
    
    autosuggestPosition.value = {
      top: rect.top + (lineNumber * lineHeight),
      left: rect.left + (currentLine.length * 8) // Approximate character width
    };
    
    showAutosuggest.value = true;
  } else {
    showAutosuggest.value = false;
  }
};

const insertSuggestion = (suggestion: string) => {
  const textarea = document.querySelector('.content-editor') as HTMLTextAreaElement;
  if (!textarea) return;

  const cursorPosition = textarea.selectionStart;
  const text = textarea.value;
  const textBeforeCursor = text.substring(0, cursorPosition);
  const textAfterCursor = text.substring(cursorPosition);
  const lastAtIndex = textBeforeCursor.lastIndexOf('[[');
  
  if (lastAtIndex !== -1) {
    const newText = textBeforeCursor.substring(0, lastAtIndex) + suggestion + textAfterCursor;
    editedNote.value.content = newText;
    showAutosuggest.value = false;
    
    // Set cursor position after the inserted suggestion
    setTimeout(() => {
      const newPosition = lastAtIndex + suggestion.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  }
};

const handleSubmit = () => {
  if (!editedNote.value.title) {
    alert('Title is required');
    return;
  }
  emit('submit', editedNote.value);
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="note ? 'Edit Note' : 'Create Note'"
    :showSubmit="true"
    :showCancel="true"
    submitLabel="Save Note"
    cancelLabel="Cancel"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="form-section">
      <h3>Basic Information</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="title">Title</label>
          <input
            id="title"
            v-model="editedNote.title"
            type="text"
            required
            placeholder="Note title"
          >
        </div>
        <div class="form-group">
          <label for="module">Module</label>
          <ModuleSelector
            v-model="editedNote.moduleId"
            placeholder="No Module"
          />
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="type">Type</label>
          <NoteTypeSelector
            v-model="editedNote.typeId"
            placeholder="No Type"
          />
        </div>
        <div class="form-group">
          <label for="tags">Tags</label>
          <TagSelector
            v-model="editedNote.tags"
            placeholder="Add tags..."
          />
        </div>
      </div>
    </div>
    <div class="form-section">
      <h3>Content</h3>
      <div class="form-group">
        <textarea
          v-model="editedNote.content"
          @input="handleContentInput"
          rows="10"
          placeholder="Write your note here... Use [[type:]] to link entities"
          class="content-editor"
        ></textarea>
        <div class="formatting-help">
          <h4>Formatting Help</h4>
          <div class="help-grid">
            <div class="help-item">
              <span class="help-title">Internal Links</span>
              <code>[[type:id]]</code>
              <p>Link to other entities in your campaign:</p>
              <ul>
                <li><code>[[note:123]]</code> - Link to a note</li>
                <li><code>[[module:123]]</code> - Link to a module</li>
                <li><code>[[party:123]]</code> - Link to a party</li>
                <li><code>[[monster:123]]</code> - Link to a monster</li>
                <li><code>[[encounter:123]]</code> - Link to an encounter</li>
              </ul>
            </div>
            <div class="help-item">
              <span class="help-title">Markdown</span>
              <p>Basic markdown formatting:</p>
              <ul>
                <li><code>**bold**</code> - <strong>Bold text</strong></li>
                <li><code>*italic*</code> - <em>Italic text</em></li>
                <li><code># Heading</code> - Section heading</li>
                <li><code>- item</code> - Bullet list</li>
                <li><code>1. item</code> - Numbered list</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    <EntityAutosuggest
      v-if="showAutosuggest"
      :position="autosuggestPosition"
      :text="editedNote.content"
      :cursor-position="cursorPosition"
      @select="insertSuggestion"
      @cancel="showAutosuggest = false"
    />
  </BaseModal>
</template>

<style scoped>
.form-section {
  background: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: var(--border-radius);
}

.form-section h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: var(--color-text);
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 1rem;
}

.content-editor {
  resize: vertical;
  min-height: 200px;
  font-family: monospace;
  line-height: 1.5;
  white-space: pre-wrap;
}

.formatting-help {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--color-background-soft);
  border-radius: var(--border-radius);
  font-size: 0.9rem;
}

.formatting-help h4 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
  font-size: 1rem;
}

.help-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.help-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.help-title {
  font-weight: 500;
  color: var(--color-text);
}

.help-item code {
  background: var(--color-background);
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--color-text);
}

.help-item p {
  margin: 0;
  color: var(--color-text-light);
}

.help-item ul {
  margin: 0;
  padding-left: 1.5rem;
  color: var(--color-text-light);
}

.help-item li {
  margin: 0.25rem 0;
}

.help-item li code {
  padding: 0.1rem 0.3rem;
  font-size: 0.85rem;
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ModuleTreeNode, Note } from '@/types';

const props = defineProps<{
  node: ModuleTreeNode;
  notes: Note[];
  availableNotes: Note[];
  editingNodeId: string | null;
  newNodeTitle: string;
  selectedNoteId: string;
}>();
const emit = defineEmits<{
  (e: 'add-node', parent: ModuleTreeNode): void;
  (e: 'remove-node', nodeId: string): void;
  (e: 'start-edit-node', node: ModuleTreeNode): void;
  (e: 'save-edit-node', node: ModuleTreeNode): void;
  (e: 'cancel-edit-node'): void;
  (e: 'add-note-to-node', node: ModuleTreeNode, noteId: string): void;
  (e: 'remove-note-from-node', node: ModuleTreeNode, noteId: string): void;
  (e: 'handle-create-note', node: ModuleTreeNode): void;
  (e: 'handle-edit-note', noteId: string): void;
  (e: 'update:newNodeTitle', value: string): void;
  (e: 'update:selectedNoteId', value: string): void;
}>();

function onAddNode() {
  emit('add-node', props.node);
}
function onRemoveNode() {
  emit('remove-node', props.node.id);
}
function onStartEditNode() {
  emit('start-edit-node', props.node);
}
function onSaveEditNode() {
  emit('save-edit-node', props.node);
}
function onCancelEditNode() {
  emit('cancel-edit-node');
}
function onAddNoteToNode(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (!value) return;
  emit('add-note-to-node', props.node, value);
  emit('update:selectedNoteId', ''); // reset after adding
}
function onRemoveNoteFromNode(noteId: string) {
  emit('remove-note-from-node', props.node, noteId);
}
function onCreateNote() {
  emit('handle-create-note', props.node);
}
function onEditNote(noteId: string) {
  emit('handle-edit-note', noteId);
}
</script>

<template>
  <div class="tree-node">
    <div class="tree-node-header">
      <span v-if="editingNodeId !== node.id" @dblclick="onStartEditNode">{{ node.title || '(untitled)' }}</span>
      <input v-else :value="newNodeTitle" @input="e => { if (e.target && 'value' in e.target) $emit('update:newNodeTitle', (e.target as HTMLInputElement).value) }" @keyup.enter="onSaveEditNode" @blur="onSaveEditNode" />
      <button @click="onAddNode" title="Add child">+</button>
      <button @click="onRemoveNode" title="Delete">🗑️</button>
      <button v-if="editingNodeId !== node.id" @click="onStartEditNode" title="Rename">✏️</button>
      <button v-else @click="onCancelEditNode" title="Cancel">✖️</button>
      <button @click="onCreateNote" title="Create note in this node">📝 New Note</button>
    </div>
    <div class="tree-node-notes">
      <div v-for="noteId in node.notes" :key="noteId" class="tree-note">
        <span>{{ notes.find(n => n.id === noteId)?.title || noteId }}</span>
        <button @click="onRemoveNoteFromNode(noteId)" title="Remove">✖️</button>
        <button @click="onEditNote(noteId)" title="Edit note">✏️</button>
      </div>
      <select :value="selectedNoteId" @change="onAddNoteToNode">
        <option value="">Add note...</option>
        <option v-for="note in availableNotes" :key="note.id" :value="note.id">{{ note.title }}</option>
      </select>
    </div>
    <div class="tree-node-children">
      <ModuleTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :notes="notes"
        :availableNotes="availableNotes"
        :editingNodeId="editingNodeId"
        :newNodeTitle="newNodeTitle"
        :selectedNoteId="selectedNoteId"
        @add-node="$emit('add-node', $event)"
        @remove-node="$emit('remove-node', $event)"
        @start-edit-node="$emit('start-edit-node', $event)"
        @save-edit-node="$emit('save-edit-node', $event)"
        @cancel-edit-node="$emit('cancel-edit-node')"
        @add-note-to-node="$emit('add-note-to-node', $event[0], $event[1])"
        @remove-note-from-node="(...args) => $emit('remove-note-from-node', ...args)"
        @handle-create-note="$emit('handle-create-note', $event)"
        @handle-edit-note="$emit('handle-edit-note', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  background: #fafbfc;
}
.tree-node-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.tree-node-notes {
  margin-bottom: 0.5rem;
}
.tree-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.tree-node-children {
  margin-left: 1.5rem;
}
</style> 
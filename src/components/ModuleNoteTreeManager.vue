<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Module, ModuleTreeNode, Note } from '@/types';
import NoteEditor from './NoteEditor.vue';
import ModuleTreeNodeComponent from './ModuleTreeNode.vue';
import { useNoteStore } from '@/stores/notes';

const props = defineProps<{
  module: Module;
  notes: Note[];
}>();
const emit = defineEmits<{
  (e: 'save', tree: ModuleTreeNode[]): void;
}>();

const noteStore = useNoteStore();
const tree = ref<ModuleTreeNode[]>(props.module.noteTree ? JSON.parse(JSON.stringify(props.module.noteTree)) : []);
const editingNodeId = ref<string | null>(null);
const newNodeTitle = ref('');
const selectedNoteId = ref('');

// Note editor state
const showNoteEditor = ref(false);
const editingNote = ref<Note | null>(null);
const editingNode = ref<ModuleTreeNode | null>(null);

function addNode(parent?: ModuleTreeNode) {
  const id = crypto.randomUUID();
  const node: ModuleTreeNode = { id, title: 'New Node', notes: [], children: [] };
  if (parent) {
    parent.children = parent.children || [];
    parent.children.push(node);
  } else {
    tree.value.push(node);
  }
  editingNodeId.value = id;
  newNodeTitle.value = 'New Node';
}

function removeNode(targetId: string, nodes: ModuleTreeNode[] = tree.value) {
  const idx = nodes.findIndex(n => n.id === targetId);
  if (idx !== -1) {
    nodes.splice(idx, 1);
    return true;
  }
  for (const node of nodes) {
    if (node.children && removeNode(targetId, node.children)) return true;
  }
  return false;
}

function startEditNode(node: ModuleTreeNode) {
  editingNodeId.value = node.id;
  newNodeTitle.value = node.title;
}
function saveEditNode(node: ModuleTreeNode) {
  node.title = newNodeTitle.value.trim() || 'Untitled';
  editingNodeId.value = null;
}
function cancelEditNode() {
  editingNodeId.value = null;
}
function saveTree() {
  emit('save', JSON.parse(JSON.stringify(tree.value)));
}
function addNoteToNode(node: ModuleTreeNode, noteId: string) {
  if (!noteId) return;
  if (!node.notes.includes(noteId)) node.notes.push(noteId);
  selectedNoteId.value = '';
}
function removeNoteFromNode(node: ModuleTreeNode | undefined, noteId: string) {
  if (!node || !Array.isArray(node.notes)) {
    console.warn('removeNoteFromNode called with invalid node:', node, noteId);
    return;
  }
  node.notes = node.notes.filter(id => id !== noteId);
}
const availableNotes = computed(() => {
  // Notes not assigned to any node
  const assigned = new Set<string>();
  function collectNotes(nodes: ModuleTreeNode[]) {
    for (const n of nodes) {
      n.notes.forEach(id => assigned.add(id));
      if (n.children) collectNotes(n.children);
    }
  }
  collectNotes(tree.value);
  return props.notes.filter(n => !assigned.has(n.id));
});

function handleCreateNote(node: ModuleTreeNode) {
  editingNote.value = {
    id: '',
    title: '',
    content: '',
    typeId: null,
    tags: [],
    moduleId: props.module.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    parentId: undefined,
    metadata: undefined
  };
  editingNode.value = node;
  showNoteEditor.value = true;
}
function handleEditNote(noteId: string) {
  const note = props.notes.find(n => n.id === noteId);
  if (note) {
    editingNote.value = { ...note };
    editingNode.value = null;
    showNoteEditor.value = true;
  }
}
async function handleNoteEditorSubmit(note: Note) {
  let savedNote: Note;
  if (note.id) {
    await noteStore.updateNote(note.id, note);
    savedNote = { ...note };
  } else {
    savedNote = await noteStore.createNote(note);
    // Add to node if creating
    if (editingNode.value) {
      editingNode.value.notes.push(savedNote.id);
    }
  }
  showNoteEditor.value = false;
  editingNote.value = null;
  editingNode.value = null;
  // Optionally, emit save to refresh parent
  emit('save', JSON.parse(JSON.stringify(tree.value)));
}
function handleNoteEditorCancel() {
  showNoteEditor.value = false;
  editingNote.value = null;
  editingNode.value = null;
}
</script>

<template>
  <div class="note-tree-manager">
    <div class="tree-controls">
      <button @click="addNode()">Add Root Node</button>
      <button @click="saveTree">Save Tree</button>
    </div>
    <div class="tree-root">
      <ModuleTreeNodeComponent
        v-for="node in tree"
        :key="node.id"
        :node="node"
        :notes="props.notes"
        :availableNotes="availableNotes"
        :editingNodeId="editingNodeId"
        v-model:newNodeTitle="newNodeTitle"
        v-model:selectedNoteId="selectedNoteId"
        @add-node="addNode"
        @remove-node="removeNode"
        @start-edit-node="startEditNode"
        @save-edit-node="saveEditNode"
        @cancel-edit-node="cancelEditNode"
        @add-note-to-node="addNoteToNode"
        @remove-note-from-node="removeNoteFromNode"
        @handle-create-note="handleCreateNote"
        @handle-edit-note="handleEditNote"
      />
    </div>
    <NoteEditor
      v-if="showNoteEditor"
      :note="editingNote"
      :is-open="showNoteEditor"
      @submit="handleNoteEditorSubmit"
      @cancel="handleNoteEditorCancel"
    />
  </div>
</template>

<style scoped>
.note-tree-manager {
  padding: 1rem;
}
.tree-controls {
  margin-bottom: 1rem;
}
</style> 
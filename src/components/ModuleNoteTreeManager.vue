<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Module, ModuleTreeNode, Note } from '@/types';
import NoteEditor from './NoteEditor.vue';
import ModuleTreeNodeComponent from './ModuleTreeNode.vue';
import { useNoteStore } from '@/stores/notes';
import Draggable from 'vuedraggable';
import Button from '@/components/common/Button.vue';
import { nanoid } from 'nanoid';

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
const isRootDragOver = ref(false);

// Note editor state
const showNoteEditor = ref(false);
const editingNote = ref<Note | null>(null);
const editingNode = ref<ModuleTreeNode | null>(null);

function addNode(parent?: ModuleTreeNode) {
  const id = crypto.randomUUID();
  const node: ModuleTreeNode = { id, title: 'New Node', notes: [], children: [], anchorId: `section-${nanoid(6)}`, noteAnchors: {} };
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
  newNodeTitle.value = node.title || '';
}
function saveEditNode(node: ModuleTreeNode) {
  if (typeof node !== 'object' || !node.id) {
    console.error('Invalid node object in saveEditNode:', node);
    return;
  }
  const { node: realNode } = findNodeAndParent(node.id, tree.value);
  if (realNode) {
    realNode.title = (node.title && node.title.trim()) ? node.title.trim() : 'Untitled';
  }
  editingNodeId.value = null;
}
function cancelEditNode() {
  editingNodeId.value = null;
}
function saveTree() {
  emit('save', JSON.parse(JSON.stringify(tree.value)));
}
function addNoteToNode(nodeId: string, noteId: string) {
  if (!noteId) return;
  const { node: realNode } = findNodeAndParent(nodeId, tree.value);
  if (!realNode) {
    console.error('Node not found:', nodeId);
    return;
  }
  // Ensure notes array exists
  if (!realNode.notes) {
    realNode.notes = [];
  }
  // Ensure noteAnchors exists
  if (!realNode.noteAnchors) {
    realNode.noteAnchors = {};
  }
  // Add note if not already present
  if (!realNode.notes.includes(noteId)) {
    realNode.notes = [...realNode.notes, noteId];
    // Assign anchorId for this note
    realNode.noteAnchors[noteId] = `note-${nanoid(6)}`;
    // Force reactivity by updating the tree reference
    tree.value = [...tree.value];
    // Emit save to persist changes
    emit('save', JSON.parse(JSON.stringify(tree.value)));
  }
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
    title: `Note in ${node.title || node.id}`,
    content: '',
    typeId: null,
    tags: [],
    moduleId: props.module.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    parentId: node.id,
    metadata: {
      nodeId: node.id,
      nodePath: node.id // Using id as path since path doesn't exist
    }
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
const handleSaveNote = async (note: Note) => {
  let savedNote: Note;
  const isNew = !note.id;
  if (note.id) {
    savedNote = await noteStore.update(note.id, note);
  } else {
    savedNote = await noteStore.create(note);
  }
  // If a new note was created and editingNode is set, add the note to the node
  if (isNew && editingNode.value) {
    if (!editingNode.value.notes) editingNode.value.notes = [];
    if (!editingNode.value.noteAnchors) editingNode.value.noteAnchors = {};
    if (!editingNode.value.notes.includes(savedNote.id)) {
      editingNode.value.notes.push(savedNote.id);
      editingNode.value.noteAnchors[savedNote.id] = `note-${nanoid(6)}`;
      // Force reactivity by updating the tree reference
      tree.value = [...tree.value];
      emit('save', JSON.parse(JSON.stringify(tree.value)));
    }
  }
  showNoteEditor.value = false;
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
  editingNode.value = null;
  return savedNote;
};
function handleNoteEditorCancel() {
  showNoteEditor.value = false;
  editingNote.value = null;
  editingNode.value = null;
}

// Helper: Find node and its parent by id
function findNodeAndParent(nodeId: string, nodes: ModuleTreeNode[], parent: ModuleTreeNode | null = null): { node: ModuleTreeNode | null, parent: ModuleTreeNode | null, index: number } {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === nodeId) {
      return { node: nodes[i], parent, index: i };
    }
    if (nodes[i].children) {
      const result = findNodeAndParent(nodeId, nodes[i].children!, nodes[i]);
      if (result.node) return result;
    }
  }
  return { node: null, parent: null, index: -1 };
}

// Move node handler
function handleMoveNode({ nodeId, newParentId, newIndex }: { nodeId: string, newParentId: string | null, newIndex: number }) {
  if (nodeId === newParentId) return; // Prevent moving into itself
  
  // Prevent circular references
  if (newParentId && isDescendant(nodeId, newParentId)) {
    console.warn('Cannot move node: would create circular reference');
    return;
  }
  
  // Find node and remove from current parent
  const { node, parent, index } = findNodeAndParent(nodeId, tree.value);
  if (!node) return;
  if (parent) {
    parent.children = parent.children!.filter(n => n.id !== nodeId);
  } else {
    tree.value = tree.value.filter(n => n.id !== nodeId);
  }
  // Insert into new parent
  if (newParentId) {
    const { node: newParent } = findNodeAndParent(newParentId, tree.value);
    if (newParent) {
      newParent.children = newParent.children || [];
      newParent.children.splice(newIndex, 0, node);
    }
  } else {
    tree.value.splice(newIndex, 0, node);
  }
  emit('save', JSON.parse(JSON.stringify(tree.value)));
}

// Helper function to check if a node is a descendant of another node
function isDescendant(nodeId: string, potentialAncestorId: string): boolean {
  const { node: potentialAncestor } = findNodeAndParent(potentialAncestorId, tree.value);
  if (!potentialAncestor || !potentialAncestor.children) return false;
  
  for (const child of potentialAncestor.children) {
    if (child.id === nodeId) return true;
    if (isDescendant(nodeId, child.id)) return true;
  }
  
  return false;
}

// Move note handler
function handleMoveNote({ noteId, fromNodeId, toNodeId, newIndex }: { noteId: string | undefined, fromNodeId: string | undefined, toNodeId: string | undefined, newIndex: number }) {
  if (!noteId || !fromNodeId || !toNodeId) return;
  if (fromNodeId === toNodeId && newIndex < 0) return;
  // Find fromNode and toNode
  const { node: fromNode } = findNodeAndParent(fromNodeId, tree.value);
  const { node: toNode } = findNodeAndParent(toNodeId, tree.value);
  if (!fromNode || !toNode) return;
  // Remove from old
  fromNode.notes = fromNode.notes.filter(id => id !== noteId);
  // Insert into new
  toNode.notes.splice(newIndex, 0, noteId);
  emit('save', JSON.parse(JSON.stringify(tree.value)));
}

// Root drag handlers
function onRootDragOver(event: DragEvent) {
  event.preventDefault();
  isRootDragOver.value = true;
}

function onRootDragLeave(event: DragEvent) {
  // Only clear if we're leaving the root area entirely
  if (!(event.currentTarget as Element)?.contains(event.relatedTarget as Node)) {
    isRootDragOver.value = false;
  }
}

function onRootDrop(event: DragEvent) {
  event.preventDefault();
  isRootDragOver.value = false;
}

// Handle root node move
function onRootNodeMove(evt: any) {
  console.log('Root node move event:', evt);
  if (evt.added) {
    // Node was added to root level
    const nodeId = evt.added.element.id;
    const newIndex = evt.added.newIndex;
    
    // Find and remove the node from its current parent
    const { node, parent } = findNodeAndParent(nodeId, tree.value);
    if (!node) return;
    
    if (parent) {
      // Remove from parent
      parent.children = parent.children!.filter(n => n.id !== nodeId);
    } else {
      // Already at root level, just reorder
      tree.value = tree.value.filter(n => n.id !== nodeId);
    }
    
    // Add to root at the specified index
    tree.value.splice(newIndex, 0, node);
    emit('save', JSON.parse(JSON.stringify(tree.value)));
  } else if (evt.moved) {
    // Node was reordered at root level
    const nodeId = evt.moved.element.id;
    const newIndex = evt.moved.newIndex;
    
    // Find the node and reorder
    const nodeIndex = tree.value.findIndex(n => n.id === nodeId);
    if (nodeIndex !== -1) {
      const node = tree.value.splice(nodeIndex, 1)[0];
      tree.value.splice(newIndex, 0, node);
      emit('save', JSON.parse(JSON.stringify(tree.value)));
    }
  }
}
</script>

<template>
  <div class="note-tree-manager">
    <div class="tree-controls">
      <Button @click="addNode()" size="small" variant="link" title="Add Root Node">
        <i class="si si-plus"></i> Add Root Node
      </Button>
      <Button @click="saveTree" size="small" variant="link" title="Save Tree">
        <i class="si si-disk"></i> Save Tree
      </Button>
    </div>
    <div 
      class="tree-root"
      :class="{ 'root-drag-over': isRootDragOver }"
      @dragover="onRootDragOver"
      @dragleave="onRootDragLeave"
      @drop="onRootDrop"
    >
      <Draggable
        :list="tree"
        group="nodes"
        item-key="id"
        :clone="(node: ModuleTreeNode) => node"
        @add="onRootNodeMove"
        @remove="onRootNodeMove"
        @change="onRootNodeMove"
        class="root-nodes-container"
      >
        <template #item="{ element: node }">
          <ModuleTreeNodeComponent
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
            @create-note="handleCreateNote"
            @handle-edit-note="handleEditNote"
            @move-node="handleMoveNode"
            @move-note="handleMoveNote"
          />
        </template>
      </Draggable>
    </div>
    <NoteEditor
      v-if="showNoteEditor"
      :note="editingNote"
      :is-open="showNoteEditor"
      @submit="handleSaveNote"
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
  display: flex;
  gap: 1rem;
}

.tree-controls .si {
  margin-right: 0.5em;
  vertical-align: middle;
}

.tree-root {
  min-height: 100px;
  transition: all 0.2s ease;
}

.tree-root.root-drag-over {
  border-color: #007bff;
  background: #e3f2fd;
  box-shadow: 0 0 15px rgba(0, 123, 255, 0.2);
}

.root-nodes-container {
  min-height: 50px;
}

.root-nodes-container:empty::after {
  content: "Drop nodes here to make them root nodes";
  display: block;
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 2rem;
  border: 2px dashed #dee2e6;
  border-radius: 4px;
  background: white;
}

.tree-root.root-drag-over .root-nodes-container:empty::after {
  border-color: #007bff;
  background: rgba(0, 123, 255, 0.05);
  color: #007bff;
}
</style> 
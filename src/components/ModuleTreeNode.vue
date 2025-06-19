<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { ModuleTreeNode, Note } from '@/types';
import Draggable from 'vuedraggable';
import Button from '@/components/common/Button.vue';

const props = defineProps<{
  node: ModuleTreeNode;
  notes: Note[];
  availableNotes: Note[];
  editingNodeId: string | null;
}>();
const emit = defineEmits<{
  (e: 'add-node', parent: ModuleTreeNode): void;
  (e: 'remove-node', nodeId: string): void;
  (e: 'start-edit-node', node: ModuleTreeNode): void;
  (e: 'save-edit-node', node: ModuleTreeNode): void;
  (e: 'cancel-edit-node'): void;
  (e: 'add-note-to-node', nodeId: string, noteId: string): void;
  (e: 'remove-note-from-node', node: ModuleTreeNode, noteId: string): void;
  (e: 'create-note', node: ModuleTreeNode): void;
  (e: 'handle-edit-note', noteId: string): void;
  (e: 'move-node', payload: { nodeId: string, newParentId: string | null, newIndex: number }): void;
  (e: 'move-note', payload: { noteId: string, fromNodeId: string, toNodeId: string, newIndex: number }): void;
}>();

const localTitle = ref(props.node.title || '');
const localSelectedNoteId = ref('');
const isDragOver = ref(false);
const isEmptyChildren = computed(() => !props.node.children || props.node.children.length === 0);

watch(() => props.node.title, (val) => {
  localTitle.value = val || '';
});

function onAddNode() {
  emit('add-node', props.node);
}
function onRemoveNode() {
  emit('remove-node', props.node.id);
}
function onStartEditNode() {
  emit('start-edit-node', props.node);
  localTitle.value = props.node.title || '';
}
function onSaveEditNode() {
  if (typeof props.node !== 'object' || !props.node.id) {
    console.error('Invalid node object in onSaveEditNode:', props.node);
    return;
  }
  emit('save-edit-node', { ...props.node, title: localTitle.value });
}
function onCancelEditNode() {
  emit('cancel-edit-node');
}
function onAddNoteToNode(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (!value) return;
  emit('add-note-to-node', props.node.id, value);
  // Reset the select value
  localSelectedNoteId.value = '';
  (event.target as HTMLSelectElement).value = '';
}
function onRemoveNoteFromNode(noteId: string) {
  emit('remove-note-from-node', props.node, noteId);
}
function onCreateNote() {
  emit('create-note', props.node);
}
function onEditNote(noteId: string) {
  emit('handle-edit-note', noteId);
}

// Drag-and-drop handlers for nodes
function onNodeMove(evt: any) {
  console.log('Node move event:', evt);
  if (evt.added) {
    emit('move-node', {
      nodeId: evt.added.element.id,
      newParentId: props.node.id,
      newIndex: evt.added.newIndex
    });
  } else if (evt.moved) {
    emit('move-node', {
      nodeId: evt.moved.element.id,
      newParentId: props.node.id,
      newIndex: evt.moved.newIndex
    });
  }
}

// Drag-and-drop handlers for notes
function onNoteMove(evt: any) {
  console.log('Note move event:', evt);
  if (evt.added) {
    const fromNodeId = evt.from && evt.from.dataset ? evt.from.dataset.nodeId : props.node.id;
    emit('move-note', {
      noteId: evt.added.element,
      fromNodeId,
      toNodeId: props.node.id,
      newIndex: evt.added.newIndex
    });
  } else if (evt.moved) {
    emit('move-note', {
      noteId: evt.moved.element,
      fromNodeId: props.node.id,
      toNodeId: props.node.id,
      newIndex: evt.moved.newIndex
    });
  }
}

// Drag event handlers for visual feedback
function onNodeDragStart(evt: any) {
  isDragOver.value = false;
  if (evt.item && evt.item.__draggable_component__) {
    const nodeId = evt.item.__draggable_component__.element.id;
    onGlobalDragStart('node', nodeId);
  }
}

function onNodeDragOver() {
  isDragOver.value = true;
}

function onNodeDragLeave() {
  isDragOver.value = false;
}

function onNoteDragStart(evt: any) {
  isDragOver.value = false;
  if (evt.item && evt.item.__draggable_component__) {
    const noteId = evt.item.__draggable_component__.element;
    onGlobalDragStart('note', noteId);
  }
}

function onNoteDragOver() {
  isDragOver.value = true;
}

function onNoteDragLeave() {
  isDragOver.value = false;
}

// Global drag state management
let globalDragState = {
  isDragging: false,
  draggedType: null as 'node' | 'note' | null,
  draggedId: null as string | null
};

// Listen for global drag events
function onGlobalDragStart(type: 'node' | 'note', id: string) {
  console.log('Global drag start:', type, id);
  globalDragState.isDragging = true;
  globalDragState.draggedType = type;
  globalDragState.draggedId = id;
}

function onGlobalDragEnd() {
  console.log('Global drag end');
  globalDragState.isDragging = false;
  globalDragState.draggedType = null;
  globalDragState.draggedId = null;
  isDragOver.value = false;
}

// Check if this node can accept the dragged item
const canAcceptDrop = computed(() => {
  if (!globalDragState.isDragging) return false;
  
  // Don't allow dropping on itself
  if (globalDragState.draggedType === 'node' && globalDragState.draggedId === props.node.id) {
    return false;
  }
  
  // Don't allow dropping if the dragged node is a descendant of this node (prevents circular references)
  if (globalDragState.draggedType === 'node' && globalDragState.draggedId) {
    if (isDescendant(props.node, globalDragState.draggedId)) {
      return false;
    }
  }
  
  return true;
});

// Helper function to check if a node is a descendant of another node
function isDescendant(node: ModuleTreeNode, targetId: string): boolean {
  if (!node.children) return false;
  
  for (const child of node.children) {
    if (child.id === targetId) return true;
    if (isDescendant(child, targetId)) return true;
  }
  
  return false;
}

// Update drag over state based on global state
watch(() => globalDragState.isDragging, (isDragging) => {
  if (!isDragging) {
    isDragOver.value = false;
  }
});

// Add a local cropTitle function
function cropTitle(title: string, max = 25) {
  return title.length > max ? title.slice(0, max) + '…' : title;
}
</script>

<template>
  <div 
    class="tree-node" 
    :class="{ 
      'drag-over': isDragOver,
      'can-drop': canAcceptDrop && globalDragState.isDragging 
    }"
    @dragover.prevent="onNodeDragOver"
    @dragleave="onNodeDragLeave"
    @drop="onNodeDragLeave"
  >
    <div class="tree-node-header">
      <span class="drag-handle">⠿</span>
      <span class="tree-node-icon">📂</span>
      <span v-if="editingNodeId !== node.id" @dblclick="onStartEditNode" class="tree-node-title">{{ node.title || '(untitled)' }}</span>
      <input v-else v-model="localTitle" @keyup.enter="onSaveEditNode" @blur="onSaveEditNode" class="tree-node-input" />
      <div class="tree-node-actions">
        <Button @click="onAddNode" title="Add child" size="small" variant="secondary"><span class="icon">＋</span></Button>
        <Button v-if="editingNodeId !== node.id" @click="onStartEditNode" title="Rename" size="small" variant="secondary"><span class="icon">✏️</span></Button>
        <Button v-else @click="onCancelEditNode" title="Cancel" size="small" variant="secondary"><span class="icon">✖️</span></Button>
        <Button @click="onRemoveNode" title="Delete" size="small" variant="danger"><span class="icon">🗑️</span></Button>
        <Button @click="onCreateNote" title="Create note in this node" size="small" variant="secondary"><span class="icon">📝</span></Button>
      </div>
    </div>
    <div 
      class="tree-node-notes"
      @dragover.prevent="onNoteDragOver"
      @dragleave="onNoteDragLeave"
      @drop="onNoteDragLeave"
    >
      <Draggable
        :list="node.notes"
        group="notes"
        item-key="id"
        :clone="(noteId: string) => noteId"
        @change="onNoteMove"
        :data-node-id="node.id"
        v-bind="{ __nodeId: node.id }"
        @start="onNoteDragStart"
        @end="onGlobalDragEnd"
      >
        <template #item="{ element: noteId, index }">
          <div class="tree-note">
            <span class="drag-handle">⠿</span>
            <div class="note-content">
              <div class="note-title">{{ cropTitle(notes.find(n => n.id === noteId)?.title || noteId) }}</div>
            </div>
            <div class="tree-note-actions">
              <Button @click="onEditNote(noteId)" title="Edit note" size="small" variant="secondary"><span class="icon">✏️</span></Button>
              <Button @click="onRemoveNoteFromNode(noteId)" title="Remove" size="small" variant="danger"><span class="icon">🗑️</span></Button>
            </div>
          </div>
        </template>
      </Draggable>
    </div>
    <div class="tree-note-select">
      <select :value="localSelectedNoteId" @change="onAddNoteToNode">
        <option value="">Add note...</option>
        <option v-for="note in availableNotes" :key="note.id" :value="note.id">{{ note.title }}</option>
      </select>
    </div>
    <div 
      :class="['tree-node-children', { 'empty-children': isEmptyChildren }]"
      @dragover.prevent="onNodeDragOver"
      @dragleave="onNodeDragLeave"
      @drop="onNodeDragLeave"
    >
      <Draggable
        :list="node.children"
        group="nodes"
        item-key="id"
        :clone="(node: ModuleTreeNode) => node"
        @change="onNodeMove"
        @start="onNodeDragStart"
        @end="onGlobalDragEnd"
      >
        <template #item="{ element: child }">
          <div class="tree-node-connector">
            <ModuleTreeNode
              :node="(child as any)"
              :notes="notes"
              :availableNotes="availableNotes"
              :editingNodeId="editingNodeId"
              @add-node="$emit('add-node', $event)"
              @remove-node="$emit('remove-node', $event)"
              @start-edit-node="$emit('start-edit-node', $event)"
              @save-edit-node="$emit('save-edit-node', $event)"
              @cancel-edit-node="$emit('cancel-edit-node')"
              @add-note-to-node="(nodeId, noteId) => $emit('add-note-to-node', nodeId, noteId)"
              @remove-note-from-node="(...args) => $emit('remove-note-from-node', ...args)"
              @create-note="$emit('create-note', $event)"
              @handle-edit-note="$emit('handle-edit-note', $event)"
              @move-node="$emit('move-node', $event)"
              @move-note="$emit('move-note', $event)"
            />
          </div>
        </template>
      </Draggable>
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  position: relative;
  padding: 0.2rem 0.5rem 0rem 0.5rem;
  transition: all 0.2s ease;
}

.tree-node-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.3rem;
  position: relative;
  z-index: 1;
  background: #fafdff;
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  min-height: 32px;
}

.tree-node-icon {
  font-size: 1.1em;
  margin-right: 0.2em;
  opacity: 0.7;
}

.tree-node-title {
  font-weight: 600;
  color: #2c3e50;
  flex: 1;
  cursor: pointer;
  padding: 0.1em 0.2em;
  border-radius: 4px;
  transition: background 0.2s;
}

.tree-node-title:hover {
  background: #e3f2fd;
}

.tree-node-input {
  flex: 1;
  font-size: 1em;
  padding: 0.1em 0.2em;
  border-radius: 4px;
  border: 1px solid #b0b8c1;
}

.tree-node-actions {
  display: flex;
  gap: 0.2rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.tree-node-header:hover .tree-node-actions,
.tree-node-header:focus-within .tree-node-actions {
  opacity: 1;
  pointer-events: auto;
}

.tree-node-actions button {
  background: none;
  border: none;
  padding: 0.1em 0.3em;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  color: #888;
  transition: background 0.2s, color 0.2s;
}

.tree-node-actions button:hover {
  background: #e3f2fd;
  color: #1976d2;
}

.icon {
  font-size: 1.1em;
}

.tree-node-notes, .tree-note-select {
  border: none;
  padding: 0.1rem 0.2rem 0.1rem 1.5rem;
  transition: all 0.2s ease;
  position: relative;
}

.tree-note {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-bottom: 0.15rem;
  padding: 0.15rem 0.3rem;
  background: #fff;
  border-radius: 3px;
  box-shadow: 0 1px 2px rgba(30, 46, 78, 0.03);
  transition: all 0.2s ease;
  position: relative;
}

.tree-note-icon {
  font-size: 1em;
  margin-left: 0.2em;
  opacity: 0.6;
}

.tree-note-actions {
  display: flex;
  gap: 0.1rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  align-items: center;
  margin-left: auto;
}

.tree-note:hover .tree-note-actions,
.tree-note:focus-within .tree-note-actions {
  opacity: 1;
  pointer-events: auto;
}

.tree-note-actions button {
  background: none;
  border: none;
  padding: 0.1em 0.2em;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  color: #888;
  transition: background 0.2s, color 0.2s;
}

.tree-note-actions button:hover {
  background: #e3f2fd;
  color: #1976d2;
}

.tree-node-children {
  margin-left: 1rem;
  min-height: 20px;
  transition: all 0.2s ease;
  position: relative;
}
.tree-node-children.empty-children {
  min-height: 0;
  height: 0;
  padding: 0;
  border: none;
}

.tree-node-connector {
  position: relative;
}

.drag-handle {
  cursor: grab;
  user-select: none;
  margin-left: 0.2rem;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.drag-handle:hover {
  opacity: 1;
}

.tree-node.drag-over .drag-handle {
  opacity: 1;
  color: #007bff;
}

.tree-note-select select {
  border-radius: 4px;
  border: 1px solid #b0b8c1;
  font-size: 0.95em;
  width: 100%
}
</style> 
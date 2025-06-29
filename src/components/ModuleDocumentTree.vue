<script setup lang="ts">
import type { ModuleTreeNode, Note } from '@/types';
import { computed, ref, watch, onMounted } from 'vue';
import { Tree } from '@/components/Tree';
import { useNoteStore } from '@/stores/notes';
import { deepUnwrap } from '@/utils/deepUnwrap';
import Button from '@/components/common/Button.vue';
import NoteEditor from '@/components/NoteEditor.vue';

// Extended tree node type that includes note data for the Tree component
interface ExtendedTreeNode {
  id: string; // noteId
  noteId: string;
  title: string;
  children?: ExtendedTreeNode[];
}

const props = defineProps<{
  moduleId: string;
  noteTree: ModuleTreeNode[];
}>();

const emit = defineEmits<{
  (e: 'update:noteTree', value: ModuleTreeNode[]): void;
}>();

const noteStore = useNoteStore();

// Get notes for this module that are hidden (document tree notes)
const notes = computed(() => 
  noteStore.items.filter(note => note.moduleId === props.moduleId && note.hidden === true)
);

// Convert ModuleTreeNode[] to ExtendedTreeNode[] for the Tree component
function convertToExtendedTree(nodes: ModuleTreeNode[], notes: Note[]): ExtendedTreeNode[] {
  return nodes.map(node => {
    const note = notes.find(n => n.id === node.noteId);
    return {
      id: node.noteId, // Tree component needs this as the unique identifier
      noteId: node.noteId,
      title: note?.title || 'Untitled',
      children: node.children ? convertToExtendedTree(node.children, notes) : undefined
    };
  });
}

// Convert ExtendedTreeNode[] back to ModuleTreeNode[]
function convertToModuleTree(nodes: ExtendedTreeNode[]): ModuleTreeNode[] {
  return nodes.map(node => ({
    noteId: node.noteId,
    children: node.children ? convertToModuleTree(node.children) : undefined
  }));
}

const localTree = ref<ExtendedTreeNode[]>(convertToExtendedTree(deepUnwrap(props.noteTree), deepUnwrap(notes.value)));
const localNotes = ref<Note[]>(deepUnwrap(notes.value));

// Watch for prop changes and update local state
watch(
  () => [props.noteTree, notes.value],
  () => {
    localTree.value = convertToExtendedTree(deepUnwrap(props.noteTree), deepUnwrap(notes.value));
    localNotes.value = deepUnwrap(notes.value);
  },
  { deep: true }
);

// Note editor state
const showEditor = ref(false);
const editingNote = ref<Note | null>(null);
const editingNode = ref<ExtendedTreeNode | null>(null);
const isAddMode = ref(false);
const addParentNode = ref<ExtendedTreeNode | null>(null);

// Patch: Watch for drag-and-drop or user changes
watch(
  localTree,
  (newVal) => {
    // Only emit if the new localTree is different from the prop noteTree
    const newTree = JSON.stringify(convertToModuleTree(newVal));
    const propTree = JSON.stringify(props.noteTree);
    if (newTree !== propTree) {
      emit('update:noteTree', convertToModuleTree(newVal));
    }
  },
  { deep: true }
);

async function openAddNode(node: ExtendedTreeNode | null) {
  editingNote.value = {
    id: '',
    title: '',
    content: '',
    tags: [],
    moduleId: props.moduleId,
    typeId: null,
    hidden: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  isAddMode.value = true;
  addParentNode.value = node;
  showEditor.value = true;
}

async function openAddRootNote() {
  await openAddNode(null);
}

async function openEdit(node: ExtendedTreeNode) {
  const note = localNotes.value.find(n => n.id === node.noteId);
  if (!note) return;
  editingNote.value = { ...note };
  editingNode.value = node;
  isAddMode.value = false;
  showEditor.value = true;
}

async function handleSubmit(note: Note) {
  if (isAddMode.value) {
    // Persist note creation
    const { id, createdAt, updatedAt, ...rest } = note;
    const newNote = await noteStore.create(rest);
    localNotes.value.push({ ...newNote });
    const newNode: ExtendedTreeNode = { 
      id: newNote.id, 
      noteId: newNote.id, 
      title: newNote.title || 'Untitled',
      children: [] 
    };
    
    if (addParentNode.value) {
      // Add as child
      const addChildRecursive = (nodes: ExtendedTreeNode[]): boolean => {
        for (const n of nodes) {
          if (n.id === addParentNode.value!.id) {
            n.children = n.children || [];
            n.children.push(newNode);
            return true;
          }
          if (n.children && addChildRecursive(n.children)) return true;
        }
        return false;
      };
      addChildRecursive(localTree.value);
    } else {
      // Add as root
      localTree.value.push(newNode);
    }
    // The watch on localTree will handle emitting the update
  } else if (editingNode.value) {
    // Edit existing note
    const idx = localNotes.value.findIndex(n => n.id === note.id);
    if (idx !== -1) {
      localNotes.value[idx] = { ...note };
      // Update the tree node title
      const updateTitleRecursive = (nodes: ExtendedTreeNode[]): boolean => {
        for (const n of nodes) {
          if (n.noteId === note.id) {
            n.title = note.title || 'Untitled';
            return true;
          }
          if (n.children && updateTitleRecursive(n.children)) return true;
        }
        return false;
      };
      updateTitleRecursive(localTree.value);
    }
    await noteStore.update(note.id, note);
    // The watch on localTree will handle emitting the update
  }
  
  showEditor.value = false;
  editingNote.value = null;
  editingNode.value = null;
  isAddMode.value = false;
  addParentNode.value = null;
}

function handleCancel() {
  showEditor.value = false;
  editingNote.value = null;
  editingNode.value = null;
  isAddMode.value = false;
  addParentNode.value = null;
}

async function handleRemove(node: ExtendedTreeNode) {
  // Remove node and all descendants
  async function removeRecursive(nodes: ExtendedTreeNode[]): Promise<ExtendedTreeNode[]> {
    const result: ExtendedTreeNode[] = [];
    for (const n of nodes) {
      if (n.id === node.id) {
        // Remove note and all children recursively
        await removeNotesRecursive(n);
        continue;
      }
      if (n.children) n.children = await removeRecursive(n.children);
      result.push(n);
    }
    return result;
  }
  
  async function removeNotesRecursive(n: ExtendedTreeNode) {
    // Remove note
    const idx = localNotes.value.findIndex(note => note.id === n.noteId);
    if (idx !== -1) {
      await noteStore.remove(n.noteId);
      localNotes.value.splice(idx, 1);
    }
    // Remove children
    if (n.children) for (const child of n.children) await removeNotesRecursive(child);
  }
  
  localTree.value = await removeRecursive(localTree.value);
  // The watch on localTree will handle emitting the update
}

onMounted(async () => {
  await noteStore.load();
});
</script>

<template>
  <div class="module-document-tree">
    <div class="tree-controls">
      <slot name="add-root">
        <Button size="small" variant="light" @click="openAddRootNote"><span class="si si-plus" /></Button>
      </slot>
    </div>
    
    <div class="tree-container">
      <Tree
        :data="localTree"
        item-key="id"
        nesting-key="children"
        v-slot="{ item }"
      >
        <div class="module-tree-item-content">
          <span class="module-tree-item-title">{{ item.title }}</span>
          <div class="module-tree-item-controls">
            <Button size="small" variant="light" @click="openAddNode(item)"><span class="si si-plus" /></Button>
            <Button size="small" variant="light" @click="openEdit(item)"><span  class="si si-pencil" /></Button>
            <Button size="small" variant="light" @click="handleRemove(item)"><span  class="si si-x" /></Button>
          </div>
        </div>
      </Tree>
    </div>
    
    <NoteEditor
      v-if="showEditor"
      :note="editingNote"
      :is-open="showEditor"
      :hide-module-selector="true"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
/* Import Tree component styles */
@import '@/components/Tree/styles.css';

.module-document-tree {
  padding: 1rem;
}

.tree-controls {
  margin-bottom: 1rem;
}

.tree-container {
  min-height: 2rem;
  border-radius: 6px;
  transition: background 0.2s;
}

.module-tree-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
  width: 100%;
}

.module-tree-item-content:hover {
  background: var(--color-primary-alpha, #e0e7ff);
}

.module-tree-item-title {
  font-weight: 500;
  flex: 1;
  font-size: 14px;
}

.module-tree-item-controls {
  display: flex;
  gap: 0.25rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.module-tree-item-content:hover .module-tree-item-controls {
  opacity: 1;
}
</style>

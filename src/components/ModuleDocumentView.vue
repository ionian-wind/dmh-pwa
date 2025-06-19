<script setup lang="ts">
import type { ModuleTreeNode, Note } from '@/types';
import { ref, onMounted, computed, watch } from 'vue';
import Markdown from '@/components/common/Markdown.vue';

const props = defineProps<{
  noteTree: ModuleTreeNode[];
  notes: Note[];
}>();

function findNotes(noteIds: string[]): Note[] {
  return noteIds
    .map(id => props.notes.find(n => n.id === id))
    .filter((n): n is Note => !!n);
}

function buildMarkdown(nodes: ModuleTreeNode[], depth = 1): string {
  let md = '';
  for (const node of nodes) {
    if (node.title) {
      md += `${'#'.repeat(depth + 1)} ${node.title} ${node.anchorId ? ` {#${node.anchorId}}` : ''}\n\n`;
    }
    const nodeNotes = findNotes(node.notes);
    for (const note of nodeNotes) {
      if (note.title) {
        md += `${'#'.repeat(depth + 2)} ${note.title}${node.noteAnchors && node.noteAnchors[note.id] ? ` {#${node.noteAnchors[note.id]}}` : ''}\n\n`;
      }
      if (note.content) {
        md += note.content + '\n\n';
      }
    }
    if (node.children && node.children.length > 0) {
      md += buildMarkdown(node.children, depth + 1);
    }
  }
  return md;
}

const combinedMarkdown = computed(() => buildMarkdown(props.noteTree));

const contentRef = ref<HTMLElement | null>(null);

// Build a flat map of noteId to anchorId for all notes in the module tree
function buildNoteAnchorMap(nodes: ModuleTreeNode[]): Record<string, string> {
  const map: Record<string, string> = {};
  function traverse(nodes: ModuleTreeNode[]) {
    for (const node of nodes) {
      if (node.noteAnchors) {
        for (const [noteId, anchorId] of Object.entries(node.noteAnchors)) {
          map[noteId] = anchorId;
        }
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  }
  traverse(nodes);
  return map;
}

const noteAnchorMap = computed(() => buildNoteAnchorMap(props.noteTree));

const rootEl = ref<HTMLElement | null>(null);

onMounted(() => {
  if (rootEl.value) {
    (rootEl.value as any).noteAnchorMap = noteAnchorMap.value;
  }
});

watch(noteAnchorMap, (newMap) => {
  if (rootEl.value) {
    (rootEl.value as any).noteAnchorMap = newMap;
  }
});
</script>

<template>
  <div class="module-document-view" ref="rootEl">
    <div class="document-markdown" ref="contentRef">
      <Markdown :content="combinedMarkdown" :anchorMap="noteAnchorMap" :enableMentionModal="true" />
    </div>
  </div>
</template>

<style scoped>
.module-document-view {
  padding: 0;
}
.document-markdown {
  color: var(--color-text);
  line-height: 1.6;
}
</style> 

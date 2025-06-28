<script setup lang="ts">
import type { ModuleTreeNode, Note } from '@/types';
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import Markdown from '@/components/common/Markdown.vue';
import { useBookmarkStore } from '@/stores/bookmarks';
import Button from '@/components/common/Button.vue';

interface TOCItem {
  id: string;
  title: string;
  level: number;
  anchorId: string;
}

const props = defineProps<{
  noteTree: ModuleTreeNode[];
  notes: Note[];
}>();

const emit = defineEmits<{
  (e: 'toc-update', toc: TOCItem[]): void;
}>();

const bookmarkStore = useBookmarkStore();

function findNotes(noteIds: string[]): Note[] {
  return noteIds
    .map(id => props.notes.find(n => n.id === id))
    .filter((n): n is Note => !!n);
}

function buildMarkdown(nodes: ModuleTreeNode[], depth = 1): { markdown: string; toc: TOCItem[] } {
  let md = '';
  const toc: TOCItem[] = [];
  
  for (const node of nodes) {
    if (node.title) {
      const anchorId = node.anchorId || `section-${node.id}`;
      md += `${'#'.repeat(depth + 1)} ${node.title} {#${anchorId}}\n\n`;
      
      toc.push({
        id: node.id,
        title: node.title,
        level: depth + 1,
        anchorId
      });
    }
    
    const nodeNotes = findNotes(node.notes);
    for (const note of nodeNotes) {
      if (note.title) {
        const anchorId = node.noteAnchors && node.noteAnchors[note.id] 
          ? node.noteAnchors[note.id] 
          : `note-${note.id}`;
        md += `${'#'.repeat(depth + 2)} ${note.title} {#${anchorId}}\n\n`;
        
        toc.push({
          id: note.id,
          title: note.title,
          level: depth + 2,
          anchorId
        });
      }
      if (note.content) {
        md += note.content + '\n\n';
      }
    }
    
    if (node.children && node.children.length > 0) {
      const childResult = buildMarkdown(node.children, depth + 1);
      md += childResult.markdown;
      toc.push(...childResult.toc);
    }
  }
  
  return { markdown: md, toc };
}

const combinedMarkdown = computed(() => buildMarkdown(props.noteTree));

// Emit TOC when it changes
watch(combinedMarkdown, (result) => {
  emit('toc-update', result.toc);
}, { immediate: true });

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

// Helper to get moduleId from the root noteTree (assume all nodes share the same moduleId)
const moduleId = computed(() => {
  // Try to get from the first note in the tree
  const firstNoteId = props.noteTree[0]?.notes?.[0];
  if (firstNoteId) {
    const note = props.notes.find(n => n.id === firstNoteId);
    return note?.moduleId || null;
  }
  return null;
});

// After markdown is rendered, inject bookmark buttons next to headings
function injectBookmarkButtons() {
  if (!contentRef.value || !moduleId.value) return;
  // Remove old buttons
  contentRef.value.querySelectorAll('.bookmark-btn').forEach(el => el.remove());
  // For each heading with id
  contentRef.value.querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]').forEach(heading => {
    const anchorId = heading.id;
    const title = heading.textContent || '';
    // Only proceed if moduleId is a string
    if (!moduleId.value) return;
    const modId = moduleId.value as string;
    const isBookmarked = bookmarkStore.isBookmarked(modId, anchorId);
    // Create button
    const btn = document.createElement('button');
    btn.className = 'bookmark-btn';
    if (isBookmarked) btn.classList.add('bookmarked', 'visible');
    btn.type = 'button';
    btn.title = isBookmarked ? 'Remove bookmark' : 'Add bookmark';
    btn.innerHTML = '<i class="si si-bookmark"></i>';
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!moduleId.value) return;
      const modId = moduleId.value as string;
      if (bookmarkStore.isBookmarked(modId, anchorId)) {
        bookmarkStore.removeBookmark(modId, anchorId);
      } else {
        bookmarkStore.addBookmark(modId, anchorId, title);
      }
      // Re-inject after state change
      setTimeout(injectBookmarkButtons, 100);
    };
    // Show on hover or always if bookmarked
    heading.addEventListener('mouseenter', () => {
      btn.classList.add('visible');
    });
    heading.addEventListener('mouseleave', () => {
      if (!btn.classList.contains('bookmarked')) btn.classList.remove('visible');
    });
    if (isBookmarked) btn.classList.add('visible');
    else btn.classList.remove('visible');
    (heading as HTMLElement).style.position = 'relative';
    heading.insertBefore(btn, heading.firstChild);
  });
}

onMounted(() => {
  if (rootEl.value) {
    (rootEl.value as any).noteAnchorMap = noteAnchorMap.value;
  }
  watch(() => [props.noteTree, props.notes, bookmarkStore.items], () => {
    nextTick(() => injectBookmarkButtons());
  }, { immediate: true, deep: true });
});

watch(noteAnchorMap, (newMap) => {
  if (rootEl.value) {
    (rootEl.value as any).noteAnchorMap = newMap;
  }
});

// Handle clicking on heading elements to copy anchor links
function handleHeadingClick(event: Event) {
  const target = event.target as HTMLElement;
  if (target && target.tagName && /^H[1-6]$/.test(target.tagName)) {
    const id = target.id;
    if (id) {
      const url = `${window.location.origin}${window.location.pathname}#${id}`;
      navigator.clipboard.writeText(url).then(() => {
        // Optional: Show a brief visual feedback
        const originalColor = target.style.color;
        target.style.color = 'var(--color-primary, #007bff)';
        setTimeout(() => {
          target.style.color = originalColor;
        }, 500);
      }).catch(err => {
        console.error('Failed to copy link:', err);
      });
    }
  }
}
</script>

<template>
  <div class="module-document-view" ref="rootEl">
    <div class="document-markdown" ref="contentRef" @click="handleHeadingClick">
      <Markdown :content="combinedMarkdown.markdown" :anchorMap="noteAnchorMap" :enableMentionModal="true" />
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

/* Add cursor pointer to all heading elements */
.document-markdown :deep(h1),
.document-markdown :deep(h2),
.document-markdown :deep(h3),
.document-markdown :deep(h4),
.document-markdown :deep(h5),
.document-markdown :deep(h6) {
  cursor: pointer;
  position: relative;
}

/* Show '#' before heading elements on hover */
.document-markdown :deep(h1):hover::before,
.document-markdown :deep(h2):hover::before,
.document-markdown :deep(h3):hover::before,
.document-markdown :deep(h4):hover::before,
.document-markdown :deep(h5):hover::before,
.document-markdown :deep(h6):hover::before {
  content: '#';
  position: absolute;
  left: -0.95em;
  top: calc(50% - 13px);
  color: var(--color-primary, #007bff);
  font-weight: bold;
  opacity: 0.7;
}
</style> 

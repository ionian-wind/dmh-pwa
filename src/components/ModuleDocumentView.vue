<script setup lang="ts">
import type { ModuleTreeNode, Note } from '@/types';
import { ref, onMounted, computed, watch, nextTick, shallowRef } from 'vue';
import Markdown from '@/components/common/Markdown.vue';
import { useBookmarkStore } from '@/stores/bookmarks';
import { useNoteStore } from '@/stores/notes';
// @ts-ignore: no types for vue-virtual-scroller
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';

interface TOCItem {
  id: string;
  title: string;
  level: number;
  anchorId: string;
}

interface DocumentChunk {
  id: string;
  title: string;
  content: string;
  level: number;
  noteId: string;
}

const props = defineProps<{
  moduleId: string;
  noteTree: ModuleTreeNode[];
}>();

const emit = defineEmits<{
  (e: 'toc-update', toc: TOCItem[]): void;
}>();

const bookmarkStore = useBookmarkStore();
const noteStore = useNoteStore();

const chunks = shallowRef<DocumentChunk[]>([]);
const tocItems = shallowRef<TOCItem[]>([]);
const isLoading = ref(false);

// Get notes for this module that are hidden (document tree notes)
const notes = computed(() => 
  noteStore.items.filter(note => note.moduleId === props.moduleId && note.hidden === true)
);

function buildChunks(nodes: ModuleTreeNode[], depth = 1): DocumentChunk[] {
  const result: DocumentChunk[] = [];
  for (const node of nodes) {
    // Find the note for this node
    const note = notes.value.find(n => n.id === node.noteId);

    console.log(note);

    if (note) {
      result.push({
        id: `note-${note.id}`,
        title: note.title,
        content: `${'#'.repeat(depth + 1)} ${note.title} {#${note.id}}\n\n${note.content || ''}\n\n`,
        level: depth + 1,
        noteId: note.id
      });
    }
    if (node.children && node.children.length > 0) {
      const childChunks = buildChunks(node.children, depth + 1);
      result.push(...childChunks);
    }
  }
  return result;
}

function buildTOC(chunks: DocumentChunk[]): TOCItem[] {
  return chunks
    .map(chunk => ({
      id: chunk.id,
      title: chunk.title,
      level: chunk.level,
      anchorId: chunk.id
    }));
}

function initializeDocument() {
  isLoading.value = true;
  setTimeout(() => {
    chunks.value = buildChunks(props.noteTree);
    tocItems.value = buildTOC(chunks.value);
    emit('toc-update', tocItems.value);
    isLoading.value = false;
  }, 0);
}

function buildNoteAnchorMap(nodes: ModuleTreeNode[]): Record<string, string> {
  const map: Record<string, string> = {};
  function traverse(nodes: ModuleTreeNode[]) {
    for (const node of nodes) {
      // Use note ID as anchor
      map[node.noteId] = node.noteId;
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
const moduleId = props.moduleId;

function injectBookmarkButtons() {
  if (!rootEl.value || !moduleId) return;
  rootEl.value.querySelectorAll('.bookmark-btn').forEach(el => el.remove());
  rootEl.value.querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]').forEach(heading => {
    const anchorId = heading.id;
    const title = heading.textContent || '';
    if (!moduleId) return;
    const modId = moduleId;
    const isBookmarked = bookmarkStore.isBookmarked(modId, anchorId);
    const btn = document.createElement('button');
    btn.className = 'bookmark-btn';
    if (isBookmarked) btn.classList.add('bookmarked', 'visible');
    btn.type = 'button';
    btn.title = isBookmarked ? 'Remove bookmark' : 'Add bookmark';
    btn.innerHTML = '<i class="si si-bookmark"></i>';
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!moduleId) return;
      const modId = moduleId;
      if (bookmarkStore.isBookmarked(modId, anchorId)) {
        bookmarkStore.removeBookmark(modId, anchorId);
      } else {
        bookmarkStore.addBookmark(modId, anchorId, title);
      }
      setTimeout(injectBookmarkButtons, 100);
    };
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

onMounted(async () => {
  await noteStore.load();
  if (rootEl.value) {
    (rootEl.value as any).noteAnchorMap = noteAnchorMap.value;
  }
  initializeDocument();
  window.addEventListener('scroll', () => {
    nextTick(() => injectBookmarkButtons());
  }, { passive: true });
  watch(() => [props.noteTree, notes.value, bookmarkStore.items], () => {
    nextTick(() => injectBookmarkButtons());
  }, { immediate: true, deep: true });
});

function handleHeadingClick(event: Event) {
  const target = event.target as HTMLElement;
  if (target && target.tagName && /^H[1-6]$/.test(target.tagName)) {
    const id = target.id;
    if (id) {
      const url = `${window.location.origin}${window.location.pathname}#${id}`;
      navigator.clipboard.writeText(url).then(() => {
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
    <div v-if="isLoading" class="loading-indicator">
      <div class="loading-spinner"></div>
      <p>Loading document...</p>
    </div>
    <div v-else class="document-container">
      <DynamicScroller
        :items="chunks"
        :minItemSize="500"
        key-field="id"
        class="document-scroller"
        :emitUpdate="true"
        v-slot="{ item, index, active }"
      >
        <DynamicScrollerItem :item="item" :active="active" :index="index" :size-dependencies="[item.content]" :key="item.id">
          <div
            class="document-chunk"
            :data-chunk-id="item.id"
            @click="handleHeadingClick"
          >
            <Markdown
              :content="item.content"
              :anchorMap="noteAnchorMap"
              :enableMentionModal="true"
            />
          </div>
        </DynamicScrollerItem>
      </DynamicScroller>
      <div v-if="chunks.length === 0" class="empty-state">
        <p>No content to display</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.module-document-view {
  padding: 0;
}
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--color-text-light);
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-border);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.document-container {
  color: var(--color-text);
  line-height: 1.6;
  height: 80vh;
  overflow-y: auto;
}
.document-scroller {
  height: 100%;
}
.document-chunk {
  margin-bottom: 1rem;
}
.empty-state {
  color: var(--color-text-light);
  text-align: center;
  padding: 2rem;
  font-style: italic;
}
.document-chunk :deep(h1),
.document-chunk :deep(h2),
.document-chunk :deep(h3),
.document-chunk :deep(h4),
.document-chunk :deep(h5),
.document-chunk :deep(h6) {
  cursor: pointer;
  position: relative;
}
.document-chunk :deep(h1):hover::before,
.document-chunk :deep(h2):hover::before,
.document-chunk :deep(h3):hover::before,
.document-chunk :deep(h4):hover::before,
.document-chunk :deep(h5):hover::before,
.document-chunk :deep(h6):hover::before {
  content: '#';
  position: absolute;
  left: -0.95em;
  top: calc(50% - 13px);
  color: var(--color-primary, #007bff);
  font-weight: bold;
  opacity: 0.7;
}
</style> 

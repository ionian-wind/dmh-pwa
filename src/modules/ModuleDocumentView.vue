<script setup lang="ts">
import type { ModuleTreeNode } from '@/types';
import { ref, onMounted, computed, watch, nextTick, shallowRef } from 'vue';
import Markdown from '@/components/common/Markdown.vue';
import { useBookmarkStore } from '@/stores/bookmarks';
import { useNoteStore } from '@/stores/notes';
import { scrollToHeading } from '@/utils/scrollToHeading';
import { useRouter } from 'vue-router';
// @ts-ignore: no types for vue-virtual-scroller
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import Bookmark from '@/components/common/Bookmark.vue';
import { debug, debugError } from '@/utils/debug';

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
  (e: 'active-anchor-id', anchorId: string): void;
}>();

const bookmarkStore = useBookmarkStore();
const noteStore = useNoteStore();
const router = useRouter();

const chunks = shallowRef<DocumentChunk[]>([]);
const tocItems = shallowRef<TOCItem[]>([]);
const isLoading = ref(false);
const scrollerRef = ref<any>(null); // Ref for DynamicScroller
const activeAnchorId = ref<string | null>(null);

// Get notes for this module that are hidden (document tree notes)
const notes = computed(() => 
  noteStore.items.filter(note => note.moduleId === props.moduleId && note.hidden === true)
);

function buildChunks(nodes: ModuleTreeNode[], depth = 1): DocumentChunk[] {
  const result: DocumentChunk[] = [];
  for (const node of nodes) {
    // Find the note for this node
    const note = notes.value.find(n => n.id === node.noteId);

    if (note) {
      result.push({
        id: `note-${note.id}`,
        title: note.title,
        content: `${'#'.repeat(depth + 1)} ${note.title} {#note-${note.id}}\n\n${note.content || ''}\n\n`,
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

function buildNoteAnchorMap(nodes: ModuleTreeNode[]): Set<string> {
  const map = new Set<string>();
  const traverse = (nodes: ModuleTreeNode[]) => {
    for (const node of nodes) {
      // Use note ID as anchor
      map.add(node.noteId);

      if (node.children) {
        traverse(node.children);
      }
    }
  };

  traverse(nodes);
  return map;
}

const noteAnchorMap = computed(() => buildNoteAnchorMap(props.noteTree));
const rootEl = ref<HTMLElement | null>(null);
const moduleId = props.moduleId;

onMounted(async () => {
  await noteStore.load();
  await bookmarkStore.load();

  if (rootEl.value) {
    (rootEl.value as any).noteAnchorMap = noteAnchorMap.value;
  }
  initializeDocument();
});

function handleHeadingClick(event: Event) {
  const heading = event.target as HTMLElement;
  if (heading && heading.tagName && /^H[1-6]$/.test(heading.tagName)) {
    const id = heading.id;
    if (id) {
      const url = `${window.location.origin}${window.location.pathname}#${id}`;
      
      Promise.all([
        navigator.clipboard.writeText(url),
        scrollToHeading(id, router, heading),
      ])
        .catch(err => debugError(err));
    }
  }
}

/**
 * Scroll to a chunk and heading by anchorId (note id)
 */
async function scrollToAnchor(anchorId: string) {
  debug('scrollToAnchor', { anchorId });
  // Find the chunk index by noteId or chunk id
  const idx = chunks.value.findIndex(chunk => chunk.noteId === anchorId || chunk.id === anchorId);
  if (idx === -1) return;
  // Scroll to the chunk using DynamicScroller
  if (scrollerRef.value && typeof scrollerRef.value.scrollToItem === 'function') {
    scrollerRef.value.scrollToItem(idx);
  }
  // Wait for DOM update, then scroll to heading
  await nextTick();
  // Try to find the heading element with id=anchorId
  const heading = rootEl.value?.querySelector(`[id='${anchorId}']`);
  
  await scrollToHeading(anchorId, router, heading as HTMLElement);
}

function handleScrollerUpdate(_startIndex: number, _endIndex: number, visibleStartIndex: number, _visibleEndIndex: number) {
  // Use visibleStartIndex to get the topmost visible chunk
  if (typeof visibleStartIndex === 'number' && chunks.value[visibleStartIndex]) {
    const topChunk = chunks.value[visibleStartIndex];
    activeAnchorId.value = topChunk.id;
    emit('active-anchor-id', topChunk.id);
  }
}

defineExpose({ scrollToAnchor });
</script>

<template>
  <div class="module-document-view" ref="rootEl">
    <div v-if="isLoading" class="loading-indicator">
      <div class="loading-spinner"></div>
      <p>Loading document...</p>
    </div>
    <div v-else class="document-container">
      <DynamicScroller
        ref="scrollerRef"
        :items="chunks"
        :minItemSize="500"
        key-field="id"
        class="document-scroller"
        :emitUpdate="true"
        @update="handleScrollerUpdate"
        v-slot="{ item, index, active }"
      >
        <DynamicScrollerItem :item="item" :active="active" :index="index" :size-dependencies="[item.content]" :key="item.id">
          <div
            class="document-chunk with-hover-bookmark"
            :data-chunk-id="item.id"
            @click="handleHeadingClick"
          >
            <Bookmark
              :note-id="item.noteId"
              :module-id="moduleId"
              class="bookmark-float"
            />
            <Markdown
              :content="item.content"
              :anchorMap="noteAnchorMap"
              :scrollToAnchor="scrollToAnchor"
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
  margin-bottom: var(--base-padding);
  margin-left: calc(var(--base-padding) * 2);
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
.document-chunk.with-hover-bookmark {
  position: relative;
}
.bookmark-float {
  position: absolute;
  top: -0.5rem;
  left: -2rem;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 10;
  padding: 0.5rem 0.5rem;
}

.bookmark-float:not(.marked) {
  opacity: 0;
}

.document-chunk.with-hover-bookmark:hover .bookmark-float {
  opacity: 1;
  pointer-events: auto;
}
</style> 

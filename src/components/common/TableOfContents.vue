<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { IconBookmark, IconBookmarkFilled } from '@tabler/icons-vue';

interface TOCItem {
  id: string;
  level: number;
  anchorId: string;
  title: string;
  kind?: 'heading' | 'paragraph';
}

const props = defineProps<{
  items: TOCItem[];
  activeAnchorId?: string | null;
  showBookmarkAction?: boolean;
  bookmarkedIds?: Set<string>;
  bookmarkLabel?: string;
  removeBookmarkLabel?: string;
}>();

const activeItemId = ref<string | null>(null);
const tocNavRef = ref<HTMLElement | null>(null);
const tocItemRefs = ref<{ [key: string]: HTMLElement | undefined }>({});

const emit = defineEmits(['item-click', 'bookmark-toggle']);

function isBookmarked(anchorId: string) {
  return props.bookmarkedIds?.has(anchorId) ?? false;
}

function handleItemClick(anchorId: string, event: MouseEvent) {
  event.preventDefault();
  emit('item-click', anchorId);
  if (
    typeof window !== 'undefined' &&
    window.location.hash !== `#${anchorId}`
  ) {
    history.replaceState(null, '', `#${anchorId}`);
  }
}

function getIndentClass(level: number): string {
  return `toc-level-${level}`;
}

function getActiveClass(itemId: string): string {
  return (
    props.activeAnchorId
      ? props.activeAnchorId === itemId
      : activeItemId.value === itemId
  )
    ? 'active'
    : '';
}

// Find the scrollable container that contains the document content
function findScrollableContainer(): Element | null {
  // Look for the entity-main-column or any scrollable container
  const containers = [
    document.querySelector('.entity-main-column'),
    document.querySelector('.base-entity-view'),
    document.querySelector('.document-markdown'),
    document.querySelector('.entity-content'),
    document.querySelector('.q-page-container'),
    document.querySelector('.syntax-doc-page'),
  ];

  for (const container of containers) {
    if (container && container.scrollHeight > container.clientHeight) {
      return container;
    }
  }

  // Fallback to window
  return null;
}

// Track which section is currently visible
function updateActiveSection() {
  const headings = props.items
    .map((item) => ({
      id: item.anchorId,
      element: document.getElementById(item.anchorId),
    }))
    .filter((item) => item.element);

  if (headings.length === 0) return;

  const scrollContainer = findScrollableContainer();
  const isWindow = !scrollContainer;

  const scrollTop = isWindow ? window.scrollY : scrollContainer!.scrollTop;
  const containerHeight = isWindow
    ? window.innerHeight
    : scrollContainer!.clientHeight;
  const threshold = containerHeight * 0.2; // 20% from top

  let activeHeading = headings[0];

  for (const heading of headings) {
    if (!heading.element) continue;

    const rect = heading.element.getBoundingClientRect();
    const elementTop = isWindow ? rect.top + scrollTop : rect.top;

    if (elementTop <= threshold) {
      activeHeading = heading;
    } else {
      break;
    }
  }

  if (activeItemId.value !== activeHeading.id) {
    activeItemId.value = activeHeading.id;
  }
}

// Throttle scroll events for better performance
let scrollTimeout: number | null = null;
function handleScroll() {
  if (scrollTimeout) return;

  scrollTimeout = window.setTimeout(() => {
    updateActiveSection();
    scrollTimeout = null;
  }, 50); // Reduced throttle time for more responsive updates
}

// Clear refs on items change to avoid stale refs
watch(
  () => props.items,
  () => {
    tocItemRefs.value = {};
  },
);

watch(
  () => props.activeAnchorId,
  (val) => {
    if (val) activeItemId.value = val;
    // Scroll the active TOC item into view
    nextTick(() => {
      const el = tocItemRefs.value && tocItemRefs.value[val || ''];
      if (el && tocNavRef.value) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  },
);

onMounted(async () => {
  await nextTick();
  if (!props.activeAnchorId) updateActiveSection();
  if (!props.activeAnchorId) {
    const scrollContainer = findScrollableContainer();
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, {
        passive: true,
      });
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
  }
});

onUnmounted(() => {
  if (!props.activeAnchorId) {
    const scrollContainer = findScrollableContainer();
    if (scrollContainer) {
      scrollContainer.removeEventListener('scroll', handleScroll);
    } else {
      window.removeEventListener('scroll', handleScroll);
    }
  }
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
});

// Update active section when items change
watch(
  () => props.items,
  async () => {
    await nextTick();
    setTimeout(updateActiveSection, 100);
  },
  { deep: true },
);

// Also update on route changes or when document content changes
watch(
  () => props.items.length,
  async () => {
    await nextTick();
    setTimeout(updateActiveSection, 100);
  },
);

function setTocItemRef(
  el: Element | ComponentPublicInstance | null,
  item: TOCItem,
) {
  if (el && el instanceof HTMLElement) {
    tocItemRefs.value[item.anchorId] = el;
  }
}
</script>

<template>
  <div class="table-of-contents">
    <nav class="toc-nav" ref="tocNavRef">
      <ul class="toc-list">
        <li
          v-for="item in items"
          :key="item.id"
          :class="[
            'toc-item',
            getIndentClass(item.level),
            getActiveClass(item.anchorId),
            item.kind === 'paragraph' ? 'toc-item--paragraph' : '',
          ]"
          :ref="(el) => setTocItemRef(el, item)"
        >
          <a
            class="toc-link"
            :href="`#${item.anchorId}`"
            @click="handleItemClick(item.anchorId, $event)"
            :title="item.title"
          >
            {{ item.title }}
          </a>
          <button
            v-if="showBookmarkAction"
            type="button"
            class="toc-bookmark"
            :class="{ active: isBookmarked(item.anchorId) }"
            :title="
              isBookmarked(item.anchorId) ? removeBookmarkLabel : bookmarkLabel
            "
            :aria-label="
              isBookmarked(item.anchorId) ? removeBookmarkLabel : bookmarkLabel
            "
            @click.stop.prevent="emit('bookmark-toggle', item)"
          >
            <IconBookmarkFilled v-if="isBookmarked(item.anchorId)" :size="14" />
            <IconBookmark v-else :size="14" />
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>

<style scoped>
.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  padding-left: var(--base-padding);
}

.toc-item {
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.toc-link {
  display: block;
  flex: 1;
  min-width: 0;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 0.9rem;
  padding: 0.25rem 0;
  cursor: pointer;
  transition:
    color 0.2s,
    background-color 0.2s;
  text-decoration: none;
  border-radius: 4px;
  padding-left: 0.5rem;
  margin-left: -0.5rem;
}

.toc-link:hover {
  color: var(--color-accent);
  background: var(--color-background-mute);
}

/* Active state styling */
.toc-item.active .toc-link {
  color: var(--color-accent);
  background: var(--color-primary-light, rgba(0, 123, 255, 0.1));
  font-weight: 600;
  border-left: 3px solid var(--color-accent);
  padding-left: calc(0.5rem - 3px);
}

.toc-item--paragraph .toc-link {
  color: var(--color-text-light);
  font-size: 0.8rem;
}

.toc-bookmark {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-lighter);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.15s ease,
    color 0.15s ease,
    background-color 0.15s ease;
}

.toc-item:hover .toc-bookmark,
.toc-bookmark:focus-visible,
.toc-bookmark.active {
  opacity: 1;
}

.toc-bookmark:hover {
  color: var(--color-accent);
  background: var(--color-background-mute);
}

.toc-bookmark.active {
  color: var(--color-success);
}

/* Indentation for different levels */
.toc-level-0,
.toc-level-1,
.toc-level-2 {
  padding-left: 0;
}

.toc-level-3 {
  padding-left: 1rem;
}

.toc-level-4 {
  padding-left: 2rem;
}

.toc-level-5 {
  padding-left: 3rem;
}

.toc-level-6 {
  padding-left: 4rem;
}

.toc-item .toc-link {
  padding-left: 0.5rem;
}
</style>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import type { ComponentPublicInstance } from 'vue';

interface TOCItem {
  id: string;
  level: number;
  anchorId: string;
  title: string;
}

const props = defineProps<{
  items: TOCItem[];
  activeAnchorId?: string | null;
}>();

const activeItemId = ref<string | null>(null);
const tocNavRef = ref<HTMLElement | null>(null);
const tocItemRefs = ref<{ [key: string]: HTMLElement | undefined }>({});

const emit = defineEmits(['item-click']);

function scrollToAnchor(anchorId: string) {
  const element = document.getElementById(anchorId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
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
          ]"
          :ref="(el) => setTocItemRef(el, item)"
        >
          <button
            class="toc-link"
            @click="emit('item-click', item.anchorId)"
            :title="item.title"
          >
            {{ item.title }}
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
}

.toc-link {
  display: block;
  width: 100%;
  text-align: left;
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
  color: var(--color-primary);
  background: var(--color-background-mute);
}

/* Active state styling */
.toc-item.active .toc-link {
  color: var(--color-primary);
  background: var(--color-primary-light, rgba(0, 123, 255, 0.1));
  font-weight: 600;
  border-left: 3px solid var(--color-primary);
  padding-left: calc(0.5rem - 3px);
}

/* Indentation for different levels */
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

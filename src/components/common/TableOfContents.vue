<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

interface TOCItem {
  id: string;
  title: string;
  level: number;
  anchorId: string;
}

const props = defineProps<{
  items: TOCItem[];
  title?: string;
}>();

const activeItemId = ref<string | null>(null);

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
  return activeItemId.value === itemId ? 'active' : '';
}

// Find the scrollable container that contains the document content
function findScrollableContainer(): Element | null {
  // Look for the entity-main-column or any scrollable container
  const containers = [
    document.querySelector('.entity-main-column'),
    document.querySelector('.base-entity-view'),
    document.querySelector('.document-markdown'),
    document.querySelector('.entity-content')
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
  const headings = props.items.map(item => ({
    id: item.anchorId,
    element: document.getElementById(item.anchorId)
  })).filter(item => item.element);

  if (headings.length === 0) return;

  const scrollContainer = findScrollableContainer();
  const isWindow = !scrollContainer;
  
  const scrollTop = isWindow ? window.scrollY : scrollContainer!.scrollTop;
  const containerHeight = isWindow ? window.innerHeight : scrollContainer!.clientHeight;
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

onMounted(async () => {
  await nextTick();
  updateActiveSection();
  
  const scrollContainer = findScrollableContainer();
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
  } else {
    window.addEventListener('scroll', handleScroll, { passive: true });
  }
});

onUnmounted(() => {
  const scrollContainer = findScrollableContainer();
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', handleScroll);
  } else {
    window.removeEventListener('scroll', handleScroll);
  }
  
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
});

// Update active section when items change
watch(() => props.items, async () => {
  await nextTick();
  setTimeout(updateActiveSection, 100);
}, { deep: true });

// Also update on route changes or when document content changes
watch(() => props.items.length, async () => {
  await nextTick();
  setTimeout(updateActiveSection, 100);
});
</script>

<template>
  <div class="table-of-contents">
    <h3 v-if="title" class="toc-title">{{ title }}</h3>
    <nav class="toc-nav">
      <ul class="toc-list">
        <li 
          v-for="item in items" 
          :key="item.id" 
          :class="['toc-item', getIndentClass(item.level), getActiveClass(item.anchorId)]"
        >
          <button 
            class="toc-link" 
            @click="scrollToAnchor(item.anchorId)"
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
.toc-title {
  margin: 0 0 1rem 0;
  color: var(--color-text);
  font-size: 1.1rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.toc-nav {
  max-height: 400px;
  overflow-y: auto;
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
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
  transition: color 0.2s, background-color 0.2s;
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
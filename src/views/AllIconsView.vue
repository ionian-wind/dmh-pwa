<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import CustomIcon from '@/components/common/CustomIcon.vue';

const filter = ref('');
const copied = ref('');
const page = ref(1);
const pageSize = 100;

const icons = ref<any[]>([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch('/assets/icons/icons-list.json');
    if (!res.ok) throw new Error('Failed to load icons-list.json');
    icons.value = await res.json();
  } catch (e: any) {
    error.value = e.message || 'Unknown error';
  } finally {
    loading.value = false;
  }
});

const filteredIcons = computed(() =>
  icons.value.filter(icon => icon.name.toLowerCase().includes(filter.value.toLowerCase().trim()))
);

const totalPages = computed(() => Math.ceil(filteredIcons.value.length / pageSize));
const pagedIcons = computed(() =>
  filteredIcons.value.slice((page.value - 1) * pageSize, page.value * pageSize)
);

function copyCode(iconName: string, publicPath: string) {
  const importCode = `<CustomIcon path=\"${publicPath}\" width=\"32\" height=\"32\" />`;
  navigator.clipboard.writeText(importCode);
  copied.value = iconName;
  setTimeout(() => { copied.value = ''; }, 1200);
}

function prevPage() {
  if (page.value > 1) page.value--;
}
function nextPage() {
  if (page.value < totalPages.value) page.value++;
}

watch(filter, () => {
  page.value = 1;
});
</script>

<template>
  <div class="all-icons-view">
    <h1>All SVG Icons</h1>
    <p class="usage-hint">Click an icon to copy the recommended usage:</p>
    <pre class="usage-example">&lt;CustomIcon path="/assets/icons/lorc/ace.svg" width="32" height="32" /&gt;</pre>
    <input
      v-model="filter"
      type="text"
      placeholder="Filter icons by name..."
      class="icon-filter-input"
    />
    <div v-if="loading" class="loading">Loading icons…</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <template v-else>
      <div class="pagination-controls">
        <button @click="prevPage" :disabled="page === 1">Prev</button>
        <span>Page {{ page }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="page === totalPages">Next</button>
      </div>
      <div class="icons-grid">
        <div
          v-for="icon in pagedIcons"
          :key="icon.name"
          class="icon-cell"
          @click="copyCode(icon.name, icon.publicPath)"
          :title="icon.name"
        >
          <CustomIcon :path="icon.publicPath" :width="36" :height="36" />
          <div class="icon-name">{{ icon.name }}</div>
          <div v-if="copied === icon.name" class="copied-toast">Copied!</div>
        </div>
      </div>
      <div class="pagination-controls bottom">
        <button @click="prevPage" :disabled="page === 1">Prev</button>
        <span>Page {{ page }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="page === totalPages">Next</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.all-icons-view {
  padding: 2rem;
}
.usage-hint {
  text-align: center;
  color: #666;
  margin-bottom: 0.2em;
}
.usage-example {
  text-align: center;
  background: #f6f8fa;
  color: #333;
  border-radius: 6px;
  padding: 0.5em 1em;
  margin: 0 auto 1.5em auto;
  width: max-content;
  min-width: 320px;
  max-width: 100%;
  font-size: 1em;
  font-family: 'Fira Mono', 'Consolas', monospace;
}
.icon-filter-input {
  display: block;
  margin: 0 auto 2rem auto;
  padding: 0.5rem 1rem;
  font-size: 1.1rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  width: 320px;
  max-width: 100%;
}
.loading {
  text-align: center;
  color: #888;
  font-size: 1.2em;
  margin: 2rem 0;
}
.error {
  text-align: center;
  color: #c00;
  font-size: 1.2em;
  margin: 2rem 0;
}
.icons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 1.5rem;
}
.icon-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0.5rem;
  border-radius: 8px;
  background: #fafbfc;
  cursor: pointer;
  transition: box-shadow 0.15s, background 0.15s;
  position: relative;
  border: 1px solid #eee;
}
.icon-cell:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  background: #f0f4f8;
}
.icon-name {
  margin-top: 0.5rem;
  font-size: 0.95rem;
  color: #444;
  word-break: break-all;
  text-align: center;
}
.copied-toast {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #4caf50;
  color: #fff;
  padding: 0.2em 0.7em;
  border-radius: 6px;
  font-size: 0.9em;
  pointer-events: none;
  z-index: 2;
}
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}
.pagination-controls.bottom {
  margin-top: 2rem;
  margin-bottom: 0;
}
.pagination-controls button {
  padding: 0.4em 1.2em;
  border-radius: 6px;
  border: 1px solid #bbb;
  background: #f5f5f5;
  font-size: 1em;
  cursor: pointer;
  transition: background 0.15s;
}
.pagination-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 
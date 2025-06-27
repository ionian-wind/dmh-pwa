<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';
import ViewHeader from './ViewHeader.vue';

const props = defineProps({
  items: { type: Array, required: true },
  cardComponent: { type: [Object, Function, String], required: true },
  editorComponent: { type: [Object, Function, String], required: true },
  emptyMessage: { type: String, required: true },
  createTitle: { type: String, required: true },
  showSearch: { type: Boolean, default: false },
  searchQuery: { type: String, default: '' },
  searchPlaceholder: { type: String, default: 'Search...' },
  cardProps: { type: Function, default: (item: any) => ({}) },
  editorProps: { type: Function, default: (item: any) => ({}) },
  masonry: { type: Boolean, default: false },
  // Optional: for tag filter, etc.
});

const showEditor = ref(false);
const editingItem = ref<any>(null);
const isSidePanelVisible = ref(true);
const emit = defineEmits(['create', 'edit', 'delete', 'submit', 'cancel', 'update:searchQuery', 'view', 'tag-click']);

function handleCreate() {
  editingItem.value = null;
  showEditor.value = true;
  // $emit('create') will be used in template
}
function handleEdit(item: any) {
  editingItem.value = item;
  showEditor.value = true;
  // $emit('edit', item) will be used in template
}
function handleDelete(item: any) {
  // $emit('delete', item) will be used in template
}
function handleSubmit(item: any) {
  showEditor.value = false;
  // $emit('submit', item) will be used in template
}
function handleCancel() {
  showEditor.value = false;
  // $emit('cancel') will be used in template
}
function handleSearch(val: string) {
  // $emit('update:searchQuery', val) will be used in template
}
function toggleSidePanel() {
  isSidePanelVisible.value = !isSidePanelVisible.value;
}
function onCreate() {
  handleCreate();
  emit('create');
}
</script>

<template>
  <div class="view-root base-list-container">
    <ViewHeader
      show-create
      :create-title="createTitle"
      :show-search="showSearch"
      :search-query="searchQuery"
      :search-placeholder="searchPlaceholder"
      @create="onCreate"
      v-bind="$attrs"
    >
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </ViewHeader>
    <div class="base-list-layout">
      <div class="view-list">
        <div v-if="items.length === 0" class="view-empty">
          <p>{{ emptyMessage }}</p>
        </div>
        <div v-else class="masonry-grid">
          <component
            v-for="item in items as any[]"
            :is="cardComponent"
            :key="item.id"
            v-bind="cardProps(item)"
            @view="$emit('view', item)"
            @edit="() => { handleEdit(item); $emit('edit', item); }"
            @delete="() => { handleDelete(item); $emit('delete', item); }"
            @tag-click="$emit('tag-click', $event)"
          />
        </div>
        <component
          v-if="showEditor"
          :is="editorComponent"
          v-bind="editorProps(editingItem)"
          :is-open="showEditor"
          @submit="(item: any) => { handleSubmit(item); $emit('submit', item); }"
          @cancel="() => { handleCancel(); $emit('cancel'); }"
        />
      </div>
      <!-- Side Panel -->
      <div v-if="$slots.sidepanel" class="sidebar-wrapper" :class="{ collapsed: !isSidePanelVisible }">
        <div class="side-panel-toggle-handle" @click="toggleSidePanel">
          <i :class="isSidePanelVisible ? 'si si-chevron-right' : 'si si-chevron-left'"></i>
        </div>
        <div class="side-panel">
          <slot name="sidepanel" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar-wrapper {
  position: relative;
  min-width: 280px;
  max-width: 340px;
  background: var(--color-background-soft);
  border-left: 1px solid var(--color-border);
  transition: max-width 0.2s, min-width 0.2s;
  display: flex;
  flex-direction: column;
}
.sidebar-wrapper.collapsed {
  max-width: 32px;
  min-width: 32px;
}
.side-panel-toggle-handle {
  position: absolute;
  left: -16px;
  top: 16px;
  width: 32px;
  height: 32px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.side-panel {
  padding: 1.5rem 1rem;
  overflow-y: auto;
  height: 100%;
}
.masonry-grid {
  column-count: 2;
  column-gap: 1.5rem;
  max-height: calc(100vh - var(--base-padding));
  overflow-y: auto;
}
@media (min-width: 900px) {
  .masonry-grid {
    column-count: 3;
  }
}
.masonry-grid > * {
  break-inside: avoid;
  margin-bottom: 1.5rem;
  width: 100%;
  display: block;
}
</style>

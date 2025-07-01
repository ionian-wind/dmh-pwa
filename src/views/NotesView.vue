<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useNoteStore } from '@/stores/notes';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useModuleStore } from '@/stores/modules';
import { useNoteTypeStore } from '@/stores/noteTypes';
import BaseListView from '@/components/common/BaseListView.vue';
import NoteCard from '@/components/NoteCard.vue';
import NoteEditor from '@/components/NoteEditor.vue';
import type { Note } from '@/types';
import { useI18n } from 'vue-i18n';
import { IconX } from '@tabler/icons-vue';
import { debug } from '@/utils/debug';

const noteStore = useNoteStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const moduleStore = useModuleStore();
const noteTypeStore = useNoteTypeStore();
const router = useRouter();
const route = useRoute();
const { t } = useI18n();

// Sync tag filter from route
watch(
  () => route.query.tag,
  (newTag) => {
    noteStore.setTagFilter(typeof newTag === 'string' ? newTag : null);
  },
  { immediate: true }
);

const searchQuery = ref(noteStore.searchQuery);
function updateSearchQuery(val: string) {
  searchQuery.value = val;
  noteStore.setSearchQuery(val);
}

onMounted(async () => {
  await Promise.all([
    noteStore.load(),
    monsterStore.load(),
    partyStore.load()
  ]);
});

function cardProps(note: Note) {
  return {
    note,
    onView: () => router.push(`/notes/${note.id}`),
    onEdit: () => handleEdit(note),
    onDelete: () => handleDelete(note),
    onTagClick: (tag: string) => handleTagClick(tag),
    moduleName: undefined
  };
}

function editorProps(note: Note | null) {
  return {
    note,
    isOpen: true
  };
}

function handleEdit(note: Note) {
  // handled by BaseListView
}
function handleDelete(note: Note) {
  if (note.id && confirm(`Are you sure you want to delete ${note.title}?`)) {
    noteStore.remove(note.id);
  }
}
function handleSubmit(note: Note) {
  if (note.id) {
    noteStore.update(note.id, note);
  } else {
    noteStore.create({ ...note, hidden: false });
  }
}
function handleTagClick(tag: string) {
  router.push({ path: '/notes', query: { tag: encodeURIComponent(tag) } });
}
async function handleCopy(note: Note) {
  debug('NotesView handleCopy', note);
  // Copy all fields except id, createdAt, updatedAt
  const { id, createdAt, updatedAt, ...rest } = note;
  await noteStore.create({ ...rest, hidden: false });
}
</script>

<template>
  <BaseListView
    :items="noteStore.filtered.filter(n => !n.hidden)"
    :card-component="NoteCard"
    :editor-component="NoteEditor"
    :empty-message="t('common.empty')"
    :create-title="t('notes.create')"
    :card-props="cardProps"
    :editor-props="editorProps"
    @delete="handleDelete"
    @submit="handleSubmit"
    @view="(note) => router.push(`/notes/${note.id}`)"
    @tag-click="handleTagClick"
    @copy="handleCopy"
    :show-search="true"
    :search-query="searchQuery"
    @update:searchQuery="updateSearchQuery"
  >
    <template #search-filter>
      <span v-if="noteStore.tagFilter" class="tag-chip">
        #{{ noteStore.tagFilter }}
        <button class="remove-tag" @click="router.push({ path: '/notes' })" :title="t('common.removeTagFilter')">
          <IconX />
        </button>
      </span>
    </template>
  </BaseListView>
</template>

<style scoped>
.tag-chip {
  display: inline-flex;
  align-items: center;
  background: var(--color-background-soft);
  color: var(--color-primary);
  border-radius: 16px;
  padding: 0.2em 0.75em 0.2em 0.5em;
  font-size: 0.95em;
  margin-left: 0.5em;
  border: 1px solid var(--color-primary);
  gap: 0.25em;
}

.remove-tag {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 1.1em;
  margin-left: 0.25em;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.remove-tag:hover {
  color: var(--color-danger);
}
</style> 

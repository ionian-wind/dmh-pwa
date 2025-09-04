<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, inject } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

import type { Note, ComponentInjection } from '@/types';

import { useNoteStore } from '@/stores/notes';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useModuleStore } from '@/stores/modules';
import { useNoteTypeStore } from '@/stores/noteTypes';
import BaseListView from '@/components/common/BaseListView.vue';
import NoteCard from '@/notes/NoteCard.vue';
import NoteEditor from '@/notes/NoteEditor.vue';
import TagChip from '@/components/common/TagChip.vue';

import { debug } from '@/utils/debug';
import { confirm } from '@/dialogs';

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
  { immediate: true },
);

onMounted(async () => {
  await Promise.all([noteStore.load(), monsterStore.load(), partyStore.load()]);
});

function cardProps(note: Note) {
  return {
    note,
    onView: () => router.push(`/notes/${note.id}`),
    onEdit: () => handleEdit(note),
    onDelete: () => handleDelete(note),
    moduleName: undefined,
  };
}

function editorProps(note: Note | null) {
  return {
    note,
    isOpen: true,
  };
}

function handleEdit(note: Note) {
  // handled by BaseListView
}
async function handleDelete(note: Note) {
  if (note.id && await confirm(t('common.confirmDelete', { title: note.title }))) {
    await noteStore.remove(note.id);
    return true;
  }
  return false;
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

const setRightDrawerContent = inject('setRightDrawerContent') as (
  arg: ComponentInjection,
) => void;

onMounted(async () => {
  setRightDrawerContent(null);
});

onBeforeUnmount(() => {
  setRightDrawerContent(null);
});
</script>

<template>
  <BaseListView
    :items="noteStore.filtered.filter((n) => !n.hidden)"
    :card-component="NoteCard"
    :editor-component="NoteEditor"
    :empty-message="t('common.empty')"
    :create-title="t('notes.create')"
    :card-props="cardProps"
    :editor-props="editorProps"
    @submit="handleSubmit"
    @tag-click="handleTagClick"
    @copy="handleCopy"
  >
  </BaseListView>
</template>

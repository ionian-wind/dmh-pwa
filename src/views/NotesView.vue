<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import NoteEditor from '@/components/NoteEditor.vue';
import NoteCard from '@/components/NoteCard.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import type { Note, Module } from '@/types';

const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();

const showEditor = ref(false);
const editingNote = ref<Note | null>(null);
const router = useRouter();

const searchQuery = ref('');
const route = useRoute();
const tagFilter = ref<string | null>(null);

// Watch for query param changes
watch(
  () => route.query.tag,
  (newTag) => {
    tagFilter.value = typeof newTag === 'string' ? newTag : null;
  },
  { immediate: true }
);

// Watch for search query changes
watch(searchQuery, (newQuery) => {
  noteStore.searchQuery = newQuery;
});

const filteredNotes = computed(() => {
  let notes = noteStore.filtered;
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    notes = notes.filter((note: Note) =>
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some((tag: string) => tag.toLowerCase().includes(query))
    );
  }
  return notes;
});

onMounted(async () => {
  await Promise.all([
    noteStore.load(),
    monsterStore.load(),
    partyStore.load(),
    moduleStore.load()
  ]);
});

const handleCreateClick = () => {
  editingNote.value = null;
  showEditor.value = true;
};

const handleEditClick = (note: Note) => {
  editingNote.value = note;
  showEditor.value = true;
};

const handleSubmit = async (note: Note) => {
  if (note.id) {
    await noteStore.update(note.id, note);
  } else {
    await noteStore.create(note);
  }
  showEditor.value = false;
};

const handleDelete = async (note: Note) => {
  if (note.id && confirm(`Are you sure you want to delete ${note.title}?`)) {
    await noteStore.remove(note.id);
  }
};

const handleCancel = () => {
  showEditor.value = false;
};

function handleTagClick(tag: string) {
  router.push({ path: '/notes', query: { tag: encodeURIComponent(tag) } });
}

</script>

<template>
  <div class="view-root">
    <ViewHeader
      show-create
      create-title="Create Note"
      @create="handleCreateClick"
      show-search
      v-model:searchQuery="searchQuery"
      search-placeholder="Search notes..."
    >
      <template #search-filter>
        <span v-if="tagFilter" class="tag-chip">
          #{{ tagFilter }}
          <button class="remove-tag" @click="router.push({ path: '/notes' })" title="Remove tag filter">
            <i class="si si-x"></i>
          </button>
        </span>
      </template>
    </ViewHeader>
    <div class="view-list">
      <div v-if="filteredNotes.length === 0" class="view-empty">
        <p v-if="!['any', 'none', null].includes(moduleStore.currentModuleFilter)">Try changing the module filter or create a new note.</p>
        <p v-else>No notes yet. Create your first note to get started!</p>
      </div>

      <div v-else class="view-grid">
        <NoteCard
          v-for="note in filteredNotes"
          :key="note.id"
          :note="note"
          @view="() => router.push(`/notes/${note.id}`)"
          @edit="() => handleEditClick(note)"
          @delete="() => handleDelete(note)"
          @tag-click="handleTagClick"
          :module-name="note.moduleId ? moduleStore.items.find((m: Module) => m.id === note.moduleId)?.name : undefined"
        />
      </div>

      <NoteEditor
        v-if="showEditor"
        :note="editingNote"
        :is-open="showEditor"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>
  </div>
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
  color: var(--color-danger, #c00);
}
</style> 

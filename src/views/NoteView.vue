<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { useMentionsStore } from '@/stores/createIndexationStore';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import type { Note } from '@/types';
import NoteEditor from '@/components/NoteEditor.vue';
import { parseMarkdown, extractMentionedEntities } from '@/utils/markdownParser';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import Mentions from '@/components/common/Mentions.vue';
import NotFoundView from './NotFoundView.vue';
import Markdown from '@/components/common/Markdown.vue';

const route = useRoute();
const router = useRouter();
const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const mentionsStore = useMentionsStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();

const isEditing = ref(false);
const isLoaded = computed(() => noteStore.isLoaded);
const note = ref<Note | null>(null);
const loading = computed(() => !isLoaded.value);
const notFound = computed(() => isLoaded.value && !note.value);
const parsedContent = computed(() => note.value ? parseMarkdown(note.value.content) : '');
const validationError = ref<string | null>(null);

function updateNoteFromStore() {
  if (!noteStore.isLoaded) {
    return;
  }
  const found = noteStore.getById(route.params.id as string);
  if (found) {
    note.value = found;
  } else {
    router.push('/notes');
  }
}

watch([
  () => noteStore.items,
  () => noteStore.isLoaded
], updateNoteFromStore, { immediate: true });

const handleEdit = () => {
  isEditing.value = true;
};

const handleDelete = async () => {
  if (!note.value) return;
  await noteStore.remove(note.value.id);
  router.push('/notes');
};

const handleSubmit = async (editedNote: Note) => {
  // Validate mentions
  const mentions = extractMentionedEntities(editedNote.content);
  const missing: string[] = [];
  for (const mention of mentions) {
    let exists = false;
    switch (mention.kind) {
      case 'note':
        exists = !!noteStore.getById(mention.id);
        break;
      case 'module':
        exists = !!moduleStore.getById(mention.id);
        break;
      case 'party':
        exists = !!partyStore.getById(mention.id);
        break;
      case 'monster':
        exists = !!monsterStore.getById(mention.id);
        break;
      case 'encounter':
        exists = !!encounterStore.getById(mention.id);
        break;
      default:
        exists = true; // ignore unknown kinds
    }
    if (!exists) {
      missing.push(`${mention.kind}:${mention.id}`);
    }
  }
  if (missing.length > 0) {
    validationError.value = `Cannot save: the following mentioned entities do not exist: ${missing.join(', ')}`;
    return;
  }
  validationError.value = null;
  if (!note.value) return;
  await noteStore.update(note.value.id, editedNote);
  isEditing.value = false;
};

const handleCancel = () => {
  isEditing.value = false;
};

// Computed properties for BaseEntityView
const noteTitle = computed(() => note.value?.title || '');

const mentions = computed(() => {
  if (!note.value) return [];
  return mentionsStore.getLinks({ kind: 'note', id: note.value.id });
});

// Find notes that mention this note using the indexation store
const mentionedInNotes = computed(() => {
  if (!note.value) return [];
  const backlinks = mentionsStore.getBacklinks({ kind: 'note', id: note.value.id });
  // Only include notes that exist (not null)
  return backlinks
    .filter(ref => ref.kind === 'note' && ref.id !== note.value?.id)
    .map(ref => noteStore.getById(ref.id))
    .filter((n): n is Note => !!n);
});

function getEntityRoute(entity: { kind: string; id: string }) {
  switch (entity.kind) {
    case 'monster': return `/monsters/${entity.id}`;
    case 'party': return `/parties/${entity.id}`;
    case 'encounter': return `/encounters/${entity.id}`;
    case 'module': return `/modules/${entity.id}`;
    case 'note': return `/notes/${entity.id}`;
    default: return '#';
  }
}

function getEntityLabel(entity: { kind: string; id: string }) {
  return entity.kind.charAt(0).toUpperCase() + entity.kind.slice(1);
}

function handleTagClick(tag: string) {
  router.push({ path: '/notes', query: { tag: encodeURIComponent(tag) } });
}

onMounted(async () => {
  noteStore.load();
});
</script>

<template>
  <div class="note-view-container" style="display: flex; flex-direction: row; gap: 2rem; align-items: flex-start;">
    <div style="flex: 2 1 0; min-width: 0;">
      <div v-if="loading" class="loading-state">Loading...</div>
      <NotFoundView v-else-if="notFound" />
      <BaseEntityView
        v-else
        :entity="note"
        entity-name="Note"
        list-route="/notes"
        :on-delete="handleDelete"
        :on-edit="handleEdit"
        :is-editing="isEditing"
        :title="noteTitle"
        :not-found="notFound"
      >
        <!-- Note Content -->
        <div v-if="note">
          <Markdown :content="note?.content || ''" />
        </div>

        <template #sub>
          <div class="tags" v-if="note!.tags && note!.tags.length">
            <span
              v-for="tag in note!.tags"
              :key="tag"
              class="tag clickable"
              @click.stop="handleTagClick(tag)"
            >#{{ tag }}</span>
          </div>
        </template>
        <!-- Editor Modal -->
        <template #editor>
          <NoteEditor
            v-if="isEditing"
            :note="note"
            :is-open="isEditing"
            :validation-error="validationError"
            @submit="handleSubmit"
            @cancel="handleCancel"
          />
        </template>
      </BaseEntityView>
    </div>
    <aside v-if="!notFound && !loading" style="flex: 1 1 250px; min-width: 200px; max-width: 320px; display: flex; flex-direction: column; gap: 2rem;">
      <Mentions title="Mentions" :entities="mentions" />
      <Mentions title="Mentioned In" :entities="mentionedInNotes.map(n => ({ kind: 'note', id: n.id }))" />
    </aside>
  </div>
</template>

<style scoped>
.note-body {
  color: var(--color-text);
  line-height: 1.6;
}

.markdown-content {
  font-family: var(--font-family);
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 1.5em 0 0.5em;
  color: var(--color-text);
}

.markdown-content :deep(p) {
  margin: 1em 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 1em 0;
  padding-left: 2em;
}

.markdown-content :deep(li) {
  margin: 0.5em 0;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid var(--color-primary);
  padding-left: 1em;
  margin: 1em 0;
  color: var(--color-text-light);
}

.markdown-content :deep(code) {
  background: var(--color-background-soft);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
}

.markdown-content :deep(pre) {
  background: var(--color-background-soft);
  padding: 1em;
  border-radius: var(--border-radius);
  overflow-x: auto;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
}

.mentions-aside {
  background: var(--color-background-soft);
  border-radius: var(--border-radius);
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.mentions-title {
  margin-top: 0;
  font-size: 1.1em;
  margin-bottom: 0.5em;
}
.mentions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.mentions-list li {
  margin-bottom: 0.5em;
}

@media (max-width: 800px) {
  .note-view-container {
    flex-direction: column !important;
    gap: 1rem !important;
  }
  .mentioned-entities-aside {
    max-width: 100%;
    margin-top: 1rem;
  }
}

.tag.clickable {
  cursor: pointer;
  text-decoration: underline dotted;
  transition: color 0.15s;
}
.tag.clickable:hover {
  color: var(--color-primary);
}
</style>

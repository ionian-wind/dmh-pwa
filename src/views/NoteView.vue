<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { useMentionsStore } from '@/utils/storage';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import type { Note } from '@/types';
import NoteEditor from '@/components/NoteEditor.vue';
import { parseMarkdown, extractMentionedEntities } from '@/utils/markdownParser';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import Mentions from '@/components/common/Mentions.vue';
import Markdown from '@/components/common/Markdown.vue';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
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
const parsedContent = computed(() => note.value ? parseMarkdown(note.value.content, { taskCheckboxEnabled: true }) : '');
const validationError = ref<string | null>(null);
const noteContent = ref('');

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

watch(note, (n) => {
  if (n) noteContent.value = n.content;
}, { immediate: true });

function handleMarkdownContentChange(newContent: string) {
  noteContent.value = newContent;
  if (note.value) {
    noteStore.update(note.value.id, { content: newContent });
  }
}

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
  updateNoteFromStore();
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

onMounted(async () => {
  await noteStore.load();
  await moduleStore.load();
  await mentionsStore.load();
  await partyStore.load();
  await monsterStore.load();
  await encounterStore.load();
});
</script>

<template>
  <BaseEntityView
    :entity="note"
    entity-name="notes.title"
    list-route="/notes"
    :on-delete="handleDelete"
    :on-edit="handleEdit"
    :is-editing="isEditing"
    :title="noteTitle"
    :not-found="notFound"
  >
    <Markdown :taskCheckboxEnabled="true" :content="noteContent" @update:content="handleMarkdownContentChange" />

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

    <template #sidepanel>
      <div class="side-panel-content">
        <div v-if="note?.tags?.length" class="tags-section">
          <h3>{{ t('tags.title') }}</h3>
          <div class="tags">
            <router-link
              v-for="tag in note.tags"
              :key="tag"
              class="tag"
              :to="{ path: '/notes', query: { tag: encodeURIComponent(tag) } }"
            >#{{ tag }}</router-link>
          </div>
        </div>
        <Mentions :title="t('common.mentions')" :entities="mentions" />
        <Mentions :title="t('common.mentionedIn')" :entities="mentionedInNotes.map(n => ({ kind: 'note', id: n.id, title: n.title }))" />
      </div>
    </template>
  </BaseEntityView>
</template>

<style scoped>
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

.side-panel-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
</style>

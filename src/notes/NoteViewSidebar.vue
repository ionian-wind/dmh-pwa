<script setup lang="ts">
import Mentions from "@/components/common/Mentions.vue";
import {computed} from "vue";
import type {Note} from "@/types";
import {useI18n} from "vue-i18n";
import {useNoteStore} from "@/stores/notes";
import {useMentionsStore} from "@/utils/storage";

const { t } = useI18n();

const noteStore = useNoteStore();
const mentionsStore = useMentionsStore();

const props = defineProps<{
  note: Note,
}>();

const mentions = computed(() => {
  return mentionsStore.getLinks({ kind: 'note', id: props.note.value.id });
});

// Find notes that mention this note using the indexation store
const mentionedInNotes = computed(() => {
  const backlinks = mentionsStore.getBacklinks({ kind: 'note', id: props.note.value.id });
  // Only include notes that exist (not null)
  return backlinks
    .filter(ref => ref.kind === 'note' && ref.id !== props.note.value?.id)
    .map(ref => noteStore.getById(ref.id))
    .filter((n): n is Note => !!n);
});
</script>

<template>
  <div class="side-panel-content">
    <div v-if="props.note.tags?.length" class="tags-section">
      <h3>{{ t('tags.title') }}</h3>
      <div class="tags">
        <router-link
          v-for="tag in props.note.tags"
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

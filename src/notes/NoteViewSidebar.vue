<script setup lang="ts">
import Mentions from '@/components/common/Mentions.vue';
import { computed, onMounted } from 'vue';
import type { Note } from '@/types';
import { useI18n } from 'vue-i18n';
import { useMentionsStore } from '@/utils/storage';

const { t } = useI18n();

const mentionsStore = useMentionsStore();

const props = defineProps<{
  note: Note;
}>();

const mentions = computed(() => {
  return props.note.value
    ? mentionsStore.getLinks({ kind: 'note', id: props.note.value.id })
    : [];
});

// Find notes that mention this note using the indexation store
const mentionedIn = computed(() =>
  props.note.value
    ? mentionsStore.getBacklinks({
        kind: 'note',
        id: props.note.value.id,
      })
    : [],
);

onMounted(() => mentionsStore.load());
</script>

<template>
  <div class="side-panel-content q-pa-md">
    <div v-if="props.note.tags?.length" class="tags-section">
      <h5>{{ t('tags.title') }}</h5>
      <div class="tags">
        <router-link
          v-for="tag in props.note.tags"
          :key="tag"
          class="tag"
          :to="{ path: '/notes', query: { tag: encodeURIComponent(tag) } }"
          >#{{ tag }}</router-link
        >
      </div>
      <QSeparator />
    </div>
    <Mentions :title="t('common.mentions')" :entities="mentions" />
    <QSeparator />
    <Mentions :title="t('common.mentionedIn')" :entities="mentionedIn" />
  </div>
</template>

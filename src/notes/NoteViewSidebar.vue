<script setup lang="ts">
import type { Note } from '@/types';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  note: Note;
}>();
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
  </div>
</template>

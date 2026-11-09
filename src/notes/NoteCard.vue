<script setup lang="ts">
import type { Note } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';
import Button from '@/components/form/Button.vue';
import { ref, onMounted, nextTick, watch } from 'vue';
import Markdown from '@/components/common/Markdown.vue';
import { useI18n } from 'vue-i18n';

import { debug } from '@/utils/debug';
import { downloadNote } from '@/notes/downloadNote';
import { noteDisplayTitle } from '@/utils/noteTitle';

const props = defineProps<{ note: Note }>();
const emit = defineEmits(['edit', 'delete', 'view', 'tag-click', 'copy']);

const contentRef = ref<HTMLElement | null>(null);
const clamped = ref(false);
const expanded = ref(false);

const { t } = useI18n();

function checkClamped() {
  if (contentRef.value) {
    clamped.value = contentRef.value.scrollHeight > 600;
  }
}

onMounted(() => {
  nextTick(checkClamped);
});

watch(
  () => props.note.content,
  () => {
    nextTick(checkClamped);
  },
);

function handleView() {
  emit('view', props.note);
}
function handleEdit() {
  emit('edit', props.note);
}
function handleDelete() {
  emit('delete', props.note);
}
function toggleExpand() {
  expanded.value = !expanded.value;
}
function handleCopy() {
  debug('NoteCard handleCopy', props.note);
  emit('copy', props.note);
}

function handleDownload() {
  downloadNote(props.note);
}
</script>
<template>
  <BaseCard
    :class="{ 'note-card-expanded': expanded }"
    :hover-expand="!expanded"
    showView
    showEdit
    showDelete
    showCopy
    @view="handleView"
    @edit="handleEdit"
    @delete="handleDelete"
    @copy="handleCopy"
    :drag-entity="{ kind: 'note', id: note.id, title: noteDisplayTitle(note) }"
  >
    <template #header>
      <div class="row items-center q-gutter-xs">
        <h5 v-if="note.title?.trim()" class="q-ma-none">{{ note.title }}</h5>
      </div>
    </template>

    <div v-if="note.content?.length > 0 || note.tags?.length > 0">
      <div
        ref="contentRef"
        :class="['note-card-content', { clamped: clamped && !expanded }]"
      >
        <Markdown :content="note.content" />
      </div>
      <div class="note-card-footer">
        <div class="tags">
          <span
            v-for="tag in note.tags"
            :key="tag"
            class="tag"
            @click.stop="emit('tag-click', tag)"
          >
            {{ t('tagSelector.hash') }}{{ tag }}
          </span>
        </div>
      </div>
    </div>
    <template #actions>
      <QBtn
        flat
        color="warning"
        :title="t('common.download')"
        :aria-label="t('common.download')"
        @click.stop="handleDownload"
      >
        <QIcon name="tabler-file-download" />
      </QBtn>
      <Button
        v-if="clamped"
        size="small"
        variant="ghost"
        @click="toggleExpand"
        :title="expanded ? t('common.collapse') : t('common.expand')"
      >
        <QIcon name="tabler-chevron-up" v-if="expanded" />
        <QIcon name="tabler-chevron-down" v-else />
      </Button>
    </template>
  </BaseCard>
</template>
<style scoped>
.note-card-content {
  padding: 0.5rem;
  border-radius: var(--border-radius-sm);
}

/* Expanded note cards fill the available workspace below the app header. */
.note-card-expanded {
  position: fixed;
  top: 67px;
  right: 24px;
  bottom: 24px;
  left: 24px;
  z-index: 2000;
}

@media (min-width: 1024px) {
  .note-card-expanded {
    left: 80px;
  }
}

.note-card-expanded :deep(.base-card) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-bottom: var(--card-actions-height);
  box-shadow: var(--shadow-lg);
}

.note-card-expanded :deep(.base-card-content) {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.note-card-expanded :deep(.base-card-content) > div {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.note-card-expanded .note-card-content {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.note-card-expanded .note-card-content.clamped {
  max-height: none;
  overflow-y: auto;
}

.note-card-expanded .note-card-footer {
  flex: 0 0 auto;
}

@media (max-width: 599px) {
  .note-card-expanded {
    top: 59px;
    right: 8px;
    bottom: 8px;
    left: 8px;
  }
}

.note-card-content {
  position: relative;
}

.note-card-content.clamped {
  max-height: 600px;
  overflow: hidden;
}

.note-card-content.clamped::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 72px;
  pointer-events: none;
  content: '';
  background: linear-gradient(
    to bottom,
    transparent,
    var(--note-card-fade, var(--color-card-background))
  );
}
</style>

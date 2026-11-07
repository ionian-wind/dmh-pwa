<script setup lang="ts">
import type { Note } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';
import Button from '@/components/form/Button.vue';
import { computed, ref, onMounted, nextTick, watch } from 'vue';
import Markdown from '@/components/common/Markdown.vue';
import { useI18n } from 'vue-i18n';
import {
  IconChevronDown,
  IconChevronUp,
  IconFileDownload,
} from '@tabler/icons-vue';
import { debug } from '@/utils/debug';
import { downloadNote } from '@/notes/downloadNote';
import { noteDisplayTitle } from '@/utils/noteTitle';

const props = defineProps<{ note: Note }>();
const emit = defineEmits(['edit', 'delete', 'view', 'tag-click', 'copy']);

const contentRef = ref<HTMLElement | null>(null);
const clamped = ref(false);
const expanded = ref(false);

const { t } = useI18n();
const isDrawing = computed(() => props.note.contentType === 'draw');

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

    <div v-if="isDrawing || note.content?.length > 0 || note.tags?.length > 0">
      <img
        v-if="isDrawing && note.preview"
        :src="note.preview"
        :alt="note.title"
        class="note-drawing-preview"
      />
      <div
        v-else
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
        :disable="isDrawing && !note.preview"
        @click.stop="handleDownload"
      >
        <IconFileDownload />
      </QBtn>
      <Button
        v-if="clamped"
        size="small"
        variant="ghost"
        @click="toggleExpand"
        :title="expanded ? t('common.collapse') : t('common.expand')"
      >
        <IconChevronUp v-if="expanded" />
        <IconChevronDown v-else />
      </Button>
    </template>
  </BaseCard>
</template>
<style scoped>
.note-card-content {
  padding: 0.5rem;
  border-radius: var(--border-radius-sm);
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

.note-drawing-preview {
  width: 100%;
  max-height: 180px;
  border-radius: var(--border-radius);
  object-fit: contain;
}
</style>

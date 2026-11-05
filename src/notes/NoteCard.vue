<script setup lang="ts">
import type { Note } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';
import Button from '@/components/form/Button.vue';
import { computed, ref, onMounted, nextTick, watch } from 'vue';
import Markdown from '@/components/common/Markdown.vue';
import { useI18n } from 'vue-i18n';
import {
  IconBrush,
  IconChevronDown,
  IconChevronUp,
  IconFileText,
  IconFileDownload,
} from '@tabler/icons-vue';
import { debug } from '@/utils/debug';
import { downloadNote } from '@/notes/downloadNote';

const props = defineProps<{ note: Note; moduleName?: string }>();
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
  >
    <template #header>
      <div class="row items-center q-gutter-xs">
        <IconBrush v-if="isDrawing" :size="18" class="text-grey-7" />
        <IconFileText v-else :size="18" class="text-grey-7" />
        <h5 class="q-ma-none">{{ note.title }}</h5>
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
        :style="
          note.backgroundColor
            ? { backgroundColor: note.backgroundColor }
            : undefined
        "
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
        variant="secondary"
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

.note-card-content.clamped {
  max-height: 600px;
  overflow: hidden;
}

.note-drawing-preview {
  width: 100%;
  max-height: 180px;
  border-radius: var(--border-radius);
  object-fit: contain;
}

.tag {
  cursor: pointer;
  text-decoration: underline dotted;
  transition: color 0.15s;
}
.tag:hover {
  color: var(--color-primary);
}
</style>

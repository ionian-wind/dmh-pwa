<script setup lang="ts">
import type { Note } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';;
import Button from '@/components/form/Button.vue';
import { ref, onMounted, nextTick, watch } from 'vue';
import Markdown from '@/components/common/Markdown.vue';
import { useI18n } from 'vue-i18n';
import { IconChevronUp, IconChevronDown } from '@tabler/icons-vue';
import { debug } from '@/utils/debug';

const props = defineProps<{ note: Note; moduleName?: string }>();
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

watch(() => props.note.content, () => {
  nextTick(checkClamped);
});

function handleView() { emit('view', props.note); }
function handleEdit() { emit('edit', props.note); }
function handleDelete() { emit('delete', props.note); }
function toggleExpand() { expanded.value = !expanded.value; }
function handleCopy() { 
  debug('NoteCard handleCopy', props.note);
  emit('copy', props.note); 
}
</script>
<template>
  <BaseCard showView showEdit showDelete @view="handleView" @edit="handleEdit" @delete="handleDelete" @copy="handleCopy">
    <template #header>
      <h3>{{ note.title }}</h3>
      <span v-if="moduleName" class="module-badge">{{ moduleName }}</span>
    </template>
    <div v-if="note.content?.length > 0 || note.tags?.length > 0">
      <div ref="contentRef" :class="['note-card-content', { clamped: clamped && !expanded }]">
        <Markdown :content="note.content" />
      </div>
      <div class="note-card-footer">
        <div class="tags">
          <span
            v-for="tag in note.tags"
            :key="tag"
            class="tag"
            @click.stop="emit('tag-click', tag)"
          >{{ t('tagSelector.hash') }}{{ tag }}</span>
        </div>
      </div>
    </div>
    <template #actions>
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
  /* No max-height or overflow here, so short notes are not restricted */
  position: relative;
}
.note-card-content.clamped {
  max-height: 400px;
  overflow: hidden;
}
.note-card-content.clamped::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3em;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, var(--color-background) 100%);
  z-index: 2;
}

.note-card-content {
  color: var(--color-text);
  line-height: 1.5;
  flex: 1;
}

.note-card-content p {
  margin: 0;
}

.note-card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.module-badge {
  background: var(--color-background-soft);
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius);
  font-size: 0.9rem;
  color: var(--color-text);
}

.tag {
  cursor: pointer;
  text-decoration: underline dotted;
  transition: color 0.15s;
}
.tag:hover {
  color: var(--color-primary);
}

.si {
  margin-right: 0;
}
</style> 

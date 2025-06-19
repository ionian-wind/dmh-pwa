<script setup lang="ts">
import type { Note } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';;
import Button from '@/components/common/Button.vue';
import { parseMarkdown } from '@/utils/markdownParser';
import { ref, onMounted, nextTick, watch } from 'vue';
import Markdown from '@/components/common/Markdown.vue';

const props = defineProps<{ note: Note; moduleName?: string }>();
const emit = defineEmits(['edit', 'delete', 'view', 'tag-click']);

const contentRef = ref<HTMLElement | null>(null);
const clamped = ref(false);
const expanded = ref(false);

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
</script>
<template>
  <BaseCard showView showEdit showDelete @view="handleView" @edit="handleEdit" @delete="handleDelete">
    <template #header>
      <h3>{{ note.title }}</h3>
      <span v-if="moduleName" class="module-badge">{{ moduleName }}</span>
    </template>
    <div v-if="note.content?.length > 0 || note.tags?.length > 0">
      <div :class="['note-card-content', { clamped: clamped && !expanded }]">
        <Markdown :content="note.content" />
      </div>
      <div class="note-card-footer">
        <div class="tags">
          <span
            v-for="tag in note.tags"
            :key="tag"
            class="tag clickable"
            @click.stop="emit('tag-click', tag)"
          >#{{ tag }}</span>
        </div>
      </div>
    </div>
    <template #actions>
      <Button v-if="clamped" size="small" variant="secondary" @click="toggleExpand">
        {{ expanded ? 'Collapse' : 'Expand' }}
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
  max-height: 600px;
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
  background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, #fff 100%);
  z-index: 2;
}

.note-card-content {
  color: var(--color-text);
  line-height: 1.5;
  flex: 1;
}

.note-card-content p {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

.tag.clickable {
  cursor: pointer;
  text-decoration: underline dotted;
  transition: color 0.15s;
}
.tag.clickable:hover {
  color: var(--color-primary);
}
</style> 

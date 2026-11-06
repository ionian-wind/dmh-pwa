<script setup lang="ts">
import { ref } from 'vue';
import MarkdownEditor from '@/components/common/MarkdownEditor.vue';

const props = defineProps<{
  modelValue: string;
  isVisualMode: boolean;
  entityId: string;
  entityType: string;
  tags?: string[];
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const editorRef = ref<any>(null);

function getMarkdown(): string {
  return editorRef.value?.getMarkdown?.() ?? props.modelValue;
}

defineExpose({ getMarkdown });
</script>

<template>
  <MarkdownEditor
    ref="editorRef"
    :model-value="modelValue"
    @update:model-value="(value) => emit('update:modelValue', value)"
    enableMentions
    :isWYSIWYGMode="isVisualMode"
    :placeholder="placeholder"
    :current-entity-id="entityId"
    :current-entity-type="entityType"
    :tags="tags"
  />
</template>

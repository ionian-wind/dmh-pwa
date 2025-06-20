<script setup lang="ts">
import { defineProps, defineEmits, useAttrs } from 'vue';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
  hideFormattingHelp?: boolean;
}>();

const emit = defineEmits(['update:modelValue']);
const attrs = useAttrs();

function onInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null;
  if (target) {
    emit('update:modelValue', target.value);
  }
}
</script>

<template>
  <div class="markdown-editor-wrapper">
    <label v-if="props.label" class="markdown-label">{{ props.label }}</label>
    <textarea
      :value="props.modelValue"
      :placeholder="props.placeholder || 'Write here... Markdown supported'"
      :rows="props.rows || 10"
      :class="['markdown-editor', props.className]"
      @input="onInput"
      v-bind="attrs"
    ></textarea>
    <div v-if="!props.hideFormattingHelp" class="formatting-help">
      <h4>Formatting Help</h4>
      <div class="help-grid">
        <div class="help-item">
          <span class="help-title">Internal Links</span>
          <code>[[type:id]]</code>
          <p>Link to other entities in your campaign:</p>
          <ul>
            <li><code>[[note:123]]</code> - Link to a note</li>
            <li><code>[[module:123]]</code> - Link to a module</li>
            <li><code>[[party:123]]</code> - Link to a party</li>
            <li><code>[[monster:123]]</code> - Link to a monster</li>
            <li><code>[[encounter:123]]</code> - Link to an encounter</li>
          </ul>
        </div>
        <div class="help-item">
          <span class="help-title">Markdown</span>
          <p>Basic markdown formatting:</p>
          <ul>
            <li><code>**bold**</code> - <strong>Bold text</strong></li>
            <li><code>*italic*</code> - <em>Italic text</em></li>
            <li><code># Heading</code> - Section heading</li>
            <li><code>- item</code> - Bullet list</li>
            <li><code>1. item</code> - Numbered list</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.markdown-editor-wrapper {
  width: 100%;
}
.markdown-label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5em;
}
.markdown-editor {
  width: 100%;
  min-height: 6em;
  font-family: inherit;
  font-size: 1em;
  padding: 0.75em 1em;
  border: 1px solid var(--color-border, #ccc);
  border-radius: 4px;
  background: var(--color-background, #fff);
  resize: vertical;
  margin-bottom: 1em;
}
.formatting-help {
  margin-top: 0.5em;
  background: var(--color-background-soft, #f9f9f9);
  border: 1px solid var(--color-border, #eee);
  border-radius: 4px;
  padding: 0.75em 1em;
  font-size: 0.95em;
}
.help-grid {
  display: flex;
  gap: 2em;
  flex-wrap: wrap;
}
.help-item {
  min-width: 180px;
}
.help-title {
  font-weight: 600;
  margin-bottom: 0.25em;
  display: block;
}
</style> 
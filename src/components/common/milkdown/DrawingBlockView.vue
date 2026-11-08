<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { brushIcon, pencilIcon, trashIcon } from './tablerIcons';

const props = defineProps<{
  drawingId: string;
  preview: string;
  caption: string;
  readonly: boolean;
  setAttr: (attr: string, value: unknown) => void;
  onEdit: () => void;
  onDelete: () => void;
}>();

const { t } = useI18n();

function updateCaption(event: Event) {
  props.setAttr('caption', (event.target as HTMLInputElement).value);
}

function stopEditor(event: Event) {
  event.stopPropagation();
}
</script>

<template>
  <figure class="drawing-block" :data-drawing-id="drawingId">
    <img v-if="preview" :src="preview" :alt="caption" class="drawing-preview" />
    <div v-else class="drawing-preview drawing-preview--empty">
      <span v-html="brushIcon" />
    </div>

    <div v-if="!readonly" class="drawing-block-actions">
      <button
        type="button"
        class="drawing-block-action"
        :title="t('drawing.edit')"
        :aria-label="t('drawing.edit')"
        @click.stop="onEdit"
        @mousedown.stop="stopEditor"
      >
        <span v-html="pencilIcon" />
      </button>
      <button
        type="button"
        class="drawing-block-action drawing-block-action--delete"
        :title="t('drawing.delete')"
        :aria-label="t('drawing.delete')"
        @click.stop="onDelete"
        @mousedown.stop="stopEditor"
      >
        <span v-html="trashIcon" />
      </button>
    </div>

    <input
      v-if="!readonly"
      class="drawing-caption"
      :value="caption"
      :placeholder="t('drawing.captionPlaceholder')"
      :aria-label="t('drawing.captionPlaceholder')"
      @change="updateCaption"
      @mousedown.stop="stopEditor"
      @keydown.stop
    />
    <figcaption v-else-if="caption" class="drawing-caption">
      {{ caption }}
    </figcaption>
  </figure>
</template>

<style scoped>
.drawing-block {
  position: relative;
  margin: 1rem 0;
  padding: 0.5rem;
  border: 1px solid var(--color-border-light);
  border-radius: var(--border-radius);
  background: var(--color-background-soft);
}

.drawing-preview {
  display: block;
  width: 100%;
  max-height: 60vh;
  object-fit: contain;
  border-radius: var(--border-radius-sm);
  background: #fff;
}

.drawing-preview--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  color: var(--color-text-lighter);
}

.drawing-preview--empty :deep(svg) {
  width: 32px;
  height: 32px;
}

.drawing-block-actions {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: flex;
  gap: 0.25rem;
  padding: 0.2rem;
  border-radius: var(--border-radius-sm);
  background: var(--color-card-background);
  box-shadow: var(--shadow-sm);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.drawing-block:hover .drawing-block-actions,
.drawing-block:focus-within .drawing-block-actions {
  opacity: 1;
}

.drawing-block-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--color-text-light);
  cursor: pointer;
}

.drawing-block-action:hover {
  color: var(--color-accent);
  background: var(--color-background-mute);
}

.drawing-block-action--delete:hover {
  color: var(--color-danger);
}

.drawing-block-action :deep(svg) {
  width: 16px;
  height: 16px;
}

.drawing-caption {
  display: block;
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.25rem 0.4rem;
  border: 1px solid transparent;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--color-text-light);
  font-size: 0.9rem;
  text-align: center;
}

input.drawing-caption:focus {
  outline: none;
  border-color: var(--color-border);
  background: var(--color-background);
}

figcaption.drawing-caption {
  margin-top: 0.5rem;
  text-align: center;
}
</style>

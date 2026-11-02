<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { createQuickdraw, type QuickdrawInstance } from '@quickdrawjs/core';
import '@quickdrawjs/core/quickdraw.css';
import { localizeQuickdraw } from './quickdrawLocale';

const props = defineProps<{
  modelValue?: string;
  readonly?: boolean;
}>();

const { locale } = useI18n();
const container = useTemplateRef<HTMLDivElement>('container');
let board: QuickdrawInstance | null = null;
let stopLocale: (() => void) | null = null;

function parseSnapshot(value?: string): object | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

onMounted(() => {
  if (!container.value) return;

  board = createQuickdraw({
    container: container.value,
    theme: 'light',
    grid: 'lines',
    hideUi: props.readonly,
    watermark: false,
  });

  const snapshot = parseSnapshot(props.modelValue);
  if (snapshot) {
    board.editor.store.loadSnapshot(snapshot as never);
  }
  if (props.readonly) {
    board.editor.setReadonly(true);
  }
  stopLocale = localizeQuickdraw(container.value, locale);
});

onBeforeUnmount(() => {
  stopLocale?.();
  stopLocale = null;
  board?.destroy();
  board = null;
});

function getSnapshot(): string {
  return board
    ? JSON.stringify(board.editor.store.getSnapshot())
    : (props.modelValue ?? '');
}

defineExpose({ getSnapshot });
</script>

<template>
  <div ref="container" class="note-canvas" />
</template>

<style scoped>
.note-canvas {
  height: 55vh;
  min-height: 360px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
}
</style>

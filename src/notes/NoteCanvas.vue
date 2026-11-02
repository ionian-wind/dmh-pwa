<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';
import type { Root } from 'react-dom/client';
import type { Editor, TLEditorSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';

const props = defineProps<{
  modelValue?: string;
  readonly?: boolean;
}>();

const container = useTemplateRef<HTMLDivElement>('container');
let root: Root | null = null;
let editor: Editor | null = null;
let unmounted = false;

function parseSnapshot(value?: string): TLEditorSnapshot | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

onMounted(async () => {
  const [{ createElement }, { createRoot }, { Tldraw }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('tldraw'),
  ]);
  if (unmounted || !container.value) return;

  root = createRoot(container.value);
  root.render(
    createElement(Tldraw, {
      onMount: (instance: Editor) => {
        editor = instance;
        if (props.readonly) {
          instance.updateInstanceState({ isReadonly: true });
        }
        const snapshot = parseSnapshot(props.modelValue);
        if (snapshot) {
          instance.loadSnapshot(snapshot);
        }
      },
    }),
  );
});

onBeforeUnmount(() => {
  unmounted = true;
  root?.unmount();
  root = null;
  editor = null;
});

function getSnapshot(): string {
  return editor
    ? JSON.stringify(editor.getSnapshot())
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

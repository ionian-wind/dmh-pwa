<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { monaco } from '@/components/common/monaco';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    language?: string;
    theme?: string;
    readonly?: boolean;
    height?: string;
    options?: monaco.editor.IStandaloneEditorConstructionOptions;
  }>(),
  {
    language: 'plaintext',
    theme: 'vs',
    readonly: false,
    height: '320px',
    options: () => ({}),
  },
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'ready', editor: monaco.editor.IStandaloneCodeEditor): void;
}>();

const host = ref<HTMLDivElement | null>(null);
const editor = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null);
let contentSubscription: monaco.IDisposable | undefined;

onMounted(() => {
  if (!host.value) return;

  const instance = monaco.editor.create(host.value, {
    value: props.modelValue,
    language: props.language,
    theme: props.theme,
    readOnly: props.readonly,
    automaticLayout: true,
    minimap: { enabled: false },
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 22,
    lineNumbers: 'on',
    glyphMargin: false,
    folding: true,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    wordWrap: 'on',
    tabSize: 2,
    renderWhitespace: 'selection',
    padding: { top: 10, bottom: 10 },
    ...props.options,
  });

  contentSubscription = instance.onDidChangeModelContent(() => {
    const value = instance.getValue();
    if (value !== props.modelValue) {
      emit('update:modelValue', value);
    }
  });

  editor.value = instance;
  emit('ready', instance);
});

watch(
  () => props.modelValue,
  (value) => {
    const instance = editor.value;
    if (!instance) return;
    if (instance.getValue() !== value) {
      instance.setValue(value);
    }
  },
);

watch(
  () => props.language,
  (language) => {
    const model = editor.value?.getModel();
    if (model) monaco.editor.setModelLanguage(model, language);
  },
);

watch(
  () => props.theme,
  (theme) => {
    monaco.editor.setTheme(theme);
  },
);

watch(
  () => props.readonly,
  (readonly) => {
    editor.value?.updateOptions({ readOnly: readonly });
  },
);

onBeforeUnmount(() => {
  contentSubscription?.dispose();
  editor.value?.dispose();
  editor.value = null;
});

defineExpose({
  focus: () => editor.value?.focus(),
  getEditor: () => editor.value,
});
</script>

<template>
  <div ref="host" class="monaco-editor-host" :style="{ height }"></div>
</template>

<style scoped>
.monaco-editor-host {
  width: 100%;
  border: 1px solid var(--color-border, #ccc);
  border-radius: var(--border-radius, 6px);
  overflow: hidden;
}
</style>

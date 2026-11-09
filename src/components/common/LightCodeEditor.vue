<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import {
  ActiveLineAndIndentGuidesExtension,
  BracketMatchingExtension,
  CompletionExtension,
  DiagnosticsExtension,
  EditingCommandsExtension,
  LineNumbersExtension,
  SearchExtension,
  SyntaxHighlightingExtension,
  createEditor,
  type CompletionProvider,
  type EditorAPI,
  type EditorDiagnostic,
} from '@editora/light-code-editor';
import '@editora/light-code-editor/light-code-editor.css';

export interface EditorSyntaxMode {
  id: string;
  mode: {
    name: string;
    highlight: (source: string, colors: Record<string, string>) => string;
  };
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    language?: string;
    theme?: string;
    readonly?: boolean;
    height?: string;
    ariaLabel?: string;
    syntaxMode?: EditorSyntaxMode;
    completionProviders?: CompletionProvider[];
  }>(),
  {
    language: 'plaintext',
    theme: 'light',
    readonly: false,
    height: '320px',
    ariaLabel: 'Code editor',
    syntaxMode: undefined,
    completionProviders: () => [],
  },
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'ready', editor: EditorAPI): void;
}>();

const host = ref<HTMLDivElement | null>(null);
const editor = shallowRef<EditorAPI | null>(null);
const diagnostics = shallowRef<DiagnosticsExtension | null>(null);
const syntax = shallowRef<SyntaxHighlightingExtension | null>(null);

function editorTheme(theme: string): string {
  return theme === 'vs-dark' || theme === 'dark' ? 'dark' : 'light';
}

onMounted(() => {
  if (!host.value) return;

  const syntaxExtension = new SyntaxHighlightingExtension();
  const diagnosticsExtension = new DiagnosticsExtension({
    showInlineHighlights: true,
    showGutterMarkers: true,
    showStatusBar: false,
  });
  const completionExtension = new CompletionExtension({
    providers: props.completionProviders,
    triggerCharacters: ['[', '{', '"'],
    minPrefixLength: 0,
    autoTrigger: true,
  });

  const instance = createEditor(host.value, {
    value: props.modelValue,
    ariaLabel: props.ariaLabel,
    theme: editorTheme(props.theme),
    readOnly: props.readonly,
    tabSize: 2,
    lineNumbers: true,
    lineWrapping: true,
    extensions: [
      new LineNumbersExtension(),
      syntaxExtension,
      diagnosticsExtension,
      completionExtension,
      new SearchExtension(),
      new BracketMatchingExtension(),
      new ActiveLineAndIndentGuidesExtension(),
      new EditingCommandsExtension(),
    ],
  });

  if (props.syntaxMode) {
    syntaxExtension.registerMode(props.syntaxMode.id, props.syntaxMode.mode);
    instance.executeCommand('setSyntaxLanguage', props.syntaxMode.id);
  } else if (props.language !== 'plaintext') {
    instance.executeCommand('setSyntaxLanguage', props.language);
  }

  instance.on('change', () => {
    const value = instance.getValue();
    if (value !== props.modelValue) {
      emit('update:modelValue', value);
    }
  });

  editor.value = instance;
  diagnostics.value = diagnosticsExtension;
  syntax.value = syntaxExtension;
  emit('ready', instance);
});

watch(
  () => props.modelValue,
  (value) => {
    const instance = editor.value;
    if (instance && instance.getValue() !== value) {
      instance.setValue(value);
    }
  },
);

watch(
  () => props.theme,
  (theme) => {
    editor.value?.setTheme(editorTheme(theme));
  },
);

watch(
  () => props.readonly,
  (readonly) => {
    editor.value?.setReadOnly(readonly);
  },
);

watch(
  () => props.language,
  (language) => {
    if (language !== 'plaintext') {
      editor.value?.executeCommand('setSyntaxLanguage', language);
    }
  },
);

onBeforeUnmount(() => {
  editor.value?.destroy();
  editor.value = null;
  diagnostics.value = null;
  syntax.value = null;
});

defineExpose({
  focus: () => editor.value?.focus(),
  getEditor: () => editor.value,
  setValue: (value: string) => editor.value?.setValue(value),
  setDiagnostics: (items: EditorDiagnostic[]) =>
    diagnostics.value?.setDiagnostics(items),
  clearDiagnostics: () => diagnostics.value?.clearDiagnostics(),
});
</script>

<template>
  <div ref="host" class="light-code-editor-host" :style="{ height }"></div>
</template>

<style scoped>
.light-code-editor-host {
  width: 100%;
  border: 1px solid var(--color-border, #ccc);
  border-radius: var(--border-radius, 6px);
  overflow: hidden;
}
</style>

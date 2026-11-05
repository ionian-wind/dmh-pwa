<script setup lang="ts">
import { ref, watch, useAttrs, computed } from 'vue';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useI18n } from 'vue-i18n';
import MilkdownEditorWrapper from './milkdown/MilkdownEditorWrapper.vue';
import { editorHtmlToMarkdown, markdownToEditorHtml } from './markdownRaw';

// Ref for MilkdownEditorWrapper to access getMarkdown
const milkdownWrapperRef = ref<any>(null);

const { t } = useI18n();

const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();

const props = defineProps<{
  // Toggle between visual editor and raw markdown
  isWYSIWYGMode?: boolean;
  modelValue: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
  enableMentions?: boolean;
  currentEntityType?: string;
  currentEntityId?: string;
}>();

const emit = defineEmits(['update:modelValue']);
const attrs = useAttrs();

const modelValueProxy = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const rawHtml = ref(markdownToEditorHtml(props.modelValue));
const rawEditorRef = ref<any>(null);

watch(
  () => props.modelValue,
  (value) => {
    if (value !== editorHtmlToMarkdown(rawHtml.value)) {
      rawHtml.value = markdownToEditorHtml(value);
    }
  },
);

function onRawUpdate(html: string) {
  rawHtml.value = html;
  emit('update:modelValue', editorHtmlToMarkdown(html));
}

/**
 * Force plain-text pasting. QEditor's contentEditable otherwise preserves
 * markup from copied rich text. Based on the Quasar docs example.
 */
function onRawPaste(evt: any) {
  if (evt.target?.nodeName === 'INPUT') return;

  let text = '';
  evt.preventDefault();
  evt.stopPropagation();

  if (evt.originalEvent?.clipboardData?.getData) {
    text = evt.originalEvent.clipboardData.getData('text/plain');
    rawEditorRef.value?.runCmd('insertText', text);
  } else if (evt.clipboardData?.getData) {
    text = evt.clipboardData.getData('text/plain');
    rawEditorRef.value?.runCmd('insertText', text);
  } else if ((window as any).clipboardData?.getData) {
    text = (window as any).clipboardData.getData('Text');
    rawEditorRef.value?.runCmd('ms-pasteTextOnly', text);
  }
}

function getCurrentMarkdown() {
  if (props.isWYSIWYGMode && milkdownWrapperRef.value?.getMarkdown) {
    return milkdownWrapperRef.value.getMarkdown();
  }
  return editorHtmlToMarkdown(rawHtml.value);
}

// Expose for parent (NoteEditor) to call on submit
function getMarkdown() {
  return getCurrentMarkdown();
}

defineExpose({ getMarkdown });
</script>

<template>
  <div class="markdown-editor-wrapper">
    <label v-if="props.label" class="markdown-label">
      {{ t(props.label) }}
    </label>

    <!-- Visual Editor (MilkdownCrepe) -->
    <QCard flat v-if="props.isWYSIWYGMode">
      <QCardSection>
        <MilkdownEditorWrapper
          ref="milkdownWrapperRef"
          v-model="modelValueProxy"
          v-if="props.enableMentions"
          :current-entity-type="props.currentEntityType || ''"
          :current-entity-id="props.currentEntityId || ''"
        />
        <MilkdownEditorWrapper
          ref="milkdownWrapperRef"
          v-model="modelValueProxy"
          v-else
        />
      </QCardSection>
    </QCard>

    <!-- Raw Markdown Editor -->
    <QEditor
      v-else
      ref="rawEditorRef"
      flat
      square
      :toolbar="[]"
      :model-value="rawHtml"
      :placeholder="props.placeholder"
      class="raw-textarea"
      v-bind="attrs"
      @paste="onRawPaste"
      @update:model-value="onRawUpdate"
    />
  </div>
</template>

<style scoped>
.formatting-help {
  margin-top: 0.5em;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
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

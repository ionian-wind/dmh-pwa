<script setup lang="ts">
import { ref, onUnmounted, onMounted, useAttrs, computed } from 'vue';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useI18n } from 'vue-i18n';
import MilkdownEditorWrapper from './milkdown/MilkdownEditorWrapper.vue';

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
  hideFormattingHelp?: boolean;
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

function getCurrentMarkdown() {
  if (
    !props.isWYSIWYGMode.value &&
    milkdownWrapperRef.value &&
    milkdownWrapperRef.value.getMarkdown
  ) {
    return milkdownWrapperRef.value.getMarkdown();
  }
  return props.modelValue;
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
    <QCard flat bordered v-if="props.isWYSIWYGMode">
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

    <!-- Raw Markdown Textarea -->
    <div v-else class="raw-editor">
      <QInput
        :type="'textarea'"
        :value="modelValueProxy"
        @input="modelValueProxy = ($event.target as HTMLTextAreaElement).value"
        :placeholder="props.placeholder"
        :rows="props.rows || 10"
        class="raw-textarea"
        v-bind="attrs"
        dense
        outlined
      />

      <QCard flat bordered v-if="!props.hideFormattingHelp" class="q-mt-md">
        <QCardSection>
          <h4>{{ t('markdownEditor.formattingHelp') }}</h4>
        </QCardSection>
        <QCardSection class="row">
          <div class="col">
            <span class="help-title">
              {{ t('markdownEditor.help.internalLinks') }}
            </span>
            <code>[title](type://id)</code>
            <p>{{ t('markdownEditor.help.linkToOtherEntities') }}</p>
            <ul>
              <li>
                <code>[Note Title](note://123)</code> -
                {{ t('markdownEditor.help.linkToNote') }}
              </li>
              <li>
                <code>[Module Name](module://123)</code> -
                {{ t('markdownEditor.help.linkToModule') }}
              </li>
              <li>
                <code>[Party Name](party://123)</code> -
                {{ t('markdownEditor.help.linkToParty') }}
              </li>
              <li>
                <code>[Monster Name](monster://123)</code> -
                {{ t('markdownEditor.help.linkToMonster') }}
              </li>
              <li>
                <code>[Encounter Name](encounter://123)</code> -
                {{ t('markdownEditor.help.linkToEncounter') }}
              </li>
            </ul>
          </div>
          <div class="col">
            <span class="help-title">
              {{ t('markdownEditor.help.markdown') }}
            </span>
            <p>{{ t('markdownEditor.help.basicFormatting') }}</p>
            <ul>
              <li>
                <code>**bold**</code> -
                <strong>{{ t('markdownEditor.help.boldText') }}</strong>
              </li>
              <li>
                <code>*italic*</code> -
                <em>{{ t('markdownEditor.help.italicText') }}</em>
              </li>
              <li>
                <code># Heading</code> -
                {{ t('markdownEditor.help.sectionHeading') }}
              </li>
              <li>
                <code>- item</code> - {{ t('markdownEditor.help.bulletList') }}
              </li>
              <li>
                <code>1. item</code> -
                {{ t('markdownEditor.help.numberedList') }}
              </li>
              <li>
                <code>- [ ] Task item</code> {{ t('markdownEditor.help.or') }}
                <code>- [x] {{ t('markdownEditor.help.completedTask') }}</code>
                -
                {{ t('markdownEditor.help.taskList') }}
              </li>
            </ul>
            <p>
              <em>{{ t('markdownEditor.help.taskLists') }}</em>
              {{ t('markdownEditor.help.taskListsWillRender') }}
            </p>
          </div>
        </QCardSection>
      </QCard>
    </div>
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

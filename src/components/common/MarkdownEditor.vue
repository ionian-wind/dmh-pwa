<script setup lang="ts">
import { useAttrs, ref, nextTick, onUnmounted, onMounted } from 'vue';
import MentionSuggestion from './MentionSuggestion.vue';
import { getMentionableEntities } from '@/utils/markdownParser';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();

const props = defineProps<{
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

const textareaRef = ref<HTMLTextAreaElement | null>(null);

// Mention suggestion state
const showMention = ref(false);
const mentionKind = ref<string>('');
const mentionQuery = ref<string>('');
const mentionAnchorEl = ref<HTMLElement | null>(null);
const mentionItems = ref<any[]>([]);
const mentionStartPos = ref<number>(-1);

function onInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null;
  if (target) {
    emit('update:modelValue', target.value);
    if (props.enableMentions) {
      checkMentionTrigger(target);
    }
  }
}

function checkMentionTrigger(target: HTMLTextAreaElement) {
  const value = target.value;
  const caret = target.selectionStart || 0;
  // Find the last _kind: before caret
  const before = value.slice(0, caret);
  // Match _kind: at the end of the string before the caret
  // e.g. "This is a note:"
  const match = before.match(/(?:^|\W)(note|module|party|monster|encounter):$/i);
  if (match) {
    // The mention trigger starts at the matched position
    mentionStartPos.value = caret - match[0].length + (match[0].length - match[1].length - 1); // position after the _
    mentionKind.value = match[1].toLowerCase();
    mentionQuery.value = '';
    if (mentionKind.value && getMentionableEntities(mentionKind.value)) {
      // Show popup for this kind
      const entityMeta = getMentionableEntities(mentionKind.value);
      if (entityMeta) {
        const store = entityMeta.useStore();
        let items = (store?.items || []) as any[];

        // Filter out the current entity
        if (props.currentEntityId && props.currentEntityType === mentionKind.value) {
          items = items.filter((item: any) => item.id !== props.currentEntityId);
        }

        // If suggesting notes, and the current note is not hidden, only show notes with hidden=false
        if (mentionKind.value === 'note') {
          let currentNote = null;
          if (props.currentEntityId) {
            currentNote = noteStore.getById(props.currentEntityId);
          }
          if (!currentNote || currentNote.hidden === false) {
            items = items.filter((item: any) => item.hidden === false);
          }
        }

        mentionItems.value = items.map((item: any) => ({
          id: item[entityMeta.idKey],
          kind: mentionKind.value,
          title: item[entityMeta.titleKey] || item[entityMeta.idKey],
        }));
        showMention.value = true;
        nextTick(() => {
          mentionAnchorEl.value = getCaretCoordinates(target);
        });
      } else {
        showMention.value = false;
      }
    } else {
      showMention.value = false;
    }
  } else {
    showMention.value = false;
  }
}

function getCaretCoordinates(textarea: HTMLTextAreaElement): HTMLElement | null {
  // Create a hidden div to measure caret position
  const div = document.createElement('div');
  const style = window.getComputedStyle(textarea);
  for (const prop of style) {
    div.style.setProperty(prop, style.getPropertyValue(prop));
  }
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.width = textarea.offsetWidth + 'px';
  div.style.height = textarea.offsetHeight + 'px';
  div.textContent = textarea.value.substring(0, textarea.selectionStart || 0);
  const span = document.createElement('span');
  span.textContent = '\u200b';
  div.appendChild(span);
  document.body.appendChild(div);
  const spanRect = span.getBoundingClientRect();
  const textareaRect = textarea.getBoundingClientRect();
  // Calculate position relative to textarea
  const top = textareaRect.top + (spanRect.top - div.getBoundingClientRect().top) - textarea.scrollTop + window.scrollY;
  const left = textareaRect.left + (spanRect.left - div.getBoundingClientRect().left) - textarea.scrollLeft + window.scrollX;
  document.body.removeChild(div);
  // Create a fake anchor element at the caret position
  const anchor = document.createElement('div');
  anchor.style.position = 'absolute';
  anchor.style.left = left + 'px';
  anchor.style.top = top + 'px';
  anchor.style.width = '1px';
  anchor.style.height = '1em';
  document.body.appendChild(anchor);

  return anchor;
}

function handleMentionSelect(item: any) {
  if (!textareaRef.value) return;
  const textarea = textareaRef.value;
  const value = textarea.value;
  const caret = textarea.selectionStart || 0;
  // Replace the mention trigger with the selected mention
  const before = value.slice(0, mentionStartPos.value);
  const after = value.slice(caret);
  const mentionMarkup = `[${item.title}](${item.kind}://${item.id})`;
  const newValue = before + mentionMarkup + after;
  emit('update:modelValue', newValue);
  // Move caret after inserted mention
  nextTick(() => {
    textarea.focus();
    const pos = before.length + mentionMarkup.length;
    textarea.setSelectionRange(pos, pos);
  });
  showMention.value = false;
  // Remove anchorEl
  if (mentionAnchorEl.value) {
    document.body.removeChild(mentionAnchorEl.value);
    mentionAnchorEl.value = null;
  }
}

function handleMentionClose() {
  showMention.value = false;
  if (mentionAnchorEl.value) {
    document.body.removeChild(mentionAnchorEl.value);
    mentionAnchorEl.value = null;
  }
  textareaRef.value?.focus();
}

onMounted(async () => {
  if (props.enableMentions) {
    const stores = [
      noteStore,
      moduleStore,
      partyStore,
      monsterStore,
      encounterStore,
    ];
    await Promise.all(
      stores.map(store => store.isLoaded && store.isLoaded ? undefined : store.load?.())
    );
  }
});

onUnmounted(() => {
  if (mentionAnchorEl.value) {
    document.body.removeChild(mentionAnchorEl.value);
    mentionAnchorEl.value = null;
  }
});
</script>

<template>
  <div class="markdown-editor-wrapper">
    <label v-if="props.label" class="markdown-label">{{ t(props.label) }}</label>
    <textarea
      ref="textareaRef"
      :value="props.modelValue"
      :placeholder="t(props.placeholder || 'markdownEditor.placeholder')"
      :rows="props.rows || 10"
      :class="['markdown-editor', props.className]"
      @input="onInput"
      v-bind="attrs"
    ></textarea>
    <MentionSuggestion
      v-if="props.enableMentions"
      :show="showMention"
      :items="mentionItems"
      :anchorEl="mentionAnchorEl"
      @select="handleMentionSelect"
      @close="handleMentionClose"
      :current-entity-type="props.currentEntityType"
      :current-entity-id="props.currentEntityId"
    />
    <div v-if="!props.hideFormattingHelp" class="formatting-help">
      <h4>{{ t('markdownEditor.formattingHelp') }}</h4>
      <div class="help-grid">
        <div class="help-item">
          <span class="help-title">{{ t('markdownEditor.help.internalLinks') }}</span>
          <code>[title](type://id)</code>
          <p>{{ t('markdownEditor.help.linkToOtherEntities') }}</p>
          <ul>
            <li><code>[Note Title](note://123)</code> - {{ t('markdownEditor.help.linkToNote') }}</li>
            <li><code>[Module Name](module://123)</code> - {{ t('markdownEditor.help.linkToModule') }}</li>
            <li><code>[Party Name](party://123)</code> - {{ t('markdownEditor.help.linkToParty') }}</li>
            <li><code>[Monster Name](monster://123)</code> - {{ t('markdownEditor.help.linkToMonster') }}</li>
            <li><code>[Encounter Name](encounter://123)</code> - {{ t('markdownEditor.help.linkToEncounter') }}</li>
          </ul>
        </div>
        <div class="help-item">
          <span class="help-title">{{ t('markdownEditor.help.markdown') }}</span>
          <p>{{ t('markdownEditor.help.basicFormatting') }}</p>
          <ul>
            <li><code>**bold**</code> - <strong>{{ t('markdownEditor.help.boldText') }}</strong></li>
            <li><code>*italic*</code> - <em>{{ t('markdownEditor.help.italicText') }}</em></li>
            <li><code># Heading</code> - {{ t('markdownEditor.help.sectionHeading') }}</li>
            <li><code>- item</code> - {{ t('markdownEditor.help.bulletList') }}</li>
            <li><code>1. item</code> - {{ t('markdownEditor.help.numberedList') }}</li>
            <li><code>- [ ] Task item</code> {{ t('markdownEditor.help.or') }} <code>- [x] {{ t('markdownEditor.help.completedTask') }}</code> - {{ t('markdownEditor.help.taskList') }}</li>
          </ul>
          <p><em>{{ t('markdownEditor.help.taskLists') }}</em> {{ t('markdownEditor.help.taskListsWillRender') }}</p>
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
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  resize: vertical;
  margin-bottom: 1em;
}
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

<script setup lang="ts">
import { useAttrs, ref, nextTick, onUnmounted, onMounted } from 'vue';
import MentionSuggestion from './MentionSuggestion.vue';
import { getMentionableEntities } from '@/utils/markdownParser';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';

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
  // Find the last [[ before caret
  const before = value.slice(0, caret);
  const match = before.match(/\[\[([a-zA-Z]*)?(:)?([^\]|]*)?$/);
  if (match) {
    // If user typed [[ or [[kind:
    mentionStartPos.value = caret - match[0].length;
    mentionKind.value = match[1] || '';
    mentionQuery.value = match[3] || '';
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
  const mentionMarkup = `[[${item.kind}:${item.id}|${item.title}]]`;
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
    <label v-if="props.label" class="markdown-label">{{ props.label }}</label>
    <textarea
      ref="textareaRef"
      :value="props.modelValue"
      :placeholder="props.placeholder || 'Write here... Markdown supported'"
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
            <li><code>- [ ] Task item</code> or <code>- [x] Completed task</code> - Task list with checkboxes</li>
          </ul>
          <p><em>Task lists</em> written as <code>- [ ]</code> or <code>- [x]</code> will render as disabled checkboxes.</p>
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

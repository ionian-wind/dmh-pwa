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
  if (milkdownWrapperRef.value?.getMarkdown) {
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
        :model-value="modelValueProxy"
        @update:model-value="modelValueProxy = String($event ?? '')"
        :placeholder="props.placeholder"
        :rows="props.rows || 10"
        class="raw-textarea"
        v-bind="attrs"
        dense
        outlined
      />
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

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useNoteTypeStore } from '@/stores/noteTypes';
import type { NoteType } from '@/types';
import { useI18n } from 'vue-i18n';
import { confirm } from '@/dialogs';

const { modelValue, placeholder, allowCreate } = defineProps<{
  modelValue: string | null;
  placeholder?: string;
  allowCreate?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

const noteTypeStore = useNoteTypeStore();
const showTypeEditor = ref(false);
const newType = ref<Partial<NoteType>>({
  name: '',
  description: '',
  color: '#4a90e2',
  icon: undefined,
  fields: [],
});
const { t } = useI18n();

onMounted(async () => {
  await noteTypeStore.load();
});

const handleCreateType = async () => {
  if (newType.value.name?.trim()) {
    await noteTypeStore.create(newType.value as Omit<NoteType, 'id'>);
    newType.value.name = '';
    showTypeEditor.value = false;
  }
};

const handleDeleteType = async (noteType: NoteType) => {
  if (
    noteType.id &&
    await confirm(t('common.confirmDelete'))
  ) {
    await noteTypeStore.remove(noteType.id);
    return true;
  }
  return false;
};
</script>

<template>
  <div class="note-type-selector">
    <QExpansionItem
      :expand-icon-toggle="true"
      v-model="showTypeEditor"
      expand-separator
      class="q-mt-sm"
      :expand-icon="'none'"
      :expanded-icon="'none'"
    >
      <template #header>
        <QItemSection>
          {{ t('editor.type') }}
        </QItemSection>
        <QItemSection>
          <QSelect
            :model-value="modelValue"
            @update:model-value="emit('update:modelValue', $event)"
            :options="
              noteTypeStore.items.map((type) => ({
                label: type.name,
                value: type.id,
              }))
            "
            :label="t(placeholder || 'noteTypeSelector.selectType')"
            emit-value
            map-options
            dense
            outlined
            clearable
          />
        </QItemSection>
        <QItemSection>
          <QBtn
            v-if="allowCreate"
            flat
            @click="showTypeEditor = !showTypeEditor"
            >+</QBtn
          >
        </QItemSection>
      </template>
      <QCard
        ><QCardSection>
          <div class="form-group">
            <label for="type-name">{{ t('noteTypeSelector.name') }}</label>
            <QInput
              id="type-name"
              v-model="newType.name"
              type="text"
              :placeholder="t('noteTypeSelector.name')"
              @keydown.enter.prevent="handleCreateType"
              dense
              outlined
            />
          </div>
          <div class="form-group">
            <label for="type-description">{{
              t('noteTypeSelector.description')
            }}</label>
            <QInput
              id="type-description"
              v-model="newType.description"
              type="text"
              :placeholder="t('noteTypeSelector.description')"
              dense
              outlined
            />
          </div>
          <div class="form-group">
            <label for="type-color">{{ t('noteTypeSelector.color') }}</label>
            <QInput
              dense
              outlined
              id="type-color"
              v-model="newType.color"
              type="text"
            />
          </div>
          <div class="form-group">
            <label for="type-icon">{{ t('noteTypeSelector.icon') }}</label>
            <QInput
              id="type-icon"
              v-model="newType.icon"
              type="text"
              :placeholder="t('noteTypeSelector.iconPlaceholder')"
              dense
              outlined
            />
          </div>
          <div class="type-editor-actions">
            <QBtn flat size="small" @click="handleCreateType">{{
              t('noteTypeSelector.add')
            }}</QBtn>
            <QBtn
              flat
              size="small"
              variant="secondary"
              @click="showTypeEditor = false"
              >{{ t('noteTypeSelector.cancel') }}</QBtn
            >
          </div>
        </QCardSection></QCard
      >
    </QExpansionItem>

    <div v-if="noteTypeStore.items.length > 0" class="type-list">
      <div v-for="type in noteTypeStore.items" :key="type.id" class="type-item">
        <span v-if="type.icon" class="type-icon" :class="type.icon"></span>
        <span
          v-else
          class="type-color"
          :style="{ backgroundColor: type.color }"
        ></span>
        <span class="type-name">{{ type.name }}</span>
        <QBtn
          :color="'negative'"
          class="remove-type-btn"
          @click="handleDeleteType(type)"
          >×</QBtn
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.note-type-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.type-select {
  display: flex;
  gap: 0.5rem;
}

.type-select select {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 1rem;
}

.type-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  min-width: 250px;
}

.type-editor h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group label {
  font-size: 0.9rem;
  color: var(--color-text);
}

.form-group input {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 1rem;
}

.form-group input[type='color'] {
  padding: 0.25rem;
  width: 100%;
  height: 2.5rem;
}

.type-editor-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.type-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: var(--color-background-soft);
  border-radius: var(--border-radius);
  font-size: 0.9rem;
  color: var(--color-text);
}

.type-color {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
}

.type-icon {
  font-size: 1rem;
}

.remove-type-btn {
  padding: 0.1em 0.4em;
  font-size: 1.1em;
  line-height: 1;
}
</style>

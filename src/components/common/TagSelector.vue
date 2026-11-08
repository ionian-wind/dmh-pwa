<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconX } from '@tabler/icons-vue';
import { useNoteStore } from '@/stores/notes';

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const { t } = useI18n();
const noteStore = useNoteStore();

const newTag = ref('');
const suggestionsOpen = ref(false);
const selectedIndex = ref(-1);

const normalizedQuery = computed(() => newTag.value.trim().replace(/^#+/, ''));

const knownTags = computed(() => {
  const tags = new Set<string>();
  for (const tag of [...noteStore.allTags, ...props.modelValue]) {
    const value = tag.trim();
    if (value) tags.add(value);
  }
  return [...tags];
});

const suggestions = computed(() => {
  const query = normalizedQuery.value.toLowerCase();
  return knownTags.value
    .filter((tag) => !props.modelValue.includes(tag))
    .filter((tag) => !query || tag.toLowerCase().includes(query))
    .sort((a, b) => {
      if (!query) return a.localeCompare(b);
      const aStarts = a.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.toLowerCase().startsWith(query) ? 0 : 1;
      return aStarts - bStarts || a.localeCompare(b);
    })
    .slice(0, 20);
});

const canCreate = computed(() => {
  const query = normalizedQuery.value;
  return (
    !!query &&
    !knownTags.value.some((tag) => tag.toLowerCase() === query.toLowerCase())
  );
});

const optionCount = computed(
  () => suggestions.value.length + (canCreate.value ? 1 : 0),
);

watch(newTag, (value) => {
  selectedIndex.value = -1;
  if (value) suggestionsOpen.value = true;
});

function commitTag(tag: string) {
  const value = tag.trim().replace(/^#+/, '');
  if (!value) return;
  if (!props.modelValue.includes(value)) {
    emit('update:modelValue', [...props.modelValue, value]);
  }
  newTag.value = '';
  suggestionsOpen.value = false;
  selectedIndex.value = -1;
}

const addTag = () => {
  commitTag(normalizedQuery.value);
};

const removeTag = (index: number) => {
  const updatedTags = [...props.modelValue];
  updatedTags.splice(index, 1);
  emit('update:modelValue', updatedTags);
};

function moveSelection(delta: number) {
  if (optionCount.value === 0) return;
  if (selectedIndex.value < 0) {
    selectedIndex.value = delta > 0 ? 0 : optionCount.value - 1;
    return;
  }
  selectedIndex.value =
    (selectedIndex.value + delta + optionCount.value) % optionCount.value;
}

function selectCurrent() {
  const index = selectedIndex.value;
  if (index >= 0 && index < suggestions.value.length) {
    commitTag(suggestions.value[index]);
    return;
  }
  addTag();
}
</script>

<template>
  <div class="column q-gutter-sm q-mb-md">
    <div class="row items-start q-gutter-sm">
      <div class="col tag-input-wrapper">
        <QInput
          v-model="newTag"
          :label="t('editor.tags')"
          :placeholder="t('tagSelector.addTag')"
          outlined
          @focus="suggestionsOpen = true"
          @keydown.enter.prevent="selectCurrent"
          @keydown.down.prevent="moveSelection(1)"
          @keydown.up.prevent="moveSelection(-1)"
          @keydown.tab="suggestionsOpen = false"
          @keydown.esc.prevent="suggestionsOpen = false"
        />
        <QMenu
          v-model="suggestionsOpen"
          no-parent-event
          fit
          no-focus
          class="tag-suggestions-menu"
        >
          <div>
            <QList v-if="suggestionsOpen" dense class="tag-suggestions-list">
              <QItem
                v-for="(tag, index) in suggestions"
                :key="tag"
                clickable
                class="tag-suggestion-item"
                :class="{ 'tag-suggestion-active': index === selectedIndex }"
                @click="commitTag(tag)"
                @mouseenter="selectedIndex = index"
              >
                <QItemSection>#{{ tag }}</QItemSection>
              </QItem>
              <QItem
                v-if="canCreate"
                clickable
                class="tag-create-option"
                :class="{
                  'tag-suggestion-active': selectedIndex === suggestions.length,
                }"
                @click="addTag"
                @mouseenter="selectedIndex = suggestions.length"
              >
                <QItemSection>
                  {{
                    t('tagSelector.createTag', {
                      tag: `#${normalizedQuery}`,
                    })
                  }}
                </QItemSection>
              </QItem>
              <QItem
                v-if="suggestions.length === 0 && !canCreate"
                class="tag-suggestions-empty"
              >
                <QItemSection class="text-caption text-grey-7">
                  {{ t('tagSelector.noTags') }}
                </QItemSection>
              </QItem>
            </QList>
          </div>
        </QMenu>
      </div>
      <QBtn
        flat
        color="primary"
        :label="t('tagSelector.add')"
        @click.prevent="addTag"
      />
    </div>

    <div v-if="modelValue.length > 0" class="row q-gutter-xs">
      <QChip dense v-for="(tag, index) in modelValue" :key="index">
        {{ tag }}
        <IconX @click="removeTag(index)" />
      </QChip>
    </div>
  </div>
</template>

<style scoped>
.tag-input-wrapper {
  position: relative;
}

.tag-suggestion-item,
.tag-create-option {
  cursor: pointer;
}

.tag-suggestion-active {
  background: var(--color-background-soft);
}
</style>

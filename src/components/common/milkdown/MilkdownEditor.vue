<template>
  <div>
    <Milkdown />
    <TagInsertPopup
      v-if="tagPopup.show"
      :tags="tagSuggestions"
      :query="tagPopup.query"
      :position="tagPopup.position"
      :onSelect="insertTag"
      :onCreate="insertTag"
      :onClose="closeTagPopup"
    />
    <MentionInsertPopup
      v-if="mentionPopup.show"
      :kind="mentionPopup.kind"
      :mentions="mentionPopup.mentions"
      :position="mentionPopup.position"
      :onSelect="mentionPopup.onSelect"
      :onClose="closeMentionPopup"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { Milkdown, useEditor } from '@milkdown/vue';
import { mentionFeature } from './plugins/mention';
import { createCrepeFeatureConfig } from './crepeConfig';
import MentionInsertPopup from './MentionInsertPopup.vue';
import TagInsertPopup from './TagInsertPopup.vue';
import { registerMentionPopupTrigger } from './plugins/mention';
import { getMentionableEntities } from '@/utils/markdownParser';
import { useNoteStore } from '@/stores/notes';
import { extractHashtags } from '@/utils/tags';
import { registerTagAutocompleteTrigger } from './plugins/tagAutocomplete';
import { tagAutocompleteFeature } from './plugins/tagAutocomplete';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  modelValue: string;
  currentEntityType: string;
  currentEntityId: string;
  tags?: string[];
}>();
const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();
const noteStore = useNoteStore();

const crepeInstance = ref<Crepe | null>(null);

const recentTags = ref<string[]>([]);

const tagSuggestions = computed(() => {
  const tags = new Set<string>([
    ...noteStore.allTags,
    ...(props.tags ?? []),
    ...recentTags.value,
  ]);
  const trailing = props.modelValue.trimEnd();
  for (const tag of extractHashtags(props.modelValue)) {
    if (!trailing.endsWith(`#${tag}`)) tags.add(tag);
  }
  return [...tags];
});

const tagPopup = ref({
  show: false,
  query: '',
  position: { top: 0, left: 0 },
  from: 0,
  to: 0,
  insert: (() => {}) as (tag: string) => void,
});

const mentionPopup = ref({
  show: false,
  kind: '',
  mentions: [] as any[],
  position: { top: 0, left: 0 },
  onSelect: (() => {}) as (mention: any) => void,
});

function openMentionPopup({ kind, mentions, position, onSelect }: any) {
  mentionPopup.value = {
    show: true,
    kind,
    mentions,
    position,
    onSelect,
  };
}

function closeMentionPopup() {
  mentionPopup.value.show = false;
}

function closeTagPopup() {
  tagPopup.value.show = false;
}

function insertTag(tag: string) {
  if (!tagPopup.value.show) return;
  if (!recentTags.value.includes(tag)) recentTags.value.push(tag);
  tagPopup.value.insert(tag);
  closeTagPopup();
}

registerTagAutocompleteTrigger((payload) => {
  if (!payload) {
    closeTagPopup();
    return;
  }
  tagPopup.value = {
    show: true,
    query: payload.query,
    position: payload.position,
    from: payload.from,
    to: payload.to,
    insert: payload.insert,
  };
});

onMounted(() => {
  if (!noteStore.isLoaded) void noteStore.load();
});

// Helper to get mentionable entities for a kind, excluding the current entity
function getMentionables(kind: string) {
  const meta = getMentionableEntities(kind);
  if (!meta) return [];
  const store = meta.useStore();
  let items: any[] = [];
  if (Array.isArray(store.items)) {
    items = store.items;
  } else if (
    store.items &&
    typeof store.items === 'object' &&
    'value' in store.items &&
    Array.isArray((store.items as any).value)
  ) {
    items = (store.items as any).value;
  }
  return items.filter(
    (item: any) =>
      !(
        props.currentEntityType === kind &&
        item[meta.idKey] === props.currentEntityId
      ),
  );
}

registerMentionPopupTrigger((opts) => {
  // Dynamically get mentionable entities for the kind, excluding the current entity
  const mentions = getMentionables(opts.kind);
  openMentionPopup({
    ...opts,
    mentions,
    onSelect: (mention: any) => {
      opts.onSelect(mention);
      closeMentionPopup();
    },
  });
});

// @ts-ignore: Type mismatch due to dynamic plugin system
useEditor((root) => {
  crepeInstance.value = new Crepe({
    root,
    defaultValue: props.modelValue,
    featureConfigs: createCrepeFeatureConfig(t),
  })
    .addFeature(mentionFeature)
    .addFeature(tagAutocompleteFeature);

  crepeInstance.value.on((api) => {
    api.markdownUpdated((_, markdown) => {
      emit('update:modelValue', markdown);
    });
  });
  return crepeInstance.value;
});

defineExpose({
  getMarkdown: () => crepeInstance.value?.getMarkdown() ?? '',
});
</script>

<style scoped>
:global(.milkdown .ProseMirror .tag-link) {
  color: var(--crepe-color-primary);
  text-decoration: underline;
}

:global(
  .milkdown
    .milkdown-slash-menu
    .menu-groups
    .menu-group
    li
    svg.mention-tabler-icon
),
:global(.milkdown .milkdown-toolbar .toolbar-item svg.mention-tabler-icon) {
  color: var(--color-text-light);
  fill: none;
  stroke: currentColor;
}

:global(
  .milkdown .milkdown-toolbar .toolbar-item.active svg.mention-tabler-icon
) {
  color: var(--crepe-color-primary);
  stroke: currentColor;
}
</style>

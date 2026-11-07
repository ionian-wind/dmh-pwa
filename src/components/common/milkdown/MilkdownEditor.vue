<template>
  <div>
    <Milkdown />
    <TagInsertPopup
      v-if="!props.readonly && tagPopup.show"
      :tags="tagSuggestions"
      :query="tagPopup.query"
      :position="tagPopup.position"
      :onSelect="insertTag"
      :onCreate="insertTag"
      :onClose="closeTagPopup"
    />
    <MentionInsertPopup
      v-if="!props.readonly && mentionPopup.show"
      :kind="mentionPopup.kind"
      :mentions="mentionPopup.mentions"
      :position="mentionPopup.position"
      :onSelect="mentionPopup.onSelect"
      :onClose="closeMentionPopup"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { Crepe } from '@milkdown/crepe';
import { Milkdown, useEditor } from '@milkdown/vue';
import { replaceAll } from '@milkdown/kit/utils';
import { editorViewCtx } from '@milkdown/kit/core';
import { mentionFeature } from './plugins/mention';
import { createCrepeFeatureConfig } from './crepeConfig';
import { headingAnchorFeature } from './plugins/headingAnchor';
import { tagDecorationFeature } from './plugins/tagDecoration';
import { collectTocItems, tocFeature } from './plugins/toc';
import { READONLY_CREPE_FEATURES } from './features';
import MentionInsertPopup from './MentionInsertPopup.vue';
import TagInsertPopup from './TagInsertPopup.vue';
import { registerMentionPopupTrigger } from './plugins/mention';
import { getMentionableEntities } from '@/utils/markdownParser';
import { featureLinkKinds } from 'virtual:feature-links';
import { extractHashtags } from '@/utils/tags';
import { registerTagAutocompleteTrigger } from './plugins/tagAutocomplete';
import { tagAutocompleteFeature } from './plugins/tagAutocomplete';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  modelValue: string;
  currentEntityType: string;
  currentEntityId: string;
  tags?: string[];
  readonly?: boolean;
}>();
const emit = defineEmits(['update:modelValue', 'ready']);
const { t } = useI18n();
const noteStore = featureLinkKinds
  .find((option) => option.kind === 'note')
  ?.useStore() as any;

const crepeInstance = shallowRef<Crepe | null>(null);

const recentTags = ref<string[]>([]);

const tagSuggestions = computed(() => {
  const tags = new Set<string>([
    ...(noteStore?.allTags ?? []),
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

if (!props.readonly) {
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
}

onMounted(() => {
  if (!props.readonly && noteStore && !noteStore.isLoaded) {
    void noteStore.load();
  }
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

if (!props.readonly) {
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
}

const lastAppliedValue = ref(props.modelValue);

// @ts-ignore: Type mismatch due to dynamic plugin system
useEditor((root) => {
  const crepe = new Crepe({
    root,
    defaultValue: props.modelValue,
    features: props.readonly ? READONLY_CREPE_FEATURES : {},
    featureConfigs: createCrepeFeatureConfig(t),
  })
    .addFeature(mentionFeature)
    .addFeature(headingAnchorFeature);

  if (props.readonly) {
    crepe.addFeature(tagDecorationFeature).addFeature(tocFeature);
    crepe.setReadonly(true);
  } else {
    crepe.addFeature(tagAutocompleteFeature);
  }

  crepeInstance.value = crepe;
  crepe.on((api) => {
    api.mounted(() => emit('ready'));
    api.markdownUpdated((_, markdown) => {
      if (props.readonly) {
        lastAppliedValue.value = markdown;
        return;
      }
      emit('update:modelValue', markdown);
    });
  });
  return crepe;
});

watch(
  () => props.modelValue,
  (value) => {
    if (!props.readonly) return;
    if (value === lastAppliedValue.value) return;
    const crepe = crepeInstance.value;
    if (!crepe) return;
    lastAppliedValue.value = value;
    crepe.editor.action(replaceAll(value, true));
    queueMicrotask(() => emit('ready'));
  },
);

defineExpose({
  getMarkdown: () => crepeInstance.value?.getMarkdown() ?? '',
  getToc: () =>
    crepeInstance.value?.editor.action((ctx) =>
      collectTocItems(ctx.get(editorViewCtx).state.doc),
    ) ?? [],
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
  color: var(--crepe-color-outline);
  fill: none;
  stroke: currentColor;
}

:global(
  .milkdown .milkdown-toolbar .toolbar-item.active svg.mention-tabler-icon
) {
  color: var(--crepe-color-primary);
  fill: none;
  stroke: currentColor;
}
</style>

<template>
  <div>
    <Milkdown />
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
import { ref } from 'vue';
import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { Milkdown, useEditor } from '@milkdown/vue';
import {
  mentionFeature,
  buildMentionToolbar,
  buildMentionMenu,
} from './plugins/mention';
import MentionInsertPopup from './MentionInsertPopup.vue';
import { registerMentionPopupTrigger } from './plugins/mention';
import { getMentionableEntities } from '@/utils/markdownParser';

const props = defineProps<{
  modelValue: string;
  currentEntityType: string;
  currentEntityId: string;
}>();
const emit = defineEmits(['update:modelValue']);

const crepeInstance = ref<Crepe | null>(null);

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
    featureConfigs: {
      [CrepeFeature.Toolbar]: {
        buildToolbar: buildMentionToolbar,
      },
      [CrepeFeature.BlockEdit]: {
        buildMenu: buildMentionMenu,
      },
    },
  }).addFeature(mentionFeature);

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

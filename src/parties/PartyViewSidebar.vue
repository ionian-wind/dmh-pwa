<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';

import type { InlineEditState, Party } from '@/types';

import { useMentionsStore } from '@/utils/storage';

import Mentions from '@/components/common/Mentions.vue';
import EntityModeControls from '@/components/common/EntityModeControls.vue';

const mentionsStore = useMentionsStore();
const { t } = useI18n();

const props = defineProps<{
  party: Party;
  editState?: InlineEditState<Party>;
  onSetEditMode?: (value: boolean) => void | Promise<void>;
}>();

const localEditState = reactive<InlineEditState<Party>>({
  isEditMode: false,
  isVisualMode: true,
  draft: null,
});

const state = computed(() => props.editState ?? localEditState);

const mentions = computed(() =>
  props.party
    ? mentionsStore.getLinks({ kind: 'party', id: props.party.id })
    : [],
);

const mentionedIn = computed(() =>
  props.party
    ? mentionsStore.getBacklinks({
        kind: 'party',
        id: props.party.id,
      })
    : [],
);

function setEditMode(value: boolean) {
  if (props.onSetEditMode) {
    void props.onSetEditMode(value);
    return;
  }
  state.value.isEditMode = value;
}

function setVisualMode(value: boolean) {
  state.value.isVisualMode = value;
}

onMounted(() => mentionsStore.load());
</script>

<template>
  <div class="side-panel-content column full-height">
    <div class="sidebar-tab-content col-grow q-pa-md">
      <Mentions :title="t('common.mentions')" :entities="mentions" />
      <Mentions :title="t('common.mentionedIn')" :entities="mentionedIn" />
    </div>

    <QSeparator />
    <EntityModeControls
      :is-edit-mode="state.isEditMode"
      :is-visual-mode="state.isVisualMode"
      @update:is-edit-mode="setEditMode"
      @update:is-visual-mode="setVisualMode"
    />
  </div>
</template>

<style scoped>
.sidebar-tab-content {
  min-height: 0;
  overflow-y: auto;
}
</style>

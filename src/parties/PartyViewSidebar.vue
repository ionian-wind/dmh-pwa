<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { InlineEditState, Party } from '@/types';

import { useMentionsStore } from '@/utils/storage';

import Mentions from '@/components/common/Mentions.vue';
import EntityModeControls from '@/components/common/EntityModeControls.vue';
import TabGroup from '@/components/common/TabGroup.vue';
import { IconAt, IconHeadphones } from '@tabler/icons-vue';
import { entityScenesPanel as EntityScenesPanel } from 'virtual:feature-entity-panels';

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
const activeTab = ref('scenes');

const tabs = computed(() => [
  {
    id: 'scenes',
    label: t('ambientSoundPage.scenesTab'),
    icon: IconHeadphones,
  },
  { id: 'mentions', label: t('common.mentions'), icon: IconAt },
]);

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
    <div class="sidebar-tab-content col-grow">
      <TabGroup
        class="full-height"
        :align="'justify'"
        :title-align="'center'"
        v-model="activeTab"
        :tabs="tabs"
        size="sm"
        icon-only
      >
        <template #default>
          <div
            v-show="activeTab === 'scenes'"
            class="scene-tab-panel column full-height"
          >
            <EntityScenesPanel
              v-if="props.party && EntityScenesPanel"
              entity-type="party"
              :entity-id="props.party.id"
              :editable="state.isEditMode"
              :scenes-enabled="false"
            />
          </div>
          <div v-show="activeTab === 'mentions'" class="q-pa-md">
            <Mentions :title="t('common.mentions')" :entities="mentions" />
            <Mentions
              :title="t('common.mentionedIn')"
              :entities="mentionedIn"
            />
          </div>
        </template>
      </TabGroup>
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

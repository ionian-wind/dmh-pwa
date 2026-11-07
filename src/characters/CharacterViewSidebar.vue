<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { InlineEditState, PlayerCharacter } from '@/types';
import { useMentionsStore } from '@/utils/storage';
import TabGroup from '@/components/common/TabGroup.vue';
import EntityModeControls from '@/components/common/EntityModeControls.vue';
import Mentions from '@/components/common/Mentions.vue';
import { IconAt } from '@tabler/icons-vue';
import { entityScenesPanel as EntityScenesPanel } from 'virtual:feature-entity-panels';

const props = defineProps<{
  character: PlayerCharacter | null;
  editState?: InlineEditState<PlayerCharacter>;
  onSetEditMode?: (value: boolean) => void | Promise<void>;
}>();

const { t } = useI18n();
const mentionsStore = useMentionsStore();
const localEditState = reactive<InlineEditState<PlayerCharacter>>({
  isEditMode: false,
  isVisualMode: true,
  draft: null,
});
const activeTab = ref('scenes');

const state = computed(() => props.editState ?? localEditState);

const entityId = computed(() => props.character?.id || '');
const mentions = computed(() =>
  entityId.value
    ? mentionsStore.getLinks({ kind: 'character', id: entityId.value })
    : [],
);
const mentionedIn = computed(() =>
  entityId.value
    ? mentionsStore.getBacklinks({ kind: 'character', id: entityId.value })
    : [],
);
const tabs = computed(() =>
  state.value.isEditMode
    ? [{ id: 'scenes', label: t('ambientSoundPage.scenesTab') }]
    : [
        { id: 'scenes', label: t('ambientSoundPage.scenesTab') },
        { id: 'mentions', label: t('common.mentions'), icon: IconAt },
      ],
);

watch(
  () => state.value.isEditMode,
  (isEditing) => {
    if (isEditing && activeTab.value === 'mentions') {
      activeTab.value = 'scenes';
    }
  },
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
        :align="'justify'"
        :title-align="'center'"
        v-model="activeTab"
        :tabs="tabs"
        size="sm"
        icon-only
      >
        <template #default>
          <div v-show="activeTab === 'scenes'" class="q-pa-md">
            <EntityScenesPanel
              v-if="entityId && EntityScenesPanel"
              entity-type="character"
              :entity-id="entityId"
            />
          </div>
          <div
            v-if="!state.isEditMode && activeTab === 'mentions'"
            class="q-pa-md"
          >
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

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import TabGroup from '@/components/common/TabGroup.vue';
import Mentions from '@/components/common/Mentions.vue';
import EntityScenesPanel from '@/ambient-sound/components/EntityScenesPanel.vue';
import { useMentionsStore } from '@/utils/storage';
import type { SceneLinkEntityType } from '@/ambient-sound/types';

const props = defineProps<{
  entityType: SceneLinkEntityType;
  entityId: string;
}>();

const { t } = useI18n();
const mentionsStore = useMentionsStore();
const activeTab = ref('mentions');

const mentions = computed(() =>
  props.entityId
    ? mentionsStore.getLinks({
        kind: props.entityType,
        id: props.entityId,
      })
    : [],
);
const mentionedIn = computed(() =>
  props.entityId
    ? mentionsStore.getBacklinks({
        kind: props.entityType,
        id: props.entityId,
      })
    : [],
);

const tabs = computed(() => [
  { id: 'mentions', label: t('common.mentions') },
  { id: 'scenes', label: t('ambientSoundPage.scenesTab') },
]);

onMounted(() => mentionsStore.load());
</script>

<template>
  <div>
    <TabGroup
      :align="'justify'"
      :title-align="'center'"
      v-model="activeTab"
      :tabs="tabs"
      size="sm"
    >
      <template #default>
        <div v-show="activeTab === 'mentions'">
          <Mentions :title="t('common.mentions')" :entities="mentions" />
          <Mentions :title="t('common.mentionedIn')" :entities="mentionedIn" />
        </div>
        <div v-show="activeTab === 'scenes'">
          <EntityScenesPanel
            v-if="entityId"
            :entity-type="entityType"
            :entity-id="entityId"
          />
        </div>
      </template>
    </TabGroup>
  </div>
</template>

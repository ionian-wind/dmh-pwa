<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Encounter } from '@/types';
import { useMentionsStore } from '@/utils/storage';
import TabGroup from '@/components/common/TabGroup.vue';
import Mentions from '@/components/common/Mentions.vue';
import EntityScenesPanel from '@/ambient-sound/components/EntityScenesPanel.vue';

const props = defineProps<{
  encounter: Encounter;
}>();

const { t } = useI18n();
const mentionsStore = useMentionsStore();
const activeTab = ref('mentions');

const entityId = computed(() => props.encounter?.id || '');
const mentions = computed(() =>
  entityId.value
    ? mentionsStore.getLinks({ kind: 'encounter', id: entityId.value })
    : [],
);
const mentionedIn = computed(() =>
  entityId.value
    ? mentionsStore.getBacklinks({ kind: 'encounter', id: entityId.value })
    : [],
);
const tabs = computed(() => [
  { id: 'mentions', label: t('common.mentions') },
  { id: 'scenes', label: t('ambientSoundPage.scenesTab') },
]);

onMounted(() => mentionsStore.load());
</script>

<template>
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
          entity-type="encounter"
          :entity-id="entityId"
        />
      </div>
    </template>
  </TabGroup>
</template>

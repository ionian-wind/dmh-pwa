<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Encounter } from '@/types';
import { useMentionsStore } from '@/utils/storage';
import TabGroup from '@/components/common/TabGroup.vue';
import Mentions from '@/components/common/Mentions.vue';
import { IconAt } from '@tabler/icons-vue';
import { entityScenesPanel as EntityScenesPanel } from 'virtual:feature-entity-panels';

const props = defineProps<{
  encounter: Encounter;
}>();

const { t } = useI18n();
const mentionsStore = useMentionsStore();
const activeTab = ref('scenes');

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
  { id: 'scenes', label: t('ambientSoundPage.scenesTab') },
  { id: 'mentions', label: t('common.mentions'), icon: IconAt },
]);

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
              entity-type="encounter"
              :entity-id="entityId"
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
  </div>
</template>

<style scoped>
.sidebar-tab-content {
  min-height: 0;
  overflow-y: auto;
}
</style>

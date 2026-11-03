<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Encounter } from '@/types';

import { useMentionsStore } from '@/utils/storage';

import Mentions from '@/components/common/Mentions.vue';
import EntityScenesPanel from '@/ambient-sound/components/EntityScenesPanel.vue';

const mentionsStore = useMentionsStore();
const { t } = useI18n();

const props = defineProps<{
  encounter: Encounter;
}>();

const mentions = computed(() =>
  props.encounter
    ? mentionsStore.getLinks({
        kind: 'encounter',
        id: props.encounter.id,
      })
    : [],
);
const mentionedIn = computed(() =>
  props.encounter
    ? mentionsStore.getBacklinks({
        kind: 'encounter',
        id: props.encounter.id,
      })
    : [],
);

onMounted(async () => mentionsStore.load());
</script>

<template>
  <div class="side-panel-content q-pa-md">
    <Mentions :title="t('common.mentions')" :entities="mentions" />
    <QSeparator />
    <Mentions :title="t('common.mentionedIn')" :entities="mentionedIn" />
    <QSeparator />
    <EntityScenesPanel
      entity-type="encounter"
      :entity-id="props.encounter.id"
    />
  </div>
</template>

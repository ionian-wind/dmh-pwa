<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Encounter } from '@/types';

import { useMentionsStore } from '@/utils/storage';

import Mentions from '@/components/common/Mentions.vue';

const mentionsStore = useMentionsStore();
const { t } = useI18n();

const props = defineProps<{
  encounter: Encounter;
}>();

const mentions = computed(() =>
  props.encounter.value
    ? mentionsStore.getLinks({
        kind: 'encounter',
        id: props.encounter.value.id,
      })
    : [],
);
const mentionedIn = computed(() =>
  props.encounter.value
    ? mentionsStore.getBacklinks({
        kind: 'encounter',
        id: props.encounter.value.id,
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
  </div>
</template>

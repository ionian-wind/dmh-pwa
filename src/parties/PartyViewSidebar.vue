<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Party } from '@/types';

import { useMentionsStore } from '@/utils/storage';

import Mentions from '@/components/common/Mentions.vue';

const mentionsStore = useMentionsStore();
const { t } = useI18n();

const props = defineProps<{
  party: Party;
}>();

const mentions = computed(() => {
  return props.party
    ? mentionsStore.getLinks({ kind: 'party', id: props.party.id })
    : [];
});

// Find notes that mention this note using the indexation store
const mentionedIn = computed(() =>
  props.party
    ? mentionsStore.getBacklinks({
        kind: 'party',
        id: props.party.id,
      })
    : [],
);
onMounted(() => mentionsStore.load());
</script>

<template>
  <div class="side-panel-content q-pa-md">
    <Mentions :title="t('common.mentions')" :entities="mentions" />
    <QSeparator />
    <Mentions :title="t('common.mentionedIn')" :entities="mentionedIn" />
  </div>
</template>

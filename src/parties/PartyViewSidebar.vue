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
  return props.party.value
    ? mentionsStore.getLinks({ kind: 'party', id: props.party.value.id })
    : [];
});

// Find notes that mention this note using the indexation store
const mentionedIn = computed(() =>
  props.party.value
    ? mentionsStore.getBacklinks({
        kind: 'party',
        id: props.party.value.id,
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

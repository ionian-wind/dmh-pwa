<script setup lang="ts">
import {computed, onMounted} from "vue";
import {useI18n} from "vue-i18n";

import type {Monster, Party} from "@/types";

import {useMentionsStore} from "@/utils/storage";
import {usePartyStore} from "@/stores/parties";

import Mentions from "@/components/common/Mentions.vue";

const partyStore = usePartyStore();
const mentionsStore = useMentionsStore();
const { t } = useI18n();

const props = defineProps<{
  party: Party,
}>();

const mentions = computed(() => {
  if (!props.party.value) return [];
  return mentionsStore.getLinks({ kind: 'party', id: props.party.value.id });
});
const mentionedInEntities = computed(() => {
  if (!props.party.value) return [];
  return mentionsStore.getBacklinks({ kind: 'party', id: props.party.value.id });
});

onMounted(async () => {
  await partyStore.load();
  await mentionsStore.load();
});
</script>

<template>
  <Mentions :title="t('common.mentions')" :entities="mentions" />
  <Mentions :title="t('common.mentionedIn')" :entities="mentionedInEntities" />
</template>

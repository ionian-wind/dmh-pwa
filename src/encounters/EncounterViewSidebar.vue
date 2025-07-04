<script setup lang="ts">
import {computed, onMounted} from "vue";
import {useI18n} from "vue-i18n";

import type {Encounter} from "@/types";

import {useMentionsStore} from "@/utils/storage";
import {useEncounterStore} from "@/stores/encounters";

import Mentions from "@/components/common/Mentions.vue";

const encounterStore = useEncounterStore();
const mentionsStore = useMentionsStore();
const { t } = useI18n();

const props = defineProps<{
  encounter: Encounter,
}>();

const mentions = computed(() => {
  if (!props.encounter.value) return [];
  return mentionsStore.getLinks({ kind: 'encounter', id: props.encounter.value.id });
});
const mentionedInEntities = computed(() => {
  if (!props.encounter.value) return [];
  return mentionsStore.getBacklinks({ kind: 'encounter', id: props.encounter.value.id });
});

onMounted(async () => {
  await encounterStore.load();
  await mentionsStore.load();
});
</script>

<template>
  <Mentions :title="t('common.mentions')" :entities="mentions" />
  <Mentions :title="t('common.mentionedIn')" :entities="mentionedInEntities" />
</template>

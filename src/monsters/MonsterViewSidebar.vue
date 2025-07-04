<script setup lang="ts">
import {computed, onMounted} from "vue";
import {useI18n} from "vue-i18n";

import type {Monster} from "@/types";

import {useMentionsStore} from "@/utils/storage";
import {useMonsterStore} from "@/stores/monsters";

import Mentions from "@/components/common/Mentions.vue";

const monsterStore = useMonsterStore();
const mentionsStore = useMentionsStore();
const { t } = useI18n();

const props = defineProps<{
  monster: Monster,
}>();

const mentions = computed(() => {
  if (!props.monster.value) return [];
  return mentionsStore.getLinks({ kind: 'monster', id: props.monster.value.id });
});
const mentionedInEntities = computed(() => {
  if (!props.monster.value) return [];
  return mentionsStore.getBacklinks({ kind: 'monster', id: props.monster.value.id });
});

onMounted(async () => {
  await monsterStore.load();
  await mentionsStore.load();
});
</script>

<template>
  <Mentions :title="t('common.mentions')" :entities="mentions" />
  <Mentions :title="t('common.mentionedIn')" :entities="mentionedInEntities" />
</template>

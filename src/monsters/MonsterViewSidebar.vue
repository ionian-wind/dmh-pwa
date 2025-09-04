<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Monster } from '@/types';

import { useMentionsStore } from '@/utils/storage';

import Mentions from '@/components/common/Mentions.vue';

const mentionsStore = useMentionsStore();
const { t } = useI18n();

const props = defineProps<{
  monster: Monster;
}>();

const mentions = computed(() =>
  props.monster.value
    ? mentionsStore.getLinks({
        kind: 'monster',
        id: props.monster.value.id,
      })
    : [],
);
const mentionedIn = computed(() =>
  props.monster.value
    ? mentionsStore.getBacklinks({
        kind: 'monster',
        id: props.monster.value.id,
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

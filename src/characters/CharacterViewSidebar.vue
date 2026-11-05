<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import type { PlayerCharacter } from '@/types';
import { useMentionsStore } from '@/utils/storage';
import Mentions from '@/components/common/Mentions.vue';
import EntityScenesPanel from '@/ambient-sound/components/EntityScenesPanel.vue';

const props = defineProps<{
  character: PlayerCharacter | null;
}>();

const mentionsStore = useMentionsStore();
const { t } = useI18n();

const mentions = computed(() =>
  props.character
    ? mentionsStore.getLinks({ kind: 'character', id: props.character.id })
    : [],
);
const mentionedIn = computed(() =>
  props.character
    ? mentionsStore.getBacklinks({
        kind: 'character',
        id: props.character.id,
      })
    : [],
);

onMounted(() => mentionsStore.load());
</script>

<template>
  <div class="side-panel-content q-pa-md">
    <Mentions :title="t('common.mentions')" :entities="mentions" />
    <Mentions :title="t('common.mentionedIn')" :entities="mentionedIn" />
    <EntityScenesPanel
      v-if="character"
      entity-type="character"
      :entity-id="character.id"
    />
  </div>
</template>

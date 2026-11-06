<script setup lang="ts">
import type { Encounter } from '@/types';
import EntityMentionsScenesSidebar from '@/components/common/EntityMentionsScenesSidebar.vue';

const props = defineProps<{
  encounter: Encounter;
}>();
</script>

<template>
  <EntityMentionsScenesSidebar
    v-if="props.encounter?.id"
    entity-type="encounter"
    :entity-id="props.encounter.id"
  />
</template>

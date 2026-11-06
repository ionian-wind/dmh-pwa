<script setup lang="ts">
import type { PlayerCharacter } from '@/types';
import EntityMentionsScenesSidebar from '@/components/common/EntityMentionsScenesSidebar.vue';

const props = defineProps<{
  character: PlayerCharacter | null;
}>();
</script>

<template>
  <EntityMentionsScenesSidebar
    entity-type="character"
    :entity-id="props.character?.id || ''"
  />
</template>

<script setup lang="ts">
import type { Monster } from '@/types';
import EntityMentionsScenesSidebar from '@/components/common/EntityMentionsScenesSidebar.vue';

const props = defineProps<{
  monster: Monster;
}>();
</script>

<template>
  <EntityMentionsScenesSidebar
    entity-type="monster"
    :entity-id="props.monster.id"
  />
</template>

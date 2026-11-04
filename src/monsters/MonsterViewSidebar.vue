<script setup lang="ts">
import type { Monster } from '@/types';

import EntityScenesPanel from '@/ambient-sound/components/EntityScenesPanel.vue';

const props = defineProps<{
  monster: Monster;
}>();
</script>

<template>
  <div class="side-panel-content q-pa-md">
    <EntityScenesPanel
      v-if="props.monster?.id"
      entity-type="monster"
      :entity-id="props.monster.id"
    />
  </div>
</template>

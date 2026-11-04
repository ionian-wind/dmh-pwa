<script setup lang="ts">
import type { Encounter } from '@/types';

import EntityScenesPanel from '@/ambient-sound/components/EntityScenesPanel.vue';

const props = defineProps<{
  encounter: Encounter;
}>();
</script>

<template>
  <div class="side-panel-content q-pa-md">
    <EntityScenesPanel
      v-if="props.encounter?.id"
      entity-type="encounter"
      :entity-id="props.encounter.id"
    />
  </div>
</template>

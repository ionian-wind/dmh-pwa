<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import type { MapEntityRef } from '@/maps/types';

const props = defineProps<{
  links: MapEntityRef[];
}>();

const { t } = useI18n();
const kinds = computed(() => [...new Set(props.links.map((ref) => ref.kind))]);
</script>

<template>
  <div class="column q-gutter-md">
    <EntitiesLinking
      v-for="kind in kinds"
      :key="kind"
      :kind="kind"
      :model-value="links"
      readonly
    />
    <div v-if="kinds.length === 0" class="text-caption text-grey-7 q-pa-sm">
      {{ t('common.noLinkedEntities') }}
    </div>
  </div>
</template>

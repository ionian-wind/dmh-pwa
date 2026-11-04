<template>
  <div class="column q-gutter-sm">
    <EntitiesLinking
      v-for="kind in linkKinds"
      :key="kind"
      :kind="kind"
      :model-value="sceneEntityRefs"
      @update:model-value="updateEntityLinks"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import EntitiesLinking from '@/maps/components/EntitiesLinking.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { SceneLinkEntityType } from '@/ambient-sound/types';
import type { MapEntityKind, MapEntityRef } from '@/maps/types';

const props = defineProps<{
  packId: string;
  sceneId: string;
}>();

const store = useAmbientSoundStore();

const linkKinds = [
  'module',
  'location',
  'monster',
  'character',
  'encounter',
] as const satisfies readonly MapEntityKind[];

const sceneEntityRefs = computed<MapEntityRef[]>(() =>
  store.linksForScene(props.packId, props.sceneId).map((link) => ({
    kind: link.entityType as MapEntityKind,
    id: link.entityId,
  })),
);

function updateEntityLinks(refs: MapEntityRef[]) {
  const current = store.linksForScene(props.packId, props.sceneId);
  const nextKeys = new Set(refs.map((ref) => `${ref.kind}:${ref.id}`));
  for (const link of current) {
    if (!nextKeys.has(`${link.entityType}:${link.entityId}`)) {
      store.removeSceneLink(link.id);
    }
  }
  for (const ref of refs) {
    const exists = current.some(
      (link) => link.entityType === ref.kind && link.entityId === ref.id,
    );
    if (!exists) {
      store.addSceneLink(
        props.packId,
        props.sceneId,
        ref.kind as SceneLinkEntityType,
        ref.id,
      );
    }
  }
}
</script>

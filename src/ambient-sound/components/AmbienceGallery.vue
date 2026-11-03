<template>
  <div>
    <div v-if="groups.length">
      <EntityGroup
        v-for="group in groups"
        :key="group.category"
        :title="group.category"
      >
        <div class="column q-gutter-sm">
          <AmbienceItem
            v-for="entry in group.items"
            :key="`${entry.packageId}:${entry.ambience.id}`"
            :ambience="entry.ambience"
            :active-variation-id="
              activeVariationId(entry.packageId, entry.ambience.id)
            "
            :pack-name="entry.pack.name"
            :used-in="usedIn(entry.packageId, entry.ambience.id)"
            @select-variation="
              (variationId) => selectVariation(entry, variationId)
            "
          />
        </div>
      </EntityGroup>
    </div>

    <EmptyState
      v-else
      :icon="IconWaveSine"
      :title="t('ambientSoundPage.noAmbiences')"
      :hint="t('ambientSoundPage.importPackHint')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconWaveSine } from '@tabler/icons-vue';
import EmptyState from '@/components/common/EmptyState.vue';
import EntityGroup from '@/components/common/EntityGroup.vue';
import AmbienceItem from '@/ambient-sound/components/AmbienceItem.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { GalleryAmbience } from '@/ambient-sound/types';

const { t } = useI18n();
const store = useAmbientSoundStore();

const entries = computed(() =>
  store.galleryAmbiences.filter(({ pack }) => {
    if (store.selectedPackId && pack.id !== store.selectedPackId) return false;
    return true;
  }),
);

const groups = computed(() => {
  const grouped = new Map<string, GalleryAmbience[]>();
  for (const entry of entries.value) {
    const category = entry.ambience.category?.trim() || 'Ambience';
    const items = grouped.get(category) ?? [];
    items.push(entry);
    grouped.set(category, items);
  }
  return [...grouped].map(([category, items]) => ({ category, items }));
});

function activeVariationId(packId: string, ambienceId: string) {
  return store.activeLayers.get(`${packId}:${ambienceId}`)?.variationId ?? null;
}

function usedIn(packId: string, ambienceId: string) {
  return store.allScenes.filter(({ pack, scene }) =>
    scene.ambiences.some(
      (selection) => pack.id === packId && selection.ambienceId === ambienceId,
    ),
  ).length;
}

async function selectVariation(entry: GalleryAmbience, variationId: string) {
  const key = `${entry.packageId}:${entry.ambience.id}`;
  const active = store.activeLayers.get(key);
  if (active?.variationId === variationId) {
    await store.toggleAmbience(entry.packageId, entry.ambience.id);
    return;
  }
  if (active) {
    await store.setAmbienceVariation(
      entry.packageId,
      entry.ambience.id,
      variationId,
    );
    return;
  }
  await store.toggleAmbience(entry.packageId, entry.ambience.id, variationId);
}
</script>

<style scoped>
/* Layout is owned by AmbienceItem and EntityGroup. */
</style>

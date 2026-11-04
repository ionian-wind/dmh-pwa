<template>
  <div>
    <VariationSelect
      v-if="variations.length"
      v-model="selectedVariationId"
      :options="variations"
      class="q-mb-md"
    />

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
            :variation-id="selectedVariationId"
            :active-variation-id="
              activeVariationId(entry.packageId, entry.ambience.id)
            "
            :active-sample-index="
              activeSampleIndex(entry.packageId, entry.ambience.id)
            "
            @select-sample="
              (variationId, sampleIndex) =>
                selectSample(entry, variationId, sampleIndex)
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
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconWaveSine } from '@tabler/icons-vue';
import EmptyState from '@/components/common/EmptyState.vue';
import EntityGroup from '@/components/common/EntityGroup.vue';
import AmbienceItem from '@/ambient-sound/components/AmbienceItem.vue';
import VariationSelect from '@/ambient-sound/components/VariationSelect.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import {
  findVariation,
  getGlobalVariations,
} from '@/ambient-sound/utils/packData';
import type { GalleryAmbience } from '@/ambient-sound/types';

const { t } = useI18n();
const store = useAmbientSoundStore();

const entries = computed(() =>
  store.galleryAmbiences.filter(({ pack }) => {
    if (store.selectedPackId && pack.id !== store.selectedPackId) return false;
    return true;
  }),
);

const variations = computed(() =>
  getGlobalVariations(entries.value.map(({ ambience }) => ambience)),
);

const selectedVariationId = ref('');

watch(
  variations,
  (options) => {
    if (!options.some((option) => option.id === selectedVariationId.value)) {
      selectedVariationId.value = options[0]?.id ?? '';
    }
  },
  { immediate: true },
);

const filteredEntries = computed(() => {
  const variationId = selectedVariationId.value;
  if (!variationId) return [];
  return entries.value.filter(
    ({ ambience }) =>
      (findVariation(ambience, variationId)?.samples.length ?? 0) > 0,
  );
});

const groups = computed(() => {
  const grouped = new Map<string, GalleryAmbience[]>();
  for (const entry of filteredEntries.value) {
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

function activeSampleIndex(packId: string, ambienceId: string) {
  return store.activeLayers.get(`${packId}:${ambienceId}`)?.sampleIndex ?? null;
}

async function selectSample(
  entry: GalleryAmbience,
  variationId: string,
  sampleIndex: number,
) {
  await store.selectAmbienceSample(
    entry.packageId,
    entry.ambience.id,
    variationId,
    sampleIndex,
  );
}
</script>

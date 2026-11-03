<template>
  <div>
    <div v-if="groups.length" class="ambience-groups">
      <section
        v-for="group in groups"
        :key="group.category"
        class="ambience-group"
      >
        <div class="row items-center q-gutter-sm q-mb-sm">
          <span class="text-caption text-uppercase text-grey-7">
            {{ group.category }}
          </span>
          <QSeparator class="col" />
        </div>
        <div class="column q-gutter-sm">
          <QCard
            v-for="entry in group.items"
            :key="`${entry.packageId}:${entry.ambience.id}`"
            flat
            bordered
            :class="{
              'is-active': isActive(entry.packageId, entry.ambience.id),
            }"
          >
            <QCardSection class="row items-center q-gutter-sm">
              <AmbientIcon :icon="entry.ambience.icon" :size="24" />
              <div class="col">
                <div class="text-subtitle2 text-weight-medium">
                  {{ entry.ambience.name }}
                </div>
                <div class="text-caption text-grey-7">
                  {{ entry.pack.name }} ·
                  {{ entry.ambience.category || 'Ambience' }}
                </div>
                <div class="text-caption text-grey-6">
                  {{ variations(entry.ambience).length }}
                  {{ t('ambientSoundPage.variations') }} ·
                  {{ usedIn(entry.packageId, entry.ambience.id) }}
                  {{ t('ambientSoundPage.scenes') }}
                </div>
              </div>
              <QSelect
                v-if="variations(entry.ambience).length > 1"
                :model-value="variationFor(entry.packageId, entry.ambience.id)"
                :options="
                  variations(entry.ambience).map((v) => ({
                    label: v.name,
                    value: v.id,
                  }))
                "
                dense
                outlined
                emit-value
                map-options
                class="variation-select"
                @update:model-value="
                  (value: string | null) =>
                    value &&
                    selectVariation(entry.packageId, entry.ambience.id, value)
                "
              />
              <QBtn
                flat
                round
                :color="
                  isActive(entry.packageId, entry.ambience.id)
                    ? 'primary'
                    : undefined
                "
                :title="
                  t(
                    isActive(entry.packageId, entry.ambience.id)
                      ? 'common.pause'
                      : 'common.play',
                  )
                "
                :aria-label="
                  t(
                    isActive(entry.packageId, entry.ambience.id)
                      ? 'common.pause'
                      : 'common.play',
                  )
                "
                @click="toggle(entry)"
              >
                <IconPlayerPause
                  v-if="isActive(entry.packageId, entry.ambience.id)"
                  :size="18"
                />
                <IconPlayerPlay v-else :size="18" />
              </QBtn>
            </QCardSection>
          </QCard>
        </div>
      </section>
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
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconWaveSine,
} from '@tabler/icons-vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import { getLayerVariations } from '@/ambient-sound/utils/packData';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { GalleryAmbience, LayerDef } from '@/ambient-sound/types';

const { t } = useI18n();
const store = useAmbientSoundStore();
const selectedVariations = ref<Record<string, string>>({});

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

function variations(ambience: LayerDef) {
  return getLayerVariations(ambience);
}

function variationFor(packId: string, ambienceId: string) {
  const key = `${packId}:${ambienceId}`;
  if (selectedVariations.value[key]) return selectedVariations.value[key];
  const entry = entries.value.find(
    (item) => item.packageId === packId && item.ambience.id === ambienceId,
  );
  return entry ? (variations(entry.ambience)[0]?.id ?? '') : '';
}

function setVariation(packId: string, ambienceId: string, variationId: string) {
  selectedVariations.value = {
    ...selectedVariations.value,
    [`${packId}:${ambienceId}`]: variationId,
  };
}

function usedIn(packId: string, ambienceId: string) {
  return store.allScenes.filter(({ pack, scene }) =>
    scene.ambiences.some(
      (selection) => pack.id === packId && selection.ambienceId === ambienceId,
    ),
  ).length;
}

function isActive(packId: string, ambienceId: string) {
  return store.activeLayers.has(`${packId}:${ambienceId}`);
}

function toggle(entry: GalleryAmbience) {
  void store.toggleAmbience(
    entry.packageId,
    entry.ambience.id,
    variationFor(entry.packageId, entry.ambience.id),
  );
}

function selectVariation(
  packId: string,
  ambienceId: string,
  variationId: string,
) {
  setVariation(packId, ambienceId, variationId);
  if (isActive(packId, ambienceId)) {
    void store.setAmbienceVariation(packId, ambienceId, variationId);
  }
}
</script>

<style scoped>
.is-active {
  border-color: var(--color-primary);
  background: var(--color-background-soft);
}

.ambience-groups {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.variation-select {
  min-width: 130px;
}
</style>

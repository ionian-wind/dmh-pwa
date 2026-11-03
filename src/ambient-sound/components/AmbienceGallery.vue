<template>
  <div>
    <div class="row items-center q-gutter-sm q-mb-md">
      <QInput
        v-model="search"
        dense
        outlined
        clearable
        :placeholder="t('ambientSoundPage.searchAmbiences')"
        class="col"
      >
        <template #prepend><IconSearch :size="18" /></template>
      </QInput>
      <QSelect
        v-model="category"
        :options="categoryOptions"
        dense
        outlined
        emit-value
        map-options
        :label="t('ambientSoundPage.category')"
        class="category-select"
      />
    </div>

    <div v-if="entries.length" class="column q-gutter-sm">
      <QCard
        v-for="entry in entries"
        :key="`${entry.packageId}:${entry.ambience.id}`"
        flat
        bordered
        :class="{ 'is-active': isActive(entry.packageId, entry.ambience.id) }"
      >
        <QCardSection class="row items-center q-gutter-sm">
          <AmbientIcon :icon="entry.ambience.icon" :size="24" />
          <div class="col">
            <div
              class="text-subtitle2 text-weight-medium row items-center q-gutter-xs"
            >
              <span>{{ entry.ambience.name }}</span>
              <IconPackageImport
                v-if="entry.pack.origin === 'imported'"
                :size="13"
                class="imported-mark"
                :title="t('ambientSoundPage.importedPackage')"
              />
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
          <QBtn
            flat
            round
            color="primary"
            :title="t('ambientSoundPage.addToScene')"
            :aria-label="t('ambientSoundPage.addToScene')"
            @click="emit('add', entry.packageId, 'ambience', entry.ambience.id)"
          >
            <IconPlus :size="18" />
          </QBtn>
        </QCardSection>
      </QCard>
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
  IconPackageImport,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
  IconWaveSine,
} from '@tabler/icons-vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import { getLayerVariations } from '@/ambient-sound/utils/packData';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { GalleryAmbience, LayerDef } from '@/ambient-sound/types';

const emit = defineEmits<{
  (e: 'add', packId: string, kind: 'ambience', id: string): void;
}>();

const { t } = useI18n();
const store = useAmbientSoundStore();
const search = ref('');
const category = ref('');
const selectedVariations = ref<Record<string, string>>({});

const categoryOptions = computed(() => {
  const values = new Set<string>();
  for (const entry of store.galleryAmbiences) {
    if (entry.ambience.category) values.add(entry.ambience.category);
  }
  return [
    { label: t('ambientSoundPage.allCategories'), value: '' },
    ...[...values].sort().map((value) => ({ label: value, value })),
  ];
});

const entries = computed(() => {
  const query = search.value.trim().toLowerCase();
  return store.galleryAmbiences.filter(({ pack, ambience }) => {
    if (store.selectedPackId && pack.id !== store.selectedPackId) return false;
    if (category.value && ambience.category !== category.value) return false;
    if (!query) return true;
    return (
      ambience.name.toLowerCase().includes(query) ||
      pack.name.toLowerCase().includes(query) ||
      (ambience.category ?? '').toLowerCase().includes(query)
    );
  });
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

.imported-mark {
  color: var(--color-text-light);
}

.category-select {
  min-width: 150px;
}

.variation-select {
  min-width: 130px;
}
</style>

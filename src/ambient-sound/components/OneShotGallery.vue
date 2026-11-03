<template>
  <div>
    <div class="row items-center q-gutter-sm q-mb-md">
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

    <div v-if="entries.length" class="sfx-grid">
      <QCard
        v-for="entry in entries"
        :key="`${entry.packageId}:${entry.oneShot.id}`"
        flat
        bordered
        class="sfx-card"
        :class="{
          'is-playing': store.isOneShotPlaying(
            entry.packageId,
            entry.oneShot.id,
          ),
        }"
        role="button"
        tabindex="0"
        @click="play(entry)"
        @keydown.enter.prevent="play(entry)"
        @keydown.space.prevent="play(entry)"
      >
        <QCardSection class="column items-center text-center q-gutter-xs">
          <AmbientIcon :icon="entry.oneShot.icon" :size="28" />
          <div class="text-subtitle2 text-weight-medium">
            {{ entry.oneShot.name }}
          </div>
          <div class="text-caption text-grey-7">
            {{ entry.pack.name }} · {{ entry.oneShot.category }}
          </div>
          <div class="text-caption text-grey-6">
            {{ usedIn(entry.packageId, entry.oneShot.id) }}
            {{ t('ambientSoundPage.scenes') }}
          </div>
        </QCardSection>
      </QCard>
    </div>

    <EmptyState
      v-else
      :icon="IconBell"
      :title="t('ambientSoundPage.noOneShots')"
      :hint="t('ambientSoundPage.importPackHint')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconBell } from '@tabler/icons-vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { GalleryOneShot } from '@/ambient-sound/types';

const { t } = useI18n();
const store = useAmbientSoundStore();
const category = ref('');

const categoryOptions = computed(() => {
  const values = new Set<string>();
  for (const entry of store.galleryOneShots) {
    values.add(entry.oneShot.category);
  }
  return [
    { label: t('ambientSoundPage.allCategories'), value: '' },
    ...[...values].sort().map((value) => ({ label: value, value })),
  ];
});

const entries = computed(() =>
  store.galleryOneShots.filter(({ pack, oneShot }) => {
    if (store.selectedPackId && pack.id !== store.selectedPackId) return false;
    if (category.value && oneShot.category !== category.value) return false;
    return true;
  }),
);

function play(entry: GalleryOneShot) {
  void store.playOneShot(entry.packageId, entry.oneShot.id);
}

function usedIn(packId: string, oneShotId: string) {
  return store.allScenes.filter(
    ({ pack, scene }) =>
      scene.oneShotIds.includes(oneShotId) && pack.id === packId,
  ).length;
}
</script>

<style scoped>
.category-select {
  min-width: 150px;
}

.sfx-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
}

.sfx-card {
  min-width: 0;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.sfx-card.is-playing {
  border-color: var(--color-primary);
  background: var(--color-background-soft);
}
</style>

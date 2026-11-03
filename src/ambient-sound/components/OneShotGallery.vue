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
      <OneShotControl
        v-for="entry in entries"
        :key="`${entry.packageId}:${entry.oneShot.id}`"
        :pack-id="entry.packageId"
        :one-shot="entry.oneShot"
        :pack-name="entry.pack.name"
        :used-in="usedIn(entry.packageId, entry.oneShot.id)"
      />
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
import OneShotControl from '@/ambient-sound/components/OneShotControl.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

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
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}
</style>

<template>
  <div>
    <div class="row items-center q-gutter-sm q-mb-md">
      <QInput
        v-model="search"
        dense
        outlined
        clearable
        :placeholder="t('ambientSoundPage.searchOneShots')"
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

    <div v-if="entries.length" class="sfx-grid">
      <QCard
        v-for="entry in entries"
        :key="`${entry.packageId}:${entry.oneShot.id}`"
        flat
        bordered
        class="sfx-card"
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
          <div class="row q-gutter-xs">
            <QBtn
              flat
              round
              :title="t('ambientSoundPage.preview')"
              :aria-label="t('ambientSoundPage.preview')"
              @click="store.playOneShot(entry.packageId, entry.oneShot.id)"
            >
              <IconPlayerPlay :size="18" />
            </QBtn>
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
import { IconBell, IconPlayerPlay, IconSearch } from '@tabler/icons-vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const { t } = useI18n();
const store = useAmbientSoundStore();
const search = ref('');
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

const entries = computed(() => {
  const query = search.value.trim().toLowerCase();
  return store.galleryOneShots.filter(({ pack, oneShot }) => {
    if (store.selectedPackId && pack.id !== store.selectedPackId) return false;
    if (category.value && oneShot.category !== category.value) return false;
    if (!query) return true;
    return (
      oneShot.name.toLowerCase().includes(query) ||
      pack.name.toLowerCase().includes(query) ||
      oneShot.category.toLowerCase().includes(query)
    );
  });
});

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
}
</style>

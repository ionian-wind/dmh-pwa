<template>
  <div>
    <div v-if="groups.length" class="one-shot-groups">
      <section
        v-for="group in groups"
        :key="group.category"
        class="one-shot-group"
      >
        <div class="one-shot-group-title row items-center q-gutter-sm q-mb-sm">
          <span class="text-caption text-uppercase text-grey-7">
            {{ group.category }}
          </span>
          <QSeparator class="col one-shot-group-separator" />
        </div>
        <div class="sfx-grid">
          <OneShotControl
            v-for="entry in group.items"
            :key="`${entry.packageId}:${entry.oneShot.id}`"
            :pack-id="entry.packageId"
            :one-shot="entry.oneShot"
            :pack-name="entry.pack.name"
            :used-in="usedIn(entry.packageId, entry.oneShot.id)"
          />
        </div>
      </section>
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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconBell } from '@tabler/icons-vue';
import EmptyState from '@/components/common/EmptyState.vue';
import OneShotControl from '@/ambient-sound/components/OneShotControl.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { GalleryOneShot } from '@/ambient-sound/types';

const { t } = useI18n();
const store = useAmbientSoundStore();

const entries = computed(() =>
  store.galleryOneShots.filter(({ pack }) => {
    if (store.selectedPackId && pack.id !== store.selectedPackId) return false;
    return true;
  }),
);

const groups = computed(() => {
  const grouped = new Map<string, GalleryOneShot[]>();
  for (const entry of entries.value) {
    const items = grouped.get(entry.oneShot.category) ?? [];
    items.push(entry);
    grouped.set(entry.oneShot.category, items);
  }
  return [...grouped].map(([category, items]) => ({ category, items }));
});

function usedIn(packId: string, oneShotId: string) {
  return store.allScenes.filter(
    ({ pack, scene }) =>
      scene.oneShotIds.includes(oneShotId) && pack.id === packId,
  ).length;
}
</script>

<style scoped>
.one-shot-groups {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.one-shot-group-title {
  width: 100%;
}

.one-shot-group-separator {
  opacity: 0.6;
}

.sfx-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}
</style>

<template>
  <div class="scene-list">
    <div class="row items-center q-gutter-sm q-mb-md">
      <QInput
        v-model="search"
        dense
        outlined
        clearable
        :placeholder="t('ambientSoundPage.searchScenes')"
        class="col"
      >
        <template #prepend><IconSearch :size="18" /></template>
      </QInput>
    </div>

    <div v-if="scenes.length" class="column q-gutter-sm">
      <QCard
        v-for="entry in scenes"
        :key="sceneKey(entry.pack.id, entry.scene.id)"
        flat
        bordered
        class="scene-row"
        :class="{ 'is-active': isActive(entry.pack.id, entry.scene.id) }"
        @click="emit('open', entry.pack.id, entry.scene.id)"
      >
        <QCardSection class="row items-center q-gutter-sm">
          <AmbientIcon :icon="entry.scene.icon" :size="24" />
          <div class="col">
            <div class="row items-center q-gutter-xs">
              <span class="text-subtitle1 text-weight-medium">
                {{ entry.scene.name }}
              </span>
              <QBadge
                v-if="isPlaying(entry.pack.id, entry.scene.id)"
                color="primary"
                :label="t('ambientSoundPage.playing')"
              />
            </div>
            <div class="text-caption text-grey-7">
              {{ entry.pack.name }} · {{ entry.scene.description || '' }}
            </div>
            <div class="text-caption text-grey-6">
              {{ linkCount(entry.pack.id, entry.scene.id) }}
              {{ t('ambientSoundPage.links') }}
            </div>
          </div>
          <QBtn
            round
            flat
            color="primary"
            :title="
              t(
                isPlaying(entry.pack.id, entry.scene.id)
                  ? 'common.pause'
                  : 'common.play',
              )
            "
            :aria-label="
              t(
                isPlaying(entry.pack.id, entry.scene.id)
                  ? 'common.pause'
                  : 'common.play',
              )
            "
            @click.stop="toggleScene(entry.pack.id, entry.scene.id)"
          >
            <IconPlayerPause v-if="isPlaying(entry.pack.id, entry.scene.id)" />
            <IconPlayerPlay v-else />
          </QBtn>
        </QCardSection>
      </QCard>
    </div>

    <EmptyState
      v-else
      :icon="IconMusic"
      :title="
        store.selectedPackId
          ? t('ambientSoundPage.noScenesInPack')
          : t('ambientSoundPage.noScenes')
      "
      :hint="
        store.selectedPackId
          ? t('ambientSoundPage.newSceneHint')
          : t('ambientSoundPage.importPackHint')
      "
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconMusic,
  IconPlayerPause,
  IconPlayerPlay,
  IconSearch,
} from '@tabler/icons-vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const emit = defineEmits<{
  (e: 'open', packId: string, sceneId: string): void;
}>();

const { t } = useI18n();
const store = useAmbientSoundStore();
const search = ref('');

function sceneKey(packId: string, sceneId: string) {
  return `${packId}::${sceneId}`;
}

const scenes = computed(() => {
  const query = search.value.trim().toLowerCase();
  return store.allScenes.filter(({ pack, scene }) => {
    if (store.selectedPackId && pack.id !== store.selectedPackId) return false;
    if (!query) return true;
    return (
      scene.name.toLowerCase().includes(query) ||
      pack.name.toLowerCase().includes(query) ||
      (scene.description ?? '').toLowerCase().includes(query)
    );
  });
});

function isActive(packId: string, sceneId: string) {
  return store.activeSceneKey === sceneKey(packId, sceneId);
}

function isPlaying(packId: string, sceneId: string) {
  return isActive(packId, sceneId) && store.isPlaying;
}

function linkCount(packId: string, sceneId: string) {
  return store.linksForScene(packId, sceneId).length;
}

async function toggleScene(packId: string, sceneId: string) {
  if (isPlaying(packId, sceneId)) {
    store.pause();
    return;
  }
  if (isActive(packId, sceneId) && store.activeScene) {
    store.play();
    return;
  }
  await store.playScene(packId, sceneId);
}
</script>

<style scoped>
.scene-list {
  width: 100%;
}

.scene-row {
  transition: background 0.2s ease;
}

.scene-row.is-active {
  border-color: var(--color-primary);
  background: var(--color-background-soft);
}
</style>

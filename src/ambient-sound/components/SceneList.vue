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
      <QBtn
        v-if="store.selectedPackId"
        color="primary"
        :label="t('ambientSoundPage.newScene')"
        :disable="selectedPackImported"
        :title="
          selectedPackImported
            ? t('ambientSoundPage.importedReadOnlyHint')
            : undefined
        "
        @click="emit('create', store.selectedPackId)"
      />
    </div>

    <div v-if="scenes.length" class="column q-gutter-sm">
      <QCard
        v-for="entry in scenes"
        :key="sceneKey(entry.pack.id, entry.scene.id)"
        flat
        bordered
        class="scene-row"
        :class="{ 'is-active': isActive(entry.pack.id, entry.scene.id) }"
      >
        <QCardSection class="row items-center q-gutter-sm">
          <AmbientIcon :icon="entry.scene.icon" :size="24" />
          <div class="col">
            <div class="row items-center q-gutter-xs">
              <span class="text-subtitle1 text-weight-medium">
                {{ entry.scene.name }}
              </span>
              <IconPackageImport
                v-if="entry.pack.origin === 'imported'"
                :size="14"
                class="imported-mark"
                :title="t('ambientSoundPage.importedPackage')"
              />
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
            @click="toggleScene(entry.pack.id, entry.scene.id)"
          >
            <IconPlayerPause v-if="isPlaying(entry.pack.id, entry.scene.id)" />
            <IconPlayerPlay v-else />
          </QBtn>
          <QBtn
            flat
            round
            :disable="entry.pack.origin === 'imported'"
            :title="
              entry.pack.origin === 'imported'
                ? t('ambientSoundPage.importedSceneReadOnly')
                : t('common.edit')
            "
            :aria-label="t('common.edit')"
            @click="emit('edit', entry.pack.id, entry.scene.id)"
          >
            <IconPencil :size="18" />
          </QBtn>
          <QBtn
            flat
            round
            color="negative"
            :title="t('common.delete')"
            :aria-label="t('common.delete')"
            @click="
              removeScene(entry.pack.id, entry.scene.id, entry.scene.name)
            "
          >
            <IconTrash :size="18" />
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
  IconPencil,
  IconPackageImport,
  IconPlayerPause,
  IconPlayerPlay,
  IconSearch,
  IconTrash,
} from '@tabler/icons-vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import { confirm } from '@/dialogs';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const emit = defineEmits<{
  (e: 'edit', packId: string, sceneId: string): void;
  (e: 'create', packId: string): void;
}>();

const { t } = useI18n();
const store = useAmbientSoundStore();
const search = ref('');
const selectedPackImported = computed(
  () =>
    store.storedPacks.find((pack) => pack.id === store.selectedPackId)
      ?.origin === 'imported',
);

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

async function removeScene(packId: string, sceneId: string, name: string) {
  if (!(await confirm(t('ambientSoundPage.deleteSceneConfirm', { name })))) {
    return;
  }
  await store.deleteScene(packId, sceneId);
}
</script>

<style scoped>
.imported-mark {
  color: var(--color-text-light);
}

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

<template>
  <div class="scene-list">
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
          </div>
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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconMusic } from '@tabler/icons-vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const emit = defineEmits<{
  (e: 'open', packId: string, sceneId: string): void;
}>();

const { t } = useI18n();
const store = useAmbientSoundStore();

function sceneKey(packId: string, sceneId: string) {
  return `${packId}::${sceneId}`;
}

const scenes = computed(() =>
  store.allScenes.filter(
    ({ pack }) => !store.selectedPackId || pack.id === store.selectedPackId,
  ),
);

function isActive(packId: string, sceneId: string) {
  return store.activeSceneKey === sceneKey(packId, sceneId);
}

function isPlaying(packId: string, sceneId: string) {
  return isActive(packId, sceneId) && store.isPlaying;
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
  border-color: var(--color-accent);
  background: var(--color-background-soft);
}
</style>

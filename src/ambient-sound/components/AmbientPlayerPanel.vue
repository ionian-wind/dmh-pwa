<template>
  <div
    class="ambient-player-panel"
    :class="{ 'ambient-player-panel--padded': props.padded }"
  >
    <ScenePlayerView
      v-if="store.activeScene"
      :pack-id="store.activeScene.pack.id"
      :scene-id="store.activeScene.scene.id"
      :show-back="false"
      compact
    />
    <EmptyState
      v-else
      :icon="IconMusic"
      :title="t('ambientSoundPage.noScene')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IconMusic } from '@tabler/icons-vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ScenePlayerView from '@/ambient-sound/components/ScenePlayerView.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const props = withDefaults(
  defineProps<{
    padded?: boolean;
  }>(),
  { padded: false },
);

const { t } = useI18n();
const store = useAmbientSoundStore();
</script>

<style scoped>
.ambient-player-panel--padded {
  padding: 0.75rem 1rem 1rem;
}

.ambient-player-panel--padded :deep(.empty-state) {
  padding: 0.5rem 1rem;
}

.ambient-player-panel--padded :deep(.empty-state svg) {
  width: 32px;
  height: 32px;
}
</style>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IconHeadphones } from '@tabler/icons-vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const { t } = useI18n();
const ambientSoundStore = useAmbientSoundStore();
</script>

<template>
  <QItem
    clickable
    v-ripple
    to="/ambient"
    :active="$route.path.startsWith('/ambient')"
    active-class="bg-secondary"
    :title="t('navigation.ambientSound')"
    :aria-label="t('navigation.ambientSound')"
  >
    <QItemSection side>
      <IconHeadphones
        :class="{ 'ambient-playing': ambientSoundStore.isPlaying }"
      />
    </QItemSection>
    <QItemSection>{{ t('navigation.ambientSound') }}</QItemSection>
  </QItem>
</template>

<style scoped>
.ambient-playing {
  transform-origin: center;
  animation: ambient-pulse 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
}

@keyframes ambient-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.25);
  }
  55% {
    transform: scale(1.06);
  }
  72% {
    transform: scale(1.18);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ambient-playing {
    animation: none;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { IconMusic } from '@tabler/icons-vue';
import { useConfigStore } from '@/utils/configStore';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { toggleSoundControl } from './state';

const { t } = useI18n();
const router = useRouter();
const configStore = useConfigStore();
const playerStore = useJukeboxPlayerStore();
const isRoute = computed(() => !configStore.jukeboxUseMiniPlayer);

function openJukebox() {
  if (configStore.jukeboxUseMiniPlayer) {
    toggleSoundControl();
    return;
  }
  void router.push('/jukebox');
}
</script>

<template>
  <QItem
    class="jukebox-button"
    clickable
    v-ripple
    :to="isRoute ? '/jukebox' : undefined"
    :active="isRoute && $route.path === '/jukebox'"
    active-class="bg-secondary"
    :title="t('app.jukebox')"
    :aria-label="t('app.jukebox')"
    @click="openJukebox"
  >
    <QItemSection side>
      <IconMusic :class="{ 'jukebox-playing': playerStore.isPlaying }" />
    </QItemSection>
    <QItemSection>{{ t('app.jukebox') }}</QItemSection>
  </QItem>
</template>

<style scoped>
.jukebox-playing {
  animation: jukebox-sway 0.6s ease-in-out infinite;
}

@keyframes jukebox-sway {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-8deg);
  }
  75% {
    transform: rotate(8deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .jukebox-playing {
    animation: none;
  }
}
</style>

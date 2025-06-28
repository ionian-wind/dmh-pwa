<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import PopoverPanel from './common/PopoverPanel.vue';
import JukeboxPlayer from '@/jukebox/components/JukeboxPlayer.vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useAnimatedGradient } from '@/jukebox/useAnimatedGradient';
import Button from './common/Button.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const isPopoverOpen = ref(false);
const playerStore = useJukeboxPlayerStore();
const hasAppeared = ref(false);

// Props for left menu integration
const props = defineProps<{
  leftMenuMinimized?: boolean;
}>();

onMounted(() => {
  // After the initial entrance animation of the FAB, mark it as appeared.
  // This prevents the entrance animation from re-triggering when the player stops.
  setTimeout(() => {
    hasAppeared.value = true;
  }, 500); // Corresponds to the animation duration in FloatActionButton.vue
});

const isOnJukeboxPage = computed(() => {
  return route.path === '/jukebox';
});

const handleClick = () => {
  if (isOnJukeboxPage.value) {
    // If we're already on the jukebox page, just navigate to it (refresh)
    router.push('/jukebox');
  } else {
    // If we're on another page, toggle the popover
    isPopoverOpen.value = !isPopoverOpen.value;
  }
};

// Use the animated gradient composable
const gradientStyle = useAnimatedGradient(
  computed(() => playerStore.isPlaying),
  () => playerStore.currentTrack?.palette
);

const navigateToJukebox = () => {
  router.push('/jukebox');
  isPopoverOpen.value = false;
};
</script>

<template>
  <PopoverPanel 
    v-if="!isOnJukeboxPage"
    :is-open="isPopoverOpen" 
    @close="isPopoverOpen = false" 
    placement="right-end"
    :offset="80"
    :vertical-offset="-20"
    :disable-internal-trigger="true"
  >
    <template #trigger>
      <Button 
        variant="primary" 
        @click.stop="handleClick" 
        :title="t('app.jukebox')"
        :class="['menu-item', { active: isOnJukeboxPage }]"
      >
        <i class="si si-music-note menu-icon" />
        <span v-if="!props.leftMenuMinimized" class="menu-label">{{ t('app.jukebox') }}</span>
      </Button>
    </template>
    <template #corner-right>
      <Button 
        variant="light" 
        @click="navigateToJukebox" 
        :title="t('common.openFullscreen')"
        class="jukebox-nav-button"
      >
        <i class="si si-external-link"></i>
      </Button>
    </template>
    <div class="jukebox-popover-content">
      <JukeboxPlayer :show-artwork="true" />
    </div>
  </PopoverPanel>
  
  <!-- Show just the button when on jukebox page -->
  <Button 
    v-else
    variant="primary" 
    @click="handleClick" 
    :title="t('app.jukebox')"
    :class="['menu-item', { active: isOnJukeboxPage }]"
  >
    <i class="si si-music-note menu-icon" />
    <span v-if="!props.leftMenuMinimized" class="menu-label">{{ t('app.jukebox') }}</span>
  </Button>
</template>

<style scoped>
.jukebox-popover-content {
  position: relative;
}
</style>

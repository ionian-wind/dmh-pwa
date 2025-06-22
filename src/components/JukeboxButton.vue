<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import FloatActionButton from './common/FloatActionButton.vue';
import PopoverPanel from './common/PopoverPanel.vue';
import JukeboxPlayer from '@/jukebox/components/JukeboxPlayer.vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useAnimatedGradient } from '@/jukebox/useAnimatedGradient';
import Button from './common/Button.vue';

const route = useRoute();
const router = useRouter();
const isPopoverOpen = ref(false);
const playerStore = useJukeboxPlayerStore();
const hasAppeared = ref(false);

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

const fabClasses = computed(() => ({
  'jukebox-button--playing': playerStore.isPlaying,
  'no-entrance-animation': hasAppeared.value,
}));

const handleClick = () => {
  isPopoverOpen.value = !isPopoverOpen.value;
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
    :offset="12"
    :disable-internal-trigger="true"
  >
    <template #trigger>
      <FloatActionButton
        size="medium"
        variant="secondary"
        @click.stop="handleClick"
        title="Jukebox"
        :class="fabClasses"
        :style="gradientStyle"
      >
        <i class="si si-music-note" />
      </FloatActionButton>
    </template>
    <template #corner-right>
      <Button 
        variant="light" 
        @click="navigateToJukebox" 
        title="Open full Jukebox"
        class="jukebox-nav-button"
      >
        <i class="si si-external-link"></i>
      </Button>
    </template>
    <div class="jukebox-popover-content">
      <JukeboxPlayer :show-artwork="true" />
    </div>
  </PopoverPanel>
</template>

<style scoped>
/*
  The FAB has its own background color from the 'variant' prop.
  We create a pseudo-element on top of it to hold the animated gradient.
  We transition the opacity of this pseudo-element for a smooth fade-in/fade-out
  effect, preventing the "white blink" when the player state changes.
*/
:deep(.float-action-button::before) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  background: var(--custom-gradient, linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab));
  background-size: 400% 400%;
  
  opacity: 0; /* Hidden by default */
  transition: opacity 0.4s ease-in-out; /* Smooth fade */
  
  /* The gradient animation is paused by default */
  animation: gradientShift 3s ease infinite;
  animation-play-state: paused;
}

/* When the 'jukebox-button--playing' class is active, fade in the gradient
   and start its animation. */
:deep(.float-action-button.jukebox-button--playing::before) {
  opacity: 1;
  animation-play-state: running;
}

/* Also give it a more pronounced hover effect when playing */
:deep(.float-action-button.jukebox-button--playing:hover) {
  transform: scale(1.1) translateZ(0);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* Still need this to prevent the entrance animation from re-triggering */
:deep(.float-action-button.no-entrance-animation) {
  animation: none;
}

.jukebox-nav-button {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #666;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  min-height: 1.5rem;
}

.jukebox-nav-button:hover {
  color: var(--primary-color, #4f46e5);
  background-color: rgba(79, 70, 229, 0.1);
  transform: scale(1.1);
}

.jukebox-popover-content {
  position: relative;
}
</style>

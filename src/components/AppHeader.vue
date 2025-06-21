<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import GlobalMenu from '@/components/GlobalMenu.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import Button from './common/Button.vue';

const router = useRouter();
const isFullscreen = ref(false);

function updateFullscreenState() {
  isFullscreen.value = !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
}

function toggleFullscreen() {
  const el = document.documentElement;
  if (!isFullscreen.value) {
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if ((el as any).webkitRequestFullscreen) {
      (el as any).webkitRequestFullscreen();
    } else if ((el as any).msRequestFullscreen) {
      (el as any).msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }
}

function navigateToJukebox() {
  router.push('/jukebox');
}

onMounted(() => {
  document.addEventListener('fullscreenchange', updateFullscreenState);
  document.addEventListener('webkitfullscreenchange', updateFullscreenState);
  document.addEventListener('mozfullscreenchange', updateFullscreenState);
  document.addEventListener('MSFullscreenChange', updateFullscreenState);
  updateFullscreenState();
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', updateFullscreenState);
  document.removeEventListener('webkitfullscreenchange', updateFullscreenState);
  document.removeEventListener('mozfullscreenchange', updateFullscreenState);
  document.removeEventListener('MSFullscreenChange', updateFullscreenState);
});
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <nav>
        <Button
          class="fullscreen-btn"
          variant="link"
          @click="toggleFullscreen"
          :title="isFullscreen ? 'Exit full page' : 'Open app in full page'"
          :aria-label="isFullscreen ? 'Exit full page' : 'Open app in full page'"
        >
          <i v-if="!isFullscreen" class="si si-fullscreen"></i>
          <i v-else class="si si-fullscreen-exit"></i>
        </Button>
        
        <Button
          class="jukebox-btn"
          variant="link"
          @click="navigateToJukebox"
          title="Jukebox"
          aria-label="Open Jukebox"
        >
          <i class="si si-music-note" />
        </Button>
        
        <LanguageSwitcher />

      </nav>
      <div class="header-right">
        <GlobalMenu />
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: white;
  border-bottom: 1px solid #ddd;
  padding: 1rem;
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--header-height);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.fullscreen-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.5rem;
  color: var(--color-text, #222);
  transition: color 0.15s;
}
.fullscreen-btn:hover {
  color: var(--color-primary, #007bff);
}

.jukebox-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.5rem;
  color: var(--color-text, #222);
  transition: color 0.15s;
}
.jukebox-btn:hover {
  color: var(--color-primary, #007bff);
}
</style> 

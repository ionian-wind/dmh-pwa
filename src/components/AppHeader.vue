<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import Button from './common/Button.vue';
import { useI18n } from 'vue-i18n';

const isFullscreen = ref(false);
const { t } = useI18n();

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
          variant="light"
          @click="toggleFullscreen"
          :title="isFullscreen ? t('common.exitFullscreen') : t('common.openFullscreen')"
          :aria-label="isFullscreen ? 'Exit full page' : 'Open app in full page'"
        >
          <i v-if="!isFullscreen" class="si si-fullscreen"></i>
          <i v-else class="si si-fullscreen-exit"></i>
        </Button>
        
        <LanguageSwitcher />

      </nav>
      <div class="header-right">
        <!-- <GlobalMenu /> -->
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
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
</style> 

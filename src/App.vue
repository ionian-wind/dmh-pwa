<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import RollButton from '@/components/RollButton.vue'
import JukeboxButton from '@/components/JukeboxButton.vue'
import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue'
import PWAStatus from '@/components/PWAStatus.vue'
import MentionModalStack from '@/components/common/MentionModalStack.vue'
import GlobalAudioPlayer from '@/jukebox/components/GlobalAudioPlayer.vue'

const handleRollClick = (event: MouseEvent) => {
  // TODO: Implement dice rolling functionality
  console.log('Roll button clicked!', event);
};
</script>

<template>
  <div class="app">
    <AppHeader />
    <main class="main-content">
      <RouterView v-slot="{ Component, route }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </RouterView>
    </main>
    
    <!-- Floating Action Buttons -->
    <div class="fab-container-left">
      <JukeboxButton class="fab-item" />
    </div>
    <div class="fab-container-right">
      <RollButton @click="handleRollClick" class="fab-item" />
    </div>
    
    <!-- PWA Components -->
    <PWAInstallPrompt />
    <PWAStatus />

    <!-- Global Jukebox Player -->
    <GlobalAudioPlayer />

    <!-- Global Mention Modal Stack -->
    <MentionModalStack />
  </div>
</template>

<style>
:root {
  --primary-color: #1e1e2e;
  --secondary-color: #2c3e50;
  --text-color: #333;
  --light-text: #666;
  --border-color: #ddd;
  --background-color: #f5f5f5;
  --max-width: 1200px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--background-color);
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  width: 100%;
}

.fab-container-left,
.fab-container-right {
  position: fixed;
  bottom: 2rem;
  z-index: 1000;
  pointer-events: none; /* Allow clicks to pass through the container */
}

.fab-container-left {
  left: 4.5rem;
}

.fab-container-right {
  right: 2rem;
}

.fab-container-left > .fab-item,
.fab-container-right > .fab-item {
  pointer-events: auto; /* Re-enable pointer events on direct children */
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Utility Classes */
.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1rem;
}

.text-center {
  text-align: center;
}

.mt-1 { margin-top: 0.5rem; }
.mt-2 { margin-top: 1rem; }
.mt-3 { margin-top: 1.5rem; }
.mt-4 { margin-top: 2rem; }

.mb-1 { margin-bottom: 0.5rem; }
.mb-2 { margin-bottom: 1rem; }
.mb-3 { margin-bottom: 1.5rem; }
.mb-4 { margin-bottom: 2rem; }
</style>

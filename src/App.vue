<script setup lang="ts">
import {onMounted, onUnmounted, ref} from 'vue'
import { RouterView, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import RollButton from '@/components/RollButton.vue'
import RollModal from '@/components/RollModal.vue'
import Button from '@/components/common/Button.vue'
import JukeboxButton from '@/components/JukeboxButton.vue'
import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue'
import PWAStatus from '@/components/PWAStatus.vue'
import MentionModalStack from '@/components/common/MentionModalStack.vue'
import GlobalAudioPlayer from '@/jukebox/components/GlobalAudioPlayer.vue'
import LeftMenu from '@/components/LeftMenu.vue'
import { Section } from '@/types'
import { useI18n } from 'vue-i18n'

const leftMenuMinimized = ref(false)
function toggleLeftMenu() {
  leftMenuMinimized.value = !leftMenuMinimized.value
}

const { t } = useI18n()
const router = useRouter()

interface SectionItem {
  section: Section;
  label: string;
  path: string;
  icon: string;
}

const sections: SectionItem[] = [
  { section: Section.NOTES, label: t('navigation.notes'), path: '/notes', icon: 'ra ra-scroll-unfurled' },
  { section: Section.CHARACTERS, label: t('navigation.characters'), path: '/characters', icon: 'ra ra-player' },
  { section: Section.PARTIES, label: t('navigation.parties'), path: '/parties', icon: 'ra ra-double-team' },
  { section: Section.MODULES, label: t('navigation.modules'), path: '/modules', icon: 'si si-book' },
  { section: Section.MONSTERS, label: t('navigation.monsters'), path: '/monsters', icon: 'ra ra-wolf-head' },
  { section: Section.ENCOUNTERS, label: t('navigation.encounters'), path: '/encounters', icon: 'ra ra-crossed-swords' },
]

function isActive(item: SectionItem): boolean {
  const currentPath = router.currentRoute.value.path
  return currentPath.startsWith(item.path)
}
function navigateTo(path: string) {
  router.push(path)
}

// Roll modal state for RollButton
import { ref as vueRef } from 'vue'
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";
const rollModalRef = vueRef<InstanceType<typeof RollModal> | null>(null)
function openRollModal() {
  rollModalRef.value?.openModal()
}
function closeRollModal() {
  // The modal will handle its own closing
}

// Jukebox open logic (assume JukeboxButton emits 'open' event or similar, or use a ref if needed)
const jukeboxOpen = vueRef(false)
function openJukebox() {
  // jukeboxOpen.value = true
  router.push('/jukebox');
}
function closeJukebox() {
  jukeboxOpen.value = false
}


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
  <div class="app layout-flex">
    <LeftMenu :minimized="leftMenuMinimized" @toggle="toggleLeftMenu">
      <template #navigation>
        <Button
          v-for="item in sections"
          :key="item.section"
          :class="['menu-item', { active: isActive(item) } ]"
          @click="navigateTo(item.path)"
          :title="item.label"
          variant="primary"
        >
          <i :class="item.icon" class="menu-icon" />
          <span v-if="!leftMenuMinimized" class="menu-label">{{ item.label }}</span>
        </Button>
      </template>
      <template #bottom>
        <Button variant="primary" @click="openRollModal" :title="t('app.roll')">
          <i class="ra ra-perspective-dice-one" />
          <span v-if="!leftMenuMinimized" class="menu-label">{{ t('app.roll') }}</span>
        </Button>
        <!-- <Button variant="primary" @click="openJukebox" :title="t('app.jukebox')">
          <i class="si si-music-note" />
          <span v-if="!leftMenuMinimized" class="menu-label">{{ t('app.jukebox') }}</span>
        </Button> -->

        <JukeboxButton :left-menu-minimized="leftMenuMinimized" />

        <Button v-if="!leftMenuMinimized"
          class="fullscreen-btn"
          variant="light"
          @click="toggleFullscreen"
          :title="isFullscreen ? t('common.exitFullscreen') : t('common.openFullscreen')"
        >
          <i v-if="!isFullscreen" class="si si-fullscreen"></i>
          <i v-else class="si si-fullscreen-exit"></i>
        </Button>

        <LanguageSwitcher v-if="!leftMenuMinimized" />
        
      </template>
    </LeftMenu>
    <div class="main-area" :class="{ minimized: leftMenuMinimized }">
      <main class="main-content">
        <RouterView v-slot="{ Component, route }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </RouterView>
      </main>
    </div>
    <!-- Floating Action Buttons -->
    <!--div class="fab-container-left">
      <JukeboxButton class="fab-item" />
    </div>
    <div class="fab-container-right">
      <RollButton class="fab-item" />
    </div-->
    <!-- Roll Modal (if needed) -->
    <RollModal ref="rollModalRef" @close="closeRollModal" />
    <!-- Jukebox Modal (if needed) -->
    <!-- <JukeboxButton v-if="jukeboxOpen" @close="closeJukebox" /> -->
    
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

.app.layout-flex {
  min-height: 100vh;
  display: flex;
  flex-direction: row;
}

.main-area {
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
}

.main-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
}
</style>

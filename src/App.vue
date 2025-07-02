<script setup lang="ts">
import {onMounted, onUnmounted, ref} from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import Button from '@/components/common/Button.vue'
import JukeboxButton from '@/components/JukeboxButton.vue'
import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue'
import PWAStatus from '@/components/PWAStatus.vue'
import MentionModalStack from '@/components/common/MentionModalStack.vue'
import LeftMenu from '@/components/LeftMenu.vue'
import { Section } from '@/types'
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";
import RollButton from "@/components/RollButton.vue";

import { IconMaximize, IconMaximizeOff, IconNote, IconUser, IconUsers, IconBook, IconGhost3, IconSwords } from '@tabler/icons-vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';

const playerStore = useJukeboxPlayerStore();

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
  icon: any; // Tabler icon component
}

const sections: SectionItem[] = [
  { section: Section.NOTES, label: t('navigation.notes'), path: '/notes', icon: IconNote },
  { section: Section.CHARACTERS, label: t('navigation.characters'), path: '/characters', icon: IconUser },
  { section: Section.PARTIES, label: t('navigation.parties'), path: '/parties', icon: IconUsers },
  { section: Section.MODULES, label: t('navigation.modules'), path: '/modules', icon: IconBook },
  { section: Section.MONSTERS, label: t('navigation.monsters'), path: '/monsters', icon: IconGhost3 },
  { section: Section.ENCOUNTERS, label: t('navigation.encounters'), path: '/encounters', icon: IconSwords },
]

function isActive(item: SectionItem): boolean {
  const currentPath = router.currentRoute.value.path
  return currentPath.startsWith(item.path)
}
function navigateTo(path: string) {
  router.push(path)
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

onMounted(async () => {
  document.addEventListener('fullscreenchange', updateFullscreenState);
  document.addEventListener('webkitfullscreenchange', updateFullscreenState);
  document.addEventListener('mozfullscreenchange', updateFullscreenState);
  document.addEventListener('MSFullscreenChange', updateFullscreenState);
  updateFullscreenState();
  await playerStore.init();
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
          <component :is="item.icon" class="menu-icon" />
          <span v-if="!leftMenuMinimized" class="menu-label">{{ item.label }}</span>
        </Button>
      </template>
      <template #bottom>
        <JukeboxButton :left-menu-minimized="leftMenuMinimized" />

        <div v-if="!leftMenuMinimized" class="leftmenu-actions-row">
          <Button
            class="fullscreen-btn"
            variant="light"
            @click="toggleFullscreen"
            :title="isFullscreen ? t('common.exitFullscreen') : t('common.openFullscreen')"
          >
            <IconMaximize v-if="!isFullscreen" />
            <IconMaximizeOff v-else />
          </Button>
          <LanguageSwitcher class="language-switcher" />
        </div>
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

    <div class="fab-container-right">
      <RollButton class="fab-item" />
    </div>
    
    <!-- PWA Components -->
    <PWAInstallPrompt />
    <PWAStatus />

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

.leftmenu-actions-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}
.fullscreen-btn,
.language-switcher {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  width: auto;
  min-width: 0;
}
</style>

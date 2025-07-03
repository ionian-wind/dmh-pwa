<script setup lang="ts">
import {onMounted, onUnmounted, ref, watch} from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
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
import CalculatorButton from '@/components/CalculatorButton.vue';

import {
  IconMaximize,
  IconMaximizeOff,
  IconNote,
  IconUser,
  IconUsers,
  IconBook,
  IconGhost3,
  IconSwords,
  IconClockHour1,
  IconClockHour2,
  IconClockHour3,
  IconClockHour4,
  IconClockHour5,
  IconClockHour6,
  IconClockHour7,
  IconClockHour8,
  IconClockHour9,
  IconClockHour10,
  IconClockHour11,
  IconClockHour12,
} from '@tabler/icons-vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useTimerStore } from './stores/timers'

const playerStore = useJukeboxPlayerStore();
const timerStore = useTimerStore();

const leftMenuMinimized = ref(false);
const animationFrame = ref(0);

const hours = [
  IconClockHour4,
  IconClockHour5,
  IconClockHour6,
  IconClockHour7,
  IconClockHour8,
  IconClockHour9,
  IconClockHour10,
  IconClockHour11,
  IconClockHour12,
  IconClockHour1,
  IconClockHour2,
  IconClockHour3,
]

const timerIcon = ref(IconClockHour4);

watch(() => timerStore.now, () => {
  if (timerStore.running) {
    if (animationFrame.value === hours.length) {
      animationFrame.value = 0;
    }

    timerIcon.value = hours[animationFrame.value];

    animationFrame.value += 1;
  }
});


function toggleLeftMenu() {
  leftMenuMinimized.value = !leftMenuMinimized.value
}

const { t } = useI18n()
const router = useRouter()
const route = useRoute();

interface SectionItem {
  section: Section;
  label: string;
  path: string;
  icon: any; // Tabler icon component
  ref?: boolean;
}

const sections: SectionItem[] = [
  { section: Section.NOTES, label: 'navigation.notes', path: '/notes', icon: IconNote },
  { section: Section.CHARACTERS, label: 'navigation.characters', path: '/characters', icon: IconUser },
  { section: Section.PARTIES, label: 'navigation.parties', path: '/parties', icon: IconUsers },
  { section: Section.MODULES, label: 'navigation.modules', path: '/modules', icon: IconBook },
  { section: Section.MONSTERS, label: 'navigation.monsters', path: '/monsters', icon: IconGhost3 },
  { section: Section.ENCOUNTERS, label: 'navigation.encounters', path: '/encounters', icon: IconSwords },
  { section: Section.TIMERS, label: 'navigation.timers', path: '/timers', icon: timerIcon, ref: true },
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
  await timerStore.init();
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
          :title="t(item.label)"
          variant="primary"
        >
          <component
            :is="item.section === Section.TIMERS && item.icon.value ? item.icon.value : item.icon"
            class="menu-icon"
            :key="item.section === Section.TIMERS ? animationFrame : undefined"
          />
          <span v-if="!leftMenuMinimized" class="menu-label">{{ t(item.label) }}</span>
        </Button>
      </template>
      <template #bottom>
        <CalculatorButton :left-menu-minimized="leftMenuMinimized" />
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
      <div v-if="route.path !== '/jukebox'" id="dice-roller" />
      <main class="main-content">
        <RouterView v-slot="{ Component, route }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </RouterView>
      </main>
    </div>

    <div v-if="route.path !== '/jukebox'" class="fab-container-right">
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
#dice-roller {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 900;
  display: flex;
}

#dice-roller canvas {
  width: 100%;
  height: 100%;
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

.app.layout-flex {
  min-height: 100vh;
  display: flex;
  flex-direction: row;
}

.main-area {
  position: relative;
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

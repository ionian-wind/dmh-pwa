<script setup lang="ts">
import { ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import RollButton from '@/components/RollButton.vue'
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
  { section: Section.NOTES, label: t('navigation.notes'), path: '/notes', icon: 'si si-notebook' },
  { section: Section.CHARACTERS, label: t('navigation.characters'), path: '/characters', icon: 'si si-user' },
  { section: Section.PARTIES, label: t('navigation.parties'), path: '/parties', icon: 'si si-users' },
  { section: Section.MODULES, label: t('navigation.modules'), path: '/modules', icon: 'si si-box' },
  { section: Section.MONSTERS, label: t('navigation.monsters'), path: '/monsters', icon: 'si si-skull' },
  { section: Section.ENCOUNTERS, label: t('navigation.encounters'), path: '/encounters', icon: 'si si-swords' },
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
const rollModalOpen = vueRef(false)
function openRollModal() {
  rollModalOpen.value = true
}
function closeRollModal() {
  rollModalOpen.value = false
}

// Jukebox open logic (assume JukeboxButton emits 'open' event or similar, or use a ref if needed)
const jukeboxOpen = vueRef(false)
function openJukebox() {
  jukeboxOpen.value = true
}
function closeJukebox() {
  jukeboxOpen.value = false
}
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
          <i class="si si-dice" />
          <span v-if="!leftMenuMinimized" class="menu-label">{{ t('app.roll') }}</span>
        </Button>
        <Button variant="primary" @click="openJukebox" :title="t('app.jukebox')">
          <i class="si si-music" />
          <span v-if="!leftMenuMinimized" class="menu-label">{{ t('app.jukebox') }}</span>
        </Button>
      </template>
    </LeftMenu>
    <div class="main-area" :class="{ minimized: leftMenuMinimized }">
      <AppHeader />
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
    <RollButton v-if="rollModalOpen" @close="closeRollModal" />
    <!-- Jukebox Modal (if needed) -->
    <JukeboxButton v-if="jukeboxOpen" @close="closeJukebox" />
    
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
  --color-primary: #1e1e2e;
  --color-secondary: #2c3e50;
  --color-text: #333;
  --color-text-light: #666;
  --color-border: #ddd;
  --color-background: #f5f5f5;
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
  color: var(--color-text);
  background-color: var(--color-background);
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

.layout-flex {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
}

.main-area {
  flex: 1;
  transition: none;
}
.main-area.minimized {
  /* No margin-left */
}
</style>

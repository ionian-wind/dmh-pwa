<script setup lang="ts">
import {onMounted, onUnmounted, ref, watch, provide, shallowRef} from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue'
import PWAStatus from '@/components/PWAStatus.vue'
import MentionModalStack from '@/components/common/MentionModalStack.vue'
import { Section } from '@/types'
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";

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
  IconMenu2,
  IconMusic,
  IconCalculator,
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

const leftDrawerOpen = ref(false)
const rightDrawerOpen = ref(true)

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function toggleRightDrawer () {
  rightDrawerOpen.value = !rightDrawerOpen.value
}

const miniState = ref(true);

const rightDrawerContent = shallowRef<null | (() => any)>(null)
provide('setRightDrawerContent', (content: any) => {
  rightDrawerContent.value = content;
});

const bottomDrawerContent = shallowRef<null | (() => any)>(null)
provide('setBottomDrawerContent', (content: any) => {
  bottomDrawerContent.value = content;
});

</script>

<template>
  <QLayout view="lHh lpR lFr">
    <QHeader reveal bordered class="bg-secondary text-white">
      <QToolbar>
        <QBtn dense flat @click="toggleLeftDrawer">
          <IconMenu2 />
        </QBtn>

        <QToolbarTitle>
          Title
        </QToolbarTitle>

<!--        <QBtn dense flat round icon="menu" @click="toggleRightDrawer" />-->
      </QToolbar>
    </QHeader>

    <QDrawer show-if-above
             v-model="leftDrawerOpen"
             side="left"
             bordered
             :mini="miniState"
             @mouseenter="miniState = false"
             @mouseleave="miniState = true"
             class="full-height column justify-between"
    >
    <div>
      <QList>
        <template v-for="(menuItem, index) in sections" :key="index">
          <QItem clickable :active="isActive(menuItem)" v-ripple @click="navigateTo(menuItem.path)">
            <QItemSection avatar>
              <component
                :is="menuItem.section === Section.TIMERS && menuItem.icon.value ? menuItem.icon.value : menuItem.icon"
                :key="menuItem.section === Section.TIMERS ? animationFrame : undefined"
              />
            </QItemSection>
            <QItemSection>
              {{ t(menuItem.label) }}
            </QItemSection>
          </QItem>
        </template>
      </QList>
    </div>
    <div>
      <QList>
        <QItem clickable :active="false" v-ripple @click="navigateTo('/jukebox')">
          <QItemSection avatar>
            <IconMusic />
          </QItemSection>
          <QItemSection>
            {{ t('app.jukebox') }}
          </QItemSection>
        </QItem>
        <QItem clickable :active="false" v-ripple>
          <QItemSection avatar>
            <IconCalculator />
          </QItemSection>
          <QItemSection>
            Calculator
          </QItemSection>
        </QItem>
      </QList>
    </div>

      
    </QDrawer>

    <QDrawer v-if="rightDrawerContent" v-model="rightDrawerOpen" side="right" overlay bordered class="right-sidebar">
      <component :is="rightDrawerContent" />
    </QDrawer>

    <QPageContainer>
      <router-view />
    </QPageContainer>

    <QFooter v-if="bottomDrawerContent" bordered class="bottom-bar">
      <component :is="bottomDrawerContent" />
    </QFooter>

  </QLayout>







  <div>
  <!-- <div class="app layout-flex">
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
    </div> -->
    
    <!-- PWA Components -->
    <PWAInstallPrompt />
    <PWAStatus />

    <!-- Global Mention Modal Stack -->
    <MentionModalStack />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, provide, shallowRef } from 'vue';
import { RouterView, useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue';
import PWAStatus from '@/components/PWAStatus.vue';
import CalculatorView from '@/views/CalculatorView.vue';
import MentionModalStack from '@/components/common/MentionModalStack.vue';
import { Section, ComponentInjection } from '@/types';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';

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
  IconExternalLink,
  IconX,
} from '@tabler/icons-vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useTimerStore } from './stores/timers';
import JukeboxPlayer from '@/jukebox/components/JukeboxPlayer.vue';

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
];

const timerIcon = ref(IconClockHour4);

watch(
  () => timerStore.now,
  () => {
    if (timerStore.running) {
      if (animationFrame.value === hours.length) {
        animationFrame.value = 0;
      }

      timerIcon.value = hours[animationFrame.value];

      animationFrame.value += 1;
    }
  },
);

function toggleLeftMenu() {
  leftMenuMinimized.value = !leftMenuMinimized.value;
}

const { t } = useI18n();
const router = useRouter();

interface SectionItem {
  section: Section;
  label: string;
  path: string;
  icon: any; // Tabler icon component
  ref?: boolean;
}

const sections: SectionItem[] = [
  {
    section: Section.NOTES,
    label: 'navigation.notes',
    path: '/notes',
    icon: IconNote,
  },
  {
    section: Section.CHARACTERS,
    label: 'navigation.characters',
    path: '/characters',
    icon: IconUser,
  },
  {
    section: Section.PARTIES,
    label: 'navigation.parties',
    path: '/parties',
    icon: IconUsers,
  },
  {
    section: Section.MODULES,
    label: 'navigation.modules',
    path: '/modules',
    icon: IconBook,
  },
  {
    section: Section.MONSTERS,
    label: 'navigation.monsters',
    path: '/monsters',
    icon: IconGhost3,
  },
  {
    section: Section.ENCOUNTERS,
    label: 'navigation.encounters',
    path: '/encounters',
    icon: IconSwords,
  },
  {
    section: Section.TIMERS,
    label: 'navigation.timers',
    path: '/timers',
    icon: timerIcon,
    ref: true,
  },
];

function isActive(item: SectionItem): boolean {
  const currentPath = router.currentRoute.value.path;
  return currentPath.startsWith(item.path);
}

function isJukeboxActive(): boolean {
  const currentPath = router.currentRoute.value.path;
  return currentPath === '/jukebox';
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

const leftDrawerOpen = ref(false);
const rightDrawerOpen = ref(true);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function toggleRightDrawer() {
  rightDrawerOpen.value = !rightDrawerOpen.value;
}

const miniState = ref(true);

const topMenuContent = shallowRef<ComponentInjection>(null);
provide('setTopMenuContent', (component: ComponentInjection) => {
  topMenuContent.value = component;
});

const rightDrawerContent = shallowRef<ComponentInjection>(null);
provide('setRightDrawerContent', (component: ComponentInjection) => {
  rightDrawerContent.value = component;
});

const bottomDrawerContent = shallowRef<ComponentInjection>(null);
provide('setBottomDrawerContent', (component: ComponentInjection) => {
  bottomDrawerContent.value = component;
});

const isJukeboxPopupOpen = ref(false);
const isCalculatorPopupOpen = ref(false);
</script>

<template>
  <div>
    <QLayout view="hHh LpR lFr">
      <QHeader bordered class="bg-primary text-white">
        <QToolbar>
          <QToolbar class="text-white justify-between">
            <QBtn dense flat @click="toggleLeftDrawer" class="q-mr-sm">
              <IconMenu2 />
            </QBtn>

            <QSeparator vertical v-if="topMenuContent" />

            <component
              v-if="topMenuContent"
              :is="topMenuContent.component"
              v-bind="topMenuContent.props"
            />
          </QToolbar>
        </QToolbar>
      </QHeader>

      <QDrawer
        show-if-above
        v-model="leftDrawerOpen"
        side="left"
        bordered
        :mini="miniState"
        @mouseenter="miniState = false"
        @mouseleave="miniState = true"
        class="left-sidebar full-height column justify-between q-gutter-y-sm"
      >
        <div>
          <QList>
            <template v-for="(menuItem, index) in sections" :key="index">
              <QItem
                clickable
                v-ripple
                :active="isActive(menuItem)"
                :active-class="'bg-secondary'"
                :to="menuItem.path"
              >
                <QItemSection side>
                  <component
                    :is="
                      menuItem.section === Section.TIMERS && menuItem.icon.value
                        ? menuItem.icon.value
                        : menuItem.icon
                    "
                    :key="
                      menuItem.section === Section.TIMERS
                        ? animationFrame
                        : undefined
                    "
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
            <QItem
              v-if="isJukeboxActive()"
              clickable
              v-ripple
              :active="isJukeboxActive()"
              :to="'/jukebox'"
              :active-class="'bg-secondary'"
            >
              <QItemSection side>
                <IconMusic />
              </QItemSection>
              <QItemSection>
                {{ t('app.jukebox') }}
              </QItemSection>
            </QItem>

            <QItem
              class="jukebox-button"
              v-else
              clickable
              v-ripple
              @click="isJukeboxPopupOpen = true"
            >
              <QItemSection side>
                <IconMusic />
              </QItemSection>
              <QItemSection>
                {{ t('app.jukebox') }}
              </QItemSection>
            </QItem>
            <QItem
              clickable
              :active="false"
              v-ripple
              @click="isCalculatorPopupOpen = true"
            >
              <QItemSection side><IconCalculator /></QItemSection>
              <QItemSection>{{ t('app.calculator') }}</QItemSection>
            </QItem>
          </QList>
        </div>
      </QDrawer>

      <QDrawer
        v-if="rightDrawerContent"
        v-model="rightDrawerOpen"
        side="right"
        bordered
        class="right-sidebar"
      >
        <component
          :is="rightDrawerContent.component"
          v-bind="rightDrawerContent.props"
        />
      </QDrawer>

      <QPageContainer>
        <router-view />
      </QPageContainer>

      <QFooter
        v-if="bottomDrawerContent"
        elevated
        class="q-pa-md text-primary bg-secondary"
      >
        <component
          :is="bottomDrawerContent.component"
          v-bind="bottomDrawerContent.props"
        />
      </QFooter>
    </QLayout>
    <div>
      <!-- PWA Components -->
      <PWAInstallPrompt />
      <PWAStatus />
      <!-- Global Mention Modal Stack -->
      <MentionModalStack />
      <CalculatorView
        v-if="isCalculatorPopupOpen"
        v-model="isCalculatorPopupOpen"
      />

      <QDialog v-model="isJukeboxPopupOpen" seamless position="bottom">
        <QCard>
          <QToolbar class="justify-between">
            <QBtn
              flat
              clickable
              @click="isJukeboxPopupOpen = false"
              :to="'/jukebox'"
              ><IconExternalLink
            /></QBtn>
            <QBtn flat clickable @click="isJukeboxPopupOpen = false"
              ><IconX
            /></QBtn>
          </QToolbar>
          <JukeboxPlayer :modal="true" :show-artwork="true" />
        </QCard>
      </QDialog>
    </div>
  </div>
</template>

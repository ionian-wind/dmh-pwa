<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterView, useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue';
import PWAStatus from '@/components/PWAStatus.vue';
import CalculatorDialog from '@/calculator/CalculatorView.vue';
import MentionModalStack from '@/components/common/MentionModalStack.vue';
import { Section } from '@/types';
import SettingsDialog from '@/components/SettingsDialog.vue';
import { provideLayout } from '@/composables/useLayout';

import {
  IconMaximize,
  IconMaximizeOff,
  IconPlaylist,
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
  IconSettings,
  IconMap,
  // IconHeadphones,
} from '@tabler/icons-vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useTimerStore } from './stores/timers';
import JukeboxDialog from '@/jukebox/components/JukeboxDialog.vue';
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
    section: Section.MAPS,
    label: 'navigation.maps',
    path: '/maps',
    icon: IconMap,
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
  // {
  //   section: Section.AMBIENT_SOUND,
  //   label: 'navigation.ambientSound',
  //   path: '/ambient-sound',
  //   icon: IconHeadphones,
  // },
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
const miniState = ref(true);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

const {
  topMenuContent,
  rightDrawerContent,
  bottomDrawerContent,
  rightDrawerOpen,
  toggleRightDrawer,
} = provideLayout();

// The jukebox player should sit flush in the footer, without the default
// footer padding, background, or elevated shadow ("gray boundaries").
const hasJukeboxFooter = computed(
  () => bottomDrawerContent.value?.component === JukeboxPlayer,
);

const isJukeboxPopupOpen = ref(false);
const isCalculatorPopupOpen = ref(false);
const isSettingsOpen = ref(false);
</script>

<template>
  <div>
    <QLayout view="hHh LpR lFr">
      <QHeader bordered class="bg-primary text-white">
        <QToolbar class="text-white justify-between">
          <QBtn dense flat @click="toggleLeftDrawer" class="q-mr-sm">
            <IconMenu2 />
          </QBtn>

          <QSeparator vertical v-if="topMenuContent" />

          <component
            v-if="topMenuContent"
            :is="topMenuContent.component"
            v-bind="topMenuContent.props"
          ></component>
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
                <IconMusic
                  :class="{ 'jukebox-playing': playerStore.isPlaying }"
                />
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
              @click="isJukeboxPopupOpen = !isJukeboxPopupOpen"
            >
              <QItemSection side>
                <IconMusic
                  :class="{ 'jukebox-playing': playerStore.isPlaying }"
                />
              </QItemSection>
              <QItemSection>
                {{ t('app.jukebox') }}
              </QItemSection>
            </QItem>
            <QItem
              clickable
              :active="false"
              v-ripple
              @click="isCalculatorPopupOpen = !isCalculatorPopupOpen"
            >
              <QItemSection side><IconCalculator /></QItemSection>
              <QItemSection>{{ t('app.calculator') }}</QItemSection>
            </QItem>
            <QItem
              clickable
              data-test="open-settings"
              :active="false"
              v-ripple
              @click="isSettingsOpen = true"
            >
              <QItemSection side><IconSettings /></QItemSection>
              <QItemSection>{{ t('navigation.settings') }}</QItemSection>
            </QItem>
          </QList>
        </div>
      </QDrawer>

      <QDrawer
        v-if="rightDrawerContent"
        v-model="rightDrawerOpen"
        side="right"
        persistent
        bordered
        show-if-above
        behavior="desktop"
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
        :elevated="!hasJukeboxFooter"
        :class="
          hasJukeboxFooter
            ? 'footer-flush'
            : 'q-pa-md text-primary bg-secondary'
        "
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
      <CalculatorDialog v-model="isCalculatorPopupOpen" />
      <JukeboxDialog v-model="isJukeboxPopupOpen" />
      <SettingsDialog v-model="isSettingsOpen" />
    </div>
  </div>
</template>

<style scoped>
@keyframes jukebox-sway {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-8deg);
  }
  75% {
    transform: rotate(8deg);
  }
}

.jukebox-playing {
  animation: jukebox-sway 0.6s ease-in-out infinite;
}

.footer-flush {
  padding: 0 !important;
  background: var(--color-background-soft) !important;
  border-top: none !important;
  color: var(--color-text) !important;
  box-shadow: none !important;
}

/* Shadow only above the panel; no left, right, or bottom shadow. */
.footer-flush::before {
  content: '';
  position: absolute;
  right: 0;
  bottom: 100%;
  left: 0;
  height: 14px;
  pointer-events: none;
  background: linear-gradient(
    to top,
    rgba(15, 23, 42, 0.16),
    rgba(15, 23, 42, 0)
  );
}
</style>

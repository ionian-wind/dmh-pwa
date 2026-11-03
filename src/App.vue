<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterView, useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue';
import PWAStatus from '@/components/PWAStatus.vue';
import CalculatorDialog from '@/calculator/CalculatorView.vue';
import MentionModalStack from '@/components/common/MentionModalStack.vue';
import { Section } from '@/types';
import SettingsDialog from '@/components/SettingsDialog.vue';
import { provideLayout } from '@/composables/useLayout';
import { useConfigStore } from './utils/configStore';

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
  IconChartLine,
  IconTool,
  IconChevronDown,
  IconSettings,
  IconMap,
  IconHeadphones,
} from '@tabler/icons-vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useTimerStore } from './stores/timers';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import SoundControlDialog from '@/jukebox/components/SoundControlDialog.vue';
import JukeboxPlayer from '@/jukebox/components/JukeboxPlayer.vue';
import AmbientGlobalControl from '@/ambient-sound/components/AmbientGlobalControl.vue';
import { usePageContentRect } from '@/composables/usePageContentRect';

const playerStore = useJukeboxPlayerStore();
const timerStore = useTimerStore();
const ambientSoundStore = useAmbientSoundStore();
const configStore = useConfigStore();

const leftMenuMinimized = ref(false);
const toolsExpanded = ref(false);
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
    section: Section.MODULES,
    label: 'navigation.modules',
    path: '/modules',
    icon: IconBook,
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

function isProbabilityCalculatorActive(): boolean {
  return router.currentRoute.value.path.startsWith('/probability-calculator');
}

function isToolsRoute(): boolean {
  const path = router.currentRoute.value.path;
  return (
    path.startsWith('/timers') ||
    path.startsWith('/probability-calculator') ||
    path.startsWith('/ambient')
  );
}

watch(
  () => router.currentRoute.value.path,
  () => {
    if (isToolsRoute()) toolsExpanded.value = true;
  },
  { immediate: true },
);

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

const menuMini = computed(() => !configStore.expandMenu || miniState.value);
const menuLockedMini = computed(() => !configStore.expandMenu);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function onMenuMouseEnter() {
  if (configStore.expandMenu) miniState.value = false;
}

function onMenuMouseLeave() {
  if (configStore.expandMenu) miniState.value = true;
}

const {
  topMenuContent,
  rightDrawerContent,
  bottomDrawerContent,
  rightDrawerOpen,
  toggleRightDrawer,
} = provideLayout();

// Player panels (jukebox and ambient sound) should sit flush in the footer,
// without the default footer padding, background, or elevated shadow
// ("gray boundaries").
const hasPlayerFooter = computed(() => {
  const component = bottomDrawerContent.value?.component;
  return component === JukeboxPlayer || component === AmbientGlobalControl;
});

const pageContentRect = usePageContentRect();
const isSoundControlOpen = ref(false);

// The drawer widths are animated with CSS, so ResizeObserver does the steady
// work. These watchers also cover the initial frame and browsers without
// ResizeObserver.
watch([rightDrawerOpen, leftDrawerOpen, miniState, rightDrawerContent], () => {
  void nextTick(pageContentRect.update);
});
const isCalculatorPopupOpen = ref(false);
const isSettingsOpen = ref(false);

function openJukebox() {
  if (configStore.jukeboxUseMiniPlayer) {
    isSoundControlOpen.value = !isSoundControlOpen.value;
    return;
  }
  router.push('/jukebox');
}
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
        :mini="menuMini"
        @mouseenter="onMenuMouseEnter"
        @mouseleave="onMenuMouseLeave"
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
                :title="t(menuItem.label)"
                :aria-label="t(menuItem.label)"
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
            <QItem
              clickable
              v-ripple
              :active="false"
              :title="t('navigation.tools')"
              :aria-label="t('navigation.tools')"
              @click="toolsExpanded = !toolsExpanded"
            >
              <QItemSection side>
                <div
                  class="tools-icon-stack"
                  :class="{ 'tools-icon-stack--mini': menuLockedMini }"
                >
                  <IconTool />
                  <IconChevronDown
                    v-if="menuLockedMini"
                    :size="14"
                    class="tools-caret tools-caret--mini"
                    :class="{ 'tools-caret--open': toolsExpanded }"
                  />
                </div>
              </QItemSection>
              <QItemSection>{{ t('navigation.tools') }}</QItemSection>
              <QItemSection v-if="!menuLockedMini" side>
                <IconChevronDown
                  :size="18"
                  class="tools-caret"
                  :class="{ 'tools-caret--open': toolsExpanded }"
                />
              </QItemSection>
            </QItem>
            <QSlideTransition>
              <div v-show="toolsExpanded">
                <QItem
                  clickable
                  v-ripple
                  :active="router.currentRoute.value.path.startsWith('/timers')"
                  :active-class="'bg-secondary'"
                  :to="'/timers'"
                  :title="t('navigation.timers')"
                  :aria-label="t('navigation.timers')"
                >
                  <QItemSection side>
                    <component :is="timerIcon" :key="animationFrame" />
                  </QItemSection>
                  <QItemSection>{{ t('navigation.timers') }}</QItemSection>
                </QItem>
                <QItem
                  clickable
                  v-ripple
                  :active="false"
                  :title="t('app.calculator')"
                  :aria-label="t('app.calculator')"
                  @click="isCalculatorPopupOpen = !isCalculatorPopupOpen"
                >
                  <QItemSection side><IconCalculator /></QItemSection>
                  <QItemSection>{{ t('app.calculator') }}</QItemSection>
                </QItem>
                <QItem
                  clickable
                  v-ripple
                  :to="'/probability-calculator'"
                  :active="isProbabilityCalculatorActive()"
                  :active-class="'bg-secondary'"
                  :title="t('navigation.probabilityCalculator')"
                  :aria-label="t('navigation.probabilityCalculator')"
                >
                  <QItemSection side><IconChartLine /></QItemSection>
                  <QItemSection>
                    {{ t('navigation.probabilityCalculator') }}
                  </QItemSection>
                </QItem>
                <QItem
                  clickable
                  v-ripple
                  :to="'/ambient'"
                  :active="
                    router.currentRoute.value.path.startsWith('/ambient')
                  "
                  :active-class="'bg-secondary'"
                  :title="t('navigation.ambientSound')"
                  :aria-label="t('navigation.ambientSound')"
                >
                  <QItemSection side>
                    <IconHeadphones
                      :class="{
                        'ambient-playing': ambientSoundStore.isPlaying,
                      }"
                    />
                  </QItemSection>
                  <QItemSection>
                    {{ t('navigation.ambientSound') }}
                  </QItemSection>
                </QItem>
              </div>
            </QSlideTransition>
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
              :title="t('app.jukebox')"
              :aria-label="t('app.jukebox')"
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
              :title="t('app.jukebox')"
              :aria-label="t('app.jukebox')"
              @click="openJukebox"
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
              data-test="open-settings"
              :active="false"
              :title="t('navigation.settings')"
              :aria-label="t('navigation.settings')"
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
        :elevated="!hasPlayerFooter"
        :class="
          hasPlayerFooter ? 'footer-flush' : 'q-pa-md text-primary bg-secondary'
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
      <!-- Install prompt temporarily disabled while the flow is being finished. -->
      <PWAInstallPrompt :enabled="false" />
      <PWAStatus />
      <!-- Global Mention Modal Stack -->
      <MentionModalStack />
      <CalculatorDialog v-model="isCalculatorPopupOpen" />
      <SoundControlDialog
        v-model="isSoundControlOpen"
        :content-left="pageContentRect.left.value"
        :content-width="pageContentRect.width.value"
      />
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

@keyframes ambient-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.25);
  }
  55% {
    transform: scale(1.06);
  }
  72% {
    transform: scale(1.18);
  }
}

.ambient-playing {
  transform-origin: center;
  animation: ambient-pulse 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .jukebox-playing,
  .ambient-playing {
    animation: none;
  }
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
.tools-caret {
  transition: transform 0.2s ease;
}

.tools-caret--open {
  transform: rotate(180deg);
}

.tools-icon-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.tools-icon-stack--mini {
  gap: 0;
}

.tools-caret--mini {
  margin-top: -1px;
}
</style>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type Component,
} from 'vue';
import { RouterView, useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue';
import PWAStatus from '@/components/PWAStatus.vue';
import CommitBadge from '@/components/CommitBadge.vue';
import SettingsDialog from '@/components/SettingsDialog.vue';
import { provideLayout, unwrapProps } from '@/composables/useLayout';
import { useConfigStore } from './utils/configStore';
import { featureNavigation } from 'virtual:feature-navigation';
import { featureGlobals } from 'virtual:feature-globals';
import type { FeatureNavEntry } from '@/features/types';

import {
  IconMaximize,
  IconMaximizeOff,
  IconMenu2,
  IconTool,
  IconScript,
  IconMasksTheater,
  IconChevronDown,
  IconSettings,
} from '@tabler/icons-vue';

const configStore = useConfigStore();
const { t } = useI18n();
const router = useRouter();
const route = useRoute();

// Keep encounters-owned code out of builds where encounters are disabled.
const ActiveCombatButton = __FEATURE_ENCOUNTERS__
  ? defineAsyncComponent(() => import('@/encounters/ActiveCombatButton.vue'))
  : null;

const leftMenuMinimized = ref(false);

function navigationFor(placement: FeatureNavEntry['placement']) {
  return featureNavigation
    .filter((item) => item.placement === placement)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

const primaryNavigation = computed(() => navigationFor('primary'));
const footerNavigation = computed(() => navigationFor('footer'));

interface NavGroup {
  id: string;
  labelKey: string;
  icon: Component;
  items: FeatureNavEntry[];
}

const navGroups = computed<NavGroup[]>(() =>
  [
    {
      id: 'gameSessions',
      labelKey: 'navigation.gameSessions',
      icon: IconMasksTheater,
      items: navigationFor('gameSessions'),
    },
    {
      id: 'scribe',
      labelKey: 'navigation.scribe',
      icon: IconScript,
      items: navigationFor('scribe'),
    },
    {
      id: 'tools',
      labelKey: 'navigation.tools',
      icon: IconTool,
      items: navigationFor('tools'),
    },
  ].filter((group) => group.items.length > 0),
);

function isNavActive(item: FeatureNavEntry): boolean {
  const currentPath = router.currentRoute.value.path;
  if (item.activePathPrefixes) {
    return item.activePathPrefixes.some((prefix) =>
      currentPath.startsWith(prefix),
    );
  }
  return item.type === 'route' && currentPath.startsWith(item.path);
}

function isGroupActive(group: NavGroup): boolean {
  return group.items.some((item) => isNavActive(item));
}

function isGroupExpanded(id: string): boolean {
  return configStore.navigationGroupsExpanded[id] === true;
}

function setGroupExpanded(id: string, expanded: boolean): void {
  configStore.navigationGroupsExpanded = {
    ...configStore.navigationGroupsExpanded,
    [id]: expanded,
  };
}

function toggleGroup(id: string): void {
  setGroupExpanded(id, !isGroupExpanded(id));
}

watch(
  () => router.currentRoute.value.path,
  () => {
    for (const group of navGroups.value) {
      if (!isGroupActive(group)) continue;
      // Respect a saved collapse choice; only auto-open groups the user has
      // never toggled so deep links are not hidden on first visit.
      if (configStore.navigationGroupsExpanded[group.id] === undefined) {
        setGroupExpanded(group.id, true);
      }
    }
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

const hasPlayerFooter = computed(
  () => bottomDrawerContent.value?.flushFooter === true,
);

const isSettingsOpen = ref(false);
</script>

<template>
  <div>
    <QLayout view="hHh LpR lFr">
      <QHeader bordered class="bg-primary text-white" id="main_header">
        <QToolbar class="text-white justify-between">
          <QBtn
            dense
            flat
            @click="toggleLeftDrawer"
            class="menu-toggle q-mr-sm"
          >
            <IconMenu2 />
          </QBtn>

          <QSeparator vertical v-if="topMenuContent" class="q-mr-sm" />

          <component
            v-if="topMenuContent"
            :is="topMenuContent.component"
            v-bind="topMenuContent.props"
          ></component>

          <component :is="ActiveCombatButton" v-if="ActiveCombatButton" />
        </QToolbar>
      </QHeader>

      <QDrawer
        id="main_menu"
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
            <template v-for="item in primaryNavigation" :key="item.id">
              <QItem
                v-if="item.type === 'route'"
                clickable
                v-ripple
                :active="isNavActive(item)"
                active-class="bg-secondary"
                :to="item.path"
                :title="t(item.labelKey)"
                :aria-label="t(item.labelKey)"
              >
                <QItemSection side><component :is="item.icon" /></QItemSection>
                <QItemSection>{{ t(item.labelKey) }}</QItemSection>
              </QItem>
            </template>
            <template v-for="group in navGroups" :key="group.id">
              <QItem
                clickable
                v-ripple
                :active="isGroupActive(group)"
                :active-class="'bg-secondary'"
                :title="t(group.labelKey)"
                :aria-label="t(group.labelKey)"
                @click="toggleGroup(group.id)"
              >
                <QItemSection side>
                  <div
                    class="tools-icon-stack"
                    :class="{ 'tools-icon-stack--mini': menuLockedMini }"
                  >
                    <component :is="group.icon" />
                    <IconChevronDown
                      v-if="menuLockedMini"
                      :size="14"
                      class="tools-caret tools-caret--mini"
                      :class="{
                        'tools-caret--open': isGroupExpanded(group.id),
                      }"
                    />
                  </div>
                </QItemSection>
                <QItemSection>{{ t(group.labelKey) }}</QItemSection>
                <QItemSection v-if="!menuLockedMini" side>
                  <IconChevronDown
                    :size="18"
                    class="tools-caret"
                    :class="{ 'tools-caret--open': isGroupExpanded(group.id) }"
                  />
                </QItemSection>
              </QItem>
              <QSlideTransition>
                <div v-show="isGroupExpanded(group.id)">
                  <template v-for="item in group.items" :key="item.id">
                    <component
                      :is="item.component"
                      v-if="item.type === 'component'"
                    />
                    <QItem
                      v-else
                      clickable
                      v-ripple
                      :active="isNavActive(item)"
                      active-class="bg-secondary"
                      :to="item.path"
                      :title="t(item.labelKey)"
                      :aria-label="t(item.labelKey)"
                    >
                      <QItemSection side>
                        <component :is="item.icon" />
                      </QItemSection>
                      <QItemSection>{{ t(item.labelKey) }}</QItemSection>
                    </QItem>
                  </template>
                </div>
              </QSlideTransition>
            </template>
          </QList>
        </div>
        <div>
          <QList>
            <template v-for="item in footerNavigation" :key="item.id">
              <component
                :is="item.component"
                v-if="item.type === 'component'"
              />
              <QItem
                v-else
                clickable
                v-ripple
                :active="isNavActive(item)"
                active-class="bg-secondary"
                :to="item.path"
                :title="t(item.labelKey)"
                :aria-label="t(item.labelKey)"
              >
                <QItemSection side><component :is="item.icon" /></QItemSection>
                <QItemSection>{{ t(item.labelKey) }}</QItemSection>
              </QItem>
            </template>
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
        :width="350"
        class="right-sidebar"
      >
        <component
          :is="rightDrawerContent.component"
          v-bind="unwrapProps(rightDrawerContent.props)"
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
      <PWAInstallPrompt />
      <PWAStatus />
      <CommitBadge />
      <component
        v-for="(globalComponent, index) in featureGlobals"
        :is="globalComponent"
        :key="index"
      />
      <SettingsDialog v-model="isSettingsOpen" />
    </div>
  </div>
</template>

<style scoped>
:global(.right-sidebar) {
  z-index: 800;
}

:global(#main_menu),
:global(#main_header) {
  z-index: 2000;
}

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

.q-toolbar {
  position: relative;
}

/* Match the collapsed drawer column so the hamburger block lines up with it. */
:deep(.menu-toggle) {
  width: 40px;
  min-width: 40px;
  height: 50px;
  margin-left: 0;
  border-radius: 0;
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
  background: var(--color-player-panel) !important;
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

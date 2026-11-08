<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
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
  IconChevronDown,
  IconSettings,
} from '@tabler/icons-vue';

const configStore = useConfigStore();
const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const leftMenuMinimized = ref(false);
const toolsExpanded = ref(false);

const primaryNavigation = computed(() =>
  featureNavigation.filter((item) => item.placement === 'primary'),
);
const toolsNavigation = computed(() =>
  featureNavigation.filter((item) => item.placement === 'tools'),
);
const footerNavigation = computed(() =>
  featureNavigation.filter((item) => item.placement === 'footer'),
);
const hasTools = computed(() => toolsNavigation.value.length > 0);

function isNavActive(item: FeatureNavEntry): boolean {
  const currentPath = router.currentRoute.value.path;
  if (item.activePathPrefixes) {
    return item.activePathPrefixes.some((prefix) =>
      currentPath.startsWith(prefix),
    );
  }
  return item.type === 'route' && currentPath.startsWith(item.path);
}

const toolsActive = computed(() =>
  toolsNavigation.value.some((item) => isNavActive(item)),
);
watch(
  () => router.currentRoute.value.path,
  () => {
    if (toolsActive.value) toolsExpanded.value = true;
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
            <QItem
              v-if="hasTools"
              clickable
              v-ripple
              :active="toolsActive"
              :active-class="'bg-secondary'"
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
              <div v-show="toolsExpanded && hasTools">
                <template v-for="item in toolsNavigation" :key="item.id">
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

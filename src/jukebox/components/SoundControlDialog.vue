<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch,
  type ComponentPublicInstance,
} from 'vue';
import { useI18n } from 'vue-i18n';

import { useRouter } from 'vue-router';
import JukeboxPlayer from '@/jukebox/components/JukeboxPlayer.vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useConfigStore } from '@/utils/configStore';
import {
  getGradientContrastColor,
  useAnimatedGradient,
} from '@/jukebox/useAnimatedGradient';
import { useDragSnap } from '@/composables/useDragSnap';
import { useFloatingLayer } from '@/composables/useFloatingLayer';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    /** Viewport rectangle of the page content area, excluding drawers. */
    contentLeft?: number;
    contentWidth?: number;
  }>(),
  {
    contentLeft: 0,
    contentWidth: 0,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const { t } = useI18n();
const { zIndex, bringToFront } = useFloatingLayer(6000);
const router = useRouter();
const playerStore = useJukeboxPlayerStore();
const configStore = useConfigStore();

type AmbientState = {
  isPlaying: boolean;
  activeScene: unknown;
};

// Keep ambient code out of builds where the ambient feature is disabled.
const ambientEnabled = __FEATURE_AMBIENT__;
const ambientStore = shallowRef<AmbientState | null>(null);
const AmbientPlayerPanel = ambientEnabled
  ? defineAsyncComponent(
      () => import('@/ambient-sound/components/AmbientPlayerPanel.vue'),
    )
  : null;

const PLAYER_TAB_KEY = 'dmh-player-dialog-tab';
type PlayerTab = 'jukebox' | 'ambient';

function readLastPlayerTab(): PlayerTab {
  if (!ambientEnabled) return 'jukebox';
  try {
    return localStorage.getItem(PLAYER_TAB_KEY) === 'ambient'
      ? 'ambient'
      : 'jukebox';
  } catch {
    return 'jukebox';
  }
}

function rememberPlayerTab(tab: PlayerTab) {
  lastPlayedTab.value = tab;
  try {
    localStorage.setItem(PLAYER_TAB_KEY, tab);
  } catch {
    // Storage may be unavailable.
  }
}

const lastPlayedTab = ref<PlayerTab>(readLastPlayerTab());
const activeTab = ref<PlayerTab>(lastPlayedTab.value);

watch(
  () => playerStore.isPlaying,
  (playing) => {
    if (playing) rememberPlayerTab('jukebox');
  },
);

watch(
  () => ambientStore.value?.isPlaying ?? false,
  (playing) => {
    if (playing) rememberPlayerTab('ambient');
  },
);

function resolveInitialTab(): PlayerTab {
  const ambient = ambientStore.value;
  if (ambient?.isPlaying && !playerStore.isPlaying) return 'ambient';
  if (playerStore.isPlaying && !ambient?.isPlaying) return 'jukebox';
  if (lastPlayedTab.value === 'ambient' && ambient?.activeScene) {
    return 'ambient';
  }
  if (lastPlayedTab.value === 'jukebox' && playerStore.currentTrack) {
    return 'jukebox';
  }
  if (ambient?.activeScene) return 'ambient';
  return 'jukebox';
}

if (ambientEnabled) {
  void import('@/ambient-sound/stores/ambientSoundStore').then(
    ({ useAmbientSoundStore }) => {
      ambientStore.value = useAmbientSoundStore();
      if (props.modelValue) activeTab.value = resolveInitialTab();
    },
  );
}

const palette = computed<string[] | undefined>(() => {
  const track = playerStore.currentTrack;
  if (track?.palette && track.palette.length > 0) return track.palette;
  if (track?.color) return [track.color, track.color, track.color];
  return undefined;
});

const hasGradientBg = computed(
  () =>
    activeTab.value === 'jukebox' &&
    configStore.jukeboxAnimatePlayerBackground &&
    !!palette.value?.length,
);

const isAnimatedBg = computed(
  () => hasGradientBg.value && playerStore.isPlaying,
);

// The card is the single gradient canvas: its pseudo-element sits behind the
// toolbar and the player, so the header and content share one background.
const gradientStyle = useAnimatedGradient(hasGradientBg, () => palette.value);
const gradientKey = computed(() => palette.value?.join('|') ?? '');
const gradientVisible = ref(false);

watch(
  hasGradientBg,
  (visible) => {
    if (visible) gradientVisible.value = true;
  },
  { immediate: true },
);

function onGradientAfterLeave() {
  if (!hasGradientBg.value) gradientVisible.value = false;
}

const controlStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {};
  if (!hasGradientBg.value || !palette.value?.length) {
    return style;
  }
  const color = getGradientContrastColor(palette.value);
  style['--jp-control-color'] = color;
  style['--jp-control-track'] = `${color}33`;
  return style;
});

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const displayMode = ref<'panel' | 'dialog'>('panel');
const cardRef = ref<ComponentPublicInstance | null>(null);
const isRepositioning = ref(false);
const canDock = ref(false);
const PANEL_DETACH_DISTANCE = 5;
const DIALOG_DOCK_DISTANCE = 10;
let repositioning = false;

const viewportWidth = ref(
  typeof window === 'undefined' ? 0 : window.innerWidth,
);

function updateViewportWidth() {
  viewportWidth.value = window.innerWidth;
}

onMounted(() => window.addEventListener('resize', updateViewportWidth));
onUnmounted(() => window.removeEventListener('resize', updateViewportWidth));

function distanceFromViewportBottom(): number | null {
  const element = cardRef.value?.$el as HTMLElement | undefined;
  if (!element) return null;

  return window.innerHeight - element.getBoundingClientRect().bottom;
}

function hasLeftDockZone(): boolean {
  const distance = distanceFromViewportBottom();
  return distance !== null && distance > DIALOG_DOCK_DISTANCE;
}

function isWithinDockZone(): boolean {
  const distance = distanceFromViewportBottom();
  return distance !== null && distance <= DIALOG_DOCK_DISTANCE;
}

async function setDisplayMode(
  mode: 'panel' | 'dialog',
  preservePosition = false,
) {
  if (displayMode.value === mode) return;

  const element = cardRef.value?.$el as HTMLElement | undefined;
  const previousRect = element?.getBoundingClientRect();

  canDock.value = false;

  if (!preservePosition || !isDragging.value) {
    displayMode.value = mode;
    rebaseDrag();
    if (mode === 'panel') endDrag();
    return;
  }

  if (repositioning) return;
  repositioning = true;
  isRepositioning.value = true;

  displayMode.value = mode;
  await nextTick();

  if (element && previousRect) {
    if (mode === 'dialog') {
      const handle = element.querySelector(
        '.drag-handle',
      ) as HTMLElement | null;
      const anchorRect = (handle ?? element).getBoundingClientRect();
      const anchorX = anchorRect.left + anchorRect.width / 2;
      const anchorY = anchorRect.top + anchorRect.height / 2;

      setPosition(
        translateX.value + pointerX.value - anchorX,
        translateY.value + pointerY.value - anchorY,
      );
    } else {
      const nextRect = element.getBoundingClientRect();
      setPosition(
        translateX.value + previousRect.left - nextRect.left,
        translateY.value + previousRect.top - nextRect.top,
      );
    }
    rebaseDragOrigin();
  }

  await nextTick();

  if (mode === 'dialog' && hasLeftDockZone()) {
    canDock.value = true;
  }

  if (mode === 'panel') endDrag();

  isRepositioning.value = false;
  repositioning = false;
}

function handleDragRelease() {
  if (repositioning) return;

  if (displayMode.value === 'panel') {
    if (translateY.value < -PANEL_DETACH_DISTANCE) {
      setDisplayMode('dialog');
    }
    return;
  }

  if (canDock.value && isWithinDockZone()) setDisplayMode('panel');
}

const {
  cardStyle,
  transitionHide,
  isDragging,
  pointerX,
  pointerY,
  translateX,
  translateY,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onHide,
  resetPosition,
  rebaseDrag,
  setPosition,
  rebaseDragOrigin,
  endDrag,
} = useDragSnap({
  snapBack: () => displayMode.value === 'panel',
  onRelease: handleDragRelease,
});

watch([isDragging, translateY], ([dragging, offsetY]) => {
  if (!dragging || repositioning) return;

  if (displayMode.value === 'panel') {
    if (offsetY < -PANEL_DETACH_DISTANCE) void setDisplayMode('dialog', true);
    return;
  }

  if (hasLeftDockZone()) {
    canDock.value = true;
  }

  if (canDock.value && isWithinDockZone()) {
    setDisplayMode('panel');
  }
});

function handleHide() {
  onHide();
  displayMode.value = 'panel';
  canDock.value = false;
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      activeTab.value = resolveInitialTab();
      displayMode.value = 'panel';
      canDock.value = false;
      resetPosition();
    }
  },
  { immediate: true },
);

const frameStyle = computed((): Record<string, string> => {
  const viewport = viewportWidth.value;
  if (!viewport) return {};

  const panelWidth = props.contentWidth || viewport;
  const width =
    displayMode.value === 'panel'
      ? panelWidth
      : Math.min(560, panelWidth, viewport - 32);
  const offset = props.contentWidth
    ? props.contentLeft + props.contentWidth / 2 - viewport / 2
    : 0;
  const transform =
    displayMode.value === 'panel'
      ? `translateX(${offset}px)`
      : `translateX(${offset}px) translateY(calc(-50vh + 50%))`;

  return {
    width: `${width}px`,
    maxWidth: `${width}px`,
    transform,
  };
});

function navigateToPage() {
  emit('update:modelValue', false);
  void router.push(activeTab.value === 'ambient' ? '/ambient' : '/jukebox');
}
</script>

<template>
  <QDialog
    seamless
    position="bottom"
    v-model="model"
    :style="{ zIndex }"
    :transition-hide="transitionHide"
    class="sound-control-dialog"
    @hide="handleHide"
  >
    <div
      class="sound-control-frame"
      :class="{ 'no-mode-transition': isRepositioning }"
      :style="frameStyle"
    >
      <QCard
        ref="cardRef"
        :data-mode="displayMode"
        :class="{
          'sound-control-card': true,
          'is-dialog': displayMode === 'dialog',
          'animated-gradient-surface': true,
          'has-gradient-bg': gradientVisible,
          'with-animated-bg': isAnimatedBg,
        }"
        :style="[cardStyle, controlStyle]"
        @pointerdown="bringToFront"
        @focusin="bringToFront"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <Transition
          name="jukebox-gradient-fade"
          @after-leave="onGradientAfterLeave"
        >
          <div
            v-if="hasGradientBg"
            :key="gradientKey"
            class="animated-gradient-layer"
            aria-hidden="true"
            :style="gradientStyle"
          />
        </Transition>
        <QToolbar
          class="justify-between drag-handle"
          @pointerdown="onPointerDown"
        >
          <div class="row items-center no-wrap">
            <QBtn
              flat
              clickable
              :title="t('jukebox.openJukebox')"
              :aria-label="t('jukebox.openJukebox')"
              @click="navigateToPage"
            >
              <QIcon name="tabler-external-link" />
            </QBtn>
          </div>
          <QTabs
            v-model="activeTab"
            dense
            align="center"
            class="sound-control-tabs"
            @pointerdown.stop
          >
            <QTab
              name="jukebox"
              :title="t('app.jukebox')"
              :aria-label="t('app.jukebox')"
            >
              <QIcon name="tabler-music" />
            </QTab>
            <QTab
              v-if="ambientEnabled"
              name="ambient"
              :title="t('navigation.ambientSound')"
              :aria-label="t('navigation.ambientSound')"
            >
              <QIcon name="tabler-headphones" />
            </QTab>
          </QTabs>
          <QBtn
            flat
            clickable
            :title="t('common.close')"
            :aria-label="t('common.close')"
            @click="model = false"
          >
            <QIcon name="tabler-x" />
          </QBtn>
        </QToolbar>
        <div class="sound-control-body">
          <JukeboxPlayer
            v-if="activeTab === 'jukebox'"
            :modal="true"
            :layout="displayMode === 'panel' ? 'panel' : 'bar'"
            :show-artwork="true"
          />
          <AmbientPlayerPanel v-else-if="AmbientPlayerPanel" />
        </div>
      </QCard>
    </div>
  </QDialog>
</template>

<style scoped>
:global(.sound-control-dialog .q-dialog__inner) {
  padding: 0 !important;
}

:global(.sound-control-dialog .q-dialog__inner > div) {
  overflow: visible !important;
}

.sound-control-frame {
  width: 100%;
  max-width: 100%;
  overflow: visible;
  transition: transform 0.3s ease;
}

.sound-control-frame.no-mode-transition {
  transition: none;
}

.sound-control-card {
  display: flex;
  flex-direction: column;
  max-height: min(82vh, 760px);
  overflow: hidden;
  background-color: var(--color-background-soft);
  color: var(--jp-control-color, var(--color-text));
}

.sound-control-body {
  position: relative;
  z-index: 1;
  min-height: 0;
  padding: 0 1rem 1rem;
  overflow-y: auto;
}

.sound-control-card.is-dialog {
  box-shadow: var(--shadow-lg);
}

.sound-control-tabs {
  color: inherit;
}

.sound-control-tabs :deep(.q-tab) {
  color: inherit;
  opacity: 0.6;
}

.sound-control-tabs :deep(.q-tab--active) {
  opacity: 1;
}

.sound-control-tabs :deep(.q-tab__indicator) {
  background: currentColor;
}

.drag-handle {
  cursor: grab;
}

@media (max-width: 600px) {
  .sound-control-card {
    max-height: 88vh;
  }
}
</style>

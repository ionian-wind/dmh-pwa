<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComponentPublicInstance,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { IconExternalLink, IconX } from '@tabler/icons-vue';
import { useRouter } from 'vue-router';
import JukeboxPlayer from '@/jukebox/components/JukeboxPlayer.vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useConfigStore } from '@/utils/configStore';
import {
  getGradientContrastColor,
  useAnimatedGradient,
} from '@/jukebox/useAnimatedGradient';
import { useDragSnap } from '@/composables/useDragSnap';

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
const router = useRouter();
const playerStore = useJukeboxPlayerStore();
const configStore = useConfigStore();

const palette = computed<string[] | undefined>(() => {
  const track = playerStore.currentTrack;
  if (track?.palette && track.palette.length > 0) return track.palette;
  if (track?.color) return [track.color, track.color, track.color];
  return undefined;
});

const hasGradientBg = computed(
  () => configStore.jukeboxAnimatePlayerBackground && !!palette.value?.length,
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
    return;
  }

  if (repositioning) return;
  repositioning = true;
  isRepositioning.value = true;

  const previousX = translateX.value;
  const previousY = translateY.value;

  displayMode.value = mode;
  await nextTick();

  if (element && previousRect) {
    const nextRect = element.getBoundingClientRect();
    setPosition(
      previousX + previousRect.left - nextRect.left,
      previousY + previousRect.top - nextRect.top,
    );
    rebaseDragOrigin();
  }

  await nextTick();

  if (mode === 'dialog' && hasLeftDockZone()) {
    canDock.value = true;
  }

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
      displayMode.value = 'panel';
      canDock.value = false;
      resetPosition();
    }
  },
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

function navigateToJukebox() {
  emit('update:modelValue', false);
  router.push('/jukebox');
}
</script>

<template>
  <QDialog
    seamless
    position="bottom"
    v-model="model"
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
              @click="navigateToJukebox"
            >
              <IconExternalLink />
            </QBtn>
          </div>
          <QBtn
            flat
            clickable
            :title="t('common.close')"
            :aria-label="t('common.close')"
            @click="model = false"
          >
            <IconX />
          </QBtn>
        </QToolbar>
        <div class="sound-control-body">
          <JukeboxPlayer
            :modal="true"
            :layout="displayMode === 'panel' ? 'panel' : 'bar'"
            :show-artwork="true"
          />
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

.drag-handle {
  cursor: grab;
}

@media (max-width: 600px) {
  .sound-control-card {
    max-height: 88vh;
  }
}
</style>

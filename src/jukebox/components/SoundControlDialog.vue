<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
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

const {
  cardStyle,
  transitionHide,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onHide,
} = useDragSnap();

const viewportWidth = ref(
  typeof window === 'undefined' ? 0 : window.innerWidth,
);

function updateViewportWidth() {
  viewportWidth.value = window.innerWidth;
}

onMounted(() => window.addEventListener('resize', updateViewportWidth));
onUnmounted(() => window.removeEventListener('resize', updateViewportWidth));

const frameStyle = computed((): Record<string, string> => {
  if (!props.contentWidth || !viewportWidth.value) return {};

  const offset =
    props.contentLeft + props.contentWidth / 2 - viewportWidth.value / 2;
  return {
    width: `${props.contentWidth}px`,
    maxWidth: `${props.contentWidth}px`,
    transform: `translateX(${offset}px)`,
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
    @hide="onHide"
  >
    <div class="sound-control-frame" :style="frameStyle">
      <QCard
        :class="{
          'sound-control-card': true,
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
          <JukeboxPlayer :modal="true" layout="panel" :show-artwork="true" />
        </div>
      </QCard>
    </div>
  </QDialog>
</template>

<style scoped>
:global(.sound-control-dialog .q-dialog__inner) {
  padding: 0 !important;
}

.sound-control-frame {
  width: 100%;
  max-width: 100%;
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

.drag-handle {
  cursor: grab;
}

@media (max-width: 600px) {
  .sound-control-card {
    max-height: 88vh;
  }
}
</style>

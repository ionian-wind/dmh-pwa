<script setup lang="ts">
import { computed } from 'vue';
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

const props = defineProps<{
  modelValue: boolean;
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

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
    @hide="onHide"
  >
    <QCard
      :class="{
        'jukebox-dialog-card': true,
        'animated-gradient-surface': true,
        'has-gradient-bg': hasGradientBg,
        'with-animated-bg': isAnimatedBg,
      }"
      :style="[cardStyle, gradientStyle, controlStyle]"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="animated-gradient-layer" aria-hidden="true" />
      <QToolbar
        class="justify-between drag-handle"
        @pointerdown="onPointerDown"
      >
        <QBtn flat clickable @click="navigateToJukebox">
          <IconExternalLink />
        </QBtn>
        <QBtn flat clickable @click="model = false">
          <IconX />
        </QBtn>
      </QToolbar>
      <JukeboxPlayer :modal="true" :show-artwork="true" />
    </QCard>
  </QDialog>
</template>

<style scoped>
.jukebox-dialog-card {
  color: var(--jp-control-color, var(--color-text));
}

.drag-handle {
  cursor: grab;
}
</style>

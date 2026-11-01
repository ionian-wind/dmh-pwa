<script setup lang="ts">
import { computed } from 'vue';
import { IconExternalLink, IconX } from '@tabler/icons-vue';
import { useRouter } from 'vue-router';
import JukeboxPlayer from '@/jukebox/components/JukeboxPlayer.vue';
import { useDragSnap } from '@/composables/useDragSnap';

const props = defineProps<{
  modelValue: boolean;
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const router = useRouter();

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
      :style="cardStyle"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
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
.drag-handle {
  cursor: grab;
}
</style>

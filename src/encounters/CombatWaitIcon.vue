<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  IconHourglass,
  IconHourglassHigh,
  IconHourglassLow,
} from '@tabler/icons-vue';

defineProps<{
  label?: string;
}>();

const ICON_DURATION = 500;
const ROTATE_DURATION = 600;

const icons = [IconHourglassHigh, IconHourglass, IconHourglassLow];
const index = ref(0);
const direction = ref(1);
const rotating = ref(false);
let iconTimer: ReturnType<typeof setTimeout> | null = null;
let rotateTimer: ReturnType<typeof setTimeout> | null = null;

const icon = computed(() => icons[index.value]);

function scheduleIcon() {
  iconTimer = setTimeout(tick, ICON_DURATION);
}

function tick() {
  const next = index.value + direction.value;
  if (next < 0 || next >= icons.length) {
    rotating.value = true;
    rotateTimer = setTimeout(() => {
      rotating.value = false;
      direction.value *= -1;
      index.value = 1;
      scheduleIcon();
    }, ROTATE_DURATION);
    return;
  }

  index.value = next;
  scheduleIcon();
}

onMounted(scheduleIcon);

onBeforeUnmount(() => {
  if (iconTimer) clearTimeout(iconTimer);
  if (rotateTimer) clearTimeout(rotateTimer);
});
</script>

<template>
  <span
    class="combat-wait-icon"
    :class="{ 'combat-wait-icon--rotating': rotating }"
    role="img"
    :aria-label="label"
    :title="label"
  >
    <component :is="icon" />
  </span>
</template>

<style scoped>
.combat-wait-icon {
  display: inline-flex;
}

.combat-wait-icon--rotating {
  animation: combat-wait-icon-rotate 0.6s ease-in-out;
}

@keyframes combat-wait-icon-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(180deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .combat-wait-icon--rotating {
    animation: none;
  }
}
</style>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
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
} from '@tabler/icons-vue';
import { useTimerStore } from '@/stores/timers';
import { timersOpen, toggleTimers } from './state';

const { t } = useI18n();
const timerStore = useTimerStore();

onMounted(() => {
  void timerStore.init();
});

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

const animationFrame = ref(0);
const timerIcon = ref(hours[0]);

const stop = watch(
  () => timerStore.now,
  () => {
    if (timerStore.running) {
      animationFrame.value = (animationFrame.value + 1) % hours.length;
      timerIcon.value = hours[animationFrame.value];
    }
  },
);

onBeforeUnmount(() => stop());
</script>

<template>
  <QItem
    clickable
    v-ripple
    :active="timersOpen"
    active-class="bg-secondary"
    :title="t('navigation.timers')"
    :aria-label="t('navigation.timers')"
    @click="toggleTimers"
  >
    <QItemSection side>
      <component :is="timerIcon" :key="animationFrame" />
    </QItemSection>
    <QItemSection>{{ t('navigation.timers') }}</QItemSection>
  </QItem>
</template>

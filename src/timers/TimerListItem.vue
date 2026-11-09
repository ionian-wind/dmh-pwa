<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Timer } from '@/types';
import { useTimerStore } from '@/stores/timers';
import { formatTime } from '@/utils/formatTime';

const timerStore = useTimerStore();
const props = defineProps<{ timer: Timer }>();
const emit = defineEmits(['edit', 'delete', 'start', 'stop', 'reset']);
const { t } = useI18n();

const time = (elapsed = 0) =>
  formatTime(Math.max(props.timer.duration - elapsed, 0) / 1000);

const remaining = ref<string>(time());

watch(
  () => timerStore.now,
  (now) => {
    if (props.timer.status === 'running') {
      remaining.value = time(now - props.timer.startedAt!);
    }
  },
  { immediate: true },
);

watch(
  () => props.timer.status,
  (status) => {
    if (['inactive', 'finished'].includes(status)) {
      remaining.value = time();
    }
  },
  { immediate: true },
);
</script>

<template>
  <QItem>
    <QItemSection avatar>
      <QBtn
        flat
        v-if="props.timer.status === 'inactive'"
        @click="$emit('start')"
        :title="t('timers.start')"
      >
        <QIcon name="tabler-player-play" />
      </QBtn>
      <QBtn
        flat
        v-if="props.timer.status === 'running'"
        @click="$emit('stop')"
        :title="t('timers.stop')"
      >
        <QIcon name="tabler-x" />
      </QBtn>
      <QBtn
        flat
        v-if="props.timer.status === 'finished'"
        @click="$emit('reset')"
        :title="t('timers.reset')"
      >
        <QIcon name="tabler-refresh" />
      </QBtn>
    </QItemSection>
    <QItemSection>
      <div class="participant-name">
        {{ props.timer.title || t('timers.noTitle') }}
      </div>
      <div class="participant-initiative">
        <span v-if="props.timer.status === 'running'">
          {{ t('timers.remaining') }}: <b>{{ remaining }}</b>
        </span>
        <span v-else>
          <b>{{ remaining }}</b>
        </span>
      </div>
    </QItemSection>
    <QItemSection side class="timer-item-actions">
      <QBtnGroup flat>
        <QBtn
          flat
          :color="'positive'"
          :title="t('timers.edit')"
          @click="$emit('edit')"
        >
          <QIcon name="tabler-pencil" />
        </QBtn>
        <QBtn
          flat
          :color="'negative'"
          :title="t('timers.delete')"
          @click="$emit('delete')"
        >
          <QIcon name="tabler-trash" />
        </QBtn>
      </QBtnGroup>
    </QItemSection>
  </QItem>
</template>

<style scoped>
.timer-item-actions {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.q-item:hover .timer-item-actions,
.timer-item-actions:focus-within {
  opacity: 1;
}

@media (hover: none) {
  .timer-item-actions {
    opacity: 1;
  }
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from '@/components/form/Button.vue';
import {
  IconPlayerPlay,
  IconX,
  IconRefresh,
  IconEdit,
  IconTrash,
} from '@tabler/icons-vue';
import type { Timer } from '@/types';
import { useTimerStore } from '@/stores/timers';

const timerStore = useTimerStore();
const props = defineProps<{ timer: Timer }>();
const emit = defineEmits(['edit', 'delete', 'start', 'stop', 'reset']);
const { t } = useI18n();

const statusLabel = computed(() => {
  switch (props.timer.status) {
    case 'running':
      return t('timers.status.running');
    case 'finished':
      return t('timers.status.finished');
    default:
      return t('timers.status.inactive');
  }
});

const remaining = ref<string | null>(null);

watch(
  () => timerStore.now,
  (now) => {
    if (props.timer.status === 'running') {
      const elapsed = now - props.timer.startedAt!;
      const left = Math.max(props.timer.duration - elapsed, 0);
      const min = Math.floor(left / 60000);
      const sec = Math.floor((left % 60000) / 1000);

      remaining.value = `${min}:${sec.toString().padStart(2, '0')}`;
    }
  },
  { immediate: true },
);
</script>

<template>
  <QItem>
    <QItemSection>
      <QBtn
        flat
        v-if="props.timer.status === 'inactive'"
        @click="$emit('start')"
        :title="t('timers.start')"
      >
        <IconPlayerPlay />
      </QBtn>
      <QBtn
        flat
        v-if="props.timer.status === 'running'"
        @click="$emit('stop')"
        :title="t('timers.stop')"
      >
        <IconX />
      </QBtn>
      <QBtn
        flat
        v-if="props.timer.status === 'finished'"
        @click="$emit('reset')"
        :title="t('timers.reset')"
      >
        <IconRefresh />
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
        <span v-else-if="props.timer.status === 'finished'">
          {{ t('timers.finished') }}
        </span>
        <span v-else>
          {{ t('timers.duration') }}:
          <b
            >{{ Math.floor(props.timer.duration / 60000) }}:{{
              ((props.timer.duration % 60000) / 1000)
                .toString()
                .padStart(2, '0')
            }}</b
          >
        </span>
      </div>
    </QItemSection>
    <QItemSection>
      <span :class="'timer-status ' + props.timer.status">{{
        statusLabel
      }}</span>
    </QItemSection>
    <QItemSection>
      <QBtn
        flat
        :color="'positive'"
        :title="t('timers.edit')"
        @click="$emit('edit')"
      >
        <IconEdit />
      </QBtn>
      <QBtn
        flat
        :color="'negative'"
        :title="t('timers.delete')"
        @click="$emit('delete')"
      >
        <IconTrash />
      </QBtn>
    </QItemSection>
  </QItem>
</template>

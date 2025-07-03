<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from '@/components/common/Button.vue';
import { IconPlayerPlay, IconX, IconRefresh, IconEdit, IconTrash } from '@tabler/icons-vue';
import type { Timer } from '@/types';
import { useTimerStore } from '@/stores/timers';

const timerStore = useTimerStore();
const props = defineProps<{ timer: Timer }>();
const emit = defineEmits(['edit', 'delete', 'start', 'stop', 'reset']);
const { t } = useI18n();

const statusLabel = computed(() => {
  switch (props.timer.status) {
    case 'running': return t('timers.status.running');
    case 'finished': return t('timers.status.finished');
    default: return t('timers.status.inactive');
  }
});

const remaining = ref<string|null>(null);

watch(() => timerStore.now, (now) => {
  if (props.timer.status === 'running') {
    const elapsed = now - props.timer.startedAt!;
    const left = Math.max(props.timer.duration - elapsed, 0);
    const min = Math.floor(left / 60000);
    const sec = Math.floor((left % 60000) / 1000);

    remaining.value = `${min}:${sec.toString().padStart(2, '0')}`;
  }
}, { immediate: true });
</script>

<template>
  <div class="participant-row timer-row" :class="props.timer.status">
    <div class="participant-artwork timer-actions">
      <Button variant="light" v-if="props.timer.status === 'inactive'" @click="$emit('start')" :title="t('timers.start')"><IconPlayerPlay /></Button>
      <Button variant="light" v-if="props.timer.status === 'running'" @click="$emit('stop')" :title="t('timers.stop')"><IconX /></Button>
      <Button variant="light" v-if="props.timer.status === 'finished'" @click="$emit('reset')" :title="t('timers.reset')"><IconRefresh /></Button>
    </div>
    <div class="participant-info">
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
          {{ t('timers.duration') }}: <b>{{ Math.floor(props.timer.duration / 60000) }}:{{ ((props.timer.duration % 60000) / 1000).toString().padStart(2, '0') }}</b>
        </span>
      </div>
    </div>
    <div class="participant-status">
      <span :class="'timer-status ' + props.timer.status">{{ statusLabel }}</span>
    </div>
    <div class="participant-actions">
      <Button size="small" @click="$emit('edit')" :title="t('timers.edit')"><IconEdit /></Button>
      <Button size="small" @click="$emit('delete')" variant="danger" :title="t('timers.delete')"><IconTrash /></Button>
    </div>
  </div>
</template>

<style scoped>
.timer-row {
  /* Timer-specific tweaks if needed */
}

/* Reuse participant-row and related styles from CombatView */
.participant-row {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  position: relative;
  overflow: hidden;
}
.participant-artwork {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  background-size: cover;
  background-position: center;
  margin-right: 1rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-lighter);
  font-size: 24px;
  background-color: var(--color-background-mute);
}
.participant-info {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2em;
}
.participant-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.participant-initiative {
  font-size: 0.95em;
  color: var(--color-text-light);
}
.participant-status {
  margin-left: 1rem;
  flex-basis: auto;
  min-width: 120px;
  text-align: center;
}
.participant-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  margin-left: 1rem;
}
.timer-status.running { color: var(--color-info); }
.timer-status.finished { color: var(--color-success); }
.timer-status.inactive { color: var(--color-text-light); }
</style> 

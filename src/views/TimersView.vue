<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseListView from '@/components/common/BaseListView.vue';
import TimerEditor from '@/components/TimerEditor.vue';
import TimerListItem from '@/components/TimerListItem.vue';
import { useTimerStore } from '@/stores/timers';
import type { Timer } from '@/types';

const { t } = useI18n();
const timerStore = useTimerStore();

onMounted(async () => {
  await timerStore.load();
});

function cardProps(timer: Timer) {
  return {
    timer,
    onEdit: () => handleEdit(timer),
    onDelete: () => handleDelete(timer),
    onStart: () => handleStart(timer),
    onStop: () => handleStop(timer),
    onReset: () => handleReset(timer)
  };
}

function editorProps(timer: Timer | null) {
  return {
    timer,
    isOpen: true
  };
}

function handleEdit(timer: Timer) {
  // handled by BaseListView
}

function handleDelete(timer: Timer) {
  if (timer.id && confirm(`Are you sure you want to delete timer?`)) {
    timerStore.remove(timer.id);
  }
}

function handleSubmit(timer: Timer) {
  if (timer.id) {
    timerStore.update(timer.id, timer);
  } else {
    timerStore.create({ ...timer, status: 'inactive', startedAt: null });
  }
}

function handleStart(timer: Timer) {
  timerStore.start(timer.id);
}
function handleStop(timer: Timer) {
  timerStore.stop(timer.id);
}
function handleReset(timer: Timer) {
  timerStore.reset(timer.id);
}

</script>

<template>
  <BaseListView
    :items="timerStore.timers"
    :card-component="TimerListItem"
    :editor-component="TimerEditor"
    :empty-message="t('timers.empty')"
    :create-title="t('timers.create')"
    :card-props="cardProps"
    :editor-props="editorProps"
    :show-search="false"
    view-style="simple-list"
    @delete="handleDelete"
    @submit="handleSubmit"
    @start="handleStart"
    @stop="handleStop"
    @reset="handleReset"
  />
</template>

<style scoped>
.timer-list-item {
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 1em;
  margin-bottom: 1em;
  background: var(--color-background, #fff);
}
.timer-title {
  font-weight: bold;
  font-size: 1.1em;
}
.timer-description {
  color: var(--color-text-light);
  margin-bottom: 0.5em;
}
.timer-details {
  font-size: 1.1em;
  margin-bottom: 0.5em;
}
.timer-actions button {
  margin-right: 0.5em;
}
.form-section {
  margin-bottom: 1em;
}
</style> 
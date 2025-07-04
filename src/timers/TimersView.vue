<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseListView from '@/components/common/BaseListView.vue';
import TimerEditor from '@/timers/TimerEditor.vue';
import TimerListItem from '@/timers/TimerListItem.vue';
import { useTimerStore } from '@/stores/timers';
import type { Timer } from '@/types';
import { confirm } from '@/dialogs';

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
    onReset: () => handleReset(timer),
  };
}

function editorProps(timer: Timer | null) {
  return {
    timer,
    isOpen: true,
  };
}

function handleEdit(timer: Timer) {
  // handled by BaseListView
}

async function handleDelete(timer: Timer) {
  if (timer.id && await confirm(`Are you sure you want to delete timer?`)) {
    await timerStore.remove(timer.id);
    return true;
  }
  return false;
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

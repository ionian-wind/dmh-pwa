<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconPlus, IconX } from '@tabler/icons-vue';
import DraggablePanel from '@/components/common/DraggablePanel.vue';
import TimerEditor from '@/timers/TimerEditor.vue';
import TimerListItem from '@/timers/TimerListItem.vue';
import { useTimerStore } from '@/stores/timers';
import type { Timer } from '@/types';
import { confirm } from '@/dialogs';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();

const { t } = useI18n();
const timerStore = useTimerStore();
const editorOpen = ref(false);
const timerToEdit = ref<Timer | null>(null);

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

function openCreate(): void {
  timerToEdit.value = null;
  editorOpen.value = true;
}

function openEdit(timer: Timer): void {
  timerToEdit.value = timer;
  editorOpen.value = true;
}

function closeEditor(): void {
  editorOpen.value = false;
  timerToEdit.value = null;
}

async function handleSubmit(timer: Timer): Promise<void> {
  if (timer.id) {
    await timerStore.update(timer.id, timer);
  } else {
    await timerStore.create({ ...timer, status: 'inactive', startedAt: null });
  }
  closeEditor();
}

async function removeTimer(timer: Timer): Promise<void> {
  if (
    !(await confirm(
      t('common.confirmDelete', {
        title: timer.title || t('timers.noTitle'),
      }),
    ))
  ) {
    return;
  }
  await timerStore.remove(timer.id);
  if (timerToEdit.value?.id === timer.id) closeEditor();
}

async function handleDelete(id: string): Promise<void> {
  const timer = timerStore.getById(id);
  if (!timer) return;
  await removeTimer(timer);
  closeEditor();
}

onMounted(async () => {
  await timerStore.init();
});
</script>

<template>
  <DraggablePanel v-model="open" min-width="420px">
    <template #header>
      <div class="timers-header">
        <span>{{ t('navigation.timers') }}</span>
        <QBtn
          flat
          dense
          round
          :aria-label="t('common.close')"
          @pointerdown.stop
          @click.stop="open = false"
        >
          <IconX :size="16" />
        </QBtn>
      </div>
    </template>

    <div class="timers-panel">
      <div v-if="timerStore.timers.length === 0" class="timers-empty">
        {{ t('timers.empty') }}
      </div>
      <QList v-else separator class="timers-list">
        <TimerListItem
          v-for="timer in timerStore.timers"
          :key="timer.id"
          :timer="timer"
          @edit="openEdit(timer)"
          @delete="removeTimer(timer)"
          @start="timerStore.start(timer.id)"
          @stop="timerStore.stop(timer.id)"
          @reset="timerStore.reset(timer.id)"
        />
      </QList>

      <QSeparator />
      <QItem clickable v-ripple class="timers-create" @click="openCreate">
        <QItemSection>{{ t('timers.create') }}</QItemSection>
        <QItemSection side>
          <IconPlus :size="18" />
        </QItemSection>
      </QItem>
    </div>

    <TimerEditor
      :timer="timerToEdit"
      :is-open="editorOpen"
      @submit="handleSubmit"
      @delete="handleDelete"
      @cancel="closeEditor"
    />
  </DraggablePanel>
</template>

<style scoped>
.timers-panel {
  width: 420px;
  max-width: 100%;
  padding: 8px;
}

.timers-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding-bottom: 6px;
  font-weight: 600;
}

.timers-empty {
  padding: 12px 8px;
  color: var(--color-text-lighter);
  text-align: center;
}

.timers-list {
  max-height: min(60vh, 480px);
  overflow: auto;
}

.timers-create {
  justify-content: space-between;
}
</style>

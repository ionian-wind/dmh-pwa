<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconPencil, IconPlus, IconX } from '@tabler/icons-vue';
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
const formExpanded = ref(false);
const timerToEdit = ref<Timer | null>(null);

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const formLabel = computed(() =>
  timerToEdit.value ? t('timers.edit') : t('timers.create'),
);

const formIcon = computed(() => (timerToEdit.value ? IconPencil : IconPlus));

function openEdit(timer: Timer): void {
  timerToEdit.value = timer;
  formExpanded.value = true;
}

function closeForm(): void {
  formExpanded.value = false;
  timerToEdit.value = null;
}

watch(formExpanded, (expanded) => {
  if (!expanded) timerToEdit.value = null;
});

async function handleSubmit(timer: Timer): Promise<void> {
  if (timer.id) {
    await timerStore.update(timer.id, timer);
  } else {
    await timerStore.create({ ...timer, status: 'inactive', startedAt: null });
  }
  closeForm();
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
  if (timerToEdit.value?.id === timer.id) closeForm();
}

async function handleDelete(id: string): Promise<void> {
  const timer = timerStore.getById(id);
  if (!timer) return;
  await removeTimer(timer);
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
      <QExpansionItem v-model="formExpanded" class="timers-form-expansion">
        <template #header>
          <QItemSection>{{ formLabel }}</QItemSection>
          <QItemSection side>
            <component :is="formIcon" :size="18" />
          </QItemSection>
        </template>
        <div class="timers-form-body">
          <TimerEditor
            :timer="timerToEdit"
            @submit="handleSubmit"
            @cancel="closeForm"
            @delete="handleDelete"
          />
        </div>
      </QExpansionItem>
    </div>
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

.timers-form-body {
  padding: 8px;
}
</style>

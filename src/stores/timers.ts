import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { Timer } from '@/types';
import { useStore } from '@/utils/storage';
import timerSchema from '@/schemas/timer.schema.json';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue3-toastify';

function now() {
  return Date.now();
}

function showToast(id: string, message: string) {
  toast.info(
    message,
    { toastId: id, position: toast.POSITION.TOP_CENTER, autoClose: false }
  );
}

export const useTimerStore = defineStore('timers', () => {
  const { t } = useI18n();
  const base = useStore<Timer>({ storeName: 'timers', validationSchema: timerSchema });
  const nowRef = ref<number>(now());

  // Timer-specific actions
  async function start(id: string) {
    const timer = base.getById(id);
    if (timer && timer.status !== 'running') {
      await base.update(id, { startedAt: now(), status: 'running' });
    }
  }

  async function stop(id: string) {
    const timer = base.getById(id);
    if (timer && timer.status === 'running') {
      await base.update(id, { startedAt: null, status: 'inactive' });
    }
  }

  async function checkFinishedTimers() {
    nowRef.value = now();

    const promises = [];
    for (const timer of base.items.value) {
      if (timer.status === 'running' && timer.startedAt) {
        const elapsed = now() - timer.startedAt;
        if (elapsed >= timer.duration) {
          promises.push(base.update(timer.id, { status: 'finished' }));

          showToast(
            timer.id,
            t('timers.finished') + ': ' + (timer.title || t('timers.noTitle')),
          );
        }
      }
    }

    await Promise.all(promises);
    setTimeout(checkFinishedTimers, 1000);
  }

  const timers = computed(() => {
    return base.items.value;
  });

  const init = async () => {
    await base.load();
    checkFinishedTimers();
  };

  return {
    ...base,
    init,
    timers,
    start,
    stop,
    reset: (id: string) => start(id),
    now: computed(() => nowRef.value)
  };
});

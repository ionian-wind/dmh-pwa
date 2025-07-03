import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Timer } from '@/types';
import { useStore } from '@/utils/storage';
import timerSchema from '@/schemas/timer.schema.json';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue3-toastify';
import {debug, debugError} from "@/utils/debug";

function now() {
  return Date.now();
}

let counter = false;

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
  const running = ref(false);
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

    running.value = false;

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
        } else {
          running.value = true;
        }
      }
    }

    await Promise.all(promises)
      .catch((error) => debugError(error))
      .then(() => setTimeout(checkFinishedTimers, 1000));
  }

  const timers = computed(() => {
    return base.items.value;
  });

  const init = async () => {
    await base.load();
    if (!counter) {
      counter = true;

      await checkFinishedTimers();
    }
  };

  return {
    ...base,
    init,
    timers,
    start,
    stop,
    reset: (id: string) => start(id),
    now: computed(() => nowRef.value),
    running: computed(() => running.value)
  };
});

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import NumberSpinner from '@/components/common/NumberSpinner.vue';
import type { Timer } from '@/types';

const props = defineProps<{
  timer: Timer | null;
  isOpen: boolean;
}>();
const emit = defineEmits(['submit', 'cancel', 'delete']);
const { t } = useI18n();

const editedTimer = ref({
  title: '',
  description: '',
  duration: 60000,
});

const hours = ref(0);
const minutes = ref(1);
const seconds = ref(0);

function msToHms(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  return {
    hours: Math.floor(totalSec / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

function hmsToMs(h: number, m: number, s: number) {
  return (h * 3600 + m * 60 + s) * 1000;
}

watch([hours, minutes, seconds], () => {
  editedTimer.value.duration = hmsToMs(
    hours.value,
    minutes.value,
    seconds.value,
  );
});

watch(
  () => props.timer,
  (newTimer) => {
    if (newTimer) {
      const hms = msToHms(newTimer.duration);
      hours.value = hms.hours;
      minutes.value = hms.minutes;
      seconds.value = hms.seconds;
      editedTimer.value = {
        title: newTimer.title || '',
        description: newTimer.description || '',
        duration: newTimer.duration,
      };
    } else {
      hours.value = 0;
      minutes.value = 1;
      seconds.value = 0;
      editedTimer.value = { title: '', description: '', duration: 60000 };
    }
  },
  { immediate: true },
);

function handleSubmit() {
  emit('submit', {
    ...editedTimer.value,
    id: props.timer?.id ?? '',
  });
}
function handleCancel() {
  emit('cancel');
}

function handleDelete() {
  if (props.timer) emit('delete', props.timer.id);
}
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="props.timer ? t('timers.edit') : t('timers.create')"
    :showSubmit="true"
    :showCancel="true"
    :showDelete="!!timer"
    @submit="handleSubmit"
    @delete="handleDelete"
    @cancel="handleCancel"
    modalId="timer-editor-modal"
  >
    <div class="q-gutter-y-md">
      <QInput
        v-model="editedTimer.title"
        :label="t('timers.fields.title')"
        :placeholder="t('timers.fields.titlePlaceholder')"
        type="text"
        outlined
      />
      <QInput
        v-model="editedTimer.description"
        :label="t('timers.fields.description')"
        :placeholder="t('timers.fields.descriptionPlaceholder')"
        type="textarea"
        autogrow
        outlined
      />
    </div>

    <div class="q-mt-lg">
      <div
        class="text-center q-mb-sm text-primary text-weight-medium duration-label"
      >
        {{ t('timers.fields.duration') }}
      </div>
      <div class="row items-center justify-center no-wrap">
        <div class="column items-center">
          <NumberSpinner v-model="hours" :min="0" :max="99" />
          <span class="text-primary unit-label">{{ t('timers.hours') }}</span>
        </div>
        <span class="text-primary colon">:</span>
        <div class="column items-center">
          <NumberSpinner v-model="minutes" :min="0" :max="59" />
          <span class="text-primary unit-label">{{ t('timers.minutes') }}</span>
        </div>
        <span class="text-primary colon">:</span>
        <div class="column items-center">
          <NumberSpinner v-model="seconds" :min="0" :max="59" />
          <span class="text-primary unit-label">{{ t('timers.seconds') }}</span>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.duration-label {
  font-size: 0.875rem;
  opacity: 0.7;
}

.unit-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  opacity: 0.7;
  letter-spacing: 0.05em;
}

.colon {
  font-size: 2rem;
  font-weight: 300;
  margin-bottom: 48px;
  line-height: 1;
}
</style>

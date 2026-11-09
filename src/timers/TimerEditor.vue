<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import NumberSpinner from '@/components/common/NumberSpinner.vue';
import type { Timer } from '@/types';

const props = defineProps<{
  timer: Timer | null;
}>();
const emit = defineEmits(['submit', 'cancel', 'delete']);
const { t } = useI18n();

const editedTimer = ref({
  title: '',
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

function resetForm() {
  if (props.timer) {
    const hms = msToHms(props.timer.duration);
    hours.value = hms.hours;
    minutes.value = hms.minutes;
    seconds.value = hms.seconds;
    editedTimer.value = {
      title: props.timer.title || '',
      duration: props.timer.duration,
    };
    return;
  }
  hours.value = 0;
  minutes.value = 1;
  seconds.value = 0;
  editedTimer.value = { title: '', duration: 60000 };
}

watch([hours, minutes, seconds], () => {
  editedTimer.value.duration = hmsToMs(
    hours.value,
    minutes.value,
    seconds.value,
  );
});

watch(() => props.timer, resetForm, { immediate: true });

function handleSubmit() {
  emit('submit', {
    ...editedTimer.value,
    id: props.timer?.id ?? '',
  });
  resetForm();
}

function handleCancel() {
  resetForm();
  emit('cancel');
}

function handleDelete() {
  if (props.timer) emit('delete', props.timer.id);
}
</script>

<template>
  <div class="timer-form q-gutter-y-md">
    <QInput
      v-model="editedTimer.title"
      :label="t('timers.fields.title')"
      :placeholder="t('timers.fields.titlePlaceholder')"
      type="text"
      outlined
      dense
    />

    <div>
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

    <div class="row justify-end q-gutter-sm timer-form-actions">
      <QBtn
        v-if="timer"
        flat
        color="negative"
        :label="t('common.delete')"
        @click="handleDelete"
      />
      <QBtn flat :label="t('common.cancel')" @click="handleCancel" />
      <QBtn color="primary" :label="t('common.save')" @click="handleSubmit" />
    </div>
  </div>
</template>

<style scoped>
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

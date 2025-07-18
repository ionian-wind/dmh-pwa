<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import type { Timer } from '@/types';

const props = defineProps<{
  timer: Timer | null;
  isOpen: boolean;
}>();
const emit = defineEmits(['submit', 'cancel']);
const { t } = useI18n();

const form = ref({
  title: '',
  description: '',
  duration: 60000,
});

watch(() => props.timer, (newTimer) => {
  if (newTimer) {
    form.value = {
      title: newTimer.title || '',
      description: newTimer.description || '',
      duration: newTimer.duration,
    };
  } else {
    form.value = { title: '', description: '', duration: 60000 };
  }
}, { immediate: true });

function handleSubmit() {
  emit('submit', { ...form.value });
}
function handleCancel() {
  emit('cancel');
}
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="props.timer ? t('timers.edit') : t('timers.create')"
    :showSubmit="true"
    :showCancel="true"
    @submit="handleSubmit"
    @cancel="handleCancel"
    modalId="timer-editor-modal"
  >
    <div class="form-section">
      <label>{{ t('timers.title') }}</label>
      <input v-model="form.title" type="text" :placeholder="t('timers.titlePlaceholder')" />
    </div>
    <div class="form-section">
      <label>{{ t('timers.description') }}</label>
      <input v-model="form.description" type="text" :placeholder="t('timers.descriptionPlaceholder')" />
    </div>
    <div class="form-section">
      <label>{{ t('timers.duration') }} (ms)</label>
      <input v-model.number="form.duration" type="number" min="1000" step="1000" />
    </div>
  </BaseModal>
</template>

<style scoped>
.form-section {
  margin-bottom: 1em;
}
</style> 
<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import type { Timer } from '@/types';
import {formatTime} from "@/jukebox/utils";
import {
  IconClock
} from '@tabler/icons-vue';

const props = defineProps<{
  timer: Timer | null;
  isOpen: boolean;
}>();
const emit = defineEmits(['submit', 'cancel']);
const { t } = useI18n();

const editedTimer = ref({
  title: '',
  description: '',
  duration: 60000,
});

const time = computed(() => formatTime(editedTimer.duration / 1000), () => {})

watch(
  () => props.timer,
  (newTimer) => {
    if (newTimer) {
      editedTimer.value = {
        title: newTimer.title || '',
        description: newTimer.description || '',
        duration: newTimer.duration,
      };
    } else {
      editedTimer.value = { title: '', description: '', duration: 60000 };
    }
  },
  { immediate: true },
);

function handleSubmit() {
  emit('submit', { ...editedTimer.value });
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
      <div class="form-grid">
        <div class="form-group">
          <QInput
            v-model="editedTimer.title"
            :label="t('timers.fields.title')"
            :placeholder="t('timers.fields.titlePlaceholder')"
            type="text"
            outlined
          />
        </div>
        <div class="form-group">
          <QInput
            v-model="editedTimer.description"
            :label="t('timers.fields.description')"
            :placeholder="t('timers.fields.descriptionPlaceholder')"
            type="textarea"
            autogrow
            outlined
          />
        </div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <QInput
            v-model="time"
            mask="fulltime"
            :rules="['fulltime']"
            :label="t('timers.fields.duration')"
            outlined
          >
            <template v-slot:append>
              <IconClock>
                <QPopupProxy cover transition-show="scale" transition-hide="scale">
                  <QTime v-model="time">
                    <div class="row items-center justify-end">
                      <QBtn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </QTime>
                </QPopupProxy>
              </IconClock>
            </template>
          </QInput>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const { t } = useI18n();

function close() {
  emit('update:modelValue', false);
}
</script>

<template>
  <BaseModal
    :is-open="modelValue"
    modal-id="settings-modal"
    :title="t('settings.title')"
    :show-cancel="true"
    :cancel-label="t('common.close')"
    :show-submit="false"
    @cancel="close"
    @update:is-open="emit('update:modelValue', $event)"
  >
    <section class="settings-section" data-test="settings-language">
      <div>
        <h5>{{ t('settings.language') }}</h5>
        <p class="text-caption text-grey-7 q-mb-sm">
          {{ t('settings.languageHint') }}
        </p>
      </div>
      <LanguageSwitcher />
    </section>
  </BaseModal>
</template>

<style scoped>
.settings-section {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.settings-section h5 {
  margin: 0 0 0.25rem;
}

@media (max-width: 600px) {
  .settings-section {
    flex-direction: column;
    align-items: stretch;
  }

  .settings-section :deep(.language-select) {
    width: 100%;
  }
}
</style>

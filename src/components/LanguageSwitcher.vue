<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConfigStore } from '@/utils/configStore';
import { storeToRefs } from 'pinia';

const { locale, t } = useI18n();
const configStore = useConfigStore();
const { savedLanguage } = storeToRefs(configStore);

const currentLocale = computed({
  get: () => (String(locale.value).startsWith('ru') ? 'ru' : 'en'),
  set: (value: 'en' | 'ru') => {
    locale.value = value;
    savedLanguage.value = value;
  },
});
</script>

<template>
  <div class="language-switcher">
    <QSelect
      v-model="currentLocale"
      :options="[
        { label: t('language.english'), value: 'en' },
        { label: t('language.russian'), value: 'ru' },
      ]"
      emit-value
      map-options
      dense
      outlined
      options-dense
      hide-bottom-space
      class="language-select"
      aria-label="Select language"
    />
  </div>
</template>

<style scoped>
.language-switcher {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.language-select {
  width: 170px;
}

.language-switcher :deep(.q-field__control) {
  min-height: 36px;
  border-radius: 8px;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConfigStore } from '@/utils/configStore';
import { storeToRefs } from 'pinia';

const { locale, t } = useI18n();
const configStore = useConfigStore();
const { savedLanguage } = storeToRefs(configStore);

const currentLocale = computed(() => locale.value);

const changeLanguage = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  locale.value = target.value;
  savedLanguage.value = target.value;
};
</script>

<template>
  <div class="language-switcher">
    <select 
      :value="currentLocale" 
      @change="changeLanguage"
      class="language-select"
      aria-label="Select language"
    >
      <option value="en">{{ t('language.english') }}</option>
      <option value="es">{{ t('language.spanish') }}</option>
    </select>
  </div>
</template>

<style scoped>
.language-switcher {
  display: flex;
  align-items: center;
}

.language-select {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  background-color: var(--bg-color);
  color: var(--text-color);
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.language-select:hover {
  border-color: var(--primary-color);
}

.language-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--primary-color-alpha);
}

.language-select option {
  background-color: var(--bg-color);
  color: var(--text-color);
}
</style> 
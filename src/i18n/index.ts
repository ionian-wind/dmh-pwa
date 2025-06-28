import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import es from './locales/es.json';
import ru from './locales/ru.json';

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: 'ru', // Default locale
  fallbackLocale: 'ru', // Fallback locale
  messages: {
    en,
    es,
    ru
  }
});

export default i18n; 
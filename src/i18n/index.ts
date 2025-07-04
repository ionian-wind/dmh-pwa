import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import ru from './locales/ru.json';
import { debug } from '@/utils/debug';

debug('Loaded en locale:', en);
debug('Loaded ru locale:', ru);

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: 'ru', // Default locale
  fallbackLocale: 'en', // Fallback locale
  messages: {
    en,
    ru,
  },
});

export default i18n;

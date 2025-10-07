import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { PiniaSharedState } from 'pinia-shared-state';
import { watch } from 'vue';

import App from './App.vue';
import router from './router';
import i18n from './i18n';
import { setupAnchorScrollHandler } from './utils/anchorScroll';
import { useConfigStore } from './utils/configStore';
import { initializeDatabase } from './utils/storage';
import VueDnDKitPlugin, { type IPluginOptions } from '@vue-dnd-kit/core';
import { debug, debugWarn, debugError } from './utils/debug';

import { Quasar, Dialog, Notify } from 'quasar';
import quasarLangRu from 'quasar/lang/ru';
import quasarIconSet from 'quasar/icon-set/svg-fontawesome-v6';

import 'vue3-openlayers/vue3-openlayers.css';

import Vue3OpenLayers from 'vue3-openlayers';

// Import Quasar css
import 'quasar/src/css/index.sass';

import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

// Import global styles
import './assets/styles/global.css';

// Initialize database and run migrations
initializeDatabase().catch((error) => {
  debugError('Failed to initialize database:', error);
});

// Create app instance
const app = createApp(App);

// Create and use Pinia store
const pinia = createPinia();
pinia.use(
  PiniaSharedState({
    enable: true,
    initialize: true, // Sync initial state between tabs
  }),
);
app.use(pinia);

// Use router
app.use(router);

// Load saved language preference from config store
const configStore = useConfigStore();
debug('Loaded configStore.savedLanguage:', configStore.savedLanguage);
debug('Initial i18n.global.locale.value:', i18n.global.locale.value);

// Use i18n
app.use(i18n);

// Sync i18n locale with configStore.savedLanguage
watch(
  () => configStore.savedLanguage,
  (newLang) => {
    debug('Language changed:', newLang);
    i18n.global.locale.value = newLang as any;
    debug('i18n.global.locale.value after change:', i18n.global.locale.value);
  },
  { immediate: true },
);

// Setup anchor scroll handler
setupAnchorScrollHandler();

app.use(VueDnDKitPlugin, {
  defaultOverlay: {
    styles: {
      transition: 'none',
    },
  },
} as IPluginOptions);

app.use(Quasar, {
  plugins: { Notify, Dialog }, // import Quasar plugins and add here
  lang: quasarLangRu,
  iconSet: quasarIconSet,
});

app.use(Vue3OpenLayers);

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  debugError('Global error:', err);
  debugError('Component:', instance);
  debugError('Info:', info);
};

// Global warning handler
app.config.warnHandler = (msg, instance, trace) => {
  debugWarn('Global warning:', msg);
  debugWarn('Component:', instance);
  debugWarn('Trace:', trace);
};

// Mount app
app.mount('#q-app');

window.addEventListener('error', (event) => {
  console.error('Global error handler:', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Global unhandledrejection:', event.reason);
});

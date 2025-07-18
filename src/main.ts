import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaSharedState } from 'pinia-shared-state'
import { watch } from 'vue'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { setupAnchorScrollHandler } from './utils/anchorScroll'
import { useConfigStore } from './utils/configStore'
import { initializeDatabase } from './utils/storage'
import VueVirtualScroller from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import VueDnDKitPlugin, { type IPluginOptions } from '@vue-dnd-kit/core';
import { debug, debugWarn, debugError } from './utils/debug';
import Toast from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';

// Import global styles
import './assets/styles/global.css'

// Initialize database and run migrations
initializeDatabase().catch(error => {
  debugError('Failed to initialize database:', error);
});

// Create app instance
const app = createApp(App)

// Create and use Pinia store
const pinia = createPinia()
pinia.use(PiniaSharedState({
  enable: true,
  initialize: true, // Sync initial state between tabs
}))
app.use(pinia)

// Use router
app.use(router)

// Load saved language preference from config store
const configStore = useConfigStore();
debug('Loaded configStore.savedLanguage:', configStore.savedLanguage);
debug('Initial i18n.global.locale.value:', i18n.global.locale.value);

// Use i18n
app.use(i18n)

// Sync i18n locale with configStore.savedLanguage
watch(
  () => configStore.savedLanguage,
  (newLang) => {
    debug('Language changed:', newLang);
    i18n.global.locale.value = newLang as any;
    debug('i18n.global.locale.value after change:', i18n.global.locale.value);
  },
  { immediate: true }
);

app.use(VueVirtualScroller);

// Setup anchor scroll handler
setupAnchorScrollHandler()

app.use(VueDnDKitPlugin, {
  defaultOverlay: {
    styles: {
      transition: 'none',
    },
  },
} as IPluginOptions);

app.use(Toast);

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  debugError('Global error:', err)
  debugError('Component:', instance)
  debugError('Info:', info)
}

// Global warning handler
app.config.warnHandler = (msg, instance, trace) => {
  debugWarn('Global warning:', msg)
  debugWarn('Component:', instance)
  debugWarn('Trace:', trace)
}

// Mount app
app.mount('#app')

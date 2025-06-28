import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaSharedState } from 'pinia-shared-state'

import 'siimple-icons/siimple-icons.css'
import 'rpg-awesome/css/rpg-awesome.css'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { setupAnchorScrollHandler } from './utils/anchorScroll'
import { useConfigStore } from './utils/configStore'
import { initializeDatabase } from './utils/storage'
import VueVirtualScroller from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

// Import global styles
import './assets/styles/global.css'

// Initialize database and run migrations
initializeDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
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
const configStore = useConfigStore()
if (configStore.savedLanguage && (configStore.savedLanguage.value === 'en' || configStore.savedLanguage.value === 'es')) {
  i18n.global.locale.value = configStore.savedLanguage.value
}

// Use i18n
app.use(i18n)

app.use(VueVirtualScroller);

// Setup anchor scroll handler
setupAnchorScrollHandler()

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err)
  console.error('Component:', instance)
  console.error('Info:', info)
}

// Global warning handler
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Global warning:', msg)
  console.warn('Component:', instance)
  console.warn('Trace:', trace)
}

// Mount app
app.mount('#app')

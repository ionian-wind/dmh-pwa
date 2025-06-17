import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'

// Import global styles
import './assets/styles/global.css'

// Load saved language preference
const savedLanguage = localStorage.getItem('dnd-language')
if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'es')) {
  i18n.global.locale.value = savedLanguage
}

// Create app instance
const app = createApp(App)

// Create and use Pinia store
const pinia = createPinia()
app.use(pinia)

// Use router
app.use(router)

// Use i18n
app.use(i18n)

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

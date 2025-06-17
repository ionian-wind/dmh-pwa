<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="app">
    <AppHeader />
    <main class="main-content">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
    <footer class="app-footer">
      <div class="footer-content">
        <p>© 2024 D&D Notes Manager</p>
        <p class="version">Version 1.0.0</p>
      </div>
    </footer>
  </div>
</template>

<style>
:root {
  --primary-color: #1e1e2e;
  --secondary-color: #2c3e50;
  --text-color: #333;
  --light-text: #666;
  --border-color: #ddd;
  --background-color: #f5f5f5;
  --max-width: 1200px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--background-color);
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-top: 1rem;
}

.app-footer {
  background-color: var(--primary-color);
  color: white;
  padding: 1rem;
  margin-top: auto;
}

.footer-content {
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
}

.version {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}

/* Utility Classes */
.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1rem;
}

.text-center {
  text-align: center;
}

.mt-1 { margin-top: 0.5rem; }
.mt-2 { margin-top: 1rem; }
.mt-3 { margin-top: 1.5rem; }
.mt-4 { margin-top: 2rem; }

.mb-1 { margin-bottom: 0.5rem; }
.mb-2 { margin-bottom: 1rem; }
.mb-3 { margin-bottom: 1.5rem; }
.mb-4 { margin-bottom: 2rem; }
</style>

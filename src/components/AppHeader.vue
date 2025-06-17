<script setup lang="ts">
import GlobalMenu from '@/components/GlobalMenu.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <nav><router-link to="/configuration" class="config-button">⚙️</router-link></nav>
      <div class="header-right">
        <LanguageSwitcher />
        <GlobalMenu />
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: white;
  border-bottom: 1px solid #ddd;
  padding: 1rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style> 

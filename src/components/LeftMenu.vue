<script setup lang="ts">
import { IconChevronRight, IconChevronLeft } from '@tabler/icons-vue';

const props = defineProps<{ minimized: boolean | { value: boolean } }>();
const emit = defineEmits(['toggle']);

function toggleMenu() {
  emit('toggle');
}

function isMinimized() {
  return typeof props.minimized === 'object' ? props.minimized.value : props.minimized;
}
</script>

<template>
  <aside :class="['left-menu', { minimized: isMinimized() }]">
    <div class="toggle-btn" @click="toggleMenu">
      <IconChevronRight v-if="isMinimized()" />
      <IconChevronLeft v-else />
    </div>
    <nav class="menu-items">
      <slot name="navigation" />
    </nav>
    <div class="left-menu-bottom">
      <slot name="bottom" />
    </div>
  </aside>
</template>

<style scoped>
.left-menu {
  height: 100vh;
  width: 200px;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-shadow: 2px 0 8px rgba(0,0,0,0.08);
  transition: width 0.2s;
}
.left-menu.minimized {
  width: 60px;
}
.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 1rem 1rem 0.5rem;
  cursor: pointer;
  color: var(--color-text-inverse);
  font-size: 1.2rem;
}
.left-menu.minimized .menu-label {
  display: none;
}
.left-menu.minimized {
  align-items: center;
}
.left-menu.minimized .module-selector-row {
  display: none;
}
.left-menu-bottom {
  margin-top: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.left-menu.minimized .left-menu-bottom {
  align-items: center;
  padding: 0.5rem 0;
}
.left-menu.minimized .left-menu-bottom .menu-label {
  display: none;
}
</style> 

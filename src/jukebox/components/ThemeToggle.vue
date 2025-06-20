<template>
  <div class="theme-toggle">
    <ToggleSwitch :modelValue="theme === 'dark'" @update:modelValue="$emit('toggle')" />
    <span>{{ theme === 'dark' ? 'Dark' : 'Light' }} Mode</span>
  </div>
</template>
<script setup lang="ts">
import ToggleSwitch from '../../components/common/ToggleSwitch.vue'
defineProps<{ theme: string }>()
</script>
<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  margin: 1rem 0;
}
</style> 
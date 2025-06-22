<script setup lang="ts">
import { inject, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  tabId: string;
}>();

const activeTab = inject('activeTab', { value: '' });
const isActive = computed(() => props.tabId === activeTab.value);

</script>

<template>
  <div v-if="isActive" class="tab-panel">
    <slot />
  </div>
</template>

<style scoped>
.tab-panel {
  padding: 1rem;
}
</style> 